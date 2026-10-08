import { test, expect } from "@playwright/test";
import bcrypt from "bcryptjs";
import { createE2eDb, mintAdminCookie } from "./helpers/adminSession";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";

// Asistente "Configura tu LyCard" v2 -- Paso 1 (2026-10-08): el botón
// (components/LyCardView.tsx) reemplaza el QR SOLO en la Card isOrigin
// (hoy "mastern0") para un viewer MasterN0, y abre S0
// (app/c/[slug]/asistente). Mismo criterio que access-door.spec.ts:
// reusa el "mastern0" real en vez de crear una Card isOrigin de prueba
// (solo puede existir una por diseño del producto, no un índice único
// de DB -- no se intenta forzar una segunda).
test.describe("Asistente Configura tu LyCard -- botón + S0", () => {
  const e2eDb = createE2eDb();
  const suffix = Date.now();
  let masterN0AdminId: string;
  let scopedAdminId: string;
  let mastern0CardId: string;
  const createdSessionIds: string[] = [];

  test.beforeAll(async () => {
    await e2eDb.connect();

    const mastern0 = await e2eDb.query<{ id: string }>(`select id from "Card" where slug = 'mastern0'`);
    if (!mastern0.rows[0]) throw new Error("No existe la Card 'mastern0' en esta DB -- correr prisma/seed.ts primero.");
    mastern0CardId = mastern0.rows[0].id;

    const passwordHash = await bcrypt.hash("no-se-usa-login-por-cookie", 10);
    const admin = await e2eDb.query<{ id: string }>(
      `insert into "Admin" (id, email, "passwordHash", "programId", "updatedAt") values (gen_random_uuid()::text, $1, $2, null, now()) returning id`,
      [`e2e-asistente-mastern0-${suffix}@example.com`, passwordHash]
    );
    masterN0AdminId = admin.rows[0].id;

    const program = await e2eDb.query<{ id: string }>(
      `insert into "Program" (id, slug, name, "updatedAt") values (gen_random_uuid()::text, $1, 'E2E Asistente Programa', now()) returning id`,
      [`e2e-asistente-programa-${suffix}`]
    );
    const scopedAdmin = await e2eDb.query<{ id: string }>(
      `insert into "Admin" (id, email, "passwordHash", "programId", "updatedAt") values (gen_random_uuid()::text, $1, $2, $3, now()) returning id`,
      [`e2e-asistente-scoped-${suffix}@example.com`, passwordHash, program.rows[0].id]
    );
    scopedAdminId = scopedAdmin.rows[0].id;
  });

  test.afterAll(async () => {
    for (const id of createdSessionIds) {
      await e2eDb.query(`delete from "AssistantSession" where id = $1`, [id]).catch(() => {});
    }
    await e2eDb
      .query(`delete from "AssistantSession" where "adminId" in ($1, $2)`, [masterN0AdminId, scopedAdminId])
      .catch(() => {});
    await e2eDb.query(`delete from "Admin" where id = $1`, [scopedAdminId]).catch(() => {});
    await e2eDb.query(`delete from "Program" where name = 'E2E Asistente Programa'`).catch(() => {});
    await e2eDb.query(`delete from "Admin" where id = $1`, [masterN0AdminId]).catch(() => {});
    await e2eDb.end();
  });

  test("MasterN0 ve 'Configura tu LyCard' en lugar del QR, y S0 crea la sesión real", async ({ browser }) => {
    const context = await browser.newContext();
    await context.addCookies([{ ...(await mintAdminCookie(masterN0AdminId)), url: BASE_URL }]);
    const page = await context.newPage();

    await page.goto(`${BASE_URL}/c/mastern0`, { waitUntil: "networkidle" });
    const button = page.getByRole("link", { name: "Configura tu LyCard" });
    await expect(button).toBeVisible();
    await expect(button).toHaveAttribute("href", "/c/mastern0/asistente");

    await button.click();
    await page.waitForURL(/\/c\/mastern0\/asistente$/);
    await expect(page.getByRole("heading", { name: "Asistente" })).toBeVisible();
    await expect(page.getByText("Tu tarjeta personal")).toBeVisible();
    await expect(page.getByText("Tu tarjeta de negocio")).toBeVisible();
    await expect(page.getByText("Pendiente, sin tarjeta todavía")).toBeVisible();
    await expect(page.getByText("Tu programa", { exact: true })).toBeVisible();
    await expect(page.getByText("Detallado · Próximamente")).toBeVisible();

    const session = await e2eDb.query<{ id: string; estado: string; adminId: string; cardId: string }>(
      `select id, estado, "adminId", "cardId" from "AssistantSession" where "adminId" = $1 and "cardId" = $2`,
      [masterN0AdminId, mastern0CardId]
    );
    expect(session.rows).toHaveLength(1);
    expect(session.rows[0].estado).toBe("en_curso");
    createdSessionIds.push(session.rows[0].id);

    await context.close();
  });

  test("al volver, el botón dice 'Seguir configurando' -- no crea una segunda sesión", async ({ browser }) => {
    const context = await browser.newContext();
    await context.addCookies([{ ...(await mintAdminCookie(masterN0AdminId)), url: BASE_URL }]);
    const page = await context.newPage();

    await page.goto(`${BASE_URL}/c/mastern0`, { waitUntil: "networkidle" });
    await expect(page.getByRole("link", { name: "Seguir configurando" })).toBeVisible();

    await page.goto(`${BASE_URL}/c/mastern0/asistente`, { waitUntil: "networkidle" });
    const sessions = await e2eDb.query(`select id from "AssistantSession" where "adminId" = $1 and "cardId" = $2`, [masterN0AdminId, mastern0CardId]);
    expect(sessions.rows).toHaveLength(1);

    await context.close();
  });

  test("un N0 escopeado a un Programa (no MasterN0) no ve el botón ni entra a S0", async ({ browser }) => {
    const context = await browser.newContext();
    await context.addCookies([{ ...(await mintAdminCookie(scopedAdminId)), url: BASE_URL }]);
    const page = await context.newPage();

    await page.goto(`${BASE_URL}/c/mastern0`, { waitUntil: "networkidle" });
    await expect(page.getByRole("link", { name: "Configura tu LyCard" })).not.toBeVisible();
    await expect(page.getByRole("link", { name: "Seguir configurando" })).not.toBeVisible();

    await page.goto(`${BASE_URL}/c/mastern0/asistente`, { waitUntil: "networkidle" });
    await expect(page).toHaveURL(`${BASE_URL}/c/mastern0`);

    await context.close();
  });

  test("un visitante anónimo no ve el botón (ve el QR real de siempre) ni entra a S0", async ({ page }) => {
    await page.goto(`${BASE_URL}/c/mastern0`, { waitUntil: "networkidle" });
    await expect(page.getByRole("link", { name: "Configura tu LyCard" })).not.toBeVisible();
    await expect(page.getByRole("button", { name: "Enviar QR por WhatsApp" })).toBeVisible();

    await page.goto(`${BASE_URL}/c/mastern0/asistente`, { waitUntil: "networkidle" });
    await expect(page).toHaveURL(`${BASE_URL}/c/mastern0`);
  });
});
