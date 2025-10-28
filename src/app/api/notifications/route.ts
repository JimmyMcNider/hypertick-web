import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { shouldAttemptDb, markDbStatus, createFallbackResponse, fallbackData } from '@/lib/db-fallback';

// GET /api/notifications - Get user notifications
export const GET = requireAuth(async (request: NextRequest & { user: any }) => {
  try {
    const url = new URL(request.url);
    const unreadOnly = url.searchParams.get('unreadOnly') === 'true';
    const limit = parseInt(url.searchParams.get('limit') || '20');

    // Check if we should attempt database connection
    if (!shouldAttemptDb()) {
      return NextResponse.json(createFallbackResponse({ 
        notifications: fallbackData.notifications 
      }, 'Notifications service in fallback mode'));
    }

    try {
      const notifications = await prisma.notification.findMany({
        where: {
          userId: request.user.id,
          ...(unreadOnly ? { isRead: false } : {})
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: limit
      });

      markDbStatus('connected');
      return NextResponse.json({ notifications });

    } catch (dbError: any) {
      markDbStatus('failed');
      return NextResponse.json(createFallbackResponse({ 
        notifications: fallbackData.notifications 
      }, 'Database unavailable - no notifications to display'));
    }

  } catch (error: any) {
    console.error('Error in notifications API:', error);
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
  }
});

// PATCH /api/notifications - Mark notifications as read
export const PATCH = requireAuth(async (request: NextRequest & { user: any }) => {
  try {
    const body = await request.json();
    const { notificationIds, markAllAsRead } = body;

    if (markAllAsRead) {
      await prisma.notification.updateMany({
        where: {
          userId: request.user.id,
          isRead: false
        },
        data: {
          isRead: true
        }
      });
    } else if (notificationIds && Array.isArray(notificationIds)) {
      await prisma.notification.updateMany({
        where: {
          id: {
            in: notificationIds
          },
          userId: request.user.id
        },
        data: {
          isRead: true
        }
      });
    }

    return NextResponse.json({ message: 'Notifications marked as read' });

  } catch (error: any) {
    console.error('Error updating notifications:', error);
    return NextResponse.json({ error: 'Failed to update notifications' }, { status: 500 });
  }
});