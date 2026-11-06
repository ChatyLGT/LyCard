// Importador / exportador de Programas por JSON (2026-11-06, pedido de
// Gunnar: "que me permita ingresar un .json completo para que todo el
// programa y todas las tarjetas de ese programa se completen").
//
// Módulo PURO (sin Prisma): valida y normaliza el JSON, arma el plan de
// cambios (qué se crea, qué cambia, qué se conserva) y lo exporta de vuelta.
// La parte con base de datos vive en lib/programJsonDb.ts.
//
// Reglas del esquema `lycard.program/1`:
//   - Clave ausente = "no tocar". Clave presente = reemplaza ese campo entero.
//   - Se reusan los parsers que ya existen (escalas, superpoderes, botones
//     del podio, bloques de modales...). No se duplica validación.
//   - Descartar en silencio es peligroso: todo lo que se ignora o se corrige
//     queda listado en `discarded` con su motivo.
//   - Las URLs (íconos, medios, logos, retratos) solo pueden ser https o una
//     ruta propia que empiece con "/".
import { slugify } from "./slug";
import { parseImportedEscala } from "./escalas";
import { parseOfficeSkills } from "./officeSkills";
import { parseMotivationalPhrases } from "./oficinaExtras";
import { parsePodiumButtons } from "./podiumButtons";
import { parseModalBlocksMap } from "./modalBlocks";
import { parseModalIcons, parseTierIntros } from "./modalEditor";
import { parsePuestoTemplatePayload } from "./puestos";
import { wouldCreateCycle } from "./programLineage";

export const PROGRAM_JSON_SCHEMA = "lycard.program/1";
export const MAX_PROGRAM_JSON_BYTES = 256 * 1024;
export const MAX_META_BYTES = 8 * 1024;
const MAX_CARDS = 500;
const MAX_PUESTOS = 60;
const MAX_ESCALA_ITEMS = 30;
const MAX_LIST_ITEMS = 200;

export type Issue = { path: string; message: string };
export type Discard = { path: string; reason: string };

export const SOCIAL_KEYS = ["wa", "ig", "li", "x", "fb", "tiktok", "yt", "web"] as const;
export const CARD_KINDS = ["project", "company", "personal"] as const;
export const CARD_THEMES = ["dark", "light"] as const;
export const CARD_LANGS = ["es", "en"] as const;

// Campos de texto de la tarjeta -> largo máximo.
const CARD_TEXT_MAX: Record<string, number> = {
  name: 120,
  title: 160,
  quote: 400,
  siglas: 20,
  tooltip: 120,
  storyQuote: 600,
  storyBody: 4000,
  email: 160,
  location: 160,
  islandLabel: 120,
  oficinaObjetivo: 600,
};
const CARD_TIER_KEYS = ["medal", "rank", "contacts"] as const;
const CARD_ASSET_KEYS = ["logoUrl", "portraitUrl"] as const;

const PROGRAM_KEYS = [
  "name", "slug", "origin", "logoUrl", "cardAppName", "primaryColor", "social", "vaultTitle", "vaultPalabraSecreta",
  "cardLabels", "medalScale", "rankScale", "contactsScale", "officeSkills", "motivationalPhrases", "podiumButtons",
  "modalBlocks", "modalIcons", "tierIntros",
];
const PROGRAM_JSON_FIELDS = [
  "cardLabels", "medalScale", "rankScale", "contactsScale", "officeSkills", "motivationalPhrases", "podiumButtons",
  "modalBlocks", "modalIcons", "tierIntros",
] as const;
const PUESTO_KEYS = ["siglas", "denominacion", "descripcion", "icono", "order"];
const CARD_KEYS = [
  "slug", "ownerEmail", "puesto", "kind", "defaultTheme", "defaultLang",
  ...Object.keys(CARD_TEXT_MAX), ...CARD_TIER_KEYS, ...CARD_ASSET_KEYS, ...SOCIAL_KEYS,
];

export type PuestoItem = { siglas: string; denominacion: string; descripcion: string; icono: string; order: number };

// Campos planos de un Programa tal como los guarda la base (nombres de columna).
export type ProgramPatch = {
  name: string;
  slug: string;
  originProvided: boolean;
  origin: string | null;
  // Columnas escalares presentes en el JSON (logoUrl, cardAppName, wa, vaultTitle...).
  scalars: Record<string, string | null>;
  // Columnas Json presentes en el JSON, ya saneadas.
  json: Record<string, unknown>;
};

export type CardPatch = {
  slug: string;
  fields: Record<string, string | null>;
  ownerEmail?: string | null;
  puesto?: string | null;
};

export type NormalizedProgram = {
  meta: Record<string, unknown>;
  program: ProgramPatch;
  puestos: PuestoItem[] | null;
  cards: CardPatch[] | null;
};

export type ParseResult = {
  ok: boolean;
  errors: Issue[];
  discarded: Discard[];
  warnings: string[];
  data: NormalizedProgram | null;
};

// ---------------------------------------------------------------- helpers

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

