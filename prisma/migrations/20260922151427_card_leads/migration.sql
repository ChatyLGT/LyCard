-- CreateTable
CREATE TABLE "CardLead" (
    "id" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "contact" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "stage" TEXT NOT NULL DEFAULT 'compartido',
    "notes" TEXT,
    "registrationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CardLead_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CardLead_cardId_idx" ON "CardLead"("cardId");

-- AddForeignKey
ALTER TABLE "CardLead" ADD CONSTRAINT "CardLead_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE CASCADE ON UPDATE CASCADE;
