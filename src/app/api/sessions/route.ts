/**
 * Simulation Sessions API Routes
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole } from '@/lib/auth';
import { sessionEngine } from '@/lib/session-engine';
import { prisma } from '@/lib/prisma';

// GET /api/sessions - List sessions for user
export const GET = requireAuth(async (request: NextRequest & { user: any }) => {
  try {
    const { searchParams } = new URL(request.url);
    const classId = searchParams.get('classId');

    let sessions;

    if (request.user.role === 'INSTRUCTOR' || request.user.role === 'ADMIN') {
      // Instructors can see all sessions they have access to
      const whereClause: any = {};
      if (classId) {
        whereClause.classId = classId;
      }
      if (request.user.role === 'INSTRUCTOR') {
        whereClause.class = {
          instructorId: request.user.id
        };
      }

      sessions = await prisma.simulationSession.findMany({
        where: whereClause,
        include: {
          lesson: { select: { name: true, description: true } },
          class: { select: { name: true, semester: true, section: true } },
          users: {
            include: {
              user: { select: { username: true, firstName: true, lastName: true } }
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
    } else {
      // Students can only see sessions they're enrolled in
      sessions = await prisma.simulationSession.findMany({
        where: {
          users: {
            some: { userId: request.user.id }
          }
        },
        include: {
          lesson: { select: { name: true, description: true } },
          class: { select: { name: true, semester: true, section: true } }
        },
        orderBy: { createdAt: 'desc' }
      });
    }

    return NextResponse.json({ sessions });

  } catch (error: any) {
    console.error('Sessions fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sessions' },
      { status: 500 }
    );
  }
});

// POST /api/sessions - Create new session (instructors only)
export const POST = requireRole('INSTRUCTOR')(async (request: NextRequest & { user: any }) => {
  try {
    const body = await request.json();
    const { lessonId, classId, scenario } = body;

    // Validate required fields
    if (!lessonId || !classId || !scenario) {
      return NextResponse.json(
        { error: 'lessonId, classId, and scenario are required' },
        { status: 400 }
      );
    }

    // Verify instructor has access to this class
    const classAccess = await prisma.class.findFirst({
      where: {
        id: classId,
        instructorId: request.user.id
      }
    });

    if (!classAccess) {
      return NextResponse.json(
        { error: 'Access denied to this class' },
        { status: 403 }
      );
    }

    // Create session through session engine
    const session = await sessionEngine.createSession(
      lessonId,
      classId,
      scenario,
      request.user.id
    );

    return NextResponse.json({
      message: 'Session created successfully',
      session
    });

  } catch (error: any) {
    console.error('Session creation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create session' },
      { status: 400 }
    );
  }
});