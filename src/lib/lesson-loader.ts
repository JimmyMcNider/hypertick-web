/**
 * Lesson Loader - XML Lesson Parser and Session Initializer
 * 
 * Loads and parses legacy upTick XML lesson files to maintain
 * full compatibility with existing curriculum and scenarios
 */

export interface LessonCommand {
  id: string;
  type: 'GRANT_PRIVILEGE' | 'REMOVE_PRIVILEGE' | 'SET_LIQUIDITY_TRADER' | 'OPEN_MARKET' | 
        'CLOSE_MARKET' | 'CREATE_AUCTION' | 'START_AUCTION' | 'UNDO_AUCTION' |
        'START_SIMULATION' | 'SET_MARKET' | 'SET_WIZARD_ITEM';
  parameters: any[];
  targetRole?: string; // $All, $Speculators, etc.
  description?: string;
}

export interface WizardItem {
  id: string;
  broadcast?: boolean;
  background?: string;
  content: {
    title?: string;
    subtitle?: string;
    text?: string;
    bullets?: string[];
    notes?: string[];
  };
  navigation: {
    nextEnabled: boolean;
    nextTarget?: string;
    backEnabled: boolean;
    backTarget?: string;
    conditionalNext?: {
      condition: string;
      target: string;
    };
  };
  commands?: LessonCommand[];
  components?: {
    type: string;
    config: any;
  }[];
}

export interface LessonSimulation {
  id: string;
  duration: number; // seconds
  startCommands: LessonCommand[];
  endCommands: LessonCommand[];
  reportTemplates: {
    iteration?: number;
    pptTemplate: string;
  }[];
}

export interface MarketSettings {
  startTick: number;
  marketDelay: number;
  loopOnClose: boolean;
  liquidateOnClose: boolean;
}

export interface PrivilegeDefinition {
  code: number;
  name: string;
  description: string;
}

export interface LessonDefinition {
  id: string;
  name: string;
  globalCommands: LessonCommand[];
  marketSettings: MarketSettings;
  adminPanels: string[];
  simulations: { [key: string]: LessonSimulation };
  wizardItems: { [key: string]: WizardItem };
  initialWizardItem: string;
  privileges: PrivilegeDefinition[];
  metadata?: {
    estimatedDuration?: number;
    difficulty?: string;
    objectives?: string[];
    category?: string;
    hasExcelIntegration?: boolean;
    hasReportingConfig?: boolean;
    presentationFiles?: number;
  };
}

export class LessonLoader {
  private lessons: Map<string, LessonDefinition> = new Map();

