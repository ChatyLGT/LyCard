-- AlterTable
ALTER TABLE "Especialista" ADD COLUMN     "habilidades" JSONB NOT NULL DEFAULT '[]';

-- AlterTable
ALTER TABLE "Experto" ADD COLUMN     "especialidades" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "experiencia" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "promovidoAExpertoAt" TIMESTAMP(3),
ADD COLUMN     "promovidoPorAdminId" TEXT,
ADD COLUMN     "rango" TEXT NOT NULL DEFAULT 'especialista',
ADD COLUMN     "recruitedById" TEXT;

-- CreateTable
CREATE TABLE "EquipoInvitacion" (
    "id" TEXT NOT NULL,
    "expertoId" TEXT NOT NULL,
    "especialistaId" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'pendiente',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondidaAt" TIMESTAMP(3),

    CONSTRAINT "EquipoInvitacion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EquipoInvitacion_expertoId_especialistaId_key" ON "EquipoInvitacion"("expertoId", "especialistaId");

-- AddForeignKey
ALTER TABLE "Experto" ADD CONSTRAINT "Experto_recruitedById_fkey" FOREIGN KEY ("recruitedById") REFERENCES "Experto"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipoInvitacion" ADD CONSTRAINT "EquipoInvitacion_expertoId_fkey" FOREIGN KEY ("expertoId") REFERENCES "Experto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipoInvitacion" ADD CONSTRAINT "EquipoInvitacion_especialistaId_fkey" FOREIGN KEY ("especialistaId") REFERENCES "Experto"("id") ON DELETE CASCADE ON UPDATE CASCADE;
