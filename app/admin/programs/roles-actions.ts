"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { currentAdminScope, isMasterN0Scope, canAccessProgram } from "@/lib/auth";
import { isGrantableRole } from "@/lib/permissions";
import { syncStaffBridge } from "@/lib/staffBridgeDb";

// Fusión de identidad, etapa 3 (docs/11-DISENO-FUSION-IDENTIDAD.md): los roles
// se otorgan a un Member que ya está en el Programa -- no se crean cuentas con
// password. Solo el MasterN0 otorga/quita n0_programa; el N0 del Programa
// puede otorgar/quitar oreja dentro de su propio Programa.
async function requireRoleManager(programId: string, role: string) {
  const scope = await currentAdminScope();
  if (!scope) redirect("/admin/login");
  if (!canAccessProgram(scope, programId)) redirect("/admin/programs");
  if (role === "n0_programa" && !isMasterN0Scope(scope)) redirect(`/admin/programs/${programId}?adminError=forbidden`);
  return scope;
}

export async function grantMembershipRoleAction(programId: string, formData: FormData) {
  const membershipId = String(formData.get("membershipId") || "");
  const role = String(formData.get("role") || "");
  const errBase = `/admin/programs/${programId}`;
  if (!isGrantableRole(role) || role === "miembro") redirect(`${errBase}?adminError=role`);
  const scope = await requireRoleManager(programId, role);

  const membership = await prisma.programMembership.findUnique({ where: { id: membershipId }, select: { id: true, programId: true, memberId: true } });
  if (!membership || membership.programId !== programId) redirect(`${errBase}?adminError=member`);

  const grantedBy = scope.id
    ? (await prisma.admin.findUnique({ where: { id: scope.id }, select: { memberId: true } }))?.memberId ?? null
    : null;
  await prisma.membershipRole.upsert({
    where: { membershipId_role: { membershipId: membership.id, role } },
    update: {},
    create: { membershipId: membership.id, role, grantedByMemberId: grantedBy },
  });
  await syncStaffBridge(membership.memberId);

  revalidatePath(errBase);
  redirect(`${errBase}?adminCreated=1`);
}

export async function revokeMembershipRoleAction(programId: string, roleId: string) {
  const row = await prisma.membershipRole.findUnique({ where: { id: roleId }, include: { membership: { select: { programId: true, memberId: true } } } });
  if (!row || row.membership.programId !== programId) redirect(`/admin/programs/${programId}?adminError=member`);
  await requireRoleManager(programId, row.role);

  await prisma.membershipRole.delete({ where: { id: roleId } });
  await syncStaffBridge(row.membership.memberId);

  revalidatePath(`/admin/programs/${programId}`);
  redirect(`/admin/programs/${programId}?adminCreated=1`);
}
