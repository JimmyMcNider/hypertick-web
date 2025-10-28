/**
 * Individual Session API Routes
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole } from '@/lib/auth';
import { sessionEngine } from '@/lib/session-engine';
import { prisma } from '@/lib/prisma';
import { shouldAttemptDb, markDbStatus, createFallbackResponse } from '@/lib/db-fallback';

interface RouteParams {
  params: { sessionId: string };
}

// GET /api/sessions/[sessionId] - Get session details
export const GET = requireAuth(async (
  request: NextRequest & { user: any }, 
  { params }: RouteParams
) => {
  try {
    const { sessionId } = params;

    // Check if we should attempt database connection
    if (!shouldAttemptDb()) {
      return NextResponse.json(createFallbackResponse({ 
        session: {
          id: sessionId,
          lesson: { name: 'Demo Lesson' },
          class: { name: 'Demo Class', instructor: { username: 'instructor' } },
          users: [],
          status: 'IN_PROGRESS',
          liveState: { status: 'active', participants: [] }
        }
      }, 'Session service in fallback mode'));
    }

    try {
      // Get session from database
      const session = await prisma.simulationSession.findUnique({
        where: { id: sessionId },
        include: {
          lesson: true,
          class: {
            include: {
              instructor: { select: { username: true, firstName: true, lastName: true } }
            }
          },
          users: {
            include: {
              user: { select: { username: true, firstName: true, lastName: true } }
            }
          }
        }
      });

      markDbStatus('connected');

      if (!session) {
        return NextResponse.json(
          { error: 'Session not found' },
          { status: 404 }
        );
      }

      // Check access permissions
      const hasAccess = 
        request.user.role === 'ADMIN' ||
      session.class.instructorId === request.user.id ||
      session.users.some(u => u.userId === request.user.id);

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Access denied to this session' },
        { status: 403 }
      );
    }

      // Get live session state from engine
      const liveState = sessionEngine.getSession(sessionId);

      return NextResponse.json({
        session: {
          ...session,
          liveState
        }
      });

    } catch (dbError: any) {
      markDbStatus('failed');
      return NextResponse.json(createFallbackResponse({ 
        session: {
          id: sessionId,
          lesson: { name: 'Demo Lesson' },
          class: { name: 'Demo Class', instructor: { username: 'instructor' } },
          users: [],
          status: 'IN_PROGRESS',
          liveState: { status: 'active', participants: [] }
        }
      }, 'Database unavailable - using fallback session data'));
    }

  } catch (error: any) {
    console.error('Session fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch session' },
      { status: 500 }
    );
  }
});

// PATCH /api/sessions/[sessionId] - Update session (instructors only)
export const PATCH = requireRole('INSTRUCTOR')(async (
  request: NextRequest & { user: any },
  { params }: RouteParams
) => {
  try {
    const { sessionId } = params;
    const body = await request.json();
    const { action, ...updateData } = body;

    // Verify instructor has access to this session
    const session = await prisma.simulationSession.findUnique({
      where: { id: sessionId },
      include: { class: true }
    });

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    if (session.class.instructorId !== request.user.id && request.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Access denied to this session' },
        { status: 403 }
      );
    }

    // Handle different actions
    let result;
    switch (action) {
      case 'start':
        result = await sessionEngine.startSession(sessionId);
        break;
      case 'pause':
        result = await sessionEngine.pauseSession(sessionId);
        break;
      case 'resume':
        result = await sessionEngine.resumeSession(sessionId);
        break;
      case 'end':
        result = await sessionEngine.endSession(sessionId);
        break;
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      message: `Session ${action} successful`,
      session: sessionEngine.getSession(sessionId)
    });

  } catch (error: any) {
    console.error('Session update error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update session' },
      { status: 400 }
    );
  }
});

// DELETE /api/sessions/[sessionId] - Cancel session (instructors only)
export const DELETE = requireRole('INSTRUCTOR')(async (
  request: NextRequest & { user: any },
  { params }: RouteParams
) => {
  try {
    const { sessionId } = params;

    // Verify instructor has access to this session
    const session = await prisma.simulationSession.findUnique({
      where: { id: sessionId },
      include: { class: true }
    });

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    if (session.class.instructorId !== request.user.id && request.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Access denied to this session' },
        { status: 403 }
      );
    }

    // Update session status to cancelled
    await prisma.simulationSession.update({
      where: { id: sessionId },
      data: { status: 'CANCELLED' }
    });

    return NextResponse.json({
      message: 'Session cancelled successfully'
    });

  } catch (error: any) {
    console.error('Session deletion error:', error);
    return NextResponse.json(
      { error: 'Failed to cancel session' },
      { status: 500 }
    );
  }
});

// POST /api/sessions/[sessionId] - Join session (students)
export const POST = requireAuth(async (
  request: NextRequest & { user: any },
  { params }: RouteParams
) => {
  try {
    const { sessionId } = params;
    const body = await request.json();
    const { action, userId } = body;

    if (action !== 'JOIN_SESSION') {
      return NextResponse.json(
        { error: 'Invalid action' },
        { status: 400 }
      );
    }

    console.log(`🚀 User ${request.user.username} joining session ${sessionId}`);

    try {
      // Try to find the session in database
      const session = await prisma.simulationSession.findUnique({
        where: { id: sessionId },
        include: {
          lesson: true,
          class: true,
          users: true
        }
      });

      if (session) {
        // Check if user is already in session
        const existingUser = session.users.find(u => u.userId === request.user.id);
        if (!existingUser) {
          // Add user to session
          await prisma.sessionUser.create({
            data: {
              sessionId: sessionId,
              userId: request.user.id,
              role: 'STUDENT',
              startingEquity: 100000,
              currentEquity: 100000
            }
          });
        }

        return NextResponse.json({
          message: 'Successfully joined session',
          session: {
            id: sessionId,
            lessonName: session.lesson.name,
            status: session.status,
            className: session.class.name
          }
        });
      }
    } catch (dbError) {
      console.log('📊 Database unavailable - using session simulation mode');
    }

    // Fallback mode - simulate session join
    return NextResponse.json({
      message: 'Successfully joined session (simulation mode)',
      session: {
        id: sessionId,
        lessonName: 'Demo Lesson',
        status: 'IN_PROGRESS',
        className: 'Demo Class'
      },
      fallback: true
    });

  } catch (error: any) {
    console.error('Session join error:', error);
    return NextResponse.json(
      { error: 'Failed to join session' },
      { status: 500 }
    );
  }
});