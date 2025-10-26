import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Advance to next round
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;

    const simulation = await prisma.simulationSession.findUnique({
      where: { id: sessionId },
      include: {
        lesson: true,
        marketState: true
      }
    });

    if (!simulation) {
      return NextResponse.json({ error: 'Simulation not found' }, { status: 404 });
    }

    // Check if we can advance to next round
    const maxRounds = 3; // This would come from lesson configuration
    if (simulation.iteration >= maxRounds) {
      return NextResponse.json({ error: 'Already at maximum rounds' }, { status: 400 });
    }

    // Close market for round transition
    await prisma.marketState.updateMany({
      where: { sessionId },
      data: {
        isMarketOpen: false,
        tick: 0 // Reset tick counter for new round
      }
    });

    // Update simulation to next round
    const updatedSimulation = await prisma.simulationSession.update({
      where: { id: sessionId },
      data: {
        iteration: simulation.iteration + 1,
        currentTick: 0
      },
      include: {
        lesson: true,
        users: true,
        marketState: true
      }
    });

    // Broadcast round change to all connected clients
    // This would integrate with your WebSocket server

    return NextResponse.json({
      id: updatedSimulation.id,
      status: updatedSimulation.status,
      currentRound: updatedSimulation.iteration,
      totalRounds: maxRounds,
      marketOpen: false,
      tick: updatedSimulation.currentTick,
      message: `Advanced to round ${updatedSimulation.iteration}`
    });

  } catch (error) {
    console.error('Error advancing round:', error);
    return NextResponse.json({ error: 'Failed to advance round' }, { status: 500 });
  }
}