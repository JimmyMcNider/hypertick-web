/**
 * Trading Bots - Automated Market Simulation
 * 
 * Provides automated trading bots to create realistic market conditions,
 * liquidity provision, and competitive trading environment for students
 */

import { EventEmitter } from 'events';

export interface BotConfiguration {
  id: string;
  name: string;
  type: 'LIQUIDITY_PROVIDER' | 'MOMENTUM_TRADER' | 'ARBITRAGEUR' | 'NOISE_TRADER' | 'MARKET_MAKER';
  symbols: string[];
  active: boolean;
  parameters: {
    [key: string]: any;
  };
}

export interface BotOrder {
  id: string;
  botId: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  orderType: 'MARKET' | 'LIMIT';
  timestamp: Date;
  sessionId: string;
}

export interface MarketState {
  symbol: string;
  bid: number;
  ask: number;
  last: number;
  volume: number;
  volatility: number;
  trend: 'UP' | 'DOWN' | 'SIDEWAYS';
}

export class TradingBot extends EventEmitter {
  public config: BotConfiguration;
  private isActive: boolean = false;
  private orderHistory: BotOrder[] = [];
  private positionSize: number = 0;
  private lastAction: Date = new Date();
  private sessionId?: string;

  constructor(config: BotConfiguration) {
    super();
    this.config = config;
  }

  /**
   * Start bot trading
   */
  start(sessionId: string): void {
    this.sessionId = sessionId;
    this.isActive = true;
    this.emit('bot_started', { botId: this.config.id, sessionId });
    
    // Start trading logic based on bot type
    this.beginTradingCycle();
  }

  /**
   * Stop bot trading
   */
  stop(): void {
    this.isActive = false;
    this.emit('bot_stopped', { botId: this.config.id });
  }

  /**
   * Update market conditions for bot decision making
   */
  updateMarketState(marketState: MarketState): void {
    if (!this.isActive || !this.sessionId) return;

    // Make trading decisions based on bot type and market conditions
    switch (this.config.type) {
      case 'LIQUIDITY_PROVIDER':
        this.handleLiquidityProviding(marketState);
        break;
      case 'MOMENTUM_TRADER':
        this.handleMomentumTrading(marketState);
        break;
      case 'ARBITRAGEUR':
        this.handleArbitrage(marketState);
        break;
      case 'NOISE_TRADER':
        this.handleNoiseTrading(marketState);
        break;
      case 'MARKET_MAKER':
        this.handleMarketMaking(marketState);
        break;
    }
  }

  /**
   * Liquidity Provider Bot - Provides continuous two-way quotes
   */
  private handleLiquidityProviding(market: MarketState): void {
    const config = this.config.parameters;
    const spread = config.minSpread || 0.02;
    const quoteSize = config.quoteSize || 100;
    const maxPosition = config.maxPosition || 1000;

    // Don't provide liquidity if position is too large
    if (Math.abs(this.positionSize) > maxPosition) {
      return;
    }

    // Calculate competitive bid/ask prices
    const bidPrice = market.last - spread / 2;
    const askPrice = market.last + spread / 2;

    // Place bid order
    if (this.positionSize < maxPosition) {
      this.placeOrder({
        symbol: market.symbol,
        side: 'BUY',
        quantity: quoteSize,
        price: bidPrice,
        orderType: 'LIMIT'
      });
    }

    // Place ask order
    if (this.positionSize > -maxPosition) {
      this.placeOrder({
        symbol: market.symbol,
        side: 'SELL',
        quantity: quoteSize,
        price: askPrice,
        orderType: 'LIMIT'
      });
    }
  }

  /**
   * Momentum Trader Bot - Follows trends
   */
  private handleMomentumTrading(market: MarketState): void {
    const config = this.config.parameters;
    const tradeSize = config.tradeSize || 200;
    const momentumThreshold = config.momentumThreshold || 0.02;

    // Calculate price momentum
    const recentOrders = this.orderHistory.slice(-5);
    if (recentOrders.length < 2) return;

    const oldPrice = recentOrders[0].price;
    const momentum = (market.last - oldPrice) / oldPrice;

    // Trade in direction of momentum if threshold is met
    if (Math.abs(momentum) > momentumThreshold) {
      const side = momentum > 0 ? 'BUY' : 'SELL';
      
      // Don't chase too aggressively
      if (this.lastAction.getTime() < Date.now() - 10000) { // 10 second cooldown
        this.placeOrder({
          symbol: market.symbol,
          side,
          quantity: tradeSize,
          price: market.last,
          orderType: 'MARKET'
        });
      }
    }
  }

  /**
   * Arbitrageur Bot - Exploits price differences
   */
  private handleArbitrage(market: MarketState): void {
    const config = this.config.parameters;
    const minArbitrageProfit = config.minProfit || 0.01;
    
    // Simplified arbitrage - look for spread compression opportunities
    const currentSpread = market.ask - market.bid;
    const expectedSpread = config.expectedSpread || 0.02;

    if (currentSpread > expectedSpread + minArbitrageProfit) {
      // Spread is wide - provide liquidity to capture it
      this.placeOrder({
        symbol: market.symbol,
        side: 'BUY',
        quantity: 50,
        price: market.bid + 0.01,
        orderType: 'LIMIT'
      });

      this.placeOrder({
        symbol: market.symbol,
        side: 'SELL',
        quantity: 50,
        price: market.ask - 0.01,
        orderType: 'LIMIT'
      });
    }
  }

