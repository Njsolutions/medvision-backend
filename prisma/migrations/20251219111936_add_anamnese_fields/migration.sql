/*
  Warnings:

  - You are about to drop the column `content` on the `anamneses` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "anamneses" DROP CONSTRAINT "anamneses_doctorId_fkey";

-- DropForeignKey
ALTER TABLE "anamneses" DROP CONSTRAINT "anamneses_patientId_fkey";

-- AlterTable
ALTER TABLE "anamneses" DROP COLUMN "content",
ADD COLUMN     "alergias" TEXT,
ADD COLUMN     "altura" TEXT,
ADD COLUMN     "appointmentId" TEXT,
ADD COLUMN     "cid10" TEXT,
ADD COLUMN     "condutaClinica" TEXT,
ADD COLUMN     "diagnosticosDiferenciais" TEXT,
ADD COLUMN     "examesFisicos" TEXT,
ADD COLUMN     "frequenciaCardiaca" TEXT,
ADD COLUMN     "frequenciaRespiratoria" TEXT,
ADD COLUMN     "habitosVida" TEXT,
ADD COLUMN     "hdaCaracteristica" TEXT,
ADD COLUMN     "hdaDuracao" TEXT,
ADD COLUMN     "hdaEvolucao" TEXT,
ADD COLUMN     "hdaFatoresMelhora" TEXT,
ADD COLUMN     "hdaFatoresPiora" TEXT,
ADD COLUMN     "hdaInicio" TEXT,
ADD COLUMN     "hdaIntensidade" TEXT,
ADD COLUMN     "hdaIrradiacao" TEXT,
ADD COLUMN     "hdaLocalizacao" TEXT,
ADD COLUMN     "hdaSintomasAssociados" TEXT,
ADD COLUMN     "hipoteseDiagnostica" TEXT,
ADD COLUMN     "historicoFamiliar" TEXT,
ADD COLUMN     "historicoMedico" TEXT,
ADD COLUMN     "imc" TEXT,
ADD COLUMN     "medicamentosEmUso" TEXT,
ADD COLUMN     "peso" TEXT,
ADD COLUMN     "pressaoArterial" TEXT,
ADD COLUMN     "queixaPrincipal" TEXT,
ADD COLUMN     "revisaoSistemas" TEXT,
ADD COLUMN     "saturacaoO2" TEXT,
ADD COLUMN     "temperatura" TEXT;

-- CreateIndex
CREATE INDEX "anamneses_appointmentId_idx" ON "anamneses"("appointmentId");

-- AddForeignKey
ALTER TABLE "anamneses" ADD CONSTRAINT "anamneses_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "anamneses" ADD CONSTRAINT "anamneses_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "doctors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "anamneses" ADD CONSTRAINT "anamneses_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
