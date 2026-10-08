-- Asistente "Configura tu LyCard" v2 (2026-10-08). Solo agrega 3 tablas
-- nuevas -- cero ALTER sobre tablas existentes (Admin, Card, Program).
-- El borrador vive 100% separado de la configuración publicada.

-- CreateTable
CREATE TABLE "AssistantSession" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "pistaActiva" TEXT,
    "preguntaActualId" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'en_curso',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssistantSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssistantAnswer" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "preguntaId" TEXT NOT NULL,
    "valor" JSONB,
    "porque" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'propuesto',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssistantAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssistantDraft" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "espacioId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "claveDestino" TEXT NOT NULL,
    "contenido" JSONB NOT NULL,
    "contenidoAnteriorPublicado" JSONB,
    "estado" TEXT NOT NULL DEFAULT 'pendiente',
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssistantDraft_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AssistantAnswer_sessionId_preguntaId_key" ON "AssistantAnswer"("sessionId", "preguntaId");

-- CreateIndex
CREATE UNIQUE INDEX "AssistantDraft_sessionId_espacioId_key" ON "AssistantDraft"("sessionId", "espacioId");

-- AddForeignKey
ALTER TABLE "AssistantSession" ADD CONSTRAINT "AssistantSession_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "Admin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssistantSession" ADD CONSTRAINT "AssistantSession_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssistantAnswer" ADD CONSTRAINT "AssistantAnswer_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "AssistantSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssistantDraft" ADD CONSTRAINT "AssistantDraft_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "AssistantSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
