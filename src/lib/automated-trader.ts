/**
 * Automated Test Trader
 *
 * Bot traders for testing the exchange with synthetic market data.
 * Implements simple strategies: momentum, mean-reversion, random.
 */

import { EventEmitter } from 'events';
import { getReadyOrderMatchingEngine } from './order-matching-engine';
import { MarketSimulator, MarketTick, NewsEvent } from './market-simulator';

export type TradingStrategy = 'momentum' | 'mean_reversion' | 'random' | 'news_reactive';

export interface TraderConfig {
  id: string;
  name: string;
  sessionId: string;
  userId: string;           // Database user ID
  securityId: string;       // Database security ID
  strategy: TradingStrategy;
  maxPosition: number;      // Max shares to hold (positive or negative for short)
  orderSize: number;        // Shares per order
  tradeFrequency: number;   // Probability of trading on each tick (0-1)
  aggressiveness: number;   // How aggressively to trade (0-1)
}

export interface TraderState {
  position: number;         // Current position (negative = short)
  avgPrice: number;
  totalTrades: number;
  realizedPnL: number;
  unrealizedPnL: number;
  lastPrice: number;
  priceHistory: number[];   // Last N prices for strategy calculations
}

export class AutomatedTrader extends EventEmitter {
  private config: TraderConfig;
  private state: TraderState;
  private isActive: boolean = false;
  private priceHistoryLimit: number = 20;

  constructor(config: TraderConfig) {
    super();
    this.config = config;
    this.state = {
      position: 0,
      avgPrice: 0,
      totalTrades: 0,
      realizedPnL: 0,
      unrealizedPnL: 0,
      lastPrice: 0,
      priceHistory: []
    };
  }

  /**
   * Start trading
   */
  start(): void {
    this.isActive = true;
    console.log(`[AutoTrader:${this.config.name}] Started with strategy: ${this.config.strategy}`);
    this.emit('started', { traderId: this.config.id, strategy: this.config.strategy });
  }

  /**
   * Stop trading
   */
  stop(): void {
    this.isActive = false;
    console.log(`[AutoTrader:${this.config.name}] Stopped. Final P&L: $${this.state.realizedPnL.toFixed(2)}`);
    this.emit('stopped', { traderId: this.config.id, state: this.state });
  }

  /**
   * Process a market tick and potentially trade
   */
  async processTick(tick: MarketTick): Promise<void> {
    if (!this.isActive) return;

    // Update price history
    this.state.priceHistory.push(tick.price);
    if (this.state.priceHistory.length > this.priceHistoryLimit) {
      this.state.priceHistory.shift();
    }
    this.state.lastPrice = tick.price;

    // Update unrealized P&L
    if (this.state.position !== 0) {
      this.state.unrealizedPnL = (tick.price - this.state.avgPrice) * this.state.position;
    }

    // Decide whether to trade this tick
    if (Math.random() > this.config.tradeFrequency) return;

    // Get trading signal from strategy
    const signal = this.getStrategySignal(tick);
    if (signal === 0) return;

    // Execute trade
    await this.executeTrade(signal > 0 ? 'BUY' : 'SELL', tick);
  }

  /**
   * Process news event
   */
  async processNews(news: NewsEvent): Promise<void> {
    if (!this.isActive || this.config.strategy !== 'news_reactive') return;

    // React to news
    const signal = news.impact === 'positive' ? 1 : news.impact === 'negative' ? -1 : 0;
    if (signal === 0) return;

    console.log(`[AutoTrader:${this.config.name}] Reacting to news: ${news.headline}`);

    // Get current price from history
    if (this.state.lastPrice === 0) return;

    await this.executeTrade(signal > 0 ? 'BUY' : 'SELL', {
      price: this.state.lastPrice,
      bid: this.state.lastPrice * 0.999,
      ask: this.state.lastPrice * 1.001
    } as MarketTick);
  }

