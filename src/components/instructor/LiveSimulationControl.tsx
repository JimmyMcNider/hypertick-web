/**
 * Live Simulation Control Component
 * 
 * Enhanced instructor interface for real-time simulation management
 * with WebSocket integration and advanced controls
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useWebSocket } from '@/hooks/useWebSocket';
import SimulationControl from './SimulationControl';
import { 
  Users, 
  Activity, 
  TrendingUp,
  Clock,
  DollarSign,
  AlertCircle,
  CheckCircle,
  Pause,
  Play,
  Square,
  Settings,
  Megaphone,
  Eye,
  VolumeX,
  Volume2
} from 'lucide-react';

interface LiveSimulationControlProps {
  user: any;
  classId: string;
}

interface SimulationSession {
  id: string;
  lessonTitle: string;
  scenario: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'PAUSED' | 'COMPLETED';
  participants: SessionParticipant[];
  currentTick: number;
  marketOpen: boolean;
  startTime?: Date;
  timeRemaining: number;
}

interface SessionParticipant {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  isConnected: boolean;
  terminalStatus: 'OFFLINE' | 'CONNECTING' | 'ONLINE';
  lastActivity: Date;
  performance?: {
    totalPnL: number;
    tradesExecuted: number;
    riskScore: number;
  };
}

export default function LiveSimulationControl({ user, classId }: LiveSimulationControlProps) {
  const [session, setSession] = useState<SimulationSession | null>(null);
  const [sessionId, setSessionId] = useState<string>('');
  const [announcements, setAnnouncements] = useState<string[]>([]);
  const [currentAnnouncement, setCurrentAnnouncement] = useState('');
  const [showAdvancedControls, setShowAdvancedControls] = useState(false);

  // WebSocket integration for real-time updates
  const { connected, socket, activeUsers } = useWebSocket({ 
    sessionId, 
    userId: user?.id || '', 
    role: 'Instructor' 
  });

  useEffect(() => {
    if (socket) {
      // Listen for simulation updates
      socket.on('simulation_update', (data: any) => {
        console.log('Simulation update:', data);
        loadSessionData();
      });

      socket.on('user_joined', (data: any) => {
        console.log('User joined:', data);
        loadSessionData();
      });

      socket.on('user_left', (data: any) => {
        console.log('User left:', data);
        loadSessionData();
      });

      return () => {
        socket.off('simulation_update');
        socket.off('user_joined');
        socket.off('user_left');
      };
    }
  }, [socket]);

  const loadSessionData = async () => {
    if (!sessionId) return;
    
    try {
      const response = await fetch(`/api/simulations/${sessionId}`);
      if (response.ok) {
        const data = await response.json();
        setSession({
          id: data.id,
          lessonTitle: data.lesson,
          scenario: data.scenario,
          status: data.status,
          participants: [], // Would need to be populated from API
          currentTick: data.tick,
          marketOpen: data.marketOpen,
          timeRemaining: data.timeRemaining
        });
      }
    } catch (error) {
      console.error('Failed to load session data:', error);
    }
  };

  const handleAnnouncement = () => {
    if (!currentAnnouncement.trim() || !socket) return;

    socket.emit('instructor_announcement', {
      message: currentAnnouncement,
      timestamp: new Date()
    });

    setAnnouncements(prev => [currentAnnouncement, ...prev.slice(0, 9)]);
    setCurrentAnnouncement('');
  };

  const handlePrivilegeToggle = (privilegeId: number, enabled: boolean) => {
    if (!socket) return;

    socket.emit('privilege_command', {
      action: enabled ? 'GRANT_PRIVILEGE' : 'REMOVE_PRIVILEGE',
      privilegeId,
      targetRole: '$All'
    });
  };

  const getConnectionStatusColor = (status: string) => {
    switch (status) {
      case 'ONLINE': return 'bg-green-500';
      case 'CONNECTING': return 'bg-yellow-500';
      default: return 'bg-red-500';
    }
  };

  return (
    <div className="space-y-6">
      {/* Main Simulation Control */}
      <SimulationControl 
        classId={classId}
        userId={user?.id || ''}
      />

      {/* Enhanced Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Real-time Connection Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Live Session Status
              <div className={`w-3 h-3 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">WebSocket Connection</span>
                <Badge variant={connected ? "default" : "destructive"}>
                  {connected ? 'Connected' : 'Disconnected'}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Active Users</span>
                <span className="font-medium">{activeUsers.length}</span>
              </div>
              {session && (
                <>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Current Tick</span>
                    <span className="font-medium">#{session.currentTick}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Market Status</span>
                    <Badge variant={session.marketOpen ? "default" : "secondary"}>
                      {session.marketOpen ? 'Open' : 'Closed'}
                    </Badge>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Instructor Announcements */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Megaphone className="w-5 h-5" />
              Live Announcements
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex gap-2">
                <Input
                  placeholder="Type announcement to all students..."
                  value={currentAnnouncement}
                  onChange={(e) => setCurrentAnnouncement(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAnnouncement()}
                />
                <Button 
                  onClick={handleAnnouncement}
                  disabled={!currentAnnouncement.trim() || !connected}
                  size="sm"
                >
                  Send
                </Button>
              </div>
              
              {announcements.length > 0 && (
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  <div className="text-sm font-medium text-gray-700">Recent:</div>
                  {announcements.map((announcement, index) => (
                    <div key={index} className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                      {announcement}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Advanced Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Advanced Session Controls
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAdvancedControls(!showAdvancedControls)}
            >
              {showAdvancedControls ? 'Hide' : 'Show'} Advanced
            </Button>
          </CardTitle>
        </CardHeader>
        {showAdvancedControls && (
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Quick Privilege Toggles */}
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Quick Privilege Toggles</h4>
                {[
                  { id: 1, name: 'Market Orders', enabled: true },
                  { id: 2, name: 'Limit Orders', enabled: true },
                  { id: 9, name: 'Market Depth', enabled: false },
                  { id: 15, name: 'News Window', enabled: false }
                ].map((privilege) => (
                  <div key={privilege.id} className="flex items-center justify-between">
                    <span className="text-sm">{privilege.name}</span>
                    <Button
                      variant={privilege.enabled ? "default" : "outline"}
                      size="sm"
                      onClick={() => handlePrivilegeToggle(privilege.id, !privilege.enabled)}
                    >
                      {privilege.enabled ? 'Enabled' : 'Disabled'}
                    </Button>
                  </div>
                ))}
              </div>

              {/* Session Metrics */}
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Session Metrics</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Total Orders:</span>
                    <span>0</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Volume:</span>
                    <span>$0</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Avg P&L:</span>
                    <span>$0.00</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Active Traders:</span>
                    <span>{activeUsers.length}</span>
                  </div>
                </div>
              </div>

              {/* Emergency Controls */}
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Emergency Controls</h4>
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-left justify-start"
                    disabled={!connected}
                  >
                    <AlertCircle className="w-4 h-4 mr-2" />
                    Halt All Trading
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-left justify-start"
                    disabled={!connected}
                  >
                    <VolumeX className="w-4 h-4 mr-2" />
                    Mute All Students
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-left justify-start"
                    disabled={!connected}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Force Refresh All
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}