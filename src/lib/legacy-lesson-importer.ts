/**
 * Legacy Lesson Importer - Import upTick XML Lessons
 * 
 * Scans and imports all lesson XML files from the upTick Classroom Edition
 * distribution to make them available in the modern web platform
 */

import { promises as fs } from 'fs';
import path from 'path';
import { lessonLoader, LessonDefinition } from './lesson-loader';

export interface LegacyLessonIndex {
  lessonName: string;
  lessonId: string;
  xmlPath: string;
  excelPath?: string;
  reportingPath?: string;
  pptFiles: string[];
  difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  estimatedDuration: number;
  category: string;
}

export class LegacyLessonImporter {
  private lessonIndex: LegacyLessonIndex[] = [];
  private loadedLessons: Map<string, LessonDefinition> = new Map();
  private readonly basePath = path.resolve(process.cwd(), '../upTick Classroom Edition - Instructor Distribution/instructor/lessons');

  /**
   * Scan the upTick distribution directory for all lesson files
   */
  async scanLegacyLessons(): Promise<LegacyLessonIndex[]> {
    try {
      const lessonDirs = await fs.readdir(this.basePath);
      this.lessonIndex = [];

      for (const lessonDir of lessonDirs) {
        const lessonPath = path.join(this.basePath, lessonDir);
        const stat = await fs.stat(lessonPath);

        if (stat.isDirectory()) {
          const lessonIndex = await this.scanLessonDirectory(lessonDir, lessonPath);
          if (lessonIndex) {
            this.lessonIndex.push(lessonIndex);
          }
        }
      }

      return this.lessonIndex;
    } catch (error) {
      console.error('Error scanning legacy lessons:', error);
      return [];
    }
  }

  /**
   * Scan individual lesson directory
   */
  private async scanLessonDirectory(lessonName: string, lessonPath: string): Promise<LegacyLessonIndex | null> {
    try {
      const files = await fs.readdir(lessonPath);
      
      const xmlFile = files.find(f => f.startsWith('lesson - ') && f.endsWith('.xml'));
      const excelFile = files.find(f => f.endsWith('.xls'));
      const reportingFile = files.find(f => f.startsWith('reporting - ') && f.endsWith('.xml'));
      const pptFiles = files.filter(f => f.endsWith('.ppt') || f.endsWith('.pptx'));

      if (!xmlFile) {
        console.warn(`No lesson XML file found in ${lessonName}`);
        return null;
      }

      return {
        lessonName,
        lessonId: lessonName.replace(/\s+/g, '_').toUpperCase(),
        xmlPath: path.join(lessonPath, xmlFile),
        excelPath: excelFile ? path.join(lessonPath, excelFile) : undefined,
        reportingPath: reportingFile ? path.join(lessonPath, reportingFile) : undefined,
        pptFiles: pptFiles.map(f => path.join(lessonPath, f)),
        difficulty: this.inferDifficulty(lessonName),
        estimatedDuration: this.inferDuration(lessonName),
        category: this.inferCategory(lessonName)
      };
    } catch (error) {
      console.error(`Error scanning lesson directory ${lessonName}:`, error);
      return null;
    }
  }

  /**
   * Load specific lesson by name or ID
   */
  async loadLegacyLesson(lessonIdentifier: string): Promise<LessonDefinition | null> {
    try {
      // Check if already loaded
      if (this.loadedLessons.has(lessonIdentifier)) {
        return this.loadedLessons.get(lessonIdentifier)!;
      }

      // Find lesson in index
      let lessonIndex = this.lessonIndex.find(
        l => l.lessonId === lessonIdentifier || l.lessonName === lessonIdentifier
      );

      // If not in index, scan for it
      if (!lessonIndex) {
        await this.scanLegacyLessons();
        lessonIndex = this.lessonIndex.find(
          l => l.lessonId === lessonIdentifier || l.lessonName === lessonIdentifier
        );
      }

      if (!lessonIndex) {
        console.warn(`Lesson not found: ${lessonIdentifier}`);
        return null;
      }

      // Read and parse XML file
      const xmlContent = await fs.readFile(lessonIndex.xmlPath, 'utf-8');
      const lesson = await lessonLoader.parseXMLLesson(xmlContent);

      // Enhance with metadata from index
      lesson.metadata = {
        ...lesson.metadata,
        difficulty: lessonIndex.difficulty,
        estimatedDuration: lessonIndex.estimatedDuration,
        category: lessonIndex.category,
        hasExcelIntegration: !!lessonIndex.excelPath,
        hasReportingConfig: !!lessonIndex.reportingPath,
        presentationFiles: lessonIndex.pptFiles.length
      };

      // Cache the loaded lesson
      this.loadedLessons.set(lessonIndex.lessonId, lesson);
      this.loadedLessons.set(lessonIndex.lessonName, lesson);

      return lesson;
    } catch (error) {
      console.error(`Error loading legacy lesson ${lessonIdentifier}:`, error);
      return null;
    }
  }

