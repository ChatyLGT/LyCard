-- Viaje del Cliente -- puerta de acceso (2026-10-07). Extiende
-- ProgramMembership, la fila que ya viaja por el embudo de conversión
-- (invited -> interviewed -> active -> paid), en vez de crear un modelo
-- nuevo. Ver MENU_ACCESO_LEGACY v1.1 (Drive, MAMEN) y
-- docs/WHITEPAPER-ADENDA-2026-10-07.md sección 9.
ALTER TABLE "ProgramMembership" ADD COLUMN "doorKey" TEXT;
ALTER TABLE "ProgramMembership" ADD COLUMN "priceAgreedUsd" INTEGER;
ALTER TABLE "ProgramMembership" ADD COLUMN "paymentModel" TEXT;
ALTER TABLE "ProgramMembership" ADD COLUMN "traidoPor" TEXT;
ALTER TABLE "ProgramMembership" ADD COLUMN "doorAssignedAt" TIMESTAMP(3);
ALTER TABLE "ProgramMembership" ADD COLUMN "soldByAdminId" TEXT;
