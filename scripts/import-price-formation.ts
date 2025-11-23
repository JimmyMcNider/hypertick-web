/**
 * Import Price Formation Lesson from XML
 * 
 * This script parses the legacy Price Formation XML lesson and stores it
 * in the modern database schema, making it available to students.
 */

import { XMLLessonParser } from '../src/lib/xml-parser';
import { prisma } from '../src/lib/prisma';
import { readFileSync } from 'fs';
import { join } from 'path';

async function importPriceFormationLesson() {
  console.log('🚀 Starting Price Formation lesson import...');
  
  try {
    // Read the XML file
    const xmlPath = join(
      __dirname, 
      '../../upTick Classroom Edition - Instructor Distribution/instructor/lessons/Price Formation/lesson - Price Formation.xml'
    );
    
    console.log('📖 Reading XML file:', xmlPath);
    const xmlContent = readFileSync(xmlPath, 'utf-8');
    console.log('✅ XML file loaded, content length:', xmlContent.length);
    
    // Parse the XML
    const parser = new XMLLessonParser();
    const lessonConfig = await parser.parseLesson(xmlContent);
    
    console.log('📋 Parsed lesson:', lessonConfig.name);
    console.log('  🎯 Privileges:', lessonConfig.privileges.length);
    console.log('  🎮 Simulations:', lessonConfig.simulations.length);
    console.log('  🧙 Wizard Items:', lessonConfig.wizardItems.length);
    
    // Store in database
    console.log('💾 Storing lesson in database...');
    
    // Create or update the lesson
    const lesson = await prisma.lesson.upsert({
      where: { name: lessonConfig.name },
      update: {
        xmlConfig: xmlContent,
        description: `Full upTick lesson with ${lessonConfig.simulations.length} simulations and ${lessonConfig.privileges.length} privileges`,
        updatedAt: new Date()
      },
      create: {
        name: lessonConfig.name,
        xmlConfig: xmlContent,
        description: `Full upTick lesson with ${lessonConfig.simulations.length} simulations and ${lessonConfig.privileges.length} privileges`,
        isActive: true
      }
    });
    
    console.log('✅ Lesson stored with ID:', lesson.id);
    
    // Delete existing parsed data to ensure clean import
    await prisma.lessonCommand.deleteMany({ where: { lessonId: lesson.id } });
    await prisma.lessonSimulation.deleteMany({ where: { lessonId: lesson.id } });
    await prisma.wizardItem.deleteMany({ where: { lessonId: lesson.id } });
    
    // Store commands (privilege grants, market settings)
    console.log('📋 Storing commands...');
    let commandOrder = 0;
    for (const privilege of lessonConfig.privileges) {
      await prisma.lessonCommand.create({
        data: {
          lessonId: lesson.id,
          commandName: 'Grant Privilege',
          parameters: [privilege.code.toString(), privilege.userGroup || ''].filter(Boolean),
          targetGroup: privilege.userGroup,
          order: commandOrder++
        }
      });
    }
    
    // Store market settings as command
    const marketSettings = lessonConfig.marketSettings;
    await prisma.lessonCommand.create({
      data: {
        lessonId: lesson.id,
        commandName: 'Set Market',
        parameters: [
          marketSettings.startTick.toString(),
          marketSettings.marketDelay.toString(),
          marketSettings.loopOnClose.toString(),
          marketSettings.liquidateOnClose.toString()
        ],
        order: commandOrder++
      }
    });
    
    console.log(`✅ Stored ${commandOrder} commands`);
    
    // Store simulations
    console.log('🎮 Storing simulations...');
    for (let i = 0; i < lessonConfig.simulations.length; i++) {
      const sim = lessonConfig.simulations[i];
      await prisma.lessonSimulation.create({
        data: {
          lessonId: lesson.id,
          simulationId: sim.id,
          duration: sim.duration,
          startCommands: sim.startCommands as any,
          endCommands: sim.endCommands as any,
          reports: sim.reports as any,
          order: i
        }
      });
    }
    
    console.log(`✅ Stored ${lessonConfig.simulations.length} simulations`);
    
    // Store wizard items
    console.log('🧙 Storing wizard items...');
    for (let i = 0; i < lessonConfig.wizardItems.length; i++) {
      const wizard = lessonConfig.wizardItems[i];
      await prisma.wizardItem.create({
        data: {
          lessonId: lesson.id,
          itemId: wizard.id,
          title: wizard.id.replace(/([A-Z])/g, ' $1').trim(), // Convert camelCase to readable
          content: {
            centerPanel: wizard.centerPanel,
            controller: wizard.controller
          } as any,
          nextItems: {} as any, // Will be parsed from controller navigation
          broadcast: wizard.broadcast,
          background: wizard.centerPanel.background,
          order: i
        }
      });
    }
    
    console.log(`✅ Stored ${lessonConfig.wizardItems.length} wizard items`);
    
    // Update privilege definitions
    console.log('🔐 Updating privilege definitions...');
    await updatePrivilegeDefinitions();
    
    console.log('🎉 Price Formation lesson import completed successfully!');
    console.log('📊 Summary:');
    console.log(`  - Lesson: ${lessonConfig.name}`);
    console.log(`  - Commands: ${commandOrder}`);
    console.log(`  - Simulations: ${lessonConfig.simulations.length}`);
    console.log(`  - Wizard Items: ${lessonConfig.wizardItems.length}`);
    console.log(`  - Database ID: ${lesson.id}`);
    
  } catch (error) {
    console.error('❌ Failed to import Price Formation lesson:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Update privilege definitions with upTick standard privileges
 */
async function updatePrivilegeDefinitions() {
  const privileges = [
    { code: 1, name: 'Analyst Window', description: 'Access to market analysis tools', category: 'Analysis' },
    { code: 4, name: 'Buying Power Window', description: 'View current buying power', category: 'Portfolio' },
    { code: 5, name: 'Event Window', description: 'Market event notifications', category: 'Information' },
    { code: 8, name: 'Market Order Window', description: 'Place market orders', category: 'Trading' },
    { code: 9, name: 'Montage', description: 'Real-time price montage display', category: 'Market Data' },
    { code: 10, name: 'Trade Window', description: 'View trade executions', category: 'Trading' },
    { code: 11, name: 'News Window', description: 'Market news and updates', category: 'Information' },
    { code: 12, name: 'Order Log Window', description: 'Order history and status', category: 'Trading' },
    { code: 13, name: 'Portfolio Window', description: 'Portfolio positions and P&L', category: 'Portfolio' },
    { code: 15, name: 'Market Watch Window', description: 'Real-time market data', category: 'Market Data' },
    { code: 18, name: 'Single Security Graph', description: 'Price charts for individual securities', category: 'Analysis' },
    { code: 22, name: 'Market Making Rights', description: 'Ability to place limit orders', category: 'Trading' },
    { code: 23, name: 'Premium Analyst Signals', description: 'Access to analyst recommendations', category: 'Analysis' },
    { code: 29, name: 'Bump Buttons', description: 'Quick price adjustment controls', category: 'Trading' },
    { code: 31, name: 'Auto-Trading Window', description: 'Automated trading controls', category: 'Trading' },
    { code: 32, name: 'Auction Window', description: 'Participate in privilege auctions', category: 'Auction' },
    { code: 33, name: 'Lesson Window', description: 'View lesson instructions and progress', category: 'Education' },
    { code: 34, name: 'Excel Link', description: 'Export data to Excel', category: 'Data' }
  ];
  
  for (const privilege of privileges) {
    await prisma.privilegeDefinition.upsert({
      where: { code: privilege.code },
      update: {
        name: privilege.name,
        description: privilege.description,
        category: privilege.category
      },
      create: privilege
    });
  }
  
  console.log(`✅ Updated ${privileges.length} privilege definitions`);
}

// Run the import
if (require.main === module) {
  importPriceFormationLesson()
    .then(() => {
      console.log('✅ Import completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Import failed:', error);
      process.exit(1);
    });
}

export { importPriceFormationLesson };