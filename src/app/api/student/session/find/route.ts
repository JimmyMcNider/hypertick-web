/**
 * Find Available Session for Students
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/instructor-session';

/**
 * GET - Find active instructor sessions that students can join
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    
    console.log(`🔍 Student looking for session: ${sessionId}`);
    
    if (sessionId) {
      // Get specific session
      const session = getSession(sessionId);
      
      console.log(`📊 Session lookup result: ${session ? 'FOUND' : 'NOT FOUND'}`);
      if (session) {
        console.log(`📋 Session details: status=${session.status}, students=${session.waitingStudents.length + session.activeStudents.length}`);
      }
      
      if (!session) {
        console.log(`❌ Session ${sessionId} not found - returning 404`);
        return NextResponse.json({ error: 'Session not found' }, { status: 404 });
      }
      
      return NextResponse.json({
        session: {
          id: session.id,
          lessonName: session.lessonName,
          status: session.status,
          waitingStudents: session.waitingStudents.length,
          activeStudents: session.activeStudents.length,
          startingCash: session.startingCash,
          duration: session.duration
        }
      });
    }
    
    // For now, just return empty - in real implementation, we'd search for available sessions
    return NextResponse.json({
      sessions: [],
      message: 'No active sessions found. Ask your instructor for the session ID.'
    });
    
  } catch (error) {
    console.error('Failed to find sessions:', error);
    return NextResponse.json(
      { error: 'Failed to find sessions' },
      { status: 500 }
    );
  }
}