/**
 * Session Control Dashboard - Primary Instructor Interface
 * 
 * Core instructor dashboard for initiating sessions, managing students,
 * and monitoring real-time trading activity across all connected terminals
 */

'use client';

import { useState, useEffect } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { enhancedSessionEngine } from '@/lib/enhanced-session-engine';

interface SessionControlProps {
  user: any;
  classId: string;
}

interface Student {
  id: string;
  name: string;
  email: string;
  status: 'online' | 'offline' | 'in_session' | 'disconnected';
  terminal: string;
  lastActivity: Date;
  currentBalance: number;
  totalTrades: number;
  pnl: number;
  position: string;
}

interface SessionTemplate {
  id: string;
  name: string;
  description: string;
  duration: number;
  lessonId: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  maxStudents: number;
  markets: string[];
  privileges: string[];
}

interface ActiveSession {
  id: string;
  name: string;
  status: 'preparing' | 'active' | 'paused' | 'completed';
  startTime: Date;
  duration: number;
  participants: Student[];
  marketStatus: 'pre_market' | 'open' | 'closed' | 'auction';
  currentPrice: number;
  volume: number;
  elapsed: number;
}

export default function SessionControlDashboard({ user, classId }: SessionControlProps) {
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<'overview' | 'students' | 'session' | 'analytics'>('overview');
  
  const [students, setStudents] = useState<Student[]>([]);
  const [sessionTemplates, setSessionTemplates] = useState<SessionTemplate[]>([]);
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [sessionSettings, setSessionSettings] = useState({
    duration: 30,
    autoStart: false,
    recordSession: true,
    allowLateJoin: true
  });

  const { connected, socket, trades, marketData } = useWebSocket({ 
    sessionId: activeSession?.id || '', 
    userId: user?.id || '', 
    role: 'Instructor' 
  });

  useEffect(() => {
    loadDashboardData();
  }, [classId]);

  useEffect(() => {
    if (connected && socket) {
      socket.on('student_connected', handleStudentConnected);
      socket.on('student_disconnected', handleStudentDisconnected);
      socket.on('student_trade', handleStudentTrade);
      socket.on('session_status_updated', handleSessionStatusUpdate);
      socket.on('market_update', handleMarketUpdate);
      
      return () => {
        socket.off('student_connected', handleStudentConnected);
        socket.off('student_disconnected', handleStudentDisconnected);
        socket.off('student_trade', handleStudentTrade);
        socket.off('session_status_updated', handleSessionStatusUpdate);
        socket.off('market_update', handleMarketUpdate);
      };
    }
  }, [connected, socket]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadStudents(),
        loadSessionTemplates(),
        loadActiveSession()
      ]);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStudents = async () => {
    // Simulate loading enrolled students
    const mockStudents: Student[] = [
      {
        id: 'student_1',
        name: 'Alice Johnson',
        email: 'alice@university.edu',
        status: 'online',
        terminal: 'Terminal 1',
        lastActivity: new Date(),
        currentBalance: 10000,
        totalTrades: 0,
        pnl: 0,
        position: 'Cash'
      },
      {
        id: 'student_2',
        name: 'Bob Chen',
        email: 'bob@university.edu',
        status: 'online',
        terminal: 'Terminal 2',
        lastActivity: new Date(Date.now() - 2 * 60 * 1000),
        currentBalance: 10000,
        totalTrades: 0,
        pnl: 0,
        position: 'Cash'
      },
      {
        id: 'student_3',
        name: 'Carol Davis',
        email: 'carol@university.edu',
        status: 'offline',
        terminal: 'Terminal 3',
        lastActivity: new Date(Date.now() - 15 * 60 * 1000),
        currentBalance: 10000,
        totalTrades: 0,
        pnl: 0,
        position: 'Cash'
      },
      {
        id: 'student_4',
        name: 'David Wilson',
        email: 'david@university.edu',
        status: 'online',
        terminal: 'Terminal 4',
        lastActivity: new Date(Date.now() - 30 * 1000),
        currentBalance: 10000,
        totalTrades: 0,
        pnl: 0,
        position: 'Cash'
      }
    ];
    setStudents(mockStudents);
  };

  const loadSessionTemplates = async () => {
    // Load available lesson/session templates
    const mockTemplates: SessionTemplate[] = [
      {
        id: 'template_1',
        name: 'Price Formation Basics',
        description: 'Introduction to market microstructure and price discovery',
        duration: 30,
        lessonId: 'lesson_price_formation',
        difficulty: 'beginner',
        maxStudents: 24,
        markets: ['AAPL', 'MSFT'],
        privileges: ['basic_trading', 'market_data', 'position_display']
      },
      {
        id: 'template_2',
        name: 'Market Efficiency Challenge',
        description: 'Advanced trading simulation testing market efficiency concepts',
        duration: 45,
        lessonId: 'lesson_market_efficiency',
        difficulty: 'intermediate',
        maxStudents: 20,
        markets: ['AAPL', 'MSFT', 'GOOGL', 'TSLA'],
        privileges: ['advanced_trading', 'level2_data', 'short_selling', 'options']
      },
      {
        id: 'template_3',
        name: 'Options Pricing Lab',
        description: 'Hands-on options trading and Greeks calculation',
        duration: 60,
        lessonId: 'lesson_options_pricing',
        difficulty: 'advanced',
        maxStudents: 16,
        markets: ['SPY', 'QQQ'],
        privileges: ['options_trading', 'greeks_display', 'volatility_tools', 'risk_analytics']
      }
    ];
    setSessionTemplates(mockTemplates);
  };

  const loadActiveSession = async () => {
    // Check if there's an active session
    // For now, no active session
    setActiveSession(null);
  };

  const handleStudentConnected = (data: any) => {
    setStudents(prev => prev.map(student => 
      student.id === data.studentId 
        ? { ...student, status: 'online', lastActivity: new Date() }
        : student
    ));
  };

  const handleStudentDisconnected = (data: any) => {
    setStudents(prev => prev.map(student => 
      student.id === data.studentId 
        ? { ...student, status: 'offline', lastActivity: new Date() }
        : student
    ));
  };

  const handleStudentTrade = (data: any) => {
    setStudents(prev => prev.map(student => 
      student.id === data.studentId 
        ? { 
            ...student, 
            totalTrades: student.totalTrades + 1,
            currentBalance: data.newBalance,
            pnl: data.pnl,
            position: data.position,
            lastActivity: new Date()
          }
        : student
    ));
  };

  const handleSessionStatusUpdate = (data: any) => {
    if (activeSession) {
      setActiveSession(prev => prev ? { ...prev, ...data } : null);
    }
  };

  const handleMarketUpdate = (data: any) => {
    if (activeSession) {
      setActiveSession(prev => prev ? { 
        ...prev, 
        currentPrice: data.price,
        volume: data.volume 
      } : null);
    }
  };

  const startNewSession = async () => {
    if (!selectedTemplate) {
      alert('Please select a session template');
      return;
    }

    const template = sessionTemplates.find(t => t.id === selectedTemplate);
    if (!template) return;

    const onlineStudents = students.filter(s => s.status === 'online');
    if (onlineStudents.length === 0) {
      alert('No students are currently online');
      return;
    }

    try {
      // Create new session
      const newSession: ActiveSession = {
        id: `session_${Date.now()}`,
        name: template.name,
        status: 'preparing',
        startTime: new Date(),
        duration: sessionSettings.duration,
        participants: onlineStudents,
        marketStatus: 'pre_market',
        currentPrice: 100.00,
        volume: 0,
        elapsed: 0
      };

      setActiveSession(newSession);

      // Notify all online students to join session
      if (socket) {
        socket.emit('session_starting', {
          sessionId: newSession.id,
          templateId: template.id,
          students: onlineStudents.map(s => s.id),
          settings: sessionSettings
        });
      }

      // Update student status
      setStudents(prev => prev.map(student => 
        onlineStudents.find(s => s.id === student.id)
          ? { ...student, status: 'in_session' }
          : student
      ));

      setActiveView('session');
    } catch (error) {
      console.error('Failed to start session:', error);
      alert('Failed to start session. Please try again.');
    }
  };

  const pauseSession = async () => {
    if (!activeSession || !socket) return;
    
    socket.emit('pause_session', { sessionId: activeSession.id });
    setActiveSession(prev => prev ? { ...prev, status: 'paused' } : null);
  };

  const resumeSession = async () => {
    if (!activeSession || !socket) return;
    
    socket.emit('resume_session', { sessionId: activeSession.id });
    setActiveSession(prev => prev ? { ...prev, status: 'active' } : null);
  };

  const endSession = async () => {
    if (!activeSession || !socket) return;
    
    if (confirm('Are you sure you want to end this session? All student progress will be saved.')) {
      socket.emit('end_session', { sessionId: activeSession.id });
      
      // Update student status back to online
      setStudents(prev => prev.map(student => 
        student.status === 'in_session'
          ? { ...student, status: 'online' }
          : student
      ));
      
      setActiveSession(null);
      setActiveView('overview');
    }
  };

  const broadcastMessage = (message: string) => {
    if (!socket || !activeSession) return;
    
    socket.emit('instructor_broadcast', {
      sessionId: activeSession.id,
      message,
      timestamp: new Date()
    });
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'online': return 'text-green-600 bg-green-50';
      case 'in_session': return 'text-blue-600 bg-blue-50';
      case 'offline': return 'text-gray-600 bg-gray-50';
      case 'disconnected': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const formatElapsed = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading instructor dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold text-gray-900">Instructor Control Panel</h1>
          <div className="flex items-center space-x-4">
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${connected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              {connected ? 'Connected' : 'Disconnected'}
            </div>
            {activeSession && (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-500">Session:</span>
                <span className="font-medium">{activeSession.name}</span>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  activeSession.status === 'active' ? 'bg-green-100 text-green-800' :
                  activeSession.status === 'paused' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-blue-100 text-blue-800'
                }`}>
                  {activeSession.status}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-medium text-blue-900">Students Online</h3>
            <p className="text-2xl font-bold text-blue-600">
              {students.filter(s => s.status === 'online' || s.status === 'in_session').length}
            </p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <h3 className="font-medium text-green-900">Active Session</h3>
            <p className="text-2xl font-bold text-green-600">
              {activeSession ? '1' : '0'}
            </p>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <h3 className="font-medium text-purple-900">Total Students</h3>
            <p className="text-2xl font-bold text-purple-600">
              {students.length}
            </p>
          </div>
          <div className="bg-orange-50 p-4 rounded-lg">
            <h3 className="font-medium text-orange-900">Session Templates</h3>
            <p className="text-2xl font-bold text-orange-600">
              {sessionTemplates.length}
            </p>
          </div>
        </div>

        {/* Navigation */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {['overview', 'students', 'session', 'analytics'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveView(tab as any)}
                className={`py-2 px-1 border-b-2 font-medium text-sm capitalize ${
                  activeView === tab
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      {activeView === 'overview' && (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Session Templates */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Start New Session</h3>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Session Template
                </label>
                <select 
                  value={selectedTemplate} 
                  onChange={(e) => setSelectedTemplate(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value="">Choose a template...</option>
                  {sessionTemplates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name} ({formatDuration(template.duration)})
                    </option>
                  ))}
                </select>
              </div>

              {selectedTemplate && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  {(() => {
                    const template = sessionTemplates.find(t => t.id === selectedTemplate);
                    return template ? (
                      <div>
                        <h4 className="font-medium text-gray-900">{template.name}</h4>
                        <p className="text-sm text-gray-600 mt-1">{template.description}</p>
                        <div className="grid grid-cols-2 gap-4 mt-3 text-sm">
                          <div>
                            <span className="text-gray-500">Duration:</span>
                            <span className="ml-2 font-medium">{formatDuration(template.duration)}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Difficulty:</span>
                            <span className="ml-2 font-medium capitalize">{template.difficulty}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Max Students:</span>
                            <span className="ml-2 font-medium">{template.maxStudents}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Markets:</span>
                            <span className="ml-2 font-medium">{template.markets.join(', ')}</span>
                          </div>
                        </div>
                      </div>
                    ) : null;
                  })()}
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Session Duration (minutes)
                  </label>
                  <input 
                    type="number" 
                    value={sessionSettings.duration}
                    onChange={(e) => setSessionSettings(prev => ({ ...prev, duration: parseInt(e.target.value) }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    min="5"
                    max="180"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input 
                      type="checkbox" 
                      checked={sessionSettings.recordSession}
                      onChange={(e) => setSessionSettings(prev => ({ ...prev, recordSession: e.target.checked }))}
                      className="mr-2"
                    />
                    <span className="text-sm">Record session for playback</span>
                  </label>
                  <label className="flex items-center">
                    <input 
                      type="checkbox" 
                      checked={sessionSettings.allowLateJoin}
                      onChange={(e) => setSessionSettings(prev => ({ ...prev, allowLateJoin: e.target.checked }))}
                      className="mr-2"
                    />
                    <span className="text-sm">Allow students to join after start</span>
                  </label>
                </div>
              </div>
            </div>

            <button 
              onClick={startNewSession}
              disabled={!selectedTemplate || activeSession !== null}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-md font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {activeSession ? 'Session Already Active' : 'Start Session'}
            </button>
          </div>

          {/* Quick Student Status */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Student Status</h3>
            <div className="space-y-3">
              {students.map((student) => (
                <div key={student.id} className="flex items-center justify-between">
                  <div>
                    <span className="font-medium text-gray-900">{student.name}</span>
                    <span className="text-sm text-gray-500 ml-2">{student.terminal}</span>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(student.status)}`}>
                    {student.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeView === 'students' && (
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Student Management</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Student
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Terminal
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Balance
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    P&L
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Activity
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {students.map((student) => (
                  <tr key={student.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{student.name}</div>
                        <div className="text-sm text-gray-500">{student.email}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(student.status)}`}>
                        {student.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {student.terminal}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${student.currentBalance.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={student.pnl >= 0 ? 'text-green-600' : 'text-red-600'}>
                        ${student.pnl.toFixed(2)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {Math.floor((Date.now() - student.lastActivity.getTime()) / (1000 * 60))} min ago
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeView === 'session' && activeSession && (
        <div className="space-y-6">
          {/* Session Controls */}
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Active Session: {activeSession.name}</h3>
              <div className="flex items-center space-x-3">
                <span className="text-sm text-gray-500">
                  Elapsed: {formatElapsed(activeSession.elapsed)}
                </span>
                <div className="flex space-x-2">
                  {activeSession.status === 'active' ? (
                    <button 
                      onClick={pauseSession}
                      className="px-3 py-1 bg-yellow-600 text-white rounded text-sm hover:bg-yellow-700"
                    >
                      Pause
                    </button>
                  ) : (
                    <button 
                      onClick={resumeSession}
                      className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                    >
                      Resume
                    </button>
                  )}
                  <button 
                    onClick={endSession}
                    className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                  >
                    End Session
                  </button>
                </div>
              </div>
            </div>

            {/* Market Status */}
            <div className="grid grid-cols-4 gap-4 mb-4">
              <div className="bg-blue-50 p-3 rounded">
                <div className="text-sm text-blue-600">Market Status</div>
                <div className="font-medium capitalize">{activeSession.marketStatus.replace('_', ' ')}</div>
              </div>
              <div className="bg-green-50 p-3 rounded">
                <div className="text-sm text-green-600">Current Price</div>
                <div className="font-medium">${activeSession.currentPrice.toFixed(2)}</div>
              </div>
              <div className="bg-purple-50 p-3 rounded">
                <div className="text-sm text-purple-600">Volume</div>
                <div className="font-medium">{activeSession.volume.toLocaleString()}</div>
              </div>
              <div className="bg-orange-50 p-3 rounded">
                <div className="text-sm text-orange-600">Participants</div>
                <div className="font-medium">{activeSession.participants.length}</div>
              </div>
            </div>

            {/* Broadcast Message */}
            <div className="flex space-x-2">
              <input 
                type="text" 
                placeholder="Send message to all students..."
                className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    broadcastMessage((e.target as HTMLInputElement).value);
                    (e.target as HTMLInputElement).value = '';
                  }
                }}
              />
              <button 
                onClick={() => {
                  const input = document.querySelector('input[placeholder*="Send message"]') as HTMLInputElement;
                  if (input?.value) {
                    broadcastMessage(input.value);
                    input.value = '';
                  }
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
              >
                Send
              </button>
            </div>
          </div>

          {/* Live Student Activity */}
          <div className="bg-white shadow rounded-lg p-6">
            <h4 className="text-lg font-medium text-gray-900 mb-4">Live Student Activity</h4>
            <div className="space-y-3">
              {activeSession.participants.map((student) => (
                <div key={student.id} className="flex items-center justify-between p-3 border border-gray-200 rounded">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${student.status === 'in_session' ? 'bg-green-400' : 'bg-gray-400'}`}></div>
                    <span className="font-medium">{student.name}</span>
                    <span className="text-sm text-gray-500">{student.terminal}</span>
                  </div>
                  <div className="flex items-center space-x-4 text-sm">
                    <span>${student.currentBalance.toLocaleString()}</span>
                    <span className={student.pnl >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {student.pnl >= 0 ? '+' : ''}${student.pnl.toFixed(2)}
                    </span>
                    <span className="text-gray-500">{student.totalTrades} trades</span>
                    <span className="text-gray-500">{student.position}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeView === 'analytics' && (
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Session Analytics</h3>
          <p className="text-gray-600">
            Real-time analytics and reporting will appear here during active sessions.
            Historical session data and performance metrics will also be available.
          </p>
        </div>
      )}
    </div>
  );
}