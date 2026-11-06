-- Importador de JSON de Programa (2026-11-06).

-- Un Puesto por siglas dentro de cada Programa (upsert del importador).
-- Si ya hubiera siglas repetidas, se renombran antes de crear el índice
-- para que la migración no falle (las repetidas reciben un sufijo -2, -3...).
UPDATE "Puesto" p
SET "siglas" = p."siglas" || '-' || d.rn
FROM (
  SELECT "id", ROW_NUMBER() OVER (PARTITION BY "programId", "siglas" ORDER BY "createdAt", "id") AS rn
  FROM "Puesto"
) d
WHERE p."id" = d."id" AND d.rn > 1;

CREATE UNIQUE INDEX "Puesto_programId_siglas_key" ON "Puesto"("programId", "siglas");

-- Dueño futuro de una Card importada: email de Google, se limpia al reclamarla.
ALTER TABLE "Card" ADD COLUMN "pendingOwnerEmail" TEXT;
CREATE INDEX "Card_pendingOwnerEmail_idx" ON "Card"("pendingOwnerEmail");

-- Versiones de importación (nunca se pisan).
CREATE TABLE "ProgramImport" (
    "id" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdByMemberId" TEXT,
    "payload" JSONB NOT NULL,
    "meta" JSONB NOT NULL DEFAULT '{}',
    "previous" JSONB,
    "summary" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "ProgramImport_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProgramImport_programId_version_key" ON "ProgramImport"("programId", "version");

ALTER TABLE "ProgramImport" ADD CONSTRAINT "ProgramImport_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE CASCADE ON UPDATE CASCADE;
