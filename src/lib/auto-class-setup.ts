/**
 * Auto Class Setup - Ensures every instructor has at least one class
 * 
 * This prevents "Access denied to class" errors by automatically creating
 * a default class for new instructors
 */

import { prisma } from './prisma';
import bcrypt from 'bcryptjs';

export interface AutoSetupResult {
  success: boolean;
  classId?: string;
  message: string;
  studentsCreated?: number;
}

/**
 * Ensures an instructor has at least one class with demo students
 */
export async function ensureInstructorHasClass(userId: string, username: string): Promise<AutoSetupResult> {
  try {
    console.log(`🎓 Checking if instructor ${username} (${userId}) has classes...`);
    
    // Check if instructor already has classes
    const existingClasses = await prisma.class.findMany({
      where: { 
        instructorId: userId,
        isActive: true 
      }
    });

    if (existingClasses.length > 0) {
      console.log(`✅ Instructor ${username} already has ${existingClasses.length} classes`);
      return {
        success: true,
        classId: existingClasses[0].id,
        message: `Found ${existingClasses.length} existing classes`
      };
    }

    console.log(`🏗️ Creating default class for instructor ${username}...`);

    // Create default class
    const defaultClass = await prisma.class.create({
      data: {
        name: 'My Trading Class',
        semester: `Fall ${new Date().getFullYear()}`,
        section: 'Section 1',
        instructorId: userId,
        isActive: true
      }
    });

    console.log(`✅ Created default class: ${defaultClass.id}`);

    // Create demo students for the class
    const demoStudents = [
      { firstName: 'Alice', lastName: 'Johnson', email: 'alice.johnson@demo.edu' },
      { firstName: 'Bob', lastName: 'Smith', email: 'bob.smith@demo.edu' },
      { firstName: 'Carol', lastName: 'Davis', email: 'carol.davis@demo.edu' },
      { firstName: 'David', lastName: 'Wilson', email: 'david.wilson@demo.edu' },
      { firstName: 'Emma', lastName: 'Brown', email: 'emma.brown@demo.edu' }
    ];

    let studentsCreated = 0;
    const hashedPassword = await bcrypt.hash('student123', 10);

    for (const studentData of demoStudents) {
      try {
        // Check if student user already exists
        let student = await prisma.user.findUnique({
          where: { email: studentData.email }
        });

        // Create student user if doesn't exist
        if (!student) {
          student = await prisma.user.create({
            data: {
              username: studentData.email.split('@')[0],
              email: studentData.email,
              firstName: studentData.firstName,
              lastName: studentData.lastName,
              password: hashedPassword,
              role: 'STUDENT'
            }
          });
        }

        // Enroll student in the class
        await prisma.classEnrollment.create({
          data: {
            classId: defaultClass.id,
            userId: student.id
          }
        });

        studentsCreated++;
      } catch (error) {
        console.log(`⚠️ Could not create demo student ${studentData.firstName}:`, error);
      }
    }

    console.log(`🎯 Auto-setup completed: Created class ${defaultClass.id} with ${studentsCreated} demo students`);

    return {
      success: true,
      classId: defaultClass.id,
      message: `Created default class with ${studentsCreated} demo students`,
      studentsCreated
    };

  } catch (error) {
    console.error('❌ Auto class setup failed:', error);
    return {
      success: false,
      message: `Auto-setup failed: ${(error as Error).message}`
    };
  }
}

/**
 * Gets or creates a default class for an instructor
 */
export async function getOrCreateDefaultClass(userId: string, username: string): Promise<string | null> {
  const result = await ensureInstructorHasClass(userId, username);
  return result.success ? result.classId || null : null;
}