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

**Qué sigue:** Fase 3 — el chat simulado tipo WhatsApp para crear la
LyCard (lo que hoy es solo un link a `/m/login` se vuelve la experiencia
completa: audio, transcripción simulada, conversación guiada). Doy la
señal antes de arrancar, como con todo lo anterior.
