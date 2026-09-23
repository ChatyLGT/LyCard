export type InterviewSlot = {
  id: string;
  label: string;
  labelEn: string;
  time: string;
  date: string; // ISO yyyy-mm-dd -- ver upcomingSlots(), lo que faltaba antes
};

// Fixed for now — Gunnar loads these by hand until there's an admin
// screen for managing them. Keep dates in the future.
export const INTERVIEW_SLOTS: InterviewSlot[] = [
  { id: "s1", label: "Martes 22 de Septiembre", labelEn: "Tuesday, September 22", time: "18:00 hs (GMT-6)", date: "2026-09-22" },
  { id: "s2", label: "Jueves 24 de Septiembre", labelEn: "Thursday, September 24", time: "10:00 hs (GMT-6)", date: "2026-09-24" },
  { id: "s3", label: "Sábado 26 de Septiembre", labelEn: "Saturday, September 26", time: "12:00 hs (GMT-6)", date: "2026-09-26" },
  { id: "s4", label: "Martes 29 de Septiembre", labelEn: "Tuesday, September 29", time: "18:00 hs (GMT-6)", date: "2026-09-29" },
];

export function slotById(id: string) {
  return INTERVIEW_SLOTS.find((s) => s.id === id) ?? null;
}

// Auditoría 2026-09-23, hallazgo 2.1: un array hardcodeado sin lógica de
// vencimiento es una fecha de caducidad garantizada, no una posibilidad --
// "Martes 22" ya había pasado y seguía siendo reservable. `slotById` sigue
// resolviendo slots vencidos a propósito (una Registration vieja tiene que
// poder seguir mostrando el nombre de su slot); esto solo filtra qué se
// OFRECE para reservar de acá en adelante. `now` es inyectable para poder
// testear sin mockear el reloj del sistema.
export function isSlotUpcoming(slot: InterviewSlot, now: Date = new Date()): boolean {
  return slot.date >= now.toISOString().slice(0, 10);
}

export function upcomingSlots(now: Date = new Date()): InterviewSlot[] {
  return INTERVIEW_SLOTS.filter((s) => isSlotUpcoming(s, now));
}
