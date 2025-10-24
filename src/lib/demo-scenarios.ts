/**
 * Demo Scenarios for HyperTick v1
 * 
 * Pre-configured scenarios to showcase platform capabilities
 * during professor presentations and demonstrations
 */

export interface DemoScenario {
  id: string;
  name: string;
  description: string;
  duration: number; // minutes
  lessonId: string;
  participants: DemoParticipant[];
  marketConditions: MarketConditions;
  keyFeatures: string[];
  instructorNotes: string[];
  timeline: ScenarioEvent[];
}

export interface DemoParticipant {
  id: string;
  username: string;
  role: 'STUDENT' | 'INSTRUCTOR';
  strategy: 'CONSERVATIVE' | 'AGGRESSIVE' | 'MARKET_MAKER' | 'SPECULATOR';
  initialCash: number;
  initialPrivileges: number[];
  behaviorProfile: {
    tradingFrequency: 'LOW' | 'MEDIUM' | 'HIGH';
    riskTolerance: 'LOW' | 'MEDIUM' | 'HIGH';
    informationSeeking: boolean;
    auctionParticipation: boolean;
  };
}

export interface MarketConditions {
  volatility: 'LOW' | 'MEDIUM' | 'HIGH';
  liquidity: 'LOW' | 'MEDIUM' | 'HIGH';
  initialPrices: Record<string, number>;
  priceShocks: Array<{
    time: number; // seconds from start
    symbol: string;
    magnitude: number; // percentage
    direction: 'UP' | 'DOWN';
  }>;
  newsEvents: Array<{
    time: number;
    title: string;
    content: string;
    impact: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
    severity: 'LOW' | 'MEDIUM' | 'HIGH';
  }>;
}

export interface ScenarioEvent {
  time: number; // seconds from start
  type: 'MARKET_OPEN' | 'PRIVILEGE_AUCTION' | 'NEWS_INJECTION' | 'PRICE_SHOCK' | 'ANALYSIS_POINT';
  description: string;
  automated: boolean;
  instructorAction?: string;
}