  /**
   * Noise Trader Bot - Random trading to add market activity
   */
  private handleNoiseTrading(market: MarketState): void {
    const config = this.config.parameters;
    const frequency = config.frequency || 0.1; // 10% chance per update
    const maxSize = config.maxSize || 100;

    if (Math.random() < frequency) {
      const side = Math.random() < 0.5 ? 'BUY' : 'SELL';
      const quantity = Math.floor(Math.random() * maxSize) + 10;
      const priceVariation = (Math.random() - 0.5) * 0.02; // ±1% price variation

      this.placeOrder({
        symbol: market.symbol,
        side,
        quantity,
        price: market.last * (1 + priceVariation),
        orderType: 'LIMIT'
      });
    }
  }

  /**
   * Market Maker Bot - Professional market making
   */
  private handleMarketMaking(market: MarketState): void {
    const config = this.config.parameters;
    const baseSpread = config.baseSpread || 0.02;
    const sizeMultiplier = config.sizeMultiplier || 1.0;
    const inventoryTarget = config.inventoryTarget || 0;
    const maxInventory = config.maxInventory || 500;

    // Adjust spread based on inventory and volatility
    const inventorySkew = (this.positionSize - inventoryTarget) / maxInventory;
    const volatilityAdjustment = market.volatility * 0.5;
    const adjustedSpread = baseSpread * (1 + volatilityAdjustment);

    // Skew prices based on inventory
    const midPrice = market.last;
    const bidSkew = inventorySkew * 0.01; // Positive inventory makes us bid lower
    const askSkew = -inventorySkew * 0.01; // Positive inventory makes us offer lower

    const bidPrice = midPrice - adjustedSpread / 2 + bidSkew;
    const askPrice = midPrice + adjustedSpread / 2 + askSkew;

    // Size based on distance from market and inventory
    const bidSize = Math.floor(100 * sizeMultiplier * (1 - Math.abs(inventorySkew)));
    const askSize = Math.floor(100 * sizeMultiplier * (1 - Math.abs(inventorySkew)));

    if (bidSize > 0 && this.positionSize < maxInventory) {
      this.placeOrder({
        symbol: market.symbol,
        side: 'BUY',
        quantity: bidSize,
        price: bidPrice,
        orderType: 'LIMIT'
      });
    }

    if (askSize > 0 && this.positionSize > -maxInventory) {
      this.placeOrder({
        symbol: market.symbol,
        side: 'SELL',
        quantity: askSize,
        price: askPrice,
        orderType: 'LIMIT'
      });
    }
  }

  /**
   * Place an order
   */
  private placeOrder(orderData: {
    symbol: string;
    side: 'BUY' | 'SELL';
    quantity: number;
    price: number;
    orderType: 'MARKET' | 'LIMIT';
  }): void {
    if (!this.sessionId) return;

    const order: BotOrder = {
      id: `bot_${this.config.id}_${Date.now()}`,
      botId: this.config.id,
      sessionId: this.sessionId,
      timestamp: new Date(),
      ...orderData
    };

    this.orderHistory.push(order);
    this.lastAction = new Date();

    // Update position (simplified)
    const positionChange = orderData.side === 'BUY' ? orderData.quantity : -orderData.quantity;
    this.positionSize += positionChange;

    this.emit('bot_order_placed', order);
  }

  /**
   * Begin trading cycle
   */
  private beginTradingCycle(): void {
    const interval = setInterval(() => {
      if (!this.isActive) {
        clearInterval(interval);
        return;
      }

      // Periodic actions like position management, risk checks
      this.performPeriodicActions();

    }, 5000); // Every 5 seconds
  }

  /**
   * Periodic maintenance actions
   */
  private performPeriodicActions(): void {
    // Position size management
    const maxPosition = this.config.parameters.maxPosition || 1000;
    if (Math.abs(this.positionSize) > maxPosition * 1.2) {
      // Emergency position reduction
      const reduceQuantity = Math.floor(Math.abs(this.positionSize) * 0.1);
      const side = this.positionSize > 0 ? 'SELL' : 'BUY';
      
      this.placeOrder({
        symbol: this.config.symbols[0], // Use first symbol for emergency trades
        side,
        quantity: reduceQuantity,
        price: 0, // Market order
        orderType: 'MARKET'
      });
    }

    // Clean up old orders from history
    const cutoffTime = Date.now() - 60000; // Keep last 1 minute
    this.orderHistory = this.orderHistory.filter(order => order.timestamp.getTime() > cutoffTime);
  }

