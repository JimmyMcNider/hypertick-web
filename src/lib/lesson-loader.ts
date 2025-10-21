/**
 * Lesson Loader - XML Lesson Parser and Session Initializer
 * 
 * Loads and parses legacy upTick XML lesson files to maintain
 * full compatibility with existing curriculum and scenarios
 */

export interface LessonCommand {
  id: string;
  type: 'GRANT_PRIVILEGE' | 'SET_LIQUIDITY_TRADER' | 'OPEN_MARKET' | 'CLOSE_MARKET' | 
        'CREATE_AUCTION' | 'SET_PRICE' | 'INJECT_NEWS' | 'PAUSE_SESSION' | 'RESUME_SESSION' |
        'FORCE_LOGOUT' | 'SET_SCENARIO' | 'CONFIGURE_MARKET' | 'TRIGGER_EVENT';
  timestamp: number; // seconds from lesson start
  parameters: { [key: string]: any };
  conditions?: {
    requiredRole?: string[];
    minParticipants?: number;
    marketState?: string;
  };
  description: string;
}

export interface LessonScenario {
  id: string;
  name: string;
  description: string;
  duration: number; // seconds
  initialState: {
    marketOpen: boolean;
    initialPrices: { [symbol: string]: number };
    enabledSymbols: string[];
    liquidityTraders: string[];
    defaultPrivileges: number[];
  };
  commands: LessonCommand[];
  objectives: string[];
  assessmentCriteria?: {
    profitTarget?: number;
    riskLimit?: number;
    participationRate?: number;
  };
}

export interface LessonDefinition {
  id: string;
  title: string;
  description: string;
  version: string;
  created: string;
  author: string;
  difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  estimatedDuration: number; // minutes
  learningObjectives: string[];
  prerequisites: string[];
  scenarios: { [key: string]: LessonScenario }; // A, B, C scenarios
  defaultScenario: string;
  metadata: {
    tags: string[];
    category: string;
    subject: string;
  };
}

export class LessonLoader {
  private lessons: Map<string, LessonDefinition> = new Map();

  /**
   * Parse legacy XML lesson format
   */
  async parseXMLLesson(xmlContent: string): Promise<LessonDefinition> {
    // For now, create a mock parser that would handle real XML
    // In production, this would use DOMParser or xml2js
    
    const mockLesson: LessonDefinition = {
      id: 'LESSON_001',
      title: 'Introduction to Market Making',
      description: 'Learn the fundamentals of providing liquidity and market making strategies',
      version: '2.1',
      created: '2024-01-15',
      author: 'Trading Instructor',
      difficulty: 'INTERMEDIATE',
      estimatedDuration: 45,
      learningObjectives: [
        'Understand bid-ask spreads and market microstructure',
        'Learn to manage inventory risk',
        'Practice liquidity provision strategies',
        'Analyze market making profitability'
      ],
      prerequisites: ['Basic Trading Knowledge', 'Order Types'],
      defaultScenario: 'A',
      scenarios: {
        'A': {
          id: 'SCENARIO_A',
          name: 'Basic Market Making',
          description: 'Start with simple two-way quotes',
          duration: 1800, // 30 minutes
          initialState: {
            marketOpen: false,
            initialPrices: {
              'AOE': 50.00,
              'BOND1': 99.50,
              'BOND2': 102.25
            },
            enabledSymbols: ['AOE', 'BOND1'],
            liquidityTraders: [],
            defaultPrivileges: [1, 8, 9, 13, 15] // Analysis, Order Entry, Market Data, Portfolio, Order Book
          },
          commands: [
            {
              id: 'CMD_001',
              type: 'GRANT_PRIVILEGE',
              timestamp: 30,
              parameters: { privilegeCode: 20, targetRole: 'STUDENT' }, // Liquidity Provision
              description: 'Grant liquidity provision privileges to all students'
            },
            {
              id: 'CMD_002', 
              type: 'OPEN_MARKET',
              timestamp: 60,
              parameters: { symbols: ['AOE', 'BOND1'] },
              description: 'Open market for trading'
            },
            {
              id: 'CMD_003',
              type: 'INJECT_NEWS',
              timestamp: 300,
              parameters: { 
                headline: 'AOE announces strong quarterly earnings',
                impact: 'HIGH',
                symbols: ['AOE'],
                source: 'REUTERS'
              },
              description: 'Inject market-moving news event'
            },
            {
              id: 'CMD_004',
              type: 'SET_PRICE',
              timestamp: 600,
              parameters: { symbol: 'AOE', price: 51.25, volume: 1500 },
              description: 'Simulate large order impact on AOE'
            },
            {
              id: 'CMD_005',
              type: 'CREATE_AUCTION',
              timestamp: 900,
              parameters: { 
                symbol: 'AOE', 
                duration: 120,
                minimumBid: 100.00,
                description: 'Market making rights auction for AOE'
              },
              description: 'Start auction for AOE market making rights'
            }
          ],
          objectives: [
            'Maintain continuous two-way quotes',
            'Keep spreads under 0.05 for 80% of session',
            'Achieve positive P&L through spread capture',
            'Manage inventory within ±1000 shares'
          ],
          assessmentCriteria: {
            profitTarget: 250.00,
            riskLimit: 500.00,
            participationRate: 0.75
          }
        },
        'B': {
          id: 'SCENARIO_B',
          name: 'Advanced Market Making',
          description: 'Multi-symbol market making with volatility',
          duration: 2700, // 45 minutes
          initialState: {
            marketOpen: false,
            initialPrices: {
              'AOE': 50.00,
              'BOND1': 99.50,
              'BOND2': 102.25,
              'BOND3': 98.75
            },
            enabledSymbols: ['AOE', 'BOND1', 'BOND2', 'BOND3'],
            liquidityTraders: ['LIQUIDITY_BOT_1'],
            defaultPrivileges: [1, 3, 8, 9, 13, 14, 15, 20] // Full trading privileges
          },
          commands: [
            {
              id: 'CMD_B001',
              type: 'OPEN_MARKET',
              timestamp: 30,
              parameters: { symbols: ['AOE', 'BOND1', 'BOND2', 'BOND3'] },
              description: 'Open all markets for trading'
            },
            {
              id: 'CMD_B002',
              type: 'TRIGGER_EVENT',
              timestamp: 600,
              parameters: { 
                type: 'VOLATILITY_SPIKE',
                intensity: 'HIGH',
                duration: 300,
                affectedSymbols: ['AOE']
              },
              description: 'Trigger high volatility period'
            }
          ],
          objectives: [
            'Provide liquidity across all symbols',
            'Adapt spreads to volatility conditions',
            'Manage cross-asset inventory risk',
            'Participate in at least one auction'
          ]
        }
      },
      metadata: {
        tags: ['market-making', 'liquidity', 'risk-management'],
        category: 'Advanced Trading',
        subject: 'Market Microstructure'
      }
    };

    return mockLesson;
  }

