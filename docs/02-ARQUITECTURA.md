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

## Autenticación — dos sistemas separados, no se mezclan

- **Admin** (`lib/auth.ts`): cookie firmada, login con email+password contra
  el modelo `Admin`. `isMasterN0()` (Admin con `programId: null`) tiene
  acceso global; un Admin con `programId` seteado está limitado a ese
  Programa (`currentAdminScope()`).
- **Member** (`lib/memberAuth.ts`): Google OAuth o WhatsApp OTP simulado.
  Un Member es una persona real con hasta 3 Cards propias
  (`project`/`company`/`personal`).

Nunca uses la sesión de uno donde se espera la del otro — son modelos y
cookies distintos a propósito (separa "quien administra la plataforma" de
"quien es dueño de una tarjeta").

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
