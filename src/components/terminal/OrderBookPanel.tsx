/**
 * Order Book Panel - Level II Market Data
 * Privilege Code: 15
 */

'use client';

import { useState, useEffect } from 'react';

interface OrderBookProps {
  user: any;
  sessionState: any;
  socket: any;
}

interface OrderBookEntry {
  price: number;
  quantity: number;
  orders: number;
  mmid?: string;
}

interface OrderBookData {
  bids: OrderBookEntry[];
  asks: OrderBookEntry[];
  lastTrade: {
    price: number;
    quantity: number;
    time: string;
  };
  spread: number;
}

export default function OrderBookPanel({ user, sessionState, socket }: OrderBookProps) {
  const [selectedSymbol, setSelectedSymbol] = useState('AOE');
  const [orderBook, setOrderBook] = useState<OrderBookData>({
    bids: [
      { price: 49.95, quantity: 500, orders: 3, mmid: 'NSDQ' },
      { price: 49.94, quantity: 1200, orders: 5, mmid: 'BATS' },
      { price: 49.93, quantity: 800, orders: 2, mmid: 'ARCA' },
      { price: 49.92, quantity: 300, orders: 1, mmid: 'EDGX' },
      { price: 49.91, quantity: 950, orders: 4, mmid: 'NYSE' },
      { price: 49.90, quantity: 600, orders: 2, mmid: 'NSDQ' },
      { price: 49.89, quantity: 750, orders: 3, mmid: 'BATS' },
      { price: 49.88, quantity: 400, orders: 1, mmid: 'ARCA' },
    ],
    asks: [
      { price: 49.96, quantity: 300, orders: 1, mmid: 'NSDQ' },
      { price: 49.97, quantity: 750, orders: 2, mmid: 'BATS' },
      { price: 49.98, quantity: 1100, orders: 4, mmid: 'ARCA' },
      { price: 49.99, quantity: 600, orders: 2, mmid: 'EDGX' },
      { price: 50.00, quantity: 2000, orders: 8, mmid: 'NYSE' },
      { price: 50.01, quantity: 500, orders: 1, mmid: 'NSDQ' },
      { price: 50.02, quantity: 900, orders: 3, mmid: 'BATS' },
      { price: 50.03, quantity: 700, orders: 2, mmid: 'ARCA' },
    ],
    lastTrade: { price: 49.955, quantity: 200, time: '09:45:23' },
    spread: 0.01
  });

  useEffect(() => {
    if (socket) {
      socket.on('order_book_update', (data: any) => {
        if (data.symbol === selectedSymbol) {
          setOrderBook(data.orderBook);
        }
      });

      socket.on('level2_update', (data: any) => {
        if (data.symbol === selectedSymbol) {
          setOrderBook(prev => ({
            ...prev,
            bids: data.bids || prev.bids,
            asks: data.asks || prev.asks,
            lastTrade: data.lastTrade || prev.lastTrade,
            spread: data.spread || prev.spread
          }));
        }
      });

      return () => {
        socket.off('order_book_update');
        socket.off('level2_update');
      };
    }
  }, [socket, selectedSymbol]);

  const totalBidSize = orderBook.bids.reduce((sum, bid) => sum + bid.quantity, 0);
  const totalAskSize = orderBook.asks.reduce((sum, ask) => sum + ask.quantity, 0);

  return (
    <div className="h-full p-3 text-xs bg-black text-white">
      <div className="text-orange-400 font-bold mb-3 border-b border-gray-700 pb-1">
        ORDER BOOK - LEVEL II
      </div>
      
      <div className="mb-3">
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

      {/* Market Summary */}
      <div className="bg-gray-900 p-2 rounded mb-3 text-xs">
        <div className="grid grid-cols-3 gap-2">
          <div>
            <span className="text-gray-400">Last:</span>
            <span className="ml-1 text-white font-bold">${orderBook.lastTrade.price.toFixed(3)}</span>
          </div>
          <div>
            <span className="text-gray-400">Spread:</span>
            <span className="ml-1 text-yellow-400">${orderBook.spread.toFixed(3)}</span>
          </div>
          <div>
            <span className="text-gray-400">Time:</span>
            <span className="ml-1 text-gray-300">{orderBook.lastTrade.time}</span>
          </div>
        </div>
      </div>

      {/* Order Book */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        {/* Bids */}
        <div>
          <div className="text-green-400 font-bold mb-1 border-b border-gray-700">
            BIDS ({totalBidSize.toLocaleString()})
          </div>
          <div className="grid grid-cols-4 gap-1 text-gray-400 text-xs mb-1">
            <span>MMID</span>
            <span>QTY</span>
            <span>PRICE</span>
            <span>ORDS</span>
          </div>
          <div className="space-y-0">
            {orderBook.bids.map((bid, index) => (
              <div key={index} className="grid grid-cols-4 gap-1 text-xs hover:bg-gray-800 py-0.5">
                <span className="text-blue-400">{bid.mmid}</span>
                <span className="text-white">{bid.quantity}</span>
                <span className="text-green-400 font-mono">{bid.price.toFixed(2)}</span>
                <span className="text-gray-300">{bid.orders}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Asks */}
        <div>
          <div className="text-red-400 font-bold mb-1 border-b border-gray-700">
            ASKS ({totalAskSize.toLocaleString()})
          </div>
          <div className="grid grid-cols-4 gap-1 text-gray-400 text-xs mb-1">
            <span>MMID</span>
            <span>QTY</span>
            <span>PRICE</span>
            <span>ORDS</span>
          </div>
          <div className="space-y-0">
            {orderBook.asks.map((ask, index) => (
              <div key={index} className="grid grid-cols-4 gap-1 text-xs hover:bg-gray-800 py-0.5">
                <span className="text-blue-400">{ask.mmid}</span>
                <span className="text-white">{ask.quantity}</span>
                <span className="text-red-400 font-mono">{ask.price.toFixed(2)}</span>
                <span className="text-gray-300">{ask.orders}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Trading Actions */}
      <div className="mt-3 pt-2 border-t border-gray-700">
        <div className="grid grid-cols-2 gap-2">
          <button className="bg-green-700 hover:bg-green-600 text-white py-1 px-2 rounded text-xs">
            BUY MKT
          </button>
          <button className="bg-red-700 hover:bg-red-600 text-white py-1 px-2 rounded text-xs">
            SELL MKT
          </button>
        </div>
      </div>
    </div>
  );
}