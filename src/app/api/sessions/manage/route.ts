/**
 * Session Management API - Enhanced session control for instructors
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { enhancedSessionEngine } from '@/lib/enhanced-session-engine';
import { lessonLoader } from '@/lib/lesson-loader';
import { prisma } from '@/lib/prisma';

// POST /api/sessions/manage - Create and manage enhanced sessions
export const POST = requireAuth(async (request: NextRequest & { user: any }) => {
  try {
    // Check if user is instructor or admin
    if (request.user.role !== 'INSTRUCTOR' && request.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Instructor access required' }, { status: 403 });
    }

    const body = await request.json();
    const { action, sessionId, lessonId, scenario, classId, parameters } = body;

    switch (action) {
      case 'CREATE_SESSION':
        return await createEnhancedSession(lessonId, scenario, classId, request.user.id);
      
      case 'START_SESSION':
        return await startSession(sessionId);
      
      case 'PAUSE_SESSION':
        return await pauseSession(sessionId);
      
      case 'RESUME_SESSION':
        return await resumeSession(sessionId);
      
      case 'END_SESSION':
        return await endSession(sessionId, request.user.id);
      
      case 'EXECUTE_COMMAND':
        return await executeManualCommand(sessionId, parameters);
      
      case 'GET_SESSION_STATUS':
        return await getSessionStatus(sessionId);
      
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

  } catch (error: any) {
    console.error('Session management error:', error);
    return NextResponse.json({ error: 'Session management failed' }, { status: 500 });
  }
});

// GET /api/sessions/manage - Get active sessions
export const GET = requireAuth(async (request: NextRequest & { user: any }) => {
  try {
    // Check if user is instructor or admin
    if (request.user.role !== 'INSTRUCTOR' && request.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Instructor access required' }, { status: 403 });
    }

    const activeSessions = enhancedSessionEngine.getActiveSessions();
    
    // Filter sessions by instructor's classes if not admin
    let filteredSessions = activeSessions;
    if (request.user.role === 'INSTRUCTOR') {
      // Get instructor's classes
      const instructorClasses = await prisma.class.findMany({
        where: { instructorId: request.user.id },
        select: { id: true }
      });
      
      const classIds = instructorClasses.map(cls => cls.id);
      filteredSessions = activeSessions.filter(session => 
        classIds.includes(session.classId)
      );
    }

    // Transform sessions for API response
    const sessionData = filteredSessions.map(session => ({
      id: session.id,
      lessonId: session.lessonId,
      lessonTitle: session.currentLesson.title,
      scenario: session.scenario,
      classId: session.classId,
      status: session.status,
      startTime: session.startTime,
      endTime: session.endTime,
      participantCount: session.participants.size,
      executedCommands: session.executedCommands.size,
      pendingCommands: session.pendingCommands.length,
      marketState: {
        isOpen: session.marketState.isOpen,
        symbolCount: session.marketState.symbols.size,
        activeAuctions: session.marketState.auctionsActive.size
      },
      elapsedTime: session.status === 'IN_PROGRESS' ? 
        Math.floor((Date.now() - session.startTime.getTime()) / 1000) : 0
    }));

    return NextResponse.json({ 
      sessions: sessionData,
      total: sessionData.length 
    });

  } catch (error: any) {
    console.error('Get sessions error:', error);
    return NextResponse.json({ error: 'Failed to get sessions' }, { status: 500 });
  }
});

async function createEnhancedSession(lessonId: string, scenario: string, classId: string, instructorId: string) {
  // Get lesson definition
  const lesson = lessonLoader.getLesson(lessonId);
  if (!lesson) {
    return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });
  }

  // Verify class access
  const classData = await prisma.class.findFirst({
    where: { 
      id: classId,
      instructorId: instructorId
    }
  });

  if (!classData) {
    return NextResponse.json({ error: 'Class not found or access denied' }, { status: 403 });
  }

  // Create session
  const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const session = await enhancedSessionEngine.initializeSession(
    sessionId,
    lessonId,
    scenario,
    classId,
    lesson
  );

  // Create database record
  await prisma.simulationSession.create({
    data: {
      id: sessionId,
      lessonId: lessonId,
      classId: classId,
      scenario: scenario,
      duration: lesson.scenarios[scenario].duration,
      status: 'PENDING'
    }
  });

  return NextResponse.json({ 
    session: {
      id: session.id,
      lessonTitle: lesson.title,
      scenario: scenario,
      status: session.status,
      duration: lesson.scenarios[scenario].duration
    },
    message: 'Session created successfully' 
  });
}

async function startSession(sessionId: string) {
  await enhancedSessionEngine.startSession(sessionId);
  
  // Update database
  await prisma.simulationSession.update({
    where: { id: sessionId },
    data: { 
      status: 'IN_PROGRESS',
      startTime: new Date()
    }
  });

  const session = enhancedSessionEngine.getSession(sessionId);
  return NextResponse.json({ 
    session: session ? {
      id: session.id,
      status: session.status,
      startTime: session.startTime
    } : null,
    message: 'Session started successfully' 
  });
}

async function pauseSession(sessionId: string) {
  await enhancedSessionEngine.pauseSession(sessionId);
  
  await prisma.simulationSession.update({
    where: { id: sessionId },
    data: { status: 'PAUSED' }
  });

  return NextResponse.json({ message: 'Session paused successfully' });
}

async function resumeSession(sessionId: string) {
  await enhancedSessionEngine.resumeSession(sessionId);
  
  await prisma.simulationSession.update({
    where: { id: sessionId },
    data: { status: 'IN_PROGRESS' }
  });

  return NextResponse.json({ message: 'Session resumed successfully' });
}

async function endSession(sessionId: string, instructorId: string) {
  await enhancedSessionEngine.endSession(sessionId);
  
  await prisma.simulationSession.update({
    where: { id: sessionId },
    data: { 
      status: 'COMPLETED',
      endTime: new Date()
    }
  });

  return NextResponse.json({ message: 'Session ended successfully' });
}

async function executeManualCommand(sessionId: string, commandParams: any) {
  const { type, parameters } = commandParams;
  
  const command = {
    id: `manual_${Date.now()}`,
    type: type,
    timestamp: 0, // Execute immediately
    parameters: parameters,
    description: `Manual command: ${type}`
  };

  await enhancedSessionEngine.executeCommand(sessionId, command);
  
  return NextResponse.json({ 
    message: `Command ${type} executed successfully`,
    commandId: command.id
  });
}

async function getSessionStatus(sessionId: string) {
  const session = enhancedSessionEngine.getSession(sessionId);
  
  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  const participants = Array.from(session.participants.values()).map(p => ({
    id: p.id,
    username: p.username,
    role: p.role,
    isConnected: p.isConnected,
    privileges: Array.from(p.privileges),
    performance: p.performance
  }));

  const marketSymbols = Array.from(session.marketState.symbols.entries()).map(([symbol, data]) => ({
    symbol,
    price: data.price,
    volume: data.volume,
    lastUpdate: data.lastUpdate
  }));

  const activeAuctions = Array.from(session.marketState.auctionsActive.entries()).map(([id, auction]) => ({
    id,
    symbol: auction.symbol,
    endTime: auction.endTime,
    currentBid: auction.currentBid,
    highestBidder: auction.highestBidder
  }));

  return NextResponse.json({
    session: {
      id: session.id,
      lessonId: session.lessonId,
      lessonTitle: session.currentLesson.title,
      scenario: session.scenario,
      status: session.status,
      startTime: session.startTime,
      endTime: session.endTime,
      participants,
      marketState: {
        isOpen: session.marketState.isOpen,
        symbols: marketSymbols,
        activeAuctions,
        liquidityProviders: Array.from(session.marketState.liquidityProviders)
      },
      executedCommands: session.executedCommands.size,
      pendingCommands: session.pendingCommands.length,
      recentEvents: session.eventLog.slice(-10) // Last 10 events
    }
  });
}