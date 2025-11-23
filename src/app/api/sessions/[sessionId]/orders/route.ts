/**
 * Order Management API
 * 
 * Handles order submission, cancellation, and retrieval for trading sessions
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getReadyOrderMatchingEngine } from '@/lib/order-matching-engine';
import { prisma } from '@/lib/prisma';

interface RouteParams {
  params: { sessionId: string };
}

// POST /api/sessions/[sessionId]/orders - Submit new order
export const POST = requireAuth(async (
  request: NextRequest & { user: any }, 
  { params }: RouteParams
) => {
  try {
    const { sessionId } = await params;
    const body = await request.json();
    const { 
      securityId, 
      type, 
      side, 
      quantity, 
      price, 
      stopPrice, 
      timeInForce = 'DAY' 
    } = body;

    // Validate required fields
    if (!securityId || !type || !side || !quantity) {
      return NextResponse.json(
        { error: 'Missing required fields: securityId, type, side, quantity' },
        { status: 400 }
      );
    }

    // Resolve security - accept either ID or symbol
    let resolvedSecurityId = securityId;

    // Check if securityId looks like a symbol (not a cuid)
    // CUIDs start with 'c' and are 25 chars, symbols are typically short uppercase
    if (!securityId.startsWith('c') || securityId.length < 20) {
      // Try to look up by symbol
      const security = await prisma.security.findFirst({
        where: { symbol: securityId.toUpperCase() }
      });
      if (security) {
        resolvedSecurityId = security.id;
      } else {
        return NextResponse.json(
          { error: `Security not found: ${securityId}` },
          { status: 400 }
        );
      }
    }

    // Validate user is in session
    const sessionUser = await prisma.sessionUser.findUnique({
      where: {
        sessionId_userId: {
          sessionId,
          userId: request.user.id
        }
      }
    });

    if (!sessionUser) {
      return NextResponse.json(
        { error: 'User not enrolled in this session' },
        { status: 403 }
      );
    }

    // Get matching engine (auto-opens market for active sessions)
    const engine = await getReadyOrderMatchingEngine(sessionId);

    // Submit order with resolved security ID
    const order = await engine.submitOrder({
      sessionId,
      userId: request.user.id,
      securityId: resolvedSecurityId,
      type,
      side,
      quantity,
      price,
      stopPrice,
      timeInForce
    });

    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        type: order.type,
        side: order.side,
        quantity: order.quantity,
        price: order.price,
        status: order.status,
        submittedAt: order.submittedAt,
        remainingQuantity: order.remainingQuantity
      }
    });

  } catch (error) {
    console.error('Error submitting order:', error);
    return NextResponse.json(
      { error: 'Failed to submit order' },
      { status: 500 }
    );
  }
});

// GET /api/sessions/[sessionId]/orders - Get user's orders
export const GET = requireAuth(async (
  request: NextRequest & { user: any }, 
  { params }: RouteParams
) => {
  try {
    const { sessionId } = await params;
    const url = new URL(request.url);
    const status = url.searchParams.get('status');

    // Validate user is in session
    const sessionUser = await prisma.sessionUser.findUnique({
      where: {
        sessionId_userId: {
          sessionId,
          userId: request.user.id
        }
      }
    });

    if (!sessionUser) {
      return NextResponse.json(
        { error: 'User not enrolled in this session' },
        { status: 403 }
      );
    }

    // Build query conditions
    const whereConditions: any = {
      sessionId,
      userId: request.user.id
    };

    if (status) {
      whereConditions.status = status;
    }

    // Get orders from database
    const orders = await prisma.order.findMany({
      where: whereConditions,
      include: {
        executions: true,
        security: true
      },
      orderBy: {
        submittedAt: 'desc'
      }
    });

    return NextResponse.json({
      success: true,
      orders: orders.map(order => ({
        id: order.id,
        securityId: order.securityId,
        security: order.security,
        type: order.type,
        side: order.side,
        quantity: order.quantity,
        price: order.price,
        stopPrice: order.stopPrice,
        status: order.status,
        timeInForce: order.timeInForce,
        submittedAt: order.submittedAt,
        executedAt: order.executedAt,
        cancelledAt: order.cancelledAt,
        executions: order.executions
      }))
    });

  } catch (error) {
    console.error('Error fetching orders:', error);
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    );
  }
});