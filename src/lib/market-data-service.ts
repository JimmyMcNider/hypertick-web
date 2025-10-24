/**
 * Market Data Service
 * 
 * Provides real-time market data streaming, price feeds, and market simulation
 * for educational trading sessions. Integrates with trading engine and WebSocket server.
 */

import { EventEmitter } from 'events';
import { tradingEngine } from './trading-engine';

export interface MarketFeed {
  symbol: string;
  price: number;
  volume: number;
  timestamp: Date;
  bid: number;
  ask: number;
  high: number;
  low: number;
  open: number;
  volatility: number;
}

export interface NewsEvent {
  id: string;
  symbol?: string;
  title: string;
  content: string;
  impact: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  timestamp: Date;
  duration: number; // seconds
}

export interface MarketEvent {
  id: string;
  type: 'NEWS' | 'EARNINGS' | 'DIVIDEND' | 'SPLIT' | 'HALT' | 'RESUME';
  symbol?: string;
  data: any;
  scheduledTime: Date;
  duration?: number;
}

export class MarketDataService extends EventEmitter {
  private feeds: Map<string, MarketFeed> = new Map();
  private subscriptions: Map<string, Set<string>> = new Map(); // sessionId -> symbols
  private updateIntervals: Map<string, NodeJS.Timeout> = new Map();
  private newsEvents: NewsEvent[] = [];
  private marketEvents: MarketEvent[] = [];
  private volatilityMultipliers: Map<string, number> = new Map();

  constructor() {
    super();
    this.initializeMarketFeeds();
  }

  /**
   * Initialize market feeds for all symbols
   */
  private initializeMarketFeeds(): void {
    const symbols = [
      { symbol: 'AOE', price: 50.00, volatility: 0.02, type: 'EQUITY' },
      { symbol: 'BOND1', price: 99.30, volatility: 0.005, type: 'BOND' },
      { symbol: 'BOND2', price: 102.80, volatility: 0.005, type: 'BOND' },
      { symbol: 'BOND3', price: 95.50, volatility: 0.005, type: 'BOND' },
      { symbol: 'SPX', price: 4150.00, volatility: 0.015, type: 'INDEX' }
    ];

    symbols.forEach(({ symbol, price, volatility }) => {
      const spread = symbol.startsWith('BOND') ? 0.02 : 0.10;
      
      const feed: MarketFeed = {
        symbol,
        price,
        volume: Math.floor(Math.random() * 50000) + 10000,
        timestamp: new Date(),
        bid: price - spread / 2,
        ask: price + spread / 2,
        high: price * 1.02,
        low: price * 0.98,
        open: price,
        volatility
      };

      this.feeds.set(symbol, feed);
      this.volatilityMultipliers.set(symbol, 1.0);
    });
  }

  /**
   * Start market data streaming for a session
   */
  public startDataFeed(sessionId: string, symbols: string[] = []): void {
    const symbolSet = new Set(symbols.length > 0 ? symbols : Array.from(this.feeds.keys()));
    this.subscriptions.set(sessionId, symbolSet);

    // Start real-time updates
    const interval = setInterval(() => {
      symbolSet.forEach(symbol => {
        this.updateMarketData(sessionId, symbol);
      });
    }, 500); // Update every 500ms for smooth price movement

    this.updateIntervals.set(sessionId, interval);
    
    // Send initial snapshot
    symbolSet.forEach(symbol => {
      const feed = this.feeds.get(symbol);
      if (feed) {
        this.emit('market_data', {
          sessionId,
          symbol,
          data: feed
        });
      }
    });

    this.emit('feed_started', { sessionId, symbols: Array.from(symbolSet) });
  }

  /**
   * Stop market data streaming for a session
   */
  public stopDataFeed(sessionId: string): void {
    const interval = this.updateIntervals.get(sessionId);
    if (interval) {
      clearInterval(interval);
      this.updateIntervals.delete(sessionId);
    }

    this.subscriptions.delete(sessionId);
    this.emit('feed_stopped', { sessionId });
  }

