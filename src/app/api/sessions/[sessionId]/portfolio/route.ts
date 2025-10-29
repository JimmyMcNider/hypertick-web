/**
 * Portfolio API
 * 
 * Provides real-time portfolio data, positions, and P&L information
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getPortfolioEngine } from '@/lib/portfolio-engine';

interface RouteParams {
  params: { sessionId: string };
}

// GET /api/sessions/[sessionId]/portfolio - Get user's portfolio summary
export const GET = requireAuth(async (
  request: NextRequest & { user: any }, 
  { params }: RouteParams
) => {
  try {
    const { sessionId } = await params;

    // Get portfolio engine
    const portfolioEngine = getPortfolioEngine(sessionId);

    // Get portfolio summary for the user
    const portfolio = await portfolioEngine.getPortfolioSummary(request.user.id);

    return NextResponse.json({
      success: true,
      portfolio: {
        userId: portfolio.userId,
        sessionId: portfolio.sessionId,
        totalValue: portfolio.totalValue,
        totalUnrealizedPnL: portfolio.totalUnrealizedPnL,
        totalRealizedPnL: portfolio.totalRealizedPnL,
        totalPnL: portfolio.totalPnL,
        cashBalance: portfolio.cashBalance,
        positions: portfolio.positions.map(pos => ({
          securityId: pos.securityId,
          quantity: pos.quantity,
          avgPrice: pos.avgPrice,
          marketValue: pos.marketValue,
          unrealizedPnL: pos.unrealizedPnL,
          realizedPnL: pos.realizedPnL,
          lastUpdated: pos.lastUpdated
        })),
        lastUpdated: portfolio.lastUpdated
      }
    });

  } catch (error) {
    console.error('Error fetching portfolio:', error);
    return NextResponse.json(
      { error: 'Failed to fetch portfolio' },
      { status: 500 }
    );
  }
});