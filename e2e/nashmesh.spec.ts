import { test, expect } from "@playwright/test";
import bcrypt from "bcryptjs";
import { createE2eDb, mintAdminCookie } from "./helpers/adminSession";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";

// NashMesh (pedido de Gunnar, 2026-09-23) — el motor de reparto
// Payment = φ × ψ × (1-ε), disparado típicamente desde un cruce
// confirmado de Janus. Esta prueba llega a /admin/nashmesh con el
// prefill real que manda /admin/janus (?fromCardId=&fromName=...) y
// confirma que el número calculado es matemáticamente correcto, no solo
// que la pantalla carga.
test.describe("NashMesh — simulador de reparto", () => {
  const e2eDb = createE2eDb();
  let cardId: string;
  let cardName: string;
  let adminId: string;

  test.beforeAll(async () => {
    await e2eDb.connect();
    const suffix = Date.now();
    cardName = "E2E Panadería Doña Rosa";
    const card = await e2eDb.query<{ id: string }>(
      `insert into "Card" (id, slug, "updatedAt", name, title, quote) values (gen_random_uuid()::text, $1, now(), $2, $3, $4) returning id`,
      [`e2e-nashmesh-${suffix}`, cardName, "N/A", "cita"]
    );
    cardId = card.rows[0].id;

    const passwordHash = await bcrypt.hash("no-se-usa-login-por-cookie", 10);
    const admin = await e2eDb.query<{ id: string }>(
      `insert into "Admin" (id, email, "passwordHash", "programId", "updatedAt") values (gen_random_uuid()::text, $1, $2, null, now()) returning id`,
      [`e2e-nashmesh-admin-${suffix}@example.com`, passwordHash]
    );
    adminId = admin.rows[0].id;
  });

  test.afterAll(async () => {
    await e2eDb.query(`delete from "NashMeshRun" where label like 'E2E Reparto%'`).catch(() => {});
    await e2eDb.query(`delete from "Card" where id = $1`, [cardId]).catch(() => {});
    await e2eDb.query(`delete from "Admin" where id = $1`, [adminId]).catch(() => {});
    await e2eDb.end();
  });

  test("llega con prefill desde un match de Janus, simula, y el reparto calculado es correcto", async ({ browser }) => {
    const context = await browser.newContext();
    const cookie = await mintAdminCookie(adminId);
    await context.addCookies([{ ...cookie, url: BASE_URL }]);
    const page = await context.newPage();

    const url = `${BASE_URL}/admin/nashmesh?fromCardId=${cardId}&fromName=${encodeURIComponent(cardName)}&toCardId=e2e-externo&toName=${encodeURIComponent("El Estado")}`;
    await page.goto(url, { waitUntil: "networkidle" });

    // El prefill ya trajo los dos participantes -- confirmamos que
    // aparecen sin tener que agregarlos a mano. Filtramos el botón que
    // togglea cada fila por su texto en vez de usar getByText a secas,
    // que también matchea el nombre repetido adentro del <select> de
    // cada fila (una <option> por cada Card real de la plataforma).
    await expect(page.getByRole("button").filter({ hasText: cardName })).toBeVisible();
    await expect(page.getByRole("button").filter({ hasText: "El Estado" })).toBeVisible();

    await page.getByPlaceholder("Nombre de esta simulación", { exact: false }).fill("E2E Reparto Panadería x Estado");
    await page.locator('input[name="totalValueUsd"]').fill("1000");
    await page.locator('input[name="epsilon"]').fill("0"); // sin comisión, matemática más simple de verificar

    // El prefill ya deja los dos participantes en 50% declarado / ψ
    // nivel 3 (100%) por default -- ni hace falta abrirlos a mano.
    await page.getByRole("button", { name: "Simular reparto", exact: true }).click();
    await page.waitForURL(/\/admin\/nashmesh$/, { waitUntil: "networkidle" });

    await expect(page.getByText("E2E Reparto Panadería x Estado")).toBeVisible();
    await expect(page.getByText("SIMULACIÓN", { exact: true })).toBeVisible();
    // Los dos participantes venían con 50% declarado por default -- con
    // epsilon 0 y psi 100% (nivel 3 default), cada uno se lleva $500.
    await expect(page.getByText("$500.00").first()).toBeVisible();

    await context.close();
  });
});
