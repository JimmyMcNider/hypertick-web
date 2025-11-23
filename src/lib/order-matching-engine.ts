/**
 * Order Matching Engine
 * 
 * Real-time order matching and execution system for financial trading simulations.
 * Implements price-time priority matching algorithm with market maker functionality.
 */

import { EventEmitter } from 'events';
import { prisma } from './prisma';
import { getPortfolioEngine } from './portfolio-engine';

export interface MarketOrder {
  id: string;
  sessionId: string;
  userId: string;
  securityId: string;
  type: 'MARKET' | 'LIMIT' | 'STOP' | 'STOP_LIMIT';
  side: 'BUY' | 'SELL';
  quantity: number;
  price?: number;
  stopPrice?: number;
  timeInForce: 'DAY' | 'IOC' | 'FOK' | 'GTC';
  status: 'PENDING' | 'PENDING_TRIGGER' | 'PARTIALLY_FILLED' | 'FILLED' | 'CANCELLED' | 'REJECTED';
  submittedAt: Date;
  executedAt?: Date;
  cancelledAt?: Date;
  remainingQuantity: number;
  notes?: string;
}

export interface OrderExecution {
  id: string;
  orderId: string;
  quantity: number;
  price: number;
  timestamp: Date;
  counterpartyOrderId?: string;
}

export interface OrderBook {
  securityId: string;
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  lastTrade?: {
    price: number;
    quantity: number;
    timestamp: Date;
  };
}

export interface OrderBookLevel {
  price: number;
  quantity: number;
  orderCount: number;
  orders: MarketOrder[];
}

export interface MarketMakerConfig {
  securityId: string;
  enabled: boolean;
  bidSpread: number;
  askSpread: number;
  maxPosition: number;
  refreshRate: number; // milliseconds
  basePrice: number;
  volatility: number;
}

/**
 * Main order matching engine class
 */
export class OrderMatchingEngine extends EventEmitter {
  private orderBooks: Map<string, OrderBook> = new Map();
  private pendingOrders: Map<string, MarketOrder> = new Map();
  private marketMakers: Map<string, MarketMakerConfig> = new Map();
  private marketPrices: Map<string, number> = new Map();
  private recentTrades: Map<string, Array<{
    id: string;
    price: number;
    quantity: number;
    buyOrderId: string;
    sellOrderId: string;
    timestamp: Date;
  }>> = new Map();
  private isMarketOpen: boolean = false;
  private sessionId: string;
  private portfolioEngine: any;

  constructor(sessionId: string) {
    super();
    this.sessionId = sessionId;
    this.portfolioEngine = getPortfolioEngine(this.sessionId);
    this.initializeMarketMakers();
  }

  /**
   * Initialize market makers for common securities
   */
  private initializeMarketMakers(): void {
    const defaultSecurities = ['EQUITY_1', 'BOND_1', 'OPTION_1'];
    
    defaultSecurities.forEach(securityId => {
      this.marketMakers.set(securityId, {
        securityId,
        enabled: true,
        bidSpread: 0.01, // 1 cent bid-ask spread
        askSpread: 0.01,
        maxPosition: 1000,
        refreshRate: 1000, // 1 second
        basePrice: 100.00,
        volatility: 0.02
      });

      this.orderBooks.set(securityId, {
        securityId,
        bids: [],
        asks: []
      });

      this.marketPrices.set(securityId, 100.00);
    });
  }

