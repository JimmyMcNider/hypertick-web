/**
 * Enhanced Session Engine - Real-time Command Execution
 * 
 * Executes lesson commands, manages session state, and coordinates
 * real-time trading simulation with WebSocket communication
 */

import { EventEmitter } from 'events';
import { LessonDefinition, LessonCommand, LessonSimulation } from './lesson-loader';

export interface SessionParticipant {
  id: string;
  username: string;
  role: 'STUDENT' | 'INSTRUCTOR' | 'ADMIN';
  privileges: Set<number>;
  socketId?: string;
  isConnected: boolean;
  lastActivity: Date;
  performance: {
    totalPnL: number;
    tradesExecuted: number;
    averageSpread: number;
    riskScore: number;
  };
}

export interface MarketState {
  isOpen: boolean;
  symbols: Map<string, {
    price: number;
    volume: number;
    lastUpdate: Date;
    bidPrice?: number;
    askPrice?: number;
    bidSize?: number;
    askSize?: number;
    dayHigh: number;
    dayLow: number;
    openPrice: number;
  }>;
  liquidityProviders: Set<string>;
  auctionsActive: Map<string, {
    symbol: string;
    endTime: Date;
    currentBid: number;
    highestBidder?: string;
    minimumBid: number;
  }>;
}

export interface ActiveSession {
  id: string;
  lessonId: string;
  scenario: string;
  classId: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';
  startTime: Date;
  endTime?: Date;
  participants: Map<string, SessionParticipant>;
  marketState: MarketState;
  executedCommands: Set<string>;
  pendingCommands: LessonCommand[];
  currentLesson: LessonDefinition;
  sessionTimer?: NodeJS.Timeout;
  eventLog: SessionEvent[];
}

export interface SessionEvent {
  id: string;
  timestamp: Date;
  type: 'SESSION_INITIALIZED' | 'SESSION_STARTED' | 'SESSION_COMPLETED' | 'SESSION_PAUSED' | 'SESSION_RESUMED' |
        'COMMAND_EXECUTED' | 'COMMAND_SKIPPED' | 'COMMAND_ERROR' | 'PARTICIPANT_JOINED' | 'PARTICIPANT_LEFT' | 
        'TRADE_EXECUTED' | 'MARKET_OPENED' | 'MARKET_CLOSED' | 'AUCTION_STARTED' | 'AUCTION_ENDED' |
        'NEWS_INJECTED' | 'PRICE_UPDATED';
  data: any;
  triggeredBy?: string; // user ID
}

export class EnhancedSessionEngine extends EventEmitter {
  private activeSessions: Map<string, ActiveSession> = new Map();
  private commandSchedulers: Map<string, NodeJS.Timeout[]> = new Map();

  /**
   * Initialize a new trading session from lesson
   */
  async initializeSession(
    sessionId: string,
    lessonId: string,
    scenario: string,
    classId: string,
    lesson: LessonDefinition
  ): Promise<ActiveSession> {
    const simulationData = lesson.simulations[scenario];
    if (!simulationData) {
      throw new Error(`Simulation ${scenario} not found in lesson ${lessonId}`);
    }

    // Initialize market state
    const marketState: MarketState = {
      isOpen: true,
      symbols: new Map(),
      liquidityProviders: new Set(),
      auctionsActive: new Map()
    };

    // Set initial prices for default symbols
    const defaultSymbols = [
      { symbol: 'AOE', price: 50.00 },
      { symbol: 'BOND1', price: 100.00 }
    ];
    for (const { symbol, price } of defaultSymbols) {
      marketState.symbols.set(symbol, {
        price,
        volume: 0,
        lastUpdate: new Date(),
        dayHigh: price,
        dayLow: price,
        openPrice: price
      });
    }

    const session: ActiveSession = {
      id: sessionId,
      lessonId,
      scenario,
      classId,
      status: 'PENDING',
      startTime: new Date(),
      participants: new Map(),
      marketState,
      executedCommands: new Set(),
      pendingCommands: [...simulationData.startCommands, ...simulationData.endCommands],
      currentLesson: lesson,
      eventLog: []
    };

    this.activeSessions.set(sessionId, session);
    this.logEvent(session, 'SESSION_INITIALIZED', { lessonId, scenario });

    return session;
  }

