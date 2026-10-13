// Bitácora de sesiones (2026-10-12) -- registro honesto de que la
// Oreja completó una sesión con un Miembro, con notas libres. A
// propósito NO tiene un checklist de ítems fijos ni un número total
// de sesiones esperado (el mockup "Óculo de la Oreja" inventaba "8
// entrevistas clínicas" con ítems como "firma de bifurcación de
// Gemelo Digital" -- eso no es metodología real de Legacy todavía,
// es ambientación de producto). Cuando Gunnar defina el contenido
// real de cada sesión, se agrega sobre esta misma bitácora.
//
// commissionUsd (Fase 4, 2026-10-13) -- snapshot de lo que esa sesión
// puntual le valió a la Oreja, calculado una sola vez al loguearla
// (lib/commissions.ts) y nunca recalculado después (si el Admin
// cambia traidoPor/paymentModel más tarde, las sesiones viejas no se
// reescriben -- es historia, no un reporte en vivo). Las sesiones
// logueadas ANTES de que existiera este campo no lo tienen -- se
// normalizan a 0 en vez de inventarles una comisión retroactiva.
export type SessionLogEntry = {
  sessionNumber: number;
  notes: string;
  loggedAt: string; // ISO
  loggedByAdminId: string;
  commissionUsd: number;
};

export function parseSessionLog(raw: unknown): SessionLogEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (e): e is Omit<SessionLogEntry, "commissionUsd"> & { commissionUsd?: unknown } =>
        typeof e === "object" &&
        e !== null &&
        typeof (e as SessionLogEntry).sessionNumber === "number" &&
        typeof (e as SessionLogEntry).notes === "string" &&
        typeof (e as SessionLogEntry).loggedAt === "string" &&
        typeof (e as SessionLogEntry).loggedByAdminId === "string"
    )
    .map((e) => ({ ...e, commissionUsd: typeof e.commissionUsd === "number" ? e.commissionUsd : 0 }));
}

export function nextSessionNumber(log: SessionLogEntry[]): number {
  if (log.length === 0) return 1;
  return Math.max(...log.map((e) => e.sessionNumber)) + 1;
}
