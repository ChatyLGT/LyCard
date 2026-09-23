import { test, expect } from "@playwright/test";
import bcrypt from "bcryptjs";
import { createE2eDb, mintAdminCookie } from "./helpers/adminSession";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";

// Janus / sistema de Tags (pedido de Gunnar, 2026-09-23) — "todos contra
// todos": cualquier Card marca lo que OFRECE y lo que BUSCA, texto libre,
// y lib/janus.ts cruza eso entre TODA la red, no solo dentro de un
// Programa. A diferencia de Seguimiento/KPIs, los tags son públicos a
// propósito — el punto es que se puedan descubrir.
test.describe("Janus — Tags Ofrezco/Busco", () => {
  const e2eDb = createE2eDb();
  let cardSlug: string;
  let adminId: string;

  test.beforeAll(async () => {
    await e2eDb.connect();
    const suffix = Date.now();
    cardSlug = `e2e-tags-card-${suffix}`;
    await e2eDb.query(
      `insert into "Card" (id, slug, "updatedAt", name, title, quote) values (gen_random_uuid()::text, $1, now(), $2, $3, $4)`,
      [cardSlug, "E2E Tags Owner", "N/A", "cita"]
    );

    const passwordHash = await bcrypt.hash("no-se-usa-login-por-cookie", 10);
    const admin = await e2eDb.query<{ id: string }>(
      `insert into "Admin" (id, email, "passwordHash", "programId", "updatedAt") values (gen_random_uuid()::text, $1, $2, null, now()) returning id`,
      [`e2e-tags-admin-${suffix}@example.com`, passwordHash]
    );
    adminId = admin.rows[0].id;
  });

  test.afterAll(async () => {
    await e2eDb.query(`delete from "Tag" where "cardId" in (select id from "Card" where slug = $1)`, [cardSlug]).catch(() => {});
    await e2eDb.query(`delete from "Card" where slug = $1`, [cardSlug]).catch(() => {});
    await e2eDb.query(`delete from "Admin" where id = $1`, [adminId]).catch(() => {});
    await e2eDb.end();
  });

  test("el dueño agrega un tag, y un visitante lo ve en solo lectura (sin poder editarlo)", async ({ browser }) => {
    const ownerContext = await browser.newContext();
    const cookie = await mintAdminCookie(adminId);
    await ownerContext.addCookies([{ ...cookie, url: BASE_URL }]);
    const ownerPage = await ownerContext.newPage();

    await ownerPage.goto(`${BASE_URL}/c/${cardSlug}/oficina`, { waitUntil: "networkidle" });
    await ownerPage.getByText("+ Agregar", { exact: true }).click();
    await ownerPage.getByPlaceholder("Ej: sandwich de miga, certificación ISO 9001...").fill("sandwich de miga");
    await ownerPage.getByRole("radio", { name: "Ofrezco" }).check();
    await ownerPage.getByRole("button", { name: "Guardar", exact: true }).click();
    await expect(ownerPage.getByText("sandwich de miga")).toBeVisible();
    await ownerContext.close();

    const visitorContext = await browser.newContext();
    const visitorPage = await visitorContext.newPage();
    await visitorPage.goto(`${BASE_URL}/c/${cardSlug}/oficina`, { waitUntil: "networkidle" });

    await expect(visitorPage.getByText("sandwich de miga")).toBeVisible();
    // Público mata lectura, nunca escritura: un visitante no ve el botón
    // de agregar ni el de borrar tags.
    await expect(visitorPage.getByText("+ Agregar", { exact: true })).toHaveCount(0);
    await expect(visitorPage.getByLabel("Borrar sandwich de miga")).toHaveCount(0);

    await visitorContext.close();
  });
});

