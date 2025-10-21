/**
 * Options Trading Panel - Options Chain & Greeks
 * Privilege Code: 17
 */

'use client';

import { useState, useEffect } from 'react';

interface OptionsProps {
  user: any;
  sessionState: any;
  socket: any;
}

interface OptionContract {
  symbol: string;
  strike: number;
  expiration: string;
  type: 'CALL' | 'PUT';
  bid: number;
  ask: number;
  last: number;
  volume: number;
  openInterest: number;
  impliedVol: number;
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
}

export default function OptionsPanel({ user, sessionState, socket }: OptionsProps) {
  const [underlyingSymbol, setUnderlyingSymbol] = useState('AOE');
  const [selectedExpiration, setSelectedExpiration] = useState('2024-01-19');
  const [underlyingPrice] = useState(50.00);
  
  const [optionsChain] = useState<OptionContract[]>([
    // Calls
    { symbol: 'AOE240119C47500', strike: 47.5, expiration: '2024-01-19', type: 'CALL', bid: 3.20, ask: 3.30, last: 3.25, volume: 150, openInterest: 1250, impliedVol: 0.285, delta: 0.78, gamma: 0.15, theta: -0.08, vega: 0.12 },
    { symbol: 'AOE240119C50000', strike: 50.0, expiration: '2024-01-19', type: 'CALL', bid: 1.85, ask: 1.95, last: 1.90, volume: 320, openInterest: 2100, impliedVol: 0.265, delta: 0.52, gamma: 0.18, theta: -0.12, vega: 0.15 },
    { symbol: 'AOE240119C52500', strike: 52.5, expiration: '2024-01-19', type: 'CALL', bid: 0.95, ask: 1.05, last: 1.00, volume: 85, openInterest: 850, impliedVol: 0.275, delta: 0.28, gamma: 0.12, theta: -0.09, vega: 0.11 },
    
    // Puts  
    { symbol: 'AOE240119P47500', strike: 47.5, expiration: '2024-01-19', type: 'PUT', bid: 0.75, ask: 0.85, last: 0.80, volume: 95, openInterest: 750, impliedVol: 0.290, delta: -0.22, gamma: 0.15, theta: -0.08, vega: 0.12 },
    { symbol: 'AOE240119P50000', strike: 50.0, expiration: '2024-01-19', type: 'PUT', bid: 1.80, ask: 1.90, last: 1.85, volume: 220, openInterest: 1850, impliedVol: 0.265, delta: -0.48, gamma: 0.18, theta: -0.12, vega: 0.15 },
    { symbol: 'AOE240119P52500', strike: 52.5, expiration: '2024-01-19', type: 'PUT', bid: 3.45, ask: 3.55, last: 3.50, volume: 140, openInterest: 980, impliedVol: 0.275, delta: -0.72, gamma: 0.12, theta: -0.09, vega: 0.11 },
  ]);

  const [selectedOption, setSelectedOption] = useState<OptionContract | null>(null);

  const callOptions = optionsChain.filter(opt => opt.type === 'CALL');
  const putOptions = optionsChain.filter(opt => opt.type === 'PUT');
  const strikes = [...new Set(optionsChain.map(opt => opt.strike))].sort((a, b) => a - b);

  const getMoneyness = (strike: number) => {
    const diff = underlyingPrice - strike;
    if (Math.abs(diff) < 0.50) return 'ATM';
    return diff > 0 ? 'ITM' : 'OTM';
  };

  const getMoneynessBg = (strike: number) => {
    const moneyness = getMoneyness(strike);
    switch (moneyness) {
      case 'ITM': return 'bg-green-900';
      case 'ATM': return 'bg-yellow-900';
      case 'OTM': return 'bg-gray-900';
      default: return 'bg-gray-900';
    }
  };

  return (
    <div className="h-full p-3 text-xs bg-black text-white">
      <div className="text-orange-400 font-bold mb-3 border-b border-gray-700 pb-1">
        OPTIONS TRADING
      </div>
      
      {/* Controls */}
      <div className="mb-3 flex gap-4">
        <div>
          <select
            value={underlyingSymbol}
            onChange={(e) => setUnderlyingSymbol(e.target.value)}
            className="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white text-xs"
          >
            <option value="AOE">AOE</option>
            <option value="BOND1">BOND1</option>
          </select>
        </div>
        <div>
          <select
            value={selectedExpiration}
            onChange={(e) => setSelectedExpiration(e.target.value)}
            className="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white text-xs"
          >
            <option value="2024-01-19">Jan 19, 2024</option>
            <option value="2024-02-16">Feb 16, 2024</option>
            <option value="2024-03-15">Mar 15, 2024</option>
          </select>
        </div>
      </div>

      {/* Underlying Info */}
      <div className="bg-gray-900 p-2 rounded mb-3 text-xs">
        <div className="grid grid-cols-3 gap-2">
          <div>
            <span className="text-gray-400">Underlying:</span>
            <div className="text-white font-bold">{underlyingSymbol} ${underlyingPrice.toFixed(2)}</div>
          </div>
          <div>
            <span className="text-gray-400">Expiration:</span>
            <div className="text-white">{selectedExpiration}</div>
          </div>
          <div>
            <span className="text-gray-400">DTE:</span>
            <div className="text-yellow-400">12 days</div>
          </div>
        </div>
      </div>

      {/* Options Chain */}
      <div className="mb-3">
        <div className="text-yellow-400 font-bold mb-2">OPTIONS CHAIN</div>
        
        {/* Headers */}
        <div className="grid grid-cols-11 gap-1 text-gray-400 border-b border-gray-700 pb-1 text-xs">
          <span>BID</span>
          <span>ASK</span>
          <span>LAST</span>
          <span>VOL</span>
          <span>OI</span>
          <span>STRIKE</span>
          <span>BID</span>
          <span>ASK</span>
          <span>LAST</span>
          <span>VOL</span>
          <span>OI</span>
        </div>

        {/* Option Rows */}
        <div className="max-h-40 overflow-y-auto">
          {strikes.map((strike) => {
            const call = callOptions.find(opt => opt.strike === strike);
            const put = putOptions.find(opt => opt.strike === strike);
            
            return (
              <div key={strike} className={`grid grid-cols-11 gap-1 text-xs py-1 hover:bg-gray-800 ${getMoneynessBg(strike)}`}>
                {/* Call Side */}
                <span className="text-green-400">{call?.bid.toFixed(2) || '-'}</span>
                <span className="text-red-400">{call?.ask.toFixed(2) || '-'}</span>
                <span className="text-white">{call?.last.toFixed(2) || '-'}</span>
                <span className="text-gray-300">{call?.volume || '-'}</span>
                <span className="text-gray-300">{call?.openInterest || '-'}</span>
                
                {/* Strike */}
                <span className="text-yellow-400 font-bold text-center">{strike.toFixed(1)}</span>
                
                {/* Put Side */}
                <span className="text-green-400">{put?.bid.toFixed(2) || '-'}</span>
                <span className="text-red-400">{put?.ask.toFixed(2) || '-'}</span>
                <span className="text-white">{put?.last.toFixed(2) || '-'}</span>
                <span className="text-gray-300">{put?.volume || '-'}</span>
                <span className="text-gray-300">{put?.openInterest || '-'}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Greeks Display */}
      {selectedOption && (
        <div className="bg-gray-900 p-2 rounded mb-3">
          <div className="text-yellow-400 font-bold mb-2">GREEKS - {selectedOption.symbol}</div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-gray-400">Delta:</span>
              <span className="ml-1 text-white">{selectedOption.delta.toFixed(3)}</span>
            </div>
            <div>
              <span className="text-gray-400">Gamma:</span>
              <span className="ml-1 text-white">{selectedOption.gamma.toFixed(3)}</span>
            </div>
            <div>
              <span className="text-gray-400">Theta:</span>
              <span className="ml-1 text-red-400">{selectedOption.theta.toFixed(3)}</span>
            </div>
            <div>
              <span className="text-gray-400">Vega:</span>
              <span className="ml-1 text-white">{selectedOption.vega.toFixed(3)}</span>
            </div>
            <div>
              <span className="text-gray-400">IV:</span>
              <span className="ml-1 text-cyan-400">{(selectedOption.impliedVol * 100).toFixed(1)}%</span>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-2">
        <button className="bg-green-700 hover:bg-green-600 text-white py-1 px-2 rounded text-xs">
          BUY CALL
        </button>
        <button className="bg-red-700 hover:bg-red-600 text-white py-1 px-2 rounded text-xs">
          BUY PUT
        </button>
      </div>
    </div>
  );
}