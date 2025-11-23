/**
 * Real-time Alert System for Instructors
 * 
 * Monitors student activity and market conditions to provide
 * proactive notifications and intervention opportunities.
 */

'use client';

import { useState, useEffect } from 'react';

interface Alert {
  id: string;
  type: 'WARNING' | 'INFO' | 'CRITICAL' | 'SUCCESS';
  title: string;
  message: string;
  timestamp: Date;
  studentId?: string;
  studentName?: string;
  actionRequired?: boolean;
  autoResolve?: boolean;
}

interface InstructorAlertsProps {
  sessionId: string;
  onAlertAction?: (alertId: string, action: string) => void;
}

export default function InstructorAlerts({ sessionId, onAlertAction }: InstructorAlertsProps) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isMinimized, setIsMinimized] = useState(false);

  useEffect(() => {
    // Mock alert generation - replace with real-time monitoring
    const generateMockAlerts = () => {
      const mockAlerts: Alert[] = [
        {
          id: 'alert_001',
          type: 'WARNING',
          title: 'Large Position Risk',
          message: 'Alice Johnson has exceeded 50% portfolio concentration in AAPL',
          timestamp: new Date(),
          studentId: 'student_001',
          studentName: 'Alice Johnson',
          actionRequired: true
        },
        {
          id: 'alert_002',
          type: 'INFO',
          title: 'High Trading Activity',
          message: 'Bob Smith has placed 15 orders in the last 5 minutes',
          timestamp: new Date(Date.now() - 30000),
          studentId: 'student_002',
          studentName: 'Bob Smith',
          actionRequired: false
        },
        {
          id: 'alert_003',
          type: 'CRITICAL',
          title: 'Market Manipulation Detected',
          message: 'Unusual price movement in MSFT - possible coordinated trading',
          timestamp: new Date(Date.now() - 60000),
          actionRequired: true
        },
        {
          id: 'alert_004',
          type: 'SUCCESS',
          title: 'Learning Objective Achieved',
          message: '8 out of 12 students have successfully demonstrated arbitrage concepts',
          timestamp: new Date(Date.now() - 120000),
          autoResolve: true
        }
      ];

      setAlerts(mockAlerts);
    };

    generateMockAlerts();
    const interval = setInterval(generateMockAlerts, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, [sessionId]);

  const getAlertColor = (type: Alert['type']) => {
    switch (type) {
      case 'CRITICAL': return 'border-red-500 bg-red-500 bg-opacity-10';
      case 'WARNING': return 'border-yellow-500 bg-yellow-500 bg-opacity-10';
      case 'INFO': return 'border-blue-500 bg-blue-500 bg-opacity-10';
      case 'SUCCESS': return 'border-green-500 bg-green-500 bg-opacity-10';
      default: return 'border-gray-500 bg-gray-500 bg-opacity-10';
    }
  };

  const getAlertIcon = (type: Alert['type']) => {
    switch (type) {
      case 'CRITICAL': return '🚨';
      case 'WARNING': return '⚠️';
      case 'INFO': return 'ℹ️';
      case 'SUCCESS': return '✅';
      default: return '📢';
    }
  };

  const handleAlertAction = (alert: Alert, action: string) => {
    if (onAlertAction) {
      onAlertAction(alert.id, action);
    }

    // Remove alert after action
    setAlerts(prev => prev.filter(a => a.id !== alert.id));
  };

  const dismissAlert = (alertId: string) => {
    setAlerts(prev => prev.filter(a => a.id !== alertId));
  };

  const criticalAlerts = alerts.filter(a => a.type === 'CRITICAL');
  const otherAlerts = alerts.filter(a => a.type !== 'CRITICAL');

  return (
    <div className="fixed top-4 right-4 z-50 w-96">
      {/* Alert Header */}
      <div 
        className="bg-gray-800 border border-gray-600 rounded-t p-3 cursor-pointer flex justify-between items-center"
        onClick={() => setIsMinimized(!isMinimized)}
      >
        <div className="flex items-center space-x-2">
          <span className="text-white font-semibold">Instructor Alerts</span>
          {alerts.length > 0 && (
            <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
              {alerts.length}
            </span>
          )}
        </div>
        <button className="text-gray-400 hover:text-white">
          {isMinimized ? '📈' : '📉'}
        </button>
      </div>

      {/* Alert List */}
      {!isMinimized && (
        <div className="bg-gray-800 border-l border-r border-b border-gray-600 rounded-b max-h-96 overflow-y-auto">
          {alerts.length === 0 ? (
            <div className="p-4 text-gray-400 text-center">
              No active alerts
            </div>
          ) : (
            <div className="space-y-1">
              {/* Critical alerts first */}
              {criticalAlerts.map((alert) => (
                <AlertItem
                  key={alert.id}
                  alert={alert}
                  onAction={handleAlertAction}
                  onDismiss={dismissAlert}
                />
              ))}
              
              {/* Other alerts */}
              {otherAlerts.map((alert) => (
                <AlertItem
                  key={alert.id}
                  alert={alert}
                  onAction={handleAlertAction}
                  onDismiss={dismissAlert}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface AlertItemProps {
  alert: Alert;
  onAction: (alert: Alert, action: string) => void;
  onDismiss: (alertId: string) => void;
}

function AlertItem({ alert, onAction, onDismiss }: AlertItemProps) {
  const getAlertColor = (type: Alert['type']) => {
    switch (type) {
      case 'CRITICAL': return 'border-l-red-500 bg-red-500 bg-opacity-5';
      case 'WARNING': return 'border-l-yellow-500 bg-yellow-500 bg-opacity-5';
      case 'INFO': return 'border-l-blue-500 bg-blue-500 bg-opacity-5';
      case 'SUCCESS': return 'border-l-green-500 bg-green-500 bg-opacity-5';
      default: return 'border-l-gray-500 bg-gray-500 bg-opacity-5';
    }
  };

  const getAlertIcon = (type: Alert['type']) => {
    switch (type) {
      case 'CRITICAL': return '🚨';
      case 'WARNING': return '⚠️';
      case 'INFO': return 'ℹ️';
      case 'SUCCESS': return '✅';
      default: return '📢';
    }
  };

  return (
    <div className={`border-l-4 p-3 ${getAlertColor(alert.type)}`}>
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-1">
            <span className="text-lg">{getAlertIcon(alert.type)}</span>
            <span className="font-semibold text-white text-sm">{alert.title}</span>
            {alert.studentName && (
              <span className="text-xs text-gray-400">({alert.studentName})</span>
            )}
          </div>
          <p className="text-gray-300 text-sm mb-2">{alert.message}</p>
          <div className="text-xs text-gray-400">
            {alert.timestamp.toLocaleTimeString()}
          </div>
        </div>
        
        <button
          onClick={() => onDismiss(alert.id)}
          className="text-gray-400 hover:text-white text-sm ml-2"
        >
          ✕
        </button>
      </div>

      {/* Action Buttons */}
      {alert.actionRequired && (
        <div className="mt-3 flex space-x-2">
          {alert.type === 'WARNING' && alert.studentId && (
            <>
              <button
                onClick={() => onAction(alert, 'view_student')}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1 rounded"
              >
                View Student
              </button>
              <button
                onClick={() => onAction(alert, 'send_warning')}
                className="bg-yellow-600 hover:bg-yellow-700 text-white text-xs px-3 py-1 rounded"
              >
                Send Warning
              </button>
            </>
          )}
          
          {alert.type === 'CRITICAL' && (
            <>
              <button
                onClick={() => onAction(alert, 'pause_market')}
                className="bg-red-600 hover:bg-red-700 text-white text-xs px-3 py-1 rounded"
              >
                Pause Market
              </button>
              <button
                onClick={() => onAction(alert, 'investigate')}
                className="bg-orange-600 hover:bg-orange-700 text-white text-xs px-3 py-1 rounded"
              >
                Investigate
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}