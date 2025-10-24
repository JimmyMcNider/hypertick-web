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
    <div className={`h-full ${currentTheme.background} ${currentTheme.text} font-mono text-sm overflow-hidden`}>
      <div className={`grid grid-cols-7 gap-1 p-2 border-b ${currentTheme.border} ${currentTheme.header}`}>
        <div className="font-bold">Security</div>
        <div className="font-bold text-right">Quantity</div>
        <div className="font-bold text-right">Avg Price</div>
        <div className="font-bold text-right">Last Price</div>
        <div className="font-bold text-right">Value</div>
        <div className="font-bold text-right">% Assets</div>
        <div className="font-bold text-right">Gain</div>
      </div>
      <div className="p-2 space-y-1">
        <div className="grid grid-cols-7 gap-1 hover:bg-gray-800">
          <div>USD</div>
          <div className="text-right">1,003,950</div>
          <div className="text-right">1.00</div>
          <div className="text-right">1.00</div>
          <div className={`text-right ${currentTheme.positive}`}>1,003,950</div>
          <div className="text-right">100.0%</div>
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
  return (
    <div className={`h-full ${currentTheme.background} ${currentTheme.text} font-mono text-sm overflow-hidden`}>
      <div className={`grid grid-cols-6 gap-1 p-2 border-b ${currentTheme.border} ${currentTheme.header}`}>
      <div className="font-bold">Symbol</div>
      <div className="font-bold text-right">Last</div>
      <div className="font-bold text-right">Bid</div>
      <div className="font-bold text-right">Ask</div>
      <div className="font-bold text-right">Volume</div>
      <div className="font-bold text-right">Change</div>
    </div>
    <div className="p-2 space-y-1">
      <div className="grid grid-cols-6 gap-1 hover:bg-gray-800 cursor-pointer">
        <div className="text-cyan-400">USGOV_3mo</div>
        <div className="text-right">5.00%</div>
        <div className="text-right text-green-400">135.73</div>
        <div className="text-right text-red-400">135.73</div>
        <div className="text-right">170,413</div>
        <div className="text-right text-green-400">+0.5%</div>
      </div>
      <div className="grid grid-cols-6 gap-1 hover:bg-gray-800 cursor-pointer">
        <div className="text-cyan-400">SP500</div>
        <div className="text-right">152.47</div>
        <div className="text-right text-green-400">155.30</div>
        <div className="text-right text-red-400">69.69</div>
        <div className="text-right">294,078</div>
        <div className="text-right text-red-400">-15%</div>
      </div>
      <div className="grid grid-cols-6 gap-1 hover:bg-gray-800 cursor-pointer">
        <div className="text-cyan-400">PNR</div>
        <div className="text-right">135.73</div>
        <div className="text-right text-green-400">155.30</div>
        <div className="text-right text-red-400">135.73</div>
        <div className="text-right">170,413</div>
        <div className="text-right text-green-400">+1.0%</div>
      </div>
      <div className="grid grid-cols-6 gap-1 hover:bg-gray-800 cursor-pointer">
        <div className="text-cyan-400">VGR</div>
        <div className="text-right">69.69</div>
        <div className="text-right text-green-400">69.70</div>
        <div className="text-right text-red-400">69.69</div>
        <div className="text-right">294,078</div>
        <div className="text-right text-red-400">-0.5%</div>
      </div>
    </div>
    </div>
  );
};

