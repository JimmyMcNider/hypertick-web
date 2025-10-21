/**
 * Performance Tracker - Real-time Student Performance Analytics
 * 
 * Tracks and analyzes student trading performance in real-time,
 * providing metrics for instructors and feedback for students
 */

import { EventEmitter } from 'events';

export interface TradeExecution {
  id: string;
  userId: string;
  sessionId: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  timestamp: Date;
  orderType: 'MARKET' | 'LIMIT' | 'STOP';
  executionPrice: number;
  commission: number;
  slippage: number;
}

export interface PositionSnapshot {
  userId: string;
  sessionId: string;
  timestamp: Date;
  symbol: string;
  quantity: number;
  averagePrice: number;
  marketValue: number;
  unrealizedPnL: number;
  realizedPnL: number;
}

export interface PerformanceMetrics {
  userId: string;
  sessionId: string;
  timestamp: Date;
  
  // P&L Metrics
  totalPnL: number;
  realizedPnL: number;
  unrealizedPnL: number;
  dayPnL: number;
  maxDrawdown: number;
  maxProfit: number;
  
  // Trading Activity
  totalTrades: number;
  buyTrades: number;
  sellTrades: number;
  avgTradeSize: number;
  avgHoldingPeriod: number; // minutes
  
  // Risk Metrics
  sharpeRatio: number;
  maxPositionSize: number;
  averagePositionSize: number;
  riskScore: number; // 0-100 scale
  
  // Execution Quality
  avgSlippage: number;
  fillRate: number; // percentage of orders filled
  avgCommission: number;
  
  // Market Making (if applicable)
  spreadCapture: number;
  inventoryTurns: number;
  quotingUptime: number; // percentage of time providing quotes
  
  // Learning Objectives
  objectiveProgress: { [objectiveId: string]: number }; // 0-1 completion
  skillScores: {
    riskManagement: number;
    executionTiming: number;
    marketAnalysis: number;
    portfolioConstruction: number;
    emotionalControl: number;
  };
  
  // Session Participation
  activeTimeMinutes: number;
  privilegesUsed: number[];
  commandsExecuted: number;
  newsEventsResponded: number;
}

export interface StudentRanking {
  userId: string;
  username: string;
  rank: number;
  totalPnL: number;
  sharpeRatio: number;
  riskScore: number;
  percentile: number;
}

export interface SessionLeaderboard {
  sessionId: string;
  timestamp: Date;
  rankings: StudentRanking[];
  metrics: {
    avgPnL: number;
    topPerformer: string;
    mostActive: string;
    bestRiskAdjusted: string;
  };
}

export class PerformanceTracker extends EventEmitter {
  private studentMetrics: Map<string, PerformanceMetrics> = new Map();
  private tradeHistory: Map<string, TradeExecution[]> = new Map();
  private positionHistory: Map<string, PositionSnapshot[]> = new Map();
  private sessionLeaderboards: Map<string, SessionLeaderboard> = new Map();
  
  // Performance calculation intervals
  private updateIntervals: Map<string, NodeJS.Timeout> = new Map();

  /**
   * Initialize performance tracking for a user in a session
   */
  initializeStudent(userId: string, sessionId: string, username: string): void {
    const metricsKey = `${sessionId}:${userId}`;
    
    const initialMetrics: PerformanceMetrics = {
      userId,
      sessionId,
      timestamp: new Date(),
      totalPnL: 0,
      realizedPnL: 0,
      unrealizedPnL: 0,
      dayPnL: 0,
      maxDrawdown: 0,
      maxProfit: 0,
      totalTrades: 0,
      buyTrades: 0,
      sellTrades: 0,
      avgTradeSize: 0,
      avgHoldingPeriod: 0,
      sharpeRatio: 0,
      maxPositionSize: 0,
      averagePositionSize: 0,
      riskScore: 50, // Start at neutral
      avgSlippage: 0,
      fillRate: 1.0,
      avgCommission: 0,
      spreadCapture: 0,
      inventoryTurns: 0,
      quotingUptime: 0,
      objectiveProgress: {},
      skillScores: {
        riskManagement: 0,
        executionTiming: 0,
        marketAnalysis: 0,
        portfolioConstruction: 0,
        emotionalControl: 0
      },
      activeTimeMinutes: 0,
      privilegesUsed: [],
      commandsExecuted: 0,
      newsEventsResponded: 0
    };

    this.studentMetrics.set(metricsKey, initialMetrics);
    this.tradeHistory.set(metricsKey, []);
    this.positionHistory.set(metricsKey, []);

    // Start real-time updates
    this.startRealTimeUpdates(metricsKey);

    this.emit('student_initialized', { userId, sessionId, metrics: initialMetrics });
  }

