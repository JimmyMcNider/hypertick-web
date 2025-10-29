/**
 * All Portfolios API
 * 
 * Provides portfolio summaries for all users in a session (instructor view)
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getPortfolioEngine } from '@/lib/portfolio-engine';
import { prisma } from '@/lib/prisma';

interface RouteParams {
  params: { sessionId: string };
}

// GET /api/sessions/[sessionId]/portfolio/all - Get all users' portfolio summaries
export const GET = requireAuth(async (
  request: NextRequest & { user: any }, 
  { params }: RouteParams
) => {
  try {
    const { sessionId } = await params;

    // Verify user is instructor or admin
    if (request.user.role !== 'INSTRUCTOR' && request.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Access denied - instructor privileges required' },
        { status: 403 }
      );
    }

    // Verify session exists and user has access
    const session = await prisma.simulationSession.findUnique({
      where: { id: sessionId },
      include: {
        class: {
          select: {
            instructorId: true
          }
        }
      }
    });

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    if (request.user.role === 'INSTRUCTOR' && session.class.instructorId !== request.user.id) {
      return NextResponse.json(
        { error: 'Access denied - not your session' },
        { status: 403 }
      );
    }

    // Get portfolio engine
    const portfolioEngine = getPortfolioEngine(sessionId);

    // Get all portfolio summaries
    const portfolios = await portfolioEngine.getAllPortfolioSummaries();

    // Get user details for each portfolio
    const userIds = portfolios.map(p => p.userId);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true
      }
    });

    const userMap = new Map(users.map(u => [u.id, u]));

    return NextResponse.json({
      success: true,
      portfolios: portfolios.map(portfolio => ({
        user: userMap.get(portfolio.userId),
        portfolio: {
          userId: portfolio.userId,
          sessionId: portfolio.sessionId,
          totalValue: portfolio.totalValue,
          totalUnrealizedPnL: portfolio.totalUnrealizedPnL,
          totalRealizedPnL: portfolio.totalRealizedPnL,
          totalPnL: portfolio.totalPnL,
          cashBalance: portfolio.cashBalance,
          positionCount: portfolio.positions.length,
          lastUpdated: portfolio.lastUpdated
        }
      })).sort((a, b) => b.portfolio.totalValue - a.portfolio.totalValue) // Sort by total value descending
    });

  } catch (error) {
    console.error('Error fetching all portfolios:', error);
    return NextResponse.json(
      { error: 'Failed to fetch portfolios' },
      { status: 500 }
    );
  }
});