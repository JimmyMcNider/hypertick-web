/**
 * Privilege System for HyperTick
 * 
 * Manages student privileges during trading sessions based on XML lesson configurations.
 * Handles privilege grants, revocations, and auction-based privilege distribution.
 */

export interface PrivilegeDefinition {
  id: number;
  name: string;
  description: string;
  category: 'TRADING' | 'MARKET_MAKING' | 'INFORMATION' | 'ANALYSIS' | 'ADMIN';
  defaultGranted: boolean;
  auctionable: boolean;
  maxHolders?: number;
  prerequisites?: number[];
  mutuallyExclusive?: number[];
}

export interface UserPrivilege {
  userId: string;
  privilegeId: number;
  grantedAt: Date;
  grantedBy: string;
  expiresAt?: Date;
  auctionWon?: boolean;
  bidAmount?: number;
}

export interface PrivilegeGrant {
  privilegeId: number;
  targetUsers?: string[];
  duration?: number;
  auctionBased?: boolean;
  minBid?: number;
  auctionDuration?: number;
}

export interface PrivilegeAuction {
  id: string;
  privilegeId: number;
  sessionId: string;
  startTime: Date;
  endTime: Date;
  minBid: number;
  bids: PrivilegeBid[];
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  winnerId?: string;
  winningBid?: number;
}

export interface PrivilegeBid {
  userId: string;
  amount: number;
  timestamp: Date;
}

import { PRIVILEGE_DEFINITIONS as LEGACY_PRIVILEGE_DEFINITIONS, getPrivilegeByCode } from './privilege-definitions';

// Enhanced privilege definitions mapped from legacy upTick system
export const PRIVILEGE_DEFINITIONS: Record<number, PrivilegeDefinition> = {};

// Initialize privilege definitions from the comprehensive definitions file
LEGACY_PRIVILEGE_DEFINITIONS.forEach(legacyPriv => {
  const category = mapLegacyCategory(legacyPriv.category);
  
  PRIVILEGE_DEFINITIONS[legacyPriv.code] = {
    id: legacyPriv.code,
    name: legacyPriv.name,
    description: legacyPriv.description,
    category,
    defaultGranted: getDefaultGrantedStatus(legacyPriv.code),
    auctionable: getAuctionableStatus(legacyPriv.code),
    maxHolders: getMaxHolders(legacyPriv.code),
    prerequisites: getPrerequisites(legacyPriv.code),
    mutuallyExclusive: getMutuallyExclusive(legacyPriv.code)
  };
});

function mapLegacyCategory(category: string): 'TRADING' | 'MARKET_MAKING' | 'INFORMATION' | 'ANALYSIS' | 'ADMIN' {
  switch (category) {
    case 'trading': return 'TRADING';
    case 'market_data': return 'INFORMATION';
    case 'analysis': return 'ANALYSIS';
    case 'admin': return 'ADMIN';
    case 'utility': return 'ADMIN';
    default: return 'TRADING';
  }
}

function getDefaultGrantedStatus(privilegeId: number): boolean {
  // Basic student privileges that are granted by default
  const defaultPrivileges = [1, 4, 5, 11, 13, 15, 33];
  return defaultPrivileges.includes(privilegeId);
}

function getAuctionableStatus(privilegeId: number): boolean {
  // Privileges that can be auctioned for (high-value trading rights)
  const auctionablePrivileges = [9, 22, 23, 25, 26, 27, 28, 29, 32];
  return auctionablePrivileges.includes(privilegeId);
}

function getMaxHolders(privilegeId: number): number | undefined {
  // Limited holder privileges
  const limitedPrivileges: Record<number, number> = {
    22: 3, // Market Making Rights - max 3 students
    23: 2, // Premium Analyst Signals - max 2 students
    25: 5, // Block Trading - max 5 students
    27: 2, // Dark Pool Access - max 2 students
    32: 1, // Auction Window - instructor only
    35: 1  // Instructor Controls - instructor only
  };
  return limitedPrivileges[privilegeId];
}

