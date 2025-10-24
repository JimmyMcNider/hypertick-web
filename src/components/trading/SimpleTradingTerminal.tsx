'use client';

import React, { useState, useEffect } from 'react';

interface SimpleTradingTerminalProps {
  sessionId: string;
  userId: string;
  token: string;
}

interface MarketData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
}

const SimpleTradingTerminal: React.FC<SimpleTradingTerminalProps> = ({ sessionId, userId, token }) => {
  const [marketData, setMarketData] = useState<MarketData[]>([
    { symbol: 'AOE', price: 50.25, change: 0.75, changePercent: 1.52, volume: 125000 },
    { symbol: 'BOND1', price: 99.45, change: -0.15, changePercent: -0.15, volume: 45000 },
    { symbol: 'BOND2', price: 102.90, change: 0.35, changePercent: 0.34, volume: 32000 },
    { symbol: 'BOND3', price: 95.80, change: 0.20, changePercent: 0.21, volume: 28000 },
    { symbol: 'SPX', price: 4185.50, change: 15.25, changePercent: 0.37, volume: 890000 },
  ]);

  const [selectedSymbol, setSelectedSymbol] = useState('AOE');
  const [orderForm, setOrderForm] = useState({
    symbol: 'AOE',
    side: 'BUY' as 'BUY' | 'SELL',
    type: 'MARKET' as 'MARKET' | 'LIMIT',
    quantity: 100,
    price: undefined as number | undefined
  });

  // Simulate real-time price updates
  useEffect(() => {
    const interval = setInterval(() => {
      setMarketData(prev => prev.map(stock => ({
        ...stock,
        price: stock.price + (Math.random() - 0.5) * 0.20,
        change: stock.change + (Math.random() - 0.5) * 0.10,
        changePercent: stock.changePercent + (Math.random() - 0.5) * 0.05,
        volume: stock.volume + Math.floor(Math.random() * 1000)
      })));
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const formatPrice = (price: number) => price.toFixed(2);
  const formatPercent = (percent: number) => {
    const sign = percent >= 0 ? '+' : '';
    return `${sign}${percent.toFixed(2)}%`;
  };

  return (
    <div className="trading-terminal bg-gray-900 text-white p-4 space-y-4">
      {/* Connection Status */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">HyperTick Trading Terminal</h2>
        <div className="px-3 py-1 rounded text-sm bg-green-600">
          Demo Mode - Live Data Simulation
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Market Watch */}
        <div className="bg-gray-800 rounded p-4">
          <h3 className="text-lg font-semibold mb-3">Market Watch</h3>
          <div className="space-y-2">
            {marketData.map(stock => (
              <div
                key={stock.symbol}
                className={`p-2 rounded cursor-pointer ${
                  selectedSymbol === stock.symbol ? 'bg-blue-600' : 'hover:bg-gray-700'
                }`}
                onClick={() => setSelectedSymbol(stock.symbol)}
              >
                <div className="flex justify-between items-center">
                  <span className="font-medium">{stock.symbol}</span>
                  <div className="text-right">
                    <div className="text-sm">{formatPrice(stock.price)}</div>
                    <div className={`text-xs ${
                      stock.change >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {formatPercent(stock.changePercent)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Order Book & Chart */}
        <div className="bg-gray-800 rounded p-4">
          <h3 className="text-lg font-semibold mb-3">Order Book - {selectedSymbol}</h3>
          {(() => {
            const selectedStock = marketData.find(s => s.symbol === selectedSymbol);
            return selectedStock ? (
              <div className="mb-4 p-3 bg-gray-700 rounded">
                <div className="flex justify-between">
                  <span>Last:</span>
                  <span className="font-bold">{formatPrice(selectedStock.price)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Bid/Ask:</span>
                  <span>{formatPrice(selectedStock.price - 0.05)} / {formatPrice(selectedStock.price + 0.05)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Change:</span>
                  <span className={selectedStock.change >= 0 ? 'text-green-400' : 'text-red-400'}>
                    {formatPercent(selectedStock.changePercent)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Volume:</span>
                  <span>{selectedStock.volume.toLocaleString()}</span>
                </div>
              </div>
            ) : null;
          })()}

          {/* Simulated Order Book */}
          <div className="space-y-2">
            <div>
              <h4 className="text-sm font-semibold text-red-400 mb-1">Asks</h4>
              {Array.from({length: 5}).map((_, idx) => {
                const selectedStock = marketData.find(s => s.symbol === selectedSymbol);
                const askPrice = selectedStock ? selectedStock.price + 0.05 + (idx * 0.05) : 50 + idx * 0.05;
                const size = Math.floor(Math.random() * 1000) + 500;
                return (
                  <div key={idx} className="flex justify-between text-sm">
                    <span className="text-red-400">{formatPrice(askPrice)}</span>
                    <span>{size}</span>
                  </div>
                );
              })}
            </div>
            
            <div className="border-t border-gray-600 my-2 pt-2">
              <h4 className="text-sm font-semibold text-green-400 mb-1">Bids</h4>
              {Array.from({length: 5}).map((_, idx) => {
                const selectedStock = marketData.find(s => s.symbol === selectedSymbol);
                const bidPrice = selectedStock ? selectedStock.price - 0.05 - (idx * 0.05) : 50 - idx * 0.05;
                const size = Math.floor(Math.random() * 1000) + 500;
                return (
                  <div key={idx} className="flex justify-between text-sm">
                    <span className="text-green-400">{formatPrice(bidPrice)}</span>
                    <span>{size}</span>
                  </div>
                );
              })}
            </div>
          </div>
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
                {marketData.map(stock => (
                  <option key={stock.symbol} value={stock.symbol}>{stock.symbol}</option>
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

            {orderForm.type === 'LIMIT' && (
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
              onClick={() => {
                alert(`Demo Order: ${orderForm.side} ${orderForm.quantity} ${orderForm.symbol} @ ${orderForm.type}`);
                setOrderForm(prev => ({ ...prev, quantity: 100, price: undefined }));
              }}
              className="w-full bg-blue-600 hover:bg-blue-700 py-2 rounded font-semibold"
            >
              Place Order (Demo)
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Active Orders */}
        <div className="bg-gray-800 rounded p-4">
          <h3 className="text-lg font-semibold mb-3">Active Orders</h3>
          <p className="text-gray-400">No active orders in demo mode</p>
        </div>

        {/* Positions */}
        <div className="bg-gray-800 rounded p-4">
          <h3 className="text-lg font-semibold mb-3">Positions</h3>
          <div className="space-y-2">
            {[
              { symbol: 'AOE', quantity: 100, avgPrice: 49.85, marketPrice: 50.25, pnl: 40.00 },
              { symbol: 'BOND1', quantity: 50, avgPrice: 99.60, marketPrice: 99.45, pnl: -7.50 },
            ].map(position => (
              <div key={position.symbol} className="p-2 bg-gray-700 rounded">
                <div className="flex justify-between items-center">
                  <span className="font-medium">{position.symbol}</span>
                  <span className={`font-semibold ${
                    position.pnl >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {position.pnl >= 0 ? '+' : ''}{formatPrice(position.pnl)}
                  </span>
                </div>
                <div className="text-sm text-gray-400">
                  {position.quantity} shares @ {formatPrice(position.avgPrice)}
                </div>
                <div className="text-sm text-gray-400">
                  Market: {formatPrice(position.marketPrice)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="bg-gray-800 rounded p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-green-400">$100,000</div>
            <div className="text-sm text-gray-400">Portfolio Value</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-blue-400">$32.50</div>
            <div className="text-sm text-gray-400">Day P&L</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-yellow-400">$99,750</div>
            <div className="text-sm text-gray-400">Buying Power</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-purple-400">2.5%</div>
            <div className="text-sm text-gray-400">Total Return</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SimpleTradingTerminal;