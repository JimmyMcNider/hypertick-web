'use client';

import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

interface MarketData {
  symbol: string;
  bid: number;
  ask: number;
  last: number;
  change: number;
  changePercent: number;
  volume: number;
  timestamp: Date;
}

interface OrderBookLevel {
  price: number;
  size: number;
  orders: number;
}

interface OrderBook {
  symbol: string;
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  spread: number;
  timestamp: Date;
}

interface Order {
  id: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  type: 'MARKET' | 'LIMIT' | 'STOP';
  quantity: number;
  price?: number;
  status: string;
  timestamp: Date;
}

interface Position {
  symbol: string;
  quantity: number;
  avgPrice: number;
  marketValue: number;
  unrealizedPnL: number;
  realizedPnL: number;
}

interface TradingTerminalProps {
  sessionId: string;
  userId: string;
  token: string;
}

const TradingTerminal: React.FC<TradingTerminalProps> = ({ sessionId, userId, token }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [marketData, setMarketData] = useState<Map<string, MarketData>>(new Map());
  const [orderBooks, setOrderBooks] = useState<Map<string, OrderBook>>(new Map());
  const [activeOrders, setActiveOrders] = useState<Order[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [selectedSymbol, setSelectedSymbol] = useState('AOE');
  const [orderForm, setOrderForm] = useState({
    symbol: 'AOE',
    side: 'BUY' as 'BUY' | 'SELL',
    type: 'MARKET' as 'MARKET' | 'LIMIT' | 'STOP',
    quantity: 100,
    price: undefined as number | undefined
  });
  const [connectionStatus, setConnectionStatus] = useState('disconnected');

  const watchlistSymbols = ['AOE', 'BOND1', 'BOND2', 'BOND3', 'SPX'];

  useEffect(() => {
    if (!token || !userId) {
      setConnectionStatus('auth_error');
      return;
    }

    // Initialize WebSocket connection
    const newSocket = io('/', {
      transports: ['websocket', 'polling']
    });

    newSocket.on('connect', () => {
      setConnectionStatus('connected');
      
      // Authenticate
      newSocket.emit('authenticate', { token });
      
      // Join session
      setTimeout(() => {
        newSocket.emit('join_session', { sessionId });
      }, 500);
    });

    newSocket.on('disconnect', () => {
      setConnectionStatus('disconnected');
    });

    newSocket.on('authenticated', (data) => {
      console.log('Authenticated:', data);
      
      // Request initial data after authentication
      setTimeout(() => {
        watchlistSymbols.forEach(symbol => {
          newSocket.emit('get_market_data', { symbol });
        });
        newSocket.emit('get_portfolio', {});
      }, 1000);
    });

    newSocket.on('auth_error', (data) => {
      console.error('Auth error:', data);
      setConnectionStatus('auth_error');
    });

    // Market data updates
    newSocket.on('market_data', (data: MarketData) => {
      setMarketData(prev => new Map(prev.set(data.symbol, data)));
    });

    // Order book updates
    newSocket.on('order_book_update', (data: { symbol: string; orderBook: OrderBook }) => {
      setOrderBooks(prev => new Map(prev.set(data.symbol, data.orderBook)));
    });

    // Order updates
    newSocket.on('order_update', (data: any) => {
      if (data.type === 'PLACED') {
        setActiveOrders(prev => [...prev, data.order]);
      } else if (data.type === 'FILLED' || data.type === 'CANCELLED') {
        setActiveOrders(prev => prev.filter(order => order.id !== data.order.id));
      }
    });

    // Position updates
    newSocket.on('position_update', (data: { positions: Position[] }) => {
      setPositions(data.positions);
    });

    // Trade executions
    newSocket.on('trade_execution', (data: any) => {
      console.log('Trade executed:', data);
    });

    // Error handling
    newSocket.on('error', (data: { error: string }) => {
      console.error('Socket error:', data.error);
    });

    newSocket.on('order_error', (data: { error: string }) => {
      console.error('Order error:', data.error);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [sessionId, userId, token]);

  const handlePlaceOrder = () => {
    if (!socket) return;

    const orderData = {
      symbol: orderForm.symbol,
      side: orderForm.side,
      type: orderForm.type,
      quantity: orderForm.quantity,
      price: orderForm.type !== 'MARKET' ? orderForm.price : undefined,
      timeInForce: 'DAY'
    };

    socket.emit('place_order', orderData);
    
    // Reset form
    setOrderForm(prev => ({
      ...prev,
      quantity: 100,
      price: undefined
    }));
  };

  const handleCancelOrder = (orderId: string) => {
    if (!socket) return;
    socket.emit('cancel_order', { orderId });
  };

  const formatPrice = (price: number) => price.toFixed(2);
  const formatPercent = (percent: number) => {
    const sign = percent >= 0 ? '+' : '';
    return `${sign}${percent.toFixed(2)}%`;
  };

  const selectedMarketData = marketData.get(selectedSymbol);
  const selectedOrderBook = orderBooks.get(selectedSymbol);

  return (
    <div className="trading-terminal bg-gray-900 text-white p-4 space-y-4">
      {/* Connection Status */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Trading Terminal</h2>
        <div className={`px-3 py-1 rounded text-sm ${
          connectionStatus === 'connected' ? 'bg-green-600' : 
          connectionStatus === 'auth_error' ? 'bg-red-600' : 'bg-yellow-600'
        }`}>
          {connectionStatus === 'connected' ? 'Connected' :
           connectionStatus === 'auth_error' ? 'Auth Error' : 'Connecting...'}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Market Watch */}
        <div className="bg-gray-800 rounded p-4">
          <h3 className="text-lg font-semibold mb-3">Market Watch</h3>
          <div className="space-y-2">
            {watchlistSymbols.map(symbol => {
              const data = marketData.get(symbol);
              return (
                <div
                  key={symbol}
                  className={`p-2 rounded cursor-pointer ${
                    selectedSymbol === symbol ? 'bg-blue-600' : 'hover:bg-gray-700'
                  }`}
                  onClick={() => setSelectedSymbol(symbol)}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{symbol}</span>
                    {data && (
                      <div className="text-right">
                        <div className="text-sm">{formatPrice(data.last)}</div>
                        <div className={`text-xs ${
                          data.change >= 0 ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {formatPercent(data.changePercent)}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Order Book & Chart */}
        <div className="bg-gray-800 rounded p-4">
          <h3 className="text-lg font-semibold mb-3">Order Book - {selectedSymbol}</h3>
          {selectedMarketData && (
            <div className="mb-4 p-3 bg-gray-700 rounded">
              <div className="flex justify-between">
                <span>Last:</span>
                <span className="font-bold">{formatPrice(selectedMarketData.last)}</span>
              </div>
              <div className="flex justify-between">
                <span>Bid/Ask:</span>
                <span>{formatPrice(selectedMarketData.bid)} / {formatPrice(selectedMarketData.ask)}</span>
              </div>
              <div className="flex justify-between">
                <span>Change:</span>
                <span className={selectedMarketData.change >= 0 ? 'text-green-400' : 'text-red-400'}>
                  {formatPercent(selectedMarketData.changePercent)}
                </span>
              </div>
            </div>
          )}

          {selectedOrderBook && (
            <div className="space-y-2">
              <div>
                <h4 className="text-sm font-semibold text-red-400 mb-1">Asks</h4>
                {selectedOrderBook.asks.slice(0, 5).reverse().map((level, idx) => (
                  <div key={idx} className="flex justify-between text-sm">
                    <span className="text-red-400">{formatPrice(level.price)}</span>
                    <span>{level.size}</span>
                  </div>
                ))}
              </div>
              
              <div className="border-t border-gray-600 my-2 pt-2">
                <h4 className="text-sm font-semibold text-green-400 mb-1">Bids</h4>
                {selectedOrderBook.bids.slice(0, 5).map((level, idx) => (
                  <div key={idx} className="flex justify-between text-sm">
                    <span className="text-green-400">{formatPrice(level.price)}</span>
                    <span>{level.size}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Order Entry */}
        <div className="bg-gray-800 rounded p-4">
          <h3 className="text-lg font-semibold mb-3">Place Order</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">Symbol</label>
              <select
                value={orderForm.symbol}
                onChange={(e) => setOrderForm(prev => ({ ...prev, symbol: e.target.value }))}
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
              >
                {watchlistSymbols.map(symbol => (
                  <option key={symbol} value={symbol}>{symbol}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setOrderForm(prev => ({ ...prev, side: 'BUY' }))}
                className={`p-2 rounded font-semibold ${
                  orderForm.side === 'BUY' ? 'bg-green-600' : 'bg-gray-700 hover:bg-gray-600'
                }`}
              >
                BUY
              </button>
              <button
                onClick={() => setOrderForm(prev => ({ ...prev, side: 'SELL' }))}
                className={`p-2 rounded font-semibold ${
                  orderForm.side === 'SELL' ? 'bg-red-600' : 'bg-gray-700 hover:bg-gray-600'
                }`}
              >
                SELL
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Order Type</label>
              <select
                value={orderForm.type}
                onChange={(e) => setOrderForm(prev => ({ ...prev, type: e.target.value as any }))}
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
              >
                <option value="MARKET">Market</option>
                <option value="LIMIT">Limit</option>
                <option value="STOP">Stop</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Quantity</label>
              <input
                type="number"
                value={orderForm.quantity}
                onChange={(e) => setOrderForm(prev => ({ ...prev, quantity: parseInt(e.target.value) || 0 }))}
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
              />
            </div>

            {orderForm.type !== 'MARKET' && (
              <div>
                <label className="block text-sm font-medium mb-1">Price</label>
                <input
                  type="number"
                  step="0.01"
                  value={orderForm.price || ''}
                  onChange={(e) => setOrderForm(prev => ({ ...prev, price: parseFloat(e.target.value) || undefined }))}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
                />
              </div>
            )}

            <button
              onClick={handlePlaceOrder}
              disabled={connectionStatus !== 'connected'}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 py-2 rounded font-semibold"
            >
              Place Order
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Active Orders */}
        <div className="bg-gray-800 rounded p-4">
          <h3 className="text-lg font-semibold mb-3">Active Orders</h3>
          {activeOrders.length === 0 ? (
            <p className="text-gray-400">No active orders</p>
          ) : (
            <div className="space-y-2">
              {activeOrders.map(order => (
                <div key={order.id} className="flex justify-between items-center p-2 bg-gray-700 rounded">
                  <div>
                    <div className="font-medium">{order.symbol} {order.side}</div>
                    <div className="text-sm text-gray-400">
                      {order.type} • {order.quantity} @ {order.price ? formatPrice(order.price) : 'Market'}
                    </div>
                  </div>
                  <button
                    onClick={() => handleCancelOrder(order.id)}
                    className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-sm"
                  >
                    Cancel
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Positions */}
        <div className="bg-gray-800 rounded p-4">
          <h3 className="text-lg font-semibold mb-3">Positions</h3>
          {positions.length === 0 ? (
            <p className="text-gray-400">No positions</p>
          ) : (
            <div className="space-y-2">
              {positions.map(position => (
                <div key={position.symbol} className="p-2 bg-gray-700 rounded">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{position.symbol}</span>
                    <span className={`font-semibold ${
                      position.unrealizedPnL >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {position.unrealizedPnL >= 0 ? '+' : ''}{formatPrice(position.unrealizedPnL)}
                    </span>
                  </div>
                  <div className="text-sm text-gray-400">
                    {position.quantity} shares @ {formatPrice(position.avgPrice)}
                  </div>
                  <div className="text-sm text-gray-400">
                    Market Value: {formatPrice(position.marketValue)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TradingTerminal;