/**
 * Instructor Session Portfolio API
 * 
 * Handles portfolio retrieval for instructor sessions.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUserPortfolio } from '@/lib/instructor-session';

/**
 * GET - Get user's portfolio in instructor session
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
    
    const portfolio = getUserPortfolio(sessionId, userId);
    
    if (!portfolio) {
      return NextResponse.json(
        { error: 'Portfolio not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      portfolio
    });
    
  } catch (error) {
    console.error('Failed to get portfolio:', error);
    return NextResponse.json(
      { error: 'Failed to get portfolio' },
      { status: 500 }
    );
  }
}