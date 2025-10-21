/**
 * WebSocket Server for Real-time Communication
 * 
 * Handles real-time updates for trading, market data, session events,
 * and instructor controls. Maintains separate channels for different
 * types of data and user roles.
 */

import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { enhancedSessionEngine, ActiveSession, SessionParticipant } from './enhanced-session-engine';
import { authService } from './auth';
import { prisma } from './db';
import { tradingEngine } from './trading-engine';
import { getRedisClient, setSession, getSession } from './redis';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userRole?: 'STUDENT' | 'INSTRUCTOR' | 'ADMIN';
  sessionId?: string;
  classId?: string;
}

interface MarketDataUpdate {
  securityId: string;
  symbol: string;
  bid?: number;
  ask?: number;
  last?: number;
  volume: number;
  timestamp: Date;
}

interface OrderUpdate {
  orderId: string;
  userId: string;
  type: 'NEW' | 'FILLED' | 'CANCELLED' | 'REJECTED';
  order: any;
  execution?: any;
}

interface PositionUpdate {
  userId: string;
  positions: any[];
  equity: number;
  pnl: number;
}

interface SessionUpdate {
  sessionId: string;
  type: 'STATUS_CHANGE' | 'PARTICIPANT_JOIN' | 'PARTICIPANT_LEAVE' | 'MARKET_STATE' | 'TIME_UPDATE';
  data: any;
}

interface AuctionUpdate {
  auctionId: string;
  type: 'CREATED' | 'STARTED' | 'BID_PLACED' | 'ROUND_COMPLETE' | 'COMPLETED';
  data: any;
}

/**
 * WebSocket server class for real-time communication
 */
export class WebSocketServer {
  private io: SocketIOServer;
  private connections: Map<string, AuthenticatedSocket> = new Map();
  private sessionRooms: Map<string, Set<string>> = new Map(); // sessionId -> userIds
  private classRooms: Map<string, Set<string>> = new Map(); // classId -> userIds

