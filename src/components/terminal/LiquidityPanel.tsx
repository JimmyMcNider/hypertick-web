/**
 * Liquidity Panel - Market Making & Liquidity Provision
 * Privilege Code: 20
 */

'use client';

import { useState, useEffect } from 'react';

interface LiquidityProps {
  user: any;
  sessionState: any;
  socket: any;
}

interface LiquidityPosition {
  symbol: string;
  bidSize: number;
  bidPrice: number;
  askPrice: number;
  askSize: number;
  spread: number;
  inventory: number;
  pnl: number;
  fillRate: number;
  riskLimit: number;
  isActive: boolean;
}

interface LiquidityMetrics {
  totalInventory: number;
  totalPnL: number;
  avgSpread: number;
  totalFills: number;
  captureRate: number;
  riskUtilization: number;
}

export default function LiquidityPanel({ user, sessionState, socket }: LiquidityProps) {
  const [liquidityPositions, setLiquidityPositions] = useState<LiquidityPosition[]>([
    {
      symbol: 'AOE',
      bidSize: 500,
      bidPrice: 49.94,
      askPrice: 49.96,
      askSize: 500,
      spread: 0.02,
      inventory: 1250,
      pnl: 245.50,
      fillRate: 0.68,
      riskLimit: 5000,
      isActive: true
    },
    {
      symbol: 'BOND1',
      bidSize: 200,
      bidPrice: 99.28,
      askPrice: 99.32,
      askSize: 200,
      spread: 0.04,
      inventory: -150,
      pnl: -32.75,
      fillRate: 0.42,
      riskLimit: 2000,
      isActive: true
    },
    {
      symbol: 'BOND2',
      bidSize: 100,
      bidPrice: 102.78,
      askPrice: 102.82,
      askSize: 100,
      spread: 0.04,
      inventory: 75,
      pnl: 98.25,
      fillRate: 0.35,
      riskLimit: 1500,
      isActive: false
    }
  ]);

  const [metrics, setMetrics] = useState<LiquidityMetrics>({
    totalInventory: 1175,
    totalPnL: 311.00,
    avgSpread: 0.033,
    totalFills: 247,
    captureRate: 0.84,
    riskUtilization: 0.23
  });

  const [selectedSymbol, setSelectedSymbol] = useState<string>('AOE');
  const [newBidPrice, setNewBidPrice] = useState('');
  const [newAskPrice, setNewAskPrice] = useState('');
  const [quoteSize, setQuoteSize] = useState('500');

  useEffect(() => {
    if (socket) {
      socket.on('liquidity_update', (data: LiquidityPosition[]) => {
        setLiquidityPositions(data);
      });

      socket.on('liquidity_fill', (fillData: any) => {
        // Update position based on fill
        setLiquidityPositions(prev => prev.map(pos => 
          pos.symbol === fillData.symbol 
            ? { ...pos, inventory: pos.inventory + fillData.quantity, pnl: pos.pnl + fillData.pnl }
            : pos
        ));
      });

      return () => {
        socket.off('liquidity_update');
        socket.off('liquidity_fill');
      };
    }
  }, [socket]);

  const updateQuotes = () => {
    if (!newBidPrice || !newAskPrice || !selectedSymbol) return;

    const bidPrice = parseFloat(newBidPrice);
    const askPrice = parseFloat(newAskPrice);
    
    if (bidPrice >= askPrice) {
      alert('Bid price must be less than ask price');
      return;
    }

    if (socket) {
      socket.emit('update_liquidity_quotes', {
        symbol: selectedSymbol,
        bidPrice,
        askPrice,
        size: parseInt(quoteSize),
        userId: user?.id
      });
    }

    setNewBidPrice('');
    setNewAskPrice('');
  };

  const toggleLiquidity = (symbol: string) => {
    if (socket) {
      socket.emit('toggle_liquidity', { symbol, userId: user?.id });
    }
    
    setLiquidityPositions(prev => prev.map(pos =>
      pos.symbol === symbol ? { ...pos, isActive: !pos.isActive } : pos
    ));
  };

  const getInventoryRisk = (position: LiquidityPosition) => {
    const riskPct = Math.abs(position.inventory) / position.riskLimit;
    if (riskPct > 0.8) return 'text-red-400';
    if (riskPct > 0.6) return 'text-yellow-400';
    return 'text-green-400';
  };

  const selectedPosition = liquidityPositions.find(pos => pos.symbol === selectedSymbol);

  return (
    <div className="h-full p-3 text-xs bg-black text-white">
      <div className="text-orange-400 font-bold mb-3 border-b border-gray-700 pb-1">
        LIQUIDITY PROVISION
      </div>

      {/* Overall Metrics */}
      <div className="bg-gray-900 p-2 rounded mb-3">
        <div className="text-yellow-400 font-bold mb-2">PORTFOLIO METRICS</div>
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div>
            <span className="text-gray-400">Total Inventory:</span>
            <div className={metrics.totalInventory >= 0 ? 'text-green-400' : 'text-red-400'}>
              {metrics.totalInventory >= 0 ? '+' : ''}{metrics.totalInventory.toLocaleString()}
            </div>
          </div>
          <div>
            <span className="text-gray-400">Total P&L:</span>
            <div className={metrics.totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}>
              {metrics.totalPnL >= 0 ? '+' : ''}${metrics.totalPnL.toFixed(2)}
            </div>
          </div>
          <div>
            <span className="text-gray-400">Avg Spread:</span>
            <div className="text-white">${metrics.avgSpread.toFixed(3)}</div>
          </div>
          <div>
            <span className="text-gray-400">Total Fills:</span>
            <div className="text-white">{metrics.totalFills}</div>
          </div>
          <div>
            <span className="text-gray-400">Capture Rate:</span>
            <div className="text-cyan-400">{(metrics.captureRate * 100).toFixed(1)}%</div>
          </div>
          <div>
            <span className="text-gray-400">Risk Util:</span>
            <div className={metrics.riskUtilization > 0.8 ? 'text-red-400' : 'text-green-400'}>
              {(metrics.riskUtilization * 100).toFixed(1)}%
            </div>
          </div>
        </div>
      </div>

      {/* Active Positions */}
      <div className="mb-3">
        <div className="text-yellow-400 font-bold mb-2">LIQUIDITY POSITIONS</div>
        
        {/* Headers */}
        <div className="grid grid-cols-9 gap-1 text-gray-400 border-b border-gray-700 pb-1 text-xs">
          <span>SYMBOL</span>
          <span>BID</span>
          <span>SIZE</span>
          <span>ASK</span>
          <span>SIZE</span>
          <span>SPREAD</span>
          <span>INV</span>
          <span>P&L</span>
          <span>STATUS</span>
        </div>

        {/* Position Rows */}
        <div className="max-h-24 overflow-y-auto">
          {liquidityPositions.map((position) => (
            <div 
              key={position.symbol} 
              className={`grid grid-cols-9 gap-1 text-xs py-1 hover:bg-gray-800 cursor-pointer ${
                selectedSymbol === position.symbol ? 'bg-gray-800' : ''
              }`}
              onClick={() => setSelectedSymbol(position.symbol)}
            >
              <span className="text-yellow-400">{position.symbol}</span>
              <span className="text-green-400">{position.bidPrice.toFixed(2)}</span>
              <span className="text-white">{position.bidSize}</span>
              <span className="text-red-400">{position.askPrice.toFixed(2)}</span>
              <span className="text-white">{position.askSize}</span>
              <span className="text-cyan-400">${position.spread.toFixed(3)}</span>
              <span className={getInventoryRisk(position)}>
                {position.inventory >= 0 ? '+' : ''}{position.inventory}
              </span>
              <span className={position.pnl >= 0 ? 'text-green-400' : 'text-red-400'}>
                {position.pnl >= 0 ? '+' : ''}${position.pnl.toFixed(2)}
              </span>
              <span className={position.isActive ? 'text-green-400' : 'text-gray-400'}>
                {position.isActive ? 'ACTIVE' : 'PAUSED'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Quote Management */}
      {selectedPosition && (
        <div className="bg-gray-900 p-2 rounded mb-3">
          <div className="text-yellow-400 font-bold mb-2">
            MANAGE QUOTES - {selectedPosition.symbol}
          </div>
          
          <div className="grid grid-cols-3 gap-2 mb-2">
            <div>
              <label className="text-gray-400 text-xs">Bid Price:</label>
              <input
                type="number"
                value={newBidPrice}
                onChange={(e) => setNewBidPrice(e.target.value)}
                placeholder={selectedPosition.bidPrice.toFixed(2)}
                step="0.01"
                className="w-full bg-gray-800 border border-gray-600 rounded px-1 py-1 text-white text-xs"
              />
            </div>
            <div>
              <label className="text-gray-400 text-xs">Ask Price:</label>
              <input
                type="number"
                value={newAskPrice}
                onChange={(e) => setNewAskPrice(e.target.value)}
                placeholder={selectedPosition.askPrice.toFixed(2)}
                step="0.01"
                className="w-full bg-gray-800 border border-gray-600 rounded px-1 py-1 text-white text-xs"
              />
            </div>
            <div>
              <label className="text-gray-400 text-xs">Size:</label>
              <input
                type="number"
                value={quoteSize}
                onChange={(e) => setQuoteSize(e.target.value)}
                className="w-full bg-gray-800 border border-gray-600 rounded px-1 py-1 text-white text-xs"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={updateQuotes}
              className="flex-1 bg-blue-700 hover:bg-blue-600 text-white py-1 px-2 rounded text-xs"
            >
              UPDATE QUOTES
            </button>
            <button
              onClick={() => toggleLiquidity(selectedPosition.symbol)}
              className={`flex-1 py-1 px-2 rounded text-xs ${
                selectedPosition.isActive 
                  ? 'bg-red-700 hover:bg-red-600 text-white' 
                  : 'bg-green-700 hover:bg-green-600 text-white'
              }`}
            >
              {selectedPosition.isActive ? 'PAUSE' : 'ACTIVATE'}
            </button>
          </div>
        </div>
      )}

      {/* Risk Controls */}
      <div className="grid grid-cols-2 gap-2">
        <button className="bg-red-700 hover:bg-red-600 text-white py-1 px-2 rounded text-xs">
          HALT ALL
        </button>
        <button className="bg-gray-700 hover:bg-gray-600 text-white py-1 px-2 rounded text-xs">
          REPORTS
        </button>
      </div>
    </div>
  );
}