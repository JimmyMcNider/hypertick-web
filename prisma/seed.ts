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
import { SecurityType } from '@prisma/client';
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
    { symbol: 'AOE', name: 'Alpha Omega Enterprises', type: SecurityType.EQUITY },
    { symbol: 'BOND1', name: '10-Year Treasury Bond', type: SecurityType.BOND },
    { symbol: 'BOND2', name: '5-Year Corporate Bond', type: SecurityType.BOND },
    { symbol: 'BOND3', name: '2-Year Municipal Bond', type: SecurityType.BOND },
    { symbol: 'SPX', name: 'S&P 500 Index', type: SecurityType.EQUITY },
  ];

  for (const security of securities) {
    await prisma.security.upsert({
      where: { symbol: security.symbol },
      update: security,
      create: security
    });
  }
  console.log(`✅ Created ${securities.length} securities`);

  // 7. Load legacy XML lessons from upTick distribution
  console.log('📚 Loading legacy lessons from upTick distribution...');
  await loadLegacyLessons();
  console.log('✅ Loaded legacy lessons');

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

  console.log(`  🔍 Found ${lessonDirs.length} legacy lesson directories`);

  for (const lessonDir of lessonDirs) {
    try {
      const lessonXmlPath = path.join(legacyLessonsPath, lessonDir, `lesson - ${lessonDir}.xml`);
      
      if (fs.existsSync(lessonXmlPath)) {
        const xmlContent = fs.readFileSync(lessonXmlPath, 'utf-8');
        
        // Parse lesson metadata from XML
        const lessonMetadata = parseLessonMetadata(lessonDir, xmlContent);
        
        // Check for additional files
        const lessonFiles = fs.readdirSync(path.join(legacyLessonsPath, lessonDir));
        const hasExcel = lessonFiles.some(f => f.endsWith('.xls') || f.endsWith('.xlsx'));
        const hasReporting = lessonFiles.some(f => f.startsWith('reporting - '));
        const pptCount = lessonFiles.filter(f => f.endsWith('.ppt') || f.endsWith('.pptx')).length;
        
        await prisma.lesson.upsert({
          where: { name: lessonDir },
          update: {
            xmlConfig: xmlContent,
            description: lessonMetadata.description
          },
          create: {
            name: lessonDir,
            xmlConfig: xmlContent,
            description: lessonMetadata.description,
            isActive: true
          }
        });
        
        console.log(`  📖 Loaded lesson: ${lessonDir} (${lessonMetadata.category}, ${lessonMetadata.scenarios.length} scenarios, ${lessonMetadata.estimatedDuration}min)`);
      } else {
        console.log(`  ⚠️  XML file not found for lesson: ${lessonDir}`);
      }
    } catch (error) {
      console.error(`  ❌ Error loading lesson ${lessonDir}:`, error);
    }
  }
}

/**
 * Parse lesson metadata from XML content
 */
function parseLessonMetadata(lessonName: string, xmlContent: string) {
  // Extract simulation scenarios from XML
  const scenarioMatches = xmlContent.match(/<simulation id="([^"]+)"/g) || [];
  const scenarios = scenarioMatches.map(match => match.match(/"([^"]+)"/)?.[1] || '').filter(Boolean);
  
  // Determine category based on lesson name
  const name = lessonName.toLowerCase();
  let category = 'GENERAL';
  if (name.includes('price formation') || name.includes('market efficiency')) {
    category = 'MARKET_MICROSTRUCTURE';
  } else if (name.includes('arbitrage')) {
    category = 'ARBITRAGE_STRATEGIES';
  } else if (name.includes('option') || name.includes('cdo')) {
    category = 'DERIVATIVES';
  } else if (name.includes('asset allocation')) {
    category = 'PORTFOLIO_THEORY';
  } else if (name.includes('risky debt')) {
    category = 'FIXED_INCOME';
  }
  
  // Determine difficulty
  let difficulty = 'INTERMEDIATE';
  if (name.includes('price formation') || name.includes('market efficiency')) {
    difficulty = 'BEGINNER';
  } else if (name.includes('cdo') || name.includes('convertible') || name.includes('iii')) {
    difficulty = 'ADVANCED';
  }
  
  // Estimate duration based on complexity
  let estimatedDuration = 90; // Default 90 minutes
  if (name.includes('price formation') || name.includes('market efficiency')) {
    estimatedDuration = 90;
  } else if (name.includes('asset allocation') || name.includes('arbitrage')) {
    estimatedDuration = 120;
  } else if (name.includes('cdo') || name.includes('option') || name.includes('risky debt')) {
    estimatedDuration = 150;
  }
  
  // Create description
  const description = `${lessonName} - ${category.replace('_', ' ').toLowerCase()} simulation with ${scenarios.length} scenario${scenarios.length !== 1 ? 's' : ''} (${scenarios.join(', ')})`;
  
  return {
    scenarios,
    category,
    difficulty,
    estimatedDuration,
    description
  };
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