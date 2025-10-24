/**
 * Lesson Manager - Instructor Interface for Session Control
 * 
 * Allows instructors to load lessons, start sessions, and monitor
 * real-time trading simulation progress
 */

'use client';

import { useState, useEffect } from 'react';
import { lessonLoader, LessonDefinition, LessonSimulation } from '@/lib/lesson-loader';
import { enhancedSessionEngine, ActiveSession, SessionParticipant } from '@/lib/enhanced-session-engine';

interface LessonManagerProps {
  user: any;
  classId: string;
  socket: any;
}

export default function LessonManager({ user, classId, socket }: LessonManagerProps) {
  const [availableLessons, setAvailableLessons] = useState<LessonDefinition[]>([]);
  const [selectedLesson, setSelectedLesson] = useState<LessonDefinition | null>(null);
  const [selectedScenario, setSelectedScenario] = useState<string>('A');
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [sessionParticipants, setSessionParticipants] = useState<SessionParticipant[]>([]);
  const [loading, setLoading] = useState(false);
  const [sessionLogs, setSessionLogs] = useState<string[]>([]);

  useEffect(() => {
    loadAvailableLessons();
    setupSocketListeners();
  }, []);

  const loadAvailableLessons = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return;

      const response = await fetch('/api/lessons', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setAvailableLessons(data.xmlLessons || []);
      }
    } catch (error) {
      console.error('Error loading lessons:', error);
    }
  };

  const setupSocketListeners = () => {
    if (!socket) return;

    socket.on('session_update', (data: any) => {
      setActiveSession(data.session);
    });

    socket.on('participant_update', (data: any) => {
      setSessionParticipants(data.participants);
    });

    socket.on('session_log', (data: any) => {
      setSessionLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${data.message}`].slice(-50));
    });

    return () => {
      socket.off('session_update');
      socket.off('participant_update');
      socket.off('session_log');
    };
  };

  const startSession = async () => {
    if (!selectedLesson || !selectedScenario) {
      alert('Please select a lesson and scenario');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        alert('Authentication required');
        return;
      }

      // Create session via API
      const createResponse = await fetch('/api/sessions/manage', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'CREATE_SESSION',
          lessonId: selectedLesson.id,
          scenario: selectedScenario,
          classId
        })
      });

      if (!createResponse.ok) {
        throw new Error('Failed to create session');
      }

      const createData = await createResponse.json();
      const sessionId = createData.session.id;

      // Start the session
      const startResponse = await fetch('/api/sessions/manage', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'START_SESSION',
          sessionId
        })
      });

      if (!startResponse.ok) {
        throw new Error('Failed to start session');
      }

      // Update local state
      setActiveSession(createData.session);
      addLog(`Session started: ${selectedLesson.name} - Scenario ${selectedScenario}`);

      // Notify via socket
      if (socket) {
        socket.emit('session_started', {
          sessionId,
          lessonId: selectedLesson.id,
          scenario: selectedScenario,
          classId
        });
      }

    } catch (error) {
      console.error('Error starting session:', error);
      alert('Failed to start session: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const pauseSession = async () => {
    if (!activeSession) return;

    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return;

      const response = await fetch('/api/sessions/manage', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'PAUSE_SESSION',
          sessionId: activeSession.id
        })
      });

      if (response.ok) {
        addLog('Session paused');
        if (socket) {
          socket.emit('session_paused', { sessionId: activeSession.id });
        }
      }
    } catch (error) {
      console.error('Error pausing session:', error);
    }
  };

  const resumeSession = async () => {
    if (!activeSession) return;

    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return;

      const response = await fetch('/api/sessions/manage', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'RESUME_SESSION',
          sessionId: activeSession.id
        })
      });

      if (response.ok) {
        addLog('Session resumed');
        if (socket) {
          socket.emit('session_resumed', { sessionId: activeSession.id });
        }
      }
    } catch (error) {
      console.error('Error resuming session:', error);
    }
  };

  const endSession = async () => {
    if (!activeSession) return;

    const confirmed = confirm('Are you sure you want to end this session? This cannot be undone.');
    if (!confirmed) return;

    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return;

      const response = await fetch('/api/sessions/manage', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'END_SESSION',
          sessionId: activeSession.id
        })
      });

      if (response.ok) {
        addLog('Session ended');
        setActiveSession(null);
        if (socket) {
          socket.emit('session_ended', { sessionId: activeSession.id });
        }
      }
    } catch (error) {
      console.error('Error ending session:', error);
    }
  };

  const executeManualCommand = async (commandType: string, parameters: any) => {
    if (!activeSession) return;

    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return;

      const response = await fetch('/api/sessions/manage', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'EXECUTE_COMMAND',
          sessionId: activeSession.id,
          parameters: {
            type: commandType,
            parameters
          }
        })
      });

      if (response.ok) {
        addLog(`Manual command executed: ${commandType}`);
      }
    } catch (error) {
      console.error('Error executing manual command:', error);
    }
  };

  const addLog = (message: string) => {
    setSessionLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`].slice(-50));
  };

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getSessionElapsed = (): number => {
    if (!activeSession || activeSession.status !== 'IN_PROGRESS') return 0;
    return Math.floor((Date.now() - activeSession.startTime.getTime()) / 1000);
  };

  if (user?.role !== 'INSTRUCTOR' && user?.role !== 'ADMIN') {
    return (
      <div className="p-6 text-center">
        <div className="text-red-600 font-bold">INSTRUCTOR ACCESS REQUIRED</div>
        <p className="text-gray-600 mt-2">This interface is only available to instructors and administrators.</p>
      </div>
    );
  }

  return (
    <div className="h-full bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Lesson Manager</h1>
          <p className="text-gray-600">Control trading sessions and manage lesson execution</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Lesson Selection */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Select Lesson</h2>
            
            {!activeSession ? (
              <>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Available Lessons
                  </label>
                  <select
                    value={selectedLesson?.id || ''}
                    onChange={(e) => {
                      const lesson = availableLessons.find(l => l.id === e.target.value);
                      setSelectedLesson(lesson || null);
                      if (lesson) {
                        setSelectedScenario(Object.keys(lesson.simulations)[0] || 'Simulation A');
                      }
                    }}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    <option value="">Select a lesson...</option>
                    {availableLessons.map((lesson) => (
                      <option key={lesson.id} value={lesson.id}>
                        {lesson.name} ({lesson.metadata?.difficulty || 'Unknown'})
                      </option>
                    ))}
                  </select>
                </div>

                {selectedLesson && (
                  <>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Scenario
                      </label>
                      <select
                        value={selectedScenario}
                        onChange={(e) => setSelectedScenario(e.target.value)}
                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                      >
                        {Object.entries(selectedLesson.simulations).map(([key, simulation]) => (
                          <option key={key} value={key}>
                            {simulation.id}: {simulation.duration}s
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="mb-4 p-3 bg-gray-50 rounded">
                      <h3 className="font-medium text-gray-900 mb-2">Lesson Details</h3>
                      <p className="text-sm text-gray-600 mb-2">{selectedLesson.metadata?.objectives?.join(', ') || 'No description available'}</p>
                      <div className="text-xs text-gray-500">
                        <div>Duration: {selectedLesson.metadata?.estimatedDuration || 0} minutes</div>
                        <div>Difficulty: {selectedLesson.metadata?.difficulty || 'Unknown'}</div>
                        <div>Commands: {(selectedLesson.simulations[selectedScenario]?.startCommands.length || 0) + (selectedLesson.simulations[selectedScenario]?.endCommands.length || 0)}</div>
                      </div>
                    </div>

                    <button
                      onClick={startSession}
                      disabled={loading}
                      className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400"
                    >
                      {loading ? 'Starting...' : 'Start Session'}
                    </button>
                  </>
                )}
              </>
            ) : (
              <div className="space-y-4">
                <div className="p-3 bg-green-50 border border-green-200 rounded">
                  <div className="font-medium text-green-900">Active Session</div>
                  <div className="text-sm text-green-700">{selectedLesson?.name}</div>
                  <div className="text-sm text-green-600">Scenario {activeSession.scenario}</div>
                  <div className="text-sm text-green-600">
                    Status: {activeSession.status} | Elapsed: {formatDuration(getSessionElapsed())}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {activeSession.status === 'IN_PROGRESS' ? (
                    <button
                      onClick={pauseSession}
                      className="bg-yellow-600 text-white py-2 px-4 rounded-md hover:bg-yellow-700"
                    >
                      Pause
                    </button>
                  ) : (
                    <button
                      onClick={resumeSession}
                      className="bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700"
                    >
                      Resume
                    </button>
                  )}
                  <button
                    onClick={endSession}
                    className="bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700"
                  >
                    End Session
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Session Monitoring */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Session Monitor</h2>
            
            {activeSession ? (
              <>
                <div className="mb-4">
                  <h3 className="font-medium text-gray-900 mb-2">Participants ({sessionParticipants.length})</h3>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {sessionParticipants.map((participant) => (
                      <div key={participant.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                        <div>
                          <div className="font-medium text-sm">{participant.username}</div>
                          <div className="text-xs text-gray-500">{participant.role}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium">
                            ${participant.performance.totalPnL.toFixed(2)}
                          </div>
                          <div className="text-xs text-gray-500">
                            {participant.performance.tradesExecuted} trades
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mb-4">
                  <h3 className="font-medium text-gray-900 mb-2">Market Status</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-gray-600">Market:</span>
                      <span className={`ml-1 font-medium ${
                        activeSession.marketState.isOpen ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {activeSession.marketState.isOpen ? 'OPEN' : 'CLOSED'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Symbols:</span>
                      <span className="ml-1 font-medium">{activeSession.marketState.symbols.size}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Auctions:</span>
                      <span className="ml-1 font-medium">{activeSession.marketState.auctionsActive.size}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Commands:</span>
                      <span className="ml-1 font-medium">{activeSession.executedCommands.size}</span>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center text-gray-500 py-8">
                No active session
              </div>
            )}
          </div>

          {/* Manual Controls & Logs */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Controls & Logs</h2>
            
            {activeSession && (
              <div className="mb-4">
                <h3 className="font-medium text-gray-900 mb-2">Manual Commands</h3>
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <button
                    onClick={() => executeManualCommand('OPEN_MARKET', [5])}
                    className="bg-green-600 text-white py-1 px-2 text-sm rounded hover:bg-green-700"
                  >
                    Open Market
                  </button>
                  <button
                    onClick={() => executeManualCommand('CLOSE_MARKET', [])}
                    className="bg-red-600 text-white py-1 px-2 text-sm rounded hover:bg-red-700"
                  >
                    Close Market
                  </button>
                  <button
                    onClick={() => executeManualCommand('GRANT_PRIVILEGE', [22])}
                    className="bg-blue-600 text-white py-1 px-2 text-sm rounded hover:bg-blue-700"
                  >
                    Grant Market Making
                  </button>
                  <button
                    onClick={() => executeManualCommand('CREATE_AUCTION', [22, 5, 1000, 1000, 30])}
                    className="bg-purple-600 text-white py-1 px-2 text-sm rounded hover:bg-purple-700"
                  >
                    Create Auction
                  </button>
                  <button
                    onClick={() => executeManualCommand('SET_LIQUIDITY_TRADER', [1, 'Active', true])}
                    className="bg-indigo-600 text-white py-1 px-2 text-sm rounded hover:bg-indigo-700"
                  >
                    Enable Liquidity
                  </button>
                  <button
                    onClick={() => executeManualCommand('GRANT_PRIVILEGE', [23])}
                    className="bg-yellow-600 text-white py-1 px-2 text-sm rounded hover:bg-yellow-700"
                  >
                    Grant Analyst Access
                  </button>
                </div>
              </div>
            )}

            <div>
              <h3 className="font-medium text-gray-900 mb-2">Session Logs</h3>
              <div className="bg-gray-900 text-green-400 p-3 rounded font-mono text-xs h-40 overflow-y-auto">
                {sessionLogs.length > 0 ? (
                  sessionLogs.map((log, index) => (
                    <div key={index}>{log}</div>
                  ))
                ) : (
                  <div className="text-gray-500">No logs yet...</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}