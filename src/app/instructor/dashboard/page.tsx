/**
 * Instructor Activity Monitoring Dashboard
 * 
 * Real-time monitoring of student trading activity, positions, and performance
 * with market controls and session management capabilities.
 */

'use client';

import { useState, useEffect } from 'react';
import { getMarketConfig } from '@/lib/market-config';
import InstructorAlerts from '@/components/InstructorAlerts';
import LessonProgressionManager from '@/components/LessonProgressionManager';

interface StudentActivity {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  totalOrders: number;
  portfolioValue: number;
  unrealizedPnL: number;
  lastActivity: Date;
  currentPositions: Array<{
    symbol: string;
    quantity: number;
    avgPrice: number;
    currentPrice: number;
    unrealizedPnL: number;
  }>;
  recentOrders: Array<{
    id: string;
    symbol: string;
    side: 'BUY' | 'SELL';
    quantity: number;
    price: number;
    timestamp: Date;
    status: string;
  }>;
}

interface SessionMetrics {
  totalStudents: number;
  activeStudents: number;
  totalOrders: number;
  totalVolume: number;
  averagePortfolioValue: number;
  topPerformer: string;
  marketStatus: 'OPEN' | 'PAUSED' | 'CLOSED';
}

export default function InstructorDashboard() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [lessonId, setLessonId] = useState<string>('Price Formation');
  const [students, setStudents] = useState<StudentActivity[]>([]);
  const [metrics, setMetrics] = useState<SessionMetrics | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [marketControls, setMarketControls] = useState({
    volatility: 1.0,
    liquidity: 'NORMAL',
    eventTrigger: ''
  });
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [instructorId] = useState('cmhb0lby30010re59ge89u55h'); // Mock instructor ID
  const [sessionDuration, setSessionDuration] = useState(3600);

  // Market configuration for current lesson
  const marketConfig = getMarketConfig(lessonId);

  // Check for existing session on load
  useEffect(() => {
    checkForActiveSession();
  }, []);

  // Load session data
  useEffect(() => {
    if (sessionId) {
      loadSessionData();
      const interval = setInterval(loadSessionData, 2000); // Update every 2 seconds
      return () => clearInterval(interval);
    }
  }, [sessionId, lessonId]);

  const checkForActiveSession = async () => {
    try {
      const response = await fetch('/api/sessions/current');
      if (response.ok) {
        const data = await response.json();
        if (data.session) {
          setSessionId(data.session.id);
          setLessonId(data.session.lessonTitle);
        }
      }
    } catch (error) {
      console.error('Failed to check for active session:', error);
    }
  };

  const createNewSession = async () => {
    setIsCreatingSession(true);
    try {
      const response = await fetch('/api/sessions/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instructorId,
          lessonTitle: lessonId,
          lessonType: lessonId,
          duration: sessionDuration
        })
      });

      if (response.ok) {
        const data = await response.json();
        setSessionId(data.sessionId);
        console.log(`✅ Session created: ${data.sessionId}`);
      } else {
        console.error('Failed to create session');
      }
    } catch (error) {
      console.error('Session creation error:', error);
    } finally {
      setIsCreatingSession(false);
    }
  };

  const loadSessionData = async () => {
    try {
      // Load real session data from API
      const response = await fetch(`/api/instructor/session-data?sessionId=${sessionId}&lessonId=${lessonId}`);
      
      if (response.ok) {
        const data = await response.json();
        setStudents(data.students);
        setMetrics(data.metrics);
        return;
      }
      
      // Fallback to mock data for demonstration
      const mockStudents: StudentActivity[] = [
        {
          id: 'student_001',
          firstName: 'Alice',
          lastName: 'Johnson',
          email: 'alice.johnson@university.edu',
          totalOrders: 12,
          portfolioValue: 10450.50,
          unrealizedPnL: 450.50,
          lastActivity: new Date(Date.now() - 30000), // 30 seconds ago
          currentPositions: [
            { symbol: 'AAPL', quantity: 50, avgPrice: 150.25, currentPrice: 152.30, unrealizedPnL: 102.50 },
            { symbol: 'MSFT', quantity: 25, avgPrice: 280.00, currentPrice: 285.40, unrealizedPnL: 135.00 }
          ],
          recentOrders: [
            { id: 'order_001', symbol: 'AAPL', side: 'BUY', quantity: 25, price: 151.50, timestamp: new Date(), status: 'FILLED' }
          ]
        },
        {
          id: 'student_002',
          firstName: 'Bob',
          lastName: 'Smith',
          email: 'bob.smith@university.edu',
          totalOrders: 8,
          portfolioValue: 9820.75,
          unrealizedPnL: -179.25,
          lastActivity: new Date(Date.now() - 45000), // 45 seconds ago
          currentPositions: [
            { symbol: 'GOOGL', quantity: 15, avgPrice: 2650.00, currentPrice: 2640.25, unrealizedPnL: -146.25 }
          ],
          recentOrders: [
            { id: 'order_002', symbol: 'GOOGL', side: 'SELL', quantity: 5, price: 2645.00, timestamp: new Date(), status: 'FILLED' }
          ]
        }
      ];

      const mockMetrics: SessionMetrics = {
        totalStudents: mockStudents.length,
        activeStudents: mockStudents.filter(s => Date.now() - s.lastActivity.getTime() < 60000).length,
        totalOrders: mockStudents.reduce((sum, s) => sum + s.totalOrders, 0),
        totalVolume: 245000,
        averagePortfolioValue: mockStudents.reduce((sum, s) => sum + s.portfolioValue, 0) / mockStudents.length,
        topPerformer: 'Alice Johnson',
        marketStatus: 'OPEN'
      };

      setStudents(mockStudents);
      setMetrics(mockMetrics);
    } catch (error) {
      console.error('Failed to load session data:', error);
    }
  };

  const handleMarketControl = async (action: string, params?: any) => {
    try {
      const response = await fetch('/api/instructor/market-control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...params })
      });

      if (response.ok) {
        console.log(`Market control action '${action}' executed successfully`);
        loadSessionData(); // Refresh data
      }
    } catch (error) {
      console.error('Market control action failed:', error);
    }
  };

  const handleAlertAction = (alertId: string, action: string) => {
    console.log(`Executing alert action: ${action} for alert ${alertId}`);
    
    switch (action) {
      case 'view_student':
        // Find student from alert and select them
        const alertStudent = students.find(s => `alert_${s.id}` === alertId);
        if (alertStudent) {
          setSelectedStudent(alertStudent.id);
        }
        break;
      case 'pause_market':
        handleMarketControl('pause_market');
        break;
      case 'send_warning':
        // Implementation for sending warning message
        console.log('Sending warning message to student');
        break;
      case 'investigate':
        // Implementation for investigation mode
        console.log('Starting investigation mode');
        break;
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value);
  };

  const getActivityStatus = (lastActivity: Date) => {
    const timeDiff = Date.now() - lastActivity.getTime();
    if (timeDiff < 30000) return { status: 'Active', color: 'text-green-400' };
    if (timeDiff < 120000) return { status: 'Recent', color: 'text-yellow-400' };
    return { status: 'Idle', color: 'text-gray-400' };
  };

  // Show session creation interface if no active session
  if (!sessionId) {
    return (
      <div className="min-h-screen bg-gray-900 text-white">
        <div className="max-w-4xl mx-auto p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">HyperTick Instructor Dashboard</h1>
            <p className="text-gray-400">Create a new trading session to begin</p>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-6 max-w-md mx-auto">
            <h2 className="text-xl font-semibold mb-4">🎓 Create New Session</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Lesson Type</label>
                <select
                  value={lessonId}
                  onChange={(e) => setLessonId(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
                >
                  <option value="Price Formation">Price Formation</option>
                  <option value="Market Efficiency">Market Efficiency</option>
                  <option value="Arbitrage Trading">Arbitrage Trading</option>
                  <option value="Portfolio Theory">Portfolio Theory</option>
                  <option value="Options Trading">Options Trading</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Duration (minutes)</label>
                <select
                  value={sessionDuration}
                  onChange={(e) => setSessionDuration(parseInt(e.target.value))}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
                >
                  <option value={900}>15 minutes</option>
                  <option value={1800}>30 minutes</option>
                  <option value={3600}>60 minutes</option>
                  <option value={5400}>90 minutes</option>
                </select>
              </div>
              
              <button
                onClick={createNewSession}
                disabled={isCreatingSession}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:opacity-50 text-white font-semibold py-3 px-4 rounded transition-colors"
              >
                {isCreatingSession ? '🔄 Creating Session...' : '🚀 Start Trading Session'}
              </button>
            </div>
            
            <div className="mt-6 text-sm text-gray-400 text-center">
              <p>Students will be able to join once the session is created</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Real-time Alerts */}
      <InstructorAlerts 
        sessionId={sessionId} 
        onAlertAction={handleAlertAction}
      />
      
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Instructor Dashboard</h1>
            <p className="text-gray-300">Session: {sessionId} | Lesson: {lessonId}</p>
          </div>
          <div className="flex items-center space-x-4">
            <select 
              value={lessonId}
              onChange={(e) => setLessonId(e.target.value)}
              className="bg-gray-700 border border-gray-600 rounded px-3 py-2"
            >
              <option>Price Formation</option>
              <option>Market Efficiency</option>
              <option>Option Pricing</option>
              <option>Portfolio Theory</option>
            </select>
            <div className={`px-3 py-1 rounded-full text-sm ${
              metrics.marketStatus === 'OPEN' ? 'bg-green-600' : 
              metrics.marketStatus === 'PAUSED' ? 'bg-yellow-600' : 'bg-red-600'
            }`}>
              {metrics.marketStatus}
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 grid grid-cols-12 gap-6">
        {/* Session Metrics */}
        <div className="col-span-12 grid grid-cols-6 gap-4">
          <div className="bg-gray-800 p-4 rounded">
            <div className="text-2xl font-bold text-blue-400">{metrics.totalStudents}</div>
            <div className="text-sm text-gray-300">Total Students</div>
          </div>
          <div className="bg-gray-800 p-4 rounded">
            <div className="text-2xl font-bold text-green-400">{metrics.activeStudents}</div>
            <div className="text-sm text-gray-300">Active Now</div>
          </div>
          <div className="bg-gray-800 p-4 rounded">
            <div className="text-2xl font-bold text-purple-400">{metrics.totalOrders}</div>
            <div className="text-sm text-gray-300">Total Orders</div>
          </div>
          <div className="bg-gray-800 p-4 rounded">
            <div className="text-2xl font-bold text-yellow-400">{formatCurrency(metrics.totalVolume)}</div>
            <div className="text-sm text-gray-300">Total Volume</div>
          </div>
          <div className="bg-gray-800 p-4 rounded">
            <div className="text-2xl font-bold text-cyan-400">{formatCurrency(metrics.averagePortfolioValue)}</div>
            <div className="text-sm text-gray-300">Avg Portfolio</div>
          </div>
          <div className="bg-gray-800 p-4 rounded">
            <div className="text-lg font-bold text-orange-400">{metrics.topPerformer}</div>
            <div className="text-sm text-gray-300">Top Performer</div>
          </div>
        </div>

        {/* Market Controls */}
        <div className="col-span-4 bg-gray-800 p-4 rounded">
          <h3 className="text-lg font-semibold mb-4">Market Controls</h3>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleMarketControl('pause_market')}
                disabled={metrics.marketStatus === 'PAUSED'}
                className="bg-yellow-600 hover:bg-yellow-700 disabled:opacity-50 py-2 px-4 rounded"
              >
                Pause Market
              </button>
              <button
                onClick={() => handleMarketControl('resume_market')}
                disabled={metrics.marketStatus === 'OPEN'}
                className="bg-green-600 hover:bg-green-700 disabled:opacity-50 py-2 px-4 rounded"
              >
                Resume Market
              </button>
            </div>

            <div>
              <label className="block text-sm text-gray-300 mb-2">Market Volatility</label>
              <input
                type="range"
                min="0.1"
                max="3.0"
                step="0.1"
                value={marketControls.volatility}
                onChange={(e) => setMarketControls({...marketControls, volatility: parseFloat(e.target.value)})}
                className="w-full"
              />
              <div className="text-sm text-gray-400">Current: {marketControls.volatility}x</div>
            </div>

            <div>
              <label className="block text-sm text-gray-300 mb-2">Trigger Market Event</label>
              <select 
                value={marketControls.eventTrigger}
                onChange={(e) => setMarketControls({...marketControls, eventTrigger: e.target.value})}
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
              >
                <option value="">Select Event</option>
                <option value="news_shock">News Shock</option>
                <option value="liquidity_crunch">Liquidity Crunch</option>
                <option value="volatility_spike">Volatility Spike</option>
              </select>
            </div>

            <button
              onClick={() => handleMarketControl('trigger_event', { 
                type: marketControls.eventTrigger,
                symbol: 'MARKET',
                impact: 0.05,
                duration: 60
              })}
              disabled={!marketControls.eventTrigger}
              className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 py-2 px-4 rounded"
            >
              Trigger Event
            </button>
          </div>
        </div>

        {/* Student List */}
        <div className="col-span-8 bg-gray-800 p-4 rounded">
          <h3 className="text-lg font-semibold mb-4">Student Activity</h3>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-2">Student</th>
                  <th className="text-left py-2">Portfolio Value</th>
                  <th className="text-left py-2">P&L</th>
                  <th className="text-left py-2">Orders</th>
                  <th className="text-left py-2">Status</th>
                  <th className="text-left py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => {
                  const activityStatus = getActivityStatus(student.lastActivity);
                  return (
                    <tr 
                      key={student.id} 
                      className={`border-b border-gray-700 hover:bg-gray-700 cursor-pointer ${
                        selectedStudent === student.id ? 'bg-blue-900' : ''
                      }`}
                      onClick={() => setSelectedStudent(student.id)}
                    >
                      <td className="py-2">
                        <div>
                          <div className="font-medium">{student.firstName} {student.lastName}</div>
                          <div className="text-xs text-gray-400">{student.email}</div>
                        </div>
                      </td>
                      <td className="py-2 font-mono">{formatCurrency(student.portfolioValue)}</td>
                      <td className={`py-2 font-mono ${student.unrealizedPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {student.unrealizedPnL >= 0 ? '+' : ''}{formatCurrency(student.unrealizedPnL)}
                      </td>
                      <td className="py-2">{student.totalOrders}</td>
                      <td className={`py-2 ${activityStatus.color}`}>{activityStatus.status}</td>
                      <td className="py-2">
                        <button className="text-blue-400 hover:text-blue-300 text-xs">View Details</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Student Detail Panel */}
        {selectedStudent && (
          <div className="col-span-12 bg-gray-800 p-4 rounded">
            {(() => {
              const student = students.find(s => s.id === selectedStudent);
              if (!student) return null;

              return (
                <div>
                  <h3 className="text-lg font-semibold mb-4">
                    {student.firstName} {student.lastName} - Detailed View
                  </h3>
                  
                  <div className="grid grid-cols-3 gap-6">
                    {/* Current Positions */}
                    <div>
                      <h4 className="font-medium mb-2">Current Positions</h4>
                      <div className="space-y-2">
                        {student.currentPositions.map((position, index) => (
                          <div key={index} className="bg-gray-700 p-3 rounded">
                            <div className="flex justify-between items-start">
                              <div>
                                <div className="font-semibold">{position.symbol}</div>
                                <div className="text-sm text-gray-300">{position.quantity} shares @ {formatCurrency(position.avgPrice)}</div>
                              </div>
                              <div className="text-right">
                                <div className="font-mono">{formatCurrency(position.currentPrice)}</div>
                                <div className={`text-sm ${position.unrealizedPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                  {position.unrealizedPnL >= 0 ? '+' : ''}{formatCurrency(position.unrealizedPnL)}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Recent Orders */}
                    <div>
                      <h4 className="font-medium mb-2">Recent Orders</h4>
                      <div className="space-y-2">
                        {student.recentOrders.map((order) => (
                          <div key={order.id} className="bg-gray-700 p-3 rounded">
                            <div className="flex justify-between items-start">
                              <div>
                                <div className="font-semibold">
                                  <span className={order.side === 'BUY' ? 'text-green-400' : 'text-red-400'}>
                                    {order.side}
                                  </span> {order.symbol}
                                </div>
                                <div className="text-sm text-gray-300">
                                  {order.quantity} @ {formatCurrency(order.price)}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-sm text-gray-300">{order.status}</div>
                                <div className="text-xs text-gray-400">
                                  {order.timestamp.toLocaleTimeString()}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Lesson Progression */}
                    <div>
                      <h4 className="font-medium mb-2">Lesson Progression</h4>
                      <LessonProgressionManager
                        studentId={student.id}
                        sessionId={sessionId}
                        onProgressUpdate={(studentId, lessonId) => {
                          console.log(`Progress updated for student ${studentId} in lesson ${lessonId}`);
                          loadSessionData(); // Refresh dashboard data
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
}