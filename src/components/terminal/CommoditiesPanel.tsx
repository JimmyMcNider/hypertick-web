/**
 * Commodities Trading Panel - Futures & Commodity Markets
 * Privilege Code: 18
 */

'use client';

import { useState, useEffect } from 'react';

interface CommoditiesProps {
  user: any;
  sessionState: any;
  socket: any;
}

interface CommodityContract {
  symbol: string;
  name: string;
  month: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  openInterest: number;
  high: number;
  low: number;
  settlement: number;
  marginReq: number;
  tickSize: number;
  tickValue: number;
}

export default function CommoditiesPanel({ user, sessionState, socket }: CommoditiesProps) {
  const [selectedSector, setSelectedSector] = useState('ENERGY');
  const [selectedContract, setSelectedContract] = useState<CommodityContract | null>(null);
  
  const [commoditiesData] = useState<{[key: string]: CommodityContract[]}>({
    ENERGY: [
      { symbol: 'CLZ4', name: 'Crude Oil', month: 'Dec 2024', price: 78.45, change: 1.25, changePercent: 1.62, volume: 125400, openInterest: 89500, high: 79.12, low: 77.80, settlement: 78.45, marginReq: 4500, tickSize: 0.01, tickValue: 10 },
      { symbol: 'NGZ4', name: 'Natural Gas', month: 'Dec 2024', price: 3.125, change: -0.085, changePercent: -2.65, volume: 89200, openInterest: 156000, high: 3.210, low: 3.105, settlement: 3.125, marginReq: 1200, tickSize: 0.001, tickValue: 10 },
      { symbol: 'RBZ4', name: 'RBOB Gasoline', month: 'Dec 2024', price: 2.1450, change: 0.0325, changePercent: 1.54, volume: 45600, openInterest: 67800, high: 2.1580, low: 2.1320, settlement: 2.1450, marginReq: 3200, tickSize: 0.0001, tickValue: 4.20 },
    ],
    METALS: [
      { symbol: 'GCZ4', name: 'Gold', month: 'Dec 2024', price: 1985.60, change: 12.80, changePercent: 0.65, volume: 78900, openInterest: 245000, high: 1992.40, low: 1978.20, settlement: 1985.60, marginReq: 6500, tickSize: 0.10, tickValue: 10 },
      { symbol: 'SIZ4', name: 'Silver', month: 'Dec 2024', price: 24.125, change: -0.385, changePercent: -1.57, volume: 52400, openInterest: 89600, high: 24.580, low: 24.020, settlement: 24.125, marginReq: 4800, tickSize: 0.005, tickValue: 25 },
      { symbol: 'HGZ4', name: 'Copper', month: 'Dec 2024', price: 3.8250, change: 0.0475, changePercent: 1.26, volume: 32100, openInterest: 67500, high: 3.8420, low: 3.7890, settlement: 3.8250, marginReq: 2800, tickSize: 0.0005, tickValue: 12.50 },
    ],
    AGRICULTURE: [
      { symbol: 'CZ4', name: 'Corn', month: 'Dec 2024', price: 455.75, change: -8.25, changePercent: -1.78, volume: 95600, openInterest: 187000, high: 465.50, low: 454.00, settlement: 455.75, marginReq: 1500, tickSize: 0.25, tickValue: 12.50 },
      { symbol: 'SZ4', name: 'Soybeans', month: 'Jan 2025', price: 1245.50, change: 15.75, changePercent: 1.28, volume: 67800, openInterest: 145000, high: 1252.00, low: 1238.25, settlement: 1245.50, marginReq: 3200, tickSize: 0.25, tickValue: 12.50 },
      { symbol: 'WZ4', name: 'Wheat', month: 'Dec 2024', price: 585.25, change: -12.50, changePercent: -2.09, volume: 42300, openInterest: 98500, high: 598.75, low: 582.00, settlement: 585.25, marginReq: 1800, tickSize: 0.25, tickValue: 12.50 },
    ]
  });

  const currentContracts = commoditiesData[selectedSector] || [];

  const getTotalValue = (contract: CommodityContract) => {
    // Simplified contract value calculation
    return contract.price * 100; // Assuming 100 unit contracts
  };

  const sectors = Object.keys(commoditiesData);

  return (
    <div className="h-full p-3 text-xs bg-black text-white">
      <div className="text-orange-400 font-bold mb-3 border-b border-gray-700 pb-1">
        COMMODITIES & FUTURES
      </div>
      
      {/* Sector Selection */}
      <div className="mb-3">
        <div className="flex gap-1">
          {sectors.map((sector) => (
            <button
              key={sector}
              onClick={() => setSelectedSector(sector)}
              className={`px-2 py-1 text-xs rounded ${
                selectedSector === sector 
                  ? 'bg-orange-600 text-white' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {sector}
            </button>
          ))}
        </div>
      </div>

      {/* Contracts Table */}
      <div className="mb-3">
        <div className="text-yellow-400 font-bold mb-2">{selectedSector} FUTURES</div>
        
        {/* Headers */}
        <div className="grid grid-cols-7 gap-1 text-gray-400 border-b border-gray-700 pb-1 text-xs">
          <span>SYMBOL</span>
          <span>PRICE</span>
          <span>CHANGE</span>
          <span>%</span>
          <span>VOLUME</span>
          <span>OI</span>
          <span>MARGIN</span>
        </div>

        {/* Contract Rows */}
        <div className="max-h-32 overflow-y-auto">
          {currentContracts.map((contract) => (
            <div 
              key={contract.symbol} 
              className={`grid grid-cols-7 gap-1 text-xs py-1 hover:bg-gray-800 cursor-pointer ${
                selectedContract?.symbol === contract.symbol ? 'bg-gray-800' : ''
              }`}
              onClick={() => setSelectedContract(contract)}
            >
              <span className="text-yellow-400">{contract.symbol}</span>
              <span className="text-white">{contract.price.toFixed(contract.symbol.startsWith('NG') ? 3 : 2)}</span>
              <span className={contract.change >= 0 ? 'text-green-400' : 'text-red-400'}>
                {contract.change >= 0 ? '+' : ''}{contract.change.toFixed(2)}
              </span>
              <span className={contract.changePercent >= 0 ? 'text-green-400' : 'text-red-400'}>
                {contract.changePercent >= 0 ? '+' : ''}{contract.changePercent.toFixed(2)}%
              </span>
              <span className="text-gray-300">{contract.volume.toLocaleString()}</span>
              <span className="text-gray-300">{contract.openInterest.toLocaleString()}</span>
              <span className="text-cyan-400">${contract.marginReq.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Contract Details */}
      {selectedContract && (
        <div className="bg-gray-900 p-2 rounded mb-3">
          <div className="text-yellow-400 font-bold mb-2">
            {selectedContract.name} ({selectedContract.symbol})
          </div>
          
          <div className="grid grid-cols-2 gap-2 text-xs mb-2">
            <div>
              <span className="text-gray-400">Contract Month:</span>
              <div className="text-white">{selectedContract.month}</div>
            </div>
            <div>
              <span className="text-gray-400">Settlement:</span>
              <div className="text-white">{selectedContract.settlement.toFixed(2)}</div>
            </div>
            <div>
              <span className="text-gray-400">Day High:</span>
              <div className="text-green-400">{selectedContract.high.toFixed(2)}</div>
            </div>
            <div>
              <span className="text-gray-400">Day Low:</span>
              <div className="text-red-400">{selectedContract.low.toFixed(2)}</div>
            </div>
            <div>
              <span className="text-gray-400">Tick Size:</span>
              <div className="text-white">{selectedContract.tickSize}</div>
            </div>
            <div>
              <span className="text-gray-400">Tick Value:</span>
              <div className="text-white">${selectedContract.tickValue}</div>
            </div>
          </div>

          <div className="border-t border-gray-700 pt-2">
            <div className="text-gray-400 text-xs mb-1">Contract Value (Est.):</div>
            <div className="text-green-400 font-bold">${getTotalValue(selectedContract).toLocaleString()}</div>
          </div>
        </div>
      )}

      {/* Market Summary */}
      <div className="bg-gray-900 p-2 rounded mb-3">
        <div className="text-yellow-400 font-bold mb-2">MARKET SUMMARY</div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-gray-400">Active Contracts:</span>
            <div className="text-white">{currentContracts.length}</div>
          </div>
          <div>
            <span className="text-gray-400">Total Volume:</span>
            <div className="text-white">{currentContracts.reduce((sum, c) => sum + c.volume, 0).toLocaleString()}</div>
          </div>
          <div>
            <span className="text-gray-400">Gainers:</span>
            <div className="text-green-400">{currentContracts.filter(c => c.change > 0).length}</div>
          </div>
          <div>
            <span className="text-gray-400">Decliners:</span>
            <div className="text-red-400">{currentContracts.filter(c => c.change < 0).length}</div>
          </div>
        </div>
      </div>

      {/* Trading Actions */}
      <div className="grid grid-cols-2 gap-2">
        <button 
          className="bg-green-700 hover:bg-green-600 text-white py-1 px-2 rounded text-xs"
          disabled={!selectedContract}
        >
          BUY
        </button>
        <button 
          className="bg-red-700 hover:bg-red-600 text-white py-1 px-2 rounded text-xs"
          disabled={!selectedContract}
        >
          SELL
        </button>
      </div>
    </div>
  );
}