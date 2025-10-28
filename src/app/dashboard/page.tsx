/**
 * Dashboard Page - Main interface after login
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  role: 'STUDENT' | 'INSTRUCTOR' | 'ADMIN';
}

interface Class {
  id: string;
  name: string;
  semester: string;
  section?: string;
  instructor?: {
    username: string;
    firstName: string;
    lastName: string;
  };
  _count?: {
    enrollments: number;
  };
}

interface Session {
  id: string;
  scenario: string;
  status: string;
  duration: number;
  createdAt: string;
  lesson: {
    name: string;
    description?: string;
  };
  class: {
    name: string;
    semester: string;
    section?: string;
  };
}

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [classes, setClasses] = useState<Class[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [countdownMessage, setCountdownMessage] = useState<string>('');
  const [showJoinBanner, setShowJoinBanner] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    // Poll for active sessions every 5 seconds
    const pollForActiveSessions = async () => {
      if (!user) return;
      
      try {
        const token = localStorage.getItem('auth_token');
        const response = await fetch('/api/sessions', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          const activeSessions = data.sessions.filter((session: Session) => 
            session.status === 'IN_PROGRESS' || session.status === 'PENDING'
          );
          
          if (activeSessions.length > 0 && !activeSession) {
            const newActiveSession = activeSessions[0];
            setActiveSession(newActiveSession);
            setShowJoinBanner(true);
            console.log(`🎯 New active session detected: ${newActiveSession.lesson.name}`);
          } else if (activeSessions.length === 0 && activeSession) {
            // Session ended
            setActiveSession(null);
            setShowJoinBanner(false);
            setCountdownMessage('');
            console.log('📝 Active session ended');
          }
        }
      } catch (error) {
        console.error('Error polling for active sessions:', error);
      }
    };

    let pollInterval: NodeJS.Timeout;
    if (user) {
      pollInterval = setInterval(pollForActiveSessions, 5000); // Poll every 5 seconds
    }

    return () => {
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [user, activeSession]);

  const checkAuth = async () => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      router.push('/');
      return;
    }

    try {
      // Get current user
      const userResponse = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!userResponse.ok) {
        throw new Error('Authentication failed');
      }

      const userData = await userResponse.json();
      setUser(userData.user);

      // Get classes
      const classesResponse = await fetch('/api/classes', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (classesResponse.ok) {
        const classesData = await classesResponse.json();
        setClasses(classesData.classes);
      }

      // Get sessions
      const sessionsResponse = await fetch('/api/sessions', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (sessionsResponse.ok) {
        const sessionsData = await sessionsResponse.json();
        setSessions(sessionsData.sessions);
        
        // Check for active sessions that student can join
        const activeSessions = sessionsData.sessions.filter((session: Session) => 
          session.status === 'IN_PROGRESS' || session.status === 'PENDING'
        );
        
        if (activeSessions.length > 0) {
          const activeSession = activeSessions[0]; // Join the first active session
          setActiveSession(activeSession);
          setShowJoinBanner(true);
          console.log(`🎯 Active session detected: ${activeSession.lesson.name}`);
        }
      }
      
      // Also check specifically for active sessions for this user
      const activeSessionResponse = await fetch('/api/sessions/active', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (activeSessionResponse.ok) {
        const activeSessionData = await activeSessionResponse.json();
        if (activeSessionData.session) {
          console.log(`🔄 User already in active session: ${activeSessionData.session.lessonTitle}`);
          // Auto-redirect to terminal if already in session
          router.push(`/terminal?session=${activeSessionData.session.id}`);
          return;
        }
      }

    } catch (err: any) {
      setError(err.message);
      router.push('/');
    } finally {
      setLoading(false);
    }
  };

  const joinLiveSession = async () => {
    if (!activeSession || !user) return;
    
    try {
      console.log(`🚀 Joining live session: ${activeSession.lesson.name}`);
      setCountdownMessage('Joining session...');
      
      const token = localStorage.getItem('auth_token');
      
      // Join the session via API
      const joinResponse = await fetch(`/api/sessions/${activeSession.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          action: 'JOIN_SESSION',
          userId: user.id
        })
      });
      
      if (joinResponse.ok) {
        const joinData = await joinResponse.json();
        console.log('✅ Successfully joined session');
        
        // Show countdown message
        setCountdownMessage('Get ready! Session starting soon...');
        
        // Redirect to trading terminal
        setTimeout(() => {
          router.push(`/terminal?session=${activeSession.id}&lesson=${activeSession.lesson.name}`);
        }, 2000);
      } else {
        console.error('Failed to join session');
        setCountdownMessage('Failed to join session. Please try again.');
      }
    } catch (error) {
      console.error('Error joining session:', error);
      setCountdownMessage('Error joining session. Please try again.');
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      localStorage.removeItem('auth_token');
      router.push('/');
    } catch (err) {
      console.error('Logout error:', err);
      // Force logout even if API call fails
      localStorage.removeItem('auth_token');
      router.push('/');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'IN_PROGRESS': return 'bg-green-100 text-green-800';
      case 'PAUSED': return 'bg-yellow-100 text-yellow-800';
      case 'COMPLETED': return 'bg-gray-100 text-gray-800';
      case 'PENDING': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">{error}</p>
          <button 
            onClick={() => router.push('/')}
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            Return to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">HyperTick</h1>
              <span className="ml-3 text-sm text-gray-500">Trading Simulation Platform</span>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-sm">
                <span className="text-gray-700">Welcome, </span>
                <span className="font-medium text-gray-900">
                  {user?.firstName} {user?.lastName}
                </span>
                <span className="ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                  {user?.role}
                </span>
              </div>
              <button
                onClick={() => router.push('/terminal')}
                className="bg-orange-600 text-white px-4 py-2 text-sm rounded-md hover:bg-orange-700 mr-2"
              >
                Trading Terminal
              </button>
              {(user?.role === 'INSTRUCTOR' || user?.role === 'ADMIN') && (
                <button
                  onClick={() => router.push('/instructor')}
                  className="bg-green-600 text-white px-4 py-2 text-sm rounded-md hover:bg-green-700 mr-2"
                >
                  Instructor Dashboard
                </button>
              )}
              <button
                onClick={handleLogout}
                className="bg-gray-600 text-white px-4 py-2 text-sm rounded-md hover:bg-gray-700"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          
          {/* Live Session Join Banner */}
          {showJoinBanner && activeSession && (
            <div className="bg-gradient-to-r from-green-500 to-blue-600 rounded-lg shadow-lg p-6 text-white">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center">
                    <div className="bg-white bg-opacity-20 rounded-full p-2 mr-4">
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold">🚀 Live Trading Session Available!</h3>
                      <p className="text-green-100 mt-1">
                        <strong>{activeSession.lesson.name}</strong> • {activeSession.scenario}
                      </p>
                      <p className="text-green-100 text-sm">
                        Class: {activeSession.class.name} • Status: {activeSession.status}
                      </p>
                    </div>
                  </div>
                  
                  {countdownMessage && (
                    <div className="mt-3 bg-white bg-opacity-20 rounded-md p-3">
                      <p className="text-sm font-medium">{countdownMessage}</p>
                    </div>
                  )}
                </div>
                
                <div className="ml-6">
                  <button
                    onClick={joinLiveSession}
                    className="bg-white text-green-600 font-bold py-3 px-6 rounded-lg hover:bg-green-50 transition-colors shadow-lg"
                    disabled={!!countdownMessage}
                  >
                    {countdownMessage ? 'Joining...' : 'JOIN LIVE TRADING'}
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {/* Welcome Section */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Dashboard Overview</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{classes.length}</div>
                <div className="text-sm text-blue-800">
                  {user?.role === 'INSTRUCTOR' ? 'Classes Teaching' : 'Classes Enrolled'}
                </div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{sessions.length}</div>
                <div className="text-sm text-green-800">Total Sessions</div>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">
                  {sessions.filter(s => s.status === 'IN_PROGRESS').length}
                </div>
                <div className="text-sm text-purple-800">Active Sessions</div>
              </div>
            </div>
          </div>

          {/* Classes Section */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">
                {user?.role === 'INSTRUCTOR' ? 'My Classes' : 'Enrolled Classes'}
              </h3>
            </div>
            <div className="p-6">
              {classes.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">
                    {user?.role === 'INSTRUCTOR' 
                      ? 'No classes created yet.' 
                      : 'Not enrolled in any classes yet.'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {classes.map((cls) => (
                    <div key={cls.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <h4 className="font-medium text-gray-900">{cls.name}</h4>
                      <p className="text-sm text-gray-600">{cls.semester}</p>
                      {cls.section && (
                        <p className="text-sm text-gray-600">Section: {cls.section}</p>
                      )}
                      {cls.instructor && (
                        <p className="text-sm text-gray-600">
                          Instructor: {cls.instructor.firstName} {cls.instructor.lastName}
                        </p>
                      )}
                      {cls._count && (
                        <p className="text-sm text-gray-600">
                          {cls._count.enrollments} student{cls._count.enrollments !== 1 ? 's' : ''}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Recent Sessions */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Recent Sessions</h3>
            </div>
            <div className="p-6">
              {sessions.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">No sessions found.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Lesson
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Class
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Scenario
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Duration
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Created
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {sessions.slice(0, 10).map((session) => (
                        <tr key={session.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {session.lesson.name}
                            </div>
                            {session.lesson.description && (
                              <div className="text-sm text-gray-500">
                                {session.lesson.description}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{session.class.name}</div>
                            <div className="text-sm text-gray-500">{session.class.semester}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {session.scenario}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(session.status)}`}>
                              {session.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {Math.floor(session.duration / 60)}m {session.duration % 60}s
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(session.createdAt).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* System Status */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">System Status</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Database Connection</span>
                <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                  ● Online
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">WebSocket Server</span>
                <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                  ● Ready
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Session Engine</span>
                <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                  ● Active
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">XML Parser</span>
                <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                  ● Loaded
                </span>
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}