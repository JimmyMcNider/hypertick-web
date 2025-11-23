/**
 * Instructor Session Orders API
 * 
 * Handles order placement and retrieval for instructor sessions.
 */

import { NextRequest, NextResponse } from 'next/server';
import { placeSessionOrder, getUserOrders } from '@/lib/instructor-session';

/**
 * GET - Get user's orders in instructor session
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const userId = searchParams.get('userId');
    
    if (!sessionId || !userId) {
      return NextResponse.json(
        { error: 'Session ID and User ID required' },
        { status: 400 }
      );
    }
    
    const orders = getUserOrders(sessionId, userId);
    
    return NextResponse.json({
      orders,
      count: orders.length
    });
    
  } catch (error) {
    console.error('Failed to get orders:', error);
    return NextResponse.json(
      { error: 'Failed to get orders' },
      { status: 500 }
    );
  }
}

/**
 * POST - Place new order in instructor session
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, userId, symbol, side, quantity, price } = body;
    
    if (!sessionId || !userId || !symbol || !side || !quantity) {
      return NextResponse.json(
        { error: 'Missing required order parameters' },
        { status: 400 }
      );
    }
    
    const order = await placeSessionOrder(
      sessionId,
      userId,
      symbol,
      side,
      quantity,
      price
    );
    
    return NextResponse.json({
      success: true,
      order,
      message: 'Order placed successfully'
    });
    
  } catch (error) {
    console.error('Failed to place order:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to place order' },
      { status: 500 }
    );
  }
}