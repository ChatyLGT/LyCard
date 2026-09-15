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
