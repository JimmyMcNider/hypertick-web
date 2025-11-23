/**
 * Modern Trading Components
 * 
 * High-performance, professional trading interface components
 * optimized for rapid data synthesis and execution.
 */

'use client';

import { useState, useEffect, memo } from 'react';

// Price display with animated changes
export const LivePrice = memo(({ 
  price, 
  change, 
  size = 'lg',
  showChange = true 
}: { 
  price: number;
  change?: number;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showChange?: boolean;
}) => {
  const [isFlashing, setIsFlashing] = useState(false);
  const [lastPrice, setLastPrice] = useState(price);

  useEffect(() => {
    if (price !== lastPrice) {
      setIsFlashing(true);
      setLastPrice(price);
      setTimeout(() => setIsFlashing(false), 200);
    }
  }, [price, lastPrice]);

  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-xl',
    xl: 'text-3xl'
  };

  const flashColor = price > lastPrice ? 'bg-green-400' : 'bg-red-400';

  return (
    <div className="relative">
      <div 
        className={`font-mono font-bold transition-all duration-200 ${sizeClasses[size]} ${
          isFlashing ? `${flashColor} text-black px-1 rounded` : ''
        }`}
      >
        ${price.toFixed(2)}
      </div>
      {showChange && change !== undefined && (
        <div className={`text-sm ${change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
          {change >= 0 ? '+' : ''}{(change * 100).toFixed(2)}%
        </div>
      )}
    </div>
  );
});

LivePrice.displayName = 'LivePrice';

// Bid/Ask spread component
export const BidAskSpread = memo(({ 
  bidPrice, 
  askPrice, 
  bidSize, 
  askSize,
  isDarkMode = true 
}: {
  bidPrice: number;
  askPrice: number;
  bidSize: number;
  askSize: number;
  isDarkMode?: boolean;
}) => {
  const spread = askPrice - bidPrice;
  const spreadPercent = (spread / ((bidPrice + askPrice) / 2)) * 100;

  return (
    <div className="grid grid-cols-3 gap-2 text-center">
      <div className={`p-2 rounded ${isDarkMode ? 'bg-green-500 bg-opacity-20' : 'bg-green-50'}`}>
        <div className="text-green-400 text-xs font-semibold">BID</div>
        <div className="font-mono text-sm">${bidPrice.toFixed(2)}</div>
        <div className="text-xs opacity-75">({bidSize})</div>
      </div>
      
      <div className={`p-2 rounded ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
        <div className="text-xs font-semibold opacity-75">SPREAD</div>
        <div className="font-mono text-xs">${spread.toFixed(2)}</div>
        <div className="text-xs opacity-75">{spreadPercent.toFixed(2)}%</div>
      </div>
      
      <div className={`p-2 rounded ${isDarkMode ? 'bg-red-500 bg-opacity-20' : 'bg-red-50'}`}>
        <div className="text-red-400 text-xs font-semibold">ASK</div>
        <div className="font-mono text-sm">${askPrice.toFixed(2)}</div>
        <div className="text-xs opacity-75">({askSize})</div>
      </div>
    </div>
  );
});

BidAskSpread.displayName = 'BidAskSpread';

// Order book depth visualization
export const OrderBookDepth = memo(({ 
  bids, 
  asks, 
  maxDepth = 5,
  isDarkMode = true 
}: {
  bids: Array<{ price: number; size: number }>;
  asks: Array<{ price: number; size: number }>;
  maxDepth?: number;
  isDarkMode?: boolean;
}) => {
  const topBids = bids.slice(0, maxDepth);
  const topAsks = asks.slice(0, maxDepth);
  const maxSize = Math.max(
    ...topBids.map(b => b.size),
    ...topAsks.map(a => a.size)
  );

  return (
    <div className="space-y-1">
      {/* Asks (sell orders) - top down */}
      {topAsks.reverse().map((ask, index) => (
        <div key={`ask-${index}`} className="flex justify-between items-center relative">
          <div 
            className="absolute inset-0 bg-red-500 bg-opacity-10" 
            style={{ width: `${(ask.size / maxSize) * 100}%` }}
          />
          <span className="text-red-400 font-mono text-sm relative z-10">${ask.price.toFixed(2)}</span>
          <span className="text-sm opacity-75 relative z-10">{ask.size}</span>
        </div>
      ))}
      
      {/* Spread line */}
      <div className={`border-t ${isDarkMode ? 'border-gray-600' : 'border-gray-300'} my-2`} />
      
      {/* Bids (buy orders) - top down */}
      {topBids.map((bid, index) => (
        <div key={`bid-${index}`} className="flex justify-between items-center relative">
          <div 
            className="absolute inset-0 bg-green-500 bg-opacity-10" 
            style={{ width: `${(bid.size / maxSize) * 100}%` }}
          />
          <span className="text-green-400 font-mono text-sm relative z-10">${bid.price.toFixed(2)}</span>
          <span className="text-sm opacity-75 relative z-10">{bid.size}</span>
        </div>
      ))}
    </div>
  );
});

OrderBookDepth.displayName = 'OrderBookDepth';

// Quick action buttons for rapid trading
export const QuickActionPanel = memo(({ 
  onBuy, 
  onSell, 
  symbol,
  disabled = false,
  isDarkMode = true 
}: {
  onBuy: () => void;
  onSell: () => void;
  symbol: string;
  disabled?: boolean;
  isDarkMode?: boolean;
}) => {
  return (
    <div className="grid grid-cols-2 gap-2">
      <button
        onClick={onBuy}
        disabled={disabled}
        className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white py-3 px-4 rounded font-semibold transition-colors"
      >
        BUY {symbol}
      </button>
      <button
        onClick={onSell}
        disabled={disabled}
        className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white py-3 px-4 rounded font-semibold transition-colors"
      >
        SELL {symbol}
      </button>
    </div>
  );
});

QuickActionPanel.displayName = 'QuickActionPanel';

// Position summary with P&L
export const PositionSummary = memo(({ 
  symbol, 
  quantity, 
  avgPrice, 
  currentPrice, 
  isDarkMode = true 
}: {
  symbol: string;
  quantity: number;
  avgPrice: number;
  currentPrice: number;
  isDarkMode?: boolean;
}) => {
  const marketValue = quantity * currentPrice;
  const costBasis = quantity * avgPrice;
  const unrealizedPnL = marketValue - costBasis;
  const unrealizedPnLPercent = (unrealizedPnL / costBasis) * 100;

  return (
    <div className={`p-3 rounded ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
      <div className="flex justify-between items-start mb-2">
        <div>
          <div className="font-semibold">{symbol}</div>
          <div className="text-sm opacity-75">{quantity} shares</div>
        </div>
        <div className="text-right">
          <div className="font-mono">${currentPrice.toFixed(2)}</div>
          <div className="text-sm opacity-75">Avg: ${avgPrice.toFixed(2)}</div>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <div className="opacity-75">Market Value</div>
          <div className="font-mono">${marketValue.toLocaleString()}</div>
        </div>
        <div className="text-right">
          <div className="opacity-75">Unrealized P&L</div>
          <div className={`font-mono ${unrealizedPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {unrealizedPnL >= 0 ? '+' : ''}${unrealizedPnL.toLocaleString()}
            <span className="text-xs ml-1">
              ({unrealizedPnLPercent >= 0 ? '+' : ''}{unrealizedPnLPercent.toFixed(1)}%)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
});

PositionSummary.displayName = 'PositionSummary';

// Market status indicator
export const MarketStatus = memo(({ 
  isOpen, 
  nextEvent, 
  isDarkMode = true 
}: {
  isOpen: boolean;
  nextEvent?: string;
  isDarkMode?: boolean;
}) => {
  return (
    <div className="flex items-center space-x-2">
      <div className={`w-2 h-2 rounded-full ${isOpen ? 'bg-green-400' : 'bg-red-400'}`} />
      <div className="text-sm">
        <span className="font-semibold">{isOpen ? 'Market Open' : 'Market Closed'}</span>
        {nextEvent && <span className="opacity-75 ml-2">{nextEvent}</span>}
      </div>
    </div>
  );
});

MarketStatus.displayName = 'MarketStatus';

// Performance metrics dashboard
export const PerformanceMetrics = memo(({ 
  totalValue, 
  startingValue, 
  dayChange, 
  bestPosition, 
  worstPosition,
  isDarkMode = true 
}: {
  totalValue: number;
  startingValue: number;
  dayChange: number;
  bestPosition?: { symbol: string; pnl: number };
  worstPosition?: { symbol: string; pnl: number };
  isDarkMode?: boolean;
}) => {
  const totalReturn = totalValue - startingValue;
  const totalReturnPercent = (totalReturn / startingValue) * 100;

  return (
    <div className="space-y-4">
      {/* Total Performance */}
      <div className={`p-4 rounded ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
        <div className="text-center">
          <div className="text-sm opacity-75">Total Portfolio Value</div>
          <div className="text-2xl font-bold font-mono">${totalValue.toLocaleString()}</div>
          <div className={`text-sm ${totalReturn >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {totalReturn >= 0 ? '+' : ''}${totalReturn.toLocaleString()} 
            ({totalReturnPercent >= 0 ? '+' : ''}{totalReturnPercent.toFixed(2)}%)
          </div>
        </div>
      </div>

      {/* Best/Worst Positions */}
      {(bestPosition || worstPosition) && (
        <div className="grid grid-cols-2 gap-2">
          {bestPosition && (
            <div className={`p-3 rounded ${isDarkMode ? 'bg-green-500 bg-opacity-20' : 'bg-green-50'}`}>
              <div className="text-green-400 text-xs font-semibold">BEST</div>
              <div className="font-semibold">{bestPosition.symbol}</div>
              <div className="text-sm font-mono">+${bestPosition.pnl.toLocaleString()}</div>
            </div>
          )}
          {worstPosition && (
            <div className={`p-3 rounded ${isDarkMode ? 'bg-red-500 bg-opacity-20' : 'bg-red-50'}`}>
              <div className="text-red-400 text-xs font-semibold">WORST</div>
              <div className="font-semibold">{worstPosition.symbol}</div>
              <div className="text-sm font-mono">${worstPosition.pnl.toLocaleString()}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
});

PerformanceMetrics.displayName = 'PerformanceMetrics';