/**
 * upTick Lesson Importer - Legacy XML Integration
 * 
 * Imports and processes original upTick Classroom Edition lesson files
 * to maintain full compatibility with existing curriculum
 */

export interface UpTickLessonMetadata {
  title: string;
  description: string;
  author: string;
  version: string;
  estimatedDuration: number;
  difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  objectives: string[];
  prerequisites: string[];
}

export interface UpTickSimulation {
  id: string;
  name: string;
  description: string;
  duration: number;
  startCommands: UpTickCommand[];
  endCommands: UpTickCommand[];
  initialState: {
    marketOpen: boolean;
    enabledSymbols: string[];
    initialPrices: { [symbol: string]: number };
    liquidityTraders: string[];
    defaultPrivileges: number[];
  };
  reportTemplates: {
    iteration?: number;
    pptTemplate: string;
  }[];
}

export interface UpTickCommand {
  id: string;
  type: 'GRANT_PRIVILEGE' | 'REMOVE_PRIVILEGE' | 'SET_LIQUIDITY_TRADER' | 
        'OPEN_MARKET' | 'CLOSE_MARKET' | 'CREATE_AUCTION' | 'START_AUCTION' | 
        'UNDO_AUCTION' | 'START_SIMULATION' | 'SET_MARKET' | 'SET_WIZARD_ITEM';
  timestamp: number;
  parameters: any[];
  targetRole?: string;
  description?: string;
  conditions?: {
    requiredRole?: string;
    minParticipants?: number;
    marketState?: 'OPEN' | 'CLOSED';
  };
}

export interface UpTickLesson {
  metadata: UpTickLessonMetadata;
  globalCommands: UpTickCommand[];
  marketSettings: {
    startTick: number;
    marketDelay: number;
    loopOnClose: boolean;
    liquidateOnClose: boolean;
  };
  simulations: { [key: string]: UpTickSimulation };
  wizardItems: { [key: string]: any };
  initialWizardItem: string;
  privileges: {
    code: number;
    name: string;
    description: string;
  }[];
}

export class UpTickLessonImporter {
  /**
   * Import lesson from upTick XML format
   */
  async importLessonFromXML(xmlContent: string): Promise<UpTickLesson> {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');
    
    // Check for parsing errors
    const parseError = xmlDoc.querySelector('parsererror');
    if (parseError) {
      throw new Error('Invalid XML format');
    }

    const lessonElement = xmlDoc.querySelector('lesson');
    if (!lessonElement) {
      throw new Error('No lesson element found in XML');
    }

    const lessonName = lessonElement.getAttribute('name') || 'Imported Lesson';
    
    return {
      metadata: this.parseMetadata(lessonElement, lessonName),
      globalCommands: this.parseGlobalCommands(lessonElement),
      marketSettings: this.parseMarketSettings(lessonElement),
      simulations: this.parseSimulations(lessonElement),
      wizardItems: this.parseWizardItems(lessonElement),
      initialWizardItem: this.findInitialWizardItem(lessonElement),
      privileges: this.parsePrivileges(lessonElement)
    };
  }

  /**
   * Parse lesson metadata
   */
  private parseMetadata(lessonElement: Element, lessonName: string): UpTickLessonMetadata {
    const metadataElement = lessonElement.querySelector('metadata');
    
    return {
      title: lessonName,
      description: metadataElement?.querySelector('description')?.textContent || '',
      author: metadataElement?.querySelector('author')?.textContent || 'Unknown',
      version: metadataElement?.querySelector('version')?.textContent || '1.0',
      estimatedDuration: this.parseEstimatedDuration(lessonElement),
      difficulty: this.parseDifficulty(lessonElement),
      objectives: this.parseObjectives(lessonElement),
      prerequisites: this.parsePrerequisites(lessonElement)
    };
  }

