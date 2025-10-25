'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Maximize2, 
  Minimize2, 
  X, 
  BarChart3, 
  Activity, 
  DollarSign, 
  Users, 
  AlertTriangle,
  Calendar,
  Clock,
  FileText,
  Settings,
  Grid,
  TrendingUp,
  LineChart,
  Shield,
  Zap,
  Palette
} from 'lucide-react';

// Theme definitions
export const TRADING_THEMES = {
  classic: {
    name: 'Classic Green',
    background: 'bg-black',
    text: 'text-green-400',
    header: 'bg-gray-900',
    border: 'border-green-400',
    accent: 'text-green-400',
    positive: 'text-green-400',
    negative: 'text-red-400',
    neutral: 'text-yellow-400'
  },
  bloomberg: {
    name: 'Bloomberg Orange',
    background: 'bg-gray-900',
    text: 'text-orange-300',
    header: 'bg-orange-800',
    border: 'border-orange-400',
    accent: 'text-orange-400',
    positive: 'text-green-400',
    negative: 'text-red-400',
    neutral: 'text-orange-300'
  },
  professional: {
    name: 'Professional Blue',
    background: 'bg-slate-900',
    text: 'text-blue-300',
    header: 'bg-blue-800',
    border: 'border-blue-400',
    accent: 'text-blue-400',
    positive: 'text-emerald-400',
    negative: 'text-red-400',
    neutral: 'text-slate-300'
  },
  highContrast: {
    name: 'High Contrast',
    background: 'bg-black',
    text: 'text-white',
    header: 'bg-gray-800',
    border: 'border-white',
    accent: 'text-cyan-400',
    positive: 'text-lime-400',
    negative: 'text-red-400',
    neutral: 'text-yellow-300'
  }
};

interface WindowPosition {
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
}

interface TradingWindow {
  id: string;
  title: string;
  component: React.ComponentType<any>;
  isMinimized: boolean;
  isMaximized: boolean;
  position: WindowPosition;
  icon?: React.ComponentType<any>;
  props?: any;
}

interface ProfessionalTradingWorkspaceProps {
  sessionId: string;
  userId: string;
  userRole: 'STUDENT' | 'INSTRUCTOR' | 'ADMIN';
}

// Professional Trading Window Components
const PortfolioWindow = ({ windowId, theme }: { windowId: string; theme?: any }) => {
  const currentTheme = theme || TRADING_THEMES.classic;
  return (
    <div className={`h-full ${currentTheme.background} ${currentTheme.text} font-mono text-xs overflow-hidden`}>
      <div className={`grid grid-cols-4 gap-1 p-1 border-b ${currentTheme.border} ${currentTheme.header} text-xs`}>
        <div className="font-bold">Security</div>
        <div className="font-bold text-right">Qty</div>
        <div className="font-bold text-right">Value</div>
        <div className="font-bold text-right">Gain</div>
      </div>
      <div className="p-1 space-y-1">
        <div className="grid grid-cols-4 gap-1 hover:bg-gray-800">
          <div>USD</div>
          <div className="text-right">1,003,950</div>
          <div className={`text-right ${currentTheme.positive}`}>1,003,950</div>
          <div className="text-right">0</div>
        </div>
        <div className={`border-t ${currentTheme.border} pt-2 mt-2`}>
          <div className={`${currentTheme.positive} font-bold`}>Equity Value: 1,003,950</div>
        </div>
      </div>
    </div>
  );
};

