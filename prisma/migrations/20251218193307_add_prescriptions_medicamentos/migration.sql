/*
  Warnings:

  - You are about to drop the column `content` on the `prescriptions` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "prescriptions" DROP COLUMN "content",
ADD COLUMN     "orientacoesGerais" TEXT;

-- CreateTable
CREATE TABLE "medicamentos" (
    "id" TEXT NOT NULL,
    "prescriptionId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "dosagem" TEXT NOT NULL,
    "frequencia" TEXT NOT NULL,
    "duracao" TEXT NOT NULL,
    "via" TEXT NOT NULL,
    "orientacoes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "medicamentos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "medicamentos_prescriptionId_idx" ON "medicamentos"("prescriptionId");

-- AddForeignKey
ALTER TABLE "medicamentos" ADD CONSTRAINT "medicamentos_prescriptionId_fkey" FOREIGN KEY ("prescriptionId") REFERENCES "prescriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
