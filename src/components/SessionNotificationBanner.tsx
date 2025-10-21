'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  PlayIcon, 
  PauseIcon, 
  StopIcon, 
  ClockIcon,
  XMarkIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

interface SessionNotification {
  id: string;
  type: 'SESSION_STARTING' | 'SESSION_PAUSED' | 'SESSION_RESUMED' | 'SESSION_ENDED';
  title: string;
  message: string;
  data: any;
  createdAt: Date;
}

interface ActiveSession {
  id: string;
  lessonTitle: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'PAUSED' | 'COMPLETED';
  startTime?: Date;
  timeRemaining?: number;
}

export default function SessionNotificationBanner() {
  const [notifications, setNotifications] = useState<SessionNotification[]>([]);
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetchNotifications();
    fetchActiveSession();
    
    // Poll for updates every 10 seconds
    const interval = setInterval(() => {
      fetchNotifications();
      fetchActiveSession();
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (activeSession?.startTime && activeSession.status === 'IN_PROGRESS') {
      const interval = setInterval(() => {
        const elapsed = Date.now() - new Date(activeSession.startTime!).getTime();
        const remaining = Math.max(0, (activeSession.timeRemaining || 0) - Math.floor(elapsed / 1000));
        setTimeLeft(remaining);
        
        if (remaining === 0) {
          setActiveSession(null);
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [activeSession]);

  const fetchNotifications = async () => {
    try {
      const response = await fetch('/api/notifications', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        // Only show recent notifications (last 5 minutes)
        const recentNotifications = data.notifications.filter((notif: any) => {
          const notifTime = new Date(notif.createdAt).getTime();
          const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
          return notifTime > fiveMinutesAgo && !dismissed.has(notif.id);
        });
        setNotifications(recentNotifications);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const fetchActiveSession = async () => {
    try {
      const response = await fetch('/api/sessions/active', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setActiveSession(data.session);
      }
    } catch (error) {
      console.error('Error fetching active session:', error);
    }
  };

  const handleJoinSession = () => {
    router.push('/terminal');
  };

  const handleDismissNotification = (notificationId: string) => {
    setDismissed(prev => new Set([...prev, notificationId]));
  };

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'SESSION_STARTING':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'SESSION_PAUSED':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'SESSION_RESUMED':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      case 'SESSION_ENDED':
        return 'bg-gray-50 border-gray-200 text-gray-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'SESSION_STARTING':
        return <PlayIcon className="h-5 w-5 text-green-600" />;
      case 'SESSION_PAUSED':
        return <PauseIcon className="h-5 w-5 text-yellow-600" />;
      case 'SESSION_RESUMED':
        return <PlayIcon className="h-5 w-5 text-blue-600" />;
      case 'SESSION_ENDED':
        return <StopIcon className="h-5 w-5 text-gray-600" />;
      default:
        return <ExclamationTriangleIcon className="h-5 w-5 text-gray-600" />;
    }
  };

  // Show active session banner
  if (activeSession && activeSession.status === 'IN_PROGRESS') {
    return (
      <div className="fixed top-0 left-0 right-0 z-50 bg-green-600 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <PlayIcon className="h-5 w-5" />
              <div>
                <div className="font-medium">Trading Session Active: {activeSession.lessonTitle}</div>
                <div className="text-sm opacity-90">
                  {timeLeft !== null && (
                    <span className="flex items-center">
                      <ClockIcon className="h-4 w-4 mr-1" />
                      Time remaining: {formatTime(timeLeft)}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={handleJoinSession}
              className="bg-white text-green-600 px-4 py-2 rounded-md font-medium hover:bg-gray-100 transition-colors"
            >
              Join Terminal
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show paused session banner
  if (activeSession && activeSession.status === 'PAUSED') {
    return (
      <div className="fixed top-0 left-0 right-0 z-50 bg-yellow-600 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <PauseIcon className="h-5 w-5" />
              <div>
                <div className="font-medium">Session Paused: {activeSession.lessonTitle}</div>
                <div className="text-sm opacity-90">Trading is temporarily suspended</div>
              </div>
            </div>
            <button
              onClick={handleJoinSession}
              className="bg-white text-yellow-600 px-4 py-2 rounded-md font-medium hover:bg-gray-100 transition-colors"
            >
              View Terminal
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show notifications
  const visibleNotifications = notifications.filter(notif => !dismissed.has(notif.id));

  if (visibleNotifications.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50">
      {visibleNotifications.map((notification) => (
        <div
          key={notification.id}
          className={`border-l-4 p-4 ${getNotificationColor(notification.type)} shadow-lg`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3">
              {getNotificationIcon(notification.type)}
              <div className="flex-1">
                <h3 className="font-medium">{notification.title}</h3>
                <p className="text-sm mt-1">{notification.message}</p>
                {notification.type === 'SESSION_STARTING' && (
                  <button
                    onClick={handleJoinSession}
                    className="mt-3 bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-green-700 transition-colors"
                  >
                    Join Trading Session
                  </button>
                )}
              </div>
            </div>
            <button
              onClick={() => handleDismissNotification(notification.id)}
              className="ml-4 text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}