import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

// GET /api/classes/[classId]/students - Get students enrolled in class
export const GET = requireAuth(async (request: NextRequest & { user: any }, { params }: { params: { classId: string } }) => {
  try {
    const { classId } = params;

    // Verify user has access to this class
    const classAccess = await prisma.class.findUnique({
      where: {
        id: classId,
        instructorId: request.user.id
      }
    });

    if (!classAccess && request.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Access denied to class' }, { status: 403 });
    }

    // Get enrolled students
    const enrollments = await prisma.classEnrollment.findMany({
      where: {
        classId
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            email: true,
            createdAt: true
          }
        }
      },
      orderBy: {
        user: {
          lastName: 'asc'
        }
      }
    });

    const students = enrollments.map(enrollment => ({
      id: enrollment.user.id,
      username: enrollment.user.username,
      firstName: enrollment.user.firstName,
      lastName: enrollment.user.lastName,
      email: enrollment.user.email,
      enrollmentDate: enrollment.user.createdAt, // Use user creation date as fallback
      isActive: true, // Default value
      lastLogin: null, // Field doesn't exist in User model
      canvasId: null // Field doesn't exist in ClassEnrollment model
    }));

    return NextResponse.json({ students });

  } catch (error: any) {
    console.error('Error fetching students:', error);
    return NextResponse.json({ error: 'Failed to fetch students' }, { status: 500 });
  }
});

// POST /api/classes/[classId]/students - Add students to class
export const POST = requireAuth(async (request: NextRequest & { user: any }, { params }: { params: { classId: string } }) => {
  try {
    const { classId } = params;

    // Verify user has access to this class
    const classAccess = await prisma.class.findUnique({
      where: {
        id: classId,
        instructorId: request.user.id
      }
    });

    if (!classAccess && request.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Access denied to class' }, { status: 403 });
    }

    const body = await request.json();
    const { students, source } = body;

    if (!Array.isArray(students) || students.length === 0) {
      return NextResponse.json({ error: 'No students provided' }, { status: 400 });
    }

    let imported = 0;
    let skipped = 0;

    for (const studentData of students) {
      try {
        // Validate required fields
        if (!studentData.firstName || !studentData.lastName) {
          skipped++;
          continue;
        }

        // Generate username if not provided
        if (!studentData.username) {
          if (studentData.email) {
            studentData.username = studentData.email.split('@')[0];
          } else {
            studentData.username = `${studentData.firstName.toLowerCase()}.${studentData.lastName.toLowerCase()}`.replace(/[^a-z0-9.]/g, '');
          }
        }

        // Generate email if not provided
        if (!studentData.email) {
          studentData.email = `${studentData.username}@university.edu`;
        }

        // Check if user already exists
        let user = await prisma.user.findFirst({
          where: {
            OR: [
              { username: studentData.username },
              { email: studentData.email }
            ]
          }
        });

        // Create user if doesn't exist
        if (!user) {
          const hashedPassword = await bcrypt.hash('student123', 10);

          user = await prisma.user.create({
            data: {
              username: studentData.username,
              email: studentData.email,
              firstName: studentData.firstName,
              lastName: studentData.lastName,
              password: hashedPassword,
              role: 'STUDENT'
            }
          });
        }

        // Check if already enrolled in this class
        const existingEnrollment = await prisma.classEnrollment.findUnique({
          where: {
            userId_classId: {
              userId: user.id,
              classId
            }
          }
        });

        if (existingEnrollment) {
          // Student already enrolled, skip
          skipped++;
        } else {
          // Create new enrollment
          await prisma.classEnrollment.create({
            data: {
              classId,
              userId: user.id
            }
          });
          imported++;
        }

      } catch (error) {
        console.error('Error processing student:', studentData, error);
        skipped++;
      }
    }

    return NextResponse.json({ 
      message: 'Students processed successfully',
      imported,
      skipped,
      total: students.length
    });

  } catch (error: any) {
    console.error('Error adding students:', error);
    return NextResponse.json({ error: 'Failed to add students' }, { status: 500 });
  }
});

// DELETE /api/classes/[classId]/students - Remove students from class
export const DELETE = requireAuth(async (request: NextRequest & { user: any }, { params }: { params: { classId: string } }) => {
  try {
    const { classId } = params;

    // Verify user has access to this class
    const classAccess = await prisma.class.findUnique({
      where: {
        id: classId,
        instructorId: request.user.id
      }
    });

    if (!classAccess && request.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Access denied to class' }, { status: 403 });
    }

    const body = await request.json();
    const { studentIds } = body;

    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      return NextResponse.json({ error: 'No student IDs provided' }, { status: 400 });
    }

    // Remove enrollments
    const result = await prisma.classEnrollment.deleteMany({
      where: {
        classId,
        userId: {
          in: studentIds
        }
      }
    });

    return NextResponse.json({ 
      message: 'Students removed successfully',
      removedCount: result.count
    });

  } catch (error: any) {
    console.error('Error removing students:', error);
    return NextResponse.json({ error: 'Failed to remove students' }, { status: 500 });
  }
});