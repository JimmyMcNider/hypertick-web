/**
 * Market Engine - Real Trading Simulation
 * 
 * Implements order book, price formation, and liquidity traders
 * to replicate the authentic upTick trading experience.
 * Now includes configurable market complexity based on lesson progression.
 */

import { getMarketConfig, MarketConfiguration, validateOrder, isFeatureEnabled } from './market-config';
import { createMarketEfficiencyPattern, type LiquidityPattern, type PatternTradeConfig } from './market-efficiency-patterns';

export interface MarketOrder {
  id: string;
  userId: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  quantity: number;
  price?: number; // undefined for market orders
  type: 'MARKET' | 'LIMIT';
  timestamp: Date;
  status: 'PENDING' | 'PARTIAL' | 'FILLED' | 'CANCELLED';
  filledQuantity: number;
  avgFillPrice?: number;
  isBot?: boolean; // true for liquidity trader orders
}

export interface MarketTrade {
  id: string;
  symbol: string;
  price: number;
  quantity: number;
  buyOrderId: string;
  sellOrderId: string;
  timestamp: Date;
  buyUserId: string;
  sellUserId: string;
}

export interface OrderBookLevel {
  price: number;
  quantity: number;
  orderCount: number;
}

export interface OrderBook {
  symbol: string;
  bids: OrderBookLevel[]; // sorted descending by price
  asks: OrderBookLevel[]; // sorted ascending by price
  lastTrade?: MarketTrade;
  lastPrice?: number;
  volume24h: number;
  timestamp: Date;
}

export interface LiquidityTrader {
  id: string;
  name: string;
  active: boolean;
  tradingDelay: number; // seconds between trades
  lastTradeTime: Date;
  symbols: string[];
  cashBalance: number;
  positions: Record<string, number>; // symbol -> quantity
  strategy: 'MARKET_MAKER' | 'MOMENTUM' | 'MEAN_REVERT';
  
  // Market maker specific
  bidAskSpread?: number; // percentage spread
  maxPosition?: number; // max shares per symbol
  
  // Other strategy parameters
  volatilityThreshold?: number;
  trendSensitivity?: number;
}

export interface MarketData {
  symbol: string;
  currentPrice: number;
  bidPrice?: number;
  askPrice?: number;
  bidSize?: number;
  askSize?: number;
  volume: number;
  change: number;
  changePercent: number;
  high24h: number;
  low24h: number;
  open24h: number;
  timestamp: Date;
}

export class MarketEngine {
  private orderBooks: Map<string, MarketOrder[]> = new Map();
  private trades: Map<string, MarketTrade[]> = new Map();
  private liquidityTraders: Map<string, LiquidityTrader> = new Map();
  private marketData: Map<string, MarketData> = new Map();
  private nextOrderId = 1;
  private nextTradeId = 1;
  
  // Market configuration and state
  private config: MarketConfiguration;
  private symbols: string[] = [];
  private isPaused = false;
  private liquidityTradingInterval?: NodeJS.Timeout;

  // Market Efficiency lesson specific
  private marketEfficiencyPattern?: ReturnType<typeof createMarketEfficiencyPattern>;
  private currentTick = 0;
  
  constructor(lessonId: string = 'Price Formation') {
    this.config = getMarketConfig(lessonId);
    this.initializeMarket();
    this.startLiquidityTraders();
  }
  
  /**
   * Initialize market based on lesson configuration
   */
  private initializeMarket() {
    // Extract enabled securities from configuration
    this.symbols = this.config.securities
      .filter(security => security.enabled)
      .map(security => security.symbol);
    
    console.log(`🏫 Initializing market for lesson: ${this.config.lessonName}`);
    console.log(`📊 Complexity: ${this.config.complexity}`);
    console.log(`🎯 Securities: ${this.symbols.join(', ')}`);
    
    this.symbols.forEach(symbol => {
      this.orderBooks.set(symbol, []);
      this.trades.set(symbol, []);
      
      // Get security configuration
      const securityConfig = this.config.securities.find(s => s.symbol === symbol);
      const startPrice = securityConfig?.startingPrice || 50.00;
      
      // Initialize market data
      this.marketData.set(symbol, {
        symbol,
        currentPrice: startPrice,
        volume: 0,
        change: 0,
        changePercent: 0,
        high24h: startPrice,
        low24h: startPrice,
        open24h: startPrice,
        timestamp: new Date()
      });
      
      console.log(`💰 ${symbol}: Starting at $${startPrice.toFixed(2)}`);
    });
    
    // Create liquidity traders based on configuration
    this.createConfiguredLiquidityTraders();
  }
  
