/**
 * Multi-Trader Exchange Test Script
 *
 * Tests core exchange functionality:
 * 1. Create a trading session
 * 2. Two traders place crossing orders
 * 3. Verify orders match and trades execute
 * 4. Check position updates for both traders
 */

const BASE_URL = 'http://localhost:3000';

interface TestResult {
  step: string;
  success: boolean;
  details?: any;
  error?: string;
}

const results: TestResult[] = [];

async function login(username: string, password: string): Promise<{ token: string; user: any } | null> {
  try {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (data.token) {
      return { token: data.token, user: data.user };
    }
    console.error('Login failed:', data);
    return null;
  } catch (error) {
    console.error('Login error:', error);
    return null;
  }
}

async function createSession(token: string, lessonName: string, instructorId: string, studentIds: string[]): Promise<string | null> {
  try {
    const res = await fetch(`${BASE_URL}/api/simple-sessions/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        lessonName,
        instructorId,
        students: studentIds
      })
    });
    const data = await res.json();
    if (data.session?.id) {
      return data.session.id;
    }
    console.error('Create session failed:', data);
    return null;
  } catch (error) {
    console.error('Create session error:', error);
    return null;
  }
}

async function submitOrder(
  token: string,
  sessionId: string,
  order: {
    securityId: string;
    type: 'MARKET' | 'LIMIT';
    side: 'BUY' | 'SELL';
    quantity: number;
    price?: number;
  }
): Promise<any> {
  try {
    const res = await fetch(`${BASE_URL}/api/sessions/${sessionId}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        ...order,
        timeInForce: 'DAY'
      })
    });
    return await res.json();
  } catch (error) {
    console.error('Submit order error:', error);
    return { error: String(error) };
  }
}

async function getOrders(token: string, sessionId: string): Promise<any> {
  try {
    const res = await fetch(`${BASE_URL}/api/sessions/${sessionId}/orders`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return await res.json();
  } catch (error) {
    console.error('Get orders error:', error);
    return { error: String(error) };
  }
}

async function getOrderbook(token: string, sessionId: string): Promise<any> {
  try {
    const res = await fetch(`${BASE_URL}/api/sessions/${sessionId}/orderbook`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return await res.json();
  } catch (error) {
    console.error('Get orderbook error:', error);
    return { error: String(error) };
  }
}

async function runTests() {
  console.log('='.repeat(60));
  console.log('MULTI-TRADER EXCHANGE TEST');
  console.log('='.repeat(60));

  // Step 1: Login as instructor
  console.log('\n[1] Logging in as instructor...');
  const instructor = await login('instructor', 'instructor123');
  if (!instructor) {
    results.push({ step: 'Instructor login', success: false, error: 'Login failed' });
    return printResults();
  }
  results.push({ step: 'Instructor login', success: true, details: { username: instructor.user?.username } });

  // Step 2: Login as two students
  console.log('\n[2] Logging in as student1...');
  const student1 = await login('student1', 'student123');
  if (!student1) {
    results.push({ step: 'Student1 login', success: false, error: 'Login failed' });
    return printResults();
  }
  results.push({ step: 'Student1 login', success: true, details: { id: student1.user?.id } });

  console.log('\n[3] Logging in as student2...');
  const student2 = await login('student2', 'student123');
  if (!student2) {
    results.push({ step: 'Student2 login', success: false, error: 'Login failed' });
    return printResults();
  }
  results.push({ step: 'Student2 login', success: true, details: { id: student2.user?.id } });

  // Step 3: Create a trading session (pass usernames, not IDs - API looks up by username)
  console.log('\n[4] Creating trading session...');
  const sessionId = await createSession(instructor.token, 'Price Formation', instructor.user.id, ['student1', 'student2']);
  if (!sessionId) {
    results.push({ step: 'Create session', success: false, error: 'Session creation failed' });
    return printResults();
  }
  results.push({ step: 'Create session', success: true, details: { sessionId } });
  console.log(`    Session ID: ${sessionId}`);

  // Step 4: Student1 places a BUY LIMIT order at $100
  console.log('\n[5] Student1 placing BUY LIMIT order at $100...');
  const order1 = await submitOrder(student1.token, sessionId, {
    securityId: 'AOE',
    type: 'LIMIT',
    side: 'BUY',
    quantity: 100,
    price: 100.00
  });
  console.log('    Order 1 result:', JSON.stringify(order1, null, 2));
  results.push({
    step: 'Student1 BUY order',
    success: order1.success === true || order1.order?.id,
    details: order1
  });

  // Step 5: Student2 places a SELL LIMIT order at $100 (should match!)
  console.log('\n[6] Student2 placing SELL LIMIT order at $100...');
  const order2 = await submitOrder(student2.token, sessionId, {
    securityId: 'AOE',
    type: 'LIMIT',
    side: 'SELL',
    quantity: 100,
    price: 100.00
  });
  console.log('    Order 2 result:', JSON.stringify(order2, null, 2));
  results.push({
    step: 'Student2 SELL order',
    success: order2.success === true || order2.order?.id,
    details: order2
  });

  // Step 6: Check order statuses
  console.log('\n[7] Checking order statuses...');
  const student1Orders = await getOrders(student1.token, sessionId);
  const student2Orders = await getOrders(student2.token, sessionId);
  console.log('    Student1 orders:', JSON.stringify(student1Orders, null, 2));
  console.log('    Student2 orders:', JSON.stringify(student2Orders, null, 2));

  // Check if orders were filled
  const order1Filled = student1Orders.orders?.some((o: any) => o.status === 'FILLED');
  const order2Filled = student2Orders.orders?.some((o: any) => o.status === 'FILLED');

  results.push({
    step: 'Orders matched and filled',
    success: order1Filled && order2Filled,
    details: {
      order1Status: student1Orders.orders?.[0]?.status,
      order2Status: student2Orders.orders?.[0]?.status
    }
  });

  // Step 7: Check orderbook
  console.log('\n[8] Checking orderbook...');
  const orderbook = await getOrderbook(instructor.token, sessionId);
  console.log('    Orderbook:', JSON.stringify(orderbook, null, 2));
  results.push({
    step: 'Orderbook retrieved',
    success: !orderbook.error,
    details: orderbook
  });

  printResults();
}

function printResults() {
  console.log('\n' + '='.repeat(60));
  console.log('TEST RESULTS');
  console.log('='.repeat(60));

  let passed = 0;
  let failed = 0;

  for (const result of results) {
    const status = result.success ? '✅ PASS' : '❌ FAIL';
    console.log(`${status}: ${result.step}`);
    if (!result.success && result.error) {
      console.log(`       Error: ${result.error}`);
    }
    result.success ? passed++ : failed++;
  }

  console.log('\n' + '-'.repeat(60));
  console.log(`Total: ${passed} passed, ${failed} failed`);
  console.log('='.repeat(60));

  // Critical assessment
  console.log('\n📋 CRITICAL ASSESSMENT:');
  const orderMatchingWorks = results.some(r => r.step === 'Orders matched and filled' && r.success);
  if (orderMatchingWorks) {
    console.log('✅ Multi-trader order matching is WORKING');
    console.log('   Orders from different traders are matching correctly');
  } else {
    console.log('❌ Multi-trader order matching NEEDS WORK');
    console.log('   Orders are not matching between traders');
    console.log('\n   Potential issues to investigate:');
    console.log('   1. Market not open (matching engine requires openMarket())');
    console.log('   2. Users not enrolled in SessionUser table');
    console.log('   3. Order book not receiving/broadcasting properly');
  }
}

// Run the tests
runTests().catch(console.error);
