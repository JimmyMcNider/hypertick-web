import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// POST /api/notifications/broadcast - Broadcast notification to class students
export const POST = requireAuth(async (request: NextRequest & { user: any }) => {
  try {
    // Check if user is instructor or admin
    if (request.user.role !== 'INSTRUCTOR' && request.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Instructor access required' }, { status: 403 });
    }

    const body = await request.json();
    const { classId, event, data } = body;

    if (!classId || !event) {
      return NextResponse.json({ error: 'ClassId and event are required' }, { status: 400 });
    }

    // Verify user has access to this class
    if (request.user.role !== 'ADMIN') {
      const classAccess = await prisma.class.findUnique({
        where: {
          id: classId,
          instructorId: request.user.id
        }
      });

      if (!classAccess) {
        return NextResponse.json({ error: 'Access denied to class' }, { status: 403 });
      }
    }

    // Get all students in the class
    const enrollments = await prisma.classEnrollment.findMany({
      where: {
        classId,
        isActive: true
      },
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
    });

    // Create notification records for tracking
    const notifications = await Promise.all(
      enrollments.map(enrollment => 
        prisma.notification.create({
          data: {
            userId: enrollment.user.id,
            type: event,
            title: getNotificationTitle(event),
            message: getNotificationMessage(event, data),
            data: JSON.stringify(data),
            isRead: false
          }
        })
      )
    );

    // In a real implementation, this would send WebSocket messages
    // For now, we'll just store the notifications in the database
    console.log(`Broadcasting ${event} to ${enrollments.length} students in class ${classId}`, data);

    // TODO: Integrate with WebSocket server when re-enabled
    // wsServer.broadcastToClass(classId, event, data);

    return NextResponse.json({ 
      message: 'Notification broadcasted successfully',
      recipients: enrollments.length,
      event,
      data
    });

  } catch (error: any) {
    console.error('Error broadcasting notification:', error);
    return NextResponse.json({ error: 'Failed to broadcast notification' }, { status: 500 });
  }
});

function getNotificationTitle(event: string): string {
  switch (event) {
    case 'SESSION_STARTING':
      return 'Trading Session Starting';
    case 'SESSION_PAUSED':
      return 'Session Paused';
    case 'SESSION_RESUMED':
      return 'Session Resumed';
    case 'SESSION_ENDED':
      return 'Session Ended';
    default:
      return 'Session Update';
  }
}

function getNotificationMessage(event: string, data: any): string {
  switch (event) {
    case 'SESSION_STARTING':
      return `A new trading session "${data.lesson?.title}" is starting. Please log into your trading terminal.`;
    case 'SESSION_PAUSED':
      return 'The trading session has been paused by your instructor.';
    case 'SESSION_RESUMED':
      return 'The trading session has been resumed. You can continue trading.';
    case 'SESSION_ENDED':
      return 'The trading session has ended. Review your performance in the analytics tab.';
    default:
      return 'Session status update received.';
  }
}