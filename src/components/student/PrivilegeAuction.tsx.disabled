/**
 * Privilege Auction Component for Students
 * 
 * Allows students to view and participate in privilege auctions,
 * showing current bids, time remaining, and bid placement interface
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useWebSocketSession } from '@/hooks/useWebSocket';
import { PRIVILEGE_DEFINITIONS } from '@/lib/privilege-system';
import { sessionManager } from '@/lib/session-manager';
import { 
  Gavel, 
  Clock, 
  DollarSign, 
  TrendingUp,
  Crown,
  Shield,
  Users,
  AlertCircle,
  Timer,
  Trophy,
  Zap,
  X
} from 'lucide-react';

interface PrivilegeAuctionProps {
  sessionId: string;
  userId: string;
  currentCash: number;
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

export default function PrivilegeAuction({ sessionId, userId, currentCash }: PrivilegeAuctionProps) {
  const [activeAuctions, setActiveAuctions] = useState<AuctionData[]>([]);
  const [bidAmounts, setBidAmounts] = useState<Record<string, number>>({});
  const [userPrivileges, setUserPrivileges] = useState<number[]>([]);
  const [timeRemaining, setTimeRemaining] = useState<Record<string, number>>({});
  
  const ws = useWebSocketSession(sessionId);

  useEffect(() => {
    loadAuctionData();
    
    // Update time remaining every second
    const timeInterval = setInterval(() => {
      updateTimeRemaining();
    }, 1000);

    // Refresh auction data every 5 seconds
    const dataInterval = setInterval(loadAuctionData, 5000);

    return () => {
      clearInterval(timeInterval);
      clearInterval(dataInterval);
    };
  }, [sessionId]);

  const loadAuctionData = () => {
    try {
      const auctions = sessionManager.getActiveAuctions(sessionId);
      const mappedAuctions = auctions.map(auction => ({
        ...auction,
        privilegeName: PRIVILEGE_DEFINITIONS[auction.privilegeId]?.name || `Privilege ${auction.privilegeId}`
      }));
      setActiveAuctions(mappedAuctions);

      // Initialize bid amounts to minimum bid + 10
      const newBidAmounts: Record<string, number> = {};
      mappedAuctions.forEach(auction => {
        const currentHighBid = auction.bids.length > 0 
          ? Math.max(...auction.bids.map(b => b.amount))
          : auction.minBid - 10;
        newBidAmounts[auction.id] = Math.max(auction.minBid, currentHighBid + 10);
      });
      setBidAmounts(newBidAmounts);

      // Load user privileges
      const privilegeMatrix = sessionManager.getPrivilegeMatrix(sessionId);
      if (privilegeMatrix[userId]) {
        const privileges = Object.keys(privilegeMatrix[userId])
          .filter(id => privilegeMatrix[userId][parseInt(id)])
          .map(id => parseInt(id));
        setUserPrivileges(privileges);
      }
    } catch (error) {
      console.error('Failed to load auction data:', error);
    }
  };

  const updateTimeRemaining = () => {
    const now = Date.now();
    const newTimeRemaining: Record<string, number> = {};
    
    activeAuctions.forEach(auction => {
      const remaining = Math.max(0, auction.endTime.getTime() - now);
      newTimeRemaining[auction.id] = remaining;
    });
    
    setTimeRemaining(newTimeRemaining);
  };

  const placeBid = async (auctionId: string) => {
    const bidAmount = bidAmounts[auctionId];
    
    if (bidAmount > currentCash) {
      alert('Insufficient cash for this bid');
      return;
    }

    try {
      await sessionManager.placeBid(sessionId, auctionId, userId, bidAmount);
      loadAuctionData(); // Refresh data after successful bid
    } catch (error) {
      console.error('Failed to place bid:', error);
      alert('Failed to place bid: ' + (error as Error).message);
    }
  };

  const formatTime = (milliseconds: number) => {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getPrivilegeIcon = (category: string) => {
    switch (category) {
      case 'TRADING': return <TrendingUp className="h-5 w-5" />;
      case 'MARKET_MAKING': return <Crown className="h-5 w-5" />;
      case 'INFORMATION': return <Shield className="h-5 w-5" />;
      case 'ANALYSIS': return <Users className="h-5 w-5" />;
      default: return <AlertCircle className="h-5 w-5" />;
    }
  };

  const getPrivilegeColor = (category: string) => {
    switch (category) {
      case 'TRADING': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'MARKET_MAKING': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'INFORMATION': return 'bg-green-100 text-green-800 border-green-200';
      case 'ANALYSIS': return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const isUserHighBidder = (auction: AuctionData) => {
    if (auction.bids.length === 0) return false;
    const highestBid = Math.max(...auction.bids.map(b => b.amount));
    const userBid = auction.bids.find(b => b.userId === userId && b.amount === highestBid);
    return !!userBid;
  };

  const getUserCurrentBid = (auction: AuctionData) => {
    const userBid = auction.bids.find(b => b.userId === userId);
    return userBid?.amount || 0;
  };

  const getTimeUrgency = (remaining: number) => {
    if (remaining < 60000) return 'text-red-600'; // Less than 1 minute
    if (remaining < 180000) return 'text-orange-600'; // Less than 3 minutes
    return 'text-green-600';
  };

  if (activeAuctions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gavel className="h-5 w-5" />
            Privilege Auctions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Gavel className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No active auctions at this time</p>
            <p className="text-sm text-gray-400 mt-2">
              Auctions will appear here when the instructor starts them
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Gavel className="h-6 w-6" />
          <h2 className="text-2xl font-bold">Privilege Auctions</h2>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <DollarSign className="h-4 w-4" />
          <span>Available Cash: <span className="font-bold">${currentCash.toLocaleString()}</span></span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {activeAuctions.map((auction) => {
          const privilege = PRIVILEGE_DEFINITIONS[auction.privilegeId];
          const currentHighBid = auction.bids.length > 0 
            ? Math.max(...auction.bids.map(b => b.amount))
            : 0;
          const userCurrentBid = getUserCurrentBid(auction);
          const isHighBidder = isUserHighBidder(auction);
          const remaining = timeRemaining[auction.id] || 0;
          const hasPrivilege = userPrivileges.includes(auction.privilegeId);

          return (
            <Card key={auction.id} className={`border-2 ${isHighBidder ? 'border-green-300 bg-green-50' : 'border-gray-200'}`}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    {getPrivilegeIcon(privilege.category)}
                    {auction.privilegeName}
                  </CardTitle>
                  <Badge className={getPrivilegeColor(privilege.category)}>
                    {privilege.category}
                  </Badge>
                </div>
                <p className="text-sm text-gray-600">{privilege.description}</p>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Time and Status */}
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Timer className={`h-4 w-4 ${getTimeUrgency(remaining)}`} />
                    <span className={`font-bold ${getTimeUrgency(remaining)}`}>
                      {formatTime(remaining)}
                    </span>
                    <span className="text-sm text-gray-500">remaining</span>
                  </div>
                  {isHighBidder && (
                    <div className="flex items-center gap-1">
                      <Trophy className="h-4 w-4 text-yellow-600" />
                      <span className="text-sm font-medium text-yellow-700">Leading</span>
                    </div>
                  )}
                </div>

                {/* Current Status */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Min Bid:</span>
                    <span className="ml-2 font-bold">${auction.minBid}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">High Bid:</span>
                    <span className="ml-2 font-bold">
                      {currentHighBid > 0 ? `$${currentHighBid}` : 'None'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Total Bids:</span>
                    <span className="ml-2 font-bold">{auction.bids.length}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Your Bid:</span>
                    <span className="ml-2 font-bold">
                      {userCurrentBid > 0 ? `$${userCurrentBid}` : 'None'}
                    </span>
                  </div>
                </div>

                {/* Already Have Privilege Warning */}
                {hasPrivilege && (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-yellow-600" />
                      <span className="text-sm text-yellow-700">
                        You already have this privilege
                      </span>
                    </div>
                  </div>
                )}

                {/* Prerequisites */}
                {privilege.prerequisites && privilege.prerequisites.length > 0 && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="text-sm">
                      <span className="text-blue-700 font-medium">Prerequisites:</span>
                      <div className="mt-1 space-y-1">
                        {privilege.prerequisites.map(prereqId => {
                          const prereq = PRIVILEGE_DEFINITIONS[prereqId];
                          const hasPrereq = userPrivileges.includes(prereqId);
                          return (
                            <div key={prereqId} className="flex items-center gap-2">
                              {hasPrereq ? (
                                <Zap className="h-3 w-3 text-green-600" />
                              ) : (
                                <X className="h-3 w-3 text-red-600" />
                              )}
                              <span className={hasPrereq ? 'text-green-700' : 'text-red-700'}>
                                {prereq.name}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* Bidding Interface */}
                <div className="space-y-3 pt-2 border-t">
                  <div className="flex items-center gap-2">
                    <Label htmlFor={`bid-${auction.id}`} className="text-sm font-medium">
                      Your Bid:
                    </Label>
                    <Input
                      id={`bid-${auction.id}`}
                      type="number"
                      value={bidAmounts[auction.id] || auction.minBid}
                      onChange={(e) => setBidAmounts(prev => ({
                        ...prev,
                        [auction.id]: parseInt(e.target.value) || auction.minBid
                      }))}
                      min={Math.max(auction.minBid, currentHighBid + 1)}
                      max={currentCash}
                      className="flex-1"
                    />
                  </div>

                  <Button
                    onClick={() => placeBid(auction.id)}
                    disabled={
                      remaining <= 0 ||
                      (bidAmounts[auction.id] || 0) > currentCash ||
                      (bidAmounts[auction.id] || 0) < Math.max(auction.minBid, currentHighBid + 1)
                    }
                    className="w-full"
                    variant={isHighBidder ? "outline" : "default"}
                  >
                    <Gavel className="h-4 w-4 mr-2" />
                    {isHighBidder ? 'Increase Bid' : 'Place Bid'} - ${bidAmounts[auction.id] || auction.minBid}
                  </Button>
                </div>

                {/* Recent Bidding Activity */}
                {auction.bids.length > 0 && (
                  <div className="pt-2 border-t">
                    <div className="text-sm font-medium mb-2">Recent Bids:</div>
                    <div className="space-y-1 max-h-20 overflow-y-auto">
                      {auction.bids
                        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
                        .slice(0, 3)
                        .map((bid, index) => (
                          <div key={index} className="flex justify-between items-center text-xs">
                            <span className={bid.userId === userId ? 'font-bold text-blue-600' : 'text-gray-600'}>
                              {bid.userId === userId ? 'You' : 'Bidder'}
                            </span>
                            <span className="font-medium">${bid.amount}</span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}