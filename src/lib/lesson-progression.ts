/**
 * Lesson Progression and Complexity Gates
 * 
 * Manages sequential lesson flow, prerequisite checking, and progressive
 * feature unlocking based on student performance and instructor settings.
 */

import { getMarketConfig, MarketComplexity } from './market-config';

export interface LessonPrerequisite {
  lessonId: string;
  minimumScore?: number;
  requiredTrades?: number;
  timeRequirement?: number; // minutes
  conceptsMastered?: string[];
}

export interface StudentProgress {
  userId: string;
  lessonId: string;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'MASTERED';
  score: number;
  tradesCompleted: number;
  timeSpent: number; // minutes
  conceptsMastered: string[];
  attempts: number;
  lastAttempt: Date;
  completedAt?: Date;
}

export interface LessonSequence {
  id: string;
  name: string;
  description: string;
  complexity: MarketComplexity;
  prerequisites: LessonPrerequisite[];
  learningObjectives: string[];
  estimatedDuration: number; // minutes
  concepts: string[];
  requiredScore: number; // minimum score to pass
  maxAttempts: number;
}

// Define the complete lesson progression tree
export const LESSON_SEQUENCES: LessonSequence[] = [
  // Foundation Level - Basic Market Concepts
  {
    id: 'Price Formation',
    name: 'Price Formation',
    description: 'Understanding how market prices are determined through supply and demand',
    complexity: 'BASIC',
    prerequisites: [],
    learningObjectives: [
      'Understand bid-ask spreads',
      'Learn price discovery mechanisms',
      'Experience order book dynamics'
    ],
    estimatedDuration: 30,
    concepts: ['price_discovery', 'bid_ask_spread', 'order_book'],
    requiredScore: 70,
    maxAttempts: 3
  },
  {
    id: 'Market Orders vs Limit Orders',
    name: 'Order Types and Execution',
    description: 'Mastering different order types and their strategic use',
    complexity: 'BASIC',
    prerequisites: [
      { lessonId: 'Price Formation', minimumScore: 70, requiredTrades: 5 }
    ],
    learningObjectives: [
      'Distinguish between market and limit orders',
      'Understand execution priority',
      'Learn order timing strategies'
    ],
    estimatedDuration: 25,
    concepts: ['market_orders', 'limit_orders', 'execution_priority'],
    requiredScore: 75,
    maxAttempts: 3
  },

  // Intermediate Level - Market Dynamics
  {
    id: 'Market Efficiency',
    name: 'Market Efficiency',
    description: 'Exploring how quickly markets incorporate new information',
    complexity: 'INTERMEDIATE',
    prerequisites: [
      { lessonId: 'Market Orders vs Limit Orders', minimumScore: 75, requiredTrades: 10 }
    ],
    learningObjectives: [
      'Test the efficient market hypothesis',
      'Identify arbitrage opportunities',
      'Understand information asymmetry'
    ],
    estimatedDuration: 45,
    concepts: ['market_efficiency', 'arbitrage', 'information_asymmetry'],
    requiredScore: 80,
    maxAttempts: 3
  },
  {
    id: 'Liquidity and Volatility',
    name: 'Market Liquidity and Volatility',
    description: 'Understanding liquidity provision and volatility dynamics',
    complexity: 'INTERMEDIATE',
    prerequisites: [
      { lessonId: 'Market Efficiency', minimumScore: 80, requiredTrades: 15 }
    ],
    learningObjectives: [
      'Analyze market depth and liquidity',
      'Understand volatility patterns',
      'Learn market making concepts'
    ],
    estimatedDuration: 40,
    concepts: ['liquidity', 'volatility', 'market_making', 'depth'],
    requiredScore: 80,
    maxAttempts: 2
  },

  // Advanced Level - Complex Strategies
  {
    id: 'Arbitrage Strategies',
    name: 'Arbitrage Trading',
    description: 'Advanced arbitrage strategies and risk management',
    complexity: 'ADVANCED',
    prerequisites: [
      { lessonId: 'Liquidity and Volatility', minimumScore: 80, requiredTrades: 20 },
      { lessonId: 'Market Efficiency', conceptsMastered: ['arbitrage'] }
    ],
    learningObjectives: [
      'Execute statistical arbitrage',
      'Manage arbitrage risks',
      'Understand convergence trades'
    ],
    estimatedDuration: 60,
    concepts: ['statistical_arbitrage', 'risk_management', 'convergence_trading'],
    requiredScore: 85,
    maxAttempts: 2
  },
  {
    id: 'Option Pricing',
    name: 'Options and Derivatives',
    description: 'Introduction to options pricing and derivatives trading',
    complexity: 'ADVANCED',
    prerequisites: [
      { lessonId: 'Arbitrage Strategies', minimumScore: 85, requiredTrades: 25 }
    ],
    learningObjectives: [
      'Understand option Greeks',
      'Learn Black-Scholes model',
      'Execute option strategies'
    ],
    estimatedDuration: 75,
    concepts: ['option_pricing', 'greeks', 'black_scholes', 'derivatives'],
    requiredScore: 85,
    maxAttempts: 2
  },

  // Professional Level - Portfolio Management
  {
    id: 'Portfolio Theory',
    name: 'Portfolio Optimization',
    description: 'Modern portfolio theory and risk-return optimization',
    complexity: 'PROFESSIONAL',
    prerequisites: [
      { lessonId: 'Option Pricing', minimumScore: 85, requiredTrades: 30 },
      { lessonId: 'Arbitrage Strategies', conceptsMastered: ['risk_management'] }
    ],
    learningObjectives: [
      'Apply Modern Portfolio Theory',
      'Optimize risk-return profiles',
      'Understand diversification benefits'
    ],
    estimatedDuration: 90,
    concepts: ['portfolio_optimization', 'diversification', 'risk_return', 'sharpe_ratio'],
    requiredScore: 90,
    maxAttempts: 1
  }
];