function getPrerequisites(privilegeId: number): number[] | undefined {
  // Privilege prerequisites 
  const prerequisites: Record<number, number[]> = {
    16: [9], // Options Chain requires Montage
    22: [8], // Market Making requires Market Order Window
    23: [1], // Premium Analyst requires Analyst Window
    24: [22], // Spread Trading requires Market Making Rights
    25: [22], // Block Trading requires Market Making Rights
    26: [22], // Algorithmic Orders require Market Making Rights
    27: [22], // Dark Pool Access requires Market Making Rights
    28: [22], // Cross Trading requires Market Making Rights
    29: [8], // Bump Buttons require Market Order Window
    35: [30] // Instructor Controls require Compliance Monitor
  };
  return prerequisites[privilegeId];
}

function getMutuallyExclusive(privilegeId: number): number[] | undefined {
  // Mutually exclusive privileges (can't have both)
  const mutuallyExclusive: Record<number, number[]> = {
    22: [23], // Market Making vs Premium Analyst (different roles)
    23: [22]  // Premium Analyst vs Market Making
  };
  return mutuallyExclusive[privilegeId];
}

export class PrivilegeSystem {
  private userPrivileges: Map<string, Map<number, UserPrivilege>> = new Map();
  private activeAuctions: Map<string, PrivilegeAuction> = new Map();
  private sessionId: string;
  private eventEmitter: any;

  constructor(sessionId: string, eventEmitter?: any) {
    this.sessionId = sessionId;
    this.eventEmitter = eventEmitter;
  }

  /**
   * Grant privilege to user(s)
   */
  grantPrivilege(
    privilegeId: number,
    targetUsers: string[],
    grantedBy: string,
    duration?: number
  ): boolean {
    const privilege = PRIVILEGE_DEFINITIONS[privilegeId];
    if (!privilege) {
      throw new Error(`Unknown privilege ID: ${privilegeId}`);
    }

    // Check prerequisites
    for (const userId of targetUsers) {
      if (!this.checkPrerequisites(userId, privilegeId)) {
        throw new Error(`User ${userId} does not meet prerequisites for privilege ${privilegeId}`);
      }

      // Check max holders limit
      if (privilege.maxHolders && this.getPrivilegeHolders(privilegeId).length >= privilege.maxHolders) {
        throw new Error(`Maximum holders (${privilege.maxHolders}) reached for privilege ${privilegeId}`);
      }

      // Check mutually exclusive privileges
      if (privilege.mutuallyExclusive) {
        for (const exclusiveId of privilege.mutuallyExclusive) {
          if (this.hasPrivilege(userId, exclusiveId)) {
            throw new Error(`User ${userId} has mutually exclusive privilege ${exclusiveId}`);
          }
        }
      }
    }

    // Grant to all users
    for (const userId of targetUsers) {
      const userPrivileges = this.getUserPrivileges(userId);
      
      const grant: UserPrivilege = {
        userId,
        privilegeId,
        grantedAt: new Date(),
        grantedBy,
        expiresAt: duration ? new Date(Date.now() + duration * 1000) : undefined
      };

      userPrivileges.set(privilegeId, grant);

      // Emit privilege granted event
      this.eventEmitter?.emit('privilege_granted', {
        userId,
        privilegeId,
        privilegeName: privilege.name,
        grantedBy,
        expiresAt: grant.expiresAt
      });
    }

    return true;
  }

  /**
   * Revoke privilege from user(s)
   */
  revokePrivilege(privilegeId: number, targetUsers: string[], revokedBy: string): boolean {
    const privilege = PRIVILEGE_DEFINITIONS[privilegeId];
    if (!privilege) {
      throw new Error(`Unknown privilege ID: ${privilegeId}`);
    }

    for (const userId of targetUsers) {
      const userPrivileges = this.getUserPrivileges(userId);
      
      if (userPrivileges.has(privilegeId)) {
        userPrivileges.delete(privilegeId);

        // Emit privilege revoked event
        this.eventEmitter?.emit('privilege_revoked', {
          userId,
          privilegeId,
          privilegeName: privilege.name,
          revokedBy
        });
      }
    }

    return true;
  }

  /**
   * Check if user has specific privilege
   */
  hasPrivilege(userId: string, privilegeId: number): boolean {
    const userPrivileges = this.getUserPrivileges(userId);
    const privilege = userPrivileges.get(privilegeId);
    
    if (!privilege) return false;

    // Check if privilege has expired
    if (privilege.expiresAt && privilege.expiresAt < new Date()) {
      userPrivileges.delete(privilegeId);
      return false;
    }

    return true;
  }

