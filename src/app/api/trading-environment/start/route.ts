/**
 * Start Trading Environment API
 *
 * Creates a live trading session with automated market makers
 * so users can test their orders moving the market.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createMarketSimulator } from '@/lib/market-simulator';
import { TradingBotManager } from '@/lib/automated-trader';
import { getReadyOrderMatchingEngine } from '@/lib/order-matching-engine';

// Store active environments
const activeEnvironments = new Map<string, {
  sessionId: string;
  simulator: any;
  botManager: TradingBotManager;
  startedAt: Date;
}>();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      userId,
      buyingPower = 10000000, // $10M default
      botCount = 5,
      startPrice = 50.00,
      volatility = 0.02
    } = body;

    // Get or create user
    let user = await prisma.user.findFirst({
      where: { id: userId }
    });

    if (!user) {
      // Use instructor account if no user specified
      user = await prisma.user.findFirst({
        where: { username: 'instructor' }
      });
    }

    if (!user) {
      return NextResponse.json({ error: 'No user found' }, { status: 400 });
    }

    // Get security
    const security = await prisma.security.findFirst({
      where: { symbol: 'AOE' }
    });

    if (!security) {
      return NextResponse.json({ error: 'Security AOE not found' }, { status: 400 });
    }

    // Get bot accounts (students)
    const botUsers = await prisma.user.findMany({
      where: {
        role: 'STUDENT',
        username: { in: ['student1', 'student2', 'student3', 'student4', 'student5'] }
      },
      take: botCount
    });

    if (botUsers.length < 2) {
      return NextResponse.json({ error: 'Not enough bot accounts' }, { status: 400 });
    }

    // Create a new session
    const lesson = await prisma.lesson.findFirst({
      where: { name: 'Price Formation' }
    });

    const classRoom = await prisma.class.findFirst({
      where: { name: 'Demo Class' }
    });

    const session = await prisma.simulationSession.create({
      data: {
        lessonId: lesson?.id || '',
        classId: classRoom?.id || '',
        scenario: 'Live Trading Environment',
        duration: 3600, // 1 hour
        status: 'IN_PROGRESS',
        startTime: new Date()
      }
    });

    // Enroll the main user with high buying power
    await prisma.sessionUser.create({
      data: {
        sessionId: session.id,
        userId: user.id,
        startingEquity: buyingPower,
        currentEquity: buyingPower,
        isActive: true
      }
    });

    // Enroll bot users
    for (const botUser of botUsers) {
      await prisma.sessionUser.upsert({
        where: {
          sessionId_userId: {
            sessionId: session.id,
            userId: botUser.id
          }
        },
        update: { isActive: true },
        create: {
          sessionId: session.id,
          userId: botUser.id,
          startingEquity: 5000000, // $5M for bots
          currentEquity: 5000000,
          isActive: true
        }
      });
    }

    // Open the market
    const engine = await getReadyOrderMatchingEngine(session.id);
    await engine.openMarket();

    // Create market simulator
    const simulator = createMarketSimulator({
      sessionId: session.id,
      securityId: security.id,
      totalDays: 90,
      msPerDay: 5000, // 5 seconds per day for interactive trading
      markets: [{
        symbol: 'AOE',
        startPrice,
        volatility,
        drift: 0.0001,
        spreadBps: 15,
        ticksPerDay: 20, // More ticks for smoother updates
        newsFrequency: 0.2
      }],
      autoTrade: true
    });

    // Create bot manager with market makers
    const botManager = new TradingBotManager();

    // Add market maker bots (provide liquidity on both sides)
    botUsers.slice(0, 2).forEach((botUser, i) => {
      botManager.addTrader({
        id: `mm-${i}`,
        name: `MarketMaker${i + 1}`,
        sessionId: session.id,
        userId: botUser.id,
        securityId: security.id,
        strategy: 'mean_reversion', // Market makers do mean reversion
        maxPosition: 2000,
        orderSize: 100 + (i * 50), // Vary order sizes
        tradeFrequency: 0.6, // Trade frequently
        aggressiveness: 0.4 + (i * 0.1)
      });
    });

    // Add momentum traders
    botUsers.slice(2, 4).forEach((botUser, i) => {
      botManager.addTrader({
        id: `momentum-${i}`,
        name: `MomentumBot${i + 1}`,
        sessionId: session.id,
        userId: botUser.id,
        securityId: security.id,
        strategy: 'momentum',
        maxPosition: 1500,
        orderSize: 75 + (i * 25),
        tradeFrequency: 0.4,
        aggressiveness: 0.6 + (i * 0.1)
      });
    });

    // Add random noise trader
    if (botUsers.length > 4) {
      botManager.addTrader({
        id: 'noise-0',
        name: 'NoiseTrader',
        sessionId: session.id,
        userId: botUsers[4].id,
        securityId: security.id,
        strategy: 'random',
        maxPosition: 500,
        orderSize: 50,
        tradeFrequency: 0.3,
        aggressiveness: 0.3
      });
    }

    // Connect bots to simulator
    botManager.connectSimulator(simulator);

    // Start everything
    botManager.startAll();
    simulator.start();

    // Store environment
    activeEnvironments.set(session.id, {
      sessionId: session.id,
      simulator,
      botManager,
      startedAt: new Date()
    });

    console.log(`[TradingEnv] Started environment ${session.id} with ${botUsers.length} bots`);

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      userId: user.id,
      securityId: security.id,
      symbol: 'AOE',
      buyingPower,
      botCount: botUsers.length,
      startPrice,
      message: `Trading environment started with ${botUsers.length} automated traders. You have $${buyingPower.toLocaleString()} buying power.`
    });

  } catch (error) {
    console.error('Error starting trading environment:', error);
    return NextResponse.json({ error: 'Failed to start environment' }, { status: 500 });
  }
}

// GET - check environment status
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const sessionId = url.searchParams.get('sessionId');

  if (sessionId) {
    const env = activeEnvironments.get(sessionId);
    if (env) {
      const states = env.botManager.getAllStates();
      return NextResponse.json({
        active: true,
        sessionId,
        startedAt: env.startedAt,
        bots: states.map(s => ({
          name: s.config.name,
          strategy: s.config.strategy,
          position: s.position,
          trades: s.totalTrades,
          pnl: s.realizedPnL + s.unrealizedPnL
        }))
      });
    }
  }

  // List all active environments
  const environments = Array.from(activeEnvironments.entries()).map(([id, env]) => ({
    sessionId: id,
    startedAt: env.startedAt,
    botCount: env.botManager.getAllStates().length
  }));

  return NextResponse.json({ environments });
}
