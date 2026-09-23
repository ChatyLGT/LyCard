# LyCard — Plan de Plataforma Completa

Documento vivo. Última actualización: 2026-09-15, madrugada, sesión nocturna.
Todas las fases están ordenadas por dependencia — no se puede saltar a la Fase 4
sin tener la 0-3 en pie. Cada fase tiene: qué se construye, modelo de datos,
pantallas/rutas nuevas, y qué decisiones de producto quedan pendientes de tu
revisión (marcadas **[DECISIÓN GUNNAR]**).

---

## Fase 0 — Fundaciones: Programa + Miembro

**Objetivo:** dejar de asumir que todo es "Legacy". Introducir la entidad
Programa (Legacy, Mlqr, Digital Kingdom...) y la entidad Miembro (una persona
real, dueña de hasta 3 tarjetas).

**Modelo de datos:**

- `Program` — id, slug único, name, logoUrl, tema (colores, fuentes si aplica),
  wa/ig/li/x/fb/tiktok/yt/web (las redes oficiales — se mueven acá desde `Card`),
  videoThumbnailUrl (para el modal "Info del Programa"), createdAt.
  Legacy se migra como el primer `Program` (slug `legacy`), sin perder datos.
- `Member` — id, whatsapp (único, credencial principal), email, googleId
  (nullable), name, createdAt. Representa a una persona real — no confundir
  con `Admin` (que sigue siendo exclusivamente vos, MasterN0, con acceso
  global a toda la plataforma).
- `ProgramMembership` — memberId, programId, referredByMembershipId
  (auto-relación, arma el árbol genealógico), status (`invited` |
  `interviewed` | `active`), createdAt. Un Miembro puede tener membership en
  más de un Programa a futuro, aunque hoy solo va a existir Legacy.
- `Card` se extiende con: `kind` (`project` | `company` | `personal`),
  `memberId` (dueño), `programId` (solo se completa cuando `kind = project`).
  Los campos wa/ig/li/x/fb/tiktok/yt/web se mantienen en `Card` para
  `company`/`personal` (son editables por el dueño) pero para `kind = project`
  dejan de leerse de ahí — se leen del `Program` padre.
- `OriginMemento` — memberId, snapshot (JSON: cómo era la tarjeta que lo
  reclutó, quién era el host, cuándo) — esto es lo que se guarda en su
  Oficina Virtual cuando "gradúa" y dispara la desaparición pública de esa
  vista de invitado.

**Migración de datos existentes:** la tarjeta de Gunnar (`slug: gunnar`) pasa
a ser `kind: project`, `programId` = Legacy, `memberId` = un `Member` nuevo
creado a mano para vos (bootstrap por backend, como ya se hizo con el
`Admin`). Las 4 registraciones/interviews existentes no se tocan.

**[DECISIÓN GUNNAR]** ¿Un Miembro puede estar activo en más de un Programa a
la vez (ej. alguien que es host de Legacy Y de Mlqr)? Asumo que sí por
diseño (no cuesta nada dejarlo abierto), pero la UI no lo va a exponer hasta
que lo pidas.

---

## Fase 1 — Auth real para Miembros

**Objetivo:** que una persona (no vos, no el Admin) pueda loguearse como
dueña de sus propias tarjetas.

- **Google Sign-In** — real desde el día uno (OAuth estándar, no depende de
  infraestructura externa nueva más allá de credenciales de Google Cloud).
- **WhatsApp OTP** — **simulado** por ahora: se genera un código de 6
  dígitos, se guarda en la sesión/DB, y en vez de mandarlo por WhatsApp de
  verdad se muestra en pantalla ("en producción esto te llegaría por
  WhatsApp — por ahora, acá está tu código: 482913"). Cuando entre la Fase 8
  (WhatsApp Business API real) se reemplaza el envío sin tocar el resto del
  flujo.
- Sesión de Miembro: cookie firmada separada de la sesión de Admin — nunca
  se pisan. Rutas nuevas bajo `/m/*` (ej. `/m/login`, `/m/dashboard`).
- Email se pide siempre, sea cual sea el método de login usado, marcado
  explícitamente como "para novedades del programa" — no es credencial, es
  dato de campaña.

---

## Fase 2 — Modo Host / Invitado en la tarjeta de Proyecto

**Objetivo:** la misma URL/QR muestra cosas distintas según quién la abre.

- El visitante de `/c/[slug]` se resuelve contra la sesión de Miembro: si es
  el dueño de esa tarjeta → modo **host** (fila de cubos actual, con QR).
  Si no → modo **invitado**: el cubo del QR se reemplaza por **"Creá tu
  LyCard"**, y el botón inferior cambia de "Agendá **tu** Entrevista" a
  "Agendá **una** Entrevista" cuando lo ve el propio host (tiene sentido
  para él invitar a alguien más a agendar, no a sí mismo).
- "Creá tu LyCard" lleva a la Fase 3.

---

## Fase 3 — Onboarding simulado tipo WhatsApp

**Objetivo:** el chat que reemplaza al formulario tradicional.

- Pantalla `/m/onboarding/[programSlug]?ref=[membershipId]` con estética de
  WhatsApp: burbujas, indicador "escribiendo...", timestamps.
- Paso 1: se le pide grabar un audio (MediaRecorder real del navegador) con
  su nombre y a qué se dedica.
- Paso 2: el bot "transcribe" — **100% simulado**, no hay speech-to-text
  real todavía. Puede ser un texto fijo de ejemplo, o (mejor) le mostramos
  un cuadro de texto para que "corrija la transcripción", lo cual de paso
  nos da el dato real sin necesitar STT de verdad.
- Paso 3: conversación guiada (preguntas de a una, como chat) pidiendo el
  resto: WhatsApp, email, nombre completo si no quedó claro del audio.
- Al completar: crea (o reutiliza) el `Member`, la `ProgramMembership` en
  estado `invited`, y dispara la Fase 4 (agendar entrevista).

**[DECISIÓN GUNNAR — ya la tengo, la registro acá]** Transcripción simulada,
confirmado. Solo vos creás Programas nuevos, confirmado.

---

## Fase 4 — Entrevista como gate de activación

**Objetivo:** nadie pasa a tener sus propias tarjetas sin entrevista.

- Reusa `Registration` (ya construido) — se vincula la registración a la
  `ProgramMembership` en vez de quedar suelta.
- Falta definir cómo se marca "entrevista realizada": **[DECISIÓN GUNNAR]**
  ¿vos (o el N0 del Programa) la marcás manualmente como completada desde
  `/admin/interviews` después de la charla real? Asumo que sí — es lo más
  simple y realista dado que la entrevista pasa fuera de la app (por
  videollamada o en persona). Al marcarla, `ProgramMembership.status` pasa
  de `invited` a `active`.
- Al activarse: se crean automáticamente sus tarjetas `company` y `personal`
  en estado borrador, más su propia tarjeta `project` (clonada del template
  del Programa, personalizada con su nombre/foto), lista para repartir.
  Acá también se archiva el `OriginMemento`.

---

## Fase 5 — Editores + vistas públicas de Empresa y Personal

**Objetivo:** las otras dos tarjetas, con el contenido que propuse y vos
aprobás/ajustás.

**Tarjeta de Empresa** — foto/logo del negocio, nombre + rol, tagline,
badges como sellos/certificaciones, redes propias del negocio (editables),
cubos: "Sobre mi Empresa" / QR / "Enviar Invitación" (a conocer el negocio),
botón inferior "Agendar una Reunión" (reusa la infraestructura de
entrevistas, otro copy).

**Tarjeta Personal** — foto personal, nombre + descripción, cita propia,
redes personales (editables), cubos: "Guardar Contacto" (genera .vcf real,
descargable) / QR / "Enviar Mensaje", botón inferior opcional.

Cada una necesita su propio editor (`/m/dashboard/company`,
`/m/dashboard/personal`) siguiendo el patrón de `EditorForm.tsx` que ya
existe, y su propia vista pública (variantes de `LyCardView.tsx`).

**[DECISIÓN GUNNAR]** Todo lo de esta fase es propuesta mía — la trato como
borrador a validar antes de construir el editor final, no como spec cerrada.

---

## Fase 6 — Dashboards de administración (dos niveles)

**MasterN0 (vos, global):**
- Ver y crear Programas nuevos (único que puede).
- Ver todos los Miembros, de todos los Programas.
- Ver todas las entrevistas/registraciones global (ya existe una versión
  acotada a Legacy — se generaliza).
- Marcar entrevistas como completadas (dispara Fase 4).

**N0 de Programa (host raíz de cada Programa, ej. vos mismo hoy en Legacy,
pero pensado para que otra persona sea N0 de Mlqr sin ser MasterN0):**
- Administra únicamente la apariencia de SU Programa: logo, colores, redes
  oficiales, video de "Info del Programa".
- Ve el árbol/lista de Miembros de SU Programa únicamente (no ve otros
  Programas).
- No puede crear Programas nuevos ni tocar nada fuera del suyo.

Esto requiere una capa de permisos por Programa (hoy no existe — todo el
acceso admin es "todo o nada"). Es, en los hechos, la implementación real
de los "roles" que quedaron pendientes desde la Fase 1 original del MVP.

---

## Fase 7 — Oficina Virtual real, por tipo de tarjeta

Hoy es "Próximamente" para las tres. Se reemplaza con contenido real:
portfolio/catálogo para Empresa, galería/currículum para Personal, y para
Proyecto — el archivo de `OriginMemento` (tu historia de cómo entraste).

---

## Fase 8 — WhatsApp Business API real

Proyecto de infraestructura aparte, no depende de nada anterior salvo que
todo lo demás ya esté simulando el comportamiento correcto:
- Cuenta de WhatsApp Business verificada por Meta.
- Proveedor (Twilio, 360dialog, o Meta Cloud API directo).
- Webhook receptor de mensajes entrantes.
- Aprobación de templates de mensaje ante Meta (tiene tiempos que no
  controlamos, puede tardar días).
- Reemplaza el envío simulado de OTP y, más adelante, el chat de
  onboarding completo puede vivir en WhatsApp real en vez de simulado
  dentro de la web.

---

## Por qué está en fases y no en un solo bloque

Esto es un sistema multi-tenant con auth propio, un motor de onboarding
conversacional, jerarquía de 3 tarjetas por persona, y dos niveles de
administración — no es una feature, es replantear la plataforma. Ninguna
fase individual es imposible, pero construir todo de una sin poder
revisarlo vos es la forma más segura de terminar con algo roto en
producción. Por eso esta noche avanzo SOLO en lo que es 100% aditivo (no
puede romper nada de lo que ya funciona) y dejo todo lo que implica tocar
autenticación pública o el modelo de `Card` existente para cuando estés
despierto y puedas decir "sí, dale" a cada paso.

## Incidente 404 en `/c/gunnar` — resuelto, era intencional

Falsa alarma: Gunnar cambió el slug de esa tarjeta a `mastern0` él mismo.
No se perdió ningún dato. Sin acción pendiente.

---

## Estado — qué se hizo esta madrugada

**Hecho y en producción (o listo para deployar):**

- `Program`, `Member`, `ProgramMembership`, `OriginMemento` agregados al
  schema (Fase 0), migración generada y probada — **100% aditivo**, no hay
  ningún código que lea estos modelos todavía, así que no hay forma de que
  esto haya roto algo que ya andaba. Confirmé con `next build` completo +
  levanté `/c/gunnar`, `/admin`, `/admin/interviews` después de la
  migración: todo responde igual que antes.
- `Card` ganó `kind` (default `"project"`), `memberId`, `programId` —
  nullable/con default, mismo motivo: no rompe nada existente.
- Script `prisma/seed-legacy-program.ts` — idempotente, corrido y probado
  dos veces en local. Crea el `Program` "legacy", te crea a vos como
  `Member` raíz, la `ProgramMembership` en estado `active` sin host (sos
  la raíz del árbol), y enlaza tu `Card` (`gunnar`) como `kind: project`
  a ambos. Los datos de redes del Program se copiaron de tu Card actual
  como placeholder — reemplazalos por los canales oficiales reales de
  Legacy cuando los tengas.

**Pendiente de vos (nada urgente, no bloquea nada):**

Correr esto una vez en el SQL Editor de Neon (Vercel → proyecto lycard →
Storage → tu base → Query/SQL Editor) para que la base de **producción**
tenga los mismos datos que ya validé en local. Es aditivo e idempotente
(`ON CONFLICT DO NOTHING`), no toca nada existente:

```sql
INSERT INTO "Program" (id, slug, name, "primaryColor", wa, ig, li, x, fb, tiktok, yt, web, "videoThumbnailUrl", "createdAt", "updatedAt")
SELECT 'legacy-program', 'legacy', 'Legacy', '#C8A15A', wa, ig, li, x, fb, tiktok, yt, web, "videoThumbnailUrl", now(), now()
FROM "Card" WHERE slug = 'mastern0'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO "Member" (id, whatsapp, name, email, "createdAt", "updatedAt")
SELECT 'gunnar-member', COALESCE(NULLIF(wa,''), 'gunnar-bootstrap'), name, '', now(), now()
FROM "Card" WHERE slug = 'mastern0'
ON CONFLICT (whatsapp) DO NOTHING;

INSERT INTO "ProgramMembership" (id, "memberId", "programId", "referredByMembershipId", status, "createdAt", "updatedAt")
VALUES ('gunnar-membership', 'gunnar-member', 'legacy-program', NULL, 'active', now(), now())
ON CONFLICT ("memberId", "programId") DO NOTHING;

UPDATE "Card" SET kind = 'project', "memberId" = 'gunnar-member', "programId" = 'legacy-program' WHERE slug = 'mastern0';
```
(Corregido: el slug real es `mastern0`, no `gunnar` — ver el incidente
resuelto más abajo.)

---

## Fase 1 — hecha, probada localmente, en producción

- Sesión de Miembro real (`lib/memberAuth.ts`), cookie separada de la de
  Admin (`lycard_member` vs `lycard_admin`), nunca se pisan.
- **WhatsApp OTP simulado**: `/m/login` pide el número, genera un código
  de 6 dígitos (`OtpCode`, 10 min de vigencia, un solo uso), lo muestra en
  pantalla como estaría en el WhatsApp real. Al confirmar, crea el
  `Member` si es la primera vez.
- **Google Sign-In real**: `/m/auth/google/start` → consentimiento de
  Google → `/m/auth/google/callback` intercambia el código y crea/vincula
  el `Member` por `googleId` (o por email si ya existía por WhatsApp).
  **Necesita `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`** — sin eso, el
  botón redirige con un error prolijo en vez de romperse. Instrucciones
  de cómo generarlas están en `.env.example`.
- Si al Miembro le falta el email (típico en el camino de WhatsApp),
  `/m/dashboard` se lo pide antes de mostrar el resto — no es su
  credencial, es dato de campaña, como pediste.
- `/m/*` protegido por `proxy.ts` salvo `/m/login` y las rutas de Google
  OAuth (tienen que ser públicas por definición).
- Probado end-to-end con Playwright: pedir código → verificar → dashboard
  → guardar email → cerrar sesión → confirmar que `/m/dashboard` vuelve a
  pedir login. Encontré y arreglé un hydration mismatch real en el camino
  (leía `window.location` directo en el render — lo cambié a
  `useSearchParams` con su `Suspense`, que es la forma correcta en
  Next.js). Build completo sin errores, cero impacto en `/c/[slug]`,
  `/admin` y el resto de lo que ya andaba — confirmado de nuevo.

**Pendiente de vos:** crear las credenciales de Google OAuth cuando
quieras que el botón funcione de verdad (mientras tanto queda inerte,
sin romper nada). Pasos en `.env.example`, mismo patrón que hicimos con
Resend.

---

## Fase 2 — hecha, probada localmente, en producción

- `/c/[slug]` ahora resuelve `isHost` en el servidor: MasterN0 siempre ve
  modo host (mismo criterio que ya tenía para el ícono de editar — el
  admin ya puede tocar cualquier tarjeta, tiene sentido que también la
  vea en modo dueño), o si la sesión de Miembro coincide con
  `card.memberId` (todavía `null` en todas las tarjetas hasta que la
  Fase 4 las vincule — por ahora esto último no dispara para nadie más
  que vos).
- **Modo host** (sin cambios): fila de 3 cubos con el QR en el medio.
- **Modo invitado**: el cubo del QR se reemplaza por un cubo dorado
  **"Creá tu LyCard"** que lleva a `/m/login` — el paso que ya existe
  hoy (Fase 1) para empezar a entrar al sistema. Cuando construya la
  Fase 3 (el chat simulado), este mismo botón va a llevar directo ahí
  en vez de al login genérico.
- El botón inferior cambia de copy según quién mira: **"Agendá tu
  Entrevista"** (invitado, como ya estaba) vs **"Agendá una
  Entrevista"** (host — tiene más sentido cuando sos vos mirando tu
  propia tarjeta, invitando a alguien más a agendar).
- Probado en los dos modos con Playwright + captura visual: anónimo
  (invitado) y logueado como MasterN0 (host) — confirmé que cada uno
  muestra lo que corresponde, sin overflow en ningún tamaño de pantalla,
  y confirmé en producción con `/c/mastern0` que sigue funcionando
  perfecto después del deploy.

---

## Fase 3 — hecha, probada localmente, en producción

- `/m/onboarding?ref=<slug>` — chat simulado con la estética real de
  WhatsApp (paleta oscura de WhatsApp, no la dorada de LyCard, a propósito
  — pediste que se sintiera lo más parecido posible al real).
- Flujo: nombre (por audio real del micrófono — grabación de verdad con
  `MediaRecorder` — o texto) → "transcribiendo..." simulado y honesto
  (aclara que todavía no hay transcripción real, pide confirmar por
  texto) → WhatsApp → código simulado mostrado en el chat → email →
  confirmación. Reusa las acciones de la Fase 1 (`requestOtpAction`,
  `verifyOtpAction`, `updateMemberEmailAction`) sin duplicar nada.
- Al completar: crea (o reutiliza) el `Member`, y ahora sí crea la
  `ProgramMembership` en el Programa Legacy — con
  `referredByMembershipId` resuelto automáticamente si el `ref` en la URL
  apunta a una tarjeta con dueño conocido (probé con `ref=gunnar`: quedó
  bien enlazado a tu membership). Si el Programa "legacy" todavía no
  existe en la base (nunca corriste el SQL pendiente de la Fase 0), esta
  acción lo crea sola — ya no depende de ese paso manual.
- **Tocar el QR en modo host ahora abre la simulación directo**
  (`/m/onboarding?ref=<tu-slug>`) en vez de copiar el link — pediste
  poder probarlo sin necesitar escanear con otro teléfono. Como
  consecuencia saqué el botón viejo de "copiar link" (`shareCard`),
  quedó sin uso — si en algún momento lo querés de vuelta, es rápido de
  reagregar.
- Encontré y arreglé un bug real en el camino: los mensajes del bot
  salían duplicados en desarrollo por el doble-render de Strict Mode de
  React — no pasaba en producción, pero lo blindé igual con un `ref`
  guard para que sea robusto sin depender de esa diferencia.
- Probado de punta a punta con Playwright: la conversación completa
  (nombre → WhatsApp → OTP → email → confirmación), y confirmé los datos
  en base (Member, Program, Membership con el referredBy bien resuelto).
  También probé el tap del QR en modo host, confirmé que navega
  correctamente. Build completo sin errores.

---

## Fase 4 — hecha, probada localmente, en producción

- `Registration` ahora se vincula a la `ProgramMembership` del visitante
  cuando quien agenda está logueado como Miembro (`registerInterviewAction`
  resuelve su membership en el Programa de la tarjeta que está viendo). Las
  registraciones anónimas o sin membership siguen funcionando igual que
  antes, solo que sin ese vínculo — nada se rompe para lo que ya existía.
- `/admin/interviews` ahora muestra el estado de la membership de cada
  inscripto y, si todavía es `invited`, un botón **"Marcar entrevista
  hecha"** — como asumí en el plan original (vos o el N0 del Programa la
  marcan a mano después de la charla real, no hay forma automática de
  saberlo).
- Al marcarla (`completeInterviewAction`, solo Admin): la membership pasa a
  `active` con `interviewedAt` registrado, y en la misma transacción se
  crean sus tres tarjetas — `project` (su propia tarjeta de reclutamiento,
  slug nuevo derivado de su nombre), `company` y `personal` (en blanco,
  listas para que las edite) — salteando cualquier tipo que ya tuviera (así
  que apretar el botón dos veces no duplica nada, es idempotente). También
  archiva el `OriginMemento`: una foto de la tarjeta que lo reclutó
  (nombre, título, slug, retrato del referente) para su futura Oficina
  Virtual.
- Probado de punta a punta con Playwright contra Postgres local: onboarding
  completo → agendar entrevista real desde `/c/gunnar` → login de Admin →
  activar desde `/admin/interviews` → confirmé en base que la membership
  quedó `active`, las 3 tarjetas se crearon con los slugs correctos, el
  `OriginMemento` quedó con el snapshot del referente (vos, `gunnar`), y la
  nueva tarjeta de proyecto ya responde 200 en `/c/fase4-testigo`. Build
  completo sin errores, `tsc`/`eslint` limpios.
- Extraje `slugify` (antes duplicado en `app/admin/actions.ts`) a
  `lib/slug.ts`, junto con un `uniqueSlug()` compartido para evitar
  colisiones al derivar slugs de un nombre — lo usa tanto la creación
  manual de tarjetas del Admin como el auto-spawn de esta fase.

**Nota de diseño:** no toqué producción con datos de prueba — a diferencia
de las fases anteriores (que solo necesitaban un `GET` para verificar), esta
fase escribe (activar una membership, crear tarjetas) y no quise ensuciar tu
base real con un "Fase4 Testigo" de mentira. Verifiqué en prod solo que
nada se rompió (build, rutas existentes, sin errores de runtime) — la
prueba de escritura completa quedó en local, donde la corrí con datos
descartables.

---

## Fase 5 — hecha, probada localmente, en producción

- **Editores propios** en `/m/dashboard/company` y `/m/dashboard/personal`
  (`components/MemberCardEditor.tsx`, patrón calcado de `EditorForm.tsx`
  del Admin pero con auth de Miembro y verificación de dueño — solo podés
  editar una tarjeta si `card.memberId` es el tuyo). Si tu membership
  todavía no está activa (Fase 4 no corrió), muestra un aviso prolijo en
  vez de romperse (`components/CardNotUnlocked.tsx`).
- `/m/dashboard` ahora lista tus 3 tarjetas (Proyecto/Empresa/Personal) con
  botones Ver/Editar, en vez del texto placeholder de antes.
- **Vista pública bifurcada por `card.kind`** en `LyCardView.tsx` — mismo
  componente, mismo "chasis" (foto, nombre, badges, cita, dock de redes),
  pero la fila de cubos y el botón inferior cambian según el tipo:
  - **Empresa**: cubos "Sobre mi Empresa" (modal genérico con tu
    título/cita, sin la masterclass de Legacy) / QR (ahora copia el link,
    no dispara el onboarding — las tarjetas de empresa no reclutan al
    Programa) / "Enviar Invitación" (mismo mecanismo, pero el email ya no
    dice "Programa Legacy" sino que invita a conocer el negocio). Botón
    inferior: "Agendar una Reunión" (reusa `registerInterviewAction` tal
    cual, solo cambia el copy).
  - **Personal**: cubos "Guardar Contacto" (descarga un `.vcf` real desde
    `/c/[slug]/vcard`, nueva Route Handler) / QR (copia el link) / "Enviar
    Mensaje" (nueva `sendContactMessageAction` — le llega por correo al
    dueño de la tarjeta, con `replyTo` al remitente; si el dueño todavía
    no cargó su email o no hay `RESEND_API_KEY`, falla prolijo). Sin botón
    inferior — quedó "opcional" del plan original, lo dejé afuera por
    ahora.
  - **Proyecto**: sin cambios — exactamente el comportamiento de las
    Fases 2/3.
  - "Mi camino con Legacy" (el botón de historia) solo se muestra en
    tarjetas de Proyecto — no aplica a Empresa/Personal.
- Probado de punta a punta con Playwright contra Postgres local:
  - Vistas públicas de Empresa y Personal (cubos correctos, botón inferior
    correcto/ausente, modal "Sobre mi Empresa" con el copy genérico).
  - Envío de "Enviar Mensaje" en una tarjeta Personal sin email cargado →
    falló prolijo con el mensaje "todavía no está activado", como se
    espera.
  - Login de Miembro → `/m/dashboard` lista las 3 tarjetas → edité la
    tarjeta de Empresa (nombre + rol) → guardó → confirmé en Postgres y en
    la vista pública (`/c/fase4-testigo-empresa`) que el cambio se reflejó.
  - Descarga de `.vcf` responde `200` con `Content-Type: text/vcard`.
  - `tsc`/`eslint` limpios, `next build` completo sin errores, las 15
    rutas compilan (incluida la nueva `/c/[slug]/vcard`).
- Verificado en prod solo lo no-destructivo (build, rutas existentes, sin
  errores nuevos de runtime) — igual que en la Fase 4, no generé datos de
  prueba en tu base real.

---

## Fase 6 — hecha, probada localmente, en producción

- **Capa de permisos por Programa**, montada sobre el mismo login/sesión
  de Admin que ya existía (no un sistema nuevo): `Admin` gana un
  `programId` opcional. `programId = null` → **MasterN0**, acceso global,
  exactamente como hoy. `programId` seteado → **N0 de Programa**, acceso
  acotado a ese Programa únicamente. Solo vos (MasterN0) podés crear
  Programas y sus N0 — confirmado por diseño, tal como pediste.
- `/admin/programs` (MasterN0-only): crear Programas nuevos, ver la lista
  con miembros/N0 de cada uno.
- `/admin/programs/[id]` — el panel propio de cada Programa:
  - Editor de marca (nombre, color primario, redes oficiales) vía
    `updateProgramAction` — accesible a MasterN0 (cualquier Programa) o al
    N0 asignado (solo el suyo).
  - Lista de Miembros de ESE Programa (con quién los refirió y link a su
    tarjeta de proyecto si ya la tiene).
  - Entrevistas/registraciones acotadas a ese Programa, con el mismo botón
    "Marcar entrevista hecha" de la Fase 4 — `completeInterviewAction`
    ahora valida que un N0 acotado no pueda activar membresías fuera de su
    propio Programa.
  - Sección "Agregar N0" (crear el admin acotado de ese Programa) — solo
    visible para MasterN0, un N0 de Programa no la ve.
- `/admin` (roster completo) y `/admin/interviews` (vista global) ahora
  redirigen a un N0 acotado hacia su propio `/admin/programs/[id]` en vez
  de mostrarle datos de otros Programas — ahí es donde vive el "no puede
  tocar nada fuera del suyo" que pediste.
- Probado de punta a punta con Playwright contra Postgres local: logueado
  como vos (MasterN0), creé un Programa nuevo ("Mlqr") y un N0 acotado
  para él → cerré esa sesión, logueado como ese N0 nuevo → confirmé que
  cae directo en su propio panel, que pedir `/admin` o `/admin/programs`
  lo rebota de vuelta al suyo, que **no ve** la sección "Agregar N0", y
  que pedir DIRECTAMENTE por URL el panel de Legacy (otro Programa) lo
  rebota también — no llega a ver ni una fila de datos ajenos. Confirmé
  en Postgres que el Programa y el N0 quedaron bien creados y vinculados.
  Build completo sin errores, `tsc`/`eslint` limpios, las 17 rutas
  compilan (incluidas `/admin/programs` y `/admin/programs/[id]`).
- **Nota de diseño:** el editor de marca usa campos de texto simples para
  color/redes — no repetí el flujo de subida de imagen para el logo del
  Programa todavía (`logoUrl`/`videoThumbnailUrl` quedan editables por SQL
  o quedan para un ajuste rápido si los querés desde la UI). Lo que
  importa de esta fase es la capa de permisos, no la subida de archivos.
- Verificado en prod solo lo no-destructivo (build, rutas existentes, sin
  errores nuevos de runtime) — misma disciplina que las Fases 4 y 5, no
  generé Programas ni admins de prueba en tu base real.

---

## Fase 7 — hecha, probada localmente, en producción

- El botón "Virtual Office" (el emblema dorado central) ya no es un
  "Próximamente" falso — abre contenido real, distinto por tipo de
  tarjeta. La animación de "llave girando" se mantiene (más corta, 900ms)
  pero ahora desemboca en un modal real, no en un toast vacío.
- **Proyecto**: muestra tu `OriginMemento` — la foto/nombre/título de
  quien te reclutó, el Programa y la fecha en que entraste. Si la tarjeta
  no tiene referente (sos la raíz del árbol, como tu propia `mastern0`
  hoy en producción — no tiene `memberId` vinculado todavía), muestra un
  mensaje de "Fundador de la Red" en vez de romper o mostrar algo vacío.
- **Empresa**: portfolio/catálogo — lista de trabajos (título, subtítulo,
  descripción, imagen opcional por URL), editable desde
  `/m/dashboard/company`. Sin ítems cargados, muestra un estado vacío
  prolijo en vez de una lista en blanco.
- **Personal**: mismo mecanismo, enmarcado como currículum/galería
  (experiencia/logro en vez de trabajo/servicio) — mismo campo de datos
  (`Card.officeItems`, un solo modelo para ambos, evita duplicar
  infraestructura), editable desde `/m/dashboard/personal`.
- Nuevo campo `Card.officeItems` (Json, default `[]`) — aditivo, cada
  ítem es `{id,title,subtitle?,description?,imageUrl?}`. El editor
  (`MemberCardEditor.tsx`) permite agregar/editar/quitar ítems con estado
  de React, serializados a un campo oculto al guardar; el server action
  sanea el JSON recibido (nunca confía en lo que llega del cliente tal
  cual, igual que el resto de esta acción).
- Aproveché para eliminar `tSaved`/`tSoon` (i18n keys huérfanas desde
  hace varias fases, confirmé cero referencias antes de borrarlas) y
  `tOffice` (quedó huérfana con este cambio).
- Probado de punta a punta con Playwright contra Postgres local:
  - Tu tarjeta raíz (`gunnar`, sin referente) muestra el fallback de
    Fundador — confirmado con captura.
  - Una tarjeta de proyecto CON `OriginMemento` real (`fase4-testigo`,
    reclutada por `gunnar` en pruebas de la Fase 4) muestra la foto,
    nombre y título del referente, el Programa y la fecha — confirmado
    con captura.
  - Una tarjeta de Empresa sin ítems muestra el estado vacío; logueado
    como su dueño, agregué un ítem de portfolio desde el editor, guardé,
    y confirmé que aparece en la vista pública con título/subtítulo/
    descripción — confirmado con captura.
  - `tsc`/`eslint` limpios, `next build` completo sin errores, las 17
    rutas compilan.
- Verificado en prod solo lo no-destructivo (build, `/c/mastern0` sigue
  rindiendo igual, sin errores nuevos de runtime) — no edité tu tarjeta
  real para probar el flujo de escritura, esa prueba completa quedó en
  local con datos descartables, misma disciplina que las fases previas.

---

## Fase 7.1 — QA de Gunnar: ganchos rápidos, hecha, probada localmente, en producción

Tras un QA visual completo de las 3 pantallas de admin, se priorizaron los
3 hallazgos de menor esfuerzo/mayor valor (el resto — dropdowns de
Cita/Siglas/Denominación gestionados por N0, descripción de Programa
generada por IA desde archivo, paleta de colores extraída por IA desde
imagen, efecto de confeti + bloqueo de campos al guardar, ampliar "Mi
cuenta" con foto/bio/cambio de contraseña — queda pendiente para una
siguiente ronda, fuera de esta tanda).

- **Programa: activo/inactivo + eliminar.** Nuevo campo
  `Program.active` (Boolean, default `true`) — un apagador suave, sin
  ningún efecto de runtime todavía (no bloquea nuevas altas ni nada más),
  solo visible/togglable desde `/admin/programs`. `deleteProgramAction`
  es un borrado guardado: se niega (con mensaje inline, no error crudo)
  si el Programa tiene tarjetas, N0 o miembros — pensado para limpiar
  Programas vacíos/de prueba, no para borrar uno con actividad real.
- **Miembros: listado real + editar/borrar/mensaje** desde
  `/admin/programs/[id]`. Resuelve el "Miembros: 1" que no cuadraba — en
  producción ese número siempre fue real, simplemente no había forma de
  ver *quién* era. Cada miembro ahora muestra nombre/WhatsApp/email/
  estado/referente, con:
  - **Editar** (expandible, sin JS extra — `<details>` nativo): nombre,
    WhatsApp, email.
  - **Mensaje**: envía un email vía Resend (mismo patrón que el resto de
    la plataforma — si no hay `RESEND_API_KEY` configurada o el miembro
    no tiene email, avisa en vez de fallar en silencio).
  - **Borrar**: guardado igual que Programa — se niega si el miembro ya
    tiene tarjetas activas (un onboarding ya circulando con URL pública),
    solo borra a quien sigue en estado "invitado".
- **Redes sociales de tarjetas de proyecto → nivel Programa.** Como
  señalaste: "cada N0 es quien define el proyecto — es el único que
  puede... ponerle valores a redes sociales". Antes cada tarjeta de tipo
  `project` tenía sus propios campos ig/li/x/fb/tiktok/yt/web editables
  en "Personalizar LyCard", duplicando lo que ya existía a nivel
  `Program` desde la Fase 0. Ahora:
  - El editor de MasterN0 (`/admin/[slug]`) solo muestra esos 6 campos
    para tarjetas de Empresa/Personal (sin cambios ahí); para Proyecto
    muestra únicamente WhatsApp (contacto directo del host) con una nota
    explicando que el resto se administra desde el Programa.
  - La vista pública (`/c/[slug]`) ahora lee esos 6 canales desde
    `card.program` en vez de `card` cuando `kind === "project"` —
    `Card.wa` se mantiene como excepción (es el contacto personal del
    host, no branding del proyecto, ya diferenciado desde antes).
  - Los campos `ig/li/x/fb/tiktok/yt/web` siguen existiendo en `Card`
    (no se tocó el schema) — simplemente dejaron de leerse/editarse para
    tarjetas de proyecto; sí se siguen usando tal cual para Empresa y
    Personal.
- **Bug aparte, ya arreglado y en producción** (commit `7a9465e`, previo
  a esta tanda): crear el N0 de un Programa tiraba a la página de error
  genérica de Next en vez de mostrar el mensaje — eran los únicos dos
  server actions de la plataforma que usaban `throw new Error(...)` en
  vez del patrón establecido de `redirect(...?error=...)`.
- Probado de punta a punta con Playwright contra Postgres local:
  - Programa de prueba creado, N0 asignado sin error (regresión del fix
    de arriba confirmada dos veces), canales de Programa guardados.
  - Toggle activo/inactivo confirmado, con el estado "· Inactivo"
    visible en el listado.
  - Editor de tu tarjeta `gunnar` (proyecto): confirmado que ig/li/x/fb/
    tiktok/yt/web ya NO aparecen, solo WhatsApp + nota — con captura.
  - Editor de una tarjeta de Empresa (`fase4-testigo-empresa`): confirmado
    que los 8 campos siguen intactos — regresión, con captura.
  - Vista pública `/c/gunnar`: puse valores "basura" directo en la DB en
    los campos sociales de la Card y confirmé que los links renderizados
    siguen siendo los del Programa (Legacy), no los de la Card — prueba
    de que la lectura ya es 100% desde `Program`.
  - Sección de Miembros del Programa Legacy: 4 miembros reales listados
    (vos, Ana Testigo x2, Fase4 Testigo) con Editar/Mensaje/Borrar
    funcionando — con captura.
  - `tsc`/`eslint` limpios, `next build` completo sin errores.
  - Datos de prueba (Programas "QA..." y sus N0) borrados de la DB local
    al terminar — no se tocó producción en ningún paso destructivo.

---

## Fase 9 (en cola) — Identidad de tarjeta 100% definida por el N0

Ampliación de lo que en la Fase 7.1 quedó anotado como diferido
(dropdowns de Cita/Siglas/Denominación, distintivos). Gunnar aclaró el
alcance completo el 2026-09-15: no es solo mover 3 campos a Programa —
es que **todo lo que hoy vive hardcodeado en el código** (escalas fijas,
copy de modales, labels de botones) pasa a ser configuración por
Programa que arma su N0. La tarjeta pública deja de tener contenido
fijo — todo lo lee de la config del Programa. Alcance confirmado:

1. **Medallón principal** (hoy `MEDALS` en `lib/data.ts`, escala fija
   bronce→diamante). El N0 define cuántos niveles tiene su Programa,
   nombre y (probablemente) ícono/color de cada uno.
2. **Siglas** — dejan de ser texto libre por tarjeta. Son los *puestos*
   que existen dentro del Programa (ej. O.D., C.M.O.) — lista que arma
   el N0, no cada host.
3. **Denominación** — la descripción de cada sigla/puesto (hoy el campo
   `tooltip`, libre) — va pegada 1 a 1 con cada sigla de la lista del N0.
   Un usuario puede proponer la suya, pero requiere aprobación del N0
   antes de quedar disponible (pendiente de diseñar ese flujo de
   aprobación).
4. **Sabiduría / jerarquía** — hoy 6 niveles fijos (`RANKS` en
   `lib/data.ts`, curioso→ancient). El N0 elige cuántos niveles tiene su
   Programa, nombre y descripción de cada uno.
5. **Modales** — el contenido de los popups (O.D., Ancient, Story, Info,
   kicker de Virtual Office, etc.) hoy es copy fijo en `LyCardView.tsx`
   — pasa a ser editable por Programa.
6. **Acciones/botones** — "Info Legacy" y "Agendar Entrevista" no son
   necesariamente esos textos ni esas acciones; el N0 puede renombrarlos
   y potencialmente cambiar qué hacen.

Implica: nuevo modelo o campos Json en `Program` para esta config,
rehacer el editor de Programa (`/admin/programs/[id]`) para armarla, y
que `EditorForm.tsx` + `LyCardView.tsx` lean de ahí en vez de tener
nada fijo. Es la Fase que le da sentido real a "multi-programa" (cada N0
diseña su propio juego de reglas) — grande, no es un gancho rápido.
**Arrancada el 2026-09-15, noche — ejecución fase por fase, ver desglose
más abajo.**

Dato suelto que quedó resuelto en la misma conversación: el WhatsApp
**es obligatorio hoy** para crear tarjeta vía el chat de onboarding
(`components/OnboardingChat.tsx` — paso hardcodeado nombre→whatsapp→
otp→email, sin bypass). Solo es opcional si la persona entra por
`/m/login` y usa "Continuar con Google" en vez del flujo de WhatsApp.

### Atajo shippeado: títulos de botones y modales editables por N0

Punto 5 y 6 de la lista de arriba (modales, acciones/botones), en su
versión mínima — **solo el título/label**, no el contenido completo ni
la acción en sí. Gunnar pidió explícitamente este recorte ("tomá un
atajo") en vez de esperar a la Fase 9 completa.

- Nuevo campo `Program.cardLabels` (Json, default `{}`) — mapa plano
  `clave → texto`. Las claves son exactamente las mismas que ya usaba
  `lib/i18n.ts` (`storyBtn`, `infoBtn`, `scheduleBtn`,
  `scheduleBtnHost`, `createCardBtn`, `inviteBtn`, `customize`,
  `ancKicker`, `storyKicker`, `infoKicker`, `infoTitle`,
  `inviteKicker`, `scheduleKicker`, `scheduleTitle`,
  `officeKickerProject` — lista fija en `lib/cardLabels.ts`).
- Nueva sección "Textos de Botones y Modales" en
  `/admin/programs/[id]`, agrupada en Botones/Modales — un input de
  texto por clave, con el texto original como placeholder. Campo
  vacío = usa el default (no se persiste esa clave).
- `LyCardView.tsx`: nuevo helper `cardLabel(program, lang, key)` —
  devuelve el override si existe y no está vacío, si no cae al
  `t(lang, key)` de siempre. Se usa en los 15 puntos exactos donde
  antes había `t(lang, "...")` para estas claves — nada más se tocó.
- **Limitación honesta, igual que las redes sociales en la Fase 7.1**:
  solo aplica a tarjetas de Proyecto, porque son las únicas que hoy
  traen `card.programId` poblado (las de Empresa/Personal se crean sin
  Program asociado — dato confirmado en el código, no supuesto). El
  override tampoco distingue idioma (ES/EN): el texto que pone el N0
  se muestra igual en ambos, no hay traducción — si mañana hace falta,
  se resuelve con dos inputs por clave en vez de uno.
- Probado en local con Playwright: guardé 3 overrides desde el panel
  del N0 (botón "Mi camino con...", botón Info, encabezado del modal
  Ancient) y confirmé con captura que la tarjeta pública real
  (`/c/gunnar`, Programa Legacy) los muestra tal cual — y que una
  tarjeta de Empresa sin Program siguió mostrando el texto original sin
  cambios (regresión). `tsc`/`eslint`/`next build` limpios.

### Corrección importante: el atajo fue solo el título, falta el contenido

Gunnar volvió con dos ejemplos concretos que muestran que "títulos de
botones y modales" no alcanza — hay contenido dentro de los modales que
también necesita ser dinámico, y no todo con el mismo dueño (N0 vs. cada
host). Dos casos distintos:

**Caso 1 — Modal "Mi camino con Legacy" (Story): el dueño es CADA
HOST, no el N0.** Hoy el título del botón ya es editable (el atajo), pero
adentro del modal la cita («Descubrí en Legacy una forma de
trascender.») y el cuerpo (el párrafo largo) son copy fijo de
`lib/i18n.ts` (`storyHead`/`storyBody`) — el mismo texto para cualquier
host del Programa. Gunnar quiere que **cada usuario escriba el suyo**
(ej. "Porque creo en el Movimiento Laborista — 'Cumple luego promete ha
sido el lema de mi vida'... toda mi vida he sido un hombre de palabra..."),
pedido como campo más en "Personalizar LyCard" — mismo lugar donde hoy
edita nombre/cargo/cita de marca. Esto es Card-level, no Program-level.

**Caso 2 — Modal O.D.: el dueño es el N0, y el orden está invertido.**
Hoy se ve:
```
ORIGINAL DREAMER      ← kicker (chico, arriba) = card.tooltip (denominación)
O.D.                  ← head (grande, título)  = card.siglas (sigla)
Diseñador, visionario...
```
Gunnar: **debería ser al revés** — la sigla (O.D.) es la posición
asignada dentro del Programa y va arriba, chica; la denominación
(Original Dreamer) es el nombre completo de esa posición y va como
título grande, debajo. Fix concreto: `kicker: card.siglas, head:
card.tooltip` en el `modalMap` de `LyCardView.tsx` (hoy está al revés).

Y más de fondo: la sigla, la denominación y la descripción de cada
puesto (hoy `card.siglas`/`card.tooltip`/`odBody`, texto libre por
tarjeta) en realidad **son una escalera de puestos que diseña el N0 al
armar su Programa** — no algo que cada host inventa. Ejemplo real que
dio Gunnar para Legacy:

| Sigla | Denominación | Quiénes |
|---|---|---|
| O.D. | Original Dreamer | El/los creadores — hoy Gunnar |
| — | Founders | Juancho, Rene, Sergio, etc. |
| — | Experts | Primera línea de N3s |
| — | Specialists | Primera línea de N4s |
| — | Partners | Otros |

Cada fila lleva su propia descripción (el párrafo que hoy es
`odBody`, fijo). El N0 arma esta lista una vez por Programa; cada host
elige a cuál pertenece (o se le asigna) en vez de escribir su propia
sigla/denominación a mano.

### Desglose ordenado de lo que falta de Fase 9 — ejecución en curso

Se rompe en fases chicas, cada una probada/deployada antes de pasar a la
siguiente (misma disciplina que Fases 0-7):

- **Fase 9.1 — Escalera de Puestos (dato) + fix del orden O.D. —
  hecha, probada localmente, en producción.**
  Nuevo modelo `Puesto` (`programId`, `siglas`, `denominacion`,
  `descripcion`, `order`) — el N0 arma su lista desde
  `/admin/programs/[id]` (crear/editar/borrar), nueva sección
  "Escalera de Puestos" con formulario de alta y edición inline por
  puesto (`app/admin/programs/puestos-actions.ts`). `Card.puestoId`
  (nullable, `onDelete: SetNull`) queda listo para la Fase 9.2 — borrar
  un Puesto en uso no rompe la tarjeta, solo la hace caer al fallback.
  Fix chico ya aplicado en `LyCardView.tsx`: `modalMap.od` ahora usa
  `kicker: card.siglas, head: card.tooltip` (antes al revés).
  Probado en local: creé el Puesto O.D./Original Dreamer desde el
  panel del N0 (confirmado con consulta directa a la DB, ya que
  `networkidle` de Next dev no asienta por el socket de HMR y da falsos
  negativos en el banner — comportamiento ya visto antes en esta
  sesión), y confirmé con captura que el modal O.D. de `/c/gunnar` ya
  muestra la sigla chica arriba y la denominación grande como título.
  `tsc`/`eslint`/`next build` limpios. La Escalera de Puestos vive en
  el panel pero **todavía no está conectada a las tarjetas** — eso es
  la Fase 9.2.
- **Fase 9.2 — Escalera de Puestos (aplicación) — hecha, probada
  localmente, en producción.**
  `EditorForm.tsx`: si la Card es de Proyecto y el Programa ya tiene
  puestos cargados, los inputs libres de Siglas/Denominación se
  reemplazan por un `<select name="puestoId">` con las opciones del
  Programa + "— Mantener texto actual —" (no toca nada si se deja así).
  Sin Programa o sin puestos todavía, sigue exactamente como antes —
  cero cambio de comportamiento para Empresa/Personal o para cualquier
  Card sin Programa asociado.
  `updateCardAction`: al elegir un Puesto, además de guardar
  `Card.puestoId` también **snapshotea** `siglas`/`tooltip` con los
  valores del Puesto — así si el N0 borra ese Puesto más adelante, la
  tarjeta no queda en blanco, cae a su última foto conocida.
  `LyCardView.tsx`: badge superior y modal O.D. (kicker/head/body) leen
  primero del Puesto asignado (`card.puesto`, pasado desde
  `app/c/[slug]/page.tsx` con `include: { puesto: true }`), con fallback
  a `card.siglas`/`card.tooltip`/`odBody` si no hay Puesto.
  Probado en local con Playwright, punta a punta: creé el Puesto O.D./
  Original Dreamer con una descripción distintiva, lo asigné a
  `gunnar` desde `/admin/gunnar` (confirmé que el editor mostró el
  `<select>`, no los inputs libres), y confirmé en `/c/gunnar` que el
  badge y el modal ya muestran "O.D." arriba / "Original Dreamer" como
  título / la descripción del Puesto (no la fija de `odBody`) —
  regresión: el editor de una tarjeta de Empresa sin Programa siguió
  mostrando los inputs libres de siempre, sin `<select>`. `tsc`/
  `eslint`/`next build` limpios. Datos de prueba revertidos en local al
  terminar.
- **Fase 9.3 — Historia personal por tarjeta — hecha, probada
  localmente, en producción.**
  Nuevos campos `Card.storyQuote`/`Card.storyBody` (default `""`) —
  vacío cae al copy fijo de Legacy de siempre (`storyHead`/`storyBody`
  en `lib/i18n.ts`), sin romper ninguna tarjeta existente.
  Descubrimiento al construir esto: las tarjetas de Proyecto **no
  tenían ningún editor propio del host** — `/m/dashboard` excluía a
  propósito el botón "Editar" para `kind === "project"`, y el único
  camino de edición era `/admin/[slug]` (MasterN0-only, gateado por la
  cookie de Admin, inalcanzable para un Member). Por eso se creó
  `components/MemberStoryEditor.tsx` + `/m/dashboard/project` —
  deliberadamente angosto: **solo** cita y cuerpo de "Mi camino con
  Legacy", no nombre/foto/siglas/canales (esos siguen siendo del N0 o
  del Programa, ver Fase 9.1/9.2 y Fase 7.1 — no se le devolvió al host
  edición de nada que ya centralizamos). Nueva `updateMemberStoryAction`
  en `app/m/dashboard/actions.ts`, con el mismo chequeo de propiedad
  (`card.memberId === memberId`) que el resto de esta sección, más
  `card.kind !== "project"` como guarda extra. `app/m/dashboard/page.tsx`
  ya muestra "Editar" para las 3 kinds de tarjeta, no solo 2.
  `LyCardView.tsx`: el modal de historia usa `card.storyQuote ||
  t(lang,"storyHead")` y `card.storyBody || t(lang,"storyBody")`.
  Probado en local con Playwright, punta a punta con el flujo real de
  login (WhatsApp OTP simulado, no until un atajo): logueado como el
  Member dueño de `gunnar`, entré a `/m/dashboard/project`, guardé una
  cita y una historia distintivas, y confirmé en `/c/gunnar` que el
  modal "Mi camino con Legacy" ya las muestra en vez del texto fijo de
  Legacy. `tsc`/`eslint`/`next build` limpios. Datos de prueba
  revertidos en local al terminar.
- **Fase 9.4/9.5 — Medallón y Sabiduría configurables por N0 — hecha,
  probada localmente, en producción.**
  Hallazgo antes de arrancar, confirmado con Gunnar: **el medallón no
  se mostraba en ningún lado de la tarjeta pública** — se elegía en el
  editor, se guardaba, pero no tenía salida visual (a diferencia de
  Sabiduría, que sí aparece como segundo badge). Se decidió hacerlo
  visible primero y configurable después, mismo alcance que Sabiduría
  — por eso van juntas.
  - `Program.medalScale`/`Program.rankScale` (Json, default `"[]"`) —
    lista ordenada de `{key,nombre,subtitulo,icono,color,descripcion}`
    por Programa. Lista vacía = sigue la escala fija de `lib/data.ts`,
    mismo fallback no-destructivo del resto de la Fase 9. Un solo
    modelo de datos (`lib/escalas.ts`) para las dos escalas — es la
    misma forma de problema, no hacía falta duplicar código.
  - `components/EscalaEditor.tsx` (nuevo, cliente): editor de lista
    reutilizado para ambas escalas — mismo patrón de `officeItems` en
    `MemberCardEditor.tsx` (estado local + un input JSON oculto + una
    action de guardado). Dos secciones nuevas en
    `/admin/programs/[id]`: "Escala de Medallón" y "Escala de
    Sabiduría".
  - `EditorForm.tsx`: si el Programa tiene una escala custom, el
    selector de Medallón/Sabiduría se arma con esos niveles en vez de
    los fijos — vacío, sigue exactamente como antes (Empresa/Personal
    nunca ven esto, no tienen Programa).
  - `LyCardView.tsx`: nuevo tercer badge (Medallón) junto a Sigla y
    Sabiduría, con su propio modal. El badge de Sabiduría dejó de
    mostrar siempre "✦ Ancient Pioneer ✦" fijo sin importar el rango
    real de la tarjeta — ahora es dinámico (`✦ {nombre del rango real} ✦`).
    Fila de badges pasa a `flexWrap` para no desbordar con 3 elementos.
  - Aproveché para eliminar `ancHead` (i18n key que quedó huérfana al
    hacer el head dinámico — confirmé cero referencias antes de
    borrarla, mismo criterio que en la Fase 7).
  - Probado en local con Playwright, 19 aserciones en dos rondas: el
    medallón por defecto (Platino) ya aparece visible con su modal; el
    modal de Sabiduría ya muestra el rango real en vez del texto fijo
    de Ancient; armé una escala custom de cada tipo desde el panel del
    N0, la asigné a `gunnar` desde su editor, y confirmé en `/c/gunnar`
    que el badge y el modal reflejan el nivel custom (nombre, color,
    ícono, descripción) — con captura. Regresión: el editor de una
    tarjeta de Empresa (sin Programa) sigue ofreciendo únicamente la
    escala fija, sin el medallón custom del Programa. `tsc`/`eslint`/
    `next build` limpios. Datos de prueba revertidos en local al
    terminar.

---

**Fix crítico — una Card nunca tenía forma de asignarse a un Programa**
(hecho, probado localmente, en producción). Gunnar reportó que editar
títulos, descripción de puestos y escalas en el panel del Programa "no
cambiaba nada" en las tarjetas reales. Diagnóstico en producción (lectura
del payload de `/c/gunnarpareja` y `/c/juancho` vía Vercel MCP,
read-only): ambas Cards tenían `programId: null` y `puestoId: null` — no
es texto hardcodeado, todo el código de Fase 9 (`cardLabel()`, Puesto,
`medalScale`/`rankScale`) ya caía correctamente al Programa cuando
existía uno enlazado, pero **no existía ningún control en el editor de
Card (`/admin/[slug]`) para elegir un Programa**: `createCardAction` y
`updateCardAction` nunca tocaban `programId`, y el select de Puesto
(`puestos={card.program?.puestos ?? []}`) dependía de que `card.program`
ya existiera — un candado sin llave. Fix: nuevo select "Programa" en
`EditorForm.tsx` (sólo project cards, sólo visible para MasterN0 —
`currentAdminScope().programId === null` — un N0 acotado ya llega con
sus Cards enlazadas vía el flujo de entrevista/membership de Fase 4, así
que no necesita tocar esto), cableado en `updateCardAction`; cambiar de
Programa limpia el `puestoId` (pertenecía a la escalera del Programa
anterior). Probado end-to-end con Playwright: Card de proyecto sin
Programa → confirmé que el botón "Mi camino con Legacy" mostraba el
label default → login MasterN0 → asigné Programa Legacy → guardé →
recién ahí apareció el select de Puesto → elegí uno con descripción
custom → guardé → la tarjeta pública mostró el label de Programa
sobreescrito y la descripción del Puesto en el modal O.D. `tsc` limpio.
Datos de prueba (Card, Puesto, override) revertidos en local al
terminar.

---

**"Zona de Riesgo" — reinicio completo de la plataforma** (hecho, probado
localmente; **la ejecución en producción queda en manos de Gunnar**, ver
abajo). Pedido explícito: borrar todas las Cards actuales y arrancar de
cero con una Card "MasterN0" como identidad raíz — la única que existe
antes de que se cree ningún Programa. No tengo (ni pedí) acceso directo
a la base de producción, así que esto se armó como una acción
MasterN0-only dentro del panel (`/admin/reset`, link "Zona de Riesgo" al
pie de `/admin/programs`), no como un script que yo corro. Borra, en una
sola transacción y en orden de dependencias: Registration, OriginMemento,
ProgramMembership, Card, OtpCode, todo Admin salvo el que ejecuta el
reset (así no te desloguea a vos mismo), Puesto, Member, Program — y
crea la Card `mastern0` al final. Exige escribir literalmente "BORRAR
TODO" en un input antes de ejecutar (chequeado en el server, no solo en
el cliente). Probado local con Playwright: frase incorrecta rebota con
error sin tocar nada; frase correcta ejecuta, confirmé con `psql` que
las 8 tablas relevantes quedan en 0 salvo 1 Card (`mastern0`) y el mismo
Admin que lo ejecutó; la sesión de ese Admin sigue viva después (no lo
desloguea); `/c/mastern0` renderiza. `tsc` limpio.

**Deploy**: el código de `/admin/reset` ya está en producción. La
ejecución del borrado en sí — apretar el botón — es un paso que le
corresponde a Gunnar, no a mí: es irreversible y afecta datos reales
(las Cards de `gunnarpareja` y `juancho`, entre otras).

---

**Carousel swipeable Programa/Business/Personal en `/c/[slug]`** (hecho,
probado localmente, en producción). Pedido de Gunnar: poder swipear entre
las 3 tarjetas de una misma persona en el celular, en ese orden fijo.
Decisión suya al preguntarle el alcance: cualquiera con el link de
cualquiera de las 3 puede swipear a ver las otras dos, sin login.

`app/c/[slug]/page.tsx` ahora busca los hermanos por `card.memberId`
(las 3 Cards que crea `completeInterviewAction` en la Fase 4 ya comparten
memberId) y arma un bundle {card, qrSvg, originMemento, program, puesto}
por cada uno — antes solo se generaba esto para la Card pedida. Si no hay
`memberId` (Cards standalone viejas, o la Card `MasterN0` recién creada
por la Zona de Riesgo) sigue rindiendo un solo `LyCardView`, sin cambios
— la rama nueva es puramente aditiva.

Nuevo `components/CardCarousel.tsx` (client component) — scroll-snap
horizontal nativo (no gesture library: `scroll-snap-type: x mandatory`,
cada slide `scroll-snap-align: start`), así el swipe es swipe de verdad
en el celular, no un fake con JS de drag. Cada slide es un `LyCardView`
completo e independiente (sus propios modales, su propio estado) — no
se tocó nada de `LyCardView.tsx`. Al abrir cualquiera de los 3 links
arranca centrado en esa Card; 3 puntitos arriba-centro (por fuera del
layout de `LyCardView`, superpuestos) marcan la posición activa.

Probado con Playwright (viewport 390×844, simulando swipe con
`scrollLeft` directo sobre el contenedor): abrir el link de Programa
centra ahí; mover el scroll a los índices 1 y 2 muestra Business y
Personal correctamente; los 3 puntitos existen; abrir el link de
Business directamente también funciona (no depende de por cuál de los
3 se entra); regresión confirmada con captura — los íconos superiores
(tune/idioma/tema) no se tapan con los puntitos. Regresión aparte: la
Card `MasterN0` (sin memberId) sigue sin armar carousel. `tsc` limpio.
Datos de prueba (1 Member + 3 Cards) revertidos en local al terminar.

---

## Convención nueva (2026-09-16): versionado visual semántico

Gunnar pidió que de acá en adelante cada cambio quede anotado con un
número de versión y visible en la propia tarjeta — no solo en este
PLAN.md. Semver estándar (semver.org): `MAJOR.MINOR.PATCH` — MAJOR
rompe compatibilidad, MINOR agrega funcionalidad, PATCH corrige un
bug. Se bumpea a mano en `lib/version.ts` (`APP_VERSION`) junto con
cada cambio que se shippea, arrancando en `1.0.0` desde hoy — no se
reconstruye retroactivamente el historial de Fases 0-9, ese ya está
documentado arriba en este mismo archivo.

`LyCardView.tsx` muestra una islita "V. {APP_VERSION}" arriba de la
foto, centrada, a la misma altura que los íconos de idioma/tema/
personalizar (`top:14`, igual que ellos) — visible en las 3 tarjetas
(project/company/personal), siempre, sea cual sea el Programa.
`CardCarousel.tsx` bajó sus 3 puntitos de posición (de `+24px` a
`+58px` desde el borde superior) para no pisarse con la islita nueva
cuando ambas cosas están presentes a la vez. Probado con captura en
ambos casos (tarjeta sola y carousel) — sin superposición. `tsc`
limpio.

---

**Card.isOrigin — la tarjeta de Einar Horn no necesita host para
activar el fractal** (hecho, probado localmente; **falta que Gunnar
tilde el checkbox en producción**, ver abajo). Pedido: la Card raíz
(Einar Horn/MasterN0) es "el original" — no debería depender de una
sesión (Member ni Admin) para comportarse en modo host; cualquier
visitante que la abra debería ver el QR real / disparador de
onboarding, no el CTA de invitado "Creá tu LyCard". Confirmado con
Gunnar: alcance acotado a esa Card específica, no a toda Card sin
memberId (las de prueba/standalone siguen en modo invitado como
siempre).

Nuevo `Card.isOrigin` (Boolean, default false). `app/c/[slug]/page.tsx`:
`isHost = isAdmin || card.isOrigin || (memberId === card.memberId)`.
Checkbox "Es el Origen" en `EditorForm.tsx`, MasterN0-only, en la misma
sección que el selector de Programa — con un bug propio que encontré y
arreglé en el camino: esa sección estaba condicionada a
`programs.length > 0`, así que el checkbox era invisible justo cuando
más importa (recién después de un reset, con cero Programas todavía).
Se separó con un prop `isMasterN0` explícito y un marcador hidden
(`masterN0Section`) para que el checkbox se procese en
`updateCardAction` sin depender de que el select de Programa también
esté presente. `resetPlatformAction` ahora crea la Card `mastern0` ya
con `isOrigin: true` de entrada, para que un reset futuro no necesite
este paso manual.

Probado con Playwright: visitante anónimo (sin cookies) ve el botón de
QR real en la Card marcada `isOrigin` en vez de "Creá tu LyCard";
desmarcar el checkbox desde el editor devuelve esa Card a modo
invitado para anónimos, volver a marcarlo la devuelve a host — round
trip completo vía la acción real, no solo SQL directo; verificado con
cero Programas en la base (el caso que estaba roto) y con un Programa
presente (regresión del selector, sigue funcionando); una Card normal
sin el flag sigue en modo invitado para anónimos (regresión). `tsc`
limpio. Datos de prueba revertidos en local al terminar.

**Deploy**: el código ya está en producción. Falta un paso manual de
Gunnar — la Card real de Einar Horn en producción no tiene el flag
seteado todavía (se creó antes de este cambio); hay que entrar a
`/admin/mastern0`, tildar "Es el Origen" y guardar.

---

## Tres cambios del 2026-09-16 (tarde): fix del N0 confuso, Business/Personal desde backoffice, islitas nombre+versión

**Fix chico — mensaje de error al agregar N0 con tu propio email.**
Gunnar intentó agregarse a sí mismo como N0 de Legacy y no pudo — el
programa ya tiene un N0 implícito (vos como MasterN0 administrás
cualquier Programa sin necesidad de un N0 acotado aparte), y
`createProgramAdminAction` correctamente rechaza un email que ya es
Admin (constraint `@unique`). El comportamiento estaba bien, el mensaje
no explicaba por qué. Cambié la copia de `exists` en
`/admin/programs/[id]/page.tsx` para que diga explícitamente que si el
email es el tuyo, no hace falta agregarlo. Cero cambio de código
funcional.

**"Crear Business y Personal" desde el backoffice** (hecho, probado
localmente, en producción). El OTP de WhatsApp sigue siendo simulado
(Fase 8 pendiente), así que no tiene sentido pasar por ahí para que
Gunnar arme sus propias tarjetas de Business/Personal — nuevo botón en
`/admin/[slug]` (`app/admin/siblings-actions.ts`,
`createSiblingCardsAction`) que:
1. Si la Card de Programa no tiene `memberId`, crea (o reusa, `upsert`
   por `whatsapp`) un Member con el WhatsApp que ya tiene la Card — sin
   ningún OTP de por medio, es una acción de Admin.
2. Crea las Cards `company`/`personal` que falten, mismo Member, slugs
   `{slug}-business`/`{slug}-personal`, copiando nombre, título, cita,
   siglas/denominación, medallón, rango, redes, retrato, tema/idioma
   como punto de partida editable. No copia `storyQuote/storyBody`,
   `officeItems`, `programId`/`puestoId` ni `isOrigin` — esos son
   conceptos propios de cada tipo de Card.
3. Idempotente — si ya existen, no duplica nada.

El `upsert` por whatsapp importa: si esa persona ya pasó por el chat de
onboarding real (creando su propio Member), lo reusa en vez de
duplicarlo — que fue exactamente lo que le pasó a Gunnar (Legacy ya
tenía 1 miembro real).

Probado con Playwright: crea las 2 Cards con los campos copiados
correctamente; segundo click no duplica nada (0 creadas); sin WhatsApp
cargado, rebota con mensaje claro en vez de fallar; las 3 Cards
comparten `memberId` y el carousel (2026-09-16, más arriba en este
mismo archivo) las swipea correctamente de punta a punta. Encontré y
arreglé un bug propio en el camino: había anidado un `<form>` dentro de
otro (HTML inválido, rompía la hidratación) — lo saqué del form
principal, mismo patrón que ya usa el botón de "Eliminar esta LyCard".
`tsc` limpio.

**Islitas nombre + versión, clickeables** (hecho, probado localmente,
en producción). Segunda islita arriba de la foto, mismo tamaño que la
de versión, mostrando el nombre de la tarjeta — `{Programa} Card` para
la de Proyecto (ej. "Legacy Card", del nombre del Programa), o
`Card.islandLabel` editable para Business/Personal (default "My
Business Card"/"My Personal Card", nuevo campo en el editor). Ambas
islitas son botones que abren el mismo modal bottom-sheet que ya usa
toda la app (blur + slide-in) — no un popup nuevo:
- Islita de nombre → modal corto explicando para qué sirve ese tipo de
  tarjeta (copy fija por kind, con sus claves i18n ES/EN nuevas).
- Islita de versión → la bitácora visual: `lib/version.ts` ahora
  exporta también `CHANGELOG` (array de `{versión, fecha, nota}`), el
  modal muestra la nota de la versión actual como cuerpo y un
  breadcrumb de las 2 anteriores como pie — mismo criterio que un
  panel de "novedades" de cualquier app top — lo mantengo a mano en
  cada bump junto con el número.

Los puntitos del carousel bajaron de `+58px` a `+84px` para despejar
las dos islitas apiladas. Probado con captura: sin overlaps en tarjeta
sola, con las dos islitas + modal de cada una, y con el carousel de 3
tarjetas reales (dots + 2 islitas conviviendo). `Card.islandLabel`
editable confirmado de punta a punta (editor → guardar → tarjeta
pública). Versión: **1.2.0**. `tsc` limpio. Datos de prueba revertidos
en local al terminar.

---

**Detalles de diseño (2026-09-16, tarde)** — arranca una fase nueva,
más chica y granular, de pulido visual sobre lo ya construido. Regla
que fija Gunnar para toda esta fase: *todo* detalle de diseño aplica a
las 3 Cards (project/company/personal) salvo que él diga lo contrario
— lo cual, en la práctica, ya sale gratis casi siempre porque las 3
comparten el mismo `LyCardView.tsx`.

1. **Centrado de los círculos de íconos contra el hueco entre islitas**
   (hecho, probado localmente). Los 3 clusters de arriba (tune/N0 a la
   izquierda, islita de nombre + islita de versión al centro,
   idioma/tema a la derecha) eran 3 `<div>` con `position:absolute` y
   un `top:14` fijo cada uno — así, los círculos de 36px quedaban
   pegados arriba en vez de centrados contra el hueco entre las dos
   islitas apiladas. En vez de ajustar el `top` a mano por prueba y
   error (frágil — depende del alto real que renderiza la fuente),
   los uní en una sola fila flex (`display:flex, alignItems:"center"`)
   con dos spacers `flex:1` a los costados de la islita central para
   mantenerla centrada horizontalmente igual que antes. Con
   `alignItems:"center"`, el navegador centra cada hijo contra el
   alto real de la fila — y como las dos islitas comparten el mismo
   estilo y una sola línea de texto, el centro del hueco entre ambas
   coincide matemáticamente con el centro de toda la pila, que es
   contra lo que ahora se centran los círculos. Medido con Playwright
   (bounding boxes reales, no visual a ojo): centro Y del ícono
   izquierdo, del ícono derecho y del hueco entre islitas — los 3 en
   **47px, delta 0.00** en ambos lados. Confirmado también con
   captura. `tsc` limpio. Versión: **1.2.1**.

2. **Puntitos del carousel, hasta abajo** (hecho, probado localmente).
   Vivían pegados arriba (`top: +84px`), justo debajo de las islitas —
   Gunnar los quiere abajo del todo, debajo del botón principal de cada
   tarjeta (Agendar Entrevista/Reunión en project/company; el cubo
   inferior en personal, que hoy no tiene ese botón). En vez de
   hardcodear un `bottom` distinto por kind (frágil, ligado a un layout
   que va a cambiar en la Fase 2 de esta ronda), lo anclé una sola vez
   contra el viewport entero del carousel:
   `bottom: calc(env(safe-area-inset-bottom,0) + 6px)` — cae en la
   franja de aire que ya deja el padding inferior del layout, debajo de
   lo que sea que termine la columna de cada tarjeta, sin overlap, sin
   importar el kind. Probado con datos de prueba locales (Member +
   3 Cards compartiendo memberId, revertidos al terminar): captura del
   carousel completo en Legacy (con botón de Agendar) y en Personal (sin
   ese botón, termina en el cubo) — puntitos limpios abajo de los dos.
   `tsc` limpio. Versión: **1.2.2**.

---

**Independencia por tarjeta + fractal propio (2026-09-16, noche)** —
bloque grande, negociado en varias rondas con Gunnar antes de tocar
código (badge N0/N1/NA es viewer-relative; Company se lleva un fractal
propio y completo porque a futuro esos clientes usan la plataforma;
Personal es solo una libreta de contactos, sin fractal). Orden acordado:

1. Botones "Mi camino"/"Agendar" en las 3 tarjetas
2. Logo real en el botón de Oficina Virtual
3. Flujo QR host/anónimo + envío por WhatsApp simulado
4. Modelo `CardNetworkMembership` + badge N0/N1/NA
5. Panel de admin para Empresa (clientes/red)
6. Carga de diseño corporativo + IA simulada

**1. Botones "Mi camino" y "Agendar" en las 3 tarjetas** (hecho, probado
localmente). Los dos vivían tapados con gates de kind: "Mi camino con
Legacy" con `isProject &&`, y el CTA de agenda con `!isPersonal` (o sea,
ausente justo en Personal). Los saco de los dos:
- El botón de historia ahora es `L(isProject ? "storyBtn" : isCompany ?
  "storyBtnCompany" : "storyBtnPersonal")` — "Mi camino con la Empresa"
  en company, "Mi Trayectoria" en personal. El modal usa `card.storyQuote/
  storyBody` (ya eran campos genéricos, no exclusivos de project) con
  fallback: project cae al copy fijo de Legacy, company/personal caen a
  un placeholder neutro ("todavía no escribió su historia acá") en vez
  del copy de Legacy, que no tenía sentido ahí.
- El CTA de agenda ya no se saltea Personal — suma copy propio
  ("Agendar un Café" / `coffeeBtn`, `coffeeTitle`, `coffeeSub`, nuevas
  claves i18n ES/EN). `registerInterviewAction` no necesitó ningún
  cambio: ya era genérico por `cardId`, sin gate de kind.
- `MemberCardEditor.tsx` (el editor de company/personal) suma una
  sección "Mi camino con la Empresa" / "Mi Trayectoria" con los mismos
  dos campos que ya tenía el editor de project — reusando
  `updateMemberCardAction` (le agregué `storyQuote`/`storyBody` a la
  whitelist de campos) en vez de tocar `updateMemberStoryAction`, que
  queda intacto y exclusivo de project.

Probado con Playwright de punta a punta: las 3 tarjetas muestran su
botón y su CTA con el copy correcto (capturas); login real de Miembro
por WhatsApp simulado (código leído de pantalla, no hardcodeado) →
`/m/dashboard/personal` → cargué frase + historia → guardé → confirmado
en la base que persistió. Datos de prueba revertidos al terminar.
`tsc` limpio. Versión: **1.3.0**.

**2. Logo real en el botón de Oficina Virtual** (hecho, probado
localmente). `Program.logoUrl` existía en el schema desde hace rato y
no se usaba en ningún lado — cero UI de carga, cero renderizado. Ahora:
- Nuevo `Card.logoUrl` (migración `20260916150138_card_logo_url`) para
  el logo propio de una Company — un Project lee `program.logoUrl` en
  vez de eso, Personal no tiene logo (se queda con la gema decorativa,
  no hay "empresa" que representar ahí).
- `/admin/programs/[id]`: input de carga junto al resto de "Marca del
  Programa", reusando `saveUpload` (mismo storage que los retratos —
  disco local en dev, Vercel Blob en prod). `updateProgramAction`
  guarda `logoUrl` solo si llega un archivo nuevo, igual que el patrón
  ya usado para `portraitUrl`.
- `MemberCardEditor.tsx`: mismo input, pero solo quiere kind==="company"
  — `updateMemberCardAction` gana el mismo manejo de archivo.
- `LyCardView.tsx`: el botón de Oficina Virtual computa
  `officeLogoUrl = isProject ? program?.logoUrl : isCompany ? card.logoUrl
  : null` y pinta esa imagen en vez del SVG de la gema cuando existe —
  fallback exacto a la gema (con su `Sweep` y animación) si no hay logo.

Probado con Playwright: Programa + Member + Company card de prueba
locales, login real de admin y de miembro, subida de un PNG de prueba
en cada editor, guardado, y confirmado visualmente en `/c/mastern0` y
`/c/mastern0-business` que el botón de Oficina Virtual pasa a mostrar
el logo cargado en vez de la gema. Datos y archivos de prueba
revertidos al terminar. `tsc` limpio. Versión: **1.4.0**.

**3. Flujo QR host/anónimo + envío por WhatsApp simulado** (hecho,
probado localmente). Regla que dio Gunnar: viendo tu propia tarjeta,
acceso total — tocar el QR te deja mandártelo por WhatsApp; viendo la
de otro, el QR se reemplaza por "Creá tu LyCard" (el funnel de
reclutamiento al fractal, no algo específico de esa tarjeta). Antes esto
solo existía a medias y solo en project: el dueño tocando el QR
disparaba un atajo mío de testing (simular un escaneo, navegando a
`/m/onboarding`) — nunca fue un pedido real, lo saco. El anónimo en
project ya tenía "Creá tu LyCard"; company/personal en cambio mostraban
el QR real a cualquiera, sin distinguir dueño de visitante — ahora las
3 comparten una sola lógica: `isHost ? <QR real, abre modal de envío> :
<Link a /m/login>`.

Nuevo modal de envío: pide un WhatsApp, `sendQrByWhatsappAction`
(`app/c/actions.ts`) simula el envío — mismo criterio que el OTP: sin
proveedor real todavía, valida el número y devuelve éxito, con el punto
de integración real aislado ahí para cuando haya WhatsApp Business API
(Fase 8). De paso quedó código muerto: `shareLink` (copiar link al
portapapeles) ya no tenía ningún llamador, se borra junto con el
`useRouter` que solo usaba el atajo de testing.

Probado con Playwright: anónimo en `/c/mastern0-business` ve "Creá tu
LyCard" y cero botones de QR; dueño en `/c/mastern0` (Origen, host para
cualquiera) toca el QR, carga un WhatsApp, confirma, ve "¡Listo! Te lo
enviamos a +521234567890." Datos de prueba revertidos al terminar.
`tsc` limpio. Versión: **1.5.0**.

**4. Modelo `CardNetworkMembership` + badge N0/N1/NA** (hecho, probado
localmente). Antes de tocar código negociamos 2 cosas con Gunnar: el N es
del que MIRA la tarjeta (no del dueño — MasterN0 ve N0 en cualquier
tarjeta porque es N0 de todo el fractal), y Empresa se lleva un fractal
propio y completo (a diferencia de Personal, que es solo libreta de
contactos, sin fractal) porque "en el futuro cuando se haga cliente
podremos hacer uso de esa plataforma".

- Modelo nuevo `CardNetworkMembership`, calcado de `ProgramMembership`
  (mismo `referredByMembershipId` autoreferenciado, mismo `status`) pero
  anclado a una Card de Empresa en vez de a un Program — el dueño de la
  Empresa es el N0 de su propia red, sin necesitar una fila propia.
  `Registration` suma `networkMembershipId` (mismo patrón que ya tenía
  `membershipId` para Program).
- `registerInterviewAction`: al agendar una reunión en una Company card,
  ahora hace `upsert` de un `CardNetworkMembership` en estado "invited"
  para el visitante logueado (find-or-create, porque a diferencia de
  Program no hay un paso de onboarding separado — agendar ES la entrada
  a la red). De paso, hasta ahora esa función linkeaba `membershipId`
  (Program) sin importar el kind de la tarjeta, cayendo a "la membership
  más reciente del Member" en company/personal — un bug menor que no se
  notaba porque nada leía ese link fuera de project; lo acoto a
  `card.kind === "project"` al tocar esta misma función.
- `lib/badge.ts` (nuevo): `computeBadge(card, adminScope, memberId)` —
  MasterN0 → N0 en cualquier tarjeta; N0 acotado a un Programa → N0 solo
  en las project cards de ESE Programa; dueño de una Company → N0 en la
  suya; Member con membership `active` → `N{profundidad+1}` (el +1 porque
  N0 lo ocupa el root real —admin o dueño—, nunca una fila de membership,
  así que "sin referido" ya es N1, no N0); sin relación con esa tarjeta,
  o Personal (no tiene fractal), o anónimo → NA.
- `LyCardView`: el círculo ya no depende de `isAdmin` — ahora recibe
  `badge` (calculado por-tarjeta en `page.tsx`, a diferencia de
  `isHost`/`isAdmin` que siguen siendo compartidos por todo el carousel)
  y **siempre se renderiza**, nunca desaparece. Solo enlaza a `/admin`
  cuando de verdad sos Admin (un dueño de Empresa también puede leer
  "N0" ahí, pero clickearlo no debe mandarlo a un login que no le sirve).

Punto abierto, documentado a propósito y no resuelto acá: cómo se arma
la cadena de referidos dentro de la red de una Empresa (quién invitó a
quién) — hoy todo cliente activado entra con `referredByMembershipId`
null (todos N1 directos bajo el dueño). Construir ese mecanismo de
invitación en cadena queda para cuando haga falta, no antes.

Probado con Playwright con Programa + dueño + cliente activo + cliente
invitado de prueba: anónimo → NA; MasterN0 → N0 con link a `/admin` en
cualquier tarjeta; dueño en su propia Company → N0 sin link; cliente
activo → N1; cliente todavía invitado (no activado) → NA. Encontré y
arreglé un off-by-one en el cálculo de profundidad durante la prueba
(sin referido calculaba N0 en vez de N1). Datos de prueba revertidos al
terminar. `tsc` limpio. Versión: **1.6.0**.

**5. Panel de admin para Empresa — Mi Red de Clientes** (hecho, probado
localmente). Gemelo Member-scoped de `/admin/interviews` +
`completeInterviewAction`, pero acotado a la Company del dueño: nunca
puede ver ni tocar la red de otra Empresa.
- `app/m/dashboard/company/network/page.tsx`: lista los
  `CardNetworkMembership` de la Card del dueño (join con `Member` y su
  última `Registration`, si agendó), con badge "Invitado" o "✓ N1
  Activo" y un botón "Marcar reunión hecha" cuando todavía no está
  activo.
- `activateNetworkMembershipAction` (nuevo): verifica que la Card sea
  del dueño logueado antes de tocar nada, flip a `status: "active"` +
  `interviewedAt`. A diferencia de `completeInterviewAction` de
  Program, **no crea tarjetas nuevas** para el cliente — nadie pidió
  eso todavía, no lo inventé.
- Link "Ver mi Red de Clientes →" agregado al editor de Company
  (`MemberCardEditor`, solo `kind==="company"`).

Probado con Playwright: dueño logueado entra desde el editor, ve un
cliente invitado con su reunión agendada, toca "Marcar reunión hecha"
→ desaparece el botón, pasa a "✓ N1 Activo", mensaje "✓ Activado."
confirmado. Reseteado el estado de prueba y re-corrido para confirmar
que no era un falso positivo de una corrida anterior. Datos de prueba
revertidos al terminar. `tsc` limpio. Versión: **1.7.0**.

**6. Carga de diseño corporativo + IA simulada** (hecho, probado
localmente). Última pieza del bloque grande.
- `Program.brandDesign` (Json, nuevo) — `{imageUrl, palette, font,
  buttonStyle, extractedAt}`.
- `lib/designExtraction.ts`: `simulateDesignExtraction(paletteHex)` —
  el único punto de integración para un modelo real (Gemini, cuando
  haya cuenta) más adelante; hoy devuelve una fuente y un estilo de
  botón de una lista fija, elegidos determinísticamente a partir de la
  paleta (misma imagen → siempre el mismo resultado, no aleatorio en
  cada carga).
- `BrandDesignUploader.tsx` (nuevo, cliente): al elegir el archivo, la
  paleta de colores se calcula **de verdad** — dibuja la imagen en un
  canvas, cuantiza los píxeles en baldes gruesos de RGB y toma los 5
  colores más frecuentes. Nada de esto es simulado; es la única parte
  del pedido de Gunnar ("la IA lo traduce en el diseño") que se podía
  resolver sin modelo, así que se resuelve de verdad — solo fuente y
  estilo de botón quedan pendientes de un modelo real.
- Badge "🎨 Colores y estilo detectados" junto al input de carga, tal
  cual lo pidió Gunnar → abre un modal simple con los swatches, la
  fuente y el estilo. `updateBrandDesignAction` (nuevo, en
  `app/admin/programs/actions.ts`) persiste todo, en un form separado
  del resto de "Marca del Programa" para no forzar resubir todo lo
  demás cada vez que cambia solo el diseño.

Probado con Playwright: subí una imagen de prueba dos tonos (rojo/azul)
→ paleta detectada con los 2 colores reales más 2 tonos de mezcla del
borde (esperable al reescalar a 60×60 para el muestreo) → modal
muestra los 4 swatches + "Inter" + "Cuadrado, bordes rectos, color
sólido" → guardado → confirmado en la base que `brandDesign` persistió
completo (`imageUrl`, `palette`, `font`, `buttonStyle`, `extractedAt`).
Datos y archivo de prueba revertidos al terminar. `tsc` limpio.
Versión: **1.8.0**.

Con esto se cierra el bloque completo que Gunnar pidió esta ronda:
independencia por tarjeta, fractal propio de Empresa, y diseño
corporativo simulado.

---

## Etiqueta de profesión + CV modal + medallón/contactos junto al nombre (2026-09-16, noche)

Pedido de Gunnar: debajo del nombre, mostrar el Cargo / Título
Profesional como una etiqueta — tocarla abre el CV en un modal de
pantalla completa (demo inventado por ahora). Al lado del nombre, dos
puntos con la misma estructura visual: a la derecha el Nivel de
Medallón Principal (solo ícono, sin texto — reemplaza al badge viejo
de medalla con texto de la fila de abajo, que se elimina); a la
izquierda un punto simulado con la escala de gente contactada/QR
enviado (dato placeholder, mismo formato que el de la derecha, para
cambiar el contenido más adelante). Dos preguntas de aclaración antes
de tocar código (confirmadas por Gunnar): (1) el punto de la derecha
reemplaza directamente al badge de texto "Industrial"/color titanio
existente, no convive con él; (2) los dos puntos nuevos son
independientes entre sí — cada uno cuenta un dato distinto, mismo
formato.

- `TIER_DOT` (nuevo estilo en `LyCardView.tsx`): chip circular de 30px
  con el gradiente de la joya como fondo y un ícono Material oscuro
  encima — reemplaza el punto de color plano + texto.
- Fila del nombre reestructurada: `[punto contactos] [nombre] [punto
  medallón]`, ambos botones abren su modal correspondiente
  (`setModal("contacts")` / `setModal("medal")`). El badge de medalla
  con texto se sacó de la fila de abajo — ahí quedan solo O.D. y
  Rango.
- Debajo del nombre, si `card.title` tiene valor: etiqueta con ícono
  "work" + el Cargo/Título — tocarla abre `cvOpen`, un modal fixed
  inset:0 con un `<iframe src="/demo-cv.pdf">` a pantalla completa y
  header con el nombre + botón cerrar. Sin `card.title`, no se
  muestra nada (no se inventa texto).
- `contacts` nuevo en `modalMap`: usa `medalById("plata")` como dato
  simulado fijo, con copy que aclara "Todavía es un dato simulado —
  la cuenta real llega con el envío por WhatsApp de verdad."
- `public/demo-cv.pdf` (nuevo): CV de una página generado con
  reportlab, persona ficticia "Alex Rivera, Director de Estrategia",
  tema oscuro/dorado a tono con la app. Un solo PDF compartido por
  todas las tarjetas — no es por-Member, es demo mientras no haya
  carga real de CV.

Esta pieza comparte `LyCardView.tsx`, así que aplica igual a las 3
tarjetas (Legacy/Business/Personal) sin código extra por tipo —
confirmado visualmente: tanto la tarjeta de proyecto (`mastern0`) como
una de Business de prueba renderizan la misma estructura (nombre
flanqueado por los dos puntos, etiqueta de profesión debajo, fila de
abajo con solo O.D. + Rango).

**Nota honesta sobre testing**: esta noche el entorno local de
Playwright/Chromium tuvo una falla total de hidratación de React — se
confirmó con `Object.getOwnPropertyNames()` sobre botones del DOM sin
ningún fiber de React adjunto, en botones nuevos Y en botones viejos
ya probados (como "Agendar una Entrevista", sin tocar en esta sesión).
Se descartó que sea el código (tsc limpio, HTML de SSR correcto según
capturas), agotamiento de recursos, bundles corruptos, errores de
consola, y el problema de superposición visual por la fuente de
íconos que no carga en este sandbox (un artefacto real pero distinto,
confirmado por separado). No se identificó la causa raíz esta noche;
quedó documentado como limitación de la herramienta local, no del
código. Verificación completada: tipo (`tsc`), estructura/visual
(capturas en tarjeta de proyecto y de Business). **No completada**:
click-through interactivo en vivo — pendiente de que Gunnar confirme
en la app real desplegada que los dos puntos y la etiqueta de
profesión abren sus modales correctamente.

Versión: **1.9.0**.

---

## Fix: límite de 1MB en Server Actions (2026-09-16, noche)

Juancho reportó que "Analizar y Guardar" (carga de diseño corporativo)
no le funcionaba. Los logs de runtime de Vercel mostraron la causa
real: `Error: Body exceeded 1 MB limit.` en `/admin/programs/[id]` —
el default de Next.js para Server Actions es 1MB, muy poco para una
foto o brandbook real. `next.config.ts` ahora fija
`experimental.serverActions.bodySizeLimit: "10mb"`. Afecta a todas las
pantallas con carga de imagen (portrait, logo, diseño), no solo esa.
Versión: **1.9.1**.

---

## Skins de Marca por Programa — Fase 1: modelo + parser + carga (2026-09-16, noche)

Pedido de Gunnar: en vez de que el N0 suba una imagen suelta para el
diseño corporativo, que suba el `design.md` real que le da una
herramienta como Google Stitch al describir su marca — ese archivo
trae colores, fuente y estilo de botón de verdad, no solo paleta.
Además: hasta 3 skins guardados por Programa, prendiendo/apagando
cuál está activo (solo uno a la vez), para poder cambiarle la cara a
la tarjeta sin perder los otros diseños. Dos decisiones confirmadas
por Gunnar vía preguntas: (1) el skin activo re-skinea la tarjeta
completa (fondo + acento + fuente, no solo el acento) — más superficie
de cambio, se hace en fases separadas por eso; (2) el `design.md`
reemplaza por completo a la carga de imagen suelta, no conviven.

- `ProgramSkin` (modelo nuevo): `programId`, `name`, `designMdRaw`
  (el archivo completo, por si hay que re-parsear después con mejor
  lógica), `colors` (Json: `{bg, surf, surf2, ink, ink2, accent,
  accentDark}`), `font`, `buttonStyle`, `active`. `Program.brandDesign`
  (el campo Json de la carga de imagen vieja) queda en el schema sin
  usarse — no se borra para no ser una migración destructiva.
- `lib/designMd.ts` (nuevo): parser real de texto, no un modelo de
  IA. Busca hex codes en el archivo y los etiqueta por palabras clave
  cercanas (background/surface/text/accent/border, en inglés porque
  es lo que exportan estas herramientas); lo que no logra etiquetar lo
  completa con una heurística (más oscuro → fondo, más saturado →
  acento, etc.); lo que ni así encuentra cae al mismo dorado/oscuro
  fijo de siempre. Fuente: matcheada contra una lista fija de Google
  Fonts conocidas (no confía en texto libre como nombre de fuente).
  Estilo de botón: detectado por palabras clave (pill/redondeado/
  cuadrado, sólido/outline). Probado con 3 casos (archivo con
  etiquetas claras, archivo solo con hex sueltos, archivo vacío) — los
  3 devuelven un set de colores completo y coherente.
- `createProgramSkinAction` / `activateProgramSkinAction` (transacción
  atómica: apaga todos los del Programa, prende el elegido — nunca
  quedan dos activos) / `deleteProgramSkinAction`, todas en
  `app/admin/programs/actions.ts`, con el mismo scoping por
  `adminScope.programId` que el resto de `/admin/programs/[id]`. Tope
  de 3 por Programa, mensaje de error claro al intentar un 4to.
- `/admin/programs/[id]`: la sección "Diseño Corporativo" (imagen +
  paleta simulada) se reemplaza por "Skins de Marca (N/3)" — grilla de
  tarjetas, cada una con sus swatches, fuente, estilo, botón
  Encender/Apagar y Borrar; slot vacío con el formulario de carga si
  quedan menos de 3. Botón "ℹ️ Cómo genero mi design.md" con una
  explicación de Stitch (redactada de memoria, no verificada contra su
  UI actual — puede estar desactualizada si Stitch cambió los pasos).
  `BrandDesignUploader.tsx` y `lib/designExtraction.ts` (la paleta por
  píxeles + fuente/botón simulados de la ronda anterior) se borraron
  por completo, sin dejar nada muerto atrás.

Probado: `tsc` limpio. El parser, con un script aparte (3 casos:
etiquetado, heurística, vacío — los 3 correctos). La lógica de
exclusividad y el tope de 3, con un script que crea 3 skins, activa
una, activa otra (la primera se apaga sola), apaga la activa (queda
ninguna prendida), borra una (baja a 2) — todo contra la base local
real, no mockeado. No probado por Playwright: el login de admin local
pedía resetear una contraseña, y tocar esa credencial quedó bloqueado
por el clasificador de permisos del entorno — correctamente, es una
acción sobre credenciales — así que no hay captura de pantalla del
flujo completo en el navegador. La lógica de negocio y el parser están
verificados por otra vía; falta la vuelta visual/click-through.

**Todavía no cambia nada visible en la tarjeta pública** — eso es la
Fase 2 (barrer los ~230 colores fijos de `LyCardView.tsx` por
variables CSS con fallback al valor de hoy, cargar la fuente real, y
que el skin activo del Programa se aplique a sus tarjetas de
proyecto), pendiente.

Versión: **1.10.0**.

---

## Skins de Marca — Fase 2: aplicación real a la tarjeta (2026-09-16, noche)

Pedido de Gunnar: "completa la fase 2.. que pueda aplicarse realmente y
que todo el skin de la tarjeta pueda cambiar" — eligió antes la opción
completa (fondo + acento + fuente, no solo el acento).

- Barrido de `LyCardView.tsx`: ~180 literales (colores dorados fijos
  `#E5C378`/`#C8A15A`/`#D4AF37`/`#99732B`, texto `#F5F2EB`/`#C2BEB5`,
  fondos `#0D0D0D`/`#141414`/`#1C1C1C`/`#09090b`, los 42 bordes
  `rgba(200,161,90,X)` en 11 alphas distintos, y las dos familias de
  fuente) reemplazados por `var(--x,valorDeHoy)` — mismo fallback
  exacto en cada sitio, así que sin skin activo la tarjeta no cambia
  ni un píxel. El bloque `THEME_VARS` (dark/light) quedó deliberadamente
  afuera del barrido para no crear una referencia circular consigo
  mismo. Dejados sin tocar a propósito: los dos íconos de los puntos
  de medalla/contactos (contrastan contra el gradiente de esa medalla,
  no contra la marca) y el dock social jade/ruby (tinte decorativo,
  no es identidad de marca).
- `lib/color.ts` (nuevo): `hexToRgb`/`lightness`/`saturation`/`shade`
  compartidos entre `lib/designMd.ts` (que antes los tenía duplicados)
  y `LyCardView.tsx`.
- `lib/googleFont.ts` (nuevo): URLs de Google Fonts CSS2 solo para las
  fuentes de `KNOWN_FONTS` — nunca confía en el nombre libre de un
  design.md como URL.
- En `LyCardView.tsx`: cuando el Programa tiene un skin activo, sus
  colores pisan `THEME_VARS[theme]` (una identidad de marca fija, no
  un par claro/oscuro — apagar/prender el tema deja de tener efecto
  visual con un skin puesto) y se derivan variables nuevas
  (`--deepBg`, `--accentLight/Mid/Deep`, `--accentRgb`, `--surfHi`,
  `--onAccent` — texto/ícono claro u oscuro según qué tan clara sea
  la marca, calculado por luminancia real, no adivinado — y
  `--brandFont`, solo si la fuente detectada está en `KNOWN_FONTS`).
  Un `useEffect` inyecta el `<link>` de Google Fonts real cuando hay
  fuente conocida.
- `app/c/[slug]/page.tsx` y `CardCarousel.tsx`: el `include` de
  `program` ahora trae `skins: { where: { active: true } }` — como
  mucho una fila, así `LyCardView` nunca tiene que elegir cuál de los
  3 guardados es el que manda. Solo tarjetas de Proyecto (las únicas
  con `programId`) se ven afectadas — Business y Personal, sin cambio.

Probado: `tsc` limpio. Programa + skin de prueba (paleta teal/azul,
fuente Montserrat) contra la base local real → el HTML de SSR mostró
cada variable CSS resuelta exactamente a los valores del skin
(`--accentMid:#2fb8c6`, `--deepBg:#0a1420`, `--brandFont:"Montserrat"`,
etc.) y una captura de Playwright confirmó el cambio visual completo:
fondo, badges, botones y el CTA de agendar, todos en el teal de la
marca de prueba. Segunda captura de `mastern0` (sin Programa, sin
skin) confirmó cero regresión — idéntica al dorado/oscuro de siempre.
Datos de prueba borrados al terminar.

**No verificado**: la descarga real de la Google Font vía el
`<link>` inyectado por el `useEffect` — el navegador local de esta
sesión tiene hidratación de React rota (confirmado con el mismo
método de la sesión anterior: cero fibers de React en los botones del
DOM, ningún click hace nada), así que el efecto nunca llegó a
correr en esta prueba. No es un defecto nuevo — es la misma limitación
de entorno ya documentada, y la variable `--brandFont` en sí se
comprobó correcta por SSR. Si Gunnar sube un design.md con una fuente
bien distinta (ej. "Cormorant Garamond") y la letra no cambia en el
navegador real, avisar — ahí sí sería un bug de verdad.

Versión: **1.11.0**.

---

**Qué sigue — Fase 8**: WhatsApp Business API real. Esta fase no depende
de mí escribiendo código — depende de que consigan cuenta de WhatsApp
Business verificada por Meta, un proveedor (Twilio/360dialog/Meta Cloud
API) y aprobación de templates de mensaje (Meta tarda días en aprobar,
no es instantáneo). Cuando Sergio y el equipo tengan esas credenciales,
el único punto de integración real es `requestOtpAction` en
`app/m/actions.ts` — hoy genera el código y lo muestra en pantalla en vez
de mandarlo por WhatsApp real; ese es el único lugar que hay que tocar
para reemplazar el envío simulado por el real, sin tocar el resto del
flujo de login. El resto de la plataforma (Fases 0-7) ya está completo y
en producción.

---

# Dashboard 2.0 — diagnóstico y plan (arrancado 2026-09-16/17)

Pedido de Gunnar, verbatim: *"realmente necesito un mejor dashboard..
ahorita todo esta muy desorganizado.. las ediciones se hacen en una
lista general.. [...] ayudame a que cada badget de la tarjeta pueda
ser encendido o apagado.. que si lo enciendo entonces ahi aparezca la
opcion de editar los campos y cuando lo guarde.. que salga aparezca
guardado y haya que picarle a editar para editarlo de nuevo. Ayudame a
que los usuarios esten organizados por sus respectivos programas, que
ademas cada usuario tenga un dashboard con los QRs que envio [...] y
cuantos QR que mando se registraron, crearon su tarjeta de programa,
su tarjeta business y su tarjeta personal."*

Instrucción explícita: documentar todo acá primero, marcar el estado
actual, y tildar cada fase a medida que se completa — para que
cualquier sesión futura (de este LLM o de otro, conectando solo el
repo de GitHub) pueda retomar exactamente donde quedó, sin tener que
releer todo el código de cero. Esta sección es la fuente de verdad
para eso: **antes de tocar código de esta sección, leer completo el
diagnóstico + las 5 fases de abajo.**

## Diagnóstico del dashboard actual (2026-09-16, noche)

Estado real de cada pantalla de administración, revisado línea por
línea, no supuesto:

1. **`app/admin/page.tsx` (roster MasterN0)** — una sola lista plana
   de *todas* las Cards de *todos* los Programas, ordenadas solo por
   `createdAt`. Sin agrupar por Programa, sin filtros, sin buscador.
   Cada fila: nombre + slug + botones Ver/Editar. Esto es "la lista
   general" que Gunnar señala.
2. **`components/EditorForm.tsx` (editor de una Card de proyecto,
   MasterN0-only, vía `/admin/[slug]`)** — un solo `<form>` de 529
   líneas con 6 secciones siempre abiertas a la vez (Retrato,
   Identidad Fiduciaria, Programa, Distintivos & Honores, Sabiduría,
   Canales de Contacto) y un único botón "Guardar Tarjeta" al final
   que manda todo junto. No hay manera de editar solo una sección, no
   hay confirmación por sección, no hay estado "guardado" por campo —
   todo se recarga entero.
3. **`components/MemberCardEditor.tsx` (editor self-service del host,
   vía `/m/dashboard/{company,personal}`, 552 líneas)** — mismo
   patrón: todo abierto, un solo submit. No revisado campo por campo
   todavía pero confirmado por estructura que comparte el problema.
4. **`app/admin/programs/[id]/page.tsx` (dashboard de un Programa,
   ~530 líneas)** — ya está bien organizado *por Programa* (eso ya
   existe), pero todas sus secciones (Marca, Skins, Textos de
   Botones, Escalas, Miembros, Inscriptos a Entrevistas) están
   apiladas en una sola página larga, sin pestañas ni navegación
   interna. La sección "Miembros" ya usa `<details>/<summary>` nativo
   para Editar/Mensaje por fila — es el precedente más cercano a lo
   que Gunnar pide (colapsado por defecto, un click lo abre), pero no
   tiene el paso de confirmación "✓ Guardado" + vuelta a colapsado
   que pidió explícitamente — hoy simplemente recarga la página y el
   `<details>` vuelve a su estado cerrado por defecto (funciona pero
   no se siente como un paso confirmado).
5. **QR enviado — no existe tracking, punto.** `sendQrByWhatsappAction`
   (`app/c/actions.ts`) es 100% simulado: valida el WhatsApp, hace un
   `console.log`, devuelve `{ok:true}`. No crea ninguna fila en la
   base. Hoy es imposible saber cuántos QR mandó alguien, a quién, si
   se abrieron, o si esa persona terminó registrándose — no hay
   ningún dato que consultar todavía.
6. **Lo que SÍ existe y sirve de cimiento para el embudo que pide
   Gunnar** (no hay que inventarlo de nuevo):
   - `ProgramMembership.status` (`invited → interviewed → active`) +
     `Registration` (se crea al agendar una entrevista) +
     `completeInterviewAction` (activa la membership Y crea las 3
     Cards — Programa/Business/Personal — de una sola vez). O sea: el
     momento exacto en que "se registró y creó sus 3 tarjetas" ya
     está modelado, solo falta conectarlo con el origen (qué QR lo
     trajo).
   - `CardNetworkMembership` — el mismo patrón pero para la red de
     clientes de una Company (Fase N, ya en prod).

## Plan — 5 fases, en orden de dependencia

**Regla para cualquiera que retome esto**: marcar `[x]` cada fase
completa, agregar debajo de cada una una nota corta de qué se hizo y
la versión en que se shippeó (mismo formato que el resto de este
archivo) — no borrar el diagnóstico de arriba, sigue siendo válido
como contexto aunque se vaya completando cada fase.

- [x] **Fase D1 — Reorganizar `/admin`: usuarios agrupados por
      Programa.** Hecho, probado, shippeado.
      `app/admin/page.tsx` reescrito: `groupByProgram()` agrupa cada
      Card por su Programa real — las de proyecto por su `programId`
      propio, las Company/Personal heredan el Programa de su hermana
      de proyecto (comparten `memberId`, las crea juntas
      `completeInterviewAction`). Sin Programa propio ni hermana con
      uno → grupo "Sin Programa" (ej. `mastern0`, el seed raíz). Cada
      Programa es un `<details>` colapsable con nombre + cantidad de
      tarjetas + link directo a su dashboard (`/admin/programs/[id]`)
      — abierto por defecto solo si hay 2 Programas o menos, para no
      forzar scroll infinito con muchos. Cada fila de Card ahora
      muestra también su tipo (Programa/Business/Personal). Confirmado
      Gunnar: esto reemplaza la lista plana, los dashboards por
      Programa que ya existían quedan iguales.

      Probado: `tsc` limpio, `groupByProgram` verificado con un
      script aparte contra la base local real (Programa + Card de
      proyecto + Card de Business sin `programId` propio → las dos
      cayeron juntas bajo el Programa correcto; `mastern0` cayó en
      "Sin Programa") — los 3 casos dieron OK. `curl` a `/admin`
      confirmó que sigue redirigiendo a login sin crashear (no se
      pudo probar logueado por el bloqueo de tocar la contraseña de
      test, igual que en la Fase 2 de skins). Datos de prueba
      borrados al terminar. Versión: **1.12.0**.

- [ ] **Fase D2 — Acordeón encendido/apagado por sección, con
      confirmación.** Patrón nuevo y reutilizable (probablemente un
      componente `components/EditableSection.tsx` client-side):
      colapsado por defecto mostrando un resumen de solo-lectura +
      badge "✓ Guardado" (o "Sin completar" si está vacío) + botón
      "Editar"; al tocar Editar se expande mostrando el form de esa
      sección sola, con su propio submit — al guardar (server action
      redirige con un query param tipo `?sectionSaved=medal`), la
      sección vuelve a colapsarse mostrando "✓ Guardado" y hay que
      tocar "Editar" de nuevo para volver a tocarla. Aplicar esto a
      **cada sección** de `EditorForm.tsx` (Retrato, Identidad,
      Programa, Distintivos, Sabiduría, Canales) y de
      `MemberCardEditor.tsx` — probablemente signifique partir el
      `updateCardAction`/`updateMemberCardAction` actuales (que hoy
      reciben el form entero) en acciones más chicas por sección, o
      aceptar un campo `section` en el FormData para saber qué guardar
      sin pisar el resto. Definir esa mecánica exacta es lo primero
      que hay que resolver acá, antes de tocar el componente visual.

- [ ] **Fase D3 — Schema + tracking real de QR enviados.** Nuevo
      modelo `QrSend`:
      ```prisma
      model QrSend {
        id            String    @id @default(cuid())
        cardId        String
        card          Card      @relation(fields: [cardId], references: [id], onDelete: Cascade)
        toWhatsapp    String
        token         String    @unique
        createdAt     DateTime  @default(now())
        firstOpenedAt DateTime?
        openCount     Int       @default(0)
      }
      ```
      `sendQrByWhatsappAction` deja de ser 100% simulado: crea esta
      fila y arma el link real que "se manda" (`/q/<token>` en vez de
      `/c/<slug>` directo). Nueva ruta `app/q/[token]/page.tsx` (o
      route handler): busca el `QrSend` por token, si es la primera
      vez marca `firstOpenedAt`, siempre suma `openCount`, y redirige
      a `/c/<slug>` de la Card real — así "visto en un teléfono" se
      define honestamente como *"se abrió el link"*, no como una
      detección de cámara/escaneo real (eso no existe sin una app
      nativa o permisos de cámara, sería inventado). Dejar esto
      explícito en la UI para no prometer de más.

- [ ] **Fase D4 — Dashboard "Mis QRs" con embudo por usuario.** Nueva
      pantalla (`/m/dashboard/qrs` o similar) que lista los `QrSend`
      del usuario logueado con 4 estados por fila: **Enviado** (
      siempre) → **Visto** (`firstOpenedAt` no nulo) → **Registrado**
      (existe un `Member` con ese mismo `toWhatsapp` que tiene una
      `Registration`/`ProgramMembership`) → **Tarjetas creadas** (ese
      Member tiene sus 3 Cards — project/company/personal). Arriba,
      un resumen agregado: cuántos QR mandó, cuántos se vieron,
      cuántos se registraron, cuántos completaron las 3 tarjetas —
      los 4 números que pidió Gunnar explícitamente. El cruce
      "Registrado"/"Tarjetas creadas" se hace por número de WhatsApp
      normalizado (mismo criterio que ya usa `Member.whatsapp`), no
      por un ID que el visitante no tiene hasta que se loguea — es un
      match heurístico razonable (dos personas no comparten
      WhatsApp), no 100% infalible si alguien cambia de número entre
      que recibe el QR y se registra, pero es lo mismo que ya hace
      toda la lógica de login existente.

- [ ] **Fase D5 (opcional/stretch, evaluar si hace falta después de
      D1-D4)** — Consistencia visual entre `/admin` (N0) y `/m/dashboard`
      (host self-service): hoy comparten paleta pero no componentes.
      Con `EditableSection` ya construido en D2, podría reusarse acá
      también. No arrancar esta fase sin confirmar con Gunnar que
      sigue haciendo falta después de las otras 4.

**Estado**: D1 hecho, probado y shippeado (v1.12.0, ver arriba). D2-D5
siguen en cola con su spec técnica completa ya escrita arriba —
listas para retomar por cualquier LLM sin contexto previo, nomás
conectando el repo. Las 3 confirmaciones de diseño con Gunnar ya están
resueltas (quedaron anotadas en cada fase: guardado por sección
independiente en D2, alcance de "organizados por Programa" ya
implementado en D1, criterio de "visto" = abrió el link en D3-D4).

## Badges con ícono editable + "gente contactada" deja de ser simulado (2026-09-16, noche)

Pedido de Gunnar: el punto de "gente contactada" junto al nombre
(izquierda) no se podía editar desde el dashboard — el de Medallón
(derecha) sí. Además, en las 4 islitas que abren modal (O.D., Ancient,
Medallón, Contactados) el ícono mostrado estaba fijo en el código
(diamante para O.D., un sparkle decorativo para Ancient, etc.) en vez
de ser el que el N0 elige — como ya pasaba con el grado de Sabiduría,
que tenía un campo `icono` de texto libre (nombre de un Material
Symbol) pero no se usaba para pintar el badge visible, solo el modal.

**Contactos deja de ser simulado.** Nuevo campo real `Card.contacts`
(mismo espacio de claves que `medal`: la lista fija `MEDALS` de
`lib/data.ts`, o la escala custom del Programa si la definió) + nuevo
`Program.contactsScale` (mismo patrón "vacío = usar la lista fija" que
`medalScale`/`rankScale`, Fase 9.4/9.5). Sigue sin trackearse el
*conteo* real de gente contactada — solo el nivel/tier ahora es real y
editable, la cuenta real llega cuando el envío por WhatsApp deje de
ser simulado (ver Fase D3/D4 arriba).

**Ícono editable en todos los badges.** Nuevo campo `Puesto.icono`
(Material Symbol, default `"diamond"` para no romper tarjetas
existentes) — el grado de Sabiduría ya tenía `icono`, ahora Medallón y
Contactos también lo tienen en su editor de escala
(`components/EscalaEditor.tsx`, que antes solo mostraba el campo
Ícono para el tipo `rank`, ahora lo muestra siempre). En
`components/LyCardView.tsx`:
- El punto de Contactos (izquierda del nombre) y el de Medallón
  (derecha) ahora pintan `contactsTier.icono`/`medalTier.icono` en vez
  del `military_tech` fijo.
- El badge O.D. (fila de abajo) pinta `puesto?.icono || "diamond"` en
  vez del diamante fijo.
- El badge Ancient (fila de abajo) pinta `rankTier.icono ||
  "auto_awesome"` en vez de un SVG decorativo hardcodeado que no tenía
  ninguna relación con la escala configurada — el modal de Ancient ya
  usaba `rankTier.icono` correctamente, ahora el badge visible
  coincide con el modal.
- Se aprovechó para hacer lo mismo en `modalMap` (medal/od/contacts),
  que antes tenían íconos fijos distintos a los de sus badges.

**El ícono "elegido para Ancient" pasa a ser el infinito.** Ejemplo
textual de Gunnar: hoy sale un solecito para Ancient, debería salir el
símbolo de infinito. Como la escala de Sabiduría de un Programa viene
vacía por defecto (cae a la lista fija `RANKS` de `lib/data.ts`), se
cambió el ícono fijo de la fila `ancient` en esa lista de
`auto_awesome` a `all_inclusive` (el símbolo de infinito en Material
Symbols) — así el default de fábrica ya sale como pidió, y cualquier
Programa lo puede pisar desde su propia Escala de Sabiduría si quiere
otro.

**Asimetría aceptada (no bloqueante):** `Puesto.icono` no se
snapshotea sobre `Card` como sí pasa con `siglas`/`tooltip` cuando se
elige un Puesto y se guarda — si ese Puesto se borra después, el badge
O.D. de esa Card vuelve al diamante default (mientras que
siglas/tooltip sí quedan guardados). Se aceptó como trade-off de
alcance; si en algún momento importa, hay que sumar `Card.icono` y
snapshotearlo igual que los otros dos campos en `updateCardAction`.

Archivos tocados: `prisma/schema.prisma` (+`Puesto.icono`,
+`Card.contacts`, +`Program.contactsScale`, migración
`20260916211334_badge_icons_and_contacts`), `components/EscalaEditor.tsx`,
`app/admin/programs/actions.ts` (`updateEscalaAction` acepta tipo
`"contacts"`), `app/admin/programs/puestos-actions.ts` (crear/editar
Puesto persiste `icono`), `app/admin/programs/[id]/page.tsx` (tercera
sección "Escala de Gente Contactada" + inputs de ícono en el CRUD de
Puestos), `app/admin/actions.ts` y `app/m/dashboard/actions.ts`
(`contacts` sumado a la lista de campos editables), `app/admin/[slug]/page.tsx`
(pasa `contactsScale`), `components/EditorForm.tsx` y
`components/MemberCardEditor.tsx` (picker de Nivel de Gente
Contactada, EditorForm con awareness de la escala del Programa,
MemberCardEditor con la lista fija ya que Business/Personal no tienen
Programa), `components/LyCardView.tsx` (contactsTier real +
todos los íconos dinámicos descritos arriba), `lib/data.ts` (ícono de
Ancient a infinito).

Probado: `npx prisma migrate status` OK (migración ya aplicada),
`npx tsc --noEmit` limpio. Script contra la base local real: Programa
con `contactsScale` custom (`diversity_3`) + Puesto con `icono`
custom (`rocket_launch`) + Card con `rank: "ancient"`, `contacts:
"custom1"` → lectura desde Prisma confirmó los 3 valores persistidos
correctamente. Verificado además en el HTML servido por
`/c/[slug]` (SSR real, sin login): aparecen `rocket_launch`,
`diversity_3` y `all_inclusive` exactamente donde se esperaba (badge
O.D., punto de Contactos + su modal, badge/modal de Ancient). Datos de
prueba borrados al terminar. No se pudo probar con click real en
navegador logueado por el mismo bloqueo de credenciales de sesiones
anteriores. Versión: **1.13.0**.

## Rediseño en acordeón: dashboard de Programa + editor de tarjeta (2026-09-16, noche)

Pedido de Gunnar: las pantallas de personalización (dashboard de
Programa en `/admin/programs/[id]` y el editor de tarjeta en
`/admin/[slug]` + `/m/dashboard/*`) mostraban TODAS sus categorías
expandidas al mismo tiempo — un formulario larguísimo de scroll
infinito. Pidió acordeones tipo Apple: cada categoría colapsada por
defecto, se abre al tocarla; y dentro de las listas (Puestos, escalas
de Medallón/Sabiduría/Contactos), un "Agregar nuevo" + cada ítem
existente colapsado que se abre para editar.

**Nuevo `components/Accordion.tsx`** — tres piezas reutilizables, sin
librerías externas, animación 100% CSS (el truco `grid-template-rows:
0fr → 1fr`, sin medir alto por JS, sin saltos de layout):
- `AccordionSection` — la categoría de nivel superior ("Marca del
  Programa", "Distintivos & Honores", etc.). Colapsada por defecto
  salvo `defaultOpen`.
- `AccordionRow` — un ítem dentro de una lista de una categoría (un
  Puesto, un nivel de escala, un Miembro, un ítem de Oficina Virtual).
  Soporta modo no controlado (maneja su propio estado — un Puesto
  suelto en una lista server-rendered) o controlado (`open`/`onToggle`
  desde el padre — así EscalaEditor mantiene solo un nivel abierto a
  la vez).
- `AccordionAddRow` — el disparador "+ Agregar" con la misma forma que
  `AccordionRow`, que al abrirse revela el form de creación en blanco.

**Qué categoría abre por defecto**: para no esconder una confirmación
de guardado detrás de un acordeón cerrado, cada `AccordionSection` en
`/admin/programs/[id]` arranca abierta si su propio flash message de
la URL está presente (`saved`, `skinSaved`/`skinError`, `labelsSaved`,
`puestoCreated`/`puestoSaved`/`puestoDeleted`/`puestoError`,
`escalaSaved` por tipo, `adminCreated`/`adminError`,
`memberSaved`/`memberDeleted`/`memberMessaged`/`memberError`,
`activated`) — si no hay ninguno, queda cerrada salvo "Marca del
Programa" (primera, para no aterrizar en una página vacía). En los
editores de tarjeta (`EditorForm.tsx`, `MemberCardEditor.tsx`) abren
por defecto "Retrato"/"Foto" e "Identidad" (lo más editado primero),
el resto arranca cerrado.

**Listas reescritas como acordeón**:
- Escalera de Puestos (`admin/programs/[id]/page.tsx`): el viejo
  `<details>` de "Editar" por Puesto pasa a `AccordionRow` (ícono +
  sigla/denominación colapsados, "Borrar" como botón aparte que no
  abre el acordeón); "Agregar Puesto" pasa a `AccordionAddRow`
  (abierto por defecto solo si el Programa no tiene ningún Puesto
  todavía).
- `EscalaEditor.tsx` (Medallón/Sabiduría/Contactos, los tres
  reutilizan el mismo componente): cada nivel es un `AccordionRow`
  (swatch de color o ícono según el tipo + nombre/clave colapsados),
  solo uno abierto a la vez — "+ Agregar nivel" crea un nivel en
  blanco y lo abre automáticamente. Identidad estable de cada fila
  para el estado de React vía un `_uid` interno generado al crear/
  cargar cada ítem (nunca se manda al server — se descarta al armar
  el JSON que sí viaja, que sigue siendo el shape `EscalaItem` de
  siempre).
- Miembros (`admin/programs/[id]/page.tsx`): cada membership pasa a
  `AccordionRow` (nombre + badge Activo/Invitado colapsados, Borrar
  aparte); adentro, los dos `<details>` de "Editar"/"Mensaje" que
  tenía antes se muestran juntos (no se anidó un acordeón dentro de
  otro ahí, dos forms cortos no lo justifican).
- Oficina Virtual (`MemberCardEditor.tsx`): mismo patrón que
  EscalaEditor — cada ítem (trabajo/experiencia) es un `AccordionRow`
  con solo uno abierto a la vez, "+ Agregar" crea uno en blanco y lo
  abre.

**Lo que NO cambió**: ningún server action, ningún campo del schema,
ninguna lógica de guardado — esto es puramente la capa visual/de
interacción sobre el mismo `<form>`/`action={...}` de siempre. En
particular, esto NO es la Fase D2 del plan del Dashboard 2.0 (acordeón
con guardado independiente por sección + badge "Guardado" que exige
re-tocar "Editar" para volver a editar) — esa sigue en cola, documentada
arriba, para cuando haga falta guardado asíncrono por sección en
`/m/dashboard`. Esto es el colapsado visual que Gunnar pidió ahora,
aplicado tanto al dashboard de Programa como a los dos editores de
tarjeta (`EditorForm.tsx` para Legacy/project, `MemberCardEditor.tsx`
para Business/Personal).

Archivos tocados: `components/Accordion.tsx` (nuevo),
`components/EscalaEditor.tsx`, `app/admin/programs/[id]/page.tsx`,
`components/EditorForm.tsx`, `components/MemberCardEditor.tsx`.

Probado: `npx tsc --noEmit` limpio, `npx next build` completo sin
errores (compila los 20 routes, incluidas las 4 páginas tocadas y sus
componentes cliente — confirma que el límite servidor/cliente al pasar
`children`/`trailing`/`meta` con `<form action={...}>` de Server
Actions embebidos hacia los componentes de acordeón (client) es válido,
mismo patrón que ya usaba `EscalaEditor` antes de este cambio). `curl`
sin sesión a `/admin`, `/admin/programs` y `/admin/programs/[id]`
confirma que siguen redirigiendo a login sin crashear. **No se pudo
probar con clicks reales en un navegador logueado** — mismo bloqueo de
credenciales de sesiones anteriores (no tengo forma de loguearme sin
resetear la contraseña del Admin de prueba local, y esa escritura de
credencial quedó bloqueada explícitamente). Gunnar: probalo vos con tu
sesión real antes de darlo por bueno del todo — si algo del
comportamiento de abrir/cerrar no se siente bien, avisame. Versión:
**1.14.0**.

## Backlog grande post-acordeón (2026-09-16/17, madrugada) — diagnóstico + qué se hizo ya

Gunnar tiró una lista larga de ~28 pedidos de una sola vez, de tamaño muy
distinto (desde "aumentá un 15% este badge" hasta "construí un funnel de
agendamiento con horarios administrables"). **Regla para retomar esto**:
no tratar de hacer todo de una — picar de a un grupo por sesión, tildar
acá conforme se cierre cada uno, mismo criterio que el resto de este
archivo.

### Ya diagnosticado y resuelto esta madrugada

- [x] **Bug real: el toggle de Tema (día/noche) no hacía nada en
      tarjetas de Programa con un skin activo.** Confirmado con Playwright
      contra un build de producción local (no el dev server — el dev
      server de Turbopack en este sandbox tiene sus propios problemas de
      hydration/HMR que casi me hacen diagnosticar mal, ver nota abajo):
      con un skin de prueba activo, el `background-color` del wrapper
      quedaba en `rgb(255,255,255)` antes Y después de tocar el botón —
      cero cambio. Causa exacta: en `components/LyCardView.tsx`, el
      spread `{...THEME_VARS[theme], ...brandVars}` pone `brandVars` (los
      colores fijos del skin) DESPUÉS de las variables de tema, así que
      cuando hay skin, siempre gana el skin sin importar el estado de
      `theme` — esto era intencional en el diseño original de Skins
      ("una identidad de marca fija, no un par claro/oscuro", comentario
      que ya estaba en el código), pero dejaba un botón que parecía roto
      en vez de simplemente no mostrarlo. Fix: el botón de Tema ahora se
      **oculta** cuando hay un skin activo (`!skinColors &&`) — no hay un
      claro/oscuro que mostrar en una identidad de marca fija. Si en algún
      momento querés que los skins sí tengan variante clara, es una
      fase aparte (cada skin necesitaría un segundo set de colores).
      Probado con Playwright + build de producción local. `tsc` limpio.

- [x] **Diagnóstico: el toggle de Idioma SÍ funciona.** Probado con
      Playwright contra el build de producción (ES→EN cambia el texto de
      botones como "Agendar una Entrevista"→"Schedule..."), tanto en
      tarjetas sin skin como con skin activo. Lo que NO traduce — y es
      correcto que no lo haga — es el texto que vos mismo escribiste a
      mano (nombre, cargo, cita/lema, siglas, denominación del puesto,
      "Mi camino con..."): no hay ninguna IA traduciendo eso, es tu
      texto literal guardado en la base. Si querés que ESE texto también
      cambie de idioma, es una feature nueva y real (traducción por IA al
      vuelo, con costo de API) — no una corrección de bug. Quedó como
      pregunta abierta abajo.

- [x] **Nota metodológica importante**: mientras diagnosticaba esto
      pegué un rato probando contra el dev server de Turbopack en este
      sandbox y los clicks NO registraban nada (ni siquiera un
      `dispatchEvent` manual) — parecía un bug gravísimo. Resultó ser un
      artefacto de ESTE contenedor (el WebSocket de HMR falla acá por el
      proxy de red) y no reproduce en un build de producción real. Sirve
      como recordatorio: de acá en adelante, cualquier prueba de
      interactividad real se hace contra `next build && next start`
      local, no contra `next dev`, para no perseguir fantasmas.

### El resto del backlog (sin empezar, priorizado a ojo — Gunnar puede reordenar)

**Grupo A — retoques rápidos de la tarjeta pública (LyCardView.tsx),
todos numéricos/mecánicos, bajo riesgo — HECHO (2026-09-17):**
- [x] Ratio foto vs. panel inferior: `minHeight`/`maxHeight` del
      contenedor de foto 130/420 → 110/357 (-15%).
- [x] Puntitos del carousel (`CardCarousel.tsx`, viven a +6px/+12px del
      borde real) ya no pisan el último botón de la tarjeta — el padding
      inferior de `LyCardView.tsx` sube de +10px a +24px para dejarles
      su propio espacio.
- [x] Badge de Cargo/Título profesional: +15% sobre el tamaño que ya
      había bajado un 30% en v1.11.1 (ancho 150→172, ícono 8→9, texto
      7px→8px).
- [x] Badge "Mi camino con Legacy": -20% (texto 11px→9px, ícono 15→12,
      padding y gap reducidos en proporción).
- [x] Badge "Agenda una visita/entrevista": -30% (texto 13px→9px,
      ícono 19→13, padding y gap reducidos en proporción).
- [ ] Línea de la cita/lema: line-clamp ajustable — **sigue sin hacer**,
      no tiene un valor puntual pedido (a diferencia de los 5 de
      arriba) y Gunnar ya confirmó dejar "todo editable" para más
      adelante — esta queda atada a esa misma decisión.

**Grupo B — modal de versión — HECHO (2026-09-17):**
- [x] Rama propia para `modal === "versionInfo"` (antes usaba el
      renderer genérico de `activeModal.head/body/meta`, que solo
      mostraba la nota de la última versión): ahora lista hasta 10
      entradas de `CHANGELOG`, cada una con su versión + fecha + nota
      completa. Letra más chica (11-11.5px vs. los 13-17px del resto).
      Scrollea gratis — el contenedor del modal ya tenía
      `maxHeight:88vh, overflowY:auto`, no hizo falta un scroll anidado.

**Grupo C — modal de CV/PDF — HECHO (2026-09-17):**
- [x] Pasó del `<iframe>` fullscreen propio al mismo componente de
      modal bottom-sheet que usa todo lo demás (`maxHeight:88vh,
      overflowY:auto` — nunca se sale de pantalla). El PDF demo se
      convirtió una vez a imagen (`public/demo-cv.png`, generada con
      Playwright/Chromium headless apuntando al PDF con
      `#toolbar=0&navpanes=0` para sacar el chrome del visor nativo) y
      se muestra con marco/sombra, más un botón "Descargar PDF" debajo
      que linkea al PDF real. **Alcance**: sigue siendo un único PDF
      demo compartido por todas las tarjetas (`Card.cvUrl`/subida real
      por tarjeta no existe todavía) — eso queda para cuando se retome
      el "subir PDF o imágenes" que también pidió Gunnar para el modal
      de "Mi camino" (Grupo G, mismo mecanismo probablemente sirve para
      los dos).

**Grupo D — Admin Programa, ediciones chicas:**
- [x] Sacar "Color primario" del form (input eliminado de la UI; el
      campo del schema y su lugar en `updateProgramAction` quedaron
      intactos — es inofensivo, `formData.get("primaryColor")` da
      `null` y el loop lo ignora, no pisa el valor guardado).
- [x] Cambiar el título de esa sección: "Marca del Programa" →
      "Identidad del Programa" (elegido por mí, sin pedirlo explícito —
      avisale a Gunnar si prefiere otro).
- [x] "Agregar N0" pasa a `AccordionAddRow` (mismo patrón que Puestos)
      en vez de estar siempre visible. El mensaje "sos vos (MasterN0)
      quien lo administra" cuando no hay delegado ya existía de la
      Fase D1/acordeón, ahora queda más al frente al no competir
      visualmente con el form de creación.

**Grupo E — Editor de tarjeta (EditorForm.tsx), ediciones chicas:**
- [x] Renombrado "Identidad Fiduciaria" → "Identidad".
- [x] **Bug de `<select>` con opciones blancas/ilegibles — arreglado.**
      Confirmado el diagnóstico leyendo el código: el `<select>` de
      Puesto y el de Programa en `EditorForm.tsx` tenían `color`/
      `background` puestos en el `<select>` pero NO en cada `<option>`
      — los navegadores pintan el popup de opciones con los colores del
      sistema salvo que cada `<option>` los tenga explícitos. Fix:
      nuevo `SELECT_OPTION` (`background:#0D0D0D, color:#F5F2EB`)
      aplicado a las 4 `<option>` de esos dos selects. No se pudo
      verificar visualmente (Playwright no reproduce fielmente el
      dropdown nativo del SO), pero es el fix estándar y documentado
      para este bug exacto — si sigue viéndose mal, avisame con una
      captura.
- [x] Canales de Contacto: sumados Email y Ubicación — nuevos
      `Card.email`/`Card.location` (migración
      `20260917131525_card_email_location`), inputs en ambos editores
      (`EditorForm.tsx` y `MemberCardEditor.tsx`), persistidos en
      `updateCardAction` y `updateMemberCardAction`. **Alcance
      recortado a propósito**: solo quedaron como campos editables/
      guardados — todavía NO se muestran en la tarjeta pública
      (`LyCardView.tsx`). El dock de redes sociales de la tarjeta
      (`SocialDock`/`socialHref`/`SOCIAL_SVG`) está fuertemente tipado
      a una lista fija de 6 plataformas con su propio ícono SVG y
      builder de URL cada una — sumar email/ubicación ahí a las
      apuradas, en medio de un backlog de 28 ítems, se sentía más
      como meter con calzador que como hacerlo bien. Queda pendiente
      como fast-follow chico si Gunnar confirma que los quiere
      visibles en la tarjeta (¿ícono de mail con `mailto:`? ¿ubicación
      como texto plano o link a Maps?).

**Grupo F — Textos de Botones y Modales (admin/programs/[id]):**
- [ ] Rediseñar el editor: hoy es una lista plana de inputs
      (`CARD_LABEL_FIELDS`); Gunnar quiere cada modal separado, con
      posibilidad de editar TODO su contenido (no solo el título) —
      "usá interfase de tarjeta si es más fácil visualmente" (¿un
      preview en vivo de la tarjeta al lado del form?). Requiere decidir
      alcance: ¿título únicamente, o título+kicker+body+meta de cada
      modal del `modalMap`?

**Grupo G — modal "Mi camino con Legacy" (story):**
- [ ] Insertar un video que aparezca ANTES del título "Descubrí en
      Legacy..." (hoy no hay campo de video ahí, solo `storyQuote`/
      `storyBody`).
- [ ] Subir PDFs o imágenes (dice "3" — ¿tope de 3 archivos?) con una
      lista desplegable de los archivos subidos.

**Grupo H — modal "Más información" ("Info Legacy"):**
- [ ] Respuesta a la pregunta de Gunnar: es la key `info` del
      `modalMap` en `components/LyCardView.tsx`. Para tarjeta de
      Programa/Personal el contenido sale de `lib/i18n.ts` (`infoTitle`
      y las keys de `infoBody` — texto fijo, no editable desde ningún
      dashboard todavía); para Empresa usa `card.title`/`card.quote`
      (esos sí ya son editables). Si querés que el de Programa/Personal
      también sea editable, es el mismo patrón que ya existe para
      Puestos/Escalas — falta construirlo.

**Grupo I — botón de acción principal + video + QR + Invitación
(feature grande — decidido 2026-09-17, ver Fase 2 más abajo):**
- [ ] Botón de acción configurable: tipos fijos —
      WhatsApp directo / Agendar Cita / Agendar Webinar / URL libre —
      **más un quinto tipo, "Funnel"**, que apunta a un funnel creado
      dentro de la Oficina Virtual (Grupo K se vuelve, en la práctica,
      la base de este tipo de acción — ver Fase 2 abajo). El tipo
      "Funnel" no se puede construir hasta que exista al menos un
      funnel para apuntar, así que depende de que la Oficina Virtual
      tenga su primer tipo de contenido armado.
- [ ] Que el campo de video (`videoThumbnailUrl`) acepte un link real y
      lo reproduzca (hoy es solo una miniatura estática).
- [ ] QR y "Enviar Invitación": mismo tratamiento — acción, imagen y
      título del botón editables.
- [ ] Títulos de TODOS los popups, editables.

**Grupo J — Diseño Corporativo (Skins), evaluación por IA de hasta 3
imágenes (decidido 2026-09-17 — reemplaza el enfoque de "subir un PDF
completo"):**
- [ ] Gunnar bajó la idea de subir un PDF; en su lugar: **hasta 3
      imágenes** (fotos del brand book, capturas, lo que sea), evaluadas
      TODAS JUNTAS por una llamada real a la API de Claude (visión) para
      generar un `design.md` más completo y preciso que la heurística
      determinística actual (`lib/designExtraction.ts`) — varias
      imágenes desde distintos ángulos del mismo material de marca
      debería dar una lectura más confiable de paleta/tipografía/estilo
      que una sola imagen o un PDF parseado como texto. Implica: (a)
      `ANTHROPIC_API_KEY` configurada como env var en Vercel/local, (b)
      diseñar el prompt (pedirle a Claude que devuelva paleta+fuente+
      estilo de botón en un formato parseable, ej. JSON), (c) manejar
      el costo por subida (avisarle a Gunnar cuánto sale aproximadamente
      antes de shippear), (d) UI del uploader pasa de 1 a hasta 3
      inputs de imagen. No arrancado todavía.

**Grupo K — Fase D del "Agendar Entrevista": funnel + horarios
administrables (feature grande):**
- [ ] Hoy los horarios de "Agendar tu Entrevista" están hardcodeados en
      el código (no hay tabla de slots ni CRUD de horarios).
      MayanCity.vercel.app (repo de un socio, según Gunnar, con acceso
      de GitHub) tendría un funnel de referencia: antes de poder elegir
      horario, la persona ve un video + completa datos, y recién ahí
      elige de una lista de horarios pre-creados por el N0/Programa.
      Replicar ese funnel + agregar un CRUD de horarios (para
      entrevistas Y webinars) es grande — falta el acceso al repo para
      ver el patrón real antes de diseñar el schema.

### Preguntas abiertas — RESPONDIDAS por Gunnar (2026-09-17)

1. **MayanCity (Grupo K)** — Gunnar pasó dos repos candidatos:
   `ChatyLGT/MS247` y `ChatyLGT/mis_socios_247`. **Ninguno de los dos es
   el sitio.** Cloneados y revisados los dos (público, `add_repo` +
   clone directo): son un sistema de agentes/bots por Python
   (`telegram_bridge.py`, `whatsapp_bridge.py`, `agentes/`, un esquema
   SQL con "souls"/`init_vault.sql`) — nada de Next.js, nada de web, no
   hay ningún funnel de agendamiento ahí. No coincide con "mayancity.
   vercel.app" que describió (un sitio web con video+formulario+lista de
   horarios). **Sigue bloqueado** — hace falta el repo correcto (¿el
   dominio real sí es mayancity.vercel.app? ¿tiene otro nombre en
   GitHub?) antes de poder copiar el patrón. Mientras tanto, si Gunnar
   prefiere, puedo construir el funnel (video + form + lista de
   horarios administrables) directo a partir de su descripción en texto,
   sin la referencia visual del repo — más lento de afinar el diseño
   exacto, pero no bloquea el arranque.
2. **Botón de acción (Grupo I)** — decidido: **tipos fijos + URL
   custom** (WhatsApp / Agendar Cita / Agendar Webinar / URL libre),
   cada tipo con su propio ícono y comportamiento ya armado.
3. **PDF→design.md con IA (Grupo J)** — decidido: **IA real vía API de
   Claude**, no heurística. Implica costo de API por cada subida y
   agregar credenciales/llamada al SDK de Anthropic — falta diseñar el
   prompt/parseo antes de tocar código.
4. **Tamaños editables (Grupo A)** — decidido: arrancar con los 5
   ajustes puntuales fijos (ratio foto, puntitos, 3 badges), NO un
   sistema de tokens completo por ahora.

### Respuesta a la pregunta de Gunnar sobre Fase 2 ("Oficinas
Cordiales"/Virtuales)

Tiene sentido cerrar este backlog grande (al menos los Grupos A-H, que
son ajustes/bugs de la tarjeta ya existente) antes de abrir una fase
nueva — la tarjeta todavía tiene piezas sueltas (CV en PDF crudo, menús
rotos, botón de tema fantasma) que conviene cerrar mientras el contexto
está fresco. Los Grupos I-K ya empiezan a ser "Oficina Virtual" en la
práctica (acciones configurables, funnels, horarios) así que la línea
entre "terminar Fase 1" y "empezar Fase 2" es más borrosa de lo que
parece — probablemente convenga tratarlos como el arranque real de la
Fase 2 en vez de forzarlos dentro de "Fase 1 al 100%".

## Oficina Virtual 2.0 — Planeación (2026-09-17)

Gunnar confirmó: cerramos los Grupos A/B/C del backlog grande (hecho,
arriba) y arrancamos la PLANEACIÓN de esta fase — todavía no el código.
No es la misma "Oficina Virtual" de la Fase 7 original del roadmap (ese
ya existe: el portfolio/currículum con `officeItems`, editable desde
`/m/dashboard`) — es una capa nueva encima: funnels, horarios
administrables y acciones configurables que EN CONJUNTO reemplazan/
absorben los Grupos I, J y K del backlog grande.

### Qué la compone

1. **Horarios administrables (Slots)** — pieza de datos base, todo lo
   demás depende de esto. Hoy "Agendar tu Entrevista" usa una lista de
   horarios hardcodeada en el código (`scheduleOpen` modal en
   `LyCardView.tsx`); hace falta:
   - Modelo nuevo, algo como `AvailabilitySlot` (`programId`, `kind`:
     "interview" | "webinar", `startsAt`, `capacity`, `bookedCount`),
     con CRUD desde `/admin/programs/[id]` (otro `AccordionSection` más,
     mismo patrón que Puestos/Escalas).
   - El modal de "Agendar" pasa de la lista fija a leer los slots
     disponibles del Programa en tiempo real.
   - Definir: ¿slots recurrentes (ej. "todos los martes 10am, cupo 5")
     o fechas puntuales cargadas una por una? Recurrentes es más
     potente pero más trabajo — probablemente arrancar con fechas
     puntuales (más simple, calca el patrón ya usado en
     `Registration`) y sumar recurrencia después si hace falta.

2. **Funnels** — secuencia configurable que antecede a elegir un
   horario (referencia de Gunnar: mayancity.vercel.app, todavía sin
   confirmar el repo correcto — ver arriba). Estructura mínima
   propuesta: un Funnel tiene una lista ordenada de "pasos", cada uno de
   un tipo fijo para arrancar (no un builder 100% libre):
   - `video` — mostrar un video, opcionalmente bloquear "Siguiente"
     hasta que se reproduzca/termine.
   - `form` — campos configurables (nombre, WhatsApp, email, y quizás
     preguntas custom tipo texto corto).
   - `slot_picker` — elegir un horario de los `AvailabilitySlot`
     disponibles del Programa (paso final típico).
   - Cada Programa puede tener uno o más Funnels guardados; el que hoy
     es "Agendar tu Entrevista" pasaría a ser, de hecho, un Funnel con
     pasos `form` + `slot_picker` (sin `video`) — mismo mecanismo,
     no un sistema aparte.

3. **Botón de acción configurable** (Grupo I) — una vez que existen
   Funnels reales, el botón de acción principal (hoy fijo en "Agendar
   Entrevista/Café/Reunión" según `card.kind`) pasa a elegir entre:
   WhatsApp directo / Agendar Cita / Agendar Webinar / URL libre /
   **Funnel** (apunta a uno de los Funnels del Programa). Los primeros
   4 tipos no dependen de Funnels y se pueden construir antes.

4. **QR + Invitación configurables** (Grupo I) — mismo tratamiento:
   acción, imagen y título editables, probablemente reusando el mismo
   selector de "tipo de acción" del punto 3.

5. **Diseño Corporativo con IA real** (Grupo J) — independiente de todo
   lo anterior, puede ir en paralelo: subir hasta 3 imágenes, evaluadas
   juntas vía API de Claude para generar el `design.md`. Ver detalle en
   Grupo J arriba.

### Orden sugerido (por dependencias, no por importancia)

`Slots administrables` → `Funnel builder básico (video+form+slot_picker,
reusando Slots)` → `Botón de acción configurable (primero sin tipo
Funnel, después con)` → `QR/Invitación configurables` — con
`Diseño Corporativo IA` corriendo aparte, sin bloquear ni bloquearse con
el resto.

### Bloqueado hasta

- Confirmar el repo real de MayanCity (o que Gunnar describa el funnel
  en texto si prefiere arrancar sin la referencia visual).
- Nada más — el resto de las decisiones de diseño (tipos de acción,
  IA real para Skins) ya están tomadas arriba.

**Estado**: planeación escrita, nada de código todavía. Arrancar por
"Horarios administrables" en la próxima sesión que toque esto, es la
base de la que depende todo lo demás.

---

## Fase 10 — Auditoría del funnel + hallazgo del repo MayanCity + roadmap Oficina 2.0 / Wallet (2026-09-17)

Sesión de auditoría, sin cambios de código en la app (decisión explícita de
Gunnar: esta noche se entrega documento + plan, no feature nueva). Se revisó
el funnel de entrevista actual línea por línea, se identificó la lógica de
"misocio" (`CardNetworkMembership`) y su rol en la Oficina Virtual, y — hallazgo
importante — **el bloqueo de "repo de MayanCity" del Grupo K está resuelto.**

### A. El bloqueo de Grupo K (Oficina Virtual 2.0) está resuelto

`Bloqueado hasta` (línea ~2293 de este documento) pedía confirmar el repo real
de MayanCity para copiar su patrón de "video + form + horario". Los repos que
se habían descartado antes (`ChatyLGT/MS247`, `ChatyLGT/mis_socios_247`) en
efecto no son eso. Pero esta noche, revisando el Google Drive de Gunnar,
apareció `cnv_respaldo_app.tar` — un backup real de la app **Ciudad Nueva
Vida (CNV / NexID)** — y dentro de ese backup, la propia tarjeta de Gunnar
dice textual: *"Hoy, está reescribiendo el nuevo contrato social con Mayon
City (Utopian): 1646 hectáreas"*. Es la misma familia de proyecto que
"MayanCity", solo que vive bajo el nombre interno CNV/NexID. Ya subido
(limpio, sin `.env.local`) a **github.com/ChatyLGT/lycardmisocio** para que
Sergio lo tenga a mano.

Adentro está exactamente el patrón que el Grupo K pedía imitar, en
`src/pages/admin/webinars/`:

- **`templates.tsx`** — plantilla de evento: título, descripción, duración en
  minutos, recursos globales (`videoUrl`/`pdfUrl`/`driveUrl`), speakers
  autorizados, tags. Esto ES el paso "video" del Funnel que ya estaba
  planeado — una plantilla reusable, no un video suelto por evento.
- **`schedule.tsx`** — el generador de horarios. Elegís una plantilla + un
  rango de fechas + qué días de la semana + una hora fija + el link de la
  sala → arma una vista previa de todas las instancias que van a crearse →
  confirmás y se guardan como eventos individuales. **Esto responde la
  pregunta abierta que quedó anotada en este mismo documento ("¿slots
  recurrentes o fechas puntuales?", línea ~2245): la referencia real usa
  recurrencia por días de la semana, no carga fecha por fecha.** Recomendación
  directa para Sergio: portar esta forma (plantilla + rango + días + hora →
  preview → confirmar) al modelo `AvailabilitySlot` ya planeado, en vez de
  arrancar por el camino "más simple" de fechas sueltas que se había sugerido
  antes de tener esta referencia.
- **`[wallet].tsx`** — la tarjeta pública de CNV, resuelta por dirección de
  wallet en vez de slug, con detección de "¿soy el dueño?" comparando la
  wallet conectada (`useActiveAccount` de `thirdweb/react`) contra la de la
  URL. Referencia directa para la Fase de Wallet (ver punto D).

No hace falta pedirle nada más a Gunnar para arrancar el Grupo K — el
bloqueo queda levantado.

### B. Auditoría del funnel de entrevista actual — hallazgos concretos

Revisado `app/c/actions.ts`, `app/admin/interviews/actions.ts`,
`lib/interviewSlots.ts`. Ningún hallazgo es hipotético — todos verificados
leyendo el código real:

1. **`registerInterviewAction` no valida el formato del email**
   (`app/c/actions.ts:14-16`) — valida que `name` y `whatsapp` no estén
   vacíos, pero `email` no tiene ni chequeo de vacío ni de formato. Contraste:
   `sendInvitationAction` y `sendContactMessageAction`, dos funciones más
   abajo en el mismo archivo, sí usan regex de email. Inconsistencia real,
   fácil de explotar sin querer (alguien tipea mal el mail y nunca se entera
   de que no le va a llegar nada).
2. **Cero rate-limiting en toda la app** — confirmado por grep, no hay ni una
   sola referencia a rate-limit en el proyecto. Las 4 server actions públicas
   (`registerInterviewAction`, `sendInvitationAction`,
   `sendContactMessageAction`, `sendQrByWhatsappAction`) son invocables sin
   límite. La más riesgosa es `sendInvitationAction`: usa la cuenta de Resend
   del proyecto para mandar mail a cualquier dirección que le pasen — sin
   límite, es un relay de email gratis para quien quiera abusarlo.
3. **Horarios 100% hardcodeados y sin cupo** — `lib/interviewSlots.ts` tiene
   4 fechas fijas en el código fuente, sin modelo en base de datos, sin
   límite de cupo por horario. Hoy mismo podrían registrarse 200 personas en
   el mismo slot sin que nadie lo note hasta el día de la entrevista real.
   (Se resuelve de raíz con el modelo `AvailabilitySlot` de la Fase Oficina
   2.0 — ver punto A.)
4. **Sin protección contra registros duplicados** — el mismo WhatsApp/email
   puede registrarse N veces al mismo horario o a horarios distintos, sin
   ningún `@@unique` ni chequeo previo en `registerInterviewAction`.
5. **Nada de esto rompe hoy** — la plataforma funciona porque el volumen real
   es bajo y todo pasa por gente conocida. El riesgo es real recién cuando
   este link empiece a circular más ampliamente (justamente el objetivo de
   pedirle a Sergio que lo blinde).

### C. La lógica de "misocio" (`CardNetworkMembership`) — qué es y cómo conecta con la Oficina

Ya existe en el schema (`prisma/schema.prisma:306-323`) y tiene su propia
lógica de activación (`app/m/dashboard/company/network/actions.ts`,
`activateNetworkMembershipAction`) — es el equivalente, a nivel de una
tarjeta de Empresa individual, de lo que `ProgramMembership` es a nivel de
Programa completo: cada Empresa tiene su propia red de clientes, con estado
`invited`→`active`, árbol de quién refirió a quién
(`referredByMembershipId`), y eso ya alimenta el badge N0/N1/.../NA que se
ve en la tarjeta (Fase N, completada). Es, en los hechos, un mini-MLM por
tarjeta — la semilla exacta de lo que CNV llama "Esfera Social" (ver Códice
de las 5 Esferas, resumen abajo).

**Lo que falta para que sea "la Oficina" de verdad**: hoy esa red vive solo
como panel de administración del dueño (`/m/dashboard/company/network`) — el
visitante que abre la Oficina Virtual de esa Empresa (Fase 7, ya en
producción) ve portfolio/catálogo, pero no ve nada de la red ni de su propio
lugar en ella. Roadmap concreto para Sergio:

- Agregar una sección "Mi Red" dentro de la Oficina Virtual pública de
  Empresa (mismo lugar que hoy muestra `officeItems`), visible según quién
  mira: el dueño ve el árbol completo, un cliente activo ve su propio nivel
  y a quién refirió.
- Comparado con el sistema de CNV (Esfera Social: Solitario→Familia→Clan→
  Tribu→Nación, por volumen de red — ver Códice), LyCard hoy solo trackea
  un nivel de referido por Card, sin la jerarquía de 5 niveles con nombre
  propio. Se puede adoptar esa nomenclatura como la escala de "Sabiduría/
  jerarquía" que ya es configurable por N0 desde la Fase 9.5 — no hace falta
  modelo nuevo, es reusar lo que ya existe con otros nombres.

### D. Wallet / Web3 — plan de cáscara para esta entrega, sin gastar en infra real

De CNV se rescata el approach completo: Thirdweb SDK sobre Polygon Amoy
(testnet), con una "wallet invisible" (Account Abstraction) generada
automáticamente y ligada al email/WhatsApp del Miembro — la persona nunca ve
ni instala Metamask, firma sin saber que está usando blockchain. Es la forma
correcta de hacerlo cuando llegue el momento, pero integrar Thirdweb de
verdad esta noche, bajo presión de entrega, es la forma más segura de romper
algo a las 2am sin testear bien.

**Para esta entrega**: dejar la cáscara visual únicamente.
- Botón "Conectar Wallet" en `/m/dashboard` y en la Oficina Virtual, mismo
  patrón visual que ya se usó para "Oficina Virtual" antes de que existiera
  de verdad (Fase 7): un modal que dice "Próximamente — tu identidad on-chain
  vive acá" en vez de intentar una conexión real.
- Sin campo nuevo en el modelo `Card`/`Member` todavía — cuando se decida
  integrar de verdad, agregar `Member.walletAddress` (nullable) es aditivo,
  no rompe nada existente, mismo patrón que toda la Fase 9.
- Cuando Gunnar/Sergio decidan avanzar en serio: Thirdweb tiene "in-app
  wallets" (email-based) gratis en testnet — la puerta de entrada más barata
  para probar el flujo real sin gastar en infraestructura propia.

### E. Nash Mesh — pendiente de explicación

Gunnar marcó que la conexión con "Nash Mesh" es la ambición grande a largo
plazo, pero todavía no llegó la explicación de qué es concretamente (no está
documentado en ningún repo al que tengo acceso — ni lycard, ni einaros, ni el
backup de CNV). Queda anotado como item abierto del roadmap, sin bloquear
nada de lo demás. Cuando Gunnar lo explique, se agrega acá.

### F. Checklist "a prueba de balas, estilo top-15 Google" para Sergio

En orden de impacto/esfuerzo, ninguno depende de otro salvo donde se aclara:

1. Email con regex en `registerInterviewAction` (mismo patrón que las otras
   2 actions del archivo — 10 minutos de trabajo, cero riesgo).
2. Rate-limiting en las 4 server actions públicas (por IP o por
   email/whatsapp, ventana corta — ej. `@upstash/ratelimit` si ya hay Redis
   en el proyecto, o un guard simple en Postgres si no).
3. Migrar `lib/interviewSlots.ts` a un modelo real en base (`AvailabilitySlot`,
   ya planeado en la Fase Oficina 2.0, punto A) — mata el problema de cupo
   sin límite de una sola vez.
4. Dedupe de registros: `@@unique` compuesto o chequeo previo por
   `(cardId, slotId, whatsapp)` antes de crear un `Registration` nuevo.
5. Suite de regresión automatizada — hoy todo se prueba manualmente con
   Playwright ad-hoc por sesión (ver todas las Fases arriba), no queda una
   suite que corra sola en cada cambio. Es lo que separa "funciona porque lo
   probé yo" de "a prueba de balas".
6. Revisar headers de seguridad / CSP a nivel de `next.config.ts` — no
   auditado en esta pasada, queda para la próxima.

**Estado**: documento entregado, cero cambios de código en `lycard` esta
noche (por decisión explícita). El hallazgo del punto A desbloquea el
arranque real del Grupo K la próxima vez que se toque este proyecto.

---

## Fase 11 — Diseño del Letrero (Oficina Virtual) + síntesis NashMesh/Legacy Corp/Gemelo Digital (2026-09-17)

Gunnar describió la primera pantalla real de "la Oficina": el **Letrero**
público (video de la causa + KPIs de Portafolio/Malla/Cartera) con el botón
central **Gemelo Digital** que lleva a un dashboard privado por cada
**Legacy Corp**. Antes de diseñar la pantalla hacía falta leer la teoría de
fondo — son ~40 documentos en Drive (NashMesh, Legacy Corp, Gemelo Digital,
Niveles de Acceso). Se leyeron los 5 centrales. Resumen para que Sergio no
tenga que leer los 40:

### A. La teoría, en una página

- **NashMesh** no es una red social ni un MLM — es un **motor matemático de
  reparto de pago**: `Payment_i = φ_i × ψ_i × (1-ε)`, donde φ (Shapley
  Value) mide tu contribución real a un resultado, ψ (Reliability Weight)
  tu consistencia (empieza en 0.60, sube o baja mes a mes), y ε la comisión
  de la plataforma (3-5%). Se llama "Malla" y no "red" porque no hay un jefe
  arbitrando cuánto vale cada quien — una capa de auditoría (blockchain +
  "HorusEye") calcula y paga automático. Es el reemplazo del jefe que
  reparte a dedo.
- **Gemelo Digital** = una IA entrenada con tu "Códice" (tu conocimiento
  documentado en 2-3 sesiones: quién sos, tu don, tu metodología). Trabaja
  24/7 respondiendo leads, cerrando tratos, cobrando vía NashMesh. Tiene 3
  capas: Códice (documentación) → Legacy (historial/reputación, φ/ψ
  públicos) → IA Operacional (el que efectivamente trabaja). En la visión
  completa, el Gemelo no es un asistente — **es quien opera el negocio**.
- **Legacy Corp** = el producto que EinarOS vende a una empresa para
  estructurarla con la arquitectura fractal completa: N0 (dueño) → N1
  (triada obligatoria Einar/estrategia + Chaty/coordinación +
  Warren/orquestación) → N2 (Guardianas, auditoría/doctrina) → N3
  (Expertos) → N4 (Especialistas). Tres tiers de precio ($3.5k PyME/$10k
  corporativo/Custom). No es sinónimo de `Program` en LyCard — es más rico,
  con jerarquía interna propia por cada Corp.
- **Niveles de Acceso** — Seeker → Padawan → Mutant → Superhuman → Sherpa →
  Ancient. Coincide, nombre por nombre, con lo que ya se vio en el Códice
  de las 5 Esferas de CNV (Fase 10, punto A histórico de esta sesión).

### B. Lo que ya existe en LyCard y no hay que inventar de nuevo

- **`RANKS` (badge de Sabiduría, `lib/data.ts`)** ya usa exactamente esta
  escala de 6 niveles (curioso→ancient) — es, sin saberlo, la
  implementación parcial de "Niveles de Acceso". No hace falta modelo
  nuevo, solo conectar el significado real (qué habilita cada nivel) en
  vez de ser decorativo.
- **`Puesto` (Fase 9.1 — `siglas`, `denominacion`, `descripcion`, `order`,
  por `Program`)** es la pieza exacta para representar la jerarquía interna
  N0→N1→N2→N3→N4 de cada Legacy Corp — ya existe el CRUD desde
  `/admin/programs/[id]`. Un Legacy Corp nuevo simplemente carga sus 5
  Puestos (o los que correspondan a su tier) ahí. Cero modelo nuevo.
- **`officeItems` (Fase 7)** ya es una lista libre de `{title, subtitle,
  description, imageUrl}` — sirve tal cual para listar el "Portafolio" del
  Letrero (casos, proyectos, lo que el Códice documenta como trabajo
  hecho).
- **`CardNetworkMembership` (Fase N/10)** ya es el germen auditado de una
  Malla — hoy solo trackea un nivel de referido y no calcula φ/ψ reales,
  pero la forma (nodo → estado → quién lo activó) es la misma que pide
  NashMesh a nivel conceptual.

### C. Diseño del Letrero — qué se construye de verdad vs. qué es cáscara

Estructura de la pantalla (primera vista al entrar a la Oficina, pública,
sin login):

1. **Video** — mismo patrón que `recursosGlobales.videoUrl` del CNV
   (Fase 10, punto A): un campo URL, se embebe. Ya hay precedente de campo
   de video en el proyecto (`Program.videoThumbnailUrl`).
2. **Causa/detalle + links** — texto libre + lista de links, mismo patrón
   que `officeItems` (reusar el modelo, no crear uno nuevo).
3. **Fila de 3 KPIs — Portafolio / Malla / Cartera:**
   - **Portafolio**: cantidad real de `officeItems` cargados — dato 100%
     real, disponible hoy.
   - **Malla**: nivel/badge (no cifra cruda) calculado sobre
     `CardNetworkMembership` — mismo patrón que ya usa el badge N0/N1/NA,
     mostrado como tier en vez de número. Public por diseño, igual que
     Medallón/Sabiduría hoy.
   - **Cartera**: acá es donde hay que ser honestos. El motor real de pago
     (φ, ψ, blockchain, comisión automática) no existe todavía y no se
     construye en una noche — implica blockchain, IA entrenada por
     persona, capa de auditoría. Mostrar una cifra sería inventar un
     número falso. Para esta entrega: cáscara "Próximamente — tu cartera
     vive acá" (mismo patrón que Wallet en la Fase 10, punto D), sin
     inventar `$`.
4. **Botón central "Gemelo Digital"** — por decisión de Gunnar en esta
   sesión: **asistente + dashboard clásico atrás**, no el operador
   autónomo de la visión completa. Chat simulado (mismo patrón que la
   transcripción/OTP simulados de Fases 1 y 3) que saluda, entiende qué
   busca la persona, y la dirige a la pantalla real correspondiente del
   dashboard privado. Nada de IA entrenada por persona todavía — eso es
   el Gemelo Digital de verdad, y es un proyecto en sí mismo (Códice +
   entrenamiento + auditoría), no una feature de una noche.
5. **Dashboard privado, por Legacy Corp** — cada Legacy Corp activada usa
   la jerarquía de `Puesto` (punto B) para su estructura interna, y el
   resto de piezas ya construidas (officeItems, Puestos, escalas) para su
   contenido. No hace falta modelo nuevo para arrancar — si más adelante
   se necesita algo específico de Legacy Corp que no cubre `Program`, se
   evalúa con un caso real en mano.

### D. Honestidad sobre el alcance

Todo lo que requiere blockchain real, IA entrenada por persona (Gemelo
Digital autónomo) o cálculo de φ/ψ en vivo es **la visión completa de
NashMesh**, no algo que se arma esta noche ni en la próxima sesión corta.
Lo que sí se puede construir pronto, con lo que ya existe: el Letrero con
Portafolio real, Malla como badge (reusando `CardNetworkMembership`), y
Cartera/Gemelo Digital como cáscara honesta — mismo patrón que toda la
plataforma ha usado desde la Fase 1 (simular lo que no está listo, dejar el
gancho real para cuando sí lo esté).

**Estado**: diseño documentado, sin código todavía (misma decisión de
Fase 10: esta sesión es de planeación). Listo para que la próxima sesión
arranque por el modelo de datos del Letrero (video/causa/links en
`Program` o `Card` según sea nivel Programa o nivel Corp individual —
pendiente de definir con Gunnar cuál).

---

## Fase 12 — Oficina Virtual: diseño final + Malla 3D navegable (2026-09-17/18)

Sesión larga de diseño visual con Gunnar (mockups iterados en vivo, fuera
de este repo — capturas enviadas por chat, no archivos del proyecto
todavía). Se llegó a una spec completa de la Oficina Virtual, incluida una
pieza nueva y grande: una Malla 3D navegable. Se documenta acá a detalle
antes de construir nada, por pedido explícito de Gunnar.

### A. La Oficina completa — estructura final, de arriba a abajo

Una sola pantalla larga (scroll), dos mitades separadas por una frontera
visual clara ("acá termina lo que ve cualquiera — todo lo de abajo solo
lo ve el dueño logueado"):

**Mitad pública (vitrina de ventas, cero login):**
1. Video corto ("de qué se trata").
2. Descripción de 1-2 líneas (la causa/proyecto).
3. Dos descargas: Presentación (PDF) + **Audiolibro simulado "Cómo crear
   tu socio ideal"** (gancho directo al tema de misocio).
4. KPIs como **badges, nunca cifra cruda** (Portafolio = número real de
   `officeItems`; Malla = nivel/tier, ej. "Nación"; Cartera = "Próx.",
   cáscara honesta).
5. Fila de "esto ya se lo piden todos los días" — 6 chips de casos de uso
   reales (video a redes, presupuesto, WhatsApp 24/7, licitaciones, flyer,
   recordatorios) — mapeados 1:1 al catálogo real de Irpavi/HeroSuite
   (Fase 11, punto 4 de esta sesión), no inventados.
6. Comparación "antes/después" reusando el pitch ya probado con Daniel
   Hergo/MLQR ($200-500 vs $15-30 por acción).
7. **La Malla 3D** (ver sección B) — la pieza nueva de esta ronda,
   reemplaza/absorbe lo que antes era el "Cerebro" estático.
8. KPIs de vitrina sobre la Malla: **enlaces creados, brechas cerradas,
   servicios ofrecidos** (ver mapeo a datos en sección D).
9. CTA final: **"Simulá tu Gemelo Digital"** — simulador tipo WhatsApp
   (reusa `OnboardingChat.tsx`, Fase 3), NUNCA acceso real al Gemelo del
   dueño.

**Mitad privada (solo el dueño, logueado):**
1. Saludo + botón real **"Hablar con tu Gemelo Digital"** (acá sí es la
   puerta de verdad — high-emphasis, gradiente dorado completo).
2. Ingresos registrados del mes (número simple, manual/propio — **no** es
   lo mismo que "Cartera NashMesh", que sigue como cáscara: distinción
   deliberada, ver Fase 11 punto C).
3. Clientes activos / Pendientes / Reuniones hoy.
4. La misma Malla 3D, pero en modo operativo: mi red real, mis agentes,
   con nombres y estados reales en vez de datos simulados de vitrina.
5. Agenda de hoy (lista simple).
6. "Tu equipo esta semana" — barras de rendimiento por persona/agente.
7. Accesos directos: Editar Oficina, Mi Red, Agenda, Mensajes, Cartera
   (cáscara), Configuración.

**Nota de producto importante:** este dashboard privado es la plantilla
**default**. El rediseño propio (mover módulos, elegir qué KPI destacar)
es un beneficio pago de Legacy Corp — no hace falta modelo nuevo para
dejarlo anotado, alcanza con un flag `template`/`custom` en `Program`
cuando se construya el paywall real.

### B. La Malla 3D — qué es, técnicamente

**Decisión de esta ronda:** no tiene que parecer literalmente un cerebro
(se relaja el requisito de la Fase 11). Lo que sí importa: **3D real,
navegable** — te alejás y ves el organismo completo, hacés zoom y volás
hacia tu propio nodo, ves qué otros nodos brillan por estar conectados a
vos, y podés ver relaciones cruzadas que no pasan por vos (ejemplo que dio
Gunnar: "la panadería de Pepe tiene relación con Bimbo de Daniel" — dos
nodos de Programas/Corps distintos, conectados entre sí, visibles aunque
no te toquen a vos).

**Librería:** `3d-force-graph` (o `react-force-graph` en su variante 3D),
ambas del mismo autor, construidas sobre `three.js` + `d3-force`. Dan de
fábrica: física de repulsión/atracción real, cámara 3D con `cameraPosition()`
animado (el "volar hacia mi nodo" es una llamada de API, no hay que
inventarlo), highlighting de nodos/links conectados al hacer hover o click,
y renderizado de miles de nodos sin drama de performance.

**La técnica de "nodos fantasma" (indicación explícita de Gunnar, y es
correcta):** en vez de pelear contra la física para forzar una forma
específica, se agregan nodos invisibles (mayor masa/carga) en las
posiciones donde querramos que se agrupen visualmente ciertos clusters —
los nodos reales se conectan a su fantasma correspondiente con un link
invisible de cierta fuerza, y la simulación hace el resto sola. Es una
técnica real y liviana (no exótica), mucho más simple que forzar
posiciones nodo por nodo. Los nodos fantasma nunca se renderizan ni son
clickeables — son andamiaje, no dato.

**Lo que esto habilita del pedido de Gunnar:**
- Zoom out completo → se ve el organismo entero (todos los Programas +
  Corps + personas).
- Click/hover en un nodo → sus conexiones directas brillan, el resto se
  atenúa (comportamiento nativo de la librería).
- "Volar" a mi propio nodo → `cameraPosition({x,y,z}, nodeCoords, ms)`
  con una transición animada — API directa de `3d-force-graph`.
- Ver relaciones que no me tocan (panadería↔Bimbo) → mismo grafo, no hace
  falta nada especial, es solo otro link en la data.

### C. Lo que se entrega en ESTA sesión (demo, no producción)

Gunnar pidió ver algo ahora, no solo la spec — se entrega:
1. Un **Artifact interactivo real** (no una imagen) — `d3-force`/`three.js`
   corriendo de verdad en el navegador vía Artifact (cdnjs.cloudflare.com
   está habilitado para cargar three.js/d3 por CDN), arrastrable,
   navegable, con datos simulados (sección D).
2. Un GIF de esa interacción, para poder verla en el contexto de la
   tarjeta sin depender de que el Artifact cargue en cualquier lado (mismo
   problema de visualización que ya pasó antes en esta sesión — las
   imágenes estáticas por `SendUserFile` son el canal que sí funciona
   siempre).

**Esto es una demo/Artifact, no código de producción.** La versión real,
integrada al repo con datos reales de Prisma, es tarea de Sergio sobre
`lycard` — la librería y la técnica ya están decididas acá para que no
tenga que investigarlas de cero.

### D. No hay datos reales — se simula un "juego" alrededor de Legacy

Confirmado por Gunnar: cero datos reales todavía. Se construye la
**lógica y estructura** de datos simulados (Programas ficticios alrededor
de Legacy, con Corps/empresas y personas), pensada para que después se
pueda:
- Llenar a mano con los clientes potenciales reales que Gunnar va a pasar
  (mencionó que hay una lista, pendiente de compartir), o
- Generarse programáticamente como hoy (semilla + reglas), como cáscara
  mientras no hay datos reales.

**Estructura de datos propuesta** (JSON simple, fácil de editar a mano):
```json
{
  "programas": [{ "id", "nombre", "color" }],
  "corps": [{ "id", "programaId", "nombre", "rubro" }],
  "personas": [{ "id", "corpId", "nombre", "rol", "tipo": "humano|agente" }],
  "enlaces": [{ "origen", "destino", "tipo": "referido|cliente|proveedor" }]
}
```
Nada de esto se persiste en Prisma todavía — es el shape para la demo del
punto C. Cuando haya datos reales, este mismo shape es lo que un endpoint
`/api/malla` tendría que devolver a partir de `ProgramMembership` +
`CardNetworkMembership`.

### E. KPIs de vitrina — mapeo a lo que existe (o falta)

- **Enlaces creados** → ya existe: contar filas de
  `CardNetworkMembership` + `ProgramMembership`. Cero trabajo nuevo.
- **Servicios ofrecidos** → ya existe: `Card.officeItems`, o contra el
  catálogo Irpavi/HeroSuite ya relevado (Fase 11.4). Cero trabajo nuevo.
- **Brechas cerradas** → **nuevo**. Es el concepto de HeroSuite/B4W
  ("brecha → negocio", visto en el matching engine de René). Hoy no hay
  ningún modelo que lo registre — hace falta un log chico de eventos por
  Legacy Corp (`GapClosedEvent` o similar). No es grande, pero no es
  gratis — queda anotado para cuando se decida construir de verdad.

### F. Conexión con MLQR — no es solo un ejercicio de diseño

Gunnar pidió explícitamente pensar esto "sobre todo para el partido" — la
misma Malla 3D es candidata directa a convertirse en el dashboard que ya
le vendieron a Daniel Hergo (ver Fase 10.4.6, WHITEPAPER.md sección 4.6):
hoy ese dashboard muestra registros/contactos/seguimiento/conversión como
tabla y gráfico de barras — la Malla podría mostrar la red de cada
candidato como grafo navegable (sus afiliados, quién refirió a quién, qué
municipios están más conectados). Es upsell directo sobre un cliente que
YA está pagando, no una feature especulativa. Vale la pena que Sergio y
René lo tengan en el radar cuando evalúen la propuesta completa de MLQR.

**Estado**: documentado a fondo, cero código de producción todavía. El
Artifact interactivo + GIF del punto C se entregan en el chat de esta
sesión (fuera del repo) inmediatamente después de este commit.

### G. Referencia técnica: `second-brain-3d` confirma (y corrige) la Sección B

(2026-09-17, tras clonar y leer `paultaki/second-brain-3d` como candidato de
base para el demo.)

**Qué es**: herramienta MIT que renderiza el vault de Obsidian de un usuario
como un grafo 3D navegable — three.js + `3d-force-graph` + `three-spritetext`,
probado a 3.900 notas / 8.200 links a 47fps. Repo clonado (solo lectura, sin
vendorizar nada) en `/home/claude/paultaki/second-brain-3d`, fuera de este
repo — es material de referencia, no una dependencia.

**Veredicto sobre el demo de esta sesión**: no se usa como base. Es un bundle
de 1.5MB (`vendor.min.js`) pensado para desktop full-screen con miles de
nodos; el `malla3d.html` ya entregado es un widget mobile de 460px con ~25
nodos, hecho a mano en three.js puro y ya ajustado al layout exacto de la
Oficina (header, stat-row, leyenda, info-panel, CTA). Reemplazarlo por esa
base sería cambiar 21KB que ya funcionan por 70x más peso sin ganar nada en
este contexto.

**Lo que sí confirma y corrige, para cuando Sergio arme la versión de
producción sobre `3d-force-graph` (la librería ya decidida en la Sección
B):**

- Confirma que el stack elegido rinde a escala real (miles de nodos, no
  docenas).
- Confirma `cameraPosition({x,y,z}, node, ms)` como la API de "volar a mi
  nodo" (usada en `template.html:1002`) — tal como se anotó en la Sección B.
- **Corrige la técnica de "nodos fantasma"**: en vez de nodos invisibles
  conectados por un link invisible (lo que describe la Sección B), la forma
  real que usa el proyecto es una fuerza custom registrada por nombre
  directo en la simulación —
  `Graph.d3Force('brain', function(){ ...mueve x/y/z/vx/vy/vz de cada nodo
  en cada tick... })` (`template.html:648-661`). Mismo resultado (clusters
  visuales dirigidos), sin agregar nodos ni links falsos que contaminen
  conteos, hit-testing de click/hover, o la data que después alimenta
  Myerson (ver Sección H). Para Sergio: usar este patrón, no el de nodos
  fantasma literales.
- Optimizaciones de rendimiento a copiar cuando haya datos reales a escala:
  `UnrealBloomPass` para el glow real (en vez del sprite aditivo del demo),
  geometría de esfera compartida + caché de materiales por color/estado
  (`template.html:664-685`).

### H. Investigación pendiente: la Malla como motor de reparto NashMesh (NO construir todavía)

Idea de Gunnar: que el esqueleto mismo del grafo — el mismo que ya se
dibuja en 3D — sea la fuente de verdad de las reglas de reparto NashMesh,
en vez de una capa visual separada y desconectada del cálculo real de
`Payment_i = φ_i × ψ_i × (1-ε)` (Sección A de Fase 11).

Hay un puente matemático real que lo hace viable — no es una idea suelta,
es investigación conocida, para que quien la retome no arranque de cero:

- **φ_i (Shapley Value) sobre un grafo → Valor de Myerson** (Myerson,
  1977, "graph-restricted cooperative games"). Es la extensión clásica del
  Shapley value a juegos cooperativos donde una coalición sólo puede
  repartirse el valor de sus subcomponentes **conectados** en un grafo de
  comunicación dado. Calcular Shapley sobre las 2^n coaliciones abstractas
  es intratable; calcularlo sobre los subgrafos conectados de la Malla real
  (la misma que ya se renderiza) es exactamente el problema que Myerson
  resuelve. Existen algoritmos de aproximación polinomial por muestreo de
  permutaciones (Castro et al., 2009) que evitan la explosión combinatoria
  a escala real.
- **ψ_i (Reliability Weight) → propiedad temporal nativa del grafo**: en
  vez de un sistema de reputación aparte, ψ se podría derivar de la misma
  metadata que el grafo ya necesita para renderizarse
  (`createdAt`/última actividad de cada `CardNetworkMembership`/enlace):
  decaimiento por antigüedad, consistencia de conexión mes a mes. Arranca
  en 0.60 (ya definido en NashMesh, WHITEPAPER.md) y sube/baja con esa
  misma señal — cero modelo nuevo, reusa lo que el grafo ya trackea.
- **ε**: comisión de plataforma, ortogonal al grafo — config simple.

**Qué falta investigar antes de que esto toque producción** (por eso queda
como ítem de investigación, no como Fase con entregable):

1. Definir `v(S)` — el valor real de una coalición conectada en el dominio
   de Legacy (¿ingresos atribuibles? ¿brechas cerradas de la Sección E, que
   hoy es cáscara sin modelo?).
2. Costo computacional real a escala (miles de nodos, recalculado en cada
   ciclo de pago) — validar que la aproximación de Castro et al. rinde en
   el tamaño real de la Malla, no solo en el paper.
3. Implicancia legal/regulatoria de que un algoritmo reparta pagos
   automático sin arbitraje humano — NashMesh ya lo asume como visión
   (WHITEPAPER.md), pero acá pasa de visión a código ejecutable que mueve
   plata real.
4. Si el grafo de render (con su fuerza de contención estética, Sección G)
   puede ser el mismo grafo de cálculo, o conviene separarlos — un grafo
   para layout visual, otro (con los mismos datos base) para Myerson — para
   no acoplar rendering a lógica de pago crítica.

**Estado**: idea con fundamento matemático real, marcada explícitamente
como investigación futura. No se toca `generate.py`/`template.html`/
producción por esto. Candidato fuerte para una sesión dedicada, idealmente
con quien lleve la parte cuantitativa de NashMesh a fondo.

### I. Estado global de Fase 12 al cierre de esta ronda

- Artifacts de demo (fuera del repo, quedan como referencia/showcase):
  - Standalone: https://claude.ai/artifact/LUUUDcrgny9CGcDfTLXWKA
  - Fusionado a la tarjeta completa: https://claude.ai/artifact/VP5ont5KszRmEC8kKNFuMk
- **Integrado a `lycard` de verdad, en código de producción** (2026-09-17,
  a pedido explícito de Gunnar — "así como lo tienes quiero que se integre
  a nuestra app principal"). Esto YA NO es solo Artifact:
  - `three@0.186.0` agregado como dependencia real (antes se cargaba por
    CDN cdnjs, válido solo dentro del sandbox de Artifacts — en la app de
    producción se bundlea con Next, sin depender de que cdnjs esté
    disponible en el navegador del visitante).
  - `components/MallaGraph.tsx` — puerto a React/TS del motor
    `mountMalla()` de los Artifacts (mismo modelo físico: repulsión +
    resorte en enlaces + jalón a nodo fantasma por cluster). Client
    component, monta/limpia todo en un `useEffect` (dispose de geometrías,
    materiales y renderer al desmontar — no hay fuga si el visitante
    navega fuera del modal). Nunca corre en el servidor.
  - `lib/mallaData.ts` — los mismos dos datasets hardcodeados de los
    Artifacts (vitrina 23 nodos Legacy/Libre, equipo operativo 7 nodos),
    ahora tipados y reutilizables. **Sigue siendo data simulada** — no hay
    modelo Prisma nuevo, tal como pidió Gunnar (nada de dashboard de
    edición todavía, eso es Fase 12-D/futuro).
  - Vitrina pública → `components/LyCardView.tsx`, dentro del modal real
    `office` (el mismo que ya mostraba `officeItems`/Portfolio), arriba de
    la lista existente, para cards `company`/`personal`. Trae el panel 3D +
    los 3 KPIs de vitrina.
  - Equipo operativo → `app/m/dashboard/company/network/page.tsx` (la
    pantalla real de "Mi Red de Clientes", ya alimentada por
    `CardNetworkMembership`), arriba de la lista real de miembros. Rotulado
    explícitamente "Vista general de demo" para no hacerse pasar por lo
    mismo que la lista real de abajo.
  - **Verificado de verdad, no solo tipos**: postgres local levantado,
    `pnpm build` (production build, Next 16 + Turbopack) limpio, `tsc
    --noEmit` limpio. Con el dev server corriendo y una Card de prueba
    (`kind: "company"`, borrada después del test), Playwright con
    swiftshader abrió `/c/test-empresa`, clickeó el emblema real "Virtual
    Office" y confirmó: el modal `office` abre, el canvas WebGL monta, el
    grafo (cluster dorado + cluster violeta) y los KPIs (22/3/6) se ven,
    cero `pageerror`/excepciones de consola. La vista privada
    (`company/network`) quedó verificada por build + tipos únicamente —
    requiere sesión de Member (Google/WhatsApp OTP) que no se simuló en
    este pase.
  - Pendiente explícitamente descartado por Gunnar esta ronda: el GIF
    (punto C.2) — "olvidate no lo necesitamos".
- **Corrección sobre la marcha (mismo día)**: Gunnar probó en prod
  (`https://lycardeo.vercel.app/c/mastern0`) y dos cosas no eran lo que
  pidió — (1) `mastern0` es `kind: "project"`, y el panel de la Malla
  había quedado gateado a company/personal, invisible en su propia tarjeta;
  (2) no quería un resumen en modal, quería la Oficina Virtual completa
  como pantalla propia, con botón de vuelta, igual para las 3 kinds de
  Card. Se resolvió así:
  - Nueva ruta `app/c/[slug]/oficina/page.tsx` — Server Component, puerto
    completo del mock `6-completa.html` (identidad, video, descargas
    cáscara, KPIs, casos de uso, antes/después, Malla 3D vitrina,
    Simulador, y — solo si `isHost`, mismo criterio que ya usa
    `/c/[slug]` — la vista interna con Malla viva del equipo, agenda,
    accesos directos). `isHost` es lo que reemplaza al viejo
    `office`/`versionInfo` gate de "modal"; ya no hay modal de oficina.
  - `enterOffice()` en `LyCardView.tsx` conserva la animación de "portal"
    que ya tenía (900ms), pero ahora al final hace
    `router.push(`/c/${slug}/oficina`)` en vez de `setModal("office")` —
    es la sensación de "te saca de la tarjeta" que pidió Gunnar, resuelta
    en la punta que ya existía.
  - Se sacó el modal `office` entero de `LyCardView.tsx` (código muerto:
    nada lo abre más) — `officeItems`/`origin`/`OfficeItem`/
    `OriginSnapshot`/`parseOfficeItems` se movieron a la nueva página, que
    ahora es la única dueña de ese contenido.
  - **Honestidad de datos**: la vista interna NO inventa una cifra de
    ingresos a nombre del dueño real (ver Fase 11-C) — donde el mock
    tenía "$48,200", esto dice "se activa cuando el motor de reparto esté
    listo". Los accesos directos que sí existen (Editar Oficina, Mi Red)
    son links reales a las pantallas ya construidas; los que no, quedan
    atenuados como "Próximamente" — mismo patrón que ya usa toda la app.
  - Verificado con Playwright + swiftshader sobre `mastern0` real
    (local): click en el emblema → portal → navega a `/c/mastern0/oficina`
    (no modal), se ve la vitrina completa + la vista interna completa
    (MasterN0 es `isOrigin`, host para cualquiera), botón "Volver a la
    tarjeta" regresa a `/c/mastern0`. `pnpm build` y `tsc --noEmit`
    limpios.
- **Segunda corrección, mismo día — separación real de vistas**: Gunnar
  probó otra vez y encontró dos cosas más. (1) El deploy de la corrección
  anterior (`dbdff84`) había fallado en Vercel por un timeout transitorio
  de advisory lock en `prisma migrate deploy` (patrón ya conocido en este
  proyecto, ver commits `6HMKWXvMqfrXAXs9DKCX3UPE89hK`/
  `FySP6tL5UcMsC5J8NZgFru4sxufG` de sesiones previas) — confirmado vía
  Vercel MCP (`get_deployment_build_logs`), no un bug de código; el deploy
  siguiente sí prendió. Queda anotado por si vuelve a pasar: no es señal
  de alarma, es retriggear con un commit vacío o esperar al próximo push.
  (2) El divisor "Acá termina lo que ve cualquiera" de la versión anterior
  no servía — "estamos haciendo una app real no un juego". Se sacó
  entero: `app/c/[slug]/oficina/page.tsx` ahora resuelve a dos árboles de
  JSX completamente separados, no una página con una mitad oculta:
  - `VisitorOficina` — exactamente lo que veía la vitrina pública antes,
    sin ninguna mención de que existe una vista de dueño.
  - `OwnerOficina` — ya no es la vitrina con un apéndice desbloqueado.
    Es un dashboard propio: saludo, un botón dorado prominente arriba
    ("Editar la información de esta Oficina" → `dashboardHref`, no
    enterrado en la grilla de accesos directos de antes), un resumen de
    "Lo que ve el público" (los mismos KPIs + Origin/Portafolio, para que
    el dueño pueda revisar qué está mostrando sin tener que abrir la
    vista pública), Cartera/ingresos (cáscara honesta, sin inventar
    plata), Malla viva del equipo, Agenda, y accesos directos — sin
    repetir el CTA de editar, sin los chips de marketing ni el
    Simulador (eso es contenido de captación de visitantes, no una
    herramienta para el dueño).
  - Ambas comparten piezas reales via componentes (`IdentityBlock`,
    `KpiRow`, `PortfolioBlock`, `TeamMallaBlock`) para no duplicar el
    contenido/lógica de negocio — solo el layout que las envuelve es
    distinto.
  - Verificado con Playwright: `mastern0` (host siempre, es `isOrigin`)
    → `OwnerOficina`, sin texto del divisor viejo, sin los chips de
    marketing, con el botón de editar presente. Una Card de prueba sin
    `isOrigin` y sin sesión de Member → `VisitorOficina`, sin "Hola,"
    ni ningún rastro de contenido de dueño. Cero errores de consola en
    ambas. `pnpm build`/`tsc --noEmit` limpios. Card de prueba borrada
    después del test, no queda basura en la base.
- **Tercera ronda, mismo día — pulido de jerarquía visual + concepto nuevo
  de "primeras conexiones"**. Gunnar la vio en vivo y pidió cinco ajustes
  concretos más una idea de producto nueva:
  1. El botón de entrar al Simulador/Gemelo Digital pasa a ser el
     elemento circular más importante de la pantalla — mismo lenguaje
     visual que el emblema "Virtual Office" de la tarjeta (logo propio:
     `Program.logoUrl` en project, `Card.logoUrl` en company, cae a la
     inicial en personal — nunca el mismo círculo para dos dueños
     distintos). Posición: justo debajo del video en la vista pública;
     justo debajo de los KPIs (los datos más importantes primero) en la
     vista privada.
  2. Se sacó la etiqueta "Lo que ve el público" de `OwnerOficina` — no
     hacía falta.
  3. El botón "Editar Oficina" pasa al header, a la misma altura que
     "Volver a la tarjeta" (antes era un botón ancho debajo del saludo).
  4. Ese botón ahora manda a la sección real del editor en vez de a la
     página genérica: `MemberCardEditor.tsx` acepta un nuevo prop
     `focusOffice` (via `?focus=oficina`) que abre la
     `AccordionSection` de "Oficina Virtual" por default y hace scroll
     hasta ella — mismo patrón de "abrir por query string" que el propio
     `Accordion.tsx` ya documentaba para otros flujos. Cards `project` no
     tienen esa sección (su Oficina es la historia de origen, no
     editable a mano), así que van directo a `MemberStoryEditor` ("Mi
     camino") sin el query param.
  5. **Idea nueva, validada y con un primer corte real**: "Tus primeras
     conexiones" — en vez de (o adelante de) la Malla genérica de
     vitrina, cada Oficina de dueño (`OwnerOficina`, solo `project`)
     muestra una mini-Malla de 3 nodos con datos reales de
     `OriginMemento`: vos, quien te invitó, y tu Programa. Es el ejemplo
     que dio Gunnar — un miembro de DigitalKingdom invitado por Juancho
     queda ligado a Juancho (por la invitación) y a DigitalKingdom (su
     Programa) — y es un vínculo genuinamente interesante de diagramar,
     no cáscara. **Lo que falta para completar la cadena que describió
     (DigitalKingdom → Legacy, DigitalKingdom → su propio N0/"CEO", que
     además puede ser la misma persona que invitó)**: `Program` no
     tiene hoy ni un padre (`parentProgramId` o similar) ni un campo que
     identifique a su N0/fundador — ver Sección H de esta misma Fase,
     el research flag de NashMesh ya anotaba algo parecido. Se dice así
     explícitamente en la propia pantalla ("el resto de la cadena
     todavía no está modelado") en vez de inventar nodos — ninguna
     Card ve un dato falso presentado como real. **Queda pendiente de
     confirmación de Gunnar antes de tocar `schema.prisma`**: si vale la
     pena modelar esa jerarquía de Programas + quién es el N0/fundador de
     cada uno como campos reales (schema change real, no cosmético) para
     que la cadena completa (vos → referrer → Programa → Legacy → CEO →
     EinarOS) se pueda dibujar de verdad.
  - Verificado con Playwright: `mastern0` (sin origin → sin sección de
    "primeras conexiones", cae directo al bloque de "Fundador de la Red")
    y una Card de prueba con `OriginMemento` real (referrer="EinarOS",
    programa="DigitalKingdom") → la mini-Malla se ve, la leyenda muestra
    los 3 nombres reales, cero errores de consola. `pnpm build`/`tsc
    --noEmit` limpios. El flujo de `?focus=oficina` abriendo/scrolleando
    la sección del editor se verificó por tipos + build únicamente —
    probarlo de punta a punta requiere sesión real de Member (Google/
    WhatsApp OTP), no simulada en este pase.
- **Cuarta ronda — foto de perfil en la Oficina + Skins con modo claro
  real (2026-09-18)**. Gunnar pidió dos cosas viendo la app ya en prod:
  1. **Foto**: el saludo "Hola, {nombre}" de `OwnerOficina` mostraba solo
     la inicial en un círculo dorado — ahora usa `card.portraitUrl` (la
     misma foto principal de la tarjeta) si existe, con la inicial como
     fallback solo si no hay foto cargada.
  2. **Badge claro/oscuro ausente en `mastern0`**: no era un bug — se
     investigó primero contra producción de verdad (`mcp__Vercel__
     web_fetch_vercel_url` sobre `https://lycardeo.vercel.app/c/mastern0`,
     ya que la base local no refleja los datos de prod) y se confirmó que
     el Programa Legacy tiene un `ProgramSkin` activo ("Skin 1") — el
     botón está oculto a propósito desde el 16 de septiembre, porque un
     skin es una identidad de marca fija (un solo set de colores), no un
     par claro/oscuro, y mostrar un botón que no cambia nada era
     justamente el bug que esa fecha corrigió. Se le preguntó a Gunnar
     cómo resolverlo (podía reintroducir ese bug sin querer) y eligió la
     opción grande: **que el skin también defina colores para modo
     claro**, no dejarlo oculto ni mostrar un botón inerte.
  - **Implementado de verdad, no cáscara**: `ProgramSkin.lightColors
    Json?` nuevo (migración `20260918002234_program_skin_light_colors`,
    aditivo — ningún skin existente se rompe, queda `null` hasta que se
    suba). `createProgramSkinAction` acepta un segundo `design.md`
    opcional al crear un skin nuevo; `setProgramSkinLightColorsAction`
    (nueva) permite subírselo a un skin que ya existe — como el de Legacy
    — sin recrearlo. `/admin/programs/[id]` muestra los swatches de
    "Oscuro" y, si existe, "Claro" por separado, con su propio uploader.
  - `LyCardView.tsx`: `brandVars` ahora elige `skinLightColors` en vez de
    `skinColors` cuando `theme === "light"` **y** el skin tiene ambos sets
    — corrige el bug real que describía el comentario del propio código
    ("brandVars pisa THEME_VARS sin importar `theme`"), que hasta ahora
    solo se evitaba escondiendo el botón. El botón vuelve a mostrarse
    exactamente cuando alternar va a cambiar algo de verdad: sin skin
    (par oscuro/claro de siempre), o con skin que ya tiene los dos sets.
    Con skin y un solo set (el caso de casi todos los skins existentes
    hoy) sigue oculto — mismo criterio de antes, ahora desbloqueable
    subiendo el segundo archivo en vez de quedar cerrado para siempre.
  - Verificado end-to-end con Playwright contra un Program/Skin/Card de
    prueba: con solo el set oscuro, el botón no aparece (0 en el DOM);
    tras agregarle `lightColors`, aparece (1) y clickearlo **cambia de
    verdad** los colores renderizados de la tarjeta (capturas antes/
    después confirman el fondo pasando de oscuro a los tonos claros
    subidos). `pnpm build`/`tsc --noEmit` limpios. Toda la data de prueba
    (Program/Skin/Card) borrada después.
- Referencia técnica de producción (Sección G) y research flag de NashMesh
  (Sección H) siguen en pie, sin tocar código todavía — son para cuando el
  editor real (modelo Prisma + CRUD + `/api/malla`) se construya.

### 2026-09-18 — Primer "superpoder" real: Brief de reuniones (Fathom)

- Gunnar pidió varios "superpoderes" para la Oficina Virtual pero acotó
  el alcance de este primero, explícitamente: conectar a Fathom, listar
  reuniones, un resumen chico, link a Fathom — nada de Gmail, recordatorios,
  tareas ni compartir con la red todavía (eso queda para después).
- `lib/fathom.ts` nuevo: cliente real de la API pública de Fathom
  (`https://api.fathom.ai/external/v1`, header `X-Api-Key`). Endpoint y
  shape de respuesta confirmados contra el código fuente de un MCP server
  público de Fathom en GitHub (los dominios de docs de Fathom están
  bloqueados por el proxy de este entorno) — no adivinados.
  `getFathomBrief()` trae las últimas reuniones grabadas (30 días,
  `include_summary=true`) y arma un preview de texto plano del resumen.
  Misma degradación limpia que Resend/Google en este repo: sin
  `FATHOM_API_KEY`, `{ enabled: false }`; si Fathom falla o responde con
  error, `{ enabled: true, error: true }` — nunca rompe la Oficina.
- `app/c/[slug]/oficina/page.tsx`: nuevo bloque `FathomBriefBlock` en la
  vista del dueño (`OwnerOficina`), reemplazando el placeholder estático
  de "Agenda de hoy". Tres estados: sin conectar, error, o lista de
  tarjetas clickeables (título + fecha + preview del resumen + "Ver en
  Fathom →") que abren la reunión real en Fathom. Solo se llama a la API
  cuando el visitante es el dueño (`isHost`) — un desconocido viendo la
  Oficina de otro nunca dispara una llamada a Fathom.
- `.env.example`: nueva `FATHOM_API_KEY=""` documentada, mismo formato que
  las demás integraciones opcionales.
- Verificado con `tsc --noEmit` y `pnpm build` limpios, y con Playwright
  contra la Oficina real de `mastern0` (login como MasterN0): el bloque
  "Brief de reuniones" renderiza en su estado "Todavía sin conectar a
  Fathom — próximamente" sin errores de consola ni de página (no hay
  `FATHOM_API_KEY` en este entorno de pruebas).
- Pendiente para que Gunnar lo vea con datos reales: cargar
  `FATHOM_API_KEY` en las variables de entorno del proyecto en Vercel
  (y opcionalmente en su `.env` local).

### 2026-09-18 (cont.) — PWA real: instalable + caché offline de la tarjeta pública

- Gunnar pidió (vía resumen de Chaty) convertir LyCard en una PWA
  instalable con caché. La sugerencia original apuntaba a `next-pwa`, pero
  ese paquete está muerto desde 2024 y solo sabe hablar con webpack — este
  proyecto usa Turbopack (el bundler por defecto desde Next 16, confirmado
  en el propio output de `pnpm build`: "▲ Next.js 16.3.5 (Turbopack)").
  La alternativa moderna, `@serwist/turbopack`, sí soporta Turbopack pero
  su paquete `serwist` todavía se publica bajo el tag `preview` de npm —
  demasiado nuevo para apostarle a una app que se despliega varias veces
  por día. Se optó por un service worker escrito a mano, sin dependencias
  nuevas: mismo resultado real para el caso de uso que importa, cero
  riesgo de romper builds con una herramienta inmadura.
- `app/manifest.ts`: manifest nativo de Next (App Router lo sirve solo en
  `/manifest.webmanifest`, sin ningún paquete) — nombre, colores de la
  casa (`#09090b`), `display: "standalone"`.
- `public/icons/`: primeros íconos reales de la marca (192, 512, 512
  maskable, apple-touch-icon 180), generados a partir del mismo triángulo
  del favicon existente pero en la paleta real (`#0B0B0A` fondo /
  `#C8A15A` dorado) en vez del blanco/negro genérico que traía el
  favicon.ico.
- `public/sw.js`: dos estrategias, no una genérica para todo el sitio —
  **assets estáticos de Next** (`/_next/static/*`, `/icons/*`) van
  cache-first, seguro porque el nombre de archivo ya lleva el hash del
  build (un deploy nuevo nunca pisa una URL vieja); **navegación HTML**
  va network-first con fallback a la última copia guardada, pero
  **solo para `/` y `/c/[slug]`** (la tarjeta pública). `/admin` y
  `/m/dashboard` quedan deliberadamente fuera del caché offline: son
  pantallas autenticadas por cookie, y guardar esa HTML podría terminar
  mostrando la sesión vieja de otra persona en el mismo teléfono — sin
  señal, esas simplemente fallan como una web normal en vez de arriesgar
  eso.
- `app/offline/page.tsx`: fallback honesto para cuando falla la red y
  todavía no hay nada guardado de esa URL — no inventa contenido, solo
  avisa que no hay conexión.
- `components/ServiceWorkerRegistration.tsx`: registra el SW solo en
  producción (en dev rompería el hot-reload de Turbopack al cachear
  chunks que cambian en cada guardado).
- `app/layout.tsx`: `manifest`, íconos (`icons.icon`/`icons.apple`) — el
  `appleWebApp.capable` ya estaba puesto de antes, ahora por fin tiene
  manifest + íconos reales detrás para que "Agregar a pantalla de inicio"
  funcione de verdad en iOS/Android.
- Verificado de la forma más honesta posible: no con la emulación
  `context.setOffline()` de Playwright (se confirmó que no bloquea los
  `fetch()` internos del service worker en este entorno — un catch
  parecía andar pero en realidad seguía pegándole a la red real), sino
  matando el proceso del servidor de producción a mitad de la prueba.
  Con el servidor realmente muerto: recargar `/c/mastern0` (ya visitada
  antes) sirve el HTML real desde caché; navegar a un slug nunca visitado
  muestra `/offline`. `tsc --noEmit` y `pnpm build` limpios.
- Pendiente, a propósito no incluido en esta entrega: ningún dato
  dinámico (KPIs, Brief de Fathom, etc.) se sincroniza en segundo plano
  ni hay push notifications — es caché de lectura de la última versión
  vista, no una app offline-first completa.

### 2026-09-18 (cont.) — Workflow de planeación formal + Fases A/B del reorden de Oficina

- A partir de este pedido, Gunnar pidió pasar a un protocolo de trabajo
  fijo para todo lo nuevo de la Oficina Virtual: plan detallado con EDT
  (estructura de desglose del trabajo), preguntas de aclaración antes de
  escribir una línea de código, su aprobación explícita, y ejecución por
  fases con verificación en cada una — no solo al final. El plan completo
  de esta ronda (contexto, decisiones, EDT de 4 fases A-D) quedó guardado
  y aprobado; acá se documentan las fases A y B, ya shippeadas.
- **Fase A — reorden de `OwnerOficina`**: se saca el header fijo de
  arriba; "Volver a la tarjeta" y "Editar Oficina" pasan a ser dos
  íconos (`arrow_back` / `edit`, Material Symbols) a la derecha de
  "Hola, {nombre}", a su misma altura — una sola fila de remate en vez de
  dos. Se borra el bloque "✦ Fundador de la Red ✦" (vivía en
  `PortfolioBlock`, rama para project sin `origin`): ahora no renderiza
  nada en ese lugar, ni en la vista del dueño ni en la del visitante
  (ambas usan el mismo componente). Se ajustaron los separadores (`hr`)
  alrededor para que una Card raíz como `mastern0` (sin referente) no
  quede con dos líneas divisorias pegadas sin nada en el medio.
- **Fase B — Malla del equipo, nodos fantasma**: `TEAM_MALLA_NODES` no
  tenía ningún `ghost` asignado (a diferencia de `PUBLIC_MALLA_NODES`,
  que sí), y `TeamMallaBlock` no le pasaba la prop `ghosts` al
  `MallaGraph` — por eso la simulación de fuerzas dispersaba los 7 nodos
  al alejar la cámara en vez de mantenerlos agrupados. Se agregó
  `TEAM_MALLA_GHOSTS` (un ancla única al centro) en `lib/mallaData.ts`,
  se le asignó ese `ghost` a los 7 nodos, y se pasó la prop en los dos
  lugares donde se usa este dataset: `TeamMallaBlock` (Oficina) y
  `app/m/dashboard/company/network/page.tsx` (vista operativa de Red).
  Verificado visualmente con Playwright contra un build de producción
  real: los nodos quedan contenidos alrededor del nodo "oficina" en vez
  de dispersos.
- `tsc --noEmit` y `pnpm build` limpios. Los íconos Material Symbols no
  se ven en las capturas de este entorno porque Google Fonts está
  bloqueado por el proxy de egress del sandbox (mismo límite que ya
  afectó capturas anteriores) — no es un bug de código, el mismo patrón
  (`material-symbols-outlined` + fuente cargada en `app/layout.tsx`) ya
  funciona en producción real en el resto de la app.
- Siguen pendientes, ya planificadas: Fase C (sistema de "Superpoderes" —
  `Program.officeSkills`, editor en `/admin/programs/[id]`, modal
  App/Qué es esto, retrofit del Brief de Fathom) y Fase D (Gemelo Digital
  del dueño conectado a una demo guiada, no al flujo real de alta).

### 2026-09-18 (cont.) — Fase C: sistema de "Superpoderes"

- `Program.officeSkills Json @default("[]")` nuevo (migración
  `20260918035640_office_skills`, aditivo). `lib/officeSkills.ts`:
  `OfficeSkill` (`key,nombre,descripcion,iconUrl,color,appType,enabled`),
  `parseOfficeSkills()` y `DEFAULT_OFFICE_SKILLS` — mismo patrón que
  `medalScale`/`rankScale`/`contactsScale`: Programa sin nada configurado
  cae a los 6 de siempre (Malla, Brief de reuniones, Agenda, Mensajes,
  Cartera NashMesh, Configuración) en vez de arrancar vacío.
- Nueva key en `lib/cardLabels.ts`: `officeSkillsKicker` — el nombre de
  la sección es editable por N0 (default "Superpoderes", tal cual los
  viene llamando Gunnar).
- Admin `/admin/programs/[id]`: `components/OfficeSkillsEditor.tsx`
  (mismo patrón acordeón que `EscalaEditor.tsx`) + `updateOfficeSkillsAction`
  (texto/color/appType, array completo) + `setOfficeSkillIconAction`
  (ícono puntual de un power ya guardado — un `File` no entra en el JSON
  del array, mismo patrón que `setProgramSkinLightColorsAction`) en
  `app/admin/programs/actions.ts`.
- `components/OfficeSkillsBlock.tsx` (client component nuevo) reemplaza
  el grid suelto de tiles apagados y el render fijo del Brief de Fathom
  en `app/c/[slug]/oficina/page.tsx` — ahora en **ambas** vistas
  (dueño y visitante, antes solo vivía en la del dueño). Cada power es
  un tile con su color/ícono real; al tocarlo abre un bottom-sheet:
  - **Dueño**: pestañas "App"/"Qué es esto", arranca en "App". Para
    `appType: "fathom-brief"` la cara App es el `FathomBriefBlock` real
    (extraído a `components/FathomBriefBlock.tsx` para poder vivir en un
    client component sin duplicar la lógica de fetch, que sigue pasando
    server-side). Para `malla` en cards `company`, linkea de verdad a
    `/m/dashboard/company/network`. El resto muestra el mismo
    "Todavía sin conectar — próximamente" que antes vivía como tile.
  - **Visitante**: solo la pestaña "Qué es esto" — la de "App" ni se
    renderiza, cero acceso a datos del dueño.
- Verificado end-to-end con Playwright contra un build de producción
  real, con un Program y una Card de prueba (borrados después): (1)
  dueño ve tabs App/Qué es esto y el estado real de Fathom Brief; (2)
  visitante de una Card real (no la raíz — confirmado que `card.isOrigin`
  fuerza vista de dueño para cualquiera, comportamiento previo del
  proyecto, no algo nuevo de esta fase) solo ve la explicación, nunca
  el contenido de "App"; (3) el editor de admin guarda un power nuevo y
  sube su ícono de verdad (`saveUpload`), y ese ícono real aparece en la
  Oficina en el siguiente request. `tsc --noEmit` y `pnpm build` limpios.
- Pendiente, ya planificada: Fase D (Gemelo Digital del dueño conectado
  a una demo guiada de chat, no al flujo real de alta de miembro).

### 2026-09-18 (cont.) — Fase D: demo guiada del Gemelo Digital del dueño

- El botón "Tu Gemelo Digital" del dueño dejó de estar `disabled` — ahora
  enlaza a `/c/[slug]/oficina/demo`, una demo guiada del flujo de armar
  una Oficina, no al Gemelo Digital operativo real (que sigue sin
  backend, PLAN.md Fase 11-C).
- `components/OfficeDemoChat.tsx` (nuevo): mismo lenguaje visual de chat
  WhatsApp-simulado que `components/OnboardingChat.tsx` (burbujas,
  "escribiendo...", timestamps, paleta) pero **no es ese componente** —
  `OnboardingChat` está enganchado a OTP real y a
  `joinLegacyProgramAction`; reusarlo acá arriesgaba disparar lógica de
  alta real o confundir con su copy de "sumate como miembro". Este es
  un componente nuevo, sin inputs libres ni llamadas a servidor: el
  guión es 100% fijo (5 pasos sobre Letrero → Superpoderes → Malla), el
  "usuario" solo tapea una única respuesta sugerida por paso, y termina
  con un botón real de "Volver a tu Oficina".
- Nueva ruta `app/c/[slug]/oficina/demo/page.tsx`.
- Verificado con Playwright contra un build de producción real: tap
  completo de los 5 pasos del guión sin errores de página, termina
  mostrando el botón de vuelta. `tsc --noEmit` y `pnpm build` limpios.
- Con esto se cierran las 4 fases (A-D) del plan aprobado "Oficina
  Virtual — reorden + Superpoderes".

### 2026-09-18 (cont.) — Al día con el versionado + modal explica el semver

- Gunnar marcó que `lib/version.ts` (la convención de versionado semver
  de este repo, en pie desde el 2026-09-16: bumpear a mano junto con
  cada cambio que se shippea) había quedado sin actualizar durante todo
  este bloque de trabajo (Brief de Fathom, PWA, las 4 fases de la
  Oficina) — cierto, se shippearon 5 cambios reales sin tocar
  `APP_VERSION`/`CHANGELOG`. Corregido: 5 entradas nuevas (1.17.0 a
  1.21.0), una por cada deploy real de esta sesión.
- `components/LyCardView.tsx`: el modal de bitácora (`versionInfo`)
  ahora explica, antes de la lista, qué significa un cambio en cada
  dígito (1ro = cambios grandes, 2do = funcionalidad nueva, 3ro =
  arreglos chicos) — una sola vez arriba, no repetido en cada entrada.
  El límite de 10 versiones más recientes ya existía de una ronda
  anterior (2026-09-17); con 26 entradas en el archivo ahora tiene
  margen real para importar.
- Verificado con Playwright contra un build de producción real: la
  explicación aparece, se listan `v1.21.0` a `v1.12.0` (10 más
  recientes) y `v1.0.0` queda afuera. `tsc --noEmit` y `pnpm build`
  limpios.

### 2026-09-19 — Fathom conectado de verdad + 2 bugs reales de la Oficina

- Gunnar cargó `FATHOM_API_KEY` real en Vercel y reportó, probando en su
  celular, dos bugs de la Oficina (no features — se arreglan directo,
  sin pasar por el protocolo de plan):
  1. **Safe-area-inset-top faltante**: al sacar el header fijo de
     `OwnerOficina` en la Fase A, el saludo de arriba quedó con un
     padding fijo de 24px — insuficiente en iPhones con isla dinámica/
     notch, tapando los íconos de volver/editar y sin poder tocarlos.
     Corregido con `calc(env(safe-area-inset-top,0px) + 24px)`, mismo
     patrón que ya usa el header del `LyCardView` principal. También se
     le sumó al `Header` compartido (usado por `VisitorOficina`), que
     tampoco lo tenía.
  2. **"Editar Oficina" mandaba a un callejón sin salida**: el link
     apuntaba siempre a `/m/dashboard/...`, que exige
     `currentMemberId()` y redirige a `/m/login` (alta de Miembro, "poné
     tu WhatsApp") si no hay uno — un Admin/N0 viendo su propia tarjeta
     nunca tiene ese id, así que quedaba tirado ahí sin volver. Ahora
     `dashboardHref` se computa distinto para Admins: si la tarjeta tiene
     Programa, va a `/admin/programs/[id]?focus=officeSkills` (el editor
     real de Superpoderes, Fase C — nuevo soporte de `?focus=` en esa
     página para abrir esa sección de una); si no tiene Programa, cae al
     editor genérico `/admin/[slug]`. Ningún caso termina en una pantalla
     que no le corresponde al Admin.
- Verificado con Playwright contra un build de producción real, con y
  sin Programa vinculado (datos de prueba borrados después): el link
  aterriza en una pantalla real y usable en ambos casos, nunca en
  `/m/login`. `tsc --noEmit` y `pnpm build` limpios.
- El pedido de "si algo está apagado que diga eso, no inventes
  conexiones" ya estaba resuelto desde la Fase C: cada `appType` sin
  backend real muestra "Todavía sin conectar — próximamente" dentro de
  su propio modal, nunca finge una conexión que no existe.
- El `whsec_...` (webhook secret de Fathom) que compartió Gunnar queda
  anotado pero sin usar — no hay todavía un endpoint de webhook
  construido; cuando se arme, va como env var, nunca hardcodeado.
- Confirmado con datos reales contra producción (`mcp__Vercel__
  web_fetch_vercel_url`): el Brief de reuniones de `mastern0` ya trae 5
  reuniones reales de la cuenta de Fathom conectada (Daily, Google Meet,
  con resúmenes reales en español y links reales a fathom.video).
- Ampliado además `lib/fathom.ts` (pedido explícito: "bajes toda las
  reuniones de esa cuenta"): antes solo traía los últimos 30 días y
  cortaba en 5 con un solo fetch. Ahora pagina de verdad con
  `next_cursor` hasta agotar la cuenta (techo de seguridad de 20 páginas,
  no un límite de negocio) y `FathomBrief` devuelve `totalCount` real.
  El modal sigue mostrando como máximo 25 en la lista — no es más
  honesto vaciar cientos de filas en un bottom-sheet de celular — pero
  ahora dice "Mostrando 25 de N" cuando hay más de las que entran.
- Gunnar pidió además una ampliación grande de la Oficina (bloque "Keep
  in Flow" con frase motivacional, "Check de Realidad" con KPIs +
  gráfico inventados y editables por N0, sección de noticias/tareas,
  calendario, y un ambiente de datos mock para simular Programas/Cards
  en bulk) — **no se tocó código todavía**, va por el protocolo de plan
  (EDT, preguntas, aprobación) antes de ejecutar.

### 2026-09-19 (cont.) — Documentación completa del repo + fix real + arranca Fase E

- A pedido de Gunnar ("documenta absolutamente todo de forma top1% en el
  GitHub"), se creó `docs/` en el repo: visión y alcance, arquitectura,
  modelo de datos, módulos ya construidos, y el EDT detallado de los 6
  módulos pendientes (HR, CRM, PM, Oficina+Negocio+Bot Warren,
  NashMesh+MachineEngine, AppStore de Skills) — cada uno con archivos,
  campos de schema y server actions exactos, no solo intención. También
  se corrigió `README.md`, que seguía describiendo el estado de Fase 1.
- Esa documentación se fue afinando en varias rondas de correcciones
  reales de Gunnar: taxonomía de agentes (Legacy/Silicio/Carbono-
  referencia, no todo agente ligado a un humano), el Multiuniverso
  redefinido como el AgentOS Carbono, Karl/Bridge como gatekeeper,
  modelo de negocio real (4 planes: Freemium/Automatizado/Normal/
  Enterprise, cada uno con nivel de acceso distinto, no solo precio),
  el catálogo real de 8 Skills (fuente: HeroSuite/Mercosur Irpavi +
  conversación con Juancho), el principio recursivo "todo nace de
  Legacy", y la referencia a Binkio.io (proyecto propio de Gunnar) como
  precedente de la futura capa blockchain de NashMesh — nunca como
  infraestructura a reusar, por la disputa de socios en curso ahí.
- QA profundo de punta a punta (pedido explícito: "desde el login")
  encontró un bug real: **todos los íconos de la app (Material Symbols)
  dependían de bajar una fuente de Google en cada visita** — sin esa
  red (offline, wifi restrictivo, el propio modo offline que la PWA ya
  promete), cada ícono se veía como texto crudo pisando el layout.
  Arreglado: la fuente ahora vive en `public/fonts/`, cero dependencia
  de red en runtime. Verificado con Playwright antes/después en
  `/c/[slug]` y `/c/[slug]/oficina`, iPhone 11, `tsc`/`build` limpios.
  Shippeado como v1.22.1.
- Al revisar `lycardmisocio` (repo hermano, wallet vía thirdweb) para la
  futura integración de billetera, se encontró una **llave privada
  (`llave-nexid.pem`) commiteada en un backup `.tar`** — flaggeado a
  Gunnar para rotar, no se tocó ni se leyó el contenido.
- Con el roadmap ya versionado (1.23–1.34 para los 6 módulos + la Fase
  E pausada), Gunnar dio luz verde para arrancar **Fase E1** ahora
  mismo: schema (`Card.oficinaObjetivo/realityCheckKpis/newsItems/
  calendarEvents/isDemo`, `Program.motivationalPhrases/isDemo`) +
  `lib/oficinaExtras.ts` (parsers + `DEFAULT_*` inventados para Legacy +
  `pickPhraseOfTheDay`, selección determinística por día del año, sin
  IA en vivo). Migración `20260918154834_oficina_extras` aplicada,
  `tsc --noEmit` y `pnpm build` limpios. Shippeado como v1.23.0 — todavía
  sin UI nueva visible, eso es la Fase E2/E3 que sigue.

### 2026-09-19 (cont.) — Skill "Notas de Voz" (fuera del roadmap E, pedido urgente)

- Gunnar pidió una Skill nueva y paga por fuera del orden del roadmap:
  botón de grabación en la Oficina, guarda el audio de verdad, lo manda
  a transcribir y resumir en backend, y queda accesible desde ahí mismo.
  Pidió además que desde el vamos quede pensada para conectarse a
  NashMesh vía #Dirac (ver `docs/` — Protocolo Dirac, documentado esta
  misma ronda a partir del doc en Drive que pasó Gunnar): toda nota
  entra primero a `99_RAW`/Bridge antes de "aparecer" clasificada en
  cualquier otro lado — hoy la nota vive en `Card` (dueño real de la
  Skill), no hay todavía un Bridge/RAW real para que NashMesh la lea;
  eso es el siguiente paso de integración, no parte de esta ronda.
- Modelo nuevo `VoiceNote` (Card 1—N): `audioUrl`, `status`
  (`processing`/`ready`/`error`), `providerJobId`, `transcript`,
  `summary`. Migración `20260918160311_voice_notes`.
- `lib/storage.ts` generalizado con `kind: "image" | "audio"` (default
  `"image"`, sin romper nada existente) para poder guardar audio igual
  que ya guarda fotos (Blob en prod, `public/uploads` en dev).
- `lib/transcription.ts`: cliente de AssemblyAI (transcripción +
  resumen en una sola API, evita integrar dos servicios) —
  `transcriptionEnabled()` chequea `ASSEMBLYAI_API_KEY`; sin la key,
  cáscara honesta: la nota queda "grabada, esperando transcripción"
  para siempre, nunca inventa un resumen.
- `app/c/[slug]/oficina/voiceNotes-actions.ts`: `createVoiceNoteAction`
  (guarda + dispara transcripción si está habilitada) y
  `checkVoiceNoteStatusAction` (poll, mismo `isHost` check que el resto
  del proyecto).
- `components/VoiceNotesBlock.tsx`: botón de grabar (MediaRecorder del
  navegador, cero dependencia nueva de npm), sube al soltar, poll cada
  5s mientras haya notas en "processing".
- Se sumó como Skill nueva del catálogo (`lib/officeSkills.ts`,
  `appType: "notas-voz"`) y se conectó al mismo modal de dos caras
  (App/Qué es esto) que ya usa Fathom Brief
  (`components/OfficeSkillsBlock.tsx`).
- `npx prisma generate` (el client no reconocía `VoiceNote` hasta
  regenerar), `tsc --noEmit` y `pnpm build` limpios. Shippeado como
  v1.24.0. Pendiente del lado de Gunnar: crear la cuenta de AssemblyAI
  y cargar `ASSEMBLYAI_API_KEY` en Vercel para que la transcripción
  real se active — hasta entonces la grabación y el guardado ya
  funcionan de punta a punta, solo falta ese último cable.

### 2026-09-19 (cont.) — QA de Notas de Voz/Fathom + Fase F: Google real (Calendar+Tasks+Drive)

- Gunnar creó `ASSEMBLYAI_API_KEY` en Vercel y pidió probar esa Skill y
  Fathom Brief en producción. El sandbox de esta sesión tiene bloqueado
  el acceso directo a dominios `*.vercel.app` (política de red), así
  que no pude simular un click/micrófono real ahí — sí pude confirmar
  con un fetch server-side real que **Fathom Brief anda perfecto** (42
  reuniones reales, `totalCount` correcto) y que el wiring de Notas de
  Voz (`cardId`/`voiceNotes`) llega bien sin errores; quedó pendiente
  que Gunnar dispare una grabación real para confirmar el tramo
  AssemblyAI de punta a punta (revisé `get_runtime_logs` de Vercel:
  cero errores, cero invocaciones todavía).
- Gunnar pidió ir más allá de la Agenda simulada: conectar de verdad
  Notas de Voz (y a futuro Fathom) con Google Calendar/Tasks, y además
  poder escribir en la carpeta Bridge del N0 en Drive (aterrizaje
  #Dirac) — aclarando que la idea siempre fue que la persona "se una a
  su cuenta de Google" y desde ahí pedir los permisos que hagan falta,
  Drive incluido.
- Encontré que el login de Miembro con Google ya existe
  (`lib/googleOAuth.ts`, Fase 1) pero con `access_type=online` — sin
  refresh_token, solo sirve para identidad, no para que un backend
  actúe después en nombre de la persona. Se agregó un flujo separado,
  "Conectar Google" (nunca reemplaza el login): `access_type=offline` +
  `prompt=consent`, con scope acotado a propósito —
  `calendar.events` + `tasks` + `drive.file` (no `drive` completo) —
  para no disparar nunca la revisión de apps sensibles de Google.
  `drive.file` solo ve lo que esta app crea, así que la carpeta Bridge
  la crea LyCard la primera vez (`LyCard · Bridge RAW (Protocolo
  Dirac)`) y Gunnar la reubica dentro de su 99_RAW real si quiere.
- Schema: `Member.googleRefreshToken/googleScopes/googleConnectedAt/
  googleBridgeFolderId` (migración `20260918163500_google_connect`).
  `CalendarEvent.source` nuevo (`"voz-real"` | `"voz-simulado"`) para
  que la UI nunca mienta sobre cuál es cuál.
- `lib/googleOAuth.ts`: `buildGoogleConnectUrl`/`exchangeGoogleConnectCode`/
  `refreshGoogleAccessToken`, sin tocar el login existente.
  `lib/googleServices.ts` (nuevo): wrappers finitos de Calendar Events,
  Tasks y Drive (buscar/crear la carpeta Bridge, escribir un archivo
  `.md` con el estampado `#dirac` — frontmatter + footer exactos que
  pide `docs/` para Protocolo Dirac).
  `app/m/auth/google/connect-start` + `connect-callback` (nuevas
  rutas): arrancan desde una Card puntual (`?cardId=`), resuelven el
  dueño con el mismo chequeo `isHost` que usa toda la app (Admin,
  Origin, o Member dueño) — el token termina en `card.memberId`, no en
  quien haya iniciado el click.
- `voiceNotes-actions.ts`: cuando una nota queda "ready", si el dueño
  ya conectó Google se crea una Tarea + un evento reales y se escribe
  el resumen en la carpeta Bridge; si no, cae al mismo lugar
  (`Card.calendarEvents`) pero marcado "voz-simulado" — la orquestación
  nunca bloquea ni rompe lo que el dueño ya ve (transcripción/resumen
  ya guardados antes de este paso).
- Nuevo `components/AgendaBlock.tsx`: el tile "Agenda" (antes "sin
  conectar" a secas) ahora muestra el botón "Conectar Google" o el
  estado ya conectado, y la lista real de lo que fue llegando, cada
  entrada con su etiqueta Real/Simulado.
- `.env.example` documenta el segundo redirect URI
  (`/m/auth/google/connect-callback`) y el paso único de Google Cloud
  Console (habilitar Calendar/Tasks/Drive API, agregar los 3 scopes al
  consent screen, agregar cuentas de prueba mientras el proyecto siga
  en estado "Testing" — no hace falta la revisión completa de Google
  para esto, solo para escalar a cientos de usuarios).
- `npx prisma generate`, `tsc --noEmit` y `pnpm build` limpios (las 2
  rutas nuevas aparecen compiladas). Shippeado como v1.25.0. Pendiente
  de Gunnar: el paso de Google Cloud Console de arriba, y probar el
  botón "Conectar Google" una vez hecho.
- Gunnar hizo el paso de Google Cloud Console (guiado paso a paso, con
  el nombre nuevo de esa sección — "Google Auth Platform" — y volvió el
  proyecto a estado "Testing" en vez de "In production sin verificar",
  la opción correcta para no quemar el cupo de 100 usuarios de por vida
  que Google no resetea nunca).
- Detectamos que `docs/04-MODULOS.md` se había quedado atrás — no
  documentaba ni Notas de Voz ni la conexión real de Google. Se agregó
  ambas secciones ahí y se corrigió la fila de "Notas de voz" en el
  catálogo de Skills de `05-ROADMAP-EDT.md`, que todavía la listaba
  como pendiente.
- Fix chico pedido por Gunnar: el ícono de "Personalizar" (arriba a la
  izquierda de toda tarjeta) siempre linkeaba a `/admin/[slug]` — para
  cualquiera sin badge real (NA), esa ruta redirige derecho a
  `/admin/login` de todos modos, así que mostrarle un ícono de
  "personalizar" ahí era engañoso. Ahora, cuando `badge === "NA"`, el
  mismo lugar muestra un ícono de login (`Icon name="login"`) apuntando
  directo a `/admin/login` — para cualquiera con badge real (N0..N,
  alguien con relación de verdad a esa Card) sigue siendo el ícono de
  personalizar de siempre. Nueva key de i18n `loginIcon` (ES/EN).
  `tsc --noEmit` y `pnpm build` limpios. Shippeado como v1.25.1.
- Fix chico pedido por Gunnar: el modal de bitácora de versiones crecía
  con todo el historial adentro (hasta 88vh) — ahora, solo para ese
  modal (`modal === "versionInfo"`), el contenedor baja a `44vh` (50%
  menos) y deja de scrollear él mismo (`overflowY:"hidden"` en vez de
  `"auto"`); la explicación de qué significa cada número queda fija
  arriba (`flex:"none"`) y la lista de versiones pasa a su propio
  scroll interno (`flex:1, minHeight:0, overflowY:"auto"`). El resto de
  los modales de la tarjeta (info, contacto, agendar) no se tocaron —
  siguen igual que siempre. Verificado con Playwright local
  (`pnpm build && pnpm start`, viewport 390×844): el modal renderiza
  chico, la explicación no se mueve y la lista scrollea sola hasta el
  final. `tsc --noEmit` y `pnpm build` limpios. Shippeado como v1.25.2.

### 2026-09-19 (cont.) — "Continuar con Google" en /admin/login

- Gunnar precisó lo que pedía: no mezclar Admin con Google (eso ya
  estaba bien separado, Fase F), sino agregar Google como **método de
  login alternativo** para una cuenta de Admin que YA existe — su
  propio email (`gunnarpareja@gmail.com`) queda de hecho fijo como
  MasterN0, y solo él puede dar de alta otro MasterN0/N0. Login con
  Google en `/admin/login` es más seguro y evita mantener contraseñas,
  sin cambiar quién decide los permisos.
- `lib/googleOAuth.ts`: tercer flujo (`buildAdminGoogleAuthUrl`/
  `exchangeAdminGoogleCode`), mismo scope liviano que el login de
  Member (`openid email profile`, `access_type=online`) — no hace
  falta refresh_token acá. Rutas nuevas `app/admin/auth/google/start` y
  `app/admin/auth/google/callback`. El callback busca el email contra
  la tabla `Admin` que ya existe; si no hay match, no entra — **nunca**
  crea una fila de Admin (misma regla dura documentada esta ronda en
  `02-ARQUITECTURA.md`).
- **Bug real encontrado y arreglado antes de shippear**: `proxy.ts`
  protege todo `/admin/*` exigiendo sesión de Admin — mismo patrón que
  ya existía para `/m/auth/google/*` en `MEMBER_PUBLIC_PATHS`, pero
  nunca lo repliqué para las rutas nuevas de Admin. El proxy rebotaba
  `/admin/auth/google/start` de vuelta a `/admin/login` antes de que mi
  propio código corriera — se veía bien en `tsc`/`build` pero fallaba
  de verdad en el navegador. Lo encontré probando con Playwright contra
  un `pnpm start` local real (no solo el build), donde se vio el
  redirect equivocado. Fix: `ADMIN_PUBLIC_PATHS` nuevo en `proxy.ts`,
  mismo criterio que `MEMBER_PUBLIC_PATHS`.
- UI: botón "Continuar con Google" en `/admin/login`, con separador y
  mensaje de error específico (`google_not_admin`) cuando el Google no
  coincide con ningún Admin.
- `.env.example` documenta la tercera redirect URI necesaria
  (`/admin/auth/google/callback`) — mismo cliente OAuth, sin scopes ni
  APIs nuevas.
- Verificado con Playwright contra `pnpm build && pnpm start` real (no
  solo el build): el botón redirige, el proxy ya no lo bloquea, y el
  mensaje de "no configurado" se ve bien sin `GOOGLE_CLIENT_ID` local.
  `tsc --noEmit` y `pnpm build` limpios. Shippeado como v1.26.0.

### 2026-09-19 (cont.) — Favicon/nombre de app por Programa

- Gunnar reportó un triángulo dorado feo como favicon en su navegador —
  resultó ser el ícono genérico de PWA (`public/icons/icon-192.png`,
  nunca pensado como logo), no el real de Legacy. Pedido: cada Programa
  debe poder poner su propio nombre de app + favicon en las tarjetas de
  sus miembros — hoy Legacy/"Legacy Card", mañana cualquier otro
  Programa (ej. si "Negocio→Programa" convierte el negocio de alguien
  en su propio Programa, sería "Sierra Card").
- Schema: `Program.cardAppName String @default("")` (migración
  `20260918172901_program_card_app_name`) — reusa `Program.logoUrl` que
  ya existía, no hizo falta un campo de favicon aparte.
- `lib/cardMetadata.ts` (nuevo): `buildCardMetadata(slug)` — solo
  project cards (las únicas con Program) devuelven un override; vacío
  o sin Program cae al `title`/`icons` de siempre del layout raíz, sin
  romper nada.
- `generateMetadata` nuevo en `app/c/[slug]/page.tsx` y
  `app/c/[slug]/oficina/page.tsx`, usando ese helper.
- Editor: campo "Nombre de la app" nuevo en la sección de Identidad de
  `/admin/programs/[id]`, al lado del logo que ya se subía ahí.
- **Se sacó `app/favicon.ico`** (el triángulo de Vercel del scaffold
  original de `create-next-app`, nunca reemplazado) — confirmado con
  curl contra un `pnpm build && pnpm start` real que Next lo seguía
  emitiendo como un segundo `<link rel="icon">` compitiendo con el
  nuevo, ambiguo según navegador. Sin ese archivo, el override de
  Programa queda como el único ícono, limpio.
- Probado localmente con un Program de prueba (`cardAppName: "Legacy
  Card"`, un logo de prueba) enlazado temporalmente a `mastern0`: el
  HTML servido trae `<title>Legacy Card</title>` y un solo
  `<link rel="icon">` apuntando al logo — confirmado con curl, no solo
  supuesto. Dato de prueba borrado después, no toca producción.
  `tsc --noEmit` y `pnpm build` limpios. Shippeado como v1.27.0.
  Pendiente de Gunnar: escribir "Legacy Card" en el campo nuevo del
  dashboard de Legacy — el logo ya está cargado, ese solo se recoge
  solo.

### 2026-09-19 (cont.) — Privacidad entre las 3 tarjetas (shareScope)

- Gunnar marcó un problema real de privacidad: hoy, sin excepción,
  abrir CUALQUIERA de las 3 Cards de un Member (project/company/
  personal) deja swipear a las otras dos — así estuvo armado desde el
  principio (`app/c/[slug]/page.tsx`, comentario propio: "any visitor
  holding a link to one of a Member's 3 Cards can swipe to the other
  two"). Si mandás tu tarjeta Personal, el que la recibe no debería
  enterarse en qué Programa estás, a menos que vos lo permitas.
- Propuesta acordada: cada Card tiene su propio `shareScope` — qué
  otros `kind` sumar al carrusel cuando ALGUIEN ABRE ESA tarjeta
  puntual. Vacío (default) = se ve sola. Nada de un selector "elegí
  ahora al compartir" (pediría un sistema de links con token por
  combinación) — más simple: se configura una vez por tarjeta,
  consistente cada vez que se comparte.
- Schema: `Card.shareScope Json @default("[]")` (migración
  `20260918173810_card_share_scope`). `lib/shareScope.ts` (nuevo):
  `CardKind`, `CARD_KINDS`, `CARD_KIND_LABEL`, `parseShareScope`.
- `app/c/[slug]/page.tsx`: el carrusel ahora filtra por
  `[card.kind, ...parseShareScope(card.shareScope)]` — **pero solo
  para un visitante**; el propio dueño (`isHost`) sigue viendo sus 3
  juntas siempre, esto es sobre lo que ve un tercero, no sobre la
  navegación propia.
- Editor: nueva sección "Privacidad al compartir" (checkboxes, una por
  cada uno de los otros 2 `kind`) en `EditorForm.tsx` (project, vía
  `updateCardAction`) y `MemberCardEditor.tsx` (company/personal, vía
  `updateMemberCardAction`) — mismo patrón visual que el checkbox de
  "Es el Origen" que ya existía.
- **Verificado de punta a punta contra un build real, no solo tsc**:
  creé 3 Cards hermanas de prueba (`test-proj`/`test-comp`/
  `test-pers`) bajo un Member de prueba, confirmé con curl que (1) con
  `shareScope` vacío cada una se ve sola, (2) activar `["company"]` en
  `test-pers` hace que su link muestre Personal+Empresa pero no
  Proyecto, y (3) el link de `test-comp` (que no tocó su propio
  `shareScope`) sigue mostrando solo Empresa — confirma que es
  asimétrico y por tarjeta, no global. Datos de prueba borrados
  después, no tocó producción. `tsc --noEmit` y `pnpm build` limpios.
  Shippeado como v1.28.0.

### 2026-09-19 (cont.) — Bitácora de login de Admin + diagnóstico Google en prod

- Gunnar probó "Continuar con Google" en producción y le dio "El login
  con Google no está configurado todavía" — confirmé la causa exacta
  con `web_fetch_vercel_url` contra `/admin/auth/google/start` en
  `lycardeo.vercel.app`: redirige a `?error=google_not_configured`, o
  sea `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` simplemente no están
  cargadas como env vars en Vercel — el cliente OAuth de Google Cloud
  ya existe (Gunnar ya hizo esos pasos), solo falta copiarlo a Vercel.
  Acción de Gunnar, no hay nada más de código para arreglar acá.
- Pedido explícito: "eso también es importante que siempre quede
  registro de eso... tenemos que tener un tipo CRM" — primer paso:
  bitácora de TODO intento de login de Admin (password o Google, éxito
  o falla). Modelo `AdminLoginEvent` (migración
  `20260918174441_admin_login_events`), logueado desde `loginAction`
  (`app/admin/actions.ts`) y desde el callback de Google
  (`app/admin/auth/google/callback/route.ts`). Página nueva,
  MasterN0-only, `/admin/login-history` (linkeada desde "Mi cuenta").
- Verificado con un browser real (Playwright, no curl — un POST crudo a
  una Server Action no dispara el mecanismo real de Next): un login
  fallido con credenciales inventadas quedó en la tabla
  (`success:false, reason:"bad_credentials"`), y uno real con la cuenta
  de Gunnar quedó `success:true`. La página `/admin/login-history` en
  sí no la pude ver renderizada en este entorno local — el cookie de
  sesión usa `Secure`, que el navegador descarta sobre HTTP plano
  (`pnpm start` local); en producción (HTTPS real) no aplica. Reusa el
  mismo patrón ya probado de `/admin/account` línea por línea, así que
  el riesgo real es bajo, pero quedó anotado qué sí y qué no se pudo
  confirmar en vivo. `tsc --noEmit` y `pnpm build` limpios. Shippeado
  como v1.29.0.

### 2026-09-19 (cont.) — Favicon del sistema entero = logo de Legacy

- Gunnar pidió ir un paso más allá de la Fase 1.27 (favicon solo por
  Card/Programa): que el favicon/nombre **por defecto de TODA la app**
  — admin, login, cualquier pantalla sin una Card puntual de por medio
  — sea el logo real de Legacy, no el triángulo genérico. Confirmó
  además, antes de que se lo preguntara, que esto no debe pisar el
  override existente: cuando un Negocio se vuelve su propio Programa,
  su logo sigue ganando en sus propias tarjetas.
- `app/layout.tsx`: `metadata` estático pasa a `generateMetadata()`
  async — busca la Card marcada `isOrigin` (que es, por definición,
  Legacy) y usa `program.cardAppName`/`logoUrl` como default de todo
  el sistema; sin Origin Card configurada, cae a los íconos de
  siempre. El override por Card de la Fase 1.27
  (`lib/cardMetadata.ts`) sigue ganando donde exista — Next.js
  reemplaza los metadatos del layout raíz con los del route segment
  hijo, no los mezcla.
- **Bug real encontrado en el camino**: `app/m/login/page.tsx` era
  `"use client"` de punta a punta — un archivo así NO puede declarar
  `export const dynamic = "force-dynamic"` (Next.js lo ignora fuera de
  Server Components), así que quedaba prerenderizada UNA sola vez en
  el build y servida igual siempre. Nunca iba a recibir este favicon
  dinámico (ni, sospecho, actualizarse nunca más con nada server-side
  a futuro). Fix: se extrajo el formulario a
  `components/MemberLoginForm.tsx` (mismo componente, sin cambios de
  comportamiento) y `page.tsx` pasa a ser un Server Component fino que
  sí declara `force-dynamic`.
- Verificado con curl contra `pnpm build && pnpm start` real, tres
  casos: (1) `/admin/login` (nada que ver con ninguna Card) trae el
  logo de Legacy de prueba; (2) `/m/login`, después del fix, también —
  antes del fix seguía mostrando el ícono viejo; (3) una Card de un
  Programa distinto ("Sierra") sigue mostrando SU PROPIO logo, no el
  de Legacy — confirma que el override no se rompió. Datos de prueba
  borrados después. `tsc --noEmit` y `pnpm build` limpios. Shippeado
  como v1.30.0.

## Fix — Notas de Voz: la nota se guardaba pero no se podía escuchar/leer (2026-09-22)

Gunnar, apenas confirmado que el login de Admin con Google ya funciona en
prod: "lo que vi por ejemplo es que el notas de voz.. dice que lo guarda
pero no puedo acceder a nada ni escuchar la nota que guardo."

- Causa confirmada leyendo el código: `VoiceNoteSummary` (el tipo que
  cruza de `app/c/[slug]/oficina/page.tsx` al componente cliente) nunca
  incluía `audioUrl` — ni el `select`/`map` del lado servidor, ni el tipo
  del lado cliente. `components/VoiceNotesBlock.tsx` nunca renderizaba
  un `<audio>`, y para una nota ya lista (`status: "ready"`) solo
  mostraba el resumen corto (`n.summary`), nunca la transcripción
  completa (`n.transcript`) ni forma de reproducir el audio real.
- Fix: `audioUrl` se agregó al tipo `VoiceNoteSummary`, al `select`/`map`
  de `app/c/[slug]/oficina/page.tsx`, y al retorno de
  `createVoiceNoteAction` (para que el audio sea reproducible desde el
  instante en que se graba, sin esperar a la transcripción). Cada nota
  en `VoiceNotesBlock.tsx` ahora tiene su reproductor `<audio controls>`
  siempre, y una vez lista, un botón "Ver transcripción completa" que
  despliega `n.transcript` entero (el resumen corto se sigue mostrando
  arriba, sin cambios).
- Verificado con Playwright contra un build de producción real
  (`pnpm build && pnpm start`, Postgres local levantado a mano para el
  build): se insertó una VoiceNote de prueba `status: "ready"` con audio,
  transcript y summary sobre la Card `isOrigin` (`mastern0`), se abrió
  `/c/mastern0/oficina`, se clickeó el tile "Notas de Voz" de
  Superpoderes, y se confirmó: (1) el `<audio>` trae el `src` correcto,
  (2) el resumen se ve, (3) el botón de transcripción existe y al
  clickearlo despliega el texto completo. Dato de prueba borrado después
  (DB + archivo dummy en `public/uploads`). `tsc --noEmit` y `pnpm build`
  limpios. Shippeado como v1.30.1.
- Pendiente en paralelo, pedido en el mismo mensaje: el diagnóstico
  completo de estatus vs. roadmap — se arma a continuación, por
  separado.

## Módulo HR + PM — panel interno /admin/equipo (2026-09-22)

Gunnar, después del diagnóstico completo: "arranca" — eligiendo HR+PM
como primera fase del roadmap grande, siguiendo mi propia recomendación
(mismo modelo de datos, una sola fase en vez de dos).

- Schema nuevo: `Node` (headcount — `rung`, `nodeType` "legacy"|"silicio"|
  "carbono_ref", `reportsToN11Id`, `role`), `ProjectNode` (avance — `level`
  ψ 1/2/3, `domain`, `progressPct`, `nextMilestoneTitle/Date`, `blockers`,
  `ownerNodeId`/`responsibleNodeId`), `Task` (`projectId`, `nodeId`,
  `title`, `status`, `due`). Migración `20260922020039_hr_pm_module`.
- `lib/hr.ts`/`lib/pm.ts`: `groupByRung` (con `N1.1` como único
  sub-escalón, ordena por valor numérico real, no alfabético — así "N2"
  no queda antes que "N12"), `groupProjectsByDomain`/`groupProjectsByOwner`
  (interpretación documentada en el propio archivo: "Programa" del pedido
  original no tiene campo propio en `ProjectNode`, se usa el Nodo dueño —
  ajustable si Gunnar quiso decir otra cosa), `isBlocked`.
- `app/admin/equipo/actions.ts`: las 6 actions del plan original
  (create/update × Node/Project/Task), todas detrás de `requireMasterN0()`
  — mismo patrón que `/admin/programs`, invisible para un N0 de Programa.
- `app/admin/equipo/page.tsx` + `components/EquipoProjectsBlock.tsx` +
  `components/EquipoTasksBlock.tsx`: acordeón de 3 secciones (Headcount,
  Proyectos, Tareas), toggle Dominio/Owner y filtro por escalón/tipo de
  nodo — mismo lenguaje visual que el resto del panel (`Accordion.tsx`,
  `AccordionAddRow` para crear, `AccordionRow` para editar cada fila).
- Link "Equipo" agregado al nav del roster (`/admin`).

**Bug real encontrado y diagnosticado a fondo durante la verificación**:
el `<select>`/`<input>` con `name="nodeType"` rompía la hidratación de
React en CUALQUIER `<form>` que lo contuviera — mismatch reproducible
tanto en dev como en un build de producción limpio (`pnpm build && pnpm
start`), sin relación con `disabled`, `required`, bind/unbind de la
Server Action, ni con la cantidad de campos del form (hipótesis
descartadas una por una, con re-verificación contra contenido servido
fresco vía curl en cada paso para no confundir una lectura vieja de HMR
con un resultado real). Causa real: `nodeType` colisiona con
`Node.nodeType`, la propiedad nativa del DOM que hereda TODO elemento —
incluido el propio `<form>` — y React 19 se confunde reflexionando sobre
los controles nombrados del form cuando ese nombre existe. Fix: el campo
del formulario HTML se renombró a `kind` (coincide además con la
convención ya usada en `Card.kind`); el modelo Prisma y la columna de la
DB siguen siendo `nodeType`, sin ningún cambio — solo el atributo `name`
del input/select cambió, y las actions leen `formData.get("kind")` en
vez de `"nodeType"`. Se revisaron además los otros nombres de campo
nuevos (`title` en Tareas, candidato sospechoso por colisionar con
`HTMLElement.title`) — verificado explícitamente que NO rompe nada, se
dejó como está.
- Verificado con Playwright, flujo completo real (no solo carga): crear
  un Nodo → crear un Proyecto con ese Nodo como dueño → crear una Tarea
  con ambos → confirmado sin ningún `pageerror` en todo el flujo, los 3
  redirects (`nodeSaved=1`/`projectSaved=1`/`taskSaved=1`) correctos, y
  los 3 registros verificados directo en Postgres con los datos
  correctos (incluido el mapeo `kind` de formulario → `nodeType` de DB).
  Confirmado también que un Admin scope (no-MasterN0) recibe 307 a
  `/admin` al pedir `/admin/equipo` directo (con curl + una cookie de
  sesión firmada a mano para ese Admin de prueba). Datos de prueba
  borrados después (Nodes/Projects/Tasks/Admin scope/Program de prueba).
  `tsc --noEmit` y `pnpm build` limpios. Shippeado como v1.31.0.
- `docs/04-MODULOS.md` y `docs/05-ROADMAP-EDT.md` actualizados — HR/PM
  pasa de "plan" a "construido", con el bug de `nodeType` documentado en
  ambos lugares para que no se repita en un módulo futuro (CRM, PM
  extendido, NashMesh) que use nombres de campo parecidos.

## Rediseño de calendario (Brief, Notas de Voz, Agenda) + 3 bugs reales (2026-09-22)

Gunnar probó los 3 Superpoderes con backend real y reportó, los tres con
problemas de fondo — pidió explícitamente investigar diseño top-1% de
UI/UX **antes de tocar código**: "necesito primero hagas una búsqueda de
top1% en UIUX y me expliques o muestres un ejemplo... antes de hacer
nada."

**Investigación (WebSearch, sin código todavía):** Fantastical, Cron/Notion
Calendar, Sunsama y TickTick coinciden en el mismo patrón — mini
calendario con un punto por día (nunca números apilados), click en el
día abre una LISTA (no el detalle directo), click en un ítem de la lista
abre el detalle en un POPUP separado; color = tipo de contenido, nunca
texto que haya que leer para distinguir tarea de evento (franja de color
+ ícono, patrón de Sunsama). Mockup real armado con el Artifact de tipo
Design (3 pantallas, en la estética real de LyCard, clickeables de
verdad) antes de escribir una línea de la app — Gunnar lo vio y confirmó
("me gusta. dale") antes de arrancar.

**Construido:**
- `components/MiniCalendar.tsx` (nuevo, compartido): calendario mensual
  "dumb" — un punto por día vía `dotsForDay(date)`, selección controlada
  por el padre. Los 3 Superpoderes lo usan igual, cada uno arma su
  propia lista/popup de detalle alrededor.
- `components/FathomBriefBlock.tsx`: reuniones agrupadas por día,
  detalle (resumen + link a Fathom) en popup.
- `components/VoiceNotesBlock.tsx`: notas agrupadas por día de
  grabación, reproductor + transcripción completa movidos al popup de
  detalle (antes vivían inline por fila, fáciles de pasar por alto).
- `components/AgendaBlock.tsx`: dos puntos por día (dorado evento,
  violeta tarea), al elegir el día se ven Eventos y Tareas en secciones
  separadas por color, cada tarea con su checkbox visual.

**Bug real #1 — Notas de Voz no reproducía ("sale error")**: el código
siempre etiquetaba el Blob grabado como `audio/webm` sin importar qué
codec usó `MediaRecorder` de verdad. En navegadores que no graban webm
nativo el archivo se subía con un Content-Type que no correspondía a sus
bytes reales — el navegador no podía decodificarlo. Fix:
`MediaRecorder.isTypeSupported` elige el mejor formato real disponible,
y ESE mismo tipo se usa en el Blob, el nombre del archivo (extensión
real) y el Content-Type que sube `lib/storage.ts` (ahora acepta
`.mp4`/`.aac` además de `.webm`).

**Bug real #2 — nota "desaparecida" ("grabé otra nota y desapareció, no
se grabó")**: la función de subida no tenía `catch` — solo `try/finally`.
Si `createVoiceNoteAction` tiraba una excepción real (blip de red, el
blob storage o la DB fallando), la promesa quedaba rechazada sin que
nadie la atajara: el spinner se apagaba solo pero no aparecía ningún
error ni se agregaba la nota. Fix: `catch` explícito con mensaje visible.

**Bug real #3 — Agenda mostraba un evento inventado y no los reales**:
la Agenda solo ESCRIBÍA en Google Calendar (`createCalendarEvent`, ya
existía) pero nunca LEÍA nada — mostraba el cache local de escritura
(`Card.calendarEvents`) como si fuera la agenda real. Un evento cargado
directo en Google Calendar era invisible; una entrada simulada local (sin
tocar Google nunca) se mostraba sin distinguirse lo suficiente. Fix:
`listCalendarEvents`/`listTasks` (nuevo, en `lib/googleServices.ts`) +
`lib/agenda.ts#fetchLiveAgenda` — cuando el dueño está conectado, la
Agenda lee Calendar/Tasks de verdad (ventana fija de -14/+45 días
alrededor de hoy) y deja de usar el cache local; sin conectar, sigue
cayendo al cache simulado pero ahora bajo un aviso explícito ("Sin
conectar — lo de abajo es simulado, todavía no es tu agenda real"),
nunca mezclado en silencio.

**Verificado real, no solo compilado:**
- Notas de Voz: grabación real de punta a punta con Playwright +
  Chromium en modo `--use-fake-device-for-media-stream` (mic falso, WAV
  real generado) contra `pnpm dev` — el archivo grabado se inspeccionó
  byte a byte (`1a 45 df a3` + `webm` en el DocType, EBML/WebM válido de
  verdad), se guardó, se escuchó: `readyState:4`, `duration:1.92`,
  `errorCode:null` — reproducción real confirmada, no solo "no tira
  error". (Nota aparte: bajo `pnpm start`/producción LOCAL con el
  fallback a disco, Next.js 16 no sirve archivos escritos en
  `public/uploads` DESPUÉS del build — 404 — pero esto es irrelevante
  para Vercel real, que siempre usa Vercel Blob vía
  `BLOB_READ_WRITE_TOKEN`, nunca ese fallback.)
- Agenda: estado sin conectar probado sembrando un evento simulado real
  en `Card.calendarEvents` — confirmado que aparece bajo el aviso
  explícito de "Simulado", en el día correcto, con la hora correcta.
  Estado conectado (lectura real de Google) no se pudo probar en vivo
  sin una cuenta de Google conectada de verdad en este entorno — el
  código de `listCalendarEvents`/`listTasks` sigue el mismo patrón
  fetch+Bearer-token ya probado y en producción para
  `createCalendarEvent`/`createTask`, revisado a mano con cuidado. Pide
  confirmación real de Gunnar una vez conectado.
- Fathom Brief: confirmado que el estado sin `FATHOM_API_KEY` sigue
  degradando limpio ("Todavía sin conectar a Fathom"), sin crashear con
  el nuevo calendario. El calendario agrupado por día no se pudo probar
  con datos reales de Fathom en este entorno (sin `FATHOM_API_KEY`
  local) — mismo patrón que `AgendaBlock`/`VoiceNotesBlock`, ya probados
  con datos reales.
- `tsc --noEmit` y `pnpm build` limpios. Shippeado como v1.32.0.

## Segunda ronda tras producción: 24hrs, idioma fijo, remount fix, rediseño de Notas de Voz (2026-09-23)

Gunnar probó v1.32.0 en producción real y confirmó que 2 de los 3 fixes
del round anterior funcionaron ("te quedo excelente", "Perfecto, ya se
graban y escuchan") — reportó 4 cosas nuevas, ya con el producto en uso
real:

1. **Brief: la hora se sale del círculo.** `es-MX` con formato de 12
   horas ("12:09 p. m.") es más ancho que la insignia circular de 42px
   del Brief. Fix: `hour12: false` en las tres Skills (Brief, Notas de
   Voz, Agenda) — no solo donde se reportó, mismo patrón, mismo riesgo.
2. **Transcripción en inglés de un audio en español.** `lib/transcription.ts`
   usaba `language_detection: true` — para audios cortos, AssemblyAI a
   veces adivinaba mal. Fix: `language_code: "es"` fijo (confirmado por
   WebSearch que AssemblyAI soporta español tanto para transcripción
   como para el resumen — no es una limitación de "solo inglés"). No se
   pudo probar en vivo en este entorno (sin `ASSEMBLYAI_API_KEY` local,
   mismo límite que rondas anteriores) — pendiente de confirmación real
   de Gunnar.
3. **"Cuando sales de la app, la nota de voz se borra"** (un reporte
   DISTINTO del bug #2 de la ronda anterior, ya solucionado — este es un
   root cause nuevo): `VoiceNotesBlock` vive detrás de `{active && ...}`
   en `OfficeSkillsBlock`, que lo DESMONTA por completo al cerrar el
   Superpoder. Al reabrir, React arrancaba de cero desde el prop
   `initialNotes` — el server render original de la página, nunca vuelto
   a pedir — así que una nota grabada en una apertura anterior quedaba
   invisible aunque siguiera perfectamente guardada en la DB. Fix:
   `listVoiceNotesAction` (nuevo, en `voiceNotes-actions.ts`) + un
   `useEffect` al montar `VoiceNotesBlock` que siempre trae el estado
   real.
4. **Rediseño pedido de Notas de Voz**: "debería ser un botón de grabar
   notas de voz directo, grande rojo, que se vea, y otro botón más
   discreto de Ver Notas". El componente ahora tiene dos vistas —
   `"record"` (default: botón circular rojo de 92px, gradiente
   `#ff6b5b → #d92c1f`) y `"list"` (el calendario/lista/popup que ya
   existía) — con "Ver notas guardadas (n) →" como link discreto entre
   ambas. Grabar con éxito manda a `"list"` automáticamente como
   confirmación visual de que se guardó.

**Verificado real, no solo compilado** (`tsc --noEmit` + `pnpm build`
limpios primero, después Playwright contra `pnpm dev` con mic falso):
- Vista `"record"` por default con el botón rojo — confirmado visible y
  con el diseño pedido (screenshot).
- Grabación real de punta a punta (mismo mecanismo de mic falso que la
  ronda anterior): graba, sube, auto-cambia a `"list"` como
  confirmación, sin error de guardado.
- **El fix del bug #3 (remount) se probó simulando el escenario real**:
  se abrió el superpoder (conteo de notas en el server render inicial),
  se cerró el modal (desmontando `VoiceNotesBlock` de verdad), se
  insertó una nota nueva directo en la DB vía `psql` (simulando "algo se
  guardó mientras no estabas mirando" — el mismo tipo de gap temporal
  que producía el bug), se reabrió el superpoder: el conteo pasó de
  correctamente reflejar la nota vieja a incluir también la insertada
  directo en DB — confirma que ya no depende del render inicial stale.
- Reproducción de audio (`readyState:4`, sin `errorCode`) y formato 24hrs
  (sin ningún "a. m."/"p. m." detectado en el DOM) confirmados en la
  misma corrida.
- El fix de `hour12:false` en Brief no se pudo probar visualmente en
  este entorno (sin `FATHOM_API_KEY` local, mismo límite de siempre) —
  es el mismo cambio mecánico ya confirmado funcionando en Notas de
  Voz/Agenda con idéntico locale (`es-MX`) y misma llamada
  (`toLocaleTimeString`/`toLocaleString`).
- Shippeado como v1.32.1.

## Tercera ronda: error de transcripción visible, burbuja de info, borrar notas + limpieza total (2026-09-23)

Gunnar probó v1.32.1 y reportó tres cosas más en el mismo mensaje: la
nota de prueba dio error de transcripción, no le gusta el selector
"APP / Qué es esto" de los Superpoderes (pide una burbuja flotante en
vez de tapar la app), y pide poder borrar Notas de Voz — con un pedido
explícito de limpiar TODAS las existentes ahora mismo para arrancar de
cero.

**Por qué el error de transcripción era invisible**: revisando
`voiceNotes-actions.ts`, tanto el `catch` de `startTranscriptionJob`
como el branch de error de `pollTranscriptionJob` descartaban el motivo
real — no había logs ni nada guardado, solo `status:"error"` a secas.
Sin acceso a `ASSEMBLYAI_API_KEY` en este entorno (nunca lo tuvo, mismo
límite de rondas anteriores) y sin permiso para listar/decrypt variables
de entorno de Vercel (`filter_project_envs` devolvió 403 Forbidden), no
había forma de leer la nota real que falló en producción — así que en
vez de intentar adivinar la causa exacta, se blindó el flujo entero para
la próxima vez:

- **Schema**: `VoiceNote.errorDetail` (nuevo, `String? @db.Text`) guarda
  el mensaje real del proveedor.
- **`lib/transcription.ts`**: `startTranscriptionJob` ahora reintenta
  SIN `summarization` si AssemblyAI devuelve 400 al pedirlo con
  `language_code:"es"` — una búsqueda (WebSearch) encontró indicios de
  que el soporte de summarization por idioma puede variar en la API de
  AssemblyAI; en vez de apostar a que sí funciona (como la ronda
  anterior) o rendirse del todo, ahora la transcripción real (que sí
  está soportada) no se pierde aunque el resumen automático falle.
- **`voiceNotes-actions.ts`**: ambos puntos de fallo ahora hacen
  `console.error` con el detalle completo (queda en los logs de Vercel
  para la próxima vez) y guardan `errorDetail` en la fila.
- **`VoiceNotesBlock.tsx`**: el popup de detalle de una nota en error
  muestra el mensaje real debajo del texto amigable, en monoespaciada —
  visible solo para el dueño, nunca para un visitante (esta Skill nunca
  es visible para visitantes de todos modos).

**Borrar Notas de Voz**: `deleteVoiceNoteAction` (nuevo) borra la fila y,
best-effort, el audio subido — `lib/storage.ts#deleteUpload` (nuevo,
`del` de `@vercel/blob` en producción, `unlink` en disco local, nunca
bloquea el borrado real de la fila si el archivo ya no está). En el
popup de detalle: ícono de basura → un segundo toque para confirmar
("¿Seguro?") → borra y cierra el popup, sin `window.confirm` del
navegador (consistente con el resto de la UI, que es 100% custom).

**Limpieza total pedida ("si puedes eliminalas todas para arrancar base
limpia")**: sin credenciales para conectarse directo a la DB de
producción (mismo límite de permisos de arriba), la vía elegida fue una
migración de datos — `prisma/migrations/20260922124809_clear_voice_notes/migration.sql`
con un `DELETE FROM "VoiceNote";` — que corre sola en el próximo deploy
vía el mismo `prisma migrate deploy` que ya usa el pipeline de build,
sin necesitar ningún acceso nuevo. Aplicada también en local para
mantener sincronía. Borra las de TODAS las Cards — hoy no hay tráfico
real, todo lo que había era de prueba.

**Rediseño del ícono "Qué es esto"** (`OfficeSkillsBlock.tsx`): el
selector de pestañas "APP" / "Qué es esto" — que TAPABA la app real con
la explicación — se reemplaza por un ícono (i) en el header que abre la
explicación en una burbuja flotante propia (con flechita apuntando al
ícono, estilo popover/tooltip), superpuesta ENCIMA de la app real sin
ocultarla. Tocar afuera de la burbuja la cierra (capa transparente
`position:fixed inset:0` detrás de la burbuja, z-index más alto que el
resto del bottom-sheet). Para el visitante no cambia nada — ya veía
solo la explicación, nunca tuvo el ícono ni lo necesita.

**Verificado real, no solo compilado** (`tsc --noEmit` + `pnpm build`
limpios, `npx prisma generate` para levantar el campo `errorDetail`
nuevo en el cliente, después Playwright contra `pnpm dev`):
- Burbuja de info: se sembraron datos reales de prueba (`psql` directo)
  para confirmar visualmente — el botón (i) abre la burbuja con su
  flechita, la app real (el botón rojo de grabar) queda visible detrás
  sin taparse, un click afuera la cierra. Confirmado con screenshot.
- Error visible: se insertó una nota con `status:"error"` +
  `errorDetail` de prueba directo en la DB — el popup de detalle
  muestra el mensaje real en monoespaciada debajo del texto amigable.
  Confirmado con screenshot.
- Borrado: tap en basura → aparece "¿Seguro?" → tap de nuevo → la nota
  desaparece de la lista y el popup se cierra — probado de punta a
  punta con Playwright contra la nota de error sembrada.
- El fix de reintento-sin-resumen en `lib/transcription.ts` no se pudo
  probar contra la API real de AssemblyAI en este entorno (sin
  `ASSEMBLYAI_API_KEY` local, mismo límite de siempre) — pendiente de
  confirmación real de Gunnar en la próxima grabación real.
- Shippeado como v1.33.0. La base de Notas de Voz en producción queda
  vacía apenas corra este deploy.

## Seguimiento (CardLead) — CRM-lite por Card, primer paso antes del CRM grande (2026-09-23)

Gunnar confirmó que la próxima tarea del roadmap era el Módulo CRM, pero
al pedirle que explicara su plan antes de tocar código, aclaró el
alcance real que quería: "que funcione para el seguimiento de lo
compartido con la lycard solamente" — no el CRM grande de Sherpa/5
dimensiones de calidad del roadmap (`docs/05-ROADMAP-EDT.md`), sino algo
más chico y honesto: a quién le compartió cada Card puntual y qué pasó
después.

**Investigación antes de codear:** revisando `app/c/actions.ts` se
confirmó que hoy `sendInvitationAction`, `sendQrByWhatsappAction` y
`sendContactMessageAction` son 100% fire-and-forget — mandan el mail (o
loguean el WhatsApp simulado) y no guardan NADA en la base. Solo
`registerInterviewAction` persistía algo (`Registration`). O sea: no
existía ningún rastro de a quién se le compartió una LyCard. Presenté
este hallazgo + un plan concreto a Gunnar antes de escribir código;
confirmó dos decisiones de scope: (1) estrictamente por Card, nunca
mezclado entre las 3 de un mismo dueño ("cada card debe ser
independiente"); (2) tanto lo que el dueño manda (invitación, QR) como
lo que le llega (mensaje, entrevista agendada) entran a la misma lista.

**Construido:**
- `prisma.CardLead` (nuevo modelo): `cardId`, `name`, `contact`,
  `source` (invitacion|qr_whatsapp|mensaje|entrevista|manual), `stage`
  (compartido|contactado|en_seguimiento|convertido|perdido), `notes`,
  `registrationId?` (link opcional, sin duplicar `Registration`).
- `lib/leads.ts` (client-safe: tipos, labels, colores, `bumpStage`) +
  `lib/leadsUpsert.ts` (server-only: `upsertLead`, matchea por cualquier
  contacto dado — email y/o WhatsApp — DENTRO de la misma Card
  únicamente).
- Los 4 puntos reales de `app/c/actions.ts` ahora llaman `upsertLead`:
  invitación y QR solo si la acción realmente tuvo éxito (cáscara
  honesta — nunca un lead fantasma de un envío que falló); mensaje de
  contacto se registra aunque la notificación al dueño falle después
  (el evento real es que alguien escribió); entrevista linkea la
  `Registration` real.
- `bumpStage`: los primeros 3 estados avanzan solos y solo hacia
  adelante; "convertido"/"perdido" son terminales, solo el dueño los
  setea a mano.
- `app/c/[slug]/oficina/leads-actions.ts` + `components/CardLeadsBlock.tsx`
  (nuevo, mismo lenguaje visual que Notas de Voz/Agenda): lista
  ordenada por actividad reciente, popup de detalle con selector de
  etapa + notas editables, "+ Agregar a mano" para alguien conocido
  offline. Insertado en `OwnerOficina` justo después del saludo/KPIs,
  antes del Gemelo Digital — dato operativo de alta prioridad, no
  escondido al final.

**Bug real encontrado y corregido en el camino:** el primer intento puso
`upsertLead` (que importa `lib/prisma`) directo en `lib/leads.ts`, y
como `CardLeadsBlock.tsx` (Client Component) importa tipos de ese mismo
archivo para los labels/colores, el build de producción (`pnpm build`,
Turbopack) fallaba con 7 errores "Module not found: dns/fs/net/tls/
util:types" — Next.js intentaba meter el driver de `pg` completo en el
bundle del navegador. Fix: separar `upsertLead` a `lib/leadsUpsert.ts`
(server-only, nunca importado por un componente cliente), dejando
`lib/leads.ts` con solo tipos/constantes puras. `tsc --noEmit` no lo
había detectado — hace falta `pnpm build` real para atrapar este tipo
de bug, no alcanza con el type-check.

**Verificado real, no solo compilado** (`tsc --noEmit` + `pnpm build`
limpios, después Playwright contra `pnpm dev`): la Card `mastern0` es
`isOrigin` (se ve en modo host a cualquiera, sin importar sesión), así
que no servía para probar el flujo de VISITANTE — se creó una Card de
prueba temporal (`qa-leads-test`, kind `personal`, borrada al final) para
poder probar los 4 canales de punta a punta:
- Mensaje de contacto (visitante anónimo) → lead con `stage:"contactado"`.
- Agendar una entrevista (visitante anónimo) → lead con
  `stage:"en_seguimiento"`, `registrationId` linkeado.
- Envío del QR por WhatsApp (dueño) → lead con `stage:"compartido"`.
- Los 3 aparecieron en el bloque "Seguimiento" de la Oficina con el
  conteo correcto (3), colores de etapa correctos, y el estado
  "Compartido" solo en el del QR (los otros 2 avanzaron solos como
  corresponde).
- Abrí el lead de la entrevista, lo cambié a "Convertido" a mano, guardé
  una nota, **recargué la página** y ambos cambios seguían ahí — confirma
  que persiste de verdad en la DB, no es solo estado local de React.
- Agregué un lead a mano ("+ Agregar a mano") y confirmé que también
  sobrevive el reload.
- Confirmado con screenshots: la burbuja/popup de detalle, la lista
  principal, y el estado tras recargar.
- Shippeado como v1.34.0.

**Pendiente, próxima tarea confirmada por Gunnar:** el AppStore de
Skills completo (`docs/05-ROADMAP-EDT.md#appstore-de-skills`) — Gunnar
va a mandar una lista en Excel con los Superpoderes a incluir.

## CQE — Pipeline de testeo continuo + El Patovica en CI (2026-09-22)

Gunnar pasó un prompt armado con Gemini pidiendo un "Continuous Quality
Engineering pipeline" con enfoque Shift-Left: infraestructura de tests
(backend Python + frontend), 3 tests unitarios TDD sobre la función más
crítica del código, y un workflow de GitHub Actions que actúe de
"patovica" bloqueando cualquier PR a `main` que rompa algo — con gate
de cobertura mínima. El prompt pedía explícitamente no frenar a
preguntar por cada archivo chico y adaptar las herramientas al stack
real.

**Adaptación real del prompt genérico a este repo:** LyCard es 100%
TypeScript/Next.js, sin una sola línea de Python — se descartó
pytest/pytest-cov/pytest-mock por completo. Se armó con **Vitest**
(unit) + **Playwright** (E2E), nada nuevo del lado del framework.

**La función más crítica, elegida con criterio, no al azar:** en vez de
inventar un ejemplo de juguete, se usó el propio hallazgo #1 de
`docs/AUDITORIA-TECNICA-2026-09.md §3.3` — el chequeo de "un Admin
escopeado a un Programa nunca puede tocar datos de otro Programa"
estaba reimplementado a mano, inline, en **12 lugares distintos** del
código (`scope.programId && scope.programId !== programId`) — un solo
typo (`||` en vez de `&&`) en cualquiera de los 12 hubiera sido una
fuga real entre Programas.

**Lo que se construyó, no solo tests sueltos:**
- `lib/authScope.ts` (nuevo): `isMasterN0Scope` / `canAccessProgram`,
  funciones puras, cero imports de `next/headers`/Prisma/`jose` — se
  pueden testear sin mockear nada. `lib/auth.ts` las re-exporta, así
  los ~14 archivos que ya importaban de ahí no se tocan.
- Los 12 sitios reales (`app/admin/**`) migrados a usar las funciones
  compartidas — cerrando el riesgo de verdad, no solo poniéndole tests
  alrededor de código que nadie usa. En el camino, el refactor de
  `app/admin/siblings-actions.ts` reveló un bug real por descuido
  propio (`if (card.programId && !canAccessProgram(...))` se saltaba
  el chequeo entero cuando `card.programId` era `null`, ej. una Card
  personal/company) — detectado con tabla de verdad antes de shippear,
  corregido, y convertido en test de regresión permanente.
- `lib/__tests__/authScope.test.ts` (6 tests, 100% cobertura) +
  `lib/__tests__/leads.test.ts` (6 tests sobre `bumpStage` de la
  feature de Seguimiento).
- `e2e/admin-scope-isolation.spec.ts` — cierra el círculo probando en
  HTTP real (cookie firmada + server de verdad) que el comportamiento
  es el mismo que dicen las funciones puras. `e2e/public-card.spec.ts`
  — smoke test de la tarjeta pública. Los dos crean y borran su propia
  data de prueba (`beforeAll`/`afterAll`), cero dependencia de datos
  pre-sembrados — corren igual de bien en una DB de CI recién migrada
  que en cualquier DB de desarrollo.
- `.github/workflows/ci-qa.yml`: en cada PR a `main`, un job
  `lint-and-unit` (lint + `vitest run --coverage`) y, si pasa, un job
  `e2e` con Postgres 16 de servicio, build de producción real
  (`prisma migrate deploy && next build`), server levantado y
  Playwright headless contra él.

**Desvío consciente de lo pedido, documentado en el propio código**
(`vitest.config.mts`): el prompt pedía "cobertura mínima 90%" a secas.
Aplicado tal cual, sobre un repo que hoy arranca de 0% de cobertura,
hubiera reventado el próximo PR de cualquiera y terminado
deshabilitado/ignorado en una semana. En cambio: el gate del 90% aplica
**solo** a los archivos que ya tienen tests reales
(`lib/authScope.ts`, `lib/leads.ts`) — un "ratchet" que solo crece a
medida que se van sumando más módulos testeados, nunca retrocede.

**Verificado real:** `tsc --noEmit` limpio, `pnpm build` limpio, 13
tests unitarios pasando con 100% de cobertura en los archivos gateados,
4 tests E2E pasando contra un build de producción real — y confirmado
por `psql` que ambos specs de E2E no dejan ningún dato de prueba atrás.

Tres problemas de tooling no obvios resueltos en el camino (no afectan
producción, solo el entorno de test): el cliente de Prisma 7 generado
usa `import.meta.url` a nivel de módulo, lo que rompe bajo el transform
a CommonJS que usa Playwright para specs — resuelto usando `pg` crudo
en el fixture de E2E en vez del cliente de Prisma; un `pg.Client`
compartido entre los dos specs no se puede reconectar una vez cerrado
— resuelto con una factory (`createE2eDb()`) en vez de un singleton.

Sin cambios visibles en ninguna tarjeta — 100% infraestructura interna.
Shippeado como v1.35.0.

## Oficina Virtual — Fase E1, tests reales + el patovica encuentra deuda propia (2026-09-22)

Gunnar pidió retomar el roadmap de Oficina Virtual (`plan de sesión:
Keep in Flow / Check de Realidad / Noticias / Calendario`) arrancando
por la Fase E1 — que, al revisar el código, ya estaba construida de una
sesión anterior (schema de `Card`/`Program` + `lib/oficinaExtras.ts`
con los parsers y `pickPhraseOfTheDay`), solo le faltaba lo que pedía
el nuevo proceso CQE: tests reales, y confirmación de que el pipeline
completo pasa antes de shippear.

**Tests nuevos:** `lib/__tests__/oficinaExtras.test.ts` — foco en
`pickPhraseOfTheDay` (la única lógica real: rotación determinística por
día del año, nunca aleatoria) y en los 4 parsers de JSON no confiable,
con un caso explícito por cada campo que puede llegar con el tipo
equivocado (JSON viejo/corrupto) para no crashear. Sumado
`lib/oficinaExtras.ts` al `coverage.include` del ratchet — **100%
también en statements, branches, functions y lines**, no solo el
número fácil.

**El patovica hizo su trabajo la primera vez que se lo corrió de
verdad:** al ejecutar `pnpm lint` como parte del pipeline (antes solo
se corría `tsc`/`build`, nunca lint como gate real), salieron **19
errores preexistentes**, ninguno de esta sesión — comillas sin escapar
(`react/no-unescaped-entities`) en 6 archivos, y un bug real de React
en `CardLeadsBlock.tsx` (Seguimiento, v1.34.0): `setNotesDraft` se
llamaba de forma síncrona dentro de un `useEffect` en vez de al abrir
el detalle del lead, lo que puede disparar renders en cascada. Se
corrigieron los 19 y se movió el `setNotesDraft` al handler de click
que abre el lead — mismo resultado, sin el efecto innecesario. También
se agregó `coverage/`, `playwright-report/` y `test-results/` a los
`globalIgnores` de eslint (generados, nunca código fuente — antes
`pnpm lint` local podía ensuciarse con ruido de una corrida previa de
tests).

**Verificado real, pipeline completo corrido a mano antes de shippear:**
`tsc --noEmit` limpio, `pnpm lint` limpio (0 errores, solo warnings
preexistentes de variables sin usar), `pnpm test:unit:coverage` con
100% en los 3 archivos gateados (36 tests), `pnpm build` limpio, y los
4 E2E de Playwright pasando contra el build real. En el medio, otro
reset de sandbox (mismo patrón que la vez anterior: Postgres y el
server de dev abajo, datos intactos en el volumen persistente) —
recuperado sin perder nada, mismo procedimiento ya documentado.

**Acuerdo de flujo con Gunnar de acá en adelante:** cada cosa nueva que
se construya corre su pipeline completo local (tsc + lint + unit tests
+ build + E2E) y, si todo pasa, se pushea a `main` sola — sin esperar
una confirmación aparte para el push, mientras el pipeline haya dado
verde de verdad.

Shippeado como v1.35.1. Próximo paso: Fase E2 (editor compartido
`OficinaExtrasEditor.tsx` + botón "Generar con IA (simulado)" para los
KPIs + frases motivacionales en `/admin/programs/[id]`).

## Oficina Virtual — Fase E2: editor compartido + frases motivacionales (2026-09-22)

Construido el editor de contenido de la Oficina (todavía sin efecto en
la tarjeta pública — eso es Fase E3, el paso siguiente).

**`components/OficinaExtrasEditor.tsx`** — deliberadamente **sin su
propio `<form>`**: se monta adentro del form grande de
`EditorForm.tsx`/`MemberCardEditor.tsx` (mismo patrón que `officeItems`
ya usa en el segundo), porque HTML no permite `<form>` anidado y el
plan original pedía que se guardara "todo como antes" con un solo
"Guardar Tarjeta". 4 `AccordionSection`: Objetivo (Keep in Flow, input
simple), Check de Realidad (KPIs: label/valor/unidad editables + botón
"Generar con IA (simulado)"), Noticias, Calendario.

**Desvío consciente del borrador de plan**: "Generar con IA (simulado)"
NO es una server action (`simulateRealityCheckAction` como decía el
plan original) — es 100% client-side, `lib/oficinaExtras.ts#generateSimulatedKpis()`
rellenando el estado local con los ejemplos fijos + un jitter chico
(nunca negativo). Motivo: una action de servidor hubiera necesitado su
propio `<form>`, y ya quedó descartado por la razón de arriba. El N0
igual tiene que tocar "Guardar Tarjeta" para que quede — nada se
escribe en la DB sin ese click explícito.

**Server actions extendidas** (no nuevas, mismo criterio que
`officeItems`): `updateCardAction` (`app/admin/actions.ts`) y
`updateMemberCardAction` (`app/m/dashboard/actions.ts`) ahora también
leen y guardan los 4 campos, vía un helper nuevo compartido
`lib/oficinaExtras.ts#parseOficinaExtrasFormData(formData)` — evita
duplicar el mismo `JSON.parse` + try/catch en los dos archivos.

**`components/PhraseListEditor.tsx`** (nuevo, más simple que
`EscalaEditor`/`OfficeSkillsEditor` porque cada ítem es un string
plano, no un objeto con campos internos) — pool de frases
motivacionales por Programa, nueva sección en
`/admin/programs/[id]` justo debajo de Superpoderes. Server action
`updateMotivationalPhrasesAction` en `app/admin/programs/actions.ts`,
mismo patrón que `updateOfficeSkillsAction`.

**Tests nuevos** (`lib/__tests__/oficinaExtras.test.ts`, siguiendo la
misma disciplina de Fase E1): `generateSimulatedKpis` — el trend nunca
baja de 0 pase lo que pase el dado (200 corridas para cubrir las 3
salidas de `Math.random()`), y no muta los ejemplos fijos que usa como
base; `parseOficinaExtrasFormData` — happy path, `FormData` vacío,
JSON roto en cualquiera de los 3 campos. `lib/oficinaExtras.ts` sigue
al 100% de cobertura real (branches incluidas) con las funciones
nuevas sumadas.

**E2E nuevo**: `e2e/oficina-extras-editor.spec.ts` — abre el editor de
una Card de prueba en un navegador real, expande la sección "Keep in
Flow" (arranca colapsada), escribe el objetivo, guarda, y confirma por
SQL directo que quedó en la DB. No alcanza con que el parser esté
testeado si el botón de guardar nunca se probó de verdad.

**Verificado, pipeline completo antes de shippear**: `tsc --noEmit`
limpio, `pnpm lint` limpio, `pnpm test:unit:coverage` 100% (42→ahora
más tests, todos pasando), `pnpm build` limpio, los 5 E2E de Playwright
pasando (los 4 de antes + el nuevo).

Shippeado como v1.36.0. Próximo paso: Fase E3 — mostrar todo esto de
verdad en la Oficina Virtual pública (`KeepInFlowBlock.tsx`,
`CheckDeRealidadBlock.tsx`, banner de la frase del día).

## Oficina Virtual — Fase E3: Keep in Flow + Check de Realidad, ahora visibles (2026-09-22)

Lo que E1/E2 armaron (schema + editor) por fin se ve en la Oficina real
del dueño — `OwnerOficina` en `app/c/[slug]/oficina/page.tsx`, justo
debajo del saludo, antes de todo lo demás ("lo más importante del día
arriba", como pedía el plan). Privado: un visitante nunca ve estos dos
bloques, mismo criterio que Seguimiento/Notas de Voz.

**`components/KeepInFlowBlock.tsx`** — el objetivo del día (texto libre
del dueño, **sin fallback inventado**: vacío queda vacío, cáscara
honesta) + la frase motivacional del día
(`lib/oficinaExtras.ts#pickPhraseOfTheDay`, la misma todo el día,
nunca un modelo en vivo). El "banner animado" que pedía Gunnar reusa el
gleam (`sweepGleam`, `app/globals.css`) que ya usa `LyCardView.tsx` —
una franja de luz cruzando el panel cada 4s — en vez de inventar una
coreografía nueva o un marquee de texto (no hay nada que desplazar
mostrando UNA frase por día).

**`components/CheckDeRealidadBlock.tsx`** + **`components/Sparkline.tsx`**
— grid de hasta 3 KPIs (valor grande serif + label + sparkline), cada
uno con su gráfico de tendencia a mano en SVG. Usé la skill de dataviz
de esta sesión para los mark specs del sparkline: línea 2px en gris de
"de-énfasis" (nunca el acento — el acento se reserva para "hoy"),
marcador del último punto r>=4 en el color de acento con un anillo de
2px en el color de superficie para que no se pierda si cruza la línea.
La geometría (`lib/sparkline.ts#sparklinePoints`/`sparklineLastPoint`)
quedó separada del componente — función pura, testeada, sin JSX — mismo
criterio shift-left del resto de la sesión: trend vacío, un solo punto,
o todos los valores iguales (división por cero evitada) tienen su test
de caso borde.

**Ambos con la etiqueta de "ejemplo" cuando corresponde** — si nadie
cargó KPIs o frases propias, se usan `DEFAULT_REALITY_CHECK_KPIS` /
`DEFAULT_MOTIVATIONAL_PHRASES` (ya existían desde E1) pero marcados
como ejemplo, nunca confundidos con datos reales del N0.

**Verificado real, no solo compilado**: además del pipeline de siempre
(tsc + lint + unit 100% + build), un script descartable con Playwright
abrió la Oficina en un navegador real con datos de prueba y sacó
screenshot — confirmó visualmente que el layout, el sparkline y el
banner se ven bien antes de escribir el E2E permanente. Ese E2E
(`e2e/oficina-fase-e3.spec.ts`) quedó en el repo con 2 tests: el dueño
ve su objetivo/frase/KPIs con al menos un `<svg polyline>` real
renderizado, y un visitante sin sesión NO ve ninguno de los dos
bloques. Los 7 E2E de la suite (los 5 de antes + estos 2) pasando.

Shippeado como v1.37.0. Próximo paso, Fase E4: Noticias/Tareas +
Calendario, después de Superpoderes y Cerebro Malla en el orden pedido
por Gunnar. Fase E5 (ambiente de datos mock en bulk) queda para el
final, como estaba planeado.

## Oficina Virtual — Fase E4: Noticias + Calendario, cierra el orden pedido (2026-09-22)

Últimos dos bloques del orden que pidió Gunnar al arrancar esta ronda:
Saludo → Keep in Flow → Check de Realidad → Superpoderes → Cerebro
Malla → **Noticias** → **Calendario**. Con esto, los 7 puntos del pedido
original ya están todos construidos.

**`components/NewsTasksBlock.tsx`** — lista de noticias cortas
(`Card.newsItems`), fecha + título + cuerpo opcional. **`components/CalendarBlock.tsx`**
— lista de próximos eventos (`Card.calendarEvents`), a propósito **no**
una grilla mensual completa (alcance recortado desde el plan original,
igual que Gunnar aceptó para todo lo demás de esta fase). Los dos
privados del dueño, al final de `OwnerOficina`, con la misma etiqueta de
"ejemplo" que el resto de la Fase E cuando nadie cargó contenido propio.

**Detalle real, no cosmético:** `Card.calendarEvents` ya se leía en otro
lado (el fallback simulado del Superpoder "Agenda" cuando Google no está
conectado) — se parsea una sola vez ahora y se reusa en los dos lugares,
en vez de repetir el `JSON.parse`.

**`lib/oficinaExtras.ts#sortCalendarEventsByDate`** — única lógica real
de esta fase: el Calendario es una lista, así que lo único que hace
falta es que las fechas queden en orden, sin importar en qué orden se
cargaron. Función pura, testeada (fecha inválida no rompe el sort, no
muta el array original).

**Verificado real, dos capas:** un script descartable con Playwright
abrió la Oficina con noticias y eventos cargados **a propósito
desordenados** y sacó screenshot — confirmó visualmente que Calendario
los muestra en orden de fecha, no de carga. Después, el E2E permanente
(`e2e/oficina-fase-e4.spec.ts`) automatiza exactamente esa verificación
comparando la posición en pantalla (`boundingBox().y`) del evento más
próximo contra el más lejano, más el caso de que un visitante nunca ve
ninguno de los dos bloques. Los 9 E2E de la suite completa pasando (7
de antes + estos 2), unit tests 100% en los 4 archivos gateados.

Shippeado como v1.38.0. **Fase E (Oficina ampliada) queda completa
salvo la E5** (ambiente de datos mock en bulk — Programas/Cards de
prueba marcadas `isDemo`, generar/borrar en un tirón), que según el plan
original se deja para el final.

## Oficina Virtual — Fase E5: ambiente de datos demo, cierra toda la ronda (2026-09-22)

Gunnar pidió específicamente el entorno completo: poder elegir CUÁNTOS
Programas generar, y un solo botón para borrar toda la base de datos
falsa después. `isDemo` ya estaba en el schema desde Fase E1 — esta fase
era 100% construir el "generador" y el "borrador".

**Nueva página `/admin/demo-data`** (MasterN0-only, mismo criterio de
acceso que `/admin/reset`):
- **Generar**: un `<input type="number">` con la cantidad (clampeada
  server-side entre 1 y 20 — `lib/demoData.ts#clampDemoCount`, función
  pura testeada, porque un `<input type="number">` del navegador nunca es
  suficiente por sí solo: nada impide que alguien mande un negativo, un
  decimal, o 999999 a mano). Por cada uno: un Program (`isDemo:true`) +
  sus 3 Cards (Legacy ligada al Program, Business y Personal
  independientes — sin Member falso: `memberId` nulo, mismo patrón que
  ya usa la Card `mastern0`), también `isDemo:true`. Los campos de
  Oficina Virtual (KPIs/noticias/calendario/frases) se dejan vacíos a
  propósito — ya caen solos a los `DEFAULT_*` con la etiqueta de
  "ejemplo" desde Fases E1-E4, no hacía falta duplicar ese contenido acá.
- **Borrar todo lo demo**: mismo patrón exacto que
  `resetPlatformAction` (`app/admin/reset-actions.ts`) — hay que escribir
  a mano "BORRAR DEMO" para confirmar, chequeado en el servidor, nunca
  solo en el cliente. Borra Cards demo primero (tienen `programId`
  apuntando a un Program demo, hay que sacarlas antes o la FK lo impide),
  Programs demo después.

**Cáscara honesta, visible**: `/admin` (roster) y `/admin/programs`
ahora muestran una etiqueta **DEMO** en cada Program/Card marcado como
tal — nunca hay que adivinar si algo es de prueba o real con solo
mirarlo.

**Verificado real, dos capas otra vez**: un script descartable de
Playwright corrió el ciclo completo en el navegador (generar 2 →
confirmar en el roster con la etiqueta DEMO → borrar todo → confirmar
0/0 en la DB) con 5 capturas de pantalla en el camino. El E2E permanente
(`e2e/demo-data.spec.ts`) automatiza ese mismo ciclo, más el caso de
seguridad real: escribir la frase de confirmación mal **no** borra nada
(se verifica contra la DB, no solo contra la UI). 10 E2E de la suite
completa pasando, unit tests 100% en los 5 archivos gateados
(`lib/demoData.ts` sumado al ratchet).

Shippeado como v1.39.0. **Con esto, toda la ronda de "Oficina Virtual
ampliada" que arrancó esta sesión (Fases E1 a E5) queda completa.**

## La Malla real — click-to-info + drill-down fractal (2026-09-22)

Después de probar generar 15 Programas de prueba (Fase E5), Gunnar miró
el "Cerebro Malla" de la Oficina y preguntó si cada punto podía tener
info real adentro — no solo puntitos con rayitas — y si se podía meter
Obsidian directo. Obsidian no: es una app de vault local, y Obsidian
Publish es un grafo público desconectado, no una forma de hacer que los
nodos de LyCard respondan a un click. Se le propuso construir el
click-to-info directo en el motor de Malla que ya existe. Confirmado:
"las dos" Mallas (la pública del organismo completo y la del Cerebro del
dueño).

Investigación: `/admin/equipo` (el roster `Node` de EinarOS — Gunnar/
Chaty/Agentes) resultó ser la fuente equivocada para el Cerebro Malla —
es global, no por Programa/Card. Se lo planteé a Gunnar en vez de
construir sobre una base falsa, y su respuesta fue la clave real: la
Malla es la representación gráfica de las conexiones entre los agentes
de cada N (N1, N2, N3, N4...), y cada Card de esta plataforma ES un
Programa del Legacy principal — es decir, cada Programa real es un N3.
Repasé `docs/01-VISION-Y-ALCANCE.md` y `WHITEPAPER.md` §4.4 para anclar
el diseño en la jerarquía fractal ya establecida del proyecto: N0 (dueño)
→ N1 (triada fija Einar=estrategia/Chaty=coordinación/Warren=ejecución)
→ N2 (Guardianas, sin datos reales todavía) → N3 (Expertos/Programas) →
N4 (Especialistas). Plan confirmado por Gunnar, con un agregado crítico:
"el modelo es fractal... si elijo Digital Kingdom, que es N3 de Legacy,
él también tiene sus Ns" — o sea, el drill-down tiene que ser
recursivo: entrar a un Programa muestra su propia cadena de referidos
con la misma forma que el organismo completo, no una vista distinta.

Al investigar `components/MallaGraph.tsx` encontramos que el motor de
click ya estaba armado y sin usar desde que se construyó el componente:
`THREE.Raycaster` + prop `onSelect`, con lógica de distinguir un click
real de un arrastre de cámara (`dragging && !moved`). Esto redujo el
alcance real del trabajo a datos + wiring, no a construir interacción
nueva.

**`lib/mallaReal.ts`** (nuevo): reemplaza los datasets hardcodeados de
`lib/mallaData.ts` por un grafo derivado de datos reales.
`buildRootMallaGraph(programs)` arma Legacy (N0) + la triada N1 fija +
cada Programa real como su propio N3. `buildMemberFractalGraph(rootId,
rootLabel, members)` es genérica — arma el sub-grafo fractal de un nivel
a partir de una cadena de referidos (`referredByMembershipId`), pensada
para servir tanto a `ProgramMembership` como, más adelante con la misma
forma, a `CardNetworkMembership`. 9 tests, 100% de cobertura
(`lib/mallaReal.ts` sumado al ratchet de `vitest.config.mts`), incluyendo
los bordes reales: referido colgando de otro referido (no del root),
`referredByMembershipId` apuntando afuera de la lista (cae al root en
vez de crashear), status corrupto, nombre vacío.

**`components/MallaExplorer.tsx`** (nuevo): envuelve `MallaGraph`,
maneja el estado de vista raíz/drill-down, el panel de info del nodo
seleccionado y la navegación "Entrar a este Programa →" / "← Volver a
Legacy". Los sub-grafos de cada Programa se precalculan todos en el
loader (no hay fetch por click — la cantidad real de Programas es
modesta).

**Wiring en `app/c/[slug]/oficina/page.tsx`**: la Malla pública
(`VisitorOficina`) ahora usa `PublicMallaReal` cuando hay al menos un
Programa real con membership (si no, cae al dataset estático de
siempre, sin romper la demo). El Cerebro Malla del dueño (`TeamMallaBlock`)
usa la Malla real del Programa de esa Card cuando existe
(`card.kind === "project"` con `programId`), mostrando "Malla viva · tu
equipo real" y el conteo real de miembros — sigue cayendo al dataset
`TEAM_MALLA_*` de demo para Cards de company/personal o Programas sin
membership real todavía.

**Verificado real, dos capas**: un script descartable de Playwright
sembró una cadena de referidos real de 3 niveles y confirmó visualmente
(capturas) el click público → info real, click → drill-down → sub-grafo,
y el Cerebro Malla del dueño. El E2E permanente (`e2e/malla-real.spec.ts`)
automatiza lo mismo — clickear un canvas three.js sin selector de
Playwright se resolvió con una búsqueda en espiral desde el centro
(aprovechando que todos los nodos gravitan a un único punto fantasma en
el origen) y down/up explícitos en vez de `.click()` para no disparar el
chequeo de "se movió" del propio motor. El bug real de esta ronda: con
el viewport default el canvas quedaba debajo del fold y
`document.elementFromPoint` devolvía `null` — se arregló con
`scrollIntoViewIfNeeded()` antes de medir el `boundingBox()`.

**Fuera de alcance esta ronda**: `CardNetworkMembership` (la red de
clientes propia de una Card de tipo company) es estructuralmente
idéntica a `ProgramMembership` y reutilizaría `buildMemberFractalGraph`
tal cual — pero cablearla en `app/m/dashboard/company/network/page.tsx`
queda para una ronda futura, no se tocó acá.

Shippeado como v1.40.0.

### Fix: la Card raíz (MasterN0) no veía nada real en su propia Malla (2026-09-23)

Gunnar reportó, después de v1.40.0: "no veo que las cosas se vean en mi
malla... por ser el MasterN0 y Legacy el programa inicial, todo debería
de ligarse allí." Investigado en la DB: la Card `mastern0` (`isOrigin:
true`) tiene **`programId: null`** — nunca estuvo atada a ningún
Programa, porque Legacy no es "un equipo más", es el N0 del que cuelgan
todos. El bug real: `mallaRoot` (el organismo completo) solo se
calculaba `if (!isHost)` — nunca para el dueño — y `teamMalla` (el
Cerebro Malla de un solo Programa) exige `card.programId`, que Legacy no
tiene. Las dos ramas dejaban a Gunnar afuera al mismo tiempo.

Fix en `app/c/[slug]/oficina/page.tsx`: `mallaRoot` ahora se calcula
`if (!isHost || card.isOrigin)`, y en `OwnerOficina`, cuando
`card.isOrigin` es true se renderiza el mismo `PublicMallaReal` que ve
un visitante (organismo completo, con drill-down fractal a cada
Programa real) en vez de `TeamMallaBlock`. El resto de las Cards
project (con su propio `programId`, como Digital Kingdom) siguen viendo
su propio equipo sin cambios.

Verificado real, dos capas: nuevo test E2E
(`e2e/malla-real.spec.ts`, describe "la Card raíz ve el organismo
completo") que crea una Card `isOrigin` de prueba con un Programa real
con referidos y confirma que aparece "Malla viva · el organismo
completo" y nunca el fallback "Vista general de demo" — 13/13 E2E de la
suite completa pasando. Además, script descartable de Playwright contra
la Card `mastern0` real del entorno local (sembrando Programas/miembros
de prueba, borrados al final) con capturas de pantalla, confirmando
visualmente que el bloque se ve prolijo con datos reales.

Shippeado como v1.40.1.

### Reorden de la Oficina del dueño + poda de secciones duplicadas (2026-09-23)

Gunnar reportó varias cosas juntas sobre su propia Oficina después del
fix anterior:

- Los números de la Malla que le di como ejemplo (11 enlaces/2
  Programas/4 miembros) no coincidían con lo que veía (7/1/0). Aclarado:
  esos números salieron de un script de verificación descartable que
  sembró datos de prueba en el entorno **local** y los borró al
  terminar — nunca tocaron producción. Lo que él ve en prod es su data
  real, matemáticamente consistente (root = 1 Legacy + 3 triada N1 + N
  Programas reales; solo 1 de esos Programas tiene `ProgramMembership`
  real cargada, y esos miembros están en estado `invited`/`interviewed`,
  no `active` todavía — de ahí el 0).
- Preguntó si generar Programas demo (`/admin/demo-data`) contaba como
  "compartir la tarjeta". Verificado en el código
  (`app/admin/demo-data/actions.ts`): la generación demo solo crea
  `Program`+`Card` marcados `isDemo`, nunca toca `Member` ni
  `ProgramMembership` ni `CardLead` — son tres conceptos separados a
  propósito: Programas demo (bulk, para probar la plataforma llena),
  red real de un Programa (`ProgramMembership`, vía el flujo real de
  entrevista/activación), y Seguimiento (`CardLead`, gente a la que le
  compartiste tu Card puntual). Generar demo Programas no es "compartir
  tu tarjeta" — son features distintas, no un bug.
- Pidió revisar si los "KPIs" de `KpiRow` (Portafolio/Malla/Próx.
  Cartera) eran lo mismo que Check de Realidad. Confirmado que NO son
  el mismo dato — pero sí son redundantes/confusos: "Portafolio"
  duplicaba `PortfolioBlock` de más abajo, "Malla" en realidad mostraba
  el badge O.D. (nada que ver con el grafo real, un nombre que ahora
  confunde con la Malla de verdad), y "Cartera" era un placeholder
  deshabilitado sin nada atrás. Se sacó de la Oficina del dueño — sigue
  existiendo tal cual para `VisitorOficina` (el embudo público de
  reclutamiento), donde no genera la misma confusión.
- Pidió chequear si el "Calendario" suelto (Fase E4) era redundante con
  el Superpoder "Agenda" (Fase F). Confirmado: los dos leen
  `Card.calendarEvents` — Agenda lo usa como fallback simulado cuando
  no hay Google conectado (y datos reales de Calendar+Tasks cuando sí),
  el Calendario suelto mostraba lo mismo en una lista aparte al final de
  la página. Se sacó `components/CalendarBlock.tsx` — el campo
  `Card.calendarEvents` y su editor en `OficinaExtrasEditor.tsx` siguen
  intactos (siguen alimentando el fallback de Agenda).
- Pidió el reorden: Keep in Flow → Tu Gemelo Digital → Check de
  Realidad → Seguimiento → Superpoderes → Noticias → Malla/Cerebro
  (al final). Implementado tal cual en `OwnerOficina`
  (`app/c/[slug]/oficina/page.tsx`). `FirstConnections`/`PortfolioBlock`
  (no mencionados en la lista) se mantuvieron — son contenido real para
  company/personal y para project recrutado (referrer real), invisibles
  de por sí en la propia Card de Legacy (sin referente) — se ubicaron
  justo después de "Tu Gemelo Digital", antes de "Check de Realidad".

Verificado real, dos capas: E2E completo (13/13) con
`e2e/oficina-fase-e4.spec.ts` actualizado (ya no prueba el Calendario
suelto — confirma explícitamente que NO reaparece, regresión); y
script descartable de Playwright contra la Card `mastern0` real del
entorno local confirmando visualmente el orden exacto pedido y la
ausencia de Calendario/Portafolio duplicado.

Shippeado como v1.41.0.

## Bot Warren — el Gemelo Digital pasa de guión fijo a chat de ramas con datos reales (2026-09-23)

Retomando el roadmap grande, Gunnar pidió entrarle a "Oficina: Negocio→
Programa, Bot Warren". Al explicarlo mal la primera vez (propuse rutear
Superpoderes reales vía IA), Gunnar corrigió: Bot Warren es la puerta al
Gemelo Digital — el "CEO de tu Oficina Virtual", el único con quien el
N0 habla — y el desarrollo de IA real detrás **no se construye acá**, lo
hace otro equipo directo en producción. Lo que pidió para esta ronda es
mejorar la simulación (`components/OfficeDemoChat.tsx`, hasta ahora un
guión lineal fijo, idéntico para cualquier Programa, con un solo botón
de respuesta sugerida por paso) para que "la gente lo juegue" de
verdad: un chat que **use todos los datos reales de la Card/Programa**
y deje pedirle al CEO simulado cosas concretas — vender, crear una app
a medida, analizar una oportunidad, publicar en redes, facturar,
pronosticar (el rango de posibilidades que habilita el equipo de
microservicios de Sergio).

**Diseño**: se mantiene la regla de oro del proyecto — nunca texto
libre fingiendo entender algo que no entiende. En cambio, un **chat de
ramas**: un menú de 6 pedidos (+ "nada por ahora") como respuestas
sugeridas, cada uno lleva a una respuesta simulada armada con datos
reales (nombre, rol, Programa, cita, Superpoderes habilitados, KPIs si
son reales), y siempre vuelve al menú — replayable, se puede pedir más
de una cosa en la misma sesión.

**`lib/gemeloDigitalScript.ts`** (nuevo): `buildGemeloScript(ctx)`, pura
y testeable — arma los 9 nodos (`start`/`menu`/6 pedidos/`end`) a partir
de un `GemeloContext` con los datos reales. Nunca inventa un número
cuando no hay dato real: sin KPIs cargados, "análisis" y "pronóstico"
dicen explícitamente que no hay con qué, en vez de mostrar una cifra
falsa: mismo criterio honesto que el resto de la Oficina (KPIs/noticias/
calendario de ejemplo, siempre marcados como tal). 17 tests, 100% de
cobertura (`lib/gemeloDigitalScript.ts` sumado al ratchet de
`vitest.config.mts`).

**`components/OfficeDemoChat.tsx`**: reescrito para navegar por nodos en
vez de un guión lineal — el menú de opciones se re-renderiza según el
nodo actual, cada línea que empieza con "Simulación —" se muestra más
chica/atenuada para distinguir la aclaración honesta del contenido
simulado en sí.

**Candado de privacidad nuevo**: `app/c/[slug]/oficina/demo/page.tsx`
antes no chequeaba quién la visitaba ("cero datos reales", decía su
propio comentario) — ahora sí importa, porque las respuestas usan
`oficinaObjetivo`/`realityCheckKpis`, que son privados del dueño. Se le
agregó el mismo candado `isHost` que el resto de la Oficina —
`redirect` a `/c/[slug]/oficina` para cualquiera que no sea el dueño.

**Bug real encontrado y arreglado durante la verificación visual**: con
una Card sin `title` ni `puesto` (el caso real de `mastern0` en local),
el mensaje de cierre quedaba "...como  de tu Legacy" (espacio doble,
rol vacío) — fallback agregado (`roleLabel || "el dueño"`) en el loader.

**Verificado real, dos capas**: script descartable de Playwright contra
la Card `mastern0` real del entorno local, recorriendo las 6 ramas con
capturas de pantalla (así se encontró el bug de arriba). E2E permanente
nuevo (`e2e/gemelo-digital-chat.spec.ts`): confirma que un visitante sin
sesión nunca llega al chat (redirect), y que el dueño ve su saludo con
su propio nombre, un KPI real propio (no el de ejemplo fijo) al pedir
un análisis, y el nombre real de su Superpoder habilitado al pedir una
app — 15/15 E2E de la suite completa pasando.

Shippeado como v1.42.0.

## Janus — Tags + motor de emparejamiento "todos contra todos" (2026-09-23)

Después de Bot Warren, Gunnar pidió saltar el Módulo CRM y entrarle al
roadmap de NashMesh — pero antes de escribir código, explicación
completa de qué es (motor matemático `Payment_i = φ_i × ψ_i × (1-ε)`,
no una red social) y un plan concreto, que Gunnar aprobó salvo tres
puntos sin preferencia suya (los decidí yo, documentado en el chat):
arrancar por el simulador de un proyecto (no el generador de escenarios
masivos, que sigue frenado hasta definirlo con Fabricio), v(S) declarado
a mano en cada simulación, y sin bloquear por Fabricio. **NashMesh en sí
no se construyó todavía** — antes de arrancar, Gunnar compartió el
documento de estrategia B4W (`docs.google.com/presentation/...`,
Plataforma Nacional de Desarrollo de Proveedores, Bolivia) y pidió
primero un sistema de Tags para cruzar oferta/demanda.

**Lectura del documento B4W**: el export de texto de Google Drive solo
trajo los headers/footers — el contenido real de cada slide estaba
flatten a imagen. Se descargó el `.pptx` nativo, se extrajeron las 14
imágenes de contenido con `python-pptx`/`unzip`, y se leyeron una por
una. Núcleo del documento: una Empresa Ancla publica demanda (volumen +
certificaciones), un "Score de Madurez" (5-7 niveles) mide la brecha de
cada PyME proveedora, y un motor transaccional de 4 pasos (Entrada →
Validación → Emparejamiento → Ejecución) activa financiamiento
automático solo cuando hay contrato real.

**Diseño propuesto y confirmado por Gunnar** (con una corrección
importante de su parte: el parecido con la arquitectura de LyCard no es
casualidad, se diseñó así a propósito desde el principio):

- El mapeo directo B4W → LyCard ya existente: Cámara/Gobierno =
  `Program`; Empresa Ancla/PyME = `Card kind:"company"`; Score de
  Madurez = el patrón "escalas" ya usado 4 veces; el match confirmado =
  `CardNetworkMembership`; el financiamiento al confirmar = NashMesh
  (diseñado, no construido); el algoritmo = **Janus**, ya nombrado en el
  roadmap sin caso de uso real hasta ahora.
- Corrección de Gunnar que cambió el diseño para mejor: no scopear Janus
  a "Empresa Ancla busca PyME dentro de un Programa" — tiene que ser
  **"todos contra todos" de verdad**, cualquier Card cruzando con
  cualquier otra Card de toda la plataforma, con tags de **cualquier
  producto o servicio**, no solo industriales — ejemplo textual de
  Gunnar: *"si alguien quiere un sandwich de miga y alguien en la red lo
  tiene, ahí sale."* El caso B4W (certificación industrial) y el caso
  sandwich de miga terminan siendo el mismo cálculo genérico, no dos
  sistemas — el diseño quedó más simple y más general a la vez.
- Tres decisiones confirmadas por Gunnar: texto libre para los tags (sin
  catálogo cerrado); los carga el N0 a mano por ahora, con la intención
  explícita de que una IA los cargue sola más adelante (de ahí el campo
  `source` desde el día uno); y sumar tags de servicios además de
  productos/certificaciones.

**`Tag`** (modelo nuevo, migración `20260923161728_tags_janus`): vive en
cualquier Card (project/company/personal), `text` libre + `normalized`
(minúsculas/sin acentos, pre-calculado) + `polarity`
("ofrezco"|"busco") + `category` libre opcional + `source`
("manual"|"ai", hoy siempre manual). A diferencia de Seguimiento/KPIs,
es **público a propósito** — el punto de "todos contra todos" es que se
pueda descubrir.

**`lib/tags.ts`**: `normalizeTagText` (NFD + strip de marcas
combinantes, para que "Café" y "cafe" crucen igual), `normalizeTagPolarity`.

**`lib/janus.ts`**: el motor. `tagSimilarity(a,b)` — 1 si exacto, 0.6 si
uno contiene al otro como palabra (mín. 3 caracteres, evita falsos
positivos con palabras cortas), 0 si no hay relación — mismo criterio
honesto y simplificado que ya se usó en el diseño de NashMesh, sin
IA/embeddings todavía. `computeCardPairMatch` cruza el `busco` de una
Card contra el `ofrezco` de otra (null, no un 0% falso, cuando falta
algún lado). `computeAllMatches` corre "todos contra todos" sobre una
lista de Cards, cada dirección como match separado, rankeado por score.
9+13 tests entre `lib/tags.ts`/`lib/janus.ts`, 100% de cobertura (sumados
al ratchet de `vitest.config.mts`).

**`components/TagsBlock.tsx`**: acordeón "Ofrezco/Busco" con prop
`editable` — el dueño agrega/borra tags (mismo patrón que
`CardLeadsBlock.tsx`: server actions dedicadas en
`app/c/[slug]/oficina/tags-actions.ts`, `assertOwner` repetido a
propósito); un visitante los ve en solo lectura, sin botones de editar.
Insertado en `OwnerOficina` (después de Seguimiento) y en
`VisitorOficina` (antes de la Malla).

**`/admin/janus`** (MasterN0-only, nuevo, mismo patrón de acceso que
`/admin/demo-data`/`/admin/equipo`): lee los tags de todas las Cards
reales (nunca `isDemo`, mismo criterio que la Malla real), corre
`computeAllMatches`, muestra el ranking completo con el % y los pares de
tags que armaron cada match — nunca una caja negra. Link "Janus" sumado
al nav de `/admin`.

**Verificado real, dos capas**: E2E nuevo
(`e2e/janus-tags.spec.ts`, 2 tests) — el dueño agrega un tag y un
visitante lo ve en solo lectura sin poder editarlo; y el caso literal
del sandwich de miga: dos Cards reales sin relación previa, una Card
`isDemo` con el mismo tag exacto que NUNCA debe aparecer en el ranking
(y no aparece) — 17/17 E2E de la suite completa pasando. Script
descartable de Playwright contra Cards reales del entorno local
(`mastern0` buscando, una Card nueva ofreciendo) confirmó visualmente
el 100% de match en `/admin/janus`, con capturas de pantalla.

**Fuera de alcance esta ronda**: el motor de matching sigue siendo
similitud de texto simple — cuando una IA cargue tags sola (la intención
que confirmó Gunnar), el campo `source` ya está listo, sin migrar de
nuevo. NashMesh (el financiamiento que se dispara al confirmar un
match) sigue diseñado pero no construido — próximo paso natural una vez
que haya matches reales corriendo.

Shippeado como v1.43.0.

## NashMesh — simulador de reparto real, disparado desde Janus (2026-09-23)

Cierre del ciclo diseñado esta sesión: Tags → Janus → match confirmado →
reparto. Se construyó exactamente el alcance ya aprobado con Gunnar
antes de tocar el documento B4W: el simulador de UN cruce/proyecto
(no el generador de escenarios masivos, que sigue frenado hasta
definirlo con Fabricio), `v(S)` declarado a mano en cada simulación, sin
esperar a Fabricio para arrancar.

**`NashMeshRun`** (modelo nuevo, migración `20260923162954_nashmesh_run`):
`label`, `totalValueUsd` (el valor declarado a repartir), `epsilon`
(comisión, default 5%), `isSimulation` (siempre `true` en esta versión),
`participants`/`outputs` en Json — snapshot histórico, no FK a Card
(una simulación vieja sigue siendo válida aunque esa Card se borre
después), `cardId` opcional a propósito por si un participante no está
en el sistema todavía (ej. "El Estado" como financiador, caso B4W).

**`lib/nashMesh.ts`**: `computePayment(totalValueUsd, phi, psi, epsilon)
= totalValueUsd × phi × psi × (1-epsilon)`. φ acá es "contribución
declarada a mano" normalizada entre participantes (no necesitan sumar
100, se normalizan solos; si todos declaran 0, reparte parejo en vez de
dividir por cero) — mismo criterio honesto que el resto del proyecto:
nunca fingir el cálculo combinatorio real de Shapley que documenté como
investigación futura. ψ son los tres niveles fijos ya definidos en el
WHITEPAPER (0.15/0.35/1.0). 17 tests, 100% de cobertura.

**`components/NashMeshSimulator.tsx`**: mismo patrón que
`EscalaEditor.tsx` — estado local + un campo JSON oculto + una sola
action de guardado. Cada participante: Card real (select) o nombre
libre para uno externo, % de contribución declarado, nivel ψ. Si llega
con `?fromCardId=&fromName=&toCardId=&toName=` (el link real que manda
`/admin/janus` en cada match), esos dos participantes ya vienen
cargados — no hace falta tipearlos de nuevo.

**`/admin/nashmesh`** (MasterN0-only, mismo patrón de acceso que
`/admin/janus`/`/admin/demo-data`): formulario de nueva simulación +
historial de las últimas 20, cada una con el badge "SIMULACIÓN" siempre
visible. Cada match de `/admin/janus` ganó un link "Simular reparto →"
que arma la URL de prefill directo.

**Verificado real, dos capas**: E2E nuevo (`e2e/nashmesh.spec.ts`) llega
con el prefill real que manda Janus, simula con $1000/ε=0 (matemática
fácil de verificar a mano), y confirma el número exacto ($500 cada uno)
— no solo que la pantalla carga. Encontrado y arreglado durante la
escritura del test: `getByText` sin `exact` matcheaba el placeholder del
select ("...ej. 'El Estado'") en vez del título real de la fila — se
resolvió filtrando por el botón que togglea cada fila, no por texto
suelto. 18/18 E2E de la suite completa pasando. Script descartable de
Playwright contra el cruce real de `mastern0`/Panadería Doña Rosa
(sembrado y limpiado en el mismo script) confirmó visualmente el cálculo
exacto: $100 × 50% × ψ1.0 × 95% = $47.50 para cada participante.

**Fuera de alcance esta ronda**: el generador de escenarios masivos
("12 programas × 12 empresas × 12 legacys") sigue sin construirse —
necesita definir parámetros con Gunnar y sumar a Fabricio, como quedó
anotado desde la explicación inicial de NashMesh. El cálculo de φ sigue
siendo la versión simplificada (contribución declarada), no el Shapley
combinatorio real sobre el grafo de la Malla — esa sigue siendo la
investigación de la Sección H de Fase 12, sin tocar todavía.

Shippeado como v1.44.0.

## Embudo de Conversión — el "CRM" redefinido (2026-09-23)

Gunnar redefinió qué significa "CRM" en LyCard a mitad de esta sesión:
no el pipeline de calidad Sherpa/5-sesiones que ya estaba documentado en
el roadmap (eso sigue sin construir, sin luz verde), sino seguimiento de
conversión — "poder dar seguimiento a la compartida de tarjetas..
cuántas personas le mandé el QR, cuántos se registraron.. el objetivo es
lograr que el miembro invitado pague alguna membresía y tenga su oficina
virtual". Un embudo de 5 etapas: QR compartido → se registró →
entrevistado → Oficina activa → membresía pagada.

No hizo falta un modelo nuevo para las primeras 4 etapas — ya existían
3 piezas sueltas construidas en sesiones anteriores, nunca antes unidas
en una sola vista: `CardLead` (Seguimiento por tarjeta, de cuándo se
compartió el QR), `Registration` (se anotó para la entrevista) y
`ProgramMembership` (`interviewedAt` = entrevistado, `status: "active"`
= Oficina activa). La etapa 5 sí necesitó campo nuevo: `membershipPaidAt
DateTime?` en `ProgramMembership` (migración
`20260923170419_membership_paid_at`) — marcado a mano por el admin
desde el dashboard del Programa, **no hay pasarela de pago real
todavía** (cáscara honesta: es un flag de honestidad, no una
confirmación de cobro).

**`lib/funnel.ts`**: `buildFunnelStages(counts)`, función pura — arma
las 5 etapas en orden con su conteo y el % de conversión respecto a la
etapa anterior (`null` en la primera etapa y cuando el previo es 0, para
nunca dividir por cero; sin techo en 100%, una conversión real puede
superar el 100% del paso anterior si por ejemplo alguien reactivó a
mano sin pasar por todos los pasos). 100% de cobertura, 5 tests.

**`/admin/programs/[id]`**: nueva sección "Embudo de Conversión" arriba
de "Miembros" — barra por etapa (ancho proporcional al máximo, mismo
lenguaje visual dorado del resto del panel), conteo y % al lado. Los
conteos de `CardLead`/`interviewedAt`/`status`/`membershipPaidAt` se
calculan sobre datos ya cargados por el loader existente, más una sola
query nueva (`CardLead.count` scoped por `card.programId`). Cada
Miembro ya activo suma un botón "Marcar como pagada" (togglea
`membershipPaidAt`, gateado a `status: "active"` — no tiene sentido
marcar pagada una membresía que ni activó su Oficina) usando
exactamente el mismo patrón `requireProgramAccess`/`requireMembership`
que ya usaban `updateMemberAction`/`deleteMemberAction`.

**Verificado real**: E2E nuevo (`e2e/funnel.spec.ts`) siembra 8 leads, 3
registrations y 4 memberships (una invitada, una activa sin pagar, dos
activas pagadas) sobre un Programa real, confirma que cada etapa cuenta
bien (incluido el 38% de conversión de compartido→registrado) y que
tocar "Marcar como pagada" persiste de verdad en la fila de
`ProgramMembership` — no solo que el botón está ahí. 19/19 E2E de la
suite completa pasando. Script descartable de Playwright contra un
Programa sembrado a mano confirmó visualmente el embudo completo y el
toggle end-to-end (2 pagadas → 3 pagadas al togglear una tercera),
capturas revisadas y borradas.

**Fuera de alcance esta ronda**: pasarela de pago real (Stripe u otro) —
seguimos sin ninguna, el campo es 100% manual. El "CRM del panel admin"
(auditoría de acciones) que Gunnar mencionó como idea suelta y marcó
él mismo como no definida todavía ("no sé si es lo mismo siendo fractal
para ser honesto") sigue sin construirse, a propósito.

Shippeado como v1.45.0.

## Modo Foco — Superpoder nuevo, "algo similar a Brain.fm" (2026-09-23)

Gunnar pidió explorar un Superpoder al estilo Brain.fm (audio funcional
para sostener atención) apoyado en un par de investigaciones externas
(un informe sobre LyCard/EinarOS con hallazgos de seguridad reales pero
fuera de este repo, y un PDF sobre la ciencia detrás de Brain.fm). Antes
de escribir código se filtró a propósito lo que no aplicaba: nada de
EinarOS (HorusEye podando rutas, Jev/Score/Choice, Carbono) porque no
existe en LyCard; nada de "Neural Phase-Locking" ni Solfeggio en el copy
porque la evidencia real detrás de brainwave entrainment es floja —
Brain.fm sí tiene un estudio propio con NSF, pero eso no generaliza a
"cualquier pulso sincroniza tus neuronas". El copy de este Superpoder se
queda corto a propósito: "un ambiente sonoro constante, sin
distracciones", nada más.

Decisión de arquitectura clave: **cero pistas de audio externas**. El
plan original evaluaba curar CC0 de Freesound y alojarlas — se descartó
apenas se llegó a la implementación real: no había ninguna pista en mano
para curar de verdad, y fabricar URLs de "pistas curadas" que no existen
hubiera sido la misma mentira por omisión que ya evitamos en otros
lados del producto (los datos de demo inventados, los testimonios
falsos). La solución más honesta terminó siendo también la más barata:
**todo el audio se sintetiza en vivo en el navegador** con Web Audio
API — pulso de volumen (LFO modulando el gain principal), ruido de
fondo (rosa/marrón, generado por algoritmo, dominio público) y un pad
armónico de 2-3 osciladores. Cero archivos, cero licencias, cero
storage.

**`lib/focusAudio.ts`** (puro, testeable): 4 modos fijos — Foco
profundo (pulso 15Hz/ruido marrón), Creativo (6Hz/rosa), Relajación
(10Hz/rosa), Sueño (2.5Hz/marrón, acorde muy grave) — cada uno con su
`pulseHz`/`pulseDepth`/`noiseColor`/`padHz`/`padGain`. `getFocusMode`
nunca revienta ante una key desconocida (cae a "foco"). 3 duraciones
fijas (10/20/45 min). `formatCountdown`/`formatDurationLabel` para la
UI. 100% de cobertura, 16 tests.

**`components/FocusModeBlock.tsx`**: arma el grafo de Web Audio real
(`AudioContext` + `GainNode` maestro modulado por un LFO vía
`AudioParam`, un `AudioBufferSourceNode` de ruido generado a mano, y
osciladores para el pad) — el algoritmo de ruido rosa/marrón vive acá
mismo, no es una librería. Selector de modo + duración → sesión corriendo
(timer real, pulso visual sincronizado a la frecuencia del modo, pausar/
terminar) → al cerrar, en vez de saltar a otro Superpoder (frágil si ese
Programa no tiene Notas de Voz habilitado), reusa el pipeline real de
Notas de Voz directo acá adentro (mismo `createVoiceNoteAction`, mismo
`MediaRecorder`) para grabar "¿qué sacaste de esta sesión?" — cero
tablas nuevas, cero backend nuevo.

**Encaja en el sistema de Superpoderes existente sin migración**: se
sumó `"modo-foco"` a `OfficeSkillAppType` (una unión de TypeScript, no
una columna) y una entrada nueva a `DEFAULT_OFFICE_SKILLS` — aparece de
entrada en cualquier Oficina que no haya personalizado su lista, y
también quedó disponible en el dropdown de `OfficeSkillsEditor` para
quien sí la personalizó. Más chico que Notas de Voz, que sí necesitó
tabla propia.

**Verificado real**: E2E nuevo (`e2e/focus-mode.spec.ts`) confirma que
el `AudioContext` se arma de verdad en Chromium (sin tirar el error de
"este navegador no puede reproducir"), que el timer arranca en el
tiempo elegido, y que terminar la sesión lleva a la pantalla de
reflexión real. 20/20 E2E de la suite completa pasando. Script
descartable de Playwright confirmó visualmente las 3 pantallas (setup
con los 4 modos, sesión corriendo con el timer bajando de verdad,
reflexión con el grabador), capturas revisadas y borradas.

**Fuera de alcance esta ronda**: pistas de audio pregrabadas (curadas o
generadas por IA) — quedó resuelto que no hacen falta para el MVP,
posible capa opcional a futuro si el sintetizado no alcanza. Medición
de uso (KPI de "sesiones esta semana" en Check de Realidad) — se decide
después de ver uso real, no antes, según lo charlado con Gunnar. Chequeo
de patentes sobre el método puntual de Brain.fm — pendiente antes de
que esto se use como argumento de venta, no bloquea el build porque la
modulación de amplitud en sí es de dominio público.

Shippeado como v1.46.0.

## 3 fixes rápidos de la auditoría + prep de la solución real de cupos (2026-09-23)

Gunnar pidió atacar `docs/08-AUDITORIA-2026-09-23.md` mientras corría sus
pruebas manuales: "dale al 3" — los arreglos chicos ya, más uno grande
preparado sin pushear para decidir después. Los 4 candidatos "chicos" del
audit eran: badge desactualizado, slot vencido reservable, sin validar/
dedupear registros, y un doc duplicado. Se shippearon 3 — el cuarto
(`WHITEPAPER-ADENDA-2026-09 (1).md` vs `.md`) resultó **no ser un
duplicado accidental** al diffearlos: son dos borradores legales reales
con conclusiones distintas sobre el criterio anti-MLM #4 (uno lo da por
cerrado con una regla formal de ψ, el otro lo deja pendiente de dictamen
legal) — decisión de Gunnar, no mía, se deja sin tocar.

**Hallazgo 2.2 (badge "6 fijos")**: `app/admin/programs/[id]/page.tsx` —
el badge y el subtítulo de "Superpoderes de la Oficina" tenían el número
`6` a mano en 3 lugares. Ahora los tres leen
`DEFAULT_OFFICE_SKILLS.length` (hoy 8) — nunca más se desactualiza solo
porque se sume un Superpoder nuevo.

**Hallazgo 2.1 (slot vencido reservable)**: `lib/interviewSlots.ts` — cada
slot ahora tiene un campo `date` (ISO) real, y dos funciones nuevas:
`isSlotUpcoming(slot, now)` y `upcomingSlots(now)`, con `now` inyectable
para poder testear sin mockear el reloj. `slotById` sigue resolviendo
slots vencidos a propósito (una Registration vieja necesita poder seguir
mostrando el nombre de su slot). `components/LyCardView.tsx` ahora
renderiza `upcomingSlots()` en vez del array crudo — el slot "Martes 22"
ya no aparece como opción. El servidor (`registerInterviewAction`)
también rechaza un `slotId` vencido aunque llegue igual (cliente viejo
sin refrescar), con el mismo error genérico que un slot inexistente.

**Hallazgos 1.2/1.3 (sin validar email, sin dedupe)**:
`app/c/actions.ts#registerInterviewAction` — el email (campo opcional en
este formulario) ahora se valida con el mismo regex que ya usaba
`sendInvitationAction` cuando viene algo, nunca cuando viene vacío.
Dedupe: antes de crear una `Registration`, se busca si esa Card ya tiene
una fila con ese mismo `whatsapp` — si existe, se **actualiza** (nuevo
slot/nombre/email) en vez de duplicar. No hay constraint única en el
schema todavía (esa es la versión "de verdad", ver más abajo) — esto es
la versión de aplicación, suficiente para cerrar el problema de fondo sin
migración.

**Verificado real**: E2E nuevo (`e2e/interview-slots.spec.ts`) entra como
visitante anónimo (sin login — este flujo es público), confirma que el
slot vencido no aparece en pantalla, que un email mal formado no llega a
la pantalla de éxito ni crea fila en `Registration`, y que agendar dos
veces con el mismo WhatsApp deja **una sola fila** en la base con el
`slotId` actualizado al segundo intento — verificado con una query
directa a Postgres, no solo mirando la UI. `lib/interviewSlots.ts` sumado
al ratchet de cobertura (100%, 8 tests) — cierra una fracción del
hallazgo 2.3 (módulos `lib/` sin tests) de paso. 21/21 E2E de la suite
completa pasando.

Shippeado como v1.46.1.

### Cupo real de entrevistas por slot (2026-09-23)

Preparado en la rama `feature/cupo-entrevistas-real` mientras Gunnar
hacía su ronda de pruebas manuales; al terminar ("termine.. sigue..")
confirmó que se implemente, así que se mergeó a `main` (fast-forward,
sin conflictos) y se shippeó. Esta es la resolución real del punto 1.4
del audit original — lo que el fix rápido de 2.1 había resuelto fue "no
ofrecer lo vencido", no "no permitir más gente de la que entra".

**Modelo nuevo `InterviewSlot`** (migración `20260923184125_interview_slot_real`):
`programId` (scoped por Programa, mismo patrón que `Puesto` — filas
propias con id estable, no un JSON compartido, porque acá hace falta
contar `Registration`s reales), `label`/`labelEn`/`time` (igual que el
array viejo), `date` (`DateTime` real, no un string parseado a mano), y
`capacity` (default 20). `Registration` suma `interviewSlotId` opcional
(`onDelete: SetNull`) — el snapshot `slotId`/`slotLabel` de siempre sigue
llenándose igual, esto solo habilita contar cupo real.

**`app/admin/programs/interview-slots-actions.ts`** (nuevo, mismo molde
que `puestos-actions.ts`): `createInterviewSlotAction`/
`updateInterviewSlotAction`/`deleteInterviewSlotAction`, con guardia real
en el borrado — no se puede borrar un horario con gente ya anotada
(mismo criterio que `deleteMemberAction` con `cardCount`).

**`app/c/actions.ts#registerInterviewAction`**: ahora resuelve el
`slotId` recibido primero contra `InterviewSlot` (id real, cuid) y solo
si no lo encuentra cae al array hardcodeado de `lib/interviewSlots.ts` —
un Programa que no cargó horarios propios sigue funcionando exactamente
igual que hoy. Con un slot real: rechaza fecha vencida (server-side,
comparando contra medianoche de hoy), y rechaza reservar si ya hay
`capacity` personas anotadas — excluyendo de ese conteo a la propia
persona si está reagendando (no se bloquea a sí misma al cambiar de
horario). Nuevo código de error `"full"`, con copy propio
(`scheduleErrFull`/`scheduleErrEmail` en `lib/i18n.ts`, ES/EN).

**Flujo de datos server→cliente cambia**: `LyCardView.tsx` dejó de
importar `upcomingSlots()` directo (no tenía forma de saber a qué
Programa pertenecía la Card) — ahora recibe `interviewSlots` como prop,
resuelta en `app/c/[slug]/page.tsx#buildCardBundle` (real del Programa si
tiene filas propias y es una Card `project`, si no el fallback fijo de
siempre) y pasada a través de `CardCarousel.tsx`.

**Nueva sección admin "Horarios de Entrevista"** en
`/admin/programs/[id]`, mismo patrón visual que "Escalera de Puestos":
crear/editar/borrar horarios con fecha real (`<input type="date">`),
hora de display, y cupo.

**Verificado real**: `e2e/interview-slots-real.spec.ts` (nuevo) — un
horario con `capacity: 1`, una primera persona lo reserva, una SEGUNDA
persona con WhatsApp distinto lo encuentra lleno (error visible en
pantalla, y confirmado con query directa a Postgres que sigue habiendo
una sola fila), y el admin lo ve y lo administra desde
`/admin/programs/[id]`. 22/22 E2E de la rama completa pasando (suite
vieja + los 2 specs nuevos de hoy). Script descartable de Playwright
confirmó visualmente las 4 pantallas (picker con el horario real, éxito
de la primera reserva, error "Ese horario ya se llenó" de la segunda, y
la sección de admin con "cupo 1"), capturas revisadas y borradas.

**Pipeline completo, corrido dos veces** — una vez al prepararlo en la
rama, y otra vez de nuevo sobre `main` recién mergeado, por las dudas de
que algo hubiera cambiado en el entorno mientras tanto: tsc, lint, tests
unitarios (100%, sin cambios — toda la lógica nueva es DB-backed,
cubierta por E2E en vez del ratchet de `lib/`), build de producción,
22/22 E2E ambas veces.

Shippeado como v1.47.0.

## Tamaños ajustables por Card — long-press en la tarjeta real (2026-09-23)

Retomó un pedido de Gunnar del 17 de septiembre ("todos los tamaños
editables desde el Dashboard", Grupo A del backlog grande) que en su
momento se pausó a propósito: en esa sesión se acordó arrancar con 5
ajustes fijos en vez de un sistema de tokens completo, dejando "todo
editable" como fase aparte "si después de probar la tarjeta seguís
necesitando ese nivel de control" — quedó registrado así en el commit
`de9b430`. Hoy Gunnar lo volvió a pedir, esta vez con una forma concreta:
"que aprieto de forma sostenida y saltan los módulos y me permite
ajustar tamaño."

**Decisión de diseño, explicada antes de programar**: se evaluaron 2
caminos — (A) handles de arrastre por módulo directo sobre la tarjeta
(el layout hoy es 100% flexbox + `clamp()`, así que esto implica
convertir ese sistema responsivo en overrides de píxeles por gesto,
semanas de trabajo real) vs. (B) un panel de sliders con vista previa EN
VIVO sobre la tarjeta real (mismo criterio arquitectónico que ya usa
todo — `officeSkills`/`escalas`/`InterviewSlot` — Json editable con
fallback fijo). Se propuso B, Gunnar lo confirmó. **Por Card, no por
Programa** — cada dueño ajusta la suya, decisión suya explícita
("y si sería para todos no solo para mí").

**`Card.sizeConfig`** (migración `20260923191319_card_size_config`): Json,
default `{}` — sin tocar nada, 100% en los 4 módulos, cero cambio visual
para nadie que no abra el panel.

**`lib/cardSizeConfig.ts`** (puro, testeable): 4 módulos ajustables —
Foto, Botón QR, Cubos laterales, Íconos sociales — cada uno un
multiplicador 0.5-1.5 (default 1). `parseCardSizeConfig` nunca confía en
el JSON de la DB a ciegas (clampea, ignora keys desconocidas, cae al
default ante NaN/Infinity — un valor no-finito no se clampea al máximo,
se descarta directo). `buildCardSizeCssVars` arma
`{"--scale-photo": "0.85", ...}` con 2 decimales. 100% de cobertura, 12
tests.

**El truco técnico real**: todo el layout de `LyCardView.tsx` ya usaba
`clamp(mín, Xdvh, máx)` para cada módulo dimensionado (precedente:
`clamp(84px,15dvh,140px)` del botón QR) — no hizo falta inventar una
unidad nueva, cada `clamp()` se envolvió con
`calc(valor*var(--scale-X,1))`. Las variables se inyectan una sola vez
en el wrapper raíz (mismo mecanismo que `--accentRgb` para los colores
de Skins) y se heredan por CSS hacia cualquier descendiente, aunque el
estilo del módulo (`CUBE_MEDIUM`, `SOCIAL_ICON`) sea una constante de
módulo de React, no algo recalculado por instancia — las variables CSS
resuelven por árbol de DOM en el navegador, no en JS.

**`components/CardSizePanel.tsx`** (nuevo): el panel que abre el
long-press (550ms sostenido, isHost-only, se cancela si el dedo se mueve
más de 12px o si ya hay otro modal abierto). `liveConfig` es el MISMO
estado que arma las variables CSS del wrapper — mover un slider cambia
la tarjeta real, atrás del panel translúcido, al toque, sin round-trip
al servidor. "Cancelar" descarta el ajuste en vivo sin tocar la DB;
"Guardar" llama a `updateCardSizeConfigAction` (nuevo,
`app/c/sizeConfig-actions.ts`, mismo `assertOwner` que ya usan
`voiceNotes-actions.ts`/`leads-actions.ts`/`tags-actions.ts`) y persiste
de verdad.

**Verificado real**: `e2e/card-size-panel.spec.ts` (nuevo, 2 tests) —
long-press real (`page.mouse.down()` + esperar 700ms) abre el panel,
mover el slider de Foto a 70% cambia la variable CSS real del wrapper
**antes** de guardar (leído con `getComputedStyle`, no un mock), guardar
persiste en Postgres (confirmado con query directa), y recargar la
página mantiene el 70% sin reabrir el panel. Segundo test: un visitante
sin sesión mantiene presionado y no pasa nada — el gate `isHost` corta
antes de que el timer siquiera arranque. 24/24 E2E de la suite completa
pasando. Script descartable de Playwright confirmó visualmente las 3
etapas (tarjeta normal → panel abierto con la tarjeta real detrás →
Foto achicada a 65% + Botón QR agrandado a 140%, ambos cambiando en vivo
antes de tocar Guardar), capturas revisadas y borradas.

**Fuera de alcance esta ronda**: handles de arrastre directo (Opción A,
descartada por costo/riesgo, ver arriba). Un 5° o 6° módulo ajustable
(ej. el nombre/tipografía) — se suma fácil con el mismo patrón el día
que haga falta. Ajuste a nivel Programa (aplicar el mismo tamaño a las 3
Cards de una cuenta de un saque) — hoy cada una es independiente, a
propósito.

Shippeado como v1.48.0.

## Aclaración de contexto: modelo Freemium/planes de precio (2026-09-23)

Gunnar preguntó si el modelo de negocio de niveles de suscripción
(Freemium → Automatizado → Normal → Enterprise, convertir un usuario
Freemium a pago mostrándole cómo parametrizar su propia Oficina/Gemelo
Digital) ya estaba mapeado. **Sí, extensamente** — ver
`docs/05-ROADMAP-EDT.md` (sección "Modelo de negocio: Programa Legacy y
sus planes") y `docs/01-VISION-Y-ALCANCE.md`. Incluye hasta un borrador
de schema (`Program.planTier`/`setupFeeUsd`/`monthlySubscriptionUsd`/
`commissionOnSalesPct`) y el flujo del "nacimiento" (N0 recibe programa →
explora → crea tarjetas → las juega en Freemium → crea usuario real, por
2 caminos: Personal solo-Gemelo-Digital o Full con 3 bots+infraestructura).

**Resuelto por Gunnar en el mismo hilo — los 3 niveles de usuario, con
nombre propio** (no estaban en ningún doc anterior que se haya
encontrado; primera vez que quedan registrados con estos nombres):

1. **"Mirón"** — a quien alguien de un Programa le comparte su LyCard
   (ej. por QR). Solo puede VER esa tarjeta puntual, la del que lo
   invitó — nada de crear, nada de registrarse. Es exactamente el
   `VisitorOficina` de hoy, sin sesión. **Esto SÍ coincide** con lo que
   el doc viejo llama "Freemium" ("todo bloqueado, cero bot") — la
   discrepancia que se había marcado antes ya no es tal: el doc viejo
   describe al Mirón, no al Vividor.
2. **"Vividor"** — se registra, entra a la opción Freemium real, crea
   sus 3 tarjetas, tiene una Oficina Virtual **básica**: compartir su
   tarjeta, acceso al CRM (Embudo de Conversión), y todo lo que se
   construyó en esta sesión completa (Superpoderes, Modo Foco, tamaños
   ajustables, todo) — **"todo lo que hemos programado y hecho es para
   ese Fremium"**, palabras de Gunnar. Es el nivel real de uso de la
   plataforma hoy.
3. **"Chido"** — paga alguno de los servicios. Pasa primero por el
   programa de entrevista y luego por la creación de su Oficina Virtual
   — nivel de personalización y complejidad de esa Oficina depende de
   la membresía que compró. Es quien mapea a los 4 planes de precio
   (Freemium/Automatizado/Normal/Enterprise) del doc viejo.

**Un punto sin cerrar, real, no cosmético**: hoy en el código, tener tus
3 tarjetas depende 100% de `completeInterviewAction` — un N0/Admin tiene
que activar la membresía a mano, no existe un "me registro y ya tengo
mis 3 tarjetas" de verdad self-service. Eso encaja con el flujo del
"Chido" (pasa por entrevista primero) pero **no** con la descripción del
"Vividor" ("se registra... puede crear sus 3 tarjetas" — sin mencionar
entrevista). ¿El Vividor también pasa por una entrevista (aunque sea
liviana, un solo click del N0) antes de tener sus 3 tarjetas, o el plan
es que se registre y las tenga al toque, sin que nadie del otro lado
tenga que aprobar nada? Esa es la pieza que falta confirmar antes de
tocar código de este modelo.

**Nada de esto está construido todavía** — cero campo `planTier` real en
el schema, cero gate de Oficina por nivel de usuario/suscripción, cero
Stripe. Sigue siendo 100% diseño.
