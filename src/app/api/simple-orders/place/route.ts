/**
 * Simple Order Placement API
 */

import { NextRequest, NextResponse } from 'next/server';
import { placeSimpleOrder } from '@/lib/simple-session';

export async function POST(request: NextRequest) {
  try {
    const { sessionId, userId, symbol, side, quantity, price } = await request.json();

    if (!sessionId || !userId || !symbol || !side || !quantity) {
      return NextResponse.json(
        { error: 'sessionId, userId, symbol, side, and quantity are required' },
        { status: 400 }
      );
    }

    const order = await placeSimpleOrder(sessionId, userId, symbol, side, quantity, price);

    return NextResponse.json({
      success: true,
      order,
      message: 'Order placed successfully'
    });

  } catch (error) {
    console.error('Place order error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to place order' },
      { status: 500 }
    );
  }
}