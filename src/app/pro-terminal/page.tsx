/**
 * Professional Trading Terminal
 * 
 * High-density, real-time trading interface designed for professional traders.
 * Features dense data display, rapid order entry, and institutional-grade tools.
 */

'use client';

import { useState, useEffect, useRef } from 'react';

interface OrderBookEntry {
  price: number;
  size: number;
  total: number;
}

interface Trade {
  id: string;
  symbol: string;
  price: number;
  size: number;
  side: 'BUY' | 'SELL';
  timestamp: Date;
}

interface Position {
  symbol: string;
  qty: number;
  avgPx: number;
  mktVal: number;
  unrealizedPnL: number;
  realizedPnL: number;
}

export default function ProTradingTerminal() {
  const [selectedSymbol, setSelectedSymbol] = useState('VCR');
  const [orderQty, setOrderQty] = useState('100');
  const [orderPrice, setOrderPrice] = useState('');
  const [orderType, setOrderType] = useState<'MKT' | 'LMT' | 'STP'>('MKT');
  const [timeInForce, setTimeInForce] = useState<'DAY' | 'IOC' | 'FOK' | 'GTC'>('DAY');
  
  // Market data
  const [marketData, setMarketData] = useState({
    VCR: { last: 50.23, bid: 50.21, ask: 50.25, change: 0.15, volume: 2847563 },
    PNR: { last: 75.08, bid: 75.05, ask: 75.12, change: -0.08, volume: 1923847 },
    AAPL: { last: 152.34, bid: 152.31, ask: 152.37, change: 1.24, volume: 45827364 },
    MSFT: { last: 285.67, bid: 285.64, ask: 285.71, change: -0.89, volume: 23948572 }
  });

  const [orderBook, setOrderBook] = useState<{
    bids: OrderBookEntry[];
    asks: OrderBookEntry[];
  }>({
    bids: [
      { price: 50.21, size: 2500, total: 2500 },
      { price: 50.20, size: 1800, total: 4300 },
      { price: 50.19, size: 3200, total: 7500 },
      { price: 50.18, size: 1500, total: 9000 },
      { price: 50.17, size: 2100, total: 11100 }
    ],
    asks: [
      { price: 50.25, size: 1900, total: 1900 },
      { price: 50.26, size: 2400, total: 4300 },
      { price: 50.27, size: 1600, total: 5900 },
      { price: 50.28, size: 2800, total: 8700 },
      { price: 50.29, size: 1200, total: 9900 }
    ]
  });

  const [recentTrades, setRecentTrades] = useState<Trade[]>([
    { id: '1', symbol: 'VCR', price: 50.23, size: 100, side: 'BUY', timestamp: new Date() },
    { id: '2', symbol: 'VCR', price: 50.22, size: 250, side: 'SELL', timestamp: new Date() },
    { id: '3', symbol: 'VCR', price: 50.24, size: 150, side: 'BUY', timestamp: new Date() }
  ]);

  const [positions, setPositions] = useState<Position[]>([
    { symbol: 'VCR', qty: 500, avgPx: 49.87, mktVal: 25115, unrealizedPnL: 180, realizedPnL: 0 },
    { symbol: 'PNR', qty: -200, avgPx: 75.45, mktVal: -15016, unrealizedPnL: 74, realizedPnL: 125 }
  ]);

  const orderQtyInputRef = useRef<HTMLInputElement>(null);
  const orderPriceInputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcuts for rapid trading
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (e.target instanceof HTMLInputElement) return;

      switch (e.key.toLowerCase()) {
        case 'b':
          e.preventDefault();
          submitOrder('BUY');
          break;
        case 's':
          e.preventDefault();
          submitOrder('SELL');
          break;
        case 'q':
          e.preventDefault();
          orderQtyInputRef.current?.focus();
          orderQtyInputRef.current?.select();
          break;
        case 'p':
          e.preventDefault();
          orderPriceInputRef.current?.focus();
          orderPriceInputRef.current?.select();
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
        case 'm':
          e.preventDefault();
          setOrderType('MKT');
          break;
        case 'l':
          e.preventDefault();
          setOrderType('LMT');
          break;
        case 'escape':
          e.preventDefault();
          setOrderQty('');
          setOrderPrice('');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const submitOrder = (side: 'BUY' | 'SELL') => {
    const currentMarket = marketData[selectedSymbol as keyof typeof marketData];
    const price = orderType === 'MKT' 
      ? (side === 'BUY' ? currentMarket.ask : currentMarket.bid)
      : parseFloat(orderPrice) || currentMarket.last;

    console.log(`🚀 ${side} ${orderQty} ${selectedSymbol} @ ${price.toFixed(2)} (${orderType})`);
    
    // Add to recent trades
    const newTrade: Trade = {
      id: Date.now().toString(),
      symbol: selectedSymbol,
      price,
      size: parseInt(orderQty) || 100,
      side,
      timestamp: new Date()
    };
    
    setRecentTrades(prev => [newTrade, ...prev.slice(0, 9)]);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
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

  const currentMarket = marketData[selectedSymbol as keyof typeof marketData];

  return (
    <div className="h-screen bg-black text-green-400 font-mono text-xs overflow-hidden">
      {/* Header Bar */}
      <div className="bg-gray-900 border-b border-gray-700 px-2 py-1 flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <span className="text-yellow-400 font-bold">HYPERTICK PRO</span>
          <span className="text-gray-400">|</span>
          <span>Session: MKT_EFF_001</span>
          <span className="text-gray-400">|</span>
          <span className="text-green-400">MARKET OPEN</span>
          <span className="text-gray-400">|</span>
          <span>{formatTime(new Date())}</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-gray-400">P&L:</span>
          <span className="text-green-400">+$254.00</span>
          <span className="text-gray-400">|</span>
          <span className="text-gray-400">BP:</span>
          <span className="text-blue-400">$98,746</span>
        </div>
      </div>

      <div className="flex h-full">
        {/* Left Panel - Market Watch & Order Entry */}
        <div className="w-80 border-r border-gray-700 flex flex-col">
          {/* Symbol Selector */}
          <div className="bg-gray-900 border-b border-gray-700 p-2">
            <div className="flex space-x-1">
              {Object.keys(marketData).map((symbol) => (
                <button
                  key={symbol}
                  onClick={() => setSelectedSymbol(symbol)}
                  className={`px-2 py-1 text-xs font-bold ${
                    selectedSymbol === symbol 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {symbol}
                </button>
              ))}
            </div>
          </div>

          {/* Current Symbol Quote */}
          <div className="bg-gray-900 border-b border-gray-700 p-2">
            <div className="text-white font-bold text-lg">{selectedSymbol}</div>
            <div className="flex justify-between items-center">
              <div>
                <div className="text-yellow-400 text-lg font-bold">
                  {formatNumber(currentMarket.last)}
                </div>
                <div className={`text-xs ${currentMarket.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {currentMarket.change >= 0 ? '+' : ''}{formatNumber(currentMarket.change)} 
                  ({formatNumber((currentMarket.change / currentMarket.last) * 100)}%)
                </div>
              </div>
              <div className="text-right">
                <div className="text-green-400">BID: {formatNumber(currentMarket.bid)}</div>
                <div className="text-red-400">ASK: {formatNumber(currentMarket.ask)}</div>
                <div className="text-gray-400 text-xs">VOL: {currentMarket.volume.toLocaleString()}</div>
              </div>
            </div>
          </div>

          {/* Quick Order Entry */}
          <div className="bg-gray-900 border-b border-gray-700 p-2">
            <div className="text-gray-300 font-bold mb-2">QUICK ORDER</div>
            
            <div className="grid grid-cols-2 gap-2 mb-2">
              <div>
                <label className="block text-gray-400 text-xs">QTY (Q)</label>
                <input
                  ref={orderQtyInputRef}
                  type="number"
                  value={orderQty}
                  onChange={(e) => setOrderQty(e.target.value)}
                  className="w-full bg-black border border-gray-600 text-green-400 px-1 py-1 text-xs focus:border-blue-400"
                  placeholder="100"
                />
              </div>
              <div>
                <label className="block text-gray-400 text-xs">PRICE (P)</label>
                <input
                  ref={orderPriceInputRef}
                  type="number"
                  step="0.01"
                  value={orderPrice}
                  onChange={(e) => setOrderPrice(e.target.value)}
                  disabled={orderType === 'MKT'}
                  className="w-full bg-black border border-gray-600 text-green-400 px-1 py-1 text-xs focus:border-blue-400 disabled:bg-gray-800"
                  placeholder={orderType === 'MKT' ? 'MARKET' : currentMarket.last.toFixed(2)}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-1 mb-2">
              {['MKT', 'LMT', 'STP'].map((type) => (
                <button
                  key={type}
                  onClick={() => setOrderType(type as any)}
                  className={`py-1 text-xs ${
                    orderType === type
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-4 gap-1 mb-3">
              {['100', '200', '500', '1K'].map((qty) => (
                <button
                  key={qty}
                  onClick={() => setOrderQty(qty === '1K' ? '1000' : qty)}
                  className="py-1 text-xs bg-gray-700 text-gray-300 hover:bg-gray-600"
                >
                  {qty}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => submitOrder('BUY')}
                className="bg-green-600 hover:bg-green-700 text-white py-2 font-bold text-sm"
              >
                BUY (B)
              </button>
              <button
                onClick={() => submitOrder('SELL')}
                className="bg-red-600 hover:bg-red-700 text-white py-2 font-bold text-sm"
              >
                SELL (S)
              </button>
            </div>
          </div>

          {/* Positions */}
          <div className="flex-1 bg-gray-900 p-2">
            <div className="text-gray-300 font-bold mb-2">POSITIONS</div>
            <div className="space-y-1">
              {positions.map((pos, idx) => (
                <div key={idx} className="border border-gray-700 p-1">
                  <div className="flex justify-between">
                    <span className="text-white font-bold">{pos.symbol}</span>
                    <span className={pos.qty > 0 ? 'text-green-400' : 'text-red-400'}>
                      {pos.qty > 0 ? 'LONG' : 'SHORT'} {Math.abs(pos.qty)}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span>Avg: {formatNumber(pos.avgPx)}</span>
                    <span className={pos.unrealizedPnL >= 0 ? 'text-green-400' : 'text-red-400'}>
                      {pos.unrealizedPnL >= 0 ? '+' : ''}${formatNumber(pos.unrealizedPnL)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Center Panel - Order Book */}
        <div className="w-64 border-r border-gray-700">
          <div className="bg-gray-900 border-b border-gray-700 p-2">
            <div className="text-gray-300 font-bold">ORDER BOOK - {selectedSymbol}</div>
          </div>
          
          <div className="h-full bg-black">
            {/* Asks */}
            <div className="border-b border-gray-700">
              {orderBook.asks.slice().reverse().map((ask, idx) => (
                <div key={idx} className="flex justify-between px-2 py-0.5 hover:bg-gray-800 cursor-pointer">
                  <span className="text-red-400">{formatNumber(ask.price)}</span>
                  <span className="text-gray-300">{ask.size}</span>
                  <span className="text-gray-500 text-xs">{ask.total}</span>
                </div>
              ))}
            </div>
            
            {/* Spread */}
            <div className="bg-yellow-900 px-2 py-1 text-center">
              <span className="text-yellow-400 font-bold">
                SPREAD: {formatNumber(currentMarket.ask - currentMarket.bid)}
              </span>
            </div>
            
            {/* Bids */}
            <div>
              {orderBook.bids.map((bid, idx) => (
                <div key={idx} className="flex justify-between px-2 py-0.5 hover:bg-gray-800 cursor-pointer">
                  <span className="text-green-400">{formatNumber(bid.price)}</span>
                  <span className="text-gray-300">{bid.size}</span>
                  <span className="text-gray-500 text-xs">{bid.total}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Panel - Time & Sales + Analytics */}
        <div className="flex-1 flex flex-col">
          {/* Time & Sales */}
          <div className="h-1/2 border-b border-gray-700">
            <div className="bg-gray-900 border-b border-gray-700 p-2">
              <div className="text-gray-300 font-bold">TIME & SALES - {selectedSymbol}</div>
            </div>
            <div className="bg-black h-full overflow-y-auto">
              <div className="sticky top-0 bg-gray-800 px-2 py-1 flex justify-between text-xs text-gray-400">
                <span>TIME</span>
                <span>PRICE</span>
                <span>SIZE</span>
                <span>SIDE</span>
              </div>
              {recentTrades.map((trade) => (
                <div key={trade.id} className="flex justify-between px-2 py-0.5 hover:bg-gray-800 text-xs">
                  <span className="text-gray-400">{formatTime(trade.timestamp)}</span>
                  <span className="text-yellow-400">{formatNumber(trade.price)}</span>
                  <span className="text-gray-300">{trade.size}</span>
                  <span className={trade.side === 'BUY' ? 'text-green-400' : 'text-red-400'}>
                    {trade.side}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Market Overview */}
          <div className="h-1/2">
            <div className="bg-gray-900 border-b border-gray-700 p-2">
              <div className="text-gray-300 font-bold">MARKET OVERVIEW</div>
            </div>
            <div className="bg-black p-2 grid grid-cols-2 gap-4 h-full">
              {Object.entries(marketData).map(([symbol, data]) => (
                <div key={symbol} className="border border-gray-700 p-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="text-white font-bold">{symbol}</div>
                      <div className="text-yellow-400 text-lg">{formatNumber(data.last)}</div>
                      <div className={`text-xs ${data.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {data.change >= 0 ? '+' : ''}{formatNumber(data.change)}
                      </div>
                    </div>
                    <div className="text-right text-xs">
                      <div className="text-green-400">{formatNumber(data.bid)}</div>
                      <div className="text-red-400">{formatNumber(data.ask)}</div>
                      <div className="text-gray-400">{(data.volume / 1000000).toFixed(1)}M</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Keyboard Shortcuts Help */}
      <div className="fixed bottom-2 right-2 bg-gray-900 border border-gray-700 p-2 text-xs">
        <div className="text-gray-400 mb-1">HOTKEYS:</div>
        <div className="text-gray-300 space-y-0.5">
          <div>B=Buy | S=Sell | Q=Qty | P=Price</div>
          <div>M=Market | L=Limit | 1-4=Quick Qty</div>
          <div>ESC=Clear | Click prices to auto-fill</div>
        </div>
      </div>
    </div>
  );
}