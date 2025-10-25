# Production Deployment Instructions

## Critical: Render Dashboard Configuration

**IMPORTANT**: The build is failing because Render dashboard has a custom build command override. You need to update it manually in the Render dashboard:

### 1. Go to your Render dashboard
- Navigate to your `hypertick-web` service
- Go to Settings tab

### 2. Update Build Command
**Current (WRONG):** `npm ci && npm run build && npx prisma generate && npx prisma db push && npm run db:seed`

**Change to (CORRECT):** `npm ci && npm run build && npx prisma generate`

### 3. Update Start Command
**Should be:** `bash scripts/start.sh`

### 4. Ensure Environment Variables are Set
- `DATABASE_URL` - Auto-configured from database service
- `JWT_SECRET` - Generate a secure random string
- `NEXTAUTH_SECRET` - Generate a secure random string  
- `NODE_ENV` - Set to "production"
- `NEXT_TELEMETRY_DISABLED` - Set to "1"
- `WEBSOCKET_PORT` - Set to "3001"

### 5. Service Dependencies
Make sure these services exist in this order:
1. `hypertick-db` (PostgreSQL database)
2. `hypertick-redis` (Redis cache)  
3. `hypertick-web` (Web application)

## Why This Fixes the Issue

The build was failing because database operations (`npx prisma db push && npm run db:seed`) were running during the build phase when the database service wasn't available yet.

The new setup:
- ✅ Build phase: Only builds the app and generates Prisma client
- ✅ Start phase: Waits for database, initializes schema, seeds data, then starts app
- ✅ Proper service dependencies ensure database is available when needed
- ✅ Graceful error handling if database operations fail

## Manual Steps Required

1. Update build command in Render dashboard (remove database operations)
2. Verify environment variables are properly set
3. Ensure database and Redis services are created first
4. Deploy with the corrected configuration