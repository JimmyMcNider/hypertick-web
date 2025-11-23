/**
 * UI Permissions System
 * 
 * Controls which trading windows and features are visible to students
 * based on lesson configuration and privilege settings.
 */

import { MarketConfiguration, getMarketConfig, isFeatureEnabled, isWindowAllowed } from './market-config';
import { getPrivilegeByCode, PRIVILEGE_DEFINITIONS } from './privilege-definitions';

export interface UIPermissions {
  // Core Trading Windows
  canSeeMarketOrderWindow: boolean;      // Privilege 8
  canSeeMontage: boolean;                // Privilege 9
  canSeePortfolioWindow: boolean;        // Privilege 13
  canSeeMarketWatch: boolean;            // Privilege 15
  canSeeOrderLog: boolean;               // Privilege 12
  canSeeTradeWindow: boolean;            // Privilege 10
  canSeeSecurityGraph: boolean;          // Privilege 18
  
  // Order Types
  canPlaceMarketOrders: boolean;
  canPlaceLimitOrders: boolean;
  canPlaceStopOrders: boolean;
  canPlaceStopLimitOrders: boolean;
  
  // Advanced Features
  canSeeAnalystWindow: boolean;          // Privilege 1
  canSeeBuyingPowerWindow: boolean;      // Privilege 4
  canSeeEventWindow: boolean;            // Privilege 5
  canSeeNewsWindow: boolean;             // Privilege 11
  canSeeBumpButtons: boolean;            // Privilege 29
  canSeeAutoTrading: boolean;            // Privilege 31
  
  // Market Data Complexity
  showBasicMarketData: boolean;
  showAdvancedMarketData: boolean;
  showOrderBookDepth: boolean;
  showRecentTrades: boolean;
  
  // Analytics Level
  analyticsLevel: 'BASIC' | 'INTERMEDIATE' | 'ADVANCED';
  
  // UI Customization
  allowDarkMode: boolean;
  allowWindowArrangement: boolean;
  allowAdvancedCharts: boolean;
  
  // Lesson Context
  lessonName: string;
  complexity: string;
  availableSecurities: string[];
  maxOrderValue: number;
  maxPositionSize: number;
}

/**
 * Get UI permissions for a student based on lesson configuration and privileges
 */