  /**
   * Load all legacy lessons
   */
  async loadAllLegacyLessons(): Promise<LessonDefinition[]> {
    await this.scanLegacyLessons();
    const lessons: LessonDefinition[] = [];

    for (const lessonIndex of this.lessonIndex) {
      try {
        const lesson = await this.loadLegacyLesson(lessonIndex.lessonId);
        if (lesson) {
          lessons.push(lesson);
        }
      } catch (error) {
        console.error(`Failed to load lesson ${lessonIndex.lessonName}:`, error);
      }
    }

    return lessons;
  }

  /**
   * Get list of available legacy lessons
   */
  getAvailableLegacyLessons(): LegacyLessonIndex[] {
    return this.lessonIndex;
  }

  /**
   * Get lesson by category
   */
  getLessonsByCategory(category: string): LegacyLessonIndex[] {
    return this.lessonIndex.filter(l => l.category === category);
  }

  /**
   * Get lessons by difficulty
   */
  getLessonsByDifficulty(difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'): LegacyLessonIndex[] {
    return this.lessonIndex.filter(l => l.difficulty === difficulty);
  }

  /**
   * Infer lesson difficulty from name
   */
  private inferDifficulty(lessonName: string): 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' {
    const name = lessonName.toLowerCase();
    
    if (name.includes('price formation') || name.includes('market efficiency')) {
      return 'BEGINNER';
    }
    
    if (name.includes('arbitrage') || name.includes('option') || name.includes('asset allocation')) {
      return 'INTERMEDIATE';
    }
    
    if (name.includes('cdo') || name.includes('convertible') || name.includes('risky debt') || name.includes('iii')) {
      return 'ADVANCED';
    }
    
    return 'INTERMEDIATE';
  }

  /**
   * Infer lesson duration from complexity
   */
  private inferDuration(lessonName: string): number {
    const name = lessonName.toLowerCase();
    
    if (name.includes('price formation') || name.includes('market efficiency')) {
      return 90; // 1.5 hours for foundational lessons
    }
    
    if (name.includes('asset allocation') || name.includes('arbitrage')) {
      return 120; // 2 hours for intermediate topics
    }
    
    if (name.includes('cdo') || name.includes('option') || name.includes('risky debt')) {
      return 150; // 2.5 hours for advanced topics
    }
    
    return 90; // Default 1.5 hours
  }

  /**
   * Infer lesson category from name
   */
  private inferCategory(lessonName: string): string {
    const name = lessonName.toLowerCase();
    
    if (name.includes('price formation') || name.includes('market efficiency')) {
      return 'MARKET_MICROSTRUCTURE';
    }
    
    if (name.includes('arbitrage')) {
      return 'ARBITRAGE_STRATEGIES';
    }
    
    if (name.includes('option') || name.includes('cdo')) {
      return 'DERIVATIVES';
    }
    
    if (name.includes('asset allocation')) {
      return 'PORTFOLIO_THEORY';
    }
    
    if (name.includes('risky debt')) {
      return 'FIXED_INCOME';
    }
    
    return 'GENERAL';
  }

  /**
   * Generate lesson summary statistics
   */
  generateLegacyLessonStats(): {
    totalLessons: number;
    byCategory: { [category: string]: number };
    byDifficulty: { [difficulty: string]: number };
    averageDuration: number;
    withExcel: number;
    withReporting: number;
  } {
    const stats = {
      totalLessons: this.lessonIndex.length,
      byCategory: {} as { [category: string]: number },
      byDifficulty: {} as { [difficulty: string]: number },
      averageDuration: 0,
      withExcel: 0,
      withReporting: 0
    };

    let totalDuration = 0;

    this.lessonIndex.forEach(lesson => {
      // Category stats
      stats.byCategory[lesson.category] = (stats.byCategory[lesson.category] || 0) + 1;
      
      // Difficulty stats
      stats.byDifficulty[lesson.difficulty] = (stats.byDifficulty[lesson.difficulty] || 0) + 1;
      
      // Duration stats
      totalDuration += lesson.estimatedDuration;
      
      // Feature stats
      if (lesson.excelPath) stats.withExcel++;
      if (lesson.reportingPath) stats.withReporting++;
    });

    stats.averageDuration = stats.totalLessons > 0 ? Math.round(totalDuration / stats.totalLessons) : 0;

    return stats;
  }

  /**
   * Export lesson configuration for web platform
   */
  async exportLessonConfigurations(): Promise<any[]> {
    await this.scanLegacyLessons();
    
    return this.lessonIndex.map(lesson => ({
      id: lesson.lessonId,
      name: lesson.lessonName,
      category: lesson.category,
      difficulty: lesson.difficulty,
      estimatedDuration: lesson.estimatedDuration,
      features: {
        excelIntegration: !!lesson.excelPath,
        reportingConfig: !!lesson.reportingPath,
        presentationFiles: lesson.pptFiles.length
      },
      paths: {
        lesson: path.relative(process.cwd(), lesson.xmlPath),
        excel: lesson.excelPath ? path.relative(process.cwd(), lesson.excelPath) : null,
        reporting: lesson.reportingPath ? path.relative(process.cwd(), lesson.reportingPath) : null,
        presentations: lesson.pptFiles.map(f => path.relative(process.cwd(), f))
      }
    }));
  }
}

// Global instance
export const legacyLessonImporter = new LegacyLessonImporter();