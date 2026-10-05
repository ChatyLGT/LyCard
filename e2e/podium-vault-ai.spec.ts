import { test, expect } from "@playwright/test";
import bcrypt from "bcryptjs";
import { createE2eDb, mintAdminCookie } from "./helpers/adminSession";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";

// Botones del Podio / Bóveda Legacy / Agente de IA (2026-10-04, pedido de
// Gunnar: "poder elegir desde el dashboard de cada programa los Botones
// que ibamos a colocar abajo.. son 3 botones.. los laterales pequeños y
// el principal grande.. el N0 decide que poner alli"). Cubre: el picker
// del dashboard guarda de verdad, el default sin configurar no cambió
// respecto de antes de esta feature, la Bóveda Legacy (mismo dossier del
// Códice que "Info [nombre]", sin gate -- Gunnar: "la Boveda es lo que
// en la tarjeta de rogelio dice Info Rogelio.. es lo mismo pero para
// todos.. mismos componentes" / "quitalo [el gate] porfa.. luego vemos
// donde y como lo usamos") funciona para host y para anónimo, el cubo
// "Modal simple" abre el contenido viejo de "Mi camino" sin chocar con
// el botón de redirect de Legacy, y el Agente de IA nunca inventa una
// respuesta -- ni desde el dashboard ni en el fallback público.
test.describe("Botones del Podio — dashboard + tarjeta pública", () => {
  const e2eDb = createE2eDb();
  let programId: string;
  let adminId: string;
  let cardSlug: string;
  let cardId: string;

  test.beforeAll(async () => {
    await e2eDb.connect();
    const suffix = Date.now();

    const prog = await e2eDb.query<{ id: string }>(
      `insert into "Program" (id, slug, name, "updatedAt") values (gen_random_uuid()::text, $1, $2, now()) returning id`,
      [`e2e-podium-${suffix}`, "E2E Podium Program"]
    );
    programId = prog.rows[0].id;

    const passwordHash = await bcrypt.hash("no-se-usa-login-por-cookie", 10);
    const admin = await e2eDb.query<{ id: string }>(
      `insert into "Admin" (id, email, "passwordHash", "programId", "updatedAt") values (gen_random_uuid()::text, $1, $2, $3, now()) returning id`,
      [`e2e-podium-admin-${suffix}@example.com`, passwordHash, programId]
    );
    adminId = admin.rows[0].id;

    cardSlug = `e2e-podium-card-${suffix}`;
    const card = await e2eDb.query<{ id: string }>(
      `insert into "Card" (id, slug, "updatedAt", name, title, quote, "programId", kind) values (gen_random_uuid()::text, $1, now(), $2, $3, $4, $5, 'project') returning id`,
      [cardSlug, "E2E Podium Owner", "N/A", "cita", programId]
    );
    cardId = card.rows[0].id;
  });

  test.afterAll(async () => {
    await e2eDb.query(`delete from "Card" where id = $1`, [cardId]).catch(() => {});
    await e2eDb.query(`delete from "Admin" where id = $1`, [adminId]).catch(() => {});
    await e2eDb.query(`delete from "Program" where id = $1`, [programId]).catch(() => {});
    await e2eDb.end();
  });

  test("sin configurar nada: el host ve exactamente el default de siempre (Info / Enviar Invitación)", async ({ browser }) => {
    const context = await browser.newContext();
    const cookie = await mintAdminCookie(adminId);
    await context.addCookies([{ ...cookie, url: BASE_URL }]);
    const page = await context.newPage();

    await page.goto(`${BASE_URL}/c/${cardSlug}`, { waitUntil: "networkidle" });

    await expect(page.getByRole("button", { name: "Info", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Enviar Invitación", exact: true })).toBeVisible();

    await context.close();
  });

  test("el N0 elige Bóveda Legacy para el cubo izquierdo y llena el form -- la tarjeta pública muestra el mismo dossier del Códice, sin gate", async ({ browser }) => {
    const context = await browser.newContext();
    const cookie = await mintAdminCookie(adminId);
    await context.addCookies([{ ...cookie, url: BASE_URL }]);
    const page = await context.newPage();

    await page.goto(`${BASE_URL}/admin/programs/${programId}`, { waitUntil: "networkidle" });

    await page.getByRole("button", { name: "Botones del Podio" }).click();
    const leftSection = page.locator("section", { hasText: "Cubo izquierdo" });
    await leftSection.locator("select[name='kind']").selectOption("vault");
    await leftSection.getByRole("button", { name: "Guardar Botón" }).click();
    await page.waitForURL(/podiumSaved=left/);

    // Sin exact:true -- el botón del acordeón concatena título + subtítulo
    // + badge en su nombre accesible, no es el texto pelado del título.
    // Anclado al INICIO (^) porque el subtítulo de "Botones del Podio"
    // también menciona "Bóveda Legacy" en su descripción y matchearía.
    await page.getByRole("button", { name: /^Bóveda Legacy/ }).click();
    // Scope por el <form> que tiene vaultTitle -- evita ambigüedad con
    // los <select> de "Botones del Podio" (puede seguir abierto por el
    // query param ?podiumSaved= del paso anterior).
    const vaultForm = page.locator("form").filter({ has: page.locator('input[name="vaultTitle"]') });
    await vaultForm.locator('input[name="vaultTitle"]').fill("Bóveda de Gunnar");
    // La palabra secreta se sigue pudiendo guardar (Gunnar: "luego vemos
    // donde y como lo usamos") pero YA NO bloquea nada en este botón --
    // se confirma más abajo que el contenido aparece directo.
    await vaultForm.locator('input[name="vaultPalabraSecreta"]').fill("mayancity");

    // Editor de Modales (2026-10-04, pedido de Gunnar: "podamos crear
    // un editor de modales.. como el editor de un formulario") -- un
    // bloque de texto + un bloque de archivo/botón-link, igual que
    // armaría el N0 de verdad.
    await vaultForm.getByRole("button", { name: "Agregar bloque" }).click();
    await vaultForm.getByPlaceholder("Título (opcional)").fill("Qué información usamos");
    await vaultForm.getByPlaceholder("Texto").fill("Fuentes reales que armamos para este Programa.");

    await vaultForm.getByRole("button", { name: "Agregar bloque" }).click();
    await vaultForm.locator("select").nth(1).selectOption("archivo_link");
    await vaultForm.getByPlaceholder("https://... (el link o archivo que abre)").fill("https://notebooklm.google.com/e2e-cuaderno");
    await vaultForm.getByPlaceholder("Texto del botón (ej. Abrir mi cuaderno)").fill("Abrir mi cuaderno");

    await vaultForm.getByRole("button", { name: "Guardar Bóveda" }).click();
    await page.waitForURL(/vaultSaved=1/);

    const saved = await e2eDb.query<{ vaultTitle: string; vaultPalabraSecreta: string; vaultBlocks: unknown }>(
      `select "vaultTitle", "vaultPalabraSecreta", "vaultBlocks" from "Program" where id = $1`,
      [programId]
    );
    expect(saved.rows[0].vaultTitle).toBe("Bóveda de Gunnar");
    expect(saved.rows[0].vaultPalabraSecreta).toBe("mayancity");
    expect(JSON.stringify(saved.rows[0].vaultBlocks)).toContain("notebooklm.google.com/e2e-cuaderno");

    await page.goto(`${BASE_URL}/c/${cardSlug}`, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Bóveda de Gunnar", exact: true }).click();

    // Ni gate ni "Esta sección está protegida" -- el contenido es
    // exactamente lo que el N0 armó bloque por bloque, nada fijo.
    await expect(page.getByText("Esta sección está protegida.")).not.toBeVisible();
    await expect(page.getByText("Qué información usamos")).toBeVisible();
    await expect(page.getByText("Fuentes reales que armamos para este Programa.")).toBeVisible();
    await expect(page.getByRole("link", { name: "Abrir mi cuaderno" })).toHaveAttribute("href", "https://notebooklm.google.com/e2e-cuaderno");

    await context.close();
  });

  test("un visitante anónimo también puede abrir la Bóveda directo, sin palabra secreta -- no es gestión interna como 'invite'", async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto(`${BASE_URL}/c/${cardSlug}`, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Bóveda de Gunnar", exact: true }).click();

    await expect(page.getByPlaceholder("Palabra secreta")).not.toBeVisible();
    await expect(page.getByText("Fuentes reales que armamos para este Programa.")).toBeVisible();

    await context.close();
  });

  test("Agente de IA desde el dashboard: siempre devuelve una respuesta honesta -- nunca se queda mudo ni inventa algo", async ({ browser }) => {
    const context = await browser.newContext();
    const cookie = await mintAdminCookie(adminId);
    await context.addCookies([{ ...cookie, url: BASE_URL }]);
    const page = await context.newPage();

    await page.goto(`${BASE_URL}/admin/programs/${programId}`, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Botones del Podio" }).click();

    const rightSection = page.locator("section", { hasText: "Cubo derecho" });
    await rightSection.locator("select[name='kind']").selectOption("ai_agent");
    await rightSection.getByRole("button", { name: "Guardar Botón" }).click();
    await page.waitForURL(/podiumSaved=right/);

    // No hace falta re-abrir el acordeón -- tras el redirect con
    // ?podiumSaved= queda abierto solo (defaultOpen). Un segundo click
    // acá lo estaría CERRANDO, carrera contra la animación del grid-rows.
    const rightSectionAfter = page.locator("section", { hasText: "Cubo derecho" });
    await rightSectionAfter.locator("textarea").fill("Una calculadora de interés compuesto para los invitados");
    await rightSectionAfter.getByRole("button", { name: "Generar con IA" }).click();

    // No afirmamos cuál de los 4 resultados posibles va a salir -- depende
    // de si hay clave configurada Y de si la organización tiene crédito
    // real cargado (ninguna de las dos cosas es asumible en un E2E). Lo
    // que sí tiene que ser siempre cierto: aparece UNA de las respuestas
    // honestas conocidas, nunca silencio ni contenido inventado de la
    // nada.
    const honestOutcome = rightSectionAfter.getByText(
      /Generado y guardado|Falta configurar la clave de la IA|No se pudo generar|No tenés permiso/
    );
    await expect(honestOutcome.first()).toBeVisible({ timeout: 20000 });

    await context.close();
  });

  test("Agente de IA en la tarjeta pública: configurado pero sin generar nada todavía muestra el fallback honesto, nunca inventado", async ({ browser }) => {
    await e2eDb.query(
      `update "Program" set "podiumButtons" = $1 where id = $2`,
      [JSON.stringify([{ slot: "right", kind: "ai_agent", aiTitle: "", aiIcon: "", aiBody: "", aiPrompt: "" }]), programId]
    );

    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(`${BASE_URL}/c/${cardSlug}`, { waitUntil: "networkidle" });

    await page.getByRole("button", { name: "Agente IA", exact: true }).click();
    await expect(page.getByText("Todavía no se generó nada")).toBeVisible();
    await expect(page.getByText(/falta activar la clave de IA/)).toBeVisible();

    await context.close();
  });
});

test.describe("Botones del Podio — 'Modal simple' (story)", () => {
  const e2eDb = createE2eDb();
  let programId: string;
  let cardSlug: string;
  let cardId: string;

  test.beforeAll(async () => {
    await e2eDb.connect();
    const suffix = Date.now();

    const prog = await e2eDb.query<{ id: string }>(
      `insert into "Program" (id, slug, name, "podiumButtons", "updatedAt") values (gen_random_uuid()::text, $1, $2, $3, now()) returning id`,
      [`e2e-podium-story-${suffix}`, "E2E Podium Story Program", JSON.stringify([{ slot: "right", kind: "story", aiTitle: "", aiIcon: "", aiBody: "", aiPrompt: "" }])]
    );
    programId = prog.rows[0].id;

    cardSlug = `e2e-podium-story-card-${suffix}`;
    const card = await e2eDb.query<{ id: string }>(
      `insert into "Card" (id, slug, "updatedAt", name, title, quote, "programId", kind) values (gen_random_uuid()::text, $1, now(), $2, $3, $4, $5, 'project') returning id`,
      [cardSlug, "E2E Story Owner", "N/A", "cita", programId]
    );
    cardId = card.rows[0].id;
  });

  test.afterAll(async () => {
    await e2eDb.query(`delete from "Card" where id = $1`, [cardId]).catch(() => {});
    await e2eDb.query(`delete from "Program" where id = $1`, [programId]).catch(() => {});
    await e2eDb.end();
  });

  test("cubo derecho configurado como 'Modal simple' abre el contenido viejo de 'Mi camino', sin chocar con el botón de redirect a Info", async ({ page }) => {
    await page.goto(`${BASE_URL}/c/${cardSlug}`, { waitUntil: "networkidle" });

    // El botón de arriba ("✦ Mi camino ↗") sigue redirigiendo a Info en
    // Legacy (pedido previo de Gunnar) -- el cubo del podio es una
    // elección EXPLÍCITA del N0 y abre el modal "story" de siempre, no
    // ese redirect. aria-label exacto en el cubo evita la colisión con
    // el texto (con ícono incluido) del botón de arriba.
    await page.getByRole("button", { name: "Mi camino", exact: true }).click();
    await expect(page.getByText("Mi Camino con Legacy")).toBeVisible();

    await page.close();
  });
});
