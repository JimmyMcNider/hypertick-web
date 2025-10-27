/**
 * Student Engagement Metrics - Learning Outcome Analytics
 * 
 * Tracks and displays student engagement patterns, learning progression,
 * and educational outcome metrics for performance analysis
 */

'use client';

import { useState, useEffect } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';

interface EngagementMetricsProps {
  user: any;
  classId: string;
  sessionId?: string;
}

interface EngagementData {
  userId: string;
  sessionTime: number;
  interactionCount: number;
  questionsAsked: number;
  questionsAnswered: number;
  correctAnswers: number;
  hintsUsed: number;
  resourcesAccessed: number;
  collaborationScore: number;
  focusScore: number;
  retentionScore: number;
  progressVelocity: number;
  lastActivity: Date;
}

interface LearningOutcome {
  conceptId: string;
  conceptName: string;
  masteryLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  confidenceScore: number;
  timeToMastery: number;
  attemptCount: number;
  errorPatterns: string[];
  improvementTrend: 'improving' | 'stable' | 'declining';
  nextRecommendations: string[];
}

interface EngagementPattern {
  timeOfDay: string;
  engagementLevel: number;
  attentionSpan: number;
  interactionDensity: number;
  performanceCorrelation: number;
}

interface LearningAnalytics {
  overallProgress: number;
  learningVelocity: number;
  retentionRate: number;
  engagementTrend: 'increasing' | 'stable' | 'decreasing';
  strengths: string[];
  challenges: string[];
  recommendedActions: Array<{
    action: string;
    priority: 'high' | 'medium' | 'low';
    timeframe: string;
  }>;
  nextMilestones: Array<{
    milestone: string;
    estimatedTime: string;
    difficulty: number;
  }>;
}

interface PeerComparison {
  percentile: number;
  averageProgress: number;
  relativeEngagement: number;
  skillGaps: string[];
  advantages: string[];
}

