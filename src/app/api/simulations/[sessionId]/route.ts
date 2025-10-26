import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Get specific simulation details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;

    const simulation = await prisma.simulationSession.findUnique({
      where: { id: sessionId },
      include: {
        lesson: true,
        users: {
          include: {
            user: true
          }
        },
        marketState: true,
        orders: {
          include: {
            user: true,
            security: true
          },
          orderBy: {
            submittedAt: 'desc'
          },
          take: 50
        }
      }
    });

    if (!simulation) {
      return NextResponse.json({ error: 'Simulation not found' }, { status: 404 });
    }

    const response = {
      id: simulation.id,
      status: simulation.status,
      lesson: simulation.lesson.name,
      scenario: simulation.scenario,
      participants: simulation.users.length,
      currentRound: simulation.iteration,
      totalRounds: 3,
      timeRemaining: simulation.duration,
      marketOpen: simulation.marketState[0]?.isMarketOpen || false,
      tick: simulation.currentTick,
      recentOrders: simulation.orders.map(order => ({
        id: order.id,
        user: order.user.username,
        security: order.security.symbol,
        side: order.side,
        quantity: order.quantity,
        price: order.price,
        status: order.status,
        timestamp: order.submittedAt
      }))
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error fetching simulation:', error);
    return NextResponse.json({ error: 'Failed to fetch simulation' }, { status: 500 });
  }
}

// Update simulation (pause/resume/stop)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const { action } = await request.json();

    let updateData: any = {};
    
    switch (action) {
      case 'pause':
        updateData = { status: 'PAUSED' };
        break;
      case 'resume':
        updateData = { status: 'IN_PROGRESS' };
        break;
      case 'stop':
        updateData = { 
          status: 'COMPLETED',
          endTime: new Date()
        };
        break;
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const updatedSimulation = await prisma.simulationSession.update({
      where: { id: sessionId },
      data: updateData,
      include: {
        lesson: true,
        users: true,
        marketState: true
      }
    });

    // Broadcast state change to all connected clients
    // This would integrate with your WebSocket server
    
    return NextResponse.json({
      id: updatedSimulation.id,
      status: updatedSimulation.status,
      lesson: updatedSimulation.lesson.name,
      scenario: updatedSimulation.scenario,
      participants: updatedSimulation.users.length,
      marketOpen: updatedSimulation.marketState[0]?.isMarketOpen || false
    });

  } catch (error) {
    console.error('Error updating simulation:', error);
    return NextResponse.json({ error: 'Failed to update simulation' }, { status: 500 });
  }
}