/**
 * Trade Blotter Panel - Order Log
 * Privilege Code: 12
 */

'use client';

import { useState, useEffect } from 'react';

interface TradeBlotterProps {
  user: any;
  sessionState: any;
  socket: any;
}

interface Trade {
  id: string;
  time: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  status: 'FILLED' | 'PARTIAL' | 'PENDING' | 'CANCELLED';
  type: string;
}

export default function TradeBlotterPanel({ user, sessionState, socket }: TradeBlotterProps) {
  const [trades, setTrades] = useState<Trade[]>([
    { id: '1001', time: '09:31:42', symbol: 'AOE', side: 'BUY', quantity: 100, price: 49.95, status: 'FILLED', type: 'MARKET' },
    { id: '1002', time: '09:32:15', symbol: 'BOND1', side: 'BUY', quantity: 50, price: 99.25, status: 'FILLED', type: 'LIMIT' },
    { id: '1003', time: '09:33:01', symbol: 'AOE', side: 'SELL', quantity: 50, price: 50.05, status: 'FILLED', type: 'LIMIT' },
    { id: '1004', time: '09:34:22', symbol: 'BOND2', side: 'BUY', quantity: 200, price: 102.75, status: 'PARTIAL', type: 'LIMIT' },
  ]);

  useEffect(() => {
    if (socket) {
      socket.on('trade_execution', (trade: Trade) => {
        setTrades(prev => [trade, ...prev].slice(0, 50)); // Keep last 50 trades
      });

      return () => {
        socket.off('trade_execution');
      };
    }
  }, [socket]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'FILLED': return 'text-green-400';
      case 'PARTIAL': return 'text-yellow-400';
      case 'PENDING': return 'text-blue-400';
      case 'CANCELLED': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  return (
    <div className="h-full p-3 text-xs">
      <div className="text-orange-400 font-bold mb-3">ORDER LOG & EXECUTIONS</div>
      <div className="grid grid-cols-8 gap-1 text-gray-400 border-b border-gray-700 pb-1">
        <span>TIME</span>
        <span>ORDER ID</span>
        <span>SYMBOL</span>
        <span>SIDE</span>
        <span>QTY</span>
        <span>PRICE</span>
        <span>TYPE</span>
        <span>STATUS</span>
      </div>
      <div className="max-h-32 overflow-y-auto">
        {trades.map((trade) => (
          <div key={trade.id} className="grid grid-cols-8 gap-1 py-1 hover:bg-gray-800">
            <span className="text-gray-300">{trade.time}</span>
            <span className="text-blue-400">{trade.id}</span>
            <span className="text-yellow-400">{trade.symbol}</span>
            <span className={trade.side === 'BUY' ? 'text-green-400' : 'text-red-400'}>
              {trade.side}
            </span>
            <span className="text-white">{trade.quantity}</span>
            <span className="text-white">${trade.price.toFixed(2)}</span>
            <span className="text-gray-300">{trade.type}</span>
            <span className={getStatusColor(trade.status)}>{trade.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}