export function getUIPermissions(
  lessonName: string, 
  privileges: number[] = []
): UIPermissions {
  const config = getMarketConfig(lessonName);
  
  // Helper function to check if privilege is granted
  const hasPrivilege = (privilegeCode: number): boolean => {
    return privileges.includes(privilegeCode);
  };
  
  // Helper function to check if window is allowed in lesson
  const windowAllowed = (privilegeCode: number): boolean => {
    return isWindowAllowed(config, privilegeCode);
  };
  
  // Core Trading Windows (require both privilege and lesson permission)
  const canSeeMarketOrderWindow = hasPrivilege(8) && windowAllowed(8);
  const canSeeMontage = hasPrivilege(9) && windowAllowed(9);
  const canSeePortfolioWindow = hasPrivilege(13) && windowAllowed(13);
  const canSeeMarketWatch = hasPrivilege(15) && windowAllowed(15);
  const canSeeOrderLog = hasPrivilege(12) && windowAllowed(12);
  const canSeeTradeWindow = hasPrivilege(10) && windowAllowed(10);
  const canSeeSecurityGraph = hasPrivilege(18) && windowAllowed(18);
  
  // Order Types (based on lesson configuration)
  const canPlaceMarketOrders = config.orderTypes.market;
  const canPlaceLimitOrders = config.orderTypes.limit;
  const canPlaceStopOrders = config.orderTypes.stop;
  const canPlaceStopLimitOrders = config.orderTypes.stopLimit;
  
  // Advanced Features
  const canSeeAnalystWindow = hasPrivilege(1) && windowAllowed(1);
  const canSeeBuyingPowerWindow = hasPrivilege(4) && windowAllowed(4);
  const canSeeEventWindow = hasPrivilege(5) && windowAllowed(5);
  const canSeeNewsWindow = hasPrivilege(11) && windowAllowed(11);
  const canSeeBumpButtons = hasPrivilege(29) && windowAllowed(29);
  const canSeeAutoTrading = hasPrivilege(31) && windowAllowed(31);
  
  // Market Data Complexity
  const showBasicMarketData = true; // Always show basic price data
  const showAdvancedMarketData = config.complexity !== 'BASIC';
  const showOrderBookDepth = canSeeMontage && config.liquidity.enabled;
  const showRecentTrades = config.complexity !== 'BASIC';
  
  // UI Customization (unlock as complexity increases)
  const allowDarkMode = config.complexity !== 'BASIC';
  const allowWindowArrangement = config.complexity === 'ADVANCED' || config.complexity === 'PROFESSIONAL';
  const allowAdvancedCharts = canSeeSecurityGraph && config.complexity !== 'BASIC';
  
  return {
    // Core Trading Windows
    canSeeMarketOrderWindow,
    canSeeMontage,
    canSeePortfolioWindow,
    canSeeMarketWatch,
    canSeeOrderLog,
    canSeeTradeWindow,
    canSeeSecurityGraph,
    
    // Order Types
    canPlaceMarketOrders,
    canPlaceLimitOrders,
    canPlaceStopOrders,
    canPlaceStopLimitOrders,
    
    // Advanced Features
    canSeeAnalystWindow,
    canSeeBuyingPowerWindow,
    canSeeEventWindow,
    canSeeNewsWindow,
    canSeeBumpButtons,
    canSeeAutoTrading,
    
    // Market Data
    showBasicMarketData,
    showAdvancedMarketData,
    showOrderBookDepth,
    showRecentTrades,
    
    // Analytics
    analyticsLevel: config.restrictions.analytics,
    
    // UI Customization
    allowDarkMode,
    allowWindowArrangement,
    allowAdvancedCharts,
    
    // Lesson Context
    lessonName: config.lessonName,
    complexity: config.complexity,
    availableSecurities: config.securities.filter(s => s.enabled).map(s => s.symbol),
    maxOrderValue: config.restrictions.maxOrderValue,
    maxPositionSize: config.restrictions.maxPositionSize
  };
}

/**
 * Get visible trading windows based on UI permissions
 */
export function getVisibleWindows(permissions: UIPermissions): Array<{
  id: string;
  name: string;
  category: string;
  required: boolean;
  enabled: boolean;
}> {
  const windows = [
    {
      id: 'market-order',
      name: 'Market Order Window',
      category: 'trading',
      required: true,
      enabled: permissions.canSeeMarketOrderWindow
    },
    {
      id: 'portfolio',
      name: 'Portfolio Window',
      category: 'trading',
      required: true,
      enabled: permissions.canSeePortfolioWindow
    },
    {
      id: 'market-watch',
      name: 'Market Watch',
      category: 'market_data',
      required: false,
      enabled: permissions.canSeeMarketWatch
    },
    {
      id: 'montage',
      name: 'Montage (Level II)',
      category: 'market_data',
      required: false,
      enabled: permissions.canSeeMontage
    },
    {
      id: 'trade-window',
      name: 'Trade Confirmations',
      category: 'trading',
      required: false,
      enabled: permissions.canSeeTradeWindow
    },
    {
      id: 'order-log',
      name: 'Order History',
      category: 'trading',
      required: false,
      enabled: permissions.canSeeOrderLog
    },
    {
      id: 'security-graph',
      name: 'Price Chart',
      category: 'analysis',
      required: false,
      enabled: permissions.canSeeSecurityGraph
    },
    {
      id: 'analyst',
      name: 'Analyst Tools',
      category: 'analysis',
      required: false,
      enabled: permissions.canSeeAnalystWindow
    },
    {
      id: 'buying-power',
      name: 'Buying Power',
      category: 'trading',
      required: false,
      enabled: permissions.canSeeBuyingPowerWindow
    },
    {
      id: 'event-window',
      name: 'Market Events',
      category: 'market_data',
      required: false,
      enabled: permissions.canSeeEventWindow
    },
    {
      id: 'news',
      name: 'News Feed',
      category: 'market_data',
      required: false,
      enabled: permissions.canSeeNewsWindow
    },
    {
      id: 'bump-buttons',
      name: 'Quick Order Controls',
      category: 'trading',
      required: false,
      enabled: permissions.canSeeBumpButtons
    },
    {
      id: 'auto-trading',
      name: 'Automated Trading',
      category: 'trading',
      required: false,
      enabled: permissions.canSeeAutoTrading
    }
  ];
  
  return windows.filter(w => w.enabled);
}

