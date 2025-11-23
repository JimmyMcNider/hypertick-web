/**
 * Student Session Interface
 * 
 * Simple interface for students to:
 * 1. Enter session ID from instructor
 * 2. Join waiting room
 * 3. Trade when session starts
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  role: string;
}

interface SessionInfo {
  id: string;
  lessonName: string;
  status: 'SETUP' | 'WAITING_ROOM' | 'IN_PROGRESS' | 'COMPLETED';
  waitingStudents: number;
  activeStudents: number;
  startingCash: number;
  duration: number;
}

export default function StudentSessionPage() {
  const [user, setUser] = useState<User | null>(null);
  const [sessionId, setSessionId] = useState('');
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasJoined, setHasJoined] = useState(false);
  
  const router = useRouter();

  useEffect(() => {
    // Check if user is logged in and is student
    const userData = localStorage.getItem('hypertick_user');
    if (!userData) {
      router.push('/simple-login');
      return;
    }

    const parsedUser = JSON.parse(userData);
    if (parsedUser.role !== 'STUDENT') {
      router.push('/simple-login');
      return;
    }

    setUser(parsedUser);
  }, [router]);

  const findSession = async () => {
    if (!sessionId.trim()) {
      setError('Please enter a session ID');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch(`/api/student/session/find?sessionId=${sessionId.trim()}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Session not found');
      }
      
      const data = await response.json();
      setSession(data.session);
      
    } catch (err: any) {
      setError(err.message);
      setSession(null);
    } finally {
      setLoading(false);
    }
  };

  const joinSession = async () => {
    if (!user || !session) return;
    
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/student/session/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: session.id,
          userId: user.id
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to join session');
      }
      
      setHasJoined(true);
      
      // Store session ID for future reference
      localStorage.setItem('student_session_id', session.id);
      
      // Refresh session info
      await findSession();
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Auto-refresh session status when joined
  useEffect(() => {
    if (hasJoined && session) {
      const interval = setInterval(async () => {
        try {
          const response = await fetch(`/api/student/session/find?sessionId=${session.id}`);
          if (response.ok) {
            const data = await response.json();
            setSession(data.session);
          }
        } catch (error) {
          console.error('Failed to refresh session:', error);
        }
      }, 2000);

      return () => clearInterval(interval);
    }
  }, [hasJoined, session]);

  if (!user) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Student Trading Terminal</h1>
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

      <div className="max-w-4xl mx-auto px-4 py-8">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {!session ? (
          /* Session Entry */
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-6">Join Trading Session</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Session ID (from your instructor)
                </label>
                <input
                  type="text"
                  value={sessionId}
                  onChange={(e) => setSessionId(e.target.value)}
                  placeholder="Enter session ID..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <button
                onClick={findSession}
                disabled={loading || !sessionId.trim()}
                className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Finding Session...' : 'Find Session'}
              </button>
            </div>
          </div>
        ) : (
          /* Session Found */
          <div className="space-y-6">
            {/* Session Info */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-xl font-semibold">Trading Session</h2>
                  <p className="text-gray-600">Lesson: <strong>{session.lessonName}</strong></p>
                  <p className="text-gray-600">Session ID: {session.id}</p>
                </div>
                <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                  session.status === 'SETUP' ? 'bg-gray-100 text-gray-800' :
                  session.status === 'WAITING_ROOM' ? 'bg-yellow-100 text-yellow-800' :
                  session.status === 'IN_PROGRESS' ? 'bg-green-100 text-green-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {session.status.replace('_', ' ')}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-gray-50 p-4 rounded">
                  <h3 className="font-medium text-gray-700">Starting Cash</h3>
                  <p className="text-2xl font-bold text-green-600">
                    ${session.startingCash.toLocaleString()}
                  </p>
                </div>
                <div className="bg-gray-50 p-4 rounded">
                  <h3 className="font-medium text-gray-700">Duration</h3>
                  <p className="text-2xl font-bold text-blue-600">
                    {Math.floor(session.duration / 60)}:{(session.duration % 60).toString().padStart(2, '0')}
                  </p>
                </div>
                <div className="bg-gray-50 p-4 rounded">
                  <h3 className="font-medium text-gray-700">Students</h3>
                  <p className="text-2xl font-bold text-purple-600">
                    {session.status === 'WAITING_ROOM' 
                      ? `${session.waitingStudents} waiting`
                      : `${session.activeStudents} active`}
                  </p>
                </div>
              </div>

              {session.status === 'SETUP' && (
                <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
                  <p className="text-yellow-800">
                    ⚙️ Session is being set up by the instructor. Please wait...
                  </p>
                </div>
              )}

              {session.status === 'WAITING_ROOM' && !hasJoined && (
                <button
                  onClick={joinSession}
                  disabled={loading}
                  className="bg-green-600 text-white px-6 py-3 rounded-md hover:bg-green-700 disabled:opacity-50"
                >
                  {loading ? 'Joining...' : 'Join Waiting Room'}
                </button>
              )}

              {session.status === 'WAITING_ROOM' && hasJoined && (
                <div className="bg-blue-50 border border-blue-200 rounded p-4">
                  <p className="text-blue-800">
                    ✅ You've joined the waiting room! Trading will begin when the instructor starts the session.
                  </p>
                </div>
              )}

              {session.status === 'IN_PROGRESS' && (
                <div className="bg-green-50 border border-green-200 rounded p-4">
                  <p className="text-green-800">
                    🚀 Trading session is live! You can now place orders.
                  </p>
                  <button
                    onClick={() => router.push('/simple-student')}
                    className="mt-3 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
                  >
                    Go to Trading Terminal
                  </button>
                </div>
              )}

              {session.status === 'COMPLETED' && (
                <div className="bg-gray-50 border border-gray-200 rounded p-4">
                  <p className="text-gray-800">
                    🏁 This session has ended. Contact your instructor for the next session.
                  </p>
                </div>
              )}
            </div>

            <button
              onClick={() => {
                setSession(null);
                setSessionId('');
                setHasJoined(false);
                setError('');
              }}
              className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
            >
              ← Find Different Session
            </button>
          </div>
        )}
      </div>
    </div>
  );
}