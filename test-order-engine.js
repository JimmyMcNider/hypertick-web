#!/usr/bin/env node

/**
 * Test script for order matching engine
 * Tests the core trading functionality
 */

import { getOrderMatchingEngine } from './src/lib/order-matching-engine.ts';
import { prisma } from './src/lib/prisma.ts';

async function testOrderEngine() {
  try {
    console.log('🧪 Testing Order Matching Engine...\n');

    // Find a session
    const session = await prisma.simulationSession.findFirst();
    if (!session) {
      console.error('❌ No session found');
      return;
    }

    console.log(`✅ Using session: ${session.id}`);

    // Get order engine
    const engine = getOrderMatchingEngine(session.id);
    console.log('✅ Order engine initialized');

    // Open market
    await engine.openMarket();
    console.log('✅ Market opened');

    // Test order submission
    console.log('\n🔄 Testing order submission...');
    
    const testOrder = {
      sessionId: session.id,
      userId: 'cmhb0lc000011re59y3pu5tz6', // student1@hypertick.com
      securityId: 'cmhb0lc0u002rre59urb9dyow', // AOE - Alpha Omega Enterprises
      type: 'LIMIT',
      side: 'BUY',
      quantity: 100,
      price: 100.50,
      timeInForce: 'DAY'
    };

    const order = await engine.submitOrder(testOrder);
    console.log(`✅ Order submitted: ${order.id}`);
    console.log(`   Status: ${order.status}`);
    console.log(`   Type: ${order.type} ${order.side}`);
    console.log(`   Quantity: ${order.quantity} @ $${order.price}`);

    // Check order book
    console.log('\n📊 Checking order book...');
    const orderBook = engine.getOrderBook('cmhb0lc0u002rre59urb9dyow');
    if (orderBook) {
      console.log(`✅ Order book found for AOE`);
      console.log(`   Bids: ${orderBook.bids.length} levels`);
      console.log(`   Asks: ${orderBook.asks.length} levels`);
      if (orderBook.bids.length > 0) {
        console.log(`   Best bid: $${orderBook.bids[0].price} for ${orderBook.bids[0].quantity} shares`);
      }
      if (orderBook.asks.length > 0) {
        console.log(`   Best ask: $${orderBook.asks[0].price} for ${orderBook.asks[0].quantity} shares`);
      }
      console.log(`   Market price: $${engine.getMarketPrice('cmhb0lc0u002rre59urb9dyow')}`);
    }

    // Create an ASK (sell limit order) to provide liquidity for testing
    console.log('\n🏦 Adding liquidity with ask order...');
    const askOrder = {
      sessionId: session.id,
      userId: 'cmhb0lc040013re59y45dnrlp', // student3@hypertick.com
      securityId: 'cmhb0lc0u002rre59urb9dyow', // AOE - Alpha Omega Enterprises
      type: 'LIMIT',
      side: 'SELL', 
      quantity: 200,
      price: 99.75, // Lower than the bid to create a crossed market
      timeInForce: 'DAY'
    };

    await engine.submitOrder(askOrder);
    console.log('✅ Ask order added for liquidity');

    // Add another ask order for the market order to execute against
    console.log('\n🏪 Adding more liquidity...');
    const askOrder2 = {
      sessionId: session.id,
      userId: 'cmhb0lc040014re59m9i3upww', // student4@hypertick.com
      securityId: 'cmhb0lc0u002rre59urb9dyow', // AOE - Alpha Omega Enterprises
      type: 'LIMIT',
      side: 'SELL', 
      quantity: 100,
      price: 101.25, // Above market to provide ask liquidity
      timeInForce: 'DAY'
    };

    await engine.submitOrder(askOrder2);
    console.log('✅ Additional ask order added');

    // Check updated order book
    console.log('\n📈 Updated order book after trades...');
    const updatedOrderBook = engine.getOrderBook('cmhb0lc0u002rre59urb9dyow');
    if (updatedOrderBook) {
      console.log(`   Bids: ${updatedOrderBook.bids.length} levels`);
      console.log(`   Asks: ${updatedOrderBook.asks.length} levels`);
      if (updatedOrderBook.asks.length > 0) {
        console.log(`   Best ask: $${updatedOrderBook.asks[0].price} for ${updatedOrderBook.asks[0].quantity} shares`);
      }
    }

    // Now test market BUY order that should execute against the remaining ask
    console.log('\n💰 Testing market order...');
    const marketOrder = {
      sessionId: session.id,
      userId: 'cmhb0lc030012re59z7g2nafc', // student2@hypertick.com
      securityId: 'cmhb0lc0u002rre59urb9dyow', // AOE - Alpha Omega Enterprises
      type: 'MARKET',
      side: 'BUY', // This should execute against the ask
      quantity: 50,
      timeInForce: 'DAY'
    };

    const marketOrderResult = await engine.submitOrder(marketOrder);
    console.log(`✅ Market order submitted: ${marketOrderResult.id}`);
    console.log(`   Status: ${marketOrderResult.status}`);
    
    // Final order book check
    console.log('\n📊 Final order book state...');
    const finalOrderBook = engine.getOrderBook('cmhb0lc0u002rre59urb9dyow');
    if (finalOrderBook) {
      console.log(`   Bids: ${finalOrderBook.bids.length} levels`);
      console.log(`   Asks: ${finalOrderBook.asks.length} levels`);
      console.log(`   Current market price: $${engine.getMarketPrice('cmhb0lc0u002rre59urb9dyow')}`);
    }

    console.log('\n🎉 Order engine tests completed!');

  } catch (error) {
    console.error('\n❌ Order engine test failed:');
    console.error(`   Error: ${error.message}`);
    console.error(`   Stack: ${error.stack}`);
  } finally {
    await prisma.$disconnect();
  }
}

testOrderEngine().catch(console.error);