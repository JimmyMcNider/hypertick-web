/**
 * Instructor Market Control API
 * 
 * Provides real-time market control capabilities for instructors
 * during live trading sessions.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getMarketEngine } from '@/lib/market-engine';
import { getInstructorSession } from '@/lib/instructor-session';

/**
 * POST - Execute instructor market controls
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, instructorId, action, parameters } = body;
    
    if (!sessionId || !instructorId || !action) {
      return NextResponse.json(
        { error: 'Session ID, instructor ID, and action required' },
        { status: 400 }
      );
    }
    
    // Verify instructor owns this session
    const session = getInstructorSession(instructorId);
    if (!session || session.id !== sessionId) {
      return NextResponse.json(
        { error: 'Unauthorized: Not your session' },
        { status: 403 }
      );
    }
    
    const marketEngine = getMarketEngine(session.lessonName);
    let result: any = null;
    
    switch (action) {
      case 'pause_market':
        marketEngine.pauseMarket();
        result = { message: 'Market paused successfully' };
        break;
        
      case 'resume_market':
        marketEngine.resumeMarket();
        result = { message: 'Market resumed successfully' };
        break;
        
      case 'adjust_volatility':
        const { symbol, volatility } = parameters;
        if (!symbol || volatility === undefined) {
          return NextResponse.json(
            { error: 'Symbol and volatility required for volatility adjustment' },
            { status: 400 }
          );
        }
        marketEngine.adjustVolatility(symbol, volatility);
        result = { message: `${symbol} volatility adjusted to ${(volatility * 100).toFixed(1)}%` };
        break;
        
      case 'trigger_event':
        const { type, impact, symbol: eventSymbol, duration } = parameters;
        if (!type || impact === undefined) {
          return NextResponse.json(
            { error: 'Event type and impact required' },
            { status: 400 }
          );
        }
        marketEngine.triggerMarketEvent({
          type,
          symbol: eventSymbol,
          impact,
          duration
        });
        result = { message: `Market event ${type} triggered with ${impact > 0 ? '+' : ''}${(impact * 100).toFixed(0)}% impact` };
        break;
        
      case 'update_liquidity':
        const { traderId, setting, value } = parameters;
        if (!traderId || !setting || value === undefined) {
          return NextResponse.json(
            { error: 'Trader ID, setting, and value required for liquidity control' },
            { status: 400 }
          );
        }
        marketEngine.setLiquidityTrader(traderId, setting, value);
        result = { message: `Liquidity trader ${traderId} ${setting} set to ${value}` };
        break;
        
      case 'get_market_status':
        result = marketEngine.getMarketStatus();
        break;
        
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
    
    console.log(`🎛️ Instructor ${instructorId} executed: ${action} on session ${sessionId}`);
    
    return NextResponse.json({
      success: true,
      action,
      result,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Instructor market control error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to execute market control',
        action: request.json().then(body => body.action).catch(() => 'unknown')
      },
      { status: 500 }
    );
  }
}

/**
 * GET - Get current market status and available controls
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const instructorId = searchParams.get('instructorId');
    
    if (!sessionId || !instructorId) {
      return NextResponse.json(
        { error: 'Session ID and instructor ID required' },
        { status: 400 }
      );
    }
    
    // Verify instructor owns this session
    const session = getInstructorSession(instructorId);
    if (!session || session.id !== sessionId) {
      return NextResponse.json(
        { error: 'Unauthorized: Not your session' },
        { status: 403 }
      );
    }
    
    const marketEngine = getMarketEngine(session.lessonName);
    const marketStatus = marketEngine.getMarketStatus();
    
    return NextResponse.json({
      success: true,
      session: {
        id: session.id,
        lessonName: session.lessonName,
        status: session.status,
        activeStudents: session.activeStudents.length
      },
      market: marketStatus,
      availableControls: {
        canPauseMarket: marketStatus.configuration.instructorControls.canPauseMarket,
        canAdjustVolatility: marketStatus.configuration.instructorControls.canAdjustVolatility,
        canTriggerEvents: marketStatus.configuration.instructorControls.canTriggerEvents,
        realTimeMonitoring: marketStatus.configuration.instructorControls.realTimeMonitoring,
        scenarioControl: marketStatus.configuration.instructorControls.scenarioControl
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Failed to get market status:', error);
    return NextResponse.json(
      { error: 'Failed to get market status' },
      { status: 500 }
    );
  }
}