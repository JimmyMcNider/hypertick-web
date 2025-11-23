/**
 * Stop Simple Session API
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSimpleSession } from '@/lib/simple-session';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const session = await getSimpleSession(sessionId);

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    if (session.status !== 'IN_PROGRESS') {
      return NextResponse.json(
        { error: 'Session is not active' },
        { status: 400 }
      );
    }

    // Update session status
    session.status = 'COMPLETED';
    session.endTime = new Date();

    // Update database
    await prisma.simulationSession.update({
      where: { id: sessionId },
      data: { 
        status: 'COMPLETED',
        endTime: session.endTime
      }
    });

    console.log('🛑 Session stopped:', sessionId);
    return NextResponse.json({
      success: true,
      session,
      message: 'Session stopped successfully'
    });

  } catch (error) {
    console.error('Stop session error:', error);
    return NextResponse.json(
      { error: 'Failed to stop session' },
      { status: 500 }
    );
  }
}