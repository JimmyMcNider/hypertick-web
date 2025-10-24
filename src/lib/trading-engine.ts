/**
 * Trading Engine - Core Trading Simulation System
 * 
 * Handles order execution, market simulation, portfolio management,
 * and real-time trading data for educational trading sessions.
 */

import { EventEmitter } from 'events';
import { prisma } from './prisma';
import { positionService } from './position-service';

export interface Order {
  id: string;
  sessionUserId: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  type: 'MARKET' | 'LIMIT' | 'STOP';
  quantity: number;
  price?: number;
  timeInForce: 'DAY' | 'IOC' | 'GTC';
  status: 'PENDING' | 'FILLED' | 'PARTIALLY_FILLED' | 'CANCELLED' | 'REJECTED';
  filledQuantity: number;
  filledPrice?: number;
  timestamp: Date;
  filledAt?: Date;
}

export interface Position {
  userId: string;
  symbol: string;
  quantity: number;
  avgPrice: number;
  marketValue: number;
  unrealizedPnL: number;
  realizedPnL: number;
}

export interface MarketData {
  symbol: string;
  bid: number;
  ask: number;
  last: number;
  change: number;
  changePercent: number;
  volume: number;
  high: number;
  low: number;
  open: number;
  timestamp: Date;
}

export interface Trade {
  id: string;
  orderId: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  timestamp: Date;
  buyerId?: string;
  sellerId?: string;
}

export interface OrderBook {
  symbol: string;
  bids: Array<{ price: number; size: number; orders: number }>;
  asks: Array<{ price: number; size: number; orders: number }>;
  spread: number;
  timestamp: Date;
}

