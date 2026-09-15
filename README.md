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

- `app/c/[slug]` — pantalla pública de la LyCard (Server Component + `LyCardView`
  client component con el theme/lang/modales/toast).
- `app/admin` — roster, editor y cuenta (`/admin/account`), protegidos por
  `proxy.ts` (el `middleware.ts` de Next 16 se renombró a `proxy.ts`).
- `lib/auth.ts` — login contra el modelo `Admin` en la base (bcrypt) + sesión
  JWT firmada. `verifyAdminCredentials`, `createAdminSession`, `currentAdminId`.
- `lib/i18n.ts`, `lib/data.ts` — diccionario ES/EN y catálogos de medallones/
  rangos/canales, portados 1:1 desde el `STR`/`MEDALS`/`RANKS` del prototipo.
- `lib/storage.ts` — abstracción de subida de imágenes (Blob en prod, disco en dev).
- `prisma/schema.prisma` — modelo `Admin` (Master Admin) + un `Card` por
  LyCard del roster.

## Sobre el modelo de auth (decisión explícita del MVP — Fase 1)

Se pidió multi-tenant (varias LyCards) pero con una sola cuenta de admin en
vez de cuentas por dueño de tarjeta, porque el modelo de roles real
(cada dueño edita solo la suya) queda para una fase posterior. Con esa cuenta
entrás a `/admin` y podés crear/editar **cualquier** card del roster — no hay
aislamiento entre tarjetas todavía. La credencial ya no vive en una env var:
está en la tabla `Admin`, así que cambiarla es un formulario (`/admin/account`),
no un redeploy. No uses este esquema tal cual si el roster va a tener dueños
que no deben ver las tarjetas de otros — eso es la Fase 2 (roles), no construida.

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