  /**
   * Start session and begin command execution
   */
  async startSession(sessionId: string): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    session.status = 'IN_PROGRESS';
    session.startTime = new Date();
    
    // Grant default privileges to all participants
    const defaultPrivileges = [1, 4, 5, 8, 9, 10, 11, 12, 13, 15]; // Basic privileges
    for (const participant of session.participants.values()) {
      if (participant.role === 'STUDENT') {
        defaultPrivileges.forEach(privilege => participant.privileges.add(privilege));
      }
    }

    // Schedule all lesson commands
    this.scheduleCommands(session);
    
    this.logEvent(session, 'SESSION_STARTED', { participantCount: session.participants.size });
    this.emit('session_started', { sessionId, session });
  }

  /**
   * Schedule lesson commands for execution
   */
  private scheduleCommands(session: ActiveSession): void {
    const timers: NodeJS.Timeout[] = [];

    for (const command of session.pendingCommands) {
      const timer = setTimeout(() => {
        this.executeCommand(session.id, command);
      }, 1000); // Execute commands with 1 second delay

      timers.push(timer);
    }

    this.commandSchedulers.set(session.id, timers);
  }

  /**
   * Execute a lesson command
   */
  async executeCommand(sessionId: string, command: LessonCommand): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (!session || session.status !== 'IN_PROGRESS') {
      return;
    }

    // Check if command has already been executed
    if (session.executedCommands.has(command.id)) {
      return;
    }

    // Validate command conditions
    if (!this.validateCommandConditions(session, command)) {
      this.logEvent(session, 'COMMAND_SKIPPED', { 
        commandId: command.id, 
        reason: 'Conditions not met' 
      });
      return;
    }

    try {
      await this.processCommand(session, command);
      session.executedCommands.add(command.id);
      
      this.logEvent(session, 'COMMAND_EXECUTED', {
        commandId: command.id,
        type: command.type,
        parameters: command.parameters
      });

      this.emit('command_executed', { sessionId, command, session });
    } catch (error) {
      console.error(`Error executing command ${command.id}:`, error);
      this.logEvent(session, 'COMMAND_ERROR', {
        commandId: command.id,
        error: (error as Error).message
      });
    }
  }

  /**
   * Process individual command types
   */
  private async processCommand(session: ActiveSession, command: LessonCommand): Promise<void> {
    switch (command.type) {
      case 'GRANT_PRIVILEGE':
        await this.grantPrivilege(session, command.parameters);
        break;

      case 'SET_LIQUIDITY_TRADER':
        await this.setLiquidityTrader(session, command.parameters);
        break;

      case 'OPEN_MARKET':
        await this.openMarket(session, command.parameters);
        break;

      case 'CLOSE_MARKET':
        await this.closeMarket(session, command.parameters);
        break;

      case 'CREATE_AUCTION':
        await this.createAuction(session, command.parameters);
        break;

      case 'REMOVE_PRIVILEGE':
        await this.removePrivilege(session, command.parameters);
        break;

      case 'START_AUCTION':
        await this.startAuction(session, command.parameters);
        break;

      case 'UNDO_AUCTION':
        await this.undoAuction(session, command.parameters);
        break;

      case 'START_SIMULATION':
        await this.startSimulation(session, command.parameters);
        break;

      case 'SET_MARKET':
        await this.setMarket(session, command.parameters);
        break;

      case 'SET_WIZARD_ITEM':
        await this.setWizardItem(session, command.parameters);
        break;

      default:
        console.warn(`Unknown command type: ${command.type}`);
    }
  }

  /**
   * Grant privilege to participants
   */
  private async grantPrivilege(session: ActiveSession, params: any): Promise<void> {
    const { privilegeCode, targetRole, targetUsers } = params;

    for (const participant of session.participants.values()) {
      const shouldGrant = targetUsers 
        ? targetUsers.includes(participant.username)
        : participant.role === targetRole;

      if (shouldGrant) {
        participant.privileges.add(privilegeCode);
      }
    }

    this.emit('privilege_granted', { 
      sessionId: session.id, 
      privilegeCode, 
      targetRole, 
      targetUsers 
    });
  }

  /**
   * Set liquidity trader status
   */
  private async setLiquidityTrader(session: ActiveSession, params: any): Promise<void> {
    const { username, enabled } = params;
    
    if (enabled) {
      session.marketState.liquidityProviders.add(username);
    } else {
      session.marketState.liquidityProviders.delete(username);
    }

    this.emit('liquidity_trader_updated', { 
      sessionId: session.id, 
      username, 
      enabled 
    });
  }

  /**
   * Open market for trading
   */
  private async openMarket(session: ActiveSession, params: any): Promise<void> {
    const { symbols } = params;
    
    session.marketState.isOpen = true;
    
    if (symbols) {
      // Enable specific symbols
      for (const symbol of symbols) {
        const symbolData = session.marketState.symbols.get(symbol);
        if (symbolData) {
          symbolData.lastUpdate = new Date();
        }
      }
    }

    this.logEvent(session, 'MARKET_OPENED', { symbols });
    this.emit('market_opened', { sessionId: session.id, symbols });
  }

  /**
   * Close market
   */
  private async closeMarket(session: ActiveSession, params: any): Promise<void> {
    const { symbols } = params;
    
    if (!symbols) {
      session.marketState.isOpen = false;
    }

    this.logEvent(session, 'MARKET_CLOSED', { symbols });
    this.emit('market_closed', { sessionId: session.id, symbols });
  }

  /**
   * Create market making auction
   */
  private async createAuction(session: ActiveSession, params: any): Promise<void> {
    const { symbol, duration, minimumBid, description } = params;
    
    const endTime = new Date(Date.now() + duration * 1000);
    const auctionId = `${session.id}_${symbol}_${Date.now()}`;

    session.marketState.auctionsActive.set(auctionId, {
      symbol,
      endTime,
      currentBid: minimumBid,
      minimumBid
    });

    // Schedule auction end
    setTimeout(() => {
      this.endAuction(session.id, auctionId);
    }, duration * 1000);

    this.logEvent(session, 'AUCTION_STARTED', { symbol, duration, minimumBid });
    this.emit('auction_started', { 
      sessionId: session.id, 
      auctionId, 
      symbol, 
      endTime, 
      minimumBid 
    });
  }

  /**
   * Set market price (simulate large order impact)
   */
  private async setPrice(session: ActiveSession, params: any): Promise<void> {
    const { symbol, price, volume } = params;
    
    const symbolData = session.marketState.symbols.get(symbol);
    if (symbolData) {
      symbolData.price = price;
      symbolData.volume += volume || 0;
      symbolData.lastUpdate = new Date();
      symbolData.dayHigh = Math.max(symbolData.dayHigh, price);
      symbolData.dayLow = Math.min(symbolData.dayLow, price);
    }

    this.logEvent(session, 'PRICE_UPDATED', { symbol, price, volume });
    this.emit('price_updated', { sessionId: session.id, symbol, price, volume });
  }

  /**
   * Inject news event
   */
  private async injectNews(session: ActiveSession, params: any): Promise<void> {
    const { headline, impact, symbols, source } = params;
    
    const newsEvent = {
      id: `news_${Date.now()}`,
      headline,
      impact,
      symbols,
      source,
      timestamp: new Date().toISOString()
    };

    this.logEvent(session, 'NEWS_INJECTED', newsEvent);
    this.emit('news_injected', { sessionId: session.id, news: newsEvent });
  }

  /**
   * Trigger special market event
   */
  private async triggerEvent(session: ActiveSession, params: any): Promise<void> {
    const { type, intensity, duration, affectedSymbols } = params;
    
    // Process different event types
    switch (type) {
      case 'VOLATILITY_SPIKE':
        await this.simulateVolatilitySpike(session, affectedSymbols, intensity, duration);
        break;
      case 'LIQUIDITY_CRISIS':
        await this.simulateLiquidityCrisis(session, affectedSymbols);
        break;
      case 'CIRCUIT_BREAKER':
        await this.triggerCircuitBreaker(session, affectedSymbols);
        break;
    }

    this.emit('event_triggered', { sessionId: session.id, type, params });
  }

  /**
   * Simulate volatility spike
   */
  private async simulateVolatilitySpike(
    session: ActiveSession, 
    symbols: string[], 
    intensity: string, 
    duration: number
  ): Promise<void> {
    const volatilityMultiplier = intensity === 'HIGH' ? 3.0 : intensity === 'MEDIUM' ? 2.0 : 1.5;
    
    // Increase price movements for affected symbols
    for (const symbol of symbols) {
      const symbolData = session.marketState.symbols.get(symbol);
      if (symbolData) {
        // Simulate random price movements
        const interval = setInterval(() => {
          const randomChange = (Math.random() - 0.5) * volatilityMultiplier;
          const newPrice = symbolData.price * (1 + randomChange / 100);
          this.setPrice(session, { symbol, price: newPrice, volume: Math.floor(Math.random() * 1000) });
        }, 1000);

        // Stop after duration
        setTimeout(() => clearInterval(interval), duration * 1000);
      }
    }
  }

  /**
   * Add participant to session
   */
  addParticipant(sessionId: string, participant: SessionParticipant): void {
    const session = this.activeSessions.get(sessionId);
    if (!session) return;

    session.participants.set(participant.id, participant);
    this.logEvent(session, 'PARTICIPANT_JOINED', { 
      participantId: participant.id, 
      username: participant.username,
      role: participant.role 
    });
    this.emit('participant_joined', { sessionId, participant });
  }

  /**
   * Remove participant from session
   */
  removeParticipant(sessionId: string, participantId: string): void {
    const session = this.activeSessions.get(sessionId);
    if (!session) return;

    const participant = session.participants.get(participantId);
    if (participant) {
      session.participants.delete(participantId);
      this.logEvent(session, 'PARTICIPANT_LEFT', { 
        participantId, 
        username: participant.username 
      });
      this.emit('participant_left', { sessionId, participantId });
    }
  }

  /**
   * Pause session
   */
  async pauseSession(sessionId: string): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (!session) return;

    session.status = 'PAUSED';
    
    // Clear all scheduled commands
    const timers = this.commandSchedulers.get(sessionId);
    if (timers) {
      timers.forEach(timer => clearTimeout(timer));
    }

    this.logEvent(session, 'SESSION_PAUSED', {});
    this.emit('session_paused', { sessionId });
  }

  /**
   * Resume session
   */
  async resumeSession(sessionId: string): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (!session) return;

    session.status = 'IN_PROGRESS';
    
    // Reschedule remaining commands
    const remainingCommands = session.pendingCommands.filter(
      cmd => !session.executedCommands.has(cmd.id)
    );

    const timers: NodeJS.Timeout[] = [];
    for (const command of remainingCommands) {
      const delay = 1000; // Default 1 second delay
      const timer = setTimeout(() => {
        this.executeCommand(sessionId, command);
      }, delay);
      timers.push(timer);
    }
    
    this.commandSchedulers.set(sessionId, timers);
    this.logEvent(session, 'SESSION_RESUMED', {});
    this.emit('session_resumed', { sessionId });
  }

  /**
   * End session
   */
  async endSession(sessionId: string): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (!session) return;

    session.status = 'COMPLETED';
    session.endTime = new Date();

    // Clear all timers
    const timers = this.commandSchedulers.get(sessionId);
    if (timers) {
      timers.forEach(timer => clearTimeout(timer));
      this.commandSchedulers.delete(sessionId);
    }

    this.logEvent(session, 'SESSION_COMPLETED', { 
      duration: session.endTime.getTime() - session.startTime.getTime() 
    });
    this.emit('session_completed', { sessionId, session });
  }

  /**
   * Get session state
   */
  getSession(sessionId: string): ActiveSession | null {
    return this.activeSessions.get(sessionId) || null;
  }

  /**
   * Get all active sessions
   */
  getActiveSessions(): ActiveSession[] {
    return Array.from(this.activeSessions.values());
  }

  /**
   * Validate command conditions
   */
  private validateCommandConditions(session: ActiveSession, command: LessonCommand): boolean {
    // Simplified validation - always return true for now
    return true;
  }

  /**
   * Log session event
   */
  private logEvent(session: ActiveSession, type: SessionEvent['type'], data: any): void {
    const event: SessionEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      type,
      data
    };

    session.eventLog.push(event);
    
    // Keep only last 1000 events to prevent memory bloat
    if (session.eventLog.length > 1000) {
      session.eventLog = session.eventLog.slice(-1000);
    }
  }

  /**
   * End auction
   */
  private endAuction(sessionId: string, auctionId: string): void {
    const session = this.activeSessions.get(sessionId);
    if (!session) return;

    const auction = session.marketState.auctionsActive.get(auctionId);
    if (auction) {
      session.marketState.auctionsActive.delete(auctionId);
      
      this.logEvent(session, 'AUCTION_ENDED', {
        auctionId,
        symbol: auction.symbol,
        winningBid: auction.currentBid,
        winner: auction.highestBidder
      });

      this.emit('auction_ended', { 
        sessionId, 
        auctionId, 
        winner: auction.highestBidder, 
        winningBid: auction.currentBid 
      });
    }
  }

  /**
   * Simulate liquidity crisis
   */
  private async simulateLiquidityCrisis(session: ActiveSession, symbols: string[]): Promise<void> {
    // Widen spreads and reduce available liquidity
    for (const symbol of symbols) {
      const symbolData = session.marketState.symbols.get(symbol);
      if (symbolData) {
        // Simulate wider spreads
        symbolData.bidPrice = symbolData.price * 0.995;
        symbolData.askPrice = symbolData.price * 1.005;
        symbolData.bidSize = Math.floor((symbolData.bidSize || 1000) * 0.3);
        symbolData.askSize = Math.floor((symbolData.askSize || 1000) * 0.3);
      }
    }
  }

  /**
   * Trigger circuit breaker
   */
  private async triggerCircuitBreaker(session: ActiveSession, symbols: string[]): Promise<void> {
    // Temporarily halt trading
    const originalState = session.marketState.isOpen;
    session.marketState.isOpen = false;

    // Resume after 5 minutes
    setTimeout(() => {
      session.marketState.isOpen = originalState;
      this.emit('circuit_breaker_lifted', { sessionId: session.id, symbols });
    }, 5 * 60 * 1000);
  }

  /**
   * Remove privilege stub
   */
  private async removePrivilege(session: ActiveSession, parameters: any[]): Promise<void> {
    console.log('Remove privilege command executed:', parameters);
  }

  /**
   * Start auction stub
   */
  private async startAuction(session: ActiveSession, parameters: any[]): Promise<void> {
    console.log('Start auction command executed:', parameters);
  }

  /**
   * Undo auction stub
   */
  private async undoAuction(session: ActiveSession, parameters: any[]): Promise<void> {
    console.log('Undo auction command executed:', parameters);
  }

  /**
   * Start simulation stub
   */
  private async startSimulation(session: ActiveSession, parameters: any[]): Promise<void> {
    console.log('Start simulation command executed:', parameters);
  }

  /**
   * Set market stub
   */
  private async setMarket(session: ActiveSession, parameters: any[]): Promise<void> {
    console.log('Set market command executed:', parameters);
  }

  /**
   * Set wizard item stub
   */
  private async setWizardItem(session: ActiveSession, parameters: any[]): Promise<void> {
    console.log('Set wizard item command executed:', parameters);
  }
}

// Global enhanced session engine instance
export const enhancedSessionEngine = new EnhancedSessionEngine();