-- CreateEnum
CREATE TYPE "MonitorErrorType" AS ENUM ('JS', 'RESOURCE', 'NETWORK', 'PERFORMANCE');

-- CreateTable
CREATE TABLE "Error" (
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

    CONSTRAINT "Error_pkey" PRIMARY KEY ("id")
);
