/**
 * Market Efficiency Test API
 *
 * Simplified endpoint for testing Market Efficiency lesson flow.
 * This bypasses the full wizard/UI flow for rapid testing.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getMarketEngine } from '@/lib/market-engine';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, scenario, tick } = body;

    const marketEngine = getMarketEngine('Market Efficiency');

    switch (action) {
      case 'initialize':
        // Initialize pattern for specified scenario (A, B, or C)
        const sim = scenario || 'A';
        marketEngine.initializeMarketEfficiencyPattern(`Simulation ${sim}`, 95.00);

        return NextResponse.json({
          success: true,
          message: `Market Efficiency Simulation ${sim} initialized`,
          currentTick: 0,
          pattern: sim === 'A' ? 'Sawtooth' : (sim === 'B' ? 'Momentum' : 'Deep Momentum')
        });

      case 'tick':
        // Advance by one tick
        marketEngine.advanceTick();
        const currentTick = marketEngine.getCurrentTick();

        // Get current market state
        const marketData = marketEngine.getMarketData();
        const orderBook = marketEngine.getOrderBook();

        return NextResponse.json({
          success: true,
          tick: currentTick,
          marketData,
          orderBook
        });

      case 'advance':
        // Advance by multiple ticks
        const ticks = tick || 1;
        const results = [];

        for (let i = 0; i < ticks; i++) {
          marketEngine.advanceTick();
          results.push({
            tick: marketEngine.getCurrentTick(),
            price: marketEngine.getMarketData()[0]?.currentPrice
          });
        }

        return NextResponse.json({
          success: true,
          results,
          finalTick: marketEngine.getCurrentTick()
        });

      case 'place_order':
        // Place a student order
        const { userId, side, quantity, price, type } = body;

        const order = marketEngine.placeOrder({
          userId: userId || 'test_student',
          symbol: 'BOND_6M',
          side: side || 'BUY',
          quantity: quantity || 100,
          price,
          type: type || 'MARKET'
        });

        return NextResponse.json({
          success: true,
          order,
          message: `Order placed: ${side} ${quantity} @ ${price || 'MKT'}`
        });

      case 'reset':
        // Reset the pattern
        marketEngine.resetMarketEfficiencyPattern();

        return NextResponse.json({
          success: true,
          message: 'Market Efficiency pattern reset',
          currentTick: 0
        });

      case 'status':
        // Get current status
        const status = marketEngine.getMarketStatus();

        return NextResponse.json({
          success: true,
          tick: marketEngine.getCurrentTick(),
          marketStatus: status,
          marketData: marketEngine.getMarketData(),
          orderBook: marketEngine.getOrderBook()
        });

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: initialize, tick, advance, place_order, reset, or status' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Market Efficiency test error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// GET endpoint for quick status check
export async function GET() {
  try {
    const marketEngine = getMarketEngine('Market Efficiency');
    const status = marketEngine.getMarketStatus();

    return NextResponse.json({
      currentTick: marketEngine.getCurrentTick(),
      marketData: marketEngine.getMarketData(),
      orderBook: marketEngine.getOrderBook(),
      status
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
