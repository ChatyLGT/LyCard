import { test, expect } from "@playwright/test";
import bcrypt from "bcryptjs";
import { createE2eDb, mintAdminCookie } from "./helpers/adminSession";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";

// Bot Warren / Gemelo Digital (pedido de Gunnar, 2026-09-23): la demo de
// /c/[slug]/oficina/demo pasa de un guión fijo genérico a un chat de
// ramas que arma respuestas con datos reales de la Card/Programa
// (lib/gemeloDigitalScript.ts). Como ahora asoma datos privados
// (realityCheckKpis, oficinaObjetivo) que antes no tocaba, la página
// ganó el mismo candado de privacidad que el resto de la Oficina — esta
// prueba cubre las dos cosas: que un visitante sin sesión nunca llega a
// verla, y que el dueño ve contenido de verdad personalizado, no el
// texto de ejemplo.
test.describe("Bot Warren — chat del Gemelo Digital", () => {
  const e2eDb = createE2eDb();
  let programId: string;
  let cardSlug: string;
  let plainCardSlug: string;
  let adminId: string;

  test.beforeAll(async () => {
    await e2eDb.connect();
    const suffix = Date.now();

    const prog = await e2eDb.query<{ id: string }>(
      `insert into "Program" (id, slug, name, "officeSkills", "updatedAt") values (gen_random_uuid()::text, $1, $2, $3, now()) returning id`,
      [
        `e2e-warren-${suffix}`,
        "E2E Digital Kingdom",
        JSON.stringify([
          { key: "fathom-brief", nombre: "E2E Brief de reuniones", descripcion: "d", iconUrl: "", color: "#C8A15A", appType: "fathom-brief", enabled: true },
        ]),
      ]
    );
    programId = prog.rows[0].id;

    cardSlug = `e2e-warren-card-${suffix}`;
    await e2eDb.query(
      `insert into "Card" (id, slug, "updatedAt", name, title, quote, "programId", "realityCheckKpis") values (gen_random_uuid()::text, $1, now(), $2, $3, $4, $5, $6)`,
      [
        cardSlug,
        "E2E Warren Owner",
        "Directora",
        "E2E cita real de la Card",
        programId,
        JSON.stringify([{ key: "ventas-e2e", label: "Ventas E2E", value: "77", unit: "u", trend: [10, 40, 77] }]),
      ]
    );

    plainCardSlug = `e2e-warren-plain-${suffix}`;
    await e2eDb.query(
      `insert into "Card" (id, slug, "updatedAt", name, title, quote) values (gen_random_uuid()::text, $1, now(), $2, $3, $4)`,
      [plainCardSlug, "E2E Plain Card", "N/A", "cita"]
    );

    const passwordHash = await bcrypt.hash("no-se-usa-login-por-cookie", 10);
    const admin = await e2eDb.query<{ id: string }>(
      `insert into "Admin" (id, email, "passwordHash", "programId", "updatedAt") values (gen_random_uuid()::text, $1, $2, null, now()) returning id`,
      [`e2e-warren-admin-${suffix}@example.com`, passwordHash]
    );
    adminId = admin.rows[0].id;
  });

  test.afterAll(async () => {
    await e2eDb.query(`delete from "Card" where slug in ($1, $2)`, [cardSlug, plainCardSlug]).catch(() => {});
    await e2eDb.query(`delete from "Program" where id = $1`, [programId]).catch(() => {});
    await e2eDb.query(`delete from "Admin" where id = $1`, [adminId]).catch(() => {});
    await e2eDb.end();
  });

  test("un visitante sin sesión nunca llega al chat — lo redirige a la Oficina pública", async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto(`${BASE_URL}/c/${plainCardSlug}/oficina/demo`, { waitUntil: "networkidle" });

    expect(page.url()).toBe(`${BASE_URL}/c/${plainCardSlug}/oficina`);
    await expect(page.getByText("CEO de tu Oficina")).toHaveCount(0);

    await context.close();
  });

  test("el dueño ve su chat personalizado con datos reales, no el guión genérico", async ({ browser }) => {
    const context = await browser.newContext();
    const cookie = await mintAdminCookie(adminId);
    await context.addCookies([{ ...cookie, url: BASE_URL }]);
    const page = await context.newPage();

    await page.goto(`${BASE_URL}/c/${cardSlug}/oficina/demo`, { waitUntil: "networkidle" });

    await expect(page.getByText("Hola E2E Warren Owner", { exact: false })).toBeVisible();

    await page.getByRole("button", { name: "Dale, arrancamos", exact: true }).click();
    await expect(page.getByText("¿Qué necesitás hoy?")).toBeVisible();

    await page.getByRole("button", { name: "Hazme un análisis completo de esta oportunidad", exact: true }).click();
    // KPI real de la Card, no el de ejemplo fijo (DEFAULT_REALITY_CHECK_KPIS).
    await expect(page.getByText("Ventas E2E: 77u", { exact: false })).toBeVisible();
    await expect(page.getByText("KPIs de ejemplo", { exact: false })).toHaveCount(0);

    await page.getByRole("button", { name: "Otra cosa", exact: true }).click();
    await page.getByRole("button", { name: "Creame una app específica para esto", exact: true }).click();
    await expect(page.getByText("E2E Brief de reuniones", { exact: false })).toBeVisible();

    await context.close();
  });
});
