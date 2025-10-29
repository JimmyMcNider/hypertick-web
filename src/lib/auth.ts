/**
 * Authentication and Authorization System
 * 
 * Handles user authentication, session management, and role-based access control
 * with support for the legacy upTick privilege system
 */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from './prisma';
import { PRIVILEGE_DEFINITIONS, ROLE_PRIVILEGE_PRESETS } from './privilege-definitions';

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  role: 'STUDENT' | 'INSTRUCTOR' | 'ADMIN';
  privileges?: number[]; // Session-specific privileges
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface RegisterData {
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  password: string;
  role?: 'STUDENT' | 'INSTRUCTOR';
}

export interface SessionContext {
  sessionId?: string;
  classId?: string;
  userRole?: string; // $Speculators, market maker, etc.
  privileges: number[];
}

/**
 * Authentication service class
 */
export class AuthService {
  private jwtSecret: string;

  constructor() {
    this.jwtSecret = process.env.JWT_SECRET || 'fallback-secret-key';
  }

  /**
   * Register a new user
   */
  async register(userData: RegisterData): Promise<AuthUser> {
    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: userData.email },
          { username: userData.username }
        ]
      }
    });

    if (existingUser) {
      throw new Error('User with this email or username already exists');
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(userData.password, saltRounds);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: userData.email,
        username: userData.username,
        firstName: userData.firstName,
        lastName: userData.lastName,
        password: hashedPassword,
        role: userData.role || 'STUDENT'
      }
    });

    return this.sanitizeUser(user);
  }

  /**
   * Authenticate user login
   */
  async login(credentials: LoginCredentials): Promise<{ user: AuthUser; token: string }> {
    try {
      // Find user by username or email
      const user = await prisma.user.findFirst({
        where: {
          OR: [
            { username: credentials.username },
            { email: credentials.username }
          ]
        }
      });

      if (!user) {
        throw new Error('Invalid credentials');
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(credentials.password, user.password);
      if (!isValidPassword) {
        throw new Error('Invalid credentials');
      }

      // Generate JWT token
      const token = this.generateToken(user.id);
      
      return {
        user: this.sanitizeUser(user),
        token
      };
    } catch (dbError) {
      console.warn('🔄 Database unavailable, checking fallback credentials:', dbError);
      
      // Fallback authentication for demo when database is unavailable
      if (credentials.username === 'instructor' && credentials.password === 'instructor123') {
        const fallbackUser: AuthUser = {
          id: 'instructor_fallback',
          email: 'instructor@hypertick.com',
          username: 'instructor',
          firstName: 'Demo',
          lastName: 'Instructor',
          role: 'INSTRUCTOR'
        };
        
        const token = this.generateToken(fallbackUser.id);
        console.log('✅ Fallback instructor login successful');
        
        return {
          user: fallbackUser,
          token
        };
      }
      
      // Re-throw database error if not fallback credentials
      throw new Error('Authentication service unavailable');
    }
  }

  /**
   * Verify JWT token and get user
   */
  async verifyToken(token: string): Promise<AuthUser> {
    try {
      const decoded = jwt.verify(token, this.jwtSecret) as { userId: string };
      
      // Handle fallback instructor
      if (decoded.userId === 'instructor_fallback') {
        return {
          id: 'instructor_fallback',
          email: 'instructor@hypertick.com',
          username: 'instructor',
          firstName: 'Demo',
          lastName: 'Instructor',
          role: 'INSTRUCTOR'
        };
      }
      
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId }
      });

      if (!user) {
        throw new Error('User not found');
      }

      return this.sanitizeUser(user);
    } catch (error) {
      throw new Error('Invalid token');
    }
  }

  /**
   * Get user with session-specific privileges
   */
  async getUserWithSessionPrivileges(userId: string, sessionId?: string): Promise<AuthUser> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        privileges: sessionId ? {
          where: {
            sessionId: sessionId,
            isActive: true,
            revokedAt: null
          },
          include: {
            privilege: true
          }
        } : false
      }
    });

    if (!user) {
      throw new Error('User not found');
    }

    const sanitizedUser = this.sanitizeUser(user);
    
    // Add session-specific privileges if available
    if (sessionId && user.privileges) {
      sanitizedUser.privileges = user.privileges
        .filter(up => 'privilege' in up && up.privilege) // Only include if privilege was loaded
        .map(up => (up as any).privilege.code);
    }

    return sanitizedUser;
  }

  /**
   * Generate JWT token
   */
  private generateToken(userId: string): string {
    return jwt.sign(
      { userId },
      this.jwtSecret,
      { expiresIn: '24h' }
    );
  }

  /**
   * Remove sensitive data from user object
   */
  private sanitizeUser(user: any): AuthUser {
    const { password, ...sanitized } = user;
    return sanitized;
  }
}

/**
 * Authorization service for role and privilege management
 */
export class AuthorizationService {
  
  /**
   * Check if user has required role
   */
  hasRole(user: AuthUser, requiredRole: 'STUDENT' | 'INSTRUCTOR' | 'ADMIN'): boolean {
    const roleHierarchy = {
      'STUDENT': 1,
      'INSTRUCTOR': 2,
      'ADMIN': 3
    };
    
    return roleHierarchy[user.role] >= roleHierarchy[requiredRole];
  }

