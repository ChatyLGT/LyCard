-- AlterTable
ALTER TABLE "Registration" ADD COLUMN     "networkMembershipId" TEXT;

-- CreateTable
CREATE TABLE "CardNetworkMembership" (
    "id" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "referredByMembershipId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'invited',
    "interviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CardNetworkMembership_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CardNetworkMembership_memberId_cardId_key" ON "CardNetworkMembership"("memberId", "cardId");

-- CreateIndex
CREATE INDEX "Registration_networkMembershipId_idx" ON "Registration"("networkMembershipId");

-- AddForeignKey
ALTER TABLE "CardNetworkMembership" ADD CONSTRAINT "CardNetworkMembership_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardNetworkMembership" ADD CONSTRAINT "CardNetworkMembership_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardNetworkMembership" ADD CONSTRAINT "CardNetworkMembership_referredByMembershipId_fkey" FOREIGN KEY ("referredByMembershipId") REFERENCES "CardNetworkMembership"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Registration" ADD CONSTRAINT "Registration_networkMembershipId_fkey" FOREIGN KEY ("networkMembershipId") REFERENCES "CardNetworkMembership"("id") ON DELETE SET NULL ON UPDATE CASCADE;