  /**
   * Parse legacy XML lesson format
   */
  async parseXMLLesson(xmlContent: string): Promise<LessonDefinition> {
    if (!xmlContent.trim()) {
      // Return the Price Formation lesson as default
      return this.createPriceFormationLesson();
    }

    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');
      const lessonElement = xmlDoc.querySelector('lesson');
      
      if (!lessonElement) {
        throw new Error('Invalid lesson XML: no lesson element found');
      }

      const lessonName = lessonElement.getAttribute('name') || 'Unknown Lesson';
      
      // Parse global commands
      const globalCommands = this.parseGlobalCommands(lessonElement);
      
      // Parse market settings
      const marketSettings = this.parseMarketSettings(lessonElement);
      
      // Parse admin panels
      const adminPanels = this.parseAdminPanels(lessonElement);
      
      // Parse simulations
      const simulations = this.parseSimulations(lessonElement);
      
      // Parse wizard items
      const wizardItems = this.parseWizardItems(lessonElement);
      
      // Find initial wizard item
      const initialWizardItem = this.findInitialWizardItem(lessonElement);
      
      // Define privilege mappings
      const privileges = this.getPrivilegeDefinitions();

      return {
        id: lessonName.replace(/\s+/g, '_').toUpperCase(),
        name: lessonName,
        globalCommands,
        marketSettings,
        adminPanels,
        simulations,
        wizardItems,
        initialWizardItem,
        privileges,
        metadata: {
          estimatedDuration: 90, // Price Formation typically 90 minutes
          difficulty: 'INTERMEDIATE',
          objectives: [
            'Understand price formation mechanisms',
            'Learn market maker vs speculator dynamics',
            'Experience auction-based privilege allocation',
            'Analyze market efficiency factors'
          ]
        }
      };
    } catch (error) {
      console.error('Error parsing XML lesson:', error);
      return this.createPriceFormationLesson();
    }
  }

  /**
   * Create the Price Formation lesson structure
   */
  private createPriceFormationLesson(): LessonDefinition {
    return {
      id: 'PRICE_FORMATION',
      name: 'Price Formation',
      globalCommands: [
        { id: 'GRANT_1', type: 'GRANT_PRIVILEGE', parameters: [1], description: 'Analyst Window' },
        { id: 'GRANT_4', type: 'GRANT_PRIVILEGE', parameters: [4], description: 'Buying Power Window' },
        { id: 'GRANT_5', type: 'GRANT_PRIVILEGE', parameters: [5], description: 'Event Window' },
        { id: 'GRANT_8', type: 'GRANT_PRIVILEGE', parameters: [8], description: 'Market Order Window' },
        { id: 'GRANT_9', type: 'GRANT_PRIVILEGE', parameters: [9], description: 'Montage' },
        { id: 'GRANT_10', type: 'GRANT_PRIVILEGE', parameters: [10], description: 'Trade Window' },
        { id: 'GRANT_11', type: 'GRANT_PRIVILEGE', parameters: [11], description: 'News Window' },
        { id: 'GRANT_12', type: 'GRANT_PRIVILEGE', parameters: [12], description: 'Order Log Window' },
        { id: 'GRANT_13', type: 'GRANT_PRIVILEGE', parameters: [13], description: 'Portfolio Window' },
        { id: 'GRANT_15', type: 'GRANT_PRIVILEGE', parameters: [15], description: 'Market Watch Window' },
        { id: 'GRANT_18', type: 'GRANT_PRIVILEGE', parameters: [18], description: 'Single Security Graph' },
        { id: 'GRANT_32', type: 'GRANT_PRIVILEGE', parameters: [32], description: 'Auction Window' },
        { id: 'GRANT_33', type: 'GRANT_PRIVILEGE', parameters: [33], description: 'Lesson Window' },
        { id: 'GRANT_34', type: 'GRANT_PRIVILEGE', parameters: [34], description: 'Excel Link' },
        { id: 'GRANT_29', type: 'GRANT_PRIVILEGE', parameters: [29], description: 'Bump Buttons' }
      ],
      marketSettings: {
        startTick: 257,
        marketDelay: 8,
        loopOnClose: false,
        liquidateOnClose: true
      },
      adminPanels: ['Traders'],
      simulations: {
        'Simulation A': {
          id: 'Simulation A',
          duration: 63,
          startCommands: [
            { id: 'SIM_A_LIQUIDITY', type: 'SET_LIQUIDITY_TRADER', parameters: [1, 'Active', false] },
            { id: 'SIM_A_PRIVILEGE', type: 'GRANT_PRIVILEGE', parameters: [23], targetRole: '$Speculators' },
            { id: 'SIM_A_OPEN', type: 'OPEN_MARKET', parameters: [5] }
          ],
          endCommands: [
            { id: 'SIM_A_CLOSE', type: 'CLOSE_MARKET', parameters: [] },
            { id: 'SIM_A_REMOVE_22', type: 'REMOVE_PRIVILEGE', parameters: [22], targetRole: '$All' },
            { id: 'SIM_A_REMOVE_23', type: 'REMOVE_PRIVILEGE', parameters: [23], targetRole: '$All' }
          ],
          reportTemplates: [
            { iteration: 1, pptTemplate: 'lesson/Price Formation/Price Formation, SimA, Round1.ppt' },
            { iteration: 2, pptTemplate: 'lesson/Price Formation/Price Formation, SimA, Round2.ppt' },
            { iteration: 3, pptTemplate: 'lesson/Price Formation/Price Formation, SimA, Round3.ppt' },
            { pptTemplate: 'lesson/Price Formation/Price Formation, SimA, Round3.ppt' }
          ]
        },
        'Simulation B': {
          id: 'Simulation B',
          duration: 63,
          startCommands: [
            { id: 'SIM_B_LIQUIDITY_ACTIVE', type: 'SET_LIQUIDITY_TRADER', parameters: [1, 'Active', true] },
            { id: 'SIM_B_LIQUIDITY_DELAY', type: 'SET_LIQUIDITY_TRADER', parameters: [1, 'Delay', 8] },
            { id: 'SIM_B_PRIVILEGE', type: 'GRANT_PRIVILEGE', parameters: [23], targetRole: '$Speculators' },
            { id: 'SIM_B_OPEN', type: 'OPEN_MARKET', parameters: [5] }
          ],
          endCommands: [
            { id: 'SIM_B_CLOSE', type: 'CLOSE_MARKET', parameters: [] },
            { id: 'SIM_B_REMOVE_22', type: 'REMOVE_PRIVILEGE', parameters: [22], targetRole: '$All' },
            { id: 'SIM_B_REMOVE_23', type: 'REMOVE_PRIVILEGE', parameters: [23], targetRole: '$All' }
          ],
          reportTemplates: [
            { iteration: 1, pptTemplate: 'lesson/Price Formation/Price Formation, SimB, Round1.ppt' },
            { pptTemplate: 'lesson/Price Formation/Price Formation, SimB, Round2.ppt' }
          ]
        },
        'Simulation C': {
          id: 'Simulation C', 
          duration: 63,
          startCommands: [
            { id: 'SIM_C_LIQUIDITY_ACTIVE', type: 'SET_LIQUIDITY_TRADER', parameters: [1, 'Active', true] },
            { id: 'SIM_C_LIQUIDITY_DELAY', type: 'SET_LIQUIDITY_TRADER', parameters: [1, 'Delay', 4] },
            { id: 'SIM_C_PRIVILEGE', type: 'GRANT_PRIVILEGE', parameters: [23], targetRole: '$Speculators' },
            { id: 'SIM_C_OPEN', type: 'OPEN_MARKET', parameters: [5] }
          ],
          endCommands: [
            { id: 'SIM_C_CLOSE', type: 'CLOSE_MARKET', parameters: [] },
            { id: 'SIM_C_REMOVE_22', type: 'REMOVE_PRIVILEGE', parameters: [22], targetRole: '$All' },
            { id: 'SIM_C_REMOVE_23', type: 'REMOVE_PRIVILEGE', parameters: [23], targetRole: '$All' }
          ],
          reportTemplates: [
            { pptTemplate: 'lesson/Price Formation/Price Formation, SimC.ppt' }
          ]
        }
      },
      wizardItems: {
        'Introduction': {
          id: 'Introduction',
          broadcast: true,
          content: {
            title: 'Welcome to upTick',
            subtitle: 'Simulation Overview',
            text: 'The primary objective of this module is to derive equilibrium price formation. The price formation lesson is comprised of several simulations, which may be repeated in multiple rounds.'
          },
          navigation: {
            nextEnabled: true,
            backEnabled: false
          },
          components: [
            {
              type: 'simulation_selector',
              config: {
                options: ['Simulation A', 'Simulation B', 'Simulation C']
              }
            }
          ]
        }
      },
      initialWizardItem: 'Introduction',
      privileges: this.getPrivilegeDefinitions()
    };
  }

  /**
   * Load lesson from file or URL
   */
  async loadLesson(source: string): Promise<LessonDefinition> {
    try {
      // For development, load the Price Formation lesson directly
      if (source.includes('Price Formation')) {
        const lesson = this.createPriceFormationLesson();
        this.lessons.set(lesson.id, lesson);
        return lesson;
      }
      
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
      // Return Price Formation lesson as fallback
      const fallbackLesson = this.createPriceFormationLesson();
      this.lessons.set(fallbackLesson.id, fallbackLesson);
      return fallbackLesson;
    }
  }

  /**
   * Get all available lessons
   */
  getAvailableLessons(): LessonDefinition[] {
    // Ensure we have at least the Price Formation lesson available
    if (this.lessons.size === 0) {
      const priceFormationLesson = this.createPriceFormationLesson();
      this.lessons.set(priceFormationLesson.id, priceFormationLesson);
    }
    return Array.from(this.lessons.values());
  }

  /**
   * Get lesson simulation by ID
   */
  getLessonSimulation(lessonId: string, simulationId: string): LessonSimulation | null {
    const lesson = this.getLesson(lessonId);
    return lesson?.simulations[simulationId] || null;
  }

  /**
   * Get wizard item by ID
   */
  getWizardItem(lessonId: string, wizardItemId: string): WizardItem | null {
    const lesson = this.getLesson(lessonId);
    return lesson?.wizardItems[wizardItemId] || null;
  }

  /**
   * Get privilege definition by code
   */
  getPrivilegeByCode(code: number): PrivilegeDefinition | null {
    const privileges = this.getPrivilegeDefinitions();
    return privileges.find(p => p.code === code) || null;
  }

  /**
   * Get lesson by ID
   */
  getLesson(lessonId: string): LessonDefinition | null {
    return this.lessons.get(lessonId) || null;
  }

  /**
   * Parse global commands from XML
   */
  private parseGlobalCommands(lessonElement: Element): LessonCommand[] {
    const commands: LessonCommand[] = [];
    const commandElements = lessonElement.querySelectorAll(':scope > command');
    
    commandElements.forEach((cmd, index) => {
      const name = cmd.getAttribute('name');
      const parameters = Array.from(cmd.querySelectorAll('parameter')).map(p => {
        const textContent = p.textContent?.trim();
        // Try to parse as number, otherwise keep as string
        if (textContent && !isNaN(Number(textContent))) {
          return textContent === 'true' ? true : textContent === 'false' ? false : Number(textContent);
        }
        return textContent;
      });
      
      if (name) {
        commands.push({
          id: `GLOBAL_${index}`,
          type: this.mapCommandType(name),
          parameters,
          description: this.getCommandDescription(name, parameters)
        });
      }
    });
    
    return commands;
  }

  /**
   * Parse market settings from XML
   */
  private parseMarketSettings(lessonElement: Element): MarketSettings {
    const setMarketCmd = lessonElement.querySelector('command[name="Set Market"]');
    const params = setMarketCmd?.querySelectorAll('parameter');
    
    return {
      startTick: params?.[0] ? Number(params[0].textContent) : 1,
      marketDelay: params?.[1] ? Number(params[1].textContent) : 8,
      loopOnClose: params?.[2] ? params[2].textContent === 'true' : false,
      liquidateOnClose: params?.[3] ? params[3].textContent === 'true' : true
    };
  }

  /**
   * Parse admin panels from XML
   */
  private parseAdminPanels(lessonElement: Element): string[] {
    const adminElements = lessonElement.querySelectorAll('admin panel');
    return Array.from(adminElements).map(panel => panel.textContent?.trim() || '');
  }

  /**
   * Parse simulations from XML
   */
  private parseSimulations(lessonElement: Element): { [key: string]: LessonSimulation } {
    const simulations: { [key: string]: LessonSimulation } = {};
    const simulationElements = lessonElement.querySelectorAll('simulation');
    
    simulationElements.forEach(sim => {
      const id = sim.getAttribute('id');
      const duration = Number(sim.getAttribute('duration')) || 60;
      
      if (id) {
        const startCommands = this.parseSimulationCommands(sim.querySelector('start'));
        const endCommands = this.parseSimulationCommands(sim.querySelector('end'));
        const reportTemplates = this.parseReportTemplates(sim);
        
        simulations[id] = {
          id,
          duration,
          startCommands,
          endCommands,
          reportTemplates
        };
      }
    });
    
    return simulations;
  }

  /**
   * Parse simulation commands
   */
  private parseSimulationCommands(container: Element | null): LessonCommand[] {
    if (!container) return [];
    
    const commands: LessonCommand[] = [];
    const commandElements = container.querySelectorAll('command');
    
    commandElements.forEach((cmd, index) => {
      const name = cmd.getAttribute('name');
      const parameters = Array.from(cmd.querySelectorAll('parameter')).map(p => {
        const textContent = p.textContent?.trim();
        if (textContent && !isNaN(Number(textContent))) {
          return textContent === 'true' ? true : textContent === 'false' ? false : Number(textContent);
        }
        return textContent;
      });
      
      if (name) {
        commands.push({
          id: `${container.parentElement?.getAttribute('id')}_${index}`,
          type: this.mapCommandType(name),
          parameters,
          targetRole: parameters.find(p => typeof p === 'string' && p.startsWith('$')) as string,
          description: this.getCommandDescription(name, parameters)
        });
      }
    });
    
    return commands;
  }

  /**
   * Parse report templates
   */
  private parseReportTemplates(simulation: Element): { iteration?: number; pptTemplate: string }[] {
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
   * Parse wizard items from XML
   */
  private parseWizardItems(lessonElement: Element): { [key: string]: WizardItem } {
    const wizardItems: { [key: string]: WizardItem } = {};
    const wizardElements = lessonElement.querySelectorAll('wizard_item');
    
    wizardElements.forEach(wizard => {
      const id = wizard.getAttribute('id');
      if (id) {
        wizardItems[id] = this.parseWizardItem(wizard);
      }
    });
    
    return wizardItems;
  }

  /**
   * Parse individual wizard item
   */
  private parseWizardItem(wizard: Element): WizardItem {
    const id = wizard.getAttribute('id') || '';
    const broadcast = wizard.getAttribute('broadcast') === 'true';
    const background = wizard.getAttribute('background') || undefined;
    
    // Parse content
    const centerPanel = wizard.querySelector('center_panel');
    const headers = centerPanel?.querySelectorAll('header');
    const texts = centerPanel?.querySelectorAll('text');
    const bullets = centerPanel?.querySelectorAll('bullet');
    const notes = centerPanel?.querySelectorAll('note');
    
    const content = {
      title: headers?.[0]?.textContent?.trim(),
      subtitle: headers?.[1]?.textContent?.trim(),
      text: Array.from(texts || []).map(t => t.textContent?.trim()).filter(Boolean).join(' '),
      bullets: Array.from(bullets || []).map(b => b.textContent?.trim()).filter(Boolean),
      notes: Array.from(notes || []).map(n => n.textContent?.trim()).filter(Boolean)
    };
    
    // Parse navigation
    const controller = wizard.querySelector('controller');
    const nextBtn = controller?.querySelector('next');
    const backBtn = controller?.querySelector('back');
    const nextWizardItem = nextBtn?.querySelector('next_wizard_item')?.textContent?.trim();
    const backWizardItem = backBtn?.querySelector('next_wizard_item')?.textContent?.trim();
    
    const navigation = {
      nextEnabled: nextBtn?.getAttribute('enabled') === 'true',
      nextTarget: nextWizardItem,
      backEnabled: backBtn?.getAttribute('enabled') === 'true',
      backTarget: backWizardItem
    };
    
    // Parse commands
    const commands = this.parseSimulationCommands(nextBtn || null);
    
    return {
      id,
      broadcast,
      background,
      content,
      navigation,
      commands
    };
  }

  /**
   * Find initial wizard item
   */
  private findInitialWizardItem(lessonElement: Element): string {
    const setWizardCmd = lessonElement.querySelector('command[name="Set Wizard Item"]');
    const parameter = setWizardCmd?.querySelector('parameter')?.textContent?.trim();
    return parameter || 'Introduction';
  }

  /**
   * Map XML command names to internal types
   */
  private mapCommandType(commandName: string): LessonCommand['type'] {
    const mapping: { [key: string]: LessonCommand['type'] } = {
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
   * Get command description based on type and parameters
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
    
    return commandName;
  }

  /**
   * Get privilege definitions
   */
  private getPrivilegeDefinitions(): PrivilegeDefinition[] {
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

  /**
   * Validate lesson command sequence
   */
  validateLessonCommands(commands: LessonCommand[]): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Check for required privilege grants before usage
    const grantedPrivileges = new Set<number>();
    for (const cmd of commands) {
      if (cmd.type === 'GRANT_PRIVILEGE' && typeof cmd.parameters[0] === 'number') {
        grantedPrivileges.add(cmd.parameters[0]);
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
    const simulations = Object.keys(lesson.simulations).length;
    const totalCommands = lesson.globalCommands.length +
      Object.values(lesson.simulations)
        .reduce((sum, sim) => sum + sim.startCommands.length + sim.endCommands.length, 0);
    const wizardSteps = Object.keys(lesson.wizardItems).length;
    
    return `
Lesson: ${lesson.name}
Difficulty: ${lesson.metadata?.difficulty || 'Unknown'}
Duration: ${lesson.metadata?.estimatedDuration || 'Unknown'} minutes
Simulations: ${simulations} (${Object.keys(lesson.simulations).join(', ')})
Wizard Steps: ${wizardSteps}
Total Commands: ${totalCommands}
Global Privileges: ${lesson.globalCommands.filter(cmd => cmd.type === 'GRANT_PRIVILEGE').length}
Objectives: ${lesson.metadata?.objectives?.join(', ') || 'Price formation and market dynamics'}
Market Settings: Start tick ${lesson.marketSettings.startTick}, ${lesson.marketSettings.marketDelay}s delay
    `.trim();
  }
}

// Global lesson loader instance
export const lessonLoader = new LessonLoader();

// Types are already exported above with their definitions