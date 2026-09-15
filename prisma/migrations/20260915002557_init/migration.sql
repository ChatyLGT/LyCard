-- CreateTable
CREATE TABLE "Card" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "quote" TEXT NOT NULL,
    "siglas" TEXT NOT NULL DEFAULT 'O.D.',
    "tooltip" TEXT NOT NULL DEFAULT 'Order of Distinction',
    "medal" TEXT NOT NULL DEFAULT 'oro',
    "rank" TEXT NOT NULL DEFAULT 'aprendiz',
    "wa" TEXT NOT NULL DEFAULT '',
    "ig" TEXT NOT NULL DEFAULT '',
    "li" TEXT NOT NULL DEFAULT '',
    "x" TEXT NOT NULL DEFAULT '',
    "portraitUrl" TEXT,
    "videoThumbnailUrl" TEXT,
    "defaultTheme" TEXT NOT NULL DEFAULT 'dark',
    "defaultLang" TEXT NOT NULL DEFAULT 'es',

    CONSTRAINT "Card_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Card_slug_key" ON "Card"("slug");