  /**
   * Update market data with realistic price movements
   */
  private updateMarketData(sessionId: string, symbol: string): void {
    const currentFeed = this.feeds.get(symbol);
    if (!currentFeed) return;

    const volatilityMultiplier = this.volatilityMultipliers.get(symbol) || 1.0;
    const adjustedVolatility = currentFeed.volatility * volatilityMultiplier;

    // Geometric Brownian Motion with mean reversion
    const dt = 0.0005; // Time step (500ms in years)
    const meanReversion = 0.1; // Mean reversion strength
    const randomComponent = (Math.random() - 0.5) * 2; // Normal distribution approximation
    
    // Calculate price change
    const drift = -meanReversion * Math.log(currentFeed.price / currentFeed.open) * dt;
    const diffusion = adjustedVolatility * Math.sqrt(dt) * randomComponent;
    const priceChange = currentFeed.price * (drift + diffusion);
    
    const newPrice = Math.max(0.01, currentFeed.price + priceChange);
    
    // Update spread based on volatility
    const spreadMultiplier = 1 + (adjustedVolatility * 10);
    const baseSpread = symbol.startsWith('BOND') ? 0.02 : 0.10;
    const dynamicSpread = baseSpread * spreadMultiplier;
    
    // Update volume with some correlation to price movement
    const volumeChange = Math.abs(priceChange / currentFeed.price) * 10000;
    const newVolume = currentFeed.volume + Math.floor(volumeChange);

    const updatedFeed: MarketFeed = {
      ...currentFeed,
      price: newPrice,
      bid: newPrice - dynamicSpread / 2,
      ask: newPrice + dynamicSpread / 2,
      high: Math.max(currentFeed.high, newPrice),
      low: Math.min(currentFeed.low, newPrice),
      volume: newVolume,
      timestamp: new Date()
    };

    this.feeds.set(symbol, updatedFeed);

    // Emit market data update
    this.emit('market_data', {
      sessionId,
      symbol,
      data: updatedFeed
    });

    // Update trading engine
    tradingEngine.emit('market_data', {
      sessionId,
      symbol,
      data: {
        symbol,
        bid: updatedFeed.bid,
        ask: updatedFeed.ask,
        last: updatedFeed.price,
        change: updatedFeed.price - updatedFeed.open,
        changePercent: ((updatedFeed.price - updatedFeed.open) / updatedFeed.open) * 100,
        volume: updatedFeed.volume,
        high: updatedFeed.high,
        low: updatedFeed.low,
        open: updatedFeed.open,
        timestamp: updatedFeed.timestamp
      }
    });
  }

