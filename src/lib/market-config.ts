/**
 * Market Configuration System
 * 
 * Controls market complexity and feature availability based on lesson progression.
 * Implements the sandbox approach where simple lessons have basic features,
 * and advanced lessons unlock sophisticated trading tools.
 */

export type MarketComplexity = 'BASIC' | 'INTERMEDIATE' | 'ADVANCED' | 'PROFESSIONAL';

export interface SecurityConfig {
  symbol: string;
  name: string;
  enabled: boolean;
  startingPrice: number;
  volatility: number;
  derivatives: boolean; // Options, futures available
  minOrderSize: number;
  maxOrderSize: number;
}

export interface OrderTypeConfig {
  market: boolean;
  limit: boolean;
  stop: boolean;
  stopLimit: boolean;
  iceberg: boolean;
  fill_or_kill: boolean;
  immediate_or_cancel: boolean;
}

export interface LiquidityConfig {
  enabled: boolean;
  strategies: ('MARKET_MAKER' | 'MOMENTUM' | 'MEAN_REVERT')[];
  delay: number; // seconds between trades
  intensity: number; // 0-1, how aggressive
  spreads: {
    tight: number; // percentage
    normal: number;
    wide: number;
  };
}

export interface MarketMechanicsConfig {
  priceDiscovery: 'FIXED' | 'AUCTION' | 'CONTINUOUS';
  tickSize: number;
  halts: boolean; // Can trading be halted
  afterHours: boolean;
  marginTrading: boolean;
  shortSelling: boolean;
  partialFills: boolean;
}

export interface InstructorControlsConfig {
  canPauseMarket: boolean;
  canAdjustVolatility: boolean;
  canTriggerEvents: boolean;
  canModifyOrders: boolean;
  canViewAllPositions: boolean;
  realTimeMonitoring: boolean;
  scenarioControl: boolean;
}

export interface MarketConfiguration {
  lessonId: string;
  lessonName: string;
  complexity: MarketComplexity;
  
  // Available securities
  securities: SecurityConfig[];
  
  // Order types permitted
  orderTypes: OrderTypeConfig;
  
  // Automated trading
  liquidity: LiquidityConfig;
  
  // Market structure
  mechanics: MarketMechanicsConfig;
  
  // Instructor capabilities
  instructorControls: InstructorControlsConfig;
  
  // Feature restrictions
  restrictions: {
    maxPositionSize: number;
    maxOrderValue: number;
    tradingWindows: number[]; // privilege codes allowed
    analytics: 'BASIC' | 'INTERMEDIATE' | 'ADVANCED';
  };
  
  // Learning objectives
  objectives: string[];
  prerequisites: string[];
}

/**
 * Predefined market configurations for different lesson types
 */
