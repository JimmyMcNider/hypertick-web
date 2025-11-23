/**
 * Legend-Style Trading Workspace
 *
 * Robinhood Legend-inspired resizable grid layout for professional trading.
 * Uses react-grid-layout for drag/drop and resize functionality.
 */

'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import GridLayout, { WidthProvider, Layout } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import {
  TrendingUp,
  BarChart3,
  Wallet,
  FileText,
  Activity,
  List,
  Settings,
  Layout as LayoutIcon,
  Save,
  RefreshCw,
  ChevronDown,
  X
} from 'lucide-react';

const ResponsiveGridLayout = WidthProvider(GridLayout);

// Panel type definitions
type PanelType =
  | 'chart'
  | 'orderEntry'
  | 'orderBook'
  | 'positions'
  | 'timeSales'
  | 'news'
  | 'marketWatch'
  | 'portfolio';

interface PanelConfig {
  id: string;
  type: PanelType;
  title: string;
  icon: React.ComponentType<any>;
  minW?: number;
  minH?: number;
}

// Available panels
const PANEL_CONFIGS: Record<PanelType, Omit<PanelConfig, 'id'>> = {
  chart: { type: 'chart', title: 'Chart', icon: TrendingUp, minW: 3, minH: 4 },
  orderEntry: { type: 'orderEntry', title: 'Order Entry', icon: FileText, minW: 2, minH: 3 },
  orderBook: { type: 'orderBook', title: 'Order Book', icon: BarChart3, minW: 2, minH: 4 },
  positions: { type: 'positions', title: 'Positions', icon: Wallet, minW: 2, minH: 2 },
  timeSales: { type: 'timeSales', title: 'Time & Sales', icon: Activity, minW: 2, minH: 3 },
  news: { type: 'news', title: 'News', icon: FileText, minW: 2, minH: 2 },
  marketWatch: { type: 'marketWatch', title: 'Market Watch', icon: List, minW: 2, minH: 3 },
  portfolio: { type: 'portfolio', title: 'Portfolio', icon: Wallet, minW: 2, minH: 2 }
};

// Preset layouts for different session types
const PRESET_LAYOUTS: Record<string, { name: string; layout: Layout[]; panels: PanelType[] }> = {
  default: {
    name: 'Default Trading',
    panels: ['chart', 'orderEntry', 'orderBook', 'positions', 'timeSales', 'marketWatch'],
    layout: [
      { i: 'chart', x: 0, y: 0, w: 8, h: 6 },
      { i: 'orderEntry', x: 8, y: 0, w: 4, h: 4 },
      { i: 'orderBook', x: 8, y: 4, w: 4, h: 5 },
      { i: 'positions', x: 0, y: 6, w: 4, h: 3 },
      { i: 'timeSales', x: 4, y: 6, w: 4, h: 3 },
      { i: 'marketWatch', x: 0, y: 9, w: 8, h: 3 }
    ]
  },
  dayTrader: {
    name: 'Day Trader',
    panels: ['chart', 'orderEntry', 'orderBook', 'timeSales', 'positions'],
    layout: [
      { i: 'chart', x: 0, y: 0, w: 6, h: 7 },
      { i: 'orderBook', x: 6, y: 0, w: 3, h: 7 },
      { i: 'orderEntry', x: 9, y: 0, w: 3, h: 5 },
      { i: 'timeSales', x: 9, y: 5, w: 3, h: 4 },
      { i: 'positions', x: 0, y: 7, w: 9, h: 2 }
    ]
  },
  analyst: {
    name: 'Analyst View',
    panels: ['chart', 'news', 'marketWatch', 'positions', 'portfolio'],
    layout: [
      { i: 'chart', x: 0, y: 0, w: 8, h: 5 },
      { i: 'news', x: 8, y: 0, w: 4, h: 5 },
      { i: 'marketWatch', x: 0, y: 5, w: 6, h: 4 },
      { i: 'portfolio', x: 6, y: 5, w: 3, h: 4 },
      { i: 'positions', x: 9, y: 5, w: 3, h: 4 }
    ]
  },
  simulation: {
    name: 'Simulation Mode',
    panels: ['chart', 'orderEntry', 'positions', 'news', 'timeSales'],
    layout: [
      { i: 'chart', x: 0, y: 0, w: 7, h: 6 },
      { i: 'orderEntry', x: 7, y: 0, w: 5, h: 4 },
      { i: 'news', x: 7, y: 4, w: 5, h: 3 },
      { i: 'positions', x: 0, y: 6, w: 7, h: 3 },
      { i: 'timeSales', x: 7, y: 7, w: 5, h: 2 }
    ]
  },
  compact: {
    name: 'Compact',
    panels: ['chart', 'orderEntry', 'positions'],
    layout: [
      { i: 'chart', x: 0, y: 0, w: 8, h: 7 },
      { i: 'orderEntry', x: 8, y: 0, w: 4, h: 4 },
      { i: 'positions', x: 8, y: 4, w: 4, h: 3 }
    ]
  }
};

