-- Bolsa de Leads + bitácora de sesiones (2026-10-12), pedido de Gunnar
-- de desarrollar el Panel de Empleados ("dashboard de la oreja") con
-- los puntos reales/construibles del mockup "Óculo de la Oreja":
-- claim de leads sobre Registration, y log de sesiones sobre
-- ProgramMembership (sin inventar un checklist/cantidad de sesiones
-- que no es contenido real todavía).
ALTER TABLE "Registration" ADD COLUMN "claimedByAdminId" TEXT;
ALTER TABLE "Registration" ADD COLUMN "claimedAt" TIMESTAMP(3);

ALTER TABLE "ProgramMembership" ADD COLUMN "sessionLog" JSONB NOT NULL DEFAULT '[]';
