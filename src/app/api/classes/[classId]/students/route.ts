import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

// GET /api/classes/[classId]/students - Get students enrolled in class
export const GET = requireAuth(async (request: NextRequest & { user: any }, { params }: { params: { classId: string } }) => {
  try {
    const { classId } = params;

    // Verify user has access to this class
    const classAccess = await prisma.classInstructor.findUnique({
      where: {
        classId_instructorId: {
          classId,
          instructorId: request.user.id
        }
      }
    });

    if (!classAccess && request.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Access denied to class' }, { status: 403 });
    }

    // Get enrolled students
    const enrollments = await prisma.classEnrollment.findMany({
      where: {
        classId,
        isActive: true
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            email: true,
            lastLogin: true,
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
      enrollmentDate: enrollment.enrolledAt,
      isActive: enrollment.isActive,
      lastLogin: enrollment.user.lastLogin,
      canvasId: enrollment.canvasId
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
    const classAccess = await prisma.classInstructor.findUnique({
      where: {
        classId_instructorId: {
          classId,
          instructorId: request.user.id
        }
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
        let user = await prisma.users.findFirst({
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

          user = await prisma.users.create({
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
            classId_userId: {
              classId,
              userId: user.id
            }
          }
        });

        if (existingEnrollment) {
          if (!existingEnrollment.isActive) {
            // Reactivate enrollment
            await prisma.classEnrollment.update({
              where: {
                classId_userId: {
                  classId,
                  userId: user.id
                }
              },
              data: {
                isActive: true,
                canvasId: studentData.canvasId || existingEnrollment.canvasId
              }
            });
            imported++;
          } else {
            skipped++;
          }
        } else {
          // Create new enrollment
          await prisma.classEnrollment.create({
            data: {
              classId,
              userId: user.id,
              canvasId: studentData.canvasId,
              isActive: true
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
    const classAccess = await prisma.classInstructor.findUnique({
      where: {
        classId_instructorId: {
          classId,
          instructorId: request.user.id
        }
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

    // Deactivate enrollments instead of deleting (to preserve history)
    const result = await prisma.classEnrollment.updateMany({
      where: {
        classId,
        userId: {
          in: studentIds
        }
      },
      data: {
        isActive: false
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