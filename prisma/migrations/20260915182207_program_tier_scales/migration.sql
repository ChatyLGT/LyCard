-- AlterTable
ALTER TABLE "Program" ADD COLUMN     "medalScale" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "rankScale" JSONB NOT NULL DEFAULT '[]';
