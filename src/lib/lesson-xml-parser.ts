/**
 * Lesson XML Parser - Parse upTick XML Lessons
 * 
 * Parses legacy upTick XML lesson files to extract simulation scenarios,
 * privilege grants, market commands, and auction configurations for
 * session control in the modern web platform.
 */

export interface PrivilegeGrant {
  privilegeCode: number;
  description: string;
}

export interface MarketConfiguration {
  startTick?: number;
  marketDelay?: number;
  loopOnClose?: boolean;
  liquidateOnClose?: boolean;
}

export interface AuctionConfiguration {
  privilegeCode: number;
  auctionType: 'RIGHTS' | 'DUTCH' | 'ENGLISH';
  duration?: number;
  startingPrice?: number;
  minimumBid?: number;
}

export interface SimulationCommand {
  name: string;
  parameters: string[];
  timing: 'START' | 'END' | 'DURING';
}

export interface SimulationScenario {
  id: string;
  duration: number;
  startCommands: SimulationCommand[];
  endCommands: SimulationCommand[];
  reportConfig?: string;
}

export interface ParsedLesson {
  name: string;
  globalCommands: SimulationCommand[];
  privilegeGrants: PrivilegeGrant[];
  marketConfig: MarketConfiguration;
  auctions: AuctionConfiguration[];
  scenarios: SimulationScenario[];
  metadata: {
    estimatedDuration: number;
    difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
    category: string;
    scenarioCount: number;
    totalSimulationTime?: number;
  };
}

/**
 * Map of privilege codes to descriptions based on upTick system
 */
const PRIVILEGE_DESCRIPTIONS: { [key: number]: string } = {
  1: 'Analyst Window',
  2: 'Auto Trader Window', 
  3: 'Blotter Window',
  4: 'Buying Power Window',
  5: 'Chart Window',
  6: 'Clock Window',
  7: 'Execute Trader Window',
  8: 'Market Order Window',
  9: 'Montage Window',
  10: 'News Window',
  11: 'Order Entry Window',
  12: 'P&L Window',
  13: 'Portfolio Window',
  14: 'Position Window',
  15: 'Market Watch Window',
  16: 'Quote Window',
  17: 'Risk Manager Window',
  18: 'Select Security Window',
  19: 'Terminal Window',
  20: 'Ticker Window',
  21: 'Time & Sales Window',
  22: 'Volume Window',
  23: 'Market Making Rights',
  24: 'Short Selling Rights',
  25: 'Advanced Order Types',
  26: 'Options Trading',
  27: 'Futures Trading',
  28: 'Currency Trading',
  29: 'Commodity Trading',
  30: 'Administrative Functions',
  31: 'Report Generation',
  32: 'Account Management',
  33: 'System Configuration',
  34: 'Data Export',
  35: 'Advanced Analytics'
};

export class LessonXMLParser {
  /**
   * Parse complete lesson XML content
   */
  static parseLesson(xmlContent: string, lessonName: string): ParsedLesson {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlContent, 'text/xml');
    
    if (doc.documentElement.nodeName === 'parsererror') {
      throw new Error('Invalid XML content');
    }

    const lessonElement = doc.documentElement;
    
    // Parse global commands (outside simulations)
    const globalCommands = this.parseGlobalCommands(lessonElement);
    
    // Extract privilege grants
    const privilegeGrants = this.extractPrivilegeGrants(globalCommands);
    
    // Extract market configuration
    const marketConfig = this.extractMarketConfiguration(globalCommands);
    
    // Extract auction configurations
    const auctions = this.extractAuctionConfigurations(globalCommands);
    
    // Parse simulation scenarios
    const scenarios = this.parseSimulationScenarios(lessonElement);
    
    // Generate metadata
    const metadata = this.generateMetadata(lessonName, scenarios);