  /**
   * Record a trade execution
   */
  recordTrade(trade: TradeExecution): void {
    const metricsKey = `${trade.sessionId}:${trade.userId}`;
    const metrics = this.studentMetrics.get(metricsKey);
    const trades = this.tradeHistory.get(metricsKey);

    if (!metrics || !trades) {
      console.warn(`No metrics found for user ${trade.userId} in session ${trade.sessionId}`);
      return;
    }

    // Add trade to history
    trades.push(trade);

    // Update basic trade metrics
    metrics.totalTrades++;
    if (trade.side === 'BUY') {
      metrics.buyTrades++;
    } else {
      metrics.sellTrades++;
    }

    // Calculate average trade size
    metrics.avgTradeSize = trades.reduce((sum, t) => sum + Math.abs(t.quantity), 0) / trades.length;

    // Update slippage
    metrics.avgSlippage = trades.reduce((sum, t) => sum + t.slippage, 0) / trades.length;

    // Update commission
    metrics.avgCommission = trades.reduce((sum, t) => sum + t.commission, 0) / trades.length;

    // Calculate realized P&L for this trade
    const realizedPnL = this.calculateRealizedPnL(trade, trades);
    metrics.realizedPnL += realizedPnL;
    metrics.totalPnL = metrics.realizedPnL + metrics.unrealizedPnL;

    // Update max profit/drawdown
    metrics.maxProfit = Math.max(metrics.maxProfit, metrics.totalPnL);
    metrics.maxDrawdown = Math.min(metrics.maxDrawdown, metrics.totalPnL - metrics.maxProfit);

    // Update skill scores based on trade quality
    this.updateSkillScores(metrics, trade);

    // Update timestamp
    metrics.timestamp = new Date();

    this.emit('trade_recorded', { userId: trade.userId, sessionId: trade.sessionId, trade, metrics });
  }

  /**
   * Update position snapshot
   */
  updatePosition(position: PositionSnapshot): void {
    const metricsKey = `${position.sessionId}:${position.userId}`;
    const metrics = this.studentMetrics.get(metricsKey);
    const positions = this.positionHistory.get(metricsKey);

    if (!metrics || !positions) return;

    // Add position snapshot
    positions.push(position);

    // Update unrealized P&L
    metrics.unrealizedPnL = position.unrealizedPnL;
    metrics.totalPnL = metrics.realizedPnL + metrics.unrealizedPnL;

    // Update position size metrics
    const absQuantity = Math.abs(position.quantity);
    metrics.maxPositionSize = Math.max(metrics.maxPositionSize, absQuantity);
    
    // Calculate average position size
    const nonZeroPositions = positions.filter(p => p.quantity !== 0);
    if (nonZeroPositions.length > 0) {
      metrics.averagePositionSize = nonZeroPositions.reduce((sum, p) => sum + Math.abs(p.quantity), 0) / nonZeroPositions.length;
    }

    // Update risk score based on position concentration
    this.updateRiskScore(metrics, positions);

    this.emit('position_updated', { userId: position.userId, sessionId: position.sessionId, position, metrics });
  }

  /**
   * Record student activity (privilege usage, commands, etc.)
   */
  recordActivity(userId: string, sessionId: string, activity: {
    type: 'PRIVILEGE_USED' | 'COMMAND_EXECUTED' | 'NEWS_RESPONDED' | 'ANALYSIS_PERFORMED';
    data: any;
  }): void {
    const metricsKey = `${sessionId}:${userId}`;
    const metrics = this.studentMetrics.get(metricsKey);

    if (!metrics) return;

    switch (activity.type) {
      case 'PRIVILEGE_USED':
        if (!metrics.privilegesUsed.includes(activity.data.privilegeCode)) {
          metrics.privilegesUsed.push(activity.data.privilegeCode);
        }
        break;
      
      case 'COMMAND_EXECUTED':
        metrics.commandsExecuted++;
        break;
      
      case 'NEWS_RESPONDED':
        metrics.newsEventsResponded++;
        // Boost market analysis skill
        metrics.skillScores.marketAnalysis = Math.min(100, metrics.skillScores.marketAnalysis + 2);
        break;
      
      case 'ANALYSIS_PERFORMED':
        metrics.skillScores.marketAnalysis = Math.min(100, metrics.skillScores.marketAnalysis + 1);
        break;
    }

    this.emit('activity_recorded', { userId, sessionId, activity, metrics });
  }

