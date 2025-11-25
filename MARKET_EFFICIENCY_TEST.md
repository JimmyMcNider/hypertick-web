# Market Efficiency Lesson Test Guide

This document describes how to test the Market Efficiency lesson implementation using the test API endpoint.

## Overview

The Market Efficiency lesson has been partially implemented with:

✅ **Completed:**
- Iteration tracking in database schema
- WizardItemDisplay component for rendering lesson content
- Market Efficiency liquidity patterns (Sawtooth, Momentum, Deep Momentum)
- Market engine integration with tick-based execution
- Test API endpoint for rapid testing

⏳ **Pending:**
- Full wizard UI integration
- Tick advancement timer/automation
- Discount bond pricing with maturity dates
- Privilege-based UI rendering
- WebSocket broadcasting
- Session summary reporting

## Test API Endpoint

**Base URL:** `/api/test/market-efficiency`

### Initialize Simulation

```bash
# Initialize Simulation A (Sawtooth pattern)
curl -X POST http://localhost:3000/api/test/market-efficiency \
  -H "Content-Type: application/json" \
  -d '{"action": "initialize", "scenario": "A"}'

# Initialize Simulation B (Momentum pattern)
curl -X POST http://localhost:3000/api/test/market-efficiency \
  -H "Content-Type: application/json" \
  -d '{"action": "initialize", "scenario": "B"}'

# Initialize Simulation C (Deep Momentum pattern)
curl -X POST http://localhost:3000/api/test/market-efficiency \
  -H "Content-Type: application/json" \
  -d '{"action": "initialize", "scenario": "C"}'
```

### Advance Ticks

```bash
# Advance by 1 tick
curl -X POST http://localhost:3000/api/test/market-efficiency \
  -H "Content-Type: application/json" \
  -d '{"action": "tick"}'

# Advance by 20 ticks (one full sawtooth cycle)
curl -X POST http://localhost:3000/api/test/market-efficiency \
  -H "Content-Type: application/json" \
  -d '{"action": "advance", "tick": 20}'
```

### Place Student Orders

```bash
# Buy 100 shares at market
curl -X POST http://localhost:3000/api/test/market-efficiency \
  -H "Content-Type: application/json" \
  -d '{
    "action": "place_order",
    "userId": "student1",
    "side": "BUY",
    "quantity": 100,
    "type": "MARKET"
  }'

# Sell 50 shares at $96.00 (limit order)
curl -X POST http://localhost:3000/api/test/market-efficiency \
  -H "Content-Type: application/json" \
  -d '{
    "action": "place_order",
    "userId": "student1",
    "side": "SELL",
    "quantity": 50,
    "price": 96.00,
    "type": "LIMIT"
  }'
```

### Check Status

```bash
# Get current simulation status
curl http://localhost:3000/api/test/market-efficiency

# Or using POST
curl -X POST http://localhost:3000/api/test/market-efficiency \
  -H "Content-Type: application/json" \
  -d '{"action": "status"}'
```

### Reset Simulation

```bash
curl -X POST http://localhost:3000/api/test/market-efficiency \
  -H "Content-Type: application/json" \
  -d '{"action": "reset"}'
```

## Test Scenarios

### Scenario A: Sawtooth Pattern

**Objective:** Students should identify the predictable oscillating pattern and eliminate it through trading.

**Test Steps:**
1. Initialize Simulation A
2. Advance 20 ticks (one full cycle)
3. Observe prices oscillate: up for 10 ticks, down for 10 ticks
4. Place student orders to profit from pattern
5. Verify pattern elimination as students trade

**Expected Behavior:**
- Tick 1-10: Liquidity trader buys → price rises
- Tick 11-20: Liquidity trader sells → price falls
- Pattern repeats every 20 ticks
- Student trading should dampen oscillations

```bash
# Test Simulation A
curl -X POST http://localhost:3000/api/test/market-efficiency \
  -d '{"action": "initialize", "scenario": "A"}' -H "Content-Type: application/json"

# Watch the pattern for 40 ticks
curl -X POST http://localhost:3000/api/test/market-efficiency \
  -d '{"action": "advance", "tick": 40}' -H "Content-Type: application/json"
```

### Scenario B: Momentum Pattern

**Objective:** Students should identify persistent upward pressure and ride momentum.

**Test Steps:**
1. Initialize Simulation B (starting price $95)
2. Advance ticks and observe persistent buying
3. Price should climb toward $100 (par value)
4. Students should buy early and sell near peak

**Expected Behavior:**
- Consistent buy orders until price reaches $100
- Price stabilizes at par value
- Light two-sided trading maintains price

