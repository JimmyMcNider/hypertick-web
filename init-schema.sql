-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('STUDENT', 'INSTRUCTOR', 'ADMIN');

-- CreateEnum
CREATE TYPE "SimulationStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'PAUSED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SecurityType" AS ENUM ('EQUITY', 'BOND', 'OPTION', 'DERIVATIVE');

-- CreateEnum
CREATE TYPE "OrderType" AS ENUM ('MARKET', 'LIMIT', 'STOP', 'STOP_LIMIT');

-- CreateEnum
CREATE TYPE "OrderSide" AS ENUM ('BUY', 'SELL');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'PENDING_TRIGGER', 'PARTIALLY_FILLED', 'FILLED', 'CANCELLED', 'REJECTED');

-- CreateEnum
CREATE TYPE "AuctionStatus" AS ENUM ('PENDING', 'ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'STUDENT',
    "password" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "classes" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "semester" TEXT NOT NULL,
    "section" TEXT,
    "instructorId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "classes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "class_enrollments" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,

    CONSTRAINT "class_enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lessons" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "xmlConfig" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lessons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lesson_commands" (
    "id" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "commandName" TEXT NOT NULL,
    "parameters" JSONB NOT NULL,
    "targetGroup" TEXT,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lesson_commands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lesson_simulations" (
    "id" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "simulationId" TEXT NOT NULL,
    "duration" INTEGER NOT NULL,
    "startCommands" JSONB NOT NULL,
    "endCommands" JSONB NOT NULL,
    "reports" JSONB NOT NULL,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lesson_simulations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wizard_items" (
    "id" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "nextItems" JSONB NOT NULL,
    "broadcast" BOOLEAN NOT NULL DEFAULT false,
    "background" TEXT,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wizard_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "simulation_sessions" (
    "id" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "scenario" TEXT NOT NULL,
    "duration" INTEGER NOT NULL,
    "status" "SimulationStatus" NOT NULL DEFAULT 'PENDING',
    "startTime" TIMESTAMP(3),
    "endTime" TIMESTAMP(3),
    "currentTick" INTEGER NOT NULL DEFAULT 0,
    "iteration" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "simulation_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session_users" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT,
    "startingEquity" DECIMAL(65,30) NOT NULL DEFAULT 100000,
    "currentEquity" DECIMAL(65,30) NOT NULL DEFAULT 100000,
    "seatCosts" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "infoCosts" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "transactionCosts" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "session_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session_events" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "command" TEXT NOT NULL,
    "parameters" JSONB NOT NULL,
    "sequence" INTEGER NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "session_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "securities" (
    "id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "SecurityType" NOT NULL DEFAULT 'EQUITY',
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "securities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "securityId" TEXT NOT NULL,
    "type" "OrderType" NOT NULL,
    "side" "OrderSide" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "price" DECIMAL(65,30),
    "stopPrice" DECIMAL(65,30),
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "timeInForce" TEXT NOT NULL DEFAULT 'DAY',
    "notes" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "executedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_executions" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "price" DECIMAL(65,30) NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_executions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "positions" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "securityId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "avgPrice" DECIMAL(65,30) NOT NULL,
    "unrealizedPnL" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "realizedPnL" DECIMAL(65,30) NOT NULL DEFAULT 0,

    CONSTRAINT "positions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "market_data" (
    "id" TEXT NOT NULL,
    "securityId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "bid" DECIMAL(65,30),
    "ask" DECIMAL(65,30),
    "last" DECIMAL(65,30),
    "volume" INTEGER NOT NULL DEFAULT 0,
    "high" DECIMAL(65,30),
    "low" DECIMAL(65,30),
    "open" DECIMAL(65,30),

    CONSTRAINT "market_data_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "market_state" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "tick" INTEGER NOT NULL,
    "isMarketOpen" BOOLEAN NOT NULL DEFAULT false,
    "liquidityActive" BOOLEAN NOT NULL DEFAULT true,
    "liquidityDelay" INTEGER NOT NULL DEFAULT 8,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "market_state_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "privilege_definitions" (
    "id" TEXT NOT NULL,
    "code" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,

    CONSTRAINT "privilege_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_privileges" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "privilegeId" TEXT NOT NULL,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "user_privileges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auctions" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "privilegeType" INTEGER NOT NULL,
    "available" INTEGER NOT NULL,
    "initialPrice" DECIMAL(65,30) NOT NULL,
    "increment" DECIMAL(65,30) NOT NULL,
    "intervalSeconds" INTEGER NOT NULL,
    "status" "AuctionStatus" NOT NULL DEFAULT 'PENDING',
    "startTime" TIMESTAMP(3),
    "endTime" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auctions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auction_rounds" (
    "id" TEXT NOT NULL,
    "auctionId" TEXT NOT NULL,
    "round" INTEGER NOT NULL,
    "price" DECIMAL(65,30) NOT NULL,
    "bidders" INTEGER NOT NULL,
    "duration" INTEGER NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3),

    CONSTRAINT "auction_rounds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auction_bids" (
    "id" TEXT NOT NULL,
    "auctionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "isWinner" BOOLEAN NOT NULL DEFAULT false,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auction_bids_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "data" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "class_enrollments_userId_classId_key" ON "class_enrollments"("userId", "classId");

-- CreateIndex
CREATE UNIQUE INDEX "lessons_name_key" ON "lessons"("name");

-- CreateIndex
CREATE UNIQUE INDEX "session_users_sessionId_userId_key" ON "session_users"("sessionId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "securities_symbol_key" ON "securities"("symbol");

-- CreateIndex
CREATE UNIQUE INDEX "positions_sessionId_userId_securityId_key" ON "positions"("sessionId", "userId", "securityId");

-- CreateIndex
CREATE UNIQUE INDEX "privilege_definitions_code_key" ON "privilege_definitions"("code");

-- CreateIndex
CREATE UNIQUE INDEX "user_privileges_sessionId_userId_privilegeId_key" ON "user_privileges"("sessionId", "userId", "privilegeId");

-- AddForeignKey
ALTER TABLE "classes" ADD CONSTRAINT "classes_instructorId_fkey" FOREIGN KEY ("instructorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_enrollments" ADD CONSTRAINT "class_enrollments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_enrollments" ADD CONSTRAINT "class_enrollments_classId_fkey" FOREIGN KEY ("classId") REFERENCES "classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_commands" ADD CONSTRAINT "lesson_commands_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "lessons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_simulations" ADD CONSTRAINT "lesson_simulations_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "lessons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wizard_items" ADD CONSTRAINT "wizard_items_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "lessons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "simulation_sessions" ADD CONSTRAINT "simulation_sessions_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "lessons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "simulation_sessions" ADD CONSTRAINT "simulation_sessions_classId_fkey" FOREIGN KEY ("classId") REFERENCES "classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_users" ADD CONSTRAINT "session_users_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "simulation_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_users" ADD CONSTRAINT "session_users_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_events" ADD CONSTRAINT "session_events_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "simulation_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "simulation_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_securityId_fkey" FOREIGN KEY ("securityId") REFERENCES "securities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_executions" ADD CONSTRAINT "order_executions_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "positions" ADD CONSTRAINT "positions_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "simulation_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "positions" ADD CONSTRAINT "positions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "positions" ADD CONSTRAINT "positions_securityId_fkey" FOREIGN KEY ("securityId") REFERENCES "securities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "market_data" ADD CONSTRAINT "market_data_securityId_fkey" FOREIGN KEY ("securityId") REFERENCES "securities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "market_state" ADD CONSTRAINT "market_state_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "simulation_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_privileges" ADD CONSTRAINT "user_privileges_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "simulation_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_privileges" ADD CONSTRAINT "user_privileges_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_privileges" ADD CONSTRAINT "user_privileges_privilegeId_fkey" FOREIGN KEY ("privilegeId") REFERENCES "privilege_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auctions" ADD CONSTRAINT "auctions_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "simulation_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auction_rounds" ADD CONSTRAINT "auction_rounds_auctionId_fkey" FOREIGN KEY ("auctionId") REFERENCES "auctions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auction_bids" ADD CONSTRAINT "auction_bids_auctionId_fkey" FOREIGN KEY ("auctionId") REFERENCES "auctions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auction_bids" ADD CONSTRAINT "auction_bids_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

