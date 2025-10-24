/**
 * Session Manager - Manages Trading Sessions with XML Lesson Integration
 * 
 * Handles session lifecycle, privilege management, auction coordination,
 * and real-time analytics for instructor dashboard integration
 */

import { LessonDefinition, LessonSimulation, LessonCommand, WizardItem, lessonLoader } from './lesson-loader';
import { PrivilegeSystem, PRIVILEGE_DEFINITIONS, PrivilegeAuction } from './privilege-system';

export interface TradingSession {
  id: string;
  classId: string;
  instructorId: string;
  lessonId: string;
  simulationId?: string;
  status: 'PREPARING' | 'AUCTION' | 'TRADING' | 'PAUSED' | 'COMPLETED' | 'REPORTING';
  startTime: Date;
  endTime?: Date;
  currentWizardItem?: string;
  participants: SessionParticipant[];
  marketSettings: {
    isOpen: boolean;
    startTick: number;
    currentTick: number;
    marketDelay: number;
    liquidityTraders: LiquidityTrader[];
  };
  privileges: SessionPrivilege[];
  auctions: SessionAuction[];
  metadata: {
    iteration?: number;
    roundNumber?: number;
    totalRounds?: number;
  };
}

export interface SessionParticipant {
  userId: string;
  username: string;
  role: 'STUDENT' | 'INSTRUCTOR' | 'OBSERVER';
  privileges: number[];
  buyingPower: number;
  position: {
    cash: number;
    securities: { [symbol: string]: number };
    unrealizedPnL: number;
    realizedPnL: number;
  };
  connected: boolean;
  lastActivity: Date;
}

export interface SessionPrivilege {
  code: number;
  name: string;
  description: string;
  grantedTo: string[]; // User IDs
  grantedAt: Date;
}

export interface SessionAuction {
  id: string;
  privilegeCode: number;
  privilegeName: string;
  availableRights: number;
  initialPrice: number;
  priceIncrement: number;
  timeInterval: number; // seconds
  status: 'PREPARING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  startTime: Date;
  endTime?: Date;
  bids: AuctionBid[];
  winners: AuctionWinner[];
}

export interface AuctionBid {
  userId: string;
  username: string;
  bidAmount: number;
  timestamp: Date;
  active: boolean;
}

export interface AuctionWinner {
  userId: string;
  username: string;
  finalBid: number;
  privilegesGranted: number;
}

export interface LiquidityTrader {
  id: string;
  name: string;
  active: boolean;
  delay: number; // seconds between trades
  symbols: string[];
  lastTradeTime: Date;
}

export interface SessionCommand {
  id: string;
  sessionId: string;
  commandType: LessonCommand['type'];
  parameters: any[];
  targetRole?: string;
  executedAt: Date;
  executedBy: string;
  result: 'SUCCESS' | 'FAILED' | 'PENDING';
  error?: string;
}

export interface SessionAnalytics {
  sessionId: string;
  participants: ParticipantAnalytics[];
  market: MarketAnalytics;
  trading: TradingAnalytics;
  auctions: AuctionAnalytics[];
  performance: PerformanceMetrics;
  events: SessionEvent[];
}

export interface ParticipantAnalytics {
  userId: string;
  username: string;
  role: string;
  totalTrades: number;
  volume: number;
  pnl: number;
  sharpeRatio: number;
  maxDrawdown: number;
  winRate: number;
  avgTradeSize: number;
  privilegesUsed: number[];
  strategyMetrics: {
    marketMaking: boolean;
    speculation: boolean;
    arbitrage: boolean;
    passiveTrading: boolean;
  };
  timeActive: number; // minutes
  engagement: {
    ordersPlaced: number;
    ordersExecuted: number;
    newsEventsViewed: number;
    analyticsAccessed: number;
  };
}

export interface MarketAnalytics {
  totalVolume: number;
  totalTrades: number;
  avgSpread: number;
  priceVolatility: number;
  marketEfficiency: number;
  liquidityMetrics: {
    bidAskSpread: number;
    marketDepth: number;
    turnover: number;
  };
  priceDiscovery: {
    convergenceTime: number;
    informationIncorporation: number;
    marketMakerImpact: number;
  };
}

