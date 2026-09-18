-- AlterTable
ALTER TABLE "Card" ADD COLUMN     "calendarEvents" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "isDemo" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "newsItems" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "oficinaObjetivo" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "realityCheckKpis" JSONB NOT NULL DEFAULT '[]';

-- AlterTable
ALTER TABLE "Program" ADD COLUMN     "isDemo" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "motivationalPhrases" JSONB NOT NULL DEFAULT '[]';
