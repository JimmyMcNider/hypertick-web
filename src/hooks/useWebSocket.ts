import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { OrderData, MarketData } from '@/lib/websocket-server';

interface WebSocketHookProps {
  sessionId?: string;
  userId?: string;
  role?: 'Student' | 'Instructor';
}

interface WebSocketState {
  connected: boolean;
  marketData: MarketData[];
  activeUsers: string[];
  orders: any[];
  trades: any[];
  error: string | null;
}

export const useWebSocket = ({ sessionId, userId, role }: WebSocketHookProps) => {
  const socket = useRef<Socket | null>(null);
  const [state, setState] = useState<WebSocketState>({
    connected: false,
    marketData: [],
    activeUsers: [],
    orders: [],
    trades: [],
    error: null
  });

  useEffect(() => {
    // Only connect if we have the required parameters
    if (!sessionId || !userId || !role) {
      return;
    }

    // Connect to WebSocket server
    socket.current = io(
      process.env.NODE_ENV === 'production' 
        ? 'https://hypertick-web.onrender.com' 
        : 'http://localhost:3000',
      {
        transports: ['websocket', 'polling']
      }
    );

    const currentSocket = socket.current;

    // Connection handlers
    currentSocket.on('connect', () => {
      console.log('Connected to WebSocket server');
      setState(prev => ({ ...prev, connected: true, error: null }));
      
      // Join the simulation session
      currentSocket.emit('join_session', {
        sessionId,
        userId,
        role
      });
    });

    currentSocket.on('disconnect', () => {
      console.log('Disconnected from WebSocket server');
      setState(prev => ({ ...prev, connected: false }));
    });

    // Market data handlers
    currentSocket.on('market_snapshot', (marketSnapshot: MarketData[]) => {
      setState(prev => ({ ...prev, marketData: marketSnapshot }));
    });

    currentSocket.on('market_update', (marketUpdate: MarketData) => {
      setState(prev => ({
        ...prev,
        marketData: prev.marketData.map(data => 
          data.symbol === marketUpdate.symbol ? marketUpdate : data
        )
      }));
    });

    // Trading handlers
    currentSocket.on('order_update', (data: { order: any; trades: any[]; marketUpdate: MarketData }) => {
      setState(prev => ({
        ...prev,
        orders: [data.order, ...prev.orders.slice(0, 49)], // Keep last 50 orders
        trades: [...data.trades, ...prev.trades.slice(0, 49)] // Keep last 50 trades
      }));
      
      if (data.marketUpdate) {
        setState(prev => ({
          ...prev,
          marketData: prev.marketData.map(md => 
            md.symbol === data.marketUpdate.symbol ? data.marketUpdate : md
          )
        }));
      }
    });

    currentSocket.on('order_rejected', (data: { orderId: string; reason: string }) => {
      console.error('Order rejected:', data);
      setState(prev => ({ ...prev, error: `Order rejected: ${data.reason}` }));
    });

    // Session management handlers
    currentSocket.on('user_joined', (data: { userId: string; role: string }) => {
      setState(prev => ({
        ...prev,
        activeUsers: [...new Set([...prev.activeUsers, data.userId])]
      }));
    });

    currentSocket.on('user_left', (data: { userId: string }) => {
      setState(prev => ({
        ...prev,
        activeUsers: prev.activeUsers.filter(id => id !== data.userId)
      }));
    });

    currentSocket.on('simulation_update', (update: any) => {
      console.log('Simulation update:', update);
      // Handle simulation state changes
    });

    currentSocket.on('market_state_change', (data: { marketOpen: boolean }) => {
      console.log('Market state changed:', data.marketOpen ? 'OPEN' : 'CLOSED');
      // Handle market open/close events
    });

    // Stop order triggering handler
    currentSocket.on('stop_order_triggered', (data: { orderId: string; triggerPrice: number; trades: any[] }) => {
      console.log('Stop order triggered:', data);
      setState(prev => ({ 
        ...prev, 
        trades: [...data.trades, ...prev.trades.slice(0, 49)],
        error: `Stop order triggered at $${data.triggerPrice.toFixed(2)}`
      }));
    });

    // Portfolio and position handlers
    currentSocket.on('portfolio_update', (portfolio: any) => {
      console.log('Portfolio updated:', portfolio);
      // This will be handled by the trading terminal component
    });

    currentSocket.on('position_update', (data: { symbol: string; position: any }) => {
      console.log('Position updated:', data);
      // This will be handled by the trading terminal component
    });

    currentSocket.on('trade_executed', (trade: any) => {
      console.log('Trade executed:', trade);
      setState(prev => ({ 
        ...prev, 
        trades: [trade, ...prev.trades.slice(0, 49)]
      }));
    });

    currentSocket.on('error', (error: { message: string }) => {
      console.error('WebSocket error:', error.message);
      setState(prev => ({ ...prev, error: error.message }));
    });

    // Cleanup on unmount
    return () => {
      if (currentSocket) {
        currentSocket.disconnect();
      }
    };
  }, [sessionId, userId, role]);

  // Helper functions for trading actions
  const submitOrder = (orderData: Omit<OrderData, 'id' | 'userId'>) => {
    if (!socket.current || !userId) {
      console.error('Cannot submit order: not connected or no user ID');
      return;
    }

    const fullOrderData: OrderData = {
      ...orderData,
      id: `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId
    };

    socket.current.emit('submit_order', fullOrderData);
  };

  const clearError = () => {
    setState(prev => ({ ...prev, error: null }));
  };

  return {
    ...state,
    submitOrder,
    clearError,
    socket: socket.current
  };
};