  /**
   * Get trading signal based on strategy
   * Returns: 1 = buy, -1 = sell, 0 = hold
   */
  private getStrategySignal(tick: MarketTick): number {
    switch (this.config.strategy) {
      case 'momentum':
        return this.momentumSignal();
      case 'mean_reversion':
        return this.meanReversionSignal();
      case 'random':
        return this.randomSignal();
      case 'news_reactive':
        // News reactive only trades on news events
        return 0;
      default:
        return 0;
    }
  }

  /**
   * Momentum strategy: buy when price is trending up, sell when trending down
   */
  private momentumSignal(): number {
    if (this.state.priceHistory.length < 5) return 0;

    const recent = this.state.priceHistory.slice(-5);
    const sma5 = recent.reduce((a, b) => a + b, 0) / 5;
    const currentPrice = this.state.lastPrice;

    // Check position limits
    if (this.state.position >= this.config.maxPosition && currentPrice > sma5) return 0;
    if (this.state.position <= -this.config.maxPosition && currentPrice < sma5) return 0;

    // Momentum signal
    if (currentPrice > sma5 * 1.005) return 1;  // 0.5% above SMA = buy
    if (currentPrice < sma5 * 0.995) return -1; // 0.5% below SMA = sell

    return 0;
  }

  /**
   * Mean reversion strategy: buy when price drops, sell when price rises
   */
  private meanReversionSignal(): number {
    if (this.state.priceHistory.length < 10) return 0;

    const sma10 = this.state.priceHistory.slice(-10).reduce((a, b) => a + b, 0) / 10;
    const currentPrice = this.state.lastPrice;
    const deviation = (currentPrice - sma10) / sma10;

    // Check position limits
    if (this.state.position >= this.config.maxPosition && deviation < -0.01) return 0;
    if (this.state.position <= -this.config.maxPosition && deviation > 0.01) return 0;

    // Mean reversion: buy oversold, sell overbought
    if (deviation < -0.02) return 1;   // 2% below mean = buy
    if (deviation > 0.02) return -1;   // 2% above mean = sell

    return 0;
  }

  /**
   * Random strategy: random buys and sells
   */
  private randomSignal(): number {
    // Check position limits
    const rand = Math.random();
    if (rand < 0.4 && this.state.position < this.config.maxPosition) return 1;
    if (rand > 0.6 && this.state.position > -this.config.maxPosition) return -1;
    return 0;
  }

  /**
   * Execute a trade
   */
  private async executeTrade(side: 'BUY' | 'SELL', tick: MarketTick): Promise<void> {
    try {
      const engine = await getReadyOrderMatchingEngine(this.config.sessionId);

      // Use market price for limit order (slightly better than market)
      const price = side === 'BUY' ? tick.ask : tick.bid;

      const order = await engine.submitOrder({
        sessionId: this.config.sessionId,
        userId: this.config.userId,
        securityId: this.config.securityId,
        type: 'LIMIT',
        side,
        quantity: this.config.orderSize,
        price,
        timeInForce: 'IOC' // Immediate or cancel
      });

      if (order.status === 'FILLED' || order.status === 'PARTIALLY_FILLED') {
        const filledQty = this.config.orderSize - order.remainingQuantity;

        // Update position
        const prevPosition = this.state.position;
        this.state.position += side === 'BUY' ? filledQty : -filledQty;

        // Update average price
        if (side === 'BUY') {
          if (prevPosition >= 0) {
            // Adding to long or going long
            this.state.avgPrice = prevPosition === 0
              ? price
              : (this.state.avgPrice * prevPosition + price * filledQty) / (prevPosition + filledQty);
          } else {
            // Covering short
            this.state.realizedPnL += (this.state.avgPrice - price) * Math.min(filledQty, -prevPosition);
          }
        } else {
          if (prevPosition <= 0) {
            // Adding to short or going short
            this.state.avgPrice = prevPosition === 0
              ? price
              : (this.state.avgPrice * -prevPosition + price * filledQty) / (-prevPosition + filledQty);
          } else {
            // Selling long position
            this.state.realizedPnL += (price - this.state.avgPrice) * Math.min(filledQty, prevPosition);
          }
        }

        this.state.totalTrades++;

        console.log(`[AutoTrader:${this.config.name}] ${side} ${filledQty} @ $${price.toFixed(2)} | Position: ${this.state.position} | Realized P&L: $${this.state.realizedPnL.toFixed(2)}`);

        this.emit('trade', {
          traderId: this.config.id,
          side,
          quantity: filledQty,
          price,
          position: this.state.position,
          realizedPnL: this.state.realizedPnL
        });
      }
    } catch (error) {
      console.error(`[AutoTrader:${this.config.name}] Trade error:`, error);
    }
  }

