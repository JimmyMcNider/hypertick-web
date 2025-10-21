/**
 * Privilege System Definitions
 * 
 * This file defines all 35+ privilege codes from the legacy upTick system
 * Each privilege controls access to specific trading features and windows
 */

export interface PrivilegeDefinition {
  code: number;
  name: string;
  description: string;
  category: 'trading' | 'market_data' | 'analysis' | 'admin' | 'utility';
  component?: string; // React component name for the feature
}

export const PRIVILEGE_DEFINITIONS: PrivilegeDefinition[] = [
  // Core Trading Windows
  {
    code: 1,
    name: 'Analyst Window',
    description: 'Access to market analysis tools and indicators',
    category: 'analysis',
    component: 'AnalystWindow'
  },
  {
    code: 4,
    name: 'Buying Power Window', 
    description: 'Real-time display of available purchasing power',
    category: 'trading',
    component: 'BuyingPowerWindow'
  },
  {
    code: 5,
    name: 'Event Window',
    description: 'Market events, news, and announcements',
    category: 'market_data',
    component: 'EventWindow'
  },
  {
    code: 8,
    name: 'Market Order Window',
    description: 'Order entry interface for market and limit orders',
    category: 'trading',
    component: 'MarketOrderWindow'
  },
  {
    code: 9,
    name: 'Montage',
    description: 'Level II market data display with order book depth',
    category: 'market_data',
    component: 'MontageWindow'
  },
  {
    code: 10,
    name: 'Trade Window',
    description: 'Trade execution confirmations and fills',
    category: 'trading',
    component: 'TradeWindow'
  },
  {
    code: 11,
    name: 'News Window',
    description: 'Real-time market news and information feed',
    category: 'market_data',
    component: 'NewsWindow'
  },
  {
    code: 12,
    name: 'Order Log Window',
    description: 'Complete history of all orders placed',
    category: 'trading',
    component: 'OrderLogWindow'
  },
  {
    code: 13,
    name: 'Portfolio Window',
    description: 'Position tracking and P&L display',
    category: 'trading',
    component: 'PortfolioWindow'
  },
  {
    code: 15,
    name: 'Market Watch Window',
    description: 'Real-time price monitoring for multiple securities',
    category: 'market_data',
    component: 'MarketWatchWindow'
  },
  {
    code: 18,
    name: 'Single Security Graph',
    description: 'Price charting and technical analysis for individual securities',
    category: 'analysis',
    component: 'SecurityGraphWindow'
  },

  // Advanced Trading Features
  {
    code: 22,
    name: 'Market Making Rights',
    description: 'Ability to place limit orders and provide liquidity',
    category: 'trading'
  },
  {
    code: 23,
    name: 'Premium Analyst Signals',
    description: 'Access to purchase advanced market analysis signals',
    category: 'analysis'
  },
  {
    code: 29,
    name: 'Bump Buttons',
    description: 'Quick price adjustment controls for rapid order modification',
    category: 'trading',
    component: 'BumpButtonsWindow'
  },
  {
    code: 31,
    name: 'Auto-Trading Window',
    description: 'Automated trading algorithm controls and monitoring',
    category: 'trading',
    component: 'AutoTradingWindow'
  },
  {
    code: 32,
    name: 'Auction Window',
    description: 'Bidding interface for market-making rights auctions',
    category: 'admin',
    component: 'AuctionWindow'
  },
  {
    code: 33,
    name: 'Lesson Window',
    description: 'Educational content and lesson progression interface',
    category: 'utility',
    component: 'LessonWindow'
  },
  {
    code: 34,
    name: 'Excel Link',
    description: 'Data integration with Excel for import/export operations',
    category: 'utility',
    component: 'ExcelLinkWindow'
  },

  // Additional privilege codes found in XML configurations
  {
    code: 2,
    name: 'Advanced Analytics',
    description: 'Access to advanced market analytics and statistics',
    category: 'analysis'
  },
  {
    code: 3,
    name: 'Risk Management',
    description: 'Portfolio risk monitoring and controls',
    category: 'trading'
  },
  {
    code: 6,
    name: 'Market Maker Controls',
    description: 'Special controls for market making activities',
    category: 'trading'
  },
  {
    code: 7,
    name: 'Historical Data',
    description: 'Access to historical price and volume data',
    category: 'market_data'
  },
  {
    code: 14,
    name: 'Position Manager',
    description: 'Advanced position management and hedging tools',
    category: 'trading'
  },
  {
    code: 16,
    name: 'Options Chain',
    description: 'Options pricing and Greeks display',
    category: 'market_data'
  },
  {
    code: 17,
    name: 'Futures Data',
    description: 'Futures market data and analytics',
    category: 'market_data'
  },
  {
    code: 19,
    name: 'Multi-Chart Display',
    description: 'Multiple security charts in single view',
    category: 'analysis'
  },
  {
    code: 20,
    name: 'Technical Indicators',
    description: 'Advanced technical analysis indicators',
    category: 'analysis'
  },
  {
    code: 21,
    name: 'Backtesting',
    description: 'Strategy backtesting and optimization tools',
    category: 'analysis'
  },
  {
    code: 24,
    name: 'Spread Trading',
    description: 'Multi-leg spread order entry and management',
    category: 'trading'
  },
  {
    code: 25,
    name: 'Block Trading',
    description: 'Large block order handling and iceberg orders',
    category: 'trading'
  },
  {
    code: 26,
    name: 'Algorithmic Orders',
    description: 'TWAP, VWAP, and other algorithmic order types',
    category: 'trading'
  },
  {
    code: 27,
    name: 'Dark Pool Access',
    description: 'Access to dark liquidity pools',
    category: 'trading'
  },
  {
    code: 28,
    name: 'Cross Trading',
    description: 'Cross-market arbitrage and trading opportunities',
    category: 'trading'
  },
  {
    code: 30,
    name: 'Compliance Monitor',
    description: 'Real-time compliance and regulatory monitoring',
    category: 'admin'
  },
  {
    code: 35,
    name: 'Instructor Controls',
    description: 'Administrative controls for instructors',
    category: 'admin'
  }
];

export const PRIVILEGE_CATEGORIES = {
  trading: 'Trading & Orders',
  market_data: 'Market Data',
  analysis: 'Analysis & Research',
  admin: 'Administration',
  utility: 'Utilities'
} as const;

// Helper functions for privilege management
export function getPrivilegeByCode(code: number): PrivilegeDefinition | undefined {
  return PRIVILEGE_DEFINITIONS.find(p => p.code === code);
}

export function getPrivilegesByCategory(category: string): PrivilegeDefinition[] {
  return PRIVILEGE_DEFINITIONS.filter(p => p.category === category);
}

export function getPrivilegesWithComponents(): PrivilegeDefinition[] {
  return PRIVILEGE_DEFINITIONS.filter(p => p.component);
}

// Group privileges for role-based assignment
export const ROLE_PRIVILEGE_PRESETS = {
  student_basic: [1, 4, 5, 11, 13, 15, 33], // Basic student privileges
  student_advanced: [1, 4, 5, 8, 9, 10, 11, 12, 13, 15, 18, 33], // Advanced student
  market_maker: [1, 4, 5, 8, 9, 10, 11, 12, 13, 15, 18, 22, 29, 33], // Market making rights
  speculator: [1, 4, 5, 8, 11, 12, 13, 15, 18, 23, 33], // Information trading
  instructor: [1, 4, 5, 8, 9, 10, 11, 12, 13, 15, 18, 22, 23, 29, 30, 32, 33, 34, 35] // Full access
} as const;