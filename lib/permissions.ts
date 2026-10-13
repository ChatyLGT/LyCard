// Fusión de identidad, etapa 1 (docs/11-DISENO-FUSION-IDENTIDAD.md §3).
// Catálogo puro de roles y permisos, sin DB: lo consume lib/can.ts y lo
// auditan Sergio y Fabricio. "miembro" es implícito en toda membresía.
export type ProgramRole = "miembro" | "oreja" | "n0_programa";
export type PlatformRoleKey = "masterN0";

export const PERMISSIONS = [
  "card.edit_own",
  "office.use",
  "google.connect_own",
  "leads.claim",
  "leads.view_pool",
  "interview.schedule",
  "interview.complete",
  "door.assign",
  "payment.mark",
  "session.log",
  "biztocard.run",
  "chat.lead",
  "commission.view_own",
  "program.edit",
  "program.members",
  "schedule.edit",
  "commission.view_all",
] as const;
export type Permission = (typeof PERMISSIONS)[number];

const MIEMBRO: Permission[] = ["card.edit_own", "office.use", "google.connect_own"];

const OREJA: Permission[] = [
  ...MIEMBRO,
  "leads.claim",
  "leads.view_pool",
  "interview.schedule",
  "interview.complete",
  "door.assign",
  "payment.mark",
  "session.log",
  "biztocard.run",
  "chat.lead",
  "commission.view_own",
];

const N0_PROGRAMA: Permission[] = [...OREJA, "program.edit", "program.members", "schedule.edit", "commission.view_all"];

export const ROLE_PERMISSIONS: Record<ProgramRole, readonly Permission[]> = {
  miembro: MIEMBRO,
  oreja: OREJA,
  n0_programa: N0_PROGRAMA,
};

export const GRANTABLE_ROLES: readonly ProgramRole[] = ["oreja", "n0_programa"];

export function isGrantableRole(value: string): value is ProgramRole {
  return (GRANTABLE_ROLES as readonly string[]).includes(value);
}

/** Permisos efectivos de una membresía (el rol "miembro" siempre se suma). */
export function permissionsForRoles(roles: readonly string[]): Set<Permission> {
  const out = new Set<Permission>(ROLE_PERMISSIONS.miembro);
  for (const r of roles) {
    if (isGrantableRole(r)) ROLE_PERMISSIONS[r].forEach((p) => out.add(p));
  }
  return out;
}

/** MasterN0 puede todo, en todos los Programas. */
export function hasPermission(args: { isMasterN0: boolean; roles: readonly string[]; permission: Permission }): boolean {
  if (args.isMasterN0) return true;
  return permissionsForRoles(args.roles).has(args.permission);
}
