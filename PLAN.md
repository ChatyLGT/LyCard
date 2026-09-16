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
