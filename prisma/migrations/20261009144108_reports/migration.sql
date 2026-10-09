/*
  Warnings:

  - The `type` column on the `notification` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the `reports` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('SYSTEM', 'ACCOUNT', 'BUSINESS', 'VERIFICATION', 'REPORT', 'TRUST_SCORE', 'PRODUCT', 'PROMOTION');

-- DropForeignKey
ALTER TABLE "reports" DROP CONSTRAINT "reports_businessId_fkey";

-- DropForeignKey
ALTER TABLE "reports" DROP CONSTRAINT "reports_reporterId_fkey";

-- AlterTable
ALTER TABLE "notification" ADD COLUMN     "metadata" JSONB,
DROP COLUMN "type",
ADD COLUMN     "type" "NotificationType" NOT NULL DEFAULT 'SYSTEM';

-- DropTable
DROP TABLE "reports";

-- CreateTable
CREATE TABLE "report" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "reason" "ReportReason" NOT NULL,
    "title" TEXT,
    "description" TEXT NOT NULL,
    "evidenceUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "ReportStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "adminNote" TEXT,
    "actionTaken" TEXT,
    "penaltyPoints" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "report_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "report_businessId_idx" ON "report"("businessId");

-- CreateIndex
CREATE INDEX "report_reporterId_idx" ON "report"("reporterId");

-- CreateIndex
CREATE INDEX "report_status_idx" ON "report"("status");

-- CreateIndex
CREATE INDEX "notification_user_id_isRead_idx" ON "notification"("user_id", "isRead");

-- CreateIndex
CREATE INDEX "notification_user_id_createdAt_idx" ON "notification"("user_id", "createdAt");

-- AddForeignKey
ALTER TABLE "report" ADD CONSTRAINT "report_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report" ADD CONSTRAINT "report_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
