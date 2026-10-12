// Bolsa de Leads (2026-10-12) -- "temperatura" de un lead sin dueño,
// calculada del único dato real que tenemos: cuánto hace que se
// registró sin que ninguna Oreja lo haya tomado. Nada de un score de
// IA inventado ("94% hot") como en el mockup de referencia -- esto es
// una regla de umbral sobre un timestamp real, documentada acá mismo.
export type LeadTemperature = "caliente" | "tibio" | "frio";

const CALIENTE_HORAS = 2;
const TIBIO_HORAS = 24;

export function leadTemperature(createdAt: Date, now: Date = new Date()): LeadTemperature {
  const horas = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
  if (horas < CALIENTE_HORAS) return "caliente";
  if (horas < TIBIO_HORAS) return "tibio";
  return "frio";
}

export const LEAD_TEMPERATURE_LABEL: Record<LeadTemperature, string> = {
  caliente: "Caliente",
  tibio: "Tibio",
  frio: "Frío",
};
