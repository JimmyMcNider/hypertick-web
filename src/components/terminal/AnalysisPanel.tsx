/**
 * Analysis Panel - Market Analysis Tools
 * Privilege Code: 1
 */

'use client';

import { useState } from 'react';

interface AnalysisProps {
  user: any;
  sessionState: any;
  socket: any;
}

export default function AnalysisPanel({ user, sessionState, socket }: AnalysisProps) {
  const [selectedSymbol, setSelectedSymbol] = useState('AOE');
  
  const analysisData = {
    'AOE': {
      recommendation: 'BUY',
      targetPrice: 52.50,
      support: 48.75,
      resistance: 51.25,
      rsi: 65.4,
      macd: 0.25,
      volume: 'Above Average',
      volatility: 'Moderate'
    },
    'BOND1': {
      recommendation: 'HOLD',
      targetPrice: 99.75,
      support: 98.50,
      resistance: 100.00,
      rsi: 45.2,
      macd: -0.05,
      volume: 'Below Average',
      volatility: 'Low'
    }
  };

  const data = analysisData[selectedSymbol as keyof typeof analysisData] || analysisData['AOE'];

  return (
    <div className="h-full p-3 text-xs">
      <div className="text-orange-400 font-bold mb-3">MARKET ANALYSIS</div>
      
      <div className="mb-3">
        <select
          value={selectedSymbol}
          onChange={(e) => setSelectedSymbol(e.target.value)}
          className="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white"
        >
          <option value="AOE">AOE</option>
          <option value="BOND1">BOND1</option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4 text-xs">
        <div>
          <div className="mb-2">
            <span className="text-gray-400">Recommendation:</span>
            <span className={`ml-2 font-bold ${
              data.recommendation === 'BUY' ? 'text-green-400' :
              data.recommendation === 'SELL' ? 'text-red-400' : 'text-yellow-400'
            }`}>
              {data.recommendation}
            </span>
          </div>
          <div className="mb-2">
            <span className="text-gray-400">Target Price:</span>
            <span className="ml-2 text-white">${data.targetPrice.toFixed(2)}</span>
          </div>
          <div className="mb-2">
            <span className="text-gray-400">Support:</span>
            <span className="ml-2 text-green-400">${data.support.toFixed(2)}</span>
          </div>
          <div className="mb-2">
            <span className="text-gray-400">Resistance:</span>
            <span className="ml-2 text-red-400">${data.resistance.toFixed(2)}</span>
          </div>
        </div>
        
        <div>
          <div className="mb-2">
            <span className="text-gray-400">RSI:</span>
            <span className="ml-2 text-white">{data.rsi}</span>
          </div>
          <div className="mb-2">
            <span className="text-gray-400">MACD:</span>
            <span className={`ml-2 ${data.macd >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {data.macd.toFixed(2)}
            </span>
          </div>
          <div className="mb-2">
            <span className="text-gray-400">Volume:</span>
            <span className="ml-2 text-white">{data.volume}</span>
          </div>
          <div className="mb-2">
            <span className="text-gray-400">Volatility:</span>
            <span className="ml-2 text-white">{data.volatility}</span>
          </div>
        </div>
      </div>
    </div>
  );
}