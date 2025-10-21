import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/classes/[classId]/session/active - Get active session for class
export const GET = requireAuth(async (request: NextRequest & { user: any }, { params }: { params: { classId: string } }) => {
  try {
    const { classId } = params;

    // Verify user has access to this class
    const classAccess = await prisma.class.findUnique({
      where: {
        id: classId,
        instructorId: request.user.id
      }
    });

    if (!classAccess && request.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Access denied to class' }, { status: 403 });
    }

    // Find active session for this class
    const activeSession = await prisma.simulationSession.findFirst({
      where: {
        classId,
        status: {
          in: ['PENDING', 'IN_PROGRESS', 'PAUSED']
        }
      },
      include: {
        lesson: {
          select: {
            id: true,
            name: true,
            description: true,
            xmlConfig: true
          }
        },
        users: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (!activeSession) {
      return NextResponse.json({ session: null });
    }

    // Format session data
    const formattedSession = {
      id: activeSession.id,
      lessonId: activeSession.lessonId,
      classId: activeSession.classId,
      scenario: activeSession.scenario,
      status: activeSession.status,
      startTime: activeSession.startTime,
      endTime: activeSession.endTime,
      duration: activeSession.duration,
      currentTick: activeSession.currentTick,
      lesson: activeSession.lesson ? {
        title: activeSession.lesson.name,
        description: activeSession.lesson.description
      } : null,
      participants: activeSession.users.map(sessionUser => ({
        id: sessionUser.user.id,
        username: sessionUser.user.username,
        firstName: sessionUser.user.firstName,
        lastName: sessionUser.user.lastName,
        isConnected: sessionUser.isConnected,
        terminalStatus: sessionUser.terminalStatus || 'OFFLINE',
        lastActivity: sessionUser.lastActivity || sessionUser.user.lastLogin,
        performance: sessionUser.performanceData ? JSON.parse(sessionUser.performanceData) : {
          totalPnL: 0,
          tradesExecuted: 0,
          riskScore: 0
        }
      }))
    };

    return NextResponse.json({ session: formattedSession });

  } catch (error: any) {
    console.error('Error fetching active session:', error);
    return NextResponse.json({ error: 'Failed to fetch active session' }, { status: 500 });
  }
});