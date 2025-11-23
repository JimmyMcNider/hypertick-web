/**
 * Legend Trading Workspace
 *
 * Robinhood Legend-style professional trading interface
 * with resizable, draggable panels and preset layouts.
 */

'use client';

import { useState, useEffect } from 'react';
import LegendWorkspace from '@/components/trading/LegendWorkspace';

export default function LegendPage() {
  const [sessionId, setSessionId] = useState<string>('');
  const [userId, setUserId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing session in localStorage
    const storedSession = localStorage.getItem('currentSession');
    const storedUser = localStorage.getItem('currentUser');

    if (storedSession && storedUser) {
      try {
        const session = JSON.parse(storedSession);
        const user = JSON.parse(storedUser);
        setSessionId(session.id);
        setUserId(user.id);
      } catch (e) {
        // Use demo values if parsing fails
        setSessionId('demo-session-001');
        setUserId('demo-user-001');
      }
    } else {
      // Use demo values for testing
      setSessionId('demo-session-001');
      setUserId('demo-user-001');
    }
    setIsLoading(false);
  }, []);

  if (isLoading) {
    return (
      <div className="h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <LegendWorkspace
      sessionId={sessionId}
      userId={userId}
      symbol="AOE"
      onSymbolChange={(symbol) => console.log('Symbol changed:', symbol)}
    />
  );
}
