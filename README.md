# LyCard

Tarjeta de presentación digital del Programa Legacy. Implementación en producción
del mockup `project/LyCard.dc.html` (bundle de Claude Design en la raíz del repo).

**Alcance de este MVP** (ver `chats/` en la raíz para el resto del contexto):
solo la pantalla **LyCard** está implementada como producto real. **Oficina
Virtual** no existe todavía — el medallón dorado de la tarjeta abre un modal de
"Próximamente" en vez de navegar a un dashboard. El **Editor** sí está completo,
porque sin él no hay forma de cargar datos en el roster multi-tenant.

## Stack

- **Next.js 16** (App Router, Turbopack)
- **Prisma 7** + Postgres (driver adapter `@prisma/adapter-pg`)
- **Vercel Blob** para imágenes en producción; en local cae a `public/uploads`
  automáticamente si no hay `BLOB_READ_WRITE_TOKEN`
- Auth de admin: **master password única** (bcrypt) + cookie de sesión firmada
  con `jose`. No hay cuentas por usuario — ver "Sobre el modelo de auth" abajo.

## Setup local

1. Postgres corriendo y accesible. Creá una base y un usuario:
   ```bash
   createdb lycard
   ```
2. Copiá `.env.example` a `.env` y completá `DATABASE_URL`.
3. Generá el hash de tu master password:
   ```bash
   node scripts/hash-password.mjs "tu password"
   ```
   Pegá la línea **"For .env (escaped)"** en `MASTER_PASSWORD_HASH` — Next.js
   expande `$VAR` dentro de `.env`, así que el hash bcrypt (que arranca con
   `$2b$`) tiene que ir con cada `$` escapado como `\$`, si no el login rompe
   en silencio (los `$2b`, `$10`, etc. se interpretan como variables vacías).
4. Generá un `SESSION_SECRET` random:
   ```bash
   openssl rand -hex 32
   ```
5. Instalá dependencias, migrá y sembrá el roster con la card de ejemplo:
   ```bash
   pnpm install
   pnpm db:migrate
   pnpm db:seed
   ```
6. `pnpm dev` y abrí `http://localhost:3000/c/gunnar`.

## Estructura

- `app/c/[slug]` — pantalla pública de la LyCard (Server Component + `LyCardView`
  client component con el theme/lang/modales/toast).
- `app/admin` — roster + editor, protegidos por `proxy.ts` (el `middleware.ts`
  de Next 16 se renombró a `proxy.ts`) contra la master password.
- `lib/i18n.ts`, `lib/data.ts` — diccionario ES/EN y catálogos de medallones/
  rangos/canales, portados 1:1 desde el `STR`/`MEDALS`/`RANKS` del prototipo.
- `lib/storage.ts` — abstracción de subida de imágenes (Blob en prod, disco en dev).
- `prisma/schema.prisma` — un modelo `Card` por LyCard del roster.

## Sobre el modelo de auth (decisión explícita del MVP)

Se pidió multi-tenant (varias LyCards) pero con una sola master password en
vez de cuentas por usuario, porque el multipassword real queda para el equipo
de producción más adelante. Con la master password entrás a `/admin` y podés
crear/editar **cualquier** card del roster — no hay aislamiento entre tarjetas
todavía. No uses este esquema tal cual si el roster va a tener dueños que no
deben ver las tarjetas de otros.

## Deploy en Vercel

1. Creá un proyecto Vercel Postgres y un Vercel Blob store, conectalos al
   proyecto — `DATABASE_URL` y `BLOB_READ_WRITE_TOKEN` quedan seteados solos.
2. Sumá `MASTER_PASSWORD_HASH` (con el escape de `$` de arriba),
   `SESSION_SECRET` y `NEXT_PUBLIC_BASE_URL` (el dominio de producción, sin
   slash final) en las env vars del proyecto.
3. `prisma generate` corre solo en el `postinstall`. Corré `prisma migrate deploy`
   contra la base de producción antes del primer deploy (o como build step).
