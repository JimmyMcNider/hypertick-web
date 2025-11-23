/**
 * Current Session API (Development)
 * 
 * Simple endpoint to get current active session without authentication.
 * This allows students to discover active sessions created by instructors.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getActiveInstructorSession } from '@/lib/instructor-session';

export async function GET(request: NextRequest) {
  try {
    // Check for globally active session (development mode)
    const activeSessionId = (global as any).activeSessionId;
    
    if (activeSessionId) {
      const session = getActiveInstructorSession(activeSessionId);
      
      if (session) {
        return NextResponse.json({
          session: {
            id: activeSessionId,
            status: session.status,
            startTime: session.startedAt,
            lessonTitle: session.lessonName || 'Trading Session',
            lessonType: session.lessonId || 'Market Simulation',
            duration: session.duration || 3600,
            currentTick: 0, // InstructorSession doesn't track ticks
            studentsConnected: session.activeStudents?.length || 0
          }
        });
      }
    }

    // No active session
    return NextResponse.json({ 
      session: null,
      message: 'No active trading session found'
    });

  } catch (error) {
    console.error('Error fetching current session:', error);
    return NextResponse.json(
      { error: 'Failed to fetch current session' },
      { status: 500 }
    );
  }
}