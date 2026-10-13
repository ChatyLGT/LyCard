// Fusión de identidad, etapa 3 (docs/11-DISENO-FUSION-IDENTIDAD.md §6):
// los roles elevados viven en MembershipRole/PlatformRole, y cada Member con
// un rol elevado tiene UNA fila "puente" en Admin (sin email ni password,
// ligada por Admin.memberId) que es lo que leen los guards existentes
// (currentAdminScope / currentEmployeeScope). Así el login es solo Google
// (cookie de Member) y no hace falta reescribir los 56 archivos de permisos.
// Este módulo es puro: decide qué fila puente le corresponde a un Member.
export type StaffRoleInput = { programId: string; role: string };
export type BridgeSpec = { programId: string | null; adminRole: "owner" | "empleado" };

export function bridgeFromRoles(isMasterN0: boolean, roles: StaffRoleInput[]): BridgeSpec | null {
  if (isMasterN0) return { programId: null, adminRole: "owner" };
  const n0 = roles.find((r) => r.role === "n0_programa");
  if (n0) return { programId: n0.programId, adminRole: "owner" };
  const oreja = roles.find((r) => r.role === "oreja");
  if (oreja) return { programId: oreja.programId, adminRole: "empleado" };
  return null;
}
