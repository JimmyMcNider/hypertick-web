/**
 * Orders API Route - Student Trading Interface
 * 
 * Handles order placement for student trading terminal.
 * Routes to instructor session orders with proper validation.
 */

import { NextRequest, NextResponse } from 'next/server';
import { placeSessionOrder } from '@/lib/instructor-session';

/**
 * POST - Place new order
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, userId, symbol, side, quantity, type, price } = body;
    
    if (!sessionId || !userId || !symbol || !side || !quantity) {
      return NextResponse.json(
        { error: 'Missing required order parameters' },
        { status: 400 }
      );
    }

    // Validate order type
    if (!['MKT', 'LMT', 'STP', 'STPLMT'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid order type' },
        { status: 400 }
      );
    }

    // For limit orders, price is required
    if (type !== 'MKT' && !price) {
      return NextResponse.json(
        { error: 'Price required for limit orders' },
        { status: 400 }
      );
    }

    // Place the order through instructor session
    const order = await placeSessionOrder(
      sessionId,
      userId,
      symbol,
      side,
      parseInt(quantity),
      type === 'MKT' ? undefined : parseFloat(price)
    );

    return NextResponse.json({
      success: true,
      orderId: order.id,
      status: order.status,
      message: `${side} ${quantity} ${symbol} @ ${type === 'MKT' ? 'MARKET' : '$' + price}`
    });

  } catch (error) {
    console.error('Order placement failed:', error);
    return NextResponse.json(
      { error: 'Order placement failed' },
      { status: 500 }
    );
  }
}