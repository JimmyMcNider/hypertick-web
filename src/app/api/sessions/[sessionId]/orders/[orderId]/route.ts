/**
 * Individual Order Management API
 * 
 * Handles cancellation and retrieval of specific orders
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getOrderMatchingEngine } from '@/lib/order-matching-engine';
import { prisma } from '@/lib/prisma';

interface RouteParams {
  params: { sessionId: string; orderId: string };
}

// GET /api/sessions/[sessionId]/orders/[orderId] - Get specific order
export const GET = requireAuth(async (
  request: NextRequest & { user: any }, 
  { params }: RouteParams
) => {
  try {
    const { sessionId, orderId } = await params;

    // Get order from database
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        executions: true,
        security: true
      }
    });

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Verify user owns this order or is instructor
    if (order.userId !== request.user.id && request.user.role !== 'INSTRUCTOR') {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        sessionId: order.sessionId,
        userId: order.userId,
        securityId: order.securityId,
        security: order.security,
        type: order.type,
        side: order.side,
        quantity: order.quantity,
        price: order.price,
        stopPrice: order.stopPrice,
        status: order.status,
        timeInForce: order.timeInForce,
        notes: order.notes,
        submittedAt: order.submittedAt,
        executedAt: order.executedAt,
        cancelledAt: order.cancelledAt,
        executions: order.executions
      }
    });

  } catch (error) {
    console.error('Error fetching order:', error);
    return NextResponse.json(
      { error: 'Failed to fetch order' },
      { status: 500 }
    );
  }
});

// DELETE /api/sessions/[sessionId]/orders/[orderId] - Cancel order
export const DELETE = requireAuth(async (
  request: NextRequest & { user: any }, 
  { params }: RouteParams
) => {
  try {
    const { sessionId, orderId } = await params;

    // Verify order exists and belongs to user
    const order = await prisma.order.findUnique({
      where: { id: orderId }
    });

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    if (order.userId !== request.user.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    if (order.sessionId !== sessionId) {
      return NextResponse.json(
        { error: 'Order does not belong to this session' },
        { status: 400 }
      );
    }

    // Get matching engine and cancel order
    const engine = getOrderMatchingEngine(sessionId);
    const cancelled = await engine.cancelOrder(orderId, request.user.id);

    if (!cancelled) {
      return NextResponse.json(
        { error: 'Order cannot be cancelled (may already be filled or cancelled)' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Order cancelled successfully'
    });

  } catch (error) {
    console.error('Error cancelling order:', error);
    return NextResponse.json(
      { error: 'Failed to cancel order' },
      { status: 500 }
    );
  }
});