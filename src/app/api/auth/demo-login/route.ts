/**
 * Demo Login API - Quick login for production demo
 * 
 * Provides instant login for demo instructor account
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export async function POST(request: NextRequest) {
  try {
    console.log('🎭 Demo login requested');

    // Find or create demo instructor
    let instructor = await prisma.user.findUnique({
      where: { email: 'instructor@hypertick.com' }
    });

    if (!instructor) {
      console.log('📝 Creating demo instructor account...');
      const hashedPassword = await bcrypt.hash('instructor123', 12);
      instructor = await prisma.user.create({
        data: {
          username: 'instructor',
          email: 'instructor@hypertick.com',
          firstName: 'Demo',
          lastName: 'Instructor',
          role: 'INSTRUCTOR',
          password: hashedPassword
        }
      });
    }

    // Generate JWT token
    const jwtSecret = process.env.JWT_SECRET || 'default-jwt-secret-for-demo';
    const token = jwt.sign(
      {
        userId: instructor.id,
        email: instructor.email,
        username: instructor.username,
        role: instructor.role
      },
      jwtSecret,
      { expiresIn: '24h' }
    );

    console.log('✅ Demo login successful for:', instructor.username);

    return NextResponse.json({
      success: true,
      message: 'Demo login successful',
      user: {
        id: instructor.id,
        email: instructor.email,
        username: instructor.username,
        firstName: instructor.firstName,
        lastName: instructor.lastName,
        role: instructor.role
      },
      token
    });

  } catch (error) {
    console.error('❌ Demo login failed:', error);
    return NextResponse.json({
      success: false,
      error: 'Demo login failed',
      message: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}