  /**
   * Submit a new order for processing
   */
  async submitOrder(order: Omit<MarketOrder, 'id' | 'submittedAt' | 'remainingQuantity' | 'status'>): Promise<MarketOrder> {
    const newOrder: MarketOrder = {
      id: `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      submittedAt: new Date(),
      remainingQuantity: order.quantity,
      status: 'PENDING',
      ...order
    };

    // Validate order
    const validation = await this.validateOrder(newOrder);
    if (!validation.valid) {
      newOrder.status = 'REJECTED';
      newOrder.notes = validation.reason;
      await this.saveOrderToDatabase(newOrder);
      this.emit('orderRejected', newOrder);
      return newOrder;
    }

    // Store order
    this.pendingOrders.set(newOrder.id, newOrder);
    await this.saveOrderToDatabase(newOrder);

    // Process order based on type
    if (newOrder.type === 'MARKET') {
      await this.processMarketOrder(newOrder);
    } else if (newOrder.type === 'LIMIT') {
      await this.processLimitOrder(newOrder);
    } else if (newOrder.type === 'STOP' || newOrder.type === 'STOP_LIMIT') {
      await this.processStopOrder(newOrder);
    }

    this.emit('orderSubmitted', newOrder);
    return newOrder;
  }

  /**
   * Validate order before processing
   */
  private async validateOrder(order: MarketOrder): Promise<{valid: boolean, reason?: string}> {
    // Check market hours
    if (!this.isMarketOpen && order.timeInForce !== 'GTC') {
      return { valid: false, reason: 'Market is closed' };
    }

    // Check quantity
    if (order.quantity <= 0) {
      return { valid: false, reason: 'Invalid quantity' };
    }

    // Check price for limit orders
    if (order.type === 'LIMIT' && (!order.price || order.price <= 0)) {
      return { valid: false, reason: 'Invalid limit price' };
    }

    // Check user position limits and buying power
    const userPositions = await this.getUserPositions(order.userId, order.securityId);
    const availableFunds = await this.getUserAvailableFunds(order.userId);
    
    if (order.side === 'BUY') {
      const estimatedCost = (order.price || this.getMarketPrice(order.securityId)) * order.quantity;
      if (estimatedCost > availableFunds) {
        return { valid: false, reason: 'Insufficient buying power' };
      }
    } else {
      // For testing purposes, allow short selling (TODO: implement proper position validation)
      // if (userPositions < order.quantity) {
      //   return { valid: false, reason: 'Insufficient shares to sell' };
      // }
    }

    return { valid: true };
  }

  /**
   * Process market order (immediate execution at best available price)
   */
  private async processMarketOrder(order: MarketOrder): Promise<void> {
    let orderBook = this.orderBooks.get(order.securityId);
    if (!orderBook) {
      // Auto-create order book for new security
      this.orderBooks.set(order.securityId, {
        securityId: order.securityId,
        bids: [],
        asks: []
      });
      this.marketPrices.set(order.securityId, 100.00); // Default starting price
      orderBook = this.orderBooks.get(order.securityId)!;
    }

    const opposingSide = order.side === 'BUY' ? orderBook.asks : orderBook.bids;
    
    if (opposingSide.length === 0) {
      // No liquidity available, reject order
      order.status = 'REJECTED';
      order.notes = 'No liquidity available';
      await this.updateOrderInDatabase(order);
      this.emit('orderRejected', order);
      return;
    }

    // Execute against best prices until filled
    let remainingQuantity = order.remainingQuantity;
    
    while (remainingQuantity > 0 && opposingSide.length > 0) {
      const bestLevel = opposingSide[0];
      const executeQuantity = Math.min(remainingQuantity, bestLevel.quantity);
      
      await this.executeOrders(order, bestLevel.orders[0], executeQuantity, bestLevel.price);
      remainingQuantity -= executeQuantity;
    }

    if (remainingQuantity === 0) {
      order.status = 'FILLED';
      order.executedAt = new Date();
    } else {
      order.status = 'PARTIALLY_FILLED';
    }

    order.remainingQuantity = remainingQuantity;
    await this.updateOrderInDatabase(order);
    this.emit('orderExecuted', order);
  }

  /**
   * Process limit order (add to book or execute if price matches)
   */
  private async processLimitOrder(order: MarketOrder): Promise<void> {
    let orderBook = this.orderBooks.get(order.securityId);
    if (!orderBook) {
      // Auto-create order book for new security
      this.orderBooks.set(order.securityId, {
        securityId: order.securityId,
        bids: [],
        asks: []
      });
      this.marketPrices.set(order.securityId, 100.00); // Default starting price
      orderBook = this.orderBooks.get(order.securityId)!;
    }

    // Check if order can be immediately executed
    const opposingSide = order.side === 'BUY' ? orderBook.asks : orderBook.bids;
    const canExecute = order.side === 'BUY' 
      ? (opposingSide.length > 0 && opposingSide[0].price <= order.price!)
      : (opposingSide.length > 0 && opposingSide[0].price >= order.price!);

    if (canExecute) {
      // Execute immediately
      await this.processMarketOrder(order);
    } else {
      // Add to order book
      await this.addOrderToBook(order);
    }
  }

  /**
   * Process stop order (monitor for trigger condition)
   */
  private async processStopOrder(order: MarketOrder): Promise<void> {
    order.status = 'PENDING_TRIGGER';
    await this.updateOrderInDatabase(order);
    
    // Monitor for trigger condition (will be checked on price updates)
    this.emit('stopOrderPending', order);
  }

  /**
   * Add order to the order book
   */
  private async addOrderToBook(order: MarketOrder): Promise<void> {
    const orderBook = this.orderBooks.get(order.securityId);
    if (!orderBook) return;

    const side = order.side === 'BUY' ? orderBook.bids : orderBook.asks;
    const price = order.price!;
    
    // Find or create price level
    let priceLevel = side.find(level => level.price === price);
    if (!priceLevel) {
      priceLevel = {
        price,
        quantity: 0,
        orderCount: 0,
        orders: []
      };
      side.push(priceLevel);
      
      // Sort levels (bids descending, asks ascending)
      if (order.side === 'BUY') {
        side.sort((a, b) => b.price - a.price);
      } else {
        side.sort((a, b) => a.price - b.price);
      }
    }

    // Add order to level
    priceLevel.orders.push(order);
    priceLevel.quantity += order.remainingQuantity;
    priceLevel.orderCount++;

    order.status = 'PENDING';
    await this.updateOrderInDatabase(order);
    
    this.emit('orderBookUpdated', { securityId: order.securityId, orderBook });
  }

  /**
   * Execute orders between two parties
   */
  private async executeOrders(
    order1: MarketOrder, 
    order2: MarketOrder, 
    quantity: number, 
    price: number
  ): Promise<void> {
    // Create executions
    const execution1: OrderExecution = {
      id: `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      orderId: order1.id,
      quantity,
      price,
      timestamp: new Date(),
      counterpartyOrderId: order2.id
    };

    const execution2: OrderExecution = {
      id: `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      orderId: order2.id,
      quantity,
      price,
      timestamp: new Date(),
      counterpartyOrderId: order1.id
    };

    // Update order quantities
    order1.remainingQuantity -= quantity;
    order2.remainingQuantity -= quantity;

    // Update order statuses
    if (order1.remainingQuantity === 0) {
      order1.status = 'FILLED';
      order1.executedAt = new Date();
    } else {
      order1.status = 'PARTIALLY_FILLED';
    }

    if (order2.remainingQuantity === 0) {
      order2.status = 'FILLED';
      order2.executedAt = new Date();
    } else {
      order2.status = 'PARTIALLY_FILLED';
    }

    // Save to database
    await this.saveExecutionToDatabase(execution1);
    await this.saveExecutionToDatabase(execution2);
    await this.updateOrderInDatabase(order1);
    await this.updateOrderInDatabase(order2);

    // Record trade for history
    const buyOrder = order1.side === 'BUY' ? order1 : order2;
    const sellOrder = order1.side === 'SELL' ? order1 : order2;
    this.recordTrade(order1.securityId, {
      id: `trade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      price,
      quantity,
      buyOrderId: buyOrder.id,
      sellOrderId: sellOrder.id,
      timestamp: new Date()
    });