const BuyingPowerWindow = ({ windowId }: { windowId: string }) => (
  <div className="h-full bg-black text-green-400 font-mono text-sm p-4 overflow-hidden">
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-4">
        <div className="text-cyan-400">Initial</div>
        <div className="text-right">Maintenance</div>
        <div className="text-right">Minimum</div>
      </div>
      <div className="grid grid-cols-3 gap-4 text-white">
        <div>1,003,950</div>
        <div className="text-right">1,003,950</div>
        <div className="text-right">1,003,950</div>
      </div>
      <div className="border-t border-green-400 pt-3">
        <div className="grid grid-cols-2 gap-4">
          <div className="text-cyan-400">Actual</div>
          <div className="text-right text-white">0</div>
        </div>
        <div className="grid grid-cols-2 gap-4 mt-2">
          <div className="text-cyan-400">Reserved</div>
          <div className="text-right text-white">0</div>
        </div>
        <div className="grid grid-cols-2 gap-4 mt-2">
          <div className="text-cyan-400">Available (Stock)</div>
          <div className="text-right text-white">1,003,950</div>
        </div>
        <div className="grid grid-cols-2 gap-4 mt-2">
          <div className="text-cyan-400">Buying Power</div>
          <div className="text-right text-white">2,007,900</div>
        </div>
      </div>
      <div className="bg-green-600 text-black text-center py-2 mt-4 font-bold">
        Account Status - Positive Buying Power
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

const MarketGraphWindow = ({ windowId }: { windowId: string }) => (
  <div className="h-full bg-black text-green-400 font-mono text-sm overflow-hidden">
    <div className="p-2 border-b border-green-400 bg-gray-900">
      <div className="flex justify-between items-center">
        <div className="font-bold">PNR - Real Time Chart</div>
        <div className="text-xs">Last: $135.73</div>
      </div>
    </div>
    <div className="relative h-full p-2">
      {/* Simulated price chart using ASCII-style representation */}
      <div className="h-full flex flex-col justify-end">
        <div className="h-full relative">
          {/* Chart grid */}
          <div className="absolute inset-0 grid grid-cols-10 grid-rows-10 border-r border-b border-green-800">
            {Array.from({ length: 100 }).map((_, i) => (
              <div key={i} className="border-l border-t border-green-800 opacity-30"></div>
            ))}
          </div>
          {/* Price line simulation */}
          <svg className="absolute inset-0 w-full h-full">
            <polyline
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              points="0,80 50,60 100,70 150,50 200,65 250,45 300,55 350,40 400,50"
              className="text-green-400"
            />
          </svg>
        </div>
        <div className="text-xs text-gray-400 mt-2 grid grid-cols-5">
          <div>9:30</div>
          <div>10:00</div>
          <div>10:30</div>
          <div>11:00</div>
          <div>11:30</div>
        </div>
      </div>
    </div>
  </div>
);

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

const AuctionWindow = ({ windowId }: { windowId: string }) => (
  <div className="h-full bg-purple-900 text-purple-100 text-sm overflow-auto">
    <div className="p-2 border-b border-purple-400 bg-purple-800 font-bold">
      Market Making Auction
    </div>
    <div className="p-2 space-y-3">
      <div className="text-center text-yellow-300 font-bold">
        AUCTION: Market Making Rights for PNR
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="text-xs text-purple-200">Current High Bid:</div>
          <div className="text-lg font-bold text-yellow-300">$2,500</div>
        </div>
        <div>
          <div className="text-xs text-purple-200">Time Remaining:</div>
          <div className="text-lg font-bold text-red-300">45s</div>
        </div>
      </div>
      <div className="space-y-2">
        <div className="text-xs font-bold">Bid History:</div>
        <div className="text-xs space-y-1 bg-purple-800 p-2 rounded">
          <div>Trader_3: $2,500</div>
          <div>Trader_1: $2,250</div>
          <div>Trader_5: $2,000</div>
        </div>
      </div>
      <div className="mt-4">
        <input type="number" placeholder="Enter bid amount" className="w-full p-2 text-black rounded mb-2" />
        <Button className="w-full bg-yellow-600 hover:bg-yellow-700 text-black font-bold">
          PLACE BID
        </Button>
      </div>
    </div>
  </div>
);

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
    // Top row - 3 windows
    {
      id: 'portfolio',
      title: 'Portfolio',
      component: PortfolioWindow,
      isMinimized: false,
      isMaximized: false,
      position: { x: 10, y: 10, width: 380, height: 250, zIndex: 1 },
      icon: DollarSign
    },
    {
      id: 'buying-power',
      title: 'Buying Power',
      component: BuyingPowerWindow,
      isMinimized: false,
      isMaximized: false,
      position: { x: 400, y: 10, width: 320, height: 250, zIndex: 1 },
      icon: Activity
    },
    {
      id: 'news',
      title: 'News',
      component: NewsWindow,
      isMinimized: false,
      isMaximized: false,
      position: { x: 730, y: 10, width: 410, height: 250, zIndex: 1 },
      icon: FileText
    },
    
    // Middle row - 3 windows  
    {
      id: 'market-watch',
      title: 'Market Watch',
      component: MarketWatchWindow,
      isMinimized: false,
      isMaximized: false,
      position: { x: 10, y: 270, width: 380, height: 200, zIndex: 1 },
      icon: BarChart3
    },
    {
      id: 'market-order',
      title: 'Market Order Window',
      component: MarketOrderWindow,
      isMinimized: false,
      isMaximized: false,
      position: { x: 400, y: 270, width: 320, height: 200, zIndex: 1 },
      icon: TrendingUp
    },
    {
      id: 'market-graph',
      title: 'Market Graph',
      component: MarketGraphWindow,
      isMinimized: false,
      isMaximized: false,
      position: { x: 730, y: 270, width: 410, height: 200, zIndex: 1 },
      icon: LineChart
    },
    
    // Bottom row - 4 windows
    {
      id: 'order-log',
      title: 'Order Log',
      component: OrderLogWindow,
      isMinimized: false,
      isMaximized: false,
      position: { x: 10, y: 480, width: 270, height: 180, zIndex: 1 },
      icon: FileText
    },
    {
      id: 'risk-management',
      title: 'Risk Management',
      component: RiskManagementWindow,
      isMinimized: false,
      isMaximized: false,
      position: { x: 290, y: 480, width: 270, height: 180, zIndex: 1 },
      icon: Shield
    },
    {
      id: 'auction',
      title: 'Market Making Auction',
      component: AuctionWindow,
      isMinimized: false,
      isMaximized: false,
      position: { x: 570, y: 480, width: 270, height: 180, zIndex: 1 },
      icon: Zap
    },
    {
      id: 'theme-control',
      title: 'Theme Settings',
      component: (props: any) => <ThemeControlWindow {...props} onThemeChange={setCurrentTheme} />,
      isMinimized: false,
      isMaximized: false,
      position: { x: 850, y: 480, width: 290, height: 180, zIndex: 1 },
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