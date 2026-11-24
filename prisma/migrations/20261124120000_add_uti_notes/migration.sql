-- CreateTable
CREATE TABLE "uti_notes" (
    "id" TEXT NOT NULL,
    "utiId" TEXT,
    "patientId" TEXT,
    "authorId" TEXT,
    "bedNumber" TEXT NOT NULL,
    "patientName" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "authorRole" "Roles" NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "uti_notes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "uti_notes_patientId_createdAt_idx" ON "uti_notes"("patientId", "createdAt");

-- CreateIndex
CREATE INDEX "uti_notes_utiId_createdAt_idx" ON "uti_notes"("utiId", "createdAt");

-- AddForeignKey
ALTER TABLE "uti_notes" ADD CONSTRAINT "uti_notes_utiId_fkey" FOREIGN KEY ("utiId") REFERENCES "utis"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "uti_notes" ADD CONSTRAINT "uti_notes_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "uti_notes" ADD CONSTRAINT "uti_notes_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Histórico imutável: bloqueia UPDATE e DELETE direto (alterações de FK por SET NULL passam pelo trigger de UPDATE só nas colunas de vínculo).
CREATE OR REPLACE FUNCTION uti_notes_block_mutation() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'uti_notes é append-only: DELETE não permitido';
  END IF;
  IF NEW."content" IS DISTINCT FROM OLD."content"
     OR NEW."createdAt" IS DISTINCT FROM OLD."createdAt"
     OR NEW."bedNumber" IS DISTINCT FROM OLD."bedNumber"
     OR NEW."patientName" IS DISTINCT FROM OLD."patientName"
     OR NEW."authorName" IS DISTINCT FROM OLD."authorName"
     OR NEW."authorRole" IS DISTINCT FROM OLD."authorRole" THEN
    RAISE EXCEPTION 'uti_notes é append-only: conteúdo não pode ser alterado';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER uti_notes_no_delete BEFORE DELETE ON "uti_notes"
  FOR EACH ROW EXECUTE FUNCTION uti_notes_block_mutation();

CREATE TRIGGER uti_notes_no_edit BEFORE UPDATE ON "uti_notes"
  FOR EACH ROW EXECUTE FUNCTION uti_notes_block_mutation();
