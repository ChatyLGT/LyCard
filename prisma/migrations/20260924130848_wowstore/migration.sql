-- CreateTable
CREATE TABLE "WowApp" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "iconUrl" TEXT NOT NULL DEFAULT '',
    "color" TEXT NOT NULL DEFAULT '#C8A15A',
    "appType" TEXT NOT NULL DEFAULT 'custom',
    "industryTags" JSONB NOT NULL DEFAULT '[]',
    "painPointTags" JSONB NOT NULL DEFAULT '[]',
    "basePriceUsd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'proximamente',
    "demoVideoUrl" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WowApp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WowAppInstall" (
    "id" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "wowAppId" TEXT NOT NULL,
    "installedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "adaptationNotes" TEXT NOT NULL DEFAULT '',
    "adaptationStatus" TEXT NOT NULL DEFAULT 'sin_pedir',
    "adaptationPaidAt" TIMESTAMP(3),

    CONSTRAINT "WowAppInstall_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WowApp_key_key" ON "WowApp"("key");

-- CreateIndex
CREATE UNIQUE INDEX "WowAppInstall_cardId_wowAppId_key" ON "WowAppInstall"("cardId", "wowAppId");

-- AddForeignKey
ALTER TABLE "WowAppInstall" ADD CONSTRAINT "WowAppInstall_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WowAppInstall" ADD CONSTRAINT "WowAppInstall_wowAppId_fkey" FOREIGN KEY ("wowAppId") REFERENCES "WowApp"("id") ON DELETE CASCADE ON UPDATE CASCADE;
