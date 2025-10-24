/**
 * Enhanced WebSocket Client with Connection Stability
 * 
 * Provides automatic reconnection, authentication management,
 * heartbeat monitoring, and connection quality tracking
 */

import { io, Socket } from 'socket.io-client';

export interface ConnectionConfig {
  url: string;
  maxReconnectAttempts: number;
  reconnectDelay: number;
  heartbeatInterval: number;
  pingTimeout: number;
  authToken?: string;
}

export interface ConnectionStats {
  isConnected: boolean;
  isAuthenticated: boolean;
  reconnectAttempts: number;
  lastConnected?: Date;
  lastDisconnected?: Date;
  totalReconnects: number;
  averageLatency: number;
  quality: 'EXCELLENT' | 'GOOD' | 'POOR' | 'DISCONNECTED';
}

export interface MessageQueueItem {
  event: string;
  data: any;
  timestamp: Date;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  retryCount: number;
}

export class EnhancedWebSocketClient {
  private socket: Socket | null = null;
  private config: ConnectionConfig;
  private stats: ConnectionStats;
  private messageQueue: MessageQueueItem[] = [];
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private pingStartTimes: Map<string, number> = new Map();
  private latencyHistory: number[] = [];
  private eventHandlers: Map<string, Function[]> = new Map();
  private isReconnecting = false;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  
  constructor(config: Partial<ConnectionConfig> = {}) {
    this.config = {
      url: 'http://localhost:3000',
      maxReconnectAttempts: 10,
      reconnectDelay: 1000,
      heartbeatInterval: 30000,
      pingTimeout: 5000,
      ...config
    };
    
    this.stats = {
      isConnected: false,
      isAuthenticated: false,
      reconnectAttempts: 0,
      totalReconnects: 0,
      averageLatency: 0,
      quality: 'DISCONNECTED'
    };
  }

  /**
   * Connect to the WebSocket server
   */
  async connect(): Promise<void> {
    if (this.socket?.connected) {
      console.log('WebSocket already connected');
      return;
    }

    try {
      console.log('Connecting to WebSocket server...');
      
      this.socket = io(this.config.url, {
        transports: ['websocket', 'polling'],
        autoConnect: false,
        reconnection: false, // We handle reconnection manually
        timeout: 10000,
        forceNew: true
      });

      this.setupEventHandlers();
      this.socket.connect();

      // Wait for connection or timeout
      await this.waitForConnection();
      
      // Authenticate if token is available
      if (this.config.authToken) {
        await this.authenticate(this.config.authToken);
      }

      this.startHeartbeat();
      this.processMessageQueue();
      
    } catch (error) {
      console.error('Failed to connect to WebSocket:', error);
      this.handleConnectionError();
      throw error;
    }
  }

  /**
   * Disconnect from the WebSocket server
   */
  disconnect(): void {
    console.log('Disconnecting from WebSocket server...');
    
    this.stopHeartbeat();
    this.clearReconnectTimeout();
    
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    
    this.stats.isConnected = false;
    this.stats.isAuthenticated = false;
    this.stats.lastDisconnected = new Date();
    this.updateQuality();
    
    this.emitInternal('disconnected', { reason: 'manual' });
  }

