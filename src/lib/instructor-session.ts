/**
 * Instructor Session Management
 * 
 * Proper upTick-style session management where instructor controls
 * one session at a time with waiting room workflow.
 */

import { prisma } from './prisma';
import { getMarketEngine, MarketOrder } from './market-engine';

export interface InstructorSession {
  id: string;
  instructorId: string;
  lessonId: string;
  lessonName: string;
  status: 'SETUP' | 'WAITING_ROOM' | 'IN_PROGRESS' | 'COMPLETED';
  createdAt: Date;
  startedAt?: Date;
  endedAt?: Date;
  
  // Instructor-controlled parameters
  startingCash: number;
  duration: number; // in seconds
  selectedSimulation?: string; // e.g., "Simulation A"
  
  // Student management
  waitingStudents: string[]; // userIds waiting to join
  activeStudents: string[]; // userIds in active session
  
  // Trading data
  portfolios: Record<string, StudentPortfolio>;
  orders: SessionOrder[];
}

export interface StudentPortfolio {
  userId: string;
  cash: number;
  positions: Record<string, number>; // symbol -> quantity
  totalValue: number;
  pnl: number;
}

export interface SessionOrder {
  id: string;
  userId: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  quantity: number;
  price?: number;
  type: 'MARKET' | 'LIMIT';
  status: 'PENDING' | 'FILLED' | 'CANCELLED';
  fillPrice?: number;
  fillTime?: Date;
}

// Global instructor session state (one session per instructor)
// Use globalThis to persist across Next.js hot reloads in development
const globalForInstructorSessions = globalThis as unknown as {
  instructorSessions: Map<string, InstructorSession> | undefined;
};

const instructorSessions = globalForInstructorSessions.instructorSessions ?? new Map<string, InstructorSession>();

if (process.env.NODE_ENV === 'development') {
  globalForInstructorSessions.instructorSessions = instructorSessions;
}

/**
 * Create a new instructor session (replaces any existing session)
 */
export async function createInstructorSession(
  instructorId: string,
  lessonId: string,
  startingCash: number = 1000000, // Default to $1,000,000 to match original upTick
  duration: number = 300 // Default 5 minutes
): Promise<InstructorSession> {
  console.log(`🏫 Creating instructor session for instructor ${instructorId}`);
  
  // Get lesson details
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId }
  });
  
  if (!lesson) {
    throw new Error('Lesson not found');
  }
  
  // Clear any existing session for this instructor
  const existingSessionId = Array.from(instructorSessions.entries())
    .find(([_, session]) => session.instructorId === instructorId)?.[0];
  
  if (existingSessionId) {
    console.log(`🧹 Clearing existing session ${existingSessionId}`);
    instructorSessions.delete(existingSessionId);
  }
  
  // Create new session
  const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  const session: InstructorSession = {
    id: sessionId,
    instructorId,
    lessonId,
    lessonName: lesson.name,
    status: 'SETUP',
    createdAt: new Date(),
    startingCash,
    duration,
    waitingStudents: [],
    activeStudents: [],
    portfolios: {},
    orders: []
  };
  
  // Store session
  instructorSessions.set(sessionId, session);
  
  console.log(`✅ Created instructor session: ${sessionId}`);
  console.log(`🗂️ Total sessions in memory: ${instructorSessions.size}`);
  console.log(`📚 Lesson: ${lesson.name}`);
  console.log(`💰 Starting cash: $${startingCash.toLocaleString()}`);
  console.log(`⏱️ Duration: ${duration} seconds`);
  
  return session;
}

/**
 * Open session to waiting room (students can join)
 */
export async function openWaitingRoom(sessionId: string): Promise<InstructorSession> {
  console.log(`🔍 Looking for session: ${sessionId}`);
  console.log(`🗂️ Available sessions: ${Array.from(instructorSessions.keys()).join(', ')}`);
  
  const session = instructorSessions.get(sessionId);
  if (!session) {
    console.log(`❌ Session ${sessionId} not found in memory`);
    throw new Error('Session not found');
  }
  
  if (session.status !== 'SETUP') {
    throw new Error('Session must be in SETUP status to open waiting room');
  }
  
  session.status = 'WAITING_ROOM';
  console.log(`🚪 Opened waiting room for session ${sessionId}`);
  
  return session;
}

