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
import SimpleTradingTerminal from '@/components/trading/SimpleTradingTerminal';
import ProfessionalTradingWorkspace from '@/components/trading/ProfessionalTradingWorkspace';
import MarketDataPanel from '@/components/terminal/MarketDataPanel';
import OrderEntryPanel from '@/components/terminal/OrderEntryPanel';
import PortfolioPanel from '@/components/terminal/PortfolioPanel';
import OrderBookPanel from '@/components/terminal/OrderBookPanel';
import TradeBlotterPanel from '@/components/terminal/TradeBlotterPanel';
import NewsPanel from '@/components/terminal/NewsPanel';
import AnalysisPanel from '@/components/terminal/AnalysisPanel';
import InstructorPanel from '@/components/terminal/InstructorPanel';
import ChartPanel from '@/components/terminal/ChartPanel';
import RiskPanel from '@/components/terminal/RiskPanel';
import AuctionPanel from '@/components/terminal/AuctionPanel';
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

interface SimulationData {
  sessionId: string;
  lessonId: string;
  lessonName: string;
  lesson: any;
  privileges: number[];
  marketConfig: any;
  scenarios: any[];
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
  const [simulationData, setSimulationData] = useState<SimulationData | null>(null);
  const [windows, setWindows] = useState<TradingWindow[]>([]);
  const [maxZIndex, setMaxZIndex] = useState(1000);
  const [loading, setLoading] = useState(true);
  const [currentTheme, setCurrentTheme] = useState<'classic' | 'professional' | 'highContrast' | 'cyberpunk' | 'retro'>('classic');
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

  // Get URL parameters for session and lesson data
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('session');
    const lessonId = urlParams.get('lesson');
    
