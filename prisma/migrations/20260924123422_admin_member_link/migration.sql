-- AlterTable
ALTER TABLE "Admin" ADD COLUMN     "memberId" TEXT,
ALTER COLUMN "email" DROP NOT NULL,
ALTER COLUMN "passwordHash" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Admin_memberId_key" ON "Admin"("memberId");

-- AddForeignKey
ALTER TABLE "Admin" ADD CONSTRAINT "Admin_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

