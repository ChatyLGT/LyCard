-- AlterTable
ALTER TABLE "Card" ADD COLUMN     "contacts" TEXT NOT NULL DEFAULT 'plata';

-- AlterTable
ALTER TABLE "Program" ADD COLUMN     "contactsScale" JSONB NOT NULL DEFAULT '[]';

-- AlterTable
ALTER TABLE "Puesto" ADD COLUMN     "icono" TEXT NOT NULL DEFAULT 'diamond';
