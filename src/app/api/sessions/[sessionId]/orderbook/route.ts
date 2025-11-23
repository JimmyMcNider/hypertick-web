/**
 * Order Book API
 * 
 * Provides real-time order book data and market information
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getOrderMatchingEngine } from '@/lib/order-matching-engine';
import { prisma } from '@/lib/prisma';

interface RouteParams {
  params: { sessionId: string };
}

// GET /api/sessions/[sessionId]/orderbook - Get order book data
export const GET = requireAuth(async (
  request: NextRequest & { user: any }, 
  { params }: RouteParams
) => {
  try {
    const { sessionId } = await params;
    const url = new URL(request.url);
    const securityId = url.searchParams.get('securityId');

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

    // Get matching engine
    const engine = getOrderMatchingEngine(sessionId);

    // If no securityId provided, try to get the default AOE security
    let resolvedSecurityId = securityId;
    if (!resolvedSecurityId) {
      const aoeSecurity = await prisma.security.findFirst({
        where: { symbol: 'AOE' }
      });
      if (aoeSecurity) {
        resolvedSecurityId = aoeSecurity.id;
      }
    }

    if (resolvedSecurityId) {
      // Get order book for specific security
      const orderBook = engine.getOrderBook(resolvedSecurityId);
      const marketPrice = engine.getMarketPrice(resolvedSecurityId);

      // Also get raw orders from the engine for display
      const rawOrders = engine.getOpenOrders(resolvedSecurityId);

      // Separate into bids and asks with remaining quantity
      const bids = rawOrders
        .filter(o => o.side === 'BUY' && o.remainingQuantity > 0 && o.price !== undefined)
        .map(o => ({
          id: o.id,
          price: o.price!,
          remainingQuantity: o.remainingQuantity,
          userId: o.userId
        }))
        .sort((a, b) => b.price - a.price);

      const asks = rawOrders
        .filter(o => o.side === 'SELL' && o.remainingQuantity > 0 && o.price !== undefined)
        .map(o => ({
          id: o.id,
          price: o.price!,
          remainingQuantity: o.remainingQuantity,
          userId: o.userId
        }))
        .sort((a, b) => a.price - b.price);

      // Calculate volume from recent trades
      const recentTrades = engine.getRecentTrades(resolvedSecurityId);
      const volume = recentTrades.reduce((sum, t) => sum + t.quantity, 0);

      return NextResponse.json({
        success: true,
        orderBook: {
          securityId: resolvedSecurityId,
          marketPrice,
          bids,
          asks,
          stats: {
            volume,
            tradeCount: recentTrades.length,
            bestBid: bids.length > 0 ? bids[0].price : null,
            bestAsk: asks.length > 0 ? asks[0].price : null,
            spread: bids.length > 0 && asks.length > 0
              ? asks[0].price - bids[0].price
              : null
          },
          lastTrade: orderBook?.lastTrade || null
        }
      });
    } else {
      // Get all order books (legacy behavior)
      const securities = await prisma.security.findMany({ where: { isActive: true } });
      const orderBooks = securities.map(sec => {
        const orderBook = engine.getOrderBook(sec.id);
        const marketPrice = engine.getMarketPrice(sec.id);

        if (!orderBook) return null;

        return {
          securityId: sec.id,
          symbol: sec.symbol,
          marketPrice,
          bidCount: orderBook.bids.length,
          askCount: orderBook.asks.length,
          bestBid: orderBook.bids.length > 0 ? orderBook.bids[0].price : null,
          bestAsk: orderBook.asks.length > 0 ? orderBook.asks[0].price : null,
          lastTrade: orderBook.lastTrade,
          spread: orderBook.asks.length > 0 && orderBook.bids.length > 0
            ? orderBook.asks[0].price - orderBook.bids[0].price
            : null
        };
      }).filter(Boolean);

      return NextResponse.json({
        success: true,
        orderBooks
      });
    }

  } catch (error) {
    console.error('Error fetching order book:', error);
    return NextResponse.json(
      { error: 'Failed to fetch order book' },
      { status: 500 }
    );
  }
});