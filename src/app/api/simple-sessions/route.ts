/**
 * Simple Sessions API - List all sessions
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAllActiveSessions } from '@/lib/simple-session';

export async function GET(request: NextRequest) {
  try {
    const sessions = await getAllActiveSessions();
    
    return NextResponse.json({
      sessions,
      count: sessions.length
    });

  } catch (error) {
    console.error('Get sessions error:', error);
    return NextResponse.json(
      { error: 'Failed to get sessions' },
      { status: 500 }
    );
  }
}