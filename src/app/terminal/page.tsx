/**
 * Bloomberg-Style Trading Terminal Interface
 * 
 * Recreates the sophisticated multi-window trading environment
 * with all 35+ privilege-controlled features from legacy upTick
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { io, Socket } from 'socket.io-client';

// Trading Window Components
import MarketDataPanel from '@/components/terminal/MarketDataPanel';
import OrderEntryPanel from '@/components/terminal/OrderEntryPanel';
import PortfolioPanel from '@/components/terminal/PortfolioPanel';
import OrderBookPanel from '@/components/terminal/OrderBookPanel';
import TradeBlotterPanel from '@/components/terminal/TradeBlotterPanel';
import NewsPanel from '@/components/terminal/NewsPanel';
import AnalysisPanel from '@/components/terminal/AnalysisPanel';
import InstructorPanel from '@/components/terminal/InstructorPanel';
import ChartPanel from '@/components/terminal/ChartPanel';
import AuctionPanel from '@/components/terminal/AuctionPanel';
import RiskPanel from '@/components/terminal/RiskPanel';
import OptionsPanel from '@/components/terminal/OptionsPanel';
import CommoditiesPanel from '@/components/terminal/CommoditiesPanel';
import LiquidityPanel from '@/components/terminal/LiquidityPanel';

interface User {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  role: 'STUDENT' | 'INSTRUCTOR' | 'ADMIN';
  privileges?: number[];
}

interface SessionState {
  id: string;
  status: string;
  participants: any[];
  marketState: {
    isOpen: boolean;
    liquidityActive: boolean;
    currentPrice?: number;
    volume: number;
  };
}

interface TradingWindow {
  id: string;
  privilegeCode: number;
  title: string;
  component: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  isVisible: boolean;
  isMinimized: boolean;
  zIndex: number;
}

export default function TradingTerminal() {
  const [user, setUser] = useState<User | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [sessionState, setSessionState] = useState<SessionState | null>(null);
  const [windows, setWindows] = useState<TradingWindow[]>([]);
  const [maxZIndex, setMaxZIndex] = useState(1000);
  const [loading, setLoading] = useState(true);
  const [dragState, setDragState] = useState<{
    isDragging: boolean;
    windowId: string | null;
    startX: number;
    startY: number;
    initialX: number;
    initialY: number;
  }>({
    isDragging: false,
    windowId: null,
    startX: 0,
    startY: 0,
    initialX: 0,
    initialY: 0
  });
  const router = useRouter();

  // Default window configurations optimized for viewport constraints and full content visibility
  const defaultWindows: Omit<TradingWindow, 'id' | 'zIndex'>[] = [
    { privilegeCode: 9, title: 'Market Data - Montage', component: 'MarketDataPanel', position: { x: 20, y: 100 }, size: { width: 380, height: 320 }, isVisible: false, isMinimized: false },
    { privilegeCode: 8, title: 'Order Entry', component: 'OrderEntryPanel', position: { x: 420, y: 100 }, size: { width: 350, height: 400 }, isVisible: false, isMinimized: false },
    { privilegeCode: 13, title: 'Portfolio', component: 'PortfolioPanel', position: { x: 790, y: 100 }, size: { width: 400, height: 350 }, isVisible: false, isMinimized: false },
    { privilegeCode: 15, title: 'Order Book - Level II', component: 'OrderBookPanel', position: { x: 20, y: 370 }, size: { width: 350, height: 280 }, isVisible: false, isMinimized: false },
    { privilegeCode: 12, title: 'Order Log', component: 'TradeBlotterPanel', position: { x: 390, y: 470 }, size: { width: 520, height: 160 }, isVisible: false, isMinimized: false },
    { privilegeCode: 11, title: 'News & Events', component: 'NewsPanel', position: { x: 930, y: 400 }, size: { width: 260, height: 220 }, isVisible: false, isMinimized: false },
    { privilegeCode: 1, title: 'Market Analysis', component: 'AnalysisPanel', position: { x: 20, y: 670 }, size: { width: 450, height: 160 }, isVisible: false, isMinimized: false },
    { privilegeCode: 35, title: 'Instructor Controls', component: 'InstructorPanel', position: { x: 1130, y: 100 }, size: { width: 240, height: 280 }, isVisible: false, isMinimized: false },
    { privilegeCode: 3, title: 'Price Charts', component: 'ChartPanel', position: { x: 490, y: 650 }, size: { width: 420, height: 180 }, isVisible: false, isMinimized: false },
    { privilegeCode: 33, title: 'Market Making Auctions', component: 'AuctionPanel', position: { x: 930, y: 640 }, size: { width: 320, height: 190 }, isVisible: false, isMinimized: false },
    { privilegeCode: 14, title: 'Risk Management', component: 'RiskPanel', position: { x: 730, y: 400 }, size: { width: 180, height: 220 }, isVisible: false, isMinimized: false },
    { privilegeCode: 17, title: 'Options Trading', component: 'OptionsPanel', position: { x: 390, y: 280 }, size: { width: 320, height: 180 }, isVisible: false, isMinimized: false },
    { privilegeCode: 18, title: 'Commodities & Futures', component: 'CommoditiesPanel', position: { x: 20, y: 280 }, size: { width: 350, height: 80 }, isVisible: false, isMinimized: false },
    { privilegeCode: 20, title: 'Liquidity Provision', component: 'LiquidityPanel', position: { x: 730, y: 640 }, size: { width: 180, height: 190 }, isVisible: false, isMinimized: false },
  ];

  useEffect(() => {
    initializeTerminal();
    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, []);

  const initializeTerminal = async () => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      router.push('/');
      return;
    }

    try {
      // Get current user
      const userResponse = await fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!userResponse.ok) {
        throw new Error('Authentication failed');
      }

      const userData = await userResponse.json();
      setUser(userData.user);

      // Get user privileges (this would come from active session)
      const privilegeResponse = await fetch('/api/privileges', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      let userPrivileges: number[] = [];
      if (privilegeResponse.ok) {
        const privilegeData = await privilegeResponse.json();
        userPrivileges = privilegeData.userPrivileges || [];
      }

      // For demo, grant all privileges to instructors, basic to students
      if (userData.user.role === 'INSTRUCTOR' || userData.user.role === 'ADMIN') {
        userPrivileges = [1, 8, 9, 11, 12, 13, 15, 35]; // All major windows
      } else {
        userPrivileges = [1, 8, 9, 13, 15]; // Basic student windows including Market Data
      }

      // Initialize windows based on privileges - start with only essential windows visible
      const initialWindows = defaultWindows
        .filter(w => userPrivileges.includes(w.privilegeCode))
        .map((w, index) => ({
          ...w,
          id: `window-${w.privilegeCode}`,
          isVisible: [9, 8, 13].includes(w.privilegeCode), // Only show Market Data, Order Entry, and Portfolio initially
          zIndex: 1000 + index
        }));

      setWindows(initialWindows);

      // Initialize WebSocket connection
      const socketInstance = io();
      socketInstance.emit('authenticate', { token });
      
      socketInstance.on('authenticated', (data) => {
        console.log('WebSocket authenticated:', data);
      });

      socketInstance.on('session_state', (state: SessionState) => {
        setSessionState(state);
      });

      socketInstance.on('market_data', (data) => {
        // Handle real-time market data updates
        console.log('Market data:', data);
      });

      setSocket(socketInstance);

    } catch (error: any) {
      console.error('Terminal initialization error:', error);
      router.push('/');
    } finally {
      setLoading(false);
    }
  };

  const bringToFront = (windowId: string) => {
    const newZIndex = maxZIndex + 1;
    setMaxZIndex(newZIndex);
    setWindows(prev => prev.map(w => 
      w.id === windowId ? { ...w, zIndex: newZIndex } : w
    ));
  };

  const toggleWindow = (windowId: string) => {
    setWindows(prev => prev.map(w => 
      w.id === windowId ? { ...w, isVisible: !w.isVisible } : w
    ));
  };

  const minimizeWindow = (windowId: string) => {
    setWindows(prev => prev.map(w => 
      w.id === windowId ? { ...w, isMinimized: !w.isMinimized } : w
    ));
  };

  const closeWindow = (windowId: string) => {
    setWindows(prev => prev.map(w => 
      w.id === windowId ? { ...w, isVisible: false } : w
    ));
  };

  const moveWindow = (windowId: string, newPosition: { x: number; y: number }) => {
    setWindows(prev => prev.map(w => 
      w.id === windowId ? { ...w, position: newPosition } : w
    ));
  };

  const resizeWindow = (windowId: string, newSize: { width: number; height: number }) => {
    setWindows(prev => prev.map(w => 
      w.id === windowId ? { ...w, size: newSize } : w
    ));
  };

  const handleMouseDown = (e: React.MouseEvent, windowId: string) => {
    const window = windows.find(w => w.id === windowId);
    if (!window) return;

    bringToFront(windowId);
    
    setDragState({
      isDragging: true,
      windowId,
      startX: e.clientX,
      startY: e.clientY,
      initialX: window.position.x,
      initialY: window.position.y
    });

    e.preventDefault();
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragState.isDragging || !dragState.windowId) return;

    const deltaX = e.clientX - dragState.startX;
    const deltaY = e.clientY - dragState.startY;

    const newX = Math.max(0, dragState.initialX + deltaX);
    const newY = Math.max(60, dragState.initialY + deltaY); // Account for header

    moveWindow(dragState.windowId, { x: newX, y: newY });
  };

  const handleMouseUp = () => {
    setDragState({
      isDragging: false,
      windowId: null,
      startX: 0,
      startY: 0,
      initialX: 0,
      initialY: 0
    });
  };

  const renderWindow = (window: TradingWindow) => {
    if (!window.isVisible) return null;

    const WindowComponent = getWindowComponent(window.component);
    
    return (
      <div
        key={window.id}
        className={`absolute bg-gray-900 border border-gray-600 rounded-md shadow-lg ${
          window.isMinimized ? 'h-8' : ''
        }`}
        style={{
          left: window.position.x,
          top: window.position.y,
          width: window.size.width,
          height: window.isMinimized ? 32 : window.size.height,
          zIndex: window.zIndex,
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
        }}
        onMouseDown={() => bringToFront(window.id)}
      >
        {/* Window Header */}
        <div 
          className="bg-blue-900 text-white px-3 py-1 text-sm font-medium flex justify-between items-center cursor-move select-none"
          onMouseDown={(e) => handleMouseDown(e, window.id)}
        >
          <span>{window.title}</span>
          <div className="flex space-x-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                minimizeWindow(window.id);
              }}
              className="w-4 h-4 bg-yellow-500 rounded-full hover:bg-yellow-400"
            />
            <button
              onClick={(e) => {
                e.stopPropagation();
                closeWindow(window.id);
              }}
              className="w-4 h-4 bg-red-500 rounded-full hover:bg-red-400"
            />
          </div>
        </div>
        
        {/* Window Content */}
        {!window.isMinimized && (
          <div 
            className="bg-black text-green-400 font-mono text-sm overflow-auto"
            style={{ height: window.size.height - 32 }} // Subtract header height
          >
            <WindowComponent 
              user={user}
              sessionState={sessionState}
              socket={socket}
            />
          </div>
        )}
      </div>
    );
  };

  const getWindowComponent = (componentName: string) => {
    const components: { [key: string]: any } = {
      MarketDataPanel,
      OrderEntryPanel,
      PortfolioPanel,
      OrderBookPanel,
      TradeBlotterPanel,
      NewsPanel,
      AnalysisPanel,
      InstructorPanel,
      ChartPanel,
      AuctionPanel,
      RiskPanel,
      OptionsPanel,
      CommoditiesPanel,
      LiquidityPanel
    };
    return components[componentName] || (() => <div>Window not implemented</div>);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-green-400 font-mono text-xl">
          INITIALIZING TRADING TERMINAL...
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-black text-green-400 font-mono overflow-hidden relative">
      {/* Bloomberg-style Header Bar */}
      <div className="bg-orange-600 text-black px-4 py-1 flex justify-between items-center text-sm font-bold">
        <div className="flex items-center space-x-6">
          <span className="text-lg">HYPERTICK TERMINAL</span>
          <span>USER: {user?.username?.toUpperCase()}</span>
          <span>ROLE: {user?.role}</span>
          {sessionState && (
            <span className="flex items-center">
              MARKET: 
              <span className={`ml-1 ${sessionState.marketState.isOpen ? 'text-green-900' : 'text-red-900'}`}>
                {sessionState.marketState.isOpen ? 'OPEN' : 'CLOSED'}
              </span>
            </span>
          )}
        </div>
        <div className="flex items-center space-x-4">
          <span>{new Date().toLocaleTimeString()}</span>
          <button
            onClick={() => router.push('/dashboard')}
            className="bg-black text-orange-400 px-2 py-1 rounded text-xs hover:bg-gray-800"
          >
            DASHBOARD
          </button>
        </div>
      </div>

      {/* Window Toggle Bar */}
      <div className="bg-gray-800 border-b border-gray-700 px-4 py-2 flex space-x-2 text-xs">
        {defaultWindows.map((window) => {
          const hasPrivilege = user?.privileges?.includes(window.privilegeCode) || 
                             user?.role === 'INSTRUCTOR' || user?.role === 'ADMIN';
          const isVisible = windows.find(w => w.privilegeCode === window.privilegeCode)?.isVisible;
          
          return (
            <button
              key={window.privilegeCode}
              onClick={() => toggleWindow(`window-${window.privilegeCode}`)}
              disabled={!hasPrivilege}
              className={`px-3 py-1 rounded text-xs border transition-colors ${
                hasPrivilege
                  ? isVisible
                    ? 'bg-blue-600 border-blue-500 text-white'
                    : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'
                  : 'bg-gray-900 border-gray-800 text-gray-600 cursor-not-allowed'
              }`}
            >
              {window.title.toUpperCase()}
            </button>
          );
        })}
      </div>

      {/* Trading Windows */}
      <div 
        className="relative h-full overflow-auto" 
        style={{ minHeight: 'calc(100vh - 120px)' }}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {windows.map(renderWindow)}
      </div>

      {/* Status Bar */}
      <div className="absolute bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-700 px-4 py-1 flex justify-between items-center text-xs">
        <div className="flex space-x-4">
          <span>WINDOWS: {windows.filter(w => w.isVisible).length}</span>
          <span>SESSION: {sessionState?.id || 'NONE'}</span>
          <span>STATUS: {sessionState?.status || 'DISCONNECTED'}</span>
        </div>
        <div className="flex space-x-4">
          <span>WS: {socket?.connected ? 'CONNECTED' : 'DISCONNECTED'}</span>
          <span>TIME: {new Date().toLocaleTimeString()}</span>
        </div>
      </div>
    </div>
  );
}