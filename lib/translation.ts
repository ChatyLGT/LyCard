import { createHash } from "crypto";

// Traducción al vuelo con IA (2026-10-06, pedido de Gunnar: "el sistema
// de traducción no traduce nada.. si hay que habilitar ia para traducir
// contenido que se haga"). El selector ES/EN de siempre (lib/i18n.ts)
// solo traducía el texto fijo de la interfaz -- nunca lo que un N0
// escribe a mano (nombre/título/cita, Mi camino, Bóveda, descripciones
// de niveles). Esto traduce ESO, bajo demanda: cuando un visitante toca
// EN, LyCardView.tsx arma un "bundle" plano {clave: texto en español} y
// llama a translateBundleAction (app/c/[slug]/translate-actions.ts,
// necesita el SDK real + ANTHROPIC_API_KEY, no se testea sin red) con
// TODOS los campos de la tarjeta de proyecto en una sola llamada a
// Claude -- nunca una llamada por campo. El resultado se cachea en
// ContentTranslation, indexado por hash del contenido + idioma: la
// próxima visita (o la próxima vez que alguien toca EN sin haber
// cambiado nada) sale de la DB, sin pegarle a Claude de nuevo. Si el N0
// edita cualquier campo, el hash cambia solo y se vuelve a traducir.
export const TRANSLATION_SYSTEM_PROMPT = `Traducís contenido real de una tarjeta de presentación digital (LyCard) del español al inglés. Te llega un objeto JSON plano {clave: texto en español}. Respondé ÚNICAMENTE un objeto JSON válido con las MISMAS claves, cada valor traducido al inglés -- tono profesional y natural, sin agregar ni quitar información, sin inventar contenido que no esté en el original, sin backticks ni texto antes o después del JSON. Si un valor es un nombre propio o ya está en inglés, dejalo como está.`;

// Mismo hash para el mismo contenido sin importar el orden en que se
// armó el bundle -- clave para que el caché pegue de verdad.
export function hashBundle(bundle: Record<string, string>): string {
  const sorted = Object.keys(bundle)
    .sort()
    .reduce<Record<string, string>>((acc, k) => {
      acc[k] = bundle[k];
      return acc;
    }, {});
  return createHash("sha256").update(JSON.stringify(sorted)).digest("hex");
}

// Intenta parsear directo; si el modelo igual envolvió el JSON en texto
// o backticks a pesar del pedido explícito, un segundo intento busca el
// primer objeto {...} -- mismo criterio que lib/aiAgent.ts. Solo
// conserva claves que de verdad se pidieron (descarta cualquier clave
// inventada) y valores que sean string no vacío.
export function parseTranslationResponse(raw: string, expectedKeys: string[]): Record<string, string> {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return {};
    try {
      data = JSON.parse(match[0]);
    } catch {
      return {};
    }
  }

  if (typeof data !== "object" || data === null || Array.isArray(data)) return {};
  const obj = data as Record<string, unknown>;
  const expected = new Set(expectedKeys);

  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (!expected.has(key)) continue;
    if (typeof value === "string" && value.trim()) result[key] = value.trim();
  }
  return result;
}
