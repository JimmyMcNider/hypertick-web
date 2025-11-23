/**
 * Quarter Simulation Test
 *
 * Runs a full 90-day (1 quarter) trading simulation at accelerated speed.
 * 1 day = 3 seconds, so 90 days = 270 seconds (4.5 minutes)
 *
 * Usage: npx tsx scripts/run-quarter-simulation.ts
 */

const BASE_URL = 'http://localhost:3000';

interface SimulationResult {
  sessionId: string;
  duration: number;
  traders: Array<{
    name: string;
    strategy: string;
    trades: number;
    finalPosition: number;
    realizedPnL: number;
    unrealizedPnL: number;
  }>;
  marketSummary: {
    startPrice: number;
    endPrice: number;
    high: number;
    low: number;
    totalVolume: number;
  };
}

async function login(username: string, password: string): Promise<{ token: string; user: any } | null> {
  try {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    return data.token ? { token: data.token, user: data.user } : null;
  } catch (error) {
    console.error('Login error:', error);
    return null;
  }
}

async function createSession(token: string, instructorId: string, students: string[]): Promise<string | null> {
  try {
    const res = await fetch(`${BASE_URL}/api/simple-sessions/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        lessonName: 'Quarter Trading Simulation',
        instructorId,
        students
      })
    });
    const data = await res.json();
    return data.session?.id || null;
  } catch (error) {
    console.error('Create session error:', error);
    return null;
  }
}

async function getSecurity(token: string, symbol: string): Promise<string | null> {
  try {
    const res = await fetch(`${BASE_URL}/api/securities?symbol=${symbol}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    return data.securities?.[0]?.id || null;
  } catch (error) {
    // Try to get from database directly
    return null;
  }
}

async function startSimulation(
  token: string,
  sessionId: string,
  config: {
    totalDays: number;
    msPerDay: number;
    symbol: string;
    startPrice: number;
    botConfigs: Array<{
      name: string;
      strategy: string;
      userId: string;
    }>;
  }
): Promise<void> {
  try {
    const res = await fetch(`${BASE_URL}/api/simulation/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        sessionId,
        ...config
      })
    });
    const data = await res.json();
    console.log('Simulation started:', data);
  } catch (error) {
    console.error('Start simulation error:', error);
  }
}

async function runQuarterSimulation() {
  console.log('='.repeat(60));
  console.log('QUARTER TRADING SIMULATION (90 days @ 3 sec/day)');
  console.log('Estimated runtime: ~4.5 minutes');
  console.log('='.repeat(60));

  // Step 1: Login as instructor and students
  console.log('\n[1] Logging in users...');
  const instructor = await login('instructor', 'instructor123');
  if (!instructor) {
    console.error('Failed to login as instructor');
    return;
  }

  const student1 = await login('student1', 'student123');
  const student2 = await login('student2', 'student123');
  const student3 = await login('student3', 'student123');

  if (!student1 || !student2 || !student3) {
    console.error('Failed to login students');
    return;
  }

  console.log('  All users logged in successfully');

  // Step 2: Create trading session
  console.log('\n[2] Creating trading session...');
  const sessionId = await createSession(instructor.token, instructor.user.id, [
    'student1', 'student2', 'student3'
  ]);

  if (!sessionId) {
    console.error('Failed to create session');
    return;
  }
  console.log(`  Session created: ${sessionId}`);

  // Step 3: Now we'll run the simulation directly using the library
  console.log('\n[3] Starting market simulation...');
  console.log('    90 trading days @ 3 seconds per day');
  console.log('    Total simulation time: 270 seconds (4.5 minutes)');

  // Import and run the simulation
  const { createMarketSimulator } = await import('../src/lib/market-simulator');
  const { AutomatedTrader, TradingBotManager } = await import('../src/lib/automated-trader');
  const { prisma } = await import('../src/lib/prisma');

  // Get security ID for AOE
  const security = await prisma.security.findFirst({
    where: { symbol: 'AOE' }
  });

  if (!security) {
    console.error('Security AOE not found');
    return;
  }

  // Create market simulator
  const simulator = createMarketSimulator({
    sessionId,
    securityId: security.id,
    totalDays: 90,
    msPerDay: 3000, // 3 seconds per day
    markets: [{
      symbol: 'AOE',
      startPrice: 50.00,
      volatility: 0.025,
      drift: 0.0003,
      spreadBps: 10,
      ticksPerDay: 10,
      newsFrequency: 0.3
    }],
    autoTrade: true
  });

  // Create bot manager with different strategies
  const botManager = new TradingBotManager();

  // Add momentum trader (student1)
  botManager.addTrader({
    id: 'bot-momentum',
    name: 'MomentumBot',
    sessionId,
    userId: student1.user.id,
    securityId: security.id,
    strategy: 'momentum',
    maxPosition: 500,
    orderSize: 50,
    tradeFrequency: 0.3,
    aggressiveness: 0.7
  });

  // Add mean reversion trader (student2)
  botManager.addTrader({
    id: 'bot-meanrev',
    name: 'MeanRevBot',
    sessionId,
    userId: student2.user.id,
    securityId: security.id,
    strategy: 'mean_reversion',
    maxPosition: 500,
    orderSize: 50,
    tradeFrequency: 0.3,
    aggressiveness: 0.5
  });

  // Add random trader (student3)
  botManager.addTrader({
    id: 'bot-random',
    name: 'RandomBot',
    sessionId,
    userId: student3.user.id,
    securityId: security.id,
    strategy: 'random',
    maxPosition: 300,
    orderSize: 25,
    tradeFrequency: 0.2,
    aggressiveness: 0.3
  });

  // Connect bots to simulator
  botManager.connectSimulator(simulator);

  // Track simulation stats
  let dayCount = 0;
  let highPrice = 50;
  let lowPrice = 50;
  let startPrice = 50;
  let endPrice = 50;
  let totalVolume = 0;

  simulator.on('dayStart', ({ day }) => {
    dayCount = day;
    if (day % 10 === 0) {
      const progress = Math.round((day / 90) * 100);
      console.log(`  Day ${day}/90 (${progress}% complete)`);
    }
  });

  simulator.on('tick', (tick) => {
    if (tick.price > highPrice) highPrice = tick.price;
    if (tick.price < lowPrice) lowPrice = tick.price;
    endPrice = tick.price;
    totalVolume += tick.volume;
  });

  simulator.on('news', (news) => {
    console.log(`  [NEWS] Day ${news.day}: ${news.headline}`);
  });

  // Start everything
  console.log('\n[4] Running simulation...\n');
  const startTime = Date.now();

  botManager.startAll();
  await simulator.start();

  // Wait for simulation to complete
  await new Promise<void>((resolve) => {
    simulator.on('simulationEnded', () => {
      const duration = (Date.now() - startTime) / 1000;

      console.log('\n' + '='.repeat(60));
      console.log('SIMULATION COMPLETE');
      console.log('='.repeat(60));
      console.log(`Duration: ${duration.toFixed(1)} seconds`);
      console.log(`Days Simulated: ${dayCount}`);

      console.log('\n--- MARKET SUMMARY ---');
      console.log(`Start Price: $${startPrice.toFixed(2)}`);
      console.log(`End Price: $${endPrice.toFixed(2)}`);
      console.log(`High: $${highPrice.toFixed(2)}`);
      console.log(`Low: $${lowPrice.toFixed(2)}`);
      console.log(`Return: ${(((endPrice - startPrice) / startPrice) * 100).toFixed(2)}%`);
      console.log(`Total Volume: ${totalVolume.toLocaleString()}`);

      console.log('\n--- BOT PERFORMANCE ---');
      const states = botManager.getAllStates();
      for (const state of states) {
        console.log(`\n${state.config.name} (${state.config.strategy})`);
        console.log(`  Trades: ${state.totalTrades}`);
        console.log(`  Final Position: ${state.position} shares`);
        console.log(`  Realized P&L: $${state.realizedPnL.toFixed(2)}`);
        console.log(`  Unrealized P&L: $${state.unrealizedPnL.toFixed(2)}`);
        console.log(`  Total P&L: $${(state.realizedPnL + state.unrealizedPnL).toFixed(2)}`);
      }

      console.log('\n' + '='.repeat(60));
      resolve();
    });
  });

  // Disconnect prisma
  await prisma.$disconnect();
}

// Run the simulation
runQuarterSimulation()
  .then(() => {
    console.log('\nSimulation script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Simulation error:', error);
    process.exit(1);
  });
