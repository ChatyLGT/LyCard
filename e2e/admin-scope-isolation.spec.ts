import { test, expect } from "@playwright/test";
import bcrypt from "bcryptjs";
import { createE2eDb, mintAdminCookie } from "./helpers/adminSession";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";

// Prueba en vivo, contra un server real, de la propiedad de seguridad
// más importante del panel de Admin (auditoría CQE, 2026-09-23, ver
// docs/AUDITORIA-TECNICA-2026-09.md §3.3): un N0 escopeado a un Programa
// nunca puede ver el dashboard de otro Programa. Las funciones puras que
// deciden esto (lib/authScope.ts) ya tienen unit tests — esto cierra el
// círculo verificando que el comportamiento real, en HTTP de verdad, es
// el mismo.
test.describe("Aislamiento de scope entre Programas (Admin)", () => {
  const e2eDb = createE2eDb();
  let programAId: string;
  let programAName: string;
  let programBId: string;
  let programBName: string;
  let scopedAdminId: string;

  test.beforeAll(async () => {
    await e2eDb.connect();
    const suffix = Date.now();
    programAName = `E2E Programa A ${suffix}`;
    programBName = `E2E Programa B ${suffix}`;

    const progA = await e2eDb.query<{ id: string }>(
      `insert into "Program" (id, slug, name, "updatedAt") values (gen_random_uuid()::text, $1, $2, now()) returning id`,
      [`e2e-prog-a-${suffix}`, programAName]
    );
    programAId = progA.rows[0].id;

    const progB = await e2eDb.query<{ id: string }>(
      `insert into "Program" (id, slug, name, "updatedAt") values (gen_random_uuid()::text, $1, $2, now()) returning id`,
      [`e2e-prog-b-${suffix}`, programBName]
    );
    programBId = progB.rows[0].id;

    const passwordHash = await bcrypt.hash("no-se-usa-login-por-cookie", 10);
    const admin = await e2eDb.query<{ id: string }>(
      `insert into "Admin" (id, email, "passwordHash", "programId", "updatedAt") values (gen_random_uuid()::text, $1, $2, $3, now()) returning id`,
      [`e2e-scoped-${suffix}@example.com`, passwordHash, programAId]
    );
    scopedAdminId = admin.rows[0].id;
  });

  test.afterAll(async () => {
    await e2eDb.query(`delete from "Admin" where id = $1`, [scopedAdminId]).catch(() => {});
    await e2eDb.query(`delete from "Program" where id = $1`, [programAId]).catch(() => {});
    await e2eDb.query(`delete from "Program" where id = $1`, [programBId]).catch(() => {});
    await e2eDb.end();
  });

  test("un N0 de Programa A es redirigido al intentar abrir el dashboard del Programa B", async ({ browser }) => {
    const context = await browser.newContext();
    const cookie = await mintAdminCookie(scopedAdminId);
    await context.addCookies([{ ...cookie, url: BASE_URL }]);
    const page = await context.newPage();

    await page.goto(`${BASE_URL}/admin/programs/${programBId}`, { waitUntil: "networkidle" });

    // canAccessProgram(scope, programB.id) === false → la propia página
    // redirige a `/admin/programs/${scope.programId}` (SU programa, A).
    await expect(page).toHaveURL(new RegExp(`/admin/programs/${programAId}`));
    // Nunca debe llegar a renderizar nombre/datos del Programa B.
    await expect(page.locator("body")).not.toContainText(programBName);

    await context.close();
  });

  test("ese mismo N0 SÍ puede abrir el dashboard de su propio Programa (A)", async ({ browser }) => {
    const context = await browser.newContext();
    const cookie = await mintAdminCookie(scopedAdminId);
    await context.addCookies([{ ...cookie, url: BASE_URL }]);
    const page = await context.newPage();

    await page.goto(`${BASE_URL}/admin/programs/${programAId}`, { waitUntil: "networkidle" });

    await expect(page).toHaveURL(new RegExp(`/admin/programs/${programAId}`));
    await expect(page.locator("body")).toContainText(programAName);

    await context.close();
  });
});