  /**
   * Parse global commands that apply to all participants
   */
  private parseGlobalCommands(lessonElement: Element): UpTickCommand[] {
    const commands: UpTickCommand[] = [];
    const commandElements = lessonElement.querySelectorAll(':scope > command');
    
    commandElements.forEach((cmd, index) => {
      const command = this.parseCommand(cmd, `GLOBAL_${index}`);
      if (command) {
        commands.push(command);
      }
    });
    
    return commands;
  }

  /**
   * Parse individual command element
   */
  private parseCommand(commandElement: Element, idPrefix: string): UpTickCommand | null {
    const name = commandElement.getAttribute('name');
    if (!name) return null;

    const parameters = Array.from(commandElement.querySelectorAll('parameter')).map(p => {
      const textContent = p.textContent?.trim();
      if (textContent && !isNaN(Number(textContent))) {
        return textContent === 'true' ? true : textContent === 'false' ? false : Number(textContent);
      }
      return textContent;
    });

    const timestamp = Number(commandElement.getAttribute('timestamp')) || 0;
    const targetRole = parameters.find(p => typeof p === 'string' && p.startsWith('$')) as string;

    return {
      id: `${idPrefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: this.mapCommandType(name),
      timestamp,
      parameters,
      targetRole,
      description: this.getCommandDescription(name, parameters),
      conditions: this.parseCommandConditions(commandElement)
    };
  }

  /**
   * Parse market settings
   */
  private parseMarketSettings(lessonElement: Element) {
    const setMarketCmd = lessonElement.querySelector('command[name="Set Market"]');
    const params = setMarketCmd?.querySelectorAll('parameter');
    
    return {
      startTick: params?.[0] ? Number(params[0].textContent) : 257,
      marketDelay: params?.[1] ? Number(params[1].textContent) : 8,
      loopOnClose: params?.[2] ? params[2].textContent === 'true' : false,
      liquidateOnClose: params?.[3] ? params[3].textContent === 'true' : true
    };
  }

  /**
   * Parse simulation scenarios
   */
  private parseSimulations(lessonElement: Element): { [key: string]: UpTickSimulation } {
    const simulations: { [key: string]: UpTickSimulation } = {};
    const simulationElements = lessonElement.querySelectorAll('simulation');
    
    simulationElements.forEach(sim => {
      const id = sim.getAttribute('id');
      const duration = Number(sim.getAttribute('duration')) || 60;
      const name = sim.getAttribute('name') || id || 'Unnamed Simulation';
      
      if (id) {
        const startCommands = this.parseSimulationCommands(sim.querySelector('start'), 'START');
        const endCommands = this.parseSimulationCommands(sim.querySelector('end'), 'END');
        const reportTemplates = this.parseReportTemplates(sim);
        const initialState = this.parseInitialState(sim);
        
        simulations[id] = {
          id,
          name,
          description: sim.querySelector('description')?.textContent || '',
          duration,
          startCommands,
          endCommands,
          initialState,
          reportTemplates
        };
      }
    });
    
    return simulations;
  }

  /**
   * Parse simulation commands (start/end)
   */
  private parseSimulationCommands(container: Element | null, prefix: string): UpTickCommand[] {
    if (!container) return [];
    
    const commands: UpTickCommand[] = [];
    const commandElements = container.querySelectorAll('command');
    
    commandElements.forEach((cmd, index) => {
      const command = this.parseCommand(cmd, `${prefix}_${index}`);
      if (command) {
        commands.push(command);
      }
    });
    
    return commands;
  }

  /**
   * Parse initial state for simulation
   */
  private parseInitialState(simulation: Element) {
    const securitiesElement = simulation.querySelector('securities');
    const securities = Array.from(securitiesElement?.querySelectorAll('security') || []);
    
    const enabledSymbols = securities.map(s => s.getAttribute('symbol')).filter(Boolean) as string[];
    const initialPrices: { [symbol: string]: number } = {};
    
    securities.forEach(security => {
      const symbol = security.getAttribute('symbol');
      const price = Number(security.getAttribute('initialPrice')) || 50.0;
      if (symbol) {
        initialPrices[symbol] = price;
      }
    });

    return {
      marketOpen: true,
      enabledSymbols,
      initialPrices,
      liquidityTraders: this.parseLiquidityTraders(simulation),
      defaultPrivileges: this.parseDefaultPrivileges(simulation)
    };
  }

  /**
   * Parse report templates
   */
  private parseReportTemplates(simulation: Element) {
    const reports: { iteration?: number; pptTemplate: string }[] = [];
    const reportElements = simulation.querySelectorAll('report');
    
    reportElements.forEach(report => {
      const iteration = report.getAttribute('iteration');
      const ppt = report.getAttribute('ppt');
      
      if (ppt) {
        reports.push({
          iteration: iteration ? Number(iteration) : undefined,
          pptTemplate: ppt
        });
      }
    });
    
    return reports;
  }

  /**
   * Map XML command names to internal command types
   */
  private mapCommandType(commandName: string): UpTickCommand['type'] {
    const mapping: { [key: string]: UpTickCommand['type'] } = {
      'Grant Privilege': 'GRANT_PRIVILEGE',
      'Remove Privilege': 'REMOVE_PRIVILEGE',
      'Set Liquidity Trader': 'SET_LIQUIDITY_TRADER',
      'Open Market': 'OPEN_MARKET',
      'Close Market': 'CLOSE_MARKET',
      'Create Auction': 'CREATE_AUCTION',
      'Start Auction': 'START_AUCTION',
      'Undo Auction': 'UNDO_AUCTION',
      'Start Simulation': 'START_SIMULATION',
      'Set Market': 'SET_MARKET',
      'Set Wizard Item': 'SET_WIZARD_ITEM'
    };
    
    return mapping[commandName] || 'GRANT_PRIVILEGE';
  }

  /**
   * Get human-readable command description
   */
  private getCommandDescription(commandName: string, parameters: any[]): string {
    const privilegeNames: { [key: number]: string } = {
      1: 'Analyst Window',
      4: 'Buying Power Window',
      5: 'Event Window',
      8: 'Market Order Window',
      9: 'Montage',
      10: 'Trade Window',
      11: 'News Window',
      12: 'Order Log Window',
      13: 'Portfolio Window',
      15: 'Market Watch Window',
      18: 'Single Security Graph',
      22: 'Market Making Rights',
      23: 'Premium Analyst Signals',
      29: 'Bump Buttons',
      32: 'Auction Window',
      33: 'Lesson Window',
      34: 'Excel Link'
    };
    
    if (commandName === 'Grant Privilege' && parameters[0]) {
      return `Grant ${privilegeNames[parameters[0]] || `Privilege ${parameters[0]}`}`;
    }
    
    if (commandName === 'Remove Privilege' && parameters[0]) {
      return `Remove ${privilegeNames[parameters[0]] || `Privilege ${parameters[0]}`}`;
    }
    
    return commandName;
  }

  /**
   * Parse command execution conditions
   */
  private parseCommandConditions(commandElement: Element) {
    const conditionsElement = commandElement.querySelector('conditions');
    if (!conditionsElement) return undefined;

    return {
      requiredRole: conditionsElement.getAttribute('requiredRole') || undefined,
      minParticipants: conditionsElement.getAttribute('minParticipants') 
        ? Number(conditionsElement.getAttribute('minParticipants')) : undefined,
      marketState: conditionsElement.getAttribute('marketState') as 'OPEN' | 'CLOSED' || undefined
    };
  }

  // Helper parsing methods
  private parseEstimatedDuration(lessonElement: Element): number {
    const durationElement = lessonElement.querySelector('duration');
    return durationElement ? Number(durationElement.textContent) || 90 : 90;
  }

  private parseDifficulty(lessonElement: Element): 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' {
    const difficultyElement = lessonElement.querySelector('difficulty');
    const difficulty = difficultyElement?.textContent?.toUpperCase();
    
    if (difficulty === 'BEGINNER' || difficulty === 'INTERMEDIATE' || difficulty === 'ADVANCED') {
      return difficulty;
    }
    return 'INTERMEDIATE';
  }

  private parseObjectives(lessonElement: Element): string[] {
    const objectivesElement = lessonElement.querySelector('objectives');
    return Array.from(objectivesElement?.querySelectorAll('objective') || [])
      .map(obj => obj.textContent?.trim())
      .filter(Boolean) as string[];
  }

  private parsePrerequisites(lessonElement: Element): string[] {
    const prereqsElement = lessonElement.querySelector('prerequisites');
    return Array.from(prereqsElement?.querySelectorAll('prerequisite') || [])
      .map(prereq => prereq.textContent?.trim())
      .filter(Boolean) as string[];
  }

  private parseWizardItems(lessonElement: Element): { [key: string]: any } {
    const wizardItems: { [key: string]: any } = {};
    const wizardElements = lessonElement.querySelectorAll('wizard_item');
    
    wizardElements.forEach(wizard => {
      const id = wizard.getAttribute('id');
      if (id) {
        wizardItems[id] = this.parseWizardItem(wizard);
      }
    });
    
    return wizardItems;
  }

  private parseWizardItem(wizard: Element): any {
    // Simplified wizard item parsing
    return {
      id: wizard.getAttribute('id'),
      title: wizard.querySelector('title')?.textContent || '',
      content: wizard.querySelector('content')?.textContent || ''
    };
  }

  private findInitialWizardItem(lessonElement: Element): string {
    const setWizardCmd = lessonElement.querySelector('command[name="Set Wizard Item"]');
    const parameter = setWizardCmd?.querySelector('parameter')?.textContent?.trim();
    return parameter || 'Introduction';
  }

  private parseLiquidityTraders(simulation: Element): string[] {
    const liquidityElement = simulation.querySelector('liquidity_traders');
    return Array.from(liquidityElement?.querySelectorAll('trader') || [])
      .map(trader => trader.textContent?.trim())
      .filter(Boolean) as string[];
  }

  private parseDefaultPrivileges(simulation: Element): number[] {
    const privilegesElement = simulation.querySelector('default_privileges');
    return Array.from(privilegesElement?.querySelectorAll('privilege') || [])
      .map(priv => Number(priv.textContent))
      .filter(num => !isNaN(num));
  }

  private parsePrivileges(lessonElement: Element) {
    // Return standard upTick privileges
    return [
      { code: 1, name: 'Analyst Window', description: 'Access to market analysis tools' },
      { code: 4, name: 'Buying Power Window', description: 'View account buying power' },
      { code: 5, name: 'Event Window', description: 'Access to market events' },
      { code: 8, name: 'Market Order Window', description: 'Place market orders' },
      { code: 9, name: 'Montage', description: 'Level II order book display' },
      { code: 10, name: 'Trade Window', description: 'Execute trades' },
      { code: 11, name: 'News Window', description: 'Access to market news' },
      { code: 12, name: 'Order Log Window', description: 'View order history' },
      { code: 13, name: 'Portfolio Window', description: 'View portfolio positions' },
      { code: 15, name: 'Market Watch Window', description: 'Monitor market data' },
      { code: 18, name: 'Single Security Graph', description: 'Price chart display' },
      { code: 22, name: 'Market Making Rights', description: 'Place limit orders as market maker' },
      { code: 23, name: 'Premium Analyst Signals', description: 'Access to insider information' },
      { code: 29, name: 'Bump Buttons', description: 'Quick price adjustment tools' },
      { code: 32, name: 'Auction Window', description: 'Participate in auctions' },
      { code: 33, name: 'Lesson Window', description: 'Access to lesson controls' },
      { code: 34, name: 'Excel Link', description: 'Export data to Excel' }
    ];
  }
}

// Global instance
export const upTickLessonImporter = new UpTickLessonImporter();