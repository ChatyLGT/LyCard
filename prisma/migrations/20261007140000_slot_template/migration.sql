CREATE TABLE "SlotTemplate" (
    "id" TEXT NOT NULL,
    "slotType" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL DEFAULT '',
    "industryTags" JSONB NOT NULL DEFAULT '[]',
    "painPointTags" JSONB NOT NULL DEFAULT '[]',
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SlotTemplate_pkey" PRIMARY KEY ("id")
);
