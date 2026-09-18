# LyCard

Tarjeta de presentación digital multi-tenant (Legacy y otros Programas), con
su propia Oficina Virtual: el panel donde el dueño ve el resumen de sus
operaciones y accede a su equipo de agentes de IA.

📖 **Documentación completa en [`docs/`](./docs/README.md)** — visión y
alcance, arquitectura, modelo de datos, cada módulo ya construido, y el
roadmap detallado de lo que falta. Empezá ahí, no acá — este README es solo
el setup mecánico del entorno local.

**Estado real hoy** (detalle completo en [`docs/04-MODULOS.md`](./docs/04-MODULOS.md)):
la tarjeta pública, el Editor/Admin, y la Oficina Virtual con Superpoderes
(Brief de reuniones vía Fathom, demo del Gemelo Digital) y la Malla del
equipo están en producción. Lo que sigue —HR/CRM/PM internos, el bot Warren
completo, el panel NashMesh, el MachineEngine— está documentado como
roadmap en [`docs/05-ROADMAP-EDT.md`](./docs/05-ROADMAP-EDT.md), no
construido todavía.

## Stack

- **Next.js 16** (App Router, Turbopack)
- **Prisma 7** + Postgres (driver adapter `@prisma/adapter-pg`)
- **Vercel Blob** para imágenes en producción; en local cae a `public/uploads`
  automáticamente si no hay `BLOB_READ_WRITE_TOKEN`
- Auth de admin: **cuenta única (Master Admin) guardada en la base**, email +
  password con bcrypt, cookie de sesión firmada con `jose`. Cambiás la
  password desde `/admin/account`, ya logueado — no hace falta tocar env vars
  ni redeploy. Ver "Sobre el modelo de auth" abajo.

## Setup local

1. Postgres corriendo y accesible. Creá una base y un usuario:
   ```bash
   createdb lycard
   ```
2. Copiá `.env.example` a `.env` y completá `DATABASE_URL`.
3. Generá un `SESSION_SECRET` random:
   ```bash
   openssl rand -hex 32
   ```
4. (Opcional) Ajustá `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` en `.env` —
   son el email/password del Master Admin que crea el seed. Si no los tocás,
   usa los defaults de `.env.example`.
5. Instalá dependencias, migrá y sembrá el admin + la card de ejemplo:
   ```bash
   pnpm install
   pnpm db:migrate
   pnpm db:seed
   ```
6. `pnpm dev`, entrá a `http://localhost:3000/admin/login` con el email/password
   sembrados, y cambiá la password desde `/admin/account` apenas entres.

## Estructura

Mapa completo y actualizado en
[`docs/02-ARQUITECTURA.md`](./docs/02-ARQUITECTURA.md) y
[`docs/03-MODELO-DE-DATOS.md`](./docs/03-MODELO-DE-DATOS.md). Resumen
rápido: `app/c/[slug]` es la tarjeta pública + Oficina Virtual, `app/admin`
es el panel de Admin/N0, `app/m` es el dashboard del Member logueado,
`lib/` tiene toda la lógica de auth/parsers/datos fijos, y
`prisma/schema.prisma` es la fuente de verdad del modelo de datos.

## Sobre el modelo de auth

Hay dos sistemas de sesión separados a propósito: **Admin**
(`lib/auth.ts`, cookie firmada, login por email+password) y **Member**
(`lib/memberAuth.ts`, Google OAuth o WhatsApp OTP). Un `Admin` con
`programId: null` es MasterN0 (acceso global); con `programId` seteado
queda limitado a ese Programa (`currentAdminScope()`) — el aislamiento
entre Programas ya está construido, no es más una fase pendiente. Detalle
completo en [`docs/02-ARQUITECTURA.md`](./docs/02-ARQUITECTURA.md#autenticación--dos-sistemas-separados-no-se-mezclan).

## Deploy en Vercel

1. Creá un proyecto Vercel Postgres (Neon) y un Vercel Blob store **público**,
   conectalos al proyecto — `DATABASE_URL` y `BLOB_READ_WRITE_TOKEN` quedan
   seteados solos. Si el marketplace les pone un prefijo, agregá manualmente
   una env var con el nombre exacto `DATABASE_URL` / `BLOB_READ_WRITE_TOKEN`
   copiando el valor de la que sí tiene el prefijo — el código busca esos
   nombres literales, sin prefijo.
2. Sumá `SESSION_SECRET` y `NEXT_PUBLIC_BASE_URL` (el dominio de producción,
   sin slash final) en las env vars del proyecto.
3. El build corre `prisma migrate deploy && next build` (ver `package.json`),
   así que el schema se aplica solo en cada deploy. El primer `Admin` hay que
   sembrarlo una vez a mano contra la base de producción (`SEED_ADMIN_EMAIL` /
   `SEED_ADMIN_PASSWORD` + `pnpm db:seed` apuntando a `DATABASE_URL` de prod) —
   después de ese primer login, cambiá la password desde `/admin/account`.
