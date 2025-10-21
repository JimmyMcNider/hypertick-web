/**
 * Privileges API Routes
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { PRIVILEGE_DEFINITIONS } from '@/lib/privilege-definitions';
import { prisma } from '@/lib/prisma';

// GET /api/privileges - List all privilege definitions
export const GET = requireAuth(async (request: NextRequest & { user: any }) => {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    // Get all privilege definitions
    const privileges = PRIVILEGE_DEFINITIONS;

    // If sessionId provided, also get user's current privileges in that session
    let userPrivileges: number[] = [];
    if (sessionId) {
      const sessionPrivileges = await prisma.userPrivilege.findMany({
        where: {
          sessionId,
          userId: request.user.id,
          isActive: true,
          revokedAt: null
        },
        include: {
          privilege: true
        }
      });

      userPrivileges = sessionPrivileges.map(up => up.privilege.code);
    }

    return NextResponse.json({
      privileges,
      userPrivileges: sessionId ? userPrivileges : undefined
    });

  } catch (error: any) {
    console.error('Privileges fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch privileges' },
      { status: 500 }
    );
  }
});