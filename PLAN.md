# LyCard — Plan de Plataforma Completa

Documento vivo. Última actualización: 2026-09-15, madrugada, sesión nocturna.
Todas las fases están ordenadas por dependencia — no se puede saltar a la Fase 4
sin tener la 0-3 en pie. Cada fase tiene: qué se construye, modelo de datos,
pantallas/rutas nuevas, y qué decisiones de producto quedan pendientes de tu
revisión (marcadas **[DECISIÓN GUNNAR]**).

---

## ⚠️ REGLA PERMANENTE — no negociable, leer antes de tocar cualquier cosa (2026-09-24)

**Esto no es para salir al mercado.** Todo lo que se construye en este repo
es para entregárselo a **Sergio y Fabricio** — son los únicos que dan luz
verde para producción real, nunca este proceso por sí solo. Ninguna sesión
de trabajo acá — ni yo, ni ninguna instancia futura de Claude en este
repo — decide ni implica que algo "ya está listo para salir".

Lo que esto significa en la práctica, todos los días:

- El objetivo de cada feature es ser **top 1%** — el criterio no es "que
  funcione", es "que a Sergio/Fabricio les resulte fácil auditarlo, entender
  el porqué de cada decisión, y no tener que rehacerlo". Código y docs
  siempre escritos para que otro humano (no Gunnar, no quien lo pidió) pueda
  retomarlo sin arqueología.
- Nunca decir ni implicar "esto está listo para producción/para clientes
  reales" — el lenguaje correcto es "está construido, testeado, y
  documentado para que Sergio/Fabricio lo evalúen", nunca más que eso.
- La disciplina de shipeo ya establecida (tsc + lint + tests 100% + build +
  E2E + verificación visual + PLAN.md + versión) sigue siendo el piso, no el
  techo — es lo mínimo para que la entrega a ellos sea honesta, no el
  criterio de "ya se puede vender".
- Cáscara honesta aplica también hacia adentro: si algo es simulado,
  parcial, o una apuesta de diseño sin validar, se documenta como tal en
  PLAN.md — Sergio/Fabricio necesitan saber exactamente qué es real y qué
  no para poder auditar de verdad.

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

## Alta Freemium self-service: cierra el bache del Vividor (2026-09-23)

Gunnar cerró la pregunta que quedó abierta arriba: **"el registro
Freemium no debería necesitar aprobación de nadie. Cualquier persona
puede registrarse"**. El flujo ideal que describió: Host invita a Guest
(comparte su LyCard) → Guest la mira → Guest crea la suya, se convierte
en Vividor → juega con ella, le gusta → recién ahí entra al proceso de
membresías para volverse Chido. Nada de esto pasa por un N0 aprobando
nada en el paso de Vividor.

**El bache real, más profundo de lo que parecía al principio**:
investigando el código para armar el fix aparecieron dos problemas, no
uno. El esperado — `joinLegacyProgramAction` (que sí hace el alta+cards)
nunca estaba conectado al login real, solo al chat de demo de Bot Warren
("Simulá tu Gemelo Digital" en la Oficina, un feature completamente
distinto). Y el que no se esperaba — el flujo real de "Creá tu LyCard"
(`/m/login` → OTP por WhatsApp → `/m/dashboard`) tampoco llamaba a
`joinLegacyProgramAction` NUNCA: `verifyOtpAction` solo creaba el
`Member` y la sesión, sin unirlo a ningún Programa. El único camino real
que activaba una membresía y creaba las 3 Cards era
`completeInterviewAction`, gateado 100% por un click de admin en
`/admin/interviews` — exactamente el hueco que Gunnar señaló.

**La solución, sin duplicar la lógica de activación**:

- `lib/activateMembership.ts` (nuevo): se extrajo el corazón de
  `completeInterviewAction` (activar la membresía, crear las 3 Cards que
  falten por `kind`, archivar el `OriginMemento` del referente) a
  `activateMembershipAndSpawnCards(membershipId, {markInterviewed,
  recruitedAt?})` — la única diferencia real entre un alta por entrevista
  real y una self-service es ese flag: `markInterviewed: true` solo
  cuando de verdad hubo una entrevista humana, para no ensuciar la
  cuenta de "Entrevistado" del Embudo de Conversión (`lib/funnel.ts`).
  Idempotente por `membershipId` y por `kind` de Card ya existente.
- `app/admin/interviews/actions.ts#completeInterviewAction`: se
  refactorizó para llamar a ese helper (`markInterviewed: true`) — mismo
  comportamiento externo de siempre, ahora sin duplicar 100 líneas.
- `lib/legacyMembership.ts` (nuevo):
  `ensureLegacyMembershipAndCards(memberId, referredByCardSlug)` — crea
  (o encuentra) el Programa Legacy, resuelve el referente por el slug de
  su Card si vino uno, upsertea la `ProgramMembership` como "invited", y
  llama al helper de arriba con `markInterviewed: false`. Esto es lo que
  de verdad convierte a alguien en Vividor.
- `app/m/actions.ts#verifyOtpAction` — el path real, el que se usa de
  verdad — ahora llama a `ensureLegacyMembershipAndCards` justo después
  de crear la sesión del Member. Recibe un `referredByCardSlug` nuevo en
  su input. Se ejecuta en cada login (no solo el primero) a propósito:
  es idempotente, así que un Vividor que ya tiene sus Cards no se
  duplica nada, pero alguien viejo que quedó sin ellas (de antes de este
  fix) las recibe la próxima vez que entra, sin acción de nadie.
- `app/m/auth/google/callback/route.ts` — mismo llamado tras crear la
  sesión, así que el login con Google también da de alta al Vividor
  (sin referido en esta ronda — el `?ref=` no viaja todavía por el
  round-trip de OAuth, deferred).
- `app/m/onboarding/actions.ts#joinLegacyProgramAction` — se simplificó
  a un llamado directo al mismo helper compartido; sigue siendo el
  puente del chat de demo Bot Warren, ahora sin lógica propia duplicada.
- El `?ref=` viaja de punta a punta: el link "Creá tu LyCard" en
  `LyCardView.tsx` (antes `href="/m/login"` a secas) ahora suma
  `?ref=${card.slug}`; `MemberLoginForm.tsx` lo lee con el
  `useSearchParams()` que ya tenía (antes solo para errores de Google) y
  lo manda en `verifyOtpAction`.
- `app/m/dashboard/page.tsx`: el aviso de "sin tarjetas todavía" decía
  que se creaban solas cuando un admin marcara la entrevista — ya no es
  cierto para el caso normal, así que se cambió a pedir simplemente
  volver a entrar (cubre el único caso real que puede quedar en 0: un
  Member de antes de este fix).

**Verificado real**: `e2e/freemium-selfservice.spec.ts` (nuevo, 3 tests)
— (1) un visitante anónimo entra a la Card real de un Host, ve el link
"Creá tu LyCard" con el `?ref=` correcto, lo sigue, completa el OTP real
(lee el código simulado de la propia pantalla, no un mock) y termina en
`/m/dashboard` con sus 3 Cards ya creadas — confirmado contra Postgres:
`ProgramMembership.status === "active"` con `interviewedAt === null`
(no cuenta como entrevista real), y el `OriginMemento` con el slug y
nombre del Host correctos; (2) un segundo login del mismo WhatsApp no
duplica las 3 Cards (idempotencia real, contra la DB); (3) — cubriendo
el refactor de `completeInterviewAction`, que no tenía ningún E2E propio
hasta hoy — un admin marca la entrevista hecha desde `/admin/interviews`
y la membresía queda activa con `interviewedAt` sí seteado, más las 3
Cards creadas, exactamente como antes del refactor. 27/27 E2E de la
suite completa pasando. `npx tsc --noEmit`, `pnpm lint` (0 errores) y
`pnpm test:unit:coverage` (100% en lo ratcheted) limpios.

**Fuera de alcance esta ronda**: referido (`?ref=`) por el login de
Google — el `state` de OAuth no lo lleva todavía, un Vividor que entra
por Google queda sin `OriginMemento`. El proceso real de "escalar" de
Vividor a Chido (membresías con distintos niveles de personalización) —
sigue siendo 100% diseño, nada de código todavía; hoy Chido y Vividor
comparten exactamente el mismo helper de activación, la única gate real
que existe hoy es `markInterviewed`.

Shippeado como v1.49.0.

## Modo Foco suma música real (2026-09-23)

Gunnar probó Modo Foco y notó que solo sonaba tono/ruido — comparó con
Brain.fm, donde sí hay música de fondo, y preguntó si era por diseño y si
se podía sumar música, incluso conectando algún servicio de streaming
(house/electrónica/lounge). Respuesta corta: sí, era 100% a propósito
(ver comentario original en `lib/focusAudio.ts` — evitar de raíz el
problema de licencias) pero se podía sumar sin romper esa decisión.

Se evaluaron 2 caminos: (1) bundlear loops royalty-free reales y
mezclarlos con Web Audio, (2) embeber un reproductor de Spotify/YouTube
aparte. Gunnar eligió el 1. En la práctica, sin embargo, este sandbox no
tiene forma real de conseguir/verificar pistas con licencia limpia (sin
ffmpeg/sox/numpy para siquiera procesar un archivo bajado, y bajar algo
de una librería CC0 sin poder confirmar su licencia real sería
irresponsable) — así que la implementación real terminó siendo música
también generada en vivo con Web Audio, mismo criterio que el resto de
Modo Foco, en vez de archivos bundleados. Se avisó el cambio de rumbo
antes de escribir código.

**Qué se construyó**: `lib/focusAudio.ts` suma `FOCUS_MUSIC`, un patrón
rítmico por modo (16 steps, BPM, kick/hats/bajo/acordes cortos) y
`stepDurationSeconds(bpm)`. Foco profundo es house minimal (124 BPM,
kick + bajo en los 4 tiempos, hats en el contratiempo); Creativo y
Relajación son lounge (92/100 BPM, sin kick o con kick a media
velocidad, acordes cortos usando el mismo `padHz` que ya tenía cada
modo). **Sueño se queda con `FOCUS_MUSIC.sueno = null`, sin ritmo, a
propósito** — ni Brain.fm pone house en sus pistas de dormir, un ritmo
va en contra de lo que ese modo tiene que lograr.

`components/FocusModeBlock.tsx` suma el motor real: un step-sequencer
con lookahead (patrón estándar de Web Audio — programa cada golpe con su
propio `AudioContext.currentTime` en vez de `setTimeout`, así no se
desincroniza) que dispara kick (oscilador con pitch-sweep + envolvente),
hat (ruido blanco corto pasado por un filtro pasa-altos), bajo (triangle
+ filtro pasa-bajos) y acordes cortos (mismas frecuencias del pad),
todo mezclado en el mismo `GainNode` maestro que ya modulaba el pulso —
la música respira con la misma onda, literalmente "acompaña las ondas"
como pidió Gunnar. Se corta junto con el motor entero al pausar/terminar
(el `setInterval` del scheduler se limpia en `stopEngine`, no solo los
osciladores).

**Verificado real**: `lib/__tests__/focusAudio.test.ts` — sueño sin
patrón a propósito, los otros 3 modos con al menos un step disparando
algo, todos los steps dentro del compás de 16. `e2e/focus-mode.spec.ts`
suma un test que parchea `AudioContext.createOscillator`/
`createBufferSource` para contar nodos reales creados con el tiempo:
en Foco el conteo sigue subiendo mientras corre la sesión (prueba de que
el scheduler dispara de verdad, no quedó un pad estático) — Playwright
no puede "escuchar" el resultado, pero sí contar los nodos reales que
arma. Script descartable de Playwright confirmó visualmente que el
setup y la pantalla de sesión se ven bien con el copy nuevo, capturas
revisadas y borradas. 28/28 E2E de la suite completa, 100% coverage en
`lib/focusAudio.ts`, tsc/lint/build limpios.

Shippeado como v1.49.1.

## Panel de tamaños: traslúcido + sensibilidad corregida (2026-09-23)

Gunnar probó el panel de "Ajustar tamaños" (v1.48.0) y pidió dos ajustes
de diseño: que el panel sea traslúcido de verdad ("poder ver cómo
aumentan el tamaño las cosas" mientras se arrastra el slider) y que se
revise la sensibilidad de los sliders.

**Traslúcido de verdad, no solo de nombre**: el fondo del panel pasó de
`rgba(20,20,20,.97)` (casi opaco) a `rgba(20,20,20,.3)` con
`backdrop-filter: blur(10px) saturate(160%)`, y el scrim de fondo (el
que cierra al tocar afuera) de `rgba(0,0,0,.55)` a `rgba(0,0,0,.15)` —
ya no oscurece la tarjeta real por arriba del panel tampoco. Verificado
con captura real (no a ojo): en una Card de host con el panel abierto,
el botón de QR real (que cae físicamente detrás del panel, confirmado
midiendo las posiciones DOM reales) se ve como un cuadro claro
difuminado detrás de las filas de sliders, y crece de forma visible al
mover "Botón QR" a 150% — la iteración anterior (`.55` de fondo, `.38`)
todavía se sentía demasiado oscura para notar el cambio, así que se bajó
hasta que el efecto fuera innegable a simple vista.

**Sensibilidad**: el `step` del `<input type="range">` estaba en `0.05`
(saltos de 5%) mientras el número que se muestra al lado es un
porcentaje entero — quedaban desalineados, se sentía "duro". Se bajó a
`0.01`, 1 a 1 con el %.

**Verificado real**: mismo `e2e/card-size-panel.spec.ts` de antes
(sigue pasando con el nuevo `step`), más una vuelta de scripts
descartables de Playwright para confirmar visualmente el efecto de
traslucidez (posiciones reales del botón QR vs. el panel medidas con
`getBoundingClientRect`, no supuestas) — 2 iteraciones de alpha hasta
que el resultado fue convincente, capturas revisadas y borradas. 28/28
E2E de la suite completa, tsc/lint/build/100% coverage limpios.

Shippeado como v1.49.2.

## Fix: Modo Foco podía quedar completamente mudo (2026-09-23)

Gunnar reportó "no escucho nada" en Modo Foco (justo después de la
música nueva de v1.49.1 — antes había dicho que sí escuchaba tono/ruido,
solo faltaba música). Causa real encontrada en `startEngine`
(`components/FocusModeBlock.tsx`): el `AudioContext` se creaba pero
nunca se llamaba `.resume()`. Varios navegadores mobile (Safari/iOS en
particular) crean el contexto en estado `"suspended"` incluso disparado
desde un click real — sin el resume explícito, todo el grafo de audio se
arma y arranca sin tirar ningún error (por eso Gunnar no veía ningún
mensaje de fallo), pero no sale sonido. Este bug es anterior a la música
nueva — pudo estar ahí desde v1.46.0 y no notarse antes en el navegador
donde Gunnar probó primero.

**Fix**: una sola línea, `ctx.resume().catch(() => {})` justo después de
crear el `AudioContext`, sin esperar la promesa (los nodos se conectan
igual, resume() solo destraba la salida real). **Límite honesto de este
fix**: no hay forma de probarlo contra Safari/iOS real desde este
sandbox (Playwright acá solo corre contra Chromium, donde el contexto ya
arrancaba "running" incluso sin el fix, así que el bug nunca se
reprodujo en el propio E2E) — el fix aplica la solución estándar
documentada para este problema conocido de Web Audio en mobile, pero
queda pendiente que Gunnar confirme en su iPhone real. Se le avisó
también de una causa alternativa que el código no puede arreglar: el
switch físico de silencio del iPhone corta el audio de Web Audio igual
que cualquier app, es una limitación de la plataforma, no un bug.

**Verificado real**: `e2e/focus-mode.spec.ts` suma una aserción de
`AudioContext.state === "running"` tras arrancar la sesión (además del
conteo de nodos que ya existía) — protege contra que alguien borre el
`resume()` sin darse cuenta en el futuro, aunque no reproduce el bug
original en sí (ver límite arriba). 28/28 E2E de la suite completa,
tsc/lint/build/100% coverage limpios.

Shippeado como v1.49.3.

## 3 módulos más al tamaño + mezclador Onda/Música en Modo Foco (2026-09-23)

Gunnar volvió con dos pedidos en el mismo mensaje:

1. **Tamaños**: "Faltan módulos para cambiar tamaño. El de mi camino
   legacy y el de agendar una entrevista. También el logo." — el panel
   de v1.48.0/v1.49.2 solo cubría Foto/Botón QR/Cubos laterales/Íconos
   sociales.
2. **Modo Foco**: "No se escucha la música, solo la onda" — la música
   agregada en v1.49.1 sonaba (o casi no sonaba) en el celular. Preguntó
   si se podía subir/bajar el volumen de la onda y la música por
   separado, y aclaró que entendió que iba a poder elegir el beat
   (house/techno/etc.) de cada modo — eso último **sigue siendo una
   propuesta sin construir**, no lo entendió mal: quedó pendiente de que
   confirme si la quiere ahora.

**Tamaños — 3 módulos nuevos**: `lib/cardSizeConfig.ts` suma `storyBtn`
("Mi camino"), `scheduleBtn` ("Agendar entrevista") y `logo` al array
`CARD_SIZE_KEYS` (de 4 a 7). A diferencia de los 4 originales (que
viven en constantes de estilo a nivel de módulo como `CUBE_MEDIUM`, y
por eso necesitan la variable CSS `--scale-<key>`), estos 3 botones
tienen su estilo inline en el propio JSX del componente, con
`liveSizeConfig` ya en scope ahí mismo — así que se multiplican
directo en JS (`${80 * liveSizeConfig.logo}px`, etc.) sin necesidad de
la indirección de CSS var, más simple y igual de "en vivo" (el estado
ya dispara un re-render de React al mover el slider).

**Modo Foco — mezclador independiente**: `startEngine`
(`components/FocusModeBlock.tsx`) ahora arma dos buses --
`waveBus` (pulso + ruido + pad) y `musicBus` (kick/bajo/hats/acordes),
ambos colgando del mismo `master` (así la modulación del pulso sigue
afectando a los dos por igual). Cada uno es un `GainNode` cuyo `.value`
se puede tocar en vivo sin reconstruir el motor -- dos sliders nuevos
en la pantalla de sesión corriendo ("Onda"/"Música", 0%-200%, default
100%). El slider de Música no aparece en Sueño (no tiene patrón, a
propósito) para no mostrar un control que no hace nada.

**El fix de fondo, no solo el mezclador**: las frecuencias del kick y
el bajo (65-87Hz, C2/D2/F2) quedaron subidas una octava (130-175Hz,
C3/D3/F3) y el sweep del kick de 150→42Hz a 220→90Hz -- un parlante de
celular apenas reproduce nada por debajo de ~100Hz, así que ese era el
problema real detrás de "no se escucha la música", no solo un tema de
volumen relativo. El mezclador resuelve el balance; el cambio de
frecuencia resuelve que haya algo real que balancear. También se
subieron un poco los gains de hat/stab (0.16→0.24, 0.18→0.24) y el
filtro pasa-bajos del bajo (380→650Hz) para dejar pasar más armónicos.

**Verificado real**: `e2e/card-size-panel.spec.ts` suma un test que
confirma los 3 labels nuevos en el panel y que el botón de Logo crece
de verdad (`boundingBox()` real, no un mock) al mover su slider.
`e2e/focus-mode.spec.ts` suma un test que confirma los 2 sliders del
mezclador existen y responden (el % que muestran cambia de verdad al
moverlos) y que Sueño no ofrece el de Música. Script descartable de
Playwright confirmó visualmente el panel con los 7 módulos y la
pantalla de Modo Foco con el mezclador, capturas revisadas y borradas.
30/30 E2E de la suite completa, tsc/lint/build/100% coverage limpios.

**Límite honesto**: igual que el fix de `ctx.resume()`, no hay forma de
confirmar por oído desde este sandbox que el kick/bajo ahora se
escuchan de verdad en un parlante de celular real -- es la corrección
de DSP estándar para este problema (frecuencia fuera de rango de
reproducción), pero falta que Gunnar lo confirme en su celular.

Shippeado como v1.50.0.

## Selector de estilo por modo en Modo Foco (2026-09-24)

Gunnar confirmó el fix de v1.50.0 ("si funciono") y dio luz verde a la
propuesta pendiente desde la conversación anterior: poder elegir el
beat (house/techno/etc.) dentro de cada modo — la que había preguntado
si había entendido mal, y no, no había entendido mal: era exactamente
la propuesta hecha (variantes DENTRO de cada modo, nunca un dropdown
libre que mezclara un beat de un modo con el propósito de otro).

`lib/focusAudio.ts`: `FOCUS_MUSIC` (un patrón fijo por modo) se
reemplaza por `FOCUS_MUSIC_VARIANTS: Record<FocusModeKey,
MusicPattern[]>` — 2-3 variantes reales por modo, cada una con su
propio `key`/`label`, pero todas respetando el mismo rango de tempo y
la misma lógica funcional del modo:

- **Foco** (sostener atención): House / Techno / Minimal — las 3 con
  kick real, no negociable (un test nuevo lo confirma explícitamente).
  Techno sube el tempo a 128 y mete hats en cada corchea (más
  mecánico/insistente); Minimal baja a medio tiempo, mucho más espacio.
- **Creativo** (divergir): Lounge / Downtempo — Downtempo baja a 80 BPM,
  un solo golpe suave por compás, más atmosférico. Ninguna de las dos
  tiene kick duro -- sigue sin ser un modo para "concentrarte en un
  punto".
- **Relajación** (bajar revoluciones sin dormirte): Lounge / Chill
  House — Chill House es la única variante fuera de Foco con
  four-on-the-floor real, pero a un tempo suave (108) y con los gains
  bajos que ya tenía el motor.
- **Sueño**: `[]`, sin ninguna variante, mismo motivo de siempre — un
  ritmo va en contra del propósito del modo, así que ni se le muestra
  el selector.

`components/FocusModeBlock.tsx`: nuevo estado `variantKey` (se resetea
a la primera variante del modo cada vez que cambiás de modo, para no
quedar con una key huérfana de otro modo) y un selector de pills en el
setup, entre "Modo" y "Duración" -- solo aparece si el modo tiene
variantes. `startEngine` ahora recibe el patrón ya resuelto como
parámetro en vez de buscarlo él mismo por `mode.key`, así que el mismo
motor sirve para cualquier variante sin cambios. La pantalla de sesión
corriendo usa `activePattern.label` (guardado al arrancar) para el
mezclador, en vez de derivarlo de nuevo.

**Verificado real**: `lib/__tests__/focusAudio.test.ts` reescrito para
`FOCUS_MUSIC_VARIANTS` -- Sueño sin variantes, los otros 3 modos con
2+, keys únicas por modo, Foco con kick en las 3 sin excepción, todos
los steps dentro del compás. `e2e/focus-mode.spec.ts` suma un test que
elige "Techno" en el setup y confirma que la pantalla de sesión
corriendo de verdad dice "Música (Techno)" -- no solo que el botón se
puede tocar, sino que la elección se propaga al motor real -- y que
Sueño nunca muestra el selector. Script descartable de Playwright
confirmó visualmente el selector de 3 pills en Foco, captura revisada y
borrada. 31/31 E2E de la suite completa, tsc/lint/build/100% coverage
limpios.

Shippeado como v1.51.0.

## Modelo de monetización cerrado: 3 ejes + mecanismo de promoción Chido→Programa (2026-09-24)

Gunnar pidió un resumen completo del estado del MVP; de ahí salió que lo
que yo llamaba "`planTier` bloqueando el MVP" mezclaba 3 ejes que son
independientes entre sí. Después de varias rondas de precisión, quedó
cerrado así — **decisión de arquitectura, todavía sin código**:

**Eje A — Programa no es un plan que se elige, es un umbral estructural
que se cruza.** Un Chido (persona que pagó, pasó por el proceso Legacy
completo: entrevista → armado de oficina → 3 meses de prueba) se
convierte en **N0 de su propio Programa** en el momento exacto en que
tiene **1+ persona humana real bajo él** (no importa cuántos agentes IA
tenga — eso es indiferente para el umbral). Mecanismo de la promoción,
tal como lo definió Gunnar:

1. El Chido recluta a un humano — mismo flujo self-service de siempre
   (`ensureLegacyMembershipAndCards`) o invitación.
2. Ese humano pasa por **su propio** proceso de entrevista real —
   **bajo Legacy**, el mismo pipeline que ya existe hoy
   (`registerInterviewAction` → `completeInterviewAction`). Nada nuevo
   acá — decisión explícita de Gunnar (opción "a" sobre dos caminos que
   le propuse): no existe un estado de "Programa embrionario/pendiente"
   antes de que el umbral se cruce, se reusa 100% el pipeline actual.
3. En el instante en que ese humano queda `status:"active"`, el sistema
   **computa** (no pide aprobación aparte): ¿la membresía que lo
   refirió (`referredByMembershipId`) pertenece a alguien con
   `membershipPaidAt` seteado (=Chido) que ahora tiene 1+ referido
   activo? Todos los campos para esta cuenta ya existen en
   `ProgramMembership` (`referredByMembershipId`, `membershipPaidAt`,
   `status`) — cero campos nuevos necesarios para la detección en sí.
4. Si el umbral se cruza: se crea el Programa nuevo (la Card de
   company del Chido se vuelve su raíz, mismo lugar que hoy ocupa
   `project` para Legacy), se lo da de alta como Admin de ese Programa
   nuevo, su vieja Card de proyecto (la relación con Legacy) queda
   como "Programa Legado" — visible pero ya no la default. Y la
   membresía + Cards del humano recién activado se **migran** del
   Programa Legacy al Programa nuevo recién creado (opción "a": nacen
   bajo Legacy, se mudan en el momento de la promoción — no nacen ya
   bajo un Programa que todavía no existía).
5. La Oficina Virtual de ese humano recién activado no es genérica —
   se arma con Superpoderes/objetivos según **su función dentro del
   programa** (un vendedor no tiene la misma oficina que un soporte).
   Esto conecta con "Puesto" (Fase 9.1/9.2, ya existe en el schema) —
   el Puesto asignado a su Card determina qué le corresponde.

**Eje B — Mirón/Vividor/Chido/Chido+ (nombres 100% internos, nunca en
la app ni en marketing — "si sale a la luz nos cuelgan", palabras de
Gunnar).** El embudo natural que la app automatiza: Mirón (visitante
sin cuenta) → Vividor (se registra self-service, Freemium, 3 Cards) →
Chido (pasa por entrevista, paga) → Chido+ (variantes de escalamiento,
todavía sin definir en detalle) → cruza el umbral del Eje A y se
convierte en Programa. Un Chido con solo agentes IA bajo él (cero
humanos) sigue siendo Chido, nunca Programa, sin importar cuántos
agentes tenga.

**Eje C — precio a la carta por WowApp/Superpoder, confirmado tal cual
ya estaba documentado** en la sección "Modelo de precio a la carta" de
este mismo archivo (arriba, "AppStore de Skills") — cada Skill con su
propio precio (suscripción o pago único), independiente del status del
Member. Un Vividor puede comprar una WowApp puntual sin necesidad de
ser Chido.

**Lo que este modelo NO necesita, que sí estaba en el roadmap viejo**:
`Program.planTier` como campo elegible a mano (Freemium/Automatizado/
Normal/Enterprise como "plan que alguien selecciona") deja de tener
sentido como primer bloqueador — los $ de infraestructura de agentes
(Automatizado $25/Normal $100/Enterprise $500) pasan a describir el
nivel de infraestructura que un Programa YA formado sigue pagando, no
la puerta de entrada.

**Sigue sin construir, todo esto es diseño puro todavía**: la lógica de
detección del umbral (paso 3), la creación real de Programa+Admin+
migración de membresía (paso 4), el campo/flag de "Programa Legado" en
la Card vieja, y la conexión Puesto→Superpoderes específicos por
función (paso 5). Próximo paso: EDT de fases para construir esto.

## Fase P1: detección + promoción automática Chido→Programa (2026-09-24)

Construye los pasos 3-4 del Eje A de arriba (la lógica de detección y
la promoción real), con luz verde de Gunnar ("seguimos"). El paso 5
(Puesto→Superpoderes por función) queda explícitamente fuera de esta
ronda -- Gunnar mismo lo describió como "todavía sin definir en
detalle".

**Gap de arquitectura encontrado antes de escribir código, no durante**:
`Admin` y `Member` eran dos sistemas de identidad totalmente separados
-- no había forma de que un Chido promovido tuviera autoridad de Admin
sin inventarle una credencial nueva de cero. Propuesta hecha y aprobada
por Gunnar ("vale.. me late.."): `Admin.memberId` (FK opcional, única)
-- el `Admin` de un Chido promovido nace **sin password ni email
propios**; su sesión de Member de siempre (WhatsApp OTP/Google, cookie
`lycard_member`) es la que le da autoridad de Admin sobre su Programa
nuevo, vía `lib/auth.ts#currentAdminScope()`. Nunca un segundo login.

**Schema** (`prisma/schema.prisma`, migración
`20260924123422_admin_member_link`): `Admin.email` y
`Admin.passwordHash` pasan a nullable (un Admin promovido no tiene
ninguno de los dos), y `Admin.memberId` nuevo (opcional, único, FK a
`Member`) -- con su reverse relation `Member.promotedAdmin`.

**`lib/programPromotion.ts`** (nuevo): `checkAndPromoteToPrograma(
membershipId)` -- dado el id de la membresía que refirió a alguien
recién activado, chequea 3 condiciones (el referrer pagó
`membershipPaidAt`, todavía no está promovido, tiene 1+ referido
`status:"active"`) y si las 3 se cumplen, promueve: crea el `Program`
nuevo (nombre = el de la Card `company` del Chido, slug único), muda
esa Card a ser su raíz (`programId`), crea el `Admin` linkeado por
`memberId` (sin password), y migra la `ProgramMembership` + Card
`project` de cada referido activo del Programa Legacy al nuevo. La
vieja Card `project` del Chido (su relación con Legacy) **no se toca**
-- queda intacta, se muestra como "Programa Legado" en su dashboard
(computado, sin campo nuevo). `findPromotedProgram(memberId)` para que
cualquier pantalla pregunte "¿este Member ya tiene su propio Programa?"
sin repetir la query.

**Dos disparadores reales, los dos cubiertos** -- la promoción no vive
pegada a un solo botón, dispara desde cualquier lado donde una
membresía cruce a `active` + `pagada`:
- `lib/activateMembership.ts`: al activar la membresía de un recién
  entrevistado (`completeInterviewAction`, el pipeline de siempre, sin
  cambios), si tenía referrer, se chequea la promoción de ESE referrer.
- `app/admin/programs/members-actions.ts#markMembershipPaidAction`: al
  marcar "pagada" a mano una membresía que YA tenía un referido activo
  desde antes (no hace falta una entrevista nueva en ese momento --
  el umbral se cruza ahí mismo).

**`proxy.ts` -- bug real encontrado por el primer E2E, no adivinado**:
el middleware gateaba TODO `/admin/*` mirando solo la cookie
`lycard_admin` -- un Chido promovido nunca la tiene, así que rebotaba a
`/admin/login` ANTES de que la request llegara a la página, donde
`currentAdminScope()` sí sabe resolverlo bien. Fix: si no hay cookie de
Admin válida, el middleware ahora también acepta una cookie de Member
válida y deja pasar -- la autorización real de negocio sigue viviendo
en un solo lugar (la página/action), el middleware solo prefiltra por
JWT sin tocar la DB, como ya hacía para `/m/*`.

**UI**: `/m/dashboard` suma un banner dorado "✦ Ya tenés tu propio
Programa" (solo si `findPromotedProgram` devuelve algo) con link directo
a `/admin/programs/[id]` -- usando la MISMA sesión de Member, nunca un
login aparte -- y la Card `project` vieja se etiqueta "· Programa
Legado". El roster de cada Programa (`/admin/programs/[id]`) ya
mostraba `a.email` crudo para cada Admin de ese Programa -- para un
Admin promovido (sin email) eso se hubiera visto en blanco; ahora cae
a mostrar el nombre/WhatsApp del Member vinculado con "(vía su cuenta,
sin password propio)".

**Verificado real**: `e2e/program-promotion.spec.ts`, dos escenarios
completos contra Postgres real, cada uno con su propio Programa/
Member/Card de prueba creados y borrados en `beforeAll`/`afterAll` --
nunca contra datos de Legacy real:
1. *Vía entrevista* -- un admin marca "Marcar entrevista hecha" en
   `/admin/interviews` sobre el reclutado de un Chido ya pagado con un
   solo click real de Playwright, y se confirma contra la DB: el
   Programa nuevo existe con el nombre correcto, el `Admin` está
   linkeado por `memberId` sin password/email, la membresía y Card del
   reclutado migraron, la Card vieja del Chido sigue en Legacy sin
   tocar -- y, con la sesión de Member del Chido (sin ninguna cookie de
   Admin), entra directo a `/admin/programs/[id]` y ve su Programa.
2. *Vía "marcar como pagada"* -- un Chido que YA tenía un referido
   activo antes de pagar; el admin le toca el botón real "Marcar como
   pagada" en `/admin/programs/[id]` (acotado a esa fila específica --
   el propio reclutado también tenía botón, había que no confundirlos)
   y se confirma la misma promoción completa disparando ahí mismo, sin
   ninguna entrevista nueva de por medio.

33/33 E2E de la suite completa (sin regresiones en nada preexistente),
tsc/lint/100% coverage unitaria (159 tests)/build de producción,
todos limpios.