export class TradingEngine extends EventEmitter {
  private activeOrders: Map<string, Order> = new Map();
  private marketData: Map<string, MarketData> = new Map();
  private orderBooks: Map<string, OrderBook> = new Map();
  private positions: Map<string, Map<string, Position>> = new Map(); // userId -> symbol -> position
  private sessionMarkets: Map<string, Set<string>> = new Map(); // sessionId -> symbols
  private marketIntervals: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    super();
    this.initializeMarketData();
  }

  /**
   * Initialize market data for common symbols
   */
  private initializeMarketData(): void {
    const symbols = [
      { symbol: 'AOE', price: 50.00, volatility: 0.02 },
      { symbol: 'BOND1', price: 99.30, volatility: 0.005 },
      { symbol: 'BOND2', price: 102.80, volatility: 0.005 },
      { symbol: 'BOND3', price: 95.50, volatility: 0.005 },
      { symbol: 'SPX', price: 4150.00, volatility: 0.015 }
    ];

    symbols.forEach(({ symbol, price, volatility }) => {
      const marketData: MarketData = {
        symbol,
        bid: price - 0.05,
        ask: price + 0.05,
        last: price,
        change: 0,
        changePercent: 0,
        volume: Math.floor(Math.random() * 100000),
        high: price * 1.02,
        low: price * 0.98,
        open: price,
        timestamp: new Date()
      };

      this.marketData.set(symbol, marketData);
      
      // Initialize order book
      this.orderBooks.set(symbol, {
        symbol,
        bids: this.generateOrderBookSide(price - 0.05, 'bid'),
        asks: this.generateOrderBookSide(price + 0.05, 'ask'),
        spread: 0.10,
        timestamp: new Date()
      });
    });
  }

  /**
   * Generate realistic order book levels
   */
  private generateOrderBookSide(basePrice: number, side: 'bid' | 'ask'): Array<{ price: number; size: number; orders: number }> {
    const levels: Array<{ price: number; size: number; orders: number }> = [];
    const direction = side === 'bid' ? -1 : 1;
    
    for (let i = 0; i < 5; i++) {
      const priceLevel = basePrice + (direction * i * 0.05);
      levels.push({
        price: Math.round(priceLevel * 100) / 100,
        size: Math.floor(Math.random() * 2000) + 500,
        orders: Math.floor(Math.random() * 10) + 3
      });
    }
    
    return levels;
  }

  /**
   * Start market simulation for a session
   */
  public startMarketSimulation(sessionId: string, symbols: string[] = ['AOE', 'BOND1', 'BOND2']): void {
    this.sessionMarkets.set(sessionId, new Set(symbols));
    
    // Start price simulation
    const interval = setInterval(() => {
      symbols.forEach(symbol => {
        this.simulateMarketMovement(sessionId, symbol);
      });
    }, 1000); // Update every second

    this.marketIntervals.set(sessionId, interval);
    
    this.emit('market_opened', { sessionId, symbols });
  }

  /**
   * Stop market simulation for a session
   */
  public stopMarketSimulation(sessionId: string): void {
    const interval = this.marketIntervals.get(sessionId);
    if (interval) {
      clearInterval(interval);
      this.marketIntervals.delete(sessionId);
    }

    const symbols = Array.from(this.sessionMarkets.get(sessionId) || []);
    this.sessionMarkets.delete(sessionId);
    
    this.emit('market_closed', { sessionId, symbols });
  }

  /**
   * Simulate realistic market price movements
   */
  private simulateMarketMovement(sessionId: string, symbol: string): void {
    const currentData = this.marketData.get(symbol);
    if (!currentData) return;

    // Brownian motion with mean reversion
    const volatility = symbol.startsWith('BOND') ? 0.002 : 0.01;
    const meanReversion = 0.001;
    const randomWalk = (Math.random() - 0.5) * volatility;
    const meanReversionComponent = -meanReversion * (currentData.last - currentData.open);
    
    const priceChange = randomWalk + meanReversionComponent;
    const newLast = Math.max(0.01, currentData.last + priceChange);
    
    const updatedData: MarketData = {
      ...currentData,
      bid: newLast - 0.05,
      ask: newLast + 0.05,
      last: newLast,
      change: newLast - currentData.open,
      changePercent: ((newLast - currentData.open) / currentData.open) * 100,
      volume: currentData.volume + Math.floor(Math.random() * 100),
      high: Math.max(currentData.high, newLast),
      low: Math.min(currentData.low, newLast),
      timestamp: new Date()
    };

    this.marketData.set(symbol, updatedData);
    
    // Update position service with new price
    positionService.updateMarketPrice(symbol, newLast);
    
    // Update order book
    this.updateOrderBook(symbol, newLast);
    
    // Emit market data update
    this.emit('market_data', { sessionId, symbol, data: updatedData });
    
    // Process any triggered orders
    this.processTriggeredOrders(symbol, newLast);
  }

  /**
   * Update order book based on new price
   */
  private updateOrderBook(symbol: string, newPrice: number): void {
    const orderBook = this.orderBooks.get(symbol);
    if (!orderBook) return;

    const updatedOrderBook: OrderBook = {
      ...orderBook,
      bids: this.generateOrderBookSide(newPrice - 0.05, 'bid'),
      asks: this.generateOrderBookSide(newPrice + 0.05, 'ask'),
      spread: 0.10,
      timestamp: new Date()
    };

    this.orderBooks.set(symbol, updatedOrderBook);
    this.emit('order_book_update', { symbol, orderBook: updatedOrderBook });
  }

  /**
   * Place a new order
   */
  public async placeOrder(sessionId: string, userId: string, orderData: {
    symbol: string;
    side: 'BUY' | 'SELL';
    type: 'MARKET' | 'LIMIT' | 'STOP';
    quantity: number;
    price?: number;
    timeInForce?: 'DAY' | 'IOC' | 'GTC';
  }): Promise<{ success: boolean; orderId?: string; error?: string }> {
    
    try {
      // Get session user
      const sessionUser = await prisma.sessionUser.findFirst({
        where: {
          userId,
          session: { 
            id: sessionId,
            status: 'IN_PROGRESS' 
          }
        }
      });

      if (!sessionUser) {
        return { success: false, error: 'User not in active session' };
      }

      // Validate order
      const validation = this.validateOrder(orderData);
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }

      // Create order in database
      const dbOrder = await prisma.order.create({
        data: {
          sessionId: sessionId,
          userId: userId,
          securityId: 'sec_' + orderData.symbol, // Generate security ID from symbol
          side: orderData.side,
          type: orderData.type,
          quantity: orderData.quantity,
          price: orderData.price,
          timeInForce: orderData.timeInForce || 'DAY',
          status: 'PENDING'
        }
      });

      // Create internal order object
      const order: Order = {
        id: dbOrder.id,
        sessionUserId: sessionUser.id,
        symbol: orderData.symbol,
        side: orderData.side,
        type: orderData.type,
        quantity: orderData.quantity,
        price: orderData.price,
        timeInForce: orderData.timeInForce || 'DAY',
        status: 'PENDING',
        filledQuantity: 0,
        timestamp: new Date()
      };

      this.activeOrders.set(order.id, order);

      // Process market orders immediately
      if (orderData.type === 'MARKET') {
        await this.executeMarketOrder(sessionId, order);
      }

      this.emit('order_placed', { sessionId, userId, order });
      
      return { success: true, orderId: order.id };

    } catch (error) {
      console.error('Order placement error:', error);
      return { success: false, error: 'Failed to place order' };
    }
  }

  /**
   * Get simplified order book for symbol
   */
  getSimpleOrderBook(symbol: string): { bids: Order[]; asks: Order[]; spread: number } {
    const orders = Array.from(this.activeOrders.values())
      .filter(order => order.symbol === symbol && order.status === 'PENDING');

    const bids = orders
      .filter(order => order.side === 'BUY' && order.type === 'LIMIT')
      .sort((a, b) => (b.price || 0) - (a.price || 0)); // Highest price first

    const asks = orders
      .filter(order => order.side === 'SELL' && order.type === 'LIMIT')
      .sort((a, b) => (a.price || 0) - (b.price || 0)); // Lowest price first

    const bestBid = bids[0]?.price || 0;
    const bestAsk = asks[0]?.price || 999999;
    const spread = bestAsk - bestBid;

    return { bids, asks, spread };
  }

  /**
   * Execute market order against order book
   */
  private async executeMarketOrder(sessionId: string, order: Order): Promise<void> {
    const orderBook = this.getSimpleOrderBook(order.symbol);
    const counterOrders = order.side === 'BUY' ? orderBook.asks : orderBook.bids;

    let remainingQuantity = order.quantity;
    let totalFilled = 0;
    let weightedPrice = 0;

    for (const counterOrder of counterOrders) {
      if (remainingQuantity <= 0) break;

      const fillQuantity = Math.min(remainingQuantity, counterOrder.quantity - counterOrder.filledQuantity);
      const fillPrice = counterOrder.price || 0;

      // Fill both orders
      await this.fillOrder(sessionId, order, fillQuantity, fillPrice);
      await this.fillOrder(sessionId, counterOrder, fillQuantity, fillPrice);

      totalFilled += fillQuantity;
      weightedPrice += fillQuantity * fillPrice;
      remainingQuantity -= fillQuantity;

      // Emit trade event
      this.emit('trade_executed', {
        sessionId,
        symbol: order.symbol,
        price: fillPrice,
        quantity: fillQuantity,
        buyOrderId: order.side === 'BUY' ? order.id : counterOrder.id,
        sellOrderId: order.side === 'SELL' ? order.id : counterOrder.id,
        timestamp: new Date()
      });
    }

    // Update market data
    if (totalFilled > 0) {
      const avgPrice = weightedPrice / totalFilled;
      await this.updateMarketData(order.symbol, avgPrice, totalFilled);
    }
  }

  /**
   * Update real-time market data
   */
  private async updateMarketData(symbol: string, lastPrice: number, volume: number): Promise<void> {
    try {
      const security = await prisma.security.findFirst({ where: { symbol } });
      if (!security) return;

      // Update or create market data
      await prisma.marketData.create({
        data: {
          securityId: security.id,
          last: lastPrice,
          volume: volume,
          timestamp: new Date()
        }
      });

      // Emit market data update
      this.emit('market_data_update', {
        symbol,
        last: lastPrice,
        volume,
        timestamp: new Date()
      });

    } catch (error) {
      console.error('Market data update error:', error);
    }
  }

  /**
   * Validate order parameters
   */
  private validateOrder(orderData: any): { valid: boolean; error?: string } {
    if (!orderData.symbol || !orderData.side || !orderData.quantity) {
      return { valid: false, error: 'Missing required order fields' };
    }

    if (orderData.quantity <= 0) {
      return { valid: false, error: 'Quantity must be positive' };
    }

    if (orderData.type !== 'MARKET' && (!orderData.price || orderData.price <= 0)) {
      return { valid: false, error: 'Price required for non-market orders' };
    }

    return { valid: true };
  }

  /**
   * Execute market order immediately against best available prices
   */
  private async executeMarketOrderSimple(sessionId: string, order: Order): Promise<void> {
    const marketData = this.marketData.get(order.symbol);
    if (!marketData) {
      await this.rejectOrder(order, 'Invalid symbol');
      return;
    }

    const executionPrice = order.side === 'BUY' ? marketData.ask : marketData.bid;
    await this.fillOrder(sessionId, order, order.quantity, executionPrice);
  }

  /**
   * Fill an order (full or partial)
   */
  private async fillOrder(sessionId: string, order: Order, fillQuantity: number, fillPrice: number): Promise<void> {
    // Get the userId from sessionUser
    const sessionUser = await prisma.sessionUser.findUnique({
      where: { id: order.sessionUserId }
    });
    if (!sessionUser) throw new Error('Session user not found');
    const remainingQuantity = order.quantity - order.filledQuantity;
    const actualFillQuantity = Math.min(fillQuantity, remainingQuantity);

    // Update order
    order.filledQuantity += actualFillQuantity;
    order.filledPrice = ((order.filledPrice || 0) * (order.filledQuantity - actualFillQuantity) + fillPrice * actualFillQuantity) / order.filledQuantity;
    order.status = order.filledQuantity >= order.quantity ? 'FILLED' : 'PARTIALLY_FILLED';
    order.filledAt = new Date();

    // Update database
    await prisma.order.update({
      where: { id: order.id },
      data: {
        status: order.status,
        executedAt: order.status === 'FILLED' ? order.filledAt : undefined
      }
    });

    // Update position through position service
    await positionService.processTrade({
      userId: sessionUser.userId,
      sessionId: sessionId,
      symbol: order.symbol,
      side: order.side,
      quantity: actualFillQuantity,
      price: fillPrice,
      timestamp: new Date(),
      commission: 0, // No commission for educational trading
      orderId: order.id
    });

    // Create trade record
    const trade: Trade = {
      id: `trade-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      orderId: order.id,
      symbol: order.symbol,
      side: order.side,
      quantity: actualFillQuantity,
      price: fillPrice,
      timestamp: new Date()
    };

    // Remove from active orders if fully filled
    if (order.status === 'FILLED') {
      this.activeOrders.delete(order.id);
    }

    this.emit('order_filled', { sessionId, order, trade, fillQuantity: actualFillQuantity, fillPrice });
  }

  /**
   * Reject an order
   */
  private async rejectOrder(order: Order, reason: string): Promise<void> {
    order.status = 'REJECTED';
    
    await prisma.order.update({
      where: { id: order.id },
      data: { status: 'REJECTED' }
    });

    this.activeOrders.delete(order.id);
    this.emit('order_rejected', { order, reason });
  }

  /**
   * Initialize user positions for session (delegated to position service)
   */
  public async initializeUserPositions(userId: string, sessionId: string, startingEquity: number = 100000): Promise<void> {
    await positionService.initializeUserPositions(userId, sessionId, startingEquity);
  }

  /**
   * Process triggered stop/limit orders
   */
  private processTriggeredOrders(symbol: string, currentPrice: number): void {
    this.activeOrders.forEach(async (order) => {
      if (order.symbol !== symbol || order.status !== 'PENDING') return;

      let shouldExecute = false;

      if (order.type === 'LIMIT') {
        if ((order.side === 'BUY' && currentPrice <= (order.price || 0)) ||
            (order.side === 'SELL' && currentPrice >= (order.price || 0))) {
          shouldExecute = true;
        }
      } else if (order.type === 'STOP') {
        if ((order.side === 'BUY' && currentPrice >= (order.price || 0)) ||
            (order.side === 'SELL' && currentPrice <= (order.price || 0))) {
          shouldExecute = true;
        }
      }

      if (shouldExecute) {
        const sessionUser = await prisma.sessionUser.findUnique({
          where: { id: order.sessionUserId },
          include: { session: true }
        });

        if (sessionUser) {
          await this.fillOrder(sessionUser.session.id, order, order.quantity, order.price || currentPrice);
        }
      }
    });
  }

  /**
   * Get current market data for symbol
   */
  public getMarketData(symbol: string): MarketData | null {
    return this.marketData.get(symbol) || null;
  }

  /**
   * Get order book for symbol
   */
  public getOrderBook(symbol: string): OrderBook | null {
    return this.orderBooks.get(symbol) || null;
  }

  /**
   * Get user positions (delegated to position service)
   */
  public getUserPositions(userId: string): any[] {
    return positionService.getPositions(userId);
  }

  /**
   * Get user portfolio summary (delegated to position service)
   */
  public getUserPortfolio(userId: string): any {
    return positionService.getPortfolio(userId);
  }

  /**
   * Cancel an order
   */
  public async cancelOrder(orderId: string): Promise<{ success: boolean; error?: string }> {
    const order = this.activeOrders.get(orderId);
    if (!order) {
      return { success: false, error: 'Order not found' };
    }

    order.status = 'CANCELLED';
    
    await prisma.order.update({
      where: { id: orderId },
      data: { status: 'CANCELLED' }
    });

    this.activeOrders.delete(orderId);
    this.emit('order_cancelled', { order });

    return { success: true };
  }

  /**
   * Get session statistics
   */
  public getSessionStats(sessionId: string): any {
    const symbols = this.sessionMarkets.get(sessionId) || new Set();
    const marketDataArray = Array.from(symbols).map(symbol => this.marketData.get(symbol));
    
    return {
      sessionId,
      activeSymbols: symbols.size,
      marketData: marketDataArray.filter(Boolean),
      isActive: this.marketIntervals.has(sessionId)
    };
  }
}

// Export singleton instance
export const tradingEngine = new TradingEngine();