-- CreateTable
CREATE TABLE "CardRecipientSource" (
    "id" TEXT NOT NULL,
    "cardRecipientId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "label" TEXT NOT NULL DEFAULT '',
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CardRecipientSource_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CardRecipientSource_cardRecipientId_idx" ON "CardRecipientSource"("cardRecipientId");

-- AddForeignKey
ALTER TABLE "CardRecipientSource" ADD CONSTRAINT "CardRecipientSource_cardRecipientId_fkey" FOREIGN KEY ("cardRecipientId") REFERENCES "CardRecipient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
