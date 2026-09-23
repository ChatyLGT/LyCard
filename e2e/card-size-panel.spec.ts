import { test, expect } from "@playwright/test";
import bcrypt from "bcryptjs";
import { createE2eDb, mintAdminCookie } from "./helpers/adminSession";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";

// Tamaños ajustables por Card (2026-09-23, pedido de Gunnar: "aprieto de
// forma sostenida y salta el ajuste"). Confirma el flujo completo: solo
// el dueño puede activarlo con long-press, el slider cambia la tarjeta
// real EN VIVO (antes de guardar -- se verifica leyendo la variable CSS
// real, no un mock), y el valor persiste tras recargar la página.
test.describe("Panel de tamaños ajustables — long-press en la LyCard", () => {
  const e2eDb = createE2eDb();
  let cardSlug: string;
  let cardId: string;
  let adminId: string;

  test.beforeAll(async () => {
    await e2eDb.connect();
    const suffix = Date.now();
    cardSlug = `e2e-size-${suffix}`;
    const card = await e2eDb.query<{ id: string }>(
      `insert into "Card" (id, slug, "updatedAt", name, title, quote) values (gen_random_uuid()::text, $1, now(), $2, $3, $4) returning id`,
      [cardSlug, "E2E Tamaños", "N/A", "cita"]
    );
    cardId = card.rows[0].id;

    const passwordHash = await bcrypt.hash("no-se-usa-login-por-cookie", 10);
    const admin = await e2eDb.query<{ id: string }>(
      `insert into "Admin" (id, email, "passwordHash", "programId", "updatedAt") values (gen_random_uuid()::text, $1, $2, null, now()) returning id`,
      [`e2e-size-admin-${suffix}@example.com`, passwordHash]
    );
    adminId = admin.rows[0].id;
  });

  test.afterAll(async () => {
    await e2eDb.query(`delete from "Card" where id = $1`, [cardId]).catch(() => {});
    await e2eDb.query(`delete from "Admin" where id = $1`, [adminId]).catch(() => {});
    await e2eDb.end();
  });

  test("long-press abre el panel, el slider cambia la tarjeta real en vivo, y se guarda de verdad", async ({ browser }) => {
    const context = await browser.newContext();
    const cookie = await mintAdminCookie(adminId);
    await context.addCookies([{ ...cookie, url: BASE_URL }]);
    const page = await context.newPage();

    await page.goto(`${BASE_URL}/c/${cardSlug}`, { waitUntil: "networkidle" });

    // Long-press en una zona neutra de la tarjeta (arriba, sin botones)
    await page.mouse.move(60, 40);
    await page.mouse.down();
    await page.waitForTimeout(700);
    await expect(page.getByText("Ajustar tamaños", { exact: true })).toBeVisible();
    await page.mouse.up();

    const wrapper = page.locator('[style*="--scale-photo"]').first();
    const before = await wrapper.evaluate((el) => getComputedStyle(el).getPropertyValue("--scale-photo").trim());
    expect(before).toBe("1.00");

    // Muevo el slider de "Foto" a 70% -- primero de los 4 en el orden
    // de CARD_SIZE_KEYS (photo, qrBtn, cubeMedium, socialIcon)
    const photoSlider = page.locator('input[type="range"]').first();
    await photoSlider.fill("0.7");

    // Cambio EN VIVO -- la tarjeta real, atrás del panel, ya refleja el
    // nuevo valor antes de tocar "Guardar"
    const live = await wrapper.evaluate((el) => getComputedStyle(el).getPropertyValue("--scale-photo").trim());
    expect(live).toBe("0.70");

    await page.getByRole("button", { name: "Guardar", exact: true }).click();
    await page.waitForTimeout(400);

    // Persistido de verdad en la DB, no solo en el estado de React
    const row = await e2eDb.query<{ sizeConfig: unknown }>(`select "sizeConfig" from "Card" where id = $1`, [cardId]);
    expect((row.rows[0].sizeConfig as Record<string, number>).photo).toBe(0.7);

    // Recargo -- el valor sigue ahí, sin necesidad de reabrir el panel
    await page.reload({ waitUntil: "networkidle" });
    const afterReload = await wrapper.evaluate((el) => getComputedStyle(el).getPropertyValue("--scale-photo").trim());
    expect(afterReload).toBe("0.70");

    await context.close();
  });

  test("un visitante (sin sesión) nunca dispara el panel -- el long-press no hace nada", async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(`${BASE_URL}/c/${cardSlug}`, { waitUntil: "networkidle" });

    await page.mouse.move(60, 40);
    await page.mouse.down();
    await page.waitForTimeout(700);
    await expect(page.getByText("Ajustar tamaños", { exact: true })).toHaveCount(0);
    await page.mouse.up();

    await context.close();
  });
});
