#!/bin/bash
set -e

echo "Starting HyperTick Web Application..."

# Wait for database to be ready
echo "Waiting for database connection..."
for i in {1..30}; do
  if npx prisma db pull --schema=prisma/schema.prisma > /dev/null 2>&1; then
    echo "Database connection established"
    break
  fi
  echo "Waiting for database... ($i/30)"
  sleep 2
done

# Initialize database
echo "Initializing database..."
npx prisma db push --accept-data-loss || echo "Database push failed, continuing..."

# Seed database
echo "Seeding database..."
npm run db:seed || echo "Database seeding failed, continuing..."

# Start the application
echo "Starting application..."
exec npm run start:next