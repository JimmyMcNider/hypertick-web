/**
 * Legacy Lessons API - Access to upTick XML Lessons
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { legacyLessonImporter } from '@/lib/legacy-lesson-importer';

// GET /api/lessons/legacy - List all legacy upTick lessons
export const GET = requireAuth(async (request: NextRequest & { user: any }) => {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const difficulty = searchParams.get('difficulty') as 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | null;
    const loadContent = searchParams.get('loadContent') === 'true';
    
    // Scan available legacy lessons
    const legacyLessons = await legacyLessonImporter.scanLegacyLessons();
    
    // Filter by category if specified
    let filteredLessons = legacyLessons;
    if (category) {
      filteredLessons = legacyLessonImporter.getLessonsByCategory(category);
    }
    
    // Filter by difficulty if specified
    if (difficulty) {
      filteredLessons = filteredLessons.filter(l => l.difficulty === difficulty);
    }

    // Load full lesson content if requested
    if (loadContent) {
      const lessonsWithContent = await Promise.all(
        filteredLessons.map(async (lessonIndex) => {
          const lesson = await legacyLessonImporter.loadLegacyLesson(lessonIndex.lessonId);
          return {
            ...lessonIndex,
            content: lesson
          };
        })
      );
      
      return NextResponse.json({
        lessons: lessonsWithContent,
        stats: legacyLessonImporter.generateLegacyLessonStats(),
        total: lessonsWithContent.length
      });
    }

    // Return just lesson index
    return NextResponse.json({
      lessons: filteredLessons,
      stats: legacyLessonImporter.generateLegacyLessonStats(),
      total: filteredLessons.length
    });

  } catch (error: any) {
    console.error('Legacy lessons fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch legacy lessons' },
      { status: 500 }
    );
  }
});

// POST /api/lessons/legacy - Load specific legacy lesson or import all
export const POST = requireAuth(async (request: NextRequest & { user: any }) => {
  try {
    // Check if user is instructor or admin
    if (request.user.role !== 'INSTRUCTOR' && request.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Instructor access required' }, { status: 403 });
    }

    const body = await request.json();
    const { action, lessonId, importAll } = body;

    switch (action) {
      case 'LOAD_LESSON':
        if (!lessonId) {
          return NextResponse.json({ error: 'Lesson ID required' }, { status: 400 });
        }

        const lesson = await legacyLessonImporter.loadLegacyLesson(lessonId);
        if (!lesson) {
          return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });
        }

        return NextResponse.json({
          lesson,
          message: `Legacy lesson '${lesson.name}' loaded successfully`,
          summary: {
            name: lesson.name,
            simulations: Object.keys(lesson.simulations).length,
            commands: lesson.globalCommands.length,
            privileges: lesson.privileges.length,
            duration: lesson.metadata?.estimatedDuration || 90
          }
        });

      case 'IMPORT_ALL':
        if (!importAll) {
          return NextResponse.json({ error: 'Import confirmation required' }, { status: 400 });
        }

        const allLessons = await legacyLessonImporter.loadAllLegacyLessons();
        const stats = legacyLessonImporter.generateLegacyLessonStats();

        return NextResponse.json({
          message: `Imported ${allLessons.length} legacy lessons`,
          lessons: allLessons.map(l => ({
            id: l.id,
            name: l.name,
            category: l.metadata?.category,
            difficulty: l.metadata?.difficulty,
            simulations: Object.keys(l.simulations).length
          })),
          stats,
          total: allLessons.length
        });

      case 'EXPORT_CONFIG':
        const config = await legacyLessonImporter.exportLessonConfigurations();
        
        return NextResponse.json({
          config,
          message: 'Legacy lesson configurations exported',
          total: config.length
        });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

  } catch (error: any) {
    console.error('Error processing legacy lessons:', error);
    return NextResponse.json({ error: 'Failed to process legacy lessons' }, { status: 500 });
  }
});