  /**
   * Get bot statistics
   */
  getStatistics(): any {
    const totalOrders = this.orderHistory.length;
    const buyOrders = this.orderHistory.filter(o => o.side === 'BUY').length;
    const sellOrders = this.orderHistory.filter(o => o.side === 'SELL').length;
    
    return {
      botId: this.config.id,
      name: this.config.name,
      type: this.config.type,
      isActive: this.isActive,
      positionSize: this.positionSize,
      totalOrders,
      buyOrders,
      sellOrders,
      lastAction: this.lastAction,
      orderHistory: this.orderHistory.slice(-10) // Last 10 orders
    };
  }
}

/**
 * Bot Manager - Manages multiple trading bots
 */
export class BotManager extends EventEmitter {
  private bots: Map<string, TradingBot> = new Map();
  private marketData: Map<string, MarketState> = new Map();
  private updateInterval?: NodeJS.Timeout;

  /**
   * Create and register a new bot
   */
  createBot(config: BotConfiguration): TradingBot {
    const bot = new TradingBot(config);
    
    // Forward bot events
    bot.on('bot_order_placed', (order) => {
      this.emit('bot_order_placed', order);
    });

    bot.on('bot_started', (data) => {
      this.emit('bot_started', data);
    });

    bot.on('bot_stopped', (data) => {
      this.emit('bot_stopped', data);
    });

    this.bots.set(config.id, bot);
    return bot;
  }

  /**
   * Start all bots for a session
   */
  startSession(sessionId: string, symbols: string[]): void {
    // Initialize market data
    symbols.forEach(symbol => {
      this.marketData.set(symbol, {
        symbol,
        bid: 50.00,
        ask: 50.02,
        last: 50.01,
        volume: 0,
        volatility: 0.02,
        trend: 'SIDEWAYS'
      });
    });

    // Start bots
    this.bots.forEach(bot => {
      if (bot.config.active) {
        bot.start(sessionId);
      }
    });

    // Start market data updates
    this.startMarketDataUpdates();

    this.emit('session_started', { sessionId, symbols, botCount: this.bots.size });
  }

  /**
   * Stop all bots
   */
  stopSession(): void {
    this.bots.forEach(bot => bot.stop());
    
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = undefined;
    }

    this.emit('session_stopped');
  }

  /**
   * Update market data
   */
  updateMarketData(symbol: string, update: Partial<MarketState>): void {
    const currentData = this.marketData.get(symbol);
    if (currentData) {
      const updatedData = { ...currentData, ...update };
      this.marketData.set(symbol, updatedData);

      // Notify all bots of market update
      this.bots.forEach(bot => {
        if (bot.config.symbols.includes(symbol) && bot.config.active) {
          bot.updateMarketState(updatedData);
        }
      });
    }
  }

  /**
   * Get all bot statistics
   */
  getAllBotStatistics(): any[] {
    return Array.from(this.bots.values()).map(bot => bot.getStatistics());
  }

  /**
   * Start market data simulation
   */
  private startMarketDataUpdates(): void {
    this.updateInterval = setInterval(() => {
      // Simulate realistic market movements
      this.marketData.forEach((marketState, symbol) => {
        const randomWalk = (Math.random() - 0.5) * marketState.volatility;
        const newPrice = marketState.last * (1 + randomWalk);
        
        // Update market state
        const updatedState: MarketState = {
          ...marketState,
          last: newPrice,
          bid: newPrice - 0.01,
          ask: newPrice + 0.01,
          volume: marketState.volume + Math.floor(Math.random() * 100),
          volatility: Math.max(0.001, marketState.volatility + (Math.random() - 0.5) * 0.001)
        };

        this.marketData.set(symbol, updatedState);
        this.emit('market_data_updated', updatedState);

        // Notify bots
        this.bots.forEach(bot => {
          if (bot.config.symbols.includes(symbol) && bot.config.active) {
            bot.updateMarketState(updatedState);
          }
        });
      });
    }, 2000); // Update every 2 seconds
  }
}

/**
 * Default bot configurations
 */
export const DEFAULT_BOT_CONFIGS: BotConfiguration[] = [
  {
    id: 'liquidity_bot_1',
    name: 'Primary Liquidity Provider',
    type: 'LIQUIDITY_PROVIDER',
    symbols: ['AOE', 'BOND1'],
    active: true,
    parameters: {
      minSpread: 0.02,
      quoteSize: 100,
      maxPosition: 1000
    }
  },
  {
    id: 'momentum_bot_1',
    name: 'Momentum Follower',
    type: 'MOMENTUM_TRADER',
    symbols: ['AOE'],
    active: true,
    parameters: {
      tradeSize: 200,
      momentumThreshold: 0.015
    }
  },
  {
    id: 'market_maker_1',
    name: 'Professional Market Maker',
    type: 'MARKET_MAKER',
    symbols: ['BOND1', 'BOND2'],
    active: true,
    parameters: {
      baseSpread: 0.015,
      sizeMultiplier: 1.2,
      inventoryTarget: 0,
      maxInventory: 800
    }
  },
  {
    id: 'noise_trader_1',
    name: 'Random Trader',
    type: 'NOISE_TRADER',
    symbols: ['AOE', 'BOND1', 'BOND2'],
    active: true,
    parameters: {
      frequency: 0.05,
      maxSize: 150
    }
  }
];

// Global bot manager instance
export const botManager = new BotManager();