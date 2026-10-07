-- Panel de Empleados (2026-10-07): distingue un Admin "owner" (MasterN0
-- o N0 de Programa clásico) de uno "empleado" (acceso independiente,
-- /empleados/login). Default "owner" preserva el comportamiento de
-- toda fila existente.
ALTER TABLE "Admin" ADD COLUMN "role" TEXT NOT NULL DEFAULT 'owner';
