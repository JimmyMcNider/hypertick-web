import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const lessonId = searchParams.get('lessonId');

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
    }

    // Get all students in the session with their trading activity
    const students = await prisma.user.findMany({
      where: {
        role: 'STUDENT',
        // Add session filtering when session management is implemented
      },
      include: {
        orders: {
          where: {
            // Filter by session when implemented
          },
          orderBy: { submittedAt: 'desc' },
          take: 10,
          include: {
            security: true
          }
        },
        positions: {
          where: {
            quantity: { not: 0 }
          },
          include: {
            security: true
          }
        }
      }
    });

    // Calculate portfolio values and metrics for each student
    const studentActivity = await Promise.all(students.map(async (student) => {
      // Get current security prices (mock for now)
      const currentPrices = {
        'AAPL': 152.30,
        'MSFT': 285.40,
        'GOOGL': 2640.25,
        'TSLA': 180.50,
        'AMZN': 3200.75
      };

      // Calculate portfolio value and P&L
      let portfolioValue = 10000; // Starting cash
      let unrealizedPnL = 0;

      const positions = student.positions.map(position => {
        const avgPrice = Number(position.avgPrice);
        const currentPrice = currentPrices[position.security.symbol as keyof typeof currentPrices] || avgPrice;
        const positionValue = position.quantity * currentPrice;
        const positionPnL = (currentPrice - avgPrice) * position.quantity;
        
        portfolioValue += positionValue;
        unrealizedPnL += positionPnL;

        return {
          symbol: position.security.symbol,
          quantity: position.quantity,
          avgPrice,
          currentPrice,
          unrealizedPnL: positionPnL
        };
      });

      const recentOrders = student.orders.slice(0, 5).map(order => ({
        id: order.id,
        symbol: order.security.symbol,
        side: order.side,
        quantity: order.quantity,
        price: order.price,
        timestamp: order.submittedAt,
        status: order.status
      }));

      return {
        id: student.id,
        firstName: student.firstName,
        lastName: student.lastName,
        email: student.email,
        totalOrders: student.orders.length,
        portfolioValue,
        unrealizedPnL,
        lastActivity: student.orders.length > 0 ? student.orders[0].submittedAt : student.createdAt,
        currentPositions: positions,
        recentOrders
      };
    }));

    // Calculate session metrics
    const metrics = {
      totalStudents: students.length,
      activeStudents: studentActivity.filter(s => 
        Date.now() - new Date(s.lastActivity).getTime() < 300000 // Active in last 5 minutes
      ).length,
      totalOrders: studentActivity.reduce((sum, s) => sum + s.totalOrders, 0),
      totalVolume: studentActivity.reduce((sum, s) => sum + s.portfolioValue, 0),
      averagePortfolioValue: studentActivity.length > 0 
        ? studentActivity.reduce((sum, s) => sum + s.portfolioValue, 0) / studentActivity.length 
        : 0,
      topPerformer: studentActivity.length > 0 
        ? studentActivity.reduce((best, current) => 
            current.unrealizedPnL > best.unrealizedPnL ? current : best
          ).firstName + ' ' + studentActivity.reduce((best, current) => 
            current.unrealizedPnL > best.unrealizedPnL ? current : best
          ).lastName
        : 'None',
      marketStatus: 'OPEN' as const // This should come from market engine state
    };

    return NextResponse.json({
      students: studentActivity,
      metrics,
      lessonId,
      sessionId
    });

  } catch (error) {
    console.error('Failed to load session data:', error);
    return NextResponse.json(
      { error: 'Failed to load session data' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, sessionId, studentId, params } = body;

    switch (action) {
      case 'kick_student':
        // Implementation for removing student from session
        console.log(`Kicking student ${studentId} from session ${sessionId}`);
        break;

      case 'reset_portfolio':
        // Reset student's portfolio to starting conditions
        await prisma.position.deleteMany({
          where: { userId: studentId }
        });
        await prisma.order.updateMany({
          where: { userId: studentId },
          data: { status: 'CANCELLED' }
        });
        break;

      case 'send_message':
        // Send message to specific student or all students
        console.log(`Sending message to ${studentId || 'all students'}: ${params.message}`);
        break;

      case 'adjust_buying_power':
        // Adjust student's available buying power
        console.log(`Adjusting buying power for ${studentId} to ${params.amount}`);
        break;

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: `Action ${action} completed` });

  } catch (error) {
    console.error('Session management action failed:', error);
    return NextResponse.json(
      { error: 'Action failed' },
      { status: 500 }
    );
  }
}