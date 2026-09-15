export type InterviewSlot = {
  id: string;
  label: string;
  labelEn: string;
  time: string;
};

// Fixed for now — Gunnar loads these by hand until there's an admin
// screen for managing them. Keep dates in the future.
export const INTERVIEW_SLOTS: InterviewSlot[] = [
  { id: "s1", label: "Martes 22 de Septiembre", labelEn: "Tuesday, September 22", time: "18:00 hs (GMT-6)" },
  { id: "s2", label: "Jueves 24 de Septiembre", labelEn: "Thursday, September 24", time: "10:00 hs (GMT-6)" },
  { id: "s3", label: "Sábado 26 de Septiembre", labelEn: "Saturday, September 26", time: "12:00 hs (GMT-6)" },
  { id: "s4", label: "Martes 29 de Septiembre", labelEn: "Tuesday, September 29", time: "18:00 hs (GMT-6)" },
];

export function slotById(id: string) {
  return INTERVIEW_SLOTS.find((s) => s.id === id) ?? null;
}
