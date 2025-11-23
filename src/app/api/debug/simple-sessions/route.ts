/**
 * Debug API for Simple Sessions
 */

import { NextResponse } from 'next/server';
import { getAllActiveSessions } from '@/lib/simple-session';

export async function GET() {
  const sessions = await getAllActiveSessions();
  return NextResponse.json({ 
    count: sessions.length,
    sessions: sessions.map(s => ({
      id: s.id,
      lessonName: s.lessonName,
      instructor: s.instructor,
      students: s.students,
      status: s.status
    }))
  });
}