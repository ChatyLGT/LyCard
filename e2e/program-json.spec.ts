import { test, expect } from "@playwright/test";
import bcrypt from "bcryptjs";
import { createE2eDb, mintAdminCookie } from "./helpers/adminSession";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";

// Importador de Programa por JSON (2026-11-06): subir/pegar un .json arma el
// Programa y todas sus tarjetas. De punta a punta por la pantalla real:
// Validar (sin escribir), Importar (todo o nada, versión nueva), errores
// legibles, ida y vuelta con Exportar, y permisos del N0 de Programa.
test.describe("Importador de Programa por JSON", () => {
  const e2eDb = createE2eDb();
  const suffix = Date.now();
  const slug = `e2e-json-${suffix}`;
  const cardAna = `ana-${suffix}`;
  const cardBruno = `bruno-${suffix}`;
  let masterId: string;
  let scopedAdminId: string;
  let originId: string;

  const rank = [
    { key: "curioso", nombre: "Curioso", subtitulo: "Ingreso", icono: "explore", color: "#8C7A55", descripcion: "Entra al programa." },
    { key: "padawan", nombre: "Padawan", subtitulo: "Formación", icono: "school", color: "#A88B4A", descripcion: "En formación." },
    { key: "sherpa", nombre: "Sherpa", subtitulo: "Guía", icono: "terrain", color: "#E8CB85", descripcion: "Guía senior." },
  ];
  const doc = (over: Record<string, unknown> = {}) => ({
    schema: "lycard.program/1",
    meta: { fuente: "e2e" },
    program: { name: `Consorcio E2E ${suffix}`, slug, origin: "legacy", cardAppName: "Consorcio Card", primaryColor: "#C8A15A", rankScale: rank },
    puestos: [{ siglas: "PLAT", denominacion: "Plataforma", descripcion: "Frente de plataforma", icono: "diamond", order: 0 }],
    cards: [
      { slug: cardAna, name: "Ana Pérez", title: "Directora", quote: "Hola", rank: "padawan", puesto: "PLAT", ownerEmail: `Ana-${suffix}@Example.com` },
      { slug: cardBruno, name: "Bruno Gómez", title: "Socio", rank: "sherpa" },
    ],
    ...over,
  });

  test.beforeAll(async () => {
    await e2eDb.connect();
    const passwordHash = await bcrypt.hash("no-se-usa-login-por-cookie", 10);
    const m = await e2eDb.query<{ id: string }>(
      `insert into "Admin" (id, email, "passwordHash", "programId", "updatedAt") values (gen_random_uuid()::text, $1, $2, null, now()) returning id`,
      [`e2e-json-master-${suffix}@example.com`, passwordHash]
    );
    masterId = m.rows[0].id;
    const root = await e2eDb.query<{ id: string }>(`select id from "Program" where slug = 'legacy'`);
    originId = root.rows[0]
      ? root.rows[0].id
      : (await e2eDb.query<{ id: string }>(`insert into "Program" (id, slug, name, "isRoot", "updatedAt") values (gen_random_uuid()::text, 'legacy', 'Legacy', true, now()) returning id`)).rows[0].id;
  });

  test.afterAll(async () => {
    const p = await e2eDb.query<{ id: string }>(`select id from "Program" where slug = $1`, [slug]);
    const pid = p.rows[0]?.id;
    if (pid) {
      await e2eDb.query(`delete from "Card" where "programId" = $1`, [pid]).catch(() => {});
      await e2eDb.query(`delete from "Admin" where "programId" = $1`, [pid]).catch(() => {});
      await e2eDb.query(`delete from "Program" where id = $1`, [pid]).catch(() => {});
    }
    await e2eDb.query(`delete from "Admin" where id = $1`, [masterId]).catch(() => {});
    await e2eDb.end();
  });

  test("validar no escribe; importar crea Programa, puestos y tarjetas; reimportar es idempotente", async ({ browser }) => {
    const context = await browser.newContext();
    await context.addCookies([{ ...(await mintAdminCookie(masterId)), url: BASE_URL }]);
    const page = await context.newPage();
    await page.goto(`${BASE_URL}/admin/programs`, { waitUntil: "networkidle" });

    const text = page.getByTestId("program-json-text");
    const validate = page.getByTestId("program-json-validate");
    const importBtn = page.getByTestId("program-json-import");

    await expect(validate).toBeDisabled(); // sin texto
    await expect(importBtn).toBeDisabled(); // sin validar
    await text.fill(JSON.stringify(doc()));
    await validate.click();

    await expect(page.getByTestId("program-json-headline")).toContainText(`Se va a crear el Programa "Consorcio E2E ${suffix}" con 1 puestos y 2 tarjetas`);
    await expect(page.getByTestId("program-json-lines")).toContainText(`Tarjeta ${cardAna}: se crea.`);
    // Validar NO escribió nada.
    expect((await e2eDb.query(`select 1 from "Program" where slug = $1`, [slug])).rowCount).toBe(0);

    // Cambiar el texto invalida la validación.
    await text.fill(JSON.stringify(doc()) + " ");
    await expect(importBtn).toBeDisabled();
    await validate.click();
    await expect(importBtn).toBeEnabled();
    await importBtn.click();
    await expect(page.getByTestId("program-json-headline")).toContainText("Importado como versión 1");

    const prog = await e2eDb.query<{ id: string; cardAppName: string; originProgramId: string; rankScale: { key: string }[] }>(
      `select id, "cardAppName", "originProgramId", "rankScale" from "Program" where slug = $1`,
      [slug]
    );
    expect(prog.rows[0].cardAppName).toBe("Consorcio Card");
    expect(prog.rows[0].originProgramId).toBe(originId);
    expect(prog.rows[0].rankScale.map((r) => r.key)).toEqual(["curioso", "padawan", "sherpa"]);
    const programId = prog.rows[0].id;
    expect((await e2eDb.query(`select 1 from "Puesto" where "programId" = $1 and siglas = 'PLAT'`, [programId])).rowCount).toBe(1);
    const cards = await e2eDb.query<{ slug: string; rank: string; medal: string; pendingOwnerEmail: string | null; puestoId: string | null; memberId: string | null }>(
      `select slug, rank, medal, "pendingOwnerEmail", "puestoId", "memberId" from "Card" where "programId" = $1 order by slug`,
      [programId]
    );
    expect(cards.rows.map((c) => c.slug)).toEqual([cardAna, cardBruno]);
    const ana = cards.rows.find((c) => c.slug === cardAna)!;
    expect(ana).toMatchObject({ rank: "padawan", pendingOwnerEmail: `ana-${suffix}@example.com`, memberId: null });
    expect(ana.puestoId).not.toBeNull();
    // Bruno no trae medal: arranca con el default del sistema.
    expect(cards.rows.find((c) => c.slug === cardBruno)!.rank).toBe("sherpa");
    const v1 = await e2eDb.query<{ version: number; meta: { fuente: string }; previous: unknown }>(`select version, meta, previous from "ProgramImport" where "programId" = $1`, [programId]);
    expect(v1.rows).toHaveLength(1);
    expect(v1.rows[0].meta.fuente).toBe("e2e");
    expect(v1.rows[0].previous).toBeNull();

    // Reimportar el mismo JSON: sin cambios, no duplica, versión 2.
    await text.fill(JSON.stringify(doc()));
    await validate.click();
    await expect(page.getByText("No hay cambios: el Programa ya está igual que el archivo.")).toBeVisible();
    await importBtn.click();
    await expect(page.getByTestId("program-json-headline")).toContainText("Importado como versión 2");
    expect((await e2eDb.query(`select 1 from "Card" where "programId" = $1`, [programId])).rowCount).toBe(2);
    expect((await e2eDb.query(`select 1 from "Puesto" where "programId" = $1`, [programId])).rowCount).toBe(1);
    expect((await e2eDb.query(`select 1 from "ProgramImport" where "programId" = $1`, [programId])).rowCount).toBe(2);

    // Un cambio: el reporte muestra la diferencia antes de aplicar y respeta lo que no viene.
    const changed = doc({ cards: [{ slug: cardAna, name: "Ana Pérez", rank: "sherpa" }] });
    await text.fill(JSON.stringify(changed));
    await validate.click();
    await expect(page.getByTestId("program-json-lines")).toContainText(`Tarjeta ${cardAna}: Rango: "padawan" → "sherpa"`);
    await expect(page.getByTestId("program-json-headline")).toContainText("1 existentes que no vienen en el JSON se conservan");
    await importBtn.click();
    await expect(page.getByTestId("program-json-headline")).toContainText("Importado como versión 3");
    const after = await e2eDb.query<{ rank: string; title: string }>(`select rank, title from "Card" where slug = $1`, [cardAna]);
    expect(after.rows[0]).toEqual({ rank: "sherpa", title: "Directora" }); // title no vino: no se tocó
    expect((await e2eDb.query(`select 1 from "Card" where slug = $1`, [cardBruno])).rowCount).toBe(1);

    // El Programa quedó visible en el listado.
    await page.goto(`${BASE_URL}/admin/programs`, { waitUntil: "networkidle" });
    await expect(page.getByText(slug)).toBeVisible();
    await context.close();
  });

  test("errores legibles: no escribe nada y dice qué y dónde", async ({ browser }) => {
    const context = await browser.newContext();
    await context.addCookies([{ ...(await mintAdminCookie(masterId)), url: BASE_URL }]);
    const page = await context.newPage();
    await page.goto(`${BASE_URL}/admin/programs`, { waitUntil: "networkidle" });
    const bad = `e2e-json-malo-${suffix}`;
    const text = page.getByTestId("program-json-text");

    await text.fill("{ no es json");
    await page.getByTestId("program-json-validate").click();
    await expect(page.getByTestId("program-json-errors")).toContainText("No es un JSON válido");

    await text.fill(JSON.stringify({ schema: "lycard.program/1", program: { name: "Malo", slug: bad }, cards: [{ slug: "x", name: "X", rank: "dios" }] }));
    await page.getByTestId("program-json-validate").click();
    await expect(page.getByTestId("program-json-errors")).toContainText("program.origin");
    await expect(page.getByTestId("program-json-errors")).toContainText("rangos");

    await text.fill(JSON.stringify({ schema: "lycard.program/1", program: { name: "Malo", slug: bad, origin: "legacy", primaryColor: "dorado", isRoot: true } }));
    await page.getByTestId("program-json-validate").click();
    await expect(page.getByTestId("program-json-discarded")).toContainText("program.primaryColor");
    await expect(page.getByTestId("program-json-discarded")).toContainText("program.isRoot");
    expect((await e2eDb.query(`select 1 from "Program" where slug = $1`, [bad])).rowCount).toBe(0);
    await context.close();
  });

  test("exportar y volver a validar da cero cambios (ida y vuelta)", async ({ browser }) => {
    const context = await browser.newContext();
    await context.addCookies([{ ...(await mintAdminCookie(masterId)), url: BASE_URL }]);
    const p = await e2eDb.query<{ id: string }>(`select id from "Program" where slug = $1`, [slug]);
    const res = await context.request.get(`${BASE_URL}/admin/programs/${p.rows[0].id}/export`);
    expect(res.status()).toBe(200);
    expect(res.headers()["content-disposition"]).toContain(`${slug}.program.json`);
    const exported = await res.json();
    expect(exported.schema).toBe("lycard.program/1");
    expect(exported.cards.map((c: { slug: string }) => c.slug).sort()).toEqual([cardAna, cardBruno]);
    expect((await context.request.get(`${BASE_URL}/admin/programs/${p.rows[0].id}/export`, { headers: { cookie: "" } })).status()).toBeLessThan(500);

    const page = await context.newPage();
    await page.goto(`${BASE_URL}/admin/programs/${p.rows[0].id}`, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: /^Importar \/ exportar Programa/ }).click();
    await page.getByTestId("program-json-text").fill(JSON.stringify(exported));
    await page.getByTestId("program-json-validate").click();
    await expect(page.getByText("No hay cambios: el Programa ya está igual que el archivo.")).toBeVisible();
    await context.close();
  });

  test("el N0 de un Programa puede exportar y validar el suyo, pero no importar", async ({ browser }) => {
    const p = await e2eDb.query<{ id: string }>(`select id from "Program" where slug = $1`, [slug]);
    const passwordHash = await bcrypt.hash("no-se-usa-login-por-cookie", 10);
    const a = await e2eDb.query<{ id: string }>(
      `insert into "Admin" (id, email, "passwordHash", "programId", "updatedAt") values (gen_random_uuid()::text, $1, $2, $3, now()) returning id`,
      [`e2e-json-n0-${suffix}@example.com`, passwordHash, p.rows[0].id]
    );
    scopedAdminId = a.rows[0].id;
    const context = await browser.newContext();
    await context.addCookies([{ ...(await mintAdminCookie(scopedAdminId)), url: BASE_URL }]);
    const page = await context.newPage();
    await page.goto(`${BASE_URL}/admin/programs/${p.rows[0].id}`, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: /^Importar \/ exportar Programa/ }).click();
    await expect(page.getByTestId("program-json-import")).toHaveCount(0);
    await expect(page.getByTestId("program-json-export")).toBeVisible();

    await page.getByTestId("program-json-text").fill(JSON.stringify(doc()));
    await page.getByTestId("program-json-validate").click();
    await expect(page.getByTestId("program-json-headline")).toContainText("Se va a actualizar");

    // El JSON de OTRO Programa no se puede ni validar.
    await page.getByTestId("program-json-text").fill(JSON.stringify(doc({ program: { name: "Otro", slug: `otro-${suffix}`, origin: "legacy" } })));
    await page.getByTestId("program-json-validate").click();
    await expect(page.getByTestId("program-json-errors")).toContainText("solo podés validar el JSON de tu propio Programa");
    expect((await context.request.get(`${BASE_URL}/admin/programs/${originId}/export`, { maxRedirects: 0 })).status()).toBe(403);
    await context.close();
  });
});
