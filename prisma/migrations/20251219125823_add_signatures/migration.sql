-- CreateTable
CREATE TABLE "signatures" (
    "id" TEXT NOT NULL,
    "certificateId" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "documentHash" TEXT NOT NULL,
    "signerId" TEXT NOT NULL,
    "signerName" TEXT NOT NULL,
    "signerCRM" TEXT,
    "signerRole" TEXT NOT NULL,
    "signature" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "signedAt" TIMESTAMP(3) NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedAt" TIMESTAMP(3),
    "verifiedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "signatures_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "signatures_certificateId_key" ON "signatures"("certificateId");

-- CreateIndex
CREATE INDEX "signatures_documentType_documentId_idx" ON "signatures"("documentType", "documentId");

-- CreateIndex
CREATE INDEX "signatures_signerId_idx" ON "signatures"("signerId");

-- CreateIndex
CREATE INDEX "signatures_certificateId_idx" ON "signatures"("certificateId");
