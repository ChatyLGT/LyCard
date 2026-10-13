CREATE TABLE "MembershipRole" (
    "id" TEXT NOT NULL,
    "membershipId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "grantedByMemberId" TEXT,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MembershipRole_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "MembershipRole_membershipId_role_key" ON "MembershipRole"("membershipId", "role");
ALTER TABLE "MembershipRole" ADD CONSTRAINT "MembershipRole_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "ProgramMembership"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "PlatformRole" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PlatformRole_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PlatformRole_memberId_key" ON "PlatformRole"("memberId");
ALTER TABLE "PlatformRole" ADD CONSTRAINT "PlatformRole_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;
