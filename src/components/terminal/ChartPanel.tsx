/**
 * Chart Panel - Technical Analysis & Price Charts
 * Privilege Code: 3
 */

'use client';

import { useState, useEffect } from 'react';

interface ChartProps {
  user: any;
  sessionState: any;
  socket: any;
}

interface OHLC {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export default function ChartPanel({ user, sessionState, socket }: ChartProps) {
  const [selectedSymbol, setSelectedSymbol] = useState('AOE');
  const [timeframe, setTimeframe] = useState('1m');
  const [indicators, setIndicators] = useState({
    sma20: true,
    sma50: false,
    rsi: false,
    macd: false,
    volume: true
  });

  const [chartData] = useState<OHLC[]>([
    { timestamp: '09:30', open: 49.50, high: 49.75, low: 49.25, close: 49.60, volume: 1250 },
    { timestamp: '09:31', open: 49.60, high: 49.85, low: 49.45, close: 49.70, volume: 1480 },
    { timestamp: '09:32', open: 49.70, high: 50.10, low: 49.65, close: 49.95, volume: 2100 },
    { timestamp: '09:33', open: 49.95, high: 50.15, low: 49.80, close: 50.05, volume: 1875 },
    { timestamp: '09:34', open: 50.05, high: 50.25, low: 49.90, close: 50.20, volume: 1650 },
    { timestamp: '09:35', open: 50.20, high: 50.35, low: 50.00, close: 50.15, volume: 1420 },
    { timestamp: '09:36', open: 50.15, high: 50.30, low: 49.95, close: 50.25, volume: 1890 },
    { timestamp: '09:37', open: 50.25, high: 50.45, low: 50.10, close: 50.35, volume: 2250 },
  ]);

  const currentPrice = chartData[chartData.length - 1]?.close || 50.00;
  const priceChange = currentPrice - (chartData[0]?.open || 49.50);
  const priceChangePercent = (priceChange / (chartData[0]?.open || 49.50)) * 100;

  const maxPrice = Math.max(...chartData.map(d => d.high));
  const minPrice = Math.min(...chartData.map(d => d.low));
  const priceRange = maxPrice - minPrice;

  const drawCandle = (data: OHLC, index: number) => {
    const x = index * 25 + 10;
    const bodyHeight = Math.abs(data.close - data.open) / priceRange * 80;
    const wickTop = (maxPrice - data.high) / priceRange * 80;
    const wickBottom = (data.low - minPrice) / priceRange * 80;
    const bodyTop = data.close > data.open ? 
      (maxPrice - data.close) / priceRange * 80 : 
      (maxPrice - data.open) / priceRange * 80;

    const isGreen = data.close >= data.open;

    return (
      <g key={index}>
        {/* Wick */}
        <line 
          x1={x} y1={wickTop} x2={x} y2={100 - wickBottom}
          stroke={isGreen ? '#10b981' : '#ef4444'} 
          strokeWidth="1"
        />
        {/* Body */}
        <rect
          x={x - 4}
          y={bodyTop}
          width="8"
          height={bodyHeight || 1}
          fill={isGreen ? '#10b981' : '#ef4444'}
          stroke={isGreen ? '#10b981' : '#ef4444'}
        />
      </g>
    );
  };

  return (
    <div className="h-full p-3 text-xs bg-black text-white">
      <div className="text-orange-400 font-bold mb-3 border-b border-gray-700 pb-1">
        PRICE CHART & TECHNICAL ANALYSIS
      </div>
      
      {/* Chart Controls */}
      <div className="mb-3 flex gap-4">
        <div>
          <select
            value={selectedSymbol}
            onChange={(e) => setSelectedSymbol(e.target.value)}
            className="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white text-xs"
          >
            <option value="AOE">AOE</option>
            <option value="BOND1">BOND1</option>
            <option value="BOND2">BOND2</option>
            <option value="BOND3">BOND3</option>
          </select>
        </div>
        <div>
          <select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value)}
            className="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white text-xs"
          >
            <option value="1m">1 Min</option>
            <option value="5m">5 Min</option>
            <option value="15m">15 Min</option>
            <option value="1h">1 Hour</option>
            <option value="1d">Daily</option>
          </select>
        </div>
      </div>

      {/* Price Summary */}
      <div className="bg-gray-900 p-2 rounded mb-3 text-xs">
        <div className="grid grid-cols-4 gap-2">
          <div>
            <span className="text-gray-400">Last:</span>
            <div className="text-white font-bold">${currentPrice.toFixed(2)}</div>
          </div>
          <div>
            <span className="text-gray-400">Change:</span>
            <div className={priceChange >= 0 ? 'text-green-400' : 'text-red-400'}>
              {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}
            </div>
          </div>
          <div>
            <span className="text-gray-400">%:</span>
            <div className={priceChangePercent >= 0 ? 'text-green-400' : 'text-red-400'}>
              {priceChangePercent >= 0 ? '+' : ''}{priceChangePercent.toFixed(2)}%
            </div>
          </div>
          <div>
            <span className="text-gray-400">Volume:</span>
            <div className="text-white">{chartData.reduce((sum, d) => sum + d.volume, 0).toLocaleString()}</div>
          </div>
        </div>
      </div>

      {/* Candlestick Chart */}
      <div className="mb-3">
        <div className="bg-gray-900 p-2 rounded">
          <svg width="100%" height="120" viewBox="0 0 220 100">
            {chartData.map((data, index) => drawCandle(data, index))}
            
            {/* Price Labels */}
            <text x="225" y="15" fill="#9ca3af" fontSize="8">${maxPrice.toFixed(2)}</text>
            <text x="225" y="95" fill="#9ca3af" fontSize="8">${minPrice.toFixed(2)}</text>
          </svg>
        </div>
      </div>

      {/* Technical Indicators */}
      <div className="mb-3">
        <div className="text-yellow-400 font-bold mb-1">INDICATORS</div>
        <div className="grid grid-cols-2 gap-1 text-xs">
          <label className="flex items-center">
            <input 
              type="checkbox" 
              checked={indicators.sma20}
              onChange={(e) => setIndicators(prev => ({...prev, sma20: e.target.checked}))}
              className="mr-1"
            />
            <span>SMA 20</span>
          </label>
          <label className="flex items-center">
            <input 
              type="checkbox" 
              checked={indicators.sma50}
              onChange={(e) => setIndicators(prev => ({...prev, sma50: e.target.checked}))}
              className="mr-1"
            />
            <span>SMA 50</span>
          </label>
          <label className="flex items-center">
            <input 
              type="checkbox" 
              checked={indicators.rsi}
              onChange={(e) => setIndicators(prev => ({...prev, rsi: e.target.checked}))}
              className="mr-1"
            />
            <span>RSI</span>
          </label>
          <label className="flex items-center">
            <input 
              type="checkbox" 
              checked={indicators.macd}
              onChange={(e) => setIndicators(prev => ({...prev, macd: e.target.checked}))}
              className="mr-1"
            />
            <span>MACD</span>
          </label>
        </div>
      </div>

      {/* Chart Actions */}
      <div className="grid grid-cols-3 gap-1">
        <button className="bg-blue-700 hover:bg-blue-600 text-white py-1 px-2 rounded text-xs">
          ZOOM
        </button>
        <button className="bg-purple-700 hover:bg-purple-600 text-white py-1 px-2 rounded text-xs">
          ALERTS
        </button>
        <button className="bg-gray-700 hover:bg-gray-600 text-white py-1 px-2 rounded text-xs">
          EXPORT
        </button>
      </div>
    </div>
  );
}