  /**
   * Generate session leaderboard
   */
  generateLeaderboard(sessionId: string): SessionLeaderboard {
    const sessionMetrics = Array.from(this.studentMetrics.entries())
      .filter(([key]) => key.startsWith(`${sessionId}:`))
      .map(([key, metrics]) => metrics);

    if (sessionMetrics.length === 0) {
      const emptyLeaderboard: SessionLeaderboard = {
        sessionId,
        timestamp: new Date(),
        rankings: [],
        metrics: { avgPnL: 0, topPerformer: '', mostActive: '', bestRiskAdjusted: '' }
      };
      return emptyLeaderboard;
    }

    // Sort by total P&L (primary ranking)
    const sortedByPnL = [...sessionMetrics].sort((a, b) => b.totalPnL - a.totalPnL);
    
    // Create rankings
    const rankings: StudentRanking[] = sortedByPnL.map((metrics, index) => ({
      userId: metrics.userId,
      username: `User_${metrics.userId.slice(-4)}`, // Simplified username
      rank: index + 1,
      totalPnL: metrics.totalPnL,
      sharpeRatio: metrics.sharpeRatio,
      riskScore: metrics.riskScore,
      percentile: ((sessionMetrics.length - index) / sessionMetrics.length) * 100
    }));

    // Calculate session-wide metrics
    const avgPnL = sessionMetrics.reduce((sum, m) => sum + m.totalPnL, 0) / sessionMetrics.length;
    const topPerformer = sortedByPnL[0]?.userId || '';
    const mostActive = sessionMetrics.reduce((prev, current) => 
      current.totalTrades > prev.totalTrades ? current : prev
    ).userId;
    const bestRiskAdjusted = sessionMetrics.reduce((prev, current) => 
      current.sharpeRatio > prev.sharpeRatio ? current : prev
    ).userId;

    const leaderboard: SessionLeaderboard = {
      sessionId,
      timestamp: new Date(),
      rankings,
      metrics: { avgPnL, topPerformer, mostActive, bestRiskAdjusted }
    };

    this.sessionLeaderboards.set(sessionId, leaderboard);
    this.emit('leaderboard_updated', leaderboard);

    return leaderboard;
  }

  /**
   * Get student metrics
   */
  getStudentMetrics(userId: string, sessionId: string): PerformanceMetrics | null {
    const metricsKey = `${sessionId}:${userId}`;
    return this.studentMetrics.get(metricsKey) || null;
  }

  /**
   * Get session leaderboard
   */
  getLeaderboard(sessionId: string): SessionLeaderboard | null {
    return this.sessionLeaderboards.get(sessionId) || null;
  }

  /**
   * Calculate realized P&L for a trade
   */
  private calculateRealizedPnL(trade: TradeExecution, tradeHistory: TradeExecution[]): number {
    // Simplified P&L calculation - in reality would use FIFO/LIFO accounting
    const symbolTrades = tradeHistory.filter(t => t.symbol === trade.symbol);
    
    if (symbolTrades.length < 2) return 0; // Need buy and sell to realize P&L
    
    // Find matching opposite trades
    const oppositeTrades = symbolTrades.filter(t => t.side !== trade.side);
    if (oppositeTrades.length === 0) return 0;
    
    // Use most recent opposite trade for P&L calculation
    const matchingTrade = oppositeTrades[oppositeTrades.length - 1];
    const pnlPerShare = trade.side === 'SELL' ? 
      trade.executionPrice - matchingTrade.executionPrice :
      matchingTrade.executionPrice - trade.executionPrice;
    
    return pnlPerShare * Math.min(trade.quantity, matchingTrade.quantity) - trade.commission;
  }

