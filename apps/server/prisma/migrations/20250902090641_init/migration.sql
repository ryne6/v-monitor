-- CreateEnum
CREATE TYPE "MonitorErrorType" AS ENUM ('JS', 'RESOURCE', 'NETWORK', 'PERFORMANCE');

-- CreateTable
CREATE TABLE "errors" (
    "id" TEXT NOT NULL,
    "type" "MonitorErrorType" NOT NULL,
    "message" TEXT NOT NULL,
    "stack" TEXT,
    "filename" TEXT,
    "line" INTEGER,
    "column" INTEGER,
    "timestamp" BIGINT NOT NULL,
    "url" TEXT NOT NULL,
    "userAgent" TEXT NOT NULL,
    "requestMethod" TEXT,
    "requestUrl" TEXT,
    "responseStatus" INTEGER,
    "responseStatusText" TEXT,
    "requestDuration" INTEGER,
    "requestType" TEXT,
    "requestQuery" TEXT,
    "requestBody" JSONB,
    "requestHeaders" JSONB,
    "responseBody" JSONB,
    "responseHeaders" JSONB,
    "metadata" JSONB,
    "sessionId" TEXT,
    "userId" TEXT,
    "projectId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "errors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_sessions" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT,
    "projectId" TEXT,
    "url" TEXT NOT NULL,
    "userAgent" TEXT NOT NULL,
    "ip" TEXT,
    "country" TEXT,
    "city" TEXT,
    "browser" TEXT,
    "os" TEXT,
    "device" TEXT,
    "screenResolution" TEXT,
    "metadata" JSONB,
    "startTime" BIGINT NOT NULL,
    "endTime" BIGINT,
    "duration" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "performance" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "projectId" TEXT,
    "url" TEXT NOT NULL,
    "timestamp" BIGINT NOT NULL,
    "navigationStart" INTEGER,
    "loadEventEnd" INTEGER,
    "domContentLoadedEventEnd" INTEGER,
    "firstPaint" INTEGER,
    "firstContentfulPaint" INTEGER,
    "largestContentfulPaint" INTEGER,
    "firstInputDelay" INTEGER,
    "cumulativeLayoutShift" INTEGER,
    "resourceTiming" JSONB,
    "memoryUsed" INTEGER,
    "memoryLimit" INTEGER,
    "connectionType" TEXT,
    "downlink" INTEGER,
    "rtt" INTEGER,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "performance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "errors_type_createdAt_idx" ON "errors"("type", "createdAt");

-- CreateIndex
CREATE INDEX "errors_url_createdAt_idx" ON "errors"("url", "createdAt");

-- CreateIndex
CREATE INDEX "errors_userAgent_createdAt_idx" ON "errors"("userAgent", "createdAt");

-- CreateIndex
CREATE INDEX "user_sessions_sessionId_createdAt_idx" ON "user_sessions"("sessionId", "createdAt");

-- CreateIndex
CREATE INDEX "user_sessions_userId_createdAt_idx" ON "user_sessions"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "user_sessions_projectId_createdAt_idx" ON "user_sessions"("projectId", "createdAt");

-- CreateIndex
CREATE INDEX "performance_sessionId_createdAt_idx" ON "performance"("sessionId", "createdAt");

-- CreateIndex
CREATE INDEX "performance_projectId_createdAt_idx" ON "performance"("projectId", "createdAt");

-- CreateIndex
CREATE INDEX "performance_url_createdAt_idx" ON "performance"("url", "createdAt");