  /**
   * Inject news event that affects market volatility
   */
  public injectNewsEvent(sessionId: string, newsEvent: Omit<NewsEvent, 'id' | 'timestamp'>): void {
    const event: NewsEvent = {
      ...newsEvent,
      id: `news-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date()
    };

    this.newsEvents.push(event);

    // Apply volatility impact
    if (event.symbol) {
      const currentMultiplier = this.volatilityMultipliers.get(event.symbol) || 1.0;
      let volatilityIncrease = 1.0;

      switch (event.severity) {
        case 'HIGH': volatilityIncrease = 3.0; break;
        case 'MEDIUM': volatilityIncrease = 2.0; break;
        case 'LOW': volatilityIncrease = 1.5; break;
      }

      this.volatilityMultipliers.set(event.symbol, currentMultiplier * volatilityIncrease);

      // Schedule volatility decay
      setTimeout(() => {
        const decayedMultiplier = Math.max(1.0, currentMultiplier * volatilityIncrease * 0.5);
        this.volatilityMultipliers.set(event.symbol!, decayedMultiplier);
      }, event.duration * 1000);

      // Full decay back to normal
      setTimeout(() => {
        this.volatilityMultipliers.set(event.symbol!, 1.0);
      }, event.duration * 2000);
    }

    // Broadcast news event
    this.emit('news_event', {
      sessionId,
      event
    });
  }

  /**
   * Create price shock event
   */
  public createPriceShock(sessionId: string, symbol: string, magnitude: number, direction: 'UP' | 'DOWN'): void {
    const currentFeed = this.feeds.get(symbol);
    if (!currentFeed) return;

    const priceMultiplier = direction === 'UP' ? (1 + magnitude) : (1 - magnitude);
    const newPrice = currentFeed.price * priceMultiplier;

    const shockedFeed: MarketFeed = {
      ...currentFeed,
      price: newPrice,
      bid: newPrice - (currentFeed.ask - currentFeed.bid) / 2,
      ask: newPrice + (currentFeed.ask - currentFeed.bid) / 2,
      high: Math.max(currentFeed.high, newPrice),
      low: Math.min(currentFeed.low, newPrice),
      timestamp: new Date()
    };

    this.feeds.set(symbol, shockedFeed);

    // Increase volatility temporarily
    const currentMultiplier = this.volatilityMultipliers.get(symbol) || 1.0;
    this.volatilityMultipliers.set(symbol, currentMultiplier * 2.0);

    // Decay volatility over time
    setTimeout(() => {
      this.volatilityMultipliers.set(symbol, 1.0);
    }, 30000); // 30 seconds

    this.emit('price_shock', {
      sessionId,
      symbol,
      magnitude,
      direction,
      newPrice
    });
  }

  /**
   * Schedule market events
   */
  public scheduleMarketEvent(event: MarketEvent): void {
    this.marketEvents.push(event);
    
    const delay = event.scheduledTime.getTime() - Date.now();
    if (delay > 0) {
      setTimeout(() => {
        this.executeMarketEvent(event);
      }, delay);
    } else {
      this.executeMarketEvent(event);
    }
  }

  /**
   * Execute a scheduled market event
   */
  private executeMarketEvent(event: MarketEvent): void {
    switch (event.type) {
      case 'NEWS':
        if (event.data.sessionId) {
          this.injectNewsEvent(event.data.sessionId, event.data.news);
        }
        break;
      
      case 'HALT':
        if (event.symbol) {
          this.haltTrading(event.symbol);
        }
        break;
      
      case 'RESUME':
        if (event.symbol) {
          this.resumeTrading(event.symbol);
        }
        break;
    }

    this.emit('market_event_executed', { event });
  }

  /**
   * Halt trading for a symbol
   */
  private haltTrading(symbol: string): void {
    this.emit('trading_halt', { symbol, timestamp: new Date() });
  }

  /**
   * Resume trading for a symbol
   */
  private resumeTrading(symbol: string): void {
    this.emit('trading_resumed', { symbol, timestamp: new Date() });
  }

  /**
   * Get current market data for a symbol
   */
  public getMarketData(symbol: string): MarketFeed | null {
    return this.feeds.get(symbol) || null;
  }

  /**
   * Get all market data
   */
  public getAllMarketData(): MarketFeed[] {
    return Array.from(this.feeds.values());
  }

  /**
   * Get market summary for session
   */
  public getMarketSummary(sessionId: string): any {
    const symbols = this.subscriptions.get(sessionId) || new Set();
    const marketData = Array.from(symbols).map(symbol => this.feeds.get(symbol)).filter(Boolean);
    
    return {
      sessionId,
      symbolCount: symbols.size,
      totalVolume: marketData.reduce((sum, feed) => sum + feed!.volume, 0),
      marketData: marketData.map(feed => ({
        symbol: feed!.symbol,
        price: feed!.price,
        change: feed!.price - feed!.open,
        changePercent: ((feed!.price - feed!.open) / feed!.open) * 100,
        volume: feed!.volume
      })),
      timestamp: new Date()
    };
  }

  /**
   * Reset market data for new session
   */
  public resetMarketData(symbols?: string[]): void {
    const symbolsToReset = symbols || Array.from(this.feeds.keys());
    
    symbolsToReset.forEach(symbol => {
      const currentFeed = this.feeds.get(symbol);
      if (currentFeed) {
        const resetFeed: MarketFeed = {
          ...currentFeed,
          price: currentFeed.open,
          bid: currentFeed.open - (currentFeed.ask - currentFeed.bid) / 2,
          ask: currentFeed.open + (currentFeed.ask - currentFeed.bid) / 2,
          high: currentFeed.open,
          low: currentFeed.open,
          volume: 0,
          timestamp: new Date()
        };
        
        this.feeds.set(symbol, resetFeed);
        this.volatilityMultipliers.set(symbol, 1.0);
      }
    });

    this.emit('market_reset', { symbols: symbolsToReset });
  }
}

// Export singleton instance
export const marketDataService = new MarketDataService();