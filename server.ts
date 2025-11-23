/**
 * Custom Next.js Server with WebSocket Support
 *
 * Runs Next.js with a custom HTTP server to support WebSocket connections
 * for real-time trading simulation features
 *
 * This file is used for both development (via tsx) and production (compiled)
 */

import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { initWebSocketServer } from './src/lib/websocket-server';

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOSTNAME || '0.0.0.0';
const port = parseInt(process.env.PORT || '3000', 10);

console.log(`Starting server in ${dev ? 'development' : 'production'} mode`);
console.log(`Environment: NODE_ENV=${process.env.NODE_ENV}`);

// Initialize Next.js app
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  // Create HTTP server
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url!, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  // Initialize WebSocket server
  const wsServer = initWebSocketServer(server);
  console.log('WebSocket server initialized');

  // Start server
  server.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
    console.log(`> WebSocket server ready for connections`);
    console.log(`> Database: ${process.env.DATABASE_URL ? 'Connected' : 'Not configured'}`);
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  });

  process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  });
});