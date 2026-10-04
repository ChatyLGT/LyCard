import { test, expect } from "@playwright/test";
import bcrypt from "bcryptjs";
import { createE2eDb, mintAdminCookie } from "./helpers/adminSession";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";

// Categorización (2026-10-04, pedido de Gunnar: "corregir la informacion
// de los modales.. que cada modal explique lo que se dice en el
// dashboard.. le demos la oportunidad al N0 de seleccionar eso desde
// ahi"). Antes cada uno de los 4 modales de distinción (Puesto/O.D.,
// Medallón de Resultados, Imán Badge, Contactos) mostraba 4 íconos
// de EJEMPLO fijos, iguales para cualquier Programa -- esta prueba cubre
// que ahora muestran el roster REAL (nombre + descripción completa de
// cada nivel que el N0 armó), marcan el nivel actual, y que un N0 puede
// tocar otro nivel para seleccionarlo ahí mismo, sin ir al dashboard.
test.describe("Categorización — modales con escalas reales + selección desde la tarjeta", () => {
  const e2eDb = createE2eDb();
  let programId: string;
  let adminId: string;
  let cardSlug: string;
  let cardId: string;
  let puesto1Id: string;
  let puesto2Id: string;

  test.beforeAll(async () => {
    await e2eDb.connect();
    const suffix = Date.now();

    const prog = await e2eDb.query<{ id: string }>(
      `insert into "Program" (id, slug, name, "medalScale", "rankScale", "updatedAt")
       values (gen_random_uuid()::text, $1, $2, $3, $4, now()) returning id`,
      [
        `e2e-categ-${suffix}`,
        "E2E Categorización Program",
        JSON.stringify([
          { key: "critico", nombre: "Crítico", subtitulo: "Impacto Negativo", color: "#D32F2F", icono: "dangerous", descripcion: "Riesgo operativo alto, requiere acción inmediata." },
          { key: "liderazgo", nombre: "Liderazgo", subtitulo: "Impacto Extraordinario", color: "#6A1B9A", icono: "trophy", descripcion: "Resultados históricos y extraordinarios." },
        ]),
        JSON.stringify([
          { key: "anfitrion", nombre: "Anfitrión", subtitulo: "Tráfico Base", color: "#9E9E9E", icono: "qr_code_2", descripcion: "Activaste tu red compartiendo tu QR." },
          { key: "magneto_corp", nombre: "Imán Corporativo", subtitulo: "Alianzas Institucionales", color: "#3949AB", icono: "business", descripcion: "Tu influencia convierte Corporaciones completas." },
        ]),
      ]
    );
    programId = prog.rows[0].id;

    const puesto1 = await e2eDb.query<{ id: string }>(
      `insert into "Puesto" (id, "programId", siglas, denominacion, descripcion, "order", icono, "updatedAt")
       values (gen_random_uuid()::text, $1, $2, $3, $4, 0, $5, now()) returning id`,
      [programId, "O.D.", "Original Dreamer", "Fundador del Programa.", "diamond"]
    );
    puesto1Id = puesto1.rows[0].id;
    const puesto2 = await e2eDb.query<{ id: string }>(
      `insert into "Puesto" (id, "programId", siglas, denominacion, descripcion, "order", icono, "updatedAt")
       values (gen_random_uuid()::text, $1, $2, $3, $4, 1, $5, now()) returning id`,
      [programId, "GRD", "Guardián de Red", "Mantiene la red activa.", "shield"]
    );
    puesto2Id = puesto2.rows[0].id;

    const passwordHash = await bcrypt.hash("no-se-usa-login-por-cookie", 10);
    const admin = await e2eDb.query<{ id: string }>(
      `insert into "Admin" (id, email, "passwordHash", "programId", "updatedAt") values (gen_random_uuid()::text, $1, $2, $3, now()) returning id`,
      [`e2e-categ-admin-${suffix}@example.com`, passwordHash, programId]
    );
    adminId = admin.rows[0].id;

    cardSlug = `e2e-categ-card-${suffix}`;
    const card = await e2eDb.query<{ id: string }>(
      `insert into "Card" (id, slug, "updatedAt", name, title, quote, "programId", medal, rank, "puestoId")
       values (gen_random_uuid()::text, $1, now(), $2, $3, $4, $5, $6, $7, $8) returning id`,
      [cardSlug, "E2E Categ Owner", "N/A", "cita", programId, "critico", "anfitrion", puesto1Id]
    );
    cardId = card.rows[0].id;
  });

  test.afterAll(async () => {
    await e2eDb.query(`delete from "Card" where id = $1`, [cardId]).catch(() => {});
    await e2eDb.query(`delete from "Admin" where id = $1`, [adminId]).catch(() => {});
    await e2eDb.query(`delete from "Puesto" where id = any($1)`, [[puesto1Id, puesto2Id]]).catch(() => {});
    await e2eDb.query(`delete from "Program" where id = $1`, [programId]).catch(() => {});
    await e2eDb.end();
  });

  test("Medallón de Resultados: el modal muestra los 2 niveles reales (no ejemplos genéricos) y el N0 puede seleccionar el otro", async ({ browser }) => {
    const context = await browser.newContext();
    const cookie = await mintAdminCookie(adminId);
    await context.addCookies([{ ...cookie, url: BASE_URL }]);
    const page = await context.newPage();

    await page.goto(`${BASE_URL}/c/${cardSlug}`, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Medallón de Resultados", exact: true }).click();

    // Nombre + descripción REALES de los 2 niveles, no "Bronce/Plata/Oro/Diamante".
    // "Crítico" aparece dos veces a propósito: una vez grande arriba (el
    // nivel actual) y otra vez dentro de su propia tile en la grilla.
    await expect(page.getByText("Crítico", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Riesgo operativo alto, requiere acción inmediata.")).toBeVisible();
    await expect(page.getByText("Liderazgo", { exact: true })).toBeVisible();
    await expect(page.getByText("Resultados históricos y extraordinarios.")).toBeVisible();
    await expect(page.getByText("Actual", { exact: true })).toBeVisible();

    await page.getByText("Liderazgo", { exact: true }).click();

    await expect
      .poll(async () => {
        const row = await e2eDb.query<{ medal: string }>(`select medal from "Card" where id = $1`, [cardId]);
        return row.rows[0].medal;
      })
      .toBe("liderazgo");
  });

  test("Imán Badge: el modal muestra los niveles reales de atracción de red", async ({ browser }) => {
    const context = await browser.newContext();
    const cookie = await mintAdminCookie(adminId);
    await context.addCookies([{ ...cookie, url: BASE_URL }]);
    const page = await context.newPage();

    await page.goto(`${BASE_URL}/c/${cardSlug}`, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Imán Badge", exact: true }).click();

    await expect(page.getByText("Imán Corporativo", { exact: true })).toBeVisible();
    await expect(page.getByText("Tu influencia convierte Corporaciones completas.")).toBeVisible();

    await page.getByText("Imán Corporativo", { exact: true }).click();

    await expect
      .poll(async () => {
        const row = await e2eDb.query<{ rank: string }>(`select rank from "Card" where id = $1`, [cardId]);
        return row.rows[0].rank;
      })
      .toBe("magneto_corp");
  });

  test("O.D.: el modal muestra el roster real de Puestos del Programa y permite reasignar", async ({ browser }) => {
    const context = await browser.newContext();
    const cookie = await mintAdminCookie(adminId);
    await context.addCookies([{ ...cookie, url: BASE_URL }]);
    const page = await context.newPage();

    await page.goto(`${BASE_URL}/c/${cardSlug}`, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Puesto", exact: true }).click();

    await expect(page.getByText("Guardián de Red", { exact: true })).toBeVisible();
    await expect(page.getByText("Mantiene la red activa.")).toBeVisible();

    await page.getByText("Guardián de Red", { exact: true }).click();

    await expect
      .poll(async () => {
        const row = await e2eDb.query<{ puestoId: string }>(`select "puestoId" from "Card" where id = $1`, [cardId]);
        return row.rows[0].puestoId;
      })
      .toBe(puesto2Id);
  });

  test("Visitante anónimo ve la info real pero no puede reasignar tocando otro nivel", async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    const before = await e2eDb.query<{ rank: string }>(`select rank from "Card" where id = $1`, [cardId]);
    // El nivel que NO es el actual en este punto -- toca el otro para
    // intentar reasignar. No se asume un valor fijo porque los tests de
    // arriba corren antes y ya mutaron el rank real de esta Card.
    const otherTileName = before.rows[0].rank === "anfitrion" ? "Imán Corporativo" : "Anfitrión";

    await page.goto(`${BASE_URL}/c/${cardSlug}`, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Imán Badge", exact: true }).click();
    await expect(page.getByText(otherTileName, { exact: true })).toBeVisible();

    await page.getByText(otherTileName, { exact: true }).click();
    await page.waitForTimeout(500);

    const after = await e2eDb.query<{ rank: string }>(`select rank from "Card" where id = $1`, [cardId]);
    expect(after.rows[0].rank).toBe(before.rows[0].rank);

    await context.close();
  });
});
