/**
 * Instructor Dashboard - Lesson Management and Session Control
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import LessonManager from '@/components/instructor/LessonManager';
import AnalyticsDashboard from '@/components/instructor/AnalyticsDashboard';
import LessonAuthor from '@/components/instructor/LessonAuthor';
import StudentManagement from '@/components/instructor/StudentManagement';
import SessionControlDashboard from '@/components/instructor/SessionControlDashboard';
import LiveSessionControl from '@/components/instructor/LiveSessionControl';
import SimulationControl from '@/components/instructor/SimulationControl';
import InstructorOnboarding from '@/components/instructor/InstructorOnboarding';

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
  _count?: {
    enrollments: number;
  };
}

export default function InstructorPage() {
  const [user, setUser] = useState<User | null>(null);
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedTab, setSelectedTab] = useState<'lessons' | 'analytics' | 'author' | 'students' | 'live'>('live');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lessonCount, setLessonCount] = useState(0);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

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

      // Check if user is instructor or admin
      if (userData.user.role !== 'INSTRUCTOR' && userData.user.role !== 'ADMIN') {
        router.push('/dashboard');
        return;
      }

      // Get classes
      const classesResponse = await fetch('/api/classes', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (classesResponse.ok) {
        const classesData = await classesResponse.json();
        setClasses(classesData.classes);
        
        // Auto-setup default class if instructor has no classes
        if (classesData.classes.length === 0 && userData.user.role === 'INSTRUCTOR') {
          console.log('🎓 No classes found, setting up default class for instructor...');
          
          try {
            const setupResponse = await fetch('/api/instructor/auto-setup', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            });

            if (setupResponse.ok) {
              const setupData = await setupResponse.json();
              console.log('✅ Auto-setup completed:', setupData);
              
              // Refresh classes after auto-setup
              const refreshResponse = await fetch('/api/classes', {
                headers: { 'Authorization': `Bearer ${token}` }
              });
              
              if (refreshResponse.ok) {
                const refreshedClasses = await refreshResponse.json();
                setClasses(refreshedClasses.classes);
                if (refreshedClasses.classes.length > 0) {
                  setSelectedClass(refreshedClasses.classes[0].id);
                }
              }
            }
          } catch (error) {
            console.error('Auto-setup failed:', error);
          }
        } else if (classesData.classes.length > 0) {
          // Auto-select first class if available
          setSelectedClass(classesData.classes[0].id);
        }
      }

      // Check if user needs onboarding
      const hasCompletedOnboarding = localStorage.getItem('hypertick_onboarding_completed');
      if (!hasCompletedOnboarding && userData.user.role === 'INSTRUCTOR') {
        setShowOnboarding(true);
      }

      // Load lesson count
      const lessonsResponse = await fetch('/api/lessons', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (lessonsResponse.ok) {
        const lessonsData = await lessonsResponse.json();
        const legacyLessons = lessonsData.lessons.filter((lesson: any) => 
          lesson.type === 'LEGACY_LESSON' || lesson.xmlConfig
        );
        setLessonCount(legacyLessons.length);
      }

    } catch (err: any) {
      setError(err.message);
      router.push('/');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      localStorage.removeItem('auth_token');
      router.push('/');
    } catch (err) {
      console.error('Logout error:', err);
      localStorage.removeItem('auth_token');
      router.push('/');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading instructor dashboard...</p>
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

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
  };

  const handleOnboardingSkip = () => {
    setShowOnboarding(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Onboarding Modal */}
      {showOnboarding && (
        <InstructorOnboarding
          user={user}
          onComplete={handleOnboardingComplete}
          onSkip={handleOnboardingSkip}
        />
      )}

      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">HyperTick</h1>
              <span className="ml-3 text-sm text-gray-500">Instructor Dashboard</span>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-sm">
                <span className="text-gray-700">Welcome, </span>
                <span className="font-medium text-gray-900">
                  {user?.firstName} {user?.lastName}
                </span>
                <span className="ml-2 px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                  {user?.role}
                </span>
              </div>
              
              <button
                onClick={() => router.push('/terminal')}
                className="bg-orange-600 text-white px-4 py-2 text-sm rounded-md hover:bg-orange-700 mr-2"
              >
                Trading Terminal
              </button>
              
              <button
                onClick={() => router.push('/dashboard')}
                className="bg-blue-600 text-white px-4 py-2 text-sm rounded-md hover:bg-blue-700 mr-2"
              >
                Student View
              </button>
              
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
        {/* Class Selection */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Class Selection</h2>
          
          {classes.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {classes.map((cls) => (
                <div 
                  key={cls.id} 
                  className={`border-2 rounded-lg p-4 cursor-pointer transition-colors ${
                    selectedClass === cls.id 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedClass(cls.id)}
                >
                  <h3 className="font-medium text-gray-900">{cls.name}</h3>
                  <p className="text-sm text-gray-600">{cls.semester}</p>
                  {cls.section && (
                    <p className="text-sm text-gray-600">Section: {cls.section}</p>
                  )}
                  {cls._count && (
                    <p className="text-sm text-gray-600 mt-2">
                      {cls._count.enrollments} student{cls._count.enrollments !== 1 ? 's' : ''} enrolled
                    </p>
                  )}
                  
                  {selectedClass === cls.id && (
                    <div className="mt-2">
                      <span className="inline-flex items-center px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                        Selected
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">No classes found. Please contact an administrator to set up your classes.</p>
            </div>
          )}
        </div>

        {/* Tab Navigation */}
        {(selectedClass || classes.length === 0) && (
          <div className="bg-white rounded-lg shadow mb-6">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Class Management</h2>
                  <p className="text-gray-600">Manage lessons and analyze student performance</p>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setSelectedTab('lessons')}
                    className={`px-4 py-2 text-sm font-medium rounded-md ${
                      selectedTab === 'lessons'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Lesson Management
                  </button>
                  <button
                    onClick={() => setSelectedTab('analytics')}
                    className={`px-4 py-2 text-sm font-medium rounded-md ${
                      selectedTab === 'analytics'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Analytics Dashboard
                  </button>
                  <button
                    onClick={() => setSelectedTab('students')}
                    className={`px-4 py-2 text-sm font-medium rounded-md ${
                      selectedTab === 'students'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Students
                  </button>
                  <button
                    onClick={() => setSelectedTab('live')}
                    className={`px-4 py-2 text-sm font-medium rounded-md ${
                      selectedTab === 'live'
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    🎯 Session Control
                  </button>
                  <button
                    onClick={() => setSelectedTab('author')}
                    className={`px-4 py-2 text-sm font-medium rounded-md ${
                      selectedTab === 'author'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Lesson Author
                  </button>
                </div>
              </div>
            </div>
            
            {selectedTab === 'lessons' && (
              <LessonManager 
                user={user}
                classId={selectedClass || 'demo-class'}
                socket={null} // Will be enhanced with WebSocket connection
              />
            )}
            
            {selectedTab === 'analytics' && (
              <AnalyticsDashboard
                user={user}
                classId={selectedClass || 'demo-class'}
                socket={null} // Will be enhanced with WebSocket connection
              />
            )}
            
            {selectedTab === 'students' && (
              <StudentManagement
                user={user}
                classId={selectedClass || 'demo-class'}
              />
            )}
            
            {selectedTab === 'live' && (
              <SessionControlDashboard
                user={user}
                classId={selectedClass || 'demo-class'}
              />
            )}
            
            {selectedTab === 'author' && (
              <LessonAuthor
                user={user}
                classId={selectedClass || 'demo-class'}
              />
            )}
          </div>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-2xl font-bold text-blue-600">{classes.length}</div>
            <div className="text-sm text-gray-600">Active Classes</div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-2xl font-bold text-green-600">
              {classes.reduce((sum, cls) => sum + (cls._count?.enrollments || 0), 0)}
            </div>
            <div className="text-sm text-gray-600">Total Students</div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-2xl font-bold text-purple-600">0</div>
            <div className="text-sm text-gray-600">Active Sessions</div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-2xl font-bold text-orange-600">{lessonCount}</div>
            <div className="text-sm text-gray-600">Legacy Lessons Available</div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow p-6 mt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
          <div className="text-center py-8">
            <p className="text-gray-500">No recent activity. Start a lesson to see session logs here.</p>
          </div>
        </div>
      </main>
    </div>
  );
}