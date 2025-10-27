/**
 * Instructor Analytics - Performance Tracking and Session Analytics
 * 
 * Provides comprehensive analytics specifically designed for instructors
 * to track session performance, student progress, and teaching effectiveness
 */

'use client';

import { useState, useEffect } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { positionService } from '@/lib/position-service';
import { enhancedSessionEngine } from '@/lib/enhanced-session-engine';

interface InstructorAnalyticsProps {
  user: any;
  classId: string;
  sessionId?: string;
}

interface SessionMetrics {
  id: string;
  name: string;
  status: 'active' | 'completed' | 'paused';
  participants: number;
  duration: number;
  startTime: Date;
  endTime?: Date;
  averageScore: number;
  completionRate: number;
  engagementLevel: 'high' | 'medium' | 'low';
}

interface StudentProgress {
  id: string;
  name: string;
  totalTrades: number;
  pnl: number;
  accuracy: number;
  engagementScore: number;
  lessonCompletion: number;
  riskScore: number;
  lastActivity: Date;
  strengths: string[];
  areasForImprovement: string[];
}

interface LessonAnalytics {
  lessonId: string;
  lessonName: string;
  averageCompletion: number;
  averageScore: number;
  commonMistakes: Array<{
    concept: string;
    frequency: number;
    impact: 'high' | 'medium' | 'low';
  }>;
  timeToComplete: number;
  retryRate: number;
  successFactors: string[];
}

interface ClassroomInsights {
  totalSessions: number;
  totalStudents: number;
  averageEngagement: number;
  performanceDistribution: {
    excellent: number;
    good: number;
    average: number;
    needsImprovement: number;
  };
  trendingTopics: Array<{
    topic: string;
    interest: number;
    difficulty: number;
  }>;
  recommendedActions: Array<{
    priority: 'high' | 'medium' | 'low';
    action: string;
    reason: string;
  }>;
}