  /**
   * Get all privileges for a user
   */
  getUserPrivileges(userId: string): Map<number, UserPrivilege> {
    if (!this.userPrivileges.has(userId)) {
      this.userPrivileges.set(userId, new Map());
      
      // Grant default privileges
      for (const [id, definition] of Object.entries(PRIVILEGE_DEFINITIONS)) {
        if (definition.defaultGranted) {
          const privilegeId = parseInt(id);
          this.userPrivileges.get(userId)!.set(privilegeId, {
            userId,
            privilegeId,
            grantedAt: new Date(),
            grantedBy: 'SYSTEM'
          });
        }
      }
    }
    
    return this.userPrivileges.get(userId)!;
  }

  /**
   * Get all users who have a specific privilege
   */
  getPrivilegeHolders(privilegeId: number): string[] {
    const holders: string[] = [];
    
    for (const [userId, privileges] of this.userPrivileges.entries()) {
      if (this.hasPrivilege(userId, privilegeId)) {
        holders.push(userId);
      }
    }
    
    return holders;
  }

  /**
   * Start privilege auction
   */
  startPrivilegeAuction(
    privilegeId: number,
    minBid: number,
    durationSeconds: number,
    eligibleUsers?: string[]
  ): string {
    const privilege = PRIVILEGE_DEFINITIONS[privilegeId];
    if (!privilege) {
      throw new Error(`Unknown privilege ID: ${privilegeId}`);
    }

    if (!privilege.auctionable) {
      throw new Error(`Privilege ${privilegeId} is not auctionable`);
    }

    const auctionId = `auction_${this.sessionId}_${privilegeId}_${Date.now()}`;
    const auction: PrivilegeAuction = {
      id: auctionId,
      privilegeId,
      sessionId: this.sessionId,
      startTime: new Date(),
      endTime: new Date(Date.now() + durationSeconds * 1000),
      minBid,
      bids: [],
      status: 'ACTIVE'
    };

    this.activeAuctions.set(auctionId, auction);

    // Emit auction started event
    this.eventEmitter?.emit('auction_started', {
      auctionId,
      privilegeId,
      privilegeName: privilege.name,
      minBid,
      duration: durationSeconds,
      eligibleUsers
    });

    // Schedule auction end
    setTimeout(() => {
      this.endAuction(auctionId);
    }, durationSeconds * 1000);

    return auctionId;
  }

  /**
   * Place bid in privilege auction
   */
  placeBid(auctionId: string, userId: string, amount: number): boolean {
    const auction = this.activeAuctions.get(auctionId);
    if (!auction) {
      throw new Error(`Auction ${auctionId} not found`);
    }

    if (auction.status !== 'ACTIVE') {
      throw new Error(`Auction ${auctionId} is not active`);
    }

    if (new Date() > auction.endTime) {
      throw new Error(`Auction ${auctionId} has ended`);
    }

    if (amount < auction.minBid) {
      throw new Error(`Bid amount ${amount} is below minimum ${auction.minBid}`);
    }

    // Check if user already has a bid
    const existingBidIndex = auction.bids.findIndex(bid => bid.userId === userId);
    if (existingBidIndex > -1) {
      // Update existing bid
      if (amount <= auction.bids[existingBidIndex].amount) {
        throw new Error(`New bid must be higher than current bid`);
      }
      auction.bids[existingBidIndex] = { userId, amount, timestamp: new Date() };
    } else {
      // Add new bid
      auction.bids.push({ userId, amount, timestamp: new Date() });
    }

    // Sort bids by amount (highest first)
    auction.bids.sort((a, b) => b.amount - a.amount);

    // Emit bid placed event
    this.eventEmitter?.emit('bid_placed', {
      auctionId,
      userId,
      amount,
      currentHighBid: auction.bids[0]?.amount,
      currentLeader: auction.bids[0]?.userId
    });

    return true;
  }

