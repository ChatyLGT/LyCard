import "dotenv/config";
import { SignJWT } from "jose";
import { Client } from "pg";

// Mismo mecanismo que lib/auth.ts#createAdminSession, reimplementado acá
// a propósito (no importamos lib/auth.ts directo: ese archivo llama
// `next/headers`, que solo existe dentro de una request de Next —
// tronaría fuera de ese contexto). Cookie name/TTL/algoritmo deben
// seguir siendo IDÉNTICOS a los de lib/auth.ts — si cambian ahí, cambian
// acá también.
const COOKIE_NAME = "lycard_admin";

// pg directo, no el cliente de Prisma generado — ese archivo usa
// `import.meta.url` internamente (Prisma 7), que revienta bajo el
// transform a CommonJS que usa Playwright Test para correr specs/helpers
// .ts (bug real encontrado en esta sesión). Next.js lo carga bien porque
// Turbopack maneja ESM/CJS de forma transparente; el runtime standalone
// de Playwright no. Para el fixture mínimo que necesitan estos E2E
// (crear/borrar Cards/Programs/Admin de prueba), pg crudo alcanza y
// evita el conflicto por completo.
//
// Factory, no un singleton compartido: un `pg.Client` no se puede
// reconectar una vez cerrado (bug real encontrado en esta sesión — el
// segundo spec fallaba con "Client has already been connected" al
// reusar la misma instancia que ya había conectado y cerrado el
// primero). Cada spec pide la suya en su propio beforeAll/afterAll.
export function createE2eDb() {
  return new Client({ connectionString: process.env.DATABASE_URL });
}

export async function mintAdminCookie(adminId: string) {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET no está seteado — necesario para los E2E de Admin");

  const token = await new SignJWT({ sub: adminId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(new TextEncoder().encode(secret));

  return { name: COOKIE_NAME, value: token, httpOnly: true, sameSite: "Lax" as const };
}