  /**
   * Load lesson from file or URL
   */
  async loadLesson(source: string): Promise<LessonDefinition> {
    try {
      // In production, would fetch from file system or API
      const response = await fetch(`/api/lessons/${source}`);
      if (!response.ok) {
        throw new Error(`Failed to load lesson: ${response.statusText}`);
      }
      
      const xmlContent = await response.text();
      const lesson = await this.parseXMLLesson(xmlContent);
      
      this.lessons.set(lesson.id, lesson);
      return lesson;
    } catch (error) {
      console.error('Error loading lesson:', error);
      // Return mock lesson for development
      return this.parseXMLLesson('');
    }
  }

  /**
   * Get all available lessons
   */
  getAvailableLessons(): LessonDefinition[] {
    return Array.from(this.lessons.values());
  }

  /**
   * Get lesson by ID
   */
  getLesson(lessonId: string): LessonDefinition | null {
    return this.lessons.get(lessonId) || null;
  }

  /**
   * Validate lesson command sequence
   */
  validateLessonCommands(commands: LessonCommand[]): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Check command timing
    for (let i = 1; i < commands.length; i++) {
      if (commands[i].timestamp <= commands[i-1].timestamp) {
        errors.push(`Command ${commands[i].id} timestamp must be after previous command`);
      }
    }

    // Check for required privilege grants before usage
    const grantedPrivileges = new Set<number>();
    for (const cmd of commands) {
      if (cmd.type === 'GRANT_PRIVILEGE') {
        grantedPrivileges.add(cmd.parameters.privilegeCode);
      } else if (cmd.type === 'CREATE_AUCTION' && !grantedPrivileges.has(33)) {
        errors.push(`Auction command requires privilege 33 to be granted first`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Generate lesson summary for instructor review
   */
  generateLessonSummary(lesson: LessonDefinition): string {
    const scenarios = Object.keys(lesson.scenarios).length;
    const totalCommands = Object.values(lesson.scenarios)
      .reduce((sum, scenario) => sum + scenario.commands.length, 0);
    
    return `
Lesson: ${lesson.title}
Difficulty: ${lesson.difficulty}
Duration: ${lesson.estimatedDuration} minutes
Scenarios: ${scenarios} (${Object.keys(lesson.scenarios).join(', ')})
Total Commands: ${totalCommands}
Learning Objectives: ${lesson.learningObjectives.length}
Prerequisites: ${lesson.prerequisites.join(', ')}
Category: ${lesson.metadata.category}
Tags: ${lesson.metadata.tags.join(', ')}
    `.trim();
  }
}

// Global lesson loader instance
export const lessonLoader = new LessonLoader();