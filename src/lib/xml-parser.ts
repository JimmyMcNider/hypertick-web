/**
 * XML Lesson Parser
 * 
 * Parses legacy upTick XML lesson configurations and converts them
 * to modern TypeScript interfaces for session management
 */

import { parseString } from 'xml2js';
import { promisify } from 'util';

const parseXML = promisify(parseString);

// Core lesson structure interfaces
export interface LessonConfig {
  name: string;
  privileges: PrivilegeGrant[];
  marketSettings: MarketSettings;
  simulations: SimulationConfig[];
  wizardItems: WizardItem[];
  adminPanels: string[];
}

export interface PrivilegeGrant {
  code: number;
  userGroup?: string; // $All, $Speculators, etc.
}

export interface MarketSettings {
  startTick: number;
  marketDelay: number; // seconds
  loopOnClose: boolean;
  liquidateOnClose: boolean;
  interestRate?: {
    security: number;
    rate: number;
    compounding: number;
    start: number;
    duration: number;
  };
}

export interface SimulationConfig {
  id: string;
  duration: number; // seconds
  startCommands: Command[];
  endCommands: Command[];
  reports: ReportConfig[];
}

export interface Command {
  name: string;
  parameters: (string | number | boolean)[];
}

export interface ReportConfig {
  iteration?: number;
  pptFile: string;
}

export interface WizardItem {
  id: string;
  broadcast: boolean;
  centerPanel: PanelConfig;
  controller: ControllerConfig;
}

export interface PanelConfig {
  background: string;
  content: ContentElement[];
}

export interface ContentElement {
  type: 'space' | 'subtitle' | 'component' | 'text' | 'bullet' | 'note';
  value?: string | number;
  properties?: Record<string, any>;
  children?: ContentElement[];
}

export interface ControllerConfig {
  background: string;
  next?: NavigationButton;
  back?: NavigationButton;
}

export interface NavigationButton {
  visible: boolean;
  enabled: boolean;
  conditions?: NavigationCondition[];
  commands?: Command[];
  nextWizardItem?: string;
}

export interface NavigationCondition {
  type: 'switch' | 'enable';
  condition: string;
  cases?: NavigationCase[];
  event?: string;
}

export interface NavigationCase {
  value: string;
  nextWizardItem: string;
}

// Auction configuration
export interface AuctionConfig {
  privilegeType: number;
  available: number;
  initialPrice: number;
  increment: number;
  intervalSeconds: number;
}

// Dynamic security configuration  
export interface DynamicSecurity {
  security: number;
  tick: number;
  type: 'Bond' | 'Equity' | 'Option';
}

/**
 * Main XML parser class for legacy lesson configurations
 */
export class XMLLessonParser {
  
  /**
   * Parse a complete lesson XML configuration
   */
  async parseLesson(xmlContent: string): Promise<LessonConfig> {
    try {
      const result = await parseXML(xmlContent);
      const lessonNode = result.lesson;
      
      if (!lessonNode) {
        throw new Error('Invalid lesson XML: missing <lesson> root element');
      }

      const lessonName = lessonNode.$.name || 'Unnamed Lesson';
      
      return {
        name: lessonName,
        privileges: this.parsePrivileges(lessonNode),
        marketSettings: this.parseMarketSettings(lessonNode),
        simulations: this.parseSimulations(lessonNode),
        wizardItems: this.parseWizardItems(lessonNode),
        adminPanels: this.parseAdminPanels(lessonNode)
      };
      
    } catch (error) {
      throw new Error(`Failed to parse lesson XML: ${error.message}`);
    }
  }

  /**
   * Parse privilege grant commands
   */
  private parsePrivileges(lessonNode: any): PrivilegeGrant[] {
    const privileges: PrivilegeGrant[] = [];
    const commands = lessonNode.command || [];
    
    for (const command of commands) {
      if (command.$.name === 'Grant Privilege') {
        const parameters = command.parameter || [];
        const code = parseInt(parameters[0]);
        const userGroup = parameters[1] || undefined;
        
        privileges.push({ code, userGroup });
      }
    }
    
    return privileges;
  }

