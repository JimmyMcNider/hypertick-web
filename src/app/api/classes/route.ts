/**
 * Classes API Routes
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/classes - List classes  
export const GET = requireAuth(async (request: NextRequest & { user: any }) => {
  try {
    let classes;

    if (request.user.role === 'INSTRUCTOR') {
      // Instructors see only their classes
      classes = await prisma.class.findMany({
        where: { 
          instructorId: request.user.id,
          isActive: true 
        },
        include: {
          _count: {
            select: { enrollments: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
    } else if (request.user.role === 'ADMIN') {
      // Admins see all classes
      classes = await prisma.class.findMany({
        where: { isActive: true },
        include: {
          instructor: { 
            select: { username: true, firstName: true, lastName: true } 
          },
          _count: {
            select: { enrollments: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
    } else {
      // Students see only enrolled classes
      classes = await prisma.class.findMany({
        where: {
          enrollments: {
            some: { userId: request.user.id }
          },
          isActive: true
        },
        include: {
          instructor: { 
            select: { username: true, firstName: true, lastName: true } 
          }
        },
        orderBy: { createdAt: 'desc' }
      });
    }

    return NextResponse.json({ classes });

  } catch (error: any) {
    console.error('Classes fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch classes' },
      { status: 500 }
    );
  }
});

// POST /api/classes - Create new class (instructors and admins)
export const POST = requireRole('INSTRUCTOR')(async (request: NextRequest & { user: any }) => {
  try {
    const body = await request.json();
    const { name, semester, section } = body;

    // Validate required fields
    if (!name || !semester) {
      return NextResponse.json(
        { error: 'Name and semester are required' },
        { status: 400 }
      );
    }

    // Create class
    const newClass = await prisma.class.create({
      data: {
        name,
        semester,
        section,
        instructorId: request.user.id,
        isActive: true
      }
    });

    return NextResponse.json({
      message: 'Class created successfully',
      class: newClass
    });

  } catch (error: any) {
    console.error('Class creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create class' },
      { status: 500 }
    );
  }
});