const MarketWatchWindow = ({ windowId, theme }: { windowId: string; theme?: any }) => {
  const currentTheme = theme || TRADING_THEMES.classic;
  const [marketData, setMarketData] = useState<Record<string, any>>({});
  
  // Subscribe to real-time market data via WebSocket
  useEffect(() => {
    // Initialize with default data for known symbols
    const initialData = {
      'AOE': { price: 50.00, bid: 49.95, ask: 50.05, volume: 125000, change: 0, changePercent: 0, open: 50.00 },
      'BOND1': { price: 99.30, bid: 99.29, ask: 99.31, volume: 45000, change: 0, changePercent: 0, open: 99.30 },
      'BOND2': { price: 102.80, bid: 102.79, ask: 102.81, volume: 32000, change: 0, changePercent: 0, open: 102.80 },
      'BOND3': { price: 95.50, bid: 95.49, ask: 95.51, volume: 28000, change: 0, changePercent: 0, open: 95.50 },
      'SPX': { price: 4150.00, bid: 4149.90, ask: 4150.10, volume: 890000, change: 0, changePercent: 0, open: 4150.00 }
    };
    setMarketData(initialData);

    // Simulate live price updates
    const interval = setInterval(() => {
      setMarketData(prev => {
        const updated = { ...prev };
        Object.keys(updated).forEach(symbol => {
          const data = updated[symbol];
          const volatility = symbol.startsWith('BOND') ? 0.001 : 0.002;
          const priceChange = (Math.random() - 0.5) * 2 * data.price * volatility;
          const newPrice = Math.max(0.01, data.price + priceChange);
          const spread = symbol.startsWith('BOND') ? 0.02 : 0.10;
          
          updated[symbol] = {
            ...data,
            price: newPrice,
            bid: newPrice - spread / 2,
            ask: newPrice + spread / 2,
            volume: data.volume + Math.floor(Math.random() * 1000),
            change: newPrice - data.open,
            changePercent: ((newPrice - data.open) / data.open) * 100
          };
        });
        return updated;
      });
    }, 1000); // Update every second

    return () => clearInterval(interval);
  }, []);

  const formatPrice = (price: number, symbol: string) => {
    return symbol.startsWith('BOND') ? price.toFixed(2) : price.toFixed(2);
  };

  const formatVolume = (volume: number) => {
    if (volume >= 1000000) return (volume / 1000000).toFixed(1) + 'M';
    if (volume >= 1000) return (volume / 1000).toFixed(0) + 'K';
    return volume.toString();
  };

  const formatChange = (change: number, changePercent: number) => {
    const sign = change >= 0 ? '+' : '';
    return `${sign}${change.toFixed(2)} (${sign}${changePercent.toFixed(2)}%)`;
  };

  const getChangeColor = (change: number) => {
    if (change > 0) return currentTheme.positive;
    if (change < 0) return currentTheme.negative;
    return currentTheme.neutral;
  };

  return (
    <div className={`h-full ${currentTheme.background} ${currentTheme.text} font-mono text-xs overflow-hidden`}>
      <div className={`grid grid-cols-5 gap-1 p-1 border-b ${currentTheme.border} ${currentTheme.header} text-xs`}>
        <div className="font-bold">Symbol</div>
        <div className="font-bold text-right">Last</div>
        <div className="font-bold text-right">Bid/Ask</div>
        <div className="font-bold text-right">Vol</div>
        <div className="font-bold text-right">Chg</div>
      </div>
      <div className="p-1 space-y-1">
        {Object.entries(marketData).map(([symbol, data]) => (
          <div key={symbol} className="grid grid-cols-5 gap-1 hover:bg-gray-800 cursor-pointer p-1 rounded text-xs">
            <div className={currentTheme.accent}>{symbol}</div>
            <div className="text-right">{formatPrice(data.price, symbol)}</div>
            <div className="text-right text-xs">
              <span className={currentTheme.positive}>{formatPrice(data.bid, symbol)}</span>
              <span className="text-gray-500">/</span>
              <span className={currentTheme.negative}>{formatPrice(data.ask, symbol)}</span>
            </div>
            <div className="text-right">{formatVolume(data.volume)}</div>
            <div className={`text-right text-xs ${getChangeColor(data.change)}`}>
              {data.changePercent >= 0 ? '+' : ''}{data.changePercent.toFixed(1)}%
            </div>
          </div>
        ))}
      </div>
      <div className={`absolute bottom-2 right-2 text-xs ${currentTheme.text} opacity-60`}>
        <Activity className="inline w-3 h-3 mr-1" />
        Live Market Data
      </div>
    </div>
  );
};

const BuyingPowerWindow = ({ windowId }: { windowId: string }) => (
  <div className="h-full bg-black text-green-400 font-mono text-xs p-2 overflow-hidden">
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="text-cyan-400">Initial</div>
        <div className="text-right text-white">1,003,950</div>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="text-cyan-400">Maintenance</div>
        <div className="text-right text-white">1,003,950</div>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="text-cyan-400">Available</div>
        <div className="text-right text-white">1,003,950</div>
      </div>
      <div className="border-t border-green-400 pt-2 mt-2">
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="text-cyan-400">Actual</div>
          <div className="text-right text-white">0</div>
        </div>
        <div className="grid grid-cols-2 gap-2 mt-1 text-xs">
          <div className="text-cyan-400">Reserved</div>
          <div className="text-right text-white">0</div>
        </div>
        <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
          <div className="text-cyan-400">Available (Stock)</div>
          <div className="text-right text-white">1,003,950</div>
        </div>
        <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
          <div className="text-cyan-400">Buying Power</div>
          <div className="text-right text-white">2,007,900</div>
        </div>
      </div>
      <div className="bg-green-600 text-black text-center py-1 mt-2 font-bold text-xs">
        Account Status - Positive
      </div>
    </div>
  </div>
);

