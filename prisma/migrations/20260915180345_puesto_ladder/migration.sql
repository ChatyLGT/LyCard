-- AlterTable
ALTER TABLE "Card" ADD COLUMN     "puestoId" TEXT;

-- CreateTable
CREATE TABLE "Puesto" (
    "id" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "siglas" TEXT NOT NULL,
    "denominacion" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Puesto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Puesto_programId_idx" ON "Puesto"("programId");

-- AddForeignKey
ALTER TABLE "Card" ADD CONSTRAINT "Card_puestoId_fkey" FOREIGN KEY ("puestoId") REFERENCES "Puesto"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Puesto" ADD CONSTRAINT "Puesto_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE CASCADE ON UPDATE CASCADE;