**Límite honesto**: sin pasarela de pago real (ya documentado desde
antes, `markMembershipPaidAction` sigue siendo un flag a mano, no una
confirmación de cobro) -- la promoción hereda esa misma cáscara: se
dispara sobre un "pagado" marcado a mano, no sobre un cobro real
verificado. El paso 5 (Oficina del recién promovido armada según su
Puesto/función) queda sin construir, a propósito, fuera de esta ronda.

Shippeado como v1.52.0.

## WowStore -- Fase W1: la tienda (2026-09-24)

Gunnar pidió una segunda vidriera pública, separada de la Oficina interna
de Legacy: WowStore, un appstore de "WowApps" para cualquier MiPyME
(restaurante, retail, despacho, emprendedor), navegado por rubro+dolor
("soy taquería, busco vender más") en vez de categoría técnica -- el
diferencial real frente a Shopify App Store/Square/Odoo Apps (ninguno
cruza industria×dolor como primer filtro, ninguno mete el upsell de
adaptación paga en el momento exacto de elegir la app). Gemini aportó un
boceto de flow + 3 apps ancla (WowBot Pedidos, WowAgenda Pro,
WowCobranza) usado como punto de partida. Restricción dura de la ronda:
pocos tokens de la semana -- se recortó a construir la TIENDA en sí, sin
lógica real de ninguna WowApp todavía (ver "Límite honesto" abajo).

**Hallazgo de arquitectura, decidido antes de tocar el schema**: existen
dos catálogos de apps conceptualmente distintos. Los Superpoderes
internos (`Program.officeSkills`, ya construidos) son herramientas que
el N0 de un Programa da a SU PROPIO equipo (Fathom Brief, Agenda, Notas
de Voz, Modo Foco) -- viven en el Program, las comparten las Cards
`project`. WowStore es para el negocio EXTERNO de cualquier MiPyME --
la Card `company` (o `personal` para un emprendedor solo) de un Vividor
o Chido, que hoy no tiene `programId` y solo mostraba
`DEFAULT_OFFICE_SKILLS` genérico, cero personalización real. Por eso el
catálogo y las instalaciones son modelos Prisma nuevos, por Card, no un
campo más en `Program.officeSkills` -- se reusa el PATRÓN visual de
`OfficeSkillsBlock`/`OfficeSkillsEditor`, no el campo.

**Schema** (`prisma/schema.prisma`, migración `20260924130848_wowstore`):
`WowApp` (catálogo global, MasterN0-only -- key/nombre/descripcion/
iconUrl/color/appType/industryTags/painPointTags/basePriceUsd/status/
demoVideoUrl) y `WowAppInstall` (cardId+wowAppId única, con
`adaptationNotes`/`adaptationStatus`/`adaptationPaidAt` -- mismo criterio
honesto que `ProgramMembership.membershipPaidAt`: flag manual, sin
pasarela de pago real).

**`lib/wowApps.ts`** (nuevo, 100% cobertura unitaria): vocabulario fijo
de 5 rubros/4 dolores para los selectores, `parseTags`/`toCatalogEntry`
(sanitiza los 2 campos Json), y `matchWowApps` -- función pura que
cruza rubro+dolor y devuelve como mucho 3 resultados ordenados por
cantidad de coincidencias, nunca el catálogo entero.

**`/admin/wowstore`** (MasterN0-only, nuevo): CRUD real del catálogo,
mismo patrón que `Puesto` (`app/admin/wowstore/actions.ts` +
acordeón). Linkeado desde `/admin/programs`.

**`/m/wowstore`** (member-facing, nuevo): pantalla 1+2 en una sola page
server-rendered vía `<form method="get">` (sin JS de cliente) -- 2
selectores (rubro/dolor), resultado del match debajo en la misma
navegación. `/m/wowstore/[key]` es el detalle, con los 2 CTA reales de
Gemini: "Instalación Express" (`installWowAppAction`, sin pasarela real)
y "Quiero que funcione exacto para mi negocio" (`requestAdaptationAction`
-- guarda el pedido en DB siempre, y avisa por email al equipo si
`WOWSTORE_ADAPTATION_TO`/`RESEND_API_KEY` están configurados; sin ellos,
el pedido igual queda registrado, nunca se pierde).

**`components/WowAppsBlock.tsx`** (nuevo): mismo patrón grilla+bottom-
sheet que `OfficeSkillsBlock.tsx`, fuente `card.wowAppInstalls` en vez
de `Program.officeSkills`. Insertado en `app/c/[slug]/oficina/page.tsx`
solo para Cards `company`/`personal` (nunca `project`, ese sigue siendo
100% Superpoderes internos), tanto para el dueño como para un visitante.
Botón "Buscar WowApps para mi negocio" nuevo en `MemberCardEditor.tsx`
(company y personal).

**Verificado real**: `e2e/wowstore.spec.ts`, flujo de punta a punta
contra Postgres real -- MasterN0 crea 2 WowApps por la UI real de
`/admin/wowstore` (no seed directo a DB), un Member navega
`/m/wowstore` con rubro+dolor y confirma que el match filtra bien (la
que no matchea no aparece), instala una (confirma en DB Y que aparece
de verdad renderizada en su Oficina vía `WowAppsBlock`), y pide
adaptación paga en la otra (confirma `adaptationStatus`/`adaptationNotes`
en DB). Fixtures propios, `beforeAll`/`afterAll`, nunca toca Legacy
real. 34/34 E2E de la suite completa (sin regresiones), tsc/lint/100%
coverage unitaria (170 tests)/build de producción, todos limpios.

**Límite honesto**: ninguna de las 3 WowApps ancla de Gemini tiene
lógica real conectada todavía -- toda WowApp instalada muestra "Todavía
sin conectar -- próximamente" en su Oficina, mismo fallback que
cualquier Superpoder sin backend. WowBot Pedidos necesita WhatsApp
Business API + speech-to-text; WowCobranza necesita integración de
facturación/pagos que hoy no existe; WowAgenda Pro es la más barata a
futuro porque puede generalizar el motor de capacidad+booking que ya
existe en `lib/interviewSlots.ts` en vez de partir de cero -- pero
sigue siendo una fase aparte, no entró en W1. Tampoco hay pasarela de
pago real para la instalación ni la adaptación (mismo límite que
`membershipPaidAt` desde siempre), y el pedido de adaptación no tiene
backend automatizado -- es un email a una persona real.

Shippeado como v1.53.0.

**Addendum -- sembrar catálogo de ejemplo (2026-09-24)**: Gunnar pasó el
Excel de servicios de Mercosur Irpavi/HeroSuite y preguntó por qué no
subía los Superpoderes ya construidos (Brief, Notas de Voz, Modo Foco)
como WowApps. Respuesta corta: son Program-level, para el equipo interno
de Legacy -- WowStore es por Card, para el negocio externo de cualquier
MiPyME (ver "Hallazgo de arquitectura" arriba). Nada impide catalogar la
MISMA capacidad como una WowApp aparte, así que se sumó
`EXAMPLE_WOW_APPS` en `lib/wowApps.ts` (6 entradas: 5 recortadas del
Excel real de Irpavi -- la mayoría de ese catálogo es infraestructura IT
para empresas de 10+ empleados, no MiPyME chica, se filtró a las que sí
calzan -- más "Notas de Voz para tu Negocio", la misma idea que el
Superpoder interno) y `seedExampleWowAppsAction` -- botón MasterN0-only
en `/admin/wowstore`, idempotente por `key` (nunca pisa una entrada ya
editada a mano), todas con `status:"proximamente"` (ninguna tiene lógica
real conectada, mismo límite honesto de W1). Test nuevo en
`wowApps.test.ts` confirma que las 6 usan tags reales del vocabulario
(ninguna queda invisible en el match por un typo). tsc/lint/100%
coverage/build limpios, `wowstore.spec.ts` sigue pasando.

Shippeado como v1.53.1.

**Addendum -- entrada real en la Oficina + unificación de nombre
(2026-09-24)**: Gunnar probó el flujo en prod (creó las WowApps de
ejemplo) y no encontró el link "Buscar WowApps para mi negocio" -- vivía
solo en el editor de `/m/dashboard/company`, no en la Oficina Virtual en
sí, que es donde miró primero. Pedido explícito: el acceso a WowStore
tiene que estar DENTRO de la sección de Superpoderes de la Oficina, y de
paso renombrar "Superpoderes" a "WowApps" en toda la app para no tener
dos nombres para el mismo tipo de cosa (corrección propia: "WowStore" es
la vidriera/catálogo navegable, "WowApps" son las apps individuales que
viven adentro -- instaladas o en catálogo).

Cambios en `app/c/[slug]/oficina/page.tsx` (Owner y Visitor):
- Cards `kind:"project"` (Legacy interno) siguen mostrando
  `OfficeSkillsBlock` sin cambios funcionales -- solo el kicker por
  default pasa de "Superpoderes" a "WowApps" (`officeSkillsKicker`
  fallback).
- Cards `kind:"company"`/`"personal"` YA NO muestran
  `DEFAULT_OFFICE_SKILLS` (nunca tuvo sentido real para el negocio de
  una MiPyME -- eran los mismos 8 tiles internos de Legacy para
  cualquiera). En su lugar, una sección única "WowApps" con
  `WowAppsBlock` -- las instaladas de esa Card, más (solo para el
  dueño) un tile "+ WowStore" DENTRO de la misma grilla que linkea a
  `/m/wowstore?cardId=...` -- ya no hay que salir a otra pantalla ni
  buscar en el editor. `components/WowAppsBlock.tsx` suma la prop
  `browseHref` para este tile nuevo.
- El link "Ver mi Red de Clientes" (antes atado al appType "malla" de
  `OfficeSkillsBlock`) pasa a un link directo fuera del bloque, ya que
  las Cards company/personal no usan más ese componente.
- Título de la sección en `/admin/programs/[id]` (editor de
  `Program.officeSkills`) pasa de "Superpoderes de la Oficina" a
  "WowApps internas de la Oficina", aclarando en el subtítulo que es
  para el equipo de Legacy, no el catálogo público (ese vive en
  `/admin/wowstore`).

**Bug real encontrado en el camino, no de esta feature**: el E2E de
`e2e/wowstore.spec.ts` empezó a fallar de forma reproducible (incluso
aislado, con dev server y Postgres reiniciados limpios) al hacer click
en "Crear WowApp" justo después de abrir el acordeón "+ Agregar
WowApp" -- el propio contenedor del acordeón tapaba el botón por un
instante, sin importar cuánto se esperara antes del click. Se
reemplazó el click por `form.requestSubmit()` vía `.evaluate()` --
mismo Server Action, mismo resultado que un click real, sin el riesgo
de intercepción de puntero. No es un bug de producto (Gunnar ya había
confirmado el flujo real funcionando en prod), es una fragilidad del
propio `Accordion.tsx` frente a Playwright que quedó documentada acá
por si vuelve a aparecer en otro spec.

34/34 E2E de la suite completa, tsc/lint/100% coverage unitaria (173
tests)/build de producción, todos limpios.

Shippeado como v1.54.0.

## WowAwe -- la primera WowApp con lógica real (2026-09-24)

Gunnar mandó un video sobre el estudio de las "Awe Walks" (caminatas de
asombro) -- caminar buscando algo que te asombre reduce el cortisol y el
enfoque egocéntrico, medible en selfies (proporción del encuadre que
ocupa la persona) y en la intensidad de la sonrisa genuina. Pidió una
WowApp para el "impuesto a la soledad" del fundador de una MiPyME: salir
a caminar, sacarse selfies, contarle cosas a su Legacy Card, "yo aquí te
mido". Aprobado explícitamente en simulación ("aunque sea en
simulación").

**Freno puesto antes de construir, no después**: la propuesta original
(de una charla con Gemini) sugería medir el encuadre real por visión
por computadora y biomarcadores de estrés acústico en la voz -- eso es
investigación aplicada real, no "conectar n8n", y este proyecto no tiene
NINGUNA infraestructura de IA real construida todavía (confirmado esta
sesión). Fingir esa medición hubiera roto la cáscara honesta que se
sostuvo en TODO el proyecto -- doblemente grave tratándose de bienestar
mental. Se construyó 100% simulado del lado de la "medición", 100% real
del lado de la nota de voz (mismo pipeline ya construido de Notas de
Voz).

**Arquitectura**: WowAwe es la primera entrada del catálogo con
`status:"activo"` de verdad -- las otras 5 siguen "proximamente". Vive
en `lib/wowApps.ts` como parte de `EXAMPLE_WOW_APPS` (que ahora lleva un
campo `status` por entrada, no un hardcode único en
`seedExampleWowAppsAction`), con `industryTags: []` (rubro-agnóstico a
propósito, no es sobre el negocio) y un tag de dolor nuevo
`"bienestar-fundador"` agregado a `PAIN_POINTS` -- el único que no es
sobre plata, es sobre la persona.

**Schema** (`prisma/schema.prisma`, migración `20260924141705_awe_walk`):
`AweWalkEntry` (cardId, 3 URLs de foto, `voiceNoteId` opcional -- FK
directa a `VoiceNote`, no un campo de audio propio -- y `aweIndex`
Int simulado). `lib/aweWalk.ts#generateSimulatedAweIndex()`: número al
azar 40-85, la única lógica de "medición" que existe, con un comentario
explícito de por qué nunca es real.

**Reuso total del pipeline de Notas de Voz, cero infraestructura
nueva**: `app/c/[slug]/oficina/awe-actions.ts#createAweWalkEntryAction`
sube las 3 fotos (`saveUpload`, mismo que cualquier otra imagen del
proyecto) y, si hay audio, llama directo a
`createVoiceNoteAction` (la MISMA función que ya usan Notas de Voz y el
cierre de Modo Foco) -- la transcripción con AssemblyAI es 100% real,
sin reinventar nada.

**`components/WowAweBlock.tsx`** (nuevo): 3 selectores de foto (cámara
en mobile vía `capture="user"`) + grabación de audio opcional (mismo
patrón MediaRecorder que `FocusModeBlock.tsx`, copiado línea por línea
a propósito para no reinventar algo que ya funciona) + historial de
caminatas anteriores, con el Índice de Asombro SIEMPRE etiquetado
"(simulado, no es una medición clínica real)". Primera vez que
`components/WowAppsBlock.tsx` tiene una rama real en vez del fallback
"Todavía sin conectar" -- `appType === "awe"` renderiza `WowAweBlock`,
el resto sigue cayendo al mismo fallback de siempre.

**Verificado real**: `e2e/wowawe.spec.ts` -- fixture con WowApp real
(`status:"activo"`) instalada en una Card personal, el dueño entra a su
Oficina, sube 3 fotos reales (PNG mínimo, no un mock de la subida) sin
audio (MediaRecorder queda fuera de este spec, ya cubierto por
`focus-mode.spec.ts` sobre el mismo pipeline), guarda, y se confirma
tanto en pantalla (Índice de Asombro visible, etiqueta de simulado)
como en DB (fila real de `AweWalkEntry`, índice dentro de 40-85, URLs
de foto no vacías). 35/35 E2E de la suite completa (sin regresiones),
tsc/lint/100% coverage unitaria (176 tests)/build de producción, todos
limpios.

**Límite honesto**: el Índice de Asombro NUNCA es un análisis real de
las fotos o el audio -- es un número al azar dentro de un rango
plausible, etiquetado como tal en toda la UI. La transcripción de la
nota de voz sí es real (mismo AssemblyAI de siempre). No hay
recordatorio semanal automático todavía (el "protocolo" de Gemini de
bloquear 15 minutos en la agenda) -- el dueño entra cuando quiere,
nadie se lo empuja.

Shippeado como v1.55.0.

