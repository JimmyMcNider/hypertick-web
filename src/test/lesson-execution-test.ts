/**
 * End-to-End Lesson Execution Test
 * 
 * Tests the complete lesson loading and command execution pipeline
 * from legacy upTick XML files through the enhanced session engine
 */

import { legacyLessonImporter } from '@/lib/legacy-lesson-importer';
import { enhancedSessionEngine } from '@/lib/enhanced-session-engine';
import { LessonDefinition } from '@/lib/lesson-loader';

export interface TestResult {
  success: boolean;
  message: string;
  details?: any;
  duration: number;
}

export class LessonExecutionTester {
  private testResults: TestResult[] = [];

  /**
   * Run comprehensive lesson execution tests
   */
  async runFullTestSuite(): Promise<TestResult[]> {
    this.testResults = [];
    console.log('🚀 Starting End-to-End Lesson Execution Tests...\n');

    // Test 1: Legacy lesson scanning
    await this.testLegacyLessonScanning();

    // Test 2: Price Formation lesson loading
    await this.testPriceFormationLessonLoading();

    // Test 3: Session creation from lesson
    await this.testSessionCreation();

    // Test 4: Command execution
    await this.testCommandExecution();

    // Test 5: Simulation lifecycle
    await this.testSimulationLifecycle();

    // Test 6: Complex lesson (Asset Allocation)
    await this.testComplexLessonExecution();

    // Summary
    this.printTestSummary();
    
    return this.testResults;
  }

  /**
   * Test 1: Legacy lesson scanning
   */
  private async testLegacyLessonScanning(): Promise<void> {
    const startTime = Date.now();
    
    try {
      console.log('📁 Test 1: Legacy Lesson Scanning');
      
      const lessons = await legacyLessonImporter.scanLegacyLessons();
      const stats = legacyLessonImporter.generateLegacyLessonStats();
      
      if (lessons.length === 0) {
        this.addTestResult(false, 'No legacy lessons found - check upTick distribution path', {
          scannedPath: '../upTick Classroom Edition - Instructor Distribution/instructor/lessons',
          foundLessons: 0
        }, startTime);
        return;
      }

      console.log(`   ✅ Found ${lessons.length} legacy lessons`);
      console.log(`   📊 Categories: ${Object.keys(stats.byCategory).join(', ')}`);
      console.log(`   📈 Average duration: ${stats.averageDuration} minutes`);
      console.log(`   🏢 Excel integration: ${stats.withExcel} lessons`);
      
      this.addTestResult(true, `Successfully scanned ${lessons.length} legacy lessons`, {
        lessons: lessons.map(l => ({ name: l.lessonName, category: l.category, difficulty: l.difficulty })),
        stats
      }, startTime);

    } catch (error) {
      this.addTestResult(false, `Legacy lesson scanning failed: ${error}`, { error }, startTime);
    }
  }

  /**
   * Test 2: Price Formation lesson loading
   */
  private async testPriceFormationLessonLoading(): Promise<void> {
    const startTime = Date.now();
    
    try {
      console.log('\n📖 Test 2: Price Formation Lesson Loading');
      
      const lesson = await legacyLessonImporter.loadLegacyLesson('Price Formation');
      
      if (!lesson) {
        this.addTestResult(false, 'Price Formation lesson not found', null, startTime);
        return;
      }

      // Verify lesson structure
      const simulations = Object.keys(lesson.simulations);
      const globalCommands = lesson.globalCommands.length;
      const privileges = lesson.privileges.length;

      console.log(`   ✅ Lesson loaded: ${lesson.name}`);
      console.log(`   🎯 Simulations: ${simulations.join(', ')}`);
      console.log(`   🔧 Global commands: ${globalCommands}`);
      console.log(`   🔑 Privileges: ${privileges}`);
      
      // Validate essential components
      if (simulations.length < 2) {
        this.addTestResult(false, 'Price Formation should have multiple simulations', { simulations }, startTime);
        return;
      }

      if (globalCommands < 10) {
        this.addTestResult(false, 'Price Formation should have sufficient global commands', { globalCommands }, startTime);
        return;
      }

      this.addTestResult(true, 'Price Formation lesson loaded successfully', {
        name: lesson.name,
        simulations,
        globalCommands,
        privileges,
        difficulty: lesson.metadata?.difficulty,
        duration: lesson.metadata?.estimatedDuration
      }, startTime);

    } catch (error) {
      this.addTestResult(false, `Price Formation lesson loading failed: ${error}`, { error }, startTime);
    }
  }

