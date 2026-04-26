ALTER TYPE "StatusUti" ADD VALUE IF NOT EXISTS 'disinfecting';

ALTER TABLE "utis" ADD COLUMN "bedNumber" TEXT;

WITH numbered_beds AS (
  SELECT
    "id",
    (100 + ROW_NUMBER() OVER (ORDER BY "createdAt", "id"))::text AS "bedNumber"
  FROM "utis"
)
UPDATE "utis"
SET "bedNumber" = numbered_beds."bedNumber"
FROM numbered_beds
WHERE "utis"."id" = numbered_beds."id";

ALTER TABLE "utis" ALTER COLUMN "bedNumber" SET NOT NULL;
CREATE UNIQUE INDEX "utis_bedNumber_key" ON "utis"("bedNumber");

ALTER TABLE "triagens"
  ADD COLUMN "queixaPrincipal" TEXT,
  ADD COLUMN "duracaoQueixa" TEXT,
  ADD COLUMN "examesAnteriores" TEXT;

ALTER TABLE "anamneses"
  ADD COLUMN "anamneseRetorno" TEXT,
  ADD COLUMN "examesAnteriores" TEXT;
