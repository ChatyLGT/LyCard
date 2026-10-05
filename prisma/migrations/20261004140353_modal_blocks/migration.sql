-- AlterTable
ALTER TABLE "Program" DROP COLUMN "vaultCuadernoUrl",
DROP COLUMN "vaultSources",
ADD COLUMN     "vaultBlocks" JSONB NOT NULL DEFAULT '[]';