  /**
   * Create liquidity traders based on lesson configuration
   */
  private createConfiguredLiquidityTraders() {
    if (!this.config.liquidity.enabled) {
      console.log(`🤖 Liquidity traders disabled for ${this.config.complexity} lesson`);
      return;
    }
    
    console.log(`🤖 Creating liquidity traders for ${this.config.complexity} lesson`);
    console.log(`📈 Strategies: ${this.config.liquidity.strategies.join(', ')}`);
    console.log(`⏱️ Trading delay: ${this.config.liquidity.delay} seconds`);
    
    // Create market maker if strategy is enabled
    if (this.config.liquidity.strategies.includes('MARKET_MAKER')) {
      this.liquidityTraders.set('mm1', {
        id: 'mm1',
        name: 'Market Maker 1',
        active: true,
        tradingDelay: this.config.liquidity.delay,
        lastTradeTime: new Date(0),
        symbols: this.symbols,
        cashBalance: 1000000,
        positions: {},
        strategy: 'MARKET_MAKER',
        bidAskSpread: this.config.liquidity.spreads.normal,
        maxPosition: 1000
      });
    }
    
    // Create momentum trader if strategy is enabled
    if (this.config.liquidity.strategies.includes('MOMENTUM')) {
      this.liquidityTraders.set('mom1', {
        id: 'mom1', 
        name: 'Momentum Trader',
        active: true,
        tradingDelay: this.config.liquidity.delay + 4, // Slightly slower
        lastTradeTime: new Date(0),
        symbols: this.symbols,
        cashBalance: 500000,
        positions: {},
        strategy: 'MOMENTUM',
        volatilityThreshold: 0.05,
        trendSensitivity: 0.03
      });
    }
    
    // Create mean reversion trader if strategy is enabled
    if (this.config.liquidity.strategies.includes('MEAN_REVERT')) {
      this.liquidityTraders.set('mean1', {
        id: 'mean1',
        name: 'Mean Reversion Trader',
        active: true,
        tradingDelay: this.config.liquidity.delay + 2,
        lastTradeTime: new Date(0),
        symbols: this.symbols,
        cashBalance: 750000,
        positions: {},
        strategy: 'MEAN_REVERT',
        volatilityThreshold: 0.03,
        trendSensitivity: 0.02
      });
    }
  }
  
  /**
   * Start automated liquidity trading
   */
  private startLiquidityTraders() {
    if (this.liquidityTradingInterval) {
      clearInterval(this.liquidityTradingInterval);
    }
    
    this.liquidityTradingInterval = setInterval(() => {
      if (this.isPaused) return; // Respect market pause
      
      this.liquidityTraders.forEach(trader => {
        if (this.shouldTraderAct(trader)) {
          this.executeLiquidityTrade(trader);
        }
      });
    }, 1000); // Check every second
  }
  
  /**
   * Check if liquidity trader should make a trade
   */
  private shouldTraderAct(trader: LiquidityTrader): boolean {
    if (!trader.active) return false;
    
    const timeSinceLastTrade = (Date.now() - trader.lastTradeTime.getTime()) / 1000;
    return timeSinceLastTrade >= trader.tradingDelay;
  }
  
  /**
   * Execute liquidity trader strategy
   */
  private executeLiquidityTrade(trader: LiquidityTrader) {
    trader.symbols.forEach(symbol => {
      const marketData = this.marketData.get(symbol);
      if (!marketData) return;
      
      if (trader.strategy === 'MARKET_MAKER') {
        this.executeMarketMakerStrategy(trader, symbol, marketData);
      } else if (trader.strategy === 'MOMENTUM') {
        this.executeMomentumStrategy(trader, symbol, marketData);
      }
    });
    
    trader.lastTradeTime = new Date();
  }
  
