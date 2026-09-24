-- CreateTable
CREATE TABLE "AweWalkEntry" (
    "id" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "photoStartUrl" TEXT NOT NULL DEFAULT '',
    "photoMidUrl" TEXT NOT NULL DEFAULT '',
    "photoEndUrl" TEXT NOT NULL DEFAULT '',
    "voiceNoteId" TEXT,
    "aweIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AweWalkEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AweWalkEntry_voiceNoteId_key" ON "AweWalkEntry"("voiceNoteId");

-- CreateIndex
CREATE INDEX "AweWalkEntry_cardId_idx" ON "AweWalkEntry"("cardId");

-- AddForeignKey
ALTER TABLE "AweWalkEntry" ADD CONSTRAINT "AweWalkEntry_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AweWalkEntry" ADD CONSTRAINT "AweWalkEntry_voiceNoteId_fkey" FOREIGN KEY ("voiceNoteId") REFERENCES "VoiceNote"("id") ON DELETE SET NULL ON UPDATE CASCADE;