/**
 * Student joins waiting room
 */
export async function studentJoinWaitingRoom(sessionId: string, userId: string): Promise<InstructorSession> {
  const session = instructorSessions.get(sessionId);
  if (!session) {
    throw new Error('Session not found');
  }
  
  if (session.status !== 'WAITING_ROOM') {
    throw new Error('Session is not accepting students');
  }
  
  // Add to waiting list if not already there
  if (!session.waitingStudents.includes(userId)) {
    session.waitingStudents.push(userId);
    console.log(`👋 Student ${userId} joined waiting room for session ${sessionId}`);
  }
  
  return session;
}

/**
 * Start the session (move from waiting room to active trading)
 */
export async function startInstructorSession(sessionId: string): Promise<InstructorSession> {
  const session = instructorSessions.get(sessionId);
  if (!session) {
    throw new Error('Session not found');
  }
  
  if (session.status !== 'WAITING_ROOM') {
    throw new Error('Session must be in waiting room to start');
  }
  
  // Move waiting students to active students
  session.activeStudents = [...session.waitingStudents];
  session.waitingStudents = [];
  
  // Initialize portfolios for all active students
  for (const userId of session.activeStudents) {
    session.portfolios[userId] = {
      userId,
      cash: session.startingCash,
      positions: {},
      totalValue: session.startingCash,
      pnl: 0
    };
  }
  
  session.status = 'IN_PROGRESS';
  session.startedAt = new Date();
  
  console.log(`🚀 Started session ${sessionId}`);
  console.log(`👥 Active students: ${session.activeStudents.length}`);
  console.log(`💰 Each student starts with: $${session.startingCash.toLocaleString()}`);
  
  return session;
}

/**
 * End the session
 */
export async function endInstructorSession(sessionId: string): Promise<InstructorSession> {
  const session = instructorSessions.get(sessionId);
  if (!session) {
    throw new Error('Session not found');
  }
  
  session.status = 'COMPLETED';
  session.endedAt = new Date();
  
  console.log(`🏁 Ended session ${sessionId}`);
  
  return session;
}

/**
 * Get instructor's current session
 */
export function getInstructorSession(instructorId: string): InstructorSession | null {
  for (const session of instructorSessions.values()) {
    if (session.instructorId === instructorId) {
      return session;
    }
  }
  return null;
}

/**
 * Get session by ID
 */
export function getSession(sessionId: string): InstructorSession | null {
  console.log(`🔍 getSession called for: ${sessionId}`);
  console.log(`🗂️ Sessions in memory: ${Array.from(instructorSessions.keys()).join(', ')}`);
  console.log(`📊 Total sessions: ${instructorSessions.size}`);
  
  const session = instructorSessions.get(sessionId);
  console.log(`🎯 Found session: ${session ? 'YES' : 'NO'}`);
  
  return session || null;
}

/**
 * Get all available lessons for instructor to choose from
 */
export async function getAvailableLessons() {
  return await prisma.lesson.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      description: true
    },
    orderBy: { name: 'asc' }
  });
}

/**
 * Place an order in the session using real market engine
 */
