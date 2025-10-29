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

    if (securityId) {
      // Get order book for specific security
      const orderBook = engine.getOrderBook(securityId);
      const marketPrice = engine.getMarketPrice(securityId);

      if (!orderBook) {
        return NextResponse.json(
          { error: 'Security not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        orderBook: {
          securityId: orderBook.securityId,
          marketPrice,
          bids: orderBook.bids.map(level => ({
            price: level.price,
            quantity: level.quantity,
            orderCount: level.orderCount
          })),
          asks: orderBook.asks.map(level => ({
            price: level.price,
            quantity: level.quantity,
            orderCount: level.orderCount
          })),
          lastTrade: orderBook.lastTrade,
          spread: orderBook.asks.length > 0 && orderBook.bids.length > 0 
            ? orderBook.asks[0].price - orderBook.bids[0].price 
            : null
        }
      });
    } else {
      // Get all order books
      const securities = ['EQUITY_1', 'BOND_1', 'OPTION_1']; // TODO: Get from session config
      const orderBooks = securities.map(secId => {
        const orderBook = engine.getOrderBook(secId);
        const marketPrice = engine.getMarketPrice(secId);
        
        if (!orderBook) return null;

        return {
          securityId: orderBook.securityId,
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