  /**
   * Market maker strategy - post bid/ask orders
   */
  private executeMarketMakerStrategy(trader: LiquidityTrader, symbol: string, marketData: MarketData) {
    const currentPrice = marketData.currentPrice;
    const spread = trader.bidAskSpread || 0.02;
    const position = trader.positions[symbol] || 0;
    const maxPos = trader.maxPosition || 1000;
    
    // Cancel existing orders for this trader
    this.cancelOrdersByUser(trader.id, symbol);
    
    // Post new bid/ask if within position limits
    const bidPrice = currentPrice * (1 - spread / 2);
    const askPrice = currentPrice * (1 + spread / 2);
    const orderSize = Math.min(100, maxPos - Math.abs(position));
    
    if (orderSize > 0) {
      // Post bid order if not too long
      if (position < maxPos) {
        this.placeOrder({
          userId: trader.id,
          symbol,
          side: 'BUY',
          quantity: orderSize,
          price: Math.round(bidPrice * 100) / 100,
          type: 'LIMIT',
          isBot: true
        });
      }
      
      // Post ask order if not too short
      if (position > -maxPos) {
        this.placeOrder({
          userId: trader.id,
          symbol,
          side: 'SELL', 
          quantity: orderSize,
          price: Math.round(askPrice * 100) / 100,
          type: 'LIMIT',
          isBot: true
        });
      }
    }
  }
  
  /**
   * Momentum strategy - trade in direction of recent moves
   */
  private executeMomentumStrategy(trader: LiquidityTrader, symbol: string, marketData: MarketData) {
    const changePercent = marketData.changePercent;
    const threshold = trader.volatilityThreshold || 0.05;
    
    if (Math.abs(changePercent) > threshold) {
      const side = changePercent > 0 ? 'BUY' : 'SELL';
      const quantity = 50 + Math.floor(Math.random() * 100);
      
      // Place market order in trend direction
      this.placeOrder({
        userId: trader.id,
        symbol,
        side,
        quantity,
        type: 'MARKET',
        isBot: true
      });
    }
  }
  
  /**
   * Place order in the market with configuration validation
   */
  public placeOrder(params: {
    userId: string;
    symbol: string;
    side: 'BUY' | 'SELL';
    quantity: number;
    price?: number;
    type: 'MARKET' | 'LIMIT';
    isBot?: boolean;
  }): MarketOrder {
    
    // Skip validation for bots
    if (!params.isBot) {
      // Validate order against market configuration
      const marketData = this.marketData.get(params.symbol);
      const estimatedValue = (params.price || marketData?.currentPrice || 50) * params.quantity;
      
      const validation = validateOrder(this.config, {
        type: params.type,
        quantity: params.quantity,
        value: estimatedValue,
        symbol: params.symbol
      });
      
      if (!validation.valid) {
        console.log(`❌ Order rejected: ${validation.reason}`);
        throw new Error(validation.reason);
      }
      
      // Check if order type is enabled
      if (params.type === 'LIMIT' && !this.config.orderTypes.limit) {
        console.log(`❌ Limit orders not enabled in ${this.config.complexity} lesson`);
        throw new Error('Limit orders not available in this lesson');
      }
    }
    const order: MarketOrder = {
      id: `order_${this.nextOrderId++}`,
      userId: params.userId,
      symbol: params.symbol,
      side: params.side,
      quantity: params.quantity,
      price: params.price,
      type: params.type,
      timestamp: new Date(),
      status: 'PENDING',
      filledQuantity: 0,
      isBot: params.isBot || false
    };
    
    // Add to order book
    const orderBook = this.orderBooks.get(params.symbol) || [];
    orderBook.push(order);
    this.orderBooks.set(params.symbol, orderBook);
    
    // Try to match immediately
    this.matchOrders(params.symbol);
    
    console.log(`📋 Order placed: ${order.side} ${order.quantity} ${order.symbol} ${order.type === 'LIMIT' ? `@ $${order.price}` : 'MARKET'} by ${order.isBot ? 'BOT' : 'USER'} ${order.userId}`);
    
    return order;
  }
  
