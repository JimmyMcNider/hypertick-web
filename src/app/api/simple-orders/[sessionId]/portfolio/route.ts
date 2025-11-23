/**
 * Simple Portfolio API
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUserPortfolio } from '@/lib/simple-session';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId parameter is required' },
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

    return NextResponse.json({ portfolio });

  } catch (error) {
    console.error('Get portfolio error:', error);
    return NextResponse.json(
      { error: 'Failed to get portfolio' },
      { status: 500 }
    );
  }
}