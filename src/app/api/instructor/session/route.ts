/**
 * Instructor Session Management API
 * 
 * Handles instructor session creation, management, and control.
 */

import { NextRequest, NextResponse } from 'next/server';
import { 
  createInstructorSession, 
  getInstructorSession,
  getAvailableLessons,
  openWaitingRoom,
  startInstructorSession,
  endInstructorSession,
  setLiquidityTrader
} from '@/lib/instructor-session';

/**
 * GET - Get instructor's current session
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const instructorId = searchParams.get('instructorId');
    
    if (!instructorId) {
      return NextResponse.json({ error: 'Instructor ID required' }, { status: 400 });
    }
    
    const session = getInstructorSession(instructorId);
    
    return NextResponse.json({
      session,
      hasActiveSession: !!session
    });
    
  } catch (error) {
    console.error('Failed to get instructor session:', error);
    return NextResponse.json(
      { error: 'Failed to get session' },
      { status: 500 }
    );
  }
}

/**
 * POST - Create new instructor session
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { instructorId, lessonId, startingCash, duration } = body;
    
    if (!instructorId || !lessonId) {
      return NextResponse.json(
        { error: 'Instructor ID and Lesson ID required' },
        { status: 400 }
      );
    }
    
    const session = await createInstructorSession(
      instructorId,
      lessonId,
      startingCash || 1000000, // Default $1,000,000 to match original upTick
      duration || 300 // Default 5 minutes
    );
    
    return NextResponse.json({
      success: true,
      session,
      message: 'Session created successfully'
    });
    
  } catch (error) {
    console.error('Failed to create instructor session:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create session' },
      { status: 500 }
    );
  }
}

/**
 * PUT - Update session status (open waiting room, start, end)
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, action } = body;
    
    if (!sessionId || !action) {
      return NextResponse.json(
        { error: 'Session ID and action required' },
        { status: 400 }
      );
    }
    
    let session;
    
    switch (action) {
      case 'open_waiting_room':
        session = await openWaitingRoom(sessionId);
        break;
      case 'start':
        session = await startInstructorSession(sessionId);
        break;
      case 'end':
        session = await endInstructorSession(sessionId);
        break;
      case 'set_liquidity_trader':
        const { traderId, setting, value } = body;
        if (!traderId || !setting || value === undefined) {
          return NextResponse.json(
            { error: 'Liquidity trader control requires traderId, setting, and value' },
            { status: 400 }
          );
        }
        setLiquidityTrader(sessionId, traderId, setting, value);
        return NextResponse.json({
          success: true,
          message: `Liquidity trader ${traderId} ${setting} set to ${value}`
        });
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
    
    return NextResponse.json({
      success: true,
      session,
      message: `Session ${action} successful`
    });
    
  } catch (error) {
    console.error('Failed to update session:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update session' },
      { status: 500 }
    );
  }
}