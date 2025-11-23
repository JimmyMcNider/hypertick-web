/**
 * Simple Session Management
 * 
 * No complex state management, just basic session creation and management
 * that instructors and students can actually use.
 */

import { prisma } from './prisma';

export interface SimpleSession {
  id: string;
  lessonName: string;
  instructor: string;
  students: string[];
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  startTime?: Date;
  endTime?: Date;
  currentBalance: Record<string, number>; // userId -> balance
  portfolios: Record<string, any>; // userId -> portfolio
}

export interface SimpleOrder {
  id: string;
  sessionId: string;
  userId: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  quantity: number;
  price?: number; // undefined for market orders
  type: 'MARKET' | 'LIMIT';
  status: 'PENDING' | 'FILLED' | 'CANCELLED';
  fillPrice?: number;
  fillTime?: Date;
}

// In-memory session storage (simple, reliable) with database persistence
const activeSessions = new Map<string, SimpleSession>();
const sessionOrders = new Map<string, SimpleOrder[]>();

/**
 * Load sessions from database into memory on startup
 */
async function loadSessionsFromDatabase() {
  try {
    const dbSessions = await prisma.simulationSession.findMany({
      where: {
        status: { in: ['PENDING', 'IN_PROGRESS'] }
      },
      include: {
        lesson: true,
        class: {
          include: {
            instructor: true
          }
        }
      }
    });

    for (const dbSession of dbSessions) {
      // Use actual lesson name from database instead of hardcoded config
      const actualLessonName = dbSession.lesson?.name || 'Unknown Lesson';
      
      // Get student configuration
      const config = {
        lessonName: actualLessonName,
        students: ['student1', 'student2', 'student3', 'student4', 'student5']
      };

      // Find students
      const students = await prisma.user.findMany({
        where: {
          username: { in: config.students || [] },
          role: 'STUDENT'
        }
      });

      // Initialize portfolios for found students
      const currentBalance: Record<string, number> = {};
      const portfolios: Record<string, any> = {};

      for (const student of students) {
        currentBalance[student.id] = 1000000;
        portfolios[student.id] = {
          cash: 1000000,
          positions: {},
          totalValue: 1000000,
          pnl: 0
        };
      }

      const session: SimpleSession = {
        id: dbSession.id,
        lessonName: config.lessonName || 'Simple Trading',
        instructor: dbSession.class.instructor.username,
        students: students.map(s => s.username),
        status: dbSession.status as 'PENDING' | 'IN_PROGRESS' | 'COMPLETED',
        startTime: dbSession.startTime || undefined,
        endTime: dbSession.endTime || undefined,
        currentBalance,
        portfolios
      };

      activeSessions.set(dbSession.id, session);
      sessionOrders.set(dbSession.id, []);
    }

    console.log(`📚 Loaded ${dbSessions.length} sessions from database`);
  } catch (error) {
    console.error('Failed to load sessions from database:', error);
  }
}

// Load sessions on module import
let loadingPromise: Promise<void> | null = null;

/**
 * Ensure sessions are loaded before proceeding
 */
async function ensureSessionsLoaded() {
  if (!loadingPromise) {
    loadingPromise = loadSessionsFromDatabase();
  }
  await loadingPromise;
}

// Start loading immediately
loadingPromise = loadSessionsFromDatabase();

/**
 * Create a new trading session
 */
export async function createSimpleSession(
  lessonName: string,
  instructorId: string,
  studentUsernames: string[]
): Promise<SimpleSession> {
  try {
    console.log('🏗️ Creating simple session:', lessonName);

    // Get instructor info
    const instructor = await prisma.user.findUnique({
      where: { id: instructorId }
    });

    if (!instructor) {
      throw new Error('Instructor not found');
    }

    // Get student info
    const students = await prisma.user.findMany({
      where: {
        username: { in: studentUsernames },
        role: 'STUDENT'
      }
    });

    // Create or find a simple class for this instructor
    let instructorClass = await prisma.class.findFirst({
      where: {
        instructorId,
        name: 'Simple Trading Class'
      }
    });

    if (!instructorClass) {
      instructorClass = await prisma.class.create({
        data: {
          name: 'Simple Trading Class',
          semester: 'Fall 2024',
          instructorId
        }
      });
    }

    // Use the imported Price Formation lesson
    let lesson = await prisma.lesson.findFirst({
      where: { name: 'Price Formation' }
    });

    if (!lesson) {
      // Fallback to simple lesson if Price Formation not found
      lesson = await prisma.lesson.findFirst({
        where: { name: 'Simple Trading' }
      });
      
      if (!lesson) {
        lesson = await prisma.lesson.create({
          data: {
            name: 'Simple Trading',
            xmlConfig: '<lesson><simulation duration="300"><start><command name="Open Market"/></start></simulation></lesson>',
            description: 'Basic trading simulation'
          }
        });
      }
    }

    // Create session in database
    const dbSession = await prisma.simulationSession.create({
      data: {
        lessonId: lesson.id,
        classId: instructorClass.id,
        scenario: 'A',
        duration: 300,
        status: 'PENDING'
      }
    });

    // Initialize starting balances ($100,000 each)
    const currentBalance: Record<string, number> = {};
    const portfolios: Record<string, any> = {};

    // Enroll students in session (create SessionUser records)
    for (const student of students) {
      currentBalance[student.id] = 1000000;
      portfolios[student.id] = {
        cash: 1000000,
        positions: {},
        totalValue: 1000000,
        pnl: 0
      };

      // Create SessionUser record so students can place orders
      await prisma.sessionUser.upsert({
        where: {
          sessionId_userId: {
            sessionId: dbSession.id,
            userId: student.id
          }
        },
        update: {
          isActive: true
        },
        create: {
          sessionId: dbSession.id,
          userId: student.id,
          startingEquity: 1000000,
          currentEquity: 1000000,
          isActive: true
        }
      });
    }

    // Also enroll instructor in session
    await prisma.sessionUser.upsert({
      where: {
        sessionId_userId: {
          sessionId: dbSession.id,
          userId: instructorId
        }
      },
      update: {
        isActive: true
      },
      create: {
        sessionId: dbSession.id,
        userId: instructorId,
        startingEquity: 0,
        currentEquity: 0,
        isActive: true
      }
    });

    const session: SimpleSession = {
      id: dbSession.id,
      lessonName,
      instructor: instructor.username,
      students: students.map(s => s.username),
      status: 'IN_PROGRESS', // Auto-start the session
      startTime: new Date(),
      currentBalance,
      portfolios
    };

    // Store in memory
    activeSessions.set(dbSession.id, session);
    sessionOrders.set(dbSession.id, []);

    // Auto-start the session in database
    await prisma.simulationSession.update({
      where: { id: dbSession.id },
      data: {
        status: 'IN_PROGRESS',
        startTime: new Date()
      }
    });

    // Open the market on the matching engine
    const { getOrderMatchingEngine } = await import('./order-matching-engine');
    const engine = getOrderMatchingEngine(dbSession.id);
    await engine.openMarket();

    console.log('✅ Simple session created and market opened:', session.id);
    return session;

  } catch (error) {
    console.error('💥 Session creation failed:', error);
    throw error;
  }
}