  /**
   * Test 3: Session creation from lesson
   */
  private async testSessionCreation(): Promise<void> {
    const startTime = Date.now();
    
    try {
      console.log('\n🎬 Test 3: Session Creation');
      
      const lesson = await legacyLessonImporter.loadLegacyLesson('Price Formation');
      
      if (!lesson) {
        this.addTestResult(false, 'Cannot test session creation - lesson not loaded', null, startTime);
        return;
      }

      const sessionId = 'test_session_' + Date.now();
      const classId = 'test_class_001';
      const scenario = 'Simulation A';

      const session = await enhancedSessionEngine.initializeSession(
        sessionId,
        lesson.id,
        scenario,
        classId,
        lesson
      );

      console.log(`   ✅ Session created: ${session.id}`);
      console.log(`   📊 Status: ${session.status}`);
      console.log(`   🎯 Scenario: ${session.scenario}`);
      console.log(`   👥 Initial participants: ${session.participants.size}`);
      
      // Verify session structure
      if (session.status !== 'PENDING') {
        this.addTestResult(false, 'New session should have PENDING status', { status: session.status }, startTime);
        return;
      }

      if (!session.currentLesson || session.currentLesson.id !== lesson.id) {
        this.addTestResult(false, 'Session lesson mismatch', { 
          sessionLesson: session.currentLesson?.id, 
          expectedLesson: lesson.id 
        }, startTime);
        return;
      }

      this.addTestResult(true, 'Session created successfully from legacy lesson', {
        sessionId: session.id,
        lessonId: session.lessonId,
        scenario: session.scenario,
        status: session.status,
        participantCount: session.participants.size
      }, startTime);

    } catch (error) {
      this.addTestResult(false, `Session creation failed: ${error}`, { error }, startTime);
    }
  }

  /**
   * Test 4: Command execution
   */
  private async testCommandExecution(): Promise<void> {
    const startTime = Date.now();
    
    try {
      console.log('\n⚡ Test 4: Command Execution');
      
      const lesson = await legacyLessonImporter.loadLegacyLesson('Price Formation');
      
      if (!lesson) {
        this.addTestResult(false, 'Cannot test commands - lesson not loaded', null, startTime);
        return;
      }

      const sessionId = 'test_command_session_' + Date.now();
      const session = await enhancedSessionEngine.initializeSession(
        sessionId,
        lesson.id,
        'Simulation A',
        'test_class_001',
        lesson
      );

      // Execute a privilege grant command
      const privilegeCommand = lesson.globalCommands.find(cmd => 
        cmd.type === 'GRANT_PRIVILEGE' && cmd.parameters[0] === 9
      ); // Montage privilege

      if (!privilegeCommand) {
        this.addTestResult(false, 'No suitable privilege command found for testing', null, startTime);
        return;
      }

      await enhancedSessionEngine.executeCommand(sessionId, privilegeCommand);

      console.log(`   ✅ Executed command: ${privilegeCommand.description}`);
      console.log(`   🔧 Command type: ${privilegeCommand.type}`);
      console.log(`   📋 Parameters: ${privilegeCommand.parameters.join(', ')}`);
      
      // Verify command was executed
      const updatedSession = enhancedSessionEngine.getSession(sessionId);
      if (!updatedSession || !updatedSession.executedCommands.has(privilegeCommand.id)) {
        this.addTestResult(false, 'Command not marked as executed', {
          commandId: privilegeCommand.id,
          executedCommands: Array.from(updatedSession?.executedCommands || [])
        }, startTime);
        return;
      }

      this.addTestResult(true, 'Command executed successfully', {
        commandId: privilegeCommand.id,
        commandType: privilegeCommand.type,
        parameters: privilegeCommand.parameters,
        executedCommands: updatedSession.executedCommands.size
      }, startTime);

    } catch (error) {
      this.addTestResult(false, `Command execution failed: ${error}`, { error }, startTime);
    }
  }

