// Wrappers finitos de las 3 APIs de Google que usa la conexión real
// (Fase F, 2026-09-19) — sin SDK, fetch directo, mismo estilo lean que
// lib/googleOAuth.ts. Cada función recibe un access_token ya vigente
// (lib/googleOAuth.ts#refreshGoogleAccessToken se llama antes, en el
// caller — acá no se cachea nada, se refresca en cada uso real porque
// el volumen de esta Skill es bajo).

const CALENDAR_EVENTS_URL = "https://www.googleapis.com/calendar/v3/calendars/primary/events";
const TASKS_URL = "https://tasks.googleapis.com/tasks/v1/lists/@default/tasks";
const DRIVE_FILES_URL = "https://www.googleapis.com/drive/v3/files";
const DRIVE_UPLOAD_URL = "https://www.googleapis.com/upload/drive/v3/files";

const BRIDGE_FOLDER_NAME = "LyCard · Bridge RAW (Protocolo Dirac)";

export async function createCalendarEvent(
  accessToken: string,
  { title, description, startISO }: { title: string; description: string; startISO: string }
) {
  const start = new Date(startISO);
  const end = new Date(start.getTime() + 30 * 60_000);
  const res = await fetch(CALENDAR_EVENTS_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      summary: title,
      description,
      start: { dateTime: start.toISOString() },
      end: { dateTime: end.toISOString() },
    }),
  });
  if (!res.ok) throw new Error(`Google Calendar create event failed: ${res.status} ${await res.text()}`);
  return (await res.json()) as { id: string; htmlLink: string };
}

export async function createTask(accessToken: string, { title, notes }: { title: string; notes: string }) {
  const res = await fetch(TASKS_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ title, notes }),
  });
  if (!res.ok) throw new Error(`Google Tasks create failed: ${res.status} ${await res.text()}`);
  return (await res.json()) as { id: string };
}

// Busca la carpeta Bridge que ya creamos antes (por si el caller perdió
// el id guardado); si no existe, la crea. drive.file solo ve archivos
// creados por esta app, así que esta búsqueda nunca "encuentra" una
// carpeta preexistente del usuario — es intencional (ver nota de scope
// en lib/googleOAuth.ts).
export async function ensureBridgeFolder(accessToken: string): Promise<string> {
  const q = encodeURIComponent(`name='${BRIDGE_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`);
  const searchRes = await fetch(`${DRIVE_FILES_URL}?q=${q}&fields=files(id,name)`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (searchRes.ok) {
    const data = (await searchRes.json()) as { files: { id: string; name: string }[] };
    if (data.files?.length) return data.files[0].id;
  }

  const createRes = await fetch(DRIVE_FILES_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ name: BRIDGE_FOLDER_NAME, mimeType: "application/vnd.google-apps.folder" }),
  });
  if (!createRes.ok) throw new Error(`Google Drive create Bridge folder failed: ${createRes.status} ${await createRes.text()}`);
  const folder = (await createRes.json()) as { id: string };
  return folder.id;
}

// Escribe un .md estampado #Dirac dentro de la carpeta Bridge — el
// "aterrizaje en 99_RAW" real de cualquier contenido que EinarOS deba
// poder entender después (hoy: Notas de Voz). Multipart simple (metadata
// + contenido), un solo request.
export async function writeBridgeFile(
  accessToken: string,
  folderId: string,
  { filename, content }: { filename: string; content: string }
) {
  const boundary = "lycard-dirac-boundary";
  const metadata = { name: filename, parents: [folderId], mimeType: "text/markdown" };
  const body =
    `--${boundary}\r\n` +
    `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
    `${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\n` +
    `Content-Type: text/markdown\r\n\r\n` +
    `${content}\r\n` +
    `--${boundary}--`;

  const res = await fetch(`${DRIVE_UPLOAD_URL}?uploadType=multipart`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": `multipart/related; boundary=${boundary}` },
    body,
  });
  if (!res.ok) throw new Error(`Google Drive write Bridge file failed: ${res.status} ${await res.text()}`);
  return (await res.json()) as { id: string };
}

// El frontmatter + footer #dirac exactos que pide Protocolo Dirac
// (docs/, ver README_ESTRUCTURA_EINAROS_V3_1_DIRAC_STAMP.md) — todo lo
// que entra a Einar aterriza en RAW con este estampado antes de que un
// agente lo clasifique y lo mueva a su lugar real.
export function buildDiracStampedMarkdown({
  title,
  origin,
  body,
}: {
  title: string;
  origin: string;
  body: string;
}) {
  const now = new Date().toISOString();
  return `---
titulo: "${title}"
nodo_origen: "${origin}"
autoridad_mandante: "N0"
timestamp: "${now}"
estado_sincronizacion: "raw_sin_estampar"
---

${body}

---
#dirac
z_{n+1}=z_n^2+t^3
`;
}
