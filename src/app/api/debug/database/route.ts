/**
 * Database Debug API
 * 
 * Provides information about the current database state
 * for debugging production issues
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Database debug check starting...');

    // Check database connectivity
    const dbCheck = await prisma.$queryRaw`SELECT 1 as connected`;
    console.log('✅ Database connection successful');

    // Count all major entities
    const [
      userCount,
      lessonCount, 
      classCount,
      enrollmentCount,
      sessionCount,
      securityCount
    ] = await Promise.all([
      prisma.user.count(),
      prisma.lesson.count(),
      prisma.class.count(),
      prisma.classEnrollment.count(),
      prisma.simulationSession.count(),
      prisma.security.count()
    ]);

    // Get sample data
    const lessons = await prisma.lesson.findMany({
      take: 5,
      select: { id: true, name: true, description: true }
    });

    const users = await prisma.user.findMany({
      take: 10,
      select: { id: true, username: true, email: true, role: true }
    });

    const classes = await prisma.class.findMany({
      take: 5,
      select: { id: true, name: true, semester: true },
      include: { instructor: { select: { username: true } } }
    });

    const securities = await prisma.security.findMany({
      select: { id: true, symbol: true, name: true }
    });

    const response = {
      timestamp: new Date().toISOString(),
      database: {
        connected: true,
        environment: process.env.NODE_ENV,
        databaseUrl: process.env.DATABASE_URL ? 'Set' : 'Not set'
      },
      counts: {
        users: userCount,
        lessons: lessonCount,
        classes: classCount,
        enrollments: enrollmentCount,
        sessions: sessionCount,
        securities: securityCount
      },
      sampleData: {
        lessons: lessons.map(l => ({ id: l.id, name: l.name })),
        users: users.map(u => ({ id: u.id, username: u.username, role: u.role })),
        classes: classes.map(c => ({ 
          id: c.id, 
          name: c.name, 
          instructor: c.instructor.username 
        })),
        securities: securities.map(s => ({ symbol: s.symbol, name: s.name }))
      }
    };

    console.log('📊 Database debug response:', JSON.stringify(response, null, 2));
    
    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ Database debug error:', error);
    
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      error: 'Database debug failed',
      message: error instanceof Error ? error.message : String(error),
      database: {
        connected: false,
        environment: process.env.NODE_ENV,
        databaseUrl: process.env.DATABASE_URL ? 'Set' : 'Not set'
      }
    }, { status: 500 });
  }
}