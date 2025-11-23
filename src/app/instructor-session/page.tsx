/**
 * Instructor Session Management Interface
 * 
 * Proper upTick-style session management with:
 * 1. Lesson selection
 * 2. Session setup (starting cash, duration)  
 * 3. Waiting room management
 * 4. Session control (start/stop)
 * 5. Real-time monitoring
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Lesson {
  id: string;
  name: string;
  description: string;
}

interface InstructorSession {
  id: string;
  instructorId: string;
  lessonId: string;
  lessonName: string;
  status: 'SETUP' | 'WAITING_ROOM' | 'IN_PROGRESS' | 'COMPLETED';
  createdAt: string;
  startedAt?: string;
  endedAt?: string;
  startingCash: number;
  duration: number;
  waitingStudents: string[];
  activeStudents: string[];
  portfolios: Record<string, any>;
  orders: any[];
}

interface User {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  role: string;
}

export default function InstructorSessionPage() {
  const [user, setUser] = useState<User | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [currentSession, setCurrentSession] = useState<InstructorSession | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Session creation form
  const [selectedLessonId, setSelectedLessonId] = useState('');
  const [startingCash, setStartingCash] = useState(1000000);
  const [duration, setDuration] = useState(300);
  
  const router = useRouter();

  useEffect(() => {
    // Check if user is logged in and is instructor
    const userData = localStorage.getItem('hypertick_user');
    if (!userData) {
      router.push('/simple-login');
      return;
    }

    const parsedUser = JSON.parse(userData);
    if (parsedUser.role !== 'INSTRUCTOR') {
      router.push('/simple-login');
      return;
    }

    setUser(parsedUser);
    loadData();
  }, [router]);

  const loadData = async () => {
    try {
      // Load available lessons
      const lessonsResponse = await fetch('/api/instructor/lessons');
      if (lessonsResponse.ok) {
        const lessonsData = await lessonsResponse.json();
        setLessons(lessonsData.lessons);
        
        // Set default to Price Formation if available
        const priceFormation = lessonsData.lessons.find((l: Lesson) => l.name === 'Price Formation');
        if (priceFormation) {
          setSelectedLessonId(priceFormation.id);
        }
      }
      
      // Load current session if any
      if (user) {
        const sessionResponse = await fetch(`/api/instructor/session?instructorId=${user.id}`);
        if (sessionResponse.ok) {
          const sessionData = await sessionResponse.json();
          if (sessionData.session) {
            setCurrentSession(sessionData.session);
          }
        }
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  };

  const createSession = async () => {
    if (!user || !selectedLessonId) return;
    
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/instructor/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instructorId: user.id,
          lessonId: selectedLessonId,
          startingCash,
          duration
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create session');
      }
      
      const data = await response.json();
      setCurrentSession(data.session);
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateSessionStatus = async (action: string) => {
    if (!currentSession) return;
    
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/instructor/session', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: currentSession.id,
          action
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to ${action} session`);
      }
      
      const data = await response.json();
      setCurrentSession(data.session);
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const openWaitingRoom = () => updateSessionStatus('open_waiting_room');
  const startSession = () => updateSessionStatus('start');
  const endSession = () => updateSessionStatus('end');

  // Auto-refresh session data
  useEffect(() => {
    if (currentSession && user) {
      const interval = setInterval(async () => {
        try {
          const response = await fetch(`/api/instructor/session?instructorId=${user.id}`);
          if (response.ok) {
            const data = await response.json();
            if (data.session) {
              setCurrentSession(data.session);
            }
          }
        } catch (error) {
          console.error('Failed to refresh session:', error);
        }
      }, 2000);

      return () => clearInterval(interval);
    }
  }, [currentSession, user]);

  if (!user) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Instructor Session Management</h1>
              <p className="text-gray-600">Welcome, {user.firstName} {user.lastName}</p>
            </div>
            <button
              onClick={() => {
                localStorage.removeItem('hypertick_user');
                router.push('/simple-login');
              }}
              className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {!currentSession ? (
          /* Session Creation */
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-6">Create New Session</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Lesson
                </label>
                <select
                  value={selectedLessonId}
                  onChange={(e) => setSelectedLessonId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Choose a lesson...</option>
                  {lessons.map(lesson => (
                    <option key={lesson.id} value={lesson.id}>
                      {lesson.name}
                    </option>
                  ))}
                </select>
                {selectedLessonId && (
                  <p className="text-sm text-gray-600 mt-1">
                    {lessons.find(l => l.id === selectedLessonId)?.description}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Starting Cash (per student)
                </label>
                <select
                  value={startingCash}
                  onChange={(e) => setStartingCash(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={50000}>$50,000</option>
                  <option value={100000}>$100,000</option>
                  <option value={250000}>$250,000</option>
                  <option value={500000}>$500,000</option>
                  <option value={1000000}>$1,000,000</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Session Duration
                </label>
                <select
                  value={duration}
                  onChange={(e) => setDuration(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={180}>3 minutes</option>
                  <option value={300}>5 minutes</option>
                  <option value={600}>10 minutes</option>
                  <option value={900}>15 minutes</option>
                  <option value={1800}>30 minutes</option>
                </select>
              </div>
            </div>

            <button
              onClick={createSession}
              disabled={loading || !selectedLessonId}
              className="mt-6 bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Creating Session...' : 'Create Session'}
            </button>
          </div>
        ) : (
          /* Session Management */
          <div className="space-y-6">
            {/* Session Status */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-xl font-semibold">Current Session</h2>
                  <p className="text-gray-600">Lesson: <strong>{currentSession.lessonName}</strong></p>
                  <p className="text-gray-600">Session ID: {currentSession.id}</p>
                </div>
                <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                  currentSession.status === 'SETUP' ? 'bg-gray-100 text-gray-800' :
                  currentSession.status === 'WAITING_ROOM' ? 'bg-yellow-100 text-yellow-800' :
                  currentSession.status === 'IN_PROGRESS' ? 'bg-green-100 text-green-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {currentSession.status.replace('_', ' ')}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-gray-50 p-4 rounded">
                  <h3 className="font-medium text-gray-700">Starting Cash</h3>
                  <p className="text-2xl font-bold text-green-600">
                    ${currentSession.startingCash.toLocaleString()}
                  </p>
                </div>
                <div className="bg-gray-50 p-4 rounded">
                  <h3 className="font-medium text-gray-700">Duration</h3>
                  <p className="text-2xl font-bold text-blue-600">
                    {Math.floor(currentSession.duration / 60)}:{(currentSession.duration % 60).toString().padStart(2, '0')}
                  </p>
                </div>
                <div className="bg-gray-50 p-4 rounded">
                  <h3 className="font-medium text-gray-700">
                    {currentSession.status === 'WAITING_ROOM' ? 'Waiting Students' : 'Active Students'}
                  </h3>
                  <p className="text-2xl font-bold text-purple-600">
                    {currentSession.status === 'WAITING_ROOM' 
                      ? currentSession.waitingStudents.length
                      : currentSession.activeStudents.length}
                  </p>
                </div>
              </div>

              {/* Session Controls */}
              <div className="flex space-x-4">
                {currentSession.status === 'SETUP' && (
                  <button
                    onClick={openWaitingRoom}
                    disabled={loading}
                    className="bg-yellow-600 text-white px-4 py-2 rounded-md hover:bg-yellow-700 disabled:opacity-50"
                  >
                    Open Waiting Room
                  </button>
                )}
                
                {currentSession.status === 'WAITING_ROOM' && (
                  <button
                    onClick={startSession}
                    disabled={loading || currentSession.waitingStudents.length === 0}
                    className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50"
                  >
                    Start Session
                  </button>
                )}
                
                {currentSession.status === 'IN_PROGRESS' && (
                  <button
                    onClick={endSession}
                    disabled={loading}
                    className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 disabled:opacity-50"
                  >
                    End Session
                  </button>
                )}
                
                {currentSession.status === 'COMPLETED' && (
                  <button
                    onClick={() => setCurrentSession(null)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                  >
                    Create New Session
                  </button>
                )}
              </div>
            </div>

            {/* Waiting Room */}
            {currentSession.status === 'WAITING_ROOM' && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-4">Waiting Room</h3>
                <p className="text-gray-600 mb-4">
                  Students can join using session ID: <strong>{currentSession.id}</strong>
                </p>
                <div className="bg-blue-50 border border-blue-200 rounded p-4">
                  <p className="text-blue-800">
                    👥 {currentSession.waitingStudents.length} students waiting to join
                  </p>
                  <p className="text-sm text-blue-600 mt-1">
                    Students will automatically enter when you start the session
                  </p>
                </div>
              </div>
            )}

            {/* Active Trading */}
            {currentSession.status === 'IN_PROGRESS' && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-4">Live Trading Session</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium mb-2">Session Statistics</h4>
                    <p>Active Students: {currentSession.activeStudents.length}</p>
                    <p>Total Orders: {currentSession.orders.length}</p>
                    <p>Started: {currentSession.startedAt ? new Date(currentSession.startedAt).toLocaleTimeString() : 'N/A'}</p>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Quick Actions</h4>
                    <p className="text-gray-600">Session controls will be added here</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}