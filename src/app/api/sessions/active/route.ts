import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/sessions/active - Get user's active session
export const GET = requireAuth(async (request: NextRequest & { user: any }) => {
  try {
    // Find active session for this user
    const sessionUser = await prisma.sessionUser.findFirst({
      where: {
        userId: request.user.id,
        session: {
          status: {
            in: ['PENDING', 'IN_PROGRESS', 'PAUSED']
          }
        }
      },
      include: {
        session: {
          include: {
            lesson: {
              select: {
                name: true,
                description: true
              }
            }
          }
        }
      },
      orderBy: {
        session: {
          createdAt: 'desc'
        }
      }
    });

    if (!sessionUser) {
      return NextResponse.json({ session: null });
    }

    const session = sessionUser.session;
    const timeRemaining = session.duration; // In seconds
    
    const formattedSession = {
      id: session.id,
      lessonTitle: session.lesson?.name || 'Unknown Lesson',
      status: session.status,
      startTime: session.startTime,
      timeRemaining,
      scenario: session.scenario
    };

    return NextResponse.json({ session: formattedSession });

  } catch (error: any) {
    console.error('Error fetching active session:', error);
    return NextResponse.json({ error: 'Failed to fetch active session' }, { status: 500 });
  }
});