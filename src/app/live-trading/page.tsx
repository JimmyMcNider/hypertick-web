/**
 * Live Trading Environment
 *
 * Interactive trading against automated market makers.
 * Watch your orders move the market in real-time.
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Activity,
  DollarSign,
  Users,
  Zap,
  AlertCircle,
  CheckCircle,
  RefreshCw
} from 'lucide-react';

interface OrderBookLevel {
  price: number;
  size: number;
  orders: number;
}

interface Trade {
  id: string;
  price: number;
  quantity: number;
  side: 'BUY' | 'SELL';
  timestamp: Date;
  isYours?: boolean;
}

interface Position {
  quantity: number;
  avgPrice: number;
  unrealizedPnL: number;
  realizedPnL: number;
}

interface BotStatus {
  name: string;
  strategy: string;
  position: number;
  trades: number;
  pnl: number;
}

export default function LiveTradingPage() {
  // Environment state
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [securityId, setSecurityId] = useState<string | null>(null);

  // Market state
  const [currentPrice, setCurrentPrice] = useState(50.00);
  const [priceHistory, setPriceHistory] = useState<number[]>([50]);
  const [bid, setBid] = useState(49.95);
  const [ask, setAsk] = useState(50.05);
  const [volume, setVolume] = useState(0);
  const [dayChange, setDayChange] = useState(0);
  const [openPrice] = useState(50.00);

  // Order book
  const [bids, setBids] = useState<OrderBookLevel[]>([]);
  const [asks, setAsks] = useState<OrderBookLevel[]>([]);

  // Trades & positions
  const [recentTrades, setRecentTrades] = useState<Trade[]>([]);
  const [position, setPosition] = useState<Position>({ quantity: 0, avgPrice: 0, unrealizedPnL: 0, realizedPnL: 0 });
  const [buyingPower, setBuyingPower] = useState(10000000);

  // Order entry
  const [orderSide, setOrderSide] = useState<'BUY' | 'SELL'>('BUY');
  const [orderType, setOrderType] = useState<'MARKET' | 'LIMIT'>('MARKET');
  const [orderQuantity, setOrderQuantity] = useState('500');
  const [limitPrice, setLimitPrice] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderFeedback, setOrderFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Bot status
  const [bots, setBots] = useState<BotStatus[]>([]);

  // Polling refs
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Start trading environment
  const startEnvironment = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // First login as instructor to get auth
      const loginRes = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'instructor', password: 'instructor123' })
      });
      const loginData = await loginRes.json();

      if (!loginData.token) {
        throw new Error('Failed to authenticate');
      }

      // Store token
      localStorage.setItem('token', loginData.token);
      localStorage.setItem('user', JSON.stringify(loginData.user));

      // Start trading environment
      const res = await fetch('/api/trading-environment/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${loginData.token}`
        },
        body: JSON.stringify({
          userId: loginData.user.id,
          buyingPower: 10000000,
          botCount: 5,
          startPrice: 50.00,
          volatility: 0.025
        })
      });

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to start environment');
      }

      setSessionId(data.sessionId);
      setUserId(data.userId);
      setSecurityId(data.securityId);
      setBuyingPower(data.buyingPower);
      setCurrentPrice(data.startPrice);

      console.log('Trading environment started:', data);

    } catch (err: any) {
      setError(err.message);
      console.error('Error starting environment:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch order book
  const fetchOrderBook = useCallback(async () => {
    if (!sessionId) return;

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/sessions/${sessionId}/orderbook`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();

      if (data.orderBook) {
        // Transform order book data
        const bidLevels: OrderBookLevel[] = [];
        const askLevels: OrderBookLevel[] = [];

        // Group bids by price
        const bidMap = new Map<number, { size: number; orders: number }>();
        data.orderBook.bids?.forEach((order: any) => {
          const price = Math.round(order.price * 100) / 100;
          const existing = bidMap.get(price) || { size: 0, orders: 0 };
          bidMap.set(price, { size: existing.size + order.remainingQuantity, orders: existing.orders + 1 });
        });
        bidMap.forEach((val, price) => bidLevels.push({ price, ...val }));
        bidLevels.sort((a, b) => b.price - a.price);

        // Group asks by price
        const askMap = new Map<number, { size: number; orders: number }>();
        data.orderBook.asks?.forEach((order: any) => {
          const price = Math.round(order.price * 100) / 100;
          const existing = askMap.get(price) || { size: 0, orders: 0 };
          askMap.set(price, { size: existing.size + order.remainingQuantity, orders: existing.orders + 1 });
        });
        askMap.forEach((val, price) => askLevels.push({ price, ...val }));
        askLevels.sort((a, b) => a.price - b.price);

        setBids(bidLevels.slice(0, 8));
        setAsks(askLevels.slice(0, 8));

        // Update best bid/ask
        if (bidLevels.length > 0) setBid(bidLevels[0].price);
        if (askLevels.length > 0) setAsk(askLevels[0].price);

        // Update current price (midpoint)
        if (bidLevels.length > 0 && askLevels.length > 0) {
          const mid = (bidLevels[0].price + askLevels[0].price) / 2;
          setCurrentPrice(mid);
          setPriceHistory(prev => [...prev.slice(-59), mid]);
          setDayChange(mid - openPrice);
        }

        // Update volume
        if (data.orderBook.stats) {
          setVolume(data.orderBook.stats.volume || 0);
        }
      }
    } catch (err) {
      console.error('Error fetching order book:', err);
    }
  }, [sessionId, openPrice]);

  // Fetch bot status
  const fetchBotStatus = useCallback(async () => {
    if (!sessionId) return;

    try {
      const res = await fetch(`/api/trading-environment/start?sessionId=${sessionId}`);
      const data = await res.json();
      if (data.bots) {
        setBots(data.bots);
      }
    } catch (err) {
      console.error('Error fetching bot status:', err);
    }
  }, [sessionId]);

  // Fetch user position
  const fetchPosition = useCallback(async () => {
    if (!sessionId || !userId) return;

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/sessions/${sessionId}/portfolio`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();

      if (data.portfolio) {
        const aoePosition = data.portfolio.positions?.find((p: any) => p.symbol === 'AOE');
        if (aoePosition) {
          setPosition({
            quantity: aoePosition.quantity,
            avgPrice: aoePosition.avgPrice,
            unrealizedPnL: aoePosition.unrealizedPnL,
            realizedPnL: aoePosition.realizedPnL
          });
        }
        if (data.portfolio.buyingPower) {
          setBuyingPower(data.portfolio.buyingPower);
        }
      }
    } catch (err) {
      console.error('Error fetching position:', err);
    }
  }, [sessionId, userId]);

  // Submit order
  const submitOrder = useCallback(async () => {
    if (!sessionId || !securityId || isSubmitting) return;

    setIsSubmitting(true);
    setOrderFeedback(null);

    try {
      const token = localStorage.getItem('token');
      const quantity = parseInt(orderQuantity);

      if (isNaN(quantity) || quantity <= 0) {
        throw new Error('Invalid quantity');
      }

      const orderData: any = {
        securityId,
        type: orderType,
        side: orderSide,
        quantity,
        timeInForce: 'DAY'
      };

      if (orderType === 'LIMIT') {
        const price = parseFloat(limitPrice);
        if (isNaN(price) || price <= 0) {
          throw new Error('Invalid limit price');
        }
        orderData.price = price;
      } else {
        // Market order - use best available price
        orderData.price = orderSide === 'BUY' ? ask : bid;
      }

      const res = await fetch(`/api/sessions/${sessionId}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(orderData)
      });

      const data = await res.json();

      if (data.success) {
        // Add to trades
        const newTrade: Trade = {
          id: data.order.id,
          price: orderData.price,
          quantity,
          side: orderSide,
          timestamp: new Date(),
          isYours: true
        };
        setRecentTrades(prev => [newTrade, ...prev.slice(0, 19)]);

        setOrderFeedback({
          type: 'success',
          message: `${orderSide} ${quantity} AOE @ $${orderData.price.toFixed(2)} - ${data.order.status}`
        });

        // Refresh data
        fetchOrderBook();
        fetchPosition();
      } else {
        throw new Error(data.error || 'Order failed');
      }
    } catch (err: any) {
      setOrderFeedback({ type: 'error', message: err.message });
    } finally {
      setIsSubmitting(false);
    }
  }, [sessionId, securityId, orderSide, orderType, orderQuantity, limitPrice, ask, bid, fetchOrderBook, fetchPosition, isSubmitting]);

  // Start environment on mount
  useEffect(() => {
    startEnvironment();
  }, [startEnvironment]);

  // Set up polling
  useEffect(() => {
    if (!sessionId) return;

    // Initial fetch
    fetchOrderBook();
    fetchBotStatus();
    fetchPosition();

    // Poll every 500ms for responsive feel
    pollingRef.current = setInterval(() => {
      fetchOrderBook();
      fetchBotStatus();
      fetchPosition();
    }, 500);

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [sessionId, fetchOrderBook, fetchBotStatus, fetchPosition]);

  // Clear feedback after 3 seconds
  useEffect(() => {
    if (orderFeedback) {
      const timer = setTimeout(() => setOrderFeedback(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [orderFeedback]);

  if (isLoading) {
    return (
      <div className="h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <h2 className="text-xl text-white mb-2">Starting Trading Environment</h2>
          <p className="text-gray-400">Initializing automated market makers...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl text-white mb-2">Error Starting Environment</h2>
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={startEnvironment}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const spread = ask - bid;
  const midPrice = (bid + ask) / 2;
  const maxBookSize = Math.max(...bids.map(b => b.size), ...asks.map(a => a.size), 1);

  return (
    <div className="h-screen bg-gray-950 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-800 px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div>
              <h1 className="text-xl font-bold text-white">LIVE TRADING</h1>
              <p className="text-xs text-gray-400">Real-time market with automated traders</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-white">AOE</span>
              <span className={`text-2xl font-bold ${dayChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                ${currentPrice.toFixed(2)}
              </span>
              <span className={`text-sm ${dayChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {dayChange >= 0 ? '+' : ''}{dayChange.toFixed(2)} ({((dayChange / openPrice) * 100).toFixed(2)}%)
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <div className="text-gray-400">
              <span className="text-green-400">BID: ${bid.toFixed(2)}</span>
              <span className="mx-2">|</span>
              <span className="text-red-400">ASK: ${ask.toFixed(2)}</span>
              <span className="mx-2">|</span>
              <span>Spread: ${spread.toFixed(2)}</span>
            </div>
            <div className="flex items-center gap-1 text-green-400">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              LIVE
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Order Book */}
        <div className="w-80 border-r border-gray-800 flex flex-col">
          <div className="p-2 border-b border-gray-800 bg-gray-900">
            <h2 className="text-sm font-bold text-white">ORDER BOOK</h2>
          </div>

          {/* Asks (reversed) */}
          <div className="flex-1 overflow-auto">
            <div className="text-xs">
              {[...asks].reverse().map((level, i) => (
                <div key={`ask-${i}`} className="flex items-center px-2 py-1 relative">
                  <div
                    className="absolute right-0 top-0 bottom-0 bg-red-500/10"
                    style={{ width: `${(level.size / maxBookSize) * 100}%` }}
                  />
                  <span className="w-20 text-red-400 font-mono relative z-10">${level.price.toFixed(2)}</span>
                  <span className="flex-1 text-right text-white font-mono relative z-10">{level.size}</span>
                  <span className="w-12 text-right text-gray-500 relative z-10">{level.orders}</span>
                </div>
              ))}
            </div>

            {/* Spread indicator */}
            <div className="px-2 py-2 bg-gray-800 text-center border-y border-gray-700">
              <span className="text-yellow-400 font-bold">SPREAD: ${spread.toFixed(2)}</span>
              <span className="text-gray-400 ml-2">({((spread / midPrice) * 100).toFixed(2)}%)</span>
            </div>

            {/* Bids */}
            <div className="text-xs">
              {bids.map((level, i) => (
                <div key={`bid-${i}`} className="flex items-center px-2 py-1 relative">
                  <div
                    className="absolute left-0 top-0 bottom-0 bg-green-500/10"
                    style={{ width: `${(level.size / maxBookSize) * 100}%` }}
                  />
                  <span className="w-20 text-green-400 font-mono relative z-10">${level.price.toFixed(2)}</span>
                  <span className="flex-1 text-right text-white font-mono relative z-10">{level.size}</span>
                  <span className="w-12 text-right text-gray-500 relative z-10">{level.orders}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Center Panel - Chart & Order Entry */}
        <div className="flex-1 flex flex-col">
          {/* Mini Chart */}
          <div className="h-48 border-b border-gray-800 p-4">
            <svg className="w-full h-full" viewBox="0 0 400 120" preserveAspectRatio="none">
              {/* Grid lines */}
              {[0, 1, 2, 3].map(i => (
                <line key={i} x1="0" y1={i * 40} x2="400" y2={i * 40} stroke="#374151" strokeWidth="0.5" />
              ))}
              {/* Price line */}
              {priceHistory.length > 1 && (
                <>
                  <polyline
                    fill="none"
                    stroke={dayChange >= 0 ? '#10B981' : '#EF4444'}
                    strokeWidth="2"
                    points={priceHistory.map((p, i) => {
                      const min = Math.min(...priceHistory);
                      const max = Math.max(...priceHistory);
                      const range = max - min || 1;
                      return `${(i / 59) * 400},${120 - ((p - min) / range) * 100}`;
                    }).join(' ')}
                  />
                  <polygon
                    fill={dayChange >= 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)'}
                    points={`0,120 ${priceHistory.map((p, i) => {
                      const min = Math.min(...priceHistory);
                      const max = Math.max(...priceHistory);
                      const range = max - min || 1;
                      return `${(i / 59) * 400},${120 - ((p - min) / range) * 100}`;
                    }).join(' ')} 400,120`}
                  />
                </>
              )}
            </svg>
          </div>

          {/* Order Entry */}
          <div className="p-4 border-b border-gray-800 bg-gray-900">
            <div className="flex gap-4">
              {/* Side Selection */}
              <div className="flex gap-2">
                <button
                  onClick={() => setOrderSide('BUY')}
                  className={`px-6 py-3 rounded font-bold text-lg transition ${
                    orderSide === 'BUY'
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  BUY
                </button>
                <button
                  onClick={() => setOrderSide('SELL')}
                  className={`px-6 py-3 rounded font-bold text-lg transition ${
                    orderSide === 'SELL'
                      ? 'bg-red-500 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  SELL
                </button>
              </div>

              {/* Order Type */}
              <div className="flex gap-2">
                <button
                  onClick={() => setOrderType('MARKET')}
                  className={`px-4 py-2 rounded ${
                    orderType === 'MARKET' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'
                  }`}
                >
                  Market
                </button>
                <button
                  onClick={() => setOrderType('LIMIT')}
                  className={`px-4 py-2 rounded ${
                    orderType === 'LIMIT' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'
                  }`}
                >
                  Limit
                </button>
              </div>

              {/* Quantity */}
              <div>
                <label className="block text-xs text-gray-400 mb-1">Quantity</label>
                <input
                  type="number"
                  value={orderQuantity}
                  onChange={e => setOrderQuantity(e.target.value)}
                  className="w-32 px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white"
                />
              </div>

              {/* Quick Quantities */}
              <div className="flex gap-1 items-end">
                {['100', '500', '1000', '5000'].map(qty => (
                  <button
                    key={qty}
                    onClick={() => setOrderQuantity(qty)}
                    className="px-3 py-2 bg-gray-700 text-gray-300 rounded hover:bg-gray-600 text-sm"
                  >
                    {qty}
                  </button>
                ))}
              </div>

              {/* Limit Price */}
              {orderType === 'LIMIT' && (
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Limit Price</label>
                  <input
                    type="number"
                    step="0.01"
                    value={limitPrice}
                    onChange={e => setLimitPrice(e.target.value)}
                    placeholder={currentPrice.toFixed(2)}
                    className="w-28 px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white"
                  />
                </div>
              )}

              {/* Submit */}
              <button
                onClick={submitOrder}
                disabled={isSubmitting}
                className={`px-8 py-3 rounded font-bold text-lg transition ${
                  orderSide === 'BUY'
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'bg-red-600 hover:bg-red-700 text-white'
                } ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isSubmitting ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  `${orderSide} ${orderQuantity} AOE`
                )}
              </button>
            </div>

            {/* Order Feedback */}
            {orderFeedback && (
              <div className={`mt-3 p-2 rounded flex items-center gap-2 ${
                orderFeedback.type === 'success' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
              }`}>
                {orderFeedback.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                {orderFeedback.message}
              </div>
            )}
          </div>

          {/* Your Trades */}
          <div className="flex-1 overflow-auto p-4">
            <h3 className="text-sm font-bold text-white mb-2">YOUR TRADES</h3>
            <div className="text-xs">
              {recentTrades.length === 0 ? (
                <p className="text-gray-500">Place an order to see your trades here</p>
              ) : (
                recentTrades.map(trade => (
                  <div key={trade.id} className="flex items-center gap-4 py-2 border-b border-gray-800">
                    <span className={`font-bold ${trade.side === 'BUY' ? 'text-green-400' : 'text-red-400'}`}>
                      {trade.side}
                    </span>
                    <span className="text-white">{trade.quantity}</span>
                    <span className="text-gray-400">@</span>
                    <span className="text-white">${trade.price.toFixed(2)}</span>
                    <span className="text-gray-500 ml-auto">
                      {trade.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Panel - Position & Bots */}
        <div className="w-80 border-l border-gray-800 flex flex-col">
          {/* Your Position */}
          <div className="p-4 border-b border-gray-800">
            <h2 className="text-sm font-bold text-white mb-3">YOUR POSITION</h2>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-400">Shares</span>
                <span className={`font-bold ${position.quantity > 0 ? 'text-green-400' : position.quantity < 0 ? 'text-red-400' : 'text-white'}`}>
                  {position.quantity > 0 ? '+' : ''}{position.quantity}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Avg Price</span>
                <span className="text-white">${position.avgPrice.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Unrealized P&L</span>
                <span className={position.unrealizedPnL >= 0 ? 'text-green-400' : 'text-red-400'}>
                  {position.unrealizedPnL >= 0 ? '+' : ''}${position.unrealizedPnL.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Realized P&L</span>
                <span className={position.realizedPnL >= 0 ? 'text-green-400' : 'text-red-400'}>
                  {position.realizedPnL >= 0 ? '+' : ''}${position.realizedPnL.toFixed(2)}
                </span>
              </div>
              <div className="pt-2 border-t border-gray-700">
                <div className="flex justify-between">
                  <span className="text-gray-400">Buying Power</span>
                  <span className="text-white font-bold">${buyingPower.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Bot Status */}
          <div className="flex-1 overflow-auto p-4">
            <h2 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <Users size={14} />
              AUTOMATED TRADERS ({bots.length})
            </h2>
            <div className="space-y-2">
              {bots.map((bot, i) => (
                <div key={i} className="p-2 bg-gray-800 rounded text-xs">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-white font-medium">{bot.name}</span>
                    <span className="text-gray-400">{bot.strategy}</span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>Pos: <span className={bot.position > 0 ? 'text-green-400' : bot.position < 0 ? 'text-red-400' : 'text-white'}>{bot.position}</span></span>
                    <span>Trades: {bot.trades}</span>
                    <span className={bot.pnl >= 0 ? 'text-green-400' : 'text-red-400'}>
                      ${bot.pnl.toFixed(0)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Market Stats */}
          <div className="p-4 border-t border-gray-800 bg-gray-900">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-gray-400">Volume</span>
                <div className="text-white font-bold">{volume.toLocaleString()}</div>
              </div>
              <div>
                <span className="text-gray-400">Session</span>
                <div className="text-white font-mono text-xs">{sessionId?.slice(0, 8)}...</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
