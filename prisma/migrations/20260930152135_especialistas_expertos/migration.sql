-- CreateTable
CREATE TABLE "Especialista" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "trabajo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "iconUrl" TEXT NOT NULL DEFAULT '',
    "color" TEXT NOT NULL DEFAULT '#C8A15A',
    "toolKeys" JSONB NOT NULL DEFAULT '[]',
    "suggestion" TEXT NOT NULL DEFAULT '',
    "autonomyLevel" TEXT NOT NULL DEFAULT 'sugiere',
    "industryTags" JSONB NOT NULL DEFAULT '[]',
    "painPointTags" JSONB NOT NULL DEFAULT '[]',
    "basePriceUsd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'proximamente',
    "destacado" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Especialista_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EspecialistaInstall" (
    "id" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "especialistaId" TEXT NOT NULL,
    "installedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "referredByExpertoId" TEXT,

    CONSTRAINT "EspecialistaInstall_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Experto" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "nombrePublico" TEXT NOT NULL,
    "profesion" TEXT NOT NULL,
    "esProfesionRegulada" BOOLEAN NOT NULL DEFAULT false,
    "descripcion" TEXT NOT NULL,
    "iconUrl" TEXT NOT NULL DEFAULT '',
    "color" TEXT NOT NULL DEFAULT '#C8A15A',
    "consentGivenAt" TIMESTAMP(3),
    "consentScope" JSONB NOT NULL DEFAULT '[]',
    "consentRevokedAt" TIMESTAMP(3),
    "bautizoStatus" TEXT NOT NULL DEFAULT 'sin_bautizar',
    "priceGemeloSoloUsd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "priceGemeloRevisadoUsd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "priceSesionUsd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "industryTags" JSONB NOT NULL DEFAULT '[]',
    "painPointTags" JSONB NOT NULL DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'proximamente',
    "destacado" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Experto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CodiceEntry" (
    "id" TEXT NOT NULL,
    "expertoId" TEXT NOT NULL,
    "pregunta" TEXT NOT NULL,
    "respuesta" TEXT NOT NULL,
    "aprobadaAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CodiceEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Consulta" (
    "id" TEXT NOT NULL,
    "expertoId" TEXT NOT NULL,
    "visitorToken" TEXT,
    "memberId" TEXT,
    "pregunta" TEXT NOT NULL,
    "respuesta" TEXT,
    "nivel" TEXT NOT NULL DEFAULT 'gemelo_solo',
    "revisadaPorExpertoAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Consulta_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Especialista_key_key" ON "Especialista"("key");

-- CreateIndex
CREATE UNIQUE INDEX "EspecialistaInstall_cardId_especialistaId_key" ON "EspecialistaInstall"("cardId", "especialistaId");

-- CreateIndex
CREATE UNIQUE INDEX "Experto_key_key" ON "Experto"("key");

-- CreateIndex
CREATE UNIQUE INDEX "Experto_memberId_key" ON "Experto"("memberId");

-- AddForeignKey
ALTER TABLE "EspecialistaInstall" ADD CONSTRAINT "EspecialistaInstall_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EspecialistaInstall" ADD CONSTRAINT "EspecialistaInstall_especialistaId_fkey" FOREIGN KEY ("especialistaId") REFERENCES "Especialista"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EspecialistaInstall" ADD CONSTRAINT "EspecialistaInstall_referredByExpertoId_fkey" FOREIGN KEY ("referredByExpertoId") REFERENCES "Experto"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Experto" ADD CONSTRAINT "Experto_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CodiceEntry" ADD CONSTRAINT "CodiceEntry_expertoId_fkey" FOREIGN KEY ("expertoId") REFERENCES "Experto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Consulta" ADD CONSTRAINT "Consulta_expertoId_fkey" FOREIGN KEY ("expertoId") REFERENCES "Experto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Consulta" ADD CONSTRAINT "Consulta_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;
