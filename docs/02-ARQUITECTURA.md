# Arquitectura técnica

## Stack

- **Next.js 16** (App Router), Server Components por defecto
  (`export const dynamic = "force-dynamic"` en las páginas que leen DB en
  cada request), Server Actions (`"use server"`) para toda escritura.
  Turbopack en dev y build.
- **Prisma 7** + `@prisma/adapter-pg` sobre **Postgres**. Cliente generado en
  `generated/prisma` (no en `node_modules/.prisma`, ver `prisma.config.ts`).
- **React** "use client" solo donde hace falta interactividad (formularios,
  acordeones, el chat de Warren/demo). Todo lo demás es Server Component.
- **CSS a mano**, sin framework. Variables de tema definidas inline por
  componente (ver `lib/color.ts` para la paleta base). Paleta de la casa:
  fondo `#0B0B0A`, dorado `#C8A15A`, marfil `#F3F0E9`, verde `#6FCF7A`,
  ámbar `#E0954B`, violeta `#9085e9`.
- **PWA nativa**: `app/manifest.ts` + `public/sw.js` escrito a mano (sin
  `next-pwa` ni `@serwist`, ver el comentario en `sw.js` para el porqué).
- Storage de imágenes abstraído en `lib/storage.ts`: filesystem local en
  dev, Vercel Blob en producción.

## Estructura de carpetas

```
app/
  c/[slug]/            → tarjeta pública + Oficina Virtual (la vitrina)
  admin/               → panel del/los Admin (MasterN0 o N0 de Programa)
  m/                   → dashboard del Member logueado (sus 3 tarjetas)
components/            → todos los componentes React (server y client)
lib/                   → lógica pura: auth, parsers, datos fijos, utilidades
prisma/schema.prisma   → el modelo de datos completo (ver 03-MODELO-DE-DATOS.md)
generated/prisma/      → cliente Prisma generado (no se edita a mano)
public/                → assets estáticos + service worker
```

Dentro de `app/`, cada carpeta con una `actions.ts` es el server-side de esa
sección — las Server Actions se importan directo en el Server Component que
las usa, nunca se llaman por HTTP.

## Autenticación — tres sistemas separados, no se mezclan

- **Admin** (`lib/auth.ts`): cookie firmada, login con email+password contra
  el modelo `Admin`. `isMasterN0()` (Admin con `programId: null`) tiene
  acceso global; un Admin con `programId` seteado está limitado a ese
  Programa (`currentAdminScope()`).
- **Member** (`lib/memberAuth.ts`): Google OAuth (identidad, login) o
  WhatsApp OTP simulado. Un Member es una persona real con hasta 3 Cards
  propias (`project`/`company`/`personal`).
- **Conexión de Google por Card** (`lib/googleOAuth.ts`, Fase F): un tercer
  eje, ortogonal a los dos de arriba — autoriza Calendar/Tasks/Drive **de
  esa persona, sobre su propia Card**, para que Skills como Notas de Voz
  orquesten sobre su infraestructura real. Nunca otorga ni depende de
  permisos de Admin/Member — solo guarda tokens en `Member.googleRefreshToken`.

Nunca uses la sesión de uno donde se espera la del otro — son modelos y
cookies distintos a propósito (separa "quien administra la plataforma", de
"quien es dueño de una tarjeta", de "a qué cuenta externa de Google está
conectada esa tarjeta").

### Regla dura: quién puede volverse Admin/N0

**Ninguna cuenta de Admin se crea por login — nunca por Google, nunca por
ningún flujo self-service en el sentido de "el propio usuario se la
otorga".** Verificado en el código: ni el login de Google de un Member
(`app/m/auth/google/callback`) ni la conexión de Google de una Card
(Fase F, `app/m/auth/google/connect-*`) tocan jamás el modelo `Admin` —
ambos solo leen/escriben `Member`. `Admin.programId === null` sigue
siendo, en todo momento, una sola cuenta: la de Gunnar.

**Dos caminos reales para que nazca un `Admin` con `programId` seteado
(nunca `null`), los dos verificados contra el código:**

1. **De alta a mano por MasterN0** — `createProgramAdminAction` en
   `app/admin/programs/actions.ts`, detrás de `requireMasterN0()`. El
   camino de siempre, para un Programa que MasterN0 crea directo desde
   `/admin/programs`.
2. **Promoción automática Chido→Programa** (Fase P1, v1.52.0,
   ✅ shippeado — ver
   [05-ROADMAP-EDT.md#modelo-de-negocio-3-ejes](./05-ROADMAP-EDT.md#modelo-de-negocio-3-ejes),
   Eje A). `lib/programPromotion.ts#checkAndPromoteToPrograma` crea el
   `Admin` con `Admin.memberId` seteado (FK a `Member`, `email`/
   `passwordHash` en `null`) cuando un Chido cruza el umbral — **sin que
   MasterN0 apruebe ese caso puntual a mano**. No es un login de Google
   creando el Admin: es la sesión de Member ya autenticada de ese Chido
   la que, vía `currentAdminScope()`, hereda autoridad sobre el Programa
   nuevo. El invariante de fondo sigue intacto — sigue habiendo un único
   lugar que hace cada tipo de creación, los dos auditables, ninguno
   disparado por un simple login externo.

## El patrón que se repite en todo el repo

Probado primero en `medalScale`/`rankScale`/`contactsScale`, después en
`officeSkills` — **usalo tal cual para cualquier feature nueva que sea "una
lista de cosas configurables por el N0"**:

1. Un campo `Json @default("[]")` en el modelo de Prisma (`Program` o
   `Card`, según a quién pertenece el dato).
2. Un parser en `lib/*.ts`: tipos TypeScript + función `parseX(raw): X[]` +
   una constante `DEFAULT_X` con contenido de ejemplo honesto (nunca vacío
   el primer día, pero marcado como ejemplo).
3. Un componente cliente `*Editor.tsx` en acordeón (reusa
   `components/Accordion.tsx`) con estado local + un input oculto + un
   `<form action={...}>` apuntando a...
4. ...**una sola Server Action** que parsea el JSON del form y sobreescribe
   el campo completo (no hay endpoints granulares por ítem — se guarda la
   lista entera cada vez).

Si vas a construir algo nuevo del roadmap (ver
[05-ROADMAP-EDT.md](./05-ROADMAP-EDT.md)) y "es una lista editable por el
N0", es este patrón, no uno nuevo.

## Cáscara honesta (principio de diseño, no solo de copy)

Ninguna pantalla de este proyecto simula una conexión o un dato que no
existe. Si algo no está conectado (Fathom sin API key, un Programa sin
Skill activada, un Negocio sin activar como Programa), la UI dice
explícitamente "todavía sin conectar / próximamente" — nunca inventa datos
ni oculta el estado real. Aplica este mismo criterio a todo lo que
construyas.

## Versionado

`lib/version.ts` tiene `APP_VERSION` (semver) y un `CHANGELOG` a mano.
**Convención obligatoria desde 2026-09-16**: cada cambio que se shippea
bumpea la versión y agrega una entrada al changelog, en el mismo commit que
el código. Se ve en el modal de versión de la tarjeta pública.

## Deploy

Vercel, equipo `einaros`. `git push` a la rama principal dispara el deploy.
Las migraciones de Prisma corren en el build (`prisma migrate deploy`).
Un `P1002` (advisory-lock timeout) en el deploy es transitorio — reintentar
el deploy lo resuelve, no es un bug del código.
