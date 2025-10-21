/**
 * Portfolio Panel - Position Tracking and P&L
 * Privilege Code: 13
 */

'use client';

import { useState, useEffect } from 'react';

interface PortfolioProps {
  user: any;
  sessionState: any;
  socket: any;
}

interface Position {
  symbol: string;
  quantity: number;
  avgPrice: number;
  currentPrice: number;
  marketValue: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
  dayChange: number;
  dayChangePercent: number;
}

interface PortfolioSummary {
  totalValue: number;
  totalPnL: number;
  totalPnLPercent: number;
  dayPnL: number;
  dayPnLPercent: number;
  cashBalance: number;
  buyingPower: number;
}

export default function PortfolioPanel({ user, sessionState, socket }: PortfolioProps) {
  const [positions, setPositions] = useState<Position[]>([]);
  const [summary, setSummary] = useState<PortfolioSummary>({
    totalValue: 50000,
    totalPnL: 0,
    totalPnLPercent: 0,
    dayPnL: 0,
    dayPnLPercent: 0,
    cashBalance: 50000,
    buyingPower: 50000
  });

  const [selectedPosition, setSelectedPosition] = useState<string | null>(null);

  useEffect(() => {
    if (socket) {
      // Request initial portfolio data
      socket.emit('get_portfolio');

      // Listen for portfolio updates
      socket.on('portfolio_update', (data: { positions: any[] }) => {
        const updatedPositions = data.positions.map(pos => ({
          symbol: pos.symbol,
          quantity: pos.quantity,
          avgPrice: pos.avgPrice,
          currentPrice: pos.marketValue / Math.abs(pos.quantity) || pos.avgPrice,
          marketValue: pos.marketValue,
          unrealizedPnL: pos.unrealizedPnL,
          unrealizedPnLPercent: (pos.unrealizedPnL / (pos.avgPrice * Math.abs(pos.quantity))) * 100,
          dayChange: pos.unrealizedPnL, // Simplified for now
          dayChangePercent: (pos.unrealizedPnL / (pos.avgPrice * Math.abs(pos.quantity))) * 100
        }));
        setPositions(updatedPositions);
        
        // Update summary
        const totalValue = updatedPositions.reduce((sum, pos) => sum + pos.marketValue, summary.cashBalance);
        const totalPnL = updatedPositions.reduce((sum, pos) => sum + pos.unrealizedPnL, 0);
        
        setSummary(prev => ({
          ...prev,
          totalValue,
          totalPnL,
          totalPnLPercent: (totalPnL / prev.cashBalance) * 100,
          dayPnL: totalPnL,
          dayPnLPercent: (totalPnL / prev.cashBalance) * 100
        }));
      });

      socket.on('position_update', (data: { symbol: string; position: any }) => {
        setPositions(prev => {
          const updated = prev.filter(p => p.symbol !== data.symbol);
          if (data.position.quantity !== 0) {
            updated.push({
              symbol: data.symbol,
              quantity: data.position.quantity,
              avgPrice: data.position.avgPrice,
              currentPrice: data.position.marketValue / Math.abs(data.position.quantity) || data.position.avgPrice,
              marketValue: data.position.marketValue,
              unrealizedPnL: data.position.unrealizedPnL,
              unrealizedPnLPercent: (data.position.unrealizedPnL / (data.position.avgPrice * Math.abs(data.position.quantity))) * 100,
              dayChange: data.position.unrealizedPnL,
              dayChangePercent: (data.position.unrealizedPnL / (data.position.avgPrice * Math.abs(data.position.quantity))) * 100
            });
          }
          return updated;
        });
      });

      // Listen for market data to update current prices
      socket.on('market_data', (data: any) => {
        setPositions(prev => prev.map(pos => {
          if (pos.symbol === data.symbol) {
            const newMarketValue = Math.abs(pos.quantity) * data.last;
            const newUnrealizedPnL = (data.last - pos.avgPrice) * pos.quantity;
            return {
              ...pos,
              currentPrice: data.last,
              marketValue: newMarketValue,
              unrealizedPnL: newUnrealizedPnL,
              unrealizedPnLPercent: (newUnrealizedPnL / (pos.avgPrice * Math.abs(pos.quantity))) * 100
            };
          }
          return pos;
        }));
      });

      return () => {
        socket.off('portfolio_update');
        socket.off('position_update');
        socket.off('market_data');
      };
    }
  }, [socket, summary.cashBalance]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(value);
  };

  const formatPercent = (value: number) => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
  };

  const getPnLColor = (value: number) => {
    if (value > 0) return 'text-green-400';
    if (value < 0) return 'text-red-400';
    return 'text-gray-400';
  };

  return (
    <div className="h-full flex flex-col p-3 text-xs">
      {/* Header */}
      <div className="text-orange-400 font-bold mb-3">PORTFOLIO & POSITIONS</div>
      
      {/* Portfolio Summary */}
      <div className="bg-gray-800 p-3 rounded mb-3">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-gray-400 mb-2">ACCOUNT SUMMARY</div>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span>Total Value:</span>
                <span className="text-white font-bold">{formatCurrency(summary.totalValue)}</span>
              </div>
              <div className="flex justify-between">
                <span>Cash Balance:</span>
                <span className="text-yellow-400">{formatCurrency(summary.cashBalance)}</span>
              </div>
              <div className="flex justify-between">
                <span>Buying Power:</span>
                <span className="text-green-400">{formatCurrency(summary.buyingPower)}</span>
              </div>
            </div>
          </div>
          <div>
            <div className="text-gray-400 mb-2">P&L SUMMARY</div>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span>Total P&L:</span>
                <span className={getPnLColor(summary.totalPnL)}>
                  {formatCurrency(summary.totalPnL)} ({formatPercent(summary.totalPnLPercent)})
                </span>
              </div>
              <div className="flex justify-between">
                <span>Day P&L:</span>
                <span className={getPnLColor(summary.dayPnL)}>
                  {formatCurrency(summary.dayPnL)} ({formatPercent(summary.dayPnLPercent)})
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Positions Table */}
      <div className="flex-1">
        <div className="text-orange-400 font-bold mb-2">CURRENT POSITIONS</div>
        
        {/* Table Header */}
        <div className="grid grid-cols-8 gap-1 text-gray-400 border-b border-gray-700 pb-1 mb-1">
          <span>SYMBOL</span>
          <span>QTY</span>
          <span>AVG PRICE</span>
          <span>CURRENT</span>
          <span>MKT VALUE</span>
          <span>UNREAL P&L</span>
          <span>UNREAL %</span>
          <span>DAY CHG</span>
        </div>

        {/* Position Rows */}
        <div className="space-y-1">
          {positions.map((position) => (
            <div
              key={position.symbol}
              className={`grid grid-cols-8 gap-1 py-1 hover:bg-gray-800 cursor-pointer rounded ${
                selectedPosition === position.symbol ? 'bg-gray-800 border border-blue-600' : ''
              }`}
              onClick={() => setSelectedPosition(
                selectedPosition === position.symbol ? null : position.symbol
              )}
            >
              <span className="text-yellow-400 font-bold">{position.symbol}</span>
              <span className="text-white">{position.quantity.toLocaleString()}</span>
              <span className="text-gray-300">{formatCurrency(position.avgPrice)}</span>
              <span className="text-white font-bold">{formatCurrency(position.currentPrice)}</span>
              <span className="text-white">{formatCurrency(position.marketValue)}</span>
              <span className={getPnLColor(position.unrealizedPnL)}>
                {formatCurrency(position.unrealizedPnL)}
              </span>
              <span className={getPnLColor(position.unrealizedPnL)}>
                {formatPercent(position.unrealizedPnLPercent)}
              </span>
              <span className={getPnLColor(position.dayChange)}>
                {formatCurrency(position.dayChange)}
              </span>
            </div>
          ))}
        </div>

        {/* Position Detail */}
        {selectedPosition && (
          <div className="mt-3 bg-gray-800 p-3 rounded">
            <div className="text-orange-400 font-bold mb-2">
              POSITION DETAIL - {selectedPosition}
            </div>
            {(() => {
              const pos = positions.find(p => p.symbol === selectedPosition);
              if (!pos) return null;
              
              return (
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span>Quantity:</span>
                        <span className="text-white">{pos.quantity.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Average Price:</span>
                        <span className="text-white">{formatCurrency(pos.avgPrice)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Current Price:</span>
                        <span className="text-white">{formatCurrency(pos.currentPrice)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Market Value:</span>
                        <span className="text-white">{formatCurrency(pos.marketValue)}</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span>Unrealized P&L:</span>
                        <span className={getPnLColor(pos.unrealizedPnL)}>
                          {formatCurrency(pos.unrealizedPnL)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Unrealized %:</span>
                        <span className={getPnLColor(pos.unrealizedPnL)}>
                          {formatPercent(pos.unrealizedPnLPercent)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Day Change:</span>
                        <span className={getPnLColor(pos.dayChange)}>
                          {formatCurrency(pos.dayChange)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Day Change %:</span>
                        <span className={getPnLColor(pos.dayChange)}>
                          {formatPercent(pos.dayChangePercent)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="mt-2 pt-2 border-t border-gray-700">
        <div className="grid grid-cols-3 gap-2">
          <button className="bg-green-700 hover:bg-green-600 text-white py-1 px-2 rounded text-xs">
            BUY MORE
          </button>
          <button className="bg-red-700 hover:bg-red-600 text-white py-1 px-2 rounded text-xs">
            SELL ALL
          </button>
          <button className="bg-blue-700 hover:bg-blue-600 text-white py-1 px-2 rounded text-xs">
            HEDGE
          </button>
        </div>
      </div>
    </div>
  );
}