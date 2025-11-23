/**
 * Simple Session Start API
 */

import { NextRequest, NextResponse } from 'next/server';
import { startSimpleSession } from '@/lib/simple-session';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const session = await startSimpleSession(sessionId);

    return NextResponse.json({
      success: true,
      session,
      message: 'Session started successfully'
    });

  } catch (error) {
    console.error('Start session error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to start session' },
      { status: 500 }
    );
  }
}