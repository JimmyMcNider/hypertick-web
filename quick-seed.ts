/**
 * Quick seed script to create sample data if it doesn't exist
 */

import { prisma } from './src/lib/prisma';
import { PRIVILEGE_DEFINITIONS } from './src/lib/privilege-definitions';
import bcrypt from 'bcryptjs';

async function quickSeed() {
  console.log('🌱 Quick seeding sample data...');

  try {
    // 1. Seed privileges if they don't exist
    const existingPrivileges = await prisma.privilegeDefinition.count();
    if (existingPrivileges === 0) {
      for (const privilege of PRIVILEGE_DEFINITIONS) {
        await prisma.privilegeDefinition.create({
          data: {
            code: privilege.code,
            name: privilege.name,
            description: privilege.description,
            category: privilege.category
          }
        });
      }
      console.log('✅ Created privilege definitions');
    }

    // 2. Create demo users if they don't exist
    const existingUsers = await prisma.user.count();
    if (existingUsers === 0) {
      const hashedPassword = await bcrypt.hash('demo123', 12);
      
      // Admin user
      const admin = await prisma.user.create({
        data: {
          email: 'admin@hypertick.com',
          username: 'admin',
          firstName: 'System',
          lastName: 'Administrator',
          password: hashedPassword,
          role: 'ADMIN'
        }
      });

      // Instructor
      const instructor = await prisma.user.create({
        data: {
          email: 'instructor@hypertick.com',
          username: 'instructor',
          firstName: 'John',
          lastName: 'Professor',
          password: hashedPassword,
          role: 'INSTRUCTOR'
        }
      });

      // Students
      for (let i = 1; i <= 5; i++) {
        await prisma.user.create({
          data: {
            email: `student${i}@hypertick.com`,
            username: `student${i}`,
            firstName: `Student`,
            lastName: `${i}`,
            password: hashedPassword,
            role: 'STUDENT'
          }
        });
      }

      console.log('✅ Created demo users');

      // 3. Create sample class
      const sampleClass = await prisma.class.create({
        data: {
          name: 'Financial Markets Simulation',
          semester: 'Fall 2024',
          section: 'A',
          instructorId: instructor.id,
          isActive: true
        }
      });

      console.log('✅ Created sample class');

      // 4. Create sample lesson
      await prisma.lesson.create({
        data: {
          name: 'Price Formation Demo',
          description: 'Sample lesson for testing the platform',
          xmlConfig: `<?xml version="1.0" encoding="UTF-8"?>
<lesson name="Price Formation Demo">
  <command name="Grant Privilege">
    <parameter>1</parameter>
  </command>
  <command name="Grant Privilege">
    <parameter>4</parameter>
  </command>
  <command name="Grant Privilege">
    <parameter>8</parameter>
  </command>
  <simulation id="Simulation A" duration="300">
    <start>
      <command name="Open Market">
        <parameter>5</parameter>
      </command>
    </start>
    <end>
      <command name="Close Market" />
    </end>
  </simulation>
</lesson>`,
          isActive: true
        }
      });

      console.log('✅ Created sample lesson');
    }

    console.log('🎉 Quick seed completed!');
    
  } catch (error) {
    console.error('❌ Quick seed failed:', error);
  }
}

quickSeed()
  .finally(async () => {
    await prisma.$disconnect();
  });