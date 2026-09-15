// A single tier within a Program-defined scale (Medallón or Sabiduría —
// PLAN.md Fase 9.4/9.5). `key` is what gets stored on Card.medal/Card.rank,
// same slot the fixed lib/data.ts ids used before this existed.
export type EscalaItem = {
  key: string;
  nombre: string;
  subtitulo: string;
  icono: string; // Material Symbols name — meaningful mainly for Sabiduría
  color: string; // hex/CSS color — meaningful mainly for Medallón
  descripcion: string; // shown in the tier's modal body on the public card
};

export function parseEscala(value: unknown): EscalaItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((v): v is Record<string, unknown> => typeof v === "object" && v !== null)
    .map((v) => ({
      key: typeof v.key === "string" ? v.key : "",
      nombre: typeof v.nombre === "string" ? v.nombre : "",
      subtitulo: typeof v.subtitulo === "string" ? v.subtitulo : "",
      icono: typeof v.icono === "string" ? v.icono : "",
      color: typeof v.color === "string" ? v.color : "",
      descripcion: typeof v.descripcion === "string" ? v.descripcion : "",
    }))
    .filter((item) => item.key && item.nombre);
}
