/**
 * Market Data Panel - Level II Market Data (Montage)
 * Privilege Code: 9
 */

'use client';

import { useState, useEffect } from 'react';

interface MarketDataProps {
  user: any;
  sessionState: any;
  socket: any;
}

interface Quote {
  symbol: string;
  bid: number;
  ask: number;
  last: number;
  change: number;
  changePercent: number;
  volume: number;
  time: string;
}

interface OrderBookLevel {
  price: number;
  size: number;
  orders: number;
}

export default function MarketDataPanel({ user, sessionState, socket }: MarketDataProps) {
  const [quotes, setQuotes] = useState<Quote[]>([
    { symbol: 'AOE', bid: 49.85, ask: 50.15, last: 50.00, change: 0.75, changePercent: 1.52, volume: 125400, time: '09:31:42' },
    { symbol: 'BOND1', bid: 99.25, ask: 99.35, last: 99.30, change: -0.05, changePercent: -0.05, volume: 8900, time: '09:31:38' },
    { symbol: 'BOND2', bid: 102.75, ask: 102.85, last: 102.80, change: 0.15, changePercent: 0.15, volume: 12300, time: '09:31:40' },
  ]);

  const [orderBook, setOrderBook] = useState({
    bids: [
      { price: 49.85, size: 1500, orders: 8 },
      { price: 49.80, size: 2300, orders: 12 },
      { price: 49.75, size: 1800, orders: 6 },
      { price: 49.70, size: 3200, orders: 15 },
      { price: 49.65, size: 900, orders: 4 },
    ] as OrderBookLevel[],
    asks: [
      { price: 50.15, size: 1200, orders: 6 },
      { price: 50.20, size: 1900, orders: 9 },
      { price: 50.25, size: 2100, orders: 11 },
      { price: 50.30, size: 800, orders: 3 },
      { price: 50.35, size: 1600, orders: 7 },
    ] as OrderBookLevel[]
  });

  useEffect(() => {
    if (socket) {
      socket.on('market_data', (data: any) => {
        // Update market data in real-time
        setQuotes(prev => prev.map(quote => 
          quote.symbol === data.symbol ? { ...quote, ...data } : quote
        ));
      });

      socket.on('order_book_update', (data: any) => {
        setOrderBook(data);
      });

      // Simulate market data updates
      const interval = setInterval(() => {
        setQuotes(prev => prev.map(quote => ({
          ...quote,
          bid: quote.bid + (Math.random() - 0.5) * 0.02,
          ask: quote.ask + (Math.random() - 0.5) * 0.02,
          last: quote.last + (Math.random() - 0.5) * 0.03,
          volume: quote.volume + Math.floor(Math.random() * 100),
          time: new Date().toLocaleTimeString()
        })));
      }, 1000);

      return () => {
        clearInterval(interval);
        socket.off('market_data');
        socket.off('order_book_update');
      };
    }
  }, [socket]);

  const formatPrice = (price: number) => price.toFixed(2);
  const formatChange = (change: number) => (change >= 0 ? '+' : '') + change.toFixed(2);
  const formatVolume = (volume: number) => volume.toLocaleString();

  return (
    <div className="h-full flex flex-col p-2 text-xs">
      {/* Market Overview */}
      <div className="mb-3">
        <div className="text-orange-400 font-bold mb-1">MARKET DATA - LEVEL II</div>
        <div className="grid grid-cols-7 gap-1 text-gray-400 border-b border-gray-700 pb-1">
          <span>SYMBOL</span>
          <span>BID</span>
          <span>ASK</span>
          <span>LAST</span>
          <span>CHG</span>
          <span>CHG%</span>
          <span>VOLUME</span>
        </div>
        {quotes.map((quote) => (
          <div key={quote.symbol} className="grid grid-cols-7 gap-1 py-1 hover:bg-gray-800">
            <span className="text-yellow-400 font-bold">{quote.symbol}</span>
            <span className="text-blue-400">{formatPrice(quote.bid)}</span>
            <span className="text-red-400">{formatPrice(quote.ask)}</span>
            <span className="text-white font-bold">{formatPrice(quote.last)}</span>
            <span className={quote.change >= 0 ? 'text-green-400' : 'text-red-400'}>
              {formatChange(quote.change)}
            </span>
            <span className={quote.changePercent >= 0 ? 'text-green-400' : 'text-red-400'}>
              {formatChange(quote.changePercent)}%
            </span>
            <span>{formatVolume(quote.volume)}</span>
          </div>
        ))}
      </div>

      {/* Order Book */}
      <div className="flex-1">
        <div className="text-orange-400 font-bold mb-1">ORDER BOOK - AOE</div>
        <div className="grid grid-cols-2 gap-2 h-32">
          {/* Bids */}
          <div>
            <div className="text-blue-400 font-bold text-center mb-1">BIDS</div>
            <div className="text-gray-400 grid grid-cols-3 gap-1 text-xs mb-1">
              <span>PRICE</span>
              <span>SIZE</span>
              <span>ORDS</span>
            </div>
            {orderBook.bids.map((bid, index) => (
              <div key={index} className="grid grid-cols-3 gap-1 text-blue-400">
                <span>{formatPrice(bid.price)}</span>
                <span>{bid.size}</span>
                <span>{bid.orders}</span>
              </div>
            ))}
          </div>

          {/* Asks */}
          <div>
            <div className="text-red-400 font-bold text-center mb-1">ASKS</div>
            <div className="text-gray-400 grid grid-cols-3 gap-1 text-xs mb-1">
              <span>PRICE</span>
              <span>SIZE</span>
              <span>ORDS</span>
            </div>
            {orderBook.asks.map((ask, index) => (
              <div key={index} className="grid grid-cols-3 gap-1 text-red-400">
                <span>{formatPrice(ask.price)}</span>
                <span>{ask.size}</span>
                <span>{ask.orders}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Market Status */}
      <div className="mt-2 pt-2 border-t border-gray-700 text-xs">
        <div className="flex justify-between">
          <span>MARKET STATUS:</span>
          <span className={sessionState?.marketState?.isOpen ? 'text-green-400' : 'text-red-400'}>
            {sessionState?.marketState?.isOpen ? 'OPEN' : 'CLOSED'}
          </span>
        </div>
        <div className="flex justify-between">
          <span>LIQUIDITY:</span>
          <span className={sessionState?.marketState?.liquidityActive ? 'text-green-400' : 'text-yellow-400'}>
            {sessionState?.marketState?.liquidityActive ? 'ACTIVE' : 'INACTIVE'}
          </span>
        </div>
        <div className="flex justify-between">
          <span>LAST UPDATE:</span>
          <span className="text-gray-400">{new Date().toLocaleTimeString()}</span>
        </div>
      </div>
    </div>
  );
}