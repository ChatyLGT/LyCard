ALTER TABLE "Admin" ADD COLUMN "ownMemberId" TEXT;
CREATE UNIQUE INDEX "Admin_ownMemberId_key" ON "Admin"("ownMemberId");
ALTER TABLE "Admin" ADD CONSTRAINT "Admin_ownMemberId_fkey" FOREIGN KEY ("ownMemberId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;
