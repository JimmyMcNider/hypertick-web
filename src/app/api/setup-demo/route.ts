/**
 * Demo Setup API - Creates sample data for testing
 * 
 * Creates demo classes, students, and initial data for testing
 * the instructor dashboard functionality
 */

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient, SimulationStatus, OrderType, OrderSide, OrderStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    console.log('Starting demo setup...');

    // Create sample instructor if not exists
    const instructorEmail = 'instructor@demo.com';
    let instructor = await prisma.user.findUnique({
      where: { email: instructorEmail }
    });

    if (!instructor) {
      const hashedPassword = await bcrypt.hash('demo123', 10);
      instructor = await prisma.user.create({
        data: {
          username: 'instructor_demo',
          email: instructorEmail,
          firstName: 'Demo',
          lastName: 'Instructor',
          role: 'INSTRUCTOR',
          password: hashedPassword
        }
      });
      console.log('Created demo instructor');
    }

    // Create sample classes
    const classes = [
      {
        name: 'Financial Markets 101',
        semester: 'Fall 2024',
        section: 'A',
        instructorId: instructor.id
      },
      {
        name: 'Advanced Trading Strategies',
        semester: 'Fall 2024', 
        section: 'B',
        instructorId: instructor.id
      }
    ];

    const createdClasses = [];
    for (const classData of classes) {
      let existingClass = await prisma.class.findFirst({
        where: {
          name: classData.name,
          instructorId: instructor.id
        }
      });

      if (!existingClass) {
        existingClass = await prisma.class.create({
          data: classData
        });
        console.log(`Created class: ${classData.name}`);
      }
      createdClasses.push(existingClass);
    }

    // Create sample students
    const students = [
      { username: 'alice_demo', email: 'alice@demo.com', firstName: 'Alice', lastName: 'Johnson' },
      { username: 'bob_demo', email: 'bob@demo.com', firstName: 'Bob', lastName: 'Chen' },
      { username: 'carol_demo', email: 'carol@demo.com', firstName: 'Carol', lastName: 'Davis' },
      { username: 'david_demo', email: 'david@demo.com', firstName: 'David', lastName: 'Wilson' },
      { username: 'eve_demo', email: 'eve@demo.com', firstName: 'Eve', lastName: 'Martinez' }
    ];

    const createdStudents = [];
    for (const studentData of students) {
      let student = await prisma.user.findUnique({
        where: { email: studentData.email }
      });

      if (!student) {
        const hashedPassword = await bcrypt.hash('demo123', 10);
        student = await prisma.user.create({
          data: {
            ...studentData,
            role: 'STUDENT',
            password: hashedPassword
          }
        });
        console.log(`Created student: ${studentData.firstName} ${studentData.lastName}`);
      }
      createdStudents.push(student);
    }

    // Enroll students in classes
    for (const cls of createdClasses) {
      for (const student of createdStudents) {
        const existingEnrollment = await prisma.classEnrollment.findUnique({
          where: {
            userId_classId: {
              userId: student.id,
              classId: cls.id
            }
          }
        });

        if (!existingEnrollment) {
          await prisma.classEnrollment.create({
            data: {
              userId: student.id,
              classId: cls.id
            }
          });
          console.log(`Enrolled ${student.firstName} in ${cls.name}`);
        }
      }
    }

    // Create sample lessons first
    const sampleLessons = [
      {
        name: 'Price Formation & Market Efficiency',
        description: 'Learn how prices are formed in financial markets and the concept of market efficiency.',
        xmlConfig: '<lesson><description>Basic price formation lesson</description><simulation id="A" duration="45"><start><command name="Open Market"><parameter>5</parameter></command></start></simulation></lesson>'
      },
      {
        name: 'Introduction to Arbitrage',
        description: 'Explore arbitrage opportunities and risk-free profit strategies.',
        xmlConfig: '<lesson><description>Introduction to arbitrage strategies</description><simulation id="B" duration="60"><start><command name="Open Market"><parameter>3</parameter></command></start></simulation></lesson>'
      }
    ];

    const createdLessons = [];
    for (const lessonData of sampleLessons) {
      let lesson = await prisma.lesson.findUnique({
        where: { name: lessonData.name }
      });

      if (!lesson) {
        lesson = await prisma.lesson.create({
          data: lessonData
        });
        console.log(`Created lesson: ${lessonData.name}`);
      }
      createdLessons.push(lesson);
    }

    // Create sample simulation sessions
    const sessionData = [
      {
        classId: createdClasses[0].id,
        lessonId: createdLessons[0].id,
        scenario: 'A',
        status: SimulationStatus.COMPLETED,
        startTime: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        endTime: new Date(Date.now() - 1 * 60 * 60 * 1000),   // 1 hour ago
        duration: 2700 // 45 minutes in seconds
      },
      {
        classId: createdClasses[1].id,
        lessonId: createdLessons[1].id,
        scenario: 'B',
        status: SimulationStatus.PENDING,
        startTime: null,
        endTime: null,
        duration: 3600 // 60 minutes in seconds
      }
    ];

    const createdSessions = [];
    for (const session of sessionData) {
      const existingSession = await prisma.simulationSession.findFirst({
        where: { 
          classId: session.classId,
          lessonId: session.lessonId
        }
      });

      if (!existingSession) {
        const newSession = await prisma.simulationSession.create({
          data: session
        });
        createdSessions.push(newSession);
        console.log(`Created session for lesson: ${session.lessonId}`);
      } else {
        createdSessions.push(existingSession);
      }
    }

    // Create sample securities first
    const sampleSecurities = [
      { symbol: 'AAPL', name: 'Apple Inc.' },
      { symbol: 'GOOGL', name: 'Alphabet Inc.' },
      { symbol: 'MSFT', name: 'Microsoft Corporation' }
    ];

    const createdSecurities = [];
    for (const securityData of sampleSecurities) {
      let security = await prisma.security.findUnique({
        where: { symbol: securityData.symbol }
      });

      if (!security) {
        security = await prisma.security.create({
          data: securityData
        });
        console.log(`Created security: ${securityData.symbol}`);
      }
      createdSecurities.push(security);
    }

    // Create sample orders and positions for the completed session
    const completedSession = await prisma.simulationSession.findFirst({
      where: { 
        classId: createdClasses[0].id,
        status: SimulationStatus.COMPLETED
      }
    });

    if (completedSession) {
      // Create sample orders for students
      const sampleOrders = [
        {
          userId: createdStudents[0].id,
          sessionId: completedSession.id,
          securityId: createdSecurities[0].id, // AAPL
          side: OrderSide.BUY,
          type: OrderType.MARKET,
          quantity: 100,
          price: new (await import('@prisma/client')).Prisma.Decimal(150.25),
          status: OrderStatus.FILLED,
          submittedAt: new Date(Date.now() - 90 * 60 * 1000) // 90 minutes ago
        },
        {
          userId: createdStudents[1].id,
          sessionId: completedSession.id,
          securityId: createdSecurities[1].id, // GOOGL
          side: OrderSide.BUY,
          type: OrderType.LIMIT,
          quantity: 50,
          price: new (await import('@prisma/client')).Prisma.Decimal(2750.00),
          status: OrderStatus.FILLED,
          submittedAt: new Date(Date.now() - 85 * 60 * 1000) // 85 minutes ago
        }
      ];

      for (const orderData of sampleOrders) {
        const existingOrder = await prisma.order.findFirst({
          where: {
            userId: orderData.userId,
            sessionId: orderData.sessionId,
            securityId: orderData.securityId
          }
        });

        if (!existingOrder) {
          await prisma.order.create({
            data: orderData
          });
        }
      }

      // Create sample positions
      const samplePositions = [
        {
          userId: createdStudents[0].id,
          sessionId: completedSession.id,
          securityId: createdSecurities[0].id, // AAPL
          quantity: 100,
          avgPrice: new (await import('@prisma/client')).Prisma.Decimal(150.25),
          unrealizedPnL: new (await import('@prisma/client')).Prisma.Decimal(185.00)
        },
        {
          userId: createdStudents[1].id,
          sessionId: completedSession.id,
          securityId: createdSecurities[1].id, // GOOGL
          quantity: 50,
          avgPrice: new (await import('@prisma/client')).Prisma.Decimal(2750.00),
          unrealizedPnL: new (await import('@prisma/client')).Prisma.Decimal(425.00)
        }
      ];

      for (const positionData of samplePositions) {
        const existingPosition = await prisma.position.findFirst({
          where: {
            userId: positionData.userId,
            sessionId: positionData.sessionId,
            securityId: positionData.securityId
          }
        });

        if (!existingPosition) {
          await prisma.position.create({
            data: positionData
          });
        }
      }

      console.log('Created sample trading data');
    }

    return NextResponse.json({
      success: true,
      message: 'Demo data created successfully',
      data: {
        instructor: {
          id: instructor.id,
          email: instructor.email,
          name: `${instructor.firstName} ${instructor.lastName}`
        },
        classes: createdClasses.map(c => ({
          id: c.id,
          name: c.name,
          semester: c.semester
        })),
        students: createdStudents.map(s => ({
          id: s.id,
          name: `${s.firstName} ${s.lastName}`,
          email: s.email
        }))
      }
    });

  } catch (error) {
    console.error('Demo setup error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create demo data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}