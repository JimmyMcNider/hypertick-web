/**
 * React Hook for WebSocket Connection Management
 * 
 * Provides automatic connection management, authentication,
 * and event handling for React components
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { websocketClient, ConnectionStats } from '@/lib/websocket-client';

export interface UseWebSocketOptions {
  autoConnect?: boolean;
  requireAuth?: boolean;
  sessionId?: string;
  onConnect?: () => void;
  onDisconnect?: (reason: string) => void;
  onAuthenticated?: (data: any) => void;
  onAuthError?: (error: any) => void;
  onReconnected?: () => void;
  onError?: (error: any) => void;
}

export interface WebSocketHookReturn {
  isConnected: boolean;
  isAuthenticated: boolean;
  isReconnecting: boolean;
  connectionQuality: ConnectionStats['quality'];
  stats: ConnectionStats;
  connect: () => Promise<void>;
  disconnect: () => void;
  emit: (event: string, data: any, priority?: 'HIGH' | 'MEDIUM' | 'LOW') => void;
  joinSession: (sessionId: string) => Promise<void>;
  leaveSession: () => void;
  lastError: string | null;
}

export function useWebSocket(options: UseWebSocketOptions = {}): WebSocketHookReturn {
  const {
    autoConnect = true,
    requireAuth = true,
    sessionId,
    onConnect,
    onDisconnect,
    onAuthenticated,
    onAuthError,
    onReconnected,
    onError
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [connectionQuality, setConnectionQuality] = useState<ConnectionStats['quality']>('DISCONNECTED');
  const [stats, setStats] = useState<ConnectionStats>(websocketClient.getStats());
  const [lastError, setLastError] = useState<string | null>(null);
  
  const eventHandlersRef = useRef<Map<string, Function>>(new Map());
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Connect to WebSocket with authentication
   */
  const connect = useCallback(async () => {
    try {
      setLastError(null);
      
      const token = localStorage.getItem('auth_token');
      if (requireAuth && !token) {
        throw new Error('Authentication token not found');
      }

      if (token) {
        websocketClient.setAuthToken(token);
      }

      await websocketClient.connect();
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Connection failed';
      setLastError(errorMessage);
      onError?.(error);
      throw error;
    }
  }, [requireAuth, onError]);

  /**
   * Disconnect from WebSocket
   */
  const disconnect = useCallback(() => {
    setLastError(null);
    websocketClient.disconnect();
  }, []);

  /**
   * Emit event to server
   */
  const emit = useCallback((event: string, data: any, priority: 'HIGH' | 'MEDIUM' | 'LOW' = 'MEDIUM') => {
    websocketClient.emit(event, data, priority);
  }, []);

  /**
   * Join a session
   */
  const joinSession = useCallback(async (sessionId: string) => {
    try {
      await websocketClient.joinSession(sessionId);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to join session';
      setLastError(errorMessage);
      throw error;
    }
  }, []);

  /**
   * Leave current session
   */
  const leaveSession = useCallback(() => {
    websocketClient.leaveSession();
  }, []);

  /**
   * Update stats periodically
   */
  useEffect(() => {
    const updateStats = () => {
      const currentStats = websocketClient.getStats();
      setStats(currentStats);
      setIsConnected(currentStats.isConnected);
      setIsAuthenticated(currentStats.isAuthenticated);
      setConnectionQuality(currentStats.quality);
      setIsReconnecting(currentStats.reconnectAttempts > 0 && !currentStats.isConnected);
    };

    updateStats();
    const interval = setInterval(updateStats, 1000);
    
    return () => clearInterval(interval);
  }, []);

  /**
   * Setup event handlers
   */
  useEffect(() => {
    const handlers = new Map<string, Function>();

    // Connection events
    const handleConnected = () => {
      setIsConnected(true);
      setIsReconnecting(false);
      setLastError(null);
      onConnect?.();
    };

    const handleDisconnected = (data: { reason: string }) => {
      setIsConnected(false);
      onDisconnect?.(data.reason);
    };

    const handleAuthenticated = (data: any) => {
      setIsAuthenticated(true);
      setLastError(null);
      onAuthenticated?.(data);
    };

    const handleAuthError = (error: any) => {
      setIsAuthenticated(false);
      const errorMessage = error.error || 'Authentication failed';
      setLastError(errorMessage);
      onAuthError?.(error);
    };

    const handleReconnected = () => {
      setIsReconnecting(false);
      setLastError(null);
      onReconnected?.();
    };

    const handleConnectError = (error: any) => {
      const errorMessage = error.message || 'Connection error';
      setLastError(errorMessage);
      onError?.(error);
    };

    const handleMaxReconnects = () => {
      setIsReconnecting(false);
      setLastError('Max reconnection attempts reached');
      onError?.(new Error('Max reconnection attempts reached'));
    };

    // Register handlers
    handlers.set('connected', handleConnected);
    handlers.set('disconnected', handleDisconnected);
    handlers.set('authenticated', handleAuthenticated);
    handlers.set('auth_error', handleAuthError);
    handlers.set('reconnected', handleReconnected);
    handlers.set('connect_error', handleConnectError);
    handlers.set('max_reconnects_reached', handleMaxReconnects);

    // Subscribe to events
    handlers.forEach((handler, event) => {
      websocketClient.on(event, handler);
    });

    eventHandlersRef.current = handlers;

    return () => {
      // Cleanup handlers
      handlers.forEach((handler, event) => {
        websocketClient.off(event, handler);
      });
    };
  }, [onConnect, onDisconnect, onAuthenticated, onAuthError, onReconnected, onError]);

  /**
   * Auto-connect on mount
   */
  useEffect(() => {
    if (autoConnect && !isConnected && !isReconnecting) {
      connect().catch(error => {
        console.error('Auto-connect failed:', error);
      });
    }
  }, [autoConnect, isConnected, isReconnecting, connect]);

  /**
   * Auto-join session if provided
   */
  useEffect(() => {
    if (sessionId && isAuthenticated && !isReconnecting) {
      joinSession(sessionId).catch(error => {
        console.error('Auto-join session failed:', error);
      });
    }
  }, [sessionId, isAuthenticated, isReconnecting, joinSession]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  return {
    isConnected,
    isAuthenticated,
    isReconnecting,
    connectionQuality,
    stats,
    connect,
    disconnect,
    emit,
    joinSession,
    leaveSession,
    lastError
  };
}

