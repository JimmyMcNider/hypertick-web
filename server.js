const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server: IOServer } = require('socket.io');

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.NODE_ENV === 'production' ? '0.0.0.0' : 'localhost';
const port = parseInt(process.env.PORT, 10) || 3000;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(async () => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  // Initialize Socket.IO server for production
  console.log('🚀 Initializing Socket.IO server for production...');
  const io = new IOServer(server, {
    cors: {
      origin: process.env.NODE_ENV === 'production' 
        ? [
            'https://hypertick-web.onrender.com',
            'https://*.onrender.com'
          ]
        : ['http://localhost:3000'],
      methods: ['GET', 'POST'],
      credentials: true
    },
    path: '/socket.io/',
    transports: ['polling', 'websocket']
  });

  // Initialize WebSocket handlers
  try {
    // Import and initialize WebSocket server handlers
    const { initializeWebSocketServer } = require('./dist/src/lib/websocket-server.js');
    await initializeWebSocketServer(io);
    console.log('✅ WebSocket server initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize WebSocket handlers:', error);
    console.log('📝 WebSocket functionality will be limited');
  }

  // Auto-initialize demo data in production if database is empty
  if (process.env.NODE_ENV === 'production') {
    try {
      console.log('🔍 Checking if demo data initialization is needed...');
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();
      
      const lessonCount = await prisma.lesson.count();
      console.log(`📚 Found ${lessonCount} lessons in database`);
      
      if (lessonCount === 0) {
        console.log('🚀 No lessons found, initializing demo data...');
        
        // Directly call the setup demo function
        const bcrypt = require('bcryptjs');
        await initializeDemoData(prisma, bcrypt);
        console.log('✅ Demo data initialized successfully');
      } else {
        console.log('✅ Lessons already exist, skipping demo data initialization');
      }
      
      await prisma.$disconnect();
    } catch (error) {
      console.error('❌ Failed to check/initialize demo data:', error);
    }
  }

  console.log('Server starting in', process.env.NODE_ENV, 'mode');
  console.log('WebSocket support: Socket.IO integrated');

  server
    .once('error', (err) => {
      console.error('Server error:', err);
      process.exit(1);
    })
    .listen(port, hostname, () => {
      console.log(`> Ready on http://${hostname}:${port}`);
      console.log(`🔌 WebSocket server available at ws://${hostname}:${port}/socket.io/`);
    });
});

// Demo data initialization function
async function initializeDemoData(prisma, bcrypt) {
  const { SimulationStatus, OrderType, OrderSide, OrderStatus } = require('@prisma/client');
  
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
    console.log('Created demo instructor');
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
    console.log('Created demo class');
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
      console.log(`Created lesson: ${lessonData.name}`);
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
      console.log(`Created student: ${studentData.firstName} ${studentData.lastName}`);

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
      console.log(`Created security: ${securityData.symbol}`);
    }
  }

  console.log('Demo data initialization complete');
}