// WowJobs (2026-10-13, nomenclatura de Gunnar): así como una WowApp es una
// herramienta que instalás y un WowHead es un agente IA que contratás (trabaja
// PARA vos), un WowJob es un puesto que ejercés dentro del Programa (trabajás
// PARA el Programa). El primero es "Oreja". Cada WowJob lo asigna el MasterN0
// o el N0 del Programa (MembershipRole, ver docs/11-DISENO-FUSION-IDENTIDAD.md).
export type WowJobKey = "oreja";

export type WowJob = { key: WowJobKey; nombre: string; resumen: string; href: string };

export const WOW_JOBS_CATALOG: Record<WowJobKey, WowJob> = {
  oreja: {
    key: "oreja",
    nombre: "Oreja",
    resumen: "Acompañás a cada cliente desde la Masterclass y durante toda su suscripción: leads, entrevistas, puertas, sesiones y cuidado mensual.",
    href: "/empleados",
  },
};

export type StaffRef = { role: string; programId: string | null } | null;

/** WowJobs que puede abrir una persona según su fila puente (owner o empleado). */
export function wowJobsFor(staff: StaffRef): WowJob[] {
  if (!staff) return [];
  if (staff.role !== "owner" && staff.role !== "empleado") return [];
  return [WOW_JOBS_CATALOG.oreja];
}
