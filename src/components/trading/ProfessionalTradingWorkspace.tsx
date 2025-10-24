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
  TrendingUp
} from 'lucide-react';

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
const PortfolioWindow = ({ windowId }: { windowId: string }) => (
  <div className="h-full bg-black text-green-400 font-mono text-sm overflow-hidden">
    <div className="grid grid-cols-7 gap-1 p-2 border-b border-green-400 bg-gray-900">
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
        <div className="text-right text-green-400">1,003,950</div>
        <div className="text-right">100.0%</div>
        <div className="text-right">0</div>
      </div>
      <div className="border-t border-green-400 pt-2 mt-2">
        <div className="text-green-400 font-bold">Equity Value: 1,003,950</div>
      </div>
    </div>
  </div>
);

const MarketWatchWindow = ({ windowId }: { windowId: string }) => (
  <div className="h-full bg-black text-green-400 font-mono text-sm overflow-hidden">
    <div className="grid grid-cols-6 gap-1 p-2 border-b border-green-400 bg-gray-900">
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

export default function ProfessionalTradingWorkspace({ 
  sessionId, 
  userId, 
  userRole 
}: ProfessionalTradingWorkspaceProps) {
  const [windows, setWindows] = useState<TradingWindow[]>([
    {
      id: 'portfolio',
      title: 'Portfolio',
      component: PortfolioWindow,
      isMinimized: false,
      isMaximized: false,
      position: { x: 10, y: 10, width: 400, height: 300, zIndex: 1 },
      icon: DollarSign
    },
    {
      id: 'buying-power',
      title: 'Buying Power',
      component: BuyingPowerWindow,
      isMinimized: false,
      isMaximized: false,
      position: { x: 420, y: 10, width: 300, height: 400, zIndex: 1 },
      icon: Activity
    },
    {
      id: 'market-watch',
      title: 'Market Watch',
      component: MarketWatchWindow,
      isMinimized: false,
      isMaximized: false,
      position: { x: 10, y: 320, width: 500, height: 250, zIndex: 1 },
      icon: BarChart3
    },
    {
      id: 'news',
      title: 'News',
      component: NewsWindow,
      isMinimized: false,
      isMaximized: false,
      position: { x: 730, y: 10, width: 450, height: 300, zIndex: 1 },
      icon: FileText
    },
    {
      id: 'market-order',
      title: 'Market Order Window',
      component: MarketOrderWindow,
      isMinimized: false,
      isMaximized: false,
      position: { x: 520, y: 320, width: 350, height: 300, zIndex: 1 },
      icon: TrendingUp
    },
    {
      id: 'order-log',
      title: 'Order Log',
      component: OrderLogWindow,
      isMinimized: false,
      isMaximized: false,
      position: { x: 880, y: 320, width: 400, height: 250, zIndex: 1 },
      icon: FileText
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

  return (
    <div className="h-screen w-screen bg-gray-800 relative overflow-hidden">
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
              <WindowComponent windowId={window.id} {...window.props} />
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