export const MARKET_CONFIGURATIONS: Record<string, MarketConfiguration> = {
  // Basic Price Formation Lesson
  PRICE_FORMATION_BASIC: {
    lessonId: 'price_formation',
    lessonName: 'Price Formation Basics',
    complexity: 'BASIC',
    
    securities: [
      {
        symbol: 'VCR',
        name: 'Value Corporation',
        enabled: true,
        startingPrice: 50.00,
        volatility: 0.02,
        derivatives: false,
        minOrderSize: 10,
        maxOrderSize: 1000
      }
    ],
    
    orderTypes: {
      market: true,
      limit: false,
      stop: false,
      stopLimit: false,
      iceberg: false,
      fill_or_kill: false,
      immediate_or_cancel: false
    },
    
    liquidity: {
      enabled: false, // No bots initially - students see pure price formation
      strategies: [],
      delay: 8,
      intensity: 0.3,
      spreads: { tight: 0.01, normal: 0.02, wide: 0.04 }
    },
    
    mechanics: {
      priceDiscovery: 'AUCTION',
      tickSize: 0.01,
      halts: false,
      afterHours: false,
      marginTrading: false,
      shortSelling: false,
      partialFills: false
    },
    
    instructorControls: {
      canPauseMarket: true,
      canAdjustVolatility: false,
      canTriggerEvents: false,
      canModifyOrders: false,
      canViewAllPositions: true,
      realTimeMonitoring: true,
      scenarioControl: true
    },
    
    restrictions: {
      maxPositionSize: 500,
      maxOrderValue: 25000,
      tradingWindows: [8, 13], // Market Order Window, Portfolio Window only
      analytics: 'BASIC'
    },
    
    objectives: [
      'Understand bid-ask spread concept',
      'Experience price discovery through trading',
      'Learn market vs limit order difference'
    ],
    prerequisites: []
  },

  // Intermediate Market Efficiency Lesson  
  MARKET_EFFICIENCY: {
    lessonId: 'market_efficiency',
    lessonName: 'Market Efficiency',
    complexity: 'INTERMEDIATE',
    
    securities: [
      {
        symbol: 'VCR',
        name: 'Value Corporation',
        enabled: true,
        startingPrice: 50.00,
        volatility: 0.03,
        derivatives: false,
        minOrderSize: 10,
        maxOrderSize: 2000
      },
      {
        symbol: 'PNR',
        name: 'Premium Industries', 
        enabled: true,
        startingPrice: 75.00,
        volatility: 0.025,
        derivatives: false,
        minOrderSize: 10,
        maxOrderSize: 2000
      }
    ],
    
    orderTypes: {
      market: true,
      limit: true,
      stop: false,
      stopLimit: false,
      iceberg: false,
      fill_or_kill: false,
      immediate_or_cancel: false
    },
    
    liquidity: {
      enabled: true,
      strategies: ['MARKET_MAKER'],
      delay: 8,
      intensity: 0.5,
      spreads: { tight: 0.01, normal: 0.02, wide: 0.03 }
    },
    
    mechanics: {
      priceDiscovery: 'CONTINUOUS',
      tickSize: 0.01,
      halts: true,
      afterHours: false,
      marginTrading: false,
      shortSelling: false,
      partialFills: true
    },
    
    instructorControls: {
      canPauseMarket: true,
      canAdjustVolatility: true,
      canTriggerEvents: true,
      canModifyOrders: false,
      canViewAllPositions: true,
      realTimeMonitoring: true,
      scenarioControl: true
    },
    
    restrictions: {
      maxPositionSize: 1000,
      maxOrderValue: 75000,
      tradingWindows: [8, 9, 13, 15, 18], // Market Order, Montage, Portfolio, Market Watch, Security Graph
      analytics: 'INTERMEDIATE'
    },
    
    objectives: [
      'Identify arbitrage opportunities',
      'Understand market efficiency principles',
      'Practice with limit orders and market depth'
    ],
    prerequisites: ['price_formation']
  },

  // Advanced Options Pricing Lesson
  OPTIONS_PRICING: {
    lessonId: 'options_pricing',
    lessonName: 'Options Pricing & Risk Management',
    complexity: 'ADVANCED',
    
    securities: [
      {
        symbol: 'VCR',
        name: 'Value Corporation',
        enabled: true,
        startingPrice: 50.00,
        volatility: 0.04,
        derivatives: true,
        minOrderSize: 1,
        maxOrderSize: 5000
      },
      {
        symbol: 'PNR',
        name: 'Premium Industries',
        enabled: true,
        startingPrice: 75.00,
        volatility: 0.035,
        derivatives: true,
        minOrderSize: 1,
        maxOrderSize: 5000
      }
    ],
    
    orderTypes: {
      market: true,
      limit: true,
      stop: true,
      stopLimit: true,
      iceberg: false,
      fill_or_kill: true,
      immediate_or_cancel: true
    },
    
    liquidity: {
      enabled: true,
      strategies: ['MARKET_MAKER', 'MOMENTUM'],
      delay: 4,
      intensity: 0.7,
      spreads: { tight: 0.005, normal: 0.015, wide: 0.025 }
    },
    
    mechanics: {
      priceDiscovery: 'CONTINUOUS',
      tickSize: 0.01,
      halts: true,
      afterHours: false,
      marginTrading: true,
      shortSelling: true,
      partialFills: true
    },
    
    instructorControls: {
      canPauseMarket: true,
      canAdjustVolatility: true,
      canTriggerEvents: true,
      canModifyOrders: true,
      canViewAllPositions: true,
      realTimeMonitoring: true,
      scenarioControl: true
    },
    
    restrictions: {
      maxPositionSize: 10000,
      maxOrderValue: 500000,
      tradingWindows: [1, 4, 8, 9, 10, 11, 12, 13, 15, 18, 32], // Most windows unlocked
      analytics: 'ADVANCED'
    },
    
    objectives: [
      'Understand options pricing models',
      'Manage portfolio Greeks (delta, gamma, theta)',
      'Execute complex multi-leg strategies'
    ],
    prerequisites: ['market_efficiency', 'price_formation']
  }
};

