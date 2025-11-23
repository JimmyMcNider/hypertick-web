/**
 * Session Creation API
 * 
 * Allows instructors to create new trading sessions that students can join.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createInstructorSessionSync } from '@/lib/instructor-session';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { instructorId, lessonTitle, duration, lessonType } = body;
    
    if (!instructorId || !lessonTitle) {
      return NextResponse.json(
        { error: 'Instructor ID and lesson title are required' },
        { status: 400 }
      );
    }

    // Create new session
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const session = createInstructorSessionSync(sessionId, {
      instructorId,
      lessonTitle,
      lessonType: lessonType || 'Price Formation',
      duration: duration || 3600, // Default 1 hour
      status: 'ACTIVE',
      startTime: new Date().toISOString(),
      students: [],
      currentTick: 0
    });

    // Mark this session as the active session in the system
    // (In a real system, this would be stored in database)
    (globalThis as Record<string, unknown>).activeSessionId = sessionId;
    
    console.log(`🎓 NEW SESSION CREATED: ${sessionId} by instructor ${instructorId}`);
    console.log(`📚 Lesson: ${lessonTitle} (${lessonType})`);
    console.log(`⏱️ Duration: ${duration}s`);

    return NextResponse.json({
      success: true,
      sessionId,
      session: {
        id: sessionId,
        instructorId,
        lessonTitle,
        lessonType,
        duration,
        status: 'ACTIVE',
        startTime: session.startedAt,
        studentsConnected: 0
      }
    });

  } catch (error) {
    console.error('Session creation failed:', error);
    return NextResponse.json(
      { error: 'Failed to create session' },
      { status: 500 }
    );
  }
}