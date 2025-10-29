/**
 * Manual Demo Data Initialization API
 * 
 * Manually triggers demo data creation for production debugging
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Manual demo data initialization starting...');

    const lessonCount = await prisma.lesson.count();
    console.log(`📚 Current lesson count: ${lessonCount}`);

    if (lessonCount > 0) {
      return NextResponse.json({
        message: 'Demo data already exists',
        lessonCount,
        skipped: true
      });
    }

    // Initialize demo data using the same function as server.js
    await initializeDemoData();

    const newLessonCount = await prisma.lesson.count();
    const userCount = await prisma.user.count();
    const classCount = await prisma.class.count();

    console.log('✅ Demo data initialization completed');

    return NextResponse.json({
      message: 'Demo data initialized successfully',
      counts: {
        lessons: newLessonCount,
        users: userCount,
        classes: classCount
      },
      success: true
    });

  } catch (error) {
    console.error('❌ Manual demo initialization failed:', error);
    
    return NextResponse.json({
      error: 'Failed to initialize demo data',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}

// Demo data initialization function (copied from server.js)
async function initializeDemoData() {
  console.log('🔧 Starting demo data creation...');

  // Create sample instructor if not exists
  const instructorEmail = 'instructor@hypertick.com';
  let instructor = await prisma.user.findUnique({
    where: { email: instructorEmail }
  });

  if (!instructor) {
    const hashedPassword = await bcrypt.hash('instructor123', 12);
    instructor = await prisma.user.create({
      data: {
        username: 'instructor',
        email: instructorEmail,
        firstName: 'Demo',
        lastName: 'Instructor',
        role: 'INSTRUCTOR',
        password: hashedPassword
      }
    });
    console.log('✅ Created demo instructor');
  }

  // Create demo class
  let demoClass = await prisma.class.findFirst({
    where: { instructorId: instructor.id }
  });

  if (!demoClass) {
    demoClass = await prisma.class.create({
      data: {
        name: 'Financial Markets Simulation',
        semester: 'Fall 2024',
        section: 'Demo',
        instructorId: instructor.id
      }
    });
    console.log('✅ Created demo class');
  }

  // Create sample lessons
  const sampleLessons = [
    {
      name: 'Price Formation & Market Efficiency',
      description: 'Learn how prices are formed in financial markets and the concept of market efficiency.',
      xmlConfig: `<?xml version="1.0" encoding="UTF-8"?>
<lesson name="Price Formation &amp; Market Efficiency">
  <command name="Grant Privilege">
    <parameter>9</parameter>
    <parameter>$All</parameter>
  </command>
  <command name="Grant Privilege">
    <parameter>10</parameter>
    <parameter>$All</parameter>
  </command>
  <simulation id="Simulation A" duration="2700">
    <start>
      <command name="Open Market">
        <parameter>5</parameter>
      </command>
    </start>
    <end>
      <command name="Close Market"/>
    </end>
  </simulation>
</lesson>`
    },
    {
      name: 'Introduction to Arbitrage',
      description: 'Explore arbitrage opportunities and risk-free profit strategies.',
      xmlConfig: `<?xml version="1.0" encoding="UTF-8"?>
<lesson name="Introduction to Arbitrage">
  <command name="Grant Privilege">
    <parameter>9</parameter>
    <parameter>$All</parameter>
  </command>
  <command name="Grant Privilege">
    <parameter>10</parameter>
    <parameter>$All</parameter>
  </command>
  <simulation id="Simulation B" duration="3600">
    <start>
      <command name="Open Market">
        <parameter>3</parameter>
      </command>
    </start>
    <end>
      <command name="Close Market"/>
    </end>
  </simulation>
</lesson>`
    }
  ];

  for (const lessonData of sampleLessons) {
    let lesson = await prisma.lesson.findUnique({
      where: { name: lessonData.name }
    });

    if (!lesson) {
      lesson = await prisma.lesson.create({
        data: lessonData
      });
      console.log(`✅ Created lesson: ${lessonData.name}`);
    }
  }

  // Create demo students
  const students = [
    { username: 'student1', email: 'student1@hypertick.com', firstName: 'Alice', lastName: 'Johnson' },
    { username: 'student2', email: 'student2@hypertick.com', firstName: 'Bob', lastName: 'Chen' },
    { username: 'student3', email: 'student3@hypertick.com', firstName: 'Carol', lastName: 'Davis' },
    { username: 'student4', email: 'student4@hypertick.com', firstName: 'David', lastName: 'Wilson' },
    { username: 'student5', email: 'student5@hypertick.com', firstName: 'Eve', lastName: 'Martinez' }
  ];

  for (const studentData of students) {
    let student = await prisma.user.findUnique({
      where: { email: studentData.email }
    });

    if (!student) {
      const hashedPassword = await bcrypt.hash('student123', 12);
      student = await prisma.user.create({
        data: {
          ...studentData,
          role: 'STUDENT',
          password: hashedPassword
        }
      });
      console.log(`✅ Created student: ${studentData.firstName} ${studentData.lastName}`);

      // Enroll student in demo class
      await prisma.classEnrollment.create({
        data: {
          userId: student.id,
          classId: demoClass.id
        }
      });
    }
  }

  // Create sample securities
  const securities = [
    { symbol: 'AOE', name: 'AOE Corporation' },
    { symbol: 'TECH', name: 'Tech Industries' },
    { symbol: 'BLUE', name: 'Blue Chip Corp' }
  ];

  for (const securityData of securities) {
    let security = await prisma.security.findUnique({
      where: { symbol: securityData.symbol }
    });

    if (!security) {
      security = await prisma.security.create({
        data: securityData
      });
      console.log(`✅ Created security: ${securityData.symbol}`);
    }
  }

  console.log('🎉 Demo data initialization complete');
}