const NewsWindow = ({ windowId }: { windowId: string }) => (
  <div className="h-full bg-white text-black text-sm overflow-auto">
    <div className="bg-blue-600 text-white p-2 font-bold text-center">
      News    Classroom Time: 9:31:51 AM    Simulation Date: 2/10/2000    Length of Day: 6 seconds
    </div>
    <div className="p-3 space-y-2">
      <div className="grid grid-cols-4 gap-2 text-xs font-bold border-b pb-1">
        <div>Date</div>
        <div>Ticker</div>
        <div>Headline</div>
      </div>
      <div className="grid grid-cols-4 gap-2 text-xs hover:bg-gray-100 py-1">
        <div>2/9/2000</div>
        <div className="text-blue-600">VGR</div>
        <div>Markets reverses EPS estimate for Q1 to 1.05 per share – from 0.9</div>
      </div>
      <div className="grid grid-cols-4 gap-2 text-xs hover:bg-gray-100 py-1">
        <div>2/6/2000</div>
        <div className="text-blue-600">PNR</div>
        <div>MacroBank estimates earnings of 0.45 per share for Q1</div>
      </div>
      <div className="grid grid-cols-4 gap-2 text-xs hover:bg-gray-100 py-1">
        <div>1/29/2000</div>
        <div className="text-blue-600">PNR</div>
        <div>FederalBank estimates earnings of 0.53 per share for Q1</div>
      </div>
      <div className="grid grid-cols-4 gap-2 text-xs hover:bg-gray-100 py-1">
        <div>1/23/2000</div>
        <div className="text-blue-600">PNR</div>
        <div>RYBank estimates earnings of 0.51 per share for Q1</div>
      </div>
      <div className="grid grid-cols-4 gap-2 text-xs hover:bg-gray-100 py-1">
        <div>1/23/2000</div>
        <div className="text-blue-600">PNR</div>
        <div>BostonBank estimates earnings of 0.43 per share for Q1</div>
      </div>
    </div>
  </div>
);

const MarketOrderWindow = ({ windowId }: { windowId: string }) => (
  <div className="h-full bg-gray-200 p-4 overflow-hidden">
    <div className="bg-blue-600 text-white text-center py-2 mb-4 font-bold">
      Market Order Window: PNR
    </div>
    <div className="bg-black text-green-400 p-4 font-mono">
      <div className="grid grid-cols-2 gap-8 mb-4">
        <div>
          <div>Last: <span className="text-white">135.73</span></div>
          <div>Bid: <span className="text-white">155.30</span></div>
          <div>Size: <span className="text-white">370</span></div>
        </div>
        <div>
          <div>Volume: <span className="text-white">170,413</span></div>
          <div>Ask: <span className="text-white">135.73</span></div>
          <div>Size: <span className="text-white">272</span></div>
        </div>
      </div>
    </div>
    <div className="mt-4 space-y-3">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">Security:</label>
          <select className="w-full border border-gray-400 p-1 text-sm">
            <option>PNR</option>
          </select>
        </div>
        <div>
          <label className="text-sm font-medium">Quantity:</label>
          <input type="number" defaultValue="0" className="w-full border border-gray-400 p-1 text-sm" />
        </div>
      </div>
      <div className="flex gap-4 justify-center">
        <Button className="bg-green-600 hover:bg-green-700 text-white px-8 py-2">
          Buy    $135.73
        </Button>
        <Button className="bg-red-600 hover:bg-red-700 text-white px-8 py-2">
          Sell    $135.30
        </Button>
      </div>
    </div>
  </div>
);

