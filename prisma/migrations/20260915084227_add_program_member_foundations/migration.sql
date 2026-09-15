-- AlterTable
ALTER TABLE "Card" ADD COLUMN     "kind" TEXT NOT NULL DEFAULT 'project',
ADD COLUMN     "memberId" TEXT,
ADD COLUMN     "programId" TEXT;

-- CreateTable
CREATE TABLE "Program" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "logoUrl" TEXT,
    "primaryColor" TEXT NOT NULL DEFAULT '#C8A15A',
    "videoThumbnailUrl" TEXT,
    "wa" TEXT NOT NULL DEFAULT '',
    "ig" TEXT NOT NULL DEFAULT '',
    "li" TEXT NOT NULL DEFAULT '',
    "x" TEXT NOT NULL DEFAULT '',
    "fb" TEXT NOT NULL DEFAULT '',
    "tiktok" TEXT NOT NULL DEFAULT '',
    "yt" TEXT NOT NULL DEFAULT '',
    "web" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Program_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Member" (
    "id" TEXT NOT NULL,
    "whatsapp" TEXT NOT NULL,
    "email" TEXT NOT NULL DEFAULT '',
    "googleId" TEXT,
    "name" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Member_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProgramMembership" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "referredByMembershipId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'invited',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProgramMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OriginMemento" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OriginMemento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Program_slug_key" ON "Program"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Member_whatsapp_key" ON "Member"("whatsapp");

-- CreateIndex
CREATE UNIQUE INDEX "Member_googleId_key" ON "Member"("googleId");

-- CreateIndex
CREATE UNIQUE INDEX "ProgramMembership_memberId_programId_key" ON "ProgramMembership"("memberId", "programId");

-- CreateIndex
CREATE UNIQUE INDEX "OriginMemento_memberId_key" ON "OriginMemento"("memberId");

-- AddForeignKey
ALTER TABLE "Card" ADD CONSTRAINT "Card_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Card" ADD CONSTRAINT "Card_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgramMembership" ADD CONSTRAINT "ProgramMembership_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgramMembership" ADD CONSTRAINT "ProgramMembership_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgramMembership" ADD CONSTRAINT "ProgramMembership_referredByMembershipId_fkey" FOREIGN KEY ("referredByMembershipId") REFERENCES "ProgramMembership"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OriginMemento" ADD CONSTRAINT "OriginMemento_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;
