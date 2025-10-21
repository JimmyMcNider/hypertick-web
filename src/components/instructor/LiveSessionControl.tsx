'use client';

import { useState, useEffect } from 'react';
import { 
  PlayIcon, 
  PauseIcon, 
  StopIcon, 
  UserGroupIcon, 
  ClockIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';

interface User {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  role: 'STUDENT' | 'INSTRUCTOR' | 'ADMIN';
}

interface ActiveSession {
  id: string;
  lessonId: string;
  classId: string;
  scenario: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'PAUSED' | 'COMPLETED';
  startTime?: Date;
  endTime?: Date;
  duration: number;
  participants: SessionParticipant[];
  currentTick: number;
  lesson?: {
    title: string;
    description: string;
  };
}

interface SessionParticipant {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  isConnected: boolean;
  terminalStatus: 'OFFLINE' | 'CONNECTING' | 'ONLINE';
  lastActivity: Date;
  performance?: {
    totalPnL: number;
    tradesExecuted: number;
    riskScore: number;
  };
}

interface LiveSessionControlProps {
  user: User | null;
  classId: string;
}

export default function LiveSessionControl({ user, classId }: LiveSessionControlProps) {
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [availableLessons, setAvailableLessons] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedLesson, setSelectedLesson] = useState('');
  const [selectedScenario, setSelectedScenario] = useState('A');
  const [sessionDuration, setSessionDuration] = useState(15); // minutes
  const [showStartModal, setShowStartModal] = useState(false);

  // Fetch active session and available lessons
  useEffect(() => {
    fetchActiveSession();
    fetchAvailableLessons();
  }, [classId]);

  const fetchActiveSession = async () => {
    try {
      const response = await fetch(`/api/classes/${classId}/session/active`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setActiveSession(data.session);
      }
    } catch (error) {
      console.error('Error fetching active session:', error);
    }
  };

  const fetchAvailableLessons = async () => {
    try {
      const response = await fetch('/api/lessons', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setAvailableLessons(data.lessons);
      }
    } catch (error) {
      console.error('Error fetching lessons:', error);
    }
  };

  const handleStartSession = async () => {
    if (!selectedLesson) {
      alert('Please select a lesson');
      return;
    }

    try {
      setLoading(true);

      const response = await fetch('/api/sessions/manage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          action: 'START_SESSION',
          lessonId: selectedLesson,
          classId,
          scenario: selectedScenario,
          duration: sessionDuration * 60, // convert to seconds
          autoEnrollStudents: true
        })
      });

      if (response.ok) {
        const data = await response.json();
        setActiveSession(data.session);
        setShowStartModal(false);
        
        // Notify students that session is starting
        await notifyStudents('SESSION_STARTING', {
          sessionId: data.session.id,
          lesson: data.session.lesson
        });
      } else {
        const error = await response.json();
        alert('Error starting session: ' + error.error);
      }
    } catch (error) {
      alert('Error starting session: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePauseSession = async () => {
    if (!activeSession) return;

    try {
      setLoading(true);

      const response = await fetch(`/api/sessions/${activeSession.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          action: 'PAUSE_SESSION'
        })
      });

      if (response.ok) {
        const data = await response.json();
        setActiveSession(data.session);
        
        await notifyStudents('SESSION_PAUSED', {
          sessionId: activeSession.id
        });
      }
    } catch (error) {
      alert('Error pausing session: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResumeSession = async () => {
    if (!activeSession) return;

    try {
      setLoading(true);

      const response = await fetch(`/api/sessions/${activeSession.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          action: 'RESUME_SESSION'
        })
      });

      if (response.ok) {
        const data = await response.json();
        setActiveSession(data.session);
        
        await notifyStudents('SESSION_RESUMED', {
          sessionId: activeSession.id
        });
      }
    } catch (error) {
      alert('Error resuming session: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStopSession = async () => {
    if (!activeSession) return;

    const confirmed = confirm('Are you sure you want to stop the session? This will end the simulation for all students.');
    if (!confirmed) return;

    try {
      setLoading(true);

      const response = await fetch(`/api/sessions/${activeSession.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          action: 'STOP_SESSION'
        })
      });

      if (response.ok) {
        const data = await response.json();
        setActiveSession(null);
        
        await notifyStudents('SESSION_ENDED', {
          sessionId: activeSession.id,
          finalResults: data.results
        });
      }
    } catch (error) {
      alert('Error stopping session: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const notifyStudents = async (event: string, data: any) => {
    // This would typically go through WebSocket, but for now we'll use a simple notification API
    try {
      await fetch('/api/notifications/broadcast', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          classId,
          event,
          data
        })
      });
    } catch (error) {
      console.error('Error notifying students:', error);
    }
  };

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getSessionDuration = (): number => {
    if (!activeSession?.startTime) return 0;
    const start = new Date(activeSession.startTime).getTime();
    const now = Date.now();
    return Math.floor((now - start) / 1000);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Live Session Control</h2>
          <p className="text-gray-600">Manage real-time trading simulations</p>
        </div>
        {!activeSession && (
          <button
            onClick={() => setShowStartModal(true)}
            className="px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center space-x-2"
          >
            <PlayIcon className="h-5 w-5" />
            <span>Start New Session</span>
          </button>
        )}
      </div>

      {/* Active Session Status */}
      {activeSession ? (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="text-xl font-semibold text-gray-900">{activeSession.lesson?.title}</h3>
              <p className="text-gray-600 mt-1">{activeSession.lesson?.description}</p>
              <div className="flex items-center space-x-4 mt-3">
                <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
                  activeSession.status === 'IN_PROGRESS' 
                    ? 'bg-green-100 text-green-800'
                    : activeSession.status === 'PAUSED'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {activeSession.status}
                </span>
                <span className="text-sm text-gray-500">
                  Scenario {activeSession.scenario}
                </span>
                <span className="text-sm text-gray-500 flex items-center">
                  <ClockIcon className="h-4 w-4 mr-1" />
                  {formatDuration(getSessionDuration())}
                </span>
              </div>
            </div>

            <div className="flex space-x-3">
              {activeSession.status === 'IN_PROGRESS' && (
                <button
                  onClick={handlePauseSession}
                  disabled={loading}
                  className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 flex items-center space-x-2"
                >
                  <PauseIcon className="h-4 w-4" />
                  <span>Pause</span>
                </button>
              )}
              
              {activeSession.status === 'PAUSED' && (
                <button
                  onClick={handleResumeSession}
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center space-x-2"
                >
                  <PlayIcon className="h-4 w-4" />
                  <span>Resume</span>
                </button>
              )}

              <button
                onClick={handleStopSession}
                disabled={loading}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center space-x-2"
              >
                <StopIcon className="h-4 w-4" />
                <span>Stop</span>
              </button>
            </div>
          </div>

          {/* Session Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-blue-600">
                {activeSession.participants?.length || 0}
              </div>
              <div className="text-sm text-blue-600">Total Participants</div>
            </div>

            <div className="bg-green-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-green-600">
                {activeSession.participants?.filter(p => p.isConnected).length || 0}
              </div>
              <div className="text-sm text-green-600">Connected</div>
            </div>

            <div className="bg-orange-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-orange-600">
                {activeSession.participants?.filter(p => p.terminalStatus === 'ONLINE').length || 0}
              </div>
              <div className="text-sm text-orange-600">Trading Active</div>
            </div>

            <div className="bg-purple-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-purple-600">
                {activeSession.currentTick || 0}
              </div>
              <div className="text-sm text-purple-600">Current Tick</div>
            </div>
          </div>

          {/* Participant List */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <UserGroupIcon className="h-5 w-5 mr-2" />
              Student Status
            </h4>

            <div className="space-y-2">
              {activeSession.participants?.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No students in session</p>
              ) : (
                activeSession.participants?.map((participant) => (
                  <div key={participant.id} className="flex items-center justify-between bg-white rounded-md p-3">
                    <div className="flex items-center space-x-3">
                      <div className={`w-3 h-3 rounded-full ${
                        participant.terminalStatus === 'ONLINE' 
                          ? 'bg-green-400'
                          : participant.terminalStatus === 'CONNECTING'
                          ? 'bg-yellow-400'
                          : 'bg-red-400'
                      }`} />
                      <div>
                        <div className="font-medium text-gray-900">
                          {participant.firstName} {participant.lastName}
                        </div>
                        <div className="text-sm text-gray-500">@{participant.username}</div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4">
                      {participant.performance && (
                        <>
                          <div className="text-right">
                            <div className={`text-sm font-medium ${
                              participant.performance.totalPnL >= 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              ${participant.performance.totalPnL.toFixed(2)}
                            </div>
                            <div className="text-xs text-gray-500">
                              {participant.performance.tradesExecuted} trades
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium text-gray-900">
                              Risk: {participant.performance.riskScore.toFixed(1)}
                            </div>
                          </div>
                        </>
                      )}

                      <div className="flex items-center space-x-1">
                        {participant.isConnected ? (
                          <CheckCircleIcon className="h-5 w-5 text-green-500" />
                        ) : (
                          <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <div className="text-gray-400 mb-4">
            <ChartBarIcon className="h-16 w-16 mx-auto" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Active Session</h3>
          <p className="text-gray-600 mb-6">Start a new trading simulation session for your students</p>
          <button
            onClick={() => setShowStartModal(true)}
            className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Start New Session
          </button>
        </div>
      )}

      {/* Start Session Modal */}
      {showStartModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Start Trading Session</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Lesson</label>
                <select
                  value={selectedLesson}
                  onChange={(e) => setSelectedLesson(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a lesson</option>
                  {availableLessons.map(lesson => (
                    <option key={lesson.id} value={lesson.id}>
                      {lesson.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Scenario</label>
                <select
                  value={selectedScenario}
                  onChange={(e) => setSelectedScenario(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="A">Scenario A</option>
                  <option value="B">Scenario B</option>
                  <option value="C">Scenario C</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Duration (minutes)</label>
                <input
                  type="number"
                  value={sessionDuration}
                  onChange={(e) => setSessionDuration(parseInt(e.target.value))}
                  min="5"
                  max="120"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowStartModal(false)}
                className="px-4 py-2 text-sm text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleStartSession}
                disabled={loading || !selectedLesson}
                className="px-4 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? 'Starting...' : 'Start Session'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}