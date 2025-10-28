/**
 * XML Command Processor - Execute upTick Lesson Commands
 * 
 * Processes and executes legacy upTick XML lesson commands to control
 * session state, grant privileges, configure markets, and manage auctions
 * in the modern web platform.
 */

import { SimulationCommand, PrivilegeGrant, MarketConfiguration, AuctionConfiguration } from './lesson-xml-parser';

export interface SessionState {
  id: string;
  status: 'preparing' | 'active' | 'paused' | 'completed';
  marketStatus: 'pre_market' | 'open' | 'auction' | 'closed';
  activePrivileges: Set<number>;
  marketConfig: MarketConfiguration;
  activeAuctions: AuctionConfiguration[];
  currentTick: number;
  startTime?: Date;
  duration: number;
  participants: string[];
}

export interface CommandExecutionResult {
  success: boolean;
  message: string;
  data?: any;
  nextCommands?: SimulationCommand[];
}

export interface SessionParticipant {
  userId: string;
  username: string;
  privileges: Set<number>;
  balance: number;
  holdings: { [symbol: string]: number };
  orders: any[];
  trades: any[];
}

export class XMLCommandProcessor {
  private sessions: Map<string, SessionState> = new Map();
  private participants: Map<string, Map<string, SessionParticipant>> = new Map();
  private marketData: Map<string, any> = new Map();
  private scheduledCommands: Map<string, SimulationCommand[]> = new Map();

  /**
   * Initialize a new session from parsed lesson
   */
  initializeSession(sessionId: string, parsedLesson: any, participantIds: string[]): SessionState {
    const sessionState: SessionState = {
      id: sessionId,
      status: 'preparing',
      marketStatus: 'pre_market',
      activePrivileges: new Set(),
      marketConfig: parsedLesson.marketConfig || {},
      activeAuctions: [],
      currentTick: 1,
      duration: parsedLesson.metadata.estimatedDuration * 60, // Convert to seconds
      participants: participantIds
    };

    this.sessions.set(sessionId, sessionState);

    // Initialize participants
    const sessionParticipants = new Map<string, SessionParticipant>();
    participantIds.forEach(userId => {
      sessionParticipants.set(userId, {
        userId,
        username: `user_${userId}`,
        privileges: new Set(),
        balance: 100000, // Default starting balance
        holdings: {},
        orders: [],
        trades: []
      });
    });
    this.participants.set(sessionId, sessionParticipants);

    // Execute global commands
    this.executeCommands(sessionId, parsedLesson.globalCommands);

    return sessionState;
  }

  /**
   * Execute a list of commands for a session
   */
  executeCommands(sessionId: string, commands: SimulationCommand[]): CommandExecutionResult[] {
    const results: CommandExecutionResult[] = [];
    
    for (const command of commands) {
      const result = this.executeCommand(sessionId, command);
      results.push(result);
      
      if (!result.success) {
        console.error(`Command execution failed: ${command.name}`, result.message);
      }
    }
    
    return results;
  }

  /**
   * Execute a single command
   */
  executeCommand(sessionId: string, command: SimulationCommand): CommandExecutionResult {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return { success: false, message: `Session ${sessionId} not found` };
    }

