-- AlterTable
ALTER TABLE "Admin" ADD COLUMN     "programId" TEXT;

-- AddForeignKey
ALTER TABLE "Admin" ADD CONSTRAINT "Admin_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE SET NULL ON UPDATE CASCADE;
