-- AlterTable
ALTER TABLE "Member" ADD COLUMN     "googleBridgeFolderId" TEXT,
ADD COLUMN     "googleConnectedAt" TIMESTAMP(3),
ADD COLUMN     "googleRefreshToken" TEXT,
ADD COLUMN     "googleScopes" TEXT;
