/*
  Warnings:

  - Added the required column `userId` to the `triagens` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "triagens" ADD COLUMN     "appointmentId" TEXT,
ADD COLUMN     "userId" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "triagens_userId_idx" ON "triagens"("userId");

-- CreateIndex
CREATE INDEX "triagens_appointmentId_idx" ON "triagens"("appointmentId");

-- AddForeignKey
ALTER TABLE "triagens" ADD CONSTRAINT "triagens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "triagens" ADD CONSTRAINT "triagens_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
