/**
 * Market Trades API - Recent trading activity
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSessionTrades } from '@/lib/instructor-session';

/**
 * GET - Get recent trades for session
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const symbol = searchParams.get('symbol'); // optional
    const limit = parseInt(searchParams.get('limit') || '50');
    
    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
    }
    
    const trades = getSessionTrades(sessionId, symbol || undefined, limit);
    
    return NextResponse.json({
      success: true,
      trades,
      count: trades.length,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Failed to get trades:', error);
    return NextResponse.json(
      { error: 'Failed to get trades' },
      { status: 500 }
    );
  }
}