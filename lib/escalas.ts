// A single tier within a Program-defined scale (Medallón de Resultados,
// Medallón de Imán o Contactos — PLAN.md Fase 9.4/9.5, renombradas
// 2026-10-04). `key` is what gets stored on Card.medal/Card.rank, same
// slot the fixed lib/data.ts ids used before this existed.
export type EscalaItem = {
  key: string;
  nombre: string;
  subtitulo: string;
  icono: string; // Material Symbols name — se muestra DENTRO del círculo de color
  color: string; // hex/CSS color — fondo del círculo en dashboard y tarjeta
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

// Lee cualquiera de los dos juegos de nombres de campo -- el shape interno
// (key/nombre/subtitulo/icono/descripcion) o el que devuelve un LLM al que
// se le pide la estructura en español con tildes (Clave/Nombre/Subtítulo/
// Ícono/Descripción). Gunnar pegó exactamente esa segunda forma (2026-10-04,
// armando "Medallón de Resultados"/"Medallón de Imán" a mano: "hacerlo
// manual es tardado") -- esto es lo que hace que pegar ese bloque una vez
// reemplace escribir 8-14 niveles uno por uno en el acordeón.
function pickField(o: Record<string, unknown>, ...names: string[]): string {
  for (const n of names) {
    const v = o[n];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function parseImportedEscala(raw: string): EscalaItem[] {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(data)) return [];
  return data
    .filter((v): v is Record<string, unknown> => typeof v === "object" && v !== null)
    .map((o) => {
      const nombre = pickField(o, "nombre", "Nombre", "name", "Name");
      const key = pickField(o, "key", "clave", "Clave") || (nombre ? slugify(nombre) : "");
      return {
        key,
        nombre,
        subtitulo: pickField(o, "subtitulo", "subtítulo", "Subtítulo", "Subtitulo", "subtitle"),
        color: pickField(o, "color", "Color"),
        icono: pickField(o, "icono", "ícono", "Ícono", "Icono", "icon", "Icons"),
        descripcion: pickField(o, "descripcion", "descripción", "Descripción", "Descripcion", "description"),
      };
    })
    .filter((it) => it.key && it.nombre);
}