interface LegendWorkspaceProps {
  sessionId: string;
  userId: string;
  symbol?: string;
  onSymbolChange?: (symbol: string) => void;
}

// Panel Components
const ChartPanel = ({ symbol }: { symbol: string }) => {
  const [priceHistory, setPriceHistory] = useState<number[]>([]);
  const [currentPrice, setCurrentPrice] = useState(50.00);

  useEffect(() => {
    // Initialize price history
    const history = Array.from({ length: 60 }, (_, i) => 50 + (Math.random() - 0.5) * 5);
    setPriceHistory(history);
    setCurrentPrice(history[history.length - 1]);

    const interval = setInterval(() => {
      setPriceHistory(prev => {
        const last = prev[prev.length - 1];
        const change = (Math.random() - 0.5) * 0.5;
        const newPrice = Math.max(1, last + change);
        setCurrentPrice(newPrice);
        return [...prev.slice(1), newPrice];
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [symbol]);

  const min = Math.min(...priceHistory);
  const max = Math.max(...priceHistory);
  const range = max - min || 1;

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-2 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <span className="text-lg font-bold text-white">{symbol}</span>
          <span className={`text-lg ${currentPrice >= priceHistory[0] ? 'text-green-400' : 'text-red-400'}`}>
            ${currentPrice.toFixed(2)}
          </span>
          <span className={`text-sm ${currentPrice >= priceHistory[0] ? 'text-green-400' : 'text-red-400'}`}>
            {currentPrice >= priceHistory[0] ? '+' : ''}{(currentPrice - priceHistory[0]).toFixed(2)}
            ({((currentPrice - priceHistory[0]) / priceHistory[0] * 100).toFixed(2)}%)
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <button className="px-2 py-1 bg-gray-700 rounded hover:bg-gray-600">1D</button>
          <button className="px-2 py-1 bg-gray-700 rounded hover:bg-gray-600">1W</button>
          <button className="px-2 py-1 bg-gray-700 rounded hover:bg-gray-600">1M</button>
          <button className="px-2 py-1 bg-gray-700 rounded hover:bg-gray-600">1Y</button>
        </div>
      </div>
      <div className="flex-1 p-2">
        <svg className="w-full h-full" viewBox="0 0 400 200" preserveAspectRatio="none">
          {/* Grid */}
          {[0, 1, 2, 3, 4].map(i => (
            <line key={i} x1="0" y1={i * 50} x2="400" y2={i * 50} stroke="#374151" strokeWidth="0.5" />
          ))}
          {/* Price line */}
          <polyline
            fill="none"
            stroke={currentPrice >= priceHistory[0] ? '#10B981' : '#EF4444'}
            strokeWidth="2"
            points={priceHistory.map((p, i) => `${(i / 59) * 400},${200 - ((p - min) / range) * 180}`).join(' ')}
          />
          {/* Fill area */}
          <polygon
            fill={currentPrice >= priceHistory[0] ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)'}
            points={`0,200 ${priceHistory.map((p, i) => `${(i / 59) * 400},${200 - ((p - min) / range) * 180}`).join(' ')} 400,200`}
          />
        </svg>
      </div>
    </div>
  );
};

const OrderEntryPanel = ({ symbol, onOrder }: { symbol: string; onOrder?: (order: any) => void }) => {
  const [orderType, setOrderType] = useState<'market' | 'limit'>('market');
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [quantity, setQuantity] = useState('100');
  const [price, setPrice] = useState('50.00');

  const handleSubmit = () => {
    const order = {
      symbol,
      type: orderType.toUpperCase(),
      side: side.toUpperCase(),
      quantity: parseInt(quantity),
      price: orderType === 'limit' ? parseFloat(price) : undefined,
      timestamp: new Date().toISOString()
    };
    console.log('Order submitted:', order);
    onOrder?.(order);
  };

  return (
    <div className="h-full flex flex-col p-3">
      <div className="flex gap-2 mb-3">
        <button
          onClick={() => setSide('buy')}
          className={`flex-1 py-2 rounded font-bold text-sm ${
            side === 'buy' ? 'bg-green-500 text-white' : 'bg-gray-700 text-gray-300'
          }`}
        >
          BUY
        </button>
        <button
          onClick={() => setSide('sell')}
          className={`flex-1 py-2 rounded font-bold text-sm ${
            side === 'sell' ? 'bg-red-500 text-white' : 'bg-gray-700 text-gray-300'
          }`}
        >
          SELL
        </button>
      </div>

      <div className="flex gap-2 mb-3">
        <button
          onClick={() => setOrderType('market')}
          className={`flex-1 py-1 rounded text-xs ${
            orderType === 'market' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'
          }`}
        >
          Market
        </button>
        <button
          onClick={() => setOrderType('limit')}
          className={`flex-1 py-1 rounded text-xs ${
            orderType === 'limit' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'
          }`}
        >
          Limit
        </button>
      </div>

      <div className="space-y-3 flex-1">
        <div>
          <label className="text-xs text-gray-400 block mb-1">Quantity</label>
          <input
            type="number"
            value={quantity}
            onChange={e => setQuantity(e.target.value)}
            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm"
          />
        </div>
        {orderType === 'limit' && (
          <div>
            <label className="text-xs text-gray-400 block mb-1">Limit Price</label>
            <input
              type="number"
              step="0.01"
              value={price}
              onChange={e => setPrice(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm"
            />
          </div>
        )}
        <div className="flex gap-2 text-xs">
          {['100', '500', '1000', 'MAX'].map(qty => (
            <button
              key={qty}
              onClick={() => setQuantity(qty === 'MAX' ? '10000' : qty)}
              className="flex-1 py-1 bg-gray-700 rounded hover:bg-gray-600 text-gray-300"
            >
              {qty}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={handleSubmit}
        className={`w-full py-3 rounded font-bold mt-3 ${
          side === 'buy'
            ? 'bg-green-500 hover:bg-green-600 text-white'
            : 'bg-red-500 hover:bg-red-600 text-white'
        }`}
      >
        {side === 'buy' ? 'BUY' : 'SELL'} {symbol}
      </button>
    </div>
  );
};

const OrderBookPanel = ({ symbol }: { symbol: string }) => {
  const [orderBook] = useState({
    bids: [
      { price: 49.95, size: 500 },
      { price: 49.90, size: 1200 },
      { price: 49.85, size: 800 },
      { price: 49.80, size: 2500 },
      { price: 49.75, size: 1800 }
    ],
    asks: [
      { price: 50.05, size: 450 },
      { price: 50.10, size: 900 },
      { price: 50.15, size: 1100 },
      { price: 50.20, size: 2200 },
      { price: 50.25, size: 1500 }
    ]
  });

  const maxSize = Math.max(...orderBook.bids.map(b => b.size), ...orderBook.asks.map(a => a.size));

  return (
    <div className="h-full flex flex-col text-xs">
      <div className="grid grid-cols-3 p-2 border-b border-gray-700 text-gray-400 font-medium">
        <span>Price</span>
        <span className="text-right">Size</span>
        <span className="text-right">Total</span>
      </div>
      <div className="flex-1 overflow-auto">
        {/* Asks (reversed to show highest first) */}
        {[...orderBook.asks].reverse().map((ask, i) => (
          <div key={`ask-${i}`} className="grid grid-cols-3 px-2 py-1 relative">
            <div
              className="absolute right-0 top-0 bottom-0 bg-red-500/10"
              style={{ width: `${(ask.size / maxSize) * 100}%` }}
            />
            <span className="text-red-400 relative z-10">${ask.price.toFixed(2)}</span>
            <span className="text-right relative z-10">{ask.size}</span>
            <span className="text-right text-gray-500 relative z-10">{ask.size}</span>
          </div>
        ))}
        {/* Spread */}
        <div className="px-2 py-1 bg-gray-800 text-center text-gray-400">
          Spread: ${(orderBook.asks[0].price - orderBook.bids[0].price).toFixed(2)}
        </div>
        {/* Bids */}
        {orderBook.bids.map((bid, i) => (
          <div key={`bid-${i}`} className="grid grid-cols-3 px-2 py-1 relative">
            <div
              className="absolute left-0 top-0 bottom-0 bg-green-500/10"
              style={{ width: `${(bid.size / maxSize) * 100}%` }}
            />
            <span className="text-green-400 relative z-10">${bid.price.toFixed(2)}</span>
            <span className="text-right relative z-10">{bid.size}</span>
            <span className="text-right text-gray-500 relative z-10">{bid.size}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const PositionsPanel = () => {
  const [positions] = useState([
    { symbol: 'AOE', qty: 500, avgPrice: 48.50, currentPrice: 50.00 },
    { symbol: 'BOND1', qty: -200, avgPrice: 99.50, currentPrice: 99.30 }
  ]);

  return (
    <div className="h-full flex flex-col text-xs">
      <div className="grid grid-cols-5 p-2 border-b border-gray-700 text-gray-400 font-medium">
        <span>Symbol</span>
        <span className="text-right">Qty</span>
        <span className="text-right">Avg</span>
        <span className="text-right">Price</span>
        <span className="text-right">P&L</span>
      </div>
      <div className="flex-1 overflow-auto">
        {positions.map((pos, i) => {
          const pnl = (pos.currentPrice - pos.avgPrice) * pos.qty;
          return (
            <div key={i} className="grid grid-cols-5 px-2 py-2 hover:bg-gray-800">
              <span className="text-white font-medium">{pos.symbol}</span>
              <span className={`text-right ${pos.qty > 0 ? 'text-green-400' : 'text-red-400'}`}>
                {pos.qty > 0 ? '+' : ''}{pos.qty}
              </span>
              <span className="text-right text-gray-400">${pos.avgPrice.toFixed(2)}</span>
              <span className="text-right text-white">${pos.currentPrice.toFixed(2)}</span>
              <span className={`text-right ${pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const TimeSalesPanel = ({ symbol }: { symbol: string }) => {
  const [trades, setTrades] = useState([
    { time: '14:32:45', price: 50.02, size: 100, side: 'buy' as const },
    { time: '14:32:43', price: 50.00, size: 250, side: 'sell' as const },
    { time: '14:32:41', price: 50.01, size: 150, side: 'buy' as const },
    { time: '14:32:38', price: 49.98, size: 500, side: 'sell' as const },
    { time: '14:32:35', price: 50.00, size: 200, side: 'buy' as const }
  ]);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const time = now.toLocaleTimeString('en-US', { hour12: false });
      const newTrade = {
        time,
        price: 50 + (Math.random() - 0.5) * 0.5,
        size: Math.floor(Math.random() * 500) + 50,
        side: Math.random() > 0.5 ? 'buy' as const : 'sell' as const
      };
      setTrades(prev => [newTrade, ...prev.slice(0, 49)]);
    }, 2000);

    return () => clearInterval(interval);
  }, [symbol]);

  return (
    <div className="h-full flex flex-col text-xs">
      <div className="grid grid-cols-4 p-2 border-b border-gray-700 text-gray-400 font-medium">
        <span>Time</span>
        <span className="text-right">Price</span>
        <span className="text-right">Size</span>
        <span className="text-right">Side</span>
      </div>
      <div className="flex-1 overflow-auto">
        {trades.map((trade, i) => (
          <div key={i} className="grid grid-cols-4 px-2 py-1 hover:bg-gray-800">
            <span className="text-gray-400">{trade.time}</span>
            <span className="text-right text-white">${trade.price.toFixed(2)}</span>
            <span className="text-right text-gray-300">{trade.size}</span>
            <span className={`text-right ${trade.side === 'buy' ? 'text-green-400' : 'text-red-400'}`}>
              {trade.side.toUpperCase()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

const NewsPanel = () => {
  const [news] = useState([
    { time: '14:30', headline: 'AOE beats Q3 earnings estimates', impact: 'positive' },
    { time: '14:15', headline: 'Market volatility increases ahead of Fed meeting', impact: 'neutral' },
    { time: '13:45', headline: 'Tech sector shows weakness', impact: 'negative' },
    { time: '13:30', headline: 'New partnership announced', impact: 'positive' }
  ]);

  return (
    <div className="h-full flex flex-col text-xs">
      <div className="flex-1 overflow-auto">
        {news.map((item, i) => (
          <div key={i} className="px-3 py-2 border-b border-gray-700 hover:bg-gray-800">
            <div className="flex items-center gap-2">
              <span className="text-gray-500">{item.time}</span>
              <span className={`w-2 h-2 rounded-full ${
                item.impact === 'positive' ? 'bg-green-400' :
                item.impact === 'negative' ? 'bg-red-400' : 'bg-yellow-400'
              }`} />
            </div>
            <p className="text-white mt-1">{item.headline}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

const MarketWatchPanel = () => {
  const [watchlist, setWatchlist] = useState([
    { symbol: 'AOE', price: 50.00, change: 1.25 },
    { symbol: 'BOND1', price: 99.30, change: -0.15 },
    { symbol: 'BOND2', price: 98.75, change: 0.05 },
    { symbol: 'SPX', price: 4150.00, change: 15.50 }
  ]);

  useEffect(() => {
    const interval = setInterval(() => {
      setWatchlist(prev => prev.map(item => ({
        ...item,
        price: item.price + (Math.random() - 0.5) * 0.1,
        change: item.change + (Math.random() - 0.5) * 0.05
      })));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="h-full flex flex-col text-xs">
      <div className="grid grid-cols-3 p-2 border-b border-gray-700 text-gray-400 font-medium">
        <span>Symbol</span>
        <span className="text-right">Price</span>
        <span className="text-right">Change</span>
      </div>
      <div className="flex-1 overflow-auto">
        {watchlist.map((item, i) => (
          <div key={i} className="grid grid-cols-3 px-2 py-2 hover:bg-gray-800 cursor-pointer">
            <span className="text-white font-medium">{item.symbol}</span>
            <span className="text-right text-white">${item.price.toFixed(2)}</span>
            <span className={`text-right ${item.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {item.change >= 0 ? '+' : ''}{item.change.toFixed(2)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

const PortfolioPanel = () => {
  return (
    <div className="h-full flex flex-col p-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <span className="text-xs text-gray-400">Account Value</span>
          <div className="text-xl font-bold text-white">$1,003,950.00</div>
        </div>
        <div>
          <span className="text-xs text-gray-400">Day P&L</span>
          <div className="text-xl font-bold text-green-400">+$1,250.00</div>
        </div>
        <div>
          <span className="text-xs text-gray-400">Buying Power</span>
          <div className="text-lg font-bold text-white">$2,007,900.00</div>
        </div>
        <div>
          <span className="text-xs text-gray-400">Margin Used</span>
          <div className="text-lg font-bold text-white">$0.00</div>
        </div>
      </div>
    </div>
  );
};

// Main workspace component
export default function LegendWorkspace({
  sessionId,
  userId,
  symbol: initialSymbol = 'AOE',
  onSymbolChange
}: LegendWorkspaceProps) {
  const [symbol, setSymbol] = useState(initialSymbol);
  const [currentPreset, setCurrentPreset] = useState('default');
  const [layout, setLayout] = useState<Layout[]>(PRESET_LAYOUTS.default.layout);
  const [activePanels, setActivePanels] = useState<PanelType[]>(PRESET_LAYOUTS.default.panels);
  const [showLayoutMenu, setShowLayoutMenu] = useState(false);

  // Load saved layout
  useEffect(() => {
    const saved = localStorage.getItem(`legend-layout-${sessionId}`);
    if (saved) {
      try {
        const data = JSON.parse(saved);
        setLayout(data.layout);
        setActivePanels(data.panels);
        setCurrentPreset(data.preset || 'custom');
      } catch (e) {
        console.error('Failed to load layout:', e);
      }
    }
  }, [sessionId]);

  const handleLayoutChange = useCallback((newLayout: Layout[]) => {
    setLayout(newLayout);
    setCurrentPreset('custom');
  }, []);

  const applyPreset = useCallback((presetKey: string) => {
    const preset = PRESET_LAYOUTS[presetKey];
    if (preset) {
      setLayout(preset.layout);
      setActivePanels(preset.panels);
      setCurrentPreset(presetKey);
    }
    setShowLayoutMenu(false);
  }, []);

  const saveLayout = useCallback(() => {
    localStorage.setItem(`legend-layout-${sessionId}`, JSON.stringify({
      layout,
      panels: activePanels,
      preset: currentPreset
    }));
  }, [sessionId, layout, activePanels, currentPreset]);

  const resetLayout = useCallback(() => {
    applyPreset('default');
    localStorage.removeItem(`legend-layout-${sessionId}`);
  }, [sessionId, applyPreset]);

  const renderPanel = useCallback((panelType: PanelType) => {
    const config = PANEL_CONFIGS[panelType];
    const Icon = config.icon;

    let content;
    switch (panelType) {
      case 'chart':
        content = <ChartPanel symbol={symbol} />;
        break;
      case 'orderEntry':
        content = <OrderEntryPanel symbol={symbol} />;
        break;
      case 'orderBook':
        content = <OrderBookPanel symbol={symbol} />;
        break;
      case 'positions':
        content = <PositionsPanel />;
        break;
      case 'timeSales':
        content = <TimeSalesPanel symbol={symbol} />;
        break;
      case 'news':
        content = <NewsPanel />;
        break;
      case 'marketWatch':
        content = <MarketWatchPanel />;
        break;
      case 'portfolio':
        content = <PortfolioPanel />;
        break;
      default:
        content = <div className="p-4 text-gray-400">Panel content</div>;
    }

    return (
      <div className="h-full flex flex-col bg-gray-900 rounded-lg overflow-hidden border border-gray-700">
        <div className="flex items-center justify-between px-3 py-2 bg-gray-800 border-b border-gray-700 cursor-move drag-handle">
          <div className="flex items-center gap-2">
            <Icon size={14} className="text-gray-400" />
            <span className="text-sm font-medium text-white">{config.title}</span>
          </div>
          <button
            onClick={() => setActivePanels(prev => prev.filter(p => p !== panelType))}
            className="text-gray-500 hover:text-gray-300"
          >
            <X size={14} />
          </button>
        </div>
        <div className="flex-1 overflow-hidden">
          {content}
        </div>
      </div>
    );
  }, [symbol]);

  return (
    <div className="h-screen bg-gray-950 flex flex-col">
      {/* Header Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-900 border-b border-gray-800">
        <div className="flex items-center gap-4">
          <span className="text-lg font-bold text-white">HYPERTICK</span>
          <span className="text-gray-500">|</span>
          <select
            value={symbol}
            onChange={e => {
              setSymbol(e.target.value);
              onSymbolChange?.(e.target.value);
            }}
            className="bg-gray-800 text-white border border-gray-700 rounded px-3 py-1 text-sm"
          >
            <option value="AOE">AOE</option>
            <option value="BOND1">BOND1</option>
            <option value="BOND2">BOND2</option>
            <option value="SPX">SPX</option>
          </select>
          <span className="text-green-400 text-sm">MARKET OPEN</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Layout Preset Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowLayoutMenu(!showLayoutMenu)}
              className="flex items-center gap-2 px-3 py-1 bg-gray-800 border border-gray-700 rounded text-sm text-white hover:bg-gray-700"
            >
              <LayoutIcon size={14} />
              <span>{PRESET_LAYOUTS[currentPreset]?.name || 'Custom'}</span>
              <ChevronDown size={14} />
            </button>
            {showLayoutMenu && (
              <div className="absolute right-0 top-full mt-1 w-48 bg-gray-800 border border-gray-700 rounded shadow-xl z-50">
                {Object.entries(PRESET_LAYOUTS).map(([key, preset]) => (
                  <button
                    key={key}
                    onClick={() => applyPreset(key)}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-700 ${
                      currentPreset === key ? 'text-blue-400' : 'text-white'
                    }`}
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={saveLayout}
            className="flex items-center gap-1 px-3 py-1 bg-gray-800 border border-gray-700 rounded text-sm text-white hover:bg-gray-700"
          >
            <Save size={14} />
            Save
          </button>
          <button
            onClick={resetLayout}
            className="flex items-center gap-1 px-3 py-1 bg-gray-800 border border-gray-700 rounded text-sm text-white hover:bg-gray-700"
          >
            <RefreshCw size={14} />
            Reset
          </button>
          <button className="p-1 bg-gray-800 border border-gray-700 rounded text-gray-400 hover:text-white hover:bg-gray-700">
            <Settings size={16} />
          </button>
        </div>
      </div>

      {/* Grid Layout */}
      <div className="flex-1 p-2">
        <ResponsiveGridLayout
          className="layout"
          layout={layout}
          cols={12}
          rowHeight={60}
          margin={[8, 8]}
          containerPadding={[0, 0]}
          onLayoutChange={handleLayoutChange}
          draggableHandle=".drag-handle"
          resizeHandles={['se', 'sw', 'ne', 'nw', 'e', 'w', 'n', 's']}
        >
          {activePanels.map(panelType => (
            <div key={panelType} className="overflow-hidden">
              {renderPanel(panelType)}
            </div>
          ))}
        </ResponsiveGridLayout>
      </div>

      {/* Footer Status Bar */}
      <div className="flex items-center justify-between px-4 py-1 bg-gray-900 border-t border-gray-800 text-xs text-gray-400">
        <div className="flex items-center gap-4">
          <span>Session: {sessionId.slice(0, 8)}...</span>
          <span>User: {userId.slice(0, 8)}...</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            Connected
          </span>
          <span>{new Date().toLocaleTimeString()}</span>
        </div>
      </div>
    </div>
  );
}
