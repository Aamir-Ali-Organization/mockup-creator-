-- CreateEnum
CREATE TYPE "QuoteStatus" AS ENUM ('PENDING', 'PROCESSING', 'MOCKUP_READY', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "Quote" (
    "id" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "teamName" TEXT NOT NULL,
    "sport" TEXT NOT NULL,
    "gender" TEXT NOT NULL,
    "ageGroup" TEXT NOT NULL,
    "primaryColor" TEXT NOT NULL,
    "secondaryColor" TEXT NOT NULL,
    "alternateColor" TEXT NOT NULL DEFAULT '',
    "quantity" INTEGER NOT NULL,
    "accessories" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "rosterInfo" TEXT NOT NULL DEFAULT '',
    "rosterFile" TEXT,
    "logoFile" TEXT,
    "logoCreation" TEXT,
    "referralSource" TEXT NOT NULL,
    "status" "QuoteStatus" NOT NULL DEFAULT 'PENDING',
    "aiPrompt" TEXT,
    "mockupImages" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Quote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Quote_email_idx" ON "Quote"("email");

-- CreateIndex
CREATE INDEX "Quote_status_idx" ON "Quote"("status");

-- CreateIndex
CREATE INDEX "Quote_createdAt_idx" ON "Quote"("createdAt");
