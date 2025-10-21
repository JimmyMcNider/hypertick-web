/**
 * Database Seed Script
 * 
 * Seeds the database with initial data including:
 * - Privilege definitions
 * - Sample users and classes
 * - Legacy lesson configurations
 * - Sample securities
 */

import { prisma } from '../src/lib/db';
import { PRIVILEGE_DEFINITIONS } from '../src/lib/privilege-definitions';
import { authService } from '../src/lib/auth';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';

async function main() {
  console.log('🌱 Starting database seed...');

  // 1. Seed privilege definitions
  console.log('📝 Seeding privilege definitions...');
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
  console.log(`✅ Created ${PRIVILEGE_DEFINITIONS.length} privilege definitions`);

  // 2. Create sample admin user
  console.log('👤 Creating admin user...');
  const hashedAdminPassword = await bcrypt.hash('admin123', 10);
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@hypertick.com' },
    update: {},
    create: {
      email: 'admin@hypertick.com',
      username: 'admin',
      firstName: 'System',
      lastName: 'Administrator',
      password: hashedAdminPassword,
      role: 'ADMIN'
    }
  });
  console.log(`✅ Created admin user: ${adminUser.username}`);

  // 3. Create sample instructor
  console.log('👨‍🏫 Creating instructor...');
  const hashedInstructorPassword = await bcrypt.hash('instructor123', 10);
  const instructor = await prisma.user.upsert({
    where: { email: 'instructor@hypertick.com' },
    update: {},
    create: {
      email: 'instructor@hypertick.com',
      username: 'instructor',
      firstName: 'John',
      lastName: 'Professor',
      password: hashedInstructorPassword,
      role: 'INSTRUCTOR'
    }
  });
  console.log(`✅ Created instructor: ${instructor.username}`);

  // 4. Create sample students
  console.log('👩‍🎓 Creating students...');
  const students = [];
  const hashedStudentPassword = await bcrypt.hash('student123', 10);
  for (let i = 1; i <= 20; i++) {
    const student = await prisma.user.upsert({
      where: { email: `student${i}@hypertick.com` },
      update: {},
      create: {
        email: `student${i}@hypertick.com`,
        username: `student${i}`,
        firstName: `Student`,
        lastName: `${i}`,
        password: hashedStudentPassword,
        role: 'STUDENT'
      }
    });
    students.push(student);
  }
  console.log(`✅ Created ${students.length} students`);

  // 5. Create sample class
  console.log('🏫 Creating sample class...');
  
  // Check if class already exists first
  let sampleClass = await prisma.class.findFirst({
    where: {
      instructorId: instructor.id,
      name: 'Financial Markets Simulation',
      semester: 'Fall 2024'
    }
  });

  if (!sampleClass) {
    sampleClass = await prisma.class.create({
      data: {
        name: 'Financial Markets Simulation',
        semester: 'Fall 2024',
        section: 'A',
        instructorId: instructor.id,
        isActive: true
      }
    });
  }

  // Enroll students in class
  for (const student of students) {
    await prisma.classEnrollment.upsert({
      where: {
        userId_classId: {
          userId: student.id,
          classId: sampleClass.id
        }
      },
      update: {},
      create: {
        userId: student.id,
        classId: sampleClass.id
      }
    });
  }
  console.log(`✅ Created class with ${students.length} enrolled students`);

  // 6. Create sample securities
  console.log('📈 Creating securities...');
  const securities = [
    { symbol: 'AOE', name: 'Alpha Omega Enterprises', type: 'EQUITY' },
    { symbol: 'BOND1', name: '10-Year Treasury Bond', type: 'BOND' },
    { symbol: 'BOND2', name: '5-Year Corporate Bond', type: 'BOND' },
    { symbol: 'BOND3', name: '2-Year Municipal Bond', type: 'BOND' },
    { symbol: 'SPX', name: 'S&P 500 Index', type: 'EQUITY' },
  ];

  for (const security of securities) {
    await prisma.security.upsert({
      where: { symbol: security.symbol },
      update: security,
      create: security
    });
  }
  console.log(`✅ Created ${securities.length} securities`);

  // 7. Create sample lessons instead of loading legacy XML
  console.log('📚 Creating sample lessons...');
  await createSampleLessons();
  console.log('✅ Created sample lessons');

  console.log('🎉 Database seed completed successfully!');
}

/**
 * Load legacy XML lesson configurations from the legacy system
 */
