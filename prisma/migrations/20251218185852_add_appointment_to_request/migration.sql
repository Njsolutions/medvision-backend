-- AlterTable
ALTER TABLE "requests" ADD COLUMN     "appointmentId" TEXT;

-- CreateIndex
CREATE INDEX "requests_appointmentId_idx" ON "requests"("appointmentId");

-- AddForeignKey
ALTER TABLE "requests" ADD CONSTRAINT "requests_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