  /**
   * Parse market configuration settings
   */
  private parseMarketSettings(lessonNode: any): MarketSettings {
    const commands = lessonNode.command || [];
    let marketSettings: Partial<MarketSettings> = {
      startTick: 1,
      marketDelay: 8,
      loopOnClose: false,
      liquidateOnClose: true
    };

    for (const command of commands) {
      if (command.$.name === 'Set Market') {
        const params = command.parameter || [];
        marketSettings.startTick = parseInt(params[0]) || 1;
        marketSettings.marketDelay = parseInt(params[1]) || 8;
        marketSettings.loopOnClose = params[2] === 'true';
        marketSettings.liquidateOnClose = params[3] === 'true';
      }
      
      if (command.$.name === 'Set Interest Rate') {
        const params = command.parameter || [];
        marketSettings.interestRate = {
          security: parseInt(params[0]),
          rate: parseFloat(params[1]),
          compounding: parseFloat(params[2]),
          start: parseInt(params[3]),
          duration: parseInt(params[4])
        };
      }
    }

    return marketSettings as MarketSettings;
  }

  /**
   * Parse simulation configurations
   */
  private parseSimulations(lessonNode: any): SimulationConfig[] {
    const simulations: SimulationConfig[] = [];
    const simulationNodes = lessonNode.simulation || [];
    
    for (const simNode of simulationNodes) {
      const simulation: SimulationConfig = {
        id: simNode.$.id,
        duration: parseInt(simNode.$.duration),
        startCommands: this.parseCommands(simNode.start?.[0]),
        endCommands: this.parseCommands(simNode.end?.[0]),
        reports: this.parseReports(simNode)
      };
      
      simulations.push(simulation);
    }
    
    return simulations;
  }

  /**
   * Parse command sequences
   */
  private parseCommands(commandContainer: any): Command[] {
    if (!commandContainer) return [];
    
    const commands: Command[] = [];
    const commandNodes = commandContainer.command || [];
    
    for (const cmdNode of commandNodes) {
      const command: Command = {
        name: cmdNode.$.name,
        parameters: (cmdNode.parameter || []).map(p => {
          // Try to parse as number or boolean, fallback to string
          if (p === 'true') return true;
          if (p === 'false') return false;
          const num = parseFloat(p);
          return isNaN(num) ? p : num;
        })
      };
      
      commands.push(command);
    }
    
    return commands;
  }

  /**
   * Parse report configurations
   */
  private parseReports(simulationNode: any): ReportConfig[] {
    const reports: ReportConfig[] = [];
    const reportNodes = simulationNode.report || [];
    
    for (const reportNode of reportNodes) {
      const report: ReportConfig = {
        pptFile: reportNode.$.ppt
      };
      
      if (reportNode.$.iteration) {
        report.iteration = parseInt(reportNode.$.iteration);
      }
      
      reports.push(report);
    }
    
    return reports;
  }

  /**
   * Parse wizard item configurations
   */
  private parseWizardItems(lessonNode: any): WizardItem[] {
    const wizardItems: WizardItem[] = [];
    const wizardNodes = lessonNode.wizard_item || [];
    
    for (const wizardNode of wizardNodes) {
      const wizardItem: WizardItem = {
        id: wizardNode.$.id,
        broadcast: wizardNode.$.broadcast === 'true',
        centerPanel: this.parseCenterPanel(wizardNode.center_panel?.[0]),
        controller: this.parseController(wizardNode.controller?.[0])
      };
      
      wizardItems.push(wizardItem);
    }
    
    return wizardItems;
  }

  /**
   * Parse center panel content
   */
  private parseCenterPanel(panelNode: any): PanelConfig {
    if (!panelNode) {
      return { background: '#ffffff', content: [] };
    }
    
    return {
      background: panelNode.$.background || '#ffffff',
      content: this.parseContentElements(panelNode)
    };
  }

