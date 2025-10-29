import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { PrismaClient, OrderStatus } from '@prisma/client';
import { positionService } from './position-service';
import { enhancedSessionEngine } from './enhanced-session-engine';
import { lessonLoader } from './lesson-loader';
import { getOrderMatchingEngine } from './order-matching-engine';
import { getPortfolioEngine } from './portfolio-engine';

const prisma = new PrismaClient();

// For use in Node.js
export const initWebSocketServer = (server: HTTPServer) => {
  return new TradingWebSocketServer(server);
};

export interface TradingMessage {
  type: 'order' | 'trade' | 'market_update' | 'simulation_update' | 'price_update';
  sessionId: string;
  userId?: string;
  data: any;
  timestamp: Date;
}

export interface OrderData {
  id: string;
  userId: string;
  securityId: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  quantity: number;
  price?: number;
  type: 'MARKET' | 'LIMIT' | 'STOP' | 'STOP_LIMIT';
  stopPrice?: number;
  timeInForce: 'GTC' | 'IOC' | 'FOK' | 'DAY';
}

export interface MarketData {
  symbol: string;
  lastPrice: number;
  bid: number;
  ask: number;
  bidSize: number;
  askSize: number;
  volume: number;
  tick: number;
}

export class TradingWebSocketServer {
  private io: SocketIOServer;
  private activeSessions: Map<string, Set<string>> = new Map(); // sessionId -> userIds
  private userSessions: Map<string, string> = new Map(); // userId -> sessionId
  private marketData: Map<string, MarketData> = new Map(); // symbol -> marketData

