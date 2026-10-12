-- Viaje del Cliente -- estado real de Masterclass (2026-10-12), pedido
-- de Gunnar: el Pool General de Leads con color real (verde/amarillo/
-- rojo) según asistencia/reagendado, no un "tiempo desde que se
-- registró" inventado. Ver lib/masterclassStatus.ts.
ALTER TABLE "Registration" ADD COLUMN "attendedAt" TIMESTAMP(3);
ALTER TABLE "Registration" ADD COLUMN "masterclassLog" JSONB NOT NULL DEFAULT '[]';