/**
 * Check if a student meets the prerequisites for a specific lesson
 */
export function checkLessonPrerequisites(
  lessonId: string,
  studentProgress: StudentProgress[]
): { eligible: boolean; missingRequirements: string[] } {
  const lesson = LESSON_SEQUENCES.find(l => l.id === lessonId);
  if (!lesson) {
    return { eligible: false, missingRequirements: ['Lesson not found'] };
  }

  const missingRequirements: string[] = [];

  for (const prereq of lesson.prerequisites) {
    const progress = studentProgress.find(p => p.lessonId === prereq.lessonId);

    if (!progress || progress.status === 'NOT_STARTED') {
      missingRequirements.push(`Must complete lesson: ${prereq.lessonId}`);
      continue;
    }

    if (prereq.minimumScore && progress.score < prereq.minimumScore) {
      missingRequirements.push(
        `Need score of ${prereq.minimumScore}% in ${prereq.lessonId} (current: ${progress.score}%)`
      );
    }

    if (prereq.requiredTrades && progress.tradesCompleted < prereq.requiredTrades) {
      missingRequirements.push(
        `Need ${prereq.requiredTrades} trades in ${prereq.lessonId} (current: ${progress.tradesCompleted})`
      );
    }

    if (prereq.timeRequirement && progress.timeSpent < prereq.timeRequirement) {
      missingRequirements.push(
        `Need ${prereq.timeRequirement} minutes in ${prereq.lessonId} (current: ${progress.timeSpent})`
      );
    }

    if (prereq.conceptsMastered) {
      const missingConcepts = prereq.conceptsMastered.filter(
        concept => !progress.conceptsMastered.includes(concept)
      );
      if (missingConcepts.length > 0) {
        missingRequirements.push(
          `Must master concepts in ${prereq.lessonId}: ${missingConcepts.join(', ')}`
        );
      }
    }
  }

  return {
    eligible: missingRequirements.length === 0,
    missingRequirements
  };
}

/**
 * Get the next recommended lesson for a student
 */
export function getNextLesson(studentProgress: StudentProgress[]): string | null {
  // Find the first lesson that is eligible but not completed
  for (const lesson of LESSON_SEQUENCES) {
    const progress = studentProgress.find(p => p.lessonId === lesson.id);
    
    // Skip if already mastered
    if (progress?.status === 'MASTERED') continue;
    
    // Check if eligible
    const { eligible } = checkLessonPrerequisites(lesson.id, studentProgress);
    if (eligible) {
      return lesson.id;
    }
  }

  return null; // All lessons completed or no eligible lessons
}

/**
 * Get available lessons for a student based on their progress
 */
export function getAvailableLessons(studentProgress: StudentProgress[]): {
  available: LessonSequence[];
  locked: LessonSequence[];
  completed: LessonSequence[];
} {
  const available: LessonSequence[] = [];
  const locked: LessonSequence[] = [];
  const completed: LessonSequence[] = [];

  for (const lesson of LESSON_SEQUENCES) {
    const progress = studentProgress.find(p => p.lessonId === lesson.id);
    
    if (progress?.status === 'COMPLETED' || progress?.status === 'MASTERED') {
      completed.push(lesson);
    } else {
      const { eligible } = checkLessonPrerequisites(lesson.id, studentProgress);
      if (eligible) {
        available.push(lesson);
      } else {
        locked.push(lesson);
      }
    }
  }

  return { available, locked, completed };
}

/**
 * Calculate lesson completion score based on various factors
 */