/**
 * Start a session
 */
export async function startSimpleSession(sessionId: string): Promise<SimpleSession> {
  const session = activeSessions.get(sessionId);
  if (!session) {
    throw new Error('Session not found');
  }

  session.status = 'IN_PROGRESS';
  session.startTime = new Date();

  // Update database
  await prisma.simulationSession.update({
    where: { id: sessionId },
    data: { 
      status: 'IN_PROGRESS',
      startTime: session.startTime
    }
  });

  console.log('🚀 Session started:', sessionId);
  return session;
}

/**
 * Place an order
 */
export async function placeSimpleOrder(
  sessionId: string,
  userId: string,
  symbol: string,
  side: 'BUY' | 'SELL',
  quantity: number,
  price?: number
): Promise<SimpleOrder> {
  const session = activeSessions.get(sessionId);
  if (!session || session.status !== 'IN_PROGRESS') {
    throw new Error('Session not active');
  }

  const orderId = `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  const order: SimpleOrder = {
    id: orderId,
    sessionId,
    userId,
    symbol,
    side,
    quantity,
    price,
    type: price ? 'LIMIT' : 'MARKET',
    status: 'PENDING'
  };

  // For now, immediately fill all orders at $50 (we'll add real pricing later)
  const fillPrice = price || 50.00;
  order.status = 'FILLED';
  order.fillPrice = fillPrice;
  order.fillTime = new Date();

  // Update portfolio
  const portfolio = session.portfolios[userId];
  const totalCost = fillPrice * quantity;

  if (side === 'BUY') {
    portfolio.cash -= totalCost;
    portfolio.positions[symbol] = (portfolio.positions[symbol] || 0) + quantity;
  } else {
    portfolio.cash += totalCost;
    portfolio.positions[symbol] = (portfolio.positions[symbol] || 0) - quantity;
  }

  portfolio.totalValue = portfolio.cash + Object.entries(portfolio.positions)
    .reduce((sum, [sym, qty]) => sum + (qty as number) * 50, 0);
  portfolio.pnl = portfolio.totalValue - 1000000;

  // Store order
  const orders = sessionOrders.get(sessionId) || [];
  orders.push(order);
  sessionOrders.set(sessionId, orders);

  console.log(`📊 Order filled: ${side} ${quantity} ${symbol} @ $${fillPrice}`);
  return order;
}

/**
 * Get session data
 */
export async function getSimpleSession(sessionId: string): Promise<SimpleSession | null> {
  await ensureSessionsLoaded();
  return activeSessions.get(sessionId) || null;
}

/**
 * Get all active sessions
 */
export async function getAllActiveSessions(): Promise<SimpleSession[]> {
  await ensureSessionsLoaded();
  return Array.from(activeSessions.values());
}

/**
 * Get orders for a session
 */
export function getSessionOrders(sessionId: string): SimpleOrder[] {
  return sessionOrders.get(sessionId) || [];
}

/**
 * Get user's portfolio
 */
export function getUserPortfolio(sessionId: string, userId: string) {
  const session = activeSessions.get(sessionId);
  return session?.portfolios[userId] || null;
}

/**
 * Initialize demo data
 */
export async function initializeSimpleDemoData() {
  console.log('🎭 Initializing simple demo data...');

  // Create securities
  const securities = [
    { symbol: 'AAPL', name: 'Apple Inc.' },
    { symbol: 'MSFT', name: 'Microsoft Corp.' },
    { symbol: 'GOOGL', name: 'Alphabet Inc.' }
  ];

  for (const security of securities) {
    try {
      await prisma.security.upsert({
        where: { symbol: security.symbol },
        update: {},
        create: security
      });
    } catch (error) {
      // Ignore duplicates
    }
  }

  console.log('✅ Demo securities created');
}