// JSON con claves ordenadas: sirve para comparar valores sin depender del orden.
export function canon(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(canon).join(",")}]`;
  if (isObject(v)) {
    return `{${Object.keys(v)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${canon(v[k])}`)
      .join(",")}}`;
  }
  return JSON.stringify(v) ?? "null";
}

export function isSafeLink(value: string): boolean {
  const m = /^([a-z][a-z0-9+.-]*):/i.exec(value);
  if (!m) return true;
  return ["http", "https", "mailto", "tel"].includes(m[1].toLowerCase());
}

export function isSafeAsset(value: string): boolean {
  if (value === "") return true;
  if (/^https:\/\//i.test(value)) return true;
  return value.startsWith("/") && !value.startsWith("//");
}

// Recorre un valor ya saneado y junta las rutas de cualquier URL (clave que
// termina en url/href/src) que no sea https ni ruta propia.
export function findUnsafeUrls(value: unknown, path: string, out: string[] = []): string[] {
  if (Array.isArray(value)) {
    value.forEach((item, i) => findUnsafeUrls(item, `${path}[${i}]`, out));
  } else if (isObject(value)) {
    for (const [k, v] of Object.entries(value)) {
      if (typeof v === "string" && /(url|href|src)$/i.test(k)) {
        if (!isSafeAsset(v)) out.push(`${path}.${k}`);
      } else {
        findUnsafeUrls(v, `${path}.${k}`, out);
      }
    }
  }
  return out;
}

function isEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function isHexColor(v: string): boolean {
  return /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(v);
}

type Sink = { errors: Issue[]; discarded: Discard[]; warnings: string[] };

function unknownKeys(obj: Record<string, unknown>, known: string[], path: string, sink: Sink) {
  for (const k of Object.keys(obj)) {
    if (!known.includes(k)) sink.discarded.push({ path: `${path}.${k}`, reason: "Clave desconocida: se ignora." });
  }
}

// Lee un string opcional con largo máximo. Devuelve undefined si la clave
// no viene (= no tocar) o si no se pudo usar (queda en `discarded`).
function readString(obj: Record<string, unknown>, key: string, max: number, path: string, sink: Sink): string | undefined {
  if (!(key in obj)) return undefined;
  const v = obj[key];
  if (typeof v !== "string") {
    sink.discarded.push({ path: `${path}.${key}`, reason: "Tiene que ser texto: se ignora y queda el valor actual." });
    return undefined;
  }
  const t = v.trim();
  if (t.length > max) {
    sink.errors.push({ path: `${path}.${key}`, message: `Es demasiado largo (${t.length} caracteres, máximo ${max}).` });
    return undefined;
  }
  return t;
}

function noteDropped(path: string, before: number, after: number, sink: Sink) {
  if (after < before) {
    sink.discarded.push({
      path,
      reason: `${before - after} de ${before} elementos no eran válidos (faltaba algún dato obligatorio) y se descartaron.`,
    });
  }
}

function dupKeys(keys: string[]): string[] {
  return keys.filter((k, i) => keys.indexOf(k) !== i);
}

// ---------------------------------------------------------------- Programa

function parseJsonField(name: string, value: unknown, path: string, sink: Sink): unknown | undefined {
  switch (name) {
    case "medalScale":
    case "rankScale":
    case "contactsScale": {
      if (!Array.isArray(value)) return void sink.errors.push({ path, message: "Tiene que ser una lista de niveles." });
      if (value.length > MAX_ESCALA_ITEMS) return void sink.errors.push({ path, message: `Máximo ${MAX_ESCALA_ITEMS} niveles.` });
      const items = parseImportedEscala(JSON.stringify(value));
      noteDropped(path, value.length, items.length, sink);
      const dups = dupKeys(items.map((i) => i.key));
      if (dups.length) return void sink.errors.push({ path, message: `Hay claves repetidas: ${[...new Set(dups)].join(", ")}.` });
      return items;
    }
    case "officeSkills": {
      if (!Array.isArray(value)) return void sink.errors.push({ path, message: "Tiene que ser una lista." });
      if (value.length > MAX_LIST_ITEMS) return void sink.errors.push({ path, message: `Máximo ${MAX_LIST_ITEMS} elementos.` });
      const items = parseOfficeSkills(value);
      noteDropped(path, value.length, items.length, sink);
      const dups = dupKeys(items.map((i) => i.key));
      if (dups.length) return void sink.errors.push({ path, message: `Hay claves repetidas: ${[...new Set(dups)].join(", ")}.` });
      return items;
    }
    case "motivationalPhrases": {
      if (!Array.isArray(value)) return void sink.errors.push({ path, message: "Tiene que ser una lista de frases." });
      if (value.length > MAX_LIST_ITEMS) return void sink.errors.push({ path, message: `Máximo ${MAX_LIST_ITEMS} frases.` });
      const items = parseMotivationalPhrases(value);
      noteDropped(path, value.length, items.length, sink);
      if (items.some((p) => p.length > 300)) return void sink.errors.push({ path, message: "Una frase supera los 300 caracteres." });
      return items;
    }
    case "podiumButtons": {
      if (!Array.isArray(value)) return void sink.errors.push({ path, message: "Tiene que ser una lista." });
      const items = parsePodiumButtons(value);
      noteDropped(path, value.length, items.length, sink);
      return items;
    }
    case "modalBlocks": {
      if (!isObject(value)) return void sink.errors.push({ path, message: "Tiene que ser un objeto con una lista de bloques por modal." });
      // Ids determinísticos: si el bloque no trae id, importar dos veces el
      // mismo archivo no debe mostrar cambios falsos.
      const withIds: Record<string, unknown> = {};
      for (const [k, list] of Object.entries(value)) {
        withIds[k] = Array.isArray(list)
          ? list.map((b, i) => (isObject(b) && typeof b.id !== "string" ? { ...b, id: `${k}-${i + 1}` } : b))
          : list;
      }
      const out = parseModalBlocksMap(withIds);
      for (const [k, list] of Object.entries(withIds)) {
        const before = Array.isArray(list) ? list.length : 1;
        noteDropped(`${path}.${k}`, before, out[k]?.length ?? 0, sink);
      }
      return out;
    }
    case "modalIcons":
    case "tierIntros": {
      if (!isObject(value)) return void sink.errors.push({ path, message: "Tiene que ser un objeto de textos." });
      const out = name === "modalIcons" ? parseModalIcons(value) : parseTierIntros(value);
      for (const k of Object.keys(value)) {
        if (!(k in out)) sink.discarded.push({ path: `${path}.${k}`, reason: "Estaba vacío o no era texto: se descartó." });
      }
      return out;
    }
    default: {
      // cardLabels
      if (!isObject(value)) return void sink.errors.push({ path, message: "Tiene que ser un objeto de textos." });
      const out: Record<string, string> = {};
      for (const [k, v] of Object.entries(value)) {
        if (!/^[a-zA-Z][a-zA-Z0-9]{0,40}$/.test(k) || typeof v !== "string" || !v.trim() || v.length > 200) {
          sink.discarded.push({ path: `${path}.${k}`, reason: "Clave o texto no válido (vacío, no es texto o supera 200 caracteres): se descartó." });
        } else {
          out[k] = v.trim();
        }
      }
      return out;
    }
  }
}

function parseProgram(raw: unknown, sink: Sink): ProgramPatch | null {
  if (!isObject(raw)) {
    sink.errors.push({ path: "program", message: "Falta el bloque `program` (tiene que ser un objeto)." });
    return null;
  }
  unknownKeys(raw, PROGRAM_KEYS, "program", sink);

  const name = readString(raw, "name", 120, "program", sink);
  if (name === undefined && !sink.errors.some((e) => e.path === "program.name")) {
    sink.errors.push({ path: "program.name", message: "Falta el nombre del Programa." });
  } else if (name === "") {
    sink.errors.push({ path: "program.name", message: "El nombre del Programa no puede estar vacío." });
  }

  let slug = readString(raw, "slug", 60, "program", sink);
  if (slug === undefined && name) slug = slugify(name);
  else if (slug !== undefined) {
    const clean = slugify(slug);
    if (clean !== slug) sink.warnings.push(`El slug "${slug}" se normalizó a "${clean}".`);
    slug = clean;
  }
  if (!slug) sink.errors.push({ path: "program.slug", message: "No se pudo armar un slug válido (usá letras y números)." });

  let origin: string | null = null;
  let originProvided = false;
  if ("origin" in raw) {
    originProvided = true;
    if (raw.origin === null) origin = null;
    else if (typeof raw.origin === "string" && slugify(raw.origin)) origin = slugify(raw.origin);
    else sink.errors.push({ path: "program.origin", message: "Tiene que ser el slug del Programa de origen (o null para la raíz)." });
  }

  const scalars: Record<string, string | null> = {};
  for (const [key, max] of [["cardAppName", 60], ["vaultTitle", 80], ["vaultPalabraSecreta", 80]] as const) {
    const v = readString(raw, key, max, "program", sink);
    if (v !== undefined) scalars[key] = v;
  }
  if ("primaryColor" in raw) {
    const v = readString(raw, "primaryColor", 20, "program", sink);
    if (v !== undefined) {
      if (isHexColor(v)) scalars.primaryColor = v;
      else sink.discarded.push({ path: "program.primaryColor", reason: `"${v}" no es un color hexadecimal (ej. #C8A15A): se ignora y queda el actual.` });
    }
  }
  if ("logoUrl" in raw) {
    if (raw.logoUrl === null) scalars.logoUrl = null;
    else {
      const v = readString(raw, "logoUrl", 500, "program", sink);
      if (v !== undefined) {
        if (isSafeAsset(v)) scalars.logoUrl = v || null;
        else sink.errors.push({ path: "program.logoUrl", message: "Solo se permiten links https o rutas propias (que empiecen con /)." });
      }
    }
  }
  if ("social" in raw) {
    if (!isObject(raw.social)) {
      sink.errors.push({ path: "program.social", message: "Tiene que ser un objeto (wa, ig, li, x, fb, tiktok, yt, web)." });
    } else {
      unknownKeys(raw.social, [...SOCIAL_KEYS], "program.social", sink);
      for (const k of SOCIAL_KEYS) {
        const v = readString(raw.social, k, 300, "program.social", sink);
        if (v === undefined) continue;
        if (isSafeLink(v)) scalars[k] = v;
        else sink.errors.push({ path: `program.social.${k}`, message: "El link tiene un protocolo no permitido (solo http, https, mailto o tel)." });
      }
    }
  }

  const json: Record<string, unknown> = {};
  for (const field of PROGRAM_JSON_FIELDS) {
    if (!(field in raw)) continue;
    const path = `program.${field}`;
    const parsed = parseJsonField(field, raw[field], path, sink);
    if (parsed === undefined) continue;
    for (const bad of findUnsafeUrls(parsed, path)) {
      sink.errors.push({ path: bad, message: "Solo se permiten links https o rutas propias (que empiecen con /)." });
    }
    json[field] = parsed;
  }

  if (!name || !slug) return null;
  return { name, slug, originProvided, origin, scalars, json };
}

// ---------------------------------------------------------------- Puestos

function parsePuestos(raw: unknown, sink: Sink): PuestoItem[] | null {
  if (!Array.isArray(raw)) {
    sink.errors.push({ path: "puestos", message: "Tiene que ser una lista de puestos de la tarjeta." });
    return null;
  }
  if (raw.length > MAX_PUESTOS) {
    sink.errors.push({ path: "puestos", message: `Máximo ${MAX_PUESTOS} puestos.` });
    return null;
  }
  raw.forEach((p, i) => {
    if (isObject(p)) unknownKeys(p, PUESTO_KEYS, `puestos[${i}]`, sink);
  });
  const items = parsePuestoTemplatePayload(raw).map((p) => ({ ...p, siglas: p.siglas.trim(), denominacion: p.denominacion.trim() }));
  noteDropped("puestos", raw.length, items.length, sink);
  const dups = dupKeys(items.map((p) => p.siglas));
  if (dups.length) sink.errors.push({ path: "puestos", message: `Hay siglas repetidas: ${[...new Set(dups)].join(", ")}.` });
  items.forEach((p, i) => {
    if (p.siglas.length > 20) sink.errors.push({ path: `puestos[${i}].siglas`, message: "Máximo 20 caracteres." });
    if (p.denominacion.length > 80) sink.errors.push({ path: `puestos[${i}].denominacion`, message: "Máximo 80 caracteres." });
    if (p.descripcion.length > 400) sink.errors.push({ path: `puestos[${i}].descripcion`, message: "Máximo 400 caracteres." });
  });
  return items;
}

// ---------------------------------------------------------------- Tarjetas

function parseCard(raw: unknown, i: number, sink: Sink): CardPatch | null {
  const path = `cards[${i}]`;
  if (!isObject(raw)) {
    sink.errors.push({ path, message: "Cada tarjeta tiene que ser un objeto." });
    return null;
  }
  unknownKeys(raw, CARD_KEYS, path, sink);

  let slug = readString(raw, "slug", 60, path, sink);
  if (slug === undefined && typeof raw.name === "string") slug = slugify(raw.name);
  else if (slug !== undefined) slug = slugify(slug);
  if (!slug) sink.errors.push({ path: `${path}.slug`, message: "Falta el slug de la tarjeta (o un nombre para derivarlo)." });

  const fields: Record<string, string | null> = {};
  for (const [key, max] of Object.entries(CARD_TEXT_MAX)) {
    const v = readString(raw, key, max, path, sink);
    if (v !== undefined) fields[key] = v;
  }
  if (typeof fields.name !== "string" || !fields.name) {
    sink.errors.push({ path: `${path}.name`, message: "Falta el nombre de la tarjeta." });
  }
  if (fields.email && !isEmail(fields.email)) {
    sink.errors.push({ path: `${path}.email`, message: "El email de contacto no es válido." });
  }
  for (const k of SOCIAL_KEYS) {
    const v = readString(raw, k, 300, path, sink);
    if (v === undefined) continue;
    if (isSafeLink(v)) fields[k] = v;
    else sink.errors.push({ path: `${path}.${k}`, message: "El link tiene un protocolo no permitido (solo http, https, mailto o tel)." });
  }
  for (const k of CARD_ASSET_KEYS) {
    if (!(k in raw)) continue;
    if (raw[k] === null) {
      fields[k] = null;
      continue;
    }
    const v = readString(raw, k, 500, path, sink);
    if (v === undefined) continue;
    if (isSafeAsset(v)) fields[k] = v || null;
    else sink.errors.push({ path: `${path}.${k}`, message: "Solo se permiten links https o rutas propias (que empiecen con /)." });
  }
  for (const [key, allowed] of [["kind", CARD_KINDS], ["defaultTheme", CARD_THEMES], ["defaultLang", CARD_LANGS]] as const) {
    const v = readString(raw, key, 20, path, sink);
    if (v === undefined) continue;
    if ((allowed as readonly string[]).includes(v)) fields[key] = v;
    else sink.errors.push({ path: `${path}.${key}`, message: `Valor no válido "${v}". Opciones: ${allowed.join(", ")}.` });
  }
  for (const key of CARD_TIER_KEYS) {
    const v = readString(raw, key, 60, path, sink);
    if (v) fields[key] = v;
  }

  const card: CardPatch = { slug: slug ?? "", fields };
  if ("ownerEmail" in raw) {
    if (raw.ownerEmail === null || raw.ownerEmail === "") card.ownerEmail = null;
    else if (typeof raw.ownerEmail === "string" && isEmail(raw.ownerEmail.trim())) card.ownerEmail = raw.ownerEmail.trim().toLowerCase();
    else sink.errors.push({ path: `${path}.ownerEmail`, message: "El email del dueño no es válido." });
  }
  if ("puesto" in raw) {
    if (raw.puesto === null || raw.puesto === "") card.puesto = null;
    else if (typeof raw.puesto === "string") card.puesto = raw.puesto.trim();
    else sink.errors.push({ path: `${path}.puesto`, message: "Tiene que ser las siglas de un puesto del Programa." });
  }
  return card;
}

function parseCards(raw: unknown, sink: Sink): CardPatch[] | null {
  if (!Array.isArray(raw)) {
    sink.errors.push({ path: "cards", message: "Tiene que ser una lista de tarjetas." });
    return null;
  }
  if (raw.length > MAX_CARDS) {
    sink.errors.push({ path: "cards", message: `Máximo ${MAX_CARDS} tarjetas por archivo.` });
    return null;
  }
  const cards = raw.map((c, i) => parseCard(c, i, sink)).filter((c): c is CardPatch => c !== null);
  const dups = dupKeys(cards.map((c) => c.slug).filter(Boolean));
  if (dups.length) sink.errors.push({ path: "cards", message: `Hay slugs de tarjeta repetidos: ${[...new Set(dups)].join(", ")}.` });
  return cards;
}

// ---------------------------------------------------------------- Entrada

export function parseProgramJson(raw: string): ParseResult {
  const sink: Sink = { errors: [], discarded: [], warnings: [] };
  const fail = (): ParseResult => ({ ok: false, errors: sink.errors, discarded: sink.discarded, warnings: sink.warnings, data: null });

  if (new TextEncoder().encode(raw).length > MAX_PROGRAM_JSON_BYTES) {
    sink.errors.push({ path: "(archivo)", message: `El archivo supera el máximo de ${MAX_PROGRAM_JSON_BYTES / 1024} KB.` });
    return fail();
  }
  if (!raw.trim()) {
    sink.errors.push({ path: "(archivo)", message: "No hay nada para validar: pegá el JSON o elegí un archivo." });
    return fail();
  }
  let doc: unknown;
  try {
    doc = JSON.parse(raw);
  } catch (err) {
    sink.errors.push({ path: "(archivo)", message: `No es un JSON válido: ${(err as Error).message}` });
    return fail();
  }
  if (!isObject(doc)) {
    sink.errors.push({ path: "(raíz)", message: "El JSON tiene que ser un objeto." });
    return fail();
  }
  unknownKeys(doc, ["schema", "meta", "program", "puestos", "cards"], "", sink);
  // Las rutas de claves desconocidas de la raíz quedan como ".clave": se limpia el punto.
  sink.discarded.forEach((d) => (d.path = d.path.replace(/^\./, "")));

  if (doc.schema !== PROGRAM_JSON_SCHEMA) {
    sink.errors.push({
      path: "schema",
      message: `Tiene que decir "${PROGRAM_JSON_SCHEMA}" (dice ${JSON.stringify(doc.schema ?? null)}).`,
    });
  }

  let meta: Record<string, unknown> = {};
  if ("meta" in doc) {
    if (!isObject(doc.meta)) sink.errors.push({ path: "meta", message: "Tiene que ser un objeto libre." });
    else if (new TextEncoder().encode(JSON.stringify(doc.meta)).length > MAX_META_BYTES) {
      sink.errors.push({ path: "meta", message: `El bloque meta supera ${MAX_META_BYTES / 1024} KB.` });
    } else meta = doc.meta;
  }

  const program = parseProgram(doc.program, sink);
  const puestos = "puestos" in doc ? parsePuestos(doc.puestos, sink) : null;
  const cards = "cards" in doc ? parseCards(doc.cards, sink) : null;

  if (sink.errors.length > 0 || !program) return fail();
  return { ok: true, errors: [], discarded: sink.discarded, warnings: sink.warnings, data: { meta, program, puestos, cards } };
}

// ---------------------------------------------------------------- Estado actual / exportación

export type ProgramState = {
  program: Record<string, unknown> & { name: string; slug: string; origin: string | null };
  puestos: PuestoItem[];
  cards: Array<Record<string, unknown> & { slug: string }>;
};

type ProgramRow = Record<string, unknown> & { name: string; slug: string };
type CardRow = Record<string, unknown> & { slug: string };

// Arma el estado exportable a partir de filas de la base (objetos planos).
export function stateFromRows(
  program: ProgramRow,
  originSlug: string | null,
  puestos: PuestoItem[],
  cards: Array<CardRow & { puestoSiglas?: string | null; ownerEmail?: string | null }>
): ProgramState {
  const social: Record<string, string> = {};
  for (const k of SOCIAL_KEYS) social[k] = typeof program[k] === "string" ? (program[k] as string) : "";
  const prog: ProgramState["program"] = {
    name: program.name,
    slug: program.slug,
    origin: originSlug,
    logoUrl: (program.logoUrl as string | null | undefined) ?? null,
    cardAppName: (program.cardAppName as string | undefined) ?? "",
    primaryColor: (program.primaryColor as string | undefined) ?? "",
    social,
    vaultTitle: (program.vaultTitle as string | undefined) ?? "",
    vaultPalabraSecreta: (program.vaultPalabraSecreta as string | undefined) ?? "",
  };
  for (const f of PROGRAM_JSON_FIELDS) prog[f] = program[f] ?? (f === "modalBlocks" || f === "modalIcons" || f === "tierIntros" || f === "cardLabels" ? {} : []);

  const outCards = cards.map((c) => {
    const out: Record<string, unknown> & { slug: string } = { slug: c.slug };
    for (const k of Object.keys(CARD_TEXT_MAX)) out[k] = (c[k] as string | undefined) ?? "";
    for (const k of CARD_TIER_KEYS) out[k] = (c[k] as string | undefined) ?? "";
    for (const k of SOCIAL_KEYS) out[k] = (c[k] as string | undefined) ?? "";
    for (const k of CARD_ASSET_KEYS) out[k] = (c[k] as string | null | undefined) ?? null;
    out.kind = (c.kind as string | undefined) ?? "project";
    out.defaultTheme = (c.defaultTheme as string | undefined) ?? "dark";
    out.defaultLang = (c.defaultLang as string | undefined) ?? "es";
    out.puesto = c.puestoSiglas ?? null;
    out.ownerEmail = c.ownerEmail ?? "";
    return out;
  });
  return { program: prog, puestos: [...puestos].sort((a, b) => a.order - b.order || a.siglas.localeCompare(b.siglas)), cards: outCards };
}

export function buildExport(state: ProgramState, meta: Record<string, unknown> = {}) {
  return { schema: PROGRAM_JSON_SCHEMA, meta, program: state.program, puestos: state.puestos, cards: state.cards };
}

// ---------------------------------------------------------------- Plan de cambios

export type FieldChange = { field: string; before: unknown; after: unknown };
export type Change = {
  scope: "programa" | "puesto" | "tarjeta";
  target: string;
  kind: "nuevo" | "cambia" | "igual";
  fields: FieldChange[];
};

export type PlanContext = {
  // Todos los Programas existentes (para validar el linaje).
  programs: { slug: string; originSlug: string | null }[];
  // Estado actual del Programa con ese slug, o null si es nuevo.
  current: ProgramState | null;
  // Tarjetas ya existentes en la base cuyo slug aparece en el JSON.
  existingCards: { slug: string; programSlug: string | null; ownerEmail: string }[];
  // Claves de las escalas fijas del código (cuando el Programa no tiene escala propia).
  defaultTiers: { medal: string[]; rank: string[]; contacts: string[] };
};

export type CardWrite = {
  slug: string;
  isNew: boolean;
  data: Record<string, string | null>;
  puesto?: string | null;
  ownerEmail?: string | null;
};

export type Plan = {
  ok: boolean;
  errors: Issue[];
  programAction: "crear" | "actualizar";
  changes: Change[];
  counts: { puestosNuevos: number; puestosCambian: number; puestosConservados: number; tarjetasNuevas: number; tarjetasCambian: number; tarjetasIguales: number; tarjetasConservadas: number };
  writes: { program: { create: boolean; originSlug: string | null; originProvided: boolean; data: Record<string, unknown> }; puestos: PuestoItem[]; cards: CardWrite[] };
};

function tierKeys(patchScale: unknown, currentScale: unknown, fallback: string[]): string[] {
  const pick = (v: unknown) => (Array.isArray(v) ? v.map((i) => (i as { key: string }).key) : []);
  const fromPatch = patchScale !== undefined ? pick(patchScale) : [];
  if (patchScale !== undefined) return fromPatch.length ? fromPatch : fallback;
  const fromCurrent = pick(currentScale);
  return fromCurrent.length ? fromCurrent : fallback;
}

export function planImport(data: NormalizedProgram, ctx: PlanContext): Plan {
  const errors: Issue[] = [];
  const { program, puestos, cards } = data;
  const current = ctx.current;
  const isNew = current === null;

  // --- linaje
  let originSlug: string | null = current ? current.program.origin : null;
  if (program.originProvided) originSlug = program.origin;
  if (program.originProvided && originSlug) {
    if (originSlug !== program.slug && !ctx.programs.some((p) => p.slug === originSlug)) {
      errors.push({ path: "program.origin", message: `El Programa de origen "${originSlug}" no existe.` });
    } else {
      const nodes = ctx.programs.map((p) => ({ id: p.slug, originProgramId: p.originSlug }));
      if (wouldCreateCycle(nodes, program.slug, originSlug)) {
        errors.push({ path: "program.origin", message: "Ese origen crearía un ciclo en el linaje de Programas." });
      }
    }
  }
  if (isNew && !originSlug && ctx.programs.length > 0) {
    errors.push({ path: "program.origin", message: "Todo Programa nuevo deriva de uno existente: falta `program.origin` (slug del Programa de origen)." });
  }

  // --- puestos
  const currentPuestos = current?.puestos ?? [];
  const puestoChanges: Change[] = [];
  let puestosNuevos = 0;
  let puestosCambian = 0;
  for (const p of puestos ?? []) {
    const prev = currentPuestos.find((c) => c.siglas === p.siglas);
    if (!prev) {
      puestosNuevos++;
      puestoChanges.push({ scope: "puesto", target: p.siglas, kind: "nuevo", fields: [] });
      continue;
    }
    const fields = (["denominacion", "descripcion", "icono", "order"] as const)
      .filter((f) => canon(prev[f]) !== canon(p[f]))
      .map((f) => ({ field: f, before: prev[f], after: p[f] }));
    if (fields.length) puestosCambian++;
    puestoChanges.push({ scope: "puesto", target: p.siglas, kind: fields.length ? "cambia" : "igual", fields });
  }
  const puestoSiglas = new Set([...currentPuestos.map((p) => p.siglas), ...(puestos ?? []).map((p) => p.siglas)]);
  const puestosConservados = currentPuestos.filter((c) => !(puestos ?? []).some((p) => p.siglas === c.siglas)).length;

  // --- escalas efectivas para validar tarjetas
  const cur = current?.program;
  const medalKeys = tierKeys(program.json.medalScale, cur?.medalScale, ctx.defaultTiers.medal);
  const rankKeys = tierKeys(program.json.rankScale, cur?.rankScale, ctx.defaultTiers.rank);
  const contactsKeys = tierKeys(program.json.contactsScale, cur?.contactsScale, ctx.defaultTiers.contacts);
  const keysFor: Record<string, string[]> = { medal: medalKeys, rank: rankKeys, contacts: contactsKeys };

  // --- tarjetas
  const cardChanges: Change[] = [];
  const writes: CardWrite[] = [];
  let tarjetasNuevas = 0;
  let tarjetasCambian = 0;
  let tarjetasIguales = 0;
  const currentCards = current?.cards ?? [];
  for (const [i, c] of (cards ?? []).entries()) {
    const path = `cards[${i}]`;
    const existing = ctx.existingCards.find((e) => e.slug === c.slug);
    if (existing && existing.programSlug !== program.slug) {
      errors.push({ path: `${path}.slug`, message: `La tarjeta "${c.slug}" ya existe en otro Programa${existing.programSlug ? ` (${existing.programSlug})` : ""}.` });
    }
    for (const key of CARD_TIER_KEYS) {
      const v = c.fields[key];
      if (v && !keysFor[key].includes(v)) {
        errors.push({ path: `${path}.${key}`, message: `"${v}" no está en la escala de ${key === "medal" ? "medallas" : key === "rank" ? "rangos" : "contactos"} del Programa (${keysFor[key].join(", ")}).` });
      }
    }
    if (c.puesto && !puestoSiglas.has(c.puesto)) {
      errors.push({ path: `${path}.puesto`, message: `El puesto "${c.puesto}" no existe en este Programa (tiene que estar en \`puestos\`).` });
    }
    if (c.ownerEmail && existing && existing.ownerEmail && existing.ownerEmail.toLowerCase() !== c.ownerEmail) {
      errors.push({ path: `${path}.ownerEmail`, message: `La tarjeta "${c.slug}" ya tiene dueño (${existing.ownerEmail}): el JSON no reasigna dueños.` });
    }

    const prev = currentCards.find((p) => p.slug === c.slug);
    const data: Record<string, string | null> = { ...c.fields };
    if (!prev) {
      // Tarjeta nueva: si no trae nivel, arranca en el primero de la escala del Programa.
      for (const key of CARD_TIER_KEYS) if (!data[key] && keysFor[key].length) data[key] = keysFor[key][0];
      if (typeof data.title !== "string") data.title = "";
      if (typeof data.quote !== "string") data.quote = "";
      tarjetasNuevas++;
      cardChanges.push({ scope: "tarjeta", target: c.slug, kind: "nuevo", fields: [] });
    } else {
      const fields: FieldChange[] = Object.entries(data)
        .filter(([f, v]) => canon(prev[f] ?? null) !== canon(v ?? null))
        .map(([f, v]) => ({ field: f, before: prev[f] ?? null, after: v }));
      if ("puesto" in c && canon(prev.puesto ?? null) !== canon(c.puesto ?? null)) fields.push({ field: "puesto", before: prev.puesto ?? null, after: c.puesto ?? null });
      if (c.ownerEmail !== undefined && canon(prev.ownerEmail || null) !== canon(c.ownerEmail)) fields.push({ field: "ownerEmail", before: prev.ownerEmail || null, after: c.ownerEmail });
      if (fields.length) tarjetasCambian++;
      else tarjetasIguales++;
      cardChanges.push({ scope: "tarjeta", target: c.slug, kind: fields.length ? "cambia" : "igual", fields });
    }
    writes.push({ slug: c.slug, isNew: !prev, data, ...("puesto" in c ? { puesto: c.puesto } : {}), ...(c.ownerEmail !== undefined ? { ownerEmail: c.ownerEmail } : {}) });
  }
  const tarjetasConservadas = currentCards.filter((c) => !(cards ?? []).some((n) => n.slug === c.slug)).length;

  // --- Programa
  const programData: Record<string, unknown> = { name: program.name, ...program.scalars, ...program.json };
  const programFields: FieldChange[] = [];
  if (current) {
    const flatCurrent = (k: string): unknown => (current.program.social as Record<string, unknown>)[k] ?? current.program[k];
    for (const [k, v] of Object.entries(programData)) {
      const before = (SOCIAL_KEYS as readonly string[]).includes(k) ? flatCurrent(k) : current.program[k];
      if (canon(before ?? null) !== canon(v ?? null)) programFields.push({ field: k, before, after: v });
    }
    if (program.originProvided && canon(current.program.origin) !== canon(originSlug)) {
      programFields.push({ field: "origin", before: current.program.origin, after: originSlug });
    }
  }
  const programChange: Change = {
    scope: "programa",
    target: program.slug,
    kind: isNew ? "nuevo" : programFields.length ? "cambia" : "igual",
    fields: programFields,
  };

  return {
    ok: errors.length === 0,
    errors,
    programAction: isNew ? "crear" : "actualizar",
    changes: [programChange, ...puestoChanges, ...cardChanges],
    counts: { puestosNuevos, puestosCambian, puestosConservados, tarjetasNuevas, tarjetasCambian, tarjetasIguales, tarjetasConservadas },
    writes: {
      program: { create: isNew, originSlug, originProvided: program.originProvided, data: programData },
      puestos: puestos ?? [],
      cards: writes,
    },
  };
}

// ---------------------------------------------------------------- Textos legibles

const FIELD_LABELS: Record<string, string> = {
  name: "Nombre", origin: "Origen", logoUrl: "Logo", cardAppName: "Nombre de la app", primaryColor: "Color principal",
  vaultTitle: "Título de la Bóveda", vaultPalabraSecreta: "Palabra secreta", cardLabels: "Textos de botones y modales",
  medalScale: "Escala de medallas", rankScale: "Escala de rangos", contactsScale: "Escala de contactos",
  officeSkills: "Superpoderes (Oficina)", motivationalPhrases: "Frases motivacionales", podiumButtons: "Botones del podio",
  modalBlocks: "Bloques de modales", modalIcons: "Íconos de modales", tierIntros: "Introducciones de niveles",
  title: "Título", quote: "Frase", kind: "Tipo", siglas: "Siglas", tooltip: "Tooltip", storyQuote: "Frase del camino",
  storyBody: "Historia", email: "Email de contacto", location: "Ubicación", islandLabel: "Etiqueta de isla",
  oficinaObjetivo: "Objetivo de oficina", medal: "Medalla", rank: "Rango", contacts: "Contactos", puesto: "Puesto",
  ownerEmail: "Dueño (email)", defaultTheme: "Tema", defaultLang: "Idioma", portraitUrl: "Retrato", denominacion: "Denominación",
  descripcion: "Descripción", icono: "Ícono", order: "Orden", wa: "WhatsApp", ig: "Instagram", li: "LinkedIn", x: "X",
  fb: "Facebook", tiktok: "TikTok", yt: "YouTube", web: "Sitio web",
};

export function fieldLabel(field: string): string {
  return FIELD_LABELS[field] ?? field;
}

function brief(v: unknown): string {
  if (v === null || v === undefined || v === "") return "(vacío)";
  if (Array.isArray(v)) return `${v.length} elemento${v.length === 1 ? "" : "s"}`;
  if (isObject(v)) return `${Object.keys(v).length} clave${Object.keys(v).length === 1 ? "" : "s"}`;
  const s = String(v);
  return s.length > 60 ? `"${s.slice(0, 57)}..."` : `"${s}"`;
}

// Una línea por cambio, en español, lista para mostrar en pantalla.
export function describeChange(c: Change): string {
  const scope = c.scope === "programa" ? "Programa" : c.scope === "puesto" ? "Puesto" : "Tarjeta";
  if (c.kind === "nuevo") return `${scope} ${c.target}: se crea.`;
  if (c.kind === "igual") return `${scope} ${c.target}: sin cambios.`;
  const parts = c.fields.map((f) => `${fieldLabel(f.field)}: ${brief(f.before)} → ${brief(f.after)}`);
  return `${scope} ${c.target}: ${parts.join("; ")}.`;
}