// Demo scenarios for different presentation contexts
export const DEMO_SCENARIOS: Record<string, DemoScenario> = {
  // 5-minute quick demo for overview
  'quick-demo': {
    id: 'quick-demo',
    name: 'Quick Platform Overview',
    description: 'Fast-paced demonstration of core trading and privilege features',
    duration: 5,
    lessonId: 'price-formation',
    participants: [
      {
        id: 'demo-instructor',
        username: 'Professor Smith',
        role: 'INSTRUCTOR',
        strategy: 'CONSERVATIVE',
        initialCash: 0,
        initialPrivileges: [1, 2, 5, 7, 9, 11],
        behaviorProfile: {
          tradingFrequency: 'LOW',
          riskTolerance: 'LOW',
          informationSeeking: false,
          auctionParticipation: false
        }
      },
      {
        id: 'alice-trader',
        username: 'Alice (Aggressive)',
        role: 'STUDENT',
        strategy: 'AGGRESSIVE',
        initialCash: 10000,
        initialPrivileges: [1, 2, 7],
        behaviorProfile: {
          tradingFrequency: 'HIGH',
          riskTolerance: 'HIGH',
          informationSeeking: true,
          auctionParticipation: true
        }
      },
      {
        id: 'bob-conservative',
        username: 'Bob (Conservative)',
        role: 'STUDENT',
        strategy: 'CONSERVATIVE',
        initialCash: 10000,
        initialPrivileges: [1, 2, 7],
        behaviorProfile: {
          tradingFrequency: 'LOW',
          riskTolerance: 'LOW',
          informationSeeking: false,
          auctionParticipation: false
        }
      },
      {
        id: 'carol-marketmaker',
        username: 'Carol (Market Maker)',
        role: 'STUDENT',
        strategy: 'MARKET_MAKER',
        initialCash: 15000,
        initialPrivileges: [1, 2, 5, 7, 9],
        behaviorProfile: {
          tradingFrequency: 'MEDIUM',
          riskTolerance: 'MEDIUM',
          informationSeeking: true,
          auctionParticipation: true
        }
      }
    ],
    marketConditions: {
      volatility: 'MEDIUM',
      liquidity: 'MEDIUM',
      initialPrices: {
        'STOCK_A': 100,
        'STOCK_B': 50
      },
      priceShocks: [
        {
          time: 180, // 3 minutes in
          symbol: 'STOCK_A',
          magnitude: 15,
          direction: 'UP'
        }
      ],
      newsEvents: [
        {
          time: 120,
          title: 'Breaking: Company A Announces Major Partnership',
          content: 'Company A has announced a strategic partnership expected to increase revenue by 20%',
          impact: 'POSITIVE',
          severity: 'HIGH'
        }
      ]
    },
    keyFeatures: [
      'Real-time order book',
      'Live P&L tracking',
      'Privilege auctions',
      'Instructor analytics',
      'Market maker spreads'
    ],
    instructorNotes: [
      'Start with privilege auction for Level II data access',
      'Show real-time analytics dashboard',
      'Demonstrate news injection impact',
      'Highlight student ranking and strategy analysis'
    ],
    timeline: [
      {
        time: 0,
        type: 'PRIVILEGE_AUCTION',
        description: 'Auction Level II Data Access privilege (60 seconds)',
        automated: false,
        instructorAction: 'Start auction for privilege 9 (Level II Data) with $200 min bid'
      },
      {
        time: 60,
        type: 'MARKET_OPEN',
        description: 'Open trading market',
        automated: true
      },
      {
        time: 120,
        type: 'NEWS_INJECTION',
        description: 'Inject positive news about Company A',
        automated: true
      },
      {
        time: 180,
        type: 'PRICE_SHOCK',
        description: 'Apply 15% price shock to STOCK_A',
        automated: true
      },
      {
        time: 240,
        type: 'ANALYSIS_POINT',
        description: 'Show real-time analytics and student performance',
        automated: false,
        instructorAction: 'Display analytics dashboard showing strategy differences'
      }
    ]
  },

  // 15-minute comprehensive demo
  'comprehensive-demo': {
    id: 'comprehensive-demo',
    name: 'Comprehensive Trading Simulation',
    description: 'Full-featured demonstration showing advanced trading mechanics and educational features',
    duration: 15,
    lessonId: 'price-formation',
    participants: [
      {
        id: 'demo-instructor',
        username: 'Professor Smith',
        role: 'INSTRUCTOR',
        strategy: 'CONSERVATIVE',
        initialCash: 0,
        initialPrivileges: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
        behaviorProfile: {
          tradingFrequency: 'LOW',
          riskTolerance: 'LOW',
          informationSeeking: false,
          auctionParticipation: false
        }
      },
      {
        id: 'alice-aggressive',
        username: 'Alice (Day Trader)',
        role: 'STUDENT',
        strategy: 'AGGRESSIVE',
        initialCash: 12000,
        initialPrivileges: [1, 2, 7],
        behaviorProfile: {
          tradingFrequency: 'HIGH',
          riskTolerance: 'HIGH',
          informationSeeking: true,
          auctionParticipation: true
        }
      },
      {
        id: 'bob-conservative',
        username: 'Bob (Buy & Hold)',
        role: 'STUDENT',
        strategy: 'CONSERVATIVE',
        initialCash: 10000,
        initialPrivileges: [1, 2, 7],
        behaviorProfile: {
          tradingFrequency: 'LOW',
          riskTolerance: 'LOW',
          informationSeeking: false,
          auctionParticipation: false
        }
      },
      {
        id: 'carol-marketmaker',
        username: 'Carol (Market Maker)',
        role: 'STUDENT',
        strategy: 'MARKET_MAKER',
        initialCash: 15000,
        initialPrivileges: [1, 2, 5, 7, 9],
        behaviorProfile: {
          tradingFrequency: 'MEDIUM',
          riskTolerance: 'MEDIUM',
          informationSeeking: true,
          auctionParticipation: true
        }
      },
      {
        id: 'david-arbitrage',
        username: 'David (Arbitrageur)',
        role: 'STUDENT',
        strategy: 'SPECULATOR',
        initialCash: 11000,
        initialPrivileges: [1, 2, 7, 8],
        behaviorProfile: {
          tradingFrequency: 'HIGH',
          riskTolerance: 'HIGH',
          informationSeeking: true,
          auctionParticipation: true
        }
      },
      {
        id: 'eve-insider',
        username: 'Eve (Insider)',
        role: 'STUDENT',
        strategy: 'SPECULATOR',
        initialCash: 10000,
        initialPrivileges: [1, 2, 7, 10], // Has insider info privilege
        behaviorProfile: {
          tradingFrequency: 'MEDIUM',
          riskTolerance: 'HIGH',
          informationSeeking: true,
          auctionParticipation: false
        }
      }
    ],
    marketConditions: {
      volatility: 'HIGH',
      liquidity: 'MEDIUM',
      initialPrices: {
        'STOCK_A': 100,
        'STOCK_B': 50,
        'STOCK_C': 75
      },
      priceShocks: [
        {
          time: 300, // 5 minutes
          symbol: 'STOCK_A',
          magnitude: 20,
          direction: 'UP'
        },
        {
          time: 600, // 10 minutes
          symbol: 'STOCK_B',
          magnitude: 15,
          direction: 'DOWN'
        }
      ],
      newsEvents: [
        {
          time: 180,
          title: 'Market Volatility Expected',
          content: 'Analysts predict increased market volatility due to upcoming earnings reports',
          impact: 'NEUTRAL',
          severity: 'MEDIUM'
        },
        {
          time: 480,
          title: 'Company A Beats Earnings Expectations',
          content: 'Company A reports 25% increase in quarterly earnings, beating all analyst expectations',
          impact: 'POSITIVE',
          severity: 'HIGH'
        },
        {
          time: 720,
          title: 'Regulatory Concerns for Company B',
          content: 'New regulations may impact Company B\'s business model',
          impact: 'NEGATIVE',
          severity: 'MEDIUM'
        }
      ]
    },
    keyFeatures: [
      'Multiple privilege auctions',
      'Advanced order types',
      'Real-time risk management',
      'Insider information dynamics',
      'Market maker economics',
      'Performance analytics'
    ],
    instructorNotes: [
      'Demonstrate privilege auction mechanics early',
      'Show how insider information affects trading',
      'Highlight market maker role in liquidity provision',
      'Use news events to show information asymmetry',
      'Analyze different trading strategies throughout',
      'Conclude with comprehensive performance review'
    ],
    timeline: [
      {
        time: 0,
        type: 'PRIVILEGE_AUCTION',
        description: 'Auction Level II Data Access (90 seconds)',
        automated: false,
        instructorAction: 'Start auction for Level II Data with $300 min bid'
      },
      {
        time: 90,
        type: 'PRIVILEGE_AUCTION',
        description: 'Auction Short Selling Privilege (90 seconds)',
        automated: false,
        instructorAction: 'Start auction for Short Selling with $500 min bid'
      },
      {
        time: 180,
        type: 'MARKET_OPEN',
        description: 'Open trading market',
        automated: true
      },
      {
        time: 240,
        type: 'NEWS_INJECTION',
        description: 'Inject volatility warning news',
        automated: true
      },
      {
        time: 300,
        type: 'PRICE_SHOCK',
        description: 'Apply positive shock to STOCK_A',
        automated: true
      },
      {
        time: 360,
        type: 'ANALYSIS_POINT',
        description: 'Show impact of price shock on strategies',
        automated: false,
        instructorAction: 'Analyze how different strategies responded to price movement'
      },
      {
        time: 480,
        type: 'NEWS_INJECTION',
        description: 'Company A earnings beat',
        automated: true
      },
      {
        time: 600,
        type: 'PRICE_SHOCK',
        description: 'Apply negative shock to STOCK_B',
        automated: true
      },
      {
        time: 720,
        type: 'NEWS_INJECTION',
        description: 'Regulatory concerns for Company B',
        automated: true
      },
      {
        time: 840,
        type: 'ANALYSIS_POINT',
        description: 'Final performance analysis',
        automated: false,
        instructorAction: 'Show comprehensive analytics and strategy comparison'
      }
    ]
  },

  // Market efficiency focused demo
  'market-efficiency-demo': {
    id: 'market-efficiency-demo',
    name: 'Market Efficiency Demonstration',
    description: 'Focused demonstration of information flow and market efficiency concepts',
    duration: 10,
    lessonId: 'market-efficiency',
    participants: [
      {
        id: 'demo-instructor',
        username: 'Professor Smith',
        role: 'INSTRUCTOR',
        strategy: 'CONSERVATIVE',
        initialCash: 0,
        initialPrivileges: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
        behaviorProfile: {
          tradingFrequency: 'LOW',
          riskTolerance: 'LOW',
          informationSeeking: false,
          auctionParticipation: false
        }
      },
      {
        id: 'informed-trader-1',
        username: 'Sarah (Informed)',
        role: 'STUDENT',
        strategy: 'SPECULATOR',
        initialCash: 12000,
        initialPrivileges: [1, 2, 7, 8, 10], // Has research and insider info
        behaviorProfile: {
          tradingFrequency: 'HIGH',
          riskTolerance: 'HIGH',
          informationSeeking: true,
          auctionParticipation: true
        }
      },
      {
        id: 'uninformed-trader-1',
        username: 'Mike (Uninformed)',
        role: 'STUDENT',
        strategy: 'CONSERVATIVE',
        initialCash: 10000,
        initialPrivileges: [1, 2, 7], // Basic privileges only
        behaviorProfile: {
          tradingFrequency: 'LOW',
          riskTolerance: 'LOW',
          informationSeeking: false,
          auctionParticipation: false
        }
      },
      {
        id: 'noise-trader-1',
        username: 'Alex (Noise Trader)',
        role: 'STUDENT',
        strategy: 'AGGRESSIVE',
        initialCash: 10000,
        initialPrivileges: [1, 2, 7],
        behaviorProfile: {
          tradingFrequency: 'HIGH',
          riskTolerance: 'HIGH',
          informationSeeking: false,
          auctionParticipation: false
        }
      }
    ],
    marketConditions: {
      volatility: 'MEDIUM',
      liquidity: 'HIGH',
      initialPrices: {
        'EFFICIENT_STOCK': 100
      },
      priceShocks: [],
      newsEvents: [
        {
          time: 120,
          title: 'Private Research Released',
          content: 'Exclusive analyst research suggests EFFICIENT_STOCK is undervalued by 15%',
          impact: 'POSITIVE',
          severity: 'HIGH'
        },
        {
          time: 360,
          title: 'Public Information Released',
          content: 'Company releases official earnings guidance confirming analyst projections',
          impact: 'POSITIVE',
          severity: 'MEDIUM'
        }
      ]
    },
    keyFeatures: [
      'Information asymmetry effects',
      'Price discovery process',
      'Informed vs uninformed trading',
      'Market efficiency measurement'
    ],
    instructorNotes: [
      'Emphasize information advantage dynamics',
      'Show how prices incorporate new information',
      'Demonstrate noise trader impact on efficiency',
      'Analyze speed of price adjustment'
    ],
    timeline: [
      {
        time: 0,
        type: 'PRIVILEGE_AUCTION',
        description: 'Auction Research Access privilege',
        automated: false,
        instructorAction: 'Auction research privilege to create information advantage'
      },
      {
        time: 90,
        type: 'MARKET_OPEN',
        description: 'Open trading market',
        automated: true
      },
      {
        time: 120,
        type: 'NEWS_INJECTION',
        description: 'Release private research (visible to privileged traders only)',
        automated: true
      },
      {
        time: 240,
        type: 'ANALYSIS_POINT',
        description: 'Analyze price discovery process',
        automated: false,
        instructorAction: 'Show how informed traders moved prices'
      },
      {
        time: 360,
        type: 'NEWS_INJECTION',
        description: 'Make information public',
        automated: true
      },
      {
        time: 480,
        type: 'ANALYSIS_POINT',
        description: 'Compare informed vs uninformed performance',
        automated: false,
        instructorAction: 'Demonstrate market efficiency concepts through trading data'
      }
    ]
  }
};