  /**
   * Authenticate with the server
   */
  async authenticate(token: string): Promise<void> {
    if (!this.socket?.connected) {
      throw new Error('Not connected to server');
    }

    this.config.authToken = token;
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Authentication timeout'));
      }, 10000);

      this.socket!.once('authenticated', (data) => {
        clearTimeout(timeout);
        this.stats.isAuthenticated = true;
        console.log('WebSocket authenticated:', data);
        this.emitInternal('authenticated', data);
        resolve();
      });

      this.socket!.once('auth_error', (error) => {
        clearTimeout(timeout);
        this.stats.isAuthenticated = false;
        console.error('WebSocket authentication failed:', error);
        this.emitInternal('auth_error', error);
        reject(new Error(error.error || 'Authentication failed'));
      });

      this.socket!.emit('authenticate', { token });
    });
  }

  /**
   * Send message with automatic queuing and retry
   */
  emit(event: string, data: any = {}, priority: 'HIGH' | 'MEDIUM' | 'LOW' = 'MEDIUM'): void {
    const message: MessageQueueItem = {
      event,
      data,
      timestamp: new Date(),
      priority,
      retryCount: 0
    };

    if (this.socket?.connected && this.stats.isAuthenticated) {
      this.sendMessage(message);
    } else {
      this.queueMessage(message);
    }
  }

  /**
   * Subscribe to events
   */
  on(event: string, handler: Function): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(handler);

    // Also listen on the actual socket if connected
    if (this.socket) {
      this.socket.on(event, handler as any);
    }
  }

  /**
   * Unsubscribe from events
   */
  off(event: string, handler?: Function): void {
    if (handler) {
      const handlers = this.eventHandlers.get(event);
      if (handlers) {
        const index = handlers.indexOf(handler);
        if (index > -1) {
          handlers.splice(index, 1);
        }
      }
      
      if (this.socket) {
        this.socket.off(event, handler as any);
      }
    } else {
      this.eventHandlers.delete(event);
      if (this.socket) {
        this.socket.off(event);
      }
    }
  }

  /**
   * Get connection statistics
   */
  getStats(): ConnectionStats {
    return { ...this.stats };
  }

  /**
   * Get connection quality assessment
   */
  getQuality(): ConnectionStats['quality'] {
    return this.stats.quality;
  }

  /**
   * Clear message queue
   */
  clearQueue(): void {
    this.messageQueue = [];
  }

  /**
   * Join a session room
   */
  async joinSession(sessionId: string): Promise<void> {
    if (!this.socket?.connected || !this.stats.isAuthenticated) {
      throw new Error('Not connected or authenticated');
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Join session timeout'));
      }, 10000);

      this.socket!.once('session_state', () => {
        clearTimeout(timeout);
        resolve();
      });

      this.socket!.once('error', (error) => {
        clearTimeout(timeout);
        reject(new Error(error.error || 'Failed to join session'));
      });

      this.socket!.emit('join_session', { sessionId });
    });
  }

  /**
   * Leave current session
   */
  leaveSession(): void {
    if (this.socket?.connected) {
      this.socket.emit('leave_session');
    }
  }

  /**
   * Setup event handlers for the socket
   */
  private setupEventHandlers(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('WebSocket connected');
      this.stats.isConnected = true;
      this.stats.lastConnected = new Date();
      this.stats.reconnectAttempts = 0;
      this.isReconnecting = false;
      this.updateQuality();
      
      // Re-register event handlers
      this.eventHandlers.forEach((handlers, event) => {
        handlers.forEach(handler => {
          this.socket!.on(event, handler as any);
        });
      });

      this.emitInternal('connected');
    });

    this.socket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
      this.stats.isConnected = false;
      this.stats.isAuthenticated = false;
      this.stats.lastDisconnected = new Date();
      this.updateQuality();

      this.emitInternal('disconnected', { reason });

      // Attempt reconnection if not manual disconnect
      if (reason !== 'io client disconnect' && !this.isReconnecting) {
        this.handleReconnection();
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      this.emitInternal('connect_error', error);
      this.handleConnectionError();
    });

    this.socket.on('pong', () => {
      this.handlePong();
    });

    // Handle server events that need special processing
    this.socket.on('error', (error) => {
      console.error('WebSocket error:', error);
      this.emitInternal('error', error);
    });
  }

  /**
   * Wait for connection to be established
   */
  private waitForConnection(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.socket?.connected) {
        resolve();
        return;
      }

      const timeout = setTimeout(() => {
        reject(new Error('Connection timeout'));
      }, 10000);

      const onConnect = () => {
        clearTimeout(timeout);
        this.socket!.off('connect_error', onError);
        resolve();
      };

      const onError = (error: any) => {
        clearTimeout(timeout);
        this.socket!.off('connect', onConnect);
        reject(error);
      };

      this.socket!.once('connect', onConnect);
      this.socket!.once('connect_error', onError);
    });
  }

  /**
   * Handle connection errors
   */
  private handleConnectionError(): void {
    this.stats.isConnected = false;
    this.stats.isAuthenticated = false;
    this.updateQuality();

    if (!this.isReconnecting) {
      this.handleReconnection();
    }
  }

  /**
   * Handle automatic reconnection
   */
  private handleReconnection(): void {
    if (this.stats.reconnectAttempts >= this.config.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      this.emitInternal('max_reconnects_reached');
      return;
    }

    if (this.isReconnecting) {
      return;
    }

    this.isReconnecting = true;
    this.stats.reconnectAttempts++;

    const delay = Math.min(
      this.config.reconnectDelay * Math.pow(2, this.stats.reconnectAttempts - 1),
      30000
    );

    console.log(`Attempting reconnection ${this.stats.reconnectAttempts}/${this.config.maxReconnectAttempts} in ${delay}ms`);

    this.reconnectTimeout = setTimeout(async () => {
      try {
        await this.connect();
        this.stats.totalReconnects++;
        console.log('Reconnection successful');
        this.emitInternal('reconnected');
      } catch (error) {
        console.error('Reconnection failed:', error);
        this.isReconnecting = false;
        this.handleReconnection();
      }
    }, delay);
  }

  /**
   * Clear reconnection timeout
   */
  private clearReconnectTimeout(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }

  /**
   * Start heartbeat monitoring
   */
  private startHeartbeat(): void {
    this.stopHeartbeat();
    
    this.heartbeatInterval = setInterval(() => {
      if (this.socket?.connected) {
        const pingId = `ping_${Date.now()}`;
        this.pingStartTimes.set(pingId, Date.now());
        this.socket.emit('ping', { id: pingId });

        // Timeout check
        setTimeout(() => {
          if (this.pingStartTimes.has(pingId)) {
            console.warn('Ping timeout - connection may be unstable');
            this.pingStartTimes.delete(pingId);
            this.updateQuality();
          }
        }, this.config.pingTimeout);
      }
    }, this.config.heartbeatInterval);
  }

  /**
   * Stop heartbeat monitoring
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Handle pong response
   */
  private handlePong(): void {
    // Find the most recent ping and calculate latency
    const now = Date.now();
    let latency = 0;
    
    for (const [pingId, startTime] of this.pingStartTimes.entries()) {
      const pingLatency = now - startTime;
      if (pingLatency < this.config.pingTimeout) {
        latency = pingLatency;
        this.pingStartTimes.delete(pingId);
        break;
      }
    }

    if (latency > 0) {
      this.latencyHistory.push(latency);
      if (this.latencyHistory.length > 10) {
        this.latencyHistory.shift();
      }
      
      this.stats.averageLatency = this.latencyHistory.reduce((a, b) => a + b, 0) / this.latencyHistory.length;
      this.updateQuality();
    }
  }

  /**
   * Update connection quality assessment
   */
  private updateQuality(): void {
    if (!this.stats.isConnected) {
      this.stats.quality = 'DISCONNECTED';
    } else if (this.stats.averageLatency < 100) {
      this.stats.quality = 'EXCELLENT';
    } else if (this.stats.averageLatency < 300) {
      this.stats.quality = 'GOOD';
    } else {
      this.stats.quality = 'POOR';
    }
  }

  /**
   * Queue message for later sending
   */
  private queueMessage(message: MessageQueueItem): void {
    // Remove oldest low priority messages if queue is full
    if (this.messageQueue.length >= 100) {
      const lowPriorityIndex = this.messageQueue.findIndex(m => m.priority === 'LOW');
      if (lowPriorityIndex > -1) {
        this.messageQueue.splice(lowPriorityIndex, 1);
      } else {
        this.messageQueue.shift();
      }
    }

    this.messageQueue.push(message);
    
    // Sort by priority
    this.messageQueue.sort((a, b) => {
      const priorityOrder = { HIGH: 3, MEDIUM: 2, LOW: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * Send message directly
   */
  private sendMessage(message: MessageQueueItem): void {
    if (!this.socket?.connected) {
      this.queueMessage(message);
      return;
    }

    try {
      this.socket.emit(message.event, message.data);
    } catch (error) {
      console.error('Failed to send message:', error);
      message.retryCount++;
      
      if (message.retryCount < 3) {
        this.queueMessage(message);
      }
    }
  }

  /**
   * Process queued messages
   */
  private processMessageQueue(): void {
    if (!this.socket?.connected || !this.stats.isAuthenticated) {
      return;
    }

    const messagesToSend = [...this.messageQueue];
    this.messageQueue = [];

    messagesToSend.forEach(message => {
      this.sendMessage(message);
    });
  }

  /**
   * Emit event to internal handlers
   */
  private emitInternal(event: string, data?: any): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in event handler for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Set authentication token
   */
  public setAuthToken(token: string): void {
    this.config.authToken = token;
  }
}

// Create singleton instance
export const websocketClient = new EnhancedWebSocketClient();

// Export connection states
export const ConnectionState = {
  DISCONNECTED: 'DISCONNECTED',
  CONNECTING: 'CONNECTING',
  CONNECTED: 'CONNECTED',
  AUTHENTICATED: 'AUTHENTICATED',
  RECONNECTING: 'RECONNECTING',
  ERROR: 'ERROR'
} as const;

// Export for React hooks
export function useWebSocket() {
  return {
    client: websocketClient,
    connect: (token?: string) => {
      if (token) {
        websocketClient.setAuthToken(token);
      }
      return websocketClient.connect();
    },
    disconnect: () => websocketClient.disconnect(),
    emit: (event: string, data: any, priority?: 'HIGH' | 'MEDIUM' | 'LOW') => 
      websocketClient.emit(event, data, priority),
    on: (event: string, handler: Function) => websocketClient.on(event, handler),
    off: (event: string, handler?: Function) => websocketClient.off(event, handler),
    getStats: () => websocketClient.getStats(),
    joinSession: (sessionId: string) => websocketClient.joinSession(sessionId),
    leaveSession: () => websocketClient.leaveSession()
  };
}