export async function placeSessionOrder(
  sessionId: string,
  userId: string,
  symbol: string,
  side: 'BUY' | 'SELL',
  quantity: number,
  price?: number
): Promise<SessionOrder> {
  const session = instructorSessions.get(sessionId);
  if (!session) {
    throw new Error('Session not found');
  }
  
  if (session.status !== 'IN_PROGRESS') {
    throw new Error('Session is not active for trading');
  }
  
  if (!session.activeStudents.includes(userId)) {
    throw new Error('User is not active in this session');
  }
  
  const portfolio = session.portfolios[userId];
  if (!portfolio) {
    throw new Error('Portfolio not found');
  }
  
  // Get market engine configured for this lesson
  const marketEngine = getMarketEngine(session.lessonName);
  
  // For market orders, check if user has enough cash using current market price
  if (side === 'BUY' && !price) {
    const marketData = marketEngine.getMarketData(symbol);
    const estimatedPrice = marketData?.currentPrice || 50.00;
    const estimatedCost = estimatedPrice * quantity * 1.05; // Add 5% buffer for market orders
    
    if (portfolio.cash < estimatedCost) {
      throw new Error('Insufficient cash for market order');
    }
  }
  
  // For limit buy orders, check exact amount
  if (side === 'BUY' && price) {
    const totalCost = price * quantity;
    if (portfolio.cash < totalCost) {
      throw new Error('Insufficient cash');
    }
  }
  
  // For sell orders, check if user has enough shares
  if (side === 'SELL') {
    const currentPosition = portfolio.positions[symbol] || 0;
    if (currentPosition < quantity) {
      throw new Error('Insufficient shares to sell');
    }
  }
  
  // Place order in market engine
  const marketOrder = marketEngine.placeOrder({
    userId: `student_${userId}`, // Prefix to distinguish from bots
    symbol,
    side,
    quantity,
    price,
    type: price ? 'LIMIT' : 'MARKET'
  });
  
  // Convert market order to session order format
  const sessionOrder: SessionOrder = {
    id: marketOrder.id,
    userId,
    symbol,
    side,
    quantity,
    price,
    type: marketOrder.type,
    status: marketOrder.status === 'FILLED' ? 'FILLED' : 'PENDING',
    fillPrice: marketOrder.avgFillPrice,
    fillTime: marketOrder.status === 'FILLED' ? new Date() : undefined
  };
  
  // Store order in session
  session.orders.push(sessionOrder);
  
  // Update portfolio if order was filled
  if (marketOrder.status === 'FILLED' && marketOrder.avgFillPrice) {
    updatePortfolioFromTrade(session, userId, symbol, side, marketOrder.filledQuantity, marketOrder.avgFillPrice);
  }
  
  console.log(`📊 Order placed in market: ${side} ${quantity} ${symbol} ${price ? `@ $${price}` : 'MARKET'} by student ${userId} - Status: ${marketOrder.status}`);
  
  return sessionOrder;
}

/**
 * Update portfolio after a trade
 */
function updatePortfolioFromTrade(
  session: InstructorSession,
  userId: string,
  symbol: string,
  side: 'BUY' | 'SELL',
  quantity: number,
  price: number
) {
  const portfolio = session.portfolios[userId];
  if (!portfolio) return;
  
  const totalCost = price * quantity;
  
  if (side === 'BUY') {
    portfolio.cash -= totalCost;
    portfolio.positions[symbol] = (portfolio.positions[symbol] || 0) + quantity;
  } else {
    portfolio.cash += totalCost;
    portfolio.positions[symbol] = (portfolio.positions[symbol] || 0) - quantity;
  }
  
  // Recalculate total value using current market prices
  const marketEngine = getMarketEngine();
  let positionValue = 0;
  
  Object.entries(portfolio.positions).forEach(([sym, qty]) => {
    if (qty !== 0) {
      const marketData = marketEngine.getMarketData(sym);
      const currentPrice = marketData?.currentPrice || 50.00;
      positionValue += (qty as number) * currentPrice;
    }
  });
  
  portfolio.totalValue = portfolio.cash + positionValue;
  portfolio.pnl = portfolio.totalValue - session.startingCash;
  
  console.log(`💰 Portfolio updated for ${userId}: Cash=$${portfolio.cash.toFixed(2)}, Total=$${portfolio.totalValue.toFixed(2)}, P&L=$${portfolio.pnl.toFixed(2)}`);
}

/**
 * Get user's orders in the session
 */
export function getUserOrders(sessionId: string, userId: string): SessionOrder[] {
  const session = instructorSessions.get(sessionId);
  if (!session) {
    return [];
  }
  
  return session.orders.filter(order => order.userId === userId);
}

/**
 * Get user's portfolio in the session
 */
