/**
 * Simple Sessions Create API
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSimpleSession, initializeSimpleDemoData } from '@/lib/simple-session';
import { initializeDemoAccounts } from '@/lib/simple-auth';

export async function POST(request: NextRequest) {
  try {
    const { lessonName, instructorId, students } = await request.json();

    if (!lessonName || !instructorId || !students) {
      return NextResponse.json(
        { error: 'lessonName, instructorId, and students are required' },
        { status: 400 }
      );
    }

    // Initialize demo accounts and data
    await initializeDemoAccounts();
    await initializeSimpleDemoData();

    // Create session
    const session = await createSimpleSession(lessonName, instructorId, students);

    return NextResponse.json({
      success: true,
      session,
      message: 'Session created successfully'
    });

  } catch (error) {
    console.error('Create session error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create session' },
      { status: 500 }
    );
  }
}