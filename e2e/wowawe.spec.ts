import { test, expect } from "@playwright/test";
import { createE2eDb, mintMemberCookie } from "./helpers/adminSession";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";

// 1x1 PNG real, mínimo posible -- suficiente para probar el flujo de
// subida de verdad sin depender de un archivo en disco.
const TINY_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64"
);

// WowAwe (2026-09-24): la primera WowApp del catálogo con lógica real
// conectada -- el resto sigue "próximamente". Cubre el flujo real: el
// dueño de una Card personal abre WowAwe desde su Oficina, sube sus 3
// selfies (sin nota de voz -- MediaRecorder no es parte de este spec,
// eso ya lo prueba focus-mode.spec.ts para el mismo pipeline), guarda
// la caminata, y confirma que aparece en su historial con el Índice de
// Asombro (simulado) y que la fila real quedó en la DB.
test.describe("WowAwe", () => {
  const e2eDb = createE2eDb();
  const suffix = Date.now();
  const wowAppKey = `wowawe-e2e-${suffix}`;
  let memberId: string;
  let cardId: string;
  let cardSlug: string;
  let wowAppId: string;

  test.beforeAll(async () => {
    await e2eDb.connect();

    const wowApp = await e2eDb.query<{ id: string }>(
      `insert into "WowApp" (id, key, nombre, descripcion, "appType", "industryTags", "painPointTags", "basePriceUsd", status, "updatedAt") values (gen_random_uuid()::text, $1, 'WowAwe E2E', 'Caminata de asombro', 'awe', '[]', '["bienestar-fundador"]', 0, 'activo', now()) returning id`,
      [wowAppKey]
    );
    wowAppId = wowApp.rows[0].id;

    const member = await e2eDb.query<{ id: string }>(
      `insert into "Member" (id, whatsapp, name, "updatedAt") values (gen_random_uuid()::text, $1, $2, now()) returning id`,
      [`+52705${suffix}`, "Fundador E2E"]
    );
    memberId = member.rows[0].id;

    cardSlug = `e2e-wowawe-personal-${suffix}`;
    const card = await e2eDb.query<{ id: string }>(
      `insert into "Card" (id, slug, "updatedAt", name, title, quote, kind, "memberId") values (gen_random_uuid()::text, $1, now(), $2, 'Fundador', 'cita', 'personal', $3) returning id`,
      [cardSlug, "Fundador E2E", memberId]
    );
    cardId = card.rows[0].id;

    // Ya instalada -- este spec prueba lo que pasa DESPUÉS de instalar
    // (registrar una caminata), no el flujo de instalación en sí (eso
    // ya lo cubre wowstore.spec.ts).
    await e2eDb.query(
      `insert into "WowAppInstall" (id, "cardId", "wowAppId", "installedAt") values (gen_random_uuid()::text, $1, $2, now())`,
      [cardId, wowAppId]
    );
  });

  test.afterAll(async () => {
    await e2eDb.query(`delete from "AweWalkEntry" where "cardId" = $1`, [cardId]).catch(() => {});
    await e2eDb.query(`delete from "WowAppInstall" where "cardId" = $1`, [cardId]).catch(() => {});
    await e2eDb.query(`delete from "Card" where id = $1`, [cardId]).catch(() => {});
    await e2eDb.query(`delete from "Member" where id = $1`, [memberId]).catch(() => {});
    await e2eDb.query(`delete from "WowApp" where id = $1`, [wowAppId]).catch(() => {});
    await e2eDb.end();
  });

  test("el dueño sube sus 3 selfies, guarda la caminata, y ve el Índice de Asombro en su historial", async ({ browser }) => {
    const context = await browser.newContext();
    const memberCookie = await mintMemberCookie(memberId);
    await context.addCookies([{ ...memberCookie, url: BASE_URL }]);
    const page = await context.newPage();

    await page.goto(`${BASE_URL}/c/${cardSlug}/oficina`, { waitUntil: "networkidle" });
    await expect(page.getByText("WowApps", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: /WowAwe E2E/ }).click();

    await expect(page.getByText(/Salí a caminar 15 minutos/)).toBeVisible();

    const fileInputs = page.locator('input[type="file"]');
    await expect(fileInputs).toHaveCount(3);
    for (let i = 0; i < 3; i++) {
      await fileInputs.nth(i).setInputFiles({ name: `awe-${i}.png`, mimeType: "image/png", buffer: TINY_PNG });
    }

    await page.getByRole("button", { name: "Guardar caminata" }).click();
    await expect(page.getByText("✓ Caminata guardada.")).toBeVisible();
    await expect(page.getByText(/Índice de Asombro \(simulado/)).toBeVisible();

    const entryRow = await e2eDb.query<{ id: string; aweIndex: number; photoStartUrl: string }>(
      `select id, "aweIndex", "photoStartUrl" from "AweWalkEntry" where "cardId" = $1`,
      [cardId]
    );
    expect(entryRow.rows).toHaveLength(1);
    expect(entryRow.rows[0].aweIndex).toBeGreaterThanOrEqual(40);
    expect(entryRow.rows[0].aweIndex).toBeLessThanOrEqual(85);
    expect(entryRow.rows[0].photoStartUrl).not.toBe("");

    await context.close();
  });
});
