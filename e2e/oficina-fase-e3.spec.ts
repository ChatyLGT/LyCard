import { test, expect } from "@playwright/test";
import bcrypt from "bcryptjs";
import { createE2eDb, mintAdminCookie } from "./helpers/adminSession";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";

// Fase E3 de Oficina Virtual: Objetivo del Día (objetivo + frase del día) y
// Chequeo de Realidad (KPIs + sparkline) por fin se VEN en la Oficina real
// del dueño — antes (E1/E2) solo existían el schema y el editor. Esta
// prueba confirma que lo que se guarda desde OficinaExtrasEditor
// (e2e/oficina-extras-editor.spec.ts) efectivamente se renderiza acá.
test.describe("Oficina Virtual — Fase E3 (Objetivo del Día + Chequeo de Realidad)", () => {
  const e2eDb = createE2eDb();
  let cardSlug: string;
  let programId: string;
  let adminId: string;

  test.beforeAll(async () => {
    await e2eDb.connect();
    const suffix = Date.now();
    cardSlug = `e2e-fase-e3-${suffix}`;

    const prog = await e2eDb.query<{ id: string }>(
      `insert into "Program" (id, slug, name, "motivationalPhrases", "updatedAt") values (gen_random_uuid()::text, $1, $2, $3, now()) returning id`,
      [`e2e-prog-e3-${suffix}`, "E2E Programa E3", JSON.stringify(["Frase de prueba del día para Fase E3."])]
    );
    programId = prog.rows[0].id;

    await e2eDb.query(
      `insert into "Card" (id, slug, "updatedAt", name, title, quote, "programId", "oficinaObjetivo", "realityCheckKpis") values (gen_random_uuid()::text, $1, now(), $2, $3, $4, $5, $6, $7)`,
      [
        cardSlug,
        "E2E Fase E3",
        "Test Title",
        "Test Quote",
        programId,
        "Objetivo de prueba E2E",
        JSON.stringify([{ key: "kpi-test", label: "KPI de prueba", value: "7", unit: "", trend: [1, 2, 3, 4, 7] }]),
      ]
    );

    const passwordHash = await bcrypt.hash("no-se-usa-login-por-cookie", 10);
    const admin = await e2eDb.query<{ id: string }>(
      `insert into "Admin" (id, email, "passwordHash", "programId", "updatedAt") values (gen_random_uuid()::text, $1, $2, null, now()) returning id`,
      [`e2e-mastern0-e3-${suffix}@example.com`, passwordHash]
    );
    adminId = admin.rows[0].id;
  });

  test.afterAll(async () => {
    await e2eDb.query(`delete from "Admin" where id = $1`, [adminId]).catch(() => {});
    await e2eDb.query(`delete from "Card" where slug = $1`, [cardSlug]).catch(() => {});
    await e2eDb.query(`delete from "Program" where id = $1`, [programId]).catch(() => {});
    await e2eDb.end();
  });

  test("el dueño ve su objetivo, la frase del día, y sus KPIs con sparkline", async ({ browser }) => {
    const context = await browser.newContext();
    const cookie = await mintAdminCookie(adminId);
    await context.addCookies([{ ...cookie, url: BASE_URL }]);
    const page = await context.newPage();

    await page.goto(`${BASE_URL}/c/${cardSlug}/oficina`, { waitUntil: "networkidle" });

    await expect(page.getByText("Objetivo del Día")).toBeVisible();
    await expect(page.getByText("Objetivo de prueba E2E")).toBeVisible();
    await expect(page.getByText("Frase de prueba del día para Fase E3.")).toBeVisible();

    await expect(page.getByText("Chequeo de Realidad")).toBeVisible();
    await expect(page.getByText("KPI de prueba")).toBeVisible();
    // El sparkline es un <svg> a mano (components/Sparkline.tsx) — confirma
    // que efectivamente se dibujó algo, no solo el texto del KPI.
    await expect(page.locator("svg polyline")).toHaveCount(1);
  });

  test("un visitante (sin sesión) NO ve Objetivo del Día ni Chequeo de Realidad — son privados del dueño", async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto(`${BASE_URL}/c/${cardSlug}/oficina`, { waitUntil: "networkidle" });

    await expect(page.getByText("Objetivo del Día")).toHaveCount(0);
    await expect(page.getByText("Chequeo de Realidad")).toHaveCount(0);

    await context.close();
  });
});
