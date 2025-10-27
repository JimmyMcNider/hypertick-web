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
  type: 'MARKET' | 'LIMIT' | 'STOP' | 'STOP_LIMIT';
  quantity: number;
  price?: number;
  stopPrice?: number;
  status: 'PENDING' | 'PENDING_TRIGGER' | 'PARTIALLY_FILLED' | 'FILLED' | 'CANCELLED' | 'REJECTED';
  timeInForce: 'GTC' | 'IOC' | 'FOK' | 'DAY';
  timestamp: Date;
}

interface Position {
  symbol: string;
  quantity: number;
  avgPrice: number;
  marketValue: number;
  unrealizedPnL: number;
  realizedPnL: number;
  dayPnL: number;
  marketPrice: number;
  totalCost: number;
  lastUpdated: Date;
}

interface Portfolio {
  totalEquity: number;
  totalCash: number;
  totalValue: number;
  dayPnL: number;
  totalPnL: number;
  positions: Position[];
  buying_power: number;
  margin_used: number;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
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
    clearError,
    socket
  } = useWebSocket({ sessionId, userId, role });

  const [activeOrders, setActiveOrders] = useState<Order[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [selectedSymbol, setSelectedSymbol] = useState('AOE');
  const [orderForm, setOrderForm] = useState({
    symbol: 'AOE',
    side: 'BUY' as 'BUY' | 'SELL',
    type: 'MARKET' as 'MARKET' | 'LIMIT' | 'STOP' | 'STOP_LIMIT',
    quantity: 100,
    price: undefined as number | undefined,
    stopPrice: undefined as number | undefined,
    timeInForce: 'GTC' as 'GTC' | 'IOC' | 'FOK' | 'DAY'
  });

  const watchlistSymbols = ['AOE', 'PNR', 'VGR', 'BOND1', 'BOND2'];

  // Update active orders when new data comes from WebSocket
  useEffect(() => {
    setActiveOrders(orders);
  }, [orders]);

  // Set up portfolio and position listeners
  useEffect(() => {
    if (socket) {
      const handlePortfolioUpdate = (portfolioData: Portfolio) => {
        setPortfolio(portfolioData);
        setPositions(portfolioData.positions);
      };

      const handlePositionUpdate = (data: { symbol: string; position: Position }) => {
        setPositions(prev => {
          const updated = prev.filter(p => p.symbol !== data.symbol);
          if (data.position.quantity !== 0) {
            updated.push(data.position);
          }
          return updated;
        });
      };

      socket.on('portfolio_update', handlePortfolioUpdate);
      socket.on('position_update', handlePositionUpdate);

      return () => {
        socket.off('portfolio_update', handlePortfolioUpdate);
        socket.off('position_update', handlePositionUpdate);
      };
    }
  }, [socket]);

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
      price: (orderForm.type === 'LIMIT' || orderForm.type === 'STOP_LIMIT') ? orderForm.price : undefined,
      stopPrice: (orderForm.type === 'STOP' || orderForm.type === 'STOP_LIMIT') ? orderForm.stopPrice : undefined,
      timeInForce: orderForm.timeInForce
    };

    submitOrder(orderData);
    
    // Reset form
    setOrderForm(prev => ({
      ...prev,
      quantity: 100,
      price: undefined,
      stopPrice: undefined
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
                <option value="STOP">Stop Loss</option>
                <option value="STOP_LIMIT">Stop Limit</option>
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

            {/* Stop Price Field - for STOP and STOP_LIMIT orders */}
            {(orderForm.type === 'STOP' || orderForm.type === 'STOP_LIMIT') && (
              <div>
                <label className="block text-sm font-medium mb-1">
                  Stop Price {orderForm.side === 'SELL' ? '(trigger below)' : '(trigger above)'}
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={orderForm.stopPrice || ''}
                  onChange={(e) => setOrderForm(prev => ({ ...prev, stopPrice: parseFloat(e.target.value) || undefined }))}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
                  placeholder={selectedMarketData ? formatPrice(selectedMarketData.last) : '100.00'}
                />
              </div>
            )}

            {/* Limit Price Field - for LIMIT and STOP_LIMIT orders */}
            {(orderForm.type === 'LIMIT' || orderForm.type === 'STOP_LIMIT') && (
              <div>
                <label className="block text-sm font-medium mb-1">
                  {orderForm.type === 'STOP_LIMIT' ? 'Limit Price' : 'Price'}
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={orderForm.price || ''}
                  onChange={(e) => setOrderForm(prev => ({ ...prev, price: parseFloat(e.target.value) || undefined }))}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
                  placeholder={selectedMarketData ? formatPrice(selectedMarketData.last) : '100.00'}
                />
              </div>
            )}

            {/* Time-in-Force Field */}
            <div>
              <label className="block text-sm font-medium mb-1">Time in Force</label>
              <select
                value={orderForm.timeInForce}
                onChange={(e) => setOrderForm(prev => ({ ...prev, timeInForce: e.target.value as any }))}
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
              >
                <option value="GTC">Good Till Cancel</option>
                <option value="DAY">Day Order</option>
                <option value="IOC">Immediate or Cancel</option>
                <option value="FOK">Fill or Kill</option>
              </select>
            </div>

            <button
              onClick={handlePlaceOrder}
              disabled={
                !connected || 
                orderForm.quantity <= 0 ||
                (orderForm.type === 'LIMIT' && !orderForm.price) ||
                (orderForm.type === 'STOP' && !orderForm.stopPrice) ||
                (orderForm.type === 'STOP_LIMIT' && (!orderForm.price || !orderForm.stopPrice))
              }
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 py-2 rounded font-semibold"
            >
              Place {orderForm.type} Order
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
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{order.symbol} {order.side}</span>
                      <span className={`px-2 py-1 text-xs rounded ${
                        order.status === 'FILLED' ? 'bg-green-600' :
                        order.status === 'PENDING_TRIGGER' ? 'bg-yellow-600' :
                        order.status === 'PENDING' ? 'bg-blue-600' :
                        'bg-gray-600'
                      }`}>
                        {order.status.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="text-sm text-gray-400">
                      {order.type} • {order.quantity} shares
                      {order.type === 'LIMIT' && order.price && ` @ ${formatPrice(order.price)}`}
                      {order.type === 'MARKET' && ' @ Market'}
                      {order.type === 'STOP' && order.stopPrice && ` • Stop: ${formatPrice(order.stopPrice)}`}
                      {order.type === 'STOP_LIMIT' && order.stopPrice && order.price && 
                        ` • Stop: ${formatPrice(order.stopPrice)} • Limit: ${formatPrice(order.price)}`}
                    </div>
                    <div className="text-xs text-gray-500">
                      {order.timeInForce} • {new Date(order.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                  {order.status === 'PENDING' || order.status === 'PENDING_TRIGGER' ? (
                    <button
                      onClick={() => handleCancelOrder(order.id)}
                      className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-sm"
                    >
                      Cancel
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Positions */}
        <div className="bg-gray-800 rounded p-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-lg font-semibold">Positions</h3>
            {portfolio && (
              <div className="text-right">
                <div className="text-sm text-gray-400">Total P&L</div>
                <div className={`font-bold ${
                  portfolio.totalPnL >= 0 ? 'text-green-400' : 'text-red-400'
                }`}>
                  {portfolio.totalPnL >= 0 ? '+' : ''}${formatPrice(portfolio.totalPnL)}
                </div>
              </div>
            )}
          </div>

          {/* Portfolio Summary */}
          {portfolio && (
            <div className="mb-4 p-3 bg-gray-700 rounded">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-gray-400">Total Value:</span>
                  <span className="ml-2 font-bold">${formatPrice(portfolio.totalValue)}</span>
                </div>
                <div>
                  <span className="text-gray-400">Cash:</span>
                  <span className="ml-2 font-bold">${formatPrice(portfolio.totalCash)}</span>
                </div>
                <div>
                  <span className="text-gray-400">Buying Power:</span>
                  <span className="ml-2 font-bold">${formatPrice(portfolio.buying_power)}</span>
                </div>
                <div>
                  <span className="text-gray-400">Risk Level:</span>
                  <span className={`ml-2 font-bold ${
                    portfolio.risk_level === 'LOW' ? 'text-green-400' :
                    portfolio.risk_level === 'MEDIUM' ? 'text-yellow-400' :
                    portfolio.risk_level === 'HIGH' ? 'text-orange-400' :
                    'text-red-400'
                  }`}>
                    {portfolio.risk_level}
                  </span>
                </div>
              </div>
            </div>
          )}

          {positions.length === 0 ? (
            <p className="text-gray-400">No positions</p>
          ) : (
            <div className="space-y-2">
              {positions.map(position => (
                <div key={position.symbol} className="p-3 bg-gray-700 rounded">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium text-blue-400">{position.symbol}</span>
                    <div className="text-right">
                      <div className={`font-semibold ${
                        position.unrealizedPnL >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {position.unrealizedPnL >= 0 ? '+' : ''}${formatPrice(position.unrealizedPnL)}
                      </div>
                      <div className="text-xs text-gray-400">Unrealized</div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-gray-400">Qty:</span>
                      <span className="ml-1 font-medium">{position.quantity}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Avg Price:</span>
                      <span className="ml-1 font-medium">${formatPrice(position.avgPrice)}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Market Price:</span>
                      <span className="ml-1 font-medium">${formatPrice(position.marketPrice)}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Market Value:</span>
                      <span className="ml-1 font-medium">${formatPrice(position.marketValue)}</span>
                    </div>
                  </div>

                  {position.realizedPnL !== 0 && (
                    <div className="mt-2 pt-2 border-t border-gray-600">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Realized P&L:</span>
                        <span className={position.realizedPnL >= 0 ? 'text-green-400' : 'text-red-400'}>
                          {position.realizedPnL >= 0 ? '+' : ''}${formatPrice(position.realizedPnL)}
                        </span>
                      </div>
                    </div>
                  )}
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