```bash
# Test Simulation B
curl -X POST http://localhost:3000/api/test/market-efficiency \
  -d '{"action": "initialize", "scenario": "B"}' -H "Content-Type: application/json"

# Advance to see momentum
curl -X POST http://localhost:3000/api/test/market-efficiency \
  -d '{"action": "advance", "tick": 50}' -H "Content-Type: application/json"
```

### Scenario C: Deep Momentum

**Objective:** Same as B but with 5x larger orders enabling advanced strategies.

**Test Steps:**
1. Initialize Simulation C
2. Same as Simulation B but observe larger order sizes
3. Students can employ destabilizing speculation

```bash
# Test Simulation C
curl -X POST http://localhost:3000/api/test/market-efficiency \
  -d '{"action": "initialize", "scenario": "C"}' -H "Content-Type: application/json"

curl -X POST http://localhost:3000/api/test/market-efficiency \
  -d '{"action": "advance", "tick": 50}' -H "Content-Type: application/json"
```

## Integration Test Script

Here's a complete test script you can run:

```bash
#!/bin/bash

API="http://localhost:3000/api/test/market-efficiency"

echo "=== Market Efficiency Lesson Test ==="
echo

echo "1. Initialize Simulation A (Sawtooth)"
curl -X POST $API -H "Content-Type: application/json" \
  -d '{"action": "initialize", "scenario": "A"}' | jq

echo
echo "2. Advance 20 ticks (one full cycle)"
curl -X POST $API -H "Content-Type: application/json" \
  -d '{"action": "advance", "tick": 20}' | jq

echo
echo "3. Place student buy order"
curl -X POST $API -H "Content-Type: application/json" \
  -d '{"action": "place_order", "userId": "student1", "side": "BUY", "quantity": 100, "type": "MARKET"}' | jq

echo
echo "4. Check status"
curl $API | jq

echo
echo "5. Reset simulation"
curl -X POST $API -H "Content-Type: application/json" \
  -d '{"action": "reset"}' | jq

echo
echo "=== Test Complete ==="
```

Save this as `test-market-efficiency.sh`, make it executable (`chmod +x test-market-efficiency.sh`), and run it.

## Verification Checklist

- [ ] Simulation A creates sawtooth price pattern (10 ticks up, 10 ticks down)
- [ ] Simulation B creates persistent upward price movement toward $100
- [ ] Simulation C creates same pattern as B but with 5x order sizes
- [ ] Student orders execute correctly (market and limit)
- [ ] Order book updates with liquidity trader orders
- [ ] Prices change based on pattern trades
- [ ] Reset functionality works
- [ ] Status endpoint returns current state

## Next Steps for Full Implementation

1. **Tick Timer:** Add automatic tick advancement (e.g., 1 tick per 3 seconds)
2. **Instructor UI:** Integrate with instructor dashboard to start/stop simulations
3. **Student UI:** Show privilege-based trading windows when simulation starts
4. **Wizard Integration:** Display lesson content, simulation selection, prep screens
5. **Reporting:** Generate post-simulation summary with student P&L
6. **Iteration Tracking:** Support "repeat simulation" with iteration counter
7. **Bond Pricing:** Implement discount bond calculations with maturity
8. **WebSocket Events:** Broadcast tick updates, market state changes to all participants

## Files Modified/Created

### New Files:
- `src/lib/market-efficiency-patterns.ts` - Pattern classes (Sawtooth, Momentum, Deep Momentum)
- `src/components/wizard/WizardItemDisplay.tsx` - Wizard item renderer
- `src/app/api/test/market-efficiency/route.ts` - Test API endpoint
- `MARKET_EFFICIENCY_TEST.md` - This documentation

### Modified Files:
- `src/lib/market-engine.ts` - Added Market Efficiency pattern integration
- `prisma/schema.prisma` - Already has `iteration` field on SimulationSession

## Database

The Market Efficiency lesson should already be loaded in Supabase from the seed script. Verify with:

```sql
SELECT id, name, description FROM lessons WHERE name LIKE '%Market%';
```

## Production Deployment Notes

Before deploying to Render/Supabase:

1. Update `.env` on Render with production DATABASE_URL
2. Ensure `npx tsx` is in package.json start command (already done)
3. Verify build succeeds: `npm run build`
4. Test locally with production-like setup
5. Push to GitHub and let Render auto-deploy

## Support

For issues or questions, check:
- Market engine logs in console (tick advances, pattern trades)
- API response messages
- Order book state via status endpoint
- Network tab in browser dev tools