export interface TradingAnalytics {
  orderFlow: {
    marketOrders: number;
    limitOrders: number;
    cancelledOrders: number;
    partialFills: number;
  };
  execution: {
    avgExecutionTime: number;
    slippage: number;
    marketImpact: number;
  };
  patterns: {
    momentumTrading: number;
    contrarian: number;
    herding: number;
  };
}

export interface AuctionAnalytics {
  auctionId: string;
  privilegeName: string;
  participationRate: number;
  finalPrice: number;
  totalRevenue: number;
  priceDiscovery: {
    initialPrice: number;
    finalPrice: number;
    priceIncreases: number;
    timeToCompletion: number;
  };
  winnerMetrics: {
    avgWinningBid: number;
    bidDistribution: number[];
    strategicBidding: boolean;
  };
}

export interface PerformanceMetrics {
  overallPnL: number;
  totalVolume: number;
  marketEfficiency: number;
  liquidityProvision: number;
  informationValue: number;
  lessonObjectives: {
    priceFormation: number; // 0-100 score
    marketMaking: number;
    informationFlow: number;
    auctionMechanics: number;
  };
  engagement: {
    participationRate: number;
    avgSessionTime: number;
    interactionQuality: number;
  };
}

export interface SessionEvent {
  id: string;
  timestamp: Date;
  type: 'MARKET_OPEN' | 'MARKET_CLOSE' | 'AUCTION_START' | 'AUCTION_END' | 
        'PRIVILEGE_GRANT' | 'SIMULATION_START' | 'SIMULATION_END' | 'NEWS_INJECTION' |
        'LARGE_TRADE' | 'VOLATILITY_SPIKE' | 'PARTICIPANT_JOIN' | 'PARTICIPANT_LEAVE';
  description: string;
  data: any;
  impact: 'LOW' | 'MEDIUM' | 'HIGH';
}

export class SessionManager {
  private sessions: Map<string, TradingSession> = new Map();
  private sessionAnalytics: Map<string, SessionAnalytics> = new Map();
  private privilegeSystems: Map<string, PrivilegeSystem> = new Map();
  private eventHandlers: Map<string, Function[]> = new Map();

  /**
   * Create a new trading session from a lesson
   */
  async createSession(
    classId: string, 
    instructorId: string, 
    lessonId: string
  ): Promise<TradingSession> {
    const lesson = lessonLoader.getLesson(lessonId);
    if (!lesson) {
      throw new Error(`Lesson not found: ${lessonId}`);
    }

    const sessionId = `SESSION_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const session: TradingSession = {
      id: sessionId,
      classId,
      instructorId,
      lessonId,
      status: 'PREPARING',
      startTime: new Date(),
      currentWizardItem: lesson.initialWizardItem,
      participants: [],
      marketSettings: {
        isOpen: false,
        startTick: lesson.marketSettings.startTick,
        currentTick: lesson.marketSettings.startTick,
        marketDelay: lesson.marketSettings.marketDelay,
        liquidityTraders: []
      },
      privileges: [],
      auctions: [],
      metadata: {
        iteration: 1,
        roundNumber: 1,
        totalRounds: 1
      }
    };

    // Execute global lesson commands
    await this.executeGlobalCommands(session, lesson);

    this.sessions.set(sessionId, session);
    this.initializeSessionAnalytics(sessionId);
    
    // Initialize privilege system for session
    const privilegeSystem = new PrivilegeSystem(sessionId, {
      emit: (event: string, data: any) => this.emitEvent(sessionId, event, data)
    });
    this.privilegeSystems.set(sessionId, privilegeSystem);
    
    this.emitEvent(sessionId, 'SESSION_CREATED', { sessionId, lessonId });
    
    return session;
  }

  /**
   * Execute global lesson commands
   */
  private async executeGlobalCommands(session: TradingSession, lesson: LessonDefinition): Promise<void> {
    for (const command of lesson.globalCommands) {
      await this.executeCommand(session.id, command, 'SYSTEM');
    }
  }

  /**
   * Execute a lesson command
   */
  async executeCommand(
    sessionId: string, 
    command: LessonCommand, 
    executedBy: string
  ): Promise<SessionCommand> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    const sessionCommand: SessionCommand = {
      id: `CMD_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      sessionId,
      commandType: command.type,
      parameters: command.parameters,
      targetRole: command.targetRole,
      executedAt: new Date(),
      executedBy,
      result: 'PENDING'
    };

