import { test, expect } from "@playwright/test";
import { createE2eDb, mintAdminCookie, mintMemberCookie } from "./helpers/adminSession";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";

// Fase 6 (2026-10-01) -- WowHead, el HeadHunter de Agentes. Ver PLAN.md
// "Fase 6: DISEÑO -- WowHead, el HeadHunter de Agentes". Cubre: (1) el
// ascenso manual de Especialista a Experto, MasterN0-only; (2) WowHead
// muestra Legacy y Silicio con sus badges correctos, filtra por tipo, y
// un cliente contrata un Silicio self-service; (3) un Experto recluta a
// otro Legacy, que tiene que aceptar, y recién ahí aparece en su
// organigrama.
test.describe("WowHead (Fase 6)", () => {
  const e2eDb = createE2eDb();
  const suffix = Date.now();

  let adminId: string;
  let especialistaKey: string;

  let expertoAId: string;
  let expertoAKey: string;
  let expertoACardSlug: string;
  let expertoAMemberId: string;

  let expertoBKey: string;
  let expertoBCardSlug: string;
  let expertoBMemberId: string;

  let clienteCardId: string;

  test.beforeAll(async () => {
    await e2eDb.connect();

    const admin = await e2eDb.query<{ id: string }>(
      `insert into "Admin" (id, email, "passwordHash", "programId", "updatedAt") values (gen_random_uuid()::text, $1, $2, null, now()) returning id`,
      [`e2e-mastern0-wowhead-${suffix}@example.com`, "no-se-usa-login-por-cookie"]
    );
    adminId = admin.rows[0].id;

    // --- Silicio publicado ---
    especialistaKey = `e2e-calma-${suffix}`;
    await e2eDb.query(
      `insert into "Especialista" (id, key, nombre, trabajo, descripcion, color, "toolKeys", habilidades, status, "updatedAt") values (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, $7, 'activo', now())`,
      [especialistaKey, "Calma", "Cuidar que no te quemes", "Agente de ejemplo E2E.", "#7FB0C4", JSON.stringify(["wowawe"]), JSON.stringify(["Enfoque"])]
    );

    // --- Legacy A (va a ser promovido a Experto) ---
    expertoAKey = `e2e-legacy-a-${suffix}`;
    const memberA = await e2eDb.query<{ id: string }>(`insert into "Member" (id, name, "updatedAt") values (gen_random_uuid()::text, $1, now()) returning id`, ["Legacy A E2E"]);
    expertoAMemberId = memberA.rows[0].id;
    expertoACardSlug = `e2e-legacy-a-card-${suffix}`;
    await e2eDb.query(
      `insert into "Card" (id, slug, "updatedAt", name, title, quote, kind, "memberId") values (gen_random_uuid()::text, $1, now(), $2, $3, $4, 'personal', $5)`,
      [expertoACardSlug, "Legacy A E2E", "Profesión A", "Perfil E2E", expertoAMemberId]
    );
    const expertoA = await e2eDb.query<{ id: string }>(
      `insert into "Experto" (id, key, "memberId", "nombrePublico", profesion, descripcion, color, "consentGivenAt", "bautizoStatus", "updatedAt") values (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, now(), 'bautizado', now()) returning id`,
      [expertoAKey, expertoAMemberId, "Legacy A E2E", "Profesión A", "Perfil E2E", "#C8A15A"]
    );
    expertoAId = expertoA.rows[0].id;

    // --- Legacy B (va a ser invitado al equipo de A) ---
    expertoBKey = `e2e-legacy-b-${suffix}`;
    const memberB = await e2eDb.query<{ id: string }>(`insert into "Member" (id, name, "updatedAt") values (gen_random_uuid()::text, $1, now()) returning id`, ["Legacy B E2E"]);
    expertoBMemberId = memberB.rows[0].id;
    expertoBCardSlug = `e2e-legacy-b-card-${suffix}`;
    await e2eDb.query(
      `insert into "Card" (id, slug, "updatedAt", name, title, quote, kind, "memberId") values (gen_random_uuid()::text, $1, now(), $2, $3, $4, 'personal', $5)`,
      [expertoBCardSlug, "Legacy B E2E", "Profesión B", "Perfil E2E", expertoBMemberId]
    );
    await e2eDb.query(
      `insert into "Experto" (id, key, "memberId", "nombrePublico", profesion, descripcion, color, "consentGivenAt", "bautizoStatus", "updatedAt") values (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, now(), 'bautizado', now())`,
      [expertoBKey, expertoBMemberId, "Legacy B E2E", "Profesión B", "Perfil E2E", "#C8A15A"]
    );

    // --- Card del cliente que va a reclutar en WowHead ---
    const clienteSlug = `e2e-cliente-wowhead-${suffix}`;
    const cliente = await e2eDb.query<{ id: string }>(
      `insert into "Card" (id, slug, "updatedAt", name, title, quote, kind) values (gen_random_uuid()::text, $1, now(), $2, $3, $4, 'personal') returning id`,
      [clienteSlug, "Cliente E2E", "Test", "Test"]
    );
    clienteCardId = cliente.rows[0].id;
  });

  test.afterAll(async () => {
    await e2eDb.query(`delete from "EquipoInvitacion" where "expertoId" = $1`, [expertoAId]).catch(() => {});
    await e2eDb.query(`delete from "EspecialistaInstall" where "especialistaId" = (select id from "Especialista" where key = $1)`, [especialistaKey]).catch(() => {});
    await e2eDb.query(`delete from "Experto" where key = any($1)`, [[expertoAKey, expertoBKey]]).catch(() => {});
    await e2eDb.query(`delete from "Especialista" where key = $1`, [especialistaKey]).catch(() => {});
    await e2eDb.query(`delete from "Member" where id = any($1)`, [[expertoAMemberId, expertoBMemberId]]).catch(() => {});
    await e2eDb.query(`delete from "Admin" where id = $1`, [adminId]).catch(() => {});
    await e2eDb.query(`delete from "Card" where slug = any($1) or id = $2`, [[expertoACardSlug, expertoBCardSlug], clienteCardId]).catch(() => {});
    await e2eDb.end();
  });

  test("MasterN0 promueve un Especialista Legacy a Experto desde /admin/wowstore", async ({ browser }) => {
    const context = await browser.newContext();
    const cookie = await mintAdminCookie(adminId);
    await context.addCookies([{ ...cookie, url: BASE_URL }]);
    const page = await context.newPage();

    await page.goto(`${BASE_URL}/admin/wowstore`, { waitUntil: "networkidle" });
    // El contenido de una AccordionRow colapsada sigue en el árbol de
    // accesibilidad (altura 0 vía CSS grid, no display:none), así que
    // getByRole SOLO por el texto del botón "Promover a Experto" matchea
    // las filas de TODOS los Experto rango "especialista" a la vez (acá,
    // Legacy A y Legacy B) -- hay que escopear al contenedor de ESTA
    // fila puntual antes de clickear nada adentro. Además /admin/wowstore
    // tiene un header `position:sticky; top:0; zIndex:10` -- el
    // auto-scroll por defecto de Playwright deja el elemento pegado al
    // borde superior, tapado por ese header, así que centramos el scroll
    // a mano (`block:"center"`) antes de cada click en vez de confiar en
    // el auto-scroll.
    // La sección "Expertos" (AccordionSection) arranca colapsada -- sin
    // abrirla primero, sus filas (AccordionRow) quedan anidadas dentro
    // de un contenedor 0fr también, con los botones "atrapados" fuera
    // del flujo real: de ahí el "intercepts pointer events" persistente.
    await page.getByRole("button", { name: /^Expertos /, exact: false }).click();

    // El contenedor de la fila (el div exterior con header + contenido
    // colapsable) es el div MÁS CHICO que contiene tanto el toggle
    // ("Legacy A E2E...") como su botón "Promover a Experto" interno --
    // escopear solo por el toggle (como antes) devuelve el div del
    // header, que NO incluye el contenido (son hermanos en el DOM).
    const toggleName = "Legacy A E2E Profesión A · Especialista · publicado · 0 consultas";
    const promoverName = "Promover a Experto (arma su propio equipo)";
    const rowContainer = page
      .locator("div")
      .filter({ has: page.getByRole("button", { name: toggleName, exact: true }) })
      .filter({ has: page.getByRole("button", { name: promoverName, exact: true }) })
      .last();
    const toggleButton = rowContainer.getByRole("button", { name: toggleName, exact: true });
    await toggleButton.evaluate((el) => el.scrollIntoView({ block: "center" }));
    await toggleButton.click();
    const promoverButton = rowContainer.getByRole("button", { name: "Promover a Experto (arma su propio equipo)" });
    await promoverButton.evaluate((el) => el.scrollIntoView({ block: "center" }));
    await promoverButton.click();
    await page.waitForURL(/expertoPromovido=1/);

    const dbRow = await e2eDb.query<{ rango: string; promovidoPorAdminId: string | null }>(`select rango, "promovidoPorAdminId" from "Experto" where id = $1`, [expertoAId]);
    expect(dbRow.rows[0].rango).toBe("experto");
    expect(dbRow.rows[0].promovidoPorAdminId).toBe(adminId);

    await context.close();
  });

  test("un cliente explora WowHead, filtra por tipo, y contrata un Agente Silicio", async ({ browser }) => {
    const context = await browser.newContext();
    const cookie = await mintAdminCookie(adminId);
    await context.addCookies([{ ...cookie, url: BASE_URL }]);
    const page = await context.newPage();

    await page.goto(`${BASE_URL}/m/wowhead?cardId=${clienteCardId}`, { waitUntil: "networkidle" });
    await expect(page.getByText("Calma", { exact: true })).toBeVisible();
    await expect(page.getByText("Legacy A E2E", { exact: true })).toBeVisible();
    await expect(page.getByText("Legacy · Experto", { exact: true })).toBeVisible();

    await page.getByRole("link", { name: "● Silicio" }).click();
    await expect(page.getByText("Calma", { exact: true })).toBeVisible();
    await expect(page.getByText("Legacy A E2E", { exact: true })).toHaveCount(0);

    await page.getByText("Calma", { exact: true }).click();
    await expect(page.getByRole("heading", { name: "Calma" })).toBeVisible();
    await page.getByRole("button", { name: "Contratar" }).click();
    await page.waitForURL(/contratado=1/);

    const install = await e2eDb.query(`select 1 from "EspecialistaInstall" where "cardId" = $1 and "especialistaId" = (select id from "Especialista" where key = $2)`, [clienteCardId, especialistaKey]);
    expect(install.rows.length).toBe(1);

    await context.close();
  });

  test("el Experto recluta a otro Legacy, que acepta, y recién ahí aparece en su equipo", async ({ browser }) => {
    // 1) Legacy A (ya Experto) manda la invitación desde mi-equipo.
    const expertoContext = await browser.newContext();
    const expertoCookie = await mintMemberCookie(expertoAMemberId);
    await expertoContext.addCookies([{ ...expertoCookie, url: BASE_URL }]);
    const expertoPage = await expertoContext.newPage();

    await expertoPage.goto(`${BASE_URL}/c/${expertoACardSlug}/oficina/mi-equipo`, { waitUntil: "networkidle" });
    await expect(expertoPage.getByText("Legacy A E2E · Experto")).toBeVisible();
    await expect(expertoPage.getByText("Tu organigrama (0)")).toBeVisible();

    await expertoPage.getByPlaceholder("Clave del Legacy a invitar").fill(expertoBKey);
    await expertoPage.getByRole("button", { name: "Invitar" }).click();
    await expertoPage.waitForURL(/invitacionEnviada=1/);

    const invitacion = await e2eDb.query<{ id: string; estado: string }>(`select id, estado from "EquipoInvitacion" where "expertoId" = $1`, [expertoAId]);
    expect(invitacion.rows.length).toBe(1);
    expect(invitacion.rows[0].estado).toBe("pendiente");
    await expertoContext.close();

    // 2) Legacy B ve la invitación y la acepta.
    const invitadoContext = await browser.newContext();
    const invitadoCookie = await mintMemberCookie(expertoBMemberId);
    await invitadoContext.addCookies([{ ...invitadoCookie, url: BASE_URL }]);
    const invitadoPage = await invitadoContext.newPage();

    await invitadoPage.goto(`${BASE_URL}/c/${expertoBCardSlug}/oficina/mi-equipo`, { waitUntil: "networkidle" });
    await expect(invitadoPage.getByText("Legacy A E2E", { exact: false })).toBeVisible();
    await invitadoPage.getByRole("button", { name: "Aceptar" }).click();
    await invitadoPage.waitForURL(/invitacionRespondida=1/);

    const afterAccept = await e2eDb.query<{ estado: string; recruitedById: string | null }>(
      `select ei.estado, e."recruitedById" from "EquipoInvitacion" ei join "Experto" e on e.id = ei."especialistaId" where ei.id = $1`,
      [invitacion.rows[0].id]
    );
    expect(afterAccept.rows[0].estado).toBe("aceptada");
    expect(afterAccept.rows[0].recruitedById).toBe(expertoAId);
    await invitadoContext.close();

    // 3) El propio Experto ve a su nuevo especialista en el organigrama.
    const checkContext = await browser.newContext();
    const checkCookie = await mintMemberCookie(expertoAMemberId);
    await checkContext.addCookies([{ ...checkCookie, url: BASE_URL }]);
    const checkPage = await checkContext.newPage();
    await checkPage.goto(`${BASE_URL}/c/${expertoACardSlug}/oficina/mi-equipo`, { waitUntil: "networkidle" });
    await expect(checkPage.getByText("Tu organigrama (1)")).toBeVisible();
    await expect(checkPage.locator("canvas").first()).toBeVisible();
    await checkContext.close();

    // 4) Y también se ve reflejado en el perfil público de WowHead.
    const wowheadContext = await browser.newContext();
    const wowheadCookie = await mintAdminCookie(adminId);
    await wowheadContext.addCookies([{ ...wowheadCookie, url: BASE_URL }]);
    const wowheadPage = await wowheadContext.newPage();
    await wowheadPage.goto(`${BASE_URL}/m/wowhead/legacy/${expertoAKey}?cardId=${clienteCardId}`, { waitUntil: "networkidle" });
    await expect(wowheadPage.getByText("Su equipo (1 especialista)")).toBeVisible();
    await expect(wowheadPage.getByText("Legacy B E2E")).toBeVisible();
    await wowheadContext.close();
  });
});