  /**
   * Update skill scores based on trade execution
   */
  private updateSkillScores(metrics: PerformanceMetrics, trade: TradeExecution): void {
    // Execution timing - boost if low slippage
    if (trade.slippage < 0.01) {
      metrics.skillScores.executionTiming = Math.min(100, metrics.skillScores.executionTiming + 1);
    }

    // Risk management - penalize large position sizes
    const positionSizeRatio = trade.quantity / 1000; // Assuming 1000 is max reasonable size
    if (positionSizeRatio > 0.5) {
      metrics.skillScores.riskManagement = Math.max(0, metrics.skillScores.riskManagement - 2);
    } else {
      metrics.skillScores.riskManagement = Math.min(100, metrics.skillScores.riskManagement + 0.5);
    }

    // Emotional control - consistent trading patterns get higher scores
    const tradeVariance = this.calculateTradeVariance(metrics.userId, metrics.sessionId);
    metrics.skillScores.emotionalControl = Math.max(0, 100 - tradeVariance * 10);
  }

  /**
   * Update risk score based on position concentration
   */
  private updateRiskScore(metrics: PerformanceMetrics, positions: PositionSnapshot[]): void {
    if (positions.length === 0) return;

    const recentPositions = positions.slice(-10); // Last 10 position snapshots
    const avgPositionSize = recentPositions.reduce((sum, p) => sum + Math.abs(p.quantity), 0) / recentPositions.length;
    
    // Risk score: 0-100 (lower is better for risk management)
    const concentrationRisk = Math.min(100, (avgPositionSize / 1000) * 50); // Normalize to 1000 shares
    const drawdownRisk = Math.min(100, Math.abs(metrics.maxDrawdown) / 1000 * 50); // Normalize to $1000
    
    metrics.riskScore = (concentrationRisk + drawdownRisk) / 2;
  }

  /**
   * Calculate trade variance for emotional control scoring
   */
  private calculateTradeVariance(userId: string, sessionId: string): number {
    const metricsKey = `${sessionId}:${userId}`;
    const trades = this.tradeHistory.get(metricsKey) || [];
    
    if (trades.length < 3) return 0;
    
    const tradeSizes = trades.map(t => t.quantity);
    const avgSize = tradeSizes.reduce((sum, size) => sum + size, 0) / tradeSizes.length;
    const variance = tradeSizes.reduce((sum, size) => sum + Math.pow(size - avgSize, 2), 0) / tradeSizes.length;
    
    return Math.sqrt(variance) / avgSize; // Coefficient of variation
  }

  /**
   * Start real-time metric updates
   */
  private startRealTimeUpdates(metricsKey: string): void {
    const interval = setInterval(() => {
      const metrics = this.studentMetrics.get(metricsKey);
      if (!metrics) {
        clearInterval(interval);
        this.updateIntervals.delete(metricsKey);
        return;
      }

      // Update active time
      metrics.activeTimeMinutes += 0.5; // Update every 30 seconds

      // Calculate Sharpe ratio (simplified)
      const returns = this.calculateReturns(metricsKey);
      metrics.sharpeRatio = this.calculateSharpeRatio(returns);

      // Update timestamp
      metrics.timestamp = new Date();

      this.emit('metrics_updated', { 
        userId: metrics.userId, 
        sessionId: metrics.sessionId, 
        metrics 
      });

    }, 30000); // Update every 30 seconds

    this.updateIntervals.set(metricsKey, interval);
  }

  /**
   * Calculate returns for Sharpe ratio
   */
  private calculateReturns(metricsKey: string): number[] {
    const positions = this.positionHistory.get(metricsKey) || [];
    if (positions.length < 2) return [0];

    const returns: number[] = [];
    for (let i = 1; i < positions.length; i++) {
      const prevValue = positions[i-1].marketValue;
      const currValue = positions[i].marketValue;
      if (prevValue > 0) {
        returns.push((currValue - prevValue) / prevValue);
      }
    }

    return returns.length > 0 ? returns : [0];
  }

  /**
   * Calculate Sharpe ratio
   */
  private calculateSharpeRatio(returns: number[]): number {
    if (returns.length < 2) return 0;

    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);

    return stdDev > 0 ? avgReturn / stdDev : 0;
  }

  /**
   * Clean up tracking for ended sessions
   */
  cleanup(sessionId: string): void {
    // Clear intervals
    for (const [key, interval] of this.updateIntervals.entries()) {
      if (key.startsWith(`${sessionId}:`)) {
        clearInterval(interval);
        this.updateIntervals.delete(key);
      }
    }

    // Keep historical data but mark session as ended
    this.emit('session_tracking_ended', { sessionId });
  }
}

// Global performance tracker instance
export const performanceTracker = new PerformanceTracker();