  /**
   * Match orders and create trades
   */
  private matchOrders(symbol: string) {
    const orders = this.orderBooks.get(symbol) || [];
    const activeOrders = orders.filter(o => o.status === 'PENDING');
    
    // Sort buy orders by price descending (highest first)
    const buyOrders = activeOrders
      .filter(o => o.side === 'BUY')
      .sort((a, b) => {
        if (a.type === 'MARKET' && b.type !== 'MARKET') return -1;
        if (b.type === 'MARKET' && a.type !== 'MARKET') return 1;
        if (a.type === 'MARKET' && b.type === 'MARKET') return a.timestamp.getTime() - b.timestamp.getTime();
        return (b.price || 0) - (a.price || 0);
      });
    
    // Sort sell orders by price ascending (lowest first)  
    const sellOrders = activeOrders
      .filter(o => o.side === 'SELL')
      .sort((a, b) => {
        if (a.type === 'MARKET' && b.type !== 'MARKET') return -1;
        if (b.type === 'MARKET' && a.type !== 'MARKET') return 1;
        if (a.type === 'MARKET' && b.type === 'MARKET') return a.timestamp.getTime() - b.timestamp.getTime();
        return (a.price || Infinity) - (b.price || Infinity);
      });
    
    // Match orders
    for (const buyOrder of buyOrders) {
      for (const sellOrder of sellOrders) {
        if (this.canMatch(buyOrder, sellOrder)) {
          this.executeTrade(buyOrder, sellOrder);
          break; // Move to next buy order
        }
      }
    }
  }
  
  /**
   * Check if two orders can be matched
   */
  private canMatch(buyOrder: MarketOrder, sellOrder: MarketOrder): boolean {
    if (buyOrder.status !== 'PENDING' || sellOrder.status !== 'PENDING') return false;
    if (buyOrder.filledQuantity >= buyOrder.quantity || sellOrder.filledQuantity >= sellOrder.quantity) return false;
    
    // Market orders always match
    if (buyOrder.type === 'MARKET' || sellOrder.type === 'MARKET') return true;
    
    // Limit orders match if buy price >= sell price
    return (buyOrder.price || 0) >= (sellOrder.price || 0);
  }
  
  /**
   * Execute trade between two orders
   */
  private executeTrade(buyOrder: MarketOrder, sellOrder: MarketOrder) {
    const buyQuantityRemaining = buyOrder.quantity - buyOrder.filledQuantity;
    const sellQuantityRemaining = sellOrder.quantity - sellOrder.filledQuantity;
    const tradeQuantity = Math.min(buyQuantityRemaining, sellQuantityRemaining);
    
    // Determine trade price (seller's price for limit orders, current market for market orders)
    let tradePrice: number;
    if (sellOrder.type === 'LIMIT' && sellOrder.price) {
      tradePrice = sellOrder.price;
    } else if (buyOrder.type === 'LIMIT' && buyOrder.price) {
      tradePrice = buyOrder.price;
    } else {
      // Use current market price for market orders
      const marketData = this.marketData.get(buyOrder.symbol);
      tradePrice = marketData?.currentPrice || 50.00;
    }
    
    // Create trade record
    const trade: MarketTrade = {
      id: `trade_${this.nextTradeId++}`,
      symbol: buyOrder.symbol,
      price: tradePrice,
      quantity: tradeQuantity,
      buyOrderId: buyOrder.id,
      sellOrderId: sellOrder.id,
      buyUserId: buyOrder.userId,
      sellUserId: sellOrder.userId,
      timestamp: new Date()
    };
    
    // Update order fill quantities
    buyOrder.filledQuantity += tradeQuantity;
    sellOrder.filledQuantity += tradeQuantity;
    
    // Update order statuses
    if (buyOrder.filledQuantity >= buyOrder.quantity) {
      buyOrder.status = 'FILLED';
      buyOrder.avgFillPrice = this.calculateAvgFillPrice(buyOrder);
    } else {
      buyOrder.status = 'PARTIAL';
    }
    
    if (sellOrder.filledQuantity >= sellOrder.quantity) {
      sellOrder.status = 'FILLED';
      sellOrder.avgFillPrice = this.calculateAvgFillPrice(sellOrder);
    } else {
      sellOrder.status = 'PARTIAL';
    }
    
    // Store trade
    const trades = this.trades.get(buyOrder.symbol) || [];
    trades.push(trade);
    this.trades.set(buyOrder.symbol, trades);
    
    // Update market data
    this.updateMarketData(buyOrder.symbol, tradePrice, tradeQuantity);
    
    // Update liquidity trader positions
    this.updateTraderPosition(buyOrder.userId, buyOrder.symbol, tradeQuantity, tradePrice, 'BUY');
    this.updateTraderPosition(sellOrder.userId, sellOrder.symbol, tradeQuantity, tradePrice, 'SELL');
    
    console.log(`💰 TRADE: ${tradeQuantity} ${buyOrder.symbol} @ $${tradePrice} (${buyOrder.isBot ? 'BOT' : 'USER'} ${buyOrder.userId} -> ${sellOrder.isBot ? 'BOT' : 'USER'} ${sellOrder.userId})`);
  }
  
