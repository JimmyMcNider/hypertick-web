/**
 * Privilege Manager Component
 * 
 * Provides instructor interface for managing student privileges,
 * viewing privilege matrices, and controlling privilege auctions
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useWebSocket } from '@/hooks/useWebSocket';
import { PRIVILEGE_DEFINITIONS } from '@/lib/privilege-system';
import { sessionManager } from '@/lib/session-manager';
import { 
  Users, 
  Crown, 
  Gavel, 
  Shield, 
  TrendingUp,
  Clock,
  DollarSign,
  AlertCircle,
  CheckCircle,
  X
} from 'lucide-react';

interface PrivilegeManagerProps {
  sessionId: string;
  participants: any[];
}

interface AuctionData {
  id: string;
  privilegeId: number;
  privilegeName: string;
  minBid: number;
  endTime: Date;
  bids: Array<{ userId: string; amount: number; timestamp: Date }>;
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
}

export default function PrivilegeManager({ sessionId, participants }: PrivilegeManagerProps) {
  const [privilegeMatrix, setPrivilegeMatrix] = useState<Record<string, Record<number, boolean>>>({});
  const [privilegeStats, setPrivilegeStats] = useState<any>({});
  const [activeAuctions, setActiveAuctions] = useState<AuctionData[]>([]);
  const [selectedPrivilege, setSelectedPrivilege] = useState<number | null>(null);
  const [selectedTargetRole, setSelectedTargetRole] = useState<string>('$All');
  const [auctionMinBid, setAuctionMinBid] = useState(100);
  const [auctionDuration, setAuctionDuration] = useState(300); // 5 minutes
  
  // Use WebSocket for real-time privilege management
  const { connected, socket } = useWebSocket({ 
    sessionId, 
    userId: 'instructor', // This would come from auth context in real implementation
    role: 'Instructor' 
  });

  useEffect(() => {
    // Load initial privilege data
    loadPrivilegeData();
    
    // Set up real-time updates
    const interval = setInterval(loadPrivilegeData, 2000);
    return () => clearInterval(interval);
  }, [sessionId]);

  const loadPrivilegeData = () => {
    try {
      const matrix = sessionManager.getPrivilegeMatrix(sessionId);
      const stats = sessionManager.getPrivilegeStats(sessionId);
      const auctions = sessionManager.getActiveAuctions(sessionId);
      
      setPrivilegeMatrix(matrix);
      setPrivilegeStats(stats);
      const mappedAuctions = auctions.map(auction => ({
        ...auction,
        privilegeName: PRIVILEGE_DEFINITIONS[auction.privilegeId]?.name || `Privilege ${auction.privilegeId}`
      }));
      setActiveAuctions(mappedAuctions);
    } catch (error) {
      console.error('Failed to load privilege data:', error);
    }
  };

  const handleGrantPrivilege = async () => {
    if (!selectedPrivilege || !socket) return;

    try {
      socket.emit('privilege_command', {
        action: 'GRANT_PRIVILEGE',
        privilegeId: selectedPrivilege,
        targetRole: selectedTargetRole
      });
      
      loadPrivilegeData();
    } catch (error) {
      console.error('Failed to grant privilege:', error);
    }
  };

  const handleRevokePrivilege = async () => {
    if (!selectedPrivilege || !socket) return;

    try {
      socket.emit('privilege_command', {
        action: 'REMOVE_PRIVILEGE',
        privilegeId: selectedPrivilege,
        targetRole: selectedTargetRole
      });
      
      loadPrivilegeData();
    } catch (error) {
      console.error('Failed to revoke privilege:', error);
    }
  };

  const handleStartAuction = async () => {
    if (!selectedPrivilege) return;

    const privilege = PRIVILEGE_DEFINITIONS[selectedPrivilege];
    if (!privilege?.auctionable) {
      alert('This privilege is not auctionable');
      return;
    }

    try {
      if (socket) {
        socket.emit('privilege_command', {
          action: 'CREATE_AUCTION',
          privilegeId: selectedPrivilege,
          minBid: auctionMinBid,
          duration: auctionDuration
        });
        
        loadPrivilegeData();
      }
    } catch (error) {
      console.error('Failed to start auction:', error);
    }
  };

  const getPrivilegeIcon = (category: string) => {
    switch (category) {
      case 'TRADING': return <TrendingUp className="h-4 w-4" />;
      case 'MARKET_MAKING': return <Crown className="h-4 w-4" />;
      case 'INFORMATION': return <Shield className="h-4 w-4" />;
      case 'ANALYSIS': return <Users className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getPrivilegeColor = (category: string) => {
    switch (category) {
      case 'TRADING': return 'bg-blue-100 text-blue-800';
      case 'MARKET_MAKING': return 'bg-purple-100 text-purple-800';
      case 'INFORMATION': return 'bg-green-100 text-green-800';
      case 'ANALYSIS': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatTimeRemaining = (endTime: Date) => {
    const remaining = Math.max(0, endTime.getTime() - Date.now());
    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Shield className="h-6 w-6" />
        <h2 className="text-2xl font-bold">Privilege Management</h2>
      </div>

      <Tabs defaultValue="matrix" className="space-y-4">
        <TabsList>
          <TabsTrigger value="matrix">Privilege Matrix</TabsTrigger>
          <TabsTrigger value="control">Grant/Revoke</TabsTrigger>
          <TabsTrigger value="auctions">Auctions</TabsTrigger>
          <TabsTrigger value="stats">Statistics</TabsTrigger>
        </TabsList>

        <TabsContent value="matrix" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Student Privilege Matrix
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Student</th>
                      {Object.entries(PRIVILEGE_DEFINITIONS).map(([id, def]) => (
                        <th key={id} className="text-center p-1 min-w-[100px]">
                          <div className="flex flex-col items-center gap-1">
                            {getPrivilegeIcon(def.category)}
                            <span className="text-xs">{def.name}</span>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {participants.map((participant) => (
                      <tr key={participant.userId} className="border-b hover:bg-gray-50">
                        <td className="p-2 font-medium">{participant.username}</td>
                        {Object.keys(PRIVILEGE_DEFINITIONS).map((privilegeId) => {
                          const hasPrivilege = privilegeMatrix[participant.userId]?.[parseInt(privilegeId)] || false;
                          return (
                            <td key={privilegeId} className="text-center p-1">
                              {hasPrivilege ? (
                                <CheckCircle className="h-5 w-5 text-green-500 mx-auto" />
                              ) : (
                                <X className="h-5 w-5 text-gray-300 mx-auto" />
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="control" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Grant/Revoke Privileges</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="privilege-select">Select Privilege</Label>
                  <Select value={selectedPrivilege?.toString() || ''} onValueChange={(value) => setSelectedPrivilege(parseInt(value))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose privilege..." />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(PRIVILEGE_DEFINITIONS).map(([id, def]) => (
                        <SelectItem key={id} value={id}>
                          <div className="flex items-center gap-2">
                            {getPrivilegeIcon(def.category)}
                            <span>{def.name}</span>
                            <Badge className={getPrivilegeColor(def.category)}>
                              {def.category}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="target-role">Target Role</Label>
                  <Select value={selectedTargetRole} onValueChange={setSelectedTargetRole}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="$All">All Participants</SelectItem>
                      <SelectItem value="$Students">All Students</SelectItem>
                      <SelectItem value="$Speculators">Speculators</SelectItem>
                      <SelectItem value="$MarketMakers">Market Makers</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {selectedPrivilege && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium mb-2">{PRIVILEGE_DEFINITIONS[selectedPrivilege].name}</h4>
                  <p className="text-sm text-gray-600 mb-3">{PRIVILEGE_DEFINITIONS[selectedPrivilege].description}</p>
                  <div className="flex gap-2">
                    <Badge className={getPrivilegeColor(PRIVILEGE_DEFINITIONS[selectedPrivilege].category)}>
                      {PRIVILEGE_DEFINITIONS[selectedPrivilege].category}
                    </Badge>
                    {PRIVILEGE_DEFINITIONS[selectedPrivilege].auctionable && (
                      <Badge variant="outline">Auctionable</Badge>
                    )}
                    {PRIVILEGE_DEFINITIONS[selectedPrivilege].maxHolders && (
                      <Badge variant="outline">
                        Max: {PRIVILEGE_DEFINITIONS[selectedPrivilege].maxHolders}
                      </Badge>
                    )}
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Button 
                  onClick={handleGrantPrivilege}
                  disabled={!selectedPrivilege}
                  className="flex-1"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Grant Privilege
                </Button>
                <Button 
                  onClick={handleRevokePrivilege}
                  disabled={!selectedPrivilege}
                  variant="destructive"
                  className="flex-1"
                >
                  <X className="h-4 w-4 mr-2" />
                  Revoke Privilege
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="auctions" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gavel className="h-5 w-5" />
                  Start New Auction
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Privilege to Auction</Label>
                  <Select value={selectedPrivilege?.toString() || ''} onValueChange={(value) => setSelectedPrivilege(parseInt(value))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose privilege..." />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(PRIVILEGE_DEFINITIONS)
                        .filter(([_, def]) => def.auctionable)
                        .map(([id, def]) => (
                          <SelectItem key={id} value={id}>
                            <div className="flex items-center gap-2">
                              {getPrivilegeIcon(def.category)}
                              <span>{def.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="min-bid">Minimum Bid ($)</Label>
                    <Input
                      id="min-bid"
                      type="number"
                      value={auctionMinBid}
                      onChange={(e) => setAuctionMinBid(parseInt(e.target.value))}
                      min="1"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="duration">Duration (seconds)</Label>
                    <Input
                      id="duration"
                      type="number"
                      value={auctionDuration}
                      onChange={(e) => setAuctionDuration(parseInt(e.target.value))}
                      min="30"
                      max="600"
                    />
                  </div>
                </div>

                <Button 
                  onClick={handleStartAuction}
                  disabled={!selectedPrivilege || !PRIVILEGE_DEFINITIONS[selectedPrivilege]?.auctionable}
                  className="w-full"
                >
                  <Gavel className="h-4 w-4 mr-2" />
                  Start Auction
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Active Auctions
                </CardTitle>
              </CardHeader>
              <CardContent>
                {activeAuctions.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No active auctions</p>
                ) : (
                  <div className="space-y-3">
                    {activeAuctions.map((auction) => (
                      <div key={auction.id} className="p-3 border rounded-lg">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-medium">{auction.privilegeName}</h4>
                          <Badge variant={auction.status === 'ACTIVE' ? 'default' : 'secondary'}>
                            {auction.status}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-gray-500">Min Bid:</span>
                            <span className="ml-1 font-medium">${auction.minBid}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Time Left:</span>
                            <span className="ml-1 font-medium">
                              {formatTimeRemaining(auction.endTime)}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-500">Bids:</span>
                            <span className="ml-1 font-medium">{auction.bids.length}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">High Bid:</span>
                            <span className="ml-1 font-medium">
                              {auction.bids.length > 0 ? `$${Math.max(...auction.bids.map(b => b.amount))}` : 'None'}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="stats" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {Object.entries(PRIVILEGE_DEFINITIONS).map(([id, def]) => {
              const stats = privilegeStats[parseInt(id)] || { holders: 0, totalGranted: 0, auctionWins: 0 };
              return (
                <Card key={id}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      {getPrivilegeIcon(def.category)}
                      {def.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Current Holders:</span>
                        <span className="font-medium">{stats.holders}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Total Granted:</span>
                        <span className="font-medium">{stats.totalGranted}</span>
                      </div>
                      {def.auctionable && (
                        <>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Auction Wins:</span>
                            <span className="font-medium">{stats.auctionWins}</span>
                          </div>
                          {stats.averageBid && (
                            <div className="flex justify-between">
                              <span className="text-gray-500">Avg Bid:</span>
                              <span className="font-medium">${stats.averageBid.toFixed(0)}</span>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}