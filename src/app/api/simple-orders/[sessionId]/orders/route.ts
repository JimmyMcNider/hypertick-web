/**
 * Simple Orders API
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSessionOrders } from '@/lib/simple-session';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');

    const allOrders = getSessionOrders(sessionId);
    
    // Filter by user if specified
    const orders = userId 
      ? allOrders.filter(order => order.userId === userId)
      : allOrders;

    return NextResponse.json({ orders });

  } catch (error) {
    console.error('Get orders error:', error);
    return NextResponse.json(
      { error: 'Failed to get orders' },
      { status: 500 }
    );
  }
}