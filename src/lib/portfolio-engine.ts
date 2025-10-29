/**
 * Portfolio Engine
 * 
 * Handles real-time position tracking, P&L calculations, and portfolio analytics
 */

import { EventEmitter } from 'events';
import { prisma } from './prisma';

interface Position {
  userId: string;
  sessionId: string;
  securityId: string;
  quantity: number;
  avgPrice: number;
  marketValue: number;
  unrealizedPnL: number;
  realizedPnL: number;
  lastUpdated: Date;
}

interface PortfolioSummary {
  userId: string;
  sessionId: string;
  totalValue: number;
  totalUnrealizedPnL: number;
  totalRealizedPnL: number;
  totalPnL: number;
  cashBalance: number;
  positions: Position[];
  lastUpdated: Date;
}

interface PortfolioEvent {
  type: 'positionUpdate' | 'pnlUpdate' | 'portfolioSummary';
  userId: string;
  sessionId: string;
  data: any;
  timestamp: Date;
}

export class PortfolioEngine extends EventEmitter {
  private sessionId: string;
  private marketPrices: Map<string, number> = new Map();
  private userCashBalances: Map<string, number> = new Map();

  constructor(sessionId: string) {
    super();
    this.sessionId = sessionId;
    this.initializePortfolios();
  }

  /**
   * Initialize user portfolios with starting cash
   */
  private async initializePortfolios(): Promise<void> {
    try {
      // Get all users in this session
      const sessionUsers = await prisma.sessionUser.findMany({
        where: { sessionId: this.sessionId },
        include: { user: true }
      });

      // Initialize cash balances
      for (const sessionUser of sessionUsers) {
        this.userCashBalances.set(sessionUser.userId, 100000); // $100k starting cash
      }

      console.log(`Portfolio engine initialized for ${sessionUsers.length} users`);
    } catch (error) {
      console.error('Error initializing portfolios:', error);
    }
  }

  /**
   * Update market price for a security and recalculate all P&L
   */
  async updateMarketPrice(securityId: string, newPrice: number): Promise<void> {
    const oldPrice = this.marketPrices.get(securityId);
    this.marketPrices.set(securityId, newPrice);

    // If price changed, recalculate P&L for all positions in this security
    if (oldPrice !== newPrice) {
      await this.recalculatePositionPnL(securityId, newPrice);
    }
  }

  /**
   * Get current market price for a security
   */
  getMarketPrice(securityId: string): number {
    return this.marketPrices.get(securityId) || 100.00;
  }

  /**
   * Update user position after a trade
   */
  async updatePosition(
    userId: string, 
    securityId: string, 
    quantityChange: number, 
    tradePrice: number,
    tradeValue: number
  ): Promise<Position> {
    try {
      // Get current position
      const currentPosition = await prisma.position.findUnique({
        where: {
          sessionId_userId_securityId: {
            sessionId: this.sessionId,
            userId,
            securityId
          }
        }
      });

      let newQuantity: number;
      let newAvgPrice: number;
      let realizedPnL = 0;

      if (!currentPosition || currentPosition.quantity === 0) {
        // New position
        newQuantity = quantityChange;
        newAvgPrice = tradePrice;
      } else {
        // Existing position
        const oldQuantity = currentPosition.quantity;
        newQuantity = oldQuantity + quantityChange;

        if ((oldQuantity > 0 && quantityChange > 0) || (oldQuantity < 0 && quantityChange < 0)) {
          // Adding to position - update average price
          const oldValue = oldQuantity * currentPosition.avgPrice;
          const newValue = quantityChange * tradePrice;
          newAvgPrice = (oldValue + newValue) / newQuantity;
        } else {
          // Reducing position - realize P&L
          const closingQuantity = Math.min(Math.abs(quantityChange), Math.abs(oldQuantity));
          realizedPnL = closingQuantity * (tradePrice - currentPosition.avgPrice) * (oldQuantity > 0 ? 1 : -1);
          newAvgPrice = currentPosition.avgPrice; // Keep same avg price for remaining position
        }
      }

      // Calculate current market value and unrealized P&L
      const currentMarketPrice = this.getMarketPrice(securityId);
      const marketValue = newQuantity * currentMarketPrice;
      const unrealizedPnL = newQuantity * (currentMarketPrice - newAvgPrice);

      // Update position in database
      const updatedPosition = await prisma.position.upsert({
        where: {
          sessionId_userId_securityId: {
            sessionId: this.sessionId,
            userId,
            securityId
          }
        },
        update: {
          quantity: newQuantity,
          avgPrice: newAvgPrice,
          unrealizedPnL,
          realizedPnL: (Number(currentPosition?.realizedPnL) || 0) + realizedPnL
        },
        create: {
          sessionId: this.sessionId,
          userId,
          securityId,
          quantity: newQuantity,
          avgPrice: newAvgPrice,
          unrealizedPnL,
          realizedPnL
        }
      });

      // Update user's cash balance
      await this.updateCashBalance(userId, -tradeValue);

      const position: Position = {
        userId,
        sessionId: this.sessionId,
        securityId,
        quantity: updatedPosition.quantity,
        avgPrice: Number(updatedPosition.avgPrice),
        marketValue,
        unrealizedPnL: Number(updatedPosition.unrealizedPnL),
        realizedPnL: Number(updatedPosition.realizedPnL),
        lastUpdated: new Date()
      };

      // Emit position update event
      this.emit('positionUpdate', {
        type: 'positionUpdate',
        userId,
        sessionId: this.sessionId,
        data: position,
        timestamp: new Date()
      } as PortfolioEvent);

      // Recalculate and emit portfolio summary
      await this.emitPortfolioSummary(userId);

      return position;

    } catch (error) {
      console.error('Error updating position:', error);
      throw error;
    }
  }