/**
 * Get market configuration for a lesson
 */
export function getMarketConfig(lessonId: string): MarketConfiguration {
  // Try to find exact match first
  const exactMatch = Object.values(MARKET_CONFIGURATIONS).find(config => config.lessonId === lessonId);
  if (exactMatch) return exactMatch;
  
  // Map common lesson names to configurations
  const lessonMappings: Record<string, string> = {
    'Price Formation': 'PRICE_FORMATION_BASIC',
    'Market Efficiency': 'MARKET_EFFICIENCY', 
    'Market Efficiency II': 'MARKET_EFFICIENCY',
    'Option Pricing': 'OPTIONS_PRICING',
    'Law of One Price': 'MARKET_EFFICIENCY',
    'Merger Arbitrage': 'OPTIONS_PRICING',
    'Event Arbitrage': 'OPTIONS_PRICING',
    'Convertible Arbitrage': 'OPTIONS_PRICING'
  };
  
  const mappedConfig = lessonMappings[lessonId];
  if (mappedConfig && MARKET_CONFIGURATIONS[mappedConfig]) {
    return MARKET_CONFIGURATIONS[mappedConfig];
  }
  
  // Default to basic configuration
  return MARKET_CONFIGURATIONS.PRICE_FORMATION_BASIC;
}

/**
 * Check if a feature is available in current market configuration
 */
export function isFeatureEnabled(config: MarketConfiguration, feature: string): boolean {
  switch (feature) {
    case 'limit_orders':
      return config.orderTypes.limit;
    case 'stop_orders':
      return config.orderTypes.stop;
    case 'liquidity_bots':
      return config.liquidity.enabled;
    case 'market_halts':
      return config.mechanics.halts;
    case 'short_selling':
      return config.mechanics.shortSelling;
    case 'derivatives':
      return config.securities.some(s => s.derivatives);
    case 'real_time_monitoring':
      return config.instructorControls.realTimeMonitoring;
    case 'volatility_control':
      return config.instructorControls.canAdjustVolatility;
    default:
      return false;
  }
}

/**
 * Check if a trading window (privilege) is allowed
 */
export function isWindowAllowed(config: MarketConfiguration, privilege: number): boolean {
  return config.restrictions.tradingWindows.includes(privilege);
}

/**
 * Get complexity level for UI adaptation
 */
export function getUIComplexity(config: MarketConfiguration): 'BASIC' | 'INTERMEDIATE' | 'ADVANCED' {
  return config.restrictions.analytics;
}

/**
 * Validate order against market configuration
 */
export function validateOrder(config: MarketConfiguration, order: {
  type: string;
  quantity: number;
  value: number;
  symbol: string;
}): { valid: boolean; reason?: string } {
  // Check if security is enabled
  const security = config.securities.find(s => s.symbol === order.symbol);
  if (!security || !security.enabled) {
    return { valid: false, reason: 'Security not available in this lesson' };
  }
  
  // Check order type permission
  if (order.type === 'LIMIT' && !config.orderTypes.limit) {
    return { valid: false, reason: 'Limit orders not enabled in this lesson' };
  }
  
  if (order.type === 'STOP' && !config.orderTypes.stop) {
    return { valid: false, reason: 'Stop orders not enabled in this lesson' };
  }
  
  // Check size limits
  if (order.quantity < security.minOrderSize) {
    return { valid: false, reason: `Minimum order size is ${security.minOrderSize}` };
  }
  
  if (order.quantity > security.maxOrderSize) {
    return { valid: false, reason: `Maximum order size is ${security.maxOrderSize}` };
  }
  
  // Check value limits
  if (order.value > config.restrictions.maxOrderValue) {
    return { valid: false, reason: `Order value exceeds limit of $${config.restrictions.maxOrderValue.toLocaleString()}` };
  }
  
  return { valid: true };
}

/**
 * Get lesson progression requirements
 */
export function getProgressionRequirements(lessonId: string): {
  prerequisites: string[];
  objectives: string[];
  complexity: MarketComplexity;
} {
  const config = getMarketConfig(lessonId);
  return {
    prerequisites: config.prerequisites,
    objectives: config.objectives,
    complexity: config.complexity
  };
}