    try {
      switch (command.type) {
        case 'GRANT_PRIVILEGE':
          await this.handleGrantPrivilege(session, command);
          break;
        case 'REMOVE_PRIVILEGE':
          await this.handleRemovePrivilege(session, command);
          break;
        case 'CREATE_AUCTION':
          await this.handleCreateAuction(session, command);
          break;
        case 'START_AUCTION':
          await this.handleStartAuction(session, command);
          break;
        case 'OPEN_MARKET':
          await this.handleOpenMarket(session, command);
          break;
        case 'CLOSE_MARKET':
          await this.handleCloseMarket(session, command);
          break;
        case 'SET_LIQUIDITY_TRADER':
          await this.handleSetLiquidityTrader(session, command);
          break;
        case 'START_SIMULATION':
          await this.handleStartSimulation(session, command);
          break;
        default:
          console.warn(`Unknown command type: ${command.type}`);
      }

      sessionCommand.result = 'SUCCESS';
      this.emitEvent(sessionId, 'COMMAND_EXECUTED', { command: sessionCommand });
      
    } catch (error: any) {
      sessionCommand.result = 'FAILED';
      sessionCommand.error = error.message;
      console.error(`Command execution failed:`, error);
    }

    return sessionCommand;
  }

  /**
   * Handle grant privilege command
   */
  private async handleGrantPrivilege(session: TradingSession, command: LessonCommand): Promise<void> {
    const privilegeId = command.parameters[0] as number;
    const targetRole = command.targetRole || '$All';
    
    const privilegeSystem = this.privilegeSystems.get(session.id);
    if (!privilegeSystem) {
      throw new Error(`Privilege system not found for session: ${session.id}`);
    }

    // Find target participants
    const targetParticipants = this.getTargetParticipants(session, targetRole);
    const targetUserIds = targetParticipants.map(p => p.userId);
    
    // Grant privilege using privilege system
    try {
      privilegeSystem.grantPrivilege(privilegeId, targetUserIds, 'LESSON_SYSTEM');
      
      // Update participant privileges in session data
      for (const participant of targetParticipants) {
        if (!participant.privileges.includes(privilegeId)) {
          participant.privileges.push(privilegeId);
        }
      }

      this.emitEvent(session.id, 'PRIVILEGE_GRANT', {
        privilegeId,
        privilegeName: PRIVILEGE_DEFINITIONS[privilegeId]?.name || `Privilege ${privilegeId}`,
        targetRole,
        participantCount: targetParticipants.length
      });
    } catch (error) {
      console.error('Failed to grant privilege:', error);
      throw error;
    }
  }

  /**
   * Handle remove privilege command
   */
  private async handleRemovePrivilege(session: TradingSession, command: LessonCommand): Promise<void> {
    const privilegeId = command.parameters[0] as number;
    const targetRole = command.targetRole || '$All';
    
    const privilegeSystem = this.privilegeSystems.get(session.id);
    if (!privilegeSystem) {
      throw new Error(`Privilege system not found for session: ${session.id}`);
    }

    const targetParticipants = this.getTargetParticipants(session, targetRole);
    const targetUserIds = targetParticipants.map(p => p.userId);
    
    // Revoke privilege using privilege system
    try {
      privilegeSystem.revokePrivilege(privilegeId, targetUserIds, 'LESSON_SYSTEM');
      
      // Update participant privileges in session data
      for (const participant of targetParticipants) {
        const index = participant.privileges.indexOf(privilegeId);
        if (index > -1) {
          participant.privileges.splice(index, 1);
        }
      }

      this.emitEvent(session.id, 'PRIVILEGE_REMOVE', {
        privilegeId,
        privilegeName: PRIVILEGE_DEFINITIONS[privilegeId]?.name || `Privilege ${privilegeId}`,
        targetRole,
        participantCount: targetParticipants.length
      });
    } catch (error) {
      console.error('Failed to revoke privilege:', error);
      throw error;
    }
  }

  /**
   * Handle create auction command
   */
  private async handleCreateAuction(session: TradingSession, command: LessonCommand): Promise<void> {
    const privilegeId = command.parameters[0] as number;
    const availableRights = command.parameters[1] as number;
    const initialPrice = command.parameters[2] as number;
    const priceIncrement = command.parameters[3] as number;
    const timeInterval = command.parameters[4] as number;

    const privilegeSystem = this.privilegeSystems.get(session.id);
    if (!privilegeSystem) {
      throw new Error(`Privilege system not found for session: ${session.id}`);
    }

    const privilegeDefinition = PRIVILEGE_DEFINITIONS[privilegeId];
    if (!privilegeDefinition) {
      throw new Error(`Unknown privilege ID: ${privilegeId}`);
    }

    if (!privilegeDefinition.auctionable) {
      throw new Error(`Privilege ${privilegeId} is not auctionable`);
    }

    // Start auction using privilege system
    const auctionId = privilegeSystem.startPrivilegeAuction(
      privilegeId,
      initialPrice,
      timeInterval
    );

    // Update session state
    session.status = 'AUCTION';

    this.emitEvent(session.id, 'AUCTION_CREATED', {
      auctionId,
      privilegeId,
      privilegeName: privilegeDefinition.name,
      availableRights,
      initialPrice,
      timeInterval
    });
  }

  /**
   * Handle start auction command
   */
  private async handleStartAuction(session: TradingSession, command: LessonCommand): Promise<void> {
    const privilegeSystem = this.privilegeSystems.get(session.id);
    if (!privilegeSystem) {
      throw new Error(`Privilege system not found for session: ${session.id}`);
    }

    const activeAuctions = privilegeSystem.getActiveAuctions();
    if (activeAuctions.length === 0) {
      throw new Error('No active auctions found');
    }

    // The auction was already started when created, just emit the event
    const auction = activeAuctions[0]; // Get the most recent auction
    
    this.emitEvent(session.id, 'AUCTION_START', {
      auctionId: auction.id,
      privilegeId: auction.privilegeId,
      privilegeName: PRIVILEGE_DEFINITIONS[auction.privilegeId]?.name || `Privilege ${auction.privilegeId}`
    });
  }

  /**
   * Handle open market command
   */
  private async handleOpenMarket(session: TradingSession, command: LessonCommand): Promise<void> {
    const marketDelay = command.parameters[0] as number || session.marketSettings.marketDelay;
    
    // Wait for market delay
    setTimeout(() => {
      session.marketSettings.isOpen = true;
      session.status = 'TRADING';
      
      this.emitEvent(session.id, 'MARKET_OPEN', {
        marketDelay,
        startTick: session.marketSettings.currentTick
      });
    }, marketDelay * 1000);
  }

  /**
   * Handle close market command
   */
  private async handleCloseMarket(session: TradingSession, command: LessonCommand): Promise<void> {
    session.marketSettings.isOpen = false;
    session.status = 'COMPLETED';
    session.endTime = new Date();

    this.emitEvent(session.id, 'MARKET_CLOSE', {
      endTick: session.marketSettings.currentTick,
      duration: session.endTime.getTime() - session.startTime.getTime()
    });
  }

  /**
   * Handle set liquidity trader command
   */
  private async handleSetLiquidityTrader(session: TradingSession, command: LessonCommand): Promise<void> {
    const traderId = command.parameters[0] as number;
    const setting = command.parameters[1] as string;
    const value = command.parameters[2];

    let trader = session.marketSettings.liquidityTraders.find(t => t.id === traderId.toString());
    if (!trader) {
      trader = {
        id: traderId.toString(),
        name: `Liquidity Trader ${traderId}`,
        active: false,
        delay: 8,
        symbols: ['AOE', 'BOND1', 'BOND2'],
        lastTradeTime: new Date()
      };
      session.marketSettings.liquidityTraders.push(trader);
    }

    switch (setting) {
      case 'Active':
        trader.active = value as boolean;
        break;
      case 'Delay':
        trader.delay = value as number;
        break;
    }

    this.emitEvent(session.id, 'LIQUIDITY_TRADER_UPDATE', {
      traderId,
      setting,
      value
    });
  }

  /**
   * Handle start simulation command
   */
  private async handleStartSimulation(session: TradingSession, command: LessonCommand): Promise<void> {
    const simulationId = command.parameters[0] as string;
    const lesson = lessonLoader.getLesson(session.lessonId);
    const simulation = lesson?.simulations[simulationId];
    
    if (!simulation) {
      throw new Error(`Simulation not found: ${simulationId}`);
    }

    session.simulationId = simulationId;
    session.status = 'TRADING';

    // Execute simulation start commands
    for (const cmd of simulation.startCommands) {
      await this.executeCommand(session.id, cmd, 'SYSTEM');
    }

    this.emitEvent(session.id, 'SIMULATION_START', {
      simulationId,
      duration: simulation.duration
    });

    // Schedule simulation end
    setTimeout(async () => {
      await this.endSimulation(session.id);
    }, simulation.duration * 1000);
  }

  /**
   * End simulation
   */
  private async endSimulation(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session || !session.simulationId) return;

    const lesson = lessonLoader.getLesson(session.lessonId);
    const simulation = lesson?.simulations[session.simulationId];
    
    if (simulation) {
      // Execute simulation end commands
      for (const cmd of simulation.endCommands) {
        await this.executeCommand(sessionId, cmd, 'SYSTEM');
      }
    }

    session.status = 'REPORTING';
    this.emitEvent(sessionId, 'SIMULATION_END', {
      simulationId: session.simulationId
    });
  }

  /**
   * Get target participants based on role
   */
  private getTargetParticipants(session: TradingSession, targetRole: string): SessionParticipant[] {
    switch (targetRole) {
      case '$All':
        return session.participants;
      case '$Students':
        return session.participants.filter(p => p.role === 'STUDENT');
      case '$Speculators':
        // Participants without market making privileges
        return session.participants.filter(p => !p.privileges.includes(22));
      case '$MarketMakers':
        // Participants with market making privileges
        return session.participants.filter(p => p.privileges.includes(22));
      default:
        return session.participants;
    }
  }

  /**
   * Initialize session analytics
   */
  private initializeSessionAnalytics(sessionId: string): void {
    const analytics: SessionAnalytics = {
      sessionId,
      participants: [],
      market: {
        totalVolume: 0,
        totalTrades: 0,
        avgSpread: 0,
        priceVolatility: 0,
        marketEfficiency: 0,
        liquidityMetrics: {
          bidAskSpread: 0,
          marketDepth: 0,
          turnover: 0
        },
        priceDiscovery: {
          convergenceTime: 0,
          informationIncorporation: 0,
          marketMakerImpact: 0
        }
      },
      trading: {
        orderFlow: {
          marketOrders: 0,
          limitOrders: 0,
          cancelledOrders: 0,
          partialFills: 0
        },
        execution: {
          avgExecutionTime: 0,
          slippage: 0,
          marketImpact: 0
        },
        patterns: {
          momentumTrading: 0,
          contrarian: 0,
          herding: 0
        }
      },
      auctions: [],
      performance: {
        overallPnL: 0,
        totalVolume: 0,
        marketEfficiency: 0,
        liquidityProvision: 0,
        informationValue: 0,
        lessonObjectives: {
          priceFormation: 0,
          marketMaking: 0,
          informationFlow: 0,
          auctionMechanics: 0
        },
        engagement: {
          participationRate: 0,
          avgSessionTime: 0,
          interactionQuality: 0
        }
      },
      events: []
    };

    this.sessionAnalytics.set(sessionId, analytics);
  }

  /**
   * Get session analytics
   */
  getSessionAnalytics(sessionId: string): SessionAnalytics | null {
    return this.sessionAnalytics.get(sessionId) || null;
  }

  /**
   * Add participant to session
   */
  addParticipant(sessionId: string, participant: Omit<SessionParticipant, 'privileges' | 'position' | 'connected' | 'lastActivity'>): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const fullParticipant: SessionParticipant = {
      ...participant,
      privileges: [],
      buyingPower: 100000, // Default buying power
      position: {
        cash: 100000,
        securities: {},
        unrealizedPnL: 0,
        realizedPnL: 0
      },
      connected: true,
      lastActivity: new Date()
    };

    session.participants.push(fullParticipant);
    this.emitEvent(sessionId, 'PARTICIPANT_JOIN', { userId: participant.userId, username: participant.username });
  }

  /**
   * Remove participant from session
   */
  removeParticipant(sessionId: string, userId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const index = session.participants.findIndex(p => p.userId === userId);
    if (index > -1) {
      const participant = session.participants[index];
      session.participants.splice(index, 1);
      this.emitEvent(sessionId, 'PARTICIPANT_LEAVE', { userId, username: participant.username });
    }
  }

  /**
   * Get session by ID
   */
  getSession(sessionId: string): TradingSession | null {
    return this.sessions.get(sessionId) || null;
  }

  /**
   * Get all sessions for a class
   */
  getClassSessions(classId: string): TradingSession[] {
    return Array.from(this.sessions.values()).filter(s => s.classId === classId);
  }

  /**
   * Emit event to handlers
   */
  private emitEvent(sessionId: string, eventType: string, data: any): void {
    const handlers = this.eventHandlers.get(eventType) || [];
    const event: SessionEvent = {
      id: `EVENT_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      timestamp: new Date(),
      type: eventType as any,
      description: `${eventType} occurred in session ${sessionId}`,
      data,
      impact: 'MEDIUM'
    };

    // Add to session analytics
    const analytics = this.sessionAnalytics.get(sessionId);
    if (analytics) {
      analytics.events.push(event);
    }

    // Call handlers
    handlers.forEach(handler => {
      try {
        handler(sessionId, event);
      } catch (error) {
        console.error(`Event handler error:`, error);
      }
    });
  }

  /**
   * Register event handler
   */
  onEvent(eventType: string, handler: (sessionId: string, event: SessionEvent) => void): void {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, []);
    }
    this.eventHandlers.get(eventType)!.push(handler);
  }

  /**
   * Get privilege system for a session
   */
  getPrivilegeSystem(sessionId: string): PrivilegeSystem | undefined {
    return this.privilegeSystems.get(sessionId);
  }

  /**
   * Place bid in privilege auction
   */
  placeBid(sessionId: string, auctionId: string, userId: string, amount: number): boolean {
    const privilegeSystem = this.privilegeSystems.get(sessionId);
    if (!privilegeSystem) {
      throw new Error(`Privilege system not found for session: ${sessionId}`);
    }

    return privilegeSystem.placeBid(auctionId, userId, amount);
  }

  /**
   * Get active auctions for a session
   */
  getActiveAuctions(sessionId: string): PrivilegeAuction[] {
    const privilegeSystem = this.privilegeSystems.get(sessionId);
    if (!privilegeSystem) {
      return [];
    }

    return privilegeSystem.getActiveAuctions();
  }

  /**
   * Check if user has privilege in session
   */
  hasPrivilege(sessionId: string, userId: string, privilegeId: number): boolean {
    const privilegeSystem = this.privilegeSystems.get(sessionId);
    if (!privilegeSystem) {
      return false;
    }

    return privilegeSystem.hasPrivilege(userId, privilegeId);
  }

  /**
   * Get privilege matrix for session (for instructor dashboard)
   */
  getPrivilegeMatrix(sessionId: string): Record<string, Record<number, boolean>> {
    const privilegeSystem = this.privilegeSystems.get(sessionId);
    if (!privilegeSystem) {
      return {};
    }

    return privilegeSystem.getPrivilegeMatrix();
  }

  /**
   * Get privilege statistics for session analytics
   */
  getPrivilegeStats(sessionId: string): Record<number, { 
    holders: number; 
    totalGranted: number; 
    auctionWins: number; 
    averageBid?: number;
  }> {
    const privilegeSystem = this.privilegeSystems.get(sessionId);
    if (!privilegeSystem) {
      return {};
    }

    return privilegeSystem.getPrivilegeStats();
  }

  /**
   * Add participant to session and initialize privileges
   */

  /**
   * Remove participant from session
   */

  /**
   * Clean up session resources
   */
  endSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.status = 'COMPLETED';
      session.endTime = new Date();
    }

    // Clean up privilege system
    const privilegeSystem = this.privilegeSystems.get(sessionId);
    if (privilegeSystem) {
      privilegeSystem.reset();
      this.privilegeSystems.delete(sessionId);
    }

    this.emitEvent(sessionId, 'SESSION_ENDED', { sessionId });
  }
}

// Global session manager instance
export const sessionManager = new SessionManager();