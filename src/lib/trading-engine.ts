/**
 * Trading Engine - Core Trading Simulation System
 * 
 * Handles order execution, market simulation, portfolio management,
 * and real-time trading data for educational trading sessions.
 */

import { EventEmitter } from 'events';
import { prisma } from './prisma';

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
   * Execute market order immediately
   */
  private async executeMarketOrder(sessionId: string, order: Order): Promise<void> {
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

    // Update position
    await this.updatePosition(sessionUser.userId, order.symbol, order.side, actualFillQuantity, fillPrice);

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
   * Update user position
   */
  private async updatePosition(sessionUserId: string, symbol: string, side: 'BUY' | 'SELL', quantity: number, price: number): Promise<void> {
    const sessionUser = await prisma.sessionUser.findUnique({
      where: { id: sessionUserId }
    });

    if (!sessionUser) return;

    // Calculate position change
    const positionChange = side === 'BUY' ? quantity : -quantity;
    const cashChange = quantity * price * (side === 'BUY' ? -1 : 1);

    // Update session user equity
    await prisma.sessionUser.update({
      where: { id: sessionUserId },
      data: {
        currentEquity: {
          increment: cashChange
        }
      }
    });

    // Calculate new position (simplified - in production you'd track individual positions)
    const userPositions = this.positions.get(sessionUser.userId) || new Map();
    const currentPosition = userPositions.get(symbol) || {
      userId: sessionUser.userId,
      symbol,
      quantity: 0,
      avgPrice: 0,
      marketValue: 0,
      unrealizedPnL: 0,
      realizedPnL: 0
    };

    // Update position
    if (currentPosition.quantity === 0) {
      currentPosition.quantity = positionChange;
      currentPosition.avgPrice = price;
    } else {
      if ((currentPosition.quantity > 0 && side === 'BUY') || (currentPosition.quantity < 0 && side === 'SELL')) {
        // Adding to position
        const totalCost = currentPosition.avgPrice * Math.abs(currentPosition.quantity) + price * quantity;
        currentPosition.quantity += positionChange;
        currentPosition.avgPrice = totalCost / Math.abs(currentPosition.quantity);
      } else {
        // Reducing or reversing position
        if (Math.abs(positionChange) >= Math.abs(currentPosition.quantity)) {
          // Full closure or reversal
          currentPosition.realizedPnL += (price - currentPosition.avgPrice) * Math.abs(currentPosition.quantity) * (currentPosition.quantity > 0 ? 1 : -1);
          currentPosition.quantity = positionChange + currentPosition.quantity;
          currentPosition.avgPrice = Math.abs(currentPosition.quantity) > 0 ? price : 0;
        } else {
          // Partial closure
          currentPosition.realizedPnL += (price - currentPosition.avgPrice) * quantity * (currentPosition.quantity > 0 ? 1 : -1);
          currentPosition.quantity += positionChange;
        }
      }
    }

    // Update market value and unrealized P&L
    const currentMarketData = this.marketData.get(symbol);
    if (currentMarketData) {
      currentPosition.marketValue = Math.abs(currentPosition.quantity) * currentMarketData.last;
      currentPosition.unrealizedPnL = (currentMarketData.last - currentPosition.avgPrice) * currentPosition.quantity;
    }

    userPositions.set(symbol, currentPosition);
    this.positions.set(sessionUser.userId, userPositions);

    this.emit('position_updated', { userId: sessionUser.userId, symbol, position: currentPosition });
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
   * Get user positions
   */
  public getUserPositions(userId: string): Position[] {
    const userPositions = this.positions.get(userId);
    return userPositions ? Array.from(userPositions.values()) : [];
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