// Agente especialista para generar botones del podio a medida
// (2026-10-04, pedido de Gunnar: "con apoyo de un agente especialista
// dedicado.. poder crear otras funcionalidades con ia"). El llamado real
// a Anthropic vive en app/admin/programs/ai-agent-actions.ts (necesita
// el SDK + ANTHROPIC_API_KEY, no se puede testear sin pegarle a una API
// real) -- este archivo tiene la parte PURA: el prompt del sistema y el
// parseo/validación de la respuesta del modelo, que sí se testea sin red.
export const AI_AGENT_SYSTEM_PROMPT = `Generás contenido para UN botón informativo dentro de una tarjeta digital de presentación (LyCard). Nunca generás código, scripts ni instrucciones ejecutables -- solo texto que se muestra tal cual en un modal, nada se ejecuta. Respondé ÚNICAMENTE con un objeto JSON válido, sin texto antes ni después ni backticks, con exactamente estas claves:
- "title": string, máximo 40 caracteres, en español.
- "icon": string, un nombre válido de Google Material Symbols en inglés y snake_case (ej. "calculate", "menu_book", "handshake").
- "body": string, máximo 600 caracteres, en español, texto plano sin markdown.`;

export type AiAgentSpec = { title: string; icon: string; body: string };

// Intenta parsear directo; si el modelo igual envolvió el JSON en texto
// o backticks a pesar del pedido explícito, un segundo intento busca el
// primer objeto {...} dentro de la respuesta antes de rendirse.
export function parseAiAgentResponse(raw: string): AiAgentSpec | null {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      data = JSON.parse(match[0]);
    } catch {
      return null;
    }
  }

  if (typeof data !== "object" || data === null) return null;
  const obj = data as Record<string, unknown>;

  const title = typeof obj.title === "string" ? obj.title.trim().slice(0, 40) : "";
  const icon = typeof obj.icon === "string" ? obj.icon.trim() : "";
  const body = typeof obj.body === "string" ? obj.body.trim().slice(0, 600) : "";

  if (!title || !icon || !body) return null;
  return { title, icon, body };
}
