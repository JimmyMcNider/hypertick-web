/**
 * Student UI Permissions API
 * 
 * Returns UI permissions based on the current session's lesson configuration
 * and the student's granted privileges.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/instructor-session';
import { getUIPermissions, getVisibleWindows, getOrderTypeRestrictions, getThemeOptions, getSecurityRestrictions } from '@/lib/ui-permissions';

/**
 * GET - Get UI permissions for student in current session
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const userId = searchParams.get('userId');
    
    if (!sessionId || !userId) {
      return NextResponse.json(
        { error: 'Session ID and user ID required' },
        { status: 400 }
      );
    }
    
    // Get session to determine lesson
    const session = getSession(sessionId);
    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }
    
    // Check if user is in the session
    const isInSession = session.waitingStudents.includes(userId) || 
                       session.activeStudents.includes(userId);
    
    if (!isInSession) {
      return NextResponse.json(
        { error: 'User not in this session' },
        { status: 403 }
      );
    }
    
    // For now, use default privileges based on lesson type
    // TODO: Load actual user privileges from database/lesson XML
    let defaultPrivileges: number[] = [];
    
    // Assign default privileges based on lesson complexity
    if (session.lessonName.toLowerCase().includes('price formation')) {
      // Basic lesson: Market Order, Portfolio, Market Watch only
      defaultPrivileges = [8, 13, 15]; // Market Order Window, Portfolio, Market Watch
    } else if (session.lessonName.toLowerCase().includes('efficiency')) {
      // Intermediate lesson: Add Montage, Order Log, Trade Window
      defaultPrivileges = [8, 9, 10, 12, 13, 15, 18]; // + Montage, Trade Window, Order Log, Security Graph
    } else {
      // Advanced lesson: Full privileges
      defaultPrivileges = [1, 4, 5, 8, 9, 10, 11, 12, 13, 15, 18, 22, 23, 29]; // Most windows
    }
    
    // Get UI permissions
    const uiPermissions = getUIPermissions(session.lessonName, defaultPrivileges);
    const visibleWindows = getVisibleWindows(uiPermissions);
    const orderRestrictions = getOrderTypeRestrictions(uiPermissions);
    const themeOptions = getThemeOptions(uiPermissions);
    const securityRestrictions = getSecurityRestrictions(uiPermissions);
    
    console.log(`🎨 Generated UI permissions for ${userId} in ${session.lessonName}:`);
    console.log(`   Windows: ${visibleWindows.length} available`);
    console.log(`   Order Types: ${orderRestrictions.allowedTypes.join(', ')}`);
    console.log(`   Complexity: ${uiPermissions.complexity}`);
    console.log(`   Dark Mode: ${themeOptions.allowDarkMode ? 'Enabled' : 'Disabled'}`);
    
    return NextResponse.json({
      success: true,
      sessionId,
      userId,
      lesson: {
        name: session.lessonName,
        status: session.status,
        complexity: uiPermissions.complexity
      },
      permissions: uiPermissions,
      ui: {
        visibleWindows,
        orderRestrictions,
        themeOptions,
        securityRestrictions
      },
      privileges: {
        codes: defaultPrivileges,
        total: defaultPrivileges.length
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Failed to get UI permissions:', error);
    return NextResponse.json(
      { error: 'Failed to get UI permissions' },
      { status: 500 }
    );
  }
}