/**
 * Available Lessons API for Instructors
 */

import { NextResponse } from 'next/server';
import { getAvailableLessons } from '@/lib/instructor-session';

export async function GET() {
  try {
    const lessons = await getAvailableLessons();
    
    return NextResponse.json({
      lessons,
      count: lessons.length
    });
    
  } catch (error) {
    console.error('Failed to get available lessons:', error);
    return NextResponse.json(
      { error: 'Failed to get lessons' },
      { status: 500 }
    );
  }
}