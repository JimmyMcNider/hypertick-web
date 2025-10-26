'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';

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
  type: 'MARKET' | 'LIMIT';
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
  role?: 'Student' | 'Instructor';
}

const TradingTerminal: React.FC<TradingTerminalProps> = ({ sessionId, userId, role = 'Student' }) => {
  // Use the new WebSocket hook
  const { 
    connected, 
    marketData, 
    orders, 
    trades, 
    submitOrder, 
    error, 
    clearError 
  } = useWebSocket({ sessionId, userId, role });

  const [activeOrders, setActiveOrders] = useState<Order[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [selectedSymbol, setSelectedSymbol] = useState('AOE');
  const [orderForm, setOrderForm] = useState({
    symbol: 'AOE',
    side: 'BUY' as 'BUY' | 'SELL',
    type: 'MARKET' as 'MARKET' | 'LIMIT',
    quantity: 100,
    price: undefined as number | undefined
  });

  const watchlistSymbols = ['AOE', 'PNR', 'VGR', 'BOND1', 'BOND2'];

  // Update active orders and positions when new data comes from WebSocket
  useEffect(() => {
    setActiveOrders(orders);
  }, [orders]);

  // Convert market data array to map for easier access
  const marketDataMap = new Map(marketData.map(md => [md.symbol, {
    symbol: md.symbol,
    bid: md.bid,
    ask: md.ask,
    last: md.lastPrice,
    change: md.lastPrice - 100, // Calculate change from base price
    changePercent: ((md.lastPrice - 100) / 100) * 100,
    volume: md.volume,
    timestamp: new Date()
  }]));

  const handlePlaceOrder = () => {
    if (!connected) return;

    // Find security ID for the symbol (for now using symbol as securityId)
    const securityId = orderForm.symbol;

    const orderData = {
      securityId,
      symbol: orderForm.symbol,
      side: orderForm.side,
      type: orderForm.type,
      quantity: orderForm.quantity,
      price: orderForm.type !== 'MARKET' ? orderForm.price : undefined,
      timeInForce: 'GTC' as 'GTC' | 'IOC' | 'FOK'
    };

    submitOrder(orderData);
    
    // Reset form
    setOrderForm(prev => ({
      ...prev,
      quantity: 100,
      price: undefined
    }));
  };

  const handleCancelOrder = (orderId: string) => {
    // This would need to be implemented in the WebSocket server
    console.log('Cancel order:', orderId);
  };

  const formatPrice = (price: number) => price.toFixed(2);
  const formatPercent = (percent: number) => {
    const sign = percent >= 0 ? '+' : '';
    return `${sign}${percent.toFixed(2)}%`;
  };

  const selectedMarketData = marketDataMap.get(selectedSymbol);
  
  // Create mock order book from market data
  const selectedOrderBook = selectedMarketData ? {
    symbol: selectedSymbol,
    bids: [{ price: selectedMarketData.bid, size: 100, orders: 1 }],
    asks: [{ price: selectedMarketData.ask, size: 100, orders: 1 }],
    spread: selectedMarketData.ask - selectedMarketData.bid,
    timestamp: new Date()
  } : null;

  return (
    <div className="trading-terminal bg-gray-900 text-white p-4 space-y-4">
      {/* Connection Status */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Trading Terminal</h2>
        <div className={`px-3 py-1 rounded text-sm ${
          connected ? 'bg-green-600' : 'bg-red-600'
        }`}>
          {connected ? 'Connected' : 'Disconnected'}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-600 text-white p-3 rounded mb-4">
          <div className="flex justify-between items-center">
            <span>{error}</span>
            <button 
              onClick={clearError}
              className="text-white hover:text-gray-200"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Session Info */}
      <div className="bg-gray-800 p-3 rounded">
        <div className="text-sm text-gray-300">
          Session: {sessionId} | User: {userId} | Role: {role}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Market Watch */}
        <div className="bg-gray-800 rounded p-4">
          <h3 className="text-lg font-semibold mb-3">Market Watch</h3>
          <div className="space-y-2">
            {watchlistSymbols.map(symbol => {
              const data = marketDataMap.get(symbol);
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
              disabled={!connected}
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