**Fix v1.56.1 -- el acceso a WowStore faltaba en la Card "project"
(Legacy)**: reportado por Gunnar ("no encuentro la forma de entrar a la
WowStore"). Causa real: la unificación de v1.54.0 metió el tile "+
WowStore" adentro de `WowAppsBlock`, pero ese componente SOLO se
renderizaba para `card.kind` company/personal -- las Cards `project`
seguían mostrando nada más que `OfficeSkillsBlock` (los Superpoderes
internos del equipo), sin ningún acceso a WowStore. Fix: `installedWowApps`
deja de forzarse a `[]` para project (ya venía incluido en la query,
solo se descartaba en el mapeo), y `WowAppsBlock` (con su tile "+
WowStore", `browseHref: /m/wowstore?cardId=<esa Card>`) ahora se
renderiza en las 3, debajo de `OfficeSkillsBlock` cuando es project --
con el kicker "WowApps · WowStore" en ese caso puntual para no repetir
el mismo título "WowApps" dos veces seguidas en la misma pantalla (el
de arriba es el toolkit interno del equipo, el de abajo es el catálogo
externo para tu negocio). `e2e/wowstore.spec.ts` ganó un segundo tramo
sobre una Card `project` real: confirma el tile visible, instala una
WowApp desde ahí, y confirma que aparece de vuelta en esa misma
Oficina. 36/36 E2E, 185/185 unit, 100% coverage, tsc/lint/build limpios.

**Fix v1.56.2 -- WowStore rebotaba a /m/login estando logueado de
verdad (bug real, encontrado en dos capas)**: Gunnar volvió a probar
v1.56.1 y seguía sin poder entrar -- "me manda al login.. cuando ya
estoy logeado". La causa NO era la UI (el tile "+ WowStore" ya estaba
ahí y andaba bien), era autenticación, en dos lugares:

1. **`app/m/wowstore/*` exigía `currentMember()` a secas**, igual que
   ya se había documentado y corregido una vez antes en "Editar
   Oficina" (2026-09-19) para otra pantalla -- Gunnar navega logueado
   como Admin/MasterN0 (vía `/admin`), no como Member (vía `/m/login`),
   así que nunca tuvo la cookie que esas pantallas pedían. Fix: nuevo
   `lib/cardHost.ts#requireCardHost(cardId)`, mismo criterio de "isHost"
   que ya usa la Oficina Virtual (`isAdmin || card.isOrigin ||
   memberId === card.memberId`), reusado en `app/m/wowstore/page.tsx`,
   `app/m/wowstore/[key]/page.tsx` y `app/m/wowstore/actions.ts` en vez
   de repetir el chequeo viejo en cada archivo.
2. **La causa real, más profunda: el middleware (`proxy.ts`) bloqueaba
   TODO `/m/*` antes de que el punto 1 llegara siquiera a correr.**
   El lado `/admin/*` del middleware ya tenía un puente explícito
   ("Puente Member→Admin", 2026-09-24, promoción Chido→Programa) que
   deja pasar una sesión de Member válida además de la de Admin -- pero
   el lado `/m/*` nunca tuvo el puente simétrico, solo aceptaba cookie
   de Member. Sin ese puente, el fix del punto 1 era inútil: la request
   nunca llegaba a la página. Fix: mismo puente, en espejo, del lado
   `/m/*` -- acepta también una cookie de Admin válida. El middleware
   solo valida que la sesión sea criptográficamente válida de algún
   tipo; la autorización real por Card sigue viviendo en
   `requireCardHost`, no se duplica ni se afloja.

`e2e/wowstore.spec.ts` ganó un tercer tramo que reproduce el bug real
reportado: un Admin (MasterN0) sin ninguna cookie de Member navega
`/m/wowstore` para su propia Card `project`, confirma que NUNCA
aterriza en `/m/login` en ningún paso del flujo (explorar → detalle →
instalar), e instala una WowApp de verdad. 36/36 E2E (incluida la
regresión de todo lo demás que pasa por `/m/*`, dado que tocar el
middleware es alto impacto), 185/185 unit, 100% coverage, tsc/lint/
build limpios.

## Mensajería Interna -- Fase M1 (2026-09-24)

Gunnar pidió mapear un sistema de mensajería propio de LyCard: un N0
puede mandar mensajes masivos a su Programa (multi-Programa si es
MasterN0), personalizables en contenido y canal (LyCard interno,
WhatsApp, email, Telegram, etc. -- individual, todos, o combinación),
y cualquiera que no sea N0 solo puede mandar mensajes directos 1:1 con
su equipo. Pedido explícito: documentar TODO acá primero, clarísimo,
para que si la sesión se corta a mitad de camino quede recuperable sin
adivinar nada -- recién después, si alcanzan los tokens, se construye.

**Vocabulario del fractal, aclarado por Gunnar (reemplaza cualquier
supuesto anterior de "profundidad de árbol de referidos" para este
feature en particular)**:
- **N0**: el humano, dueño del Programa.
- **N1**: fija -- la tríada Gemelo Digital (Einar/Chaty/Warren). No es
  humana.
- **N2**: las 12 "guardianas del ser" (etapas/perfiles/objetivo/legado).
  No son humanas.
- **N3**: Expertos -- pueden ser IA o humanos. Un N3 humano sin Programa
  propio **es literalmente el mismo Chido** que ya existe en el
  vocabulario y la Fase P1 (Chido→Programa) -- el instante en que ese
  humano crea su propio Programa, se convierte en N0 de ese Programa
  nuevo. Mismo mecanismo, mismo momento, sin nada nuevo que construir
  para esa parte.
- **N4**: Especialistas. Niveles más abajo (N5+) existen en la
  arquitectura de EinarOS pero **no aplican a este feature** -- pedido
  explícito de Gunnar de no mapearlos acá, el permiso de mensajería no
  los necesita (ver regla de permiso abajo, es binaria).

**Regla de permiso, cerrada y binaria -- no hace falta el árbol
completo**:
- Solo los miembros **humanos** participan de la mensajería. N1 y N2
  nunca son remitente ni destinatario -- quedan afuera del sistema por
  completo, ni siquiera se modelan como Member.
- **N0 → masivo.** Se resuelve con lo que YA existe:
  `currentAdminScope()` devuelve un scope con `programId` (N0 de ese
  Programa) o `isMasterN0Scope(scope)` (multi-Programa) → puede armar un
  envío masivo.
- **Cualquier humano que no sea N0 (N3/Chido, N4/Especialista, lo que
  sea) → solo directo 1:1.** No hace falta distinguir de qué nivel
  exacto es -- el corte es binario, N0 o no-N0.
- **"Tu equipo" para el directo** = cualquier otro miembro humano del
  mismo Programa (`ProgramMembership.programId` compartido) -- la
  definición más simple, ya soportada por el dato que existe hoy, sin
  inventar visibilidad por rama del árbol de referidos.

**Modelo de datos propuesto** (todavía sin migrar):
```prisma
model Message {
  id             String   @id @default(cuid())
  programId      String
  program        Program  @relation(fields: [programId], references: [id])
  // Quién manda -- ver wrinkle de Admin-sin-Member abajo, por eso
  // los dos campos opcionales en vez de uno solo obligatorio.
  senderMemberId String?
  senderAdminId  String?
  scope          String   // "masivo" | "directo"
  body           String   @db.Text
  createdAt      DateTime @default(now())
  deliveries     MessageDelivery[]
}

model MessageDelivery {
  id                String   @id @default(cuid())
  messageId         String
  message           Message  @relation(fields: [messageId], references: [id], onDelete: Cascade)
  recipientMemberId String
  recipient         Member   @relation(fields: [recipientMemberId], references: [id])
  channel           String   // "lycard" | "email" | "telegram" | "whatsapp"
  // "pendiente" | "enviado" | "fallido" | "simulado" -- nunca
  // "enviado" si el canal no mandó nada de verdad (cáscara honesta,
  // mismo criterio que membershipPaidAt/adaptationStatus/etc).
  status      String   @default("pendiente")
  errorDetail String?
  createdAt   DateTime @default(now())
}
```

**Wrinkle real encontrado pensando el modelo, no adivinado**: no todo
N0 tiene necesariamente un `Member` propio. Un N0 promovido vía Fase P1
(Chido→Programa) sí lo tiene (`Admin.memberId`), pero un N0 dado de
alta a mano por MasterN0 desde `/admin/programs` (`createProgramAdminAction`,
el flujo de siempre con email/password) puede no tener ningún `Member`
vinculado. Por eso `Message.senderMemberId`/`senderAdminId` quedan los
dos opcionales -- se llena el que corresponda según cómo llegó ese N0 a
serlo, resuelto en la implementación, no bloqueante para el diseño.

**Canales -- feasibility real por canal, sin vender humo**:
- **LyCard interno**: cero blockers, se construye de cero, 100% bajo
  nuestro control.
- **Email**: YA hay integración real (Resend, usada en 3 lugares del
  proyecto: invitaciones, mensajes de contacto, mensajes a miembros
  desde `/admin/programs/[id]`) -- se reusa directo.
- **Telegram**: Bot API gratis, sin aprobación de terceros -- el canal
  "real" más barato de sumar si se quiere uno nuevo de verdad
  funcionando.
- **WhatsApp**: sin integración real de ENVÍO en todo el repo hoy (solo
  el login OTP simulado). Mandar WhatsApp real requiere WhatsApp
  Business API -- aprobación de Meta, número verificado, costo por
  mensaje -- no es "conectar una librería", es un trámite de negocio
  real. Queda **simulado/loggeado** (`status:"simulado"`) hasta que esa
  cuenta exista de verdad -- prometerlo como real sería mentir.

**EDT propuesta -- Fase M1 (recorte razonable para no volver a los
mismos límites de tokens de esta sesión)**:
1. **Schema**: `Message` + `MessageDelivery`, migración.
2. **Envío masivo (N0)**: nueva sección en `/admin/programs/[id]`
   (o página propia `/admin/programs/[id]/mensajes`) -- compositor de
   mensaje, selector de destinatarios (todos / selección), selector de
   canal por destinatario o en combo. Canales reales en M1: LyCard +
   Email. Telegram y WhatsApp quedan documentados como próxima fase
   (Telegram) o simulados (WhatsApp) hasta que haya decisión de
   negocio.
3. **Directo 1:1**: pantalla nueva member-facing (`/m/dashboard` o
   dentro de la Oficina) -- elegir a alguien del mismo Programa,
   mandar/recibir mensajes directos, canal LyCard por default (no hace
   falta selector de canal para 1:1 en M1, eso es más una cosa de
   difusión masiva).
4. **Bandeja LyCard interna**: dónde ve cada Member sus mensajes
   recibidos (masivos + directos) -- nueva sección, contador de no
   leídos.
5. Verificación de siempre: tsc/lint/100% coverage/build/E2E real de
   punta a punta (N0 manda masivo por la UI real, un Member lo ve en su
   bandeja; dos Members se mandan un directo) antes de shippear.

**Fuera de alcance de M1, documentado, no se toca todavía**: Telegram
real (queda para una fase aparte si se decide sumar), WhatsApp real
(depende de una cuenta de negocio que hoy no existe), cualquier
adjunto/multimedia en el mensaje, notificaciones push nativas.

**Shippeado como v1.56.0.** Lo de arriba se construyó tal cual estaba
diseñado, con dos ajustes reales encontrados haciendo el E2E de punta a
punta (no adivinados, encontrados corriendo la UI real):

- **Bug real de producto**: la bandeja de cada Member
  (`/m/dashboard/messages`) traía TODAS las `MessageDelivery` del
  destinatario sin filtrar por canal -- un mismo mensaje mandado por 4
  canales aparecía 4 veces duplicado en la bandeja. Fix: la bandeja solo
  lee `channel:"lycard"` -- los otros canales son intentos de entrega
  por FUERA de la app, no representan un mensaje "en tu bandeja" acá.
- **Simplificación honesta de M1, documentada a propósito**: la pantalla
  member-facing opera sobre la PRIMERA `ProgramMembership` activa del
  Member, no sobre todas -- hoy la enorme mayoría solo tiene una
  (Legacy, salvo que haya sido referido a más de un Programa). Multi-
  Programa en la bandeja del Member queda para una fase aparte si hace
  falta -- no bloqueante para lo que Gunnar pidió.

Lo demás salió tal cual el diseño: `Message`/`MessageDelivery` migrados,
compositor masivo en `/admin/programs/[id]` (sección "Mensajería",
LyCard+Email real, Telegram+WhatsApp `status:"simulado"` sin fingir
envío), directo 1:1 member-facing con bandeja + "marcar leído", y el
`Message.senderMemberId`/`senderAdminId` opcional resolviendo el
wrinkle de N0-sin-Member documentado arriba. `e2e/messaging.spec.ts`
nuevo cubre el flujo real completo (masivo con los 4 canales + estado
honesto de cada uno, directo 1:1, bandeja de ambos lados). Suite
completa: 36/36 E2E, 185/185 unit, 100% coverage en los archivos
ratcheted, tsc/lint/build limpios.

---

## WowStore -- Fase W2: rediseño rico (2026-09-24)

Gunnar probó WowStore ya arreglado (v1.56.2) y pegó un mockup completo
(HTML/Tailwind generado con Gemini/AIDA, 5 pantallas: Explorar, Detalle
de App, Mis WowApps, Solicitud de Adaptación, Perfil de Negocio) como
referencia de hacia dónde quiere llevar la experiencia -- una vidriera
mucho más rica que el flujo actual de 2 selects + 3 resultados.
Pedido explícito: documentar el diseño acá primero, clarísimo, antes
de tocar código -- mismo criterio ya usado con Mensajería Interna.

**Restricción dura que gobierna todo este diseño**: el mockup es
Tailwind/Material Symbols, tema claro, con datos 100% inventados
(rating 4.9★, "128 taquerías activas", testimonio de "Don Pedro",
RFC fiscal, tarjeta de crédito terminada en 4821, asesor "Ing. Carlos
Mendoza" con foto de stock). Ninguno de esos elementos entra tal cual:
(a) el tema visual de LyCard es Playfair Display/Plus Jakarta Sans,
dorado (#C8A15A) sobre negro (#0B0B0A) -- no se adopta un segundo
sistema de diseño para una sola sección; (b) ratings, reseñas,
testimonios y datos fiscales/de facturación fabricados violan la
cáscara honesta que gobierna todo el proyecto -- si no hay un dato
real detrás, no se muestra, no se inventa un número creíble.

**Lo que SÍ se adopta del mockup, traducido a datos reales y al
sistema de diseño de LyCard**:

1. **Chips de rubro con contador real** (reemplaza los 2 `<select>`
   actuales): scroll horizontal de rubros (`RUBROS` de
   `lib/wowApps.ts`, ya existe), cada chip con la cantidad real de
   WowApps `status:"activo"` que matchean ese rubro -- `lib/wowApps.ts`
   suma una función pura nueva, `countByRubro(catalog): Record<string,
   number>`, testeable sin DB igual que `matchWowApps`. El dolor sigue
   siendo un segundo selector (o un segundo set de chips), no
   inventamos un buscador de texto libre en esta ronda -- el buscador
   con texto libre del mockup ("comanda rápida, menú QR...") queda
   fuera de alcance de W2 (necesitaría full-text search real sobre
   nombre/descripción, no está roto ni pedido explícitamente, se
   documenta como posible W3).
2. **Tab "Mis WowApps" separado de "Explorar"**: hoy lo instalado en
   una Card solo se ve de vuelta en su Oficina Virtual -- WowStore en
   sí (`/m/wowstore`) es una vidriera de una sola vía (solo explorar).
   W2 suma una segunda vista `/m/wowstore/mias?cardId=...` con las
   WowApps ya instaladas en ESA Card (mismo dato que ya lee
   `WowAppsBlock`, reusado, no duplicado) + link directo de vuelta a
   la Oficina para verlas operando.
3. **Tab "Solicitudes"**: lista real de `WowAppInstall` con
   `adaptationStatus !== "sin_pedir"` para esa Card, mostrando el
   estado real (`pendiente` | `en_progreso` | `entregada`) como
   badge simple -- **sin** el stepper de 4 fases con % inventado ni el
   asesor de foto de stock del mockup. Si algún día hay un flujo de
   ingeniería real con fases reales, se agrega entonces -- no antes.
4. **Detalle de WowApp con 2 opciones lado a lado**: el mockup separa
   "Estándar" vs "Personalizada" como dos cards seleccionables con
   precio -- esto YA es, casi 1:1, lo que hace hoy `installWowAppAction`
   ("Instalación Express") vs `requestAdaptationAction` ("Adaptación a
   medida"), solo que hoy se ven apiladas verticalmente con estilos
   distintos. W2 las rearma como 2 cards del mismo tamaño, mismo
   patrón visual, sin inventar un segundo precio -- el de adaptación
   sigue siendo "a cotizar" (no hay pasarela de pago real todavía,
   mismo límite honesto de siempre).

**Explícitamente fuera de alcance de W2 (documentado, no se construye)**:
- Ratings/reseñas/testimonios -- no hay mecanismo real de reseñas en
  todo el proyecto, inventar uno es un pedazo de trabajo aparte (y
  requeriría moderación, otra cosa que no existe).
- Tab "Perfil de Negocio" con datos fiscales/facturación/tarjeta -- no
  hay ese modelo de datos en Prisma hoy (RFC, CFDI, medios de pago).
  Lo que YA existe para "mi negocio" vive en `MemberCardEditor`
  (`/m/dashboard/company`), no se duplica acá.
- Barra de navegación inferior fija tipo app nativa (Explorar/Mis
  WowApps/Solicitudes/Perfil) -- LyCard usa navegación por link
  "← Volver", no tab bar persistente; se resuelve con links simples
  entre las 3 pantallas de W2, sin rediseñar la navegación global.
- Buscador de texto libre -- ver punto 1, queda para una fase W3 si
  se pide.
- Cualquier automatización real del pedido de adaptación -- sigue
  siendo un email al equipo, igual que hoy.

**EDT propuesta -- Fase W2 (para cuando se decida construir)**:
1. `lib/wowApps.ts`: `countByRubro`, tests unitarios.
2. `app/m/wowstore/page.tsx`: chips de rubro con contador real +
   segundo set de chips para dolor (reemplaza los 2 `<select>`).
3. `app/m/wowstore/mias/page.tsx` (nuevo): tab "Mis WowApps" -- reusa
   `card.wowAppInstalls`, mismo helper `requireCardHost` ya construido
   en el fix de v1.56.2.
4. `app/m/wowstore/solicitudes/page.tsx` (nuevo): tab "Solicitudes" --
   `WowAppInstall` con `adaptationStatus !== "sin_pedir"`, badge de
   estado real.
5. `app/m/wowstore/[key]/page.tsx`: rediseño de las 2 opciones
   (Instalación Express / Adaptación a medida) como cards lado a lado.
6. Nav simple entre las 3 pantallas (Explorar/Mis WowApps/Solicitudes),
   sin tab bar fija.
7. Verificación de siempre: tsc/lint/100% coverage/build,
   `e2e/wowstore.spec.ts` extendido para cubrir las 2 pantallas nuevas,
   suite completa sin regresiones, version bump, PLAN.md, commit, push,
   poll de Vercel.

**Shippeado como v1.57.0.** Se construyó tal cual el diseño de arriba,
sin desvíos:

- `lib/wowApps.ts#countByRubro` (nueva, pura), con `lib/__tests__/
  wowApps.test.ts` ampliado (catálogo vacío, solo cuenta `activo`,
  una app en varios rubros, rubro-agnóstico no suma, tag corrupto se
  ignora sin romper).
- `app/m/wowstore/page.tsx`: los 2 `<select>` se fueron -- ahora son 2
  filas de chips (`<Link>` con query string, sin JS de cliente, mismo
  criterio "zero-JS" del resto del proyecto), el chip de rubro con su
  contador real al lado.
- `components/WowStoreTabs.tsx` (nuevo): la fila de 3 tabs
  (Explorar/Mis WowApps/Solicitudes), reusada en las 3 pantallas --
  no es una tab bar global, LyCard sigue sin tener una.
- `app/m/wowstore/mias/page.tsx` y `app/m/wowstore/solicitudes/page.tsx`
  (nuevas), ambas sobre `requireCardHost` (el mismo helper del fix de
  v1.56.2, no uno nuevo).
- `app/m/wowstore/[key]/page.tsx`: "Instalación Express" y "Adaptación
  a tu medida" ahora son 2 cards del mismo peso visual (`OPTION_CARD`),
  mismos datos y acciones reales de siempre -- ningún precio inventado.
- `e2e/wowstore.spec.ts` ganó cobertura real de las 2 pantallas nuevas
  y del contador del chip (sin acoplarse a un valor exacto -- eso ya
  lo cubre el unit test puro, el E2E solo confirma que el número está
  de verdad ahí). 36/36 E2E, 190/190 unit, 100% coverage, tsc/lint/
  build limpios.

Lo documentado como "fuera de alcance" (ratings, Perfil de Negocio,
tab bar nativa, buscador de texto libre) sigue exactamente ahí --
ninguno se construyó, ver el detalle arriba.

**Fix W2.1 -- feedback real de Gunnar sobre v1.57.0 (2026-09-24)**:
probó y devolvió 4 problemas reales, no estética por estética:

1. **"No hay forma de regresar a la tarjeta"** -- ninguna de las 4
   pantallas de WowStore linkeaba de vuelta a la Oficina. Fix: link
   fijo "← Volver a tu tarjeta" en `WowStoreTabs` (las 3 pantallas con
   tabs) y en el detalle de cada WowApp.
2. **"Las WowApps ya creadas (Superpoderes) deberían tener nombre y
   apellido en el inventario... no están en Mis WowApps"** -- las 8
   herramientas reales de la Oficina (Brief, Notas de Voz, Agenda,
   Mensajes, Malla, Cartera, Configuración, Modo Foco) viven en
   `Program.officeSkills`, un modelo totalmente aparte de
   `WowApp`/`WowAppInstall` -- por diseño original (ver "Hallazgo de
   arquitectura" en la Fase W1), pero eso las volvía invisibles desde
   WowStore. **No se migran a la tabla `WowApp`** (mover 8 features
   reales y funcionando a un modelo pensado para catálogo externo
   arriesgaba romperlas -- sus componentes reales, `FathomBriefBlock`/
   `VoiceNotesBlock`/`AgendaBlock`/`FocusModeBlock`, no tienen
   equivalente dentro de `WowAppsBlock`, que hoy solo sabe renderizar
   `appType:"awe"` de verdad). En cambio, `/m/wowstore/mias` ahora
   también lista las `officeSkills` del Programa de una Card `project`
   -- mismo tile, mismo ícono, mismo nombre real -- cada una con un
   link "Ver en tu Oficina" (ahí vive su lógica real, no se duplica).
3. **"El diseño de entrada está horrible / no da ganas de comprar"**
   -- las 2 secciones separadas y con doble título ("WOWAPPS" +
   "WOWAPPS · WOWSTORE") se funden en UNA sola, kicker "WowStore" en
   vez de "WowApps" (default cambia en `oficina/page.tsx`, sigue
   siendo editable por Programa vía `cardLabels`). Las tarjetas de
   resultado en Explorar y el detalle de cada WowApp ganan más peso
   visual (precio destacado, badge de "Instalación inmediata" cuando
   corresponde) -- sin copiar el mockup Tailwind/claro, manteniéndonos
   en el sistema de LyCard.

No se tocó el schema (`WowApp`/`WowAppInstall` intactos) -- todo el
fix vive en cómo se arma la UI a partir de datos que ya existen.

**Fix W2.2 -- rating simulado, corrección de criterio (2026-09-24)**:
Gunnar corrigió el criterio de cáscara honesta que había usado para
excluir ratings/reseñas de la Fase W2: simular NO es mentir siempre
que se etiquete como tal -- mismo principio que ya rige WhatsApp/
Telegram en Mensajería o el Índice de Asombro de WowAwe, aplicado acá
por primera vez a "prueba social". `lib/wowApps.ts#simulatedRating`/
`simulatedReviewCount` (puras, determinísticas por `key` vía un hash
simple -- nunca `Math.random()` en cada render, el mismo WowApp
siempre muestra el mismo número) alimentan un rating con estrellas +
cantidad de reseñas en Explorar y en el detalle, **siempre** con
"(simulado)" visible al lado, nunca oculto. Tests unitarios cubren
rango (4.30-5.00 / 8-64) y determinismo. 36/36 E2E, 195/195 unit, 100%
coverage, tsc/lint/build limpios.

## WowStore -- Fase W3: skins + testimonio + Perfil (2026-09-24)

Gunnar pasó 5 mockups de Sketch (storefront B2B rico: hero banner,
detalle con rating/testimonios/specs, "Mis WowApps" con métricas y un
stepper de 4 fases con asesor asignado, configurador de adaptación con
precios línea a línea, y un tab "Perfil" con RFC/tarjeta/hardware) más
la pregunta de por qué su cuenta MasterN0 no ve todo el catálogo. Dos
frentes:

**1. MasterN0/superadmin -- no había bug.** `isMasterN0Scope`
(`lib/authScope.ts`, `scope.programId === null`) ya es el nivel
"superadmin": acceso irrestricto a todo Programa/Card/WowApp, sin
tabla ni rol separado que crear. Si a Gunnar el catálogo real se le ve
vacío/incompleto, es un problema de DATOS (WowApp sin sembrar o sin
`industryTags`/`painPointTags` que matcheen su rubro+dolor elegido),
no de permisos -- confirmado leyendo `app/admin/wowstore/actions.ts`,
`app/admin/wowstore/page.tsx`, `app/admin/auth/google/callback/route.ts`.

**2. De los 5 mockups, qué se construyó y qué no (y por qué):**

- **Skins de marca en WowStore, igual que la LyCard** -- pedido
  explícito ("con la posibilidad de cambiar sus skins, igual que
  nuestras LyCards"), y lo único 100% real y factible del lote sin
  inventar nada: se reusa el `ProgramSkin` que ya existía (mismo
  `colors`/`font`/`isSkinColors`/`KNOWN_FONTS`/`shade()` de
  `lib/designMd.ts` y `components/LyCardView.tsx`), leído vía
  `resolveWowStoreSkin(card.program)` (`lib/wowStoreSkin.ts`, nuevo,
  100% cobertura unitaria) y aplicado por una namespace CSS paralela
  (`--ws-bg`, `--ws-surf`, `--ws-accent`, etc., `wowStoreSkinVars()`)
  en las 4 pantallas de WowStore (`page.tsx`, `[key]/page.tsx`,
  `mias/page.tsx`, `solicitudes/page.tsx`, `WowStoreTabs.tsx`). Sin
  skin activo en el Programa, cae al mismo dorado/negro de siempre --
  cero cambio visual para quien no tiene marca propia cargada.
  `requireCardHost` ahora eager-carga `program.skins` (solo el activo)
  para no duplicar la query en cada pantalla.
- **Testimonio simulado en el detalle** -- mismo criterio ya aceptado
  en W2.2 (simular ≠ mentir si se etiqueta): 3 frases genéricas
  rotadas por hash de `key` (`simulatedTestimonial`, en
  `[key]/page.tsx`), **nunca** un nombre ni negocio inventado (eso sí
  cruzaría la línea -- una cosa es "alguien dijo algo parecido a
  esto", otra es fabricar una identidad real que no existe). Siempre
  con "— testimonio (simulado)" a la vista.
- **Tab "Perfil" nuevo** (4ta pestaña en `WowStoreTabs`,
  `app/m/wowstore/perfil/page.tsx`) -- muestra datos REALES de la
  Card (nombre, Programa, ubicación, canales de contacto cargados) +
  contadores reales (`WowAppInstall` instaladas / adaptaciones
  pedidas, vía `prisma.count`) + link directo al editor real de esa
  Card (`/m/dashboard/company|personal|project`).
- **Lo que el mockup pedía y NO se construyó, a propósito**: RFC,
  últimos 4 dígitos de tarjeta, historial de pagos, stepper de 4 fases
  con % de avance y asesor asignado con foto de stock, configurador de
  adaptación con precios línea a línea. Fabricar un RFC o un número de
  tarjeta -- aunque se etiquete "(simulado)" -- no es lo mismo que un
  rating o un testimonio genérico: es inventar una IDENTIDAD FISCAL o
  un MEDIO DE PAGO que el negocio nunca cargó, terreno de "registro
  falso", no de "estética de catálogo". La sección Perfil en cambio
  dice literal "No hay -- todavía no existe una pasarela de pago
  real", que es la regla de Gunnar aplicada tal cual ("lo que no es se
  pone no hay"). El stepper de 4 fases con asesor asignado tampoco --
  Solicitudes ya mostraba el `adaptationStatus` real; se sumó solo una
  línea aclaratoria para `en_progreso` ("nuestro equipo ya la está
  armando, sin ETA exacta -- simulado: no hay tracking automático de
  avance"), sin inventar un % ni un nombre de asesor que no existe.
  Esta línea sí quedó decidida unilateralmente en esta sesión, no
  re-confirmada con Gunnar -- si la quiere de vuelta, es una
  conversación aparte, no un bug a corregir.

36/36 E2E, 201/201 unit, 100% coverage, tsc/lint/build limpios.

## WowStore -- Fase W3.1: rediseño visual real + Destacadas (2026-09-24)

Gunnar volvió con captura real de producción y las 5 imágenes de Sketch
otra vez, y fue directo: "sigue siendo todo texto", "me estás asegurando
cosas que no son ciertas", "no veo la WowAwe", "no hay forma de poner
favoritos", "tu diseño es horrible y anda intuitivo". Tres cosas reales,
no percepción:

1. **Los "· 0" en cada chip de rubro no eran un bug, pero confundían**:
   `countByRubro` (Fase W2, a propósito) solo cuenta `status:"activo"` --
   el catálogo sembrado de ejemplo tiene TODO en "proximamente" salvo
   WowAwe (que es rubro-agnóstica, no suma a ningún chip). Sin contexto,
   se ve como "no hay nada". No se tocó esa lógica (sigue siendo la
   correcta: nunca prometer una app que no está lista), se explicó.
2. **La Fase W3 anterior solo cambió colores/tipografía (el sistema de
   Skins), no el layout** -- eso fue un error de comunicación mío: dije
   "que se vea atractivo para comprar" como si estuviera resuelto, y no
   lo estaba. Esta ronda SÍ es un rediseño real de estructura, no de
   paleta.
3. **WowAwe (la única WowApp con lógica real) era invisible en la
   práctica** -- al no tener `industryTags`, solo aparecía si alguien
   tocaba el chip de dolor exacto "El peso de estar solo con todo esto".
   Gunnar ya había pedido esto en Fase W2 ("marcá como favoritas las que
   funcionan") y no se había resuelto.

**Lo que se construyó, todo verificado con capturas reales (Playwright
contra fixtures sembradas, no maquetas):**

- **`WowApp.destacado`** (schema nuevo, migración
  `20260924165435_wowapp_destacado`) -- toggle manual de MasterN0 desde
  `/admin/wowstore`. `lib/wowApps.ts#featuredWowApps(catalog)` devuelve
  las `status:"activo" && destacado`, sección "Destacadas" en Explorar
  que se muestra SIEMPRE arriba de todo, sin depender de qué rubro/dolor
  esté tocado -- a diferencia de `matchWowApps`. WowAwe queda marcada
  `destacado:true` en `EXAMPLE_WOW_APPS` (la seed de ejemplo); en
  producción Gunnar la marca él mismo desde el admin real.
- **Cards rediseñadas de raíz** (`WowAppCard`, componente compartido
  entre Destacadas y Resultados en `app/m/wowstore/page.tsx`): ícono más
  grande, badge "★ Destacada", tags de rubro/dolor pintados como pills
  -- pero sacados de `industryTags`/`painPointTags` REALES de cada
  WowApp (`rubroLabel`/`painPointLabel`, nuevas en `lib/wowApps.ts`),
  nunca una feature inventada como "Impresora Térmica 80mm" del mockup.
  Precio grande + botón real "Ver App" (antes era solo una flecha "→").
- **Detalle de cada WowApp**: nueva caja "Ficha Técnica" con los mismos
  rubros/dolores reales de esa app -- honesto, sin fabricar
  compatibilidad de hardware ni specs que no existen.
- **Mis WowApps / Solicitudes**: mismo peso visual (íconos más grandes,
  badges de estado, botones reales en vez de solo texto-link), estrella
  ★ en instaladas que son `destacado`. Sin fabricar métricas de
  pedidos/ventas ($ que el mockup mostraba) -- esos números no existen.
- **Perfil**: sección "Soporte" nueva -- si el Programa tiene `wa`
  cargado, aparece un botón real "Escribir por WhatsApp" (mismo builder
  de link que `LyCardView.tsx`) al equipo real, en vez del "Asesor
  Técnico Asignado" con foto y SLA inventados del mockup. El resto
  (Facturación "No hay") queda igual que en W3 -- sigue siendo la línea
  que no se cruza: RFC, tarjeta terminada en 4 dígitos, historial de
  pagos y crédito en bolsa son identidad fiscal/financiera fabricada,
  categoría distinta de una estrella o un testimonio genérico.

**Un bug real encontrado en el camino, sin relación con el diseño**: el
primer intento de correr la suite E2E completa falló en
`wowstore.spec.ts` (timeout esperando el redirect al crear una WowApp
desde `/admin/wowstore`) -- la causa fue un `next dev` que llevaba
corriendo desde ANTES de la migración de `destacado`, con el Prisma
Client viejo en memoria (sin esa columna) -- `prisma.wowApp.create`
tronaba en el server. Se resolvió matando ese proceso y dejando que
Playwright levantara un dev server fresco. No es un bug de producción
(Vercel siempre hace `prisma generate` + build limpio en cada deploy),
pero deja una lección para esta sesión: reiniciar el dev server local
después de cualquier migración de schema, no asumir que un servidor
viejo se entera solo.

36/36 E2E, 209/209 unit, 100% coverage, tsc/lint/build limpios.
Verificado con 5 capturas reales (Explorar/Detalle/Mis WowApps/
Solicitudes/Perfil) contra datos sembrados, enviadas a Gunnar antes de
avisar que esto estaba listo -- mismo criterio de "no prometer sin
mostrar" que ya se usó una vez antes en esta misma Fase.

**Recordatorio de la regla permanente de arriba**: esto sigue sin ser
luz verde de producción. Fase P1 y Fase W1 están listas para que Sergio
y Fabricio las auditen -- no para que un cliente real las use.

## Ronda de endurecimiento (2026-09-29) -- Fase 1: Regla dura de MasterN0

Gunnar abrió una ronda nueva de 5 fases (seguimos en FASE DE DISEÑO,
datos de prueba, nombres internos nunca en la interfaz -- "Gemelo
Digital" es el único nombre que el usuario ve para su agente). Fase 1,
la única cerrada por ahora: **MasterN0 soy solo yo. La promoción
automática (Fase P1) crea un Admin con programId de ese Programa, nunca
un Admin con programId null.**

**Auditoría de código, los 4 lugares de todo el repo que tocan el modelo
`Admin` (`prisma.admin.create`/`update`/`upsert`), ninguno más:**
1. `prisma/seed.ts` -- el ÚNICO lugar que puede dejar `programId: null`.
   Script manual, una sola vez, exige `SEED_ADMIN_EMAIL`/
   `SEED_ADMIN_PASSWORD` por env var, sin default hardcodeado. No
   responde a ninguna request, nadie más que quien tiene acceso al
   servidor lo puede correr.
2. `createProgramAdminAction` (`app/admin/programs/actions.ts`) --
   detrás de `requireMasterN0()`, valida `programId` no vacío + que el
   Programa exista antes de crear. Ya era seguro.
3. `app/admin/actions.ts` (cambio de password) -- nunca toca
   `programId`.
4. `lib/programPromotion.ts#promoteToPrograma` (la promoción
   automática) -- ya creaba el `Program` primero y usaba SU id real para
   el `Admin`, nunca podía ser null en la práctica. **Ya era seguro
   antes de esta ronda** -- lo que faltaba era la garantía explícita +
   el test que lo demuestre, no un bug que corregir.

**Lo que se construyó, para que ese invariante no dependa solo de que
nadie se equivoque leyendo el código:**
- `lib/programPromotion.ts#buildPromotedAdminData(memberId, programId:
  string)` -- extrae el payload del `Admin` promovido a una función
  pura, con `programId` tipado `string` (no `string | null`) a
  propósito: el compilador ya rechaza pasarle `null`.
- `lib/__tests__/programPromotion.test.ts` (nuevo, 3 tests) -- confirma
  en runtime que el resultado nunca es null, que el `memberId` viaja
  intacto, y que nunca se cuelan `email`/`passwordHash`.
- `e2e/program-promotion.spec.ts` -- los 2 escenarios reales (vía
  entrevista, vía "marcar como pagada") ahora afirman explícitamente
  `expect(adminRow.rows[0].programId).not.toBeNull()`, con un comentario
  que nombra la regla dura, además del chequeo de igualdad que ya
  existía.
- `docs/02-ARQUITECTURA.md`, sección "Regla dura: quién puede volverse
  Admin/N0" -- reescrita para decir explícito, primero que nada: dar
  permisos de MasterN0 lo hace solo Gunnar, a mano, y el único lugar del
  código que puede hacerlo es el seed script.

**Verificado**: 35/36 E2E (el único que no pasa,
`interview-slots.spec.ts`, es un test viejo con fechas fijas
hardcodeadas por Gunnar -- "Jueves 24 de Septiembre" ya quedó en el
pasado real, 2026-09-29 -- código funcionando como debe, sin relación
con esta fase, no se tocó), 212/212 unit, 100% coverage en los archivos
del ratchet, tsc/lint/build limpios.

Shippeado como v1.59.1.

## Ronda de endurecimiento (2026-09-29) -- Fase 2: Pulido visual (sin funcionalidades nuevas)

6 items, todos de pulido, cero funcionalidad nueva:

1. **Islita de versión y lápiz de editar, solo para el dueño real**:
   `isHost` (acceso funcional -- edición, WowStore, Malla completa) no se
   tocó, sigue dando acceso a cualquiera que abra la Card Origen, con o
   sin sesión, tal cual documentado desde v1.1.0. Se sumó
   `isAuthenticatedOwner` (`isAdmin || memberId === card.memberId`, sin
   el bypass de `card.isOrigin`), usado solo para gatear estos 2
   elementos cosméticos en `LyCardView.tsx` y `oficina/page.tsx`.
2. **Hueco visual entre las redes sociales y la frase**: bug real de
   flexbox en `LyCardView.tsx` -- el wrapper de la foto (`flex:1 1 auto`
   sin tope) absorbía todo el espacio sobrante de la columna y lo dejaba
   varado después de la fila de redes. Se le puso al wrapper el mismo
   tope que ya tenía su foto (+70px para la fila que se superpone).
   Verificado con capturas reales antes/después (4 iteraciones, 2
   intentos previos causaron regresiones distintas y se descartaron).
3. **Colores de los íconos de contacto**: el jade/rubí (verde/rojo) no
   está en el brandbook (#0D0D0D/#C8A15A/#F5F2EB/#5A5A5A). Unificados al
   dorado de marca, usando la variable `--accentRgb` ya existente para
   que un Programa con su propio Skin lo siga viendo con su color.
4. **Acento faltante**: `"certificacion"` → `"certificación"` en
   `lib/tags.ts` (categoría sugerida de Janus, se renderiza en un
   `<datalist>` real).
5. **Textos en inglés sin ambigüedad**: `aria-label="Virtual Office"` →
   `"Oficina Virtual"`, 3x `aria-label="Close"` → `"Cerrar"`, `"My
   Business/Personal Card"` → `"Mi Tarjeta de Empresa/Personal"`
   (`LyCardView.tsx` + `EditorForm.tsx`).
6. **"Keep in Flow" y "Check de Realidad"**: únicos 2 términos donde se
   le propusieron opciones a Gunnar antes de tocarlos (pedido explícito
   suyo). Eligió los más literales: **Objetivo del Día** y **Chequeo de
   Realidad** -- renombrados en el texto real de la Oficina
   (`KeepInFlowBlock.tsx`/`CheckDeRealidadBlock.tsx`), el editor N0
   (`OficinaExtrasEditor.tsx`), el admin de frases
   (`app/admin/programs/[id]/page.tsx`), el diálogo del Gemelo Digital
   (`lib/gemeloDigitalScript.ts`), y los comentarios de código
   relacionados. De paso se sacó una etiqueta "Objetivo del día" que
   quedaba duplicada al lado del kicker una vez que el kicker mismo pasó
   a decir eso (antes no chocaban porque el kicker estaba en inglés). El
   historial del CHANGELOG (`lib/version.ts`) se dejó sin tocar --
   registro de lo que se shippeó en su momento, no se reescribe.

**Verificado**: mismo 35/36 E2E que la Fase 1 (el único que no pasa
sigue siendo `interview-slots.spec.ts` por fechas vencidas, no una
regresión -- se encontraron y corrigieron de paso 2 tests que sí
apuntaban a texto viejo real: `card-size-panel.spec.ts` esperaba el
aria-label en inglés del punto 5, y `oficina-extras-editor.spec.ts`
esperaba el nombre viejo del acordeón del punto 6), 212/212 unit, 100%
coverage, tsc/lint/build limpios.

## Ronda de endurecimiento (2026-09-29) -- Fase 3: Nombre del agente

Auditoría de todo `docs/`, `PLAN.md` y la interfaz buscando "Einar",
"Carbono" y "Silicio" usados para nombrar el agente del propio usuario
(el pedido: "donde se hable del agente del usuario ... reemplazalo por
'Gemelo Digital'"). **Resultado: cero cambios de código** -- la única
feature que ES "el agente del usuario" (el Gemelo Digital, la demo de
chat de `lib/gemeloDigitalScript.ts`/`components/OfficeDemoChat.tsx`) ya
usa "Gemelo Digital" / "Tu Gemelo Digital" en el 100% de sus strings,
sin una sola mención a Einar/Carbono/Silicio -- se construyó bien desde
el vamos (Fase D, ya shippeada).

El resto de las apariciones encontradas no son "el agente del usuario",
son 3 cosas distintas, todas fuera del alcance del pedido:
1. `docs/*.md` y `PLAN.md` -- vocabulario interno de EinarOS para
   contribuidores (`docs/06-CONTRIBUIR.md` tiene directamente una
   sección "Dudas sobre el vocabulario del ecosistema"). No es
   interfaz, es documentación de equipo.
2. `/admin/equipo` (`EquipoTasksBlock.tsx`, `lib/hr.ts`) -- el módulo HR
   interno, gateado a MasterN0 y con el rótulo "EinarOS · Interno"
   escrito en la propia pantalla. Es la taxonomía real del EQUIPO de
   Gunnar (quién es persona, quién es agente puro), no el agente de un
   cliente.
3. `lib/mallaReal.ts` (`N1_TRIADA`: Einar/Chaty/Warren) -- son los 3
   nodos fijos del organismo RAÍZ (el propio equipo N1 de Legacy, WHITEPAPER
   §4.4), que se ve en la Malla de un visitante o en la Card Origen de
   Gunnar. No es "tu agente": son 3 roles reales y distintos
   (Estrategia/Coordinación/Ejecución) del organigrama del ecosistema,
   mostrados como contenido informativo -- mismo criterio que la
   descripción de la insignia O.D. en `lib/i18n.ts`, que ya nombra
   "EinarOS" en texto visible a cualquier visitante. Cada cliente real
   (Programa) sigue viendo su PROPIO equipo con nombres reales
   (`buildMemberFractalGraph`), nunca Einar/Chaty/Warren -- ese trío
   nunca se le atribuye a un cliente como si fuera su propio agente.

Sin cambios que verificar/shippear -- no hubo diff de código, se deja
documentado el criterio para no repetir la auditoría.

## Ronda de endurecimiento (2026-09-29) -- Fase 4: DISEÑO -- Especialistas y Expertos

**Solo diseño, cero código en esta fase.** Seguimos en FASE DE DISEÑO:
todo lo que sigue es propuesta, espera el OK de Gunnar antes de que la
Fase 5 escriba una sola línea.

### El giro: de "apps" a "gente que contratás"

WowStore hoy (Fase W1-W3, ya shippeado) vende WowApps -- funciones. El
pedido de esta fase es reformular esa vidriera para vender DOS TIPOS DE
INTEGRANTES DE EQUIPO, no funciones sueltas:

- **ESPECIALISTA**: un agente puro, con UN trabajo (no una lista de
  features). Las WowApps que hoy existen (WowAwe, Modo Foco, Notas de
  Voz, Agenda) pasan a ser las HERRAMIENTAS que un Especialista usa para
  hacer su trabajo -- no se venden solas, se venden como parte del
  paquete de un rol. El diferencial real frente a "instalar una app": un
  Especialista SUGIERE de forma proactiva (te avisa cuando ve algo, sin
  que lo abras vos), una app pasiva espera que vos la abras.
- **EXPERTO**: el Gemelo Digital de una PERSONA REAL, construido con el
  mismo proceso de alta de Legacy (entrevista → Programa → Card) que ya
  usa cualquier miembro. Reglas duras, no negociables:
  1. Solo existe con consentimiento explícito y revocable de esa
     persona. Revocar = se borra el contenido que ese consentimiento
     autorizaba, no solo se desactiva.
  2. Nunca se publica hasta que la persona lo aprueba a mano -- el
     "Bautizo". Ni por default, ni por accidente, ni porque ya cargó
     contenido.
  3. Siempre rotulado "Gemelo digital de [nombre]" -- nunca se presenta
     como si fuera la persona misma.
  4. Si la profesión es regulada (salud, legal, finanzas...): orienta y
     refiere, nunca diagnostica, y escala a la persona humana cuando la
     pregunta lo requiere.
  5. El Códice (la base de conocimiento de esa persona) NUNCA sale --
     el usuario recibe respuestas, nunca el conocimiento crudo detrás.

**Nota de nombres**: "Bautizo" es vocabulario de diseño/EinarOS para
esta charla, no un texto que va a aparecer en la interfaz (regla de la
Fase 3: nombres internos nunca en la UI). Cuando se construya en Fase 5,
el botón real que dispara ese estado dirá algo como "Publicar mi Gemelo
Digital" o "Confirmar y publicar" -- a definir con el mismo criterio de
"proponer antes de tocar" que usamos en la Fase 2.

### (a) Modelo de datos propuesto

```prisma
// Un Especialista es un ROL con un trabajo, no una feature. Las WowApps
// que ya existen se referencian como sus herramientas (toolKeys), mismo
// patrón string[] serializado que industryTags/painPointTags en WowApp
// -- sin FK dura, para no atar el ciclo de vida de una WowApp al de
// cada Especialista que la usa.
model Especialista {
  id            String   @id @default(cuid())
  key           String   @unique
  nombre        String
  trabajo       String   // el ÚNICO objetivo de este rol, en una frase -- no una lista de features
  descripcion   String
  iconUrl       String   @default("")
  color         String   @default("#C8A15A")
  toolKeys      Json     @default("[]") // WowApp.key[] -- las herramientas que usa
  // Graduado, no binario -- hasta dónde actúa sin que el dueño confirme
  // cada vez. Arranca siempre en "sugiere" para cualquier Especialista
  // nuevo (cáscara honesta: nunca actuar solo por default).
  autonomyLevel String   @default("sugiere") // "sugiere" | "actua_con_ok" | "actua_solo"
  industryTags  Json     @default("[]")
  painPointTags Json     @default("[]")
  basePriceUsd  Float    @default(0)
  status        String   @default("proximamente")
  destacado     Boolean  @default(false)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  installs EspecialistaInstall[]
}

model EspecialistaInstall {
  id             String   @id @default(cuid())
  cardId         String
  card           Card     @relation(fields: [cardId], references: [id], onDelete: Cascade)
  especialistaId String
  especialista   Especialista @relation(fields: [especialistaId], references: [id], onDelete: Cascade)
  installedAt    DateTime @default(now())
  // Referido flow (ver (c)): si esta contratación vino de la
  // recomendación de un Experto, queda esa trazabilidad -- de acá sale
  // la comisión, nunca de "traer gente".
  referredByExpertoId String?
  referredByExperto   Experto? @relation(fields: [referredByExpertoId], references: [id])

  @@unique([cardId, especialistaId])
}

// Un Experto SIEMPRE cuelga de un Member real que ya pasó por el alta
// de Legacy -- nunca un perfil inventado suelto. memberId único: una
// persona tiene un solo Gemelo Digital experto, no varios.
model Experto {
  id        String @id @default(cuid())
  key       String @unique
  memberId  String @unique
  member    Member @relation(fields: [memberId], references: [id])

  nombrePublico    String  // puede diferir de Member.name (alias público), nunca se usa para simular ser la persona
  profesion        String
  esProfesionRegulada Boolean @default(false) // dispara la regla dura de "orienta y refiere, nunca diagnostica"
  descripcion      String
  iconUrl          String  @default("")
  color            String  @default("#C8A15A")

  // Consentimiento -- obligatorio, explícito, revocable. Sin
  // consentGivenAt, este Experto no puede tener bautizoStatus
  // "bautizado" (constraint a nivel de código, no de DB).
  consentGivenAt   DateTime?
  consentScope     Json     @default("[]") // qué autorizó usar: "transcripciones" | "documentos" | "voz" | ...
  consentRevokedAt DateTime?

  // Nunca se publica sin aprobación a mano de la persona -- ver reglas
  // duras arriba. "sin_bautizar" es el default de TODO Experto nuevo,
  // sin excepción.
  bautizoStatus String @default("sin_bautizar") // "sin_bautizar" | "bautizado"

  // Los 3 niveles de consulta, ver (d) -- precios placeholder, sin
  // pasarela real (mismo criterio honesto que basePriceUsd en WowApp).
  priceGemeloSoloUsd     Float @default(0)
  priceGemeloRevisadoUsd Float @default(0)
  priceSesionUsd         Float @default(0)

  industryTags  Json    @default("[]")
  painPointTags Json    @default("[]")
  status        String  @default("proximamente")
  destacado     Boolean @default(false)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  codice               CodiceEntry[]
  consultas            Consulta[]
  especialistasReferidos EspecialistaInstall[]
}

// El Códice real de un Experto -- nunca se expone entero a nadie más
// que a la propia persona (regla dura 5). Solo entran acá preguntas que
// la persona misma aprobó a mano desde el inbox (ver (c)).
model CodiceEntry {
  id         String    @id @default(cuid())
  expertoId  String
  experto    Experto   @relation(fields: [expertoId], references: [id], onDelete: Cascade)
  pregunta   String
  respuesta  String
  aprobadaAt DateTime? // null = todavía en revisión, no se usa para responder de verdad
  createdAt  DateTime  @default(now())
}

// Cada intercambio con el Gemelo Digital de un Experto -- de acá salen
// tanto el conteo de las 3 preguntas gratis (visitorToken, sin
// registrar) como el inbox de "no supo responder" que ve la persona en
// su propia Oficina.
model Consulta {
  id           String    @id @default(cuid())
  expertoId    String
  experto      Experto   @relation(fields: [expertoId], references: [id], onDelete: Cascade)
  // Anónimo (las primeras 3 gratis, token de sesión/cookie) o ya
  // registrado -- nunca ambos.
  visitorToken String?
  memberId     String?
  member       Member?   @relation(fields: [memberId], references: [id])

  pregunta  String
  respuesta String?  // null = el Gemelo no supo responder -- entra al inbox
  nivel     String   @default("gemelo_solo") // "gemelo_solo" | "gemelo_revisado" | "sesion", ver (d)
  revisadaPorExpertoAt DateTime?
  createdAt DateTime @default(now())
}
```

### (b) Qué se reusa vs. qué es nuevo

**Se reusa tal cual:**
- `lib/wowApps.ts` -- `RUBROS`/`PAIN_POINTS` (los 2 selectores) y
  `matchWowApps` (el algoritmo de match) se generalizan para
  Especialistas y Expertos también, mismo patrón función pura + tests
  100% sin tocar Postgres.
- `components/WowAppsBlock.tsx` -- el patrón visual (grilla + bottom-
  sheet, cara "Qué es esto" primero) se clona para el bloque de
  Especialistas contratados en la Oficina, leyendo de
  `EspecialistaInstall` en vez de `WowAppInstall`.
- `components/OfficeSkillsBlock.tsx` -- precedente directo de "una
  herramienta adentro de un rol más grande", mismo criterio para cómo un
  Especialista muestra sus `toolKeys`.
- `components/FocusModeBlock.tsx` / `components/VoiceNotesBlock.tsx` --
  sin cambios en sí mismas: pasan a ser referenciadas como herramientas
  reales de un Especialista (ej. el Especialista "Enfoque" usa Modo Foco
  + Notas de Voz), no se reescriben.
- `lib/gemeloDigitalScript.ts` / `components/OfficeDemoChat.tsx` -- hoy
  es una demo simulada SOLO para el dueño de una Card. El patrón visual
  del chat (burbujas, el "Soy tu Gemelo Digital...") es lo que se reusa
  para el chat real de consulta a un Experto -- la lógica de respuesta
  en sí es nueva (Fase 5 construye la primera versión, siempre marcada
  simulada mientras no haya IA entrenada con un Códice real).

**Es nuevo:**
- Los 4 modelos de arriba (`Especialista`/`EspecialistaInstall`/
  `Experto`/`CodiceEntry`/`Consulta`).
- La máquina de estados de consentimiento + Bautizo (nada parecido
  existe hoy -- lo más cercano es `googleConnectedAt`/
  `googleRefreshToken` en `Member`, que es consentimiento para UNA
  integración, no para publicar un Gemelo Digital de la persona).
- La pantalla de inbox "preguntas que tu gemelo no supo responder" en la
  Oficina del propio Experto.
- El split de WowStore en 2 secciones (Especialistas/Expertos).
- El flow de referido con contratación en un toque.

### (c) Cambios de interfaz

1. **Sección de la Oficina renombrada.** Hoy el bloque de WowApps
   instaladas no tiene un título propio (confirmado en el código, sin
   kicker). Con Especialistas/Expertos adentro, necesita nombrarse como
   "tu equipo". Propuesta (a elegir, mismo criterio de la Fase 2 -- no
   lo cambio sin tu OK):
   - **"Tu Equipo"** (mi recomendación -- corto, y es literalmente lo
     que es: gente/agentes trabajando para vos).
   - "Tu Plantilla" (más formal/corporativo).
   - "Quién te ayuda" (más conversacional, menos "corporate").
2. **WowStore se divide en 2 secciones**: Especialistas y Expertos,
   cada una con su propio "Explorar" (mismo patrón de
   rubro+dolor de hoy). Las WowApps sueltas actuales (WowAwe, etc.) NO
   desaparecen de golpe -- se re-empaquetan como herramientas dentro de
   al menos un Especialista cada una, para no perder lo que ya funciona
   (WowAwe real).
3. **Card de un Experto**: botón "Consulta a mi gemelo digital" -- 3
   preguntas gratis sin registrarte (via `visitorToken`), a la cuarta
   pide registro real (mismo flujo de alta que ya existe para
   cualquiera que quiera ser Member).
4. **Oficina del propio Experto**: nueva sección, inbox de "preguntas
   que tu gemelo no supo responder" -- la persona las responde a mano, y
   puede aprobar cada una para que entre de verdad al Códice
   (`CodiceEntry.aprobadaAt`). Suma un resumen corto de consultas
   (cuántas, qué nivel, cuántas sin responder) -- sin inventar métricas
   que no salgan de `Consulta` real.
5. **Referido**: un Experto puede recomendar un Especialista dentro de
   su propia respuesta/perfil. Contratación en un toque
   (`EspecialistaInstall.referredByExpertoId` queda seteado solo). La
   comisión (si la hay) se paga por USO real del Especialista contratado
   -- nunca por el solo hecho de haber referido a alguien (regla
   explícita de Gunnar). Sin pasarela real todavía: el criterio es el
   mismo flag-manual honesto que ya usa `adaptationPaidAt`.

### (d) Niveles de consulta (precios placeholder, sin cobro real)

1. **Gemelo solo** -- responde el Gemelo Digital sin que la persona
   intervenga. El más barato, el más rápido.
2. **Gemelo con revisión de la persona** -- el Gemelo responde, pero la
   persona la revisa/ajusta antes de que llegue (o después, con
   seguimiento) -- nivel intermedio.
3. **Sesión con la persona** -- la consulta se convierte en un contacto
   real con el humano, no una respuesta de agente. El más caro, sin
   sustituto de agente ahí.

Los 3 campos `priceGemeloSoloUsd`/`priceGemeloRevisadoUsd`/
`priceSesionUsd` en `Experto` son placeholders que cada persona
completa a mano -- ningún número inventado por el sistema, mismo
criterio que `basePriceUsd` en `WowApp` hoy.

### (e) Explícitamente fuera de este MVP

- Cualquier IA real entrenada sobre un Códice -- la respuesta de un
  Experto sigue siendo simulada/guionada hasta que exista esa pieza,
  igual que el Gemelo Digital del dueño hoy.
- Pasarela de pago real para cualquiera de los 3 niveles de consulta o
  la comisión de referido -- mismo límite honesto que el resto de
  WowStore (`membershipPaidAt`, `adaptationPaidAt`).
- Verificación de identidad/credencial real para "profesión regulada"
  (`esProfesionRegulada`) -- por ahora es un flag que carga la propia
  persona o MasterN0 a mano, no una validación contra un colegio
  profesional real.
- Notificaciones push/email automáticas cuando llega una pregunta al
  inbox de un Experto -- se revisa entrando a la Oficina, como todo lo
  demás en LyCard hoy.
- Cualquier lógica real de "actua_solo" para un Especialista con
  `autonomyLevel` alto -- en este MVP ese campo existe en el modelo pero
  ningún Especialista real lo usa todavía (cáscara honesta, mismo
  criterio que `WowApp.status:"proximamente"`).

**Esperando tu OK para recién ahí arrancar la Fase 5** (un Especialista
de ejemplo, un Experto de ejemplo, y los E2E del flujo pregunta→
registro→inbox) -- sin tocar código hasta entonces.

## Ronda de endurecimiento (2026-09-30) -- Fase 5: MVP con datos de prueba -- Especialistas y Expertos

Con el OK de Gunnar al diseño de la Fase 4, se construyó el primer
ejemplo real de cada uno (datos de prueba, todo marcado como tal) más
el flujo de consulta de punta a punta, exactamente el modelo de datos
diseñado en esa fase, sin cambios de forma.

**Schema**: los 5 modelos nuevos (`Especialista`, `EspecialistaInstall`,
`Experto`, `CodiceEntry`, `Consulta`) tal como se diseñaron, migración
`20260930152135_especialistas_expertos`.

**`lib/especialistas.ts` / `lib/expertos.ts`** (nuevos, 100% cobertura
en el ratchet de `vitest.config.mts`): parsers, `canPublishExperto`
(las 3 condiciones de la regla dura de consentimiento+Bautizo juntas),
`shouldRequireRegistration` (las 3 preguntas gratis), y
`matchCodiceEntry` -- match determinístico por palabra compartida (4+
letras) contra entradas YA aprobadas del Códice, nunca un modelo en
vivo, mismo criterio que `gemeloDigitalScript.ts`.

**`/admin/wowstore`** (MasterN0-only) suma 2 secciones nuevas:
- **Especialistas**: botón "Sembrar ejemplo (Calma)" -- Especialista
  real con WowAwe + Modo Foco como `toolKeys` y una sugerencia de
  ejemplo fija. Instalarlo en una Card real es a mano, por slug (todavía
  no hay una vidriera pública de "explorar Especialistas" -- eso, y el
  split completo de WowStore en 2 secciones, queda para una fase
  futura, fuera del alcance de este MVP con un solo ejemplo).
- **Expertos**: botón "Sembrar ejemplo (Experto)" -- crea un Member +
  Card + perfil de Experto INVENTADOS, marcados "(ejemplo)" en su propio
  nombre, con consentimiento y Bautizo ya dados (para poder probar el
  flujo de consulta de punta a punta) y una entrada de Códice
  pre-aprobada. Botón para revocar el consentimiento a mano (deja de
  publicar de inmediato, `canPublishExperto` lo bloquea).

**`components/EspecialistasBlock.tsx`**: "Tu Equipo" en la Oficina
(mismo patrón visual que `WowAppsBlock.tsx`) -- grilla + bottom-sheet
con trabajo/descripción/herramientas (resueltas por
`labelForToolKey` -- WowApp real o Superpoder fijo) y la sugerencia,
siempre con el rótulo "Sugerencia de ejemplo (simulada)".

**`/experto/[key]`** (nuevo, página pública): "Gemelo digital de
[nombre]" -- nunca se presenta como la persona (regla dura 3). Banner
fijo de "orienta, no diagnostica" si `esProfesionRegulada`. Un
visitante sin sesión hace 3 preguntas gratis (cookie
`lycard_experto_visitor`, solo cuenta, no es una sesión real); a la
4ta, un botón lo manda a `/m/login`. Registrado (`memberId` real), sin
límite. Cada pregunta sin match en el Códice queda con
`respuesta:null` y el texto "todavía no supo responder esto".

**Inbox del Experto** (`components/ExpertoInboxBlock.tsx`, en la propia
Oficina del dueño del perfil, gateado a que esa Card sea la de ese
Member): lista las `Consulta` con `respuesta:null`, las responde a
mano, y un checkbox "sumar a mi Códice" crea la `CodiceEntry` real
(`experto-actions.ts#answerConsultaAction`, verifica que quien contesta
sea el dueño real o MasterN0 antes de nada).

**Verificado**: `e2e/especialistas-expertos.spec.ts` (nuevo) -- (1) el
Especialista instalado se ve en "Tu Equipo" con la sugerencia marcada
simulada, y (2) el flujo completo: un visitante anónimo le pregunta al
Experto de ejemplo (sin match, queda pendiente), un Member registrado
pregunta de nuevo, el Experto entra a su propia Oficina y ve ambas en
el inbox, responde y aprueba una -- confirmado que la `CodiceEntry`
real se crea en DB. 37/39 E2E de la suite completa (los 2 que no
pasaron: `interview-slots.spec.ts` por fechas vencidas, ya documentado
en la Fase 1 -- no es de esta ronda; `wowstore.spec.ts` fue un timeout
de red bajo carga corriendo la suite entera, confirmado como flake al
correrlo solo, pasa limpio). 237/237 unit, 100% coverage, tsc/lint/build
limpios.

Shippeado como v1.60.0.

## Ronda de endurecimiento (2026-10-01) -- Fase 6: DISEÑO -- WowHead, el HeadHunter de Agentes

**Solo diseño, cero código en esta fase.** Pedido directo de Gunnar,
más profundo que un cambio de nombre: la Oficina Virtual deja de
mostrar WowApps sueltas y pasa a tener una pantalla completa propia,
el **WowHead**, donde el cliente recluta **Agentes** para su equipo.

### El giro, en una frase

WowStore (vidriera de apps) se retira DE LA OFICINA -- su código, su
modelo de datos y `/admin/wowstore` quedan intactos, nada se borra,
se recicla después -- y en su lugar nace WowHead: un HeadHunter donde
se reclutan Agentes, no se instalan apps.

### Los dos ejes (no son el mismo eje, error que cometí en la primera
### pasada del diseño y Gunnar corrigió en el momento)

**Eje 1 -- Origen del Agente** (de dónde viene):
- **Legacy** -- persona real que completó su propio proceso de Legacy.
  Es el modelo `Experto` que ya existe desde la Fase 5 (memberId,
  consentimiento, Bautizo) -- esa pieza NO cambia de forma, solo se le
  suman campos nuevos abajo.
- **Silicio** -- IA pura, con un perfil específico. Es el modelo
  `Especialista` que ya existe desde la Fase 5 (toolKeys, trabajo,
  descripción) -- tampoco cambia de forma, solo suma CV/reputación.

**Eje 2 -- Rango** (conocimiento y estructura de equipo) -- **solo
aplica a Legacy, nunca a Silicio** (regla dura, confirmada por
Gunnar: "el experto solo puede ser humano y haber terminado su
proceso completo de legacy"):
- **Especialista** -- el default de TODO Legacy publicado. Trabaja
  solo, o se apoya en agentes Silicio como herramienta.
- **Experto** -- un Legacy que armó su propio equipo: otros Legacy
  (especialistas) reclutados por él. El ascenso de Especialista a
  Experto **nunca es automático** -- lo aprueba MasterN0 a mano, mismo
  criterio que la regla dura de la Fase 1 (nadie se auto-otorga más
  alcance del que tiene).

### (a) Modelo de datos propuesto

**Sobre `Experto` (ya existe, Fase 5) -- se le suman estos campos:**

```prisma
model Experto {
  // ...todo lo que ya existe (memberId, consentimiento, Bautizo, etc.)
  // no se toca...

  // Rango (Fase 6) -- el ascenso a "experto" es manual, aprobado por
  // MasterN0, nunca automático aunque el Legacy arme un equipo.
  rango             String    @default("especialista") // "especialista" | "experto"
  promovidoAExpertoAt DateTime?
  promovidoPorAdminId String?  // id del Admin (MasterN0) que aprobó el ascenso

  // CV real (Fase 6) -- lo carga la propia persona o MasterN0, nunca
  // texto inventado por el sistema.
  experiencia   Json @default("[]") // [{ rol, periodo, descripcion }]
  especialidades Json @default("[]") // string[] -- tags tipo "Nutrición deportiva"

  // Reputación -- simulada hasta que exista un sistema de reviews real
  // (mismo criterio que el rating de WowApp en Explorar, Fase W-algo:
  // "siempre marcado (simulado)"), cargada a mano por ahora.
  calificacionPromedio Float @default(0)
  calificacionCantidad Int   @default(0)

  // Equipo -- un Experto recluta a otros Legacy (rango "especialista")
  // a su propio equipo. Null = no pertenece al equipo de nadie.
  recruitedById String?
  recruitedBy   Experto?  @relation("EquipoDeExperto", fields: [recruitedById], references: [id])
  equipo        Experto[] @relation("EquipoDeExperto")

  invitacionesEnviadas  EquipoInvitacion[] @relation("InvitacionesEnviadas")
  invitacionRecibida    EquipoInvitacion[] @relation("InvitacionesRecibidas")
}
```

**Nuevo -- la invitación con aceptación obligatoria** (confirmado por
Gunnar: "el experto debe aceptar" -- nadie entra al equipo de otro sin
su OK, mismo criterio de consentimiento que gobierna todo lo demás en
Legacy/Experto):

```prisma
model EquipoInvitacion {
  id             String   @id @default(cuid())
  expertoId      String   // quién recluta
  experto        Experto  @relation("InvitacionesEnviadas", fields: [expertoId], references: [id])
  especialistaId String   // a quién invita (otro Legacy, rango "especialista")
  especialista   Experto  @relation("InvitacionesRecibidas", fields: [especialistaId], references: [id])
  estado         String   @default("pendiente") // "pendiente" | "aceptada" | "rechazada"
  createdAt      DateTime @default(now())
  respondidaAt   DateTime?

  @@unique([expertoId, especialistaId])
}
```

Al aceptar (`estado:"aceptada"`): se setea
`especialista.recruitedById = expertoId` en la misma transacción --
de ahí sale el organigrama, sin tener que recalcular nada.

**Sobre `Especialista`** (Silicio, Fase 5) -- mismos 2 campos de CV/
reputación que Experto, sin rango (un Silicio es siempre, por
definición, "especialista" -- nunca tiene equipo propio):

```prisma
model Especialista {
  // ...todo lo que ya existe (toolKeys, trabajo, descripción, etc.)...
  habilidades           Json  @default("[]") // string[] -- tags de CV
  calificacionPromedio  Float @default(0)
  calificacionCantidad  Int   @default(0)
}
```

### (b) Qué se reusa vs. qué es nuevo

**Se reusa tal cual:**
- `Experto`/`Especialista`/`CodiceEntry`/`Consulta`/`EspecialistaInstall`
  (Fase 5) -- siguen siendo exactamente el motor de "contratar a un
  Agente para tu propio negocio". WowHead los expone con una cara
  nueva, no los reconstruye.
- `lib/wowApps.ts` (RUBROS/PAIN_POINTS, el vocabulario de los 2
  selectores) -- se reusa para filtrar Agentes también.
- **`lib/mallaReal.ts`/`components/MallaGraph.tsx`/`MallaExplorer.tsx`**
  -- EXACTAMENTE el pedido original de Gunnar ("el cerebromalla
  alineado a reclutar agentes"): el organigrama de un Experto (su
  propio equipo reclutado) se construye con una función nueva,
  `buildEquipoMallaGraph(expertoRoot, equipo)`, mismo shape
  `MallaGraphData` que ya usan `buildRootMallaGraph`/
  `buildMemberFractalGraph` -- el árbol no es "quién refirió a quién"
  sino "quién reclutó a quién", pero el componente visual que lo
  dibuja es el mismo, sin tocarlo.
- `app/admin/wowstore/*` (CRUD de WowApp/Especialista/Experto) --
  sigue siendo el catálogo real, se le cambia el rótulo visible a
  "WowHead" en la cabecera de la pantalla, la ruta queda igual
  (`/admin/wowstore`, herramienta interna de MasterN0 -- nadie de
  afuera ve esa URL, no vale la pena el riesgo de romper un bookmark
  tuyo por una cosmética).

**Es nuevo:**
- Los campos de arriba en `Experto`/`Especialista` + el modelo
  `EquipoInvitacion`.
- `promoverAExpertoAction` (MasterN0-only, desde `/admin/wowstore`) --
  el único lugar del código que puede poner `rango:"experto"`.
- `app/m/wowhead/` (nuevo, reemplaza la entrada pública que hoy tiene
  `/m/wowstore`) -- la pantalla completa donde un cliente explora y
  recluta Agentes para su propia Card. Mismo query param `cardId` que
  ya usa `/m/wowstore` hoy.
- `app/c/[slug]/oficina/mi-equipo/` (nuevo) -- solo visible si
  `isHost && expertoPerfil?.rango === "experto"`: panel del propio
  Experto para ver su organigrama, invitar nuevos especialistas a su
  equipo, y ver el estado de sus invitaciones enviadas.
- `enviarInvitacionEquipoAction`/`responderInvitacionEquipoAction` --
  el flujo de invitar + aceptar/rechazar.

### (c) Cambios de interfaz

1. **La Oficina deja de mostrar WowApps sueltas.** En
   `app/c/[slug]/oficina/page.tsx`, tanto `OwnerOficina` como
   `VisitorOficina` dejan de renderizar `WowAppsBlock` y
   `EspecialistasBlock` (el bloque "Tu Equipo" de la Fase 5). En su
   lugar, un único tile/botón "WowHead" que linkea a
   `/m/wowhead?cardId=...` -- mismo lugar físico donde hoy vive el
   tile "+ WowStore".
2. **`/m/wowhead`** -- pantalla completa (el mockup que ya viste,
   `https://claude.ai/artifact/HKUPNSBwFLWt69JHB5mwDS`): filtro
   Todos/Legacy/Silicio, "tu equipo" ya contratado arriba, cards de
   Agentes con badge de origen+rango ("Legacy · Experto", "Legacy ·
   Especialista", "Silicio"), estrellas + CV resumido.
3. **Perfil de Agente** -- CV completo (experiencia, especialidades),
   reseñas (marcadas simulado), botón de consulta/contratación, y
   -- solo si es un Experto -- la sección "Su equipo" con el
   organigrama de sus especialistas reclutados.
4. **`/c/[slug]/oficina/mi-equipo`** (solo el propio Experto) -- su
   organigrama real (vía `buildEquipoMallaGraph`), un buscador simple
   para invitar a otro Legacy publicado, y la lista de invitaciones
   pendientes/aceptadas/rechazadas.
5. **El Legacy invitado** ve la invitación pendiente en algún punto de
   su propia Oficina (a definir el lugar exacto en Fase 7 -- lo más
   simple es sumarla como un ítem más en la misma pantalla
   `mi-equipo`, visible para CUALQUIER Legacy publicado, no solo
   Expertos: si tiene invitaciones recibidas pendientes, las ve y
   responde ahí mismo).

### (d) Los dos flujos de reclutamiento (no son el mismo)

1. **Cliente recluta un Agente** (WowHead) -- para SU propio negocio.
   Contratar a un Experto no te trae a su equipo de regalo: ves su
   organigrama en el perfil, pero cada especialista de ese equipo se
   contrata aparte si querés, por su cuenta.
2. **Un Experto recluta a sus propios especialistas** (`mi-equipo`) --
   acción del Experto sobre otros Legacy, para armar SU equipo. Pasa
   por invitación + aceptación explícita del invitado, nunca
   unilateral.

### (e) Explícitamente fuera de este MVP

- Sistema de reviews real -- `calificacionPromedio`/`calificacionCantidad`
  siguen siendo campos cargados a mano, marcados simulado en la UI,
  mismo límite honesto que el rating de WowApp hoy.
- Que un Experto pueda reclutar Silicio a su equipo -- por ahora el
  equipo de un Experto es solo otros Legacy (lo que pidió Gunnar
  explícitamente); un Silicio sigue siendo una herramienta que un
  Especialista/Experto USA, nunca un miembro de su organigrama.
- Comisión/pago por reclutar (ni para WowHead ni para `mi-equipo`) --
  mismo límite de siempre, sin pasarela real todavía.
- Borrar o tocar el código de WowApp/WowStore -- se queda exactamente
  como está, solo deja de ser lo primero que ve un cliente en su
  Oficina.

**Esperando tu OK para recién ahí arrancar la construcción** (schema +
las pantallas) -- sin tocar código hasta entonces.

## Ronda de endurecimiento (2026-10-01) -- Fase 6: MVP -- WowHead construido (v1.61.0)

Confirmado "dale, armalo" -- esto es lo que se shippeó, de punta a
punta, verificado con E2E real (no solo en el navegador a mano).

### (a) Schema (migración `20261001120451_wowhead_rango_equipo`)

- `Experto.rango` ("especialista" | "experto", default "especialista")
  + `promovidoAExpertoAt`/`promovidoPorAdminId` (auditoría del ascenso).
- `Experto.experiencia`/`especialidades` (CV, Json) -- `Especialista.habilidades` (Json) análogo para Silicio.
- Self-relation `Experto.recruitedById`/`equipo` -- el equipo propio de un Experto.
- Nuevo modelo `EquipoInvitacion` (expertoId, especialistaId, estado "pendiente"|"aceptada"|"rechazada") -- el invitado SIEMPRE tiene que aceptar, nunca se setea `recruitedById` sin esa aceptación explícita.

### (b) `/admin/wowstore` (ahora rotulado "WowHead")

- `promoverAExpertoAction` (MasterN0-only) -- el único camino para que un Especialista pase a Experto, nunca automático.
- El seed de ejemplo ("Sembrar ejemplo (Experto)") ahora arma un Experto YA ascendido con 3 especialistas de ejemplo reclutados en su equipo, más CV de ejemplo (experiencia/especialidades) -- para que Gunnar vea el flujo completo poblado con un click, sin tener que armarlo a mano.

### (c) `/m/wowhead` -- el HeadHunter

- Browse con filtro por tipo (Todos / Legacy / Silicio), mezclando `Especialista` (Silicio) y `Experto` publicado (Legacy) en una sola grilla con rating simulado (reusa `simulatedRating`/`simulatedReviewCount` de `lib/wowApps.ts` -- no se sumaron columnas nuevas de rating, ya existía la pieza).
- `/m/wowhead/silicio/[key]`: perfil con CV, herramientas, habilidades, y "Contratar" self-service real (`contratarSilicioAction`, crea el `EspecialistaInstall`).
- `/m/wowhead/legacy/[key]`: perfil con CV, link a consultar al Gemelo Digital (reusa la pantalla pública de Fase 5 sin tocarla), y -- si es rango "experto" -- su equipo reclutado en tarjetas clicables.

### (d) `/c/[slug]/oficina/mi-equipo` -- el propio equipo de un Experto

- Invitaciones recibidas (cualquier Legacy publicado, sea o no Experto) con Aceptar/Rechazar.
- Si es rango "experto": organigrama real de su equipo -- reusa `buildMemberFractalGraph` (`lib/mallaReal.ts`, ya existía, no se escribió una función nueva) + el componente `MallaGraph` de siempre, no una visualización aparte. Formulario para invitar por clave, lista de invitaciones enviadas con su estado.

### (e) Oficina Virtual: WowStore/Especialistas se retiran, no se borran

- `WowAppsBlock`/`EspecialistasBlock` dejan de renderizarse en `/c/[slug]/oficina` -- reemplazados por un único tile "WowHead". Todo el código/modelo de WowApp sigue intacto, reciclable a futuro.
- **Excepción deliberada**: WowAwe (la única WowApp con lógica real conectada, no una cáscara) sigue teniendo su propia fila de acordeón ("Caminata de Asombro") en la Oficina -- Gunnar pidió ocultar el marketplace/placeholders, no romper algo que ya funciona de verdad y usa.

### (f) Verificación

`npx tsc --noEmit` limpio, `pnpm lint` sin errores nuevos, `pnpm test:unit:coverage` 250/250 con 100% de cobertura, `pnpm build` limpio con las 4 rutas nuevas, y `e2e/wowhead.spec.ts` (3 tests, flujo completo: ascenso, explorar+filtrar+contratar Silicio, reclutar+aceptar+organigrama) + la suite completa (41 specs, 40 passed -- el único fallo es el drift de fechas ya conocido de `interview-slots.spec.ts`, no relacionado). Se actualizaron además 3 specs de fases previas (`especialistas-expertos.spec.ts`, `wowawe.spec.ts`, `wowstore.spec.ts`) cuyas aserciones apuntaban a la UI vieja de la Oficina que esta fase retiró a propósito.

### (g) Pendiente para Gunnar, en producción

Igual que con Fase 5: el seed de ejemplo hay que tocarlo A MANO desde
la sesión real de producción (`/admin/wowstore` → "Sembrar ejemplo
(Experto)" / "Sembrar ejemplo (Calma)") -- este ambiente de desarrollo
nunca escribe en la base de datos real.

## 2026-10-02 -- 4 fixes reales + rediseño del arranque de la Oficina Virtual (v1.62.0)

Reportado por Gunnar sobre el mockup aprobado de Oficina Virtual
(https://claude.ai/artifact/9Ud1qY714sABZuCyks8z61). Diagnóstico de cada
bug confirmado con capturas reales (Playwright a 390x844, iPhone 13),
nunca a ojo.

### (a) Logo del Programa recortado

`officeLogoUrl` (LyCardView.tsx), `agentLogoUrl` (AgentButton,
oficina/page.tsx) y el preview de `/admin/programs/[id]` usaban
`objectFit:"cover"` contra un círculo -- un logo rectangular/wordmark
perdía los bordes. Los 3 pasan a `"contain"` con un poco de aire
interno: el logo completo siempre se ve, nunca se corta. (El
multiplicador de tamaño del logo YA existe -- "Ajustar tamaños",
long-press en la tarjeta, `lib/cardSizeConfig.ts` -- Gunnar puede
usarlo hoy; no hacía falta construir nada para eso.)

### (b) Menú superior del Dashboard tapado por el notch/isla dinámica

`MemberCardEditor.tsx` (afecta `/m/dashboard/project`, `/company`,
`/personal`), `app/m/dashboard/page.tsx`, `/messages`, y el sticky
header de `/company/network` -- ninguno compensaba
`env(safe-area-inset-top)`. En un iPhone con notch, el "← Mi cuenta"
quedaba literalmente debajo del hardware, intocable. Mismo patrón que
ya usa Oficina Virtual, aplicado a los 5.

### (c) Hueco vacío abajo de la tarjeta en iPhone 13

Confirmado con captura real: el tope de altura de la foto (fix del
2026-09-29, evita que el hueco parta el medio de la tarjeta) dejaba el
sobrante vacío DESPUÉS del botón "Agendar". Siendo el último elemento
de la columna, `marginTop:"auto"` en su wrapper absorbe ese sobrante
empujando el botón al borde real de abajo -- verificado con captura
antes/después, el CTA principal queda siempre anclado ahí.

### (d) Oficina Virtual: 6 KPIs + fila de 3 accesos

`CheckDeRealidadBlock` subía de 3 a 6 KPIs -- el único tope era un
`.slice(0,3)` hardcodeado, el editor (`OficinaExtrasEditor.tsx`) nunca
tuvo límite. Los primeros 3 muestran su sparkline de siempre; los
otros 3 son el mismo shape (`RealityCheckKpi`) con un solo punto de
trend, así que salen como cifra/comparativa plana sin gráfico (ej.
"Metas del mes: 3/10") -- no fue necesario un tipo de KPI nuevo.

Los KPIs pasan a verse ANTES de los accesos principales (antes
quedaban más abajo). Nueva `TripleAccessRow`: Gemelo Digital como
esfera central (mismo `agentLogoUrl` real de AgentButton, ahora
`contain`) + WowHead y BirdBrain como cajas a los lados -- fusiona el
viejo botón horizontal "Tu Gemelo Digital" y el viejo tile de WowHead
en un solo bloque. **BirdBrain queda "Próximamente" (deshabilitado)**
-- Gunnar lo mencionó sin explicar qué es; se le preguntó en vez de
inventarle un destino, pendiente su respuesta.

### (e) Pendiente, sin construir esta ronda

- El chip "MasterN0 · Rango · Estatus" en el encabezado (pedido en la
  ronda anterior de feedback) -- Gunnar nunca confirmó el texto exacto
  ("Fundador" era un placeholder mío), sigue sin tocarse.
- El bloque CRM (Mirón → Vividor → Chido → Chido+) pedido para
  después de los 3 accesos -- genuinamente ambiguo cómo mapea a los
  datos reales que ya existen (`CardLead`/Seguimiento,
  `CardNetworkMembership`, `ProgramMembership.membershipPaidAt`,
  `lib/programPromotion.ts`) sobre todo porque "Chido"/"Chido+" hoy
  solo tienen sentido para Cards `project` (el funnel de reclutamiento
  del propio Programa), no para `company`/`personal`. Se le pidió a
  Gunnar que confirme el mapeo antes de construir nada, para no tener
  que rehacerlo.
- BirdBrain -- ver (d).

### Verificación

`npx tsc --noEmit` limpio, `pnpm lint` sin errores nuevos,
`pnpm test:unit:coverage` 250/250 al 100%, `pnpm build` limpio, y la
suite E2E completa: 41 specs, 40 passed (el único fallo es el drift de
fechas ya conocido de `interview-slots.spec.ts`, sin relación).

## 2026-10-02 -- Tarjeta personalizada para Rogelio, PASO 1: link con destinatario (v1.63.0)

Fase de diseño, 7 pasos, pedido explícito de Gunnar -- reporte y
confirmación después de cada paso, nunca todos de un saque. Este es
el primero.

### Modelo nuevo: `CardRecipient`

Un overlay por persona sobre una Card ya existente (nunca una copia de
la Card) -- `cardId` + `slug` único por Card (no global, dos Cards
distintas pueden tener cada una su "rogelio") + `nombre`. Todo lo que
varía por destinatario en los próximos 6 pasos (palabra secreta, link
del cuaderno, Documento de Bienvenida, programa de entrevista elegido,
etc.) se suma como campos de este mismo modelo -- un destinatario, un
registro, nunca una Card nueva por persona.

### `/c/[slug]?para=<destinatario>`

`app/c/[slug]/page.tsx` resuelve el `CardRecipient` (si existe) y se
lo pasa a `LyCardView`, que muestra el mensaje de bienvenida arriba de
todo, antes del retrato. Sin `?para=` o con un slug que no matchea
ningún destinatario, `recipient` es `null` y la tarjeta se ve
exactamente igual que siempre -- cero cambio de comportamiento para
cualquier link que ya existe.

### CRUD real desde el editor (`/admin/<slug>`)

Nueva sección "Destinatarios" en `EditorForm.tsx` -- crear/eliminar,
el slug de la URL sale solo del nombre (`lib/slug.ts`, ya existía,
reusado). **Hallazgo real armando esto**: la puse primero ADENTRO del
`<form>` grande de la página -- un `<form>` anidado dentro de otro se
rompe en el parser HTML real (el navegador descarta el interno al
primer parseo del lado del servidor), así que el submit terminaba
yendo al form de afuera (`updateCardAction`) en vez del propio, sin
error visible, simplemente no pasaba nada. La saqué afuera del form
grande, mismo patrón que ya usan "Business y Personal" y "Eliminar
esta LyCard" más abajo en el mismo archivo -- confirmado con
Playwright real (crear "Rogelio", verificar la fila en la base, after
visitar `/c/mastern0?para=rogelio` y ver el mensaje), no a ojo.

### Verificación

`npx tsc --noEmit` limpio, `pnpm lint` sin errores nuevos,
`pnpm test:unit:coverage` 250/250 al 100%, `pnpm build` limpio, y
captura real de `/c/mastern0?para=rogelio` (con bienvenida) vs
`/c/mastern0` (sin cambios) confirmando el comportamiento exacto
pedido.

### Pendiente

Pasos 2-7 (redes del Programa, botón "Programa Legacy", botón "Info
[nombre]" con palabra secreta, "Deja tu Legado", funnel de Agendar,
QR + E2E completo) -- cada uno con su propio reporte antes de seguir
al siguiente, por pedido explícito de Gunnar.

## 2026-10-02 -- Destinatarios: acceso directo + dossier de fuentes (v1.64.0)

Pedido de Gunnar: "una forma directa de ingresar a las tarjetas
dirigidas a destinatarios en concreto", y que "Enviar Invitación" sea
el lugar donde se crea un destinatario, se le suma información
(links, archivos, notas -- "cualquier cosa") y se ve el listado de los
ya creados -- esa información es la que después arma el NotebookLM de
cada destinatario (PASO 4 del pedido original).

### Modelo nuevo: `CardRecipientSource`

Un destinatario (`CardRecipient`, del Paso 1) ahora tiene `sources
CardRecipientSource[]` -- cada fuente es `type` ("link" | "archivo" |
"texto"), `label` (qué es) y `value` (la URL/contenido, un solo campo
porque según el tipo solo uno tiene sentido). `lib/storage.ts` suma un
tercer `kind: "document"` a `saveUpload` (antes solo "image"/"audio"),
con una lista de extensiones más permisiva -- "cualquier cosa" que
suba Gunnar como fuente.

### "Enviar Invitación" rediseñado

El viejo formulario de un solo campo de email (nunca llegó a usarse
de verdad -- `RESEND_API_KEY` sigue sin configurar) se reemplaza
entero por el panel de Destinatarios, 100% dentro de LyCardView.tsx
(client component, sin `<form>`, mismo patrón que ya usaba
`sendInvitationAction` -- llamadas directas a server actions nuevas
en `app/c/recipient-actions.ts`, carga perezosa al abrir el modal):

- Lista de destinatarios ya creados, cada uno con un botón **Abrir**
  que lleva directo a `/c/[slug]?para=[slug]` -- el acceso directo
  pedido.
- Crear un destinatario nuevo (nombre -- el slug sale solo).
- Por destinatario: agregar fuentes -- selector Link/Archivo/Texto,
  label opcional, y el input que corresponda (URL, selector de
  archivo, o textarea). Cada fuente agregada se ve en una lista chica
  con su ícono de tipo y un botón para borrarla.

### Hallazgo real armando esto

El Prisma Client del dev server quedó desactualizado después de
migrar (`prisma generate` regenera el código pero un proceso de Node
ya arrancado sigue con el módulo viejo en memoria) -- síntoma: `Unknown
field \`sources\`` y después `Cannot read properties of undefined
(reading 'create')`. Se resuelve reiniciando el dev server después de
cada `prisma generate`, no alcanza con solo regenerar.

### Verificación

`npx tsc --noEmit` limpio, `pnpm lint` sin errores nuevos,
`pnpm test:unit:coverage` 250/250 al 100%, `pnpm build` limpio, y
flujo real de punta a punta con Playwright: crear "Rogelio" desde
"Enviar Invitación", agregarle 3 fuentes (link, texto, y un archivo
subido de verdad -- confirmado en `public/uploads/` y en la base),
tocar "Abrir" y confirmar que aterriza en `/c/mastern0?para=rogelio`
con el mensaje de bienvenida.

## 2026-10-02 -- Tarjeta Rogelio PASO 4: botón "Info [nombre]" con palabra secreta (v1.65.0)

Siguiente paso del pedido original de 7 pasos -- Gunnar confirmó Paso
1 y pidió saltar Pasos 2-3 e ir directo al 4: el botón "Info Legacy"
se renombra a "Info [nombre]" y cambia de contenido por completo
cuando hay destinatario, se abre con una palabra secreta definida por
destinatario, y adentro va el dossier de "qué información usamos" +
cómo la usamos + metodología + PDF de ejemplo + "Abrir mi cuaderno" +
"tu información es tuya" + "Crear mi Gemelo Digital".

### Schema

`CardRecipient` suma dos campos (migración
`20261002184900_card_recipient_secret_cuaderno`): `palabraSecreta`
(vacío = sin gate, el botón abre directo -- "placeholder" hasta que
Gunnar le ponga una) y `cuadernoUrl` (vacío = el botón "Abrir mi
cuaderno" no aparece). Ambos editables por destinatario desde el
mismo panel de Destinatarios ("Enviar Invitación"), guardado al salir
del campo.

### El botón y su modal, solo con destinatario

En `components/LyCardView.tsx`, el cubo que siempre abrió "info"
ahora, con destinatario, se renombra a "Info [nombre]" y el bloque
`modal === "info" && recipient` reemplaza por completo al contenido
de siempre -- el original (`modal === "info" && isProject`, video +
3 indicadores) queda intacto, se sigue mostrando igual que siempre
cuando NO hay destinatario (confirmado con Playwright: "Info Legacy"
sin cambios).

Con destinatario, primero el gate (si `palabraSecreta` no está
vacía): un input, comparación insensible a mayúsculas, error si no
coincide. Destrabado (o directo si no hay palabra cargada), el
contenido en el orden pedido:
1. Qué información usamos -- la lista real de fuentes de ese
   destinatario (del dossier del Paso de Destinatarios).
2. Cómo la usamos -- texto marcado `[PLACEHOLDER]`, Gunnar no pasó el
   texto real todavía.
3. Nuestra metodología -- el texto exacto que pasó Gunnar, sin
   cambios.
4. PDF de ejemplo -- `public/docs/codice-ejemplo.pdf`, generado con
   reportlab, con la estructura exacta de 6 puntos pedida y marcado
   "EJEMPLO" visiblemente; descargable/visible desde el modal.
5. "Abrir mi cuaderno" -- solo si `cuadernoUrl` está cargado.
6. "Tu información es tuya" -- texto exacto de Gunnar, más un link a
   WhatsApp pidiendo el borrado (solo si la Card tiene WhatsApp
   cargado -- mastern0 no lo tiene todavía en el ambiente local, así
   que ese botón no se ve ahí hasta que lo cargue).
7. "Crear mi Gemelo Digital" -- lleva a `/onboarding`, página nueva y
   fija con "Tu onboarding está en preparación".

### Verificación

`npx tsc --noEmit` limpio, `pnpm lint` sin errores nuevos,
`pnpm test:unit:coverage` 250/250 al 100%, `pnpm build` limpio
(incluye la ruta nueva `/onboarding`). Playwright real de punta a
punta contra la base local: con `palabraSecreta="mayan2066"` cargada
a mano en el destinatario Rogelio, el gate rechaza una palabra
incorrecta, acepta la correcta, muestra las 3 fuentes reales de
Rogelio, la metodología completa, el link al PDF, el botón de
cuaderno (con el `cuadernoUrl` de prueba), y el botón final navega a
`/onboarding` y lo muestra. Un segundo test confirma que sin
destinatario "Info Legacy" sigue exactamente igual (el gate y el
contenido nuevo no aparecen). Un tercer test edita la palabra secreta
desde el panel de Destinatarios y confirma que se guarda de verdad en
la base (server action real, no mock). Capturas en
`/tmp/paso4-gate.png`, `/tmp/paso4-contenido.png`,
`/tmp/paso4-contenido-final.png`, `/tmp/paso4-onboarding.png`.

### Pendiente

Pasos 2, 3, 5, 6 y 7 -- cada uno con su propio reporte antes de
seguir, por pedido explícito de Gunnar. Nota para producción: este
ambiente usa una base local de prueba, separada de la real -- la
palabra secreta/cuaderno de prueba de Rogelio (`mayan2066` /
`https://notion.so/ejemplo-cuaderno-rogelio`) solo existe acá, no en
producción. Para probarlo en prod, Gunnar tiene que cargar su propia
palabra secreta (o dejarla vacía para que el botón abra directo) y su
link de cuaderno desde el panel de Destinatarios de su tarjeta real.

## 2026-10-02 -- Tarjeta Rogelio PASO 5: "Deja tu Legado" (Documento de Bienvenida) (v1.66.0)

Gunnar confirmó que el PASO 4 ya funciona ("vi que ya sale el modal de
Info de Rogelio") y pidió seguir. Entre PASO 2/3/5/6 eligió el 5: el
botón de siempre pasa a ser "Deja tu Legado" y abre el Documento de
Bienvenida de Legacy, personalizado con el nombre del destinatario.

### La fuente real

El pedido original decía "el modelo es el de Rafael Rico" sin pasar el
documento -- no estaba en ningún lado de este repo (ni PLAN.md ni
WHITEPAPER.md lo tienen completo). Pregunté y Gunnar pasó el link de
Drive del PDF real (`LEGACY_BIENVENIDA_RAFAEL_RICO.pdf`, edición agosto
2026). Lo leí entero con el conector de Google Drive antes de escribir
una sola línea -- nada de esto se inventó a ciegas.

### Qué queda fijo y qué queda [PLACEHOLDER]

El documento real tiene 7 capítulos + carta de apertura + "antes de
empezar". De esos, el contenido se separa en dos grupos:

- **Fijo, igual para cualquier destinatario** (boilerplate del
  programa, no depende de la persona): Capítulo I (¿Qué es EinarOS? --
  los 4 dominios Carbono/Silicio/Bridge/Horus Eye), Capítulo II (El
  programa Legacy -- Preserva/Transmite/Multiplica), Capítulo III (El
  Códice -- las 5 capas), Capítulo IV (El camino de 4 semanas),
  Capítulo VII (Sus datos, sus reglas) y "Antes de empezar" -- todos
  calcados casi palabra por palabra del original, solo sacándoles las
  referencias puntuales de Rafael (su trasfondo bíblico, "Mayordomo
  4.0", "iglesias y ministerios") para que sirvan para cualquier
  persona sin sonar mal encajados.
- **[PLACEHOLDER], específico de cada destinatario**: la Carta de
  Apertura (los 2 primeros párrafos, los que hablan de la trayectoria
  puntual de Rafael en el original -- los últimos 4 ya eran genéricos y
  quedan fijos), las primeras 3 sesiones del Capítulo V (Origen,
  Doctrina, Método -- en el original hablan literal de investigación
  bíblica y de "Mayordomo 4.0"; las sesiones 4 y 5, Activos y
  Proyección, ya eran genéricas en el original y quedan fijas), y un
  párrafo del Capítulo VI sobre qué necesita el negocio puntual del
  destinatario para operar.

Cada placeholder lleva el nombre del destinatario interpolado donde
corresponde (ej. "La trayectoria de Rogelio...") para que sea obvio
qué hay que reemplazar y por quién, no un placeholder genérico suelto.

### Hallazgo real armando esto (fix de seguridad, no pedido explícito)

Al reescribir la rama del tercer cubo para meter "Deja tu Legado" con
destinatario, encontré que el panel de Destinatarios (Thread C,
v1.64.0) quedó sin `isHost`-gatear desde que se construyó -- cualquier
visitante anónimo de la tarjeta (sin ser el dueño, sin link de
destinatario) podía abrirlo y ver/borrar la lista completa de
destinatarios y sus dossiers. Como estaba tocando exactamente esa rama
para el pedido de Gunnar, lo cerré de paso: ahora `isHost` ve
Destinatarios, un visitante sin destinatario ni sesión de dueño ve el
mensaje de contacto de siempre (reusa el modal `contactMessage` ya
construido, cero UI nueva), y con destinatario ve "Deja tu Legado".
Documentado acá para que quede trazable -- no es scope creep silencioso,
es una corrección real que surgió tocando este código.

### Verificación

`npx tsc --noEmit` limpio, `pnpm lint` sin errores nuevos,
`pnpm test:unit:coverage` 250/250 al 100%, `pnpm build` limpio.
Playwright real contra `/c/mastern0?para=rogelio`: el botón "Deja tu
Legado" abre el documento completo, con el nombre de Rogelio
interpolado en la portada, la carta, el rol de dirección del Capítulo
VI y el cierre; confirmé visualmente cada capítulo con capturas reales
(portada+carta, Capítulo II, Capítulo V con las 3 sesiones
placeholder, Capítulo VI con "Dirección -- Rogelio", Capítulo VII, y
el cierre "Edición Rogelio"). Un segundo test confirma que sin
destinatario el botón "Deja tu Legado" no existe y el dueño sigue
viendo "Enviar Invitación" como siempre.

## 2026-10-02 -- Tarjeta Rogelio PASO 6: funnel de Agendar (v1.67.0)

Último paso elegido por Gunnar ("paso 6"): el botón "Agendar una
entrevista", con destinatario, deja de abrir el slot-picker de siempre
y abre un funnel propio que, en un solo paso, le crea su tarjeta
oficial de LyCard Y le agenda su entrevista inicial -- pedido textual:
reusar el registro automático y el sistema de entrevistas que ya
existen, nada de MayanCity ni billeteras blockchain.

### Hallazgo real bloqueante: "Agendar tu Entrevista" estaba roto en producción

Antes de poder construir nada de esto, confirmé contra la base que
`lib/interviewSlots.ts` -- los 4 horarios fijos de "Agendar tu
Entrevista" -- tenían las 4 fechas en el pasado (22 al 29 de
septiembre; hoy es 2 de octubre). `upcomingSlots()` devolvía un array
vacío: el botón de agendar ya estaba roto HOY en producción para
cualquier Card sin `InterviewSlot` reales cargados -- el caso de
mastern0 mismo. No era un bug nuevo mío, era una fecha de caducidad
que ya se había cumplido sola (ver el comentario de la propia
Auditoría 2026-09-23 que ya lo advertía).

Arreglado en la raíz: los 4 slots ahora se generan relativos a "ahora"
(`generateLegacySlots`, mismo patrón de siempre -- martes 18hs, jueves
10hs, sábado 12hs, el martes siguiente 18hs -- pero nunca con fecha
fija, siempre ordenados por fecha real). `isSlotUpcoming`/
`upcomingSlots` quedan igual de defensivos que antes. Reescribí
`lib/__tests__/interviewSlots.test.ts` y `e2e/interview-slots.spec.ts`
para inyectar un `now` de referencia en vez de comparar contra labels
en español hardcodeados -- esto también arregla de taquito el test E2E
que venía fallando solo por el paso del calendario real, sin tocarlo
a mano.

### El funnel nuevo

`app/c/legacy-funnel-actions.ts`, `startLegacyFunnelAction`: sin
código de acceso (el Member se encuentra/crea directo por whatsapp,
mismo find-or-create que usa `verifyOtpAction` de `/m/login` pero sin
el paso de OTP -- "el link personalizado ya identifica a la persona",
pedido textual), reusa `ensureLegacyMembershipAndCards`
(`lib/legacyMembership.ts`, el mismo alta Freemium self-service del
login real) para crear sus 3 Cards, guarda la duración de programa
elegida en un campo nuevo (`ProgramMembership.programDuracion`,
migración `20261002194734_program_duracion`), y agenda la entrevista
inicial en el próximo turno disponible (auto-asignado -- el pedido no
incluye un paso de elegir horario a mano) reusando directamente el
mismo modelo `Registration` que ya usa `registerInterviewAction`.

En `components/LyCardView.tsx`, el modal de "Agendar" (mismo
`scheduleOpen` de siempre) rama por `recipient`: sin destinatario, el
slot-picker de toda la vida sigue exactamente igual; con destinatario,
el formulario nuevo -- nombre precargado desde el destinatario, email,
WhatsApp, 5 pastillas de duración de programa, checkbox de privacidad
(`[PLACEHOLDER]`, texto real pendiente de Gunnar) -- y al confirmar,
pantalla final "Tu tarjeta ya existe" con el link real a la Card recién
creada y la fecha de la entrevista.

### Hallazgo real de implementación (no architectural, un error de runtime)

`PROGRAM_DURATIONS` vivía originalmente en el mismo archivo
`"use server"` -- un archivo con esa directiva solo puede exportar
funciones async hacia el cliente; cualquier otro export (una
constante, un array) se rompe en el bundle de cliente (`.map is not a
function` en runtime, confirmado con Playwright real antes de
corregirlo). Se movió a `lib/legacyProgramDurations.ts`, un módulo
plano sin `"use server"`, importado por los dos lados.

### Verificación

`npx tsc --noEmit` limpio, `pnpm lint` sin errores nuevos,
`pnpm test:unit:coverage` 251/251 al 100% (251, no 250 -- el test
reescrito de interviewSlots suma uno), `pnpm build` limpio. Playwright
real de punta a punta contra `/c/mastern0?para=rogelio`: nombre
precargado "Rogelio", validación de email/WhatsApp, bloqueo real sin
aceptar privacidad, confirmar crea de verdad el Member + sus 3 Cards +
la ProgramMembership con `programDuracion` guardada + la Registration
con el próximo slot -- confirmado directo contra la base, no solo en
pantalla --, pantalla de éxito con el link real, y click en "Ver mi
tarjeta" aterriza en la Card nueva de Rogelio de verdad.

## 2026-10-02 -- Corrección PASO 6: calcar el funnel REAL de MayanCity (v1.67.1)

Gunnar corrigió: "Es que no es así. Te pedí copies el funnel de
MayanCity.. porque no lo haces." El pedido original ("NO conectar con
la app de MayanCity ni crear billeteras blockchain") se había
interpretado como "no uses nada de MayanCity" -- lo que pedía era
calcar la ESTRUCTURA/UX real del funnel de MayanCity (wizard de 4
pantallas con barra de progreso), solo que sin conectar con su backend
real ni crear billeteras blockchain de verdad. Son dos cosas
distintas. Gunnar mandó 4 capturas reales del funnel de MayanCity para
que quedara sin ambigüedad.

### Las 4 pantallas reales de MayanCity (de las capturas)

1. **"Antes de agendar..."** -- barra de progreso (3 segmentos), video
   corto ("Mirá este video para entender el potencial..."), con
   fallback honesto "VIDEO NO CONFIGURADO" cuando no hay uno cargado
   (¡coincide con el criterio de placeholders ya usado en toda la app!).
   Botón "Continuar a la agenda".
2. **"Tus datos"** -- Nombre Completo, Correo Electrónico, WhatsApp
   (selector de país + número). Botón "Siguiente paso" (gris/inactivo
   hasta completar, negro cuando está listo).
3. **"Elige tu sesión"** -- horarios reales de esa semana, con
   fallback "NO HAY SESIONES DISPONIBLES" si no hay. Botón "Confirmar
   asistencia".
4. (No capturada, pero implícita por la barra de 4 segmentos) --
   pantalla de confirmación.

### Rehecho en LyCard

`components/LyCardView.tsx`: el formulario de un solo paso se
convierte en un wizard real de 3 pasos + pantalla de éxito (estado
`legacyStep`), con barra de progreso de 3 segmentos arriba del título
(el 4to paso, éxito, no lleva barra -- igual que MayanCity). Paso 1
video (placeholder honesto, sin video real cargado -- Gunnar no pasó
uno todavía). Paso 2 tus datos, con "elegí tu programa" y el checkbox
de privacidad agregados ahí (no estaban en las capturas de MayanCity,
pero sí en el pedido textual original de Gunnar -- se integran al
mismo paso en vez de inventar una pantalla de más). Paso 3 elegí tu
sesión: ahora reusa el MISMO prop `interviewSlots` que ya usa el
slot-picker de siempre (en vez de auto-asignar el primer horario como
en la v1.67.0) -- la persona elige su horario a mano, calcado de
MayanCity.

`app/c/legacy-funnel-actions.ts`: `startLegacyFunnelAction` ahora
recibe `slotId` (el horario elegido a mano) en vez de auto-asignarlo,
y en vez de reimplementar la reserva llama directo a
`registerInterviewAction` (la misma función que usa el slot-picker de
siempre) -- reuso real, no una copia paralela de la lógica de cupo/
capacidad.

### Verificación

`npx tsc --noEmit` limpio, `pnpm lint` sin errores nuevos,
`pnpm test:unit:coverage` 251/251 al 100%, `pnpm build` limpio.
Playwright real de punta a punta por los 4 pasos contra
`/c/mastern0?para=rogelio`: capturas de cada pantalla (video con
badge "Video no configurado" + barra 1/3, tus datos con barra 2/3,
elegí tu sesión con los 4 horarios reales ordenados cronológicamente +
barra 3/3 + bloqueo real sin elegir horario, y la pantalla de éxito
con el link real). Suite completa 41/41 -- incluye una validación
casual extra: la fecha del sistema cambió de 2026-10-02 a 2026-10-03 a
mitad de esta sesión y los horarios se recalcularon solos, sin tocar
nada, confirmando que el fix de slots de la v1.67.0 sigue vivo.

## 2026-10-03 -- Reset a esqueleto, completo (v1.68.0)

Gunnar: "necesito repasar la lógica precisa del negocio.. necesitamos
diseñar una app que sea super intuitiva.. que la gente sepa
definitivamente que hacer.. entonces estoy pensando en como presentar
el primer programa.. osea Legacy." Pedido textual previo: "Lo
primero.. borra toda la base de datos.. no quiero que haya nada..
ningún programa.. nada.. quiero que esté todo en esqueleto." Confirmado
con dos preguntas directas: (1) conservar su propio Admin y la Card
mastern0 tal cual están, (2) él mismo dispara el borrado desde un
botón en `/admin/reset` -- yo no tengo ni voy a tener el connection
string de la base de producción.

### Por qué no era tan simple como ejecutar el botón que ya existía

Ya existía una herramienta "Zona de Riesgo" en `/admin/reset` +
`resetPlatformAction`, shippeada en una fase anterior (2026-09) --
pero cubría solo lo que existía hasta esa fecha: Card, Program, Puesto,
Member, OtpCode, Admin, ProgramMembership, OriginMemento, Registration.
Desde entonces se sumaron WowStore (WowApp/WowAppInstall),
Especialistas/Expertos (Especialista/EspecialistaInstall/Experto/
EquipoInvitacion/CodiceEntry/Consulta), Mensajería Interna (Message/
MessageDelivery), Destinatarios (CardRecipient/CardRecipientSource),
Janus (Tag), Notas de Voz (VoiceNote), WowAwe (AweWalkEntry), Red de
clientes de una Company (CardNetworkMembership) y Leads (CardLead) --
ninguno de esos 15 modelos se tocaba. Un "borrar todo" que deja 15
tipos de contenido de prueba atrás no es un esqueleto, es una mentira.

Tampoco se podía borrar+recrear la Card mastern0 como hacía la versión
vieja -- Gunnar pidió explícitamente conservarla intacta (su propia
identidad/branding no se toca), así que ahora se la excluye del
borrado (`card.deleteMany({ where: { isOrigin: false } })`) en vez de
borrarla y recrearla en blanco.

### Orden de borrado -- por qué importa

Antes de escribir una sola línea, repasé el schema completo (32
modelos) buscando cada relación SIN `onDelete: Cascade/SetNull` (a
propósito, para no perder historial por accidente en el uso normal de
la app) -- son 5: `Card.member`, `Card.program`, `Experto.member`,
`Admin.program`, `Admin.member`. Esto fija un orden obligatorio: Card y
Admin (menos el que ejecuta esto) tienen que borrarse ANTES que
Member/Program, Experto ANTES que Member. Todo lo demás cascadea solo
desde Card/Program/Member/Experto una vez que esos se borran, así que
alcanza con una sola transacción (`prisma.$transaction`, timeout 60s)
de 27 pasos hoja-primero-raíz-al-final: WowHead (Consulta→CodiceEntry→
EquipoInvitacion→Experto→EspecialistaInstall→Especialista), WowStore
(WowAppInstall→WowApp), Mensajería (MessageDelivery→Message), Red de
Company + entrevistas (CardNetworkMembership→Registration), contenido
por Card (CardLead/AweWalkEntry/VoiceNote/Tag/CardRecipientSource/
CardRecipient), Programa (InterviewSlot/ProgramSkin/Puesto),
Membresías (OriginMemento/ProgramMembership), Cards (menos mastern0),
Admins (menos quien ejecuta), OtpCode, y por último Member/Program.

### Fuera de alcance, a propósito

`AdminLoginEvent` -- por diseño propio del modelo ("No se borra nunca;
es el primer paso del futuro CRM/auditoría"), nunca se tocó. `Node`/
`ProjectNode`/`Task`/`NashMeshRun` -- el panel interno de equipo/HR
(`/admin/equipo`, `/admin/nashmesh`), decisión propia de esta sesión
por no ser contenido de negocio de cara al cliente, pendiente de que
Gunnar la confirme o la corrija.

### `app/admin/reset/page.tsx`

La copy decía cosas que ya no eran ciertas con la acción reescrita:
lista de lo que se borra incompleta (le faltaban exactamente los 15
modelos de arriba), y el cierre decía "Lo único que queda es una Card
nueva, 'MasterN0'" cuando ahora la Card existente sobrevive sin
tocarse. Reescrita la lista completa, el párrafo de cierre (ahora dice
la verdad: mastern0 sobrevive intacta, tu Admin tampoco se toca), y el
botón pasa de "Borrar todo y crear MasterN0" a "Borrar todo el
contenido" (ya no crea nada).

### Verificación

`npx tsc --noEmit` limpio, `pnpm lint` sin errores nuevos,
`pnpm test:unit:coverage` 251/251 al 100%, `pnpm build` limpio. Antes
de tocar nada en real, sembré datos de verdad en las 27 tablas que
toca la transacción -- Programa, 2 Members, 2 Admins (uno clásico con
programId, uno "promovido" con memberId+programId, el patrón real de
un Chido→N0), 2 ProgramMemberships con referido, Puesto, las 3 Cards
(project/company/personal) con destinatario+fuente+tag+lead, VoiceNote
+AweWalkEntry, InterviewSlot+ProgramSkin, 2 Registrations (una contra
InterviewSlot+ProgramMembership, otra contra CardNetworkMembership),
OriginMemento, Message+MessageDelivery, WowApp+Install,
Especialista+Install, 2 Expertos con EquipoInvitacion+CodiceEntry+
Consulta, y OtpCode -- y corrí la transacción real contra esos datos:
cero violaciones de llave foránea. Verificado después: las 27 tablas
quedaron en 0, sobrevive exactamente 1 Card (`isOrigin:true`) y
exactamente el Admin que la ejecuta, y Node/ProjectNode/Task/
NashMeshRun/AdminLoginEvent (sembrados también, para probar que NO se
tocan) siguieron intactos. Limpié mis propios datos de siembra después
-- confirmado que no quedó contaminación: la suite Playwright completa
corrió 41/41 verde, sin la falsa alarma de "SIMULACIÓN" duplicado que
había aparecido en nashmesh.spec.ts por una fila mía sin limpiar a
tiempo.

### Cómo lo dispara Gunnar

Desde su propia sesión de producción, logueado como MasterN0: entrar a
`/admin/programs` → "Zona de Riesgo" → escribir `BORRAR TODO` en el
campo de confirmación → "Borrar todo el contenido". Yo no ejecuto esto
en producción ni tengo el connection string -- el botón lo dispara él.
Pendiente de su confirmación/corrección: si Node/ProjectNode/Task/
NashMeshRun (el panel de equipo interno) debían quedar afuera del
borrado como asumí, o si también los quiere en esqueleto.

## 2026-10-03 -- Corrección: el contenido de mastern0 también se blanquea, y el panel interno entra al borrado (v1.68.1)

Gunnar, el mismo día, segunda vuelta -- dijo no entender a qué me
refería con Node/ProjectNode/Task/NashMeshRun y corrigió dos cosas de
una: "no se que es necesito mas explicacion, no quiero que borremos
condigo ni logica.. si es contenido y lo podemos volver a crear..
borralo tambien.. de echo ahorita me fije y no se ha borrado la
tarjeta del Programa Legacy.. sigue hasta la foto puesta.. necesito se
borre todo el contenido.. que si voy a entrar a una tarjeta no se vea
nada.."

Dos correcciones reales, no una repregunta inútil:

1. **El panel interno SÍ se borra.** Es contenido (Nodos, Proyectos,
   Tareas, corridas de NashMesh), no lógica de la plataforma -- se
   puede recrear a mano después. Entra al mismo borrón.
2. **"Conservar mastern0" no significaba "conservar su contenido".**
   La vez anterior interpreté mal su propia confirmación ("Conservar
   mi Admin y mastern0") como "no tocar nada de esa Card". Lo que
   Gunnar necesitaba de verdad es que la FILA siga existiendo (su
   login de MasterN0 depende de que haya una Card con `isOrigin:true`
   -- eso SÍ es lógica de la app, se rompería el acceso si se borra),
   pero el CONTENIDO de esa Card (nombre, foto, frase, redes, todo lo
   que ve un visitante) tiene que quedar vacío igual que cualquier
   otra. Confirmado por su propia frase: "que si voy a entrar a una
   tarjeta no se vea nada".

### Cambio en `app/admin/reset-actions.ts`

Sumados 4 `deleteMany()` más (`task`, `projectNode`, `node`,
`nashMeshRun`) al mismo `$transaction`, en ese orden (aunque cascadean
solo desde ProjectNode/Node hacia Task, se borran a mano igual que
todo el resto del archivo, mismo criterio explícito ya establecido).

Después del `card.deleteMany({isOrigin:false})`, un nuevo
`card.updateMany({where:{isOrigin:true}, data:{...}})` que blanquea
TODOS los campos de contenido editable de esa Card de vuelta a los
defaults vacíos del schema (name/title/quote/siglas/tooltip/medal/
rank/contacts/los 8 canales de contacto/email/location/portraitUrl/
videoThumbnailUrl/shareScope/logoUrl/sizeConfig/officeItems/
islandLabel/oficinaObjetivo/realityCheckKpis/newsItems/
calendarEvents) -- sin tocar `id`/`slug`/`isOrigin`/`kind`/`memberId`/
`programId`/`puestoId` (ninguno de esos es "contenido visible", son la
identidad/estructura que mantiene viva la lógica de login y detección
de host). El resultado: la fila sigue ahí con el mismo id/slug (el
login de MasterN0 no se rompe), pero al entrar a `/c/mastern0` no se
ve nada -- exactamente lo pedido.

### `app/admin/reset/page.tsx`

Sumada la fila del panel interno a la lista de lo que se borra, y
reescrito el párrafo de cierre para que ya no diga "sobrevive intacta
tal cual está" (falso ahora) sino la verdad: la fila/login sigue
existiendo porque si no Gunnar ni podría entrar, pero su contenido
queda tan vacío como todo lo demás.

### Verificación

`npx tsc --noEmit` limpio, `pnpm lint` sin errores nuevos,
`pnpm test:unit:coverage` 251/251 al 100%, `pnpm build` limpio. Antes
de shippear, sembré de nuevo las 27 tablas anteriores MÁS las 4 del
panel interno, y le puse a la Card raíz contenido real de prueba
(nombre, foto, frase, WhatsApp) simulando una Card ya personalizada de
verdad -- corrí la transacción completa y confirmé: las 31 tablas
quedaron en cero, la Card raíz sobrevivió con el MISMO id y slug
(`mastern0`) pero `name`/`title`/`quote`/`wa` vacíos y `portraitUrl`
en null, y el Admin de Gunnar siguió siendo el único que queda. Suite
Playwright completa 41/41 verde (limpié mis propios datos de siembra
después de verificar, mismo cuidado que la vuelta anterior para no
contaminar `nashmesh.spec.ts` de nuevo).

## 2026-10-03 -- Repaso detalle por detalle, item 1: espacio muerto abajo en PWA de iPhone (v1.68.2)

Con la base en esqueleto, Gunnar empieza a repasar la app "detalle por
detalle" para pensar cómo presentar Legacy de forma más intuitiva.
Primer hallazgo real: "Abro la app en un icon que baje en mi desktop
del iphone13. La tarjeta no cubre todo el tamaño a lo largo.. se queda
con un espacio sustancial abajo."

### Diagnóstico

El manifest (`app/manifest.ts`) declara `display: "standalone"` --
cuando Gunnar agrega la Card a su home y la abre desde ahí, corre sin
ninguna barra de Safari (ni superior ni inferior), a diferencia de
abrirla en una pestaña normal del navegador. El contenedor raíz de
`LyCardView.tsx` (y de `CardCarousel.tsx`, el wrapper swipeable de las
3 Cards de un Member) usaba `height: "100dvh"` -- esa unidad está
diseñada para Safari, donde SÍ existe una barra inferior que puede
aparecer/desaparecer según el scroll, y el cálculo reserva espacio
para ese caso. En una PWA standalone esa barra no existe nunca, pero
WebKit (el motor de iOS) sigue dejando el mismo hueco como si la
hubiera -- bug real y documentado, no un error de nuestro CSS. El
padding inferior con `env(safe-area-inset-bottom)` (para el home
indicator) ya estaba bien puesto desde antes; el hueco reportado es
aparte, y más grande.

### Fix

En vez de depender de `100dvh`, se mide el alto real de la ventana con
`window.innerHeight` en cuanto el componente monta (y se reactualiza
en `resize`/`orientationchange`/`visualViewport.resize`, para rotar el
teléfono sin romper nada) -- ese valor SÍ es el real disponible tanto
en Safari como en standalone, porque no depende de ninguna suposición
sobre barras que puedan o no existir. `100dvh` queda solo de fallback
para el primer pintado server-side, antes de que el JS corra (un
instante, imperceptible). Aplicado en los dos contenedores de
pantalla completa que tenían el mismo `100dvh` de raíz:
`LyCardView.tsx` (la tarjeta sola) y `CardCarousel.tsx` (el carrusel
de las 3 Cards) -- mismo bug, mismo fix, por consistencia.

### Verificación

`npx tsc --noEmit` limpio, `pnpm lint` sin errores nuevos,
`pnpm test:unit:coverage` 251/251 al 100%, `pnpm build` limpio.
Playwright real contra `/c/mastern0` con viewport 390×844 (las
dimensiones de iPhone 13): confirmado que el contenedor raíz mide
exactamente `window.innerHeight` (844px), gap de 0px -- antes de este
fix, cualquier diferencia entre `100dvh` y el alto real de la ventana
standalone se habría visto como el hueco reportado. No hay forma de
emular el motor WebKit real de iOS en standalone desde este sandbox
(Playwright corre sobre Chromium), así que esta verificación confirma
que el mecanismo del fix funciona correctamente -- la confirmación
final en el dispositivo real la hace Gunnar. Suite Playwright completa
41/41 verde.

## 2026-10-03 -- Detalle 2: favicon real + bug de caché del service worker + refuerzo del fix de altura (v1.68.3)

Gunnar: "sigue igual.. no cambio nada.. de echo el logo del triangulo
ese ya lo habiamos cambiado por el logo de legacy.. te pido lo
cambies en el favicon." Mandó la imagen real del logo (el arco dorado
con la J).

### Favicon: por qué seguía el triángulo

`app/layout.tsx#generateMetadata()` arma el favicon desde
`origin.program.logoUrl` cuando existe, y cae a `DEFAULT_ICONS` (el
triángulo en `public/icons/*.png`) cuando no. La Card `mastern0`
nunca tuvo `programId` (es la raíz, no cuelga de ningún Programa) --
así que ese mecanismo nunca pudo aplicar, ni antes ni después del
reset. Lo que Gunnar probablemente recordaba como "ya lo habíamos
cambiado" era el `logoUrl` de la propia Card (para otro uso, mostrado
en la Oficina Virtual), no el favicon real del sistema -- dos cosas
distintas que no están conectadas en el código.

Reemplazados directamente los 4 archivos en `public/icons/` (mismo
patrón que los originales: fondo `#09090b` sólido, igual que
`theme_color`/`background_color` del manifest, con el logo centrado)
con el logo real que mandó Gunnar, recortado a su contenido real
(324×207 dentro del PNG de 500×500 que llegó) y reescalado a cada
tamaño: `icon-192.png`, `icon-512.png`, `icon-512-maskable.png` (más
chico, dentro de la zona segura del 80% central que exige el spec de
íconos maskable), `apple-touch-icon.png` (180×180). Generado con
Python/Pillow (`PIL`), sin tocar `app/manifest.ts` ni `layout.tsx` --
mismas rutas, mismos nombres, solo cambia el contenido del archivo.

### Hallazgo real: el service worker nunca iba a mostrar el ícono nuevo

Al investigar por qué el cambio de ícono no se vería ni con un deploy
limpio, encontré un bug real en `public/sw.js`: el comentario del
archivo decía que `/icons/*` tenía nombres con hash de build (como
`/_next/static/*`) y por eso usaba `cache-first` -- FALSO, los
nombres de los íconos son fijos (`icon-192.png` es siempre
`icon-192.png`). Con `cache-first`, el teléfono que ya había cacheado
el triángulo lo iba a seguir sirviendo para siempre, sin importar
cuántas veces cambiáramos el archivo en el servidor. Corregido a
`network-first` (mismo criterio ya usado para la navegación -- prioriza
estar al día, cae al caché solo sin señal), separado en su propio
`ICONS_CACHE`, y subida `CACHE_VERSION` de `lycard-v1` a `lycard-v2`
para que el `activate` del service worker purgue los cachés viejos
(incluido el triángulo ya cacheado) en el próximo lanzamiento de la
app en cualquier dispositivo.

### El espacio muerto abajo (v1.68.2) seguía "igual" -- reforzado

Gunnar también reportó que el fix de altura de la vuelta anterior no
cambió nada. Causa más probable: el ícono del home en iOS cachea el
lanzamiento previo a nivel sistema operativo, aparte de cualquier
Service Worker -- un simple refresh de pestaña no alcanza, hace falta
relanzar la app de verdad (cerrarla del selector de apps, no solo
dejarla en segundo plano, o directamente borrar y volver a agregar el
ícono). Pero además, por las dudas de que sea el segundo bug más sutil
de WebKit (la primera lectura de `window.innerHeight` al montar puede
llegar antes de que el motor asiente el layout real de standalone), se
reforzó el fix: ahora prioriza `visualViewport.height` sobre
`window.innerHeight` (la API pensada específicamente para esto, más
confiable en iOS) y vuelve a medir con un `setTimeout` de 300ms además
de al montar, más un listener de `pageshow` (cubre volver a la app
desde el selector).

### Verificación

`npx tsc --noEmit` limpio, `pnpm lint` sin errores nuevos,
`pnpm test:unit:coverage` 251/251 al 100%, `pnpm build` limpio, suite
Playwright completa 41/41 verde. Los íconos nuevos verificados
visualmente (leídos de vuelta con el tool de lectura de imágenes) --
el logo se ve completo, centrado, sin recorte, tanto en el tamaño
normal como en el maskable con su zona de seguridad. El bug del
service worker no tiene forma de probarse con Playwright (es
comportamiento de caché del navegador real, no algo que el entorno de
test ejecute) -- confirmado por lectura directa del código contra la
spec real de Cache API, mismo criterio que cualquier otro hallazgo de
este tipo en el proyecto.

## 2026-10-03 -- Detalle 3: placeholders de Nombre/CV + bio de Einar como "default" en los 3 modales de distinción (v1.68.4)

Gunnar repasó la tarjeta en esqueleto elemento por elemento, confirmó
que los 5 íconos superiores y el retrato están bien, y señaló 3 cosas
concretas sobre lo que queda vacío: el Nombre necesita un placeholder
marcado ("Nombre Completo"), el segundo distintivo (O.D.) "debería
decir [en su modal] lo que es realmente programable por Programa, no
lo que dice ahora", y el CV de abajo también necesita placeholder
("por cierto se me hace esta muy corto").

### Nombre

El `<h1>` con `card.name` quedaba completamente vacío y sin forma de
saber que ahí va el nombre. Ahora, si `card.name` está vacío, muestra
`t(lang,"namePlaceholder")` ("Nombre Completo"/"Full Name") en itálica
y color atenuado (`--ink2`) -- mismo criterio visual que el placeholder
gris de un campo de formulario, nunca se guarda como valor real.

### CV / título

El botón entero (ícono "work" + texto de `card.title`) tenía
`{card.title && (...)}` -- si no había título cargado, el botón NO
EXISTÍA, ni rastro de que ahí va algo. Ahora siempre se renderiza, con
`t(lang,"titlePlaceholder")` ("Ej. PhD en Neuropsicología") cuando
está vacío, mismo tratamiento atenuado/itálico que el nombre. De paso,
el pedido de "se me hace esta muy corto": el botón tenía `width:172,
maxWidth:"70%"` fijo con `whiteSpace:"nowrap"` + `textOverflow:
"ellipsis"` -- un título real como "PhD en Neuropsicología" ya quedaba
cortado con puntos suspensivos. Ahora `width:"auto", minWidth:172,
maxWidth:"92%"` -- crece con el contenido real en vez de truncarlo de
entrada.

### Hallazgo real: el bio personal de Einar como "default" de cualquier Programa nuevo

Al investigar el pedido de Gunnar de corregir el texto del modal O.D.
encontré algo más grande que un simple typo: los 3 modales de
distinción (O.D./Puesto, Rango de Sabiduría, Nivel de Medallón) caen,
cuando el Programa no configuró su propia escala/Puesto (`descripcion`
vacía, el estado de CUALQUIER Programa recién creado, no solo
mastern0), a tres textos fijos en `lib/i18n.ts` -- `odBody` era
literalmente el bio personal de Einar ("Diseñador, visionario y
creador original del ecosistema Legacy, EinarOS..."), `ancBody`
describía el rango "ANCIENT" como si fuera universal, `medalBody`
hablaba de "compromiso patrimonial... del ecosistema Legacy". Ninguno
de los tres era un fallback genérico -- eran contenido real de una
persona/marca específica, mostrado como si fuera el comportamiento por
defecto de la PLATAFORMA para cualquier Programa nuevo sin configurar.
Reescritos a texto honesto ("Esta distinción/rango/nivel todavía no
fue configurado. El N0 del Programa [lo define] desde
/admin/programs..."), ES y EN. De paso, el renglón `meta` de cada
modal (antes fijo: "Estatus: Activo y Certificado", "Mentoría &
Consejo", "Distintivo Legacy", SIEMPRE, incluso cuando el body ya
avisaba que no había nada cargado -- contradicción dentro del mismo
modal) ahora es condicional: dice "Sin configurar" mientras no haya
Puesto/escala real, y vuelve al texto original una vez que el N0 carga
el suyo.

### Verificación

`npx tsc --noEmit` limpio, `pnpm lint` sin errores nuevos,
`pnpm test:unit:coverage` 251/251 al 100%, `pnpm build` limpio.
Playwright real contra `/c/mastern0` (vacía): capturas confirmando
"Nombre Completo" en itálica atenuada, "Ej. PhD en Neuropsicología" en
el botón ya sin cortarse, y el modal O.D. mostrando el texto honesto
nuevo -- leído el DOM directamente (no solo la captura) para confirmar
que el renglón de estado dice "Sin configurar" (en la captura quedaba
tapado por el botón flotante de MasterN0, que vive fijo en esa misma
esquina). Suite Playwright completa 41/41 verde.

## 2026-10-03 -- Detalle 4: explicar cada badge de forma general, no solo su estado (v1.68.5)

Gunnar: "no entendi lo que me dijiste de los Rangos y demas.. pero al
final de cuentas lo que quiero comentar es lo siguiente.. en la
tarjeta tenemos 4 niveles de distinciones o 'medallas' .. dos medallas
al lado del nombre completo y dos 'distinciones' en la parte de abajo
del Cv.. estas distinciones Puede Ser Estatus y Rango (por ejemplo)..
lo que necesito es que en cada medalla o distincion.. se explique para
que es cada una de forma general.. lo de aprendiz.. O.D. Ancient.. es
solo para el legacy."

Pedido claro una vez traducido de la jerga técnica que usé antes y que
no entendió: los 4 badges (las 2 medallas-dot junto al nombre, las 2
"distinciones" bajo el CV) necesitan, SIEMPRE visible dentro de su
modal, una explicación de qué representa ese TIPO de badge en general
-- no solo si está configurado o no (eso ya se arregló la vuelta
anterior). Un visitante que nunca vio Legacy tiene que entender "esto
es tu rango de experiencia" o "esto es tu posición dentro del
Programa" sin necesitar contexto de Legacy.

### Implementación

Sumadas 3 frases nuevas en `lib/i18n.ts` (`odIntro`, `ancIntro`,
`medalIntro`, ES+EN) que van SIEMPRE primero en el body de cada modal
-- antes del texto de estado (configurado/no configurado) que ya
estaba. El cuarto badge (contactos, el dot izquierdo) ya tenía una
explicación genérica desde antes, no hacía falta tocarlo.

### Corrección en vivo, durante la misma tarea

Gunnar interrumpió con una aclaración clave: "de echo esta no serual
la Legacy Card de forma estricta.. nomas seria yna Lycard (general)".
La primera redacción de estas 3 frases decía "acá ves las que eligió
Legacy (ej. 'O.D.')" -- pero la Card `mastern0` que estamos repasando
NUNCA estuvo asociada a un Programa real (`programId: null` desde el
día uno, confirmado en el schema). Los valores que se ven ("O.D.",
"Aprendiz") son los defaults CRUDOS del modelo `Card` en
`prisma/schema.prisma` (`siglas: "O.D." @default`, `rank: "aprendiz"
@default`), no una decisión real de Legacy como Programa configurado.
Atribuirle esa elección a "Legacy" habría sido inventar una
personalización que nadie hizo. Corregido antes de shippear: ahora
dice "Lo que ves acá (ej. 'O.D.') es un valor de ejemplo, sin un
Programa real detrás todavía" -- honesto en los dos sentidos, general
Y sin pretender que es contenido real de Legacy.

### Verificación

`npx tsc --noEmit` limpio, `pnpm lint` sin errores nuevos,
`pnpm test:unit:coverage` 251/251 al 100%, `pnpm build` limpio.
Playwright real contra `/c/mastern0`: leído el texto completo del
modal O.D. directo del DOM, confirmado que dice la frase general
nueva seguida del estado "Sin configurar" (no la versión vieja que
mencionaba a Legacy). Suite Playwright completa 41/41 verde.

## 2026-10-03 -- Detalle 5: "Legacy Card" / "Info Legacy" / "Mi camino con Legacy" por default sin Programa real (v1.68.6)

Gunnar repitió su aclaración ("de echo esta no serual la Legacy Card
de forma estricta.. nomas seria yna Lycard (general)") apuntando a
algo más allá de los badges que ya había corregido. Encontré el mismo
patrón en 3 lugares más, todos visibles en la propia tarjeta:

1. El rótulo de arriba (`cardIslandLabel`) decía "Legacy Card" --
   `` `${program?.name || "Legacy"} Card` ``, mismo bug que el de los
   badges (fallback hardcodeado a "Legacy" cuando no hay Programa).
2. El botón "Info Legacy" -- texto fijo en `lib/i18n.ts`, sin importar
   si hay Programa o no.
3. El botón "Mi camino con Legacy" -- mismo caso.

Le pregunté el alcance (corregir solo esto visible ahora, vs. un
barrido completo de TODAS las frases "Legacy" del sistema -- hay
bastantes más, en modales de agendar/invitar/etc.) y eligió lo
primero, dejando el barrido completo para cuando se ponga a diseñar
específicamente cómo presentar Legacy.

### Hallazgo: el mecanismo para esto YA EXISTÍA

`infoBtn` y `storyBtn` ya estaban en `CARD_LABEL_FIELDS`
(`lib/cardLabels.ts`) -- la lista de textos que cualquier Programa
puede sobrescribir desde `/admin/programs` vía `Program.cardLabels`.
El problema nunca fue la falta de un mecanismo de personalización, fue
que el DEFAULT de la plataforma (lo que se usa cuando NINGÚN Programa
cargó su propio texto) hablaba en nombre de Legacy. Confirmado en
`cardLabel()` (`components/LyCardView.tsx:577`): primero busca el
override del Programa, y si no hay, cae a `t(lang,key)` -- el string
fijo de `lib/i18n.ts`.

### Cambios

- `cardIslandLabel`: de `` `${program?.name || "Legacy"} Card` `` a
  `program?.name ? \`${program.name} Card\` : "LyCard"` -- sin Programa,
  dice "LyCard" liso, no inventa un nombre.
- `infoBtn` (ES/EN): "Info Legacy"/"Legacy Info" → "Info".
- `storyBtn` (ES/EN): "Mi camino con Legacy"/"My path with Legacy" →
  "Mi camino"/"My path".

Legacy, una vez armado como Programa real en `/admin/programs`, puede
cargar sus propios "Info Legacy"/"Mi camino con Legacy" en
`Program.cardLabels` -- el mecanismo sigue intacto, solo cambió qué
pasa cuando NADIE lo configuró todavía.

### Efecto colateral en un test, corregido

`e2e/card-size-panel.spec.ts` tenía `getByText("Mi camino", {exact:
true})` esperando un solo match -- el panel de ajuste de tamaños
también muestra la etiqueta "Mi camino" (fija, de
`lib/cardSizeConfig.ts`, sin relación con `storyBtn`) para el módulo
que agregaste al tamaño de la tarjeta. Con el botón real ahora
diciendo exactamente "Mi camino" también, el locator sin escopar
matcheaba 2 elementos (violación de modo estricto de Playwright).
Arreglado agregando `role="dialog"` + `aria-label="Ajustar tamaños"`
al panel (`components/CardSizePanel.tsx`) y escopando el test a ese
diálogo -- mejora real de accesibilidad, no solo un parche para el
test.

### Verificación

`npx tsc --noEmit` limpio, `pnpm lint` sin errores nuevos,
`pnpm test:unit:coverage` 251/251 al 100%, `pnpm build` limpio. Suite
Playwright completa 41/41 verde (incluido el test corregido del panel
de tamaños).

## 2026-10-03 -- Detalle 6: contenido completo de los 4 modales de insignias/distinciones, con mecanismo y ejemplos de íconos (v1.69.0)

Gunnar: "Quiero que cambies el contenido de los modales de insignia y
distintivos y que expliques para que y como funciona cada uno. Y des
ejemplos de algunos iconos y demas." Ampliación directa de lo hecho en
v1.68.4/1.68.5 (que solo agregaba una frase corta de "para qué sirve
esto en general") -- esta vez pidió explícitamente el CÓMO funciona
(mecanismo real) y ejemplos concretos de íconos.

### Contenido nuevo por modal

Reescritos `odIntro`, `ancIntro`, `medalIntro` (ES+EN) en
`lib/i18n.ts`, y sumado `contactsIntro` (nuevo, el cuarto modal no
tenía esta capa todavía). Cada uno ahora cubre 3 cosas: QUÉ es (el
concepto), CÓMO funciona (el N0 arma una escala de 3 a N niveles desde
`/admin/programs`, cada nivel con su propio nombre/ícono/color -- el
mismo mecanismo en los 4, solo cambia qué mide), y EJEMPLOS reales de
íconos de Material Symbols (el set que ya usa toda la app, confirmado
contra `lib/data.ts` RANKS/MEDALS y los íconos ya usados en el resto
del código -- no inventados):

- **Puesto** (badge O.D.): diamond (fundador), shield (guardián),
  handshake (socio/enlace), groups (líder de equipo), verified (rol
  certificado).
- **Rango** (badge Ancient/Sabiduría): school (en formación),
  trending_up (en práctica), workspace_premium (con dominio), terrain
  (guía/mentor), all_inclusive (el nivel más alto).
- **Medallón** (dot derecho del nombre): military_tech,
  workspace_premium, verified, star, emoji_events.
- **Contactos** (dot izquierdo del nombre): groups, forum,
  diversity_3, contacts.

De paso, aclarado por primera vez un punto que antes quedaba implícito
y confuso: Puesto y Rango son DOS EJES DISTINTOS -- Puesto es el ROL
que ocupás (fundador, guardián, líder), Rango es cuánta EXPERIENCIA
tenés (principiante → avanzado). El texto de `odIntro` ahora lo dice
explícitamente ("distinto del Rango de acá abajo").

### Verificación

`npx tsc --noEmit` limpio, `pnpm lint` sin errores nuevos,
`pnpm test:unit:coverage` 251/251 al 100%, `pnpm build` limpio.
Playwright real contra `/c/mastern0`: abierto el modal O.D., leído el
texto completo del DOM (confirmado que trae la explicación nueva
completa, mecanismo + 5 ejemplos de íconos + el estado "sin
configurar" al final) y capturada la pantalla para confirmar que se
ve bien, legible, con scroll natural dentro del modal sin desbordar.
Suite Playwright completa 41/41 verde.

## 2026-10-03 -- Detalle 6, cuarta vuelta: formato visual real con íconos renderizados, no texto (v1.69.1)

Gunnar rechazó v1.69.0 de plano: "esta horrible.. el unico que
hiciste es el de Order of Distintion.. y esta muy mal explicado..
quiero algo mas visual.. utiliza un formato como el del modal Info..
mostrame logos.. dame imagenes." El problema de fondo: v1.69.0
describía los íconos como PALABRAS dentro de un párrafo ("diamond
(fundador)..."), nunca los renderizaba. Los 4 modales de
insignias/distinciones (`od`/`ancient`/`medal`/`contacts`) compartían
un único template de fallback genérico (recuadro de título + párrafo
+ pie), estructuralmente distinto del modal Info (que sí tiene hero +
grilla de tarjetitas con `<Icon>` real -- el patrón `pil1/pil2/pil3`).
Por eso, para Gunnar, "solo cambió el de O.D." -- en realidad cambió
el texto de los 4, pero el FORMATO nunca cambió para ninguno.

### Qué se hizo

- Acortadas `odIntro`/`ancIntro`/`medalIntro`/`contactsIntro`
  (`lib/i18n.ts`, ES+EN) a 2 frases -- QUÉ es + CÓMO lo arma el N0 --
  sacando el texto de "ejemplos de íconos típicos" (eso ahora se
  renderiza aparte). Agregada `badgeExamplesLabel` ("Ejemplos de
  íconos" / "Icon examples").
- Nueva constante `BADGE_ICON_EXAMPLES` en `components/LyCardView.tsx`
  -- 4 pares `{icon, label}` reales por tipo de badge (mismos nombres
  de Material Symbols que v1.69.0, ahora consumidos de verdad en vez
  de escritos como texto).
- Nueva rama en el condicional de renderizado del modal
  (`modal === "od" || "ancient" || "medal" || "contacts"`), insertada
  antes del fallback genérico (que sigue sirviendo para `story` y
  cualquier otro tipo no especial-casado): recuadro de título (igual
  que antes) + intro corta + grilla 2x2 de tarjetitas con `<Icon>`
  real + etiqueta, mismo estilo de borde/fondo que el modal Info
  (`var(--surf)`, borde dorado translúcido, esquinas redondeadas) +
  el párrafo de estado (configurado/sin configurar) + pie con nombre,
  todo heredado de `activeModal.body`/`.meta` sin tocar esa lógica.

### Verificación

`npx tsc --noEmit` limpio, `pnpm lint` sin errores nuevos (mismos 11
warnings preexistentes, cero nuevos), `pnpm test:unit:coverage`
251/251 al 100%, `pnpm build` limpio. Suite Playwright completa
41/41 verde, cero regresiones. Script Playwright puntual contra
`/c/mastern0` (390x844, viewport iPhone): abiertos los 4 modales de
verdad (botones "Personas contactadas"/"Nivel de Medallón" por
aria-label, O.D./Ancient por selector de botones sin aria-label) y
capturada cada pantalla -- confirmado visualmente que los 4 muestran
la grilla de 4 íconos reales (no nombres de texto), sin desbordar,
legible, mismo lenguaje visual que el modal Info.

## 2026-10-04 -- Posicionador de fotos en el dashboard (v1.70.0)

Gunnar: "en todos los servicios que utilizamos para subir fotos.. dame
la oportunidad de mover, posicionar, disminuir, aumentar el tamaño de
la foto.. ahorita puse una para el programa Legacy.. y se ve cortada y
no puedo editar o modificar su posicion o tamaño.. dame la habilidad..
en el dashboard no en la tarjeta." Confirmado por `AskUserQuestion`:
alcance acotado a las 3 fotos que se ven de verdad en la tarjeta/
oficina pública (Retrato de Card, Logo de Empresa, Logo de Programa),
no a íconos internos de admin (Superpoderes/WowApps) ni al upload de
"diseño corporativo".

### Qué se hizo

Componente nuevo `components/PhotoPositioner.tsx` (client, sin
librerías externas -- canvas + pointer events a mano, mismo criterio
que el resto de la app). Reemplaza el `<input type="file">` crudo de
los 3 lugares de siempre:

- Intercepta el archivo elegido ANTES de que el `<form>` nativo lo
  mande: abre un editor con un marco que representa el recorte real
  (cuadrado para logos con `fit:"contain"`, 4:5 vertical para
  retratos con `fit:"cover"`), arrastre con Pointer Events para
  pan, y un slider de zoom que preserva el punto enfocado al centro
  en vez de recentrar siempre.
- Al confirmar, compone la selección en un `<canvas>` a 2.4x de
  resolución del marco y exporta un PNG transparente (logos, modo
  `"contain"`, dejan ver el padding elegido) o opaco (retratos, modo
  `"cover"`, sin huecos nunca). Ese PNG se inyecta en el MISMO
  `<input type="file">` vía `DataTransfer`, así que el `<form
  action={...}>` existente sigue funcionando sin tocar ningún server
  action ni el schema -- el archivo que llega al servidor YA viene
  bien encuadrado.
- Botón "Reposicionar" (solo si ya hay una foto subida): reabre el
  editor sobre la URL YA guardada, sin tener que volver a elegir el
  archivo del disco -- resuelve el caso concreto que reportó (el logo
  de Legacy ya estaba subido y cortado, no quería resubirlo).

Enganchado en `app/admin/programs/[id]/page.tsx` (logo de Programa),
`components/EditorForm.tsx` (retrato de Card de proyecto, lado admin)
y `components/MemberCardEditor.tsx` (retrato + logo de Empresa, lado
`/m/dashboard`). Cada uso lleva `key={initialUrl ?? "empty"}`: fuerza
un remount cuando la URL guardada cambia, para que "Reposicionar" dos
veces seguidas en la misma sesión (sin recargar a mano) siempre abra
la foto REAL recién guardada y no un `blob:` URL viejo que quedó
flotando en el estado de React de un render anterior -- bug real
encontrado armando el E2E, no hipotético.

### El rabbit hole de la sesión (para que quede documentado)

Mientras se probaba "Reposicionar" (que guarda dos veces seguidas en
la misma sesión), aparecía un fallo raro: la sesión del Admin que
estaba guardando "desaparecía" justo en el segundo guardado, y ese
segundo cambio nunca quedaba persistido. Se investigó a fondo
(reintentos en la lectura de sesión, pool de Postgres a `max:1`,
Postgres reiniciado limpio, hasta un trigger de auditoría en la tabla
Admin) sospechando un bug real de `@prisma/adapter-pg` en Prisma 7
(issues #29407/#30374 de prisma/orm, confirmados y reales, pero no
era esto). La causa de fondo terminó siendo mucho más boba y 100%
propia: el script de prueba usaba `page.waitForURL(/saved=1/)` después
del segundo guardado, pero la URL YA estaba en `?saved=1` desde el
primer guardado -- Playwright resolvía esa espera de inmediato sin
esperar el segundo POST real, el script seguía de largo y corría su
propio cleanup (`delete from "Admin"`) MIENTRAS el segundo guardado
todavía estaba en vuelo en el servidor, que entonces no encontraba su
propio Admin y abortaba. La app nunca tuvo el bug. Se revirtieron
todos los parches especulativos (sin dejar nada raro en el código);
lo único que quedó, porque es una mejora real independiente de todo
esto, es cachear 60s la query de `generateMetadata()` en
`app/layout.tsx` (corría sin caché en cada request de toda la app,
redundante). El bug real que SÍ apareció -- el de `blob:` URL viejo
en "Reposicionar" -- se encontró y arregló aparte (ver arriba, `key`).

### Verificación

`npx tsc --noEmit` limpio, `pnpm lint` sin errores nuevos (mismos 11
warnings preexistentes), `pnpm test:unit:coverage` 251/251 al 100%
(PhotoPositioner es puramente interactivo, sin lógica nueva en
`lib/`, mismo criterio que `CardSizePanel.tsx`). `pnpm build` limpio.
E2E nuevo `e2e/photo-positioner.spec.ts` (3 tests reales: logo de
Programa con pan+zoom real vía pointer events, retrato de Card con
`fit:"cover"`, y el flujo completo de "Reposicionar" dos guardados
seguidos) -- estable en 3 corridas consecutivas tras el fix del
`key`. Suite Playwright completa 44/44 verde, cero regresiones.

## 2026-10-04 -- Categorización: modales reales + selección desde la tarjeta (v1.71.0)

Gunnar venía señalando dos cosas separadas que resultaron ser la misma
raíz: (1) "todo el sistema de Categorizacion.. medallas, rangos,
estatus.. no esta muy funcional.. necesito que todo este incluido
dentro del dashboard de programa.. vamos a poner ahi una seccion que
agrupe todo lo que ahora esta separado"; (2) más puntual después, ya
con datos reales cargados en el Programa Legacy: "que paso con corregir
la informacion de los modales.. que cada modal explique lo que se dice
en el dashboard.. cree el sistema de logica de la segunda medalla y el
sistema del Order of Distintion para el Estatus.. la idea es que
mostremos eso en el modal y le demos la oportunidad al N0 de
seleccionar eso desde ahi".

Diagnóstico: el título grande de cada modal (Puesto/O.D., Medallón,
Sabiduría, Contactos) YA leía el dato real de la Card/Programa desde
Fase 9.2/9.4/9.5 -- eso funcionaba. El hueco real era la grilla de 4
iconitos debajo (`BADGE_ICON_EXAMPLES` en `LyCardView.tsx`, sumada en
la cuarta vuelta del 2026-10-03): 4 EJEMPLOS fijos por tipo de modal
("diamond (fundador), shield (guardián)..."), iguales para cualquier
Programa, que ignoraban por completo lo que el N0 configuró. Si Gunnar
armaba 8 niveles de Medallón con sus propios nombres/colores, el modal
seguía mostrando "Bronce/Plata/Oro/Diamante" de ejemplo.

### Rename de dos escalas (pedido explícito de Gunnar, solo texto -- el
### campo interno `type`/`Card.medal`/`Card.rank`/`Program.medalScale`/
### `Program.rankScale` no cambia, cero migración)

- "Escala de Medallón" -> **Medallón de Resultados**: deja de ser un
  genérico bronce/plata/oro/diamante -- mide rendimiento/impacto real
  (de Crítico a Liderazgo, escala rojo->morado que Gunnar ya armó a
  mano en el Programa Legacy real).
- "Escala de Sabiduría" -> **Medallón de Imán**: deja de ser "rango de
  sabiduría" -- mide capacidad de atracción/conversión de red (QR
  compartido, visitantes convertidos en miembros/Especialistas/
  Expertos/Programas/Corporaciones).

### `lib/escalas.ts` + `components/EscalaEditor.tsx`

- `parseImportedEscala(raw: string): EscalaItem[]` (nuevo, puro,
  testeado 100%): lee un array JSON pegado a mano y lo normaliza al
  shape `EscalaItem`, aceptando TANTO el shape interno
  (key/nombre/subtitulo/icono/color/descripcion) COMO el que devuelve
  un LLM al que se le pide la estructura en español con tildes
  (Clave/Nombre/Subtítulo/Ícono/Descripción) -- exactamente lo que
  Gunnar pegó en el chat para Medallón de Resultados/Imán. Si falta la
  Clave, la deriva slugificando el Nombre. `EscalaEditor` suma un
  `AccordionAddRow` "Importar JSON (reemplaza toda la escala)" con un
  textarea + botón -- pegar el bloque una vez reemplaza tipear 8-14
  niveles a mano ("hacerlo manual es tardado", palabras de Gunnar).
- Gap real encontrado y cerrado: el campo Color del editor estaba
  OCULTO para `type==="rank"` (`type !== "rank" &&`) -- Sabiduría/Imán
  no tenía forma de setear color en absoluto, aunque `EscalaItem.color`
  siempre existió en el modelo de datos. Ahora el leading indicator es
  igual para los 3 tipos: círculo de `item.color` con el ícono adentro
  (mismo patrón `TIER_DOT` que ya usaba la tarjeta pública), con
  `title={item.descripcion}` como tooltip nativo al pasar el mouse
  (pedido de Gunnar: "esto en el dashboard.. las descripciones cuando
  paso el mouse por arriba").

### `app/admin/programs/[id]/page.tsx` -- sección "Categorización"

Las 4 `AccordionSection` sueltas (Escalera de Puestos, Escala de
Medallón, Escala de Sabiduría, Escala de Gente Contactada) -- que
antes tenían, sin ninguna razón de negocio, "Horarios de Entrevista"
metido justo en el medio -- pasan a vivir DENTRO de una sola
`AccordionSection` exterior titulada "Categorización". Horarios de
Entrevista se movió afuera, después del bloque entero (es agenda, no
gamificación). Puro reordenamiento de JSX + un wrapper nuevo, cero
cambio de lógica en cada editor interno.

### `components/LyCardView.tsx` -- grilla real + selección en el modal

- `app/c/[slug]/page.tsx`: `PROGRAM_INCLUDE` suma `puestos: { orderBy:
  { order: "asc" } }` -- antes el query de la Card pública solo traía
  el Puesto YA asignado (`card.puesto`), nunca el roster completo del
  Programa. Ahora `program.puestos` viaja completo hasta `LyCardView`
  (tipo actualizado en `CardCarousel.tsx` y `LyCardView.tsx`).
- `BADGE_ICON_EXAMPLES` fue borrado. En su lugar, `tierTilesByModal`
  construye, para cada uno de los 4 modales, la lista REAL de niveles
  (Puesto[] para "od", `EscalaItem[]` para los otros 3) con la misma
  forma de tile: ícono+color, nombre, subtítulo, descripción completa,
  y si es el nivel actual de ESTA Card. El modal ya no dice "acá hay
  ejemplos" -- dice literalmente lo que el N0 armó, con su descripción
  entera visible (pedido de Gunnar: "se muestre la descripcion y todo
  el detalle de cada Nivel").
- `setCardTierAction` (nuevo, `app/c/card-tier-actions.ts`): tocar
  cualquier tile que no sea el actual llama esta server action
  (`Card.medal`/`rank`/`contacts`/`puestoId`), gateada igual que
  `puestos-actions.ts` (`currentAdminScope` + `canAccessProgram` --
  nunca confía en el `isAdmin` del cliente, lo vuelve a chequear
  server-side) y valida que el valor elegido exista de verdad en la
  escala/roster del Programa antes de guardar. `isAdmin` en el cliente
  solo decide si el tile se ve tocable (`role="button"`, `cursor:
  pointer`) -- un visitante anónimo puede leer todo pero tocar no hace
  nada (ni red ni DB).
- Alcance de esta vuelta, confirmado con Gunnar antes de construir
  (AskUserQuestion): SOLO selección desde el modal. Editar color/
  ícono/nombre/descripción sigue viviendo en el dashboard -- hacerlo
  también desde el modal público de la tarjeta habría significado
  duplicar el `EscalaEditor` entero ahí, mucho más superficie para lo
  que quedaba de sesión.

### Verificación

`npx tsc --noEmit` limpio. `pnpm lint` sin errores nuevos. `lib/escalas.ts`
suma a la puerta de cobertura (`vitest.config.mts`) con
`lib/__tests__/escalas.test.ts` nuevo, 100% líneas/branches/funciones.
`pnpm build` limpio. E2E nuevo `e2e/categorizacion.spec.ts` (4 tests:
Medallón de Resultados muestra los niveles reales y el N0 reasigna,
Medallón de Imán idem, O.D. idem con el roster de Puesto, y un
visitante anónimo lee todo pero no logra reasignar nada). Suite
Playwright completa 48/48 verde, cero regresiones.

## 2026-10-04 -- Imán Badge + Badge de Valor (v1.71.1, corrección de nombres sobre lo recién shippeado)

Apenas vio v1.71.0 en vivo, Gunnar corrigió dos nombres sobre la
marcha: "el Medallon de iman no es medallon es un Badged.. es Iman
Badged" -- y el badge a la izquierda del nombre (hasta ahora "Escala
de Gente Contactada"/Contactos) "tiene que ver con cantidad de valor
creado.. o de ventas realizadas.. o en el caso de legacy.. en gemelos
digitales legacies creados a recomendacion del host".

- **Imán Badge** (antes "Medallón de Imán", 2026-10-04 más temprano):
  puro rename de terminología -- sigue siendo exactamente el mismo
  `type="rank"` (Card.rank, Program.rankScale), cero cambio de
  mecánica. "Medallón" queda reservado para Resultados, que sí es un
  medallón de verdad.
- **Badge de Valor** (antes "Escala de Gente Contactada"/`type=
  "contacts"`): deja de medir "gente contactada" -- mide el valor de
  negocio real que generó el N0 (ventas cerradas, referidos
  convertidos, o en Legacy: Cards nuevas nacidas por su recomendación).
  Antes de construir se le preguntó a Gunnar si esto necesitaba un
  CONTADOR automático real (leer referidos de verdad desde
  ProgramMembership) o el mismo mecanismo manual que Resultados/Imán
  Badge -- eligió manual ("igual que los otros 2"), así que el alcance
  quedó acotado: mismo `EscalaEditor`/`parseImportedEscala` de siempre,
  solo cambia el texto (i18n `contactsIntro`/`valueKicker`/`valueBody`/
  `valueMeta`/`valueMetaEmpty` nuevos, reemplazan el viejo framing
  "Simulado" + sufijo hardcodeado "· Contactados" en el `head` del
  modal). Ícono default del editor para este tipo pasa de `groups` a
  `payments` (ya no es "gente", es valor/ventas). Un contador real
  sobre ProgramMembership queda documentado como fase aparte, no
  entra en esta vuelta.

Verificación: `npx tsc --noEmit` limpio, `pnpm lint` sin errores
nuevos (mismos 11 warnings preexistentes), `pnpm test:unit:coverage`
263/263 al 100% (sin cambios en `lib/`, puro rename de copy/UI),
`pnpm build` limpio. `e2e/categorizacion.spec.ts` actualizado (aria-
label "Imán Badge") y pasando. Suite Playwright completa 48/48 verde.

## 2026-10-04 -- Tercer rename + reorden de Categorización (v1.71.2)

Gunnar, mirando la tarjeta real: "necesito le pongas los nombres
correctos a las medallas y bugdess.. y que tambien la ordenes dentro
de la categorizacion. vamos de izquierda a derecha.. Medalla KPIs,
Placeholder Nombre Completo, Medalla Rango luego abajo es el cv y
abajo del cv es el Badget de Puestos.. y luego el de Rangos."

Mapeo final (posición en la tarjeta → nombre → campo interno, sin
cambios de schema en ninguno de los 3 renames de esta sesión):

| Posición en la tarjeta | Nombre final | Antes (v1.71.1) | Campo interno |
|---|---|---|---|
| Dot a la izquierda del nombre | **Medalla KPIs** | Badge de Valor | `type="contacts"` |
| Dot a la derecha del nombre | **Medalla Rango** | Medallón de Resultados | `type="medal"` |
| 1er botón, fila de abajo | **Badge de Puestos** | Escalera de Puestos | `Puesto` (modal "od") |
| 2do botón, fila de abajo | **Badge de Rangos** | Imán Badge | `type="rank"` (modal "ancient") |

- `components/LyCardView.tsx`: los 4 `aria-label` de los botones/dots
  en la tarjeta pública se actualizaron a los nombres finales.
- `lib/i18n.ts`: `valueKicker`/`medalKicker`/`ancKicker` (los textos
  que ven en el modal cuando el nivel actual no trae su propio
  `subtitulo`) renombrados igual, ES y EN. El contenido de fondo
  (`contactsIntro`/`medalIntro`/`ancIntro`, qué mide cada uno) no
  cambió -- esto es solo el nombre de la etiqueta, no el concepto.
- `app/admin/programs/[id]/page.tsx`: las 4 `AccordionSection` dentro
  de "Categorización" se renombraron Y se reordenaron para que el
  orden de lectura del dashboard coincida con el de la tarjeta real
  (antes era Puestos → Medallón → Imán Badge → Contactos, sin
  relación con cómo se ven en la tarjeta).
- `e2e/categorizacion.spec.ts`: los `aria-label` que usan los tests
  para abrir cada modal se actualizaron a los nombres finales.

Verificación: `npx tsc --noEmit` limpio, `pnpm lint` sin errores
nuevos (mismos 11 warnings preexistentes), `pnpm test:unit:coverage`
263/263 al 100% (sin tocar `lib/`), `pnpm build` limpio. Suite
Playwright completa 48/48 verde, cero regresiones.

## 2026-10-04 -- "Mi camino" (Legacy) abre el modal de Info (v1.72.0)

Gunnar: "ahora vamos con el boton de Mi Camino.. que ahora es el
boton de mas informacion sobre legacy.. quiero que al picar ese boton
salga el modal que sale ahora en el que dice Info.. el mismo."

En una Card de proyecto (Legacy), el botón "Mi camino" dejó de abrir
su propio modal (storyKicker/storyHead/storyBody, la frase fija
"«Descubrí en Legacy una forma de trascender.»") y ahora abre el
mismo modal rico de "Info" que ya existe más abajo en la tarjeta
(`modal === "info" && isProject`, con `infoTitle`/`infoP1`/`infoP2`/
pil1-3/`legacyPass`). `components/LyCardView.tsx`:
`onClick={() => setModal(isProject ? "info" : "story")}` -- un solo
ternario, scoped a `isProject`. Company y personal siguen con su
"Mi camino con la Empresa"/"Mi Viaje" real de siempre (su propio
modal `story`, sin tocar). El label visible del botón ("Mi camino")
no cambió -- Gunnar solo pidió el redirect de destino, no el texto;
se ajusta en una vuelta aparte si lo pide.

Verificación: `npx tsc --noEmit` limpio, `pnpm lint` sin errores
nuevos. Test nuevo en `e2e/public-card.spec.ts` ("Mi camino (Legacy):
abre el mismo modal de Info, no el de Mi Camino") confirma que
aparece el texto real de Info (`infoTitle`) y NO aparece el texto de
Mi Camino. `pnpm test:unit:coverage` 263/263 al 100% (sin cambios en
`lib/`), `pnpm build` limpio. Suite Playwright completa 49/49 verde.

## 2026-10-04 -- Botones del Podio + Bóveda Legacy + Agente de IA a medida (v1.73.0)

Gunnar: "habiamos trabajado en nuestro plan inicial la idea de poder
elegir desde el dashboard de cada programa los Botones que ibamos a
colocar abajo.. para esto tenemos que tener opciones de botones en el
dashboard.. son 3 botones.. los laterales pequeños y el principal
grande.. el N0 decide que poner alli.. en el caso del programa de
Legacy.. quiero poner un boton de Bobeda Legacy.. o Legacy Vault.. y
ahi poner la informacion de lo que teniamos de la informacion del
N0.. el link a su notebooklm.. eso ya lo habiamos echo.. quedo para
Rogelio.. buscalo.. lo quiero ahi.. y en el dashboard.. que me de
posibilidad de elegir entre eso, el Info actual, el modal simple que
estaba en el camino, el Enviar Invitacion Especial y uno mas en donde
me permita con apoyo de un agente especialista dedicado.. poder crear
otras funcionalidades con ia."

Aclarado con 3 preguntas antes de construir: la fila que se vuelve
configurable es el podio de la tarjeta principal en `/c/[slug]`
(`LyCardView.tsx`), NO la fila de Oficina Virtual (Gemelo
Digital/WowHead/BirdBrain, esa sigue fija); el cubo del CENTRO queda
fijo en el QR real (host) / funnel "Creá tu Card" (no-host) -- solo
los 2 cubos LATERALES son elegibles; y el agente de IA se construye
"funcional de verdad" esta vuelta (Gunnar rechazó explícitamente la
opción de dejarlo como placeholder).

### Schema (`prisma/schema.prisma`, migración `podium_buttons_vault`)

```prisma
model Program {
  ...
  podiumButtons       Json   @default("[]")  // PodiumButtonConfig[]
  vaultTitle          String @default("Bóveda Legacy")
  vaultPalabraSecreta String @default("")
  vaultCuadernoUrl    String @default("")
  vaultSources        Json   @default("[]")  // VaultSource[]
}
```

### `lib/podiumButtons.ts` (100% cobertura)

`PodiumButtonKind = "info" | "story" | "invite" | "vault" | "ai_agent"`.
`parsePodiumButtons`/`getPodiumButton`/`upsertPodiumButton` (reemplazo
por slot, mismo patrón que `medalScale`/`officeSkills` pero granular
por lado porque el form del dashboard edita un cubo a la vez).
`parseVaultSources` para `VaultSource[]` (`type: "link"|"texto"`,
`label`, `value`).

### Dashboard (`app/admin/programs/[id]/page.tsx`)

Dos secciones nuevas en el acordeón: "Botones del Podio" (un
`PodiumSlotEditor` por lado, `<select>` con las 5 opciones +
sub-formulario de IA cuando el kind es `ai_agent`) y "Bóveda Legacy"
(título, palabra secreta opcional, link de cuaderno,
`VaultSourcesEditor` para las fuentes). `setPodiumButtonAction`/
`updateVaultAction` en `app/admin/programs/podium-actions.ts`.

### Tarjeta pública (`components/LyCardView.tsx`)

`resolvePodiumKind()` resuelve, por slot, el kind configurado o el
default de SIEMPRE si no se configuró nada (Info a la izquierda,
Enviar Invitación a la derecha para el host) -- un Programa que nunca
toca este dashboard nuevo no cambia un píxel de lo que ya tenía.
`"invite"` sigue siendo host-only sin importar en qué slot se puso
(hallazgo de PASO 5): un visitante que lo vea cae al fallback propio
de ESE slot, no a un invite roto. El modal de Bóveda reusa el mismo
gate de palabra secreta que "Info [nombre]" (generalizado para leer
`Program.vaultPalabraSecreta` cuando `modal==="vault"`), visible para
cualquier visitante -- no es gestión interna, a diferencia de
"invite".

### Decisiones de alcance (disclosed, no pedidas explícitamente)

- **Bóveda Legacy es independiente de la Card de Rogelio**: en vez de
  enganchar al `CardRecipient` puntual que ya existía para Rogelio, se
  construyó como campos de Programa genéricos -- cualquier Programa
  puede activar su propia Bóveda, no solo el que tiene a Rogelio
  cargado. Mismo contenido conceptual, otra arquitectura.
- **Fuentes de la Bóveda**: solo `link` y `texto`, sin archivo (a
  diferencia de `CardRecipientSource` que sí soporta `archivo`) --
  evita construir storage nuevo a nivel Programa esta vuelta.
- **El modal de Bóveda NO incluye** el Códice PDF de ejemplo, el CTA
  "Crear mi Gemelo Digital" ni el texto de "Cómo la usamos" que sí
  tiene el dossier de destinatario -- eso es contenido promocional de
  ESE flujo puntual, no de la Bóveda genérica.

### Agente de IA (`lib/aiAgent.ts` + `app/admin/programs/ai-agent-actions.ts`)

`@anthropic-ai/sdk`, modelo `claude-opus-5-5`, `output_config:{effort:
"low"}`. El N0 escribe un pedido en lenguaje natural, el agente
devuelve `{title, icon, body}` (JSON validado a mano en
`parseAiAgentResponse`, con un regex de rescate si el modelo mete
texto alrededor del JSON). Sin `ANTHROPIC_API_KEY`, o si la cuenta no
tiene crédito cargado, la acción devuelve honestamente
`not_configured`/`failed` en vez de inventar una respuesta -- mismo
criterio que "Simulado" en WowStore. Gunnar pidió explícitamente
dejar esta pata para después ("saltemonos el tema del agente de ia..
haz lo de los botones.. que sea configurables.. con las opciones que
tenemos ya") -- la opción queda armada y seleccionable en el picker,
honesta sin crédito, pero no es el foco de esta entrega.

### Verificación

`npx tsc --noEmit` limpio, `pnpm lint` sin errores nuevos, `pnpm
test:unit:coverage` 100% (292/292, suma `lib/podiumButtons.ts` +
`lib/aiAgent.ts`), `pnpm build` limpio. `e2e/podium-vault-ai.spec.ts`
nuevo (6 tests): default sin configurar idéntico a antes, el N0 elige
Bóveda Legacy desde el dashboard y la tarjeta la muestra con gate real
(palabra incorrecta rechazada, correcta abre fuentes + "Abrir mi
cuaderno"), un visitante anónimo también puede abrirla (no es
host-only), "Modal simple" abre el contenido viejo de "Mi camino" sin
chocar con el redirect a Info de Legacy (v1.72.0), y el Agente de IA
siempre devuelve una respuesta honesta (nunca silencio, nunca
contenido inventado) tanto desde el dashboard como en el fallback
público. Al correr el E2E completo aparecieron 2 bugs reales,
corregidos: el botón "Guardar" de `PodiumSlotEditor` no tenía texto
distintivo y rompía un test preexistente de `photo-positioner.spec.ts`
(ahora "Guardar Botón"); y el Prisma Client del server de dev quedó
stale en memoria tras la migración (requirió reiniciar el proceso).
Suite Playwright completa 55/55 verde.

## 2026-10-04 -- Bóveda Legacy: Documento de Bienvenida completo, no fuentes+cuaderno (v1.73.1)

Gunnar, después de ver la v1.73.0 shippeada: "tenemos que revisar bien
lo de la boveda" -- compartió el PDF real del "Documento de
Bienvenida" (el que se armó para Rafael Rico Carrascosa) y el link
vivo de la tarjeta de Rogelio (`/c/mastern0?para=rogelio`), y pidió:
"mira esto que hicimos para rogelio.. quiero usar lo mismo para el
modal que te dije de Boveda."

Al revisar el código, "Deja tu Legado" (`modal === "legado"`, PASO 5,
2026-10-02) YA es ese documento completo -- Carta de Apertura +
Capítulos I-VII, calcado del PDF real -- pero vive atado a un
`recipient` (necesita un link `?para=`). La Bóveda Legacy que se
shippeó en v1.73.0 en cambio tenía contenido propio y mucho más chico
("Qué información usamos" + fuentes + "Abrir mi cuaderno"), sin
relación con ese documento. Gunnar señaló correctamente que eso no
era "lo mismo".

Corrección: todo el JSX del Documento de Bienvenida se extrajo a un
componente propio, `DocumentoBienvenida({ nombre })`
(`components/LyCardView.tsx`) -- recibe un solo dato variable
(el resto, capítulos I/II/III/IV/VII + "antes de empezar" + roles
propuestos, es boilerplate fijo del programa, ya generalizado con
`nombre` desde que se escribió). "Deja tu Legado" pasa a ser
`<DocumentoBienvenida nombre={recipient.nombre} />` (sin cambio de
comportamiento). La Bóveda Legacy ahora renderiza el mismo componente
con `nombre={recipient?.nombre ?? card.name}` -- sin destinatario,
"Preparado exclusivamente para" usa el nombre de la Card. Las fuentes
y el link de cuaderno NO se sacaron: quedan como sección aparte,
debajo del documento (decisión propia, no pedida explícitamente: el
pedido original de Gunnar de "el link a su notebooklm" sigue
sirviendo, y no contradice "usar lo mismo" -- es sumar, no reemplazar).

Verificación: `npx tsc --noEmit` limpio, `pnpm lint` sin errores
nuevos, `pnpm test:unit:coverage` 292/292 al 100% (sin tocar `lib/`).
`e2e/podium-vault-ai.spec.ts` ampliado: la Bóveda ahora confirma que
aparecen "Documento de Bienvenida · Edición Personal", "Preparado
exclusivamente para [nombre de la Card]", "Carta de apertura" y "El
Códice", además de la fuente y el cuaderno de siempre. `pnpm build`
limpio. Suite Playwright completa 55/55 verde (Postgres local se
había caído entre rondas -- se reinició el servicio, nada que ver con
el código). Deploy a producción, cero errores runtime nuevos.

## 2026-10-04 -- Corrección final de la Bóveda: es "Info Rogelio", no "Deja tu Legado" + se sacó el gate (v1.73.2)

Gunnar, viendo v1.73.1 en producción: "espera.. no esta bien.. la
Boveda es lo que en la tarjeta de rogelio dice Info Rogelio.. esa es
la boveda.. ahi se explica que informacion tenemos de Rogelio y como
se usa.. bueno es lo mismo pero para todos.. mismos componentes." Y
agregó: "cuando le pico ahi, me pide una palabra clave.. creo que esa
palabra clave debe estar inicialmente cuando rogelio recibe la
invitacion especial.. quitalo porfa.. luego vemos donde y como lo
usamos."

Confusión real de esta sesión: hay DOS botones de contenido rico en la
Card de un destinatario -- "Deja tu Legado" (el Documento de
Bienvenida, Carta de Apertura + 7 capítulos, PASO 5) y "Info [nombre]"
(el dossier del Códice: qué información se usa, cómo, metodología,
fuentes, cuaderno, PASO 4). v1.73.1 calcó la Bóveda sobre el primero
por error -- Gunnar señaló que el que corresponde es el segundo.

Corrección: todo el JSX de "Info [nombre]" se extrajo a
`CodiceDossier({ sources, cuadernoUrl, borradoHref })`
(`components/LyCardView.tsx`) -- genérico, no depende de `recipient`.
"Info [nombre]" pasa a usarlo con `recipient.sources`/
`recipient.cuadernoUrl` (mismo comportamiento de siempre). La Bóveda
Legacy lo usa con `vaultSources`/`program.vaultCuadernoUrl` en vez del
Documento de Bienvenida que tenía en v1.73.1 (ese queda exclusivo de
"Deja tu Legado", sin tocar). Además, el gate de palabra secreta
(`infoNeedsGate`/`infoUnlocked`/`submitInfoSecret` y toda su UI) se
eliminó por completo de los dos botones -- el campo `palabraSecreta`/
`vaultPalabraSecreta` sigue existiendo en la DB y en el dashboard
(Destinatarios / Bóveda Legacy), simplemente ya no bloquea nada acá;
Gunnar lo va a reusar en otro punto del flujo (probablemente el
momento en que Rogelio recibe la Invitación Especial) en una vuelta
aparte.

Verificación: `npx tsc --noEmit` limpio (cero referencias colgantes al
gate eliminado), `pnpm lint` sin errores nuevos, `pnpm
test:unit:coverage` 292/292 al 100%. `e2e/podium-vault-ai.spec.ts`
reescrito: confirma que la Bóveda muestra "Qué información usamos" /
"Cómo la usamos" / "Nuestra metodología" (no el Documento de
Bienvenida) y que NI el host NI un visitante anónimo ven el prompt de
palabra secreta al abrirla. `pnpm build` limpio. Suite Playwright
completa 55/55 verde. Deploy a producción, cero errores runtime
nuevos.

## 2026-10-05 -- Editor de Modales: bloques libres, piloto en Bóveda Legacy (v1.74.0)

Gunnar, después de dos vueltas de corrección sobre la Bóveda: "vamos a
hacer algo mejor.. se me ocurre que podamos crear un editor de
modales.. podemos tener en el dashboard.. Todos los Modales de cada
boton o badget con capacidad de editarlos.. no solo el contenido sino
tambien los elementos.. por ejemplo si se muestra un video, o un
audio, o un archivo, o un texto.. haz de cuenta que es como el editor
de un formulario.. ahorita nuestro dashboard con respecto a como
acomodamos los elementos y la edicion del contenido de los modales
esta horrible."

Antes de construir, se acordó el alcance con 3 preguntas: (1) esta
vuelta aplica solo a modales de CONTENIDO PURO (Info, Bóveda,
Documento de Bienvenida, "Mi camino") -- los selectores de nivel
(Medalla/Rangos/Puestos) quedan con su editor actual (EscalaEditor),
porque no son contenido libre: cada tile mueve un campo real de la
Card al tocarlo; (2) tipos de bloque para esta ronda: Texto, Imagen,
Video/Audio, Archivo/botón-link y KPI -- Preguntas/Encuestas (también
pedidas) quedan para una fase aparte porque necesitan guardar
RESPUESTAS de visitantes (un modelo de DB + vista de resultados en el
dashboard), no solo mostrar contenido; (3) reorden con flechas
arriba/abajo, no drag&drop (más simple, más confiable en mobile).

Piloto de esta vuelta: solo la **Bóveda Legacy** usa el sistema nuevo
-- es el modal más "en blanco" y el que se venía iterando. Si el
patrón funciona bien, se extiende a Info/Documento de
Bienvenida/story en una vuelta futura.

### `lib/modalBlocks.ts` (100% cobertura)

`ModalBlockKind = "texto"|"imagen"|"video_audio"|"archivo_link"|"kpi"`.
`ModalBlock` -- shape plano (todas las columnas existen siempre, cada
kind usa las que le importan), mismo criterio que `PodiumButtonConfig`.
`parseModalBlocks` + `isEmbedVideoUrl`/`toEmbedVideoUrl` (detecta
YouTube/Vimeo por dominio y los convierte a URL de embed para
`<iframe>`; un archivo directo cae a `<video>`/`<audio>` nativo).

### Schema (`prisma/schema.prisma`, migración `modal_blocks`)

`Program.vaultBlocks Json @default("[]")` reemplaza `vaultSources` +
`vaultCuadernoUrl` -- ambos eran, en el fondo, un tipo de bloque cada
uno (nota de texto/link, y un botón-link fijo), ahora unificados en un
solo array libre.

### `components/ModalBlocksEditor.tsx` (dashboard)

Array editado a mano (hidden input con el JSON completo), mismo patrón
que EscalaEditor/el extinto VaultSourcesEditor -- `AccordionRow` por
bloque, `<select>` de kind con campos condicionales, flechas
↑/↓ + botón de borrar, "+ Agregar bloque" al final.

### `components/ModalBlocksRenderer.tsx` (público)

Switch puro por kind -- texto (título+párrafo), imagen (`<img>` +
leyenda), video_audio (`<iframe>` embed si es YouTube/Vimeo, sino
`<video>`/`<audio>` nativo), archivo_link (botón estilo "Abrir mi
cuaderno" de siempre), kpi (número grande + etiqueta + aclaración).

### Wiring

`app/admin/programs/podium-actions.ts` (`updateVaultAction`) ahora
parsea `vaultBlocks` en vez de `vaultSources`/`vaultCuadernoUrl`.
`app/admin/programs/[id]/page.tsx` cambia `VaultSourcesEditor` por
`ModalBlocksEditor` en la sección Bóveda Legacy.
`components/LyCardView.tsx`: la rama `modal === "vault"` pasa de
`<CodiceDossier>` (fijo) a `<ModalBlocksRenderer blocks={vaultBlocks}>`
-- el contenido es 100% lo que el N0 armó, sin texto fijo de ningún
tipo. `CodiceDossier` sigue existiendo, usado solo por "Info [nombre]"
(sin cambios, fuera del alcance de esta vuelta).

### Verificación

`npx tsc --noEmit` limpio, `pnpm lint` sin errores nuevos (mismo patrón
de warning `_uid` que ya tienen EscalaEditor/OfficeSkillsEditor/etc),
`pnpm test:unit:coverage` 301/301 al 100% (`lib/modalBlocks.ts` nuevo).
`e2e/podium-vault-ai.spec.ts` reescrito: el N0 arma un bloque de texto
+ uno de archivo-link desde el dashboard, guarda, y la tarjeta pública
muestra exactamente eso -- nada fijo, ni "Qué información usamos" ni
el Documento de Bienvenida de rondas anteriores. `pnpm build` limpio.
Suite Playwright completa 55/55 verde.

## 2026-10-05 -- Viaje del cliente: taxonomía de visitantes (v1.75.0)

Pedido textual de Gunnar, en 2 mensajes. Primero reportó un bug real:
*"intenté que el QR de mi tarjeta del programa Legacy la escaneara
Juancho.. para que cree le programa de Digital Kingdom pero no pudo"*,
y propuso una taxonomía de 4 tipos de tarjeta (NA/visitante sin host,
Invitado Especial, visitante con QR, usuario self-service). Después,
pidió simplificar: *"quiero tener claro el 'viaje del cliente'
pensando de alguien que se tropieza con la tarjeta.. es lo que hicimos
de Miron, Visitante, Vividor, Chido, Chido+, Chido++..."* -- y tras una
tabla de reconciliación entre ambos pedidos (propuesta y aceptada),
dio luz verde con *"Vale.. hazlo todo"*.

### Diagnóstico del bug (antes de tocar código)

`lib/legacyMembership.ts#ensureLegacyMembershipAndCards` está
hardcodeado a `program.slug === "legacy"` -- cualquier alta self-service
(sea cual sea la Card que refirió) siempre cuelga de Legacy, nunca crea
ni liga un Programa nuevo. El ÚNICO camino real que crea un Programa
nuevo es la promoción automática Chido→Programa
(`lib/programPromotion.ts`, ya existente, PLAN.md "Modelo de
monetización cerrado") -- invisible, sin disparador self-service, y sin
ningún campo de linaje. Conclusión: "Digital Kingdom" casi seguro se
creó a mano por `/admin/programs` (`createProgramAction`, antes sin
ningún link a Legacy) -- de ahí que "no se liguen".

### Lo construido (las 4 piezas, en el orden que resuelve esto)

**1. Linaje de Programas** -- `Program.originProgramId` (self-relation,
nullable, `onDelete: SetNull`). `promoteToPrograma()` lo setea solo al
Programa de origen de la membresía promovida (`candidate.programId`).
Dropdown opcional "Programa de origen" en el form de creación de
`/admin/programs`, y una sección "Linaje" (MasterN0-only) en
`/admin/programs/[id]` para linkear retroactivamente un Programa
existente (`setProgramOriginAction`) -- resuelve a Digital Kingdom sin
tocar su historia.

**2. Botón self-service "Convertir en Programa"** -- NO relaja el gate
de monetización que Gunnar ya diseñó (pagó + 1 referido activo); lo
hace visible y autoservible. `getPromotionStatus(memberId)`
(`lib/programPromotion.ts`) calcula el estado real; en `/m/dashboard`,
si no está promovido todavía, una sección honesta: elegible -> botón
real (`convertToProgramaAction`, re-chequea del lado del servidor antes
de llamar `checkAndPromoteToPrograma` -- nunca un atajo); no elegible
-> lista exactamente qué falta ("pagar tu membresía" / "conseguir al
menos 1 referido activo (hoy: N)").

**3. Gate de palabra secreta a nivel de CARD COMPLETA** para
Invitado/Visitante Especial -- distinto del gate de MODAL que se sacó
en una ronda anterior de esta misma sesión (ver v1.73.2, "quitalo
porfa"). Ahora, si `?para=<slug>` resuelve un `CardRecipient` con
`palabraSecreta` no vacía y el visitante no es host, `app/c/[slug]/
page.tsx` renderiza `<RecipientGate>` (pantalla entera, sin branding del
Programa) ANTES que `LyCardView` -- nunca lo salta. Desbloqueo vía
`lib/recipientAuth.ts` (mismo patrón JWT-en-cookie que
`lib/memberAuth.ts`, pero scoped al `CardRecipient.id`, no a un Member:
el visitante puede no tener cuenta todavía). `app/c/recipient-gate-
actions.ts` (archivo nuevo, separado a propósito de
`app/c/recipient-actions.ts` -- ese es el CRUD interno del dashboard,
este es el gate público).

**4. Pantalla Mirón/NA** -- antes, `/` sin ningún Card en la DB
redirigía a `/admin/login` (bootstrap, sin cambios), pero CON Cards
redirigía ciego a la más vieja de toda la base -- ni remotamente una
experiencia real para "alguien que llegó por algún motivo sin host".
Ahora `app/page.tsx` muestra `<MironLanding>`: genérica, explícitamente
NO editable, con dos caminos reales en vez del QR de siempre (que no
tiene sentido sin host del que venir): un escáner de cámara real
(`components/QrScannerLauncher.tsx`, `jsQR` -- elegido sobre la
`BarcodeDetector` nativa del navegador porque esa API no corre en
Safari/iOS, y la audiencia documentada de LyCard es mayoría iPhone) o
una lista de Programas activos con al menos una Card real (nunca un
link muerto).

**Nota aparte, ya resuelta sin tocar nada**: el cubo central "Crea Tu
LyCard" para un visitante no-host (casos "Invitado Especial" y
"visitante con QR" de Gunnar) YA estaba construido de una ronda anterior
(`LyCardView.tsx`, `isHost ? <QR> : <Link href="/m/login?ref=...">`) --
confirmado al leer el código, no se dupicó.

### Verificación

`npx tsc --noEmit` limpio, `pnpm lint` sin errores nuevos,
`pnpm test:unit:coverage` 302/302 al 100%, `pnpm build` limpio.
`e2e/viaje-del-cliente.spec.ts` (nuevo): la raíz sin host muestra la
pantalla Mirón con el botón de escanear; el gate de Invitado Especial
rechaza la palabra incorrecta, acepta la correcta, y la cookie persiste
tras recargar; el botón self-service dice honestamente qué falta sin
cumplir el umbral, y promueve de verdad (con linaje a Legacy
confirmado en DB) al cumplirlo -- 4/4 verde. Suite Playwright completa
corrida de punta a punta sin regresiones.

## 2026-10-05 -- 2 fixes de iPhone 13 appweb: notch en TODO /admin/* + espacio muerto al pie (v1.75.1)

Gunnar, tras probar v1.75.0 en su iPhone 13 en modo appweb (PWA
instalada): *"en el dashboard.. en todo los menus.. hay un problema en
el diseño.. la parte de arriba el menu principal de arriba se esconde
debajo de la pantalla y no puedes acceder a el.. revisalo.. por otro
lado sigue existiendo un espacio importante en la parte de abajo de la
pantalla de la lycard.. revisalo..es un iphone 13.. y esta funcionando
en modo appweb"*.

### Bug 1 -- menú tapado por notch/isla dinámica, en TODO /admin/*

El fix original (v1.63.x, "Fix: menú superior del Dashboard tapado por
notch/isla dinámica") solo había tocado `MemberCardEditor.tsx` (el
dashboard del Member) y dos páginas más
(`app/c/[slug]/oficina/page.tsx`, `app/m/dashboard/company/network/
page.tsx`) -- confirmado grepeando `position: "sticky"` en todo el
proyecto. Quedaron afuera, con el mismo bug exacto (`top:0` sin
compensar `env(safe-area-inset-top)`, así que el header sticky queda
literalmente debajo del notch/isla, intocable en standalone):

- Las 11 páginas de `/admin/*`: roster (`page.tsx`), `programs/page.tsx`,
  `programs/[id]/page.tsx`, `interviews`, `janus`, `nashmesh`, `equipo`,
  `wowstore`, `account`, `login-history`, `reset`, `demo-data`.
- `components/EditorForm.tsx` (editor de Card de proyecto, usado desde
  `/admin/[slug]`) y `components/MemberStoryEditor.tsx`.

Mismo arreglo en los 14: el padding del header sticky pasa a
`calc(env(safe-area-inset-top,0px) + Npx) ...` -- en los 3 que tenían
`height: 64` fijo (`login-history`, `account`, `EditorForm.tsx`), se
cambia por padding compensado (igual que ya hacía `MemberCardEditor.tsx`,
`box-sizing: border-box` global hace que agregar padding-top a una
altura fija la hubiera encogido mal).

### Bug 2 -- espacio muerto al pie de la LyCard, pese al fix anterior

El fix de v1.68.2/v1.69.x (`appVh` medido con `visualViewport.height`
sobre `window.innerHeight`, con relectura a los 300ms) seguía sin
resolverlo. Causa más probable, no verificable sin un iPhone real:
`visualViewport.height` en standalone, en iPhones con home indicator
(sin botón físico, como el 13), puede venir MÁS CHICO que
`window.innerHeight` por el alto exacto de esa franja -- WebKit la
trataría como "overlay de sistema" a los fines de `visualViewport` ahí
aunque no tape nada visualmente. Preferir `visualViewport.height` (como
hacía el fix anterior) terminaba horneando ese faltante como la altura
real de la tarjeta.

Arreglo en `components/LyCardView.tsx` y `components/CardCarousel.tsx`
(mismo bug duplicado en los dos): la lectura ahora toma el **máximo**
de las dos fuentes (`Math.max(visualViewport.height, innerHeight)`) --
nunca puede dar menos que cualquiera de las dos, cubre el bug sea cual
sea el sentido real. Reforzado con una capa de respaldo en
`app/globals.css` (clase `.lycard-fullscreen`: `height: 100dvh; height:
-webkit-fill-available;` -- el fix clásico de WebKit para exactamente
este síntoma) aplicada vía `className` mientras el JS todavía no midió
nada (en vez del `"100dvh"` fijo de antes como fallback inline, que un
motor no-WebKit simplemente ignora si no entiende `-webkit-fill-
available`, quedándose con el `100dvh` normal).

### Verificación

`npx tsc --noEmit` limpio, `pnpm lint` sin errores nuevos, `pnpm build`
limpio, suite Playwright completa 59/59 verde (sin specs nuevos esta
vez -- cambios de CSS/layout puro, cubiertos por que nada de la suite
existente se rompió). **Disclosure honesto**: ninguno de los 2 bugs se
pudo verificar visualmente de verdad -- Chromium headless (el único
motor disponible en este sandbox) no simula `env(safe-area-inset-*)`
de un notch/isla dinámica real, a diferencia de WebKit/Safari. El
código sigue el mismo patrón ya confirmado funcionando por Gunnar en
el dashboard del Member: consistente, pero la prueba final la da su
propio iPhone.

## 2026-10-05 -- Fix: header de Roster Legacy desbordaba en iPhone + mockup del rediseño (v1.75.2)

Gunnar, probando v1.75.1 en su iPhone 13 appweb, siguiendo el flujo
completo (pantalla Mirón → eligió Legacy de la lista → tarjeta →
dashboard): *"ahora estoy en el dashboard.. ya se puede ver.. pero el
de roaster legacy no corre.. no puedo cambiar de pantalla.. y solo veo
a Janus."*

### Diagnóstico

`app/admin/page.tsx` (el roster, título "Roster Legacy" en su propio
header -- de ahí la referencia de Gunnar) tenía 6 botones pill
(Programas/Equipo/Janus/NashMesh/Entrevistas/Mi cuenta) + "Cerrar
sesión" en un único `<div style={{display:"flex", gap:8}}>` SIN
`flexWrap`. En un iPhone angosto eso desborda; `html,body{overflow-x:
hidden}` (global, `app/globals.css`) recorta lo que no entra, dejándolo
literalmente fuera de la pantalla e inalcanzable -- de ahí "solo veo a
Janus" (lo único que alcanzaba a entrar en la fila antes del corte).
Bug viejo, sin relación con los fixes de notch de v1.75.1 -- recién
visible porque era la primera vez que Gunnar probaba este flujo
completo en su propio teléfono.

Arreglo: `flexWrap: "wrap"` en el header (`app/admin/page.tsx`) y en su
bloque de nav, más el mismo `flexWrap` defensivo en el footer de
`app/admin/programs/page.tsx` (WowStore/Datos de Demo/Zona de Riesgo),
que tenía el mismo patrón sin confirmar si desbordaba en los anchos
más chicos.

### El pedido de fondo: rediseñar todo el dashboard

Mismo mensaje, Gunnar: *"creo qeu es importante rediseñar con Top1%
todo el dashboard.. esta muy complicado.. deberiamos Rediseñarlo para
que sea intuitivo.. puedes sugerir algo.. top1%?"*. Exploratorio, no
una orden de build -- se le devolvió una recomendación corta (barra de
navegación inferior fija con 4 destinos máximo + "Más" para todo lo
secundario, patrón mobile-first de Stripe/Notion/Linear) y, a pedido
de Gunnar ("hazme una imagen de ejemplo"), un **mockup real** (Artifact
tipo Design, 2 artboards lado a lado, Antes/Después, colores y
tipografía exactos de Legacy) -- el "Después" es interactivo de
verdad: tocar "Más" abre una hoja real que sube desde abajo con
Janus/NashMesh/Entrevistas/WowStore/Cuenta/Demo/Zona de
Riesgo/Cerrar sesión. Pendiente de luz verde antes de tocar código --
este PLAN.md no documenta ese rediseño como hecho, solo el mockup y
la propuesta.

### Verificación

`npx tsc --noEmit` limpio, `pnpm lint` sin errores nuevos, `pnpm build`
limpio, suite Playwright completa 59/59 verde.

## 2026-10-05 -- Mirón/NA: la Card Origen real, no una página aparte (v1.76.0)

Gunnar, mandando una captura de la pantalla Mirón/NA en su iPhone: *"Ok..
no se porque o para que sale esta página.. esto debería salir en vez del
qr en la tarjeta del visitante. El que viene de la nada."*

### Diagnóstico

v1.75.0 implementó Mirón/NA como una página bespoke
(`components/MironLanding.tsx`) con su propio copy/diseño ("Tu tarjeta,
tu legado", explicación genérica) -- leyendo otra vez el pedido
original de Gunnar, el texto literal siempre fue *"aqui abre la tarjeta
de Legacy"* (LA tarjeta, no una pantalla nueva). La implementación
original no reutilizó `LyCardView` porque la Card marcada `isOrigin`
siempre da host a CUALQUIERA (`isHost = isAdmin || card.isOrigin ||
...`, `app/c/[slug]/page.tsx`, decisión deliberada para que el QR real
de Legacy sea compartible sin sesión) -- renderizarla tal cual por la
ruta de siempre le habría dado modo edición completo a cualquier
visitante anónimo de la raíz, lo opuesto de "no puedes hacer nada".

### El fix real

`app/page.tsx` ahora busca la Card marcada `isOrigin` (fallback: la más
vieja de la base, mismo criterio pre-sesión) y la renderiza con el
mismo `LyCardView` de siempre -- mismo branding, mismos badges, mismo
contenido real -- pero pasándole `isHost={false}` `isAdmin={false}`
`isAuthenticatedOwner={false}` EXPLÍCITOS desde el padre (bypassea la
regla "isOrigin = host para todos" a propósito, solo para esta ruta).
Nuevo prop `naMode` en `LyCardView.tsx`: reemplaza el cubo central (QR
real para el host / "Crea Tu LyCard" para un visitante normal) por un
tercer cubo que abre un modal nuevo (`modal === "na"`, mismo sistema de
modales de siempre) con `QrScannerLauncher` (cámara real, ya existía)
+ la lista de Programas activos (`naPrograms`, misma resolución
company/project > personal que antes).

`buildCardBundle` + `PROGRAM_INCLUDE` se extrajeron de
`app/c/[slug]/page.tsx` a `lib/cardBundle.ts` (archivo nuevo) para que
`app/page.tsx` arme el mismo bundle real (qrSvg/badge/interviewSlots)
sin duplicar la lógica -- `app/c/[slug]/page.tsx` quedó más corto,
mismo comportamiento. `components/MironLanding.tsx` borrado (ya sin
uso).

### Verificación

`npx tsc --noEmit` limpio, `pnpm lint` sin errores nuevos, `pnpm build`
limpio. `e2e/viaje-del-cliente.spec.ts` reescrito: la raíz muestra el
nombre real de la Card Origen (no copy inventado), el ícono de arriba
manda a login (nunca a `/admin/[slug]`, confirmando que no es
editable), el cubo central abre el modal con el botón de escanear real
y la lista de Programas activos (fixture propio, `afterAll` limpio).
Suite Playwright completa corrida de punta a punta.

## 2026-10-06 -- Modal "[Programa] Card" editable con el Editor de Modales (v1.77.0)

Gunnar, satisfecho con la pantalla Mirón/NA, pasó al siguiente paso:
*"ahora necesito que trabajemos en la tarjeta basica.. en la que ve el
Visitante (el que llega de la nada).. lo primero que necesitamos hacer
es tener la posibilidad de editar cada uno de los modales... ej. en la
tarjeta basica.. tenemos en la parte superior el primer Modal que dice
Legacy Card.. bueno ese modal es necesario que tenga una explicacion
clara de que es la legacy Card.. Que hace para ti.. Tarjeta de
presentacion Virtual que te permite compartir tu contacto, informacion
y tu oficina virtual con otros de forma ASAP.. por ejemplo puede ser
buena explicacion.. y a lo mejor tambien agregar un pequeño manual de
Uso.. o un video para ello.. no se.. algo top1%"*.

"Lo primero" -- arranca por el modal "LyCard"/"[Programa] Card" (la
píldora de arriba, `modal === "cardInfo"` en `LyCardView.tsx`), con
más modales quedando para rondas futuras (no se tocó ningún otro modal
esta vuelta).

### Lo construido

Mismo Editor de Modales por bloques que ya probó su valor con la
Bóveda Legacy (`lib/modalBlocks.ts` -- texto, imagen, video/audio,
archivo-link, KPI) -- reusado, no reinventado:

- `Program.cardInfoBlocks` (schema nuevo, `Json @default("[]")`,
  mismo patrón que `vaultBlocks`).
- `updateCardInfoAction` (`app/admin/programs/podium-actions.ts`,
  junto a `updateVaultAction`).
- Sección nueva en `/admin/programs/[id]`: "Modal 'Qué es esta
  tarjeta'", mismo `ModalBlocksEditor` que la Bóveda.
- `LyCardView.tsx`: `cardInfoBlocks` parseado solo para Cards
  `kind:"project"` (las únicas con Programa real -- company/personal
  siguen con su copy fijo, fuera de alcance esta vuelta); nueva rama
  de render (`modal === "cardInfo" && cardInfoBlocks.length > 0`) con
  `ModalBlocksRenderer`; sin bloques, cae al texto fijo de siempre.
- Copy del fallback actualizado (`lib/i18n.ts`,
  `cardInfoProjectHead`/`Body`) con la explicación honesta que propuso
  Gunnar: *"Tarjeta de presentación virtual: te permite compartir tu
  contacto, tu información y tu Oficina Virtual con otros al instante,
  con un solo link."*

El "manual de uso o video" que Gunnar sugirió como idea ya está
cubierto por el sistema de bloques en sí -- un bloque `video_audio`
(embebe YouTube/Vimeo) o `archivo_link` (link a un manual/PDF externo)
alcanza sin construir nada nuevo; queda a elección de Gunnar armarlo
desde el dashboard cuando quiera.

### Verificación

`npx tsc --noEmit` limpio, `pnpm lint` sin errores nuevos, `pnpm build`
limpio. `e2e/podium-vault-ai.spec.ts`: test nuevo -- el N0 arma un
bloque de texto en el modal "Qué es esta tarjeta" desde el dashboard,
la tarjeta pública lo muestra en vez del texto genérico (confirmado
que el texto viejo YA NO aparece, no es que ambos convivan). Suite
Playwright completa corrida de punta a punta sin regresiones.

Un detalle real que apareció en el camino: el botón de guardar de esta
sección nueva salió con el texto plano "Guardar", igual que el botón
de "Identidad del Programa" ya existente en la misma página -- eso
rompió 2 tests de `photo-positioner.spec.ts` que buscan ese botón sin
ambigüedad. Renombrado a "Guardar Modal" (misma convención que "Guardar
Bóveda"/"Guardar Textos"), y recorrida la suite completa (60/60) para
confirmarlo antes de este commit.

## 2026-10-06 -- Editor de Modales: Reorganización completa (v1.78.0)

Tras ver el modal "Legacy Card" funcionando, Gunnar escaló el pedido:
*"Lo que necesito es que el modal pueda editarlo.. tanto los
componentes que lo integran como el contenido de los títulos y
texto. Necesito me permitas hacer esto en este modal y en todos los
demás en el Dashboard. Y organizarlo bien top1% para que sea fácil
para el usuario e intuitivo identificar cada placeholder y tener
claridad de que tipo de información o acción se muestre allí."*

Se le presentaron 2 caminos (`AskUserQuestion`): reorganización
completa (un hub único) vs. extensión incremental sin reestructurar.
Eligió **"Reorganización completa, top1% (Recomendado)"**.

Después, mandó una captura del modal real con 4 campos anotados a
mano (Nombre Botón, MAIN TITLE, MAIN TEXT, TEXTFOOTRIGHT) preguntando
si era posible editar todo eso, simple o complejo, para cualquier
modal. Se le mapeó cada campo contra el código real antes de
construir nada: MAIN TITLE/MAIN TEXT ya eran editables (v1.77.0,
bloques); TEXTFOOTRIGHT es `card.name`, no contenido de modal; el
único hueco real era el ícono+texto del botón disparador, hardcodeado
en todos los modales. Confirmado el "ok dale", se construyó eso.

### Decisión de alcance (antes de tocar código)

Se catalogaron los 14 tipos de modal y su mecanismo real antes de
tocar nada, para no romper lo que ya funciona:

- **6 modales de ícono fijo** (cardInfo/"LyCard", vault/Bóveda, info,
  invite, contactMessage, story) -- su ícono está hardcodeado por
  tipo de Card, nunca elegible. Entran al hub con override de ícono.
- **4 modales de niveles reales** (od, ancient, medal, contacts) --
  su ícono es DINÁMICO (el de la Puesto/EscalaItem seleccionada en
  Categorización). Un override de ícono acá se pisaría con esa
  selección real -- deliberadamente afuera. En cambio, su párrafo
  introductorio (hoy fijo, `odIntro`/`ancIntro`/etc en lib/i18n.ts)
  SÍ entra al hub como override de texto, sin tocar la selección.
- **Fuera de alcance esta vuelta** (documentado, no construido): el
  modal "info" de proyecto tiene un layout bespoke (video/pills/CTA)
  que convertir a bloques sería una reescritura grande y riesgosa sin
  pedido explícito; "Mi camino" (story) sigue siendo contenido del
  dueño de la Card vía /m/dashboard, no del N0; na/versionInfo son
  contenido de sistema, no autoría del N0; legado es del destinatario.

### Lo construido

- `Program.modalIcons`/`Program.tierIntros` (schema, `Json
  @default("{}")`, aditivos -- no tocan vaultBlocks/cardInfoBlocks ni
  lib/cardLabels.ts).
- `lib/modalEditor.ts` (nuevo): registro único de los 10 modales
  configurables (`MODAL_EDITOR_ENTRIES`) con nombre, ícono default,
  tipo de contenido (bloques/niveles/automático) y dónde editar el
  resto -- fuente única para el hub y para la acción que lo guarda.
  Tests unitarios 100%.
- `updateModalEditorAction` (`app/admin/programs/podium-actions.ts`):
  un solo submit guarda los 10 campos (6 íconos + 4 intros), vacío =
  vuelve al default de siempre.
- Nueva sección "Editor de Modales" en `/admin/programs/[id]`,
  arriba de todo (justo después de "Identidad del Programa"): un
  vistazo de los 10 modales con su ícono/tipo, campo de ícono o de
  texto introductorio según corresponda, y una nota de dónde está el
  resto de cada uno (sin duplicar los editores existentes).
- `components/LyCardView.tsx`: `modalIconOverride()`/
  `tierIntroOverride()` (mismo patrón que `cardLabel()`) leídos en
  `modalMap` para los 6 modales de ícono fijo y en el párrafo
  introductorio de los 4 de niveles.
- 2 huecos reales cerrados en `lib/cardLabels.ts`
  (`CARD_LABEL_FIELDS`): `cardInfoKicker` (el texto del botón
  "[Programa] Card", antes solo auto-armado, nunca editable a mano) y
  `contactKicker` (el modal "Enviar Mensaje" nunca tuvo override,
  pese a que `t(lang,"contactKicker")` ya existía en lib/i18n.ts).

### Verificación

`npx tsc --noEmit` limpio, `pnpm lint` sin errores nuevos, `pnpm
build` limpio, `pnpm test:unit:coverage` 100% (308 tests, incluido
`lib/modalEditor.ts` nuevo en el ratchet de cobertura). Test E2E
nuevo (`podium-vault-ai.spec.ts`): el N0 cambia el ícono de cardInfo
y el texto introductorio de O.D. desde el hub en un solo submit, la
DB lo persiste, y la tarjeta pública lo muestra de verdad (ícono
nuevo visible en el modal, texto introductorio nuevo reemplaza al
fijo de siempre). Suite Playwright completa: 61/61.

## 2026-10-06 -- "Entrar como este Miembro": acceso real a /m/dashboard desde el Admin (v1.79.0)

Tras el Editor de Modales, Gunnar preguntó cómo editar el modal "Mi
camino" -- la respuesta reveló que ese contenido se edita en
`/m/dashboard`, una pantalla que Gunnar dijo no haber visto nunca:
*"eso del m/dashboard no lo veo nunca en ningún lado es la primera vez
que entro alli.. creo que tenemos un montón de pantallas y menus y
aplicaciones que hemos creado que estan huerfanas.. revisa eso
porfa"*.

### Auditoría (antes de construir nada)

Se listaron las 35 rutas reales de la app (`find app -name page.tsx`)
y se greppeó cada una contra todo el repo para confirmar si tenía
algún link de entrada real, no solo su propio archivo. Hallazgo
confirmado: **cero links de `/admin/*` hacia `/m/*` en toda la app**
salvo uno (un "Ver perfil" puntual de Experto en `/admin/wowstore`).
La causa raíz: `/admin/*` (login por contraseña) y `/m/*` (login de
Member por WhatsApp OTP) son dos sistemas de sesión completamente
separados (`lib/auth.ts` / `lib/memberAuth.ts`), y la ÚNICA puerta de
entrada a todo `/m/*` es el botón "Crea Tu LyCard" que aparece en una
Card SOLO cuando `isHost === false` -- la propia Card de Gunnar
(`isOrigin`) por regla deliberada siempre muestra el QR real en lugar
de ese botón, así que nunca se lo mostró.

(Una sospecha inicial -- que `/m/wowstore/mias`, `/perfil` y
`/solicitudes` también estaban huérfanas -- resultó FALSA al leer el
código real: `components/WowStoreTabs.tsx` ya las conecta entre sí
desde el 2026-09-24, el grep inicial no las encontró porque arma el
`href` con un template literal (`/m/wowstore${tab.href}`), no con el
string completo. Corrección honesta, no se tocó nada ahí.)

### Lo construido

- `viewAsMemberAction(memberId, programId)` nueva
  (`app/admin/programs/members-actions.ts`): mintea una sesión de
  Member real (`lib/memberAuth.ts#createMemberSession`, ya existía,
  reusado) para ese Miembro puntual y redirige a `/m/dashboard` --
  acceso real, no una vista de solo lectura, mismo criterio que
  cualquier "ver como" de soporte en otros SaaS. Guardada igual que el
  resto de `members-actions.ts`: `requireProgramAccess` +
  `requireMembership` (el Miembro tiene que pertenecer de verdad a
  ese Programa).
- Guard extra: requiere `currentAdminId()` (cookie propia de Admin,
  no el scope ya resuelto que puede venir del puente Member→Admin de
  un N0 promovido por Chido→Programa). Un N0 así nunca tuvo cookie de
  Admin propia -- si "entrara como" otro Miembro perdería su propia
  sesión de Admin hasta volver a loguearse, y de cualquier forma ya
  tiene su propio `/m/dashboard` a un click (el suyo), no necesita
  este atajo.
- Botón nuevo "Entrar como este Miembro →" en la sección "Miembros"
  de `/admin/programs/[id]`, junto al link `/c/[slug]` ya existente,
  solo para membresías `status: "active"` (las "Invitado" todavía no
  tienen Cards creadas).

### Verificación

`npx tsc --noEmit` limpio, `pnpm lint` sin errores nuevos, `pnpm
build` limpio, `pnpm test:unit:coverage` 100% (sin cambios en lib/,
nada nuevo que testear ahí). Test E2E nuevo
(`e2e/view-as-member.spec.ts`): el N0 entra de verdad al
`/m/dashboard` de un Miembro real (ve "Hola, [nombre]"), y su propia
sesión de Admin sigue intacta después (vuelve a
`/admin/programs/[id]` sin que lo manden a loguearse de nuevo). Suite
Playwright completa corrida de punta a punta.

## 2026-10-06 -- Fix de login atascado + Traducción al vuelo con IA (v1.80.0)

Dos pedidos "estéticos" de Gunnar, uno chico y uno grande:

### Fix: /admin/login sin volver atrás

*"El panel de administración para hacer login no tiene volver atrás y
queda atascado en la tarjeta."* Causa real: el único link que manda a
`/admin/login` en toda la app es el ícono de login que ve un visitante
sin sesión (`badge === "NA"`, `components/LyCardView.tsx`) -- no
mandaba ningún parámetro, y la pantalla de login no tenía ningún link
de salida salvo el botón atrás del navegador (inexistente en modo PWA/
standalone). Fix: el ícono manda `?back=<slug de la Card>`, y
`/admin/login` ahora tiene un link real "← Volver" arriba del todo --
a `/c/<back>` si vino de una Card, a `/` si no (nunca sin salida).

### Traducción al vuelo con IA

*"El sistema de traducción no traduce nada es importante traduzca
todo. Si hay que habilitar ia para traducir contenido que se haga."*

El selector ES/EN de siempre (`lib/i18n.ts`) solo traducía el texto
fijo de la interfaz -- nombre/título/cita, "Mi camino", Bóveda,
"[Programa] Card" y las descripciones de O.D./Ancient/Medalla/Valor
son contenido real que escribe un N0, nunca pasaban por ahí. Se
consultó el alcance con Gunnar (`AskUserQuestion`): **al vuelo con
caché** (no precalculado al guardar) y **toda la tarjeta de proyecto**
(no solo lo más visible), ambos recomendados, ambos elegidos.

### Lo construido

- `ContentTranslation` (schema nuevo): una fila por (hash del
  contenido, idioma), content-addressed -- no por Card. Si el N0 edita
  cualquier campo, el hash cambia solo y se retraduce; si dos Cards
  tienen el mismo texto, comparten caché.
- `lib/translation.ts` (puro, testeado 100%): `hashBundle()` (mismo
  hash sin importar el orden de las claves) y `parseTranslationResponse()`
  (mismo criterio robusto que `lib/aiAgent.ts` -- intenta JSON directo,
  si no busca el primer `{...}`, descarta claves no pedidas).
- `lib/translateActions.ts` (server action, mismo patrón que
  `generatePodiumAiButtonAction`): arma UN bundle plano con todo el
  contenido traducible de la Card, UN solo pedido a Claude (nunca uno
  por campo), chequea el caché antes de llamar. Sin `ANTHROPIC_API_KEY`
  o si Claude falla, devuelve `{}` -- cae honesto al texto original.
- `components/LyCardView.tsx`: arma el bundle (solo `isProject`, mismo
  alcance que `cardInfoBlocks`/`vaultBlocks`) con
  `card.title/quote/storyQuote/storyBody`, la descripción del Puesto/
  Escala actual, los textos introductorios del Editor de Modales
  (v1.78.0), y cada bloque de la Bóveda/"[Programa] Card". Al tocar
  EN, un solo `useEffect` dispara el pedido una vez por carga de
  página; `tr(key, original)` resuelve cada campo.

### Fuera de alcance esta vuelta (documentado, no construido)

Company/personal quedan sin traducir (mismo alcance que cardInfoBlocks/
vaultBlocks hoy). Ícono/denominación de O.D./Ancient/Medalla/Valor no
entran (son nombres cortos de nivel, no prosa). El texto fijo de la
interfaz sigue en `lib/i18n.ts`, sin tocar.

### Verificación

`npx tsc --noEmit` limpio, `pnpm lint` sin errores nuevos, `pnpm build`
limpio, `pnpm test:unit:coverage` 100% (incluido `lib/translation.ts`
nuevo en el ratchet de cobertura). Test E2E nuevo
(`e2e/translation.spec.ts`): confirma que tocar EN dispara el pedido
real a Claude (confirmado en los logs del server: la llamada sale,
Anthropic responde) y que el resultado es siempre uno de los 2
desenlaces honestos -- traducido de verdad (fila nueva en
ContentTranslation + texto en pantalla cambia) o fallback honesto
(sin fila nueva, el texto original se queda tal cual) -- nunca un
hueco en blanco ni contenido roto, mismo criterio que el test del
Agente de IA. Nota honesta: en este sandbox la cuenta de Anthropic no
tiene crédito cargado (confirmado vía log: `"Your credit balance is
too low"`), así que se verificó de punta a punta el camino de fallback
honesto -- el camino de éxito está cubierto por los tests unitarios de
`hashBundle`/`parseTranslationResponse` y por el mismo código ya
probado en producción para `generatePodiumAiButtonAction`, pero no se
pudo confirmar con una llamada real exitosa en este entorno.

De paso, un fix chico no relacionado: `e2e/view-as-member.spec.ts`
(v1.79.0) afirmaba `getByText("Hola, Miembro E2E ViewAs")` sin acotar a
un rol -- el div accesible `#__next-route-announcer__` que Next.js
inyecta en cada navegación client-side duplica el texto del `<h1>` de
la página nueva, así que esa aserción podía chocar con "strict mode
violation" (2 elementos con el mismo texto) según el timing. Se acotó a
`getByRole("heading", ...)`, mismo criterio ya usado más abajo en el
mismo test. Suite Playwright completa: 63/63 verde.

## 2026-10-06 -- Editor de Modales: Unificación completa (v1.81.0)

Gunnar, tras pedirle el inventario completo de los 14 modales de la
tarjeta: *"lo que necesito es una forma de editar cada uno de esos
Modales.. lo hemos intentado pero no se que has echo.. me diste la
opcion de cambiar el icono.. pero ne ningun lado puedo leer ni se donde
esta el texto del titulo o del contenido del modal de cardinfo"*.
Diagnóstico honesto que le di antes de tocar código: el "Editor de
Modales" de la v1.80.0 (y antes) solo cubría ícono + intro de niveles;
el título/botón vivía en "Textos de Botones y Modales" (sección
distinta) y el contenido pesado en "Bóveda Legacy"/`Modal "Qué es esta
tarjeta"` (2 secciones más) -- 3 lugares para entender UN modal, y una
porción (odBody/ancBody/medalBody/valueBody) ni tenía campo en ningún
form, harcodeada en `lib/i18n.ts`. Confirmado: *"Dale con todos los 14,
hacelo bien completo"*.

### Lo construido

- `lib/modalEditor.ts`: registro único de los **14 modales reales**
  (`ModalKey` de `components/LyCardView.tsx`) -- cada entrada declara
  `iconEditable`, `kickerFieldKey` (clave en `cardLabels` para el texto
  del botón), `bodyKind` (`"bloques"` | `"niveles"` | `"fijo"`) y
  `bodyHint` (explica siempre dónde vive/por qué no hay contenido
  libre, nunca un hueco sin explicación).
- `Program.modalBlocks` (Json, nuevo): un solo mapa
  `Record<ModalKey, ModalBlock[]>` reemplaza las columnas
  `vaultBlocks`/`cardInfoBlocks` de antes (una por modal no escalaba) --
  agregar bloques a un modal nuevo ya no pide migración. Migración con
  backfill real de los datos existentes antes de borrar las columnas
  viejas.
- `/admin/programs/[id]`: una sola sección "Editor de Modales", **14
  filas** (una por modal), cada una con TODO lo que ese modal tiene
  junto -- ícono, texto del botón, contenido -- un solo "Guardar" por
  fila (`updateModalContentAction`, genérico, parametrizado por `key`).
  Los 6 textos de botón/kicker que vivían en "Textos de Botones y
  Modales" (cardInfoKicker, infoKicker, inviteKicker, contactKicker,
  storyKicker, ancKicker) se mudaron a la fila de su modal -- siguen en
  el mismo campo `Program.cardLabels`, cambió solo dónde se editan.
  `updateCardLabelsAction` pasó de reemplazo total a merge (si no, cada
  submit de esa sección borraría los kickers movidos).
- **2 modales que antes no tenían ningún contenido libre** ahora lo
  tienen, mismo patrón que cardInfo/Bóveda (bloques, vacío = fallback
  de siempre, nunca una sección en blanco):
  - **"info" sin destinatario** (el cubo "Info" default, tanto en
    project como en company): antes 100% fijo (el video/pilares de
    Legacy, o título/cita de la Card en company) -- ahora bloques
    propios lo pisan si el N0 los armó.
  - (cardInfo y vault ya tenían bloques desde v1.78-v1.80, solo se
    unificó su lugar en el nuevo hub.)
- **Fuera de alcance, documentado con su porqué** (bodyKind:"fijo" en
  el registro, nunca un campo fantasma): invite/contactMessage
  (formularios funcionales), story (lo escribe el dueño en
  /m/dashboard, no el N0), legado (contenido del destinatario), na
  (pantalla fija del sistema), versionInfo (el CHANGELOG real),
  ai_agent (se genera desde "Botones del Podio"). od/ancient/medal/
  contacts mantienen su mecanismo de siempre (intro + roster real en
  Categorización) con ícono dinámico, no editable acá -- solo se
  movieron a la misma fila en el hub nuevo.

### Regresión encontrada y corregida antes de shippear

Con 14 filas, cada una con su propio botón "Guardar" (texto idéntico),
2 tests ajenos que ya hacían `getByRole("button", {name:"Guardar",
exact:true})` **sin** scopear a su propio `<form>` (photo-positioner,
mensajería) empezaron a fallar por "strict mode violation" -- y la fila
nueva "Enviar Mensaje" (contactMessage) colisionaba por substring con
el botón real "Enviar mensaje" de Mensajería Interna. Fix de raíz: cada
botón "Guardar" de la fila lleva ahora `aria-label={"Guardar " +
nombre del modal}` (texto visible sigue siendo "Guardar", mismo truco
ya usado en el toggle de idioma) -- vuelve a haber un solo "Guardar"
sin calificar en toda la página. Los 2 tests ajenos, de paso, quedaron
scopeados a su propio form (debieron estarlo desde siempre).

### Verificación

`npx tsc --noEmit`, `pnpm lint`, `pnpm test:unit:coverage` 100% (incluye
`parseModalBlocksMap` nuevo en `lib/modalBlocks.ts`, registro completo
de los 14 en `lib/modalEditor.ts`), `pnpm build` limpio. Tests E2E
nuevos: edición de `info` sin destinatario con bloques propios
(confirma que pisa el contenido fijo de Legacy, tanto en la UI como en
`Program.modalBlocks` en DB); reescritura de los tests existentes de
Bóveda/cardInfo/Editor de Modales para el nuevo hub de 1 fila por
modal. Suite Playwright completa: 64/64 verde (incluye el fix de las 2
regresiones ajenas encontradas en el camino).

## 2026-10-07 -- Linaje de Programas + alta directa de Miembros (v1.82.0)

Diagnóstico real de Gunnar: "tenemos un desmadre... hay dos Legacys,
HeroSuite no se conecta a ninguno, no puedo poner un miembro". Tres
huecos reales en el código, no solo datos de prueba sueltos:

1. **Raíz sin garantía en DB**: quién era "la raíz" se resolvía
   comparando `slug === "legacy"` a mano en 3-4 lugares
   (`lib/legacyMembership.ts`, `app/c/legacy-funnel-actions.ts`,
   `lib/programPromotion.ts`) -- nada impedía que naciera una segunda
   raíz. Ahora `Program.isRoot` existe de verdad, con un índice único
   parcial (`CREATE UNIQUE INDEX ... WHERE "isRoot" = true`) que
   garantiza a nivel Postgres que solo puede haber una. La migración
   marcó la Legacy real existente.
2. **Crear un Programa huérfano era un click**: el form de
   `/admin/programs` ofrecía "Sin origen (raíz)" siempre, sin
   distinguir el caso real (plataforma recién reseteada) del peligroso
   (ya hay Programas, y éste se vuelve una segunda raíz sin querer).
   Ahora esa opción solo aparece cuando la plataforma está vacía;
   cualquier otro caso exige elegir un origen real, validado también
   server-side en `createProgramAction`/`setProgramOriginAction`. Se
   agregó además detección real de ciclos multi-hop (no solo
   self-reference directo) en `lib/programLineage.ts`
   (`wouldCreateCycle`, 100% de cobertura unitaria) -- el selector de
   Linaje nunca ofrece como origen a un Programa que crearía un ciclo.
3. **No había forma de agregar un Miembro directo**: la única puerta de
   entrada a `Member` era el funnel self-service público
   (WhatsApp/Google), que además siempre aterriza en Legacy
   (`ensureLegacyMembershipAndCards`). Un N0 que recién creaba su propio
   Programa (ej. HeroSuite) no tenía cómo sumar gente real sin pasar por
   ahí. Nueva `addMemberToProgramAction` en
   `app/admin/programs/members-actions.ts`: crea (o reusa, si el
   WhatsApp ya existe en otro Programa) un Member, lo activa en el
   Programa y le spawnea sus 3 Cards de una -- mismo
   `activateMembershipAndSpawnCards` que usa el resto de la plataforma.
   UI nueva: "Agregar Miembro" en la sección Miembros de
   `/admin/programs/[id]`.

De paso, fix al bug reportado de sesión ("cada vez que cierro la app me
vuelve a pedir que me conecte"): la cookie de Admin
(`lib/auth.ts#createAdminSession`) tenía un TTL de 12 horas, hardcodeado
dos veces (el JWT y el `maxAge` de la cookie, que no estaban ni
sincronizados entre sí). Pasó a 30 días, mismo criterio que ya usa la
cookie de Member.

Verificación: `npx tsc --noEmit`, `pnpm lint`, `pnpm test:unit:coverage`
(100%, incluye `lib/__tests__/programLineage.test.ts`), `pnpm build`,
nuevo `e2e/program-lineage.spec.ts` (crear Programa exige origen real,
el selector nunca ofrece un ciclo, agregar Miembro directo + reuso por
WhatsApp entre dos Programas distintos), suite Playwright completa:
65/65 verde.

No tocado en esta ronda (fuera de alcance, documentado para después):
limpiar los datos reales duplicados en producción/Neon (sigue sin
acceso de red desde este entorno a Neon -- Gunnar puede hacerlo ya
mismo desde el admin UI real una vez deployado: desactivar/borrar el
Legacy duplicado, y setear el origen real de HeroSuite desde su propia
sección Linaje); `OriginMemento` como modelo separado (sigue pendiente
de deprecar); modelado de los campos dolor/cómo/costo (puro diseño
todavía, sin esquema).
