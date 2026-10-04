import { test, expect } from "@playwright/test";
import { createE2eDb } from "./helpers/adminSession";

// Smoke test — confirma que el pipeline entero (build, Postgres,
// migraciones, server arriba) sirve una tarjeta pública sin romperse.
// A propósito NO depende de ningún dato pre-sembrado (ni "mastern0" ni
// el seed de prisma/seed.ts) — crea y borra su propia Card, para que
// corra igual de bien contra una DB de CI recién migrada que contra
// cualquier DB de desarrollo local, sin importar qué haya en ella.
test.describe("Tarjeta pública — smoke test", () => {
  const e2eDb = createE2eDb();
  let cardSlug: string;
  let cardName: string;

  test.beforeAll(async () => {
    await e2eDb.connect();
    const suffix = Date.now();
    cardSlug = `e2e-smoke-${suffix}`;
    cardName = `E2E Smoke ${suffix}`;
    await e2eDb.query(
      `insert into "Card" (id, slug, "updatedAt", name, title, quote) values (gen_random_uuid()::text, $1, now(), $2, $3, $4)`,
      [cardSlug, cardName, "Test Title", "Test Quote"]
    );
  });

  test.afterAll(async () => {
    await e2eDb.query(`delete from "Card" where slug = $1`, [cardSlug]).catch(() => {});
    await e2eDb.end();
  });

  test("la tarjeta pública carga sin errores y muestra el nombre real", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    const response = await page.goto(`/c/${cardSlug}`, { waitUntil: "networkidle" });
    expect(response?.ok()).toBe(true);
    await expect(page.locator("body")).toContainText(cardName);
    expect(errors).toEqual([]);
  });

  test("una tarjeta inexistente da 404, no un error crudo", async ({ page }) => {
    const response = await page.goto("/c/esta-tarjeta-no-existe-nunca", { waitUntil: "networkidle" });
    expect(response?.status()).toBe(404);
  });

  // 2026-10-04, pedido de Gunnar: "el boton de Mi Camino.. que ahora es
  // el boton de mas informacion sobre legacy.. quiero que al picar ese
  // boton salga el modal que sale ahora en el que dice Info.. el mismo".
  // Cubre que, en una Card de proyecto (Legacy), ese botón ya no abre su
  // propio modal de "Mi Camino" -- abre el mismo modal rico de "Info"
  // (infoTitle/pil1/pil2/pil3) que el cubo "Info" de más abajo. Company/
  // personal no se tocan (tienen su propio "Mi camino"/"Mi Viaje" real).
  test("Mi camino (Legacy): abre el mismo modal de Info, no el de Mi Camino", async ({ page }) => {
    await page.goto(`/c/${cardSlug}`, { waitUntil: "networkidle" });

    await page.getByText("Mi camino", { exact: true }).click();

    await expect(page.getByText("Construcción y Protección de Legado Patrimonial", { exact: true })).toBeVisible();
    await expect(page.getByText("Descubrí en Legacy una forma de trascender", { exact: false })).toHaveCount(0);
  });
});
