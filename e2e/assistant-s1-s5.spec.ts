import { test, expect } from "@playwright/test";
import bcrypt from "bcryptjs";
import { createE2eDb, mintAdminCookie } from "./helpers/adminSession";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";

// Asistente "Configura tu LyCard" v2 -- Paso 2b + Paso 3 (2026-10-08):
// S1 (el índice completo, con el mapa de las 3 pistas y el estado real
// de cada espacio) y S5 (decisiones abiertas), más la edición de
// respuestas ya guardadas que pidió Gunnar al aprobar el Paso 2 --
// S2 ahora acepta `?pregunta=<id>&volver=indice|abiertas` para abrir
// una pregunta puntual (respondida o no) y volver a donde vino, en vez
// de seguir avanzando por la pista. Mismo criterio que
// assistant-s2.spec.ts: reusa "mastern0" real, admin descartable propio.
test.describe("Asistente Configura tu LyCard -- S1 (índice) + S5 (decisiones abiertas)", () => {
  const e2eDb = createE2eDb();
  const suffix = Date.now();
  let masterN0AdminId: string;
  let scopedAdminId: string;
  let sessionId: string;

  test.beforeAll(async () => {
    await e2eDb.connect();

    const mastern0 = await e2eDb.query<{ id: string }>(`select id from "Card" where slug = 'mastern0'`);
    if (!mastern0.rows[0]) throw new Error("No existe la Card 'mastern0' en esta DB -- correr prisma/seed.ts primero.");
    const mastern0CardId = mastern0.rows[0].id;

    const passwordHash = await bcrypt.hash("no-se-usa-login-por-cookie", 10);
    const admin = await e2eDb.query<{ id: string }>(
      `insert into "Admin" (id, email, "passwordHash", "programId", "updatedAt") values (gen_random_uuid()::text, $1, $2, null, now()) returning id`,
      [`e2e-asistente-s1s5-mastern0-${suffix}@example.com`, passwordHash]
    );
    masterN0AdminId = admin.rows[0].id;

    const program = await e2eDb.query<{ id: string }>(
      `insert into "Program" (id, slug, name, "updatedAt") values (gen_random_uuid()::text, $1, 'E2E Asistente S1S5 Programa', now()) returning id`,
      [`e2e-asistente-s1s5-programa-${suffix}`]
    );
    const scopedAdmin = await e2eDb.query<{ id: string }>(
      `insert into "Admin" (id, email, "passwordHash", "programId", "updatedAt") values (gen_random_uuid()::text, $1, $2, $3, now()) returning id`,
      [`e2e-asistente-s1s5-scoped-${suffix}@example.com`, passwordHash, program.rows[0].id]
    );
    scopedAdminId = scopedAdmin.rows[0].id;

    // La sesión se inserta directo (mismo patrón de fixtures por SQL
    // que el resto del archivo) en vez de visitar S0 con un browser --
    // S0 solo la crea si no existe, así que esto es equivalente.
    const session = await e2eDb.query<{ id: string }>(
      `insert into "AssistantSession" (id, "adminId", "cardId", estado, "updatedAt") values (gen_random_uuid()::text, $1, $2, 'en_curso', now()) returning id`,
      [masterN0AdminId, mastern0CardId]
    );
    sessionId = session.rows[0].id;
  });

  test.afterAll(async () => {
    await e2eDb.query(`delete from "AssistantAnswer" where "sessionId" = $1`, [sessionId]).catch(() => {});
    await e2eDb.query(`delete from "AssistantSession" where "adminId" in ($1, $2)`, [masterN0AdminId, scopedAdminId]).catch(() => {});
    await e2eDb.query(`delete from "Admin" where id = $1`, [scopedAdminId]).catch(() => {});
    await e2eDb.query(`delete from "Program" where name = 'E2E Asistente S1S5 Programa'`).catch(() => {});
    await e2eDb.query(`delete from "Admin" where id = $1`, [masterN0AdminId]).catch(() => {});
    await e2eDb.end();
  });

  test("S1 muestra el mapa completo: Medalla con sus 2 preguntas, el resto 'Sin guion aún', negocio 'Pendiente, sin tarjeta todavía'", async ({ browser }) => {
    const context = await browser.newContext();
    await context.addCookies([{ ...(await mintAdminCookie(masterN0AdminId)), url: BASE_URL }]);
    const page = await context.newPage();

    await page.goto(`${BASE_URL}/c/mastern0/asistente/indice`, { waitUntil: "networkidle" });
    await expect(page.getByRole("heading", { name: "Índice" })).toBeVisible();
    await expect(page.getByText("Medalla", { exact: true })).toBeVisible();
    await expect(page.getByText("¿Qué mide el Medallón de Resultados en Legacy?")).toBeVisible();
    await expect(page.getByText("¿De dónde sale el nivel de Resultados de un negocio?")).toBeVisible();
    await expect(page.getByText("Medalla KPIs")).toBeVisible();
    await expect(page.getByText("Sin guion aún").first()).toBeVisible();
    await expect(page.getByText("Datos básicos")).toBeVisible();
    await expect(page.getByText("Pendiente, sin tarjeta todavía")).toBeVisible();
    await expect(page.getByRole("link", { name: "Decisiones abiertas" })).toBeVisible();
  });

  test("responder medal.mide desde S1 guarda y vuelve a S1 (no sigue avanzando por la pista)", async ({ browser }) => {
    const context = await browser.newContext();
    await context.addCookies([{ ...(await mintAdminCookie(masterN0AdminId)), url: BASE_URL }]);
    const page = await context.newPage();

    await page.goto(`${BASE_URL}/c/mastern0/asistente/indice`, { waitUntil: "networkidle" });
    await page.getByText("¿Qué mide el Medallón de Resultados en Legacy?").click();
    await page.waitForURL(/\/pista\/programa\?pregunta=medal\.mide&volver=indice$/);

    // Sin respuesta previa ni preset -- la propuesta del guion
    // ("negocio") viene preseleccionada (Paso 2b, prioridad usuario >
    // preset > propuesta).
    await expect(page.getByLabel("Al negocio del miembro")).toBeChecked();

    await page.getByLabel("Al programa").check();
    await page.getByRole("button", { name: "Guardar y seguir" }).click();

    // Vuelve a S1, NO a "¿De dónde sale...?" -- edición puntual, no
    // avance de pista.
    await page.waitForURL(/\/c\/mastern0\/asistente\/indice$/);
    await expect(page.getByRole("heading", { name: "¿De dónde sale el nivel de Resultados de un negocio?" })).not.toBeVisible();

    const answer = await e2eDb.query<{ valor: { opcionId: string } }>(
      `select valor from "AssistantAnswer" where "sessionId" = $1 and "preguntaId" = 'medal.mide'`,
      [sessionId]
    );
    expect(answer.rows).toHaveLength(1);
    expect(answer.rows[0].valor).toEqual({ opcionId: "programa" });
  });

  test("volver a tocar esa misma pregunta desde S1 la abre en modo edición, precargada con lo ya guardado -- cambiarla actualiza la misma fila", async ({ browser }) => {
    const context = await browser.newContext();
    await context.addCookies([{ ...(await mintAdminCookie(masterN0AdminId)), url: BASE_URL }]);
    const page = await context.newPage();

    await page.goto(`${BASE_URL}/c/mastern0/asistente/indice`, { waitUntil: "networkidle" });
    await page.getByText("¿Qué mide el Medallón de Resultados en Legacy?").click();
    await page.waitForURL(/\/pista\/programa\?pregunta=medal\.mide&volver=indice$/);

    await expect(page.getByText("Editando una respuesta guardada")).toBeVisible();
    // Precargada con lo guardado ("programa"), NO con la propuesta
    // estática del guion ("negocio") -- prioridad usuario > propuesta.
    await expect(page.getByLabel("Al programa")).toBeChecked();

    await page.getByLabel("Al negocio del miembro").check();
    await page.getByRole("button", { name: "Guardar y seguir" }).click();
    await page.waitForURL(/\/c\/mastern0\/asistente\/indice$/);

    const answer = await e2eDb.query<{ valor: { opcionId: string } }>(
      `select valor from "AssistantAnswer" where "sessionId" = $1 and "preguntaId" = 'medal.mide'`,
      [sessionId]
    );
    expect(answer.rows).toHaveLength(1); // sigue siendo UNA fila, no duplicó
    expect(answer.rows[0].valor).toEqual({ opcionId: "negocio" });
  });

  test("medal.fuente marcada 'Todavía no sé' aparece en S5, y resolverla desde ahí la saca de la lista", async ({ browser }) => {
    const context = await browser.newContext();
    await context.addCookies([{ ...(await mintAdminCookie(masterN0AdminId)), url: BASE_URL }]);
    const page = await context.newPage();

    await page.goto(`${BASE_URL}/c/mastern0/asistente/indice`, { waitUntil: "networkidle" });
    await page.getByText("¿De dónde sale el nivel de Resultados de un negocio?").click();
    await page.waitForURL(/\/pista\/programa\?pregunta=medal\.fuente&volver=indice$/);
    await page.getByRole("button", { name: "Todavía no sé" }).click();
    await page.waitForURL(/\/c\/mastern0\/asistente\/indice$/);

    await page.getByRole("link", { name: "Decisiones abiertas" }).click();
    await page.waitForURL(/\/c\/mastern0\/asistente\/decisiones-abiertas$/);
    await expect(page.getByRole("heading", { name: "Decisiones abiertas" })).toBeVisible();
    await expect(page.getByText("¿De dónde sale el nivel de Resultados de un negocio?")).toBeVisible();
    await expect(page.getByText("Medalla", { exact: true })).toBeVisible();

    await page.getByText("¿De dónde sale el nivel de Resultados de un negocio?").click();
    await page.waitForURL(/\/pista\/programa\?pregunta=medal\.fuente&volver=abiertas$/);
    await page.getByLabel("Lo declara el miembro").check();
    await page.getByRole("button", { name: "Guardar y seguir" }).click();

    // Resuelta -- vuelve a S5 (no a S1), y ya no aparece en la lista.
    await page.waitForURL(/\/c\/mastern0\/asistente\/decisiones-abiertas$/);
    await expect(page.getByText("¿De dónde sale el nivel de Resultados de un negocio?")).not.toBeVisible();
    await expect(page.getByText("Todavía no hay decisiones abiertas", { exact: false })).toBeVisible();

    const answer = await e2eDb.query<{ valor: { opcionId: string }; estado: string }>(
      `select valor, estado from "AssistantAnswer" where "sessionId" = $1 and "preguntaId" = 'medal.fuente'`,
      [sessionId]
    );
    expect(answer.rows[0].estado).toBe("propuesto");
    expect(answer.rows[0].valor).toEqual({ opcionId: "miembro" });
  });

  test("S0, S1, S2 y S5 tienen un link 'Volver al Dashboard' (pedido de Gunnar, 2026-10-08)", async ({ browser }) => {
    const context = await browser.newContext();
    await context.addCookies([{ ...(await mintAdminCookie(masterN0AdminId)), url: BASE_URL }]);
    const page = await context.newPage();

    await page.goto(`${BASE_URL}/c/mastern0/asistente`, { waitUntil: "networkidle" });
    await expect(page.getByRole("link", { name: "Volver al Dashboard" })).toHaveAttribute("href", "/admin");

    await page.goto(`${BASE_URL}/c/mastern0/asistente/indice`, { waitUntil: "networkidle" });
    await expect(page.getByRole("link", { name: "Volver al Dashboard" })).toHaveAttribute("href", "/admin");

    await page.goto(`${BASE_URL}/c/mastern0/asistente/pista/programa?pregunta=medal.mide&volver=indice`, { waitUntil: "networkidle" });
    await expect(page.getByRole("link", { name: "Volver al Dashboard" })).toHaveAttribute("href", "/admin");

    await page.goto(`${BASE_URL}/c/mastern0/asistente/decisiones-abiertas`, { waitUntil: "networkidle" });
    await expect(page.getByRole("link", { name: "Volver al Dashboard" })).toHaveAttribute("href", "/admin");
  });

  test("un N0 escopeado no entra a S1 ni a S5 de mastern0", async ({ browser }) => {
    const context = await browser.newContext();
    await context.addCookies([{ ...(await mintAdminCookie(scopedAdminId)), url: BASE_URL }]);
    const page = await context.newPage();

    await page.goto(`${BASE_URL}/c/mastern0/asistente/indice`, { waitUntil: "networkidle" });
    await expect(page).toHaveURL(`${BASE_URL}/c/mastern0`);

    await page.goto(`${BASE_URL}/c/mastern0/asistente/decisiones-abiertas`, { waitUntil: "networkidle" });
    await expect(page).toHaveURL(`${BASE_URL}/c/mastern0`);
  });

  test("un visitante anónimo no entra a S1 ni a S5 de mastern0", async ({ page }) => {
    await page.goto(`${BASE_URL}/c/mastern0/asistente/indice`, { waitUntil: "networkidle" });
    await expect(page).toHaveURL(`${BASE_URL}/c/mastern0`);

    await page.goto(`${BASE_URL}/c/mastern0/asistente/decisiones-abiertas`, { waitUntil: "networkidle" });
    await expect(page).toHaveURL(`${BASE_URL}/c/mastern0`);
  });
});