const OrderLogWindow = ({ windowId }: { windowId: string }) => (
  <div className="h-full bg-white text-black text-sm overflow-auto">
    <div className="grid grid-cols-8 gap-1 p-2 border-b border-gray-400 bg-gray-100 text-xs font-bold">
      <div>Status</div>
      <div>Time</div>
      <div>ID</div>
      <div>Security</div>
      <div>Side</div>
      <div>Price</div>
      <div>Filled/Requested</div>
      <div>Avg Price</div>
    </div>
    <div className="p-2">
      {/* Empty order log initially */}
      <div className="text-gray-500 text-center py-8">No orders placed yet</div>
    </div>
  </div>
);

const MarketGraphWindow = ({ windowId }: { windowId: string }) => {
  const [selectedSymbol, setSelectedSymbol] = useState('AOE');
  const [priceHistory, setPriceHistory] = useState<number[]>([]);
  const [currentPrice, setCurrentPrice] = useState(50.00);
  const [priceChange, setPriceChange] = useState(0);

  useEffect(() => {
    // Initialize price history for the selected symbol
    const initialPrice = selectedSymbol === 'AOE' ? 50.00 : 
                         selectedSymbol === 'SPX' ? 4150.00 :
                         selectedSymbol.startsWith('BOND') ? 99.30 : 50.00;
    
    const history = Array.from({ length: 50 }, (_, i) => {
      const volatility = selectedSymbol.startsWith('BOND') ? 0.0005 : 0.001;
      return initialPrice + (Math.random() - 0.5) * initialPrice * volatility * i * 0.1;
    });
    
    setPriceHistory(history);
    setCurrentPrice(history[history.length - 1]);

    // Simulate real-time price updates
    const interval = setInterval(() => {
      setPriceHistory(prev => {
        const lastPrice = prev[prev.length - 1];
        const volatility = selectedSymbol.startsWith('BOND') ? 0.0005 : 0.001;
        const change = (Math.random() - 0.5) * 2 * lastPrice * volatility;
        const newPrice = Math.max(0.01, lastPrice + change);
        
        setCurrentPrice(newPrice);
        setPriceChange(newPrice - prev[0]);
        
        // Keep last 50 points
        const newHistory = [...prev.slice(1), newPrice];
        return newHistory;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [selectedSymbol]);

  // Generate SVG path for price line
  const generatePath = () => {
    if (priceHistory.length < 2) return '';
    
    const width = 400;
    const height = 200;
    const minPrice = Math.min(...priceHistory);
    const maxPrice = Math.max(...priceHistory);
    const priceRange = maxPrice - minPrice || 1;
    
    const points = priceHistory.map((price, index) => {
      const x = (index / (priceHistory.length - 1)) * width;
      const y = height - ((price - minPrice) / priceRange) * height;
      return `${x},${y}`;
    }).join(' ');
    
    return points;
  };

  const formatPrice = (price: number) => {
    return selectedSymbol.startsWith('BOND') ? price.toFixed(2) : 
           selectedSymbol === 'SPX' ? price.toFixed(2) : price.toFixed(2);
  };

  const symbols = ['AOE', 'SPX', 'BOND1', 'BOND2', 'BOND3'];

  return (
    <div className="h-full bg-black text-green-400 font-mono text-sm overflow-hidden">
      <div className="p-2 border-b border-green-400 bg-gray-900">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <select 
              value={selectedSymbol}
              onChange={(e) => setSelectedSymbol(e.target.value)}
              className="bg-gray-800 text-green-400 border border-green-400 rounded px-2 py-1 text-xs"
            >
              {symbols.map(symbol => (
                <option key={symbol} value={symbol}>{symbol}</option>
              ))}
            </select>
            <div className="font-bold">{selectedSymbol} - Real Time Chart</div>
          </div>
          <div className="text-xs">
            <span>Last: ${formatPrice(currentPrice)}</span>
            <span className={`ml-2 ${priceChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {priceChange >= 0 ? '+' : ''}{formatPrice(priceChange)}
            </span>
          </div>
        </div>
      </div>
      <div className="relative h-full p-2">
        <div className="h-full flex flex-col">
          <div className="flex-1 relative">
            {/* Chart grid */}
            <div className="absolute inset-0 grid grid-cols-10 grid-rows-8 border-r border-b border-green-800">
              {Array.from({ length: 80 }).map((_, i) => (
                <div key={i} className="border-l border-t border-green-800 opacity-20"></div>
              ))}
            </div>
            {/* Price line */}
            <svg className="absolute inset-0 w-full h-full">
              <polyline
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                points={generatePath()}
                className={priceChange >= 0 ? "text-green-400" : "text-red-400"}
              />
              {/* Current price indicator */}
              {priceHistory.length > 0 && (
                <circle
                  cx="400"
                  cy={200 - ((currentPrice - Math.min(...priceHistory)) / 
                    (Math.max(...priceHistory) - Math.min(...priceHistory) || 1)) * 200}
                  r="3"
                  fill="currentColor"
                  className="text-yellow-400"
                />
              )}
            </svg>
            {/* Price scale */}
            <div className="absolute right-1 top-0 h-full flex flex-col justify-between text-xs text-gray-400">
              <div>{formatPrice(Math.max(...priceHistory))}</div>
              <div>{formatPrice((Math.max(...priceHistory) + Math.min(...priceHistory)) / 2)}</div>
              <div>{formatPrice(Math.min(...priceHistory))}</div>
            </div>
          </div>
          {/* Time axis */}
          <div className="text-xs text-gray-400 mt-2 grid grid-cols-6 px-2">
            <div>-50s</div>
            <div>-40s</div>
            <div>-30s</div>
            <div>-20s</div>
            <div>-10s</div>
            <div>Now</div>
          </div>
        </div>
        {/* Live indicator */}
        <div className="absolute top-4 right-4 flex items-center text-xs">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse mr-1"></div>
          Live
        </div>
      </div>
    </div>
  );
};

const RiskManagementWindow = ({ windowId }: { windowId: string }) => (
  <div className="h-full bg-red-900 text-white text-sm overflow-auto">
    <div className="p-2 border-b border-red-400 bg-red-800 font-bold">
      Risk Management Console
    </div>
    <div className="p-2 space-y-3">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="text-xs text-red-200">Max Position Size:</div>
          <div className="text-lg font-bold">$100,000</div>
        </div>
        <div>
          <div className="text-xs text-red-200">Current Exposure:</div>
          <div className="text-lg font-bold text-green-400">$0</div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="text-xs text-red-200">VaR (95%):</div>
          <div className="text-lg font-bold">$2,150</div>
        </div>
        <div>
          <div className="text-xs text-red-200">Margin Used:</div>
          <div className="text-lg font-bold">$0</div>
        </div>
      </div>
      <div className="mt-4">
        <div className="text-xs text-red-200 mb-1">Risk Metrics:</div>
        <div className="text-xs space-y-1">
          <div>Concentration Risk: <span className="text-green-400">LOW</span></div>
          <div>Leverage Ratio: <span className="text-green-400">1.0x</span></div>
          <div>Liquidity Risk: <span className="text-green-400">MINIMAL</span></div>
        </div>
      </div>
    </div>
  </div>
);

const AuctionWindow = ({ windowId }: { windowId: string }) => {
  const [activeAuctions, setActiveAuctions] = useState<any[]>([]);
  const [selectedAuction, setSelectedAuction] = useState<any>(null);
  const [bidAmount, setBidAmount] = useState<string>('');
  const [bidHistory, setBidHistory] = useState<any[]>([]);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);

  // Simulate auction data - in real implementation, this would come from WebSocket
  useEffect(() => {
    // Initialize with a sample auction
    const sampleAuction = {
      id: 'auction_001',
      symbol: 'AOE',
      description: 'Market Making Rights for AOE',
      currentBid: 2500,
      minimumBid: 1000,
      highestBidder: 'Trader_3',
      endTime: new Date(Date.now() + 60000), // 1 minute from now
      status: 'ACTIVE'
    };

    setActiveAuctions([sampleAuction]);
    setSelectedAuction(sampleAuction);

    // Initialize bid history
    setBidHistory([
      { bidder: 'Trader_3', amount: 2500, timestamp: new Date(Date.now() - 15000) },
      { bidder: 'Trader_1', amount: 2250, timestamp: new Date(Date.now() - 45000) },
      { bidder: 'Trader_5', amount: 2000, timestamp: new Date(Date.now() - 120000) },
      { bidder: 'Trader_2', amount: 1500, timestamp: new Date(Date.now() - 180000) }
    ]);

    // Update timer
    const timer = setInterval(() => {
      if (selectedAuction) {
        const remaining = Math.max(0, selectedAuction.endTime.getTime() - Date.now());
        setTimeRemaining(Math.ceil(remaining / 1000));
        
        if (remaining <= 0) {
          setSelectedAuction((prev: any) => prev ? { ...prev, status: 'ENDED' } : null);
        }
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [selectedAuction?.id]);

  const handlePlaceBid = () => {
    const bid = parseFloat(bidAmount);
    if (!selectedAuction || !bid || bid <= selectedAuction.currentBid) {
      alert('Bid must be higher than current bid');
      return;
    }

    // Add new bid to history
    const newBid = {
      bidder: 'You',
      amount: bid,
      timestamp: new Date()
    };

    setBidHistory((prev: any[]) => [newBid, ...prev]);
    
    // Update auction
    setSelectedAuction((prev: any) => ({
      ...prev,
      currentBid: bid,
      highestBidder: 'You'
    }));

    setBidAmount('');
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatBidAmount = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(amount);
  };

  if (!selectedAuction) {
    return (
      <div className="h-full bg-purple-900 text-purple-100 text-sm overflow-auto">
        <div className="p-2 border-b border-purple-400 bg-purple-800 font-bold">
          Market Making Auction
        </div>
        <div className="p-4 text-center">
          <div className="text-purple-300 mb-4">No active auctions</div>
          <div className="text-xs text-purple-400">
            Auctions will appear here when market making rights become available
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-purple-900 text-purple-100 text-sm overflow-auto">
      <div className="p-2 border-b border-purple-400 bg-purple-800 font-bold flex items-center justify-between">
        <span>Market Making Auction</span>
        <div className={`px-2 py-1 rounded text-xs ${
          selectedAuction.status === 'ACTIVE' ? 'bg-green-600' :
          selectedAuction.status === 'ENDED' ? 'bg-red-600' : 'bg-gray-600'
        }`}>
          {selectedAuction.status}
        </div>
      </div>
      
      <div className="p-2 space-y-3">
        <div className="text-center text-yellow-300 font-bold">
          AUCTION: {selectedAuction.description}
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-xs text-purple-200">Current High Bid:</div>
            <div className="text-lg font-bold text-yellow-300">
              {formatBidAmount(selectedAuction.currentBid)}
            </div>
            <div className="text-xs text-purple-300">
              by {selectedAuction.highestBidder}
            </div>
          </div>
          <div>
            <div className="text-xs text-purple-200">Time Remaining:</div>
            <div className={`text-lg font-bold ${
              timeRemaining <= 30 ? 'text-red-300 animate-pulse' : 'text-green-300'
            }`}>
              {timeRemaining > 0 ? formatTime(timeRemaining) : 'ENDED'}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-xs">
          <div>
            <div className="text-purple-200">Minimum Bid:</div>
            <div className="font-bold">{formatBidAmount(selectedAuction.minimumBid)}</div>
          </div>
          <div>
            <div className="text-purple-200">Symbol:</div>
            <div className="font-bold text-cyan-300">{selectedAuction.symbol}</div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-xs font-bold">Bid History:</div>
          <div className="bg-purple-800 rounded p-2 max-h-32 overflow-y-auto">
            {bidHistory.length > 0 ? (
              <div className="text-xs space-y-1">
                {bidHistory.map((bid, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <span className={bid.bidder === 'You' ? 'text-yellow-300 font-bold' : ''}>
                      {bid.bidder}:
                    </span>
                    <span className="font-bold">{formatBidAmount(bid.amount)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-purple-400">No bids yet</div>
            )}
          </div>
        </div>

        {selectedAuction.status === 'ACTIVE' && timeRemaining > 0 && (
          <div className="mt-4 space-y-2">
            <div className="text-xs text-purple-200">
              Minimum next bid: {formatBidAmount(selectedAuction.currentBid + 100)}
            </div>
            <input 
              type="number" 
              placeholder={`Min: ${selectedAuction.currentBid + 100}`}
              value={bidAmount}
              onChange={(e) => setBidAmount(e.target.value)}
              className="w-full p-2 text-black rounded text-sm"
              min={selectedAuction.currentBid + 100}
            />
            <Button 
              onClick={handlePlaceBid}
              className="w-full bg-yellow-600 hover:bg-yellow-700 text-black font-bold"
              disabled={!bidAmount || parseFloat(bidAmount) <= selectedAuction.currentBid}
            >
              PLACE BID
            </Button>
          </div>
        )}

        {selectedAuction.status === 'ENDED' && (
          <div className="mt-4 p-3 bg-red-800 rounded text-center">
            <div className="text-yellow-300 font-bold">AUCTION ENDED</div>
            <div className="text-sm mt-1">
              Winner: <span className="font-bold">{selectedAuction.highestBidder}</span>
            </div>
            <div className="text-sm">
              Winning Bid: <span className="font-bold">{formatBidAmount(selectedAuction.currentBid)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const ThemeControlWindow = ({ windowId, onThemeChange }: { windowId: string; onThemeChange: (theme: string) => void }) => (
  <div className="h-full bg-gray-800 text-white text-sm overflow-auto">
    <div className="p-2 border-b border-gray-400 bg-gray-700 font-bold flex items-center gap-2">
      <Palette size={16} />
      Theme Settings
    </div>
    <div className="p-3 space-y-3">
      <div className="text-xs font-bold mb-2">Color Themes:</div>
      {Object.entries(TRADING_THEMES).map(([key, theme]) => (
        <button
          key={key}
          onClick={() => onThemeChange(key)}
          className="w-full p-2 text-left rounded hover:bg-gray-700 border border-gray-600"
        >
          <div className="font-medium">{theme.name}</div>
          <div className="text-xs text-gray-400 mt-1">
            <span className={`inline-block w-3 h-3 rounded mr-2 ${theme.background}`}></span>
            <span className={`inline-block w-3 h-3 rounded mr-2 ${theme.text.replace('text-', 'bg-')}`}></span>
            <span className={`inline-block w-3 h-3 rounded ${theme.accent.replace('text-', 'bg-')}`}></span>
          </div>
        </button>
      ))}
      <div className="mt-4 text-xs text-gray-400">
        Themes optimize visibility for different lighting conditions and user preferences.
      </div>
    </div>
  </div>
);

export default function ProfessionalTradingWorkspace({ 
  sessionId, 
  userId, 
  userRole 
}: ProfessionalTradingWorkspaceProps) {
  const [currentTheme, setCurrentTheme] = useState<keyof typeof TRADING_THEMES>('classic');
  const [windows, setWindows] = useState<TradingWindow[]>([
    // Row 1: Order Window and Market Graph - MAIN TRADING TOOLS
    {
      id: 'market-order',
      title: 'Market Order Window',
      component: MarketOrderWindow,
      isMinimized: false,
      isMaximized: false,
      position: { x: 10, y: 10, width: 420, height: 280, zIndex: 1 },
      icon: TrendingUp
    },
    {
      id: 'market-graph',
      title: 'Market Graph',
      component: MarketGraphWindow,
      isMinimized: false,
      isMaximized: false,
      position: { x: 440, y: 10, width: 500, height: 280, zIndex: 1 },
      icon: LineChart
    },
    
    // Row 1 Right: News (tall to show more content)
    {
      id: 'news',
      title: 'News',
      component: NewsWindow,
      isMinimized: false,
      isMaximized: false,
      position: { x: 950, y: 10, width: 380, height: 280, zIndex: 1 },
      icon: FileText
    },
    
    // Row 2: Support windows - wider layout
    {
      id: 'portfolio',
      title: 'Portfolio',
      component: PortfolioWindow,
      isMinimized: false,
      isMaximized: false,
      position: { x: 10, y: 300, width: 320, height: 140, zIndex: 1 },
      icon: DollarSign
    },
    {
      id: 'buying-power',
      title: 'Buying Power',
      component: BuyingPowerWindow,
      isMinimized: false,
      isMaximized: false,
      position: { x: 340, y: 300, width: 300, height: 140, zIndex: 1 },
      icon: Activity
    },
    {
      id: 'market-watch',
      title: 'Market Watch',
      component: MarketWatchWindow,
      isMinimized: false,
      isMaximized: false,
      position: { x: 650, y: 300, width: 340, height: 140, zIndex: 1 },
      icon: BarChart3
    },
    {
      id: 'order-log',
      title: 'Order Log',
      component: OrderLogWindow,
      isMinimized: false,
      isMaximized: false,
      position: { x: 1000, y: 300, width: 330, height: 140, zIndex: 1 },
      icon: FileText
    },
    
    // Row 3: Bottom utility windows
    {
      id: 'risk-management',
      title: 'Risk Management',
      component: RiskManagementWindow,
      isMinimized: false,
      isMaximized: false,
      position: { x: 10, y: 450, width: 320, height: 120, zIndex: 1 },
      icon: Shield
    },
    {
      id: 'auction',
      title: 'Market Making Auction',
      component: AuctionWindow,
      isMinimized: false,
      isMaximized: false,
      position: { x: 340, y: 450, width: 320, height: 120, zIndex: 1 },
      icon: Zap
    },
    {
      id: 'theme-control',
      title: 'Theme Settings',
      component: (props: any) => <ThemeControlWindow {...props} onThemeChange={setCurrentTheme} />,
      isMinimized: false,
      isMaximized: false,
      position: { x: 670, y: 450, width: 320, height: 120, zIndex: 1 },
      icon: Palette
    }
  ]);

  const [nextZIndex, setNextZIndex] = useState(10);
  const dragRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  const bringToFront = useCallback((windowId: string) => {
    setWindows(prev => prev.map(window => ({
      ...window,
      position: {
        ...window.position,
        zIndex: window.id === windowId ? nextZIndex : window.position.zIndex
      }
    })));
    setNextZIndex(prev => prev + 1);
  }, [nextZIndex]);

  const toggleMinimize = useCallback((windowId: string) => {
    setWindows(prev => prev.map(window => 
      window.id === windowId 
        ? { ...window, isMinimized: !window.isMinimized }
        : window
    ));
  }, []);

  const toggleMaximize = useCallback((windowId: string) => {
    setWindows(prev => prev.map(window => 
      window.id === windowId 
        ? { ...window, isMaximized: !window.isMaximized }
        : window
    ));
  }, []);

  const closeWindow = useCallback((windowId: string) => {
    setWindows(prev => prev.filter(window => window.id !== windowId));
  }, []);

  const theme = TRADING_THEMES[currentTheme];
  
  return (
    <div className={`h-screen w-screen ${theme.background} relative overflow-hidden`}>
      {/* Trading Windows */}
      {windows.map((window) => {
        const WindowComponent = window.component;
        const isMaximized = window.isMaximized;
        const isMinimized = window.isMinimized;
        
        const windowStyle = isMaximized 
          ? { top: 0, left: 0, width: '100%', height: '100%', zIndex: window.position.zIndex }
          : { 
              top: window.position.y, 
              left: window.position.x, 
              width: window.position.width, 
              height: window.position.height,
              zIndex: window.position.zIndex
            };

        return (
          <div
            key={window.id}
            className={`absolute border-2 border-gray-600 bg-white shadow-2xl ${isMinimized ? 'hidden' : ''}`}
            style={windowStyle}
            onClick={() => bringToFront(window.id)}
          >
            {/* Window Title Bar */}
            <div 
              className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-3 py-2 flex items-center justify-between cursor-move"
              ref={el => { dragRefs.current[window.id] = el; }}
            >
              <div className="flex items-center gap-2">
                {window.icon && <window.icon size={16} />}
                <span className="font-semibold text-sm">{window.title}</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleMinimize(window.id);
                  }}
                  className="hover:bg-blue-500 p-1 rounded"
                >
                  <Minimize2 size={14} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleMaximize(window.id);
                  }}
                  className="hover:bg-blue-500 p-1 rounded"
                >
                  <Maximize2 size={14} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    closeWindow(window.id);
                  }}
                  className="hover:bg-red-500 p-1 rounded"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* Window Content */}
            <div className="h-full pb-8">
              <WindowComponent windowId={window.id} theme={theme} {...window.props} />
            </div>
          </div>
        );
      })}

      {/* Taskbar */}
      <div className="absolute bottom-0 left-0 right-0 bg-gray-700 border-t-2 border-gray-600 h-12 flex items-center px-4">
        <div className="flex items-center gap-2">
          <div className="bg-blue-600 text-white px-3 py-1 rounded text-sm font-semibold">
            upTick Client v. 2.0
          </div>
          <div className="text-white text-sm">
            15:07
          </div>
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          {windows.filter(w => w.isMinimized).map(window => (
            <button
              key={window.id}
              onClick={() => toggleMinimize(window.id)}
              className="bg-gray-600 hover:bg-gray-500 text-white px-3 py-1 rounded text-sm flex items-center gap-1"
            >
              {window.icon && <window.icon size={14} />}
              {window.title}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}