// Bitácora de sesiones (2026-10-12) -- registro honesto de que la
// Oreja completó una sesión con un Miembro, con notas libres. A
// propósito NO tiene un checklist de ítems fijos ni un número total
// de sesiones esperado (el mockup "Óculo de la Oreja" inventaba "8
// entrevistas clínicas" con ítems como "firma de bifurcación de
// Gemelo Digital" -- eso no es metodología real de Legacy todavía,
// es ambientación de producto). Cuando Gunnar defina el contenido
// real de cada sesión, se agrega sobre esta misma bitácora.
export type SessionLogEntry = {
  sessionNumber: number;
  notes: string;
  loggedAt: string; // ISO
  loggedByAdminId: string;
};

export function parseSessionLog(raw: unknown): SessionLogEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (e): e is SessionLogEntry =>
      typeof e === "object" &&
      e !== null &&
      typeof (e as SessionLogEntry).sessionNumber === "number" &&
      typeof (e as SessionLogEntry).notes === "string" &&
      typeof (e as SessionLogEntry).loggedAt === "string" &&
      typeof (e as SessionLogEntry).loggedByAdminId === "string"
  );
}

export function nextSessionNumber(log: SessionLogEntry[]): number {
  if (log.length === 0) return 1;
  return Math.max(...log.map((e) => e.sessionNumber)) + 1;
}
