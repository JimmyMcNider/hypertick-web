/**
 * Student Session Join API
 * 
 * Allows students to join waiting room and get session status.
 */

import { NextRequest, NextResponse } from 'next/server';
import { studentJoinWaitingRoom, getSession } from '@/lib/instructor-session';

/**
 * POST - Student joins waiting room
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, userId } = body;
    
    if (!sessionId || !userId) {
      return NextResponse.json(
        { error: 'Session ID and User ID required' },
        { status: 400 }
      );
    }
    
    const session = await studentJoinWaitingRoom(sessionId, userId);
    
    return NextResponse.json({
      success: true,
      session: {
        id: session.id,
        lessonName: session.lessonName,
        status: session.status,
        waitingStudents: session.waitingStudents.length,
        activeStudents: session.activeStudents.length,
        startingCash: session.startingCash,
        duration: session.duration
      },
      message: 'Joined waiting room successfully'
    });
    
  } catch (error) {
    console.error('Failed to join session:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to join session' },
      { status: 500 }
    );
  }
}