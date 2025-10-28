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
import { LessonXMLParser } from '@/lib/lesson-xml-parser';
import { xmlCommandProcessor } from '@/lib/xml-command-processor';

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
  scenarios: string[];
  category: string;
  parsedLesson?: any;
  legacyLesson?: any;
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

  // Helper functions for parsing lesson XML
  const extractScenariosFromXML = (xmlContent: string): string[] => {
    const scenarioMatches = xmlContent.match(/<simulation id="([^"]+)"/g) || [];
    return scenarioMatches.map(match => match.match(/"([^"]+)"/)?.[1] || '').filter(Boolean);
  };

  const extractPrivilegesFromXML = (xmlContent: string): string[] => {
    const privilegeMatches = xmlContent.match(/<command name="Grant Privilege">\s*<parameter>(\d+)<\/parameter>/g) || [];
    return privilegeMatches.map(match => {
      const privilegeId = match.match(/<parameter>(\d+)<\/parameter>/)?.[1];
      return privilegeId ? `privilege_${privilegeId}` : '';
    }).filter(Boolean);
  };

  const inferDifficultyFromName = (lessonName: string): 'beginner' | 'intermediate' | 'advanced' => {
    const name = lessonName.toLowerCase();
    if (name.includes('price formation') || name.includes('market efficiency')) {
      return 'beginner';
    } else if (name.includes('cdo') || name.includes('convertible') || name.includes('iii')) {
      return 'advanced';
    }
    return 'intermediate';
  };

  const inferDurationFromName = (lessonName: string): number => {
    const name = lessonName.toLowerCase();
    if (name.includes('price formation') || name.includes('market efficiency')) {
      return 90; // 1.5 hours for foundational lessons
    } else if (name.includes('asset allocation') || name.includes('arbitrage')) {
      return 120; // 2 hours for intermediate topics
    } else if (name.includes('cdo') || name.includes('option') || name.includes('risky debt')) {
      return 150; // 2.5 hours for advanced topics
    }
    return 90; // Default 1.5 hours
  };

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
    try {
      // Load real enrolled students from API
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/classes/${classId}/students`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        const enrolledStudents = data.students || [];
        
        // Transform API response to match Student interface
        const transformedStudents: Student[] = enrolledStudents.map((student: any, index: number) => ({
          id: student.id,
          name: `${student.firstName} ${student.lastName}`,
          email: student.email,
          status: 'offline' as const, // Default to offline, will be updated by WebSocket events
          terminal: `Terminal ${index + 1}`,
          lastActivity: new Date(student.enrollmentDate || Date.now()),
          currentBalance: 10000, // Starting balance
          totalTrades: 0,
          pnl: 0,
          position: 'Cash'
        }));

        console.log(`📊 Loaded ${transformedStudents.length} enrolled students`);
        setStudents(transformedStudents);
      } else {
        console.error('Failed to load students:', response.statusText);
        setStudents([]); // No students if API fails
      }
    } catch (error) {
      console.error('Error loading students:', error);
      setStudents([]); // No students if error occurs
    }
  };

  const loadSessionTemplates = async () => {
    try {
      console.log('📚 Loading upTick legacy lessons...');
      const token = localStorage.getItem('auth_token');
      
      // First try to load legacy upTick lessons
      const legacyResponse = await fetch('/api/lessons/legacy', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (legacyResponse.ok) {
        const legacyData = await legacyResponse.json();
        const legacyLessons = legacyData.lessons || [];
        
        console.log(`📖 Found ${legacyLessons.length} legacy upTick lessons`);
        
        // Convert legacy lessons to session templates
        const legacyTemplates: SessionTemplate[] = legacyLessons.map((lesson: any) => ({
          id: lesson.lessonId,
          name: lesson.lessonName,
          description: `${lesson.category}: ${lesson.scenarioCount} scenario${lesson.scenarioCount !== 1 ? 's' : ''}`,
          duration: lesson.estimatedDuration,
          lessonId: lesson.lessonId,
          difficulty: lesson.difficulty.toLowerCase() as 'beginner' | 'intermediate' | 'advanced',
          maxStudents: 24,
          markets: ['AOE', 'BOND1', 'BOND2', 'BOND3', 'SPX'],
          privileges: [`${lesson.scenarioCount} privileges`],
          scenarios: lesson.scenarios || [],
          category: lesson.category,
          legacyLesson: lesson // Store the full legacy lesson data
        }));

        if (legacyTemplates.length > 0) {
          console.log(`✅ Loaded ${legacyTemplates.length} legacy lesson templates`);
          setSessionTemplates(legacyTemplates);
          return;
        }
      }

      // Fallback to regular lessons API
      const response = await fetch('/api/lessons', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        const lessons = data.lessons || [];
        
        // Convert lessons to session templates
        const templates: SessionTemplate[] = lessons.map((lesson: any) => ({
          id: lesson.id,
          name: lesson.name,
          description: lesson.description || 'Trading simulation lesson',
          duration: lesson.estimatedDuration || 45,
          lessonId: lesson.id,
          difficulty: (lesson.difficulty || 'intermediate').toLowerCase() as 'beginner' | 'intermediate' | 'advanced',
          maxStudents: 24,
          markets: ['AOE', 'BOND1', 'BOND2', 'BOND3', 'SPX'],
          privileges: ['Basic trading privileges'],
          scenarios: lesson.scenarios || ['Simulation A'],
          category: lesson.category || 'General Trading'
        }));

        console.log(`📚 Loaded ${templates.length} fallback lesson templates`);
        setSessionTemplates(templates);
      } else {
        console.error('Failed to load lessons:', response.statusText);
        setSessionTemplates([]);
      }
    } catch (error) {
      console.error('Error loading lesson templates:', error);
      // Create a minimal fallback template
      setSessionTemplates([{
        id: 'PRICE_FORMATION',
        name: 'Price Formation',
        description: 'Basic price formation lesson',
        duration: 45,
        lessonId: 'PRICE_FORMATION',
        difficulty: 'beginner',
        maxStudents: 24,
        markets: ['AOE'],
        privileges: ['Basic trading'],
        scenarios: ['Simulation A'],
        category: 'Market Microstructure'
      }]);
    }
  };

  const loadActiveSession = async () => {
    // Check if there's an active session
    // For now, no active session
    setActiveSession(null);
  };

  const handleStudentConnected = (data: any) => {
    console.log('📱 Student connected:', data.studentId);
    setStudents(prev => prev.map(student => 
      student.id === data.studentId 
        ? { ...student, status: 'online', lastActivity: new Date() }
        : student
    ));
  };

  const handleStudentDisconnected = (data: any) => {
    console.log('📱 Student disconnected:', data.studentId);
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

    try {
      console.log(`🚀 Starting live session for lesson: ${template.name}`);
      
      // Create session in database via API
      const token = localStorage.getItem('auth_token');
      const sessionResponse = await fetch('/api/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          lessonId: template.lessonId,
          classId: classId,
          scenario: template.scenarios[0] || 'Simulation A',
          duration: template.duration * 60, // Convert minutes to seconds
          settings: sessionSettings
        })
      });

      if (!sessionResponse.ok) {
        throw new Error('Failed to create session');
      }

      const sessionData = await sessionResponse.json();
      console.log('✅ Session created:', sessionData.session.id);

      // Create local session state for UI
      const newSession: ActiveSession = {
        id: sessionData.session.id,
        name: template.name,
        status: 'preparing',
        startTime: new Date(),
        duration: template.duration,
        participants: students, // Include all students, they'll join when ready
        marketStatus: 'pre_market',
        currentPrice: 100.00,
        volume: 0,
        elapsed: 0
      };

      setActiveSession(newSession);
      
      // Start the countdown sequence
      await startSessionCountdown(newSession, template);

    } catch (error) {
      console.error('Error starting session:', error);
      alert('Failed to start session: ' + (error as Error).message);
    }
  };

  const startSessionCountdown = async (session: ActiveSession, template: SessionTemplate) => {
    console.log('⏰ Starting session countdown...');
    
    // Update session status to show countdown
    setActiveSession(prev => prev ? { ...prev, status: 'preparing' } : null);

    // Broadcast countdown to all students
    const countdown = [5, 4, 3, 2, 1];
    for (const count of countdown) {
      console.log(`🔔 Countdown: ${count}`);
      // TODO: Send WebSocket message to all students
      // if (socket) {
      //   socket.emit('countdown', { count, sessionId: session.id });
      // }
      
      // Wait 1 second
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log('🎯 Markets are open!');
    
    // Update session to active
    setActiveSession(prev => prev ? { 
      ...prev, 
      status: 'active',
      marketStatus: 'open',
      startTime: new Date()
    } : null);

    // Execute lesson start commands
    if (template.legacyLesson) {
      await executeLessonCommands(session.id, template.legacyLesson);
    }
  };

  const executeLessonCommands = async (sessionId: string, legacyLesson: any) => {
    try {
      console.log(`📜 Executing lesson commands for: ${legacyLesson.lessonName}`);
      
      const token = localStorage.getItem('auth_token');
      
      // Load the full lesson XML to get commands
      const lessonResponse = await fetch(`/api/lessons/legacy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          action: 'LOAD_LESSON',
          lessonId: legacyLesson.lessonId
        })
      });

      if (lessonResponse.ok) {
        const lessonData = await lessonResponse.json();
        const lesson = lessonData.lesson;
        
        console.log(`⚙️ Found ${lesson.globalCommands?.length || 0} global commands`);
        
        // Execute global privilege commands first
        if (lesson.globalCommands) {
          for (const command of lesson.globalCommands) {
            if (command.type === 'GRANT_PRIVILEGE') {
              console.log(`🔑 Granting privilege ${command.parameters[0]}: ${command.description}`);
              
              // Call privileges API to grant privilege
              await fetch('/api/privileges', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                  sessionId: sessionId,
                  action: 'GRANT',
                  privilegeCode: command.parameters[0],
                  targetRole: command.targetRole || '$All'
                })
              });
            }
          }
        }

        // Execute scenario-specific start commands
        const scenario = lesson.simulations?.[legacyLesson.scenarios?.[0]] || lesson.simulations?.['Simulation A'];
        if (scenario?.startCommands) {
          console.log(`🎬 Executing ${scenario.startCommands.length} start commands for ${scenario.id}`);
          
          for (const command of scenario.startCommands) {
            console.log(`📋 Command: ${command.type} - ${command.description}`);
            
            // Execute command via session management API
            await fetch(`/api/sessions/${sessionId}`, {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({
                action: 'EXECUTE_COMMAND',
                command: command
              })
            });
          }
        }
        
        console.log('✅ Lesson commands executed successfully');
      }
    } catch (error) {
      console.error('Error executing lesson commands:', error);
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
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-black bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                  style={{ color: '#000000' }}
                >
                  <option value="" style={{ color: '#000000' }}>Choose a template...</option>
                  {sessionTemplates.map((template) => (
                    <option key={template.id} value={template.id} style={{ color: '#000000' }}>
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
                            <span className="text-gray-500">Runtime:</span>
                            <span className="ml-2 font-medium">~6 minutes</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Scenarios:</span>
                            <span className="ml-2 font-medium">{template.scenarios.length}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Category:</span>
                            <span className="ml-2 font-medium">{template.category.replace('_', ' ')}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Students Ready:</span>
                            <span className="ml-2 font-medium text-green-600">{students.filter(s => s.status === 'online').length}</span>
                          </div>
                        </div>
                        {template.scenarios.length > 0 && (
                          <div className="mt-2">
                            <span className="text-xs text-gray-500">Simulations: </span>
                            <span className="text-xs text-gray-600">{template.scenarios.join(', ')}</span>
                          </div>
                        )}
                        {template.privileges.length > 0 && (
                          <div className="mt-2">
                            <span className="text-xs text-gray-500">Trading Features: </span>
                            <span className="text-xs text-gray-600">{template.privileges.slice(0, 3).join(', ')}{template.privileges.length > 3 ? ` +${template.privileges.length - 3} more` : ''}</span>
                          </div>
                        )}
                      </div>
                    ) : null;
                  })()}
                </div>
              )}

              <div className="space-y-3">
                
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
              className="w-full bg-green-600 text-white py-3 px-4 rounded-md font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-lg"
            >
              🚀 {activeSession ? 'Session Already Running' : 'START LIVE TRADING'}
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
                className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm text-black bg-white"
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
        <div className="space-y-6">
          {/* Real-time Analytics Header */}
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Live Analytics Dashboard</h3>
              <div className="flex items-center space-x-4">
                {activeSession && (
                  <>
                    <div className="text-sm text-gray-500">
                      Session: <span className="font-medium">{activeSession.name}</span>
                    </div>
                    <div className={`px-2 py-1 rounded text-xs font-medium ${
                      activeSession.status === 'active' ? 'bg-green-100 text-green-800' :
                      activeSession.status === 'paused' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {activeSession.status}
                    </div>
                  </>
                )}
                <button className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">
                  Export Data
                </button>
              </div>
            </div>
            
            {activeSession ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium text-blue-900">Total Trades</h4>
                  <p className="text-2xl font-bold text-blue-600">
                    {students.reduce((sum, student) => sum + student.totalTrades, 0)}
                  </p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <h4 className="font-medium text-green-900">Total Volume</h4>
                  <p className="text-2xl font-bold text-green-600">
                    ${activeSession.volume.toLocaleString()}
                  </p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <h4 className="font-medium text-purple-900">Avg P&L</h4>
                  <p className="text-2xl font-bold text-purple-600">
                    ${(students.reduce((sum, student) => sum + student.pnl, 0) / students.length).toFixed(2)}
                  </p>
                </div>
                <div className="bg-orange-50 p-4 rounded-lg">
                  <h4 className="font-medium text-orange-900">Market Price</h4>
                  <p className="text-2xl font-bold text-orange-600">
                    ${activeSession.currentPrice.toFixed(2)}
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No active session. Start a session to view real-time analytics.
              </div>
            )}
          </div>

          {/* Student Performance Grid */}
          {activeSession && (
            <div className="grid md:grid-cols-2 gap-6">
              {/* Top Performers */}
              <div className="bg-white shadow rounded-lg p-6">
                <h4 className="text-lg font-medium text-gray-900 mb-4">Top Performers</h4>
                <div className="space-y-3">
                  {students
                    .filter(s => s.status === 'in_session')
                    .sort((a, b) => b.pnl - a.pnl)
                    .slice(0, 5)
                    .map((student, index) => (
                      <div key={student.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                        <div className="flex items-center space-x-3">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                            index === 0 ? 'bg-yellow-400 text-yellow-900' :
                            index === 1 ? 'bg-gray-300 text-gray-700' :
                            index === 2 ? 'bg-orange-400 text-orange-900' :
                            'bg-blue-100 text-blue-600'
                          }`}>
                            {index + 1}
                          </div>
                          <span className="font-medium">{student.name}</span>
                        </div>
                        <div className="text-right">
                          <div className={`font-medium ${student.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {student.pnl >= 0 ? '+' : ''}${student.pnl.toFixed(2)}
                          </div>
                          <div className="text-xs text-gray-500">{student.totalTrades} trades</div>
                        </div>
                      </div>
                  ))}
                </div>
              </div>

              {/* Most Active Traders */}
              <div className="bg-white shadow rounded-lg p-6">
                <h4 className="text-lg font-medium text-gray-900 mb-4">Most Active Traders</h4>
                <div className="space-y-3">
                  {students
                    .filter(s => s.status === 'in_session')
                    .sort((a, b) => b.totalTrades - a.totalTrades)
                    .slice(0, 5)
                    .map((student, index) => (
                      <div key={student.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                        <div className="flex items-center space-x-3">
                          <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">
                            {index + 1}
                          </div>
                          <span className="font-medium">{student.name}</span>
                        </div>
                        <div className="text-right">
                          <div className="font-medium text-blue-600">{student.totalTrades} trades</div>
                          <div className="text-xs text-gray-500">${student.currentBalance.toLocaleString()}</div>
                        </div>
                      </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Detailed Analytics Table */}
          {activeSession && (
            <div className="bg-white shadow rounded-lg p-6">
              <h4 className="text-lg font-medium text-gray-900 mb-4">Detailed Student Analytics</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Student
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Balance
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        P&L
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Trades
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Position
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Performance
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Risk Level
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {students
                      .filter(s => s.status === 'in_session')
                      .map((student) => {
                        const returnRate = ((student.pnl / 100000) * 100); // Assuming 100k starting balance
                        const riskLevel = student.totalTrades > 20 ? 'High' : student.totalTrades > 10 ? 'Medium' : 'Low';
                        
                        return (
                          <tr key={student.id}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className={`w-3 h-3 rounded-full mr-3 ${student.status === 'in_session' ? 'bg-green-400' : 'bg-gray-400'}`}></div>
                                <div>
                                  <div className="text-sm font-medium text-gray-900">{student.name}</div>
                                  <div className="text-sm text-gray-500">{student.terminal}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              ${student.currentBalance.toLocaleString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              <span className={student.pnl >= 0 ? 'text-green-600' : 'text-red-600'}>
                                {student.pnl >= 0 ? '+' : ''}${student.pnl.toFixed(2)}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {student.totalTrades}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {student.position}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              <span className={returnRate >= 0 ? 'text-green-600' : 'text-red-600'}>
                                {returnRate >= 0 ? '+' : ''}{returnRate.toFixed(2)}%
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                riskLevel === 'High' ? 'bg-red-100 text-red-800' :
                                riskLevel === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-green-100 text-green-800'
                              }`}>
                                {riskLevel}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Historical Sessions */}
          <div className="bg-white shadow rounded-lg p-6">
            <h4 className="text-lg font-medium text-gray-900 mb-4">Recent Sessions</h4>
            <div className="text-gray-600">
              <p className="mb-4">Historical session data will be displayed here, including:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Session completion rates and engagement metrics</li>
                <li>Average student performance by lesson type</li>
                <li>Trading pattern analysis and risk assessment</li>
                <li>Learning outcome correlation with trading behavior</li>
                <li>Comparative analysis across different class sections</li>
              </ul>
              <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                <h5 className="font-medium text-blue-900">Advanced Analytics Coming Soon:</h5>
                <ul className="text-sm text-blue-700 mt-2 space-y-1">
                  <li>• Heat maps showing trading activity patterns</li>
                  <li>• Behavioral analysis and learning curve visualization</li>
                  <li>• Real-time collaboration and peer influence tracking</li>
                  <li>• Automated assessment and feedback generation</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}