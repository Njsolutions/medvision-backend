-- CreateEnum
CREATE TYPE "FileCategory" AS ENUM ('EXAM_RESULT', 'MEDICAL_IMAGE', 'PRESCRIPTION', 'DOCUMENT', 'REPORT', 'CONSENT_FORM');

-- CreateTable
CREATE TABLE "patient_files" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "storageKey" TEXT NOT NULL,
    "storageUrl" TEXT,
    "uploadedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "patient_files_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "patient_files_storageKey_key" ON "patient_files"("storageKey");

-- CreateIndex
CREATE INDEX "patient_files_patientId_idx" ON "patient_files"("patientId");

-- CreateIndex
CREATE INDEX "patient_files_fileType_idx" ON "patient_files"("fileType");

-- AddForeignKey
ALTER TABLE "patient_files" ADD CONSTRAINT "patient_files_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_files" ADD CONSTRAINT "patient_files_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
