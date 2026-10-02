export type InterviewSlot = {
  id: string;
  label: string;
  labelEn: string;
  time: string;
  date: string; // ISO yyyy-mm-dd -- ver upcomingSlots(), lo que faltaba antes
};

const WEEKDAY_ES = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const MONTH_ES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];
const WEEKDAY_EN = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTH_EN = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function nextWeekdayOnOrAfter(from: Date, targetDow: number): Date {
  const d = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
  const diff = (targetDow - d.getUTCDay() + 7) % 7;
  d.setUTCDate(d.getUTCDate() + diff);
  return d;
}

function toISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// Horarios de "Agendar tu Entrevista" -- antes una lista fija de 4 fechas
// de calendario (ver PLAN.md, hallazgo real 2026-10-02: las 4 quedaron en
// el pasado a las dos semanas y `upcomingSlots()` empezó a devolver un
// array vacío en producción, dejando el botón roto para cualquier Card sin
// Program con InterviewSlot reales cargados -- el caso de mastern0 mismo).
// Ahora se generan relativos a `now`, siempre a futuro, con el mismo
// patrón de siempre (martes 18hs, jueves 10hs, sábado 12hs, el martes
// siguiente 18hs) -- nunca vencen porque nunca son fechas fijas.
export function generateLegacySlots(now: Date = new Date()): InterviewSlot[] {
  const tue1 = nextWeekdayOnOrAfter(now, 2);
  const thu = nextWeekdayOnOrAfter(now, 4);
  const sat = nextWeekdayOnOrAfter(now, 6);
  const tue2 = new Date(tue1);
  tue2.setUTCDate(tue2.getUTCDate() + 7);

  const specs = [
    { d: tue1, time: "18:00 hs (GMT-6)" },
    { d: thu, time: "10:00 hs (GMT-6)" },
    { d: sat, time: "12:00 hs (GMT-6)" },
    { d: tue2, time: "18:00 hs (GMT-6)" },
  ];

  // Ordenados por fecha (no por el orden fijo martes/jueves/sábado/martes
  // de arriba) -- según qué día de la semana sea `now`, el sábado puede
  // caer antes que el martes o el jueves siguientes, y la lista tiene que
  // reflejar el orden real en el que van a pasar, no el orden en que se
  // calcularon. `slots[0]` es siempre el próximo turno disponible de
  // verdad -- de eso depende el auto-booking de PASO 6.
  return specs
    .map((s) => ({
      label: `${capitalize(WEEKDAY_ES[s.d.getUTCDay()])} ${s.d.getUTCDate()} de ${MONTH_ES[s.d.getUTCMonth()]}`,
      labelEn: `${WEEKDAY_EN[s.d.getUTCDay()]}, ${MONTH_EN[s.d.getUTCMonth()]} ${s.d.getUTCDate()}`,
      time: s.time,
      date: toISO(s.d),
    }))
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((s, i) => ({ id: `s${i + 1}`, ...s }));
}

export function slotById(id: string, now: Date = new Date()): InterviewSlot | null {
  return generateLegacySlots(now).find((s) => s.id === id) ?? null;
}

// `isSlotUpcoming` ya no puede dar false para nada que salga de
// `generateLegacySlots` (siempre genera a futuro) -- queda igual de
// todas formas: es la misma validación defensiva del lado del servidor
// que ya existía (un slot real de un Program sí puede volverse viejo).
export function isSlotUpcoming(slot: InterviewSlot, now: Date = new Date()): boolean {
  return slot.date >= now.toISOString().slice(0, 10);
}

export function upcomingSlots(now: Date = new Date()): InterviewSlot[] {
  return generateLegacySlots(now).filter((s) => isSlotUpcoming(s, now));
}