  /**
   * Calculate average fill price for partially filled orders
   */
  private calculateAvgFillPrice(order: MarketOrder): number {
    const trades = Array.from(this.trades.values()).flat()
      .filter(t => t.buyOrderId === order.id || t.sellOrderId === order.id);
    
    if (trades.length === 0) return order.price || 0;
    
    const totalValue = trades.reduce((sum, t) => sum + (t.price * t.quantity), 0);
    const totalQuantity = trades.reduce((sum, t) => sum + t.quantity, 0);
    
    return totalQuantity > 0 ? totalValue / totalQuantity : (order.price || 0);
  }
  
  /**
   * Update market data after trade
   */
  private updateMarketData(symbol: string, price: number, quantity: number) {
    const data = this.marketData.get(symbol);
    if (!data) return;
    
    const prevPrice = data.currentPrice;
    data.currentPrice = price;
    data.volume += quantity;
    data.change = price - data.open24h;
    data.changePercent = data.open24h > 0 ? (data.change / data.open24h) * 100 : 0;
    data.high24h = Math.max(data.high24h, price);
    data.low24h = Math.min(data.low24h, price);
    data.timestamp = new Date();
    
    // Update bid/ask from order book
    const orderBook = this.generateOrderBook(symbol);
    if (orderBook.bids.length > 0) {
      data.bidPrice = orderBook.bids[0].price;
      data.bidSize = orderBook.bids[0].quantity;
    }
    if (orderBook.asks.length > 0) {
      data.askPrice = orderBook.asks[0].price;
      data.askSize = orderBook.asks[0].quantity;
    }
  }
  
  /**
   * Update liquidity trader positions
   */
  private updateTraderPosition(userId: string, symbol: string, quantity: number, price: number, side: 'BUY' | 'SELL') {
    const trader = this.liquidityTraders.get(userId);
    if (!trader) return;
    
    const positionChange = side === 'BUY' ? quantity : -quantity;
    const cashChange = side === 'BUY' ? -quantity * price : quantity * price;
    
    trader.positions[symbol] = (trader.positions[symbol] || 0) + positionChange;
    trader.cashBalance += cashChange;
  }
  
  /**
   * Cancel orders by user ID and symbol
   */
  private cancelOrdersByUser(userId: string, symbol?: string) {
    this.orderBooks.forEach((orders, sym) => {
      if (symbol && sym !== symbol) return;
      
      orders.forEach(order => {
        if (order.userId === userId && order.status === 'PENDING') {
          order.status = 'CANCELLED';
        }
      });
    });
  }
  
