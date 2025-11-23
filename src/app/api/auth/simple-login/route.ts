/**
 * Simple Login API - No JWT complexity, no middleware failures
 */

import { NextRequest, NextResponse } from 'next/server';
import { simpleLogin } from '@/lib/simple-auth';

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password required' },
        { status: 400 }
      );
    }

    const user = await simpleLogin({ username, password });

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid username or password' },
        { status: 401 }
      );
    }

    // Return user data - no JWT, just store in localStorage on client
    return NextResponse.json({
      success: true,
      user,
      message: 'Login successful'
    });

  } catch (error) {
    console.error('Simple login API error:', error);
    return NextResponse.json(
      { error: 'Login failed' },
      { status: 500 }
    );
  }
}