  /**
   * Get current state
   */
  getState(): TraderState & { config: TraderConfig } {
    return {
      ...this.state,
      config: this.config
    };
  }

  /**
   * Check if active
   */
  isTrading(): boolean {
    return this.isActive;
  }
}

/**
 * Trading Bot Manager
 * Coordinates multiple automated traders with a market simulator
 */
export class TradingBotManager extends EventEmitter {
  private traders: Map<string, AutomatedTrader> = new Map();
  private simulator: MarketSimulator | null = null;

  constructor() {
    super();
  }

  /**
   * Add a trader
   */
  addTrader(config: TraderConfig): AutomatedTrader {
    const trader = new AutomatedTrader(config);
    this.traders.set(config.id, trader);

    // Forward events
    trader.on('trade', (data) => this.emit('trade', data));
    trader.on('started', (data) => this.emit('traderStarted', data));
    trader.on('stopped', (data) => this.emit('traderStopped', data));

    return trader;
  }

  /**
   * Connect traders to a market simulator
   */
  connectSimulator(simulator: MarketSimulator): void {
    this.simulator = simulator;

    // Wire up tick events
    simulator.on('tick', async (tick: MarketTick) => {
      for (const trader of this.traders.values()) {
        await trader.processTick(tick);
      }
    });

    // Wire up news events
    simulator.on('news', async (news: NewsEvent) => {
      for (const trader of this.traders.values()) {
        await trader.processNews(news);
      }
    });

    // End of simulation
    simulator.on('simulationEnded', () => {
      this.stopAll();
      this.printSummary();
    });
  }

  /**
   * Start all traders
   */
  startAll(): void {
    for (const trader of this.traders.values()) {
      trader.start();
    }
    console.log(`[BotManager] Started ${this.traders.size} traders`);
  }

  /**
   * Stop all traders
   */
  stopAll(): void {
    for (const trader of this.traders.values()) {
      trader.stop();
    }
    console.log(`[BotManager] Stopped ${this.traders.size} traders`);
  }

  /**
   * Print summary of all traders
   */
  printSummary(): void {
    console.log('\n=== TRADING BOT SUMMARY ===');
    let totalPnL = 0;

    for (const trader of this.traders.values()) {
      const state = trader.getState();
      console.log(`${state.config.name} (${state.config.strategy})`);
      console.log(`  Position: ${state.position} shares`);
      console.log(`  Trades: ${state.totalTrades}`);
      console.log(`  Realized P&L: $${state.realizedPnL.toFixed(2)}`);
      console.log(`  Unrealized P&L: $${state.unrealizedPnL.toFixed(2)}`);
      totalPnL += state.realizedPnL + state.unrealizedPnL;
    }

    console.log(`\nTotal Combined P&L: $${totalPnL.toFixed(2)}`);
    console.log('===========================\n');
  }

  /**
   * Get all trader states
   */
  getAllStates(): Array<TraderState & { config: TraderConfig }> {
    return Array.from(this.traders.values()).map(t => t.getState());
  }
}
