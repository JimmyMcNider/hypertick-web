/**
 * Professional Trading Terminal - LIVE SESSION
 * 
 * Unified student trading interface with real-time market data,
 * live order execution, and professional trading tools.
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

interface MarketData {
  symbol: string;
  last: number;
  bid: number;
  ask: number;
  change: number;
  changePercent: number;
  volume: number;
  high: number;
  low: number;
  open: number;
}

interface OrderBookLevel {
  price: number;
  size: number;
  count: number;
}

interface Trade {
  id: string;
  symbol: string;
  price: number;
  size: number;
  side: 'BUY' | 'SELL';
  timestamp: string;
  userId?: string;
}

interface Position {
  symbol: string;
  qty: number;
  avgPx: number;
  mktVal: number;
  unrealizedPnL: number;
}

interface SessionInfo {
  id: string;
  status: 'ACTIVE' | 'PAUSED' | 'ENDED';
  startTime: string;
  endTime?: string;
  currentTick: number;
  duration: number;
  lessonId: string;
}

interface PricePoint {
  timestamp: number;
  price: number;
}

export default function StudentTradingTerminal() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [selectedSymbol, setSelectedSymbol] = useState('VCR');
  const [orderQty, setOrderQty] = useState('100');
  const [orderPrice, setOrderPrice] = useState('');
  const [orderType, setOrderType] = useState<'MKT' | 'LMT' | 'STP' | 'STPLMT'>('MKT');
  const [loading, setLoading] = useState(false);

  // Live market data
  const [marketData, setMarketData] = useState<Record<string, MarketData>>({});
  const [orderBook, setOrderBook] = useState<{ bids: OrderBookLevel[]; asks: OrderBookLevel[] }>({ bids: [], asks: [] });
  const [trades, setTrades] = useState<Trade[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [portfolioValue, setPortfolioValue] = useState(10000);
  const [dayPnL, setDayPnL] = useState(0);
  const [buyingPower, setBuyingPower] = useState(10000);

  // Price charts
  const [priceHistory, setPriceHistory] = useState<Record<string, PricePoint[]>>({});

  const qtyInputRef = useRef<HTMLInputElement>(null);
  const priceInputRef = useRef<HTMLInputElement>(null);

  // Initialize session
  useEffect(() => {
    const initializeSession = async () => {
      try {
        // Get user from localStorage
        const userData = localStorage.getItem('hypertick_user');
        if (!userData) {
          router.push('/simple-login');
          return;
        }
        
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);

        // Check for active session
        const sessionResponse = await fetch('/api/sessions/current');
        if (sessionResponse.ok) {
          const sessionData = await sessionResponse.json();
          if (sessionData.session) {
            setSessionId(sessionData.session.id);
            setSessionInfo({
              id: sessionData.session.id,
              status: sessionData.session.status,
              startTime: sessionData.session.startTime,
              currentTick: sessionData.session.currentTick || 0,
              duration: sessionData.session.duration || 3600,
              lessonId: sessionData.session.lessonTitle || 'Trading Session'
            });
          } else {
            // No active session found
            setSessionId(null);
            setSessionInfo(null);
          }
        } else {
          // API call failed, try fallback session for development
          console.warn('Active session API failed, using fallback session');
          const fallbackSessionId = 'session_1762043911884_xlo4m2eux';
          setSessionId(fallbackSessionId);
          setSessionInfo({
            id: fallbackSessionId,
            status: 'ACTIVE',
            startTime: new Date().toISOString(),
            currentTick: 0,
            duration: 3600,
            lessonId: 'Market Efficiency (Demo)'
          });
        }
      } catch (error) {
        console.error('Failed to initialize session:', error);
        // Set fallback session for development
        const fallbackSessionId = 'session_1762043911884_xlo4m2eux';
        setSessionId(fallbackSessionId);
        setSessionInfo({
          id: fallbackSessionId,
          status: 'ACTIVE',
          startTime: new Date().toISOString(),
          currentTick: 0,
          duration: 3600,
          lessonId: 'Market Efficiency (Demo)'
        });
      }
    };

    initializeSession();
  }, [router]);

  // Live market data feed
  useEffect(() => {
    if (!sessionId) return;

    const fetchMarketData = async () => {
      try {
        const response = await fetch(`/api/market/data?sessionId=${sessionId}`);
        if (response.ok) {
          const data = await response.json();
          
          // Update market data
          const newMarketData: Record<string, MarketData> = {};
          data.securities.forEach((security: any) => {
            const lastPrice = security.currentPrice;
            const openPrice = security.openPrice || lastPrice;
            const change = lastPrice - openPrice;
            const changePercent = openPrice > 0 ? (change / openPrice) * 100 : 0;

            newMarketData[security.symbol] = {
              symbol: security.symbol,
              last: lastPrice,
              bid: security.bid || lastPrice - 0.02,
              ask: security.ask || lastPrice + 0.02,
              change,
              changePercent,
              volume: security.volume || 0,
              high: security.high || lastPrice,
              low: security.low || lastPrice,
              open: openPrice
            };

            // Update price history for charts
            setPriceHistory(prev => ({
              ...prev,
              [security.symbol]: [
                ...(prev[security.symbol] || []).slice(-199), // Keep last 200 points
                { timestamp: Date.now(), price: lastPrice }
              ]
            }));
          });

          setMarketData(newMarketData);

          // Update order book with realistic data
          if (newMarketData[selectedSymbol]) {
            const market = newMarketData[selectedSymbol];
            const tickSize = 0.01;
            
            const bids: OrderBookLevel[] = [];
            const asks: OrderBookLevel[] = [];
            
            // Generate realistic order book
            for (let i = 0; i < 8; i++) {
              bids.push({
                price: market.bid - (i * tickSize),
                size: Math.floor(Math.random() * 3000) + 500,
                count: Math.floor(Math.random() * 15) + 3
              });
              
              asks.push({
                price: market.ask + (i * tickSize),
                size: Math.floor(Math.random() * 3000) + 500,
                count: Math.floor(Math.random() * 15) + 3
              });
            }
            
            setOrderBook({ bids, asks });
          }
        }
      } catch (error) {
        console.error('Failed to fetch market data:', error);
      }
    };

    // Fetch immediately, then every 1 second for real-time updates
    fetchMarketData();
    const marketInterval = setInterval(fetchMarketData, 1000);

    return () => clearInterval(marketInterval);
  }, [sessionId, selectedSymbol]);

  // Live trades feed
  useEffect(() => {
    if (!sessionId) return;

    const fetchTrades = async () => {
      try {
        const response = await fetch(`/api/market/trades?sessionId=${sessionId}&limit=20`);
        if (response.ok) {
          const data = await response.json();
          setTrades(data.trades || []);
        }
      } catch (error) {
        console.error('Failed to fetch trades:', error);
      }
    };

    fetchTrades();
    const tradesInterval = setInterval(fetchTrades, 2000);

    return () => clearInterval(tradesInterval);
  }, [sessionId]);

  // Portfolio updates
  useEffect(() => {
    if (!sessionId || !user) return;

    const fetchPortfolio = async () => {
      try {
        const response = await fetch(`/api/instructor-session/portfolio?sessionId=${sessionId}&userId=${user.id}`);
        if (response.ok) {
          const data = await response.json();
          setPositions(data.positions || []);
          setPortfolioValue(data.totalValue || 10000);
          setDayPnL(data.unrealizedPnL || 0);
          setBuyingPower(data.buyingPower || 10000);
        }
      } catch (error) {
        console.error('Failed to fetch portfolio:', error);
      }
    };

    fetchPortfolio();
    const portfolioInterval = setInterval(fetchPortfolio, 3000);

    return () => clearInterval(portfolioInterval);
  }, [sessionId, user]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;

      switch (e.key.toLowerCase()) {
        case 'b':
          e.preventDefault();
          executeOrder('BUY');
          break;
        case 's':
          e.preventDefault();
          executeOrder('SELL');
          break;
        case 'q':
          e.preventDefault();
          qtyInputRef.current?.focus();
          qtyInputRef.current?.select();
          break;
        case 'p':
          e.preventDefault();
          if (orderType !== 'MKT') {
            priceInputRef.current?.focus();
            priceInputRef.current?.select();
          }
          break;
        case 'm':
          e.preventDefault();
          setOrderType('MKT');
          setOrderPrice('');
          break;
        case 'l':
          e.preventDefault();
          setOrderType('LMT');
          setOrderPrice(marketData[selectedSymbol]?.last.toFixed(2) || '');
          break;
        case '1':
          e.preventDefault();
          setOrderQty('100');
          break;
        case '2':
          e.preventDefault();
          setOrderQty('200');
          break;
        case '3':
          e.preventDefault();
          setOrderQty('500');
          break;
        case '4':
          e.preventDefault();
          setOrderQty('1000');
          break;
        case 'escape':
          e.preventDefault();
          setOrderQty('100');
          setOrderPrice('');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [orderType, selectedSymbol, marketData]);

  const executeOrder = async (side: 'BUY' | 'SELL') => {
    if (loading || !sessionId || !user) return;
    setLoading(true);

    const qty = parseInt(orderQty) || 100;
    const currentMarket = marketData[selectedSymbol];
    
    if (!currentMarket) {
      setLoading(false);
      return;
    }

    let price = 0;
    if (orderType === 'MKT') {
      price = side === 'BUY' ? currentMarket.ask : currentMarket.bid;
    } else {
      price = parseFloat(orderPrice) || currentMarket.last;
    }

    try {
      // Submit real order to market engine
      const orderData = {
        sessionId,
        userId: user.id,
        symbol: selectedSymbol,
        side,
        quantity: qty,
        type: orderType,
        price: orderType === 'MKT' ? null : price
      };

      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
      });

      if (response.ok) {
        const result = await response.json();
        console.log(`🚀 ORDER SUBMITTED: ${side} ${qty} ${selectedSymbol} @ $${price.toFixed(2)} (${orderType})`);
        
        // Flash notification
        const notification = document.createElement('div');
        notification.className = `fixed top-4 right-4 z-50 px-4 py-2 rounded text-white font-bold ${
          side === 'BUY' ? 'bg-green-600' : 'bg-red-600'
        }`;
        notification.textContent = `${side} ${qty} ${selectedSymbol} @ $${price.toFixed(2)} - ${result.status}`;
        document.body.appendChild(notification);
        
        setTimeout(() => {
          notification.remove();
        }, 3000);

        // Reset order form for rapid trading
        if (orderType === 'MKT') {
          setOrderQty('100');
        }

      } else {
        const error = await response.json();
        console.error('Order failed:', error.error);
        
        // Show error notification
        const notification = document.createElement('div');
        notification.className = 'fixed top-4 right-4 z-50 px-4 py-2 rounded bg-red-600 text-white font-bold';
        notification.textContent = `ORDER REJECTED: ${error.error}`;
        document.body.appendChild(notification);
        
        setTimeout(() => {
          notification.remove();
        }, 5000);
      }

    } catch (error) {
      console.error('Order execution failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timestamp: number | string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatNumber = (num: number, decimals: number = 2) => {
    return num.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  };

  // Session timer
  const getSessionTime = () => {
    if (!sessionInfo) return '00:00:00';
    
    const now = new Date();
    const start = new Date(sessionInfo.startTime);
    const elapsed = Math.floor((now.getTime() - start.getTime()) / 1000);
    
    const hours = Math.floor(elapsed / 3600);
    const minutes = Math.floor((elapsed % 3600) / 60);
    const seconds = elapsed % 60;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const currentMarket = marketData[selectedSymbol];
  const spread = currentMarket ? currentMarket.ask - currentMarket.bid : 0;

  if (!user) {
    return (
      <div className="h-screen bg-black flex items-center justify-center">
        <div className="text-green-400 font-mono">Loading terminal...</div>
      </div>
    );
  }

  if (!sessionId || !sessionInfo) {
    return (
      <div className="h-screen bg-black flex items-center justify-center">
        <div className="text-center max-w-md mx-auto">
          <div className="text-red-400 font-mono text-xl mb-4">⚠️ No Active Session</div>
          <div className="text-gray-400 font-mono mb-6">
            There is currently no active trading session.
            <br />
            Please wait for your instructor to start a session.
          </div>
          <div className="space-y-3">
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-mono py-2 px-4 border border-blue-400 transition-colors"
            >
              🔄 Check for Session
            </button>
            <button
              onClick={() => router.push('/simple-login')}
              className="w-full bg-gray-600 hover:bg-gray-700 text-white font-mono py-2 px-4 border border-gray-400 transition-colors"
            >
              ← Back to Login
            </button>
          </div>
          <div className="text-xs text-gray-600 font-mono mt-4">
            Session will appear automatically when instructor starts trading
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-black text-green-400 font-mono text-xs overflow-hidden select-none">
      {/* Top Status Bar */}
      <div className="bg-gray-900 border-b border-green-600 px-3 py-1 flex justify-between items-center">
        <div className="flex items-center space-x-6">
          <span className="text-yellow-400 font-bold tracking-wider">HYPERTICK LIVE TERMINAL</span>
          <span className="text-gray-500">|</span>
          <span className="text-blue-400">{user.firstName} {user.lastName}</span>
          <span className="text-gray-500">|</span>
          <span className={`font-bold ${sessionInfo?.status === 'ACTIVE' ? 'text-green-400 animate-pulse' : 'text-red-400'}`}>
            ● {sessionInfo?.status || 'DISCONNECTED'}
          </span>
          <span className="text-gray-500">|</span>
          <span className="text-white">{getSessionTime()}</span>
          <span className="text-gray-500">|</span>
          <span className="text-gray-400">SESSION: {sessionId.slice(-8)}</span>
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-gray-400">P&L:</div>
          <div className={`font-bold ${dayPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {dayPnL >= 0 ? '+' : ''}${formatNumber(dayPnL)}
          </div>
          <div className="text-gray-500">|</div>
          <div className="text-gray-400">NAV:</div>
          <div className="text-blue-400 font-bold">${formatNumber(portfolioValue)}</div>
          <div className="text-gray-500">|</div>
          <div className="text-gray-400">BP:</div>
          <div className="text-cyan-400 font-bold">${formatNumber(buyingPower)}</div>
        </div>
      </div>

      <div className="flex h-full">
        {/* Left Panel - Market Data & Order Entry */}
        <div className="w-80 border-r border-green-600 bg-gray-950">
          {/* Symbol Tabs */}
          <div className="bg-gray-900 border-b border-green-600 p-1">
            <div className="flex">
              {Object.keys(marketData).map((symbol) => (
                <button
                  key={symbol}
                  onClick={() => setSelectedSymbol(symbol)}
                  className={`px-3 py-1 text-xs font-bold border ${
                    selectedSymbol === symbol
                      ? 'bg-green-600 text-black border-green-400'
                      : 'bg-gray-700 text-green-400 border-gray-600 hover:bg-gray-600'
                  }`}
                >
                  {symbol}
                </button>
              ))}
            </div>
          </div>

          {/* Current Quote */}
          {currentMarket && (
            <div className="border-b border-green-600 p-3 bg-black">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <div className="text-white font-bold text-xl tracking-wider">{selectedSymbol}</div>
                  <div className="text-yellow-400 text-2xl font-bold tracking-wider">
                    {formatNumber(currentMarket.last)}
                  </div>
                </div>
                <div className="text-right">
                  <div className={`font-bold ${currentMarket.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {currentMarket.change >= 0 ? '+' : ''}{formatNumber(currentMarket.change)}
                  </div>
                  <div className={`text-xs ${currentMarket.changePercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    ({currentMarket.changePercent >= 0 ? '+' : ''}{formatNumber(currentMarket.changePercent)}%)
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-green-900 border border-green-600 p-1">
                  <div className="text-gray-400 text-xs">BID</div>
                  <div className="text-green-400 font-bold">{formatNumber(currentMarket.bid)}</div>
                </div>
                <div className="bg-gray-900 border border-gray-600 p-1">
                  <div className="text-gray-400 text-xs">SPREAD</div>
                  <div className="text-yellow-400 font-bold">{formatNumber(spread, 3)}</div>
                </div>
                <div className="bg-red-900 border border-red-600 p-1">
                  <div className="text-gray-400 text-xs">ASK</div>
                  <div className="text-red-400 font-bold">{formatNumber(currentMarket.ask)}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-2 text-xs">
                <div>
                  <span className="text-gray-400">VOL:</span>
                  <span className="text-white ml-1">{(currentMarket.volume / 1000).toFixed(0)}K</span>
                </div>
                <div>
                  <span className="text-gray-400">H/L:</span>
                  <span className="text-white ml-1">{formatNumber(currentMarket.high)}/{formatNumber(currentMarket.low)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Order Entry */}
          <div className="border-b border-green-600 p-3 bg-gray-950">
            <div className="text-green-400 font-bold mb-3 tracking-wider">RAPID ORDER ENTRY</div>
            
            {/* Order Type Buttons */}
            <div className="grid grid-cols-4 gap-1 mb-3">
              {['MKT', 'LMT', 'STP', 'STPLMT'].map((type) => (
                <button
                  key={type}
                  onClick={() => setOrderType(type as any)}
                  className={`py-1 text-xs font-bold border ${
                    orderType === type
                      ? 'bg-blue-600 text-white border-blue-400'
                      : 'bg-gray-700 text-gray-300 border-gray-600 hover:bg-gray-600'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>

            {/* Quantity and Price */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div>
                <label className="block text-gray-400 text-xs mb-1">QTY (Q)</label>
                <input
                  ref={qtyInputRef}
                  type="number"
                  value={orderQty}
                  onChange={(e) => setOrderQty(e.target.value)}
                  className="w-full bg-black border border-green-600 text-green-400 px-2 py-1 font-mono focus:border-yellow-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-gray-400 text-xs mb-1">
                  PRICE (P) {orderType === 'MKT' && '(MKT)'}
                </label>
                <input
                  ref={priceInputRef}
                  type="number"
                  step="0.01"
                  value={orderPrice}
                  onChange={(e) => setOrderPrice(e.target.value)}
                  disabled={orderType === 'MKT'}
                  className="w-full bg-black border border-green-600 text-green-400 px-2 py-1 font-mono focus:border-yellow-400 focus:outline-none disabled:bg-gray-800 disabled:border-gray-600"
                  placeholder={orderType === 'MKT' ? 'MARKET' : currentMarket?.last.toFixed(2) || ''}
                />
              </div>
            </div>

            {/* Quick Size Buttons */}
            <div className="grid grid-cols-4 gap-1 mb-4">
              {[
                { label: '100', value: '100' },
                { label: '200', value: '200' },
                { label: '500', value: '500' },
                { label: '1K', value: '1000' }
              ].map((size) => (
                <button
                  key={size.label}
                  onClick={() => setOrderQty(size.value)}
                  className="py-1 text-xs bg-gray-700 text-gray-300 border border-gray-600 hover:bg-gray-600 font-mono"
                >
                  {size.label}
                </button>
              ))}
            </div>

            {/* Buy/Sell Buttons */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => executeOrder('BUY')}
                disabled={loading || !currentMarket || sessionInfo?.status !== 'ACTIVE'}
                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-black font-bold py-3 border border-green-400 transition-colors"
              >
                {loading ? 'SENDING...' : 'BUY (B)'}
              </button>
              <button
                onClick={() => executeOrder('SELL')}
                disabled={loading || !currentMarket || sessionInfo?.status !== 'ACTIVE'}
                className="bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white font-bold py-3 border border-red-400 transition-colors"
              >
                {loading ? 'SENDING...' : 'SELL (S)'}
              </button>
            </div>
          </div>

          {/* Positions */}
          <div className="flex-1 p-3 bg-black">
            <div className="text-green-400 font-bold mb-2 tracking-wider">POSITIONS</div>
            {positions.length === 0 ? (
              <div className="text-gray-500 text-center py-4">No positions</div>
            ) : (
              <div className="space-y-2">
                {positions.map((pos, idx) => (
                  <div key={idx} className="border border-green-600 p-2 bg-gray-950">
                    <div className="flex justify-between">
                      <span className="text-white font-bold">{pos.symbol}</span>
                      <span className={pos.qty > 0 ? 'text-green-400' : 'text-red-400'}>
                        {pos.qty > 0 ? 'LONG' : 'SHORT'} {Math.abs(pos.qty)}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs mt-1">
                      <div>
                        <span className="text-gray-400">Avg:</span>
                        <span className="text-white ml-1">{formatNumber(pos.avgPx)}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">P&L:</span>
                        <span className={`ml-1 ${pos.unrealizedPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {pos.unrealizedPnL >= 0 ? '+' : ''}${formatNumber(pos.unrealizedPnL)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Center Panel - Order Book */}
        <div className="w-64 border-r border-green-600 bg-black">
          <div className="bg-gray-900 border-b border-green-600 p-2">
            <div className="text-green-400 font-bold tracking-wider">DEPTH - {selectedSymbol}</div>
          </div>
          
          <div className="text-xs">
            {/* Header */}
            <div className="bg-gray-800 px-3 py-1 flex justify-between text-gray-400 border-b border-gray-700">
              <span>PRICE</span>
              <span>SIZE</span>
              <span>ORD</span>
            </div>

            {/* Asks (Sell Orders) */}
            <div className="border-b border-yellow-600">
              {orderBook.asks.slice().reverse().map((ask, idx) => (
                <div
                  key={idx}
                  className="flex justify-between px-3 py-0.5 hover:bg-red-900 cursor-pointer border-b border-gray-800"
                  onClick={() => {
                    if (orderType !== 'MKT') {
                      setOrderPrice(ask.price.toFixed(2));
                    }
                  }}
                >
                  <span className="text-red-400 font-mono">{formatNumber(ask.price)}</span>
                  <span className="text-gray-300 font-mono">{ask.size.toLocaleString()}</span>
                  <span className="text-gray-500 font-mono">{ask.count}</span>
                </div>
              ))}
            </div>
            
            {/* Spread Display */}
            <div className="bg-yellow-900 px-3 py-1 text-center border-b border-yellow-600">
              <span className="text-yellow-400 font-bold font-mono">
                SPREAD: {formatNumber(spread, 3)}
              </span>
            </div>
            
            {/* Bids (Buy Orders) */}
            <div>
              {orderBook.bids.map((bid, idx) => (
                <div
                  key={idx}
                  className="flex justify-between px-3 py-0.5 hover:bg-green-900 cursor-pointer border-b border-gray-800"
                  onClick={() => {
                    if (orderType !== 'MKT') {
                      setOrderPrice(bid.price.toFixed(2));
                    }
                  }}
                >
                  <span className="text-green-400 font-mono">{formatNumber(bid.price)}</span>
                  <span className="text-gray-300 font-mono">{bid.size.toLocaleString()}</span>
                  <span className="text-gray-500 font-mono">{bid.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Panel - Time & Sales */}
        <div className="flex-1 bg-black">
          <div className="bg-gray-900 border-b border-green-600 p-2">
            <div className="text-green-400 font-bold tracking-wider">TIME & SALES - {selectedSymbol}</div>
          </div>
          
          <div className="text-xs">
            {/* Header */}
            <div className="bg-gray-800 px-3 py-1 flex justify-between text-gray-400 border-b border-gray-700">
              <span>TIME</span>
              <span>PRICE</span>
              <span>SIZE</span>
              <span>SIDE</span>
            </div>

            {/* Trades */}
            <div className="h-full overflow-y-auto">
              {trades.filter(trade => trade.symbol === selectedSymbol).map((trade, idx) => (
                <div
                  key={trade.id}
                  className={`flex justify-between px-3 py-1 border-b border-gray-800 ${
                    idx === 0 ? 'bg-gray-900' : 'hover:bg-gray-900'
                  } ${trade.userId === user?.id ? 'bg-blue-900' : ''}`}
                >
                  <span className="text-gray-400 font-mono">{formatTime(trade.timestamp)}</span>
                  <span className="text-yellow-400 font-mono font-bold">{formatNumber(trade.price)}</span>
                  <span className="text-white font-mono">{trade.size.toLocaleString()}</span>
                  <span className={`font-bold ${trade.side === 'BUY' ? 'text-green-400' : 'text-red-400'}`}>
                    {trade.side.charAt(0)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Hotkey Reference */}
      <div className="fixed bottom-2 right-2 bg-gray-900 border border-green-600 p-2 text-xs">
        <div className="text-green-400 font-bold mb-1">HOTKEYS</div>
        <div className="text-gray-300 space-y-0.5 font-mono">
          <div>B=Buy | S=Sell | Q=Qty | P=Price</div>
          <div>M=Market | L=Limit | 1-4=Size</div>
          <div>ESC=Reset | Click prices to fill</div>
        </div>
      </div>
    </div>
  );
}