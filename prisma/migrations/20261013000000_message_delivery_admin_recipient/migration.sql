-- Viaje del Cliente, Fase 3 (2026-10-13) -- la Oreja ya puede ser
-- destinataria real de un mensaje directo, mismo patrón que
-- Message.senderMemberId/senderAdminId. Ver prisma/schema.prisma.
ALTER TABLE "MessageDelivery" ALTER COLUMN "recipientMemberId" DROP NOT NULL;
ALTER TABLE "MessageDelivery" ADD COLUMN "recipientAdminId" TEXT;

ALTER TABLE "MessageDelivery" ADD CONSTRAINT "MessageDelivery_recipientAdminId_fkey" FOREIGN KEY ("recipientAdminId") REFERENCES "Admin"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "MessageDelivery_recipientAdminId_idx" ON "MessageDelivery"("recipientAdminId");