  constructor(httpServer: HTTPServer) {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true
      },
      transports: ['websocket', 'polling']
    });

    this.setupEventHandlers();
    this.setupSessionEngineListeners();
    this.setupTradingEngineListeners();
  }

  /**
   * Setup main socket event handlers
   */
  private setupEventHandlers(): void {
    this.io.on('connection', (socket: AuthenticatedSocket) => {
      console.log(`Socket connected: ${socket.id}`);

      // Authentication middleware
      socket.on('authenticate', async (data: { token: string }) => {
        try {
          const authUser = await authService.verifyToken(data.token);
          const userId = authUser.id;
          if (!userId) throw new Error('Invalid token');

          const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, username: true, firstName: true, lastName: true, role: true }
          });

          if (!user) throw new Error('User not found');

          socket.userId = user.id;
          socket.userRole = user.role;
          
          this.connections.set(socket.id, socket);
          
          socket.emit('authenticated', { 
            userId: user.id, 
            role: user.role,
            username: user.username,
            fullName: `${user.firstName} ${user.lastName}`
          });
          
          console.log(`User authenticated: ${user.username} (${user.role})`);
        } catch (error) {
          socket.emit('auth_error', { error: 'Invalid token' });
          socket.disconnect();
        }
      });

      // Join session room
      socket.on('join_session', async (data: { sessionId: string }) => {
        if (!socket.userId) {
          socket.emit('error', { error: 'Not authenticated' });
          return;
        }

        try {
          // Verify user has access to this session
          const sessionUser = await prisma.sessionUser.findUnique({
            where: {
              sessionId_userId: {
                sessionId: data.sessionId,
                userId: socket.userId
              }
            },
            include: {
              session: true,
              user: true
            }
          });

          if (!sessionUser && socket.userRole !== 'INSTRUCTOR' && socket.userRole !== 'ADMIN') {
            socket.emit('error', { error: 'Access denied to session' });
            return;
          }

          socket.sessionId = data.sessionId;
          socket.classId = sessionUser?.session.classId;
          
          // Join room
          socket.join(`session:${data.sessionId}`);
          
          // Track in session room
          if (!this.sessionRooms.has(data.sessionId)) {
            this.sessionRooms.set(data.sessionId, new Set());
          }
          this.sessionRooms.get(data.sessionId)!.add(socket.userId);

          // Add participant to enhanced session engine
          if (socket.userId && socket.userRole) {
            const participant: SessionParticipant = {
              id: socket.userId,
              username: user?.username || 'Unknown',
              role: socket.userRole,
              privileges: new Set([1, 8, 9, 13, 15]), // Default privileges
              socketId: socket.id,
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
          }

          // Send current session state
          const sessionState = enhancedSessionEngine.getSession(data.sessionId);
          if (sessionState) {
            socket.emit('session_state', sessionState);
          }

          // Notify others of participant join
          socket.to(`session:${data.sessionId}`).emit('participant_joined', {
            userId: socket.userId,
            username: sessionUser?.user.username || 'Unknown'
          });

          console.log(`User ${socket.userId} joined session ${data.sessionId}`);
        } catch (error) {
          socket.emit('error', { error: 'Failed to join session' });
        }
      });

      // Leave session room
      socket.on('leave_session', () => {
        if (socket.sessionId && socket.userId) {
          socket.leave(`session:${socket.sessionId}`);
          
          // Remove from enhanced session engine
          enhancedSessionEngine.removeParticipant(socket.sessionId, socket.userId);
          
          const sessionRoom = this.sessionRooms.get(socket.sessionId);
          if (sessionRoom) {
            sessionRoom.delete(socket.userId);
            if (sessionRoom.size === 0) {
              this.sessionRooms.delete(socket.sessionId);
            }
          }

          socket.to(`session:${socket.sessionId}`).emit('participant_left', {
            userId: socket.userId
          });

          socket.sessionId = undefined;
          socket.classId = undefined;
        }
      });

      // Order management
      socket.on('place_order', async (orderData: any) => {
        if (!socket.userId || !socket.sessionId) {
          socket.emit('error', { error: 'Not authenticated or in session' });
          return;
        }

        try {
          // Process order through trading engine
          const result = await tradingEngine.placeOrder(socket.sessionId, socket.userId, orderData);
          
          if (result.success) {
            socket.emit('order_response', { success: true, orderId: result.orderId });
          } else {
            socket.emit('order_error', { error: result.error });
          }

        } catch (error) {
          socket.emit('order_error', { error: 'Order processing failed' });
        }
      });

      // Cancel order
      socket.on('cancel_order', async (data: { orderId: string }) => {
        if (!socket.userId || !socket.sessionId) {
          socket.emit('error', { error: 'Not authenticated or in session' });
          return;
        }

        try {
          const result = await tradingEngine.cancelOrder(data.orderId);
          socket.emit('cancel_response', result);
        } catch (error) {
          socket.emit('error', { error: 'Cancel order failed' });
        }
      });

      // Get portfolio
      socket.on('get_portfolio', (data: any) => {
        if (!socket.userId) {
          socket.emit('error', { error: 'Not authenticated' });
          return;
        }

        try {
          const positions = tradingEngine.getUserPositions(socket.userId);
          socket.emit('portfolio_update', { positions });
        } catch (error) {
          socket.emit('error', { error: 'Portfolio retrieval failed' });
        }
      });

      // Get market data
      socket.on('get_market_data', (data: { symbol: string }) => {
        const marketData = tradingEngine.getMarketData(data.symbol);
        const orderBook = tradingEngine.getOrderBook(data.symbol);
        
        socket.emit('market_data_response', {
          symbol: data.symbol,
          marketData,
          orderBook
        });
      });

      // Auction bidding
      socket.on('place_bid', async (bidData: { auctionId: string; amount: number }) => {
        if (!socket.userId || !socket.sessionId) {
          socket.emit('error', { error: 'Not authenticated or in session' });
          return;
        }

        try {
          // Process bid (will implement auction engine later)
          await this.processBid(socket.sessionId, socket.userId, bidData);
          
        } catch (error) {
          socket.emit('bid_error', { error: error.message });
        }
      });

      // Instructor controls
      socket.on('instructor_command', async (commandData: any) => {
        if (socket.userRole !== 'INSTRUCTOR' && socket.userRole !== 'ADMIN') {
          socket.emit('error', { error: 'Insufficient permissions' });
          return;
        }

        if (!socket.sessionId) {
          socket.emit('error', { error: 'Not in session' });
          return;
        }

        try {
          await this.processInstructorCommand(socket.sessionId, commandData);
          socket.emit('command_response', { success: true, command: commandData.command });
        } catch (error) {
          socket.emit('command_error', { error: 'Command execution failed' });
        }
      });

      // Start market simulation
      socket.on('start_market', async (data: { symbols?: string[] }) => {
        if (socket.userRole !== 'INSTRUCTOR' && socket.userRole !== 'ADMIN') {
          socket.emit('error', { error: 'Insufficient permissions' });
          return;
        }

        if (!socket.sessionId) {
          socket.emit('error', { error: 'Not in session' });
          return;
        }

        try {
          const symbols = data.symbols || ['AOE', 'BOND1', 'BOND2'];
          tradingEngine.startMarketSimulation(socket.sessionId, symbols);
          socket.emit('market_start_response', { success: true, symbols });
        } catch (error) {
          socket.emit('error', { error: 'Failed to start market' });
        }
      });

      // Stop market simulation
      socket.on('stop_market', async () => {
        if (socket.userRole !== 'INSTRUCTOR' && socket.userRole !== 'ADMIN') {
          socket.emit('error', { error: 'Insufficient permissions' });
          return;
        }

        if (!socket.sessionId) {
          socket.emit('error', { error: 'Not in session' });
          return;
        }

        try {
          tradingEngine.stopMarketSimulation(socket.sessionId);
          socket.emit('market_stop_response', { success: true });
        } catch (error) {
          socket.emit('error', { error: 'Failed to stop market' });
        }
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        console.log(`Socket disconnected: ${socket.id}`);
        
        // Clean up rooms
        if (socket.sessionId) {
          const sessionRoom = this.sessionRooms.get(socket.sessionId);
          if (sessionRoom && socket.userId) {
            sessionRoom.delete(socket.userId);
            
            socket.to(`session:${socket.sessionId}`).emit('participant_left', {
              userId: socket.userId
            });
          }
        }

        this.connections.delete(socket.id);
      });
    });
  }

  /**
   * Setup listeners for enhanced session engine events
   */
  private setupSessionEngineListeners(): void {
    enhancedSessionEngine.on('session_started', (data: { sessionId: string; session: ActiveSession }) => {
      this.broadcastToSession(data.sessionId, 'session_started', {
        sessionId: data.sessionId,
        status: data.session.status,
        startTime: data.session.startTime,
        lesson: {
          title: data.session.currentLesson.title,
          scenario: data.session.scenario
        }
      });
    });

    enhancedSessionEngine.on('session_completed', (data: { sessionId: string; session: ActiveSession }) => {
      this.broadcastToSession(data.sessionId, 'session_ended', {
        sessionId: data.sessionId,
        status: data.session.status,
        endTime: data.session.endTime,
        duration: data.session.endTime ? 
          data.session.endTime.getTime() - data.session.startTime.getTime() : 0
      });
    });

    enhancedSessionEngine.on('session_paused', (data: { sessionId: string }) => {
      this.broadcastToSession(data.sessionId, 'session_paused', {
        sessionId: data.sessionId,
        timestamp: new Date()
      });
    });

    enhancedSessionEngine.on('session_resumed', (data: { sessionId: string }) => {
      this.broadcastToSession(data.sessionId, 'session_resumed', {
        sessionId: data.sessionId,
        timestamp: new Date()
      });
    });

    enhancedSessionEngine.on('command_executed', (data: { sessionId: string; command: any; session: ActiveSession }) => {
      this.broadcastToSession(data.sessionId, 'command_executed', {
        command: data.command,
        timestamp: new Date(),
        executedCommands: data.session.executedCommands.size,
        pendingCommands: data.session.pendingCommands.length
      });
    });

    enhancedSessionEngine.on('market_opened', (data: { sessionId: string; symbols?: string[] }) => {
      this.broadcastToSession(data.sessionId, 'market_opened', {
        symbols: data.symbols,
        timestamp: new Date()
      });
    });

    enhancedSessionEngine.on('market_closed', (data: { sessionId: string; symbols?: string[] }) => {
      this.broadcastToSession(data.sessionId, 'market_closed', {
        symbols: data.symbols,
        timestamp: new Date()
      });
    });

    enhancedSessionEngine.on('auction_started', (data: any) => {
      this.broadcastToSession(data.sessionId, 'auction_started', {
        auctionId: data.auctionId,
        symbol: data.symbol,
        endTime: data.endTime,
        minimumBid: data.minimumBid,
        timestamp: new Date()
      });
    });

    enhancedSessionEngine.on('auction_ended', (data: any) => {
      this.broadcastToSession(data.sessionId, 'auction_ended', {
        auctionId: data.auctionId,
        winner: data.winner,
        winningBid: data.winningBid,
        timestamp: new Date()
      });
    });

    enhancedSessionEngine.on('news_injected', (data: { sessionId: string; news: any }) => {
      this.broadcastToSession(data.sessionId, 'news_update', data.news);
    });

    enhancedSessionEngine.on('price_updated', (data: { sessionId: string; symbol: string; price: number; volume?: number }) => {
      this.broadcastToSession(data.sessionId, 'price_update', {
        symbol: data.symbol,
        price: data.price,
        volume: data.volume,
        timestamp: new Date()
      });
    });

    enhancedSessionEngine.on('privilege_granted', (data: { sessionId: string; privilegeCode: number; targetRole?: string; targetUsers?: string[] }) => {
      this.broadcastToSession(data.sessionId, 'privilege_granted', {
        privilegeCode: data.privilegeCode,
        targetRole: data.targetRole,
        targetUsers: data.targetUsers,
        timestamp: new Date()
      });
    });

    enhancedSessionEngine.on('participant_joined', (data: { sessionId: string; participant: SessionParticipant }) => {
      this.broadcastToSession(data.sessionId, 'participant_joined', {
        userId: data.participant.id,
        username: data.participant.username,
        role: data.participant.role,
        timestamp: new Date()
      });
    });

    enhancedSessionEngine.on('participant_left', (data: { sessionId: string; participantId: string }) => {
      this.broadcastToSession(data.sessionId, 'participant_left', {
        userId: data.participantId,
        timestamp: new Date()
      });
    });
  }

  /**
   * Broadcast message to all users in a session
   */
  public broadcastToSession(sessionId: string, event: string, data: any): void {
    this.io.to(`session:${sessionId}`).emit(event, data);
  }

  /**
   * Broadcast message to all users in a class
   */
  public broadcastToClass(classId: string, event: string, data: any): void {
    this.io.to(`class:${classId}`).emit(event, data);
  }

  /**
   * Send market data update
   */
  public broadcastMarketData(sessionId: string, marketData: MarketDataUpdate): void {
    this.broadcastToSession(sessionId, 'market_data', marketData);
  }

  /**
   * Send order update
   */
  public broadcastOrderUpdate(sessionId: string, orderUpdate: OrderUpdate): void {
    // Send to all session participants
    this.broadcastToSession(sessionId, 'order_update', orderUpdate);
    
    // Send private update to order owner
    this.sendToUser(orderUpdate.userId, 'my_order_update', orderUpdate);
  }

  /**
   * Send position update
   */
  public broadcastPositionUpdate(sessionId: string, positionUpdate: PositionUpdate): void {
    // Send private update to user
    this.sendToUser(positionUpdate.userId, 'position_update', positionUpdate);
  }

  /**
   * Send message to specific user
   */
  public sendToUser(userId: string, event: string, data: any): void {
    const userSockets = Array.from(this.connections.values())
      .filter(socket => socket.userId === userId);
    
    userSockets.forEach(socket => {
      socket.emit(event, data);
    });
  }

  /**
   * Send message to users with specific role in session
   */
  public broadcastToRole(sessionId: string, role: 'STUDENT' | 'INSTRUCTOR' | 'ADMIN', event: string, data: any): void {
    const roleSockets = Array.from(this.connections.values())
      .filter(socket => socket.sessionId === sessionId && socket.userRole === role);
    
    roleSockets.forEach(socket => {
      socket.emit(event, data);
    });
  }

  /**
   * Setup trading engine event listeners
   */
  private setupTradingEngineListeners(): void {
    // Market data updates
    tradingEngine.on('market_data', (data: { sessionId: string; symbol: string; data: any }) => {
      this.broadcastToSession(data.sessionId, 'market_data', {
        symbol: data.symbol,
        ...data.data
      });
    });

    // Order book updates
    tradingEngine.on('order_book_update', (data: { symbol: string; orderBook: any }) => {
      // Broadcast to all sessions that have this symbol active
      this.io.emit('order_book_update', {
        symbol: data.symbol,
        orderBook: data.orderBook
      });
    });

    // Order status updates
    tradingEngine.on('order_placed', (data: { sessionId: string; userId: string; order: any }) => {
      this.broadcastToSession(data.sessionId, 'order_update', {
        type: 'PLACED',
        order: data.order,
        userId: data.userId
      });
    });

    tradingEngine.on('order_filled', (data: { sessionId: string; order: any; trade: any; fillQuantity: number; fillPrice: number }) => {
      this.broadcastToSession(data.sessionId, 'order_update', {
        type: 'FILLED',
        order: data.order,
        trade: data.trade,
        fillQuantity: data.fillQuantity,
        fillPrice: data.fillPrice
      });

      // Send trade execution to order owner
      const sessionUser = data.order.sessionUserId;
      this.sendToUser(data.order.userId || sessionUser, 'trade_execution', {
        orderId: data.order.id,
        symbol: data.order.symbol,
        side: data.order.side,
        quantity: data.fillQuantity,
        price: data.fillPrice,
        timestamp: data.trade.timestamp
      });
    });

    tradingEngine.on('order_cancelled', (data: { order: any }) => {
      this.io.emit('order_update', {
        type: 'CANCELLED',
        order: data.order
      });
    });

    tradingEngine.on('order_rejected', (data: { order: any; reason: string }) => {
      this.sendToUser(data.order.userId, 'order_update', {
        type: 'REJECTED',
        order: data.order,
        reason: data.reason
      });
    });

    // Position updates
    tradingEngine.on('position_updated', (data: { userId: string; symbol: string; position: any }) => {
      this.sendToUser(data.userId, 'position_update', {
        symbol: data.symbol,
        position: data.position
      });
    });

    // Market state changes
    tradingEngine.on('market_opened', (data: { sessionId: string; symbols: string[] }) => {
      this.broadcastToSession(data.sessionId, 'market_opened', {
        symbols: data.symbols,
        timestamp: new Date()
      });
    });

    tradingEngine.on('market_closed', (data: { sessionId: string; symbols: string[] }) => {
      this.broadcastToSession(data.sessionId, 'market_closed', {
        symbols: data.symbols,
        timestamp: new Date()
      });
    });
  }

  /**
   * Process auction bid (placeholder)
   */
  private async processBid(sessionId: string, userId: string, bidData: any): Promise<void> {
    // TODO: Implement with auction system
    this.broadcastToSession(sessionId, 'bid_placed', {
      auctionId: bidData.auctionId,
      userId,
      amount: bidData.amount,
      timestamp: new Date()
    });
  }

  /**
   * Process instructor command
   */
  private async processInstructorCommand(sessionId: string, commandData: any): Promise<void> {
    const { command, parameters } = commandData;
    
    // Execute command through enhanced session engine
    await enhancedSessionEngine.executeCommand(sessionId, { name: command, parameters });
  }

  /**
   * Get connection statistics
   */
  public getStats(): any {
    return {
      totalConnections: this.connections.size,
      activeSessions: this.sessionRooms.size,
      sessionRooms: Array.from(this.sessionRooms.entries()).map(([sessionId, users]) => ({
        sessionId,
        userCount: users.size
      }))
    };
  }
}

// Export singleton instance factory
export function createWebSocketServer(httpServer: HTTPServer): WebSocketServer {
  return new WebSocketServer(httpServer);
}