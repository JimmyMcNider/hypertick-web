/**
 * Market Data API - Real-time market information
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSessionMarketData } from '@/lib/instructor-session';

/**
 * GET - Get current market data for session
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    
    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
    }
    
    const marketData = getSessionMarketData(sessionId);
    
    if (!marketData) {
      return NextResponse.json({ error: 'Session not found or not active' }, { status: 404 });
    }
    
    return NextResponse.json({
      success: true,
      data: marketData,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Failed to get market data:', error);
    return NextResponse.json(
      { error: 'Failed to get market data' },
      { status: 500 }
    );
  }
}