    return {
      name: lessonName,
      globalCommands,
      privilegeGrants,
      marketConfig,
      auctions,
      scenarios,
      metadata
    };
  }

  /**
   * Parse global commands (commands outside simulation blocks)
   */
  private static parseGlobalCommands(lessonElement: Element): SimulationCommand[] {
    const commands: SimulationCommand[] = [];
    const commandElements = lessonElement.querySelectorAll(':scope > command');
    
    commandElements.forEach(commandEl => {
      const command = this.parseCommandElement(commandEl, 'DURING');
      if (command) {
        commands.push(command);
      }
    });
    
    return commands;
  }

  /**
   * Parse simulation scenarios
   */
  private static parseSimulationScenarios(lessonElement: Element): SimulationScenario[] {
    const scenarios: SimulationScenario[] = [];
    const simulationElements = lessonElement.querySelectorAll('simulation');
    
    simulationElements.forEach(simEl => {
      const id = simEl.getAttribute('id') || '';
      const duration = parseInt(simEl.getAttribute('duration') || '300');
      
      // Parse start commands
      const startSection = simEl.querySelector('start');
      const startCommands = startSection ? 
        this.parseCommandsInSection(startSection, 'START') : [];
      
      // Parse end commands
      const endSection = simEl.querySelector('end');
      const endCommands = endSection ? 
        this.parseCommandsInSection(endSection, 'END') : [];
      
      // Parse report configuration
      const reportEl = simEl.querySelector('report');
      const reportConfig = reportEl?.getAttribute('ppt') || undefined;
      
      scenarios.push({
        id,
        duration,
        startCommands,
        endCommands,
        reportConfig
      });
    });
    
    return scenarios;
  }

  /**
   * Parse commands within a section (start/end)
   */
  private static parseCommandsInSection(section: Element, timing: 'START' | 'END'): SimulationCommand[] {
    const commands: SimulationCommand[] = [];
    const commandElements = section.querySelectorAll('command');
    
    commandElements.forEach(commandEl => {
      const command = this.parseCommandElement(commandEl, timing);
      if (command) {
        commands.push(command);
      }
    });
    
    return commands;
  }

  /**
   * Parse individual command element
   */
  private static parseCommandElement(commandEl: Element, timing: 'START' | 'END' | 'DURING'): SimulationCommand | null {
    const name = commandEl.getAttribute('name');
    if (!name) return null;
    
    const parameters: string[] = [];
    const paramElements = commandEl.querySelectorAll('parameter');
    
    paramElements.forEach(paramEl => {
      const value = paramEl.textContent?.trim();
      if (value) {
        parameters.push(value);
      }
    });
    
    return {
      name,
      parameters,
      timing
    };
  }

  /**
   * Extract privilege grants from commands
   */
  private static extractPrivilegeGrants(commands: SimulationCommand[]): PrivilegeGrant[] {
    const privileges: PrivilegeGrant[] = [];
    
    commands.forEach(command => {
      if (command.name === 'Grant Privilege' && command.parameters.length > 0) {
        const privilegeCode = parseInt(command.parameters[0]);
        if (!isNaN(privilegeCode)) {
          privileges.push({
            privilegeCode,
            description: PRIVILEGE_DESCRIPTIONS[privilegeCode] || `Privilege ${privilegeCode}`
          });
        }
      }
    });
    
    return privileges;
  }

  /**
   * Extract market configuration from commands
   */
  private static extractMarketConfiguration(commands: SimulationCommand[]): MarketConfiguration {
    const config: MarketConfiguration = {};
    
    commands.forEach(command => {
      if (command.name === 'Set Market' && command.parameters.length >= 4) {
        config.startTick = parseInt(command.parameters[0]) || undefined;
        config.marketDelay = parseInt(command.parameters[1]) || undefined;
        config.loopOnClose = command.parameters[2] === 'true';
        config.liquidateOnClose = command.parameters[3] === 'true';
      }
    });
    
    return config;
  }

  /**
   * Extract auction configurations from commands
   */
  private static extractAuctionConfigurations(commands: SimulationCommand[]): AuctionConfiguration[] {
    const auctions: AuctionConfiguration[] = [];
    
    commands.forEach(command => {
      if (command.name === 'Create Auction' && command.parameters.length >= 2) {
        const privilegeCode = parseInt(command.parameters[0]);
        const auctionType = command.parameters[1].toUpperCase() as 'RIGHTS' | 'DUTCH' | 'ENGLISH';
        
        if (!isNaN(privilegeCode)) {
          const auction: AuctionConfiguration = {
            privilegeCode,
            auctionType
          };
          
          // Optional parameters
          if (command.parameters.length > 2) {
            auction.duration = parseInt(command.parameters[2]) || undefined;
          }
          if (command.parameters.length > 3) {
            auction.startingPrice = parseFloat(command.parameters[3]) || undefined;
          }
          if (command.parameters.length > 4) {
            auction.minimumBid = parseFloat(command.parameters[4]) || undefined;
          }
          
          auctions.push(auction);
        }
      }
    });
    
    return auctions;
  }

  /**
   * Generate lesson metadata
   */
  private static generateMetadata(lessonName: string, scenarios: SimulationScenario[]): ParsedLesson['metadata'] {
    const name = lessonName.toLowerCase();
    
    // Determine difficulty
    let difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' = 'INTERMEDIATE';
    if (name.includes('price formation') || name.includes('market efficiency')) {
      difficulty = 'BEGINNER';
    } else if (name.includes('cdo') || name.includes('convertible') || name.includes('iii')) {
      difficulty = 'ADVANCED';
    }
    
    // Determine category
    let category = 'GENERAL';
    if (name.includes('price formation') || name.includes('market efficiency')) {
      category = 'MARKET_MICROSTRUCTURE';
    } else if (name.includes('arbitrage')) {
      category = 'ARBITRAGE_STRATEGIES';
    } else if (name.includes('option') || name.includes('cdo')) {
      category = 'DERIVATIVES';
    } else if (name.includes('asset allocation')) {
      category = 'PORTFOLIO_THEORY';
    } else if (name.includes('risky debt')) {
      category = 'FIXED_INCOME';
    }
    
    // Calculate total simulation time from XML scenario durations
    // These are in the XML <simulation duration="X"> format
    const totalSimulationTime = scenarios.reduce((total, scenario) => total + scenario.duration, 0);
    
    // Convert simulation duration to actual class time
    // Most upTick simulations run for multiple "ticks" but represent trading days/periods
    let estimatedDuration;
    if (totalSimulationTime <= 63) {
      // Short simulations (like single period arbitrage) = 1 class period
      estimatedDuration = 90; // 1.5 hours
    } else if (totalSimulationTime <= 300) {
      // Medium simulations (like price formation) = 1-2 class periods  
      estimatedDuration = 150; // 2.5 hours
    } else {
      // Long simulations (like 6-month market efficiency) = multiple class periods
      estimatedDuration = 180; // 3 hours (or split across multiple classes)
    }
    
    return {
      estimatedDuration,
      difficulty,
      category,
      scenarioCount: scenarios.length,
      totalSimulationTime // Add this for reference
    };
  }

  /**
   * Extract all simulation scenarios from XML (helper method)
   */
  static extractScenarios(xmlContent: string): string[] {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(xmlContent, 'text/xml');
      const scenarios: string[] = [];
      
      const simulationElements = doc.querySelectorAll('simulation');
      simulationElements.forEach(simEl => {
        const id = simEl.getAttribute('id');
        if (id) {
          scenarios.push(id);
        }
      });
      
      return scenarios;
    } catch (error) {
      console.error('Error extracting scenarios from XML:', error);
      return [];
    }
  }

  /**
   * Extract privilege grants from XML (helper method)
   */
  static extractPrivileges(xmlContent: string): PrivilegeGrant[] {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(xmlContent, 'text/xml');
      const privileges: PrivilegeGrant[] = [];
      
      const commandElements = doc.querySelectorAll('command[name="Grant Privilege"]');
      commandElements.forEach(commandEl => {
        const paramEl = commandEl.querySelector('parameter');
        const privilegeCode = parseInt(paramEl?.textContent?.trim() || '');
        
        if (!isNaN(privilegeCode)) {
          privileges.push({
            privilegeCode,
            description: PRIVILEGE_DESCRIPTIONS[privilegeCode] || `Privilege ${privilegeCode}`
          });
        }
      });
      
      return privileges;
    } catch (error) {
      console.error('Error extracting privileges from XML:', error);
      return [];
    }
  }
}