// El caso literal que dio Gunnar como ejemplo: alguien busca un
// sandwich de miga, alguien más en la red lo tiene — Janus tiene que
// encontrar ese cruce sobre TODA la red (dos Cards que no comparten
// Programa ni relación previa), y nunca mezclar Cards isDemo.
test.describe("Janus — /admin/janus encuentra cruces reales", () => {
  const e2eDb = createE2eDb();
  let buscaSlug: string;
  let ofreceSlug: string;
  let demoSlug: string;
  let adminId: string;
  let cardIds: string[];

  test.beforeAll(async () => {
    await e2eDb.connect();
    const suffix = Date.now();

    buscaSlug = `e2e-janus-busca-${suffix}`;
    ofreceSlug = `e2e-janus-ofrece-${suffix}`;
    demoSlug = `e2e-janus-demo-${suffix}`;

    const busca = await e2eDb.query<{ id: string }>(
      `insert into "Card" (id, slug, "updatedAt", name, title, quote) values (gen_random_uuid()::text, $1, now(), $2, $3, $4) returning id`,
      [buscaSlug, "E2E Necesita Sandwich", "N/A", "cita"]
    );
    const ofrece = await e2eDb.query<{ id: string }>(
      `insert into "Card" (id, slug, "updatedAt", name, title, quote) values (gen_random_uuid()::text, $1, now(), $2, $3, $4) returning id`,
      [ofreceSlug, "E2E Tiene Sandwich", "N/A", "cita"]
    );
    const demo = await e2eDb.query<{ id: string }>(
      `insert into "Card" (id, slug, "updatedAt", name, title, quote, "isDemo") values (gen_random_uuid()::text, $1, now(), $2, $3, $4, true) returning id`,
      [demoSlug, "E2E Card Demo", "N/A", "cita"]
    );
    cardIds = [busca.rows[0].id, ofrece.rows[0].id, demo.rows[0].id];

    await e2eDb.query(
      `insert into "Tag" (id, "cardId", text, normalized, polarity, "updatedAt") values (gen_random_uuid()::text, $1, $2, $2, 'busco', now())`,
      [busca.rows[0].id, "sandwich de miga"]
    );
    await e2eDb.query(
      `insert into "Tag" (id, "cardId", text, normalized, polarity, "updatedAt") values (gen_random_uuid()::text, $1, $2, $2, 'ofrezco', now())`,
      [ofrece.rows[0].id, "sandwich de miga"]
    );
    // Card demo con el mismo tag "ofrezco" -- nunca debe aparecer en el
    // ranking, aunque cruzaría perfecto si se colara.
    await e2eDb.query(
      `insert into "Tag" (id, "cardId", text, normalized, polarity, "updatedAt") values (gen_random_uuid()::text, $1, $2, $2, 'ofrezco', now())`,
      [demo.rows[0].id, "sandwich de miga"]
    );

    const passwordHash = await bcrypt.hash("no-se-usa-login-por-cookie", 10);
    const admin = await e2eDb.query<{ id: string }>(
      `insert into "Admin" (id, email, "passwordHash", "programId", "updatedAt") values (gen_random_uuid()::text, $1, $2, null, now()) returning id`,
      [`e2e-janus-admin-${suffix}@example.com`, passwordHash]
    );
    adminId = admin.rows[0].id;
  });

  test.afterAll(async () => {
    await e2eDb.query(`delete from "Tag" where "cardId" = any($1)`, [cardIds]).catch(() => {});
    await e2eDb.query(`delete from "Card" where id = any($1)`, [cardIds]).catch(() => {});
    await e2eDb.query(`delete from "Admin" where id = $1`, [adminId]).catch(() => {});
    await e2eDb.end();
  });

  test("MasterN0 ve el cruce real en /admin/janus, sin la Card demo mezclada", async ({ browser }) => {
    const context = await browser.newContext();
    const cookie = await mintAdminCookie(adminId);
    await context.addCookies([{ ...cookie, url: BASE_URL }]);
    const page = await context.newPage();

    await page.goto(`${BASE_URL}/admin/janus`, { waitUntil: "networkidle" });

    await expect(page.getByText("E2E Necesita Sandwich", { exact: false }).first()).toBeVisible();
    await expect(page.getByText("E2E Tiene Sandwich", { exact: false }).first()).toBeVisible();
    await expect(page.getByText("sandwich de miga → sandwich de miga", { exact: false })).toBeVisible();

    // La Card demo nunca debe aparecer, aunque tenga el mismo tag exacto.
    await expect(page.getByText("E2E Card Demo")).toHaveCount(0);

    await context.close();
  });
});