    try {
      switch (command.name) {
        case 'Grant Privilege':
          return this.executeGrantPrivilege(sessionId, command);
        
        case 'Set Market':
          return this.executeSetMarket(sessionId, command);
        
        case 'Open Market':
          return this.executeOpenMarket(sessionId, command);
        
        case 'Close Market':
          return this.executeCloseMarket(sessionId, command);
        
        case 'Set Holding Value':
          return this.executeSetHoldingValue(sessionId, command);
        
        case 'Set Liquidity Trader':
          return this.executeSetLiquidityTrader(sessionId, command);
        
        case 'Create Auction':
          return this.executeCreateAuction(sessionId, command);
        
        case 'Start Auction':
          return this.executeStartAuction(sessionId, command);
        
        case 'End Auction':
          return this.executeEndAuction(sessionId, command);
        
        case 'Show Dialog':
          return this.executeShowDialog(sessionId, command);
        
        case 'Send Message':
          return this.executeSendMessage(sessionId, command);
        
        case 'Wait':
          return this.executeWait(sessionId, command);
        
        case 'Set Parameter':
          return this.executeSetParameter(sessionId, command);
        
        default:
          return { 
            success: false, 
            message: `Unknown command: ${command.name}` 
          };
      }
    } catch (error) {
      return { 
        success: false, 
        message: `Error executing command ${command.name}: ${error}` 
      };
    }
  }

  /**
   * Grant privilege to all participants or specific user
   */
  private executeGrantPrivilege(sessionId: string, command: SimulationCommand): CommandExecutionResult {
    if (command.parameters.length === 0) {
      return { success: false, message: 'Grant Privilege requires privilege code parameter' };
    }

    const privilegeCode = parseInt(command.parameters[0]);
    if (isNaN(privilegeCode)) {
      return { success: false, message: 'Invalid privilege code' };
    }

    const session = this.sessions.get(sessionId);
    const participants = this.participants.get(sessionId);
    
    if (!session || !participants) {
      return { success: false, message: 'Session or participants not found' };
    }

    // Grant to all participants by default
    const targetUser = command.parameters[1] || 'ALL';
    
    if (targetUser === 'ALL') {
      participants.forEach(participant => {
        participant.privileges.add(privilegeCode);
      });
      session.activePrivileges.add(privilegeCode);
    } else {
      const participant = participants.get(targetUser);
      if (participant) {
        participant.privileges.add(privilegeCode);
      }
    }

    return { 
      success: true, 
      message: `Granted privilege ${privilegeCode} to ${targetUser}`,
      data: { privilegeCode, target: targetUser }
    };
  }

  /**
   * Configure market settings
   */
  private executeSetMarket(sessionId: string, command: SimulationCommand): CommandExecutionResult {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return { success: false, message: 'Session not found' };
    }

    if (command.parameters.length >= 4) {
      session.marketConfig.startTick = parseInt(command.parameters[0]) || 1;
      session.marketConfig.marketDelay = parseInt(command.parameters[1]) || 8;
      session.marketConfig.loopOnClose = command.parameters[2] === 'true';
      session.marketConfig.liquidateOnClose = command.parameters[3] === 'true';
    }

    return { 
      success: true, 
      message: 'Market configuration updated',
      data: session.marketConfig
    };
  }

  /**
   * Open market for trading
   */
  private executeOpenMarket(sessionId: string, command: SimulationCommand): CommandExecutionResult {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return { success: false, message: 'Session not found' };
    }

    const delay = command.parameters.length > 0 ? parseInt(command.parameters[0]) : 0;
    
    setTimeout(() => {
      session.marketStatus = 'open';
      session.startTime = new Date();
    }, delay * 1000);

    return { 
      success: true, 
      message: `Market opening in ${delay} seconds`,
      data: { delay, marketStatus: 'opening' }
    };
  }

  /**
   * Close market
   */
  private executeCloseMarket(sessionId: string, command: SimulationCommand): CommandExecutionResult {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return { success: false, message: 'Session not found' };
    }

    session.marketStatus = 'closed';

    // Liquidate positions if configured
    if (session.marketConfig.liquidateOnClose) {
      this.liquidateAllPositions(sessionId);
    }

    return { 
      success: true, 
      message: 'Market closed',
      data: { marketStatus: 'closed' }
    };
  }

  /**
   * Set holding values for participants
   */
  private executeSetHoldingValue(sessionId: string, command: SimulationCommand): CommandExecutionResult {
    if (command.parameters.length < 3) {
      return { success: false, message: 'Set Holding Value requires target, security, and value parameters' };
    }

    const target = command.parameters[0];
    const security = command.parameters[1];
    const value = parseFloat(command.parameters[2]);

    const participants = this.participants.get(sessionId);
    if (!participants) {
      return { success: false, message: 'Session participants not found' };
    }

    if (target === 'ALL') {
      participants.forEach(participant => {
        if (security === 'USD') {
          participant.balance = value;
        } else {
          participant.holdings[security] = value;
        }
      });
    } else {
      const participant = participants.get(target);
      if (participant) {
        if (security === 'USD') {
          participant.balance = value;
        } else {
          participant.holdings[security] = value;
        }
      }
    }

    return { 
      success: true, 
      message: `Set ${security} holding to ${value} for ${target}`,
      data: { target, security, value }
    };
  }

  /**
   * Configure liquidity trader
   */
  private executeSetLiquidityTrader(sessionId: string, command: SimulationCommand): CommandExecutionResult {
    if (command.parameters.length < 3) {
      return { success: false, message: 'Set Liquidity Trader requires security, status, and enabled parameters' };
    }

    const security = command.parameters[0];
    const status = command.parameters[1];
    const enabled = command.parameters[2] === 'true';

    // Store liquidity trader configuration
    const liquidityConfig = {
      security,
      status,
      enabled,
      sessionId
    };

    return { 
      success: true, 
      message: `Liquidity trader ${enabled ? 'enabled' : 'disabled'} for ${security}`,
      data: liquidityConfig
    };
  }

  /**
   * Create auction for privileges
   */
  private executeCreateAuction(sessionId: string, command: SimulationCommand): CommandExecutionResult {
    if (command.parameters.length < 2) {
      return { success: false, message: 'Create Auction requires privilege code and auction type' };
    }

    const privilegeCode = parseInt(command.parameters[0]);
    const auctionType = command.parameters[1].toUpperCase() as 'RIGHTS' | 'DUTCH' | 'ENGLISH';

    const auction: AuctionConfiguration = {
      privilegeCode,
      auctionType,
      duration: command.parameters.length > 2 ? parseInt(command.parameters[2]) : 60,
      startingPrice: command.parameters.length > 3 ? parseFloat(command.parameters[3]) : 100,
      minimumBid: command.parameters.length > 4 ? parseFloat(command.parameters[4]) : 1
    };

    const session = this.sessions.get(sessionId);
    if (session) {
      session.activeAuctions.push(auction);
    }

    return { 
      success: true, 
      message: `Created ${auctionType} auction for privilege ${privilegeCode}`,
      data: auction
    };
  }

  /**
   * Start an auction
   */
  private executeStartAuction(sessionId: string, command: SimulationCommand): CommandExecutionResult {
    const privilegeCode = command.parameters.length > 0 ? parseInt(command.parameters[0]) : null;
    
    return { 
      success: true, 
      message: `Started auction${privilegeCode ? ` for privilege ${privilegeCode}` : ''}`,
      data: { privilegeCode }
    };
  }

  /**
   * End an auction
   */
  private executeEndAuction(sessionId: string, command: SimulationCommand): CommandExecutionResult {
    const privilegeCode = command.parameters.length > 0 ? parseInt(command.parameters[0]) : null;
    
    return { 
      success: true, 
      message: `Ended auction${privilegeCode ? ` for privilege ${privilegeCode}` : ''}`,
      data: { privilegeCode }
    };
  }

  /**
   * Show dialog message to participants
   */
  private executeShowDialog(sessionId: string, command: SimulationCommand): CommandExecutionResult {
    const message = command.parameters.join(' ');
    
    return { 
      success: true, 
      message: `Showing dialog: ${message}`,
      data: { dialogMessage: message }
    };
  }

  /**
   * Send message to participants
   */
  private executeSendMessage(sessionId: string, command: SimulationCommand): CommandExecutionResult {
    const message = command.parameters.join(' ');
    
    return { 
      success: true, 
      message: `Sent message: ${message}`,
      data: { broadcastMessage: message }
    };
  }

  /**
   * Wait for specified duration
   */
  private executeWait(sessionId: string, command: SimulationCommand): CommandExecutionResult {
    const duration = command.parameters.length > 0 ? parseInt(command.parameters[0]) : 1;
    
    return { 
      success: true, 
      message: `Waiting ${duration} seconds`,
      data: { waitDuration: duration }
    };
  }

  /**
   * Set parameter value
   */
  private executeSetParameter(sessionId: string, command: SimulationCommand): CommandExecutionResult {
    if (command.parameters.length < 2) {
      return { success: false, message: 'Set Parameter requires name and value' };
    }

    const paramName = command.parameters[0];
    const paramValue = command.parameters[1];
    
    return { 
      success: true, 
      message: `Set parameter ${paramName} to ${paramValue}`,
      data: { [paramName]: paramValue }
    };
  }

  /**
   * Liquidate all positions for session participants
   */
  private liquidateAllPositions(sessionId: string): void {
    const participants = this.participants.get(sessionId);
    if (!participants) return;

    participants.forEach(participant => {
      // Convert all holdings to cash at current market prices
      for (const [symbol, quantity] of Object.entries(participant.holdings)) {
        if (quantity > 0) {
          const marketPrice = this.getMarketPrice(symbol);
          participant.balance += quantity * marketPrice;
          participant.holdings[symbol] = 0;
        }
      }
    });
  }

  /**
   * Get current market price for security
   */
  private getMarketPrice(symbol: string): number {
    const marketData = this.marketData.get(symbol);
    return marketData?.price || 100; // Default price
  }

  /**
   * Start a simulation scenario
   */
  startSimulation(sessionId: string, scenario: any): CommandExecutionResult {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return { success: false, message: 'Session not found' };
    }

    session.status = 'active';
    
    // Execute start commands
    const startResults = this.executeCommands(sessionId, scenario.startCommands);
    
    // Schedule end commands
    if (scenario.endCommands.length > 0) {
      setTimeout(() => {
        this.executeCommands(sessionId, scenario.endCommands);
      }, scenario.duration * 1000);
    }

    return { 
      success: true, 
      message: `Started simulation scenario: ${scenario.id}`,
      data: { scenario: scenario.id, duration: scenario.duration }
    };
  }

  /**
   * Get session state
   */
  getSessionState(sessionId: string): SessionState | null {
    return this.sessions.get(sessionId) || null;
  }

  /**
   * Get session participants
   */
  getSessionParticipants(sessionId: string): SessionParticipant[] {
    const participants = this.participants.get(sessionId);
    return participants ? Array.from(participants.values()) : [];
  }

  /**
   * Update participant data
   */
  updateParticipant(sessionId: string, userId: string, updates: Partial<SessionParticipant>): boolean {
    const participants = this.participants.get(sessionId);
    const participant = participants?.get(userId);
    
    if (participant) {
      Object.assign(participant, updates);
      return true;
    }
    
    return false;
  }

  /**
   * End session and cleanup
   */
  endSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.status = 'completed';
      session.marketStatus = 'closed';
      
      // Cleanup scheduled commands
      this.scheduledCommands.delete(sessionId);
      
      return true;
    }
    
    return false;
  }
}

// Global instance
export const xmlCommandProcessor = new XMLCommandProcessor();