  /**
   * Generate current order book for a symbol
   */
  public generateOrderBook(symbol: string): OrderBook {
    const orders = this.orderBooks.get(symbol) || [];
    const activeOrders = orders.filter(o => o.status === 'PENDING' && o.type === 'LIMIT');
    
    // Aggregate bids by price level
    const bidMap = new Map<number, { quantity: number; orderCount: number }>();
    const askMap = new Map<number, { quantity: number; orderCount: number }>();
    
    activeOrders.forEach(order => {
      if (!order.price) return;
      
      const map = order.side === 'BUY' ? bidMap : askMap;
      const existing = map.get(order.price) || { quantity: 0, orderCount: 0 };
      existing.quantity += (order.quantity - order.filledQuantity);
      existing.orderCount += 1;
      map.set(order.price, existing);
    });
    
    // Convert to sorted arrays
    const bids: OrderBookLevel[] = Array.from(bidMap.entries())
      .map(([price, data]) => ({ price, quantity: data.quantity, orderCount: data.orderCount }))
      .sort((a, b) => b.price - a.price); // Descending
      
    const asks: OrderBookLevel[] = Array.from(askMap.entries())
      .map(([price, data]) => ({ price, quantity: data.quantity, orderCount: data.orderCount }))
      .sort((a, b) => a.price - b.price); // Ascending
    
    const recentTrades = this.trades.get(symbol) || [];
    const lastTrade = recentTrades[recentTrades.length - 1];
    const marketData = this.marketData.get(symbol);
    
    return {
      symbol,
      bids,
      asks,
      lastTrade,
      lastPrice: lastTrade?.price || marketData?.currentPrice,
      volume24h: marketData?.volume || 0,
      timestamp: new Date()
    };
  }
  
  /**
   * Get market data for symbol
   */
  public getMarketData(symbol: string): MarketData | undefined {
    return this.marketData.get(symbol);
  }
  
  /**
   * Get all market data
   */
  public getAllMarketData(): MarketData[] {
    return Array.from(this.marketData.values());
  }
  
  /**
   * Get recent trades for symbol
   */
  public getRecentTrades(symbol: string, limit: number = 50): MarketTrade[] {
    const trades = this.trades.get(symbol) || [];
    return trades.slice(-limit).reverse(); // Most recent first
  }
  
  /**
   * Get user's orders
   */
  public getUserOrders(userId: string, symbol?: string): MarketOrder[] {
    const allOrders: MarketOrder[] = [];
    
    this.orderBooks.forEach((orders, sym) => {
      if (symbol && sym !== symbol) return;
      
      const userOrders = orders.filter(o => o.userId === userId);
      allOrders.push(...userOrders);
    });
    
    return allOrders.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }
  
  /**
   * Get liquidity trader status (for instructor monitoring)
   */
  public getLiquidityTraders(): LiquidityTrader[] {
    return Array.from(this.liquidityTraders.values());
  }
  
  /**
   * Control liquidity trader (from XML commands)
   */
  public setLiquidityTrader(traderId: string, setting: 'Active' | 'Delay', value: boolean | number) {
    const trader = this.liquidityTraders.get(traderId);
    if (!trader) return;
    
    if (setting === 'Active' && typeof value === 'boolean') {
      trader.active = value;
      console.log(`🤖 Liquidity trader ${traderId} ${value ? 'ACTIVATED' : 'DEACTIVATED'}`);
    } else if (setting === 'Delay' && typeof value === 'number') {
      trader.tradingDelay = value;
      console.log(`🤖 Liquidity trader ${traderId} delay set to ${value} seconds`);
    }
  }
  
  /**
   * Get trading symbols
   */
  public getSymbols(): string[] {
    return [...this.symbols];
  }
  
  /**
   * Get current market configuration
   */
  public getConfiguration(): MarketConfiguration {
    return { ...this.config };
  }
  
  /**
   * Update market configuration (instructor control)
   */
  public updateConfiguration(newConfig: Partial<MarketConfiguration>): void {
    if (!this.config.instructorControls.scenarioControl) {
      throw new Error('Instructor does not have scenario control privileges');
    }
    
    this.config = { ...this.config, ...newConfig };
    console.log(`🎛️ Market configuration updated by instructor`);
    
    // Reinitialize if securities changed
    if (newConfig.securities) {
      this.initializeMarket();
    }
    
    // Update liquidity traders if settings changed
    if (newConfig.liquidity) {
      this.createConfiguredLiquidityTraders();
    }
  }
  
  /**
   * Pause/Resume market trading (instructor control)
   */
  public pauseMarket(): void {
    if (!this.config.instructorControls.canPauseMarket) {
      throw new Error('Instructor cannot pause market in this lesson');
    }
    
    this.isPaused = true;
    console.log(`⏸️ Market paused by instructor`);
  }
  
  public resumeMarket(): void {
    if (!this.config.instructorControls.canPauseMarket) {
      throw new Error('Instructor cannot resume market in this lesson');
    }
    
    this.isPaused = false;
    console.log(`▶️ Market resumed by instructor`);
  }
  
