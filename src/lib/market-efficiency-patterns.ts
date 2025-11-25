/**
 * Market Efficiency Lesson - Liquidity Patterns
 *
 * Implements the specific liquidity trading patterns required for
 * Market Efficiency simulations A, B, and C from the legacy upTick lesson.
 */

export type LiquidityPattern = 'SAWTOOTH' | 'MOMENTUM' | 'DEEP_MOMENTUM';

export interface PatternTradeConfig {
  tick: number; // When this trade should execute
  side: 'BUY' | 'SELL';
  quantity: number;
  priceOffset?: number; // Offset from current price (cents)
}

/**
 * Simulation A Pattern: Saw-Tooth
 *
 * Creates predictable oscillating price pattern that students should
 * eliminate through informed trading. Pattern repeats every 20 ticks.
 */
export class SawtoothPattern {
  private tickCounter = 0;
  private cycleLength = 20;

  /**
   * Generate buy/sell pattern for current tick
   * Oscillates: 10 ticks buying, 10 ticks selling
   */
  getTradeForTick(tick: number): PatternTradeConfig | null {
    const position = tick % this.cycleLength;

    if (position < 10) {
      // First half: Persistent buying creates upward pressure
      return {
        tick,
        side: 'BUY',
        quantity: 100,
        priceOffset: 1 // Buy 1 cent above current price
      };
    } else {
      // Second half: Persistent selling creates downward pressure
      return {
        tick,
        side: 'SELL',
        quantity: 100,
        priceOffset: -1 // Sell 1 cent below current price
      };
    }
  }

  /**
   * Reset pattern (called when simulation restarts)
   */
  reset() {
    this.tickCounter = 0;
  }
}

/**
 * Simulation B Pattern: Persistent Momentum
 *
 * Constant upward price pressure. Students should identify
 * the momentum and ride it until price stabilizes at par ($100).
 */
export class MomentumPattern {
  private targetPrice = 100.00;
  private initialPrice = 95.00;

  /**
   * Generate persistent buy pressure until target reached
   */
  getTradeForTick(tick: number, currentPrice: number): PatternTradeConfig | null {
    // If price hasn't reached target, continue buying
    if (currentPrice < this.targetPrice) {
      const intensity = Math.max(1, Math.floor((this.targetPrice - currentPrice) * 10));
      return {
        tick,
        side: 'BUY',
        quantity: 50 + intensity,
        priceOffset: 1
      };
    }

    // Once target reached, light two-sided activity to maintain
    if (tick % 2 === 0) {
      return {
        tick,
        side: 'BUY',
        quantity: 25,
        priceOffset: 0
      };
    } else {
      return {
        tick,
        side: 'SELL',
        quantity: 25,
        priceOffset: 0
      };
    }
  }

  reset(initialPrice: number = 95.00) {
    this.initialPrice = initialPrice;
  }
}

/**
 * Simulation C Pattern: Deep Momentum
 *
 * Identical to Simulation B but with significantly higher market depth.
 * Same directional pressure but larger order sizes allow for advanced
 * strategies including destabilizing speculation.
 */
export class DeepMomentumPattern {
  private targetPrice = 100.00;
  private initialPrice = 95.00;
  private depthMultiplier = 5; // 5x larger orders than Sim B

  /**
   * Generate deep persistent buy pressure
   */
  getTradeForTick(tick: number, currentPrice: number): PatternTradeConfig | null {
    // If price hasn't reached target, continue buying
    if (currentPrice < this.targetPrice) {
      const intensity = Math.max(1, Math.floor((this.targetPrice - currentPrice) * 10));
      return {
        tick,
        side: 'BUY',
        quantity: (50 + intensity) * this.depthMultiplier,
        priceOffset: 1
      };
    }

    // Once target reached, deeper two-sided market
    if (tick % 2 === 0) {
      return {
        tick,
        side: 'BUY',
        quantity: 25 * this.depthMultiplier,
        priceOffset: 0
      };
    } else {
      return {
        tick,
        side: 'SELL',
        quantity: 25 * this.depthMultiplier,
        priceOffset: 0
      };
    }
  }

  reset(initialPrice: number = 95.00) {
    this.initialPrice = initialPrice;
  }
}

/**
 * Factory to create appropriate pattern for Market Efficiency simulation
 */
export function createMarketEfficiencyPattern(scenario: string): SawtoothPattern | MomentumPattern | DeepMomentumPattern {
  switch (scenario) {
    case 'Simulation A':
    case 'A':
      return new SawtoothPattern();

    case 'Simulation B':
    case 'B':
      return new MomentumPattern();

    case 'Simulation C':
    case 'C':
      return new DeepMomentumPattern();

    default:
      throw new Error(`Unknown Market Efficiency scenario: ${scenario}`);
  }
}
