-- Viaje del Cliente, Fase 2 (2026-10-12) -- la Oreja agenda la entrevista
-- 1:1 de Legacy a mano desde su tablero, directo con el Lead. Ver
-- prisma/schema.prisma (ProgramMembership.nextInterviewAt).
ALTER TABLE "ProgramMembership" ADD COLUMN "nextInterviewAt" TIMESTAMP(3);