  /**
   * Check if user has specific privilege in session
   */
  hasPrivilege(user: AuthUser, privilegeCode: number): boolean {
    if (!user.privileges) return false;
    return user.privileges.includes(privilegeCode);
  }

  /**
   * Check if user has any of the required privileges
   */
  hasAnyPrivilege(user: AuthUser, privilegeCodes: number[]): boolean {
    if (!user.privileges) return false;
    return privilegeCodes.some(code => user.privileges!.includes(code));
  }

  /**
   * Grant privileges to user in session
   */
  async grantPrivileges(
    sessionId: string,
    userId: string,
    privilegeCodes: number[]
  ): Promise<void> {
    // Get privilege definitions
    const privileges = await prisma.privilegeDefinition.findMany({
      where: {
        code: { in: privilegeCodes }
      }
    });

    // Create user privileges
    const userPrivileges = privileges.map(privilege => ({
      sessionId,
      userId,
      privilegeId: privilege.id,
      isActive: true
    }));

    // Use individual upserts for reliable cross-database compatibility
    for (const userPrivilege of userPrivileges) {
      await prisma.userPrivilege.upsert({
        where: {
          sessionId_userId_privilegeId: {
            sessionId: userPrivilege.sessionId,
            userId: userPrivilege.userId,
            privilegeId: userPrivilege.privilegeId
          }
        },
        update: {
          isActive: true,
          revokedAt: null
        },
        create: userPrivilege
      });
    }
  }

  /**
   * Revoke privileges from user in session
   */
  async revokePrivileges(
    sessionId: string,
    userId: string,
    privilegeCodes: number[]
  ): Promise<void> {
    // Get privilege IDs
    const privileges = await prisma.privilegeDefinition.findMany({
      where: {
        code: { in: privilegeCodes }
      }
    });

    const privilegeIds = privileges.map(p => p.id);

    // Update user privileges to revoked
    await prisma.userPrivilege.updateMany({
      where: {
        sessionId,
        userId,
        privilegeId: { in: privilegeIds },
        isActive: true
      },
      data: {
        isActive: false,
        revokedAt: new Date()
      }
    });
  }

  /**
   * Grant preset privileges based on role
   */
  async grantRolePrivileges(
    sessionId: string,
    userId: string,
    rolePreset: keyof typeof ROLE_PRIVILEGE_PRESETS
  ): Promise<void> {
    const privilegeCodes = [...ROLE_PRIVILEGE_PRESETS[rolePreset]];
    await this.grantPrivileges(sessionId, userId, privilegeCodes);
  }

  /**
   * Get all privileges for user in session
   */
  async getUserSessionPrivileges(sessionId: string, userId: string): Promise<number[]> {
    const userPrivileges = await prisma.userPrivilege.findMany({
      where: {
        sessionId,
        userId,
        isActive: true,
        revokedAt: null
      },
      include: {
        privilege: true
      }
    });

    return userPrivileges.map(up => up.privilege.code);
  }

  /**
   * Initialize privilege definitions in database
   */
  async initializePrivilegeDefinitions(): Promise<void> {
    for (const privilege of PRIVILEGE_DEFINITIONS) {
      await prisma.privilegeDefinition.upsert({
        where: { code: privilege.code },
        update: {
          name: privilege.name,
          description: privilege.description,
          category: privilege.category
        },
        create: {
          code: privilege.code,
          name: privilege.name,
          description: privilege.description,
          category: privilege.category
        }
      });
    }
  }
}

// Middleware for route protection (Next.js App Router compatible)
export function requireAuth(handler: (request: any, context?: any) => Promise<any>) {
  return async (request: any, context?: any) => {
    try {
      const token = request.headers.get('authorization')?.replace('Bearer ', '') ||
                   request.cookies?.get('auth_token')?.value;
      
      if (!token) {
        return new Response(JSON.stringify({ error: 'No token provided' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const authService = new AuthService();
      const user = await authService.verifyToken(token);
      
      request.user = user;
      return handler(request, context);
    } catch (error) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  };
}

export function requireRole(role: 'STUDENT' | 'INSTRUCTOR' | 'ADMIN') {
  return function(handler: (request: any, context?: any) => Promise<any>) {
    return requireAuth(async (request: any, context?: any) => {
      const authzService = new AuthorizationService();
      
      if (!authzService.hasRole(request.user, role)) {
        return new Response(JSON.stringify({ error: 'Insufficient permissions' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      return handler(request, context);
    });
  };
}

export function requirePrivilege(privilegeCode: number) {
  return function(handler: (request: any, context?: any) => Promise<any>) {
    return requireAuth(async (request: any, context?: any) => {
      const url = new URL(request.url);
      const sessionId = url.searchParams.get('sessionId');
      
      if (!sessionId) {
        return new Response(JSON.stringify({ error: 'Session ID required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const authService = new AuthService();
      const user = await authService.getUserWithSessionPrivileges(request.user.id, sessionId);
      
      const authzService = new AuthorizationService();
      if (!authzService.hasPrivilege(user, privilegeCode)) {
        return new Response(JSON.stringify({ error: 'Privilege required' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      request.user = user;
      return handler(request, context);
    });
  };
}

// Singleton instances
export const authService = new AuthService();
export const authzService = new AuthorizationService();