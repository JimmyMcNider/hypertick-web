/**
 * Analytics Dashboard - Lesson Performance and Student Analytics
 * 
 * Provides comprehensive analytics for instructors to evaluate
 * lesson effectiveness and student learning progress
 */

'use client';

import { useState, useEffect } from 'react';

interface AnalyticsProps {
  user: any;
  classId: string;
  socket: any;
}

interface SessionAnalytics {
  sessionId: string;
  lessonTitle: string;
  scenario: string;
  startTime: Date;
  endTime?: Date;
  participantCount: number;
  completionRate: number;
  avgPerformance: {
    totalPnL: number;
    sharpeRatio: number;
    riskScore: number;
    activeTime: number;
  };
  objectiveCompletion: { [objective: string]: number };
  engagementMetrics: {
    privilegesUsed: number;
    commandsExecuted: number;
    newsResponseRate: number;
    tradingActivity: number;
  };
}

interface StudentProgress {
  userId: string;
  username: string;
  sessionsCompleted: number;
  avgPerformance: number;
  skillProgression: {
    riskManagement: number;
    executionTiming: number;
    marketAnalysis: number;
    portfolioConstruction: number;
    emotionalControl: number;
  };
  lastActive: Date;
  improvementTrend: 'IMPROVING' | 'DECLINING' | 'STABLE';
}

interface LessonEffectiveness {
  lessonId: string;
  title: string;
  timesUsed: number;
  avgCompletionTime: number;
  avgSatisfactionScore: number;
  learningObjectiveSuccess: { [objective: string]: number };
  commonChallenges: string[];
  recommendedImprovements: string[];
}

