/**
 * Performance Dashboard Component
 * 
 * Comprehensive analytics dashboard showcasing platform capabilities
 * for demos and presentations
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { sessionManager } from '@/lib/session-manager';
import { PRIVILEGE_DEFINITIONS } from '@/lib/privilege-system';
import { 
  TrendingUp, 
  TrendingDown,
  DollarSign,
  Users,
  Activity,
  Target,
  Award,
  BarChart3,
  PieChart,
  LineChart,
  Zap,
  Crown,
  Shield,
  AlertTriangle,
  CheckCircle,
  Clock,
  Gauge
} from 'lucide-react';

interface PerformanceDashboardProps {
  sessionId: string;
}

interface ParticipantPerformance {
  userId: string;
  username: string;
  strategy: string;
  totalPnL: number;
  totalVolume: number;
  numTrades: number;
  winRate: number;
  sharpeRatio: number;
  maxDrawdown: number;
  privilegesHeld: number[];
  auctionParticipation: number;
  riskMetrics: {
    var95: number;
    leverage: number;
    concentration: number;
  };
}

interface MarketMetrics {
  totalVolume: number;
  averageSpread: number;
  priceEfficiency: number;
  liquidityScore: number;
  volatilityIndex: number;
  marketImpact: number;
}

export default function PerformanceDashboard({ sessionId }: PerformanceDashboardProps) {
  const [participants, setParticipants] = useState<ParticipantPerformance[]>([]);
  const [marketMetrics, setMarketMetrics] = useState<MarketMetrics>({
    totalVolume: 0,
    averageSpread: 0,
    priceEfficiency: 0,
    liquidityScore: 0,
    volatilityIndex: 0,
    marketImpact: 0
  });
  const [privilegeStats, setPrivilegeStats] = useState<any>({});
  const [selectedTimeframe, setSelectedTimeframe] = useState<'1m' | '5m' | '15m' | 'all'>('all');
  const [isLive, setIsLive] = useState(true);

  useEffect(() => {
    loadPerformanceData();
    
    let interval: NodeJS.Timeout;
    if (isLive) {
      interval = setInterval(loadPerformanceData, 3000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [sessionId, selectedTimeframe, isLive]);

  const loadPerformanceData = () => {
    try {
      // Generate mock performance data for demo
      const mockParticipants: ParticipantPerformance[] = [
        {
          userId: 'alice-trader',
          username: 'Alice (Aggressive)',
          strategy: 'Day Trading',
          totalPnL: 1250,
          totalVolume: 45000,
          numTrades: 23,
          winRate: 68.2,
          sharpeRatio: 1.45,
          maxDrawdown: -8.5,
          privilegesHeld: [1, 2, 3, 7, 9],
          auctionParticipation: 3,
          riskMetrics: {
            var95: -450,
            leverage: 2.1,
            concentration: 0.35
          }
        },
        {
          userId: 'carol-marketmaker',
          username: 'Carol (Market Maker)',
          strategy: 'Market Making',
          totalPnL: 890,
          totalVolume: 62000,
          numTrades: 156,
          winRate: 82.5,
          sharpeRatio: 2.12,
          maxDrawdown: -3.2,
          privilegesHeld: [1, 2, 5, 6, 7, 9],
          auctionParticipation: 2,
          riskMetrics: {
            var95: -180,
            leverage: 1.2,
            concentration: 0.15
          }
        },
        {
          userId: 'david-arbitrage',
          username: 'David (Arbitrageur)',
          strategy: 'Arbitrage',
          totalPnL: 670,
          totalVolume: 28000,
          numTrades: 41,
          winRate: 78.9,
          sharpeRatio: 1.89,
          maxDrawdown: -5.1,
          privilegesHeld: [1, 2, 7, 8, 11],
          auctionParticipation: 4,
          riskMetrics: {
            var95: -220,
            leverage: 1.8,
            concentration: 0.22
          }
        },
        {
          userId: 'bob-conservative',
          username: 'Bob (Conservative)',
          strategy: 'Buy & Hold',
          totalPnL: 320,
          totalVolume: 12000,
          numTrades: 8,
          winRate: 75.0,
          sharpeRatio: 1.22,
          maxDrawdown: -2.8,
          privilegesHeld: [1, 2, 7],
          auctionParticipation: 0,
          riskMetrics: {
            var95: -150,
            leverage: 0.8,
            concentration: 0.45
          }
        },
        {
          userId: 'eve-insider',
          username: 'Eve (Insider)',
          strategy: 'Information Trading',
          totalPnL: 1450,
          totalVolume: 35000,
          numTrades: 19,
          winRate: 84.2,
          sharpeRatio: 2.34,
          maxDrawdown: -4.5,
          privilegesHeld: [1, 2, 7, 8, 10],
          auctionParticipation: 1,
          riskMetrics: {
            var95: -280,
            leverage: 1.5,
            concentration: 0.28
          }
        }
      ];

      const mockMarketMetrics: MarketMetrics = {
        totalVolume: 182000,
        averageSpread: 0.12,
        priceEfficiency: 92.5,
        liquidityScore: 78.3,
        volatilityIndex: 24.6,
        marketImpact: 0.08
      };

      setParticipants(mockParticipants);
      setMarketMetrics(mockMarketMetrics);

      // Load real privilege stats
      const privilegeData = sessionManager.getPrivilegeStats(sessionId);
      setPrivilegeStats(privilegeData);
    } catch (error) {
      console.error('Failed to load performance data:', error);
    }
  };

  const getPerformanceColor = (value: number, type: 'pnl' | 'percentage' = 'pnl') => {
    if (type === 'pnl') {
      return value > 0 ? 'text-green-600' : value < 0 ? 'text-red-600' : 'text-gray-600';
    } else {
      return value > 75 ? 'text-green-600' : value > 50 ? 'text-yellow-600' : 'text-red-600';
    }
  };

  const getStrategyIcon = (strategy: string) => {
    switch (strategy.toLowerCase()) {
      case 'day trading': return <Zap className="h-4 w-4" />;
      case 'market making': return <Crown className="h-4 w-4" />;
      case 'arbitrage': return <Target className="h-4 w-4" />;
      case 'buy & hold': return <Shield className="h-4 w-4" />;
      case 'information trading': return <Activity className="h-4 w-4" />;
      default: return <BarChart3 className="h-4 w-4" />;
    }
  };

  const getRiskLevel = (sharpe: number, maxDrawdown: number) => {
    if (sharpe > 2 && maxDrawdown > -5) return { level: 'Low', color: 'bg-green-100 text-green-800' };
    if (sharpe > 1.5 && maxDrawdown > -10) return { level: 'Medium', color: 'bg-yellow-100 text-yellow-800' };
    return { level: 'High', color: 'bg-red-100 text-red-800' };
  };

  const sortedParticipants = [...participants].sort((a, b) => b.totalPnL - a.totalPnL);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-6 w-6" />
          <h2 className="text-2xl font-bold">Performance Dashboard</h2>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <Button
              variant={isLive ? "default" : "outline"}
              size="sm"
              onClick={() => setIsLive(!isLive)}
            >
              <Activity className="h-4 w-4 mr-2" />
              {isLive ? 'Live' : 'Paused'}
            </Button>
          </div>
        </div>
      </div>

      {/* Market Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-600" />
              <div>
                <div className="text-2xl font-bold">${(marketMetrics.totalVolume / 1000).toFixed(0)}K</div>
                <div className="text-xs text-gray-500">Total Volume</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-blue-600" />
              <div>
                <div className="text-2xl font-bold">{marketMetrics.priceEfficiency.toFixed(1)}%</div>
                <div className="text-xs text-gray-500">Price Efficiency</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Gauge className="h-4 w-4 text-purple-600" />
              <div>
                <div className="text-2xl font-bold">{marketMetrics.liquidityScore.toFixed(0)}</div>
                <div className="text-xs text-gray-500">Liquidity Score</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-orange-600" />
              <div>
                <div className="text-2xl font-bold">{marketMetrics.volatilityIndex.toFixed(1)}</div>
                <div className="text-xs text-gray-500">Volatility Index</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-red-600" />
              <div>
                <div className="text-2xl font-bold">{(marketMetrics.averageSpread * 100).toFixed(2)}%</div>
                <div className="text-xs text-gray-500">Avg Spread</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-indigo-600" />
              <div>
                <div className="text-2xl font-bold">{participants.length}</div>
                <div className="text-xs text-gray-500">Active Traders</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="rankings" className="space-y-4">
        <TabsList>
          <TabsTrigger value="rankings">Student Rankings</TabsTrigger>
          <TabsTrigger value="strategies">Strategy Analysis</TabsTrigger>
          <TabsTrigger value="risk">Risk Metrics</TabsTrigger>
          <TabsTrigger value="privileges">Privileges</TabsTrigger>
          <TabsTrigger value="realtime">Real-time Feed</TabsTrigger>
        </TabsList>

        <TabsContent value="rankings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                Student Performance Rankings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {sortedParticipants.map((participant, index) => {
                  const risk = getRiskLevel(participant.sharpeRatio, participant.maxDrawdown);
                  return (
                    <div key={participant.userId} className="flex items-center gap-4 p-4 border rounded-lg">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 font-bold">
                          {index + 1}
                        </div>
                        <div className="flex items-center gap-2">
                          {getStrategyIcon(participant.strategy)}
                          <div>
                            <div className="font-medium">{participant.username}</div>
                            <div className="text-sm text-gray-500">{participant.strategy}</div>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-5 gap-4 text-center">
                        <div>
                          <div className={`font-bold ${getPerformanceColor(participant.totalPnL)}`}>
                            ${participant.totalPnL.toLocaleString()}
                          </div>
                          <div className="text-xs text-gray-500">P&L</div>
                        </div>
                        <div>
                          <div className="font-bold">{participant.numTrades}</div>
                          <div className="text-xs text-gray-500">Trades</div>
                        </div>
                        <div>
                          <div className={`font-bold ${getPerformanceColor(participant.winRate, 'percentage')}`}>
                            {participant.winRate.toFixed(1)}%
                          </div>
                          <div className="text-xs text-gray-500">Win Rate</div>
                        </div>
                        <div>
                          <div className="font-bold">{participant.sharpeRatio.toFixed(2)}</div>
                          <div className="text-xs text-gray-500">Sharpe</div>
                        </div>
                        <div>
                          <Badge className={risk.color}>
                            {risk.level} Risk
                          </Badge>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="strategies" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Strategy Performance Comparison</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Array.from(new Set(participants.map(p => p.strategy))).map(strategy => {
                    const strategyParticipants = participants.filter(p => p.strategy === strategy);
                    const avgPnL = strategyParticipants.reduce((sum, p) => sum + p.totalPnL, 0) / strategyParticipants.length;
                    const avgSharpe = strategyParticipants.reduce((sum, p) => sum + p.sharpeRatio, 0) / strategyParticipants.length;
                    const avgVolume = strategyParticipants.reduce((sum, p) => sum + p.totalVolume, 0) / strategyParticipants.length;

                    return (
                      <div key={strategy} className="p-4 border rounded-lg">
                        <div className="flex items-center gap-2 mb-3">
                          {getStrategyIcon(strategy)}
                          <h4 className="font-medium">{strategy}</h4>
                          <Badge variant="outline">{strategyParticipants.length} traders</Badge>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <div className={`font-bold ${getPerformanceColor(avgPnL)}`}>
                              ${avgPnL.toFixed(0)}
                            </div>
                            <div className="text-gray-500">Avg P&L</div>
                          </div>
                          <div>
                            <div className="font-bold">{avgSharpe.toFixed(2)}</div>
                            <div className="text-gray-500">Avg Sharpe</div>
                          </div>
                          <div>
                            <div className="font-bold">${(avgVolume / 1000).toFixed(0)}K</div>
                            <div className="text-gray-500">Avg Volume</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Trading Activity Heatmap</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="text-sm text-gray-600 mb-3">Activity by Strategy & Time</div>
                  {participants.map(participant => (
                    <div key={participant.userId} className="flex items-center gap-3">
                      <div className="w-24 text-sm truncate">{participant.username.split(' ')[0]}</div>
                      <div className="flex-1">
                        <div className="flex items-center gap-1">
                          <Progress 
                            value={(participant.numTrades / Math.max(...participants.map(p => p.numTrades))) * 100} 
                            className="h-3"
                          />
                          <span className="text-xs w-8">{participant.numTrades}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="risk" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Risk Metrics Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {participants.map(participant => (
                    <div key={participant.userId} className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{participant.username}</span>
                        <Badge className={getRiskLevel(participant.sharpeRatio, participant.maxDrawdown).color}>
                          {getRiskLevel(participant.sharpeRatio, participant.maxDrawdown).level}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-sm">
                        <div>
                          <div className="text-gray-500">VaR (95%)</div>
                          <div className="font-medium text-red-600">
                            ${participant.riskMetrics.var95}
                          </div>
                        </div>
                        <div>
                          <div className="text-gray-500">Leverage</div>
                          <div className="font-medium">{participant.riskMetrics.leverage}x</div>
                        </div>
                        <div>
                          <div className="text-gray-500">Concentration</div>
                          <div className="font-medium">{(participant.riskMetrics.concentration * 100).toFixed(0)}%</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Portfolio Diversification</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {participants.map(participant => (
                    <div key={participant.userId} className="flex items-center gap-3">
                      <div className="w-32 text-sm truncate">{participant.username}</div>
                      <div className="flex-1">
                        <Progress 
                          value={(1 - participant.riskMetrics.concentration) * 100} 
                          className="h-2"
                        />
                      </div>
                      <div className="text-sm w-12 text-right">
                        {((1 - participant.riskMetrics.concentration) * 100).toFixed(0)}%
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="privileges" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Privilege Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(PRIVILEGE_DEFINITIONS).map(([id, def]) => {
                    const holdersCount = participants.filter(p => p.privilegesHeld.includes(parseInt(id))).length;
                    const percentage = (holdersCount / participants.length) * 100;
                    
                    return (
                      <div key={id} className="flex items-center gap-3">
                        <div className="w-32 text-sm truncate">{def.name}</div>
                        <div className="flex-1">
                          <Progress value={percentage} className="h-2" />
                        </div>
                        <div className="text-sm w-16 text-right">
                          {holdersCount}/{participants.length}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Auction Participation</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {participants.map(participant => (
                    <div key={participant.userId} className="flex items-center justify-between p-2 border rounded">
                      <span className="font-medium">{participant.username}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{participant.auctionParticipation} auctions</span>
                        <Badge variant="outline">
                          {participant.privilegesHeld.length} privileges
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="realtime" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Live Trading Feed
                {isLive && <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {/* Mock real-time trading feed */}
                <div className="text-xs space-y-1">
                  <div className="flex justify-between items-center p-2 bg-green-50 rounded">
                    <span><strong>Alice</strong> bought 100 STOCK_A @ $101.25</span>
                    <span className="text-gray-500">{new Date().toLocaleTimeString()}</span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-blue-50 rounded">
                    <span><strong>Carol</strong> provided liquidity: 200@$100.95-$101.05</span>
                    <span className="text-gray-500">{new Date(Date.now() - 5000).toLocaleTimeString()}</span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-orange-50 rounded">
                    <span><strong>David</strong> executed arbitrage: +$45 profit</span>
                    <span className="text-gray-500">{new Date(Date.now() - 12000).toLocaleTimeString()}</span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-purple-50 rounded">
                    <span><strong>Eve</strong> won auction for Short Selling privilege ($750)</span>
                    <span className="text-gray-500">{new Date(Date.now() - 25000).toLocaleTimeString()}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}