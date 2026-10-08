// Asistente "Configura tu LyCard" v2 -- Paso 2b (doc, sección 6.2.1):
// valores preconfigurados por el Programa que invitó al usuario.
// Archivo de datos aparte del guion (principio 9 del doc), mismo
// criterio que lib/assistantScript.ts: puro, sin DB, sin "use server".
//
// Orden de prioridad al mostrar una propuesta en S2 (doc): respuesta
// del usuario > preset del programa > propuesta del guion. La parte
// "respuesta del usuario" vive en la página (lee el AssistantAnswer
// real de la sesión); acá solo está el segundo escalón.
//
// Alcance de esta entrega: el único preset real es el de Legacy, y el
// propio documento dice que "puede estar casi vacío" -- a propósito
// queda vacío. No inventamos ningún valor de negocio acá (por ejemplo
// medal.fuente: el documento mismo dice "la fuente del nivel no está
// definida", así que sigue siendo Decisión abierta). Los valores reales
// se cargan después, con N0, usando el propio asistente (doc, 6.4) --
// no es este Paso el que los decide.
export const PRESETS: Record<string, Record<string, string>> = {
  legacy: {},
};

export function presetDePrograma(programSlug: string | null, preguntaId: string): string | null {
  if (!programSlug) return null;
  return PRESETS[programSlug]?.[preguntaId] ?? null;
}