export default function InstructorAnalytics({ user, classId, sessionId }: InstructorAnalyticsProps) {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'sessions' | 'students' | 'lessons' | 'insights'>('sessions');
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month' | 'semester'>('week');
  
  const [sessionMetrics, setSessionMetrics] = useState<SessionMetrics[]>([]);
  const [studentProgress, setStudentProgress] = useState<StudentProgress[]>([]);
  const [lessonAnalytics, setLessonAnalytics] = useState<LessonAnalytics[]>([]);
  const [classroomInsights, setClassroomInsights] = useState<ClassroomInsights | null>(null);

  const { connected, socket } = useWebSocket({ 
    sessionId: sessionId || '', 
    userId: user?.id || '', 
    role: 'Instructor' 
  });

  useEffect(() => {
    loadAnalyticsData();
  }, [classId, timeRange]);

  useEffect(() => {
    if (connected && socket) {
      socket.on('session_updated', handleSessionUpdate);
      socket.on('student_progress_updated', handleStudentProgressUpdate);
      
      return () => {
        socket.off('session_updated', handleSessionUpdate);
        socket.off('student_progress_updated', handleStudentProgressUpdate);
      };
    }
  }, [connected, socket]);

  const loadAnalyticsData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadSessionMetrics(),
        loadStudentProgress(),
        loadLessonAnalytics(),
        loadClassroomInsights()
      ]);
    } catch (error) {
      console.error('Failed to load analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSessionMetrics = async () => {
    // Simulate loading session metrics
    const mockSessions: SessionMetrics[] = [
      {
        id: 'session_1',
        name: 'Market Microstructure Basics',
        status: 'completed',
        participants: 24,
        duration: 45,
        startTime: new Date(Date.now() - 2 * 60 * 60 * 1000),
        endTime: new Date(Date.now() - 1.25 * 60 * 60 * 1000),
        averageScore: 87.5,
        completionRate: 95.8,
        engagementLevel: 'high'
      },
      {
        id: 'session_2',
        name: 'Options Pricing Models',
        status: 'active',
        participants: 22,
        duration: 30,
        startTime: new Date(Date.now() - 30 * 60 * 1000),
        averageScore: 73.2,
        completionRate: 68.2,
        engagementLevel: 'medium'
      },
      {
        id: 'session_3',
        name: 'Portfolio Risk Management',
        status: 'paused',
        participants: 26,
        duration: 0,
        startTime: new Date(Date.now() - 10 * 60 * 1000),
        averageScore: 0,
        completionRate: 0,
        engagementLevel: 'low'
      }
    ];
    setSessionMetrics(mockSessions);
  };

  const loadStudentProgress = async () => {
    // Simulate loading student progress data
    const mockProgress: StudentProgress[] = [
      {
        id: 'student_1',
        name: 'Alice Johnson',
        totalTrades: 47,
        pnl: 2350.50,
        accuracy: 78.7,
        engagementScore: 92,
        lessonCompletion: 85,
        riskScore: 7.2,
        lastActivity: new Date(Date.now() - 5 * 60 * 1000),
        strengths: ['Quick decision making', 'Risk management', 'Technical analysis'],
        areasForImprovement: ['Position sizing', 'Patience in execution']
      },
      {
        id: 'student_2',
        name: 'Bob Chen',
        totalTrades: 32,
        pnl: -890.25,
        accuracy: 45.3,
        engagementScore: 67,
        lessonCompletion: 72,
        riskScore: 4.1,
        lastActivity: new Date(Date.now() - 15 * 60 * 1000),
        strengths: ['Fundamental analysis', 'Research skills'],
        areasForImprovement: ['Emotional control', 'Risk management', 'Trade timing']
      },
      {
        id: 'student_3',
        name: 'Carol Davis',
        totalTrades: 61,
        pnl: 1789.75,
        accuracy: 82.1,
        engagementScore: 89,
        lessonCompletion: 91,
        riskScore: 8.5,
        lastActivity: new Date(Date.now() - 2 * 60 * 1000),
        strengths: ['Consistent performance', 'Strategy implementation', 'Market timing'],
        areasForImprovement: ['Diversification', 'Advanced derivatives']
      }
    ];
    setStudentProgress(mockProgress);
  };

  const loadLessonAnalytics = async () => {
    // Simulate loading lesson analytics
    const mockLessons: LessonAnalytics[] = [
      {
        lessonId: 'lesson_1',
        lessonName: 'Price Formation Mechanics',
        averageCompletion: 91.2,
        averageScore: 84.7,
        commonMistakes: [
          { concept: 'Bid-ask spread calculation', frequency: 23, impact: 'medium' },
          { concept: 'Market order impact', frequency: 17, impact: 'high' },
          { concept: 'Liquidity provision', frequency: 12, impact: 'low' }
        ],
        timeToComplete: 28.5,
        retryRate: 15.3,
        successFactors: ['Interactive simulations', 'Real-time feedback', 'Peer collaboration']
      },
      {
        lessonId: 'lesson_2',
        lessonName: 'Option Greeks and Hedging',
        averageCompletion: 76.8,
        averageScore: 71.2,
        commonMistakes: [
          { concept: 'Delta hedging frequency', frequency: 34, impact: 'high' },
          { concept: 'Gamma scalping', frequency: 28, impact: 'high' },
          { concept: 'Theta decay timing', frequency: 19, impact: 'medium' }
        ],
        timeToComplete: 42.7,
        retryRate: 28.1,
        successFactors: ['Visual representations', 'Step-by-step guidance']
      }
    ];
    setLessonAnalytics(mockLessons);
  };

  const loadClassroomInsights = async () => {
    // Simulate loading classroom insights
    const mockInsights: ClassroomInsights = {
      totalSessions: 47,
      totalStudents: 28,
      averageEngagement: 82.3,
      performanceDistribution: {
        excellent: 25,
        good: 43,
        average: 25,
        needsImprovement: 7
      },
      trendingTopics: [
        { topic: 'Cryptocurrency Trading', interest: 94, difficulty: 72 },
        { topic: 'ESG Investing', interest: 87, difficulty: 45 },
        { topic: 'Algorithmic Trading', interest: 83, difficulty: 89 }
      ],
      recommendedActions: [
        {
          priority: 'high',
          action: 'Schedule additional derivatives practice session',
          reason: 'Students showing 28% retry rate on options lessons'
        },
        {
          priority: 'medium',
          action: 'Implement peer mentoring program',
          reason: 'Top performers can help struggling students'
        },
        {
          priority: 'medium',
          action: 'Add cryptocurrency trading module',
          reason: 'High student interest (94%) in crypto topics'
        }
      ]
    };
    setClassroomInsights(mockInsights);
  };

  const handleSessionUpdate = (data: any) => {
    setSessionMetrics(prev => prev.map(session => 
      session.id === data.sessionId 
        ? { ...session, ...data.metrics }
        : session
    ));
  };

  const handleStudentProgressUpdate = (data: any) => {
    setStudentProgress(prev => prev.map(student => 
      student.id === data.studentId 
        ? { ...student, ...data.progress }
        : student
    ));
  };

  const formatDuration = (minutes: number): string => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const getEngagementColor = (level: string): string => {
    switch (level) {
      case 'high': return 'text-green-600 bg-green-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getPnLColor = (pnl: number): string => {
    return pnl >= 0 ? 'text-green-600' : 'text-red-600';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading instructor analytics...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900">Instructor Analytics</h2>
          <div className="flex space-x-4">
            <select 
              value={timeRange} 
              onChange={(e) => setTimeRange(e.target.value as any)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="semester">This Semester</option>
            </select>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-medium text-blue-900">Active Sessions</h3>
            <p className="text-2xl font-bold text-blue-600">
              {sessionMetrics.filter(s => s.status === 'active').length}
            </p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <h3 className="font-medium text-green-900">Avg Engagement</h3>
            <p className="text-2xl font-bold text-green-600">
              {classroomInsights?.averageEngagement.toFixed(1)}%
            </p>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <h3 className="font-medium text-purple-900">Total Students</h3>
            <p className="text-2xl font-bold text-purple-600">
              {classroomInsights?.totalStudents}
            </p>
          </div>
          <div className="bg-orange-50 p-4 rounded-lg">
            <h3 className="font-medium text-orange-900">Sessions Today</h3>
            <p className="text-2xl font-bold text-orange-600">
              {sessionMetrics.filter(s => 
                new Date(s.startTime).toDateString() === new Date().toDateString()
              ).length}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {['sessions', 'students', 'lessons', 'insights'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`py-2 px-1 border-b-2 font-medium text-sm capitalize ${
                  activeTab === tab
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

      {/* Tab Content */}
      {activeTab === 'sessions' && (
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Session Performance</h3>
          <div className="space-y-4">
            {sessionMetrics.map((session) => (
              <div key={session.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="font-medium text-gray-900">{session.name}</h4>
                    <p className="text-sm text-gray-500">
                      {session.participants} participants • Started {formatDuration(
                        Math.floor((Date.now() - session.startTime.getTime()) / (1000 * 60))
                      )} ago
                    </p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getEngagementColor(session.engagementLevel)}`}>
                    {session.status} • {session.engagementLevel} engagement
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-4 mt-3">
                  <div>
                    <span className="text-sm text-gray-500">Avg Score</span>
                    <p className="text-lg font-semibold">{session.averageScore.toFixed(1)}%</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Completion</span>
                    <p className="text-lg font-semibold">{session.completionRate.toFixed(1)}%</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Duration</span>
                    <p className="text-lg font-semibold">{formatDuration(session.duration)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'students' && (
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Student Progress</h3>
          <div className="space-y-4">
            {studentProgress.map((student) => (
              <div key={student.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="font-medium text-gray-900">{student.name}</h4>
                    <p className="text-sm text-gray-500">
                      Last active {Math.floor((Date.now() - student.lastActivity.getTime()) / (1000 * 60))} min ago
                    </p>
                  </div>
                  <span className={`text-lg font-semibold ${getPnLColor(student.pnl)}`}>
                    ${student.pnl.toFixed(2)}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                  <div>
                    <span className="text-sm text-gray-500">Trades</span>
                    <p className="text-lg font-semibold">{student.totalTrades}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Accuracy</span>
                    <p className="text-lg font-semibold">{student.accuracy.toFixed(1)}%</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Engagement</span>
                    <p className="text-lg font-semibold">{student.engagementScore}%</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Completion</span>
                    <p className="text-lg font-semibold">{student.lessonCompletion}%</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Strengths: </span>
                    <span className="text-green-600">{student.strengths.join(', ')}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Areas for improvement: </span>
                    <span className="text-orange-600">{student.areasForImprovement.join(', ')}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'lessons' && (
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Lesson Analytics</h3>
          <div className="space-y-6">
            {lessonAnalytics.map((lesson) => (
              <div key={lesson.lessonId} className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3">{lesson.lessonName}</h4>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <span className="text-sm text-gray-500">Completion Rate</span>
                    <p className="text-lg font-semibold">{lesson.averageCompletion.toFixed(1)}%</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Avg Score</span>
                    <p className="text-lg font-semibold">{lesson.averageScore.toFixed(1)}%</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Avg Time</span>
                    <p className="text-lg font-semibold">{formatDuration(lesson.timeToComplete)}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Retry Rate</span>
                    <p className="text-lg font-semibold">{lesson.retryRate.toFixed(1)}%</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <h5 className="font-medium text-gray-800 mb-2">Common Mistakes</h5>
                    <div className="space-y-2">
                      {lesson.commonMistakes.map((mistake, index) => (
                        <div key={index} className="flex justify-between items-center text-sm">
                          <span>{mistake.concept}</span>
                          <div className="flex items-center space-x-2">
                            <span className="text-gray-500">{mistake.frequency} students</span>
                            <span className={`px-2 py-1 rounded text-xs ${
                              mistake.impact === 'high' ? 'bg-red-100 text-red-800' :
                              mistake.impact === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                              {mistake.impact} impact
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h5 className="font-medium text-gray-800 mb-2">Success Factors</h5>
                    <div className="flex flex-wrap gap-2">
                      {lesson.successFactors.map((factor, index) => (
                        <span key={index} className="px-2 py-1 bg-green-100 text-green-800 rounded text-sm">
                          {factor}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'insights' && classroomInsights && (
        <div className="space-y-6">
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Performance Distribution</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {classroomInsights.performanceDistribution.excellent}%
                </div>
                <div className="text-sm text-gray-500">Excellent</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {classroomInsights.performanceDistribution.good}%
                </div>
                <div className="text-sm text-gray-500">Good</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">
                  {classroomInsights.performanceDistribution.average}%
                </div>
                <div className="text-sm text-gray-500">Average</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {classroomInsights.performanceDistribution.needsImprovement}%
                </div>
                <div className="text-sm text-gray-500">Needs Improvement</div>
              </div>
            </div>
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Trending Topics</h3>
            <div className="space-y-3">
              {classroomInsights.trendingTopics.map((topic, index) => (
                <div key={index} className="flex justify-between items-center">
                  <span className="font-medium">{topic.topic}</span>
                  <div className="flex items-center space-x-4 text-sm">
                    <div className="flex items-center">
                      <span className="text-gray-500 mr-2">Interest:</span>
                      <span className="font-semibold text-blue-600">{topic.interest}%</span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-gray-500 mr-2">Difficulty:</span>
                      <span className="font-semibold text-orange-600">{topic.difficulty}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Recommended Actions</h3>
            <div className="space-y-3">
              {classroomInsights.recommendedActions.map((action, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-3">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-medium">{action.action}</span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      action.priority === 'high' ? 'bg-red-100 text-red-800' :
                      action.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {action.priority} priority
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">{action.reason}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}