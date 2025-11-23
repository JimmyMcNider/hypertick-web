import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { 
  checkLessonPrerequisites, 
  getAvailableLessons,
  generateAdaptiveRecommendations,
  getProgressionPath,
  LESSON_SEQUENCES,
  updateStudentProgress,
  type StudentProgress
} from '@/lib/lesson-progression';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId');
    const action = searchParams.get('action') || 'progress';

    if (!studentId) {
      return NextResponse.json({ error: 'Student ID required' }, { status: 400 });
    }

    // Get student progress from database
    const studentProgress = await getStudentProgressFromDB(studentId);

    switch (action) {
      case 'progress':
        return NextResponse.json({
          progress: studentProgress,
          path: getProgressionPath(studentProgress),
          sequences: LESSON_SEQUENCES
        });

      case 'available':
        const { available, locked, completed } = getAvailableLessons(studentProgress);
        return NextResponse.json({ available, locked, completed });

      case 'recommendations':
        const recommendations = generateAdaptiveRecommendations(studentProgress);
        return NextResponse.json(recommendations);

      case 'prerequisites':
        const lessonId = searchParams.get('lessonId');
        if (!lessonId) {
          return NextResponse.json({ error: 'Lesson ID required' }, { status: 400 });
        }
        const prereqCheck = checkLessonPrerequisites(lessonId, studentProgress);
        return NextResponse.json(prereqCheck);

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

  } catch (error) {
    console.error('Failed to get progression data:', error);
    return NextResponse.json(
      { error: 'Failed to get progression data' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, studentId, lessonId, progressData } = body;

    if (!studentId) {
      return NextResponse.json({ error: 'Student ID required' }, { status: 400 });
    }

    switch (action) {
      case 'update_progress':
        if (!lessonId || !progressData) {
          return NextResponse.json({ error: 'Lesson ID and progress data required' }, { status: 400 });
        }
        
        await updateStudentProgressInDB(studentId, lessonId, progressData);
        
        return NextResponse.json({ 
          success: true, 
          message: 'Progress updated successfully' 
        });

      case 'unlock_lesson':
        if (!lessonId) {
          return NextResponse.json({ error: 'Lesson ID required' }, { status: 400 });
        }
        
        // Instructor override to unlock lesson
        await unlockLessonForStudent(studentId, lessonId);
        
        return NextResponse.json({ 
          success: true, 
          message: `Lesson ${lessonId} unlocked for student` 
        });

      case 'reset_progress':
        if (!lessonId) {
          return NextResponse.json({ error: 'Lesson ID required' }, { status: 400 });
        }
        
        await resetLessonProgress(studentId, lessonId);
        
        return NextResponse.json({ 
          success: true, 
          message: `Progress reset for lesson ${lessonId}` 
        });

      case 'complete_lesson':
        if (!lessonId || !progressData) {
          return NextResponse.json({ error: 'Lesson ID and final score required' }, { status: 400 });
        }
        
        await completeLessonForStudent(studentId, lessonId, progressData);
        
        return NextResponse.json({ 
          success: true, 
          message: `Lesson ${lessonId} marked as completed` 
        });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

  } catch (error) {
    console.error('Failed to update progression:', error);
    return NextResponse.json(
      { error: 'Failed to update progression' },
      { status: 500 }
    );
  }
}

// Helper functions for database operations

async function getStudentProgressFromDB(studentId: string): Promise<StudentProgress[]> {
  try {
    // This would normally query the student_progress table
    // For now, return mock data based on existing user data
    
    const user = await prisma.user.findUnique({
      where: { id: studentId },
      include: {
        orders: {
          orderBy: { submittedAt: 'desc' },
          take: 100,
          include: { security: true }
        },
        positions: {
          include: { security: true }
        }
      }
    });

    if (!user) {
      return [];
    }

    // Generate mock progress based on trading activity
    const mockProgress: StudentProgress[] = [
      {
        userId: studentId,
        lessonId: 'Price Formation',
        status: user.orders.length > 0 ? 'COMPLETED' : 'NOT_STARTED',
        score: user.orders.length > 0 ? 85 : 0,
        tradesCompleted: user.orders.length,
        timeSpent: Math.min(user.orders.length * 2, 60),
        conceptsMastered: user.orders.length > 5 ? ['price_discovery', 'bid_ask_spread'] : [],
        attempts: 1,
        lastAttempt: user.orders[0]?.submittedAt || user.createdAt,
        completedAt: user.orders.length > 5 ? user.orders[4].submittedAt : undefined
      }
    ];

    if (user.orders.length > 5) {
      mockProgress.push({
        userId: studentId,
        lessonId: 'Market Efficiency',
        status: user.orders.length > 10 ? 'COMPLETED' : 'IN_PROGRESS',
        score: user.orders.length > 10 ? 78 : 65,
        tradesCompleted: Math.max(0, user.orders.length - 5),
        timeSpent: Math.min((user.orders.length - 5) * 3, 45),
        conceptsMastered: user.orders.length > 10 ? ['market_efficiency'] : [],
        attempts: 1,
        lastAttempt: user.orders[0]?.submittedAt || new Date(),
        completedAt: user.orders.length > 10 ? user.orders[0].submittedAt : undefined
      });
    }

    return mockProgress;

  } catch (error) {
    console.error('Error getting student progress:', error);
    return [];
  }
}

async function updateStudentProgressInDB(
  studentId: string, 
  lessonId: string, 
  progressData: Partial<StudentProgress>
): Promise<void> {
  // This would normally update the student_progress table
  // For now, we'll just log the update
  console.log(`📊 Updating progress for student ${studentId} in lesson ${lessonId}:`, progressData);
  
  // In a real implementation, this would be:
  // await prisma.studentProgress.upsert({
  //   where: { userId_lessonId: { userId: studentId, lessonId } },
  //   update: progressData,
  //   create: { userId: studentId, lessonId, ...progressData }
  // });
}

async function unlockLessonForStudent(studentId: string, lessonId: string): Promise<void> {
  console.log(`🔓 Instructor unlocking lesson ${lessonId} for student ${studentId}`);
  
  // This would create or update the student_progress record to mark as available
  // even if prerequisites aren't met
}

async function resetLessonProgress(studentId: string, lessonId: string): Promise<void> {
  console.log(`🔄 Resetting progress for student ${studentId} in lesson ${lessonId}`);
  
  // This would reset the student's progress for the specific lesson
  // await prisma.studentProgress.update({
  //   where: { userId_lessonId: { userId: studentId, lessonId } },
  //   data: {
  //     status: 'NOT_STARTED',
  //     score: 0,
  //     tradesCompleted: 0,
  //     timeSpent: 0,
  //     conceptsMastered: [],
  //     attempts: 0
  //   }
  // });
}

async function completeLessonForStudent(
  studentId: string, 
  lessonId: string, 
  finalData: { score: number; tradesCompleted: number; conceptsMastered: string[] }
): Promise<void> {
  console.log(`✅ Completing lesson ${lessonId} for student ${studentId} with score ${finalData.score}`);
  
  // This would update the lesson status to COMPLETED and record final metrics
  // await prisma.studentProgress.update({
  //   where: { userId_lessonId: { userId: studentId, lessonId } },
  //   data: {
  //     status: finalData.score >= 90 ? 'MASTERED' : 'COMPLETED',
  //     score: finalData.score,
  //     tradesCompleted: finalData.tradesCompleted,
  //     conceptsMastered: finalData.conceptsMastered,
  //     completedAt: new Date()
  //   }
  // });
}