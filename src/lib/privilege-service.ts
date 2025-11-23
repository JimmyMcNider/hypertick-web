/**
 * Privilege Service
 * 
 * Manages the upTick privilege system with 35+ trading window privileges
 * based on XML lesson configurations and user groups.
 */

import { prisma } from './prisma';

export interface UserPrivileges {
  userId: string;
  sessionId: string;
  privileges: number[];
  userGroup?: string;
}

interface PrivilegeDefinition {
  code: number;
  name: string;
  description: string;
  category: string;
}

// Cache for privilege definitions
let privilegeDefinitionsCache: PrivilegeDefinition[] = [];

/**
 * Load privilege definitions from database
 */
async function loadPrivilegeDefinitions(): Promise<PrivilegeDefinition[]> {
  if (privilegeDefinitionsCache.length > 0) {
    return privilegeDefinitionsCache;
  }

  const definitions = await prisma.privilegeDefinition.findMany({
    orderBy: { code: 'asc' }
  });

  privilegeDefinitionsCache = definitions.map(def => ({
    code: def.code,
    name: def.name,
    description: def.description,
    category: def.category
  }));

  return privilegeDefinitionsCache;
}

/**
 * Get privileges for a user in a specific session based on lesson configuration
 */
export async function getUserPrivileges(sessionId: string, userId: string): Promise<UserPrivileges> {
  try {
    console.log(`🔍 getUserPrivileges called for session ${sessionId}, user ${userId}`);
    
    // Get session and lesson information
    const session = await prisma.simulationSession.findUnique({
      where: { id: sessionId },
      include: {
        lesson: true
      }
    });

    console.log(`🔍 Session query result: ${session ? 'found' : 'not found'}`);
    
    if (session && session.lesson) {
      console.log(`🔍 Lesson found: ${session.lesson.name}`);
      
      // Get lesson commands separately
      const commands = await prisma.lessonCommand.findMany({
        where: { 
          lessonId: session.lesson.id,
          commandName: 'Grant Privilege'
        },
        orderBy: { order: 'asc' }
      });
      
      console.log(`🔍 Commands found: ${commands.length}`);
      
      // Add commands to session lesson object for compatibility
      (session.lesson as any).commands = commands;
    }

    console.log(`🔍 Database query completed. Session found: ${!!session}`);

    if (!session) {
      console.log('⚠️ Session not found:', sessionId, 'returning fallback privileges');
      return {
        userId,
        sessionId,
        privileges: getFallbackPrivileges(),
        userGroup: undefined
      };
    }

    if (!session.lesson) {
      console.log('⚠️ Lesson not found for session:', sessionId, 'returning fallback privileges');
      return {
        userId,
        sessionId,
        privileges: getFallbackPrivileges(),
        userGroup: undefined
      };
    }

    console.log(`🔐 Loading privileges for user ${userId} in session ${sessionId}`);
    console.log(`📚 Lesson: ${session.lesson.name}`);
    const lessonCommands = (session.lesson as any).commands || [];
    console.log(`📋 Available privilege commands: ${lessonCommands.length}`);

    // Get user info to determine their group
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Determine user group (for now, use role as group)
    const userGroup = user.role === 'STUDENT' ? '$Speculators' : 'Admin';

    // Extract privileges from lesson commands
    const grantedPrivileges: number[] = [];

    for (const command of lessonCommands) {
      if (command.commandName === 'Grant Privilege' && command.parameters.length > 0) {
        const privilegeCode = parseInt(command.parameters[0]);
        const targetGroup = command.targetGroup;

        // Grant privilege if no target group specified or if user matches target group
        if (!targetGroup || targetGroup === userGroup) {
          grantedPrivileges.push(privilegeCode);
          console.log(`✅ Granted privilege ${privilegeCode} to user ${userId} (group: ${userGroup})`);
        } else {
          console.log(`⏭️ Skipped privilege ${privilegeCode} (target: ${targetGroup}, user: ${userGroup})`);
        }
      }
    }

    // Add baseline privileges for all users
    const baselinePrivileges = [33]; // Lesson Window - all users need this
    for (const privilege of baselinePrivileges) {
      if (!grantedPrivileges.includes(privilege)) {
        grantedPrivileges.push(privilege);
      }
    }

    // If no privileges found, return fallback
    if (grantedPrivileges.length === 0) {
      console.log('⚠️ No privileges found in lesson, returning fallback');
      return {
        userId,
        sessionId,
        privileges: getFallbackPrivileges(),
        userGroup
      };
    }

    console.log(`🎯 Final privileges for ${userId}: [${grantedPrivileges.sort((a, b) => a - b).join(', ')}]`);

    return {
      userId,
      sessionId,
      privileges: grantedPrivileges.sort((a, b) => a - b),
      userGroup
    };

  } catch (error) {
    console.error('💥 Failed to get user privileges:', error);
    console.error('💥 Error details:', error instanceof Error ? error.message : 'Unknown error');
    console.error('💥 Error stack:', error instanceof Error ? error.stack : 'No stack');
    return {
      userId,
      sessionId,
      privileges: getFallbackPrivileges(),
      userGroup: undefined
    };
  }
}

/**
 * Get all privilege definitions
 */
export async function getPrivilegeDefinitions(): Promise<PrivilegeDefinition[]> {
  return await loadPrivilegeDefinitions();
}

/**
 * Get privilege definition by code
 */
export async function getPrivilegeDefinition(code: number): Promise<PrivilegeDefinition | null> {
  const definitions = await loadPrivilegeDefinitions();
  return definitions.find(def => def.code === code) || null;
}

/**
 * Check if user has a specific privilege
 */
export async function userHasPrivilege(sessionId: string, userId: string, privilegeCode: number): Promise<boolean> {
  const userPrivileges = await getUserPrivileges(sessionId, userId);
  return userPrivileges.privileges.includes(privilegeCode);
}

/**
 * Get privileges by category
 */
export async function getPrivilegesByCategory(category: string): Promise<PrivilegeDefinition[]> {
  const definitions = await loadPrivilegeDefinitions();
  return definitions.filter(def => def.category === category);
}

/**
 * Fallback privileges for when lesson data is not available
 */
function getFallbackPrivileges(): number[] {
  return [
    8,  // Market Order Window
    9,  // Montage
    10, // Trade Window
    13, // Portfolio Window
    15, // Market Watch Window
    22, // Market Making Rights
    33  // Lesson Window
  ];
}

/**
 * Get trading window privileges (the main ones students need)
 */
export function getTradingWindowPrivileges(): number[] {
  return [
    1,  // Analyst Window
    4,  // Buying Power Window
    8,  // Market Order Window
    9,  // Montage
    10, // Trade Window
    12, // Order Log Window
    13, // Portfolio Window
    15, // Market Watch Window
    18, // Single Security Graph
    22, // Market Making Rights
    29, // Bump Buttons
    31  // Auto-Trading Window
  ];
}

/**
 * Get information and analysis privileges
 */
export function getInformationPrivileges(): number[] {
  return [
    5,  // Event Window
    11, // News Window
    23, // Premium Analyst Signals
    33, // Lesson Window
    34  // Excel Link
  ];
}

/**
 * Get auction and advanced privileges
 */
export function getAuctionPrivileges(): number[] {
  return [
    32  // Auction Window
  ];
}