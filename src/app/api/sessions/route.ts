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
  let lessonId = '';
  let classId = ''; 
  let scenario = '';
  
  try {
    const body = await request.json();
    ({ lessonId, classId, scenario } = body);

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
    console.log('🎯 Creating session with params:', { lessonId, classId, scenario, instructorId: request.user.id });
    
    try {
      const session = await sessionEngine.createSession(
        lessonId,
        classId,
        scenario,
        request.user.id
      );

      console.log('✅ Session created successfully:', session.id);
      return NextResponse.json({
        message: 'Session created successfully',
        session
      });
    } catch (sessionError: any) {
      console.error('❌ Session engine error:', {
        message: sessionError.message,
        stack: sessionError.stack,
        name: sessionError.name,
        cause: sessionError.cause
      });
      throw sessionError; // Re-throw to be caught by outer catch
    }

  } catch (error: any) {
    console.error('💥 API route error:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      requestBody: { lessonId, classId, scenario },
      userId: request.user?.id
    });
    
    return NextResponse.json(
      { 
        error: error.message || 'Failed to create session',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 400 }
    );
  }
});