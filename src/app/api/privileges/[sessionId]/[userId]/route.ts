/**
 * User Privileges API
 * 
 * Returns the privileges granted to a specific user in a session
 * based on the lesson XML configuration.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUserPrivileges, getPrivilegeDefinitions } from '@/lib/privilege-service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string; userId: string }> }
) {
  try {
    const { sessionId, userId } = await params;

    console.log(`🔐 API: Getting privileges for user ${userId} in session ${sessionId}`);

    // Get user privileges
    const userPrivileges = await getUserPrivileges(sessionId, userId);

    // Get privilege definitions for context
    const allDefinitions = await getPrivilegeDefinitions();
    
    // Create detailed privilege information
    const privilegeDetails = userPrivileges.privileges.map(code => {
      const definition = allDefinitions.find(def => def.code === code);
      return {
        code,
        name: definition?.name || `Privilege ${code}`,
        description: definition?.description || 'No description available',
        category: definition?.category || 'Unknown'
      };
    });

    const response = {
      userId: userPrivileges.userId,
      sessionId: userPrivileges.sessionId,
      userGroup: userPrivileges.userGroup,
      privileges: userPrivileges.privileges,
      privilegeDetails,
      totalCount: userPrivileges.privileges.length,
      timestamp: new Date().toISOString()
    };

    console.log(`✅ API: Returning ${userPrivileges.privileges.length} privileges for user ${userId}`);

    return NextResponse.json(response);

  } catch (error) {
    console.error('💥 API: Failed to get user privileges:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to get user privileges',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  }
}