export default function EngagementMetrics({ user, classId, sessionId }: EngagementMetricsProps) {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'engagement' | 'outcomes' | 'patterns' | 'insights'>('engagement');
  const [timeRange, setTimeRange] = useState<'session' | 'day' | 'week' | 'month'>('week');
  
  const [engagementData, setEngagementData] = useState<EngagementData | null>(null);
  const [learningOutcomes, setLearningOutcomes] = useState<LearningOutcome[]>([]);
  const [engagementPatterns, setEngagementPatterns] = useState<EngagementPattern[]>([]);
  const [learningAnalytics, setLearningAnalytics] = useState<LearningAnalytics | null>(null);
  const [peerComparison, setPeerComparison] = useState<PeerComparison | null>(null);

  const { connected, socket } = useWebSocket({ 
    sessionId: sessionId || '', 
    userId: user?.id || '', 
    role: 'Student' 
  });

  useEffect(() => {
    loadMetricsData();
  }, [user?.id, classId, timeRange]);

  useEffect(() => {
    if (connected && socket) {
      socket.on('engagement_updated', handleEngagementUpdate);
      socket.on('learning_progress_updated', handleLearningProgressUpdate);
      
      return () => {
        socket.off('engagement_updated', handleEngagementUpdate);
        socket.off('learning_progress_updated', handleLearningProgressUpdate);
      };
    }
  }, [connected, socket]);

  const loadMetricsData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadEngagementData(),
        loadLearningOutcomes(),
        loadEngagementPatterns(),
        loadLearningAnalytics(),
        loadPeerComparison()
      ]);
    } catch (error) {
      console.error('Failed to load metrics data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadEngagementData = async () => {
    // Simulate loading engagement data
    const mockEngagement: EngagementData = {
      userId: user?.id || '',
      sessionTime: 127,
      interactionCount: 342,
      questionsAsked: 23,
      questionsAnswered: 89,
      correctAnswers: 74,
      hintsUsed: 12,
      resourcesAccessed: 45,
      collaborationScore: 8.7,
      focusScore: 7.9,
      retentionScore: 8.2,
      progressVelocity: 1.34,
      lastActivity: new Date(Date.now() - 3 * 60 * 1000)
    };
    setEngagementData(mockEngagement);
  };

  const loadLearningOutcomes = async () => {
    // Simulate loading learning outcomes
    const mockOutcomes: LearningOutcome[] = [
      {
        conceptId: 'concept_1',
        conceptName: 'Market Microstructure',
        masteryLevel: 'advanced',
        confidenceScore: 87.5,
        timeToMastery: 145,
        attemptCount: 8,
        errorPatterns: ['Bid-ask spread miscalculation', 'Liquidity timing'],
        improvementTrend: 'improving',
        nextRecommendations: ['Practice with high-frequency data', 'Study market maker behavior']
      },
      {
        conceptId: 'concept_2',
        conceptName: 'Options Pricing',
        masteryLevel: 'intermediate',
        confidenceScore: 72.3,
        timeToMastery: 89,
        attemptCount: 12,
        errorPatterns: ['Greek calculation errors', 'Volatility estimation'],
        improvementTrend: 'stable',
        nextRecommendations: ['Focus on Black-Scholes components', 'Practice volatility surface analysis']
      },
      {
        conceptId: 'concept_3',
        conceptName: 'Risk Management',
        masteryLevel: 'beginner',
        confidenceScore: 45.8,
        timeToMastery: 67,
        attemptCount: 15,
        errorPatterns: ['Position sizing errors', 'Correlation miscalculation', 'VaR interpretation'],
        improvementTrend: 'improving',
        nextRecommendations: ['Start with basic portfolio theory', 'Practice correlation analysis', 'Study VaR methodologies']
      }
    ];
    setLearningOutcomes(mockOutcomes);
  };

  const loadEngagementPatterns = async () => {
    // Simulate loading engagement patterns
    const mockPatterns: EngagementPattern[] = [
      { timeOfDay: '09:00', engagementLevel: 8.2, attentionSpan: 25, interactionDensity: 3.4, performanceCorrelation: 0.78 },
      { timeOfDay: '10:00', engagementLevel: 9.1, attentionSpan: 32, interactionDensity: 4.1, performanceCorrelation: 0.85 },
      { timeOfDay: '11:00', engagementLevel: 8.7, attentionSpan: 28, interactionDensity: 3.8, performanceCorrelation: 0.82 },
      { timeOfDay: '14:00', engagementLevel: 7.3, attentionSpan: 22, interactionDensity: 2.9, performanceCorrelation: 0.71 },
      { timeOfDay: '15:00', engagementLevel: 6.8, attentionSpan: 19, interactionDensity: 2.5, performanceCorrelation: 0.65 },
      { timeOfDay: '16:00', engagementLevel: 7.9, attentionSpan: 24, interactionDensity: 3.2, performanceCorrelation: 0.74 }
    ];
    setEngagementPatterns(mockPatterns);
  };

  const loadLearningAnalytics = async () => {
    // Simulate loading learning analytics
    const mockAnalytics: LearningAnalytics = {
      overallProgress: 73.4,
      learningVelocity: 1.34,
      retentionRate: 82.1,
      engagementTrend: 'increasing',
      strengths: ['Quick conceptual understanding', 'Strong analytical skills', 'Good pattern recognition'],
      challenges: ['Risk calculation complexity', 'Multi-variable optimization', 'Time pressure performance'],
      recommendedActions: [
        { action: 'Practice advanced risk calculations daily', priority: 'high', timeframe: '2 weeks' },
        { action: 'Join peer study group for derivatives', priority: 'medium', timeframe: '1 week' },
        { action: 'Review fundamental analysis techniques', priority: 'low', timeframe: '1 month' }
      ],
      nextMilestones: [
        { milestone: 'Master portfolio optimization', estimatedTime: '3 weeks', difficulty: 7.2 },
        { milestone: 'Complete derivatives certification', estimatedTime: '6 weeks', difficulty: 8.5 },
        { milestone: 'Advanced trading strategies', estimatedTime: '10 weeks', difficulty: 9.1 }
      ]
    };
    setLearningAnalytics(mockAnalytics);
  };

  const loadPeerComparison = async () => {
    // Simulate loading peer comparison
    const mockComparison: PeerComparison = {
      percentile: 78.3,
      averageProgress: 64.2,
      relativeEngagement: 1.21,
      skillGaps: ['Advanced derivatives', 'Quantitative analysis', 'Algorithmic trading'],
      advantages: ['Market intuition', 'Risk awareness', 'Quick learning']
    };
    setPeerComparison(mockComparison);
  };

  const handleEngagementUpdate = (data: any) => {
    setEngagementData(prev => prev ? { ...prev, ...data } : null);
  };

  const handleLearningProgressUpdate = (data: any) => {
    setLearningOutcomes(prev => prev.map(outcome => 
      outcome.conceptId === data.conceptId 
        ? { ...outcome, ...data.progress }
        : outcome
    ));
  };

  const getMasteryColor = (level: string): string => {
    switch (level) {
      case 'expert': return 'text-purple-600 bg-purple-100';
      case 'advanced': return 'text-green-600 bg-green-100';
      case 'intermediate': return 'text-blue-600 bg-blue-100';
      case 'beginner': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getTrendColor = (trend: string): string => {
    switch (trend) {
      case 'improving': return 'text-green-600';
      case 'stable': return 'text-blue-600';
      case 'declining': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getTrendIcon = (trend: string): string => {
    switch (trend) {
      case 'improving': return '↗️';
      case 'stable': return '→';
      case 'declining': return '↘️';
      default: return '—';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading engagement metrics...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900">Learning Analytics</h2>
          <div className="flex space-x-4">
            <select 
              value={timeRange} 
              onChange={(e) => setTimeRange(e.target.value as any)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="session">This Session</option>
              <option value="day">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </select>
          </div>
        </div>

        {/* Quick Stats */}
        {engagementData && learningAnalytics && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-medium text-blue-900">Overall Progress</h3>
              <p className="text-2xl font-bold text-blue-600">
                {learningAnalytics.overallProgress.toFixed(1)}%
              </p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <h3 className="font-medium text-green-900">Engagement Score</h3>
              <p className="text-2xl font-bold text-green-600">
                {engagementData.focusScore.toFixed(1)}/10
              </p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <h3 className="font-medium text-purple-900">Retention Rate</h3>
              <p className="text-2xl font-bold text-purple-600">
                {learningAnalytics.retentionRate.toFixed(1)}%
              </p>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg">
              <h3 className="font-medium text-orange-900">Session Time</h3>
              <p className="text-2xl font-bold text-orange-600">
                {Math.floor(engagementData.sessionTime / 60)}h {engagementData.sessionTime % 60}m
              </p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {['engagement', 'outcomes', 'patterns', 'insights'].map((tab) => (
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
      {activeTab === 'engagement' && engagementData && (
        <div className="space-y-6">
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Current Session Engagement</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{engagementData.interactionCount}</div>
                <div className="text-sm text-gray-500">Interactions</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{engagementData.questionsAnswered}</div>
                <div className="text-sm text-gray-500">Questions Answered</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {((engagementData.correctAnswers / engagementData.questionsAnswered) * 100).toFixed(1)}%
                </div>
                <div className="text-sm text-gray-500">Accuracy</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{engagementData.resourcesAccessed}</div>
                <div className="text-sm text-gray-500">Resources Used</div>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white shadow rounded-lg p-6">
              <h4 className="font-medium text-gray-900 mb-3">Performance Scores</h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Focus Score</span>
                  <div className="flex items-center">
                    <div className="w-24 bg-gray-200 rounded-full h-2 mr-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ width: `${(engagementData.focusScore / 10) * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-semibold">{engagementData.focusScore}/10</span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Collaboration Score</span>
                  <div className="flex items-center">
                    <div className="w-24 bg-gray-200 rounded-full h-2 mr-2">
                      <div 
                        className="bg-green-600 h-2 rounded-full" 
                        style={{ width: `${(engagementData.collaborationScore / 10) * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-semibold">{engagementData.collaborationScore}/10</span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Retention Score</span>
                  <div className="flex items-center">
                    <div className="w-24 bg-gray-200 rounded-full h-2 mr-2">
                      <div 
                        className="bg-purple-600 h-2 rounded-full" 
                        style={{ width: `${(engagementData.retentionScore / 10) * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-semibold">{engagementData.retentionScore}/10</span>
                  </div>
                </div>
              </div>
            </div>

            {peerComparison && (
              <div className="bg-white shadow rounded-lg p-6">
                <h4 className="font-medium text-gray-900 mb-3">Peer Comparison</h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Class Percentile</span>
                    <span className="text-lg font-semibold text-blue-600">{peerComparison.percentile}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">vs Class Average</span>
                    <span className="text-lg font-semibold text-green-600">
                      +{(learningAnalytics?.overallProgress || 0 - peerComparison.averageProgress).toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Relative Engagement</span>
                    <span className="text-lg font-semibold text-purple-600">
                      {peerComparison.relativeEngagement.toFixed(2)}x
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'outcomes' && (
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Learning Outcomes</h3>
          <div className="space-y-4">
            {learningOutcomes.map((outcome) => (
              <div key={outcome.conceptId} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="font-medium text-gray-900">{outcome.conceptName}</h4>
                    <div className="flex items-center mt-1 space-x-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getMasteryColor(outcome.masteryLevel)}`}>
                        {outcome.masteryLevel}
                      </span>
                      <span className={`text-sm ${getTrendColor(outcome.improvementTrend)}`}>
                        {getTrendIcon(outcome.improvementTrend)} {outcome.improvementTrend}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-semibold text-blue-600">{outcome.confidenceScore.toFixed(1)}%</div>
                    <div className="text-sm text-gray-500">Confidence</div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-3 text-sm">
                  <div>
                    <span className="text-gray-500">Time to Mastery</span>
                    <p className="font-semibold">{Math.floor(outcome.timeToMastery / 60)}h {outcome.timeToMastery % 60}m</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Attempts</span>
                    <p className="font-semibold">{outcome.attemptCount}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Error Patterns</span>
                    <p className="font-semibold">{outcome.errorPatterns.length}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div>
                    <h5 className="text-sm font-medium text-gray-700 mb-1">Common Mistakes:</h5>
                    <div className="flex flex-wrap gap-1">
                      {outcome.errorPatterns.map((error, index) => (
                        <span key={index} className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs">
                          {error}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h5 className="text-sm font-medium text-gray-700 mb-1">Recommendations:</h5>
                    <div className="flex flex-wrap gap-1">
                      {outcome.nextRecommendations.map((rec, index) => (
                        <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                          {rec}
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

      {activeTab === 'patterns' && (
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Engagement Patterns</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Daily Engagement Curve</h4>
                <div className="space-y-2">
                  {engagementPatterns.map((pattern) => (
                    <div key={pattern.timeOfDay} className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">{pattern.timeOfDay}</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full" 
                            style={{ width: `${(pattern.engagementLevel / 10) * 100}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-semibold w-8">{pattern.engagementLevel.toFixed(1)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Performance Correlation</h4>
                <div className="space-y-2">
                  {engagementPatterns.map((pattern) => (
                    <div key={pattern.timeOfDay} className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">{pattern.timeOfDay}</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-green-600 h-2 rounded-full" 
                            style={{ width: `${pattern.performanceCorrelation * 100}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-semibold w-8">{pattern.performanceCorrelation.toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <h5 className="font-medium text-blue-900 mb-2">Peak Performance Window</h5>
              <p className="text-sm text-blue-800">
                Your optimal learning window is 10:00-11:00 AM with 85% performance correlation.
                Consider scheduling challenging concepts during this time.
              </p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'insights' && learningAnalytics && (
        <div className="space-y-6">
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Learning Insights</h3>
            
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Strengths</h4>
                <div className="space-y-2">
                  {learningAnalytics.strengths.map((strength, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <span className="text-green-600">✓</span>
                      <span className="text-sm">{strength}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Areas for Improvement</h4>
                <div className="space-y-2">
                  {learningAnalytics.challenges.map((challenge, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <span className="text-orange-600">⚠</span>
                      <span className="text-sm">{challenge}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mb-6">
              <h4 className="font-medium text-gray-900 mb-3">Recommended Actions</h4>
              <div className="space-y-3">
                {learningAnalytics.recommendedActions.map((action, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-3">
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-medium text-sm">{action.action}</span>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        action.priority === 'high' ? 'bg-red-100 text-red-800' :
                        action.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {action.priority}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">Target: {action.timeframe}</p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 mb-3">Upcoming Milestones</h4>
              <div className="space-y-3">
                {learningAnalytics.nextMilestones.map((milestone, index) => (
                  <div key={index} className="flex justify-between items-center border border-gray-200 rounded-lg p-3">
                    <div>
                      <span className="font-medium text-sm">{milestone.milestone}</span>
                      <p className="text-sm text-gray-600">Estimated: {milestone.estimatedTime}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold">Difficulty</div>
                      <div className="flex items-center">
                        <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                          <div 
                            className="bg-orange-600 h-2 rounded-full" 
                            style={{ width: `${(milestone.difficulty / 10) * 100}%` }}
                          ></div>
                        </div>
                        <span className="text-sm">{milestone.difficulty}/10</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}