  /**
   * Parse content elements recursively
   */
  private parseContentElements(parentNode: any): ContentElement[] {
    const elements: ContentElement[] = [];
    
    // Handle different content types
    if (parentNode.space) {
      for (const space of parentNode.space) {
        elements.push({
          type: 'space',
          value: space.$.value ? parseInt(space.$.value) : undefined
        });
      }
    }
    
    if (parentNode.subtitle) {
      for (const subtitle of parentNode.subtitle) {
        elements.push({
          type: 'subtitle',
          properties: subtitle.$,
          children: this.parseContentElements(subtitle)
        });
      }
    }
    
    if (parentNode.component) {
      for (const component of parentNode.component) {
        elements.push({
          type: 'component',
          properties: component.$,
          children: this.parseContentElements(component)
        });
      }
    }
    
    // Add more content type parsing as needed...
    
    return elements;
  }

  /**
   * Parse controller configuration
   */
  private parseController(controllerNode: any): ControllerConfig {
    if (!controllerNode) {
      return { background: '#124156ec' };
    }
    
    return {
      background: controllerNode.$.background || '#124156ec',
      next: this.parseNavigationButton(controllerNode.next?.[0]),
      back: this.parseNavigationButton(controllerNode.back?.[0])
    };
  }

  /**
   * Parse navigation button configuration
   */
  private parseNavigationButton(buttonNode: any): NavigationButton | undefined {
    if (!buttonNode) return undefined;
    
    const button: NavigationButton = {
      visible: buttonNode.$.visible === 'true',
      enabled: buttonNode.$.enabled === 'true'
    };
    
    // Parse conditions and commands
    if (buttonNode.switch) {
      button.conditions = this.parseNavigationConditions(buttonNode.switch);
    }
    
    if (buttonNode.command) {
      button.commands = this.parseCommands({ command: buttonNode.command });
    }
    
    if (buttonNode.next_wizard_item) {
      button.nextWizardItem = buttonNode.next_wizard_item[0];
    }
    
    return button;
  }

  /**
   * Parse navigation conditions (switch statements, etc.)
   */
  private parseNavigationConditions(switchNodes: any[]): NavigationCondition[] {
    const conditions: NavigationCondition[] = [];
    
    for (const switchNode of switchNodes) {
      const condition: NavigationCondition = {
        type: 'switch',
        condition: switchNode.$.condition,
        cases: []
      };
      
      if (switchNode.case) {
        for (const caseNode of switchNode.case) {
          condition.cases?.push({
            value: caseNode.$.value,
            nextWizardItem: caseNode.next_wizard_item?.[0]
          });
        }
      }
      
      conditions.push(condition);
    }
    
    return conditions;
  }

  /**
   * Parse admin panel configurations
   */
  private parseAdminPanels(lessonNode: any): string[] {
    const panels: string[] = [];
    const adminNodes = lessonNode.admin || [];
    
    for (const adminNode of adminNodes) {
      if (adminNode.panel) {
        panels.push(...adminNode.panel);
      }
    }
    
    return panels;
  }

  /**
   * Parse auction configurations from navigation commands
   */
  parseAuctionConfig(command: Command): AuctionConfig | null {
    if (command.name !== 'Create Auction') return null;
    
    const params = command.parameters;
    if (params.length < 5) return null;
    
    return {
      privilegeType: params[0] as number,
      available: params[1] as number,
      initialPrice: params[2] as number,
      increment: params[3] as number,
      intervalSeconds: params[4] as number
    };
  }

  /**
   * Parse dynamic security configurations
   */
  parseDynamicSecurities(lessonNode: any): DynamicSecurity[] {
    const securities: DynamicSecurity[] = [];
    const dynamicNodes = lessonNode['dynamic-security-type'] || [];
    
    for (const node of dynamicNodes) {
      securities.push({
        security: parseInt(node.$.security),
        tick: parseInt(node.$.tick),
        type: node.$.type as 'Bond' | 'Equity' | 'Option'
      });
    }
    
    return securities;
  }
}