export function getUserPortfolio(sessionId: string, userId: string): StudentPortfolio | null {
  const session = instructorSessions.get(sessionId);
  if (!session) {
    return null;
  }
  
  return session.portfolios[userId] || null;
}

/**
 * Get current market data for all symbols
 */
export function getSessionMarketData(sessionId: string) {
  const session = instructorSessions.get(sessionId);
  if (!session || session.status !== 'IN_PROGRESS') {
    return null;
  }
  
  const marketEngine = getMarketEngine(session.lessonName);
  return {
    marketData: marketEngine.getAllMarketData(),
    orderBooks: marketEngine.getSymbols().map(symbol => marketEngine.generateOrderBook(symbol)),
    liquidityTraders: marketEngine.getLiquidityTraders(),
    configuration: marketEngine.getConfiguration()
  };
}

/**
 * Get recent trades for market activity
 */
export function getSessionTrades(sessionId: string, symbol?: string, limit: number = 50) {
  const session = instructorSessions.get(sessionId);
  if (!session || session.status !== 'IN_PROGRESS') {
    return [];
  }
  
  const marketEngine = getMarketEngine(session.lessonName);
  if (symbol) {
    return marketEngine.getRecentTrades(symbol, limit);
  }
  
  // Get trades for all symbols
  const allTrades: any[] = [];
  marketEngine.getSymbols().forEach(sym => {
    const trades = marketEngine.getRecentTrades(sym, limit);
    allTrades.push(...trades);
  });
  
  return allTrades.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, limit);
}

/**
 * Control liquidity traders (from XML lesson commands)
 */
export function setLiquidityTrader(sessionId: string, traderId: string, setting: 'Active' | 'Delay', value: boolean | number) {
  const session = instructorSessions.get(sessionId);
  if (!session) {
    throw new Error('Session not found');
  }
  
  const marketEngine = getMarketEngine();
  marketEngine.setLiquidityTrader(traderId, setting, value);
  
  console.log(`🎛️ Instructor control: Liquidity trader ${traderId} ${setting} set to ${value}`);
}

/**
 * Refresh portfolio values with current market prices
 */
export function refreshPortfolioValues(sessionId: string) {
  const session = instructorSessions.get(sessionId);
  if (!session || session.status !== 'IN_PROGRESS') {
    return;
  }
  
  const marketEngine = getMarketEngine(session.lessonName);
  
  // Update all student portfolios with current market prices
  Object.values(session.portfolios).forEach(portfolio => {
    let positionValue = 0;
    
    Object.entries(portfolio.positions).forEach(([symbol, quantity]) => {
      if (quantity !== 0) {
        const marketData = marketEngine.getMarketData(symbol);
        const currentPrice = marketData?.currentPrice || 50.00;
        positionValue += (quantity as number) * currentPrice;
      }
    });
    
    portfolio.totalValue = portfolio.cash + positionValue;
    portfolio.pnl = portfolio.totalValue - session.startingCash;
  });
}

/**
 * Get active instructor session by ID (for development)
 */
export function getActiveInstructorSession(sessionId: string): InstructorSession | null {
  return instructorSessions.get(sessionId) || null;
}

/**
 * Create instructor session from config (simple sync version for development)
 */
export function createInstructorSessionSync(sessionId: string, config: {
  instructorId: string;
  lessonTitle: string;
  lessonType?: string;
  duration?: number;
  status?: string;
  startTime?: string;
  students?: any[];
  currentTick?: number;
}): InstructorSession {
  const session: InstructorSession = {
    id: sessionId,
    instructorId: config.instructorId,
    lessonId: config.lessonType || config.lessonTitle,
    lessonName: config.lessonTitle,
    status: 'IN_PROGRESS',
    createdAt: new Date(),
    startedAt: config.startTime ? new Date(config.startTime) : new Date(),
    startingCash: 10000,
    duration: config.duration || 3600,
    waitingStudents: [],
    activeStudents: [],
    portfolios: {},
    orders: []
  };

  instructorSessions.set(sessionId, session);
  return session;
}