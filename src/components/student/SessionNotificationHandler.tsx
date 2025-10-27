/**
 * Session Notification Handler - Student Terminal Auto-Launch
 * 
 * Handles incoming session notifications and automatically launches
 * the trading terminal when instructors start sessions
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useWebSocket } from '@/hooks/useWebSocket';

interface SessionNotificationProps {
  user: any;
  classId?: string;
}

interface SessionNotification {
  id: string;
  type: 'session_starting' | 'session_ended' | 'session_paused' | 'session_resumed' | 'instructor_message';
  sessionId: string;
  sessionName: string;
  message: string;
  timestamp: Date;
  autoLaunch: boolean;
  urgent: boolean;
}

export default function SessionNotificationHandler({ user, classId }: SessionNotificationProps) {
  const [notifications, setNotifications] = useState<SessionNotification[]>([]);
  const [showNotification, setShowNotification] = useState(false);
  const [currentNotification, setCurrentNotification] = useState<SessionNotification | null>(null);
  const [autoJoinEnabled, setAutoJoinEnabled] = useState(true);
  const router = useRouter();

  const { connected, socket } = useWebSocket({ 
    sessionId: '', 
    userId: user?.id || '', 
    role: 'Student' 
  });

  useEffect(() => {
    if (connected && socket) {
      socket.on('session_starting', handleSessionStarting);
      socket.on('session_ended', handleSessionEnded);
      socket.on('session_paused', handleSessionPaused);
      socket.on('session_resumed', handleSessionResumed);
      socket.on('instructor_broadcast', handleInstructorMessage);
      
      return () => {
        socket.off('session_starting', handleSessionStarting);
        socket.off('session_ended', handleSessionEnded);
        socket.off('session_paused', handleSessionPaused);
        socket.off('session_resumed', handleSessionResumed);
        socket.off('instructor_broadcast', handleInstructorMessage);
      };
    }
  }, [connected, socket]);

  const handleSessionStarting = (data: any) => {
    const notification: SessionNotification = {
      id: `notif_${Date.now()}`,
      type: 'session_starting',
      sessionId: data.sessionId,
      sessionName: data.sessionName || 'Trading Session',
      message: `Your instructor has started a new trading session: ${data.sessionName || 'Trading Session'}`,
      timestamp: new Date(),
      autoLaunch: true,
      urgent: true
    };

    addNotification(notification);

    if (autoJoinEnabled) {
      // Auto-launch terminal after 3 seconds
      setTimeout(() => {
        joinSession(data.sessionId);
      }, 3000);
    }
  };

  const handleSessionEnded = (data: any) => {
    const notification: SessionNotification = {
      id: `notif_${Date.now()}`,
      type: 'session_ended',
      sessionId: data.sessionId,
      sessionName: data.sessionName || 'Trading Session',
      message: `The trading session has ended. Your final results have been saved.`,
      timestamp: new Date(),
      autoLaunch: false,
      urgent: false
    };

    addNotification(notification);
  };

  const handleSessionPaused = (data: any) => {
    const notification: SessionNotification = {
      id: `notif_${Date.now()}`,
      type: 'session_paused',
      sessionId: data.sessionId,
      sessionName: data.sessionName || 'Trading Session',
      message: `The trading session has been paused by your instructor.`,
      timestamp: new Date(),
      autoLaunch: false,
      urgent: false
    };

    addNotification(notification);
  };

  const handleSessionResumed = (data: any) => {
    const notification: SessionNotification = {
      id: `notif_${Date.now()}`,
      type: 'session_resumed',
      sessionId: data.sessionId,
      sessionName: data.sessionName || 'Trading Session',
      message: `The trading session has been resumed. You can continue trading.`,
      timestamp: new Date(),
      autoLaunch: false,
      urgent: true
    };

    addNotification(notification);
  };

  const handleInstructorMessage = (data: any) => {
    const notification: SessionNotification = {
      id: `notif_${Date.now()}`,
      type: 'instructor_message',
      sessionId: data.sessionId || '',
      sessionName: 'Instructor Message',
      message: data.message,
      timestamp: new Date(),
      autoLaunch: false,
      urgent: data.urgent || false
    };

    addNotification(notification);
  };

  const addNotification = (notification: SessionNotification) => {
    setNotifications(prev => [notification, ...prev.slice(0, 9)]); // Keep last 10
    setCurrentNotification(notification);
    setShowNotification(true);

    // Auto-hide non-urgent notifications after 5 seconds
    if (!notification.urgent) {
      setTimeout(() => {
        setShowNotification(false);
      }, 5000);
    }

    // Show browser notification if permission granted
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(`HyperTick - ${notification.sessionName}`, {
        body: notification.message,
        icon: '/favicon.ico'
      });
    }
  };

  const joinSession = async (sessionId: string) => {
    try {
      // First, notify the server that student is joining
      if (socket) {
        socket.emit('student_joining_session', {
          sessionId,
          studentId: user?.id,
          classId
        });
      }

      // Navigate to trading terminal with session context
      router.push(`/terminal?session=${sessionId}&auto=true`);
    } catch (error) {
      console.error('Failed to join session:', error);
    }
  };

  const dismissNotification = () => {
    setShowNotification(false);
    setCurrentNotification(null);
  };

  const joinNow = () => {
    if (currentNotification) {
      joinSession(currentNotification.sessionId);
      dismissNotification();
    }
  };

  const requestNotificationPermission = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return false;
  };

  useEffect(() => {
    // Request notification permission on component mount
    requestNotificationPermission();
  }, []);

  const getNotificationIcon = (type: string): string => {
    switch (type) {
      case 'session_starting': return '🚀';
      case 'session_ended': return '🏁';
      case 'session_paused': return '⏸️';
      case 'session_resumed': return '▶️';
      case 'instructor_message': return '💬';
      default: return '📢';
    }
  };

  const getNotificationColor = (type: string): string => {
    switch (type) {
      case 'session_starting': return 'bg-green-50 border-green-200 text-green-800';
      case 'session_ended': return 'bg-blue-50 border-blue-200 text-blue-800';
      case 'session_paused': return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'session_resumed': return 'bg-green-50 border-green-200 text-green-800';
      case 'instructor_message': return 'bg-purple-50 border-purple-200 text-purple-800';
      default: return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  return (
    <>
      {/* Main Notification Modal */}
      {showNotification && currentNotification && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4 border-2 ${getNotificationColor(currentNotification.type).split(' ')[1]}`}>
            <div className="flex items-start space-x-4">
              <div className="text-3xl">
                {getNotificationIcon(currentNotification.type)}
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {currentNotification.sessionName}
                </h3>
                <p className="text-gray-700 mb-4">
                  {currentNotification.message}
                </p>
                
                {currentNotification.type === 'session_starting' && (
                  <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <input 
                        type="checkbox"
                        checked={autoJoinEnabled}
                        onChange={(e) => setAutoJoinEnabled(e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">
                        Automatically join future sessions
                      </span>
                    </div>
                    <p className="text-xs text-gray-600">
                      When enabled, your trading terminal will open automatically when sessions start.
                    </p>
                  </div>
                )}

                <div className="flex space-x-3">
                  {currentNotification.autoLaunch && (
                    <button
                      onClick={joinNow}
                      className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 font-medium"
                    >
                      Join Session Now
                    </button>
                  )}
                  <button
                    onClick={dismissNotification}
                    className={`${currentNotification.autoLaunch ? 'flex-initial' : 'flex-1'} bg-gray-200 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-300`}
                  >
                    {currentNotification.autoLaunch ? 'Later' : 'Dismiss'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notification History Panel (minimal, bottom right) */}
      {notifications.length > 0 && !showNotification && (
        <div className="fixed bottom-4 right-4 z-40">
          <button
            onClick={() => {
              if (notifications[0]) {
                setCurrentNotification(notifications[0]);
                setShowNotification(true);
              }
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded-full shadow-lg hover:bg-blue-700 flex items-center space-x-2"
          >
            <span className="text-sm">📢</span>
            <span className="text-sm font-medium">{notifications.length}</span>
          </button>
        </div>
      )}

      {/* Toast Notification for Non-urgent Messages */}
      {currentNotification?.type === 'instructor_message' && !currentNotification.urgent && (
        <div className="fixed top-4 right-4 z-30">
          <div className={`max-w-sm p-4 rounded-lg shadow-lg border ${getNotificationColor(currentNotification.type)}`}>
            <div className="flex items-start space-x-3">
              <span className="text-lg">{getNotificationIcon(currentNotification.type)}</span>
              <div className="flex-1">
                <p className="text-sm font-medium">Instructor Message</p>
                <p className="text-sm mt-1">{currentNotification.message}</p>
              </div>
              <button
                onClick={dismissNotification}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}