export class DemoScenarioManager {
  private currentScenario: DemoScenario | null = null;
  private scenarioStartTime: Date | null = null;
  private eventTimers: NodeJS.Timeout[] = [];

  /**
   * Start a demo scenario
   */
  async startScenario(scenarioId: string, sessionManager: any): Promise<string> {
    const scenario = DEMO_SCENARIOS[scenarioId];
    if (!scenario) {
      throw new Error(`Demo scenario not found: ${scenarioId}`);
    }

    this.currentScenario = scenario;
    this.scenarioStartTime = new Date();

    // Create session with scenario lesson
    const sessionId = await sessionManager.createSession(
      'demo-class',
      'demo-instructor',
      scenario.lessonId
    );

    // Add demo participants
    for (const participant of scenario.participants) {
      await sessionManager.addParticipant(sessionId, {
        userId: participant.id,
        username: participant.username,
        role: participant.role,
        privileges: participant.initialPrivileges,
        buyingPower: participant.initialCash,
        position: {
          cash: participant.initialCash,
          securities: {},
          unrealizedPnL: 0,
          realizedPnL: 0
        },
        connected: true,
        lastActivity: new Date()
      });
    }

    // Set up scenario timeline
    this.scheduleScenarioEvents(sessionId, sessionManager);

    return sessionId;
  }

