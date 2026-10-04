-- AlterTable
ALTER TABLE "Program" ADD COLUMN     "podiumButtons" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "vaultCuadernoUrl" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "vaultPalabraSecreta" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "vaultSources" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "vaultTitle" TEXT NOT NULL DEFAULT 'Bóveda Legacy';
