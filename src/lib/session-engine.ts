/**
 * Session State Management Engine
 * 
 * Manages simulation session state, event processing, and real-time synchronization
 * Preserves all legacy upTick session behavior and event sequencing
 */

import { EventEmitter } from 'events';
import { prisma } from './prisma';
import { XMLLessonParser, LessonConfig, Command } from './xml-parser';
import { authzService } from './auth';
import { getOrderMatchingEngine } from './order-matching-engine';

export interface SessionState {
  id: string;
  lessonId: string;
  classId: string;
  scenario: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';
  currentTick: number;
  startTime?: Date;
  endTime?: Date;
  duration: number;
  iteration: number;
  marketState: {
    isOpen: boolean;
    liquidityActive: boolean;
    liquidityDelay: number;
    currentPrice?: number;
    volume: number;
  };
  participants: SessionParticipant[];
  events: SessionEvent[];
}

export interface SessionParticipant {
  userId: string;
  username: string;
  role?: string; // $Speculators, market maker, etc.
  equity: number;
  startingEquity: number;
  seatCosts: number;
  infoCosts: number;
  transactionCosts: number;
  positions: Position[];
  privileges: number[];
  isActive: boolean;
}

export interface Position {
  securityId: string;
  symbol: string;
  quantity: number;
  avgPrice: number;
  unrealizedPnL: number;
  realizedPnL: number;
}

export interface SessionEvent {
  id: string;
  command: string;
  parameters: any[];
  timestamp: Date;
  sequence: number;
  processed: boolean;
}

export interface AuctionState {
  id: string;
  privilegeType: number;
  available: number;
  currentPrice: number;
  increment: number;
  round: number;
  timeRemaining: number;
  bidders: AuctionBid[];
  status: 'PENDING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
}

export interface AuctionBid {
  userId: string;
  username: string;
  amount: number;
  timestamp: Date;
}

/**
 * Main session engine class
 */
