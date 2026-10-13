import { prisma } from "@/lib/prisma";
import { hasPermission, type Permission } from "@/lib/permissions";

// Fusión de identidad, etapa 1: UNA función para responder "¿puede este
// Member hacer X en este Programa?". Todavía no la usa ningún guard (la
// etapa 3 reemplaza currentAdminScope/currentEmployeeScope/resolveActingScope).
export async function can(memberId: string, programId: string | null, permission: Permission): Promise<boolean> {
  const platform = await prisma.platformRole.findUnique({ where: { memberId }, select: { role: true } });
  const isMasterN0 = platform?.role === "masterN0";
  if (isMasterN0) return hasPermission({ isMasterN0, roles: [], permission });
  if (!programId) return false;
  const membership = await prisma.programMembership.findFirst({
    where: { memberId, programId },
    select: { roles: { select: { role: true } } },
  });
  if (!membership) return false;
  return hasPermission({ isMasterN0: false, roles: membership.roles.map((r) => r.role), permission });
}