  constructor(server: HTTPServer) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.NODE_ENV === 'production' 
          ? ['https://hypertick-web.onrender.com'] 
          : ['http://localhost:3000'],
        methods: ['GET', 'POST']
      }
    });

    this.setupEventHandlers();
    this.initializeMarketData();
    this.setupPositionServiceListeners();
    this.setupLessonEngineListeners();
    this.setupNewEngineListeners();
  }

  private setupEventHandlers() {
    this.io.on('connection', (socket) => {
      console.log('Client connected:', socket.id);

      socket.on('join_session', async (data: { sessionId: string; userId: string; role: 'Student' | 'Instructor' }) => {
        try {
          // Verify session exists and user has access
          const sessionUser = await this.verifySessionAccess(data.sessionId, data.userId, data.role);
          
          if (sessionUser) {
            socket.join(`session_${data.sessionId}`);
            socket.join(`user_${data.userId}`);
            
            // Track active users in session
            if (!this.activeSessions.has(data.sessionId)) {
              this.activeSessions.set(data.sessionId, new Set());
            }
            this.activeSessions.get(data.sessionId)!.add(data.userId);
            this.userSessions.set(data.userId, data.sessionId);

            // Initialize user positions in the position service
            await positionService.initializeUserPositions(data.userId, data.sessionId);

            // Add participant to enhanced session engine
            const participant = {
              id: data.userId,
              username: data.userId, // TODO: get actual username
              role: data.role === 'Instructor' ? 'INSTRUCTOR' as const : 'STUDENT' as const,
              privileges: new Set<number>(),
              isConnected: true,
              lastActivity: new Date(),
              performance: {
                totalPnL: 0,
                tradesExecuted: 0,
                averageSpread: 0,
                riskScore: 0
              }
            };
            enhancedSessionEngine.addParticipant(data.sessionId, participant);

            // Send current market data to newly connected user
            const marketSnapshot = Array.from(this.marketData.values());
            socket.emit('market_snapshot', marketSnapshot);

            // Send current portfolio to newly connected user
            const portfolio = positionService.getPortfolio(data.userId);
            if (portfolio) {
              socket.emit('portfolio_update', portfolio);
            }

            // Enhanced integration with new engines
            await this.enhancedJoinSession(data.sessionId, data.userId, data.role);

            // Send current lesson state if applicable
            const sessionState = enhancedSessionEngine.getSession(data.sessionId);
            if (sessionState) {
              socket.emit('lesson_state', {
                lessonName: sessionState.currentLesson?.name,
                scenario: sessionState.scenario,
                status: sessionState.status,
                marketOpen: sessionState.marketState.isOpen
              });
            }

            // Notify session of new participant
            socket.to(`session_${data.sessionId}`).emit('user_joined', {
              userId: data.userId,
              role: data.role,
              timestamp: new Date()
            });

            console.log(`User ${data.userId} joined session ${data.sessionId}`);
          } else {
            socket.emit('error', { message: 'Access denied to simulation session' });
          }
        } catch (error) {
          console.error('Error joining session:', error);
          socket.emit('error', { message: 'Failed to join session' });
        }
      });

      socket.on('submit_order', async (orderData: OrderData) => {
        try {
          const sessionId = this.userSessions.get(orderData.userId);
          if (!sessionId) {
            socket.emit('error', { message: 'Not connected to any session' });
            return;
          }

          // Process order through matching engine
          const result = await this.processOrder(sessionId, orderData);
          
          if (result.success) {
            // Broadcast order and any resulting trades to all session participants
            this.io.to(`session_${sessionId}`).emit('order_update', {
              order: result.order,
              trades: result.trades,
              marketUpdate: result.marketUpdate,
              timestamp: new Date()
            });

            // Update market data if trades occurred
            if (result.trades && result.trades.length > 0) {
              this.updateMarketData(orderData.symbol, result.trades);
            }
          } else {
            socket.emit('order_rejected', {
              orderId: orderData.id,
              reason: result.reason,
              timestamp: new Date()
            });
          }
        } catch (error) {
          console.error('Error processing order:', error);
          socket.emit('error', { message: 'Failed to process order' });
        }
      });

      // Lesson control handlers
      socket.on('start_lesson', async (data: { sessionId: string; lessonId: string; scenario: string }) => {
        try {
          const lesson = await lessonLoader.loadLesson(data.lessonId);
          if (lesson) {
            await enhancedSessionEngine.initializeSession(
              data.sessionId,
              data.lessonId,
              data.scenario,
              'default_class', // TODO: get from session data
              lesson
            );
            await enhancedSessionEngine.startSession(data.sessionId);
            
            socket.emit('lesson_started', {
              sessionId: data.sessionId,
              lesson: lesson.name,
              scenario: data.scenario
            });
          }
        } catch (error) {
          socket.emit('error', { message: 'Failed to start lesson: ' + (error as Error).message });
        }
      });

      socket.on('pause_lesson', async (data: { sessionId: string }) => {
        try {
          await enhancedSessionEngine.pauseSession(data.sessionId);
          this.io.to(`session_${data.sessionId}`).emit('lesson_paused', { sessionId: data.sessionId });
        } catch (error) {
          socket.emit('error', { message: 'Failed to pause lesson: ' + (error as Error).message });
        }
      });

      socket.on('resume_lesson', async (data: { sessionId: string }) => {
        try {
          await enhancedSessionEngine.resumeSession(data.sessionId);
          this.io.to(`session_${data.sessionId}`).emit('lesson_resumed', { sessionId: data.sessionId });
        } catch (error) {
          socket.emit('error', { message: 'Failed to resume lesson: ' + (error as Error).message });
        }
      });

      socket.on('end_lesson', async (data: { sessionId: string }) => {
        try {
          await enhancedSessionEngine.endSession(data.sessionId);
          this.io.to(`session_${data.sessionId}`).emit('lesson_ended', { sessionId: data.sessionId });
        } catch (error) {
          socket.emit('error', { message: 'Failed to end lesson: ' + (error as Error).message });
        }
      });

      socket.on('execute_command', async (data: { sessionId: string; commandId: string }) => {
        try {
          const session = enhancedSessionEngine.getSession(data.sessionId);
          if (session) {
            const command = session.currentLesson.globalCommands.find(cmd => cmd.id === data.commandId);
            if (command) {
              await enhancedSessionEngine.executeCommand(data.sessionId, command);
            }
          }
        } catch (error) {
          socket.emit('error', { message: 'Failed to execute command: ' + (error as Error).message });
        }
      });

      socket.on('privilege_command', async (data: { action: string; privilegeId: number; targetRole: string }) => {
        try {
          const sessionId = Array.from(this.userSessions.values())[0]; // TODO: get actual sessionId
          if (sessionId) {
            const command = {
              id: `manual_${Date.now()}`,
              type: data.action === 'GRANT_PRIVILEGE' ? 'GRANT_PRIVILEGE' : 'REMOVE_PRIVILEGE' as any,
              parameters: [data.privilegeId],
              targetRole: data.targetRole,
              description: `${data.action} privilege ${data.privilegeId}`
            };
            
            await enhancedSessionEngine.executeCommand(sessionId, command);
            this.io.to(`session_${sessionId}`).emit('privilege_updated', {
              action: data.action,
              privilegeId: data.privilegeId,
              targetRole: data.targetRole
            });
          }
        } catch (error) {
          socket.emit('error', { message: 'Failed to execute privilege command: ' + (error as Error).message });
        }
      });

      socket.on('auction_bid', async (data: { auctionId: string; userId: string; bidAmount: number }) => {
        try {
          const sessionId = this.userSessions.get(data.userId);
          if (sessionId) {
            const success = await enhancedSessionEngine.placeBidInAuction(
              sessionId,
              data.auctionId,
              data.userId,
              data.bidAmount
            );
            
            if (success) {
              this.io.to(`session_${sessionId}`).emit('auction_bid_placed', {
                auctionId: data.auctionId,
                userId: data.userId,
                bidAmount: data.bidAmount
              });
            }
          }
        } catch (error) {
          socket.emit('error', { message: 'Failed to place auction bid: ' + (error as Error).message });
        }
      });

      socket.on('get_privilege_data', async (data: { sessionId: string }) => {
        try {
          const privilegeData = enhancedSessionEngine.getPrivilegeSystem(data.sessionId);
          if (privilegeData) {
            socket.emit('privilege_data', privilegeData);
          }
        } catch (error) {
          socket.emit('error', { message: 'Failed to get privilege data: ' + (error as Error).message });
        }
      });

      socket.on('instructor_announcement', async (data: { message: string; timestamp: Date }) => {
        try {
          // Broadcast announcement to all sessions the instructor manages
          // TODO: Get instructor's sessions
          this.io.emit('instructor_announcement', {
            message: data.message,
            timestamp: data.timestamp,
            type: 'ANNOUNCEMENT'
          });
        } catch (error) {
          socket.emit('error', { message: 'Failed to send announcement: ' + (error as Error).message });
        }
      });

      socket.on('disconnect', () => {
        // Clean up user from active sessions
        for (const [sessionId, users] of this.activeSessions.entries()) {
          for (const userId of users) {
            if (this.userSessions.get(userId) === sessionId) {
              users.delete(userId);
              this.userSessions.delete(userId);
              
              // Remove participant from enhanced session engine
              enhancedSessionEngine.removeParticipant(sessionId, userId);
              
              // Notify session of user departure
              socket.to(`session_${sessionId}`).emit('user_left', {
                userId,
                timestamp: new Date()
              });
              break;
            }
          }
        }
        console.log('Client disconnected:', socket.id);
      });
    });
  }

  private async verifySessionAccess(sessionId: string, userId: string, role: string): Promise<boolean> {
    try {
      if (role === 'Instructor') {
        // Verify instructor owns this session
        const session = await prisma.simulationSession.findFirst({
          where: {
            id: sessionId,
            class: {
              instructorId: userId
            }
          }
        });
        return !!session;
      } else {
        // Verify student is enrolled in session
        const sessionUser = await prisma.sessionUser.findFirst({
          where: {
            sessionId,
            userId,
            isActive: true
          }
        });
        return !!sessionUser;
      }
    } catch (error) {
      console.error('Error verifying session access:', error);
      return false;
    }
  }

  private async processOrder(sessionId: string, orderData: OrderData): Promise<any> {
    try {
      // Validate order before processing
      const validationResult = this.validateOrder(orderData);
      if (!validationResult.valid) {
        return {
          success: false,
          reason: validationResult.reason
        };
      }

      // Get the order matching engine for this session
      const orderEngine = getOrderMatchingEngine(sessionId);

      // Submit order to matching engine
      const order = await orderEngine.submitOrder({
        sessionId,
        userId: orderData.userId,
        securityId: orderData.securityId,
        type: orderData.type,
        side: orderData.side,
        quantity: orderData.quantity,
        price: orderData.price,
        stopPrice: orderData.stopPrice,
        timeInForce: orderData.timeInForce
      });

      // Get order book update
      const orderBook = orderEngine.getOrderBook(orderData.securityId);
      const marketPrice = orderEngine.getMarketPrice(orderData.securityId);

      return {
        success: true,
        order,
        trades: [], // Trades are handled internally by the engine
        marketUpdate: {
          symbol: orderData.symbol,
          lastPrice: marketPrice,
          orderBook
        }
      };
    } catch (error) {
      console.error('Order processing error:', error);
      return {
        success: false,
        reason: error instanceof Error ? error.message : 'Order processing failed'
      };
    }
  }

  private validateOrder(orderData: OrderData): { valid: boolean; reason?: string } {
    // Validate required fields
    if (!orderData.symbol || !orderData.side || !orderData.quantity || orderData.quantity <= 0) {
      return { valid: false, reason: 'Invalid order parameters' };
    }

    // Validate price for limit orders
    if (orderData.type === 'LIMIT' && (!orderData.price || orderData.price <= 0)) {
      return { valid: false, reason: 'Limit orders must have a valid price' };
    }

    // Validate stop price for stop orders
    if ((orderData.type === 'STOP' || orderData.type === 'STOP_LIMIT') && 
        (!orderData.stopPrice || orderData.stopPrice <= 0)) {
      return { valid: false, reason: 'Stop orders must have a valid stop price' };
    }

    // Validate stop-limit orders have both prices
    if (orderData.type === 'STOP_LIMIT' && (!orderData.price || orderData.price <= 0)) {
      return { valid: false, reason: 'Stop-limit orders must have both stop price and limit price' };
    }

    return { valid: true };
  }

  private async matchOrder(order: any): Promise<any[]> {
    // Simplified matching engine - in production this would be much more sophisticated
    // For now, just mark order as filled at submitted price
    const fillPrice = order.price || this.getMarketPrice(order.security?.symbol || order.securityId);
    
    await prisma.order.update({
      where: { id: order.id },
      data: { 
        status: 'FILLED',
        executedAt: new Date()
      }
    });

    // Create an order execution record
    const execution = await prisma.orderExecution.create({
      data: {
        orderId: order.id,
        quantity: order.quantity,
        price: fillPrice
        // timestamp is auto-generated
      }
    });

    // Create trade for position service
    const trade = {
      userId: order.userId,
      sessionId: order.sessionId,
      symbol: order.security?.symbol || order.securityId,
      side: order.side,
      quantity: order.quantity,
      price: fillPrice,
      timestamp: new Date(),
      commission: this.calculateCommission(order.quantity, fillPrice),
      orderId: order.id
    };

    // Process trade in position service
    await positionService.processTrade(trade);

    return [execution];
  }

  private calculateCommission(quantity: number, price: number): number {
    // Simple commission calculation: $0.01 per share, min $1.00
    return Math.max(1.00, quantity * 0.01);
  }

  private getMarketPrice(symbol: string): number {
    const marketData = this.marketData.get(symbol);
    return marketData?.lastPrice || 100; // Default price
  }

  private getMarketUpdate(symbol: string): MarketData | null {
    return this.marketData.get(symbol) || null;
  }

  private updateMarketData(symbol: string, trades: any[]) {
    if (trades.length === 0) return;

    const lastTrade = trades[trades.length - 1];
    const currentData = this.marketData.get(symbol) || {
      symbol,
      lastPrice: 100,
      bid: 99.5,
      ask: 100.5,
      bidSize: 100,
      askSize: 100,
      volume: 0,
      tick: 0
    };

    const previousPrice = currentData.lastPrice;

    // Update with trade data
    currentData.lastPrice = lastTrade.price;
    currentData.volume += lastTrade.quantity;
    currentData.tick += 1;

    this.marketData.set(symbol, currentData);

    // Update position service with new market price
    positionService.updateMarketPrice(symbol, currentData.lastPrice);

    // Check for stop order triggers on price change
    if (previousPrice !== currentData.lastPrice) {
      this.checkStopOrderTriggers(symbol, currentData.lastPrice);
    }

    // Broadcast market update to all sessions
    this.io.emit('market_data', currentData);
  }

  private setupPositionServiceListeners() {
    // Listen for position service events and broadcast to WebSocket clients
    positionService.on('portfolio_updated', (data: { userId: string }) => {
      const portfolio = positionService.getPortfolio(data.userId);
      if (portfolio) {
        this.io.to(`user_${data.userId}`).emit('portfolio_update', portfolio);
      }
    });

    positionService.on('position_updated', (data: { userId: string; symbol: string }) => {
      const position = positionService.getPosition(data.userId, data.symbol);
      if (position) {
        this.io.to(`user_${data.userId}`).emit('position_update', {
          symbol: data.symbol,
          position
        });
      }
    });

    positionService.on('risk_updated', (data: { userId: string; metrics: any }) => {
      this.io.to(`user_${data.userId}`).emit('risk_update', data.metrics);
    });

    positionService.on('trade_processed', (data: { trade: any }) => {
      const sessionId = this.userSessions.get(data.trade.userId);
      if (sessionId) {
        this.io.to(`session_${sessionId}`).emit('trade_executed', data.trade);
      }
    });
  }

  private setupLessonEngineListeners() {
    // Listen for enhanced session engine events and broadcast to WebSocket clients
    enhancedSessionEngine.on('session_started', (data: { sessionId: string; session: any }) => {
      this.io.to(`session_${data.sessionId}`).emit('lesson_started', {
        sessionId: data.sessionId,
        lessonName: data.session.currentLesson?.name,
        scenario: data.session.scenario,
        status: data.session.status
      });
    });

    enhancedSessionEngine.on('session_paused', (data: { sessionId: string }) => {
      this.io.to(`session_${data.sessionId}`).emit('lesson_paused', data);
    });

    enhancedSessionEngine.on('session_resumed', (data: { sessionId: string }) => {
      this.io.to(`session_${data.sessionId}`).emit('lesson_resumed', data);
    });

    enhancedSessionEngine.on('session_completed', (data: { sessionId: string; session: any }) => {
      this.io.to(`session_${data.sessionId}`).emit('lesson_completed', {
        sessionId: data.sessionId,
        duration: data.session.endTime - data.session.startTime
      });
    });

    enhancedSessionEngine.on('command_executed', (data: { sessionId: string; command: any; session: any }) => {
      this.io.to(`session_${data.sessionId}`).emit('command_executed', {
        commandId: data.command.id,
        type: data.command.type,
        description: data.command.description,
        parameters: data.command.parameters
      });
    });

    enhancedSessionEngine.on('privilege_granted', (data: { sessionId: string; privilegeCode: number; targetRole: string }) => {
      this.io.to(`session_${data.sessionId}`).emit('privilege_granted', {
        privilegeId: data.privilegeCode,
        targetRole: data.targetRole
      });
    });

    enhancedSessionEngine.on('market_opened', (data: { sessionId: string; symbols?: string[] }) => {
      this.io.to(`session_${data.sessionId}`).emit('market_opened', {
        symbols: data.symbols,
        timestamp: new Date()
      });
    });

    enhancedSessionEngine.on('market_closed', (data: { sessionId: string; symbols?: string[] }) => {
      this.io.to(`session_${data.sessionId}`).emit('market_closed', {
        symbols: data.symbols,
        timestamp: new Date()
      });
    });

    enhancedSessionEngine.on('auction_started', (data: { sessionId: string; auctionId: string; symbol: string; endTime: Date; minimumBid: number }) => {
      this.io.to(`session_${data.sessionId}`).emit('auction_started', {
        auctionId: data.auctionId,
        symbol: data.symbol,
        endTime: data.endTime,
        minimumBid: data.minimumBid
      });
    });

    enhancedSessionEngine.on('auction_ended', (data: { sessionId: string; auctionId: string; winner?: string; winningBid: number }) => {
      this.io.to(`session_${data.sessionId}`).emit('auction_ended', {
        auctionId: data.auctionId,
        winner: data.winner,
        winningBid: data.winningBid
      });
    });

    enhancedSessionEngine.on('news_injected', (data: { sessionId: string; news: any }) => {
      this.io.to(`session_${data.sessionId}`).emit('news_update', data.news);
    });

    enhancedSessionEngine.on('price_updated', (data: { sessionId: string; symbol: string; price: number; volume?: number }) => {
      // Update our market data and trigger normal price update flow
      this.updateMarketDataFromLessonEngine(data.symbol, data.price, data.volume || 0);
    });
  }

  private updateMarketDataFromLessonEngine(symbol: string, price: number, volume: number) {
    const currentData = this.marketData.get(symbol) || {
      symbol,
      lastPrice: 100,
      bid: 99.5,
      ask: 100.5,
      bidSize: 100,
      askSize: 100,
      volume: 0,
      tick: 0
    };

    // Update with lesson engine data
    currentData.lastPrice = price;
    currentData.volume += volume;
    currentData.tick += 1;
    
    // Update bid/ask based on new price
    currentData.bid = price * 0.999;
    currentData.ask = price * 1.001;

    this.marketData.set(symbol, currentData);

    // Update position service with new market price
    positionService.updateMarketPrice(symbol, price);

    // Broadcast market update to all sessions
    this.io.emit('market_data', currentData);
  }

  private async checkStopOrderTriggers(symbol: string, currentPrice: number) {
    try {
      // Find all pending stop orders for this symbol
      const stopOrders = await prisma.order.findMany({
        where: {
          security: { symbol },
          status: 'PENDING_TRIGGER',
          type: { in: ['STOP', 'STOP_LIMIT'] }
        },
        include: {
          user: true,
          security: true
        }
      });

      for (const order of stopOrders) {
        let shouldTrigger = false;

        // Check trigger conditions based on order side and stop price
        if (order.side === 'SELL' && order.stopPrice && currentPrice <= Number(order.stopPrice)) {
          // Sell stop triggered when price falls to or below stop price
          shouldTrigger = true;
        } else if (order.side === 'BUY' && order.stopPrice && currentPrice >= Number(order.stopPrice)) {
          // Buy stop triggered when price rises to or above stop price
          shouldTrigger = true;
        }

        if (shouldTrigger) {
          await this.triggerStopOrder(order, currentPrice);
        }
      }
    } catch (error) {
      console.error('Error checking stop order triggers:', error);
    }
  }

  private async triggerStopOrder(order: any, triggerPrice: number) {
    try {
      if (order.type === 'STOP') {
        // Convert stop order to market order
        await prisma.order.update({
          where: { id: order.id },
          data: { 
            status: 'PENDING',
            type: 'MARKET',
            // Record the trigger price for audit
            notes: `Triggered at ${triggerPrice}`
          }
        });

        // Match the now-market order
        const trades = await this.matchOrder({ ...order, type: 'MARKET' });

        // Broadcast the trigger and execution
        this.io.to(`session_${order.sessionId}`).emit('stop_order_triggered', {
          orderId: order.id,
          triggerPrice,
          trades,
          timestamp: new Date()
        });

      } else if (order.type === 'STOP_LIMIT') {
        // Convert stop-limit order to limit order
        await prisma.order.update({
          where: { id: order.id },
          data: { 
            status: 'PENDING',
            type: 'LIMIT',
            notes: `Triggered at ${triggerPrice}`
          }
        });

        // Match the now-limit order
        const trades = await this.matchOrder({ ...order, type: 'LIMIT' });

        // Broadcast the trigger
        this.io.to(`session_${order.sessionId}`).emit('stop_order_triggered', {
          orderId: order.id,
          triggerPrice,
          trades,
          timestamp: new Date()
        });
      }

      console.log(`Stop order ${order.id} triggered at price ${triggerPrice}`);
    } catch (error) {
      console.error('Error triggering stop order:', error);
    }
  }

  private initializeMarketData() {
    // Initialize with default securities from the system
    const defaultSecurities = [
      { symbol: 'AOE', name: 'Alpha Omega Enterprises' },
      { symbol: 'PNR', name: 'Pioneer Resources' },
      { symbol: 'VGR', name: 'Vector Group' },
      { symbol: 'BOND1', name: 'Treasury Bond 1Y' },
      { symbol: 'BOND2', name: 'Corporate Bond 2Y' }
    ];

    defaultSecurities.forEach(security => {
      this.marketData.set(security.symbol, {
        symbol: security.symbol,
        lastPrice: 100,
        bid: 99.5,
        ask: 100.5,
        bidSize: 100,
        askSize: 100,
        volume: 0,
        tick: 0
      });
    });

    // Start continuous market data simulation
    this.startMarketDataSimulation();
  }

  private startMarketDataSimulation() {
    // Update market data every 2-5 seconds with small random changes
    setInterval(() => {
      this.marketData.forEach((data, symbol) => {
        // Small random price movement (±0.5%)
        const change = (Math.random() - 0.5) * 0.01 * data.lastPrice;
        const newPrice = Math.max(0.01, data.lastPrice + change);
        
        // Update spread around new price
        const spread = newPrice * 0.002; // 0.2% spread
        data.lastPrice = parseFloat(newPrice.toFixed(2));
        data.bid = parseFloat((newPrice - spread / 2).toFixed(2));
        data.ask = parseFloat((newPrice + spread / 2).toFixed(2));
        data.tick += 1;
        
        // Simulate volume
        data.volume += Math.floor(Math.random() * 50);

        // Update position service with new market price
        positionService.updateMarketPrice(symbol, data.lastPrice);
      });

      // Broadcast updated market data to all connected clients
      this.io.emit('market_data', Array.from(this.marketData.values()));
    }, 2000 + Math.random() * 3000); // Random interval between 2-5 seconds
  }

  // Methods for instructor controls
  public broadcastSimulationUpdate(sessionId: string, update: any) {
    this.io.to(`session_${sessionId}`).emit('simulation_update', update);
  }

  public broadcastMarketStateChange(sessionId: string, marketOpen: boolean) {
    this.io.to(`session_${sessionId}`).emit('market_state_change', {
      marketOpen,
      timestamp: new Date()
    });
  }

  public getActiveUsers(sessionId: string): string[] {
    return Array.from(this.activeSessions.get(sessionId) || []);
  }

  /**
   * Setup listeners for the new order matching and portfolio engines
   */
  private setupNewEngineListeners() {
    // We'll setup listeners for each session as they connect
    // This is a lightweight approach since engines are created per-session
  }

  /**
   * Setup real-time integration for a specific session
   */
  private integrateSessionEngines(sessionId: string) {
    try {
      const orderEngine = getOrderMatchingEngine(sessionId);
      const portfolioEngine = getPortfolioEngine(sessionId);

      // Order engine events
      orderEngine.on('orderExecuted', (data) => {
        this.io.to(`session_${sessionId}`).emit('order_executed', {
          orderId: data.order.id,
          trades: data.executions,
          timestamp: new Date()
        });
      });

      orderEngine.on('tradeExecuted', (data) => {
        this.io.to(`session_${sessionId}`).emit('trade_executed', {
          securityId: data.securityId,
          price: data.price,
          quantity: data.quantity,
          timestamp: data.timestamp
        });

        // Update our market data cache
        if (data.securityId) {
          const currentData = this.marketData.get(data.securityId) || {
            symbol: data.securityId,
            lastPrice: data.price,
            bid: data.price * 0.999,
            ask: data.price * 1.001,
            bidSize: 100,
            askSize: 100,
            volume: 0,
            tick: 0
          };

          currentData.lastPrice = data.price;
          currentData.volume += data.quantity;
          currentData.tick += 1;
          currentData.bid = data.price * 0.999;
          currentData.ask = data.price * 1.001;

          this.marketData.set(data.securityId, currentData);

          // Broadcast market data update
          this.io.to(`session_${sessionId}`).emit('market_data', currentData);
        }
      });

      orderEngine.on('orderRejected', (data) => {
        this.io.to(`user_${data.order.userId}`).emit('order_rejected', {
          orderId: data.order.id,
          reason: data.reason || 'Order rejected',
          timestamp: new Date()
        });
      });

      // Portfolio engine events
      portfolioEngine.on('positionUpdate', (data) => {
        this.io.to(`user_${data.data.userId}`).emit('position_update', {
          securityId: data.data.securityId,
          quantity: data.data.quantity,
          avgPrice: data.data.avgPrice,
          marketValue: data.data.marketValue,
          unrealizedPnL: data.data.unrealizedPnL,
          realizedPnL: data.data.realizedPnL,
          timestamp: data.timestamp
        });

        // Also send to instructors monitoring this session
        this.io.to(`session_${sessionId}`).emit('participant_position_update', {
          userId: data.data.userId,
          securityId: data.data.securityId,
          quantity: data.data.quantity,
          marketValue: data.data.marketValue,
          unrealizedPnL: data.data.unrealizedPnL
        });
      });

      portfolioEngine.on('portfolioSummary', (data) => {
        this.io.to(`user_${data.data.userId}`).emit('portfolio_update', {
          totalValue: data.data.totalValue,
          totalPnL: data.data.totalPnL,
          totalUnrealizedPnL: data.data.totalUnrealizedPnL,
          totalRealizedPnL: data.data.totalRealizedPnL,
          cashBalance: data.data.cashBalance,
          positions: data.data.positions,
          timestamp: data.timestamp
        });

        // Send summary to instructors
        this.io.to(`session_${sessionId}`).emit('participant_portfolio_update', {
          userId: data.data.userId,
          totalValue: data.data.totalValue,
          totalPnL: data.data.totalPnL,
          positionCount: data.data.positions.length
        });
      });

      portfolioEngine.on('pnlUpdate', (data) => {
        this.io.to(`user_${data.data.userId}`).emit('pnl_update', {
          securityId: data.data.securityId,
          oldUnrealizedPnL: data.data.oldUnrealizedPnL,
          newUnrealizedPnL: data.data.newUnrealizedPnL,
          priceChange: data.data.priceChange,
          timestamp: data.timestamp
        });
      });

      console.log(`Integrated engines for session ${sessionId}`);
    } catch (error) {
      console.error(`Error integrating engines for session ${sessionId}:`, error);
    }
  }

  /**
   * Enhanced join session that integrates with new engines
   */
  private async enhancedJoinSession(sessionId: string, userId: string, role: string) {
    // Integrate engines for this session if not already done
    this.integrateSessionEngines(sessionId);

    // Initialize portfolio engine for this user if needed
    const portfolioEngine = getPortfolioEngine(sessionId);
    
    // Send initial portfolio state
    try {
      const portfolio = await portfolioEngine.getPortfolioSummary(userId);
      this.io.to(`user_${userId}`).emit('portfolio_update', {
        totalValue: portfolio.totalValue,
        totalPnL: portfolio.totalPnL,
        totalUnrealizedPnL: portfolio.totalUnrealizedPnL,
        totalRealizedPnL: portfolio.totalRealizedPnL,
        cashBalance: portfolio.cashBalance,
        positions: portfolio.positions,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Error sending initial portfolio state:', error);
    }

    // Send current order book state
    try {
      const orderEngine = getOrderMatchingEngine(sessionId);
      
      // Get order books for all securities in the session
      const securities = ['cmhb0lc0u002rre59urb9dyow']; // TODO: Get from session
      for (const securityId of securities) {
        const orderBook = orderEngine.getOrderBook(securityId);
        const marketPrice = orderEngine.getMarketPrice(securityId);
        
        this.io.to(`user_${userId}`).emit('orderbook_update', {
          securityId,
          bids: orderBook?.bids || [],
          asks: orderBook?.asks || [],
          marketPrice,
          timestamp: new Date()
        });
      }
    } catch (error) {
      console.error('Error sending initial order book state:', error);
    }
  }
}

export default TradingWebSocketServer;