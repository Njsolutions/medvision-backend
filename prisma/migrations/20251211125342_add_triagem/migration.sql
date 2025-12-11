-- AlterTable
ALTER TABLE "appointments" ALTER COLUMN "reason" DROP NOT NULL;

-- CreateTable
CREATE TABLE "triagens" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "frequenciaCardiaca" DOUBLE PRECISION,
    "frequenciaCardiacaUnit" TEXT,
    "frequenciaCardiacaInstr" TEXT,
    "frequenciaRespiratoria" DOUBLE PRECISION,
    "frequenciaRespiratoriaUnit" TEXT,
    "frequenciaRespiratoriaInstr" TEXT,
    "spo2" DOUBLE PRECISION,
    "spo2Unit" TEXT,
    "spo2Instr" TEXT,
    "temperatura" DOUBLE PRECISION,
    "temperaturaUnit" TEXT,
    "temperaturaInstr" TEXT,
    "pressaoArterialSistolica" DOUBLE PRECISION,
    "pressaoArterialDiastolica" DOUBLE PRECISION,
    "pressaoArterialUnit" TEXT,
    "pressaoArterialInstr" TEXT,
    "pam" DOUBLE PRECISION,
    "glicemia" DOUBLE PRECISION,
    "glicemiaUnit" TEXT,
    "glicemiaInstr" TEXT,
    "pressaoVenosaCentral" DOUBLE PRECISION,
    "pressaoVenosaCentralUnit" TEXT,
    "pressaoVenosaCentralInstr" TEXT,
    "pressaoIntracraniana" DOUBLE PRECISION,
    "pressaoIntracranianaUnit" TEXT,
    "pressaoIntracranianaInstr" TEXT,
    "capnografia" DOUBLE PRECISION,
    "capnografiaUnit" TEXT,
    "capnografiaInstr" TEXT,
    "peso" DOUBLE PRECISION,
    "pesoUnit" TEXT,
    "pesoInstr" TEXT,
    "altura" DOUBLE PRECISION,
    "alturaUnit" TEXT,
    "alturaInstr" TEXT,
    "perimetroCefalico" DOUBLE PRECISION,
    "perimetroCefalicoUnit" TEXT,
    "perimetroCefalicoInstr" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "triagens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "triagens_patientId_idx" ON "triagens"("patientId");

-- AddForeignKey
ALTER TABLE "triagens" ADD CONSTRAINT "triagens_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