/**
 * Hook for listening to specific WebSocket events
 */
export function useWebSocketEvent<T = any>(
  event: string,
  handler: (data: T) => void,
  deps: React.DependencyList = []
): void {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const eventHandler = (data: T) => {
      handlerRef.current(data);
    };

    websocketClient.on(event, eventHandler);

    return () => {
      websocketClient.off(event, eventHandler);
    };
  }, [event, ...deps]);
}

/**
 * Hook for session-specific WebSocket functionality
 */
export function useWebSocketSession(sessionId?: string) {
  const ws = useWebSocket({
    sessionId,
    requireAuth: true
  });

  const [sessionState, setSessionState] = useState<any>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [marketData, setMarketData] = useState<Map<string, any>>(new Map());

  // Session state updates
  useWebSocketEvent('session_state', (state: any) => {
    setSessionState(state);
    if (state.participants) {
      setParticipants(state.participants);
    }
  });

  // Participant updates
  useWebSocketEvent('participant_joined', (data: any) => {
    setParticipants(prev => [...prev.filter(p => p.userId !== data.userId), data]);
  });

  useWebSocketEvent('participant_left', (data: { userId: string }) => {
    setParticipants(prev => prev.filter(p => p.userId !== data.userId));
  });

  // Market data updates
  useWebSocketEvent('market_data', (data: { symbol: string; [key: string]: any }) => {
    setMarketData(prev => new Map(prev.set(data.symbol, data)));
  });

  // Session management functions
  const placeOrder = useCallback((orderData: any) => {
    ws.emit('place_order', orderData, 'HIGH');
  }, [ws]);

  const cancelOrder = useCallback((orderId: string) => {
    ws.emit('cancel_order', { orderId }, 'HIGH');
  }, [ws]);

  const placeBid = useCallback((auctionId: string, amount: number) => {
    ws.emit('place_bid', { auctionId, amount }, 'HIGH');
  }, [ws]);

  const getPortfolio = useCallback(() => {
    ws.emit('get_portfolio', {}, 'MEDIUM');
  }, [ws]);

  const getMarketData = useCallback((symbol: string) => {
    ws.emit('get_market_data', { symbol }, 'MEDIUM');
  }, [ws]);

  return {
    ...ws,
    sessionState,
    participants,
    marketData: Object.fromEntries(marketData),
    placeOrder,
    cancelOrder,
    placeBid,
    getPortfolio,
    getMarketData
  };
}

/**
 * Hook for instructor-specific WebSocket functionality
 */
export function useWebSocketInstructor() {
  const ws = useWebSocket({
    requireAuth: true
  });

  const executeCommand = useCallback((command: string, parameters: any) => {
    ws.emit('instructor_command', { command, parameters }, 'HIGH');
  }, [ws]);

  const injectNews = useCallback((newsData: {
    symbol?: string;
    title: string;
    content: string;
    impact: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
    severity: 'LOW' | 'MEDIUM' | 'HIGH';
    duration: number;
  }) => {
    ws.emit('inject_news', newsData, 'HIGH');
  }, [ws]);

  const createPriceShock = useCallback((symbol: string, magnitude: number, direction: 'UP' | 'DOWN') => {
    ws.emit('create_price_shock', { symbol, magnitude, direction }, 'HIGH');
  }, [ws]);

  const startMarket = useCallback((symbols?: string[]) => {
    ws.emit('start_market', { symbols }, 'HIGH');
  }, [ws]);

  const stopMarket = useCallback(() => {
    ws.emit('stop_market', {}, 'HIGH');
  }, [ws]);

  return {
    ...ws,
    executeCommand,
    injectNews,
    createPriceShock,
    startMarket,
    stopMarket
  };
}