export function calculateLessonScore(
  trades: number,
  profitability: number,
  timeEfficiency: number,
  conceptDemonstration: number,
  lessonId: string
): number {
  const lesson = LESSON_SEQUENCES.find(l => l.id === lessonId);
  if (!lesson) return 0;

  // Different lessons weight factors differently
  let weights = { trades: 0.2, profit: 0.3, time: 0.2, concepts: 0.3 };

  switch (lesson.complexity) {
    case 'BASIC':
      weights = { trades: 0.3, profit: 0.2, time: 0.2, concepts: 0.3 };
      break;
    case 'INTERMEDIATE':
      weights = { trades: 0.25, profit: 0.35, time: 0.15, concepts: 0.25 };
      break;
    case 'ADVANCED':
      weights = { trades: 0.2, profit: 0.4, time: 0.1, concepts: 0.3 };
      break;
    case 'PROFESSIONAL':
      weights = { trades: 0.15, profit: 0.45, time: 0.1, concepts: 0.3 };
      break;
  }

  const score = 
    (trades * weights.trades) +
    (profitability * weights.profit) +
    (timeEfficiency * weights.time) +
    (conceptDemonstration * weights.concepts);

  return Math.min(100, Math.max(0, score));
}

/**
 * Update student progress for a lesson
 */
export function updateStudentProgress(
  currentProgress: StudentProgress[],
  lessonId: string,
  userId: string,
  updates: Partial<StudentProgress>
): StudentProgress[] {
  const existingIndex = currentProgress.findIndex(
    p => p.lessonId === lessonId && p.userId === userId
  );

  const baseProgress: StudentProgress = {
    userId,
    lessonId,
    status: 'NOT_STARTED',
    score: 0,
    tradesCompleted: 0,
    timeSpent: 0,
    conceptsMastered: [],
    attempts: 0,
    lastAttempt: new Date(),
    ...updates
  };

  if (existingIndex >= 0) {
    // Update existing progress
    const updated = [...currentProgress];
    updated[existingIndex] = { ...updated[existingIndex], ...updates };
    return updated;
  } else {
    // Add new progress entry
    return [...currentProgress, baseProgress];
  }
}

/**
 * Get progression path visualization for instructor dashboard
 */
export function getProgressionPath(studentProgress: StudentProgress[]): {
  path: Array<{
    lesson: LessonSequence;
    status: 'completed' | 'current' | 'available' | 'locked';
    progress: StudentProgress | null;
  }>;
  completionPercentage: number;
} {
  const path = LESSON_SEQUENCES.map(lesson => {
    const progress = studentProgress.find(p => p.lessonId === lesson.id);
    let status: 'completed' | 'current' | 'available' | 'locked';

    if (progress?.status === 'COMPLETED' || progress?.status === 'MASTERED') {
      status = 'completed';
    } else if (progress?.status === 'IN_PROGRESS') {
      status = 'current';
    } else {
      const { eligible } = checkLessonPrerequisites(lesson.id, studentProgress);
      status = eligible ? 'available' : 'locked';
    }

    return { lesson, status, progress: progress || null };
  });

  const completed = path.filter(p => p.status === 'completed').length;
  const completionPercentage = (completed / LESSON_SEQUENCES.length) * 100;

  return { path, completionPercentage };
}

/**
 * Generate adaptive lesson recommendations based on student performance
 */
export function generateAdaptiveRecommendations(
  studentProgress: StudentProgress[]
): {
  recommendation: string;
  reasoning: string;
  suggestedActions: string[];
} {
  const { available, completed } = getAvailableLessons(studentProgress);
  const nextLesson = getNextLesson(studentProgress);

  // Check for struggling patterns
  const strugglingLessons = studentProgress.filter(
    p => p.attempts > 2 && p.score < 70
  );

  const recentPerformance = studentProgress
    .filter(p => p.lastAttempt > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
    .sort((a, b) => b.lastAttempt.getTime() - a.lastAttempt.getTime())
    .slice(0, 3);

  if (strugglingLessons.length > 0) {
    return {
      recommendation: 'Review Fundamentals',
      reasoning: `Student is struggling with ${strugglingLessons.map(l => l.lessonId).join(', ')}. Consider reviewing basic concepts.`,
      suggestedActions: [
        'Provide additional practice in struggling areas',
        'Reduce complexity temporarily',
        'Offer one-on-one guidance',
        'Review prerequisite concepts'
      ]
    };
  }

  if (recentPerformance.length > 0 && recentPerformance.every(p => p.score > 85)) {
    return {
      recommendation: 'Accelerated Learning Path',
      reasoning: 'Student is excelling. Consider advanced or accelerated content.',
      suggestedActions: [
        'Unlock advanced features early',
        'Introduce challenge scenarios',
        'Provide peer mentoring opportunities',
        'Explore real-world applications'
      ]
    };
  }

  if (nextLesson) {
    const lesson = LESSON_SEQUENCES.find(l => l.id === nextLesson);
    return {
      recommendation: `Continue to ${nextLesson}`,
      reasoning: `Student is ready for the next lesson in the sequence.`,
      suggestedActions: [
        `Begin ${lesson?.name}`,
        'Review learning objectives',
        'Set performance expectations',
        'Provide contextual background'
      ]
    };
  }

  return {
    recommendation: 'Curriculum Complete',
    reasoning: 'Student has completed all available lessons.',
    suggestedActions: [
      'Provide advanced challenge scenarios',
      'Introduce real-world trading simulations',
      'Consider peer teaching opportunities',
      'Explore specialized topics'
    ]
  };
}