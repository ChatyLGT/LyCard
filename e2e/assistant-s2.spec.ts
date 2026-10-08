import { test, expect } from "@playwright/test";
import bcrypt from "bcryptjs";
import { createE2eDb, mintAdminCookie } from "./helpers/adminSession";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";

// Asistente "Configura tu LyCard" v2 -- Paso 2 (2026-10-08): el lector
// del guion (lib/assistantScript.ts#primeraPreguntaSinResponder) + S2
// (app/c/[slug]/asistente/pista/[pistaId]/page.tsx), probado con las 2
// preguntas de ejemplo reales del guion (medal.mide, medal.fuente).
// Mismo criterio que assistant-s0.spec.ts: reusa la Card "mastern0"
// real (la única isOrigin que puede existir); los tests de este
// archivo corren en orden y construyen sobre la sesión del anterior.
test.describe("Asistente Configura tu LyCard -- lector del guion + S2", () => {
  const e2eDb = createE2eDb();
  const suffix = Date.now();
  let masterN0AdminId: string;
  let scopedAdminId: string;
  let sessionId: string;

  test.beforeAll(async () => {
    await e2eDb.connect();

    const mastern0 = await e2eDb.query<{ id: string }>(`select id from "Card" where slug = 'mastern0'`);
    if (!mastern0.rows[0]) throw new Error("No existe la Card 'mastern0' en esta DB -- correr prisma/seed.ts primero.");

    const passwordHash = await bcrypt.hash("no-se-usa-login-por-cookie", 10);
    const admin = await e2eDb.query<{ id: string }>(
      `insert into "Admin" (id, email, "passwordHash", "programId", "updatedAt") values (gen_random_uuid()::text, $1, $2, null, now()) returning id`,
      [`e2e-asistente-s2-mastern0-${suffix}@example.com`, passwordHash]
    );
    masterN0AdminId = admin.rows[0].id;

    const program = await e2eDb.query<{ id: string }>(
      `insert into "Program" (id, slug, name, "updatedAt") values (gen_random_uuid()::text, $1, 'E2E Asistente S2 Programa', now()) returning id`,
      [`e2e-asistente-s2-programa-${suffix}`]
    );
    const scopedAdmin = await e2eDb.query<{ id: string }>(
      `insert into "Admin" (id, email, "passwordHash", "programId", "updatedAt") values (gen_random_uuid()::text, $1, $2, $3, now()) returning id`,
      [`e2e-asistente-s2-scoped-${suffix}@example.com`, passwordHash, program.rows[0].id]
    );
    scopedAdminId = scopedAdmin.rows[0].id;
  });

  test.afterAll(async () => {
    if (sessionId) {
      await e2eDb.query(`delete from "AssistantAnswer" where "sessionId" = $1`, [sessionId]).catch(() => {});
    }
    await e2eDb.query(`delete from "AssistantSession" where "adminId" in ($1, $2)`, [masterN0AdminId, scopedAdminId]).catch(() => {});
    await e2eDb.query(`delete from "Admin" where id = $1`, [scopedAdminId]).catch(() => {});
    await e2eDb.query(`delete from "Program" where name = 'E2E Asistente S2 Programa'`).catch(() => {});
    await e2eDb.query(`delete from "Admin" where id = $1`, [masterN0AdminId]).catch(() => {});
    await e2eDb.end();
  });

  test("S0: 'Tu programa' lleva a S1 (índice), y la primera pregunta de ahí entra a S2 en medal.mide", async ({ browser }) => {
    const context = await browser.newContext();
    await context.addCookies([{ ...(await mintAdminCookie(masterN0AdminId)), url: BASE_URL }]);
    const page = await context.newPage();

    await page.goto(`${BASE_URL}/c/mastern0/asistente`, { waitUntil: "networkidle" });
    const link = page.getByRole("link", { name: /Tu programa/ });
    await expect(link).toBeVisible();
    await link.click();

    await page.waitForURL(/\/c\/mastern0\/asistente\/indice/);
    await expect(page.getByText("Medalla", { exact: true })).toBeVisible();

    await page.getByText("¿Qué mide el Medallón de Resultados en Legacy?").click();
    await page.waitForURL(/\/c\/mastern0\/asistente\/pista\/programa\?pregunta=medal\.mide&volver=indice$/);
    await expect(page.getByRole("heading", { name: "¿Qué mide el Medallón de Resultados en Legacy?" })).toBeVisible();
    await expect(page.getByText("Pregunta 1 de 2")).toBeVisible();

    const session = await e2eDb.query<{ id: string }>(`select id from "AssistantSession" where "adminId" = $1`, [masterN0AdminId]);
    expect(session.rows).toHaveLength(1);
    sessionId = session.rows[0].id;
  });

  test("responde la primera con una opción + por qué -- guarda y avanza a la segunda", async ({ browser }) => {
    const context = await browser.newContext();
    await context.addCookies([{ ...(await mintAdminCookie(masterN0AdminId)), url: BASE_URL }]);
    const page = await context.newPage();

    await page.goto(`${BASE_URL}/c/mastern0/asistente/pista/programa`, { waitUntil: "networkidle" });
    await page.getByLabel("Al negocio del miembro").check();
    await page.getByLabel("¿Por qué? (opcional)").fill("Así lo decidimos con N0 en el ensayo.");
    await page.getByRole("button", { name: "Guardar y seguir" }).click();

    await page.waitForURL(/\/c\/mastern0\/asistente\/pista\/programa$/);
    await expect(page.getByRole("heading", { name: "¿De dónde sale el nivel de Resultados de un negocio?" })).toBeVisible();
    await expect(page.getByText("Pregunta 2 de 2")).toBeVisible();

    const answer = await e2eDb.query<{ valor: { opcionId: string } | null; porque: string | null; estado: string }>(
      `select valor, porque, estado from "AssistantAnswer" where "sessionId" = $1 and "preguntaId" = 'medal.mide'`,
      [sessionId]
    );
    expect(answer.rows).toHaveLength(1);
    expect(answer.rows[0].valor).toEqual({ opcionId: "negocio" });
    expect(answer.rows[0].porque).toBe("Así lo decidimos con N0 en el ensayo.");
    expect(answer.rows[0].estado).toBe("propuesto");
  });

  test("'Todavía no sé' en la segunda -- guarda como decisión abierta y, sin más preguntas, vuelve a S0", async ({ browser }) => {
    const context = await browser.newContext();
    await context.addCookies([{ ...(await mintAdminCookie(masterN0AdminId)), url: BASE_URL }]);
    const page = await context.newPage();

    await page.goto(`${BASE_URL}/c/mastern0/asistente/pista/programa`, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Todavía no sé" }).click();

    await page.waitForURL(/\/c\/mastern0\/asistente$/);
    await expect(page.getByText("2 de 2", { exact: true })).toBeVisible();
    await expect(page.getByText("Todo respondido por ahora")).toBeVisible();

    const answer = await e2eDb.query<{ valor: unknown; estado: string }>(
      `select valor, estado from "AssistantAnswer" where "sessionId" = $1 and "preguntaId" = 'medal.fuente'`,
      [sessionId]
    );
    expect(answer.rows).toHaveLength(1);
    expect(answer.rows[0].valor).toBeNull();
    expect(answer.rows[0].estado).toBe("abierto");
  });

  test("al reentrar a la pista programa sin preguntas pendientes, vuelve directo a S0", async ({ browser }) => {
    const context = await browser.newContext();
    await context.addCookies([{ ...(await mintAdminCookie(masterN0AdminId)), url: BASE_URL }]);
    const page = await context.newPage();

    await page.goto(`${BASE_URL}/c/mastern0/asistente/pista/programa`, { waitUntil: "networkidle" });
    await expect(page).toHaveURL(`${BASE_URL}/c/mastern0/asistente`);
  });

  test("una pista sin preguntas (personal) no revienta -- redirige a S0", async ({ browser }) => {
    const context = await browser.newContext();
    await context.addCookies([{ ...(await mintAdminCookie(masterN0AdminId)), url: BASE_URL }]);
    const page = await context.newPage();

    await page.goto(`${BASE_URL}/c/mastern0/asistente/pista/personal`, { waitUntil: "networkidle" });
    await expect(page).toHaveURL(`${BASE_URL}/c/mastern0/asistente`);
  });

  test("un N0 escopeado (no MasterN0) no entra a S2 de mastern0", async ({ browser }) => {
    const context = await browser.newContext();
    await context.addCookies([{ ...(await mintAdminCookie(scopedAdminId)), url: BASE_URL }]);
    const page = await context.newPage();

    await page.goto(`${BASE_URL}/c/mastern0/asistente/pista/programa`, { waitUntil: "networkidle" });
    await expect(page).toHaveURL(`${BASE_URL}/c/mastern0`);
  });

  test("un visitante anónimo no entra a S2 de mastern0", async ({ page }) => {
    await page.goto(`${BASE_URL}/c/mastern0/asistente/pista/programa`, { waitUntil: "networkidle" });
    await expect(page).toHaveURL(`${BASE_URL}/c/mastern0`);
  });

  test("una pistaId inválida en la URL da 404, no revienta", async ({ browser }) => {
    const context = await browser.newContext();
    await context.addCookies([{ ...(await mintAdminCookie(masterN0AdminId)), url: BASE_URL }]);
    const page = await context.newPage();

    const response = await page.goto(`${BASE_URL}/c/mastern0/asistente/pista/no-existe`, { waitUntil: "networkidle" });
    expect(response?.status()).toBe(404);
  });
});
