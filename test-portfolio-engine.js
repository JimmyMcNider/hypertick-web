#!/usr/bin/env node

/**
 * Test script for portfolio engine integration
 * Tests position tracking, P&L calculations, and portfolio analytics
 */

import { getOrderMatchingEngine } from './src/lib/order-matching-engine.ts';
import { getPortfolioEngine } from './src/lib/portfolio-engine.ts';
import { prisma } from './src/lib/prisma.ts';

async function testPortfolioEngine() {
  try {
    console.log('🧪 Testing Portfolio Engine Integration...\n');

    // Find a session
    const session = await prisma.simulationSession.findFirst();
    if (!session) {
      console.error('❌ No session found');
      return;
    }

    console.log(`✅ Using session: ${session.id}`);

    // Get engines
    const orderEngine = getOrderMatchingEngine(session.id);
    const portfolioEngine = getPortfolioEngine(session.id);
    
    console.log('✅ Engines initialized');

    // Open market
    await orderEngine.openMarket();
    console.log('✅ Market opened');

    // Test users
    const user1 = 'cmhb0lc000011re59y3pu5tz6'; // student1@hypertick.com
    const user2 = 'cmhb0lc030012re59z7g2nafc'; // student2@hypertick.com
    const security = 'cmhb0lc0u002rre59urb9dyow'; // AOE

    // Check initial portfolios
    console.log('\n💰 Initial Portfolio States...');
    const initialPortfolio1 = await portfolioEngine.getPortfolioSummary(user1);
    const initialPortfolio2 = await portfolioEngine.getPortfolioSummary(user2);
    
    console.log(`User1 - Cash: $${initialPortfolio1.cashBalance}, Positions: ${initialPortfolio1.positions.length}`);
    console.log(`User2 - Cash: $${initialPortfolio2.cashBalance}, Positions: ${initialPortfolio2.positions.length}`);

    // Execute a series of trades
    console.log('\n📈 Executing trades...');

    // Trade 1: User1 buys 100 shares at $100
    console.log('\n🔄 Trade 1: User1 BUY 100 @ $100');
    await orderEngine.submitOrder({
      sessionId: session.id,
      userId: user1,
      securityId: security,
      type: 'LIMIT',
      side: 'BUY',
      quantity: 100,
      price: 100.00,
      timeInForce: 'DAY'
    });

    // Trade 2: User2 sells 100 shares at $100 (should match)
    await orderEngine.submitOrder({
      sessionId: session.id,
      userId: user2,
      securityId: security,
      type: 'LIMIT',
      side: 'SELL',
      quantity: 100,
      price: 100.00,
      timeInForce: 'DAY'
    });

    // Check portfolios after first trade
    console.log('\n📊 Portfolios after Trade 1...');
    const portfolio1_t1 = await portfolioEngine.getPortfolioSummary(user1);
    const portfolio2_t1 = await portfolioEngine.getPortfolioSummary(user2);
    
    console.log(`User1 - Cash: $${portfolio1_t1.cashBalance}, Total Value: $${portfolio1_t1.totalValue}, P&L: $${portfolio1_t1.totalPnL}`);
    console.log(`User2 - Cash: $${portfolio2_t1.cashBalance}, Total Value: $${portfolio2_t1.totalValue}, P&L: $${portfolio2_t1.totalPnL}`);
    
    if (portfolio1_t1.positions.length > 0) {
      const pos = portfolio1_t1.positions[0];
      console.log(`User1 Position - Qty: ${pos.quantity}, Avg: $${pos.avgPrice}, Market: $${pos.marketValue}, Unrealized: $${pos.unrealizedPnL}`);
    }

    // Trade 3: Simulate price movement - User1 buys more at higher price
    console.log('\n🔄 Trade 2: User1 BUY 50 @ $105 (price moving up)');
    await orderEngine.submitOrder({
      sessionId: session.id,
      userId: user1,
      securityId: security,
      type: 'LIMIT',
      side: 'BUY',
      quantity: 50,
      price: 105.00,
      timeInForce: 'DAY'
    });

    await orderEngine.submitOrder({
      sessionId: session.id,
      userId: user2,
      securityId: security,
      type: 'LIMIT',
      side: 'SELL',
      quantity: 50,
      price: 105.00,
      timeInForce: 'DAY'
    });

    // Check portfolios after price movement
    console.log('\n📊 Portfolios after Trade 2 (price up to $105)...');
    const portfolio1_t2 = await portfolioEngine.getPortfolioSummary(user1);
    const portfolio2_t2 = await portfolioEngine.getPortfolioSummary(user2);
    
    console.log(`User1 - Cash: $${portfolio1_t2.cashBalance}, Total Value: $${portfolio1_t2.totalValue}, P&L: $${portfolio1_t2.totalPnL}`);
    console.log(`User2 - Cash: $${portfolio2_t2.cashBalance}, Total Value: $${portfolio2_t2.totalValue}, P&L: $${portfolio2_t2.totalPnL}`);
    
    if (portfolio1_t2.positions.length > 0) {
      const pos = portfolio1_t2.positions[0];
      console.log(`User1 Position - Qty: ${pos.quantity}, Avg: $${pos.avgPrice}, Market: $${pos.marketValue}, Unrealized: $${pos.unrealizedPnL}`);
    }

    // Trade 4: User1 sells some shares at profit
    console.log('\n🔄 Trade 3: User1 SELL 75 @ $110 (taking profit)');
    await orderEngine.submitOrder({
      sessionId: session.id,
      userId: user1,
      securityId: security,
      type: 'LIMIT',
      side: 'SELL',
      quantity: 75,
      price: 110.00,
      timeInForce: 'DAY'
    });

    await orderEngine.submitOrder({
      sessionId: session.id,
      userId: user2,
      securityId: security,
      type: 'LIMIT',
      side: 'BUY',
      quantity: 75,
      price: 110.00,
      timeInForce: 'DAY'
    });

    // Final portfolio check
    console.log('\n📊 Final Portfolios...');
    const portfolio1_final = await portfolioEngine.getPortfolioSummary(user1);
    const portfolio2_final = await portfolioEngine.getPortfolioSummary(user2);
    
    console.log(`User1 - Cash: $${portfolio1_final.cashBalance}, Total Value: $${portfolio1_final.totalValue}`);
    console.log(`       - Realized P&L: $${portfolio1_final.totalRealizedPnL}, Unrealized P&L: $${portfolio1_final.totalUnrealizedPnL}, Total P&L: $${portfolio1_final.totalPnL}`);
    
    console.log(`User2 - Cash: $${portfolio2_final.cashBalance}, Total Value: $${portfolio2_final.totalValue}`);
    console.log(`       - Realized P&L: $${portfolio2_final.totalRealizedPnL}, Unrealized P&L: $${portfolio2_final.totalUnrealizedPnL}, Total P&L: $${portfolio2_final.totalPnL}`);

    if (portfolio1_final.positions.length > 0) {
      const pos = portfolio1_final.positions[0];
      console.log(`User1 Remaining Position - Qty: ${pos.quantity}, Avg: $${pos.avgPrice}, Market: $${pos.marketValue}, Unrealized: $${pos.unrealizedPnL}`);
    }

    // Test market price update and P&L recalculation
    console.log('\n📈 Testing market price update to $120...');
    await portfolioEngine.updateMarketPrice(security, 120.00);
    
    const portfolio1_price_update = await portfolioEngine.getPortfolioSummary(user1);
    console.log(`User1 after price update - Total Value: $${portfolio1_price_update.totalValue}, Unrealized P&L: $${portfolio1_price_update.totalUnrealizedPnL}`);

    console.log('\n🎉 Portfolio engine tests completed!');

  } catch (error) {
    console.error('\n❌ Portfolio engine test failed:');
    console.error(`   Error: ${error.message}`);
    console.error(`   Stack: ${error.stack}`);
  } finally {
    await prisma.$disconnect();
  }
}

testPortfolioEngine().catch(console.error);