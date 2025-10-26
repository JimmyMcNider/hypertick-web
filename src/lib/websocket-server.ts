import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { PrismaClient } from '@prisma/client';

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
  type: 'MARKET' | 'LIMIT';
  timeInForce: 'GTC' | 'IOC' | 'FOK';
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

            // Send current market data to newly connected user
            const marketSnapshot = Array.from(this.marketData.values());
            socket.emit('market_snapshot', marketSnapshot);

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

      socket.on('disconnect', () => {
        // Clean up user from active sessions
        for (const [sessionId, users] of this.activeSessions.entries()) {
          for (const userId of users) {
            if (this.userSessions.get(userId) === sessionId) {
              users.delete(userId);
              this.userSessions.delete(userId);
              
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
      // Create order in database
      const order = await prisma.order.create({
        data: {
          sessionId,
          userId: orderData.userId,
          securityId: orderData.securityId,
          side: orderData.side,
          quantity: orderData.quantity,
          price: orderData.price,
          type: orderData.type,
          timeInForce: orderData.timeInForce,
          status: 'PENDING',
          submittedAt: new Date()
        },
        include: {
          user: true,
          security: true
        }
      });

      // Simple matching logic (would be more sophisticated in production)
      const trades = await this.matchOrder(order);

      return {
        success: true,
        order,
        trades,
        marketUpdate: this.getMarketUpdate(orderData.symbol)
      };
    } catch (error) {
      return {
        success: false,
        reason: 'Order processing failed'
      };
    }
  }

  private async matchOrder(order: any): Promise<any[]> {
    // Simplified matching engine - in production this would be much more sophisticated
    // For now, just mark order as filled at submitted price
    await prisma.order.update({
      where: { id: order.id },
      data: { status: 'FILLED' }
    });

    // Create an order execution record
    const execution = await prisma.orderExecution.create({
      data: {
        orderId: order.id,
        quantity: order.quantity,
        price: order.price || this.getMarketPrice(order.security.symbol)
        // timestamp is auto-generated
      }
    });

    return [execution];
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

    // Update with trade data
    currentData.lastPrice = lastTrade.price;
    currentData.volume += lastTrade.quantity;
    currentData.tick += 1;

    this.marketData.set(symbol, currentData);

    // Broadcast market update to all sessions
    this.io.emit('market_update', currentData);
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
}

export default TradingWebSocketServer;