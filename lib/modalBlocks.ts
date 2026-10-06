// Editor de Modales (2026-10-04, pedido de Gunnar: "podamos crear un
// editor de modales.. no solo el contenido sino tambien los
// elementos.. por ejemplo si se muestra un video, o un audio, o un
// archivo, o un texto.. es como el editor de un formulario"). Un
// ModalBlock es un elemento libre dentro de un modal -- el N0 arma el
// cuerpo completo del modal agregando bloques en el orden que quiera
// (reordenable con flechas arriba/abajo, no drag&drop -- decisión
// explícita de Gunnar, más simple y confiable en mobile).
//
// Piloto de esta primera vuelta: solo la Bóveda Legacy
// (Program.vaultBlocks) usa este sistema. Los modales selectores de
// nivel (Medalla/Rangos/Puestos) NO entran acá -- esos no son
// "contenido libre", son estado real de la Card (cada tile mueve un
// campo en la DB al tocarlo), y conviene que sigan con su editor
// propio (EscalaEditor). "Info [nombre]"/"Deja tu Legado"/"Mi camino"
// quedan con su contenido fijo de siempre hasta una vuelta futura.
//
// Bloques de tipo "pregunta"/"encuesta" (pedidos también por Gunnar)
// quedan fuera de esta vuelta a propósito: a diferencia de estos 5,
// necesitan guardar RESPUESTAS de visitantes (un modelo nuevo en la
// DB + una vista de resultados en el dashboard), no solo mostrar
// contenido -- es una pieza de otra naturaleza, se construye aparte.
export type ModalBlockKind = "texto" | "imagen" | "video_audio" | "archivo_link" | "kpi";

export const MODAL_BLOCK_KINDS: ModalBlockKind[] = ["texto", "imagen", "video_audio", "archivo_link", "kpi"];

export const MODAL_BLOCK_LABELS: Record<ModalBlockKind, string> = {
  texto: "Texto",
  imagen: "Imagen",
  video_audio: "Video / Audio",
  archivo_link: "Archivo / botón-link",
  kpi: "KPI (número destacado)",
};

// Shape plano (todas las columnas existen siempre, cada kind usa las
// que le importan) -- mismo criterio que PodiumButtonConfig: más
// fácil de parsear/guardar como JSON que una unión discriminada.
export type ModalBlock = {
  id: string;
  kind: ModalBlockKind;
  heading: string; // texto: título. video_audio/kpi: etiqueta.
  body: string; // texto: párrafo. imagen: leyenda/caption.
  mediaUrl: string; // imagen/video_audio/archivo_link: la URL.
  mediaType: "video" | "audio"; // solo relevante para kind:"video_audio".
  linkLabel: string; // archivo_link: texto del botón.
  kpiValue: string; // kpi: el número/valor grande.
  kpiSub: string; // kpi: aclaración chica debajo del valor.
};

// Editor de Modales -- Unificación (2026-10-06, pedido de Gunnar tras
// no encontrar dónde vivía el título/contenido de "cardInfo": "no se
// que has echo.. en ningun lado puedo leer ni se donde esta el texto
// del título o del contenido"). Antes cada modal con bloques tenía su
// propia columna (Program.vaultBlocks, Program.cardInfoBlocks) -- un
// mapa único (Program.modalBlocks, clave = ModalKey) deja agregar
// bloques a cualquier modal (info, etc.) sin una migración nueva cada
// vez, y los agrupa todos bajo el mismo "Editor de Modales".
export function parseModalBlocksMap(value: unknown): Record<string, ModalBlock[]> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out: Record<string, ModalBlock[]> = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    const blocks = parseModalBlocks(raw);
    if (blocks.length > 0) out[key] = blocks;
  }
  return out;
}

export function parseModalBlocks(value: unknown): ModalBlock[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((v): v is Record<string, unknown> => typeof v === "object" && v !== null)
    .map((v): ModalBlock => ({
      id: typeof v.id === "string" && v.id ? v.id : Math.random().toString(36).slice(2),
      kind: MODAL_BLOCK_KINDS.includes(v.kind as ModalBlockKind) ? (v.kind as ModalBlockKind) : "texto",
      heading: typeof v.heading === "string" ? v.heading : "",
      body: typeof v.body === "string" ? v.body : "",
      mediaUrl: typeof v.mediaUrl === "string" ? v.mediaUrl : "",
      mediaType: v.mediaType === "audio" ? "audio" : "video",
      linkLabel: typeof v.linkLabel === "string" ? v.linkLabel : "",
      kpiValue: typeof v.kpiValue === "string" ? v.kpiValue : "",
      kpiSub: typeof v.kpiSub === "string" ? v.kpiSub : "",
    }));
}

// Detecta si una URL de video es un embed de YouTube/Vimeo (hay que
// meterla en un <iframe>) o un archivo directo (.mp4 etc, sirve un
// <video>). Heurística simple por dominio -- alcanza para los casos
// reales que va a pegar un N0 (copiar/pegar el link de YouTube).
export function isEmbedVideoUrl(url: string): boolean {
  return /youtube\.com|youtu\.be|vimeo\.com/i.test(url);
}

export function toEmbedVideoUrl(url: string): string {
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  const vimeo = url.match(/vimeo\.com\/(\d+)/);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
  return url;
}
