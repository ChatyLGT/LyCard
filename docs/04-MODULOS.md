# Módulos ya construidos

Todo lo de acá está en producción hoy. Para lo que falta construir, ver
[05-ROADMAP-EDT.md](./05-ROADMAP-EDT.md).

## Tarjeta pública

**Archivos:** `app/c/[slug]/page.tsx` (fetch de la Card + resolución de
Program/Member/Puesto), `components/LyCardView.tsx` (el render completo:
identidad, medallón, badges, canales, carrusel, QR, modal de versión).

Resuelve por `slug` sin importar sesión — pública por diseño. Si
`card.isOrigin` es true, se muestra en modo host a cualquiera sin login.

**Privacidad entre las 3 Cards de un Member** (`lib/shareScope.ts`,
2026-09-19): cada Card tiene su propio `shareScope` (qué otros `kind`
sumar al carrusel swipeable cuando UN VISITANTE abre esa Card puntual).
Vacío por default — una Card se ve sola hasta que su dueño prende a
mano, desde su propio editor, cuáles de las otras 2 mostrar también. El
dueño mirando sus propias 3 Cards (`isHost`) no tiene esta restricción,
siempre las ve juntas — es sobre lo que ve un tercero, no sobre la
navegación propia.

## Admin (panel del Admin/N0)

