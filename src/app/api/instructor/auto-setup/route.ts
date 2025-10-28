/**
 * Instructor Auto-Setup API
 * 
 * Automatically creates a default class with demo students for instructors
 * who don't have any classes yet. This prevents "Access denied" errors.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { ensureInstructorHasClass } from '@/lib/auto-class-setup';

// POST /api/instructor/auto-setup - Create default class for instructor
export const POST = requireRole('INSTRUCTOR')(async (request: NextRequest & { user: any }) => {
  try {
    console.log(`🎓 Auto-setup requested by instructor: ${request.user.username} (${request.user.id})`);
    
    const result = await ensureInstructorHasClass(request.user.id, request.user.username);
    
    if (result.success) {
      return NextResponse.json({
        message: result.message,
        classId: result.classId,
        studentsCreated: result.studentsCreated || 0
      });
    } else {
      return NextResponse.json(
        { error: result.message },
        { status: 500 }
      );
    }

  } catch (error: any) {
    console.error('Auto-setup error:', error);
    return NextResponse.json(
      { error: 'Failed to setup default class' },
      { status: 500 }
    );
  }
});

// GET /api/instructor/auto-setup - Check if instructor needs setup
export const GET = requireRole('INSTRUCTOR')(async (request: NextRequest & { user: any }) => {
  try {
    // This endpoint can be used to check if auto-setup is needed
    // without actually performing it
    
    const result = await ensureInstructorHasClass(request.user.id, request.user.username);
    
    return NextResponse.json({
      needsSetup: !result.success || !result.classId,
      message: result.message,
      classId: result.classId
    });

  } catch (error: any) {
    console.error('Auto-setup check error:', error);
    return NextResponse.json(
      { error: 'Failed to check setup status' },
      { status: 500 }
    );
  }
});