  /**
   * Adjust market volatility (instructor control)
   */
  public adjustVolatility(symbol: string, newVolatility: number): void {
    if (!this.config.instructorControls.canAdjustVolatility) {
      throw new Error('Instructor cannot adjust volatility in this lesson');
    }
    
    const security = this.config.securities.find(s => s.symbol === symbol);
    if (security) {
      security.volatility = Math.max(0.001, Math.min(0.5, newVolatility)); // Clamp between 0.1% and 50%
      console.log(`📊 ${symbol} volatility adjusted to ${(security.volatility * 100).toFixed(1)}%`);
    }
  }
  
  /**
   * Trigger market event (instructor control)
   */
  public triggerMarketEvent(event: {
    type: 'NEWS' | 'VOLATILITY_SPIKE' | 'LIQUIDITY_CHANGE';
    symbol?: string;
    impact: number; // -1 to 1
    duration?: number; // seconds
  }): void {
    if (!this.config.instructorControls.canTriggerEvents) {
      throw new Error('Instructor cannot trigger events in this lesson');
    }
    
    console.log(`📢 Market event triggered: ${event.type} (impact: ${event.impact})`);
    
    switch (event.type) {
      case 'NEWS':
        this.triggerNewsEvent(event.symbol, event.impact);
        break;
      case 'VOLATILITY_SPIKE':
        this.triggerVolatilitySpike(event.symbol, event.impact, event.duration || 30);
        break;
      case 'LIQUIDITY_CHANGE':
        this.adjustLiquidityIntensity(event.impact);
        break;
    }
  }
  
  /**
   * Private methods for market events
   */
  private triggerNewsEvent(symbol?: string, impact: number = 0): void {
    const symbols = symbol ? [symbol] : this.symbols;
    
    symbols.forEach(sym => {
      const marketData = this.marketData.get(sym);
      if (marketData) {
        // Adjust price by impact percentage
        const priceChange = marketData.currentPrice * impact * 0.1; // Max 10% impact
        marketData.currentPrice = Math.max(0.01, marketData.currentPrice + priceChange);
        marketData.high24h = Math.max(marketData.high24h, marketData.currentPrice);
        marketData.low24h = Math.min(marketData.low24h, marketData.currentPrice);
        marketData.change = marketData.currentPrice - marketData.open24h;
        marketData.changePercent = (marketData.change / marketData.open24h) * 100;
        
        console.log(`📰 News impact on ${sym}: ${impact > 0 ? '+' : ''}${(impact * 10).toFixed(1)}% → $${marketData.currentPrice.toFixed(2)}`);
      }
    });
  }
  
  private triggerVolatilitySpike(symbol?: string, intensity: number = 1, duration: number = 30): void {
    const symbols = symbol ? [symbol] : this.symbols;
    
    symbols.forEach(sym => {
      const security = this.config.securities.find(s => s.symbol === sym);
      if (security) {
        const originalVolatility = security.volatility;
        security.volatility = Math.min(0.5, security.volatility * (1 + Math.abs(intensity) * 2));
        
        console.log(`💥 Volatility spike for ${sym}: ${(originalVolatility * 100).toFixed(1)}% → ${(security.volatility * 100).toFixed(1)}%`);
        
        // Revert after duration
        setTimeout(() => {
          if (security) {
            security.volatility = originalVolatility;
            console.log(`📉 ${sym} volatility returned to normal: ${(originalVolatility * 100).toFixed(1)}%`);
          }
        }, duration * 1000);
      }
    });
  }
  
  private adjustLiquidityIntensity(change: number): void {
    this.config.liquidity.intensity = Math.max(0.1, Math.min(1.0, this.config.liquidity.intensity + change));
    console.log(`💧 Liquidity intensity adjusted to ${(this.config.liquidity.intensity * 100).toFixed(0)}%`);
  }
  
