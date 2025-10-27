/**
 * Live Session Analytics - Real-time Session Monitoring
 * 
 * Provides real-time analytics and monitoring for active trading sessions
 * including student performance, market activity, and session metrics
 */

'use client';

import { useState, useEffect } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';

interface LiveSessionAnalyticsProps {
  sessionId: string;
  user: any;
  classId: string;
}

interface RealTimeMetric {
  id: string;
  studentId: string;
  studentName: string;
  timestamp: Date;
  metricType: 'trade' | 'position_change' | 'pnl_update' | 'risk_alert';
  value: number;
  details: any;
}

interface SessionSummary {
  totalTrades: number;
  totalVolume: number;
  averagePnL: number;
  topPerformer: string;
  worstPerformer: string;
  riskAlerts: number;
  marketActivity: 'high' | 'medium' | 'low';
}

interface StudentSnapshot {
  id: string;
  name: string;
  currentPnL: number;
  totalTrades: number;
  position: string;
  riskScore: number;
  lastActivity: Date;
  trend: 'up' | 'down' | 'stable';
}

export default function LiveSessionAnalytics({ sessionId, user, classId }: LiveSessionAnalyticsProps) {
  const [loading, setLoading] = useState(true);
  const [realTimeMetrics, setRealTimeMetrics] = useState<RealTimeMetric[]>([]);
  const [sessionSummary, setSessionSummary] = useState<SessionSummary | null>(null);
  const [studentSnapshots, setStudentSnapshots] = useState<StudentSnapshot[]>([]);
  const [selectedTimeframe, setSelectedTimeframe] = useState<'1m' | '5m' | '15m' | 'all'>('5m');

  const { connected, socket } = useWebSocket({ 
    sessionId, 
    userId: user?.id || '', 
    role: 'Instructor' 
  });

  useEffect(() => {
    loadInitialData();
  }, [sessionId]);

  useEffect(() => {
    if (connected && socket) {
      socket.on('session_metric_update', handleMetricUpdate);
      socket.on('student_activity', handleStudentActivity);
      socket.on('trade_executed', handleTradeExecuted);
      socket.on('risk_alert', handleRiskAlert);
      
      return () => {
        socket.off('session_metric_update', handleMetricUpdate);
        socket.off('student_activity', handleStudentActivity);
        socket.off('trade_executed', handleTradeExecuted);
        socket.off('risk_alert', handleRiskAlert);
      };
    }
  }, [connected, socket]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadSessionSummary(),
        loadStudentSnapshots(),
        loadRecentMetrics()
      ]);
    } catch (error) {
      console.error('Failed to load session analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSessionSummary = async () => {
    // Simulate loading session summary
    const mockSummary: SessionSummary = {
      totalTrades: 147,
      totalVolume: 2450000,
      averagePnL: 234.75,
      topPerformer: 'Alice Johnson',
      worstPerformer: 'Bob Chen',
      riskAlerts: 3,
      marketActivity: 'high'
    };
    setSessionSummary(mockSummary);
  };

  const loadStudentSnapshots = async () => {
    // Simulate loading student snapshots
    const mockSnapshots: StudentSnapshot[] = [
      {
        id: 'student_1',
        name: 'Alice Johnson',
        currentPnL: 1245.50,
        totalTrades: 23,
        position: 'Long AAPL 100 shares',
        riskScore: 7.2,
        lastActivity: new Date(Date.now() - 30 * 1000),
        trend: 'up'
      },
      {
        id: 'student_2',
        name: 'Bob Chen',
        currentPnL: -387.25,
        totalTrades: 18,
        position: 'Short MSFT 50 shares',
        riskScore: 4.1,
        lastActivity: new Date(Date.now() - 2 * 60 * 1000),
        trend: 'down'
      },
      {
        id: 'student_3',
        name: 'Carol Davis',
        currentPnL: 892.75,
        totalTrades: 31,
        position: 'Cash',
        riskScore: 8.5,
        lastActivity: new Date(Date.now() - 15 * 1000),
        trend: 'stable'
      }
    ];
    setStudentSnapshots(mockSnapshots);
  };

  const loadRecentMetrics = async () => {
    // Simulate loading recent metrics
    const mockMetrics: RealTimeMetric[] = [
      {
        id: 'metric_1',
        studentId: 'student_1',
        studentName: 'Alice Johnson',
        timestamp: new Date(Date.now() - 45 * 1000),
        metricType: 'trade',
        value: 150.75,
        details: { symbol: 'AAPL', quantity: 10, side: 'buy' }
      },
      {
        id: 'metric_2',
        studentId: 'student_3',
        studentName: 'Carol Davis',
        timestamp: new Date(Date.now() - 90 * 1000),
        metricType: 'pnl_update',
        value: 892.75,
        details: { change: 45.25 }
      },
      {
        id: 'metric_3',
        studentId: 'student_2',
        studentName: 'Bob Chen',
        timestamp: new Date(Date.now() - 120 * 1000),
        metricType: 'risk_alert',
        value: 4.1,
        details: { alert: 'Position size exceeds risk limit' }
      }
    ];
    setRealTimeMetrics(mockMetrics);
  };

  const handleMetricUpdate = (data: any) => {
    const newMetric: RealTimeMetric = {
      id: `metric_${Date.now()}`,
      studentId: data.studentId,
      studentName: data.studentName,
      timestamp: new Date(),
      metricType: data.type,
      value: data.value,
      details: data.details
    };
    
    setRealTimeMetrics(prev => [newMetric, ...prev.slice(0, 49)]); // Keep last 50 metrics
  };

  const handleStudentActivity = (data: any) => {
    setStudentSnapshots(prev => prev.map(student => 
      student.id === data.studentId
        ? { 
            ...student, 
            lastActivity: new Date(),
            currentPnL: data.pnl || student.currentPnL,
            position: data.position || student.position,
            riskScore: data.riskScore || student.riskScore
          }
        : student
    ));
  };

  const handleTradeExecuted = (data: any) => {
    setStudentSnapshots(prev => prev.map(student => 
      student.id === data.studentId
        ? { 
            ...student, 
            totalTrades: student.totalTrades + 1,
            currentPnL: data.newPnL,
            lastActivity: new Date()
          }
        : student
    ));

    // Update session summary
    setSessionSummary(prev => prev ? {
      ...prev,
      totalTrades: prev.totalTrades + 1,
      totalVolume: prev.totalVolume + (data.value || 0)
    } : null);
  };

  const handleRiskAlert = (data: any) => {
    setSessionSummary(prev => prev ? {
      ...prev,
      riskAlerts: prev.riskAlerts + 1
    } : null);
  };

  const getMetricIcon = (type: string): string => {
    switch (type) {
      case 'trade': return '💰';
      case 'position_change': return '📊';
      case 'pnl_update': return '📈';
      case 'risk_alert': return '⚠️';
      default: return '📋';
    }
  };

  const getTrendIcon = (trend: string): string => {
    switch (trend) {
      case 'up': return '📈';
      case 'down': return '📉';
      case 'stable': return '➡️';
      default: return '📊';
    }
  };

  const getPnLColor = (pnl: number): string => {
    return pnl >= 0 ? 'text-green-600' : 'text-red-600';
  };

  const getRiskColor = (score: number): string => {
    if (score >= 8) return 'text-green-600';
    if (score >= 6) return 'text-yellow-600';
    if (score >= 4) return 'text-orange-600';
    return 'text-red-600';
  };

  const formatTimeAgo = (date: Date): string => {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading session analytics...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900">Live Session Analytics</h2>
          <div className="flex items-center space-x-4">
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${connected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              {connected ? '🟢 Live' : '🔴 Disconnected'}
            </div>
            <select 
              value={selectedTimeframe}
              onChange={(e) => setSelectedTimeframe(e.target.value as any)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="1m">Last 1 minute</option>
              <option value="5m">Last 5 minutes</option>
              <option value="15m">Last 15 minutes</option>
              <option value="all">All session</option>
            </select>
          </div>
        </div>

        {/* Session Overview */}
        {sessionSummary && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-medium text-blue-900">Total Trades</h3>
              <p className="text-2xl font-bold text-blue-600">{sessionSummary.totalTrades}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <h3 className="font-medium text-green-900">Total Volume</h3>
              <p className="text-2xl font-bold text-green-600">${sessionSummary.totalVolume.toLocaleString()}</p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <h3 className="font-medium text-purple-900">Avg P&L</h3>
              <p className={`text-2xl font-bold ${getPnLColor(sessionSummary.averagePnL)}`}>
                ${sessionSummary.averagePnL.toFixed(2)}
              </p>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg">
              <h3 className="font-medium text-orange-900">Risk Alerts</h3>
              <p className="text-2xl font-bold text-orange-600">{sessionSummary.riskAlerts}</p>
            </div>
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Student Performance */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Student Performance</h3>
          <div className="space-y-4">
            {studentSnapshots.map((student) => (
              <div key={student.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="font-medium text-gray-900">{student.name}</h4>
                    <p className="text-sm text-gray-500">{student.position}</p>
                  </div>
                  <div className="text-right">
                    <div className={`text-lg font-semibold ${getPnLColor(student.currentPnL)}`}>
                      ${student.currentPnL.toFixed(2)} {getTrendIcon(student.trend)}
                    </div>
                    <div className="text-sm text-gray-500">{student.totalTrades} trades</div>
                  </div>
                </div>
                
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500">Risk Score:</span>
                  <span className={`font-medium ${getRiskColor(student.riskScore)}`}>
                    {student.riskScore.toFixed(1)}/10
                  </span>
                </div>
                
                <div className="flex justify-between items-center text-sm mt-1">
                  <span className="text-gray-500">Last Activity:</span>
                  <span className="text-gray-700">{formatTimeAgo(student.lastActivity)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Real-Time Activity Feed */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Live Activity Feed</h3>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {realTimeMetrics.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No activity yet</p>
            ) : (
              realTimeMetrics.map((metric) => (
                <div key={metric.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                  <span className="text-lg">{getMetricIcon(metric.metricType)}</span>
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-gray-900">{metric.studentName}</p>
                        <p className="text-sm text-gray-600">
                          {metric.metricType === 'trade' && `Traded ${metric.details.symbol}: ${metric.details.side} ${metric.details.quantity} @ $${metric.value}`}
                          {metric.metricType === 'pnl_update' && `P&L updated: $${metric.value} (${metric.details.change > 0 ? '+' : ''}${metric.details.change})`}
                          {metric.metricType === 'risk_alert' && `Risk Alert: ${metric.details.alert}`}
                          {metric.metricType === 'position_change' && `Position changed: ${metric.details.position}`}
                        </p>
                      </div>
                      <span className="text-xs text-gray-500">{formatTimeAgo(metric.timestamp)}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Performance Leaders */}
      {sessionSummary && (
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Session Leaders</h3>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <h4 className="font-medium text-yellow-900">🏆 Top Performer</h4>
              <p className="text-lg font-semibold text-yellow-800">{sessionSummary.topPerformer}</p>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-blue-900">📊 Market Activity</h4>
              <p className="text-lg font-semibold text-blue-800 capitalize">{sessionSummary.marketActivity}</p>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <h4 className="font-medium text-red-900">📉 Needs Support</h4>
              <p className="text-lg font-semibold text-red-800">{sessionSummary.worstPerformer}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}