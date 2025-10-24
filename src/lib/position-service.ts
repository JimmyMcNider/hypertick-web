/**
 * Position Management and P&L Tracking Service
 * 
 * Provides real-time position tracking, profit/loss calculations,
 * risk management, and portfolio analytics for educational trading sessions.
 */

import { EventEmitter } from 'events';
import { prisma } from './db';

export interface Position {
  userId: string;
  sessionId: string;
  symbol: string;
  quantity: number;
  avgPrice: number;
  marketPrice: number;
  marketValue: number;
  unrealizedPnL: number;
  realizedPnL: number;
  dayPnL: number;
  totalCost: number;
  lastUpdated: Date;
}

export interface Trade {
  id: string;
  userId: string;
  sessionId: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  timestamp: Date;
  commission: number;
  orderId: string;
}

export interface PortfolioSummary {
  userId: string;
  sessionId: string;
  totalEquity: number;
  totalCash: number;
  totalValue: number;
  dayPnL: number;
  totalPnL: number;
  positions: Position[];
  buying_power: number;
  margin_used: number;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface RiskMetrics {
  userId: string;
  sessionId: string;
  concentration_risk: number; // % of portfolio in single position
  volatility_risk: number; // Portfolio volatility
  leverage_ratio: number;
  value_at_risk: number; // 1-day 95% VaR
  sharpe_ratio: number;
  max_drawdown: number;
  beta: number; // Portfolio beta vs market
}

export class PositionService extends EventEmitter {
  private positions: Map<string, Map<string, Position>> = new Map(); // userId -> symbol -> position
  private trades: Map<string, Trade[]> = new Map(); // userId -> trades[]
  private portfolios: Map<string, PortfolioSummary> = new Map(); // userId -> portfolio
  private marketPrices: Map<string, number> = new Map(); // symbol -> price

  constructor() {
    super();
  }

  /**
   * Initialize positions for a session
   */
  public async initializeUserPositions(userId: string, sessionId: string, startingEquity: number = 100000): Promise<void> {
    // Create empty portfolio
    const portfolio: PortfolioSummary = {
      userId,
      sessionId,
      totalEquity: startingEquity,
      totalCash: startingEquity,
      totalValue: startingEquity,
      dayPnL: 0,
      totalPnL: 0,
      positions: [],
      buying_power: startingEquity,
      margin_used: 0,
      risk_level: 'LOW'
    };

    this.portfolios.set(userId, portfolio);
    this.positions.set(userId, new Map());
    this.trades.set(userId, []);

    this.emit('portfolio_initialized', { userId, portfolio });
  }

