/**
 * Synthetic Market Simulator
 *
 * Generates realistic market data for testing trading environments.
 * Simulates 1 quarter (90 trading days) at configurable speed.
 * Default: 1 day = 3 seconds (90 days = 270 seconds = 4.5 minutes)
 */

import { EventEmitter } from 'events';
import { getReadyOrderMatchingEngine } from './order-matching-engine';

export interface MarketTick {
  day: number;
  tick: number;  // Intraday tick (0-100 per day)
  timestamp: Date;
  symbol: string;
  price: number;
  bid: number;
  ask: number;
  volume: number;
  open: number;
  high: number;
  low: number;
  close: number;
  change: number;
  changePercent: number;
}

export interface NewsEvent {
  day: number;
  tick: number;
  headline: string;
  impact: 'positive' | 'negative' | 'neutral';
  magnitude: number; // 0.01 to 0.10 (1% to 10% move)
  symbol: string;
}

export interface MarketConfig {
  symbol: string;
  startPrice: number;
  volatility: number;      // Daily volatility (e.g., 0.02 = 2%)
  drift: number;           // Daily drift/trend (e.g., 0.001 = 0.1% daily up)
  spreadBps: number;       // Bid-ask spread in basis points (e.g., 10 = 0.1%)
  ticksPerDay: number;     // Number of price updates per simulated day
  newsFrequency: number;   // Average news events per day
}

export interface SimulationConfig {
  sessionId: string;
  securityId: string;      // Database ID for the security
  totalDays: number;       // Total trading days to simulate
  msPerDay: number;        // Milliseconds per simulated day
  markets: MarketConfig[];
  autoTrade: boolean;      // Whether to run automated traders
}

const DEFAULT_MARKET_CONFIG: MarketConfig = {
  symbol: 'AOE',
  startPrice: 50.00,
  volatility: 0.025,       // 2.5% daily volatility
  drift: 0.0005,           // Slight upward drift
  spreadBps: 10,           // 10 bps spread
  ticksPerDay: 10,         // 10 ticks per day
  newsFrequency: 0.3       // ~1 news event every 3 days
};

const NEWS_HEADLINES = {
  positive: [
    '{symbol} beats Q1 earnings estimates by 15%',
    '{symbol} announces major partnership with tech giant',
    '{symbol} receives FDA approval for new product',
    '{symbol} raises full-year guidance',
    'Analyst upgrades {symbol} to Strong Buy',
    '{symbol} wins $500M government contract',
    '{symbol} reports record quarterly revenue',
    'Insider buying detected at {symbol}'
  ],
  negative: [
    '{symbol} misses earnings expectations',
    '{symbol} announces CFO departure',
    '{symbol} faces SEC investigation',
    'Analyst downgrades {symbol} to Sell',
    '{symbol} product recall announced',
    '{symbol} loses major customer contract',
    '{symbol} guidance lowered for Q2',
    'Short interest increases in {symbol}'
  ],
  neutral: [
    '{symbol} to present at investor conference',
    '{symbol} board meeting scheduled',
    '{symbol} ex-dividend date approaching',
    'Volume spike detected in {symbol}',
    '{symbol} announces stock buyback program',
    '{symbol} CEO to speak at industry event'
  ]
};

export class MarketSimulator extends EventEmitter {
  private config: SimulationConfig;
  private marketStates: Map<string, {
    price: number;
    open: number;
    high: number;
    low: number;
    volume: number;
  }> = new Map();
  private isRunning: boolean = false;
  private currentDay: number = 0;
  private currentTick: number = 0;
  private intervalId: NodeJS.Timeout | null = null;
  private scheduledNews: NewsEvent[] = [];

  constructor(config: SimulationConfig) {
    super();
    this.config = {
      ...config,
      markets: config.markets.length > 0 ? config.markets : [DEFAULT_MARKET_CONFIG]
    };
    this.initializeMarkets();
    this.scheduleNewsEvents();
  }