**Archivos:** `app/admin/page.tsx` (roster, agrupado por Programa),
`app/admin/[slug]/page.tsx` (editor de una Card), `app/admin/login`,
`app/admin/account` (cambio de contraseña), `app/admin/programs/*` (CRUD de
Programs, miembros, Puestos — MasterN0 crea Programs, un N0 de Programa
solo ve el suyo), `app/admin/interviews` (registros de "Agendar tu
Entrevista"), `app/admin/reset` (recuperación de contraseña).

Auth: `lib/auth.ts` (`isMasterN0()`, `currentAdminScope()`). Toda action de
`/admin` valida el scope antes de tocar datos — nunca confíes en que la UI
ya filtró.

**Bitácora de login** (`app/admin/login-history/page.tsx`, MasterN0-only,
linkeada desde `/admin/account`): registro de todo intento de entrar al
panel — password o Google, éxito o falla — modelo `AdminLoginEvent`,
logueado desde `loginAction` y desde
`app/admin/auth/google/callback/route.ts`. Primer paso de lo que Gunnar
pidió como "un tipo CRM" de auditoría del panel — ver
[05-ROADMAP-EDT.md](./05-ROADMAP-EDT.md#pendiente-de-definir-crm-del-dashboard-vs-crm-de-la-oficina-virtual)
para la distinción (todavía sin resolver del todo) entre este y el CRM
de onboarding de clientes.

## Oficina Virtual

**Archivo central:** `app/c/[slug]/oficina/page.tsx`. Se bifurca en
`OwnerOficina` (el dueño logueado) y `VisitorOficina` (cualquier otro) —
el visitante ve una versión de solo-explicación, nunca datos reales
(cáscara honesta). El dueño ve, de arriba a abajo hoy: saludo,
Superpoderes, la Malla del equipo, el botón del Gemelo Digital.

`dashboardHref` decide a dónde manda "Editar Oficina": si es un Admin, va
directo al dashboard del Programa (`/admin/programs/[id]?focus=officeSkills`)
o al roster (`/admin/[slug]`) — nunca a la pantalla de alta de Member
(`/m/login`), que es solo para Members reales.

## Superpoderes

**Archivos:** `lib/officeSkills.ts` (tipos + parser + `DEFAULT_OFFICE_SKILLS`),
`components/OfficeSkillsBlock.tsx` (el grid de íconos en la Oficina),
`components/OfficeSkillsEditor.tsx` (acordeón de edición, en el dashboard
del Programa). Cada Superpoder es `{key, nombre, descripcion, iconUrl,
color, appType, enabled}`, guardado en `Program.officeSkills`. Tocar un
ícono abre una tarjeta con dos caras: la app real de un lado (hoy: el Brief
de Fathom), la explicación del otro — el visitante solo ve la explicación.

## Brief de reuniones (Fathom) — el primer Superpoder real

**Archivos:** `lib/fathom.ts` (cliente de la API pública de Fathom, con
paginación completa hasta agotar la cuenta), `components/FathomBriefBlock.tsx`
(el render). Sin `FATHOM_API_KEY` configurada, se degrada limpio
(`enabled:false`) — nunca rompe la Oficina.

## Notas de Voz

**Archivos:** `components/VoiceNotesBlock.tsx` (grabación con
`MediaRecorder` del navegador, sin dependencia nueva de npm),
`app/c/[slug]/oficina/voiceNotes-actions.ts` (server actions: guardar,
consultar estado), `lib/transcription.ts` (cliente de AssemblyAI —
transcripción + resumen en una sola API), `prisma.VoiceNote` (modelo:
`audioUrl`, `status`, `transcript`, `summary`). El audio se guarda de
verdad (`lib/storage.ts`, mismo mecanismo que las fotos). Sin
`ASSEMBLYAI_API_KEY` configurada, la nota queda honestamente en "grabada
— esperando transcripción" para siempre, nunca inventa un resumen.

## Conexión real de Google (Calendar + Tasks + Drive)

**Archivos:** `lib/googleOAuth.ts` (extiende el login de Member — Fase
1 — con un segundo flujo `buildGoogleConnectUrl`/`exchangeGoogleConnectCode`/
`refreshGoogleAccessToken`, `access_type=offline` + `prompt=consent`, para
tener refresh_token, algo que el login normal no necesita ni pide),
`lib/googleServices.ts` (wrappers de Calendar Events, Tasks y Drive:
`createCalendarEvent`, `createTask`, `ensureBridgeFolder`,
`writeBridgeFile`, `buildDiracStampedMarkdown`), rutas
`app/m/auth/google/connect-start` y `connect-callback` (arrancan desde
una Card puntual vía `?cardId=`, resuelven el dueño con el mismo chequeo
`isHost` que usa toda la app), `components/AgendaBlock.tsx` (el
Superpoder "Agenda": botón "Conectar Google" o el estado ya conectado,
más la lista de tareas/eventos con su etiqueta Real/Simulado).

Scope pedido a propósito acotado — `calendar.events` + `tasks` +
`drive.file` (nunca `drive` completo) — para no disparar la revisión de
apps sensibles de Google. `drive.file` solo ve archivos que esta app
creó, así que la carpeta Bridge (`Member.googleBridgeFolderId`) la crea
LyCard la primera vez y el N0 la reubica dentro de su 99_RAW real si
quiere (ver Protocolo Dirac en [01-VISION-Y-ALCANCE.md](./01-VISION-Y-ALCANCE.md)).

Cuando una Nota de Voz queda lista (`voiceNotes-actions.ts#orchestrateReadyNote`):
si el dueño de la Card ya conectó Google, se crea una Tarea + un evento
reales y se escribe el resumen estampado `#dirac` en su carpeta Bridge;
si no, la misma entrada cae en `Card.calendarEvents` marcada
`"voz-simulado"` — la Agenda nunca queda vacía, y nunca miente sobre
cuál de las dos cosas está pasando.

**Login con Google para Admin** (`app/admin/auth/google/start` +
`callback`, mismo `lib/googleOAuth.ts`): un tercer flujo, separado tanto
del login de Member como de "Conectar Google" — es solo un método de
autenticación alternativo (más seguro que contraseña) para una cuenta de
Admin que ya existe. El callback busca el email de Google contra la
tabla `Admin`; si no hay match, no entra. Nunca crea una fila de Admin —
ver la regla dura en
[02-ARQUITECTURA.md](./02-ARQUITECTURA.md#regla-dura-quién-puede-volverse-adminn0).

## Favicon/nombre de app por Programa

**Archivos:** `lib/cardMetadata.ts` (`buildCardMetadata(slug)`),
`generateMetadata` en `app/c/[slug]/page.tsx` y
`app/c/[slug]/oficina/page.tsx`. `Program.cardAppName` (nuevo campo,
reusa `Program.logoUrl` que ya existía) reemplaza el `<title>` "LyCard"
y el favicon genérico en las tarjetas de ese Programa — editable en
`/admin/programs/[id]`. Solo aplica a project cards (las únicas con
Program); sin nada configurado, cae al ícono/nombre de siempre del
layout raíz. `app/favicon.ico` (el triángulo del scaffold de
`create-next-app`, nunca reemplazado) se sacó del repo para que no
compita con el override.

## La Malla del equipo

**Archivos:** `components/MallaGraph.tsx` (grafo 3D con three.js, hecho a
mano — no es una librería de grafos envuelta), `lib/mallaData.ts` (los dos
datasets: el de "vitrina" para el visitante y el del equipo real para el
dueño, con nodos fantasma para posiciones vacantes).

## Gemelo Digital — demo guiada

**Archivos:** `app/c/[slug]/oficina/demo/page.tsx`,
`components/OfficeDemoChat.tsx`. Simula, con un guion fijo tipo WhatsApp,
cómo se vería interactuar con el agente — todavía no hay backend de IA real
detrás. Es la base sobre la que se construye Warren (ver
[05-ROADMAP-EDT.md](./05-ROADMAP-EDT.md#bot-warren-en-la-oficina)).

## Dashboard del Member (`/m`)

**Archivos:** `app/m/dashboard/page.tsx` (lista sus hasta-3 Cards),
`app/m/dashboard/company` / `personal` / `project` (editores por tipo —
`components/MemberCardEditor.tsx` para company/personal,
`components/MemberStoryEditor.tsx` para "Mi camino con..." en project),
`app/m/dashboard/company/network` (la red de clientes de una Company),
`app/m/onboarding`, `app/m/auth/google/*` (OAuth), `app/m/login`.

## Onboarding / chat simulado de alta

**Archivo:** `components/OnboardingChat.tsx` — el flujo tipo WhatsApp para
que un invitado se registre y avance su `ProgramMembership`.

## PWA

**Archivos:** `app/manifest.ts`, `public/sw.js` (hand-rolled, cachea la
tarjeta pública para que abra offline),
`components/ServiceWorkerRegistration.tsx`, `app/offline/page.tsx`. Las
pantallas con sesión (admin, dashboard) siguen requiriendo conexión a
propósito.

## i18n y datos fijos

**Archivos:** `lib/i18n.ts` (copys ES/EN), `lib/data.ts` (escalas fijas de
fallback: `MEDALS`, `RANKS`), `lib/cardLabels.ts` (overrides de texto por
Programa), `lib/escalas.ts`, `lib/interviewSlots.ts` (horarios hardcodeados
de "Agendar tu Entrevista"), `lib/badge.ts`, `lib/color.ts`, `lib/slug.ts`.
