import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient, SecurityType } from '@prisma/client';
import { io } from 'socket.io-client';

const prisma = new PrismaClient();

// Create new simulation
export async function POST(request: NextRequest) {
  try {
    const { classId, lessonId, scenario, instructorId } = await request.json();

    // Find the lesson
    const lesson = await prisma.lesson.findFirst({
      where: { name: lessonId }
    });

    if (!lesson) {
      return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });
    }

    // Create simulation session
    const simulation = await prisma.simulationSession.create({
      data: {
        lessonId: lesson.id,
        classId,
        scenario,
        duration: 300, // 5 minutes default
        status: 'IN_PROGRESS',
        startTime: new Date(),
        currentTick: 0,
        iteration: 1
      },
      include: {
        lesson: true,
        class: {
          include: {
            enrollments: {
              include: {
                user: true
              }
            }
          }
        }
      }
    });

    // Create session users for all enrolled students
    const enrolledStudents = simulation.class.enrollments;
    
    await Promise.all(
      enrolledStudents.map(enrollment => 
        prisma.sessionUser.create({
          data: {
            sessionId: simulation.id,
            userId: enrollment.userId,
            role: 'Student',
            startingEquity: 100000,
            currentEquity: 100000,
            isActive: true
          }
        })
      )
    );

    // Initialize market state
    await prisma.marketState.create({
      data: {
        sessionId: simulation.id,
        tick: 0,
        isMarketOpen: false,
        liquidityActive: true,
        liquidityDelay: 8
      }
    });

    // Initialize default securities for this simulation
    const securities = [
      { symbol: 'AOE', name: 'Alpha Omega Enterprises', type: SecurityType.EQUITY },
      { symbol: 'PNR', name: 'Pioneer Resources', type: SecurityType.EQUITY },
      { symbol: 'VGR', name: 'Vector Group', type: SecurityType.EQUITY },
      { symbol: 'BOND1', name: 'Treasury Bond 1Y', type: SecurityType.BOND },
      { symbol: 'BOND2', name: 'Corporate Bond 2Y', type: SecurityType.BOND }
    ];

    await Promise.all(
      securities.map(sec =>
        prisma.security.upsert({
          where: { symbol: sec.symbol },
          update: {},
          create: sec
        })
      )
    );

    // Broadcast simulation start to all class members
    // Note: This would integrate with your WebSocket server
    const response = {
      id: simulation.id,
      status: simulation.status,
      lesson: lesson.name,
      scenario: simulation.scenario,
      participants: enrolledStudents.length,
      currentRound: 1,
      totalRounds: 3, // Default, would come from lesson config
      timeRemaining: simulation.duration,
      marketOpen: false,
      tick: 0
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error creating simulation:', error);
    return NextResponse.json({ error: 'Failed to create simulation' }, { status: 500 });
  }
}

// Get active simulations
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const classId = searchParams.get('classId');

    if (!classId) {
      return NextResponse.json({ error: 'Class ID required' }, { status: 400 });
    }

    const activeSessions = await prisma.simulationSession.findMany({
      where: {
        classId,
        status: {
          in: ['PENDING', 'IN_PROGRESS', 'PAUSED']
        }
      },
      include: {
        lesson: true,
        users: true,
        marketState: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    const formattedSessions = activeSessions.map(session => ({
      id: session.id,
      status: session.status,
      lesson: session.lesson.name,
      scenario: session.scenario,
      participants: session.users.length,
      currentRound: session.iteration,
      totalRounds: 3, // Would come from lesson config
      timeRemaining: session.duration,
      marketOpen: session.marketState[0]?.isMarketOpen || false,
      tick: session.currentTick
    }));

    return NextResponse.json(formattedSessions);

  } catch (error) {
    console.error('Error fetching simulations:', error);
    return NextResponse.json({ error: 'Failed to fetch simulations' }, { status: 500 });
  }
}