  private initializeMarkets(): void {
    for (const market of this.config.markets) {
      this.marketStates.set(market.symbol, {
        price: market.startPrice,
        open: market.startPrice,
        high: market.startPrice,
        low: market.startPrice,
        volume: 0
      });
    }
  }

  private scheduleNewsEvents(): void {
    for (const market of this.config.markets) {
      for (let day = 1; day <= this.config.totalDays; day++) {
        if (Math.random() < market.newsFrequency) {
          const impact = this.randomChoice(['positive', 'negative', 'neutral']) as 'positive' | 'negative' | 'neutral';
          const headlines = NEWS_HEADLINES[impact];
          const headline = headlines[Math.floor(Math.random() * headlines.length)].replace('{symbol}', market.symbol);

          this.scheduledNews.push({
            day,
            tick: Math.floor(Math.random() * market.ticksPerDay),
            headline,
            impact,
            magnitude: impact === 'neutral' ? 0.005 : 0.02 + Math.random() * 0.05,
            symbol: market.symbol
          });
        }
      }
    }
    // Sort by day and tick
    this.scheduledNews.sort((a, b) => a.day * 1000 + a.tick - (b.day * 1000 + b.tick));
  }

  private randomChoice<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  /**
   * Generate next price using geometric Brownian motion
   */
  private generateNextPrice(currentPrice: number, market: MarketConfig, hasNews?: NewsEvent): number {
    // Base price movement (GBM)
    const dt = 1 / market.ticksPerDay; // Fraction of day
    const randomShock = (Math.random() - 0.5) * 2; // -1 to 1
    const volatilityMove = market.volatility * Math.sqrt(dt) * randomShock;
    const driftMove = market.drift * dt;

    let newPrice = currentPrice * (1 + driftMove + volatilityMove);

    // Apply news impact if present
    if (hasNews) {
      const direction = hasNews.impact === 'positive' ? 1 : hasNews.impact === 'negative' ? -1 : 0;
      newPrice *= (1 + direction * hasNews.magnitude);
    }

    // Ensure price doesn't go negative or too low
    return Math.max(0.01, newPrice);
  }

  /**
   * Start the market simulation
   */
  async start(): Promise<void> {
    if (this.isRunning) return;

    this.isRunning = true;
    this.currentDay = 1;
    this.currentTick = 0;

    // Open market on matching engine
    const engine = await getReadyOrderMatchingEngine(this.config.sessionId);
    await engine.openMarket();

    console.log(`[MarketSimulator] Starting simulation for session ${this.config.sessionId}`);
    console.log(`[MarketSimulator] ${this.config.totalDays} days @ ${this.config.msPerDay}ms/day = ${(this.config.totalDays * this.config.msPerDay / 1000).toFixed(1)} seconds total`);

    this.emit('simulationStarted', {
      sessionId: this.config.sessionId,
      totalDays: this.config.totalDays,
      estimatedDuration: this.config.totalDays * this.config.msPerDay
    });

    // Calculate tick interval
    const ticksPerDay = this.config.markets[0].ticksPerDay;
    const tickInterval = Math.floor(this.config.msPerDay / ticksPerDay);

    this.intervalId = setInterval(() => {
      this.processTick();
    }, tickInterval);
  }

