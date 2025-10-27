#!/bin/bash
set -e

echo "🚀 Starting HyperTick Web Application..."

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL environment variable is not set"
    exit 1
fi

echo "📡 Database URL configured: ${DATABASE_URL%%:*}://***"

# Wait for database to be ready with better error handling
echo "⏳ Waiting for database connection..."
DB_READY=false

for i in {1..60}; do
  echo "🔍 Testing database connection (attempt $i/60)..."
  
  if npx prisma db pull --schema=prisma/schema.prisma --force > /dev/null 2>&1; then
    echo "✅ Database connection established successfully"
    DB_READY=true
    break
  fi
  
  echo "⚠️  Database not ready, waiting 3 seconds..."
  sleep 3
done

if [ "$DB_READY" = false ]; then
    echo "❌ Failed to connect to database after 180 seconds"
    echo "🔧 Attempting to start application anyway (some features may be limited)"
fi

# Initialize database schema
if [ "$DB_READY" = true ]; then
    echo "🗄️  Pushing database schema..."
    if npx prisma db push --accept-data-loss --force-reset; then
        echo "✅ Database schema updated successfully"
        
        # Seed database with initial data
        echo "🌱 Seeding database with initial data..."
        if npm run db:seed; then
            echo "✅ Database seeded successfully"
        else
            echo "⚠️  Database seeding failed, trying alternative approach..."
            echo "🔧 Running prisma generate and trying seed again..."
            npx prisma generate
            npm run db:seed || echo "⚠️  Final seed attempt failed, continuing..."
        fi
    else
        echo "⚠️  Database schema push failed, trying without force-reset..."
        if npx prisma db push --accept-data-loss; then
            echo "✅ Database schema updated successfully (second attempt)"
            npm run db:seed || echo "⚠️  Seeding failed after schema update"
        else
            echo "⚠️  Database schema operations failed, but continuing..."
        fi
    fi
else
    echo "⚠️  Skipping database operations due to connection issues"
fi

# Start the application
echo "🎯 Starting HyperTick application server..."
exec npm run start