async function loadLegacyLessons() {
  const legacyLessonsPath = path.join(process.cwd(), '..', 'upTick Classroom Edition - Instructor Distribution', 'instructor', 'lessons');
  
  if (!fs.existsSync(legacyLessonsPath)) {
    console.log('⚠️  Legacy lessons directory not found, creating sample lessons instead');
    await createSampleLessons();
    return;
  }

  const lessonDirs = fs.readdirSync(legacyLessonsPath, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

  for (const lessonDir of lessonDirs) {
    const lessonXmlPath = path.join(legacyLessonsPath, lessonDir, `lesson - ${lessonDir}.xml`);
    
    if (fs.existsSync(lessonXmlPath)) {
      const xmlContent = fs.readFileSync(lessonXmlPath, 'utf-8');
      
      await prisma.lesson.upsert({
        where: { name: lessonDir },
        update: {
          xmlConfig: xmlContent,
          description: `Legacy lesson: ${lessonDir}`
        },
        create: {
          name: lessonDir,
          xmlConfig: xmlContent,
          description: `Legacy lesson: ${lessonDir}`,
          isActive: true
        }
      });
      
      console.log(`  📖 Loaded lesson: ${lessonDir}`);
    }
  }
}

/**
 * Create sample lessons if legacy ones aren't available
 */
async function createSampleLessons() {
  const sampleLessons = [
    {
      name: 'Price Formation',
      description: 'Introduction to price discovery and market formation',
      xmlConfig: generateSampleLessonXML('Price Formation')
    },
    {
      name: 'Market Efficiency',
      description: 'Exploring market efficiency through trading simulations',
      xmlConfig: generateSampleLessonXML('Market Efficiency')
    },
    {
      name: 'Option Pricing',
      description: 'Understanding option valuation and Greeks',
      xmlConfig: generateSampleLessonXML('Option Pricing')
    }
  ];

  for (const lesson of sampleLessons) {
    await prisma.lesson.upsert({
      where: { name: lesson.name },
      update: lesson,
      create: lesson
    });
  }
}

/**
 * Generate sample lesson XML configuration
 */
function generateSampleLessonXML(lessonName: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<lesson name="${lessonName}">
  <!-- Grant basic privileges -->
  <command name="Grant Privilege">
    <parameter>1</parameter>    <!-- Analyst Window -->
  </command>
  <command name="Grant Privilege">
    <parameter>4</parameter>    <!-- Buying Power Window -->
  </command>
  <command name="Grant Privilege">
    <parameter>8</parameter>    <!-- Market Order Window -->
  </command>
  <command name="Grant Privilege">
    <parameter>13</parameter>   <!-- Portfolio Window -->
  </command>
  <command name="Grant Privilege">
    <parameter>15</parameter>   <!-- Market Watch Window -->
  </command>

  <!-- Market settings -->
  <command name="Set Market">
    <parameter>1</parameter>    <!-- start at tick 1 -->
    <parameter>8</parameter>    <!-- market delay at 8 seconds -->
    <parameter>false</parameter> <!-- do not loop on close -->
    <parameter>true</parameter>  <!-- liquidate accounts on close -->
  </command>

  <!-- Simulation A -->
  <simulation id="Simulation A" duration="300">
    <start>
      <command name="Set Holding Value">
        <parameter>ALL</parameter>
        <parameter>USD</parameter>
        <parameter>100000</parameter>
      </command>
      <command name="Open Market">
        <parameter>5</parameter>
      </command>
    </start>
    <end>
      <command name="Close Market" />
    </end>
    <report ppt="lesson/${lessonName}/${lessonName}, Sim A.ppt" />
  </simulation>

  <!-- Simulation B -->
  <simulation id="Simulation B" duration="300">
    <start>
      <command name="Set Liquidity Trader">
        <parameter>1</parameter>
        <parameter>Active</parameter>
        <parameter>true</parameter>
      </command>
      <command name="Set Holding Value">
        <parameter>ALL</parameter>
        <parameter>USD</parameter>
        <parameter>100000</parameter>
      </command>
      <command name="Open Market">
        <parameter>5</parameter>
      </command>
    </start>
    <end>
      <command name="Close Market" />
    </end>
    <report ppt="lesson/${lessonName}/${lessonName}, Sim B.ppt" />
  </simulation>
</lesson>`;
}

// Run the seed function
main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });