import { prisma } from "@/lib/prisma";
import { syncStaffBridge } from "@/lib/staffBridgeDb";

// Migración suave de la fusión de identidad: un Admin "clásico" (con email) que
// todavía no tiene Member ligado se liga la primera vez que entra con Google
// usando ese mismo email (misma regla que tenía el login de Google de /admin).
// Así el MasterN0 existente no queda afuera cuando se retira el password.
// Solo liga MasterN0 global (programId null, owner): ese pasa a tener
// PlatformRole "masterN0". Los N0/Orejas de Programa se re-otorgan desde
// "Roles del equipo" (un Admin con programId no se convierte solo en rol).
export async function linkLegacyAdminByEmail(memberId: string, email: string): Promise<void> {
  const already = await prisma.admin.findUnique({ where: { memberId }, select: { id: true } });
  if (already) return;
  const legacy = await prisma.admin.findUnique({ where: { email: email.trim().toLowerCase() }, select: { id: true, memberId: true, programId: true, role: true } });
  if (!legacy || legacy.memberId || legacy.programId !== null || legacy.role !== "owner") return;
  const existingMaster = await prisma.platformRole.findFirst({ where: { role: "masterN0" }, select: { memberId: true } });
  if (existingMaster && existingMaster.memberId !== memberId) return;

  await prisma.admin.update({ where: { id: legacy.id }, data: { memberId } });
  await prisma.platformRole.upsert({ where: { memberId }, update: {}, create: { memberId, role: "masterN0" } });
  await syncStaffBridge(memberId);
}
