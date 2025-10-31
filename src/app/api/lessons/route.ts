/**
 * Lessons API Routes - Enhanced with XML Lesson Support
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { lessonLoader } from '@/lib/lesson-loader';
import { legacyLessonImporter } from '@/lib/legacy-lesson-importer';

// GET /api/lessons - List available lessons (both database and XML lessons)
export async function GET(request: NextRequest) {
  try {
    console.log('📚 Loading lessons (public access)');

    // Get legacy upTick lessons directly from XML files
    const legacyLessons = await legacyLessonImporter.scanLegacyLessons();
    console.log(`📖 Found ${legacyLessons.length} legacy lessons`);

    // Try to get database lessons, but don't fail if DB is unavailable
    let dbLessons: any[] = [];
    try {
      dbLessons = await prisma.lesson.findMany({
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          description: true,
          xmlConfig: true,
          createdAt: true,
          updatedAt: true
        },
        orderBy: { name: 'asc' }
      });
      console.log(`🗄️ Found ${dbLessons.length} database lessons`);
    } catch (dbError) {
      console.warn('⚠️ Database unavailable, using legacy lessons only:', dbError);
    }

    // Get XML lessons from lesson loader
    let xmlLessons = lessonLoader.getAvailableLessons();
    
    // If no XML lessons loaded, load default mock lesson
    if (xmlLessons.length === 0) {
      await lessonLoader.loadLesson('introduction-to-market-making');
      xmlLessons = lessonLoader.getAvailableLessons();
    }

    // Transform XML lessons to match API format
    const formattedXmlLessons = xmlLessons.map(lesson => ({
      id: lesson.id,
      name: lesson.name,
      description: lesson.metadata?.objectives?.join(', ') || 'No description available',
      difficulty: lesson.metadata?.difficulty || 'INTERMEDIATE',
      estimatedDuration: lesson.metadata?.estimatedDuration || 45,
      scenarios: Object.keys(lesson.simulations || {}),
      type: 'XML_LESSON',
      metadata: lesson.metadata,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }));

    // Transform legacy lessons to match API format with XML content
    const formattedLegacyLessons = await Promise.all(
      legacyLessons.map(async (lesson) => {
        try {
          // Load the full lesson with XML content
          const fullLesson = await legacyLessonImporter.loadLegacyLesson(lesson.lessonId);
          
          return {
            id: lesson.lessonId,
            name: lesson.lessonName,
            description: fullLesson?.metadata?.description || `Legacy upTick lesson: ${lesson.lessonName}`,
            difficulty: lesson.difficulty,
            estimatedDuration: lesson.estimatedDuration,
            scenarios: fullLesson ? Object.keys(fullLesson.simulations) : [],
            xmlConfig: fullLesson ? await legacyLessonImporter.getXMLContent(lesson.lessonId) : null,
            type: 'LEGACY_LESSON',
            category: lesson.category,
            hasExcelIntegration: !!lesson.excelPath,
            hasReporting: !!lesson.reportingPath,
            presentationFiles: lesson.pptFiles.length,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
        } catch (error) {
          console.warn(`⚠️ Could not load full lesson ${lesson.lessonName}:`, error);
          return {
            id: lesson.lessonId,
            name: lesson.lessonName,
            description: `Legacy upTick lesson: ${lesson.lessonName}`,
            difficulty: lesson.difficulty,
            estimatedDuration: lesson.estimatedDuration,
            scenarios: [],
            type: 'LEGACY_LESSON',
            category: lesson.category,
            hasExcelIntegration: !!lesson.excelPath,
            hasReporting: !!lesson.reportingPath,
            presentationFiles: lesson.pptFiles.length,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
        }
      })
    );

    return NextResponse.json({ 
      lessons: [...dbLessons, ...formattedXmlLessons, ...formattedLegacyLessons],
      xmlLessons: formattedXmlLessons,
      legacyLessons: formattedLegacyLessons,
      dbLessons: dbLessons,
      total: dbLessons.length + xmlLessons.length + legacyLessons.length
    });

  } catch (error: any) {
    console.error('Lessons fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch lessons' },
      { status: 500 }
    );
  }
}

// POST /api/lessons - Load new XML lesson or save authored lesson
export const POST = requireAuth(async (request: NextRequest & { user: any }) => {
  try {
    // Check if user is instructor or admin
    if (request.user.role !== 'INSTRUCTOR' && request.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Instructor access required' }, { status: 403 });
    }

    const body = await request.json();
    const { lessonSource, xmlContent, classId, saveLesson, ...lessonData } = body;

    // Save authored lesson to database
    if (saveLesson && lessonData.title) {
      // Verify user has access to this class
      if (classId) {
        const classAccess = await prisma.class.findUnique({
          where: {
            id: classId,
            instructorId: request.user.id
          }
        });

        if (!classAccess && request.user.role !== 'ADMIN') {
          return NextResponse.json({ error: 'Access denied to class' }, { status: 403 });
        }
      }

      // Create lesson in database
      const lesson = await prisma.lesson.create({
        data: {
          name: lessonData.title,
          description: lessonData.description || '',
          xmlConfig: generateLessonXML(lessonData)
        }
      });

      // Note: Class-lesson association would need to be implemented
      // if a many-to-many relationship is needed in the future

      return NextResponse.json({ 
        message: 'Lesson saved successfully',
        lessonId: lesson.id,
        lesson
      });
    }

    // Load existing lesson functionality
    if (xmlContent) {
      // Parse uploaded XML content
      const lesson = await lessonLoader.parseXMLLesson(xmlContent);
      return NextResponse.json({ 
        lesson, 
        message: 'XML lesson loaded successfully',
        summary: lessonLoader.generateLessonSummary(lesson)
      });
    } else if (lessonSource) {
      // Load lesson from source
      const lesson = await lessonLoader.loadLesson(lessonSource);
      return NextResponse.json({ 
        lesson, 
        message: 'Lesson loaded successfully',
        summary: lessonLoader.generateLessonSummary(lesson)
      });
    } else {
      return NextResponse.json({ error: 'No lesson source provided' }, { status: 400 });
    }

  } catch (error: any) {
    console.error('Error processing lesson:', error);
    return NextResponse.json({ error: 'Failed to process lesson' }, { status: 500 });
  }
});

function generateLessonXML(lesson: any): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<lesson>
  <metadata>
    <title>${escapeXml(lesson.title)}</title>
    <description>${escapeXml(lesson.description)}</description>
    <author>${escapeXml(lesson.author)}</author>
    <version>${lesson.version}</version>
    <duration>${lesson.estimatedDuration}</duration>
    <difficulty>${lesson.metadata?.difficulty || 'BEGINNER'}</difficulty>
    <category>${lesson.metadata?.category || 'GENERAL'}</category>
    <tags>${lesson.metadata?.tags?.join(',') || ''}</tags>
    <learningObjectives>${lesson.metadata?.learningObjectives?.join('|') || ''}</learningObjectives>
    <prerequisites>${lesson.metadata?.prerequisites?.join('|') || ''}</prerequisites>
  </metadata>
  <scenarios>
    ${lesson.scenarios?.map((scenario: any) => `
    <scenario id="${scenario.id}" name="${escapeXml(scenario.name)}">
      <description>${escapeXml(scenario.description)}</description>
      <securities>
        ${scenario.securities?.map((symbol: string) => `<security symbol="${symbol}" initialPrice="${scenario.initialPrices?.[symbol] || 50.00}"/>`).join('\n        ')}
      </securities>
      <commands>
        ${scenario.commands?.map((cmd: any) => `
        <command type="${cmd.type}" timestamp="${cmd.timestamp}">
          <description>${escapeXml(cmd.description)}</description>
          <parameters>${escapeXml(JSON.stringify(cmd.parameters))}</parameters>
          ${cmd.conditions ? `<conditions>${escapeXml(JSON.stringify(cmd.conditions))}</conditions>` : ''}
        </command>`).join('\n        ')}
      </commands>
    </scenario>`).join('\n    ')}
  </scenarios>
</lesson>`;
}

function escapeXml(unsafe: string): string {
  if (typeof unsafe !== 'string') return String(unsafe);
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
    }
    return c;
  });
}