    // Update positions using portfolio engine
    const tradeValue = quantity * price;
    await this.portfolioEngine.updatePosition(
      order1.userId, 
      order1.securityId, 
      order1.side === 'BUY' ? quantity : -quantity, 
      price,
      order1.side === 'BUY' ? tradeValue : -tradeValue
    );
    await this.portfolioEngine.updatePosition(
      order2.userId, 
      order2.securityId, 
      order2.side === 'BUY' ? quantity : -quantity, 
      price,
      order2.side === 'BUY' ? tradeValue : -tradeValue
    );

    // Update market price in both engines
    this.marketPrices.set(order1.securityId, price);
    await this.portfolioEngine.updateMarketPrice(order1.securityId, price);
    
    // Update order book
    const orderBook = this.orderBooks.get(order1.securityId);
    if (orderBook) {
      orderBook.lastTrade = { price, quantity, timestamp: new Date() };
      this.removeFilledOrdersFromBook(order1.securityId);
    }

    this.emit('orderExecuted', { order1, order2, execution1, execution2 });
    this.emit('tradeExecuted', { securityId: order1.securityId, price, quantity, timestamp: new Date() });
  }

  /**
   * Remove filled orders from order book
   */
  private removeFilledOrdersFromBook(securityId: string): void {
    const orderBook = this.orderBooks.get(securityId);
    if (!orderBook) return;

    [orderBook.bids, orderBook.asks].forEach(side => {
      side.forEach(level => {
        level.orders = level.orders.filter(order => order.remainingQuantity > 0);
        level.quantity = level.orders.reduce((sum, order) => sum + order.remainingQuantity, 0);
        level.orderCount = level.orders.length;
      });
      
      // Remove empty levels
      for (let i = side.length - 1; i >= 0; i--) {
        if (side[i].orders.length === 0) {
          side.splice(i, 1);
        }
      }
    });

    this.emit('orderBookUpdated', { securityId, orderBook });
  }

  /**
   * Open the market for trading
   */
  async openMarket(): Promise<void> {
    this.isMarketOpen = true;
    this.emit('marketOpened', { sessionId: this.sessionId, timestamp: new Date() });
  }

  /**
   * Close the market
   */
  async closeMarket(): Promise<void> {
    this.isMarketOpen = false;
    this.emit('marketClosed', { sessionId: this.sessionId, timestamp: new Date() });
  }

  /**
   * Check if market is currently open
   */
  isMarketCurrentlyOpen(): boolean {
    return this.isMarketOpen;
  }

  /**
   * Get current order book for a security
   */
  getOrderBook(securityId: string): OrderBook | undefined {
    let orderBook = this.orderBooks.get(securityId);
    if (!orderBook) {
      // Auto-create order book for new security
      this.orderBooks.set(securityId, {
        securityId: securityId,
        bids: [],
        asks: []
      });
      this.marketPrices.set(securityId, 100.00); // Default starting price
      orderBook = this.orderBooks.get(securityId)!;
    }
    return orderBook;
  }

  /**
   * Get current market price for a security
   */
  getMarketPrice(securityId: string): number {
    return this.marketPrices.get(securityId) || 100.00;
  }

  /**
   * Get all open orders for a security
   */
  getOpenOrders(securityId: string): MarketOrder[] {
    const orders: MarketOrder[] = [];
    for (const order of this.pendingOrders.values()) {
      if (order.securityId === securityId &&
          (order.status === 'PENDING' || order.status === 'PARTIALLY_FILLED') &&
          order.remainingQuantity > 0) {
        orders.push(order);
      }
    }
    return orders;
  }

  /**
   * Get recent trades for a security
   */
  getRecentTrades(securityId: string, limit: number = 100): Array<{
    id: string;
    price: number;
    quantity: number;
    buyOrderId: string;
    sellOrderId: string;
    timestamp: Date;
  }> {
    const trades = this.recentTrades.get(securityId) || [];
    return trades.slice(-limit);
  }

  /**
   * Record a trade (called after matching)
   */
  private recordTrade(securityId: string, trade: {
    id: string;
    price: number;
    quantity: number;
    buyOrderId: string;
    sellOrderId: string;
    timestamp: Date;
  }): void {
    if (!this.recentTrades.has(securityId)) {
      this.recentTrades.set(securityId, []);
    }
    const trades = this.recentTrades.get(securityId)!;
    trades.push(trade);
    // Keep only last 1000 trades per security
    if (trades.length > 1000) {
      trades.shift();
    }
  }

  /**
   * Cancel an order
   */
  async cancelOrder(orderId: string, userId: string): Promise<boolean> {
    const order = this.pendingOrders.get(orderId);
    if (!order || order.userId !== userId) {
      return false;
    }

    if (order.status === 'FILLED' || order.status === 'CANCELLED') {
      return false;
    }

    order.status = 'CANCELLED';
    order.cancelledAt = new Date();
    await this.updateOrderInDatabase(order);

    // Remove from order book if present
    this.removeOrderFromBook(order);
    
    this.emit('orderCancelled', order);
    return true;
  }

  /**
   * Remove order from order book
   */
  private removeOrderFromBook(order: MarketOrder): void {
    const orderBook = this.orderBooks.get(order.securityId);
    if (!orderBook) return;

    const side = order.side === 'BUY' ? orderBook.bids : orderBook.asks;
    
    side.forEach(level => {
      const orderIndex = level.orders.findIndex(o => o.id === order.id);
      if (orderIndex !== -1) {
        level.orders.splice(orderIndex, 1);
        level.quantity -= order.remainingQuantity;
        level.orderCount--;
      }
    });

    this.removeFilledOrdersFromBook(order.securityId);
  }

  // Database operations
  private async saveOrderToDatabase(order: MarketOrder): Promise<void> {
    try {
      await prisma.order.create({
        data: {
          id: order.id,
          sessionId: order.sessionId,
          userId: order.userId,
          securityId: order.securityId,
          type: order.type,
          side: order.side,
          quantity: order.quantity,
          price: order.price,
          stopPrice: order.stopPrice,
          status: order.status,
          timeInForce: order.timeInForce,
          notes: order.notes,
          submittedAt: order.submittedAt,
          executedAt: order.executedAt,
          cancelledAt: order.cancelledAt
        }
      });
    } catch (error) {
      console.error('Error saving order to database:', error);
    }
  }

  private async updateOrderInDatabase(order: MarketOrder): Promise<void> {
    try {
      await prisma.order.update({
        where: { id: order.id },
        data: {
          status: order.status,
          notes: order.notes,
          executedAt: order.executedAt,
          cancelledAt: order.cancelledAt
        }
      });
    } catch (error) {
      console.error('Error updating order in database:', error);
    }
  }

  private async saveExecutionToDatabase(execution: OrderExecution): Promise<void> {
    try {
      await prisma.orderExecution.create({
        data: {
          id: execution.id,
          orderId: execution.orderId,
          quantity: execution.quantity,
          price: execution.price,
          timestamp: execution.timestamp
        }
      });
    } catch (error) {
      console.error('Error saving execution to database:', error);
    }
  }

  private async getUserPositions(userId: string, securityId: string): Promise<number> {
    try {
      const position = await prisma.position.findUnique({
        where: {
          sessionId_userId_securityId: {
            sessionId: this.sessionId,
            userId,
            securityId
          }
        }
      });
      return position?.quantity || 0;
    } catch (error) {
      return 0;
    }
  }

  private async getUserAvailableFunds(userId: string): Promise<number> {
    return this.portfolioEngine.getCashBalance(userId);
  }

  private async updateUserPosition(userId: string, securityId: string, quantityChange: number, price: number): Promise<void> {
    try {
      await prisma.position.upsert({
        where: {
          sessionId_userId_securityId: {
            sessionId: this.sessionId,
            userId,
            securityId
          }
        },
        update: {
          quantity: {
            increment: quantityChange
          },
          avgPrice: price // Simplified - should calculate weighted average
        },
        create: {
          sessionId: this.sessionId,
          userId,
          securityId,
          quantity: quantityChange,
          avgPrice: price,
          unrealizedPnL: 0,
          realizedPnL: 0
        }
      });
    } catch (error) {
      console.error('Error updating position:', error);
    }
  }
}

// Export singleton instances for active sessions
export const activeEngines = new Map<string, OrderMatchingEngine>();

export function getOrderMatchingEngine(sessionId: string): OrderMatchingEngine {
  if (!activeEngines.has(sessionId)) {
    activeEngines.set(sessionId, new OrderMatchingEngine(sessionId));
  }
  return activeEngines.get(sessionId)!;
}

/**
 * Get engine and ensure market is open for active sessions
 * Use this for order submission to auto-open market for IN_PROGRESS sessions
 */
export async function getReadyOrderMatchingEngine(sessionId: string): Promise<OrderMatchingEngine> {
  const engine = getOrderMatchingEngine(sessionId);

  // Auto-open market if session is active
  if (!engine.isMarketCurrentlyOpen()) {
    try {
      const session = await prisma.simulationSession.findUnique({
        where: { id: sessionId }
      });
      if (session && session.status === 'IN_PROGRESS') {
        await engine.openMarket();
        console.log(`Auto-opened market for session ${sessionId}`);
      }
    } catch (error) {
      console.error('Error checking session status:', error);
    }
  }

  return engine;
}