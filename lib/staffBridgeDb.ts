import { prisma } from "@/lib/prisma";
import { bridgeFromRoles } from "@/lib/staffBridge";

// Recalcula la fila puente de Admin de un Member a partir de sus roles reales.
// Se llama cada vez que se otorga o revoca un rol (y al sembrar al MasterN0).
// Un Member tiene como máximo UN puente (Admin.memberId es único): el rol más
// alto manda. Si ya no tiene roles elevados, el puente se borra.
export async function syncStaffBridge(memberId: string): Promise<void> {
  const [platform, memberships] = await Promise.all([
    prisma.platformRole.findUnique({ where: { memberId }, select: { role: true } }),
    prisma.programMembership.findMany({ where: { memberId }, select: { programId: true, roles: { select: { role: true } } } }),
  ]);
  const roles = memberships.flatMap((m) => m.roles.map((r) => ({ programId: m.programId, role: r.role })));
  const spec = bridgeFromRoles(platform?.role === "masterN0", roles);
  const existing = await prisma.admin.findUnique({ where: { memberId }, select: { id: true } });

  if (!spec) {
    if (existing) await prisma.admin.delete({ where: { id: existing.id } });
    return;
  }
  if (existing) {
    await prisma.admin.update({ where: { id: existing.id }, data: { programId: spec.programId, role: spec.adminRole } });
  } else {
    await prisma.admin.create({ data: { memberId, programId: spec.programId, role: spec.adminRole } });
  }
}