  /**
   * Schedule automated events from scenario timeline
   */
  private scheduleScenarioEvents(sessionId: string, sessionManager: any): void {
    if (!this.currentScenario) return;

    for (const event of this.currentScenario.timeline) {
      if (event.automated) {
        const timer = setTimeout(() => {
          this.executeScenarioEvent(sessionId, event, sessionManager);
        }, event.time * 1000);
        
        this.eventTimers.push(timer);
      }
    }
  }

  /**
   * Execute a scenario event
   */
  private async executeScenarioEvent(sessionId: string, event: ScenarioEvent, sessionManager: any): Promise<void> {
    try {
      switch (event.type) {
        case 'MARKET_OPEN':
          await sessionManager.executeCommand(sessionId, {
            type: 'OPEN_MARKET',
            parameters: [0] // No delay
          }, 'DEMO_SYSTEM');
          break;

        case 'NEWS_INJECTION':
          if (this.currentScenario) {
            const newsEvent = this.currentScenario.marketConditions.newsEvents
              .find(n => n.time === event.time);
            if (newsEvent) {
              // Inject news through session manager
              sessionManager.injectNews(sessionId, newsEvent);
            }
          }
          break;

        case 'PRICE_SHOCK':
          if (this.currentScenario) {
            const priceShock = this.currentScenario.marketConditions.priceShocks
              .find(s => s.time === event.time);
            if (priceShock) {
              // Apply price shock through session manager
              sessionManager.createPriceShock(sessionId, priceShock.symbol, priceShock.magnitude, priceShock.direction);
            }
          }
          break;
      }
    } catch (error) {
      console.error('Failed to execute scenario event:', error);
    }
  }

