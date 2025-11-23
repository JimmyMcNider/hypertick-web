/**
 * Simple Authentication System
 * 
 * No JWT complexity, no middleware failures, just basic username/password
 * authentication that actually works in production.
 */

import bcrypt from 'bcryptjs';
import { prisma } from './prisma';

export interface SimpleUser {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  role: 'STUDENT' | 'INSTRUCTOR' | 'ADMIN';
}

export interface LoginCredentials {
  username: string;
  password: string;
}

/**
 * Simple login function - no JWT, no complex middleware
 */
export async function simpleLogin(credentials: LoginCredentials): Promise<SimpleUser | null> {
  try {
    console.log('🔑 Simple login attempt for:', credentials.username);

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { username: credentials.username },
          { email: credentials.username }
        ]
      }
    });

    if (!user) {
      console.log('❌ User not found:', credentials.username);
      return null;
    }

    const isValidPassword = await bcrypt.compare(credentials.password, user.password);
    if (!isValidPassword) {
      console.log('❌ Invalid password for:', credentials.username);
      return null;
    }

    console.log('✅ Login successful for:', user.username, 'Role:', user.role);

    return {
      id: user.id,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role as 'STUDENT' | 'INSTRUCTOR' | 'ADMIN'
    };

  } catch (error) {
    console.error('💥 Login error:', error);
    return null;
  }
}

/**
 * Create a demo user account
 */
export async function createDemoUser(userData: {
  username: string;
  password: string;
  firstName: string;
  lastName: string;
  email: string;
  role: 'STUDENT' | 'INSTRUCTOR' | 'ADMIN';
}): Promise<SimpleUser> {
  const hashedPassword = await bcrypt.hash(userData.password, 12);

  const user = await prisma.user.create({
    data: {
      username: userData.username,
      email: userData.email,
      firstName: userData.firstName,
      lastName: userData.lastName,
      role: userData.role,
      password: hashedPassword
    }
  });

  return {
    id: user.id,
    username: user.username,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    role: user.role as 'STUDENT' | 'INSTRUCTOR' | 'ADMIN'
  };
}

/**
 * Initialize demo accounts for testing
 */
export async function initializeDemoAccounts() {
  console.log('🎭 Initializing demo accounts...');

  // Create demo instructor
  try {
    const existingInstructor = await prisma.user.findUnique({
      where: { username: 'instructor' }
    });

    if (!existingInstructor) {
      await createDemoUser({
        username: 'instructor',
        password: 'instructor123',
        firstName: 'Demo',
        lastName: 'Instructor',
        email: 'instructor@hypertick.com',
        role: 'INSTRUCTOR'
      });
      console.log('✅ Created demo instructor');
    }
  } catch (error) {
    console.log('⚠️ Instructor already exists or creation failed');
  }

  // Create demo students
  const students = [
    { username: 'student1', name: 'Alice Johnson' },
    { username: 'student2', name: 'Bob Chen' },
    { username: 'student3', name: 'Carol Davis' },
    { username: 'student4', name: 'David Wilson' },
    { username: 'student5', name: 'Eve Martinez' }
  ];

  for (const student of students) {
    try {
      const existing = await prisma.user.findUnique({
        where: { username: student.username }
      });

      if (!existing) {
        const [firstName, lastName] = student.name.split(' ');
        await createDemoUser({
          username: student.username,
          password: 'student123',
          firstName,
          lastName,
          email: `${student.username}@hypertick.com`,
          role: 'STUDENT'
        });
        console.log(`✅ Created demo student: ${student.name}`);
      }
    } catch (error) {
      console.log(`⚠️ Student ${student.username} already exists or creation failed`);
    }
  }

  console.log('🎉 Demo accounts initialization complete');
}