  /**
   * Process a single market tick
   */
  private processTick(): void {
    if (!this.isRunning) return;

    const ticksPerDay = this.config.markets[0].ticksPerDay;

    for (const market of this.config.markets) {
      const state = this.marketStates.get(market.symbol);
      if (!state) continue;

      // Check for scheduled news
      const news = this.scheduledNews.find(
        n => n.symbol === market.symbol && n.day === this.currentDay && n.tick === this.currentTick
      );

      if (news) {
        this.emit('news', news);
        console.log(`[News] Day ${this.currentDay}: ${news.headline}`);
      }

      // Generate new price
      const newPrice = this.generateNextPrice(state.price, market, news);
      const roundedPrice = Math.round(newPrice * 100) / 100;

      // Calculate bid/ask
      const spreadAmount = roundedPrice * (market.spreadBps / 10000);
      const bid = Math.round((roundedPrice - spreadAmount / 2) * 100) / 100;
      const ask = Math.round((roundedPrice + spreadAmount / 2) * 100) / 100;

      // Update state
      state.price = roundedPrice;
      state.high = Math.max(state.high, roundedPrice);
      state.low = Math.min(state.low, roundedPrice);
      state.volume += Math.floor(1000 + Math.random() * 5000);

      // Emit tick
      const tick: MarketTick = {
        day: this.currentDay,
        tick: this.currentTick,
        timestamp: new Date(),
        symbol: market.symbol,
        price: roundedPrice,
        bid,
        ask,
        volume: state.volume,
        open: state.open,
        high: state.high,
        low: state.low,
        close: roundedPrice,
        change: roundedPrice - state.open,
        changePercent: ((roundedPrice - state.open) / state.open) * 100
      };

      this.emit('tick', tick);
    }

    // Advance tick/day
    this.currentTick++;
    if (this.currentTick >= ticksPerDay) {
      this.currentTick = 0;
      this.endDay();
      this.currentDay++;

      if (this.currentDay > this.config.totalDays) {
        this.stop();
        return;
      }

      this.startDay();
    }
  }

  private startDay(): void {
    // Reset daily OHLC
    for (const [symbol, state] of this.marketStates) {
      state.open = state.price;
      state.high = state.price;
      state.low = state.price;
      state.volume = 0;
    }

    this.emit('dayStart', { day: this.currentDay });
    console.log(`[MarketSimulator] Day ${this.currentDay}/${this.config.totalDays} started`);
  }

  private endDay(): void {
    const dailySummary: any[] = [];

    for (const [symbol, state] of this.marketStates) {
      const market = this.config.markets.find(m => m.symbol === symbol);
      if (!market) continue;

      dailySummary.push({
        symbol,
        day: this.currentDay,
        open: state.open,
        high: state.high,
        low: state.low,
        close: state.price,
        volume: state.volume,
        change: state.price - state.open,
        changePercent: ((state.price - state.open) / state.open) * 100
      });
    }

    this.emit('dayEnd', { day: this.currentDay, summary: dailySummary });
  }

  /**
   * Stop the simulation
   */
  stop(): void {
    if (!this.isRunning) return;

    this.isRunning = false;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    console.log(`[MarketSimulator] Simulation ended after ${this.currentDay} days`);
    this.emit('simulationEnded', {
      sessionId: this.config.sessionId,
      totalDays: this.currentDay,
      finalPrices: Object.fromEntries(
        Array.from(this.marketStates.entries()).map(([symbol, state]) => [symbol, state.price])
      )
    });
  }

  /**
   * Get current market state
   */
  getMarketState(symbol: string): { price: number; bid: number; ask: number } | null {
    const state = this.marketStates.get(symbol);
    if (!state) return null;

    const market = this.config.markets.find(m => m.symbol === symbol);
    if (!market) return null;

    const spreadAmount = state.price * (market.spreadBps / 10000);
    return {
      price: state.price,
      bid: Math.round((state.price - spreadAmount / 2) * 100) / 100,
      ask: Math.round((state.price + spreadAmount / 2) * 100) / 100
    };
  }

  /**
   * Check if simulation is running
   */
  isActive(): boolean {
    return this.isRunning;
  }

  /**
   * Get current progress
   */
  getProgress(): { day: number; totalDays: number; percentComplete: number } {
    return {
      day: this.currentDay,
      totalDays: this.config.totalDays,
      percentComplete: Math.round((this.currentDay / this.config.totalDays) * 100)
    };
  }
}

// Active simulators by session
const activeSimulators = new Map<string, MarketSimulator>();

export function createMarketSimulator(config: SimulationConfig): MarketSimulator {
  // Stop existing simulator for this session if any
  const existing = activeSimulators.get(config.sessionId);
  if (existing) {
    existing.stop();
  }

  const simulator = new MarketSimulator(config);
  activeSimulators.set(config.sessionId, simulator);
  return simulator;
}

export function getMarketSimulator(sessionId: string): MarketSimulator | undefined {
  return activeSimulators.get(sessionId);
}