export class SessionEngine extends EventEmitter {
  private sessions: Map<string, SessionState> = new Map();
  private auctions: Map<string, AuctionState> = new Map();
  private xmlParser: XMLLessonParser;
  private timers: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    super();
    this.xmlParser = new XMLLessonParser();
  }

  /**
   * Create a new simulation session
   */
  async createSession(
    lessonId: string,
    classId: string,
    scenario: string,
    instructorId: string
  ): Promise<SessionState> {
    console.log('🔧 SessionEngine.createSession() starting...', { lessonId, classId, scenario, instructorId });

    try {
      // Get lesson configuration
      console.log('📚 Fetching lesson from database...');
      const lesson = await prisma.lesson.findUnique({
        where: { id: lessonId }
      });

      if (!lesson) {
        console.error('❌ Lesson not found in database:', lessonId);
        throw new Error('Lesson not found');
      }

      console.log('✅ Lesson found:', { id: lesson.id, name: lesson.name });

      // Parse lesson XML
      console.log('📄 Parsing lesson XML configuration...');
      const lessonConfig = await this.xmlParser.parseLesson(lesson.xmlConfig);
      console.log('✅ XML parsed successfully. Simulations available:', lessonConfig.simulations.map(s => s.id));

      const simulation = lessonConfig.simulations.find(s => s.id === scenario);

      if (!simulation) {
        console.error('❌ Simulation scenario not found:', { scenario, availableScenarios: lessonConfig.simulations.map(s => s.id) });
        throw new Error(`Simulation scenario ${scenario} not found`);
      }

      console.log('✅ Simulation scenario found:', { id: simulation.id, duration: simulation.duration });

      // Create session in database
      console.log('💾 Creating session in database...');
      const dbSession = await prisma.simulationSession.create({
      data: {
        lessonId,
        classId,
        scenario,
        duration: simulation.duration,
        status: 'PENDING'
      }
      });

      console.log('✅ Database session created:', { id: dbSession.id, status: dbSession.status });

      // Get class participants
      console.log('👥 Fetching class participants...');
      const enrollments = await prisma.classEnrollment.findMany({
        where: { classId },
        include: { user: true }
      });

      console.log('✅ Class participants found:', enrollments.length);

      // Initialize session state
      console.log('🏗️ Initializing session state...');
      const sessionState: SessionState = {
      id: dbSession.id,
      lessonId,
      classId,
      scenario,
      status: 'PENDING',
      currentTick: 0,
      duration: simulation.duration,
      iteration: 1,
      marketState: {
        isOpen: false,
        liquidityActive: true,
        liquidityDelay: 8,
        volume: 0
      },
      participants: enrollments.map(enrollment => ({
        userId: enrollment.user.id,
        username: enrollment.user.username,
        equity: 100000,
        startingEquity: 100000,
        seatCosts: 0,
        infoCosts: 0,
        transactionCosts: 0,
        positions: [],
        privileges: [],
        isActive: true
      })),
      events: []
    };

      // Store session in memory
      console.log('💾 Storing session in memory...');
      this.sessions.set(dbSession.id, sessionState);

      // Initialize session with lesson configuration
      console.log('⚙️ Initializing session with lesson configuration...');
      await this.initializeSession(dbSession.id, lessonConfig);

      console.log('🎉 Session created successfully:', sessionState.id);
      this.emit('sessionCreated', sessionState);
      return sessionState;

    } catch (error) {
      console.error('💥 SessionEngine.createSession() failed:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        lessonId,
        classId,
        scenario,
        instructorId
      });
      throw error;
    }
  }

  /**
   * Initialize session with lesson configuration
   */
  private async initializeSession(sessionId: string, lessonConfig: LessonConfig): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error('Session not found');

    // Grant base privileges to all participants
    for (const privilege of lessonConfig.privileges) {
      if (privilege.userGroup === '$All' || !privilege.userGroup) {
        for (const participant of session.participants) {
          await this.grantPrivilege(sessionId, participant.userId, privilege.code);
        }
      }
    }

    // Apply market settings
    session.marketState.liquidityDelay = lessonConfig.marketSettings.marketDelay;
    session.currentTick = lessonConfig.marketSettings.startTick;

    // Store updated session
    this.sessions.set(sessionId, session);
  }

  /**
   * Start a simulation session
   */
  async startSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error('Session not found');

    if (session.status !== 'PENDING') {
      throw new Error('Session already started or completed');
    }

    // Get lesson configuration and simulation
    const lesson = await prisma.lesson.findUnique({
      where: { id: session.lessonId }
    });

    const lessonConfig = await this.xmlParser.parseLesson(lesson!.xmlConfig);
    const simulation = lessonConfig.simulations.find(s => s.id === session.scenario);

    if (!simulation) {
      throw new Error('Simulation configuration not found');
    }

    // Execute start commands
    for (const command of simulation.startCommands) {
      await this.executeCommand(sessionId, command);
    }

    // Update session state
    session.status = 'IN_PROGRESS';
    session.startTime = new Date();
    this.sessions.set(sessionId, session);

    // Update database
    await prisma.simulationSession.update({
      where: { id: sessionId },
      data: {
        status: 'IN_PROGRESS',
        startTime: session.startTime
      }
    });

    // Start session timer
    this.startSessionTimer(sessionId, session.duration);

    this.emit('sessionStarted', session);
  }

  /**
   * Execute a session command
   */
  async executeCommand(sessionId: string, command: Command): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error('Session not found');

    // Log command as event
    const event: SessionEvent = {
      id: `${sessionId}-${Date.now()}-${Math.random()}`,
      command: command.name,
      parameters: command.parameters,
      timestamp: new Date(),
      sequence: session.events.length + 1,
      processed: false
    };

    session.events.push(event);

    // Execute command based on type
    switch (command.name) {
      case 'Grant Privilege':
        await this.handleGrantPrivilege(sessionId, command.parameters);
        break;
      case 'Remove Privilege':
        await this.handleRemovePrivilege(sessionId, command.parameters);
        break;
      case 'Set Liquidity Trader':
        await this.handleSetLiquidityTrader(sessionId, command.parameters);
        break;
      case 'Open Market':
        await this.handleOpenMarket(sessionId, command.parameters);
        break;
      case 'Close Market':
        await this.handleCloseMarket(sessionId);
        break;
      case 'Create Auction':
        await this.handleCreateAuction(sessionId, command.parameters);
        break;
      case 'Start Auction':
        await this.handleStartAuction(sessionId);
        break;
      case 'Set Holding Value':
        await this.handleSetHoldingValue(sessionId, command.parameters);
        break;
      default:
        console.warn(`Unknown command: ${command.name}`);
    }

    // Mark event as processed
    event.processed = true;
    
    // Store event in database
    await prisma.sessionEvent.create({
      data: {
        sessionId,
        command: command.name,
        parameters: command.parameters,
        sequence: event.sequence
      }
    });

    this.emit('commandExecuted', { sessionId, command, event });
  }

  /**
   * Handle Grant Privilege command
   */
  private async handleGrantPrivilege(sessionId: string, parameters: any[]): Promise<void> {
    const privilegeCode = parameters[0] as number;
    const userGroup = parameters[1] as string | undefined;

    const session = this.sessions.get(sessionId)!;
    let targetUsers: string[] = [];

    if (!userGroup || userGroup === '$All') {
      targetUsers = session.participants.map(p => p.userId);
    } else if (userGroup === '$Speculators') {
      // Assign to users who are not market makers
      targetUsers = session.participants
        .filter(p => !p.privileges.includes(22)) // Market Making Rights
        .map(p => p.userId);
    } else {
      // Handle specific user or group
      const user = session.participants.find(p => p.username === userGroup);
      if (user) targetUsers = [user.userId];
    }

    // Grant privilege to target users
    for (const userId of targetUsers) {
      await this.grantPrivilege(sessionId, userId, privilegeCode);
    }
  }

  /**
   * Handle Remove Privilege command
   */
  private async handleRemovePrivilege(sessionId: string, parameters: any[]): Promise<void> {
    const privilegeCode = parameters[0] as number;
    const userGroup = parameters[1] as string | undefined;

    const session = this.sessions.get(sessionId)!;
    let targetUsers: string[] = [];

    if (!userGroup || userGroup === '$All') {
      targetUsers = session.participants.map(p => p.userId);
    } else {
      const user = session.participants.find(p => p.username === userGroup);
      if (user) targetUsers = [user.userId];
    }

    // Revoke privilege from target users
    for (const userId of targetUsers) {
      await this.revokePrivilege(sessionId, userId, privilegeCode);
    }
  }

  /**
   * Handle Set Liquidity Trader command
   */
  private async handleSetLiquidityTrader(sessionId: string, parameters: any[]): Promise<void> {
    const session = this.sessions.get(sessionId)!;
    const traderId = parameters[0] as number;
    const setting = parameters[1] as string;
    const value = parameters[2];

    if (setting === 'Active') {
      session.marketState.liquidityActive = value as boolean;
    } else if (setting === 'Delay') {
      session.marketState.liquidityDelay = value as number;
    }

    this.sessions.set(sessionId, session);
    this.emit('liquidityTraderUpdated', { sessionId, setting, value });
  }

  /**
   * Handle Open Market command
   */
  private async handleOpenMarket(sessionId: string, parameters: any[]): Promise<void> {
    const session = this.sessions.get(sessionId)!;
    const delay = (parameters[0] as number) || 0;

    setTimeout(async () => {
      session.marketState.isOpen = true;
      this.sessions.set(sessionId, session);
      
      // Open the order matching engine market
      const orderEngine = getOrderMatchingEngine(sessionId);
      await orderEngine.openMarket();
      
      this.emit('marketOpened', { sessionId });
    }, delay * 1000);
  }

  /**
   * Handle Close Market command
   */
  private async handleCloseMarket(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId)!;
    session.marketState.isOpen = false;
    this.sessions.set(sessionId, session);
    
    // Close the order matching engine market
    const orderEngine = getOrderMatchingEngine(sessionId);
    await orderEngine.closeMarket();
    
    this.emit('marketClosed', { sessionId });
  }

  /**
   * Handle Create Auction command
   */
  private async handleCreateAuction(sessionId: string, parameters: any[]): Promise<void> {
    const privilegeType = parameters[0] as number;
    const available = parameters[1] as number;
    const initialPrice = parameters[2] as number;
    const increment = parameters[3] as number;
    const intervalSeconds = parameters[4] as number;

    const auctionState: AuctionState = {
      id: `${sessionId}-auction-${Date.now()}`,
      privilegeType,
      available,
      currentPrice: initialPrice,
      increment,
      round: 1,
      timeRemaining: intervalSeconds,
      bidders: [],
      status: 'PENDING'
    };

    this.auctions.set(auctionState.id, auctionState);
    
    // Store in database
    await prisma.auction.create({
      data: {
        sessionId,
        privilegeType,
        available,
        initialPrice,
        increment,
        intervalSeconds,
        status: 'PENDING'
      }
    });

    this.emit('auctionCreated', { sessionId, auction: auctionState });
  }

  /**
   * Handle Start Auction command
   */
  private async handleStartAuction(sessionId: string): Promise<void> {
    // Find pending auction for this session
    const auction = Array.from(this.auctions.values())
      .find(a => a.id.startsWith(sessionId) && a.status === 'PENDING');

    if (!auction) {
      throw new Error('No pending auction found');
    }

    auction.status = 'ACTIVE';
    this.auctions.set(auction.id, auction);

    this.emit('auctionStarted', { sessionId, auction });
  }

  /**
   * Handle Set Holding Value command
   */
  private async handleSetHoldingValue(sessionId: string, parameters: any[]): Promise<void> {
    const session = this.sessions.get(sessionId)!;
    const userGroup = parameters[0] as string;
    const currency = parameters[1] as string;
    const amount = parameters[2] as number;

    if (userGroup === 'ALL') {
      for (const participant of session.participants) {
        participant.equity = amount;
        participant.startingEquity = amount;
      }
    }

    this.sessions.set(sessionId, session);
    this.emit('holdingValueSet', { sessionId, userGroup, currency, amount });
  }

  /**
   * Grant privilege to user
   */
  private async grantPrivilege(sessionId: string, userId: string, privilegeCode: number): Promise<void> {
    const session = this.sessions.get(sessionId)!;
    const participant = session.participants.find(p => p.userId === userId);
    
    if (participant && !participant.privileges.includes(privilegeCode)) {
      participant.privileges.push(privilegeCode);
      await authzService.grantPrivileges(sessionId, userId, [privilegeCode]);
    }
  }

  /**
   * Revoke privilege from user
   */
  private async revokePrivilege(sessionId: string, userId: string, privilegeCode: number): Promise<void> {
    const session = this.sessions.get(sessionId)!;
    const participant = session.participants.find(p => p.userId === userId);
    
    if (participant) {
      participant.privileges = participant.privileges.filter(p => p !== privilegeCode);
      await authzService.revokePrivileges(sessionId, userId, [privilegeCode]);
    }
  }

  /**
   * Start session timer
   */
  private startSessionTimer(sessionId: string, durationSeconds: number): void {
    const timer = setTimeout(async () => {
      await this.endSession(sessionId);
    }, durationSeconds * 1000);

    this.timers.set(sessionId, timer);
  }

  /**
   * End a simulation session
   */
  async endSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error('Session not found');

    // Clear timer
    const timer = this.timers.get(sessionId);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(sessionId);
    }

    // Execute end commands
    const lesson = await prisma.lesson.findUnique({
      where: { id: session.lessonId }
    });

    const lessonConfig = await this.xmlParser.parseLesson(lesson!.xmlConfig);
    const simulation = lessonConfig.simulations.find(s => s.id === session.scenario);

    if (simulation) {
      for (const command of simulation.endCommands) {
        await this.executeCommand(sessionId, command);
      }
    }

    // Update session state
    session.status = 'COMPLETED';
    session.endTime = new Date();
    this.sessions.set(sessionId, session);

    // Update database
    await prisma.simulationSession.update({
      where: { id: sessionId },
      data: {
        status: 'COMPLETED',
        endTime: session.endTime
      }
    });

    this.emit('sessionEnded', session);
  }

  /**
   * Get session state
   */
  getSession(sessionId: string): SessionState | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Pause session
   */
  async pauseSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error('Session not found');

    session.status = 'PAUSED';
    this.sessions.set(sessionId, session);

    // Clear timer
    const timer = this.timers.get(sessionId);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(sessionId);
    }

    await prisma.simulationSession.update({
      where: { id: sessionId },
      data: { status: 'PAUSED' }
    });

    this.emit('sessionPaused', session);
  }

  /**
   * Resume session
   */
  async resumeSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error('Session not found');

    if (session.status !== 'PAUSED') {
      throw new Error('Session is not paused');
    }

    session.status = 'IN_PROGRESS';
    this.sessions.set(sessionId, session);

    // Calculate remaining time
    const elapsed = session.startTime ? 
      Math.floor((Date.now() - session.startTime.getTime()) / 1000) : 0;
    const remaining = Math.max(0, session.duration - elapsed);

    // Restart timer with remaining time
    if (remaining > 0) {
      this.startSessionTimer(sessionId, remaining);
    }

    await prisma.simulationSession.update({
      where: { id: sessionId },
      data: { status: 'IN_PROGRESS' }
    });

    this.emit('sessionResumed', session);
  }

  /**
   * Get all active sessions
   */
  getActiveSessions(): SessionState[] {
    return Array.from(this.sessions.values()).filter(
      s => s.status === 'IN_PROGRESS' || s.status === 'PAUSED'
    );
  }
}

// Singleton instance
export const sessionEngine = new SessionEngine();