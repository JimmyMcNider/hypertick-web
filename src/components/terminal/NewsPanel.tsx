/**
 * News Panel - Market News & Events
 * Privilege Code: 11
 */

'use client';

import { useState, useEffect } from 'react';

interface NewsProps {
  user: any;
  sessionState: any;
  socket: any;
}

interface NewsItem {
  id: string;
  time: string;
  headline: string;
  source: string;
  impact: 'HIGH' | 'MEDIUM' | 'LOW';
  symbols?: string[];
}

export default function NewsPanel({ user, sessionState, socket }: NewsProps) {
  const [news, setNews] = useState<NewsItem[]>([
    {
      id: '1',
      time: '09:30:00',
      headline: 'Market Opens - Trading Session Active',
      source: 'SYSTEM',
      impact: 'HIGH'
    },
    {
      id: '2',
      time: '09:31:15',
      headline: 'AOE Reports Strong Q3 Earnings',
      source: 'REUTERS',
      impact: 'HIGH',
      symbols: ['AOE']
    },
    {
      id: '3',
      time: '09:32:30',
      headline: 'Federal Reserve Maintains Interest Rates',
      source: 'BLOOMBERG',
      impact: 'MEDIUM',
      symbols: ['BOND1', 'BOND2', 'BOND3']
    },
    {
      id: '4',
      time: '09:33:45',
      headline: 'Market Volatility Expected in Tech Sector',
      source: 'CNBC',
      impact: 'MEDIUM'
    }
  ]);

  useEffect(() => {
    if (socket) {
      socket.on('news_update', (newsItem: NewsItem) => {
        setNews(prev => [newsItem, ...prev].slice(0, 20));
      });

      socket.on('session_event', (event: any) => {
        const systemNews: NewsItem = {
          id: `sys-${Date.now()}`,
          time: new Date().toLocaleTimeString(),
          headline: event.message || `System Event: ${event.type}`,
          source: 'SYSTEM',
          impact: 'LOW'
        };
        setNews(prev => [systemNews, ...prev].slice(0, 20));
      });

      return () => {
        socket.off('news_update');
        socket.off('session_event');
      };
    }
  }, [socket]);

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'HIGH': return 'text-red-400';
      case 'MEDIUM': return 'text-yellow-400';
      case 'LOW': return 'text-green-400';
      default: return 'text-gray-400';
    }
  };

  return (
    <div className="h-full p-3 text-xs">
      <div className="text-orange-400 font-bold mb-3">NEWS & MARKET EVENTS</div>
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {news.map((item) => (
          <div key={item.id} className="bg-gray-800 p-2 rounded">
            <div className="flex justify-between items-start mb-1">
              <span className="text-gray-400">{item.time}</span>
              <span className={`${getImpactColor(item.impact)} font-bold`}>
                {item.impact}
              </span>
            </div>
            <div className="text-white text-xs mb-1">{item.headline}</div>
            <div className="flex justify-between items-center">
              <span className="text-blue-400 text-xs">{item.source}</span>
              {item.symbols && (
                <div className="flex space-x-1">
                  {item.symbols.map(symbol => (
                    <span key={symbol} className="text-yellow-400 text-xs">
                      {symbol}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}