export default function AnalyticsDashboard({ user, classId, socket }: AnalyticsProps) {
  const [selectedView, setSelectedView] = useState<'overview' | 'sessions' | 'students' | 'lessons'>('overview');
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'semester'>('month');
  const [sessionAnalytics, setSessionAnalytics] = useState<SessionAnalytics[]>([]);
  const [studentProgress, setStudentProgress] = useState<StudentProgress[]>([]);
  const [lessonEffectiveness, setLessonEffectiveness] = useState<LessonEffectiveness[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalyticsData();
  }, [classId, timeRange]);

  const loadAnalyticsData = async () => {
    setLoading(true);
    try {
      // Load mock analytics data for development
      const mockSessions: SessionAnalytics[] = [
        {
          sessionId: 'session_001',
          lessonTitle: 'Introduction to Market Making',
          scenario: 'A',
          startTime: new Date('2024-01-15T10:00:00'),
          endTime: new Date('2024-01-15T11:30:00'),
          participantCount: 24,
          completionRate: 0.92,
          avgPerformance: {
            totalPnL: 156.75,
            sharpeRatio: 1.23,
            riskScore: 34.5,
            activeTime: 78.5
          },
          objectiveCompletion: {
            'Understand bid-ask spreads': 0.95,
            'Manage inventory risk': 0.78,
            'Practice liquidity provision': 0.85,
            'Analyze profitability': 0.72
          },
          engagementMetrics: {
            privilegesUsed: 8.2,
            commandsExecuted: 15.6,
            newsResponseRate: 0.68,
            tradingActivity: 23.4
          }
        },
        {
          sessionId: 'session_002',
          lessonTitle: 'Advanced Risk Management',
          scenario: 'B',
          startTime: new Date('2024-01-18T14:00:00'),
          endTime: new Date('2024-01-18T15:45:00'),
          participantCount: 22,
          completionRate: 0.86,
          avgPerformance: {
            totalPnL: 89.25,
            sharpeRatio: 0.98,
            riskScore: 28.1,
            activeTime: 82.3
          },
          objectiveCompletion: {
            'Calculate VaR': 0.82,
            'Set position limits': 0.90,
            'Monitor correlations': 0.65,
            'Implement hedging': 0.58
          },
          engagementMetrics: {
            privilegesUsed: 11.5,
            commandsExecuted: 22.1,
            newsResponseRate: 0.74,
            tradingActivity: 18.7
          }
        }
      ];

      const mockStudents: StudentProgress[] = [
        {
          userId: 'student_001',
          username: 'alice_trader',
          sessionsCompleted: 8,
          avgPerformance: 78.5,
          skillProgression: {
            riskManagement: 85,
            executionTiming: 72,
            marketAnalysis: 68,
            portfolioConstruction: 79,
            emotionalControl: 81
          },
          lastActive: new Date('2024-01-18T15:45:00'),
          improvementTrend: 'IMPROVING'
        },
        {
          userId: 'student_002',
          username: 'bob_analyst',
          sessionsCompleted: 6,
          avgPerformance: 65.2,
          skillProgression: {
            riskManagement: 62,
            executionTiming: 58,
            marketAnalysis: 84,
            portfolioConstruction: 61,
            emotionalControl: 55
          },
          lastActive: new Date('2024-01-17T11:30:00'),
          improvementTrend: 'STABLE'
        },
        {
          userId: 'student_003',
          username: 'carol_quant',
          sessionsCompleted: 10,
          avgPerformance: 92.1,
          skillProgression: {
            riskManagement: 94,
            executionTiming: 89,
            marketAnalysis: 91,
            portfolioConstruction: 96,
            emotionalControl: 87
          },
          lastActive: new Date('2024-01-18T15:45:00'),
          improvementTrend: 'IMPROVING'
        }
      ];

      const mockLessons: LessonEffectiveness[] = [
        {
          lessonId: 'lesson_001',
          title: 'Introduction to Market Making',
          timesUsed: 15,
          avgCompletionTime: 47.5,
          avgSatisfactionScore: 4.2,
          learningObjectiveSuccess: {
            'Understand bid-ask spreads': 0.93,
            'Manage inventory risk': 0.75,
            'Practice liquidity provision': 0.81,
            'Analyze profitability': 0.69
          },
          commonChallenges: [
            'Students struggle with inventory management',
            'Difficulty calculating optimal spreads',
            'Confusion about market maker rights'
          ],
          recommendedImprovements: [
            'Add more guided practice with position sizing',
            'Include interactive spread calculator',
            'Provide clearer explanation of auction mechanics'
          ]
        }
      ];

      setSessionAnalytics(mockSessions);
      setStudentProgress(mockStudents);
      setLessonEffectiveness(mockLessons);

    } catch (error) {
      console.error('Error loading analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-2xl font-bold text-blue-600">
            {sessionAnalytics.length}
          </div>
          <div className="text-sm text-gray-600">Sessions This Month</div>
          <div className="text-xs text-green-600 mt-1">+15% from last month</div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-2xl font-bold text-green-600">
            {((sessionAnalytics.reduce((sum, s) => sum + s.completionRate, 0) / sessionAnalytics.length) * 100).toFixed(1)}%
          </div>
          <div className="text-sm text-gray-600">Avg Completion Rate</div>
          <div className="text-xs text-green-600 mt-1">Above target (85%)</div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-2xl font-bold text-purple-600">
            {studentProgress.filter(s => s.improvementTrend === 'IMPROVING').length}
          </div>
          <div className="text-sm text-gray-600">Students Improving</div>
          <div className="text-xs text-purple-600 mt-1">
            {((studentProgress.filter(s => s.improvementTrend === 'IMPROVING').length / studentProgress.length) * 100).toFixed(0)}% of class
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-2xl font-bold text-orange-600">
            {sessionAnalytics.reduce((sum, s) => sum + s.avgPerformance.totalPnL, 0) / sessionAnalytics.length > 0 ? '+' : ''}
            ${(sessionAnalytics.reduce((sum, s) => sum + s.avgPerformance.totalPnL, 0) / sessionAnalytics.length).toFixed(0)}
          </div>
          <div className="text-sm text-gray-600">Avg Student P&L</div>
          <div className="text-xs text-orange-600 mt-1">Per session</div>
        </div>
      </div>

      {/* Engagement Chart */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Student Engagement Trends</h3>
        <div className="h-64 bg-gray-50 rounded flex items-center justify-center">
          <div className="text-center">
            <div className="text-gray-400 mb-2">📊</div>
            <div className="text-gray-600">Engagement chart visualization</div>
            <div className="text-sm text-gray-500">Active time, participation, and completion rates over time</div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Session Activity</h3>
        <div className="space-y-3">
          {sessionAnalytics.slice(0, 3).map((session) => (
            <div key={session.sessionId} className="border-l-4 border-blue-500 pl-4">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-medium text-gray-900">{session.lessonTitle}</h4>
                  <p className="text-sm text-gray-600">
                    {session.participantCount} students • Scenario {session.scenario}
                  </p>
                  <p className="text-xs text-gray-500">
                    {session.startTime.toLocaleDateString()} at {session.startTime.toLocaleTimeString()}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-green-600">
                    {(session.completionRate * 100).toFixed(0)}% completion
                  </div>
                  <div className="text-xs text-gray-500">
                    ${session.avgPerformance.totalPnL.toFixed(0)} avg P&L
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderStudents = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Student Progress</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {studentProgress.map((student) => (
              <div key={student.userId} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="font-medium text-gray-900">{student.username}</h4>
                    <p className="text-sm text-gray-600">
                      {student.sessionsCompleted} sessions completed
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-gray-900">
                      {student.avgPerformance.toFixed(1)}%
                    </div>
                    <div className={`text-xs px-2 py-1 rounded-full ${
                      student.improvementTrend === 'IMPROVING' ? 'bg-green-100 text-green-800' :
                      student.improvementTrend === 'DECLINING' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {student.improvementTrend}
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  {Object.entries(student.skillProgression).map(([skill, score]) => (
                    <div key={skill} className="flex justify-between items-center">
                      <span className="text-sm text-gray-600 capitalize">
                        {skill.replace(/([A-Z])/g, ' $1').trim()}
                      </span>
                      <div className="flex items-center space-x-2">
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full" 
                            style={{ width: `${score}%` }}
                          ></div>
                        </div>
                        <span className="text-xs text-gray-600 w-8">{score}%</span>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="mt-3 pt-3 border-t border-gray-200 text-xs text-gray-500">
                  Last active: {student.lastActive.toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderSessions = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Session Analytics</h3>
        </div>
        <div className="p-6">
          <div className="space-y-6">
            {sessionAnalytics.map((session) => (
              <div key={session.sessionId} className="border border-gray-200 rounded-lg p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="text-lg font-medium text-gray-900">{session.lessonTitle}</h4>
                    <p className="text-sm text-gray-600">
                      Scenario {session.scenario} • {session.participantCount} students
                    </p>
                    <p className="text-xs text-gray-500">
                      {session.startTime.toLocaleString()} - {session.endTime?.toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-green-600">
                      {(session.completionRate * 100).toFixed(0)}%
                    </div>
                    <div className="text-sm text-gray-600">Completion Rate</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="text-center">
                    <div className="text-lg font-bold text-blue-600">
                      ${session.avgPerformance.totalPnL.toFixed(0)}
                    </div>
                    <div className="text-xs text-gray-600">Avg P&L</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-purple-600">
                      {session.avgPerformance.sharpeRatio.toFixed(2)}
                    </div>
                    <div className="text-xs text-gray-600">Sharpe Ratio</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-orange-600">
                      {session.avgPerformance.riskScore.toFixed(0)}
                    </div>
                    <div className="text-xs text-gray-600">Risk Score</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-green-600">
                      {session.avgPerformance.activeTime.toFixed(0)}%
                    </div>
                    <div className="text-xs text-gray-600">Active Time</div>
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-4">
                  <h5 className="font-medium text-gray-900 mb-2">Learning Objective Completion</h5>
                  <div className="space-y-2">
                    {Object.entries(session.objectiveCompletion).map(([objective, completion]) => (
                      <div key={objective} className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">{objective}</span>
                        <div className="flex items-center space-x-2">
                          <div className="w-24 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-green-600 h-2 rounded-full" 
                              style={{ width: `${completion * 100}%` }}
                            ></div>
                          </div>
                          <span className="text-xs text-gray-600 w-10">
                            {(completion * 100).toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderLessons = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Lesson Effectiveness</h3>
        </div>
        <div className="p-6">
          <div className="space-y-6">
            {lessonEffectiveness.map((lesson) => (
              <div key={lesson.lessonId} className="border border-gray-200 rounded-lg p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="text-lg font-medium text-gray-900">{lesson.title}</h4>
                    <p className="text-sm text-gray-600">
                      Used {lesson.timesUsed} times • Avg completion: {lesson.avgCompletionTime} min
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-yellow-600">
                      {lesson.avgSatisfactionScore.toFixed(1)}/5.0
                    </div>
                    <div className="text-sm text-gray-600">Satisfaction</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h5 className="font-medium text-gray-900 mb-3">Learning Objective Success</h5>
                    <div className="space-y-2">
                      {Object.entries(lesson.learningObjectiveSuccess).map(([objective, success]) => (
                        <div key={objective} className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">{objective}</span>
                          <span className="text-sm font-medium text-gray-900">
                            {(success * 100).toFixed(0)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h5 className="font-medium text-gray-900 mb-3">Common Challenges</h5>
                    <ul className="space-y-1">
                      {lesson.commonChallenges.map((challenge, index) => (
                        <li key={index} className="text-sm text-gray-600 flex items-start">
                          <span className="text-red-500 mr-2">•</span>
                          {challenge}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-200">
                  <h5 className="font-medium text-gray-900 mb-2">Recommended Improvements</h5>
                  <ul className="space-y-1">
                    {lesson.recommendedImprovements.map((improvement, index) => (
                      <li key={index} className="text-sm text-gray-600 flex items-start">
                        <span className="text-blue-500 mr-2">→</span>
                        {improvement}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="text-gray-600">Monitor student progress and lesson effectiveness</p>
        </div>

        {/* Navigation */}
        <div className="mb-6 flex space-x-4">
          {['overview', 'sessions', 'students', 'lessons'].map((view) => (
            <button
              key={view}
              onClick={() => setSelectedView(view as any)}
              className={`px-4 py-2 text-sm font-medium rounded-md capitalize ${
                selectedView === view
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              {view}
            </button>
          ))}
        </div>

        {/* Time Range Selector */}
        <div className="mb-6">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm"
          >
            <option value="week">Past Week</option>
            <option value="month">Past Month</option>
            <option value="semester">This Semester</option>
          </select>
        </div>

        {/* Content */}
        {selectedView === 'overview' && renderOverview()}
        {selectedView === 'sessions' && renderSessions()}
        {selectedView === 'students' && renderStudents()}
        {selectedView === 'lessons' && renderLessons()}
      </div>
    </div>
  );
}