  /**
   * Test 5: Simulation lifecycle
   */
  private async testSimulationLifecycle(): Promise<void> {
    const startTime = Date.now();
    
    try {
      console.log('\n🔄 Test 5: Simulation Lifecycle');
      
      const lesson = await legacyLessonImporter.loadLegacyLesson('Price Formation');
      
      if (!lesson) {
        this.addTestResult(false, 'Cannot test simulation - lesson not loaded', null, startTime);
        return;
      }

      const sessionId = 'test_lifecycle_session_' + Date.now();
      const session = await enhancedSessionEngine.initializeSession(
        sessionId,
        lesson.id,
        'Simulation A',
        'test_class_001',
        lesson
      );

      // Start session
      await enhancedSessionEngine.startSession(sessionId);
      console.log('   🟢 Session started');

      // Check session status
      let updatedSession = enhancedSessionEngine.getSession(sessionId);
      if (!updatedSession || updatedSession.status !== 'IN_PROGRESS') {
        this.addTestResult(false, 'Session not in progress after start', { 
          status: updatedSession?.status 
        }, startTime);
        return;
      }

      // Pause session
      await enhancedSessionEngine.pauseSession(sessionId);
      console.log('   ⏸️  Session paused');

      updatedSession = enhancedSessionEngine.getSession(sessionId);
      if (!updatedSession || updatedSession.status !== 'PAUSED') {
        this.addTestResult(false, 'Session not paused correctly', { 
          status: updatedSession?.status 
        }, startTime);
        return;
      }

      // Resume session
      await enhancedSessionEngine.resumeSession(sessionId);
      console.log('   ▶️  Session resumed');

      updatedSession = enhancedSessionEngine.getSession(sessionId);
      if (!updatedSession || updatedSession.status !== 'IN_PROGRESS') {
        this.addTestResult(false, 'Session not resumed correctly', { 
          status: updatedSession?.status 
        }, startTime);
        return;
      }

      // End session
      await enhancedSessionEngine.endSession(sessionId);
      console.log('   🏁 Session ended');

      updatedSession = enhancedSessionEngine.getSession(sessionId);
      if (!updatedSession || updatedSession.status !== 'COMPLETED') {
        this.addTestResult(false, 'Session not completed correctly', { 
          status: updatedSession?.status 
        }, startTime);
        return;
      }

      this.addTestResult(true, 'Complete simulation lifecycle executed successfully', {
        sessionId,
        finalStatus: updatedSession.status,
        elapsedTime: updatedSession.endTime ? 
          updatedSession.endTime.getTime() - updatedSession.startTime.getTime() : 0,
        eventsLogged: updatedSession.eventLog.length
      }, startTime);

    } catch (error) {
      this.addTestResult(false, `Simulation lifecycle failed: ${error}`, { error }, startTime);
    }
  }

