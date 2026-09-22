# Auditoría de Módulos + Checklist QA — LyCard

**Fecha:** 2026-09-23
**Para:** Fabricio (y cualquiera que se sume al equipo técnico después).
**Metodología:** inspección directa del código real del repo (rutas, server
actions, componentes, modelo de Prisma) — no se infiere ni se inventa nada
que no esté en un archivo real, citado por su ruta exacta. Donde el estado
de "funciona / no funciona" depende de una prueba en producción que ya se
hizo (o de un reporte de usuario ya recibido), se cita la fuente en vez de
asumir.

**Relación con los otros documentos de auditoría:** este documento
**complementa**, no reemplaza, a
[`AUDITORIA-TECNICA-2026-09.md`](./AUDITORIA-TECNICA-2026-09.md) (riesgos
de seguridad/infraestructura) y
[`QA-COMPLETO-2026-09.md`](./QA-COMPLETO-2026-09.md) (hallazgos de
funcionalidad/diseño/arquitectura/seguridad, con una sección viva de
reportes de usuario real). Esos dos son listas de *hallazgos* (bugs,
riesgos, gaps). Este es distinto: es el **mapa completo de módulos** que
componen el sistema — todos, no solo los que tienen un problema — con su
documentación y su checklist de QA para poder ir marcando, módulo por
módulo, qué está probado y qué no. Donde un módulo tiene un hallazgo ya
documentado en esos dos archivos, se referencia por su número (ej. "ver
AUDITORIA-TECNICA §1.1") en vez de repetirlo.

---

## 1. Propósito general de la app

LyCard es una **tarjeta de presentación digital** (`/c/[slug]`, accesible
sin login) que funciona a la vez como la puerta de entrada a una **Oficina
Virtual** privada: el panel donde el dueño de esa tarjeta ve accesos
rápidos a un puñado de "Superpoderes" (apps puntuales — hoy: resumen de
reuniones, notas de voz con transcripción, agenda) y a la Malla de su
equipo. El problema que resuelve: darle a cada persona/negocio/proyecto
dentro del ecosistema EinarOS/Legacy una sola URL que sea, simultáneamente,
tarjeta de presentación pública **y** centro de comando privado — sin tener
que mantener dos productos separados.

El sistema es explícitamente multi-tenant: una instalación sirve a varios
**Programas** (ej. Legacy) a la vez, cada uno con su propia marca, sus
propios Admins (N0) acotados a su Programa, y sus propios Miembros —
aislados entre sí. Documentación de fondo (qué es, para qué existe, hasta
dónde llega hoy): [`01-VISION-Y-ALCANCE.md`](./01-VISION-Y-ALCANCE.md).

**Estado comercial real, para calibrar expectativas de esta auditoría:**
cero clientes pagando hoy — todo lo que hay en producción es para pruebas
internas y demos a leads (MLQR es el más avanzado, tampoco pagó todavía).
Esto importa para leer la matriz de la sección 4: un módulo puede estar
"funcionando bien" en el sentido de que el código hace lo que dice que
hace, sin que eso implique que ya soportó tráfico real de usuarios finales
en volumen.

## 2. Stack tecnológico

Confirmado en `package.json` y `prisma/schema.prisma` — nada inferido:

- **Next.js 16.3.5** (App Router), Server Components por defecto, Server
  Actions (`"use server"`) para toda escritura, Turbopack en dev y build.
- **React 19.2.8** / **React DOM 19.2.8**.
- **Prisma 7.10.0** + `@prisma/adapter-pg` sobre **PostgreSQL** (Neon vía
  Vercel Postgres marketplace). Cliente generado en `generated/prisma/`
  (no en el `node_modules/.prisma` default — ver `prisma.config.ts`).
- **TypeScript** de punta a punta, `tsc --noEmit` como gate antes de cada
  deploy (convención del proyecto, no un script automatizado en CI hoy).
- **Autenticación:** `jose` (JWT/cookies firmadas), `bcryptjs` (hash de
  password de Admin). Sin librería de terceros tipo NextAuth — todo hecho
  a mano en `lib/auth.ts` / `lib/memberAuth.ts` / `lib/googleOAuth.ts`.
- **Storage:** `@vercel/blob` en producción, filesystem local en dev
  (`lib/storage.ts`, un solo abstracto para ambos).
- **Integraciones externas reales:** Fathom (API pública, brief de
  reuniones), AssemblyAI (transcripción + resumen de audio), Google OAuth
  (Calendar + Tasks + Drive, scopes acotados a `calendar.events` +
  `tasks` + `drive.file`), Resend (email, `sendInvitationAction`).
- **Visualización 3D:** `three.js` a mano (sin librería de grafos
  envolvente) para la Malla del equipo — ver AUDITORIA-TECNICA §C.4 sobre
  el riesgo de mantenimiento de este componente específico.
- **PWA:** `app/manifest.ts` + `public/sw.js` escrito a mano, sin
  `next-pwa` ni `@serwist`.
- **CSS:** a mano, sin framework (Tailwind, etc.) — estilos inline por
  componente.
- **Sin suite de tests automatizados** (confirmado: no hay Jest/Vitest/
  Playwright en `package.json` como dependencia de test — Playwright se
  usa manualmente en sesiones de desarrollo para QA, no como suite CI).
  Ver AUDITORIA-TECNICA §3.3.
- **Deploy:** Vercel (equipo `einaros`), `git push` a `main` dispara build
  + `prisma migrate deploy` automático contra producción (ver
  AUDITORIA-TECNICA §C.3 sobre el riesgo de no tener staging).

---

## 2. MAPA DE MÓDULOS DESCUBIERTOS

1. **Módulo 1 — Tarjeta Pública y Compartir** (identidad, QR, vCard)
2. **Módulo 2 — Autenticación de Admin** (N0 / MasterN0)
3. **Módulo 3 — Autenticación de Member** (Google + WhatsApp OTP simulado)
4. **Módulo 4 — Panel Admin: Roster y Editor de Tarjetas**
5. **Módulo 5 — Programas: Multi-tenant, Escalas y Skins de Marca**
6. **Módulo 6 — Dashboard del Member (Mis 3 Tarjetas)**
7. **Módulo 7 — Oficina Virtual (núcleo)**
8. **Módulo 8 — Superpoder: Brief de Reuniones (Fathom)**
9. **Módulo 9 — Superpoder: Notas de Voz (grabación + transcripción)**
10. **Módulo 10 — Superpoder: Agenda + Integración Google**
11. **Módulo 11 — Malla del Equipo (grafo 3D)**
12. **Módulo 12 — Gemelo Digital (demo guiada)**
13. **Módulo 13 — Agendar Entrevista y Onboarding a Programa**
14. **Módulo 14 — Red de Clientes (Cards de tipo Company)**
15. **Módulo 15 — PWA / Modo Offline**
16. **Módulo 16 — Versionado y Changelog**
17. **Módulo 17 — Panel Interno HR + PM** (`/admin/equipo`)
18. **Módulo 18 — Roadmap sin construir** (CRM, NashMesh/MachineEngine,
    AppStore de Skills completo, Negocio→Programa) — incluido para que la
    matriz de la sección 4 sea honesta sobre qué NO existe todavía, no
    solo sobre lo que sí.

---

## 3. DOCUMENTACIÓN POR MÓDULO

### Módulo 1 — Tarjeta Pública y Compartir

**Qué hace en el sistema:** es la puerta pública, `/c/[slug]`, accesible
sin login por cualquiera. Muestra identidad (nombre, foto, cargo),
medallón/rango/contactados, canales de contacto, un carrusel swipeable
entre hasta 3 variantes de la misma persona (`project`/`company`/
`personal`, según privacidad configurada), botón de Agendar, botón de
Oficina Virtual, QR para compartir y descarga de vCard.

**Archivos / Funciones involucradas:** `app/c/[slug]/page.tsx` (resuelve
la Card por slug + Program/Member/Puesto), `components/LyCardView.tsx`
(el render completo), `components/CardCarousel.tsx`, `lib/shareScope.ts`
(qué otras Cards del mismo Member se suman al carrusel cuando la ve un
visitante), `app/c/[slug]/vcard/` (descarga del `.vcf`), `app/c/actions.ts`
→ `sendQrByWhatsappAction` (compartir QR), `sendContactMessageAction`
(mensaje de contacto).

**Entradas y Salidas:** entrada = `slug` en la URL (público, sin auth).
Salida = HTML renderizado server-side con los datos de esa Card; la
descarga de vCard devuelve un archivo `.vcf`; `sendQrByWhatsappAction`
recibe `{cardSlug, whatsapp}` y dispara un envío (simulado — ver Módulo 3
sobre WhatsApp simulado en general).

**Casos de prueba QA:**
- *Happy path:* abrir `/c/[algún-slug-real]` sin estar logueado → la
  tarjeta carga con foto, nombre, cargo y canales visibles. Swipear el
  carrusel si el dueño habilitó `shareScope` para más de una Card. Tocar
  "Guardar Contacto" → se descarga un `.vcf` que el teléfono ofrece
  guardar.
- *Edge cases:* abrir un slug que no existe (¿404 limpio o error crudo?).
  Abrir una Card `project` de un Programa con `active:false` (¿qué se
  muestra?). Comparar el contenido del `.vcf` descargado contra lo que la
  tarjeta muestra visualmente (foto, redes sociales) — **hallazgo ya
  documentado, ver QA-COMPLETO §A.1: el vCard hoy solo trae
  FN/TITLE/TEL/URL/NOTE, no foto ni redes sociales**. Probar los links de
  redes sociales cargados con URLs sintácticamente válidas pero rotas
  (ver QA-COMPLETO §B.3).

---

### Módulo 2 — Autenticación de Admin (N0 / MasterN0)

**Qué hace en el sistema:** controla quién puede entrar al panel `/admin`.
Dos niveles: **MasterN0** (`Admin.programId === null`, acceso global —
hoy es exclusivamente la cuenta de Gunnar) y **N0 de Programa**
(`programId` seteado, limitado a ese Programa en toda pantalla/action).
Dos métodos de login: password (bcrypt) o "Continuar con Google" (solo
para una cuenta de Admin que YA existe — nunca crea una nueva).

**Archivos / Funciones involucradas:** `lib/auth.ts` (`isMasterN0()`,
`currentAdminScope()`), `app/admin/actions.ts` → `loginAction`,
`logoutAction`, `changePasswordAction`; `app/admin/auth/google/start` +
`callback` (login alterno); `app/admin/reset-actions.ts` →
`resetPlatformAction`; `app/admin/login-history/page.tsx` (bitácora,
modelo `AdminLoginEvent`, logueado desde `loginAction` y el callback de
Google).

**Entradas y Salidas:** entrada = email+password (form) o el flujo OAuth
de Google. Salida = cookie de sesión firmada (`lib/auth.ts`) + un registro
en `AdminLoginEvent` (éxito o falla, con el método usado).

**Casos de prueba QA:**
- *Happy path:* login con password correcto → entra y ve el roster
  filtrado a su scope. Login con Google de una cuenta ya dada de alta
  como Admin → mismo resultado. `/admin/login-history` (solo MasterN0)
  muestra ambos intentos.
- *Edge cases:* login con password incorrecto repetidas veces — **no hay
  rate-limit hoy, ver AUDITORIA-TECNICA §D.2**, probar cuántos intentos
  tolera sin bloquear nada. Login con Google de una cuenta que NO es
  Admin → debe rechazar, nunca crear una cuenta nueva (regla dura
  documentada en 02-ARQUITECTURA.md — confirmar que se sostiene en
  vivo). Un N0 de Programa intentando acceder a una URL de otro Programa
  a mano (cambiando el slug/id en la barra de direcciones) — debe
  redirigir/bloquear, no solo ocultar el link en la UI.

---

### Módulo 3 — Autenticación de Member (Google + WhatsApp OTP simulado)

**Qué hace en el sistema:** controla el login de un **Member** (persona
real, dueña de hasta 3 Cards propias — project/company/personal),
independiente del sistema de Admin. Dos métodos: Google OAuth (identidad)
o un código OTP enviado "por WhatsApp" — **hoy simulado, no manda un
WhatsApp real**, cáscara honesta documentada a propósito.

**Archivos / Funciones involucradas:** `lib/memberAuth.ts`,
`app/m/auth/google/start` + `callback`, `app/m/actions.ts` →
`requestOtpAction`, `verifyOtpAction`, `updateMemberEmailAction`,
`memberLogoutAction`; modelo `OtpCode` (Prisma) — código corto, un solo
uso, expirable.

**Entradas y Salidas:** entrada = número de WhatsApp (para OTP) o el flujo
OAuth de Google. Salida = cookie de sesión de Member + (en el flujo OTP)
un código de 1 uso que hay que ingresar de vuelta.

**Casos de prueba QA:**
- *Happy path:* pedir OTP con un número → el código simulado se puede ver
  (¿dónde se muestra hoy — en pantalla, en logs?) e ingresarlo entra
  correctamente. Login con Google entra y muestra el dashboard con las
  Cards del Member.
- *Edge cases:* ingresar un OTP vencido o ya usado — debe rechazar,
  nunca reusar. Pedir múltiples OTPs seguidos para el mismo número (sin
  rate-limit documentado, mismo riesgo que Módulo 2). Confirmar
  explícitamente con Fabricio/equipo: **¿el plan es reemplazar el OTP
  simulado por un proveedor real de WhatsApp antes de tráfico real?** —
  si no, cualquier QA de este módulo con un usuario no técnico va a
  confundirse buscando un mensaje que nunca llega a su teléfono de
  verdad.

---

### Módulo 4 — Panel Admin: Roster y Editor de Tarjetas

**Qué hace en el sistema:** la pantalla de trabajo diaria de un N0 —
lista todas las Cards de su scope (agrupadas por Programa si es
MasterN0), permite crear/editar/borrar Cards, y linkea al resto de los
sub-paneles (Programs, Interviews, Equipo, cuenta).

**Archivos / Funciones involucradas:** `app/admin/page.tsx` (roster),
`app/admin/[slug]/page.tsx` (editor de una Card), `components/EditorForm.tsx`
(el formulario en acordeón), `app/admin/actions.ts` → `createCardAction`,
`updateCardAction`, `deleteCardAction`; `app/admin/siblings-actions.ts` →
`createSiblingCardsAction` (generar las 3 variantes de una misma persona
de una).

**Entradas y Salidas:** entrada = formulario completo de una Card (texto,
imágenes vía `lib/storage.ts`, JSON de escalas/skills heredados del
Programa). Salida = fila creada/actualizada en `Card`, visible de
inmediato en `/c/[slug]`.

**Casos de prueba QA:**
- *Happy path:* crear una Card nueva de tipo `project` dentro de un
  Programa existente → aparece en el roster agrupada correctamente y es
  visitable en `/c/[slug]`. Editar foto/nombre/cargo → se refleja sin
  demora.
- *Edge cases:* subir una imagen de más de 10MB (límite ya documentado
  en el CHANGELOG histórico — confirmar que sigue sosteniéndose). Borrar
  una Card que tiene `Registration`/`CardNetworkMembership` asociadas —
  confirmar que no rompe integridad referencial. Un N0 de Programa
  intentando editar una Card de OTRO Programa por URL directa.

---

### Módulo 5 — Programas: Multi-tenant, Escalas y Skins de Marca

**Qué hace en el sistema:** todo lo que un Programa (ej. Legacy) puede
configurar para sus propias Cards: branding compartido (logo, color,
redes), las 4 "escalas" (medallón, rango, contactados, Superpoderes —
todas listas editables, mismo patrón repetido, ver
02-ARQUITECTURA.md), y hasta 3 Skins de marca (parseados desde un
`design.md` subido, colores/tipografía reales extraídos, no inventados).
Solo el MasterN0 crea Programs.

**Archivos / Funciones involucradas:** `app/admin/programs/page.tsx`,
`app/admin/programs/[id]/page.tsx`, `app/admin/programs/actions.ts`
(`createProgramAction`, `createProgramAdminAction`,
`toggleProgramActiveAction`, `deleteProgramAction`, `updateProgramAction`,
`createProgramSkinAction`, `setProgramSkinLightColorsAction`,
`activateProgramSkinAction`, `deleteProgramSkinAction`,
`updateCardLabelsAction`, `updateEscalaAction`, `updateOfficeSkillsAction`,
`setOfficeSkillIconAction`), `app/admin/programs/members-actions.ts`,
`app/admin/programs/puestos-actions.ts`, `lib/designMd.ts`,
`lib/escalas.ts`, `components/EscalaEditor.tsx`,
`components/OfficeSkillsEditor.tsx`.

**Entradas y Salidas:** entrada = formularios de configuración por
Programa (JSON de escalas, archivo `design.md`, datos de Puestos y
Miembros). Salida = campos `Json` en `Program`/`ProgramSkin`, que
`LyCardView.tsx`/`OfficeSkillsBlock.tsx` leen para renderizar.

**Casos de prueba QA:**
- *Happy path:* crear un Programa nuevo, asignarle un N0, subir un
  `design.md` y activarlo como skin → las Cards `project` de ese Programa
  cambian de aspecto real (fondo, acentos, fuente). Editar la escala de
  Superpoderes y prender uno → aparece el tile en la Oficina Virtual de
  las Cards de ese Programa.
- *Edge cases:* subir un `design.md` mal formado o sin colores parseables
  — ¿cae a un default sensato o rompe? Desactivar un Programa
  (`toggleProgramActiveAction`) con Cards ya circulando — confirmar que
  las Cards existentes NO desaparecen, solo se bloquean nuevos joins
  (comportamiento documentado, verificar que se sostiene). Borrar un
  Programa con Cards activas — debe bloquear el borrado (mensaje "No se
  puede borrar — ya tiene tarjetas activas").

---

### Módulo 6 — Dashboard del Member (Mis 3 Tarjetas)

**Qué hace en el sistema:** lo que ve un Member logueado —
`/m/dashboard`, listando sus hasta 3 Cards (`project`/`company`/
`personal`) con acceso a editar cada una.

**Archivos / Funciones involucradas:** `app/m/dashboard/page.tsx`,
`app/m/dashboard/company/page.tsx`, `app/m/dashboard/personal/page.tsx`,
`app/m/dashboard/project/page.tsx`, `components/MemberCardEditor.tsx`,
`components/MemberStoryEditor.tsx`, `app/m/dashboard/actions.ts` →
`updateMemberCardAction`, `updateMemberStoryAction`.

**Entradas y Salidas:** entrada = formulario de edición de cada Card
(mismo patrón de acordeón que el editor de Admin, pero acotado a lo que
un Member puede tocar de su propia Card). Salida = actualización directa
en `Card`.

**Casos de prueba QA:**
- *Happy path:* un Member con las 3 Cards activas edita su historia
  personal (`updateMemberStoryAction`) → se refleja en "Mi camino" de su
  Card pública.
- *Edge cases:* un Member cuya `ProgramMembership.status` todavía es
  `invited` (no `active`) — sus Cards propias no deberían estar
  desbloqueadas todavía; confirmar que el dashboard lo comunica bien en
  vez de mostrar un editor vacío confuso. Un Member editando un campo con
  una URL de red social sintácticamente inválida (ver QA-COMPLETO §B.3).

---

### Módulo 7 — Oficina Virtual (núcleo)

**Qué hace en el sistema:** el panel privado detrás del botón "Oficina
Virtual" de cualquier Card, en `/c/[slug]/oficina`. Se bifurca en
`OwnerOficina` (el dueño logueado, ve datos reales) y `VisitorOficina`
(cualquier otro, ve solo explicación — cáscara honesta, nunca datos
reales de un tercero). Orden actual: saludo, Superpoderes, Malla del
equipo, botón del Gemelo Digital.

**Archivos / Funciones involucradas:** `app/c/[slug]/oficina/page.tsx`
(el fetch central: resuelve Google conectado, Fathom, Notas de Voz,
Agenda, y arma `dashboardHref` para "Editar Oficina" según si mira un
Admin o un Member), `components/OfficeSkillsBlock.tsx` (el grid de
Superpoderes y su bottom-sheet).

**Entradas y Salidas:** entrada = `slug` + sesión (Admin/Member/anónimo,
determina el modo). Salida = HTML con los bloques correspondientes al
rol de quien mira.

**Casos de prueba QA:**
- *Happy path:* el dueño logueado abre su propia Oficina → ve
  Superpoderes reales, Malla, Gemelo Digital. Un visitante anónimo abre
  la misma URL → ve solo explicaciones, ningún dato del dueño.
- *Edge cases:* un Member logueado abre la Oficina de una Card que NO es
  suya — debe caer al modo visitante, nunca al modo dueño por error de
  sesión cruzada. Un Programa sin ningún Superpoder activado — la
  sección debe verse vacía/honesta, no romper.

---

### Módulo 8 — Superpoder: Brief de Reuniones (Fathom)

**Qué hace en el sistema:** conecta con la API pública de Fathom y
muestra las reuniones grabadas del dueño, agrupadas por día en un
calendario mensual (puntos por día → lista del día → popup de detalle
con resumen y link a Fathom).

**Archivos / Funciones involucradas:** `lib/fathom.ts` (cliente +
paginación completa), `components/FathomBriefBlock.tsx`,
`components/MiniCalendar.tsx` (compartido con los módulos 9 y 10).

**Entradas y Salidas:** entrada = `FATHOM_API_KEY` (env, por instancia —
no hay conexión granular por Card todavía). Salida = lista de reuniones
con `title`, `createdAt`, `summaryPreview`, `url`.

**Casos de prueba QA:**
- *Happy path:* con `FATHOM_API_KEY` configurada, abrir el Superpoder →
  el calendario marca los días con reuniones, tocar un día lista sus
  reuniones, tocar una abre el resumen. **Confirmado funcionando en
  producción real por el dueño ("Funcional se conecta y puedo acceder al
  resumen directo de fathom"), 2026-09-22.**
- *Edge cases:* sin `FATHOM_API_KEY` — debe mostrar "Todavía sin conectar
  a Fathom", nunca romper. Una cuenta de Fathom con cero reuniones
  grabadas — mensaje honesto, no un calendario vacío confuso. Verificar
  el formato de hora en la lista (ya se corrigió un bug real de overflow
  en el badge circular, ver PLAN.md 2026-09-23).

---

### Módulo 9 — Superpoder: Notas de Voz (grabación + transcripción)

**Qué hace en el sistema:** graba audio con el micrófono del navegador,
lo sube, y lo transcribe + resume vía AssemblyAI. Vista de entrada: botón
rojo grande de grabar. "Ver notas guardadas" lleva al calendario/lista/
popup de detalle, donde también se puede borrar una nota.

**Archivos / Funciones involucradas:** `components/VoiceNotesBlock.tsx`,
`app/c/[slug]/oficina/voiceNotes-actions.ts` (`createVoiceNoteAction`,
`checkVoiceNoteStatusAction`, `listVoiceNotesAction`,
`deleteVoiceNoteAction`), `lib/transcription.ts` (cliente de AssemblyAI),
`lib/storage.ts` (`saveUpload`/`deleteUpload`), modelo `VoiceNote`
(`audioUrl`, `status`, `transcript`, `summary`, `errorDetail`).

**Entradas y Salidas:** entrada = audio grabado (Blob del navegador).
Salida = fila `VoiceNote` con estado `processing → ready | error`;
`ready` trae `transcript` + `summary`; `error` trae `errorDetail` visible
en el popup.

**Casos de prueba QA:**
- *Happy path:* grabar una nota corta en español → aparece en la lista
  del día, el estado pasa de "Procesando" a "Lista", el audio se
  reproduce y la transcripción/resumen aparecen en español. Borrar una
  nota → confirmación de un toque, desaparece de la lista.
- *Edge cases:* **este es el módulo con más iteraciones recientes —
  QA activo, no cerrado.** Grabar y salir/reabrir el Superpoder varias
  veces seguidas (bug de "desaparición" ya corregido — confirmar que no
  reaparece). Grabar sin `ASSEMBLYAI_API_KEY` configurada — debe quedar
  honestamente en "esperando transcripción" para siempre, nunca inventar
  un resumen. **Pendiente de confirmación real de Gunnar/Fabricio:** que
  una grabación real en español transcriba correctamente en español (el
  fix de `language_code:"es"` + reintento sin resumen se shippeó
  2026-09-23, sin poder probarse contra la API real de AssemblyAI en el
  entorno de desarrollo). Revocar el micrófono a mitad de grabación.
  Grabar con conexión inestable (¿el error queda visible con
  `errorDetail` o se pierde?).

---

### Módulo 10 — Superpoder: Agenda + Integración Google

**Qué hace en el sistema:** calendario mensual con Eventos (dorado) y
Tareas (violeta) por día. Sin el dueño conectado a Google, muestra un
cache local simulado marcado explícitamente como tal. Conectado, lee
Google Calendar/Tasks de verdad.

**Archivos / Funciones involucradas:** `components/AgendaBlock.tsx`,
`lib/agenda.ts` (`fetchLiveAgenda`, `defaultAgendaWindow`),
`lib/googleServices.ts` (`listCalendarEvents`, `listTasks`,
`createCalendarEvent`, `createTask`, `ensureBridgeFolder`,
`writeBridgeFile`), `lib/googleOAuth.ts` (`buildGoogleConnectUrl`,
`exchangeGoogleConnectCode`, `refreshGoogleAccessToken`),
`app/m/auth/google/connect-start` + `connect-callback`.

**Entradas y Salidas:** entrada = `Member.googleRefreshToken` (si
conectado) o el cache local `Card.calendarEvents` (si no). Salida =
lista de `AgendaEventItem`/`AgendaTaskItem` por día, cada uno marcado
`google-real` o `simulado`.

**Casos de prueba QA:**
- *Happy path (simulado, sin conectar):* abrir la Agenda sin Google
  conectado → se ve el cache local bajo el aviso "Sin conectar — lo de
  abajo es simulado". **Confirmado con Playwright contra datos
  sembrados.**
- *Happy path (real, conectado):* conectar Google desde el botón,
  crear un evento real en Google Calendar por fuera de la app → debe
  aparecer en la Agenda de LyCard con la etiqueta "Google Calendar ·
  real". **No confirmado todavía en producción con una cuenta real —
  este es el caso de prueba más importante y menos verificado del
  módulo, priorizarlo.**
- *Edge cases:* revocar el acceso de Google desde la cuenta de Google
  del usuario (fuera de la app) — **gap ya documentado, ver QA-COMPLETO
  §A.3**, confirmar si hoy cae en un error críptico o si ya se maneja.
  Un evento con fecha fuera de la ventana ±14/+45 días — no debería
  aparecer, confirmar que el corte de ventana es el esperado por el
  usuario.

---

### Módulo 11 — Malla del Equipo (grafo 3D)

**Qué hace en el sistema:** visualización 3D (three.js a mano) del
equipo/agentes de una Card — nodos por rol, navegable con la cámara.

**Archivos / Funciones involucradas:** `components/MallaGraph.tsx`,
`lib/mallaData.ts` (dos datasets demo).

**Entradas y Salidas:** entrada = dataset de nodos/conexiones (hoy fijo
por dataset, no editable por el N0 todavía). Salida = canvas 3D
interactivo (zoom, rotar, alejar sin desarmarse — bug de desarmado ya
corregido, ver PLAN.md Fase A/B).

**Casos de prueba QA:**
- *Happy path:* abrir la Malla en la Oficina de una Card de proyecto y
  en la red de una Company → ambas renderizan sin errores en consola,
  la cámara responde a gestos táctiles.
- *Edge cases:* dispositivo de gama baja / sin aceleración WebGL —
  ¿hay algún fallback o se rompe en blanco? Alejar la cámara al máximo
  repetidamente (el bug histórico era justo este). Este es, por lejos,
  el componente de mayor riesgo de mantenimiento del repo si algo se
  rompe (ver AUDITORIA-TECNICA §C.4) — cualquier QA que encuentre un bug
  acá merece prioridad alta de documentación del hallazgo, no solo del
  bug.

---

### Módulo 12 — Gemelo Digital (demo guiada)

**Qué hace en el sistema:** una demo de chat tipo WhatsApp que muestra
CÓMO se vería el Gemelo Digital del dueño — explícitamente marcada como
demo, sin backend de IA real detrás.

**Archivos / Funciones involucradas:** `components/OfficeDemoChat.tsx`.

**Entradas y Salidas:** entrada = ninguna (guion fijo). Salida = una
secuencia de mensajes simulados en la UI.

**Casos de prueba QA:**
- *Happy path:* tocar "Tu Gemelo Digital" → arranca la demo guiada sin
  errores, se puede cerrar y reabrir.
- *Edge cases:* confirmar que en ningún punto de la demo se sugiere
  (por copy o diseño) que es un asistente real respondiendo — es el
  caso de prueba de "cáscara honesta" más directo de todo el sistema.

---

### Módulo 13 — Agendar Entrevista y Onboarding a Programa

**Qué hace en el sistema:** el flujo público de "Agendar tu Entrevista"
desde cualquier Card, y lo que pasa cuando esa entrevista se completa:
activación de membresía + creación de las 3 Cards del nuevo Member +
`OriginMemento`.

**Archivos / Funciones involucradas:** `lib/interviewSlots.ts` (slots
hardcodeados, sin control de cupo — ver AUDITORIA-TECNICA §1.4),
`app/c/actions.ts` → `registerInterviewAction`, `sendInvitationAction`;
`app/admin/interviews/actions.ts` → `completeInterviewAction`;
`app/m/onboarding/actions.ts` → `joinLegacyProgramAction`.

**Entradas y Salidas:** entrada = nombre/email/slot elegido (formulario
público, sin auth necesaria). Salida = fila `Registration`; al
completarse desde `/admin/interviews`, activa `ProgramMembership` y
dispara la creación de 3 Cards nuevas.

**Casos de prueba QA:**
- *Happy path:* agendar una entrevista desde una Card pública →
  aparece en `/admin/interviews`; el N0 la marca completada →
  el Member queda activo con sus 3 Cards recién creadas y visibles en
  su dashboard.
- *Edge cases:* **3 gaps ya documentados y priorizados en
  AUDITORIA-TECNICA §1.1-1.4 — sin rate-limit, sin validación real de
  email, sin dedupe de registros, sin control de cupo por slot.**
  Probar exactamente eso: registrar el mismo email dos veces, registrar
  con un email con formato inválido, y llenar un slot hasta "sobre-
  agendarlo" — los 3 deberían fallar hoy tal como están documentados.

---

### Módulo 14 — Red de Clientes (Cards de tipo Company)

**Qué hace en el sistema:** el árbol de referidos propio de un negocio
(`CardNetworkMembership`, mismo patrón que `ProgramMembership` pero
rooteado en una Card `company` en vez de un Program). Panel de admin
para ver quién agendó y activar su lugar en la red.

**Archivos / Funciones involucradas:**
`app/m/dashboard/company/network/actions.ts` →
`activateNetworkMembershipAction`, `app/m/dashboard/company/network/page.tsx`.

**Entradas y Salidas:** entrada = una `Registration` linkeada a esa
Company. Salida = `CardNetworkMembership` activa, que habilita el N1 del
referido a mostrarse.

**Casos de prueba QA:**
- *Happy path:* alguien agenda desde la Card de una Company → el dueño
  la activa desde su panel de red → esa persona pasa a mostrarse como
  N1 de esa red.
- *Edge cases:* activar dos veces la misma membresía. Una Company sin
  ninguna actividad todavía — la pantalla de red debe verse honesta
  (vacía, no rota).

---

### Módulo 15 — PWA / Modo Offline

**Qué hace en el sistema:** permite instalar la tarjeta pública como app
en el celular (`app/manifest.ts`) y cachear la Card pública para que
abra sin conexión (`public/sw.js`, fallback a `app/offline/page.tsx`).

**Archivos / Funciones involucradas:** `app/manifest.ts`, `public/sw.js`,
`app/offline/page.tsx`, `components/ServiceWorkerRegistration.tsx`.

**Entradas y Salidas:** entrada = visita previa a una Card pública
(para que el service worker la cachee). Salida = la misma Card
renderizando sin red, o `app/offline/page.tsx` si no hay nada cacheado
todavía.

**Casos de prueba QA:**
- *Happy path:* instalar la PWA desde el navegador móvil, visitar una
  Card con conexión, poner el teléfono en modo avión, reabrir la app →
  debería mostrar la Card cacheada.
- *Edge cases:* **este módulo tiene un reporte de usuario real,
  directamente de Gunnar en su celular, sin resolver todavía — ver
  QA-COMPLETO §F.1, estado 🔴 abierto.** El reporte no precisa si falla
  la instalación en sí o si instala bien pero no funciona offline — el
  primer caso de prueba de QA de este módulo debería ser exactamente
  separar esas dos cosas antes de cualquier otro diagnóstico. También
  probar: el dueño edita su Card, ¿el visitante con la PWA ya instalada
  ve la versión vieja cacheada indefinidamente? (gap ya documentado,
  QA-COMPLETO §A.4).

---

### Módulo 16 — Versionado y Changelog

**Qué hace en el sistema:** cada tarjeta muestra su versión (semver) en
una islita — tocarla abre un modal con el historial de cambios en
lenguaje llano, no técnico.

**Archivos / Funciones involucradas:** `lib/version.ts`
(`APP_VERSION`, `CHANGELOG`), el modal correspondiente dentro de
`components/LyCardView.tsx`.

**Entradas y Salidas:** entrada = ninguna (dato estático, actualizado a
mano en cada commit que shippea algo). Salida = el modal con la lista de
versiones anteriores.

**Casos de prueba QA:**
- *Happy path:* tocar la islita de versión en cualquier Card → abre el
  modal, la versión mostrada coincide con `lib/version.ts` en el commit
  desplegado.
- *Edge cases:* confirmar que el modal no se cae con un historial ya
  largo (más de 60 entradas hoy) — ver el fix histórico de altura del
  modal (v1.25.2).

---

### Módulo 17 — Panel Interno HR + PM (`/admin/equipo`)

**Qué hace en el sistema:** panel MasterN0-only (invisible para un N0 de
Programa) para llevar el headcount del Escalón Fractal N0-N12 (Agentes
Legacy/Silicio/Carbono-referencia) y los proyectos/tareas internos del
equipo de EinarOS — no es un CRM de clientes, es gestión interna.

**Archivos / Funciones involucradas:** `app/admin/equipo/page.tsx`,
`app/admin/equipo/actions.ts` (`createNodeAction`, `updateNodeAction`,
`createProjectAction`, `updateProjectProgressAction`,
`createTaskAction`, `updateTaskStatusAction`), `lib/hr.ts`, `lib/pm.ts`,
`components/EquipoProjectsBlock.tsx`, `components/EquipoTasksBlock.tsx`.

**Entradas y Salidas:** entrada = formularios de alta/edición de
Nodos/Proyectos/Tareas. Salida = filas en `Node`, `ProjectNode`, `Task`
(Prisma), listadas y agrupadas por escalón/dominio/dueño.

**Casos de prueba QA:**
- *Happy path:* crear un Nodo nuevo, un Proyecto asignado a ese Nodo, y
  una Tarea dentro de ese Proyecto → los tres aparecen correctamente
  agrupados y filtrables por escalón y tipo de nodo.
- *Edge cases:* un N0 de Programa (no MasterN0) intentando acceder a
  `/admin/equipo` por URL directa — debe redirigir, nunca mostrar nada.
  Marcar una Tarea como `bloqueado` y confirmar que el proyecto padre lo
  refleja visualmente. Shippeado recién (v1.31.0, 2026-09-22) — sin
  reportes de bug todavía, pero tampoco con mucho uso real acumulado
  todavía; buen candidato para una primera pasada de QA a fondo.

---

### Módulo 18 — Roadmap sin construir (para que la matriz no mienta por omisión)

**Qué hace en el sistema hoy:** nada — están documentados en
[`05-ROADMAP-EDT.md`](./05-ROADMAP-EDT.md) como trabajo futuro, no
existe código de producción para ninguno de estos todavía:

- **CRM** (de clientes/leads, distinto del panel HR+PM interno — la
  distinción entre "CRM del dashboard" y "CRM de la Oficina Virtual"
  está identificada pero **sin resolver** en el propio roadmap).
- **Panel NashMesh + MachineEngine** (simulador de escenarios
  fractales a escala).
- **AppStore de Skills completo** — hoy solo 3 Superpoderes tienen
  backend real (Brief, Notas de Voz, Agenda); el catálogo confirmado
  tiene 8 Skills en total, el resto sin construir.
- **Negocio→Programa, modelo de planes** (Freemium/Automatizado/Normal/
  Enterprise) — documentado como tesis de venta, sin ningún flujo de
  pago o upgrade codificado todavía.

**Por qué está en este documento:** para que la sección 4 no dé a
entender, por omisión, que todo lo que existe en el roadmap ya está
construido. Cualquier QA sobre estos temas debería devolver "No aplica
— no implementado" en vez de buscar un bug que no puede existir todavía.

---

## 4. MATRIZ DE CONTROL DE FUNCIONAMIENTO (QA STATUS)

| ID | Módulo / Sección detectada | ¿Qué debería hacer? | ¿Funciona bien hoy? (Sí/No/Parcial) | Qué falla o qué falta hacer |
|----|------|------|------|------|
| M1 | Tarjeta Pública y Compartir | Mostrar la identidad pública + permitir guardar contacto y compartir QR | Parcial | vCard incompleto (sin foto/redes) — QA-COMPLETO §A.1 |
| M2 | Autenticación de Admin | Login seguro por password o Google, con bitácora | Parcial | Sin rate-limit en login/reset — AUDITORIA-TECNICA §D.2 |
| M3 | Autenticación de Member | Login por Google o WhatsApp OTP | Parcial | OTP es simulado a propósito (no real todavía) — confirmar plan con Fabricio |
| M4 | Panel Admin: Roster y Editor | CRUD completo de Cards, scoped por Programa | Sí | Sin hallazgos abiertos conocidos |
| M5 | Programas: Escalas y Skins | Configuración de marca/escalas por Programa | Sí | Sin hallazgos abiertos conocidos |
| M6 | Dashboard del Member | Ver y editar las 3 Cards propias | Sí | Sin hallazgos abiertos conocidos |
| M7 | Oficina Virtual (núcleo) | Panel privado del dueño vs. vista de visitante | Sí | Sin hallazgos abiertos conocidos |
| M8 | Superpoder: Brief (Fathom) | Mostrar reuniones reales agrupadas por día | Sí | Confirmado en producción real por el dueño, 2026-09-22 |
| M9 | Superpoder: Notas de Voz | Grabar, transcribir, escuchar, borrar | Parcial | Transcripción en español recién corregida, sin confirmar contra la API real — ver Módulo 9 |
| M10 | Superpoder: Agenda + Google | Leer Calendar/Tasks reales o cache simulado | Parcial | Modo simulado confirmado; modo conectado (real) sin confirmar en producción |
| M11 | Malla del Equipo (3D) | Grafo navegable del equipo | Sí | Mayor riesgo de mantenimiento del repo — AUDITORIA-TECNICA §C.4 |
| M12 | Gemelo Digital (demo) | Demo guiada, sin IA real detrás | Sí | Confirmar que el copy nunca sugiere que es real |
| M13 | Agendar Entrevista + Onboarding | Registro público → activación → 3 Cards nuevas | Parcial | Sin rate-limit, validación de email, dedupe, ni cupo — AUDITORIA-TECNICA §1.1-1.4 |
| M14 | Red de Clientes (Company) | Árbol de referidos propio de un negocio | Sí | Sin hallazgos abiertos conocidos |
| M15 | PWA / Modo Offline | Instalar y funcionar sin conexión | No | Reporte directo de usuario sin resolver — QA-COMPLETO §F.1 |
| M16 | Versionado y Changelog | Mostrar historial de cambios en la tarjeta | Sí | Sin hallazgos abiertos conocidos |
| M17 | Panel Interno HR + PM | Headcount + proyectos/tareas internos | Sí | Shippeado reciente, poco uso real acumulado todavía |
| M18 | Roadmap sin construir (CRM, NashMesh, AppStore completo, Negocio→Programa) | — | No | No implementado, ver 05-ROADMAP-EDT.md |

**Cómo usar esta tabla:** Fabricio (o quien haga la próxima pasada de QA)
edita la columna 4 con el resultado real de cada prueba en dispositivo,
y la columna 5 con cualquier hallazgo nuevo — siguiendo el mismo formato
de cita a archivo/línea que ya usan `AUDITORIA-TECNICA-2026-09.md` y
`QA-COMPLETO-2026-09.md`, para que quien programe después no tenga que
re-preguntar dónde está el problema.