  /**
   * Get current scenario progress
   */
  getScenarioProgress(): { currentTime: number; totalDuration: number; nextEvent?: ScenarioEvent } {
    if (!this.currentScenario || !this.scenarioStartTime) {
      return { currentTime: 0, totalDuration: 0 };
    }

    const currentTime = Math.floor((Date.now() - this.scenarioStartTime.getTime()) / 1000);
    const totalDuration = this.currentScenario.duration * 60;

    const nextEvent = this.currentScenario.timeline
      .filter(event => event.time > currentTime)
      .sort((a, b) => a.time - b.time)[0];

    return { currentTime, totalDuration, nextEvent };
  }

  /**
   * Stop current scenario
   */
  stopScenario(): void {
    this.eventTimers.forEach(timer => clearTimeout(timer));
    this.eventTimers = [];
    this.currentScenario = null;
    this.scenarioStartTime = null;
  }

  /**
   * Get scenario instructor notes for current time
   */
  getCurrentInstructorNotes(): string[] {
    if (!this.currentScenario) return [];
    return this.currentScenario.instructorNotes;
  }

  /**
   * Get upcoming manual actions
   */
  getUpcomingManualActions(): ScenarioEvent[] {
    if (!this.currentScenario || !this.scenarioStartTime) return [];

    const currentTime = Math.floor((Date.now() - this.scenarioStartTime.getTime()) / 1000);

    return this.currentScenario.timeline
      .filter(event => !event.automated && event.time > currentTime)
      .sort((a, b) => a.time - b.time)
      .slice(0, 3); // Next 3 manual actions
  }
}

// Global demo scenario manager
export const demoScenarioManager = new DemoScenarioManager();