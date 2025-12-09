/*
  Warnings:

  - The `content` column on the `audit_logs` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Added the required column `description` to the `audit_logs` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ImpactLevel" AS ENUM ('low', 'medium', 'high', 'critical');

-- AlterTable
ALTER TABLE "audit_logs" ADD COLUMN     "description" TEXT NOT NULL,
ADD COLUMN     "impactLevel" "ImpactLevel" NOT NULL DEFAULT 'low',
ADD COLUMN     "ipAddress" TEXT,
ADD COLUMN     "userAgent" TEXT,
DROP COLUMN "content",
ADD COLUMN     "content" JSONB;

-- CreateIndex
CREATE INDEX "audit_logs_impactLevel_idx" ON "audit_logs"("impactLevel");

-- CreateIndex
CREATE INDEX "audit_logs_timestamp_idx" ON "audit_logs"("timestamp");
