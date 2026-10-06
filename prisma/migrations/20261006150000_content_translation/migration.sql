CREATE TABLE "ContentTranslation" (
    "id" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "lang" TEXT NOT NULL,
    "bundle" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContentTranslation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ContentTranslation_hash_lang_key" ON "ContentTranslation"("hash", "lang");