  /**
   * End privilege auction and grant to winner
   */
  private endAuction(auctionId: string): void {
    const auction = this.activeAuctions.get(auctionId);
    if (!auction || auction.status !== 'ACTIVE') {
      return;
    }

    auction.status = 'COMPLETED';

    if (auction.bids.length > 0) {
      const winningBid = auction.bids[0];
      auction.winnerId = winningBid.userId;
      auction.winningBid = winningBid.amount;

      // Grant privilege to winner
      try {
        this.grantPrivilege(auction.privilegeId, [winningBid.userId], 'AUCTION_SYSTEM');

        // Mark as auction won
        const userPrivileges = this.getUserPrivileges(winningBid.userId);
        const privilege = userPrivileges.get(auction.privilegeId);
        if (privilege) {
          privilege.auctionWon = true;
          privilege.bidAmount = winningBid.amount;
        }

        // Emit auction completed event
        this.eventEmitter?.emit('auction_completed', {
          auctionId,
          privilegeId: auction.privilegeId,
          privilegeName: PRIVILEGE_DEFINITIONS[auction.privilegeId].name,
          winnerId: winningBid.userId,
          winningBid: winningBid.amount,
          totalBids: auction.bids.length
        });
      } catch (error) {
        console.error('Failed to grant privilege to auction winner:', error);
        auction.status = 'CANCELLED';
      }
    } else {
      // No bids - auction failed
      this.eventEmitter?.emit('auction_failed', {
        auctionId,
        privilegeId: auction.privilegeId,
        privilegeName: PRIVILEGE_DEFINITIONS[auction.privilegeId].name,
        reason: 'No bids received'
      });
    }
  }

  /**
   * Get active auctions
   */
  getActiveAuctions(): PrivilegeAuction[] {
    return Array.from(this.activeAuctions.values()).filter(a => a.status === 'ACTIVE');
  }

  /**
   * Get auction by ID
   */
  getAuction(auctionId: string): PrivilegeAuction | undefined {
    return this.activeAuctions.get(auctionId);
  }

  /**
   * Check if user meets prerequisites for privilege
   */
  private checkPrerequisites(userId: string, privilegeId: number): boolean {
    const privilege = PRIVILEGE_DEFINITIONS[privilegeId];
    if (!privilege.prerequisites) return true;

    for (const prerequisiteId of privilege.prerequisites) {
      if (!this.hasPrivilege(userId, prerequisiteId)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get privilege status for all users (for instructor dashboard)
   */
  getPrivilegeMatrix(): Record<string, Record<number, boolean>> {
    const matrix: Record<string, Record<number, boolean>> = {};

    for (const [userId] of this.userPrivileges.entries()) {
      matrix[userId] = {};
      for (const privilegeId of Object.keys(PRIVILEGE_DEFINITIONS).map(Number)) {
        matrix[userId][privilegeId] = this.hasPrivilege(userId, privilegeId);
      }
    }

    return matrix;
  }

  /**
   * Get privilege statistics for analytics
   */
  getPrivilegeStats(): Record<number, { 
    holders: number; 
    totalGranted: number; 
    auctionWins: number; 
    averageBid?: number;
  }> {
    const stats: Record<number, any> = {};

    for (const privilegeId of Object.keys(PRIVILEGE_DEFINITIONS).map(Number)) {
      const holders = this.getPrivilegeHolders(privilegeId);
      let totalGranted = 0;
      let auctionWins = 0;
      let totalBids = 0;
      let bidCount = 0;

      for (const [userId, privileges] of this.userPrivileges.entries()) {
        const privilege = privileges.get(privilegeId);
        if (privilege) {
          totalGranted++;
          if (privilege.auctionWon) {
            auctionWins++;
            if (privilege.bidAmount) {
              totalBids += privilege.bidAmount;
              bidCount++;
            }
          }
        }
      }

      stats[privilegeId] = {
        holders: holders.length,
        totalGranted,
        auctionWins,
        averageBid: bidCount > 0 ? totalBids / bidCount : undefined
      };
    }

    return stats;
  }

  /**
   * Reset all privileges (for new session)
   */
  reset(): void {
    this.userPrivileges.clear();
    this.activeAuctions.clear();
  }

  /**
   * Export privilege state for persistence
   */
  exportState(): any {
    return {
      userPrivileges: Array.from(this.userPrivileges.entries()).map(([userId, privileges]) => [
        userId,
        Array.from(privileges.entries())
      ]),
      activeAuctions: Array.from(this.activeAuctions.entries())
    };
  }

  /**
   * Import privilege state from persistence
   */
  importState(state: any): void {
    this.userPrivileges.clear();
    this.activeAuctions.clear();

    if (state.userPrivileges) {
      for (const [userId, privileges] of state.userPrivileges) {
        this.userPrivileges.set(userId, new Map(privileges));
      }
    }

    if (state.activeAuctions) {
      for (const [auctionId, auction] of state.activeAuctions) {
        this.activeAuctions.set(auctionId, auction);
      }
    }
  }
}