/**
 * Get order type restrictions for the UI
 */
export function getOrderTypeRestrictions(permissions: UIPermissions): {
  allowedTypes: string[];
  defaultType: string;
  showAdvancedOptions: boolean;
} {
  const allowedTypes: string[] = [];
  
  if (permissions.canPlaceMarketOrders) {
    allowedTypes.push('MARKET');
  }
  
  if (permissions.canPlaceLimitOrders) {
    allowedTypes.push('LIMIT');
  }
  
  if (permissions.canPlaceStopOrders) {
    allowedTypes.push('STOP');
  }
  
  if (permissions.canPlaceStopLimitOrders) {
    allowedTypes.push('STOP_LIMIT');
  }
  
  // Default to simplest available order type
  const defaultType = allowedTypes.includes('MARKET') ? 'MARKET' : allowedTypes[0] || 'MARKET';
  
  // Show advanced options for intermediate+ lessons
  const showAdvancedOptions = permissions.analyticsLevel !== 'BASIC';
  
  return {
    allowedTypes,
    defaultType,
    showAdvancedOptions
  };
}

/**
 * Get UI theme options based on lesson complexity
 */
export function getThemeOptions(permissions: UIPermissions): {
  allowDarkMode: boolean;
  allowCustomColors: boolean;
  allowWindowRearrangement: boolean;
  defaultTheme: 'light' | 'dark';
} {
  return {
    allowDarkMode: permissions.allowDarkMode,
    allowCustomColors: permissions.complexity !== 'BASIC',
    allowWindowRearrangement: permissions.allowWindowArrangement,
    defaultTheme: 'light'
  };
}

/**
 * Get security selection restrictions
 */
export function getSecurityRestrictions(permissions: UIPermissions): {
  availableSecurities: Array<{symbol: string; name: string}>;
  defaultSecurity: string;
  maxOrderValue: number;
  maxPositionSize: number;
} {
  // Map symbols to full names (should ideally come from market config)
  const securityNames: Record<string, string> = {
    'VCR': 'Value Corporation',
    'PNR': 'Premium Industries',
    'UGM': 'United Growth Media'
  };
  
  const availableSecurities = permissions.availableSecurities.map(symbol => ({
    symbol,
    name: securityNames[symbol] || symbol
  }));
  
  return {
    availableSecurities,
    defaultSecurity: availableSecurities[0]?.symbol || 'VCR',
    maxOrderValue: permissions.maxOrderValue,
    maxPositionSize: permissions.maxPositionSize
  };
}

/**
 * Validate if user action is allowed based on permissions
 */
export function validateUserAction(
  permissions: UIPermissions,
  action: {
    type: 'PLACE_ORDER' | 'VIEW_WINDOW' | 'CHANGE_THEME';
    orderType?: string;
    windowId?: string;
    orderValue?: number;
  }
): { allowed: boolean; reason?: string } {
  switch (action.type) {
    case 'PLACE_ORDER':
      if (action.orderType === 'LIMIT' && !permissions.canPlaceLimitOrders) {
        return { allowed: false, reason: 'Limit orders not enabled in this lesson' };
      }
      if (action.orderType === 'STOP' && !permissions.canPlaceStopOrders) {
        return { allowed: false, reason: 'Stop orders not enabled in this lesson' };
      }
      if (action.orderValue && action.orderValue > permissions.maxOrderValue) {
        return { allowed: false, reason: `Order value exceeds lesson limit of $${permissions.maxOrderValue.toLocaleString()}` };
      }
      break;
      
    case 'VIEW_WINDOW':
      const windows = getVisibleWindows(permissions);
      const windowAllowed = windows.some(w => w.id === action.windowId && w.enabled);
      if (!windowAllowed) {
        return { allowed: false, reason: 'Window not available in this lesson' };
      }
      break;
      
    case 'CHANGE_THEME':
      if (!permissions.allowDarkMode) {
        return { allowed: false, reason: 'Theme customization unlocked in advanced lessons' };
      }
      break;
  }
  
  return { allowed: true };
}