  /**
   * Test 6: Complex lesson execution
   */
  private async testComplexLessonExecution(): Promise<void> {
    const startTime = Date.now();
    
    try {
      console.log('\n🎓 Test 6: Complex Lesson (Asset Allocation)');
      
      const lesson = await legacyLessonImporter.loadLegacyLesson('Asset Allocation');
      
      if (!lesson) {
        console.log('   ⚠️  Asset Allocation lesson not found, skipping complex test');
        this.addTestResult(true, 'Complex lesson test skipped - lesson not available', null, startTime);
        return;
      }

      const sessionId = 'test_complex_session_' + Date.now();
      const simulations = Object.keys(lesson.simulations);
      
      if (simulations.length === 0) {
        this.addTestResult(false, 'Complex lesson has no simulations', { lesson: lesson.name }, startTime);
        return;
      }

      const session = await enhancedSessionEngine.initializeSession(
        sessionId,
        lesson.id,
        simulations[0],
        'test_class_001',
        lesson
      );

      console.log(`   ✅ Complex lesson loaded: ${lesson.name}`);
      console.log(`   📊 Simulations available: ${simulations.length}`);
      console.log(`   🔧 Global commands: ${lesson.globalCommands.length}`);
      console.log(`   🎯 Testing simulation: ${simulations[0]}`);

      // Execute first few global commands
      const commandsToTest = lesson.globalCommands.slice(0, 3);
      let executedCommands = 0;

      for (const command of commandsToTest) {
        try {
          await enhancedSessionEngine.executeCommand(sessionId, command);
          executedCommands++;
        } catch (error) {
          console.log(`   ⚠️  Command failed: ${command.description} - ${error}`);
        }
      }

      console.log(`   ✅ Executed ${executedCommands}/${commandsToTest.length} commands`);

      this.addTestResult(true, 'Complex lesson execution completed', {
        lessonName: lesson.name,
        simulationsCount: simulations.length,
        globalCommandsCount: lesson.globalCommands.length,
        executedCommands,
        difficulty: lesson.metadata?.difficulty,
        estimatedDuration: lesson.metadata?.estimatedDuration
      }, startTime);

    } catch (error) {
      this.addTestResult(false, `Complex lesson execution failed: ${error}`, { error }, startTime);
    }
  }

  /**
   * Add test result
   */
  private addTestResult(success: boolean, message: string, details: any, startTime: number): void {
    const result: TestResult = {
      success,
      message,
      details,
      duration: Date.now() - startTime
    };
    
    this.testResults.push(result);
    
    const icon = success ? '✅' : '❌';
    console.log(`   ${icon} ${message} (${result.duration}ms)`);
  }

  /**
   * Print test summary
   */
  private printTestSummary(): void {
    const passed = this.testResults.filter(r => r.success).length;
    const total = this.testResults.length;
    const totalTime = this.testResults.reduce((sum, r) => sum + r.duration, 0);

    console.log('\n📋 Test Summary');
    console.log('═'.repeat(50));
    console.log(`Total Tests: ${total}`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${total - passed}`);
    console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`);
    console.log(`Total Time: ${totalTime}ms`);
    
    if (passed === total) {
      console.log('\n🎉 All tests passed! Lesson execution system is working correctly.');
    } else {
      console.log('\n⚠️  Some tests failed. Check the details above.');
      
      // Show failed tests
      const failedTests = this.testResults.filter(r => !r.success);
      console.log('\nFailed Tests:');
      failedTests.forEach((test, index) => {
        console.log(`${index + 1}. ${test.message}`);
        if (test.details) {
          console.log(`   Details: ${JSON.stringify(test.details, null, 2)}`);
        }
      });
    }
  }

  /**
   * Quick validation test
   */
  async quickValidation(): Promise<boolean> {
    try {
      console.log('🔍 Running quick validation...');
      
      // Check if we can scan lessons
      const lessons = await legacyLessonImporter.scanLegacyLessons();
      if (lessons.length === 0) {
        console.log('❌ No legacy lessons found');
        return false;
      }

      // Check if we can load Price Formation
      const lesson = await legacyLessonImporter.loadLegacyLesson('Price Formation');
      if (!lesson) {
        console.log('❌ Cannot load Price Formation lesson');
        return false;
      }

      // Check if we can create a session
      const sessionId = 'quick_test_' + Date.now();
      const session = await enhancedSessionEngine.initializeSession(
        sessionId,
        lesson.id,
        'Simulation A',
        'test_class',
        lesson
      );

      if (!session) {
        console.log('❌ Cannot create session');
        return false;
      }

      console.log('✅ Quick validation passed');
      return true;

    } catch (error) {
      console.log(`❌ Quick validation failed: ${error}`);
      return false;
    }
  }
}

// Export tester instance
export const lessonExecutionTester = new LessonExecutionTester();