  /**
   * Update user's cash balance
   */
  private async updateCashBalance(userId: string, change: number): Promise<void> {
    const currentBalance = this.userCashBalances.get(userId) || 100000;
    const newBalance = currentBalance + change;
    this.userCashBalances.set(userId, newBalance);
  }

  /**
   * Get user's current cash balance
   */
  getCashBalance(userId: string): number {
    return this.userCashBalances.get(userId) || 100000;
  }

  /**
   * Recalculate P&L for all positions in a security when market price changes
   */
  private async recalculatePositionPnL(securityId: string, newMarketPrice: number): Promise<void> {
    try {
      const positions = await prisma.position.findMany({
        where: {
          sessionId: this.sessionId,
          securityId,
          quantity: { not: 0 }
        }
      });

      for (const position of positions) {
        const unrealizedPnL = position.quantity * (newMarketPrice - Number(position.avgPrice));
        
        await prisma.position.update({
          where: { id: position.id },
          data: { unrealizedPnL }
        });

        // Emit P&L update event
        this.emit('pnlUpdate', {
          type: 'pnlUpdate',
          userId: position.userId,
          sessionId: this.sessionId,
          data: {
            securityId,
            oldUnrealizedPnL: Number(position.unrealizedPnL),
            newUnrealizedPnL: unrealizedPnL,
            priceChange: newMarketPrice - this.marketPrices.get(securityId)!
          },
          timestamp: new Date()
        } as PortfolioEvent);

        // Update portfolio summary
        await this.emitPortfolioSummary(position.userId);
      }
    } catch (error) {
      console.error('Error recalculating P&L:', error);
    }
  }

  /**
   * Get portfolio summary for a user
   */
  async getPortfolioSummary(userId: string): Promise<PortfolioSummary> {
    try {
      const positions = await prisma.position.findMany({
        where: {
          sessionId: this.sessionId,
          userId,
          quantity: { not: 0 }
        },
        include: {
          security: true
        }
      });

      let totalValue = 0;
      let totalUnrealizedPnL = 0;
      let totalRealizedPnL = 0;

      const portfolioPositions: Position[] = positions.map(pos => {
        const marketPrice = this.getMarketPrice(pos.securityId);
        const marketValue = pos.quantity * marketPrice;
        const unrealizedPnL = Number(pos.unrealizedPnL);
        const realizedPnL = Number(pos.realizedPnL);

        totalValue += marketValue;
        totalUnrealizedPnL += unrealizedPnL;
        totalRealizedPnL += realizedPnL;

        return {
          userId: pos.userId,
          sessionId: pos.sessionId,
          securityId: pos.securityId,
          quantity: pos.quantity,
          avgPrice: Number(pos.avgPrice),
          marketValue,
          unrealizedPnL,
          realizedPnL,
          lastUpdated: new Date()
        };
      });

      const cashBalance = this.getCashBalance(userId);
      totalValue += cashBalance;

      return {
        userId,
        sessionId: this.sessionId,
        totalValue,
        totalUnrealizedPnL,
        totalRealizedPnL,
        totalPnL: totalUnrealizedPnL + totalRealizedPnL,
        cashBalance,
        positions: portfolioPositions,
        lastUpdated: new Date()
      };

    } catch (error) {
      console.error('Error getting portfolio summary:', error);
      throw error;
    }
  }

  /**
   * Emit portfolio summary update event
   */
  private async emitPortfolioSummary(userId: string): Promise<void> {
    try {
      const summary = await this.getPortfolioSummary(userId);
      
      this.emit('portfolioSummary', {
        type: 'portfolioSummary',
        userId,
        sessionId: this.sessionId,
        data: summary,
        timestamp: new Date()
      } as PortfolioEvent);
    } catch (error) {
      console.error('Error emitting portfolio summary:', error);
    }
  }

  /**
   * Get portfolio summaries for all users in session
   */
  async getAllPortfolioSummaries(): Promise<PortfolioSummary[]> {
    try {
      const sessionUsers = await prisma.sessionUser.findMany({
        where: { sessionId: this.sessionId }
      });

      const summaries = await Promise.all(
        sessionUsers.map(su => this.getPortfolioSummary(su.userId))
      );

      return summaries;
    } catch (error) {
      console.error('Error getting all portfolio summaries:', error);
      return [];
    }
  }

  /**
   * Reset user portfolio to starting state
   */
  async resetUserPortfolio(userId: string): Promise<void> {
    try {
      // Delete all positions
      await prisma.position.deleteMany({
        where: {
          sessionId: this.sessionId,
          userId
        }
      });

      // Reset cash balance
      this.userCashBalances.set(userId, 100000);

      console.log(`Portfolio reset for user ${userId}`);
    } catch (error) {
      console.error('Error resetting portfolio:', error);
      throw error;
    }
  }
}

// Global portfolio engines by session
const portfolioEngines = new Map<string, PortfolioEngine>();

/**
 * Get or create portfolio engine for a session
 */
export function getPortfolioEngine(sessionId: string): PortfolioEngine {
  if (!portfolioEngines.has(sessionId)) {
    portfolioEngines.set(sessionId, new PortfolioEngine(sessionId));
  }
  return portfolioEngines.get(sessionId)!;
}