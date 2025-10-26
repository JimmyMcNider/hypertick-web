import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Toggle market state (open/close)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const { action } = await request.json();

    if (action !== 'open' && action !== 'close') {
      return NextResponse.json({ error: 'Invalid action. Use "open" or "close"' }, { status: 400 });
    }

    // Update market state
    const marketState = await prisma.marketState.updateMany({
      where: { sessionId },
      data: {
        isMarketOpen: action === 'open'
      }
    });

    if (marketState.count === 0) {
      return NextResponse.json({ error: 'Market state not found' }, { status: 404 });
    }

    // Get updated simulation with market state
    const simulation = await prisma.simulationSession.findUnique({
      where: { id: sessionId },
      include: {
        lesson: true,
        users: true,
        marketState: true
      }
    });

    if (!simulation) {
      return NextResponse.json({ error: 'Simulation not found' }, { status: 404 });
    }

    // Broadcast market state change to all connected clients
    // This would integrate with your WebSocket server

    return NextResponse.json({
      id: simulation.id,
      status: simulation.status,
      marketOpen: simulation.marketState[0]?.isMarketOpen || false,
      tick: simulation.currentTick,
      message: `Market ${action}ed successfully`
    });

  } catch (error) {
    console.error('Error toggling market:', error);
    return NextResponse.json({ error: 'Failed to toggle market' }, { status: 500 });
  }
}