  /**
   * Initialize Market Efficiency lesson pattern
   */
  public initializeMarketEfficiencyPattern(scenario: string, initialPrice: number = 95.00): void {
    console.log(`🎯 Initializing Market Efficiency pattern for ${scenario}`);
    this.marketEfficiencyPattern = createMarketEfficiencyPattern(scenario);
    this.currentTick = 0;

    // Set initial price for bond
    const bondSymbol = this.symbols.find(s => s.includes('BOND')) || this.symbols[0];
    const marketData = this.marketData.get(bondSymbol);
    if (marketData) {
      marketData.currentPrice = initialPrice;
      marketData.open24h = initialPrice;
      marketData.low24h = initialPrice;
      marketData.high24h = initialPrice;
    }
  }

  /**
   * Advance tick and execute Market Efficiency pattern trade
   */
  public advanceTick(): void {
    if (!this.marketEfficiencyPattern) {
      console.warn('No Market Efficiency pattern initialized');
      return;
    }

    this.currentTick++;
    const bondSymbol = this.symbols.find(s => s.includes('BOND')) || this.symbols[0];
    const marketData = this.marketData.get(bondSymbol);

    if (!marketData) {
      console.warn(`Market data not found for ${bondSymbol}`);
      return;
    }

    // Get pattern trade for this tick
    let patternTrade: PatternTradeConfig | null = null;

    // Different patterns use different methods
    if ('getTradeForTick' in this.marketEfficiencyPattern) {
      if (this.marketEfficiencyPattern.constructor.name === 'SawtoothPattern') {
        patternTrade = (this.marketEfficiencyPattern as any).getTradeForTick(this.currentTick);
      } else {
        // Momentum or DeepMomentum pattern
        patternTrade = (this.marketEfficiencyPattern as any).getTradeForTick(this.currentTick, marketData.currentPrice);
      }
    }

    // Execute pattern trade
    if (patternTrade) {
      const price = patternTrade.priceOffset !== undefined
        ? marketData.currentPrice + (patternTrade.priceOffset / 100)
        : undefined;

      this.placeOrder({
        userId: 'liquidity_market_efficiency',
        symbol: bondSymbol,
        side: patternTrade.side,
        quantity: patternTrade.quantity,
        price,
        type: price ? 'LIMIT' : 'MARKET',
        isBot: true
      });

      console.log(`📊 Tick ${this.currentTick}: ${patternTrade.side} ${patternTrade.quantity} @ ${price ? `$${price.toFixed(2)}` : 'MKT'}`);
    }
  }

  /**
   * Get current tick (for Market Efficiency lessons)
   */
  public getCurrentTick(): number {
    return this.currentTick;
  }

  /**
   * Reset Market Efficiency pattern
   */
  public resetMarketEfficiencyPattern(): void {
    if (this.marketEfficiencyPattern && 'reset' in this.marketEfficiencyPattern) {
      (this.marketEfficiencyPattern as any).reset();
      this.currentTick = 0;
      console.log('🔄 Market Efficiency pattern reset');
    }
  }

  /**
   * Get market status for instructor monitoring
   */
  public getMarketStatus(): {
    isPaused: boolean;
    configuration: MarketConfiguration;
    activeOrders: number;
    activeTrades: number;
    liquidityTraders: LiquidityTrader[];
  } {
    const totalOrders = Array.from(this.orderBooks.values())
      .reduce((sum, orders) => sum + orders.filter(o => o.status === 'PENDING').length, 0);
    
    const totalTrades = Array.from(this.trades.values())
      .reduce((sum, trades) => sum + trades.length, 0);
    
    return {
      isPaused: this.isPaused,
      configuration: this.config,
      activeOrders: totalOrders,
      activeTrades: totalTrades,
      liquidityTraders: Array.from(this.liquidityTraders.values())
    };
  }
}

// Global market engine instance
let globalMarketEngine: MarketEngine | null = null;

export function getMarketEngine(lessonId?: string): MarketEngine {
  if (!globalMarketEngine || (lessonId && globalMarketEngine.getConfiguration().lessonId !== lessonId)) {
    if (globalMarketEngine) {
      console.log(`🔄 Switching market engine to lesson: ${lessonId}`);
    }
    globalMarketEngine = new MarketEngine(lessonId);
  }
  return globalMarketEngine;
}

export function resetMarketEngine(): void {
  if (globalMarketEngine) {
    console.log(`🗑️ Resetting market engine`);
    globalMarketEngine = null;
  }
}