    if (sessionId && lessonId) {
      console.log('Loading real simulation data:', { sessionId, lessonId });
      loadSimulationData(sessionId, lessonId);
    }
  }, []);

  const loadSimulationData = async (sessionId: string, lessonId: string) => {
    const token = localStorage.getItem('auth_token');
    if (!token) return;

    try {
      // Load session data
      const sessionResponse = await fetch(`/api/sessions/${sessionId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (sessionResponse.ok) {
        const sessionData = await sessionResponse.json();
        console.log('✅ Session data loaded:', sessionData);
        setSessionState(sessionData.session);
      }

      // Load lesson data with XML configuration
      const lessonResponse = await fetch(`/api/lessons/${lessonId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (lessonResponse.ok) {
        const lessonData = await lessonResponse.json();
        console.log('✅ Lesson data loaded:', lessonData);
        
        // Extract privilege grants from lesson XML
        const privileges = lessonData.lesson.privilegeGrants?.map((grant: any) => grant.privilegeCode) || [];
        console.log('📋 User privileges for this simulation:', privileges);

        const simData: SimulationData = {
          sessionId,
          lessonId,
          lessonName: lessonData.lesson.name,
          lesson: lessonData.lesson,
          privileges,
          marketConfig: lessonData.lesson.marketConfig || {},
          scenarios: lessonData.lesson.scenarios || []
        };

        setSimulationData(simData);
        
        // Update user privileges for this session
        if (user) {
          setUser({ ...user, privileges });
        }
      }
    } catch (error) {
      console.error('❌ Failed to load simulation data:', error);
    }
  };

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

      // Use real simulation privileges if available, otherwise demo data
      if (simulationData?.privileges?.length) {
        userPrivileges = simulationData.privileges;
        console.log('🎯 Using real simulation privileges:', userPrivileges);
      } else {
        // Fallback for demo, grant all privileges to instructors, basic to students
        if (userData.user.role === 'INSTRUCTOR' || userData.user.role === 'ADMIN') {
          userPrivileges = [1, 8, 9, 11, 12, 13, 15, 35]; // All major windows
        } else {
          userPrivileges = [1, 8, 9, 13, 15]; // Basic student windows including Market Data
        }
        console.log('🔄 Using fallback privileges:', userPrivileges);
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
        
        // Join session if we have sessionId and user data
        const urlParams = new URLSearchParams(window.location.search);
        const sessionId = urlParams.get('session');
        if (sessionId && userData) {
          console.log(`🔗 Joining WebSocket session: ${sessionId}`);
          socketInstance.emit('join_session', {
            sessionId,
            userId: userData.id,
            role: userData.role === 'INSTRUCTOR' ? 'Instructor' : 'Student'
          });
        }
      });

      socketInstance.on('session_joined', (data: { sessionId: string; message: string }) => {
        console.log('✅ Joined session successfully:', data);
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

  const token = localStorage.getItem('auth_token') || '';

  return (
    <div className="h-screen bg-gray-900 overflow-hidden">
      {/* Header */}
      <div className="bg-orange-600 text-black px-4 py-2 flex justify-between items-center text-sm font-bold">
        <div className="flex items-center space-x-6">
          <span className="text-lg">HYPERTICK TERMINAL</span>
          <span>USER: {user?.username?.toUpperCase()}</span>
          <span>ROLE: {user?.role}</span>
          {simulationData && (
            <span className="text-yellow-300 font-bold">
              SIMULATION: {simulationData.lessonName}
            </span>
          )}
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
          
          {/* Theme Selector */}
          <div className="flex items-center space-x-2">
            <span className="text-xs">THEME:</span>
            <select
              value={currentTheme}
              onChange={(e) => setCurrentTheme(e.target.value as 'classic' | 'professional' | 'highContrast' | 'cyberpunk' | 'retro')}
              className="bg-black text-orange-400 px-2 py-1 rounded text-xs border border-orange-600 hover:bg-gray-800"
            >
              <option value="classic">Matrix Green</option>
              <option value="professional">Arctic Blue</option>
              <option value="highContrast">Solar Flare</option>
              <option value="cyberpunk">Cyberpunk Pink</option>
              <option value="retro">Retro Amber</option>
            </select>
          </div>

          {/* Layout Controls */}
          <div className="flex items-center space-x-1">
            <span className="text-xs">LAYOUT:</span>
            <button
              onClick={() => {
                const layout = JSON.parse(localStorage.getItem('hypertick-layout') || '[]');
                if (layout.length > 0) {
                  window.location.reload();
                } else {
                  alert('No saved layout found');
                }
              }}
              className="bg-black text-orange-400 px-1 py-1 rounded text-xs border border-orange-600 hover:bg-gray-800"
              title="Load Saved Layout"
            >
              LOAD
            </button>
            <button
              onClick={() => {
                const event = new CustomEvent('saveLayout');
                window.dispatchEvent(event);
              }}
              className="bg-black text-orange-400 px-1 py-1 rounded text-xs border border-orange-600 hover:bg-gray-800"
              title="Save Current Layout"
            >
              SAVE
            </button>
            <button
              onClick={() => {
                if (confirm('Reset layout to default?')) {
                  localStorage.removeItem('hypertick-layout');
                  window.location.reload();
                }
              }}
              className="bg-black text-orange-400 px-1 py-1 rounded text-xs border border-orange-600 hover:bg-gray-800"
              title="Reset to Default Layout"
            >
              RESET
            </button>
          </div>
          
          <button
            onClick={() => router.push('/dashboard')}
            className="bg-black text-orange-400 px-2 py-1 rounded text-xs hover:bg-gray-800"
          >
            DASHBOARD
          </button>
        </div>
      </div>

      {/* Professional Trading Workspace */}
      <div className="h-[calc(100vh-50px)]">
        <ProfessionalTradingWorkspace
          sessionId={sessionState?.id || simulationData?.sessionId || 'demo-session'}
          userId={user?.id || ''}
          userRole={user?.role || 'STUDENT'}
          initialTheme={currentTheme}
          simulationData={simulationData}
        />
      </div>
    </div>
  );
}