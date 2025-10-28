#!/usr/bin/env node

/**
 * Development setup script
 * Sets up local SQLite database for faster iteration
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Setting up HyperTick for local development...\n');

// Ensure .env.local exists
const envLocalPath = '.env.local';
if (!fs.existsSync(envLocalPath)) {
  console.log('📝 Creating .env.local for development...');
  fs.writeFileSync(envLocalPath, `# Local Development Environment
NODE_ENV=development

# Database - Local SQLite for fast development
DATABASE_URL="file:./dev.db"

# Authentication - Dev secrets
JWT_SECRET="dev-super-secret-jwt-key-change-in-production"
NEXTAUTH_SECRET="dev-super-secret-nextauth-key-change-in-production" 
NEXTAUTH_URL="http://localhost:3000"

# Redis - Optional for development (will fallback gracefully)
REDIS_URL="redis://localhost:6379"

# WebSocket Configuration
WEBSOCKET_PORT=3001

# Development Optimizations
FAST_REFRESH=true
DISABLE_ESLINT_PLUGIN=false

# Fallback Mode (no external dependencies)
ENABLE_FALLBACK_MODE=true
DISABLE_EXTERNAL_APIS=true
`);
  console.log('✅ Created .env.local\n');
}

// Check if dev.db exists
const dbExists = fs.existsSync('./dev.db');
if (dbExists) {
  console.log('📊 Local database already exists at ./dev.db');
  console.log('   To reset: rm ./dev.db && npm run dev:setup\n');
} else {
  console.log('📊 Local database will be created when needed\n');
}

console.log('🎯 Development environment ready!');
console.log('');
console.log('Quick start:');
console.log('  npm run dev:fast    # Start with fallback mode (no DB spam)');
console.log('  npm run dev         # Standard development server');
console.log('  npm run dev:reset   # Reset local database');
console.log('');
console.log('Login credentials:');
console.log('  instructor/password  # Instructor account');
console.log('  student/password     # Student account');
console.log('');