-- CreateTable
CREATE TABLE "CardRecipient" (
    "id" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CardRecipient_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CardRecipient_cardId_slug_key" ON "CardRecipient"("cardId", "slug");

-- AddForeignKey
ALTER TABLE "CardRecipient" ADD CONSTRAINT "CardRecipient_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE CASCADE ON UPDATE CASCADE;
