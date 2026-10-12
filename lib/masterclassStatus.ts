// Viaje del Cliente -- Pool General de Leads (2026-10-12, pedido de
// Gunnar): el color de un Lead en la bolsa es real, sacado de su
// asistencia de verdad a la Masterclass -- nunca un score inventado.
// Regla (confirmada con Gunnar): 0 reagendados todavía = verde; 1
// reagendado después de faltar = amarillo; 2+ reagendados, o la fecha
// de su slot ya pasó sin que haya asistido ni vuelto a agendar = rojo.
export type MasterclassStatus = "verde" | "amarillo" | "rojo" | "asistio";

export type MasterclassLogEntry = {
  type: "no_show_rescheduled";
  previousDate: string; // ISO -- la fecha del slot al que faltó
  loggedAt: string; // ISO -- cuándo se detectó el reagendado
};

export function parseMasterclassLog(raw: unknown): MasterclassLogEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (e): e is MasterclassLogEntry =>
      typeof e === "object" &&
      e !== null &&
      (e as MasterclassLogEntry).type === "no_show_rescheduled" &&
      typeof (e as MasterclassLogEntry).previousDate === "string" &&
      typeof (e as MasterclassLogEntry).loggedAt === "string"
  );
}

// `slotDate` es null cuando el Registration usa el fallback legacy de
// lib/interviewSlots.ts (sin InterviewSlot real cargado para ese
// Programa) -- esas fechas se regeneran siempre a futuro relativas a
// "ahora", así que no hay ninguna fecha persistida real contra la que
// comparar. En ese caso, sin reagendados logueados, el Lead queda
// verde por honestidad (no inventamos un vencimiento que no podemos
// confirmar) en vez de arriesgar un rojo falso.
export function masterclassStatus(
  registration: { attendedAt: Date | null; masterclassLog: MasterclassLogEntry[]; slotDate: Date | null },
  now: Date = new Date()
): MasterclassStatus {
  if (registration.attendedAt) return "asistio";

  const reagendados = registration.masterclassLog.length;
  if (reagendados >= 2) return "rojo";
  if (reagendados === 1) return "amarillo";

  if (registration.slotDate && registration.slotDate < now) return "rojo";
  return "verde";
}

export const MASTERCLASS_STATUS_LABEL: Record<MasterclassStatus, string> = {
  verde: "Verde",
  amarillo: "Amarillo",
  rojo: "Rojo",
  asistio: "Asistió",
};