  /**
   * Process a trade and update positions
   */
  public async processTrade(trade: Omit<Trade, 'id'>): Promise<void> {
    const tradeWithId: Trade = {
      ...trade,
      id: `trade-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };

    // Add trade to history
    const userTrades = this.trades.get(trade.userId) || [];
    userTrades.push(tradeWithId);
    this.trades.set(trade.userId, userTrades);

    // Update position
    await this.updatePosition(tradeWithId);

    // Update portfolio
    await this.updatePortfolio(trade.userId);

    // Calculate risk metrics
    const riskMetrics = await this.calculateRiskMetrics(trade.userId);

    this.emit('trade_processed', { trade: tradeWithId });
    this.emit('position_updated', { userId: trade.userId, symbol: trade.symbol });
    this.emit('portfolio_updated', { userId: trade.userId });
    this.emit('risk_updated', { userId: trade.userId, metrics: riskMetrics });
  }

  /**
   * Update position based on trade
   */
  private async updatePosition(trade: Trade): Promise<void> {
    const userPositions = this.positions.get(trade.userId) || new Map();
    const currentPosition = userPositions.get(trade.symbol);

    let newPosition: Position;

    if (!currentPosition) {
      // New position
      const marketPrice = this.marketPrices.get(trade.symbol) || trade.price;
      newPosition = {
        userId: trade.userId,
        sessionId: trade.sessionId,
        symbol: trade.symbol,
        quantity: trade.side === 'BUY' ? trade.quantity : -trade.quantity,
        avgPrice: trade.price,
        marketPrice,
        marketValue: Math.abs(trade.quantity) * marketPrice,
        unrealizedPnL: (marketPrice - trade.price) * (trade.side === 'BUY' ? trade.quantity : -trade.quantity),
        realizedPnL: 0,
        dayPnL: (marketPrice - trade.price) * (trade.side === 'BUY' ? trade.quantity : -trade.quantity),
        totalCost: trade.quantity * trade.price + trade.commission,
        lastUpdated: new Date()
      };
    } else {
      // Update existing position
      const newQuantity = currentPosition.quantity + (trade.side === 'BUY' ? trade.quantity : -trade.quantity);
      let newAvgPrice = currentPosition.avgPrice;
      let realizedPnL = currentPosition.realizedPnL;

      if (Math.sign(currentPosition.quantity) === Math.sign(trade.side === 'BUY' ? 1 : -1) || currentPosition.quantity === 0) {
        // Adding to position or starting new
        const totalCost = Math.abs(currentPosition.quantity) * currentPosition.avgPrice + trade.quantity * trade.price;
        newAvgPrice = totalCost / Math.abs(newQuantity);
      } else {
        // Reducing position - realize P&L
        const closedQuantity = Math.min(Math.abs(currentPosition.quantity), trade.quantity);
        realizedPnL += (trade.price - currentPosition.avgPrice) * closedQuantity * Math.sign(currentPosition.quantity);
      }

      const marketPrice = this.marketPrices.get(trade.symbol) || trade.price;
      newPosition = {
        ...currentPosition,
        quantity: newQuantity,
        avgPrice: newAvgPrice,
        marketPrice,
        marketValue: Math.abs(newQuantity) * marketPrice,
        unrealizedPnL: newQuantity !== 0 ? (marketPrice - newAvgPrice) * newQuantity : 0,
        realizedPnL,
        totalCost: currentPosition.totalCost + trade.quantity * trade.price + trade.commission,
        lastUpdated: new Date()
      };
    }

    // Update position
    userPositions.set(trade.symbol, newPosition);
    this.positions.set(trade.userId, userPositions);

    // Save to database
    await this.savePositionToDatabase(newPosition);
  }

  /**
   * Update portfolio summary
   */
  private async updatePortfolio(userId: string): Promise<void> {
    const userPositions = this.positions.get(userId) || new Map();
    const currentPortfolio = this.portfolios.get(userId);
    if (!currentPortfolio) return;

    const positions = Array.from(userPositions.values());
    const totalMarketValue = positions.reduce((sum, pos) => sum + pos.marketValue, 0);
    const totalUnrealizedPnL = positions.reduce((sum, pos) => sum + pos.unrealizedPnL, 0);
    const totalRealizedPnL = positions.reduce((sum, pos) => sum + pos.realizedPnL, 0);
    const totalCosts = positions.reduce((sum, pos) => sum + pos.totalCost, 0);

    const updatedPortfolio: PortfolioSummary = {
      ...currentPortfolio,
      totalValue: currentPortfolio.totalCash + totalMarketValue,
      dayPnL: totalUnrealizedPnL + totalRealizedPnL,
      totalPnL: totalUnrealizedPnL + totalRealizedPnL,
      positions,
      buying_power: Math.max(0, currentPortfolio.totalCash - this.calculateMarginUsed(positions)),
      margin_used: this.calculateMarginUsed(positions),
      risk_level: this.calculateRiskLevel(currentPortfolio.totalCash + totalMarketValue, positions)
    };

    this.portfolios.set(userId, updatedPortfolio);

    // Update database
    await this.savePortfolioToDatabase(updatedPortfolio);
  }

  /**
   * Update market prices and recalculate positions
   */
  public updateMarketPrice(symbol: string, price: number): void {
    this.marketPrices.set(symbol, price);

    // Update all positions with this symbol
    this.positions.forEach(async (userPositions, userId) => {
      const position = userPositions.get(symbol);
      if (position) {
        const updatedPosition: Position = {
          ...position,
          marketPrice: price,
          marketValue: Math.abs(position.quantity) * price,
          unrealizedPnL: position.quantity !== 0 ? (price - position.avgPrice) * position.quantity : 0,
          dayPnL: position.quantity !== 0 ? (price - position.avgPrice) * position.quantity : 0,
          lastUpdated: new Date()
        };

        userPositions.set(symbol, updatedPosition);
        this.positions.set(userId, userPositions);

        // Update portfolio
        await this.updatePortfolio(userId);

        this.emit('position_updated', { userId, symbol, position: updatedPosition });
      }
    });
  }

  /**
   * Calculate margin used
   */
  private calculateMarginUsed(positions: Position[]): number {
    return positions.reduce((total, pos) => {
      // Simple margin calculation - 50% for stocks, 100% for bonds
      const marginRate = pos.symbol.startsWith('BOND') ? 1.0 : 0.5;
      return total + (pos.marketValue * marginRate);
    }, 0);
  }

  /**
   * Calculate risk level
   */
  private calculateRiskLevel(totalValue: number, positions: Position[]): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    if (positions.length === 0) return 'LOW';

    // Calculate concentration risk
    const maxPosition = Math.max(...positions.map(p => p.marketValue));
    const concentration = maxPosition / totalValue;

    // Calculate total P&L risk
    const totalPnL = positions.reduce((sum, p) => sum + p.unrealizedPnL, 0);
    const pnlRisk = Math.abs(totalPnL) / totalValue;

    if (concentration > 0.5 || pnlRisk > 0.2) return 'CRITICAL';
    if (concentration > 0.3 || pnlRisk > 0.1) return 'HIGH';
    if (concentration > 0.2 || pnlRisk > 0.05) return 'MEDIUM';
    return 'LOW';
  }

  /**
   * Calculate comprehensive risk metrics
   */
  private async calculateRiskMetrics(userId: string): Promise<RiskMetrics> {
    const portfolio = this.portfolios.get(userId);
    if (!portfolio) throw new Error('Portfolio not found');

    const positions = portfolio.positions;
    const totalValue = portfolio.totalValue;

    // Concentration risk - largest position as % of portfolio
    const concentration_risk = positions.length > 0 
      ? Math.max(...positions.map(p => p.marketValue)) / totalValue 
      : 0;

    // Portfolio volatility estimation (simplified)
    const volatility_risk = this.estimatePortfolioVolatility(positions);

    // Leverage ratio
    const leverage_ratio = portfolio.margin_used / portfolio.totalCash;

    // Value at Risk (1-day, 95% confidence)
    const value_at_risk = totalValue * volatility_risk * 1.645; // 95% percentile

    // Sharpe ratio estimation (simplified)
    const sharpe_ratio = this.calculateSharpeRatio(portfolio.totalPnL, totalValue);

    // Maximum drawdown estimation
    const max_drawdown = this.calculateMaxDrawdown(userId);

    // Portfolio beta vs market (simplified)
    const beta = this.calculatePortfolioBeta(positions);

    return {
      userId,
      sessionId: portfolio.sessionId,
      concentration_risk,
      volatility_risk,
      leverage_ratio,
      value_at_risk,
      sharpe_ratio,
      max_drawdown,
      beta
    };
  }

  /**
   * Estimate portfolio volatility
   */
  private estimatePortfolioVolatility(positions: Position[]): number {
    if (positions.length === 0) return 0;

    // Simplified volatility calculation based on position types
    const weightedVolatility = positions.reduce((vol, pos) => {
      const weight = pos.marketValue / positions.reduce((sum, p) => sum + p.marketValue, 0);
      const assetVolatility = pos.symbol.startsWith('BOND') ? 0.05 : 0.20; // Bonds vs Stocks
      return vol + (weight * assetVolatility);
    }, 0);

    return weightedVolatility;
  }

  /**
   * Calculate Sharpe ratio
   */
  private calculateSharpeRatio(totalReturn: number, totalValue: number): number {
    if (totalValue === 0) return 0;
    const returnRate = totalReturn / totalValue;
    const riskFreeRate = 0.02; // 2% risk-free rate
    const volatility = 0.15; // Assumed portfolio volatility
    return (returnRate - riskFreeRate) / volatility;
  }

  /**
   * Calculate maximum drawdown
   */
  private calculateMaxDrawdown(userId: string): number {
    const trades = this.trades.get(userId) || [];
    if (trades.length < 2) return 0;

    let peak = 0;
    let maxDrawdown = 0;
    let runningPnL = 0;

    trades.forEach(trade => {
      // Simplified P&L calculation
      runningPnL += trade.side === 'BUY' ? -trade.quantity * trade.price : trade.quantity * trade.price;
      
      if (runningPnL > peak) {
        peak = runningPnL;
      }
      
      const drawdown = (peak - runningPnL) / Math.max(peak, 1);
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    });

    return maxDrawdown;
  }

  /**
   * Calculate portfolio beta
   */
  private calculatePortfolioBeta(positions: Position[]): number {
    if (positions.length === 0) return 1;

    // Simplified beta calculation
    const weightedBeta = positions.reduce((beta, pos) => {
      const weight = pos.marketValue / positions.reduce((sum, p) => sum + p.marketValue, 0);
      const assetBeta = pos.symbol.startsWith('BOND') ? 0.1 : 
                       pos.symbol === 'SPX' ? 1.0 : 1.2; // Asset-specific betas
      return beta + (weight * assetBeta);
    }, 0);

    return weightedBeta;
  }

  /**
   * Save position to database
   */
  private async savePositionToDatabase(position: Position): Promise<void> {
    // TODO: Update Prisma schema to include portfolio model
    console.log('Position saved to memory only:', position);
  }

  /**
   * Save portfolio to database
   */
  private async savePortfolioToDatabase(portfolio: PortfolioSummary): Promise<void> {
    // TODO: Update Prisma schema for proper session user relation
    console.log('Portfolio saved to memory only:', portfolio);
  }

  /**
   * Get user portfolio
   */
  public getPortfolio(userId: string): PortfolioSummary | null {
    return this.portfolios.get(userId) || null;
  }

  /**
   * Get user positions
   */
  public getPositions(userId: string): Position[] {
    const userPositions = this.positions.get(userId);
    return userPositions ? Array.from(userPositions.values()) : [];
  }

  /**
   * Get user trades
   */
  public getTrades(userId: string): Trade[] {
    return this.trades.get(userId) || [];
  }

  /**
   * Get position for symbol
   */
  public getPosition(userId: string, symbol: string): Position | null {
    const userPositions = this.positions.get(userId);
    return userPositions?.get(symbol) || null;
  }

  /**
   * Close all positions (liquidate)
   */
  public async liquidatePositions(userId: string): Promise<void> {
    const userPositions = this.positions.get(userId) || new Map();
    
    for (const [symbol, position] of userPositions) {
      if (position.quantity !== 0) {
        const liquidationTrade: Omit<Trade, 'id'> = {
          userId,
          sessionId: position.sessionId,
          symbol,
          side: position.quantity > 0 ? 'SELL' : 'BUY',
          quantity: Math.abs(position.quantity),
          price: position.marketPrice,
          timestamp: new Date(),
          commission: 0,
          orderId: `liquidation-${Date.now()}`
        };

        await this.processTrade(liquidationTrade);
      }
    }

    this.emit('positions_liquidated', { userId });
  }
}

// Export singleton instance
export const positionService = new PositionService();