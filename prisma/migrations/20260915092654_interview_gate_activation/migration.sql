-- AlterTable
ALTER TABLE "ProgramMembership" ADD COLUMN     "interviewedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Registration" ADD COLUMN     "membershipId" TEXT;

-- CreateIndex
CREATE INDEX "Registration_membershipId_idx" ON "Registration"("membershipId");

-- AddForeignKey
ALTER TABLE "Registration" ADD CONSTRAINT "Registration_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "ProgramMembership"("id") ON DELETE SET NULL ON UPDATE CASCADE;
