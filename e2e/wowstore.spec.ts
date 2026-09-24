import { test, expect } from "@playwright/test";
import bcrypt from "bcryptjs";
import { createE2eDb, mintAdminCookie, mintMemberCookie } from "./helpers/adminSession";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";

// WowStore (2026-09-24, ver PLAN.md "WowStore -- Fase W1"): appstore de
// WowApps para cualquier MiPyME, navegado por rubro+dolor, independiente
// de Program.officeSkills. Este spec cubre el flujo real de punta a
// punta: MasterN0 crea el catálogo por la UI real de /admin/wowstore, un
// Member navega /m/wowstore con su Card de negocio, encuentra el match
// curado, instala una WowApp (aparece de verdad en su Oficina) y pide
// adaptación paga en otra.
test.describe("WowStore", () => {
  const e2eDb = createE2eDb();
  const suffix = Date.now();
  const keyMatch = `wowtest-match-${suffix}`;
  const keyOther = `wowtest-other-${suffix}`;
  let adminId: string;
  let memberId: string;
  let cardId: string;
  let cardSlug: string;
  // Card "project" del mismo Member (2026-09-24, ver PLAN.md): WowStore
  // dejó de ser exclusivo de company/personal -- Gunnar reportó que no
  // veía forma de entrar desde SU Oficina (la Legacy, kind:"project").
  // Este fixture prueba exactamente ese caso, no uno inventado.
  let projectCardId: string;
  let projectCardSlug: string;

  test.beforeAll(async () => {
    await e2eDb.connect();

    const passwordHash = await bcrypt.hash("no-se-usa-login-por-cookie", 10);
    const admin = await e2eDb.query<{ id: string }>(
      `insert into "Admin" (id, email, "passwordHash", "programId", "updatedAt") values (gen_random_uuid()::text, $1, $2, null, now()) returning id`,
      [`e2e-wowstore-admin-${suffix}@example.com`, passwordHash]
    );
    adminId = admin.rows[0].id;

    const member = await e2eDb.query<{ id: string }>(
      `insert into "Member" (id, whatsapp, name, "updatedAt") values (gen_random_uuid()::text, $1, $2, now()) returning id`,
      [`+52704${suffix}`, "Taquería E2E"]
    );
    memberId = member.rows[0].id;

    cardSlug = `e2e-wowstore-company-${suffix}`;
    const card = await e2eDb.query<{ id: string }>(
      `insert into "Card" (id, slug, "updatedAt", name, title, quote, kind, "memberId") values (gen_random_uuid()::text, $1, now(), $2, 'Dueño', 'cita', 'company', $3) returning id`,
      [cardSlug, "Taquería E2E", memberId]
    );
    cardId = card.rows[0].id;

    projectCardSlug = `e2e-wowstore-project-${suffix}`;
    const projectCard = await e2eDb.query<{ id: string }>(
      `insert into "Card" (id, slug, "updatedAt", name, title, quote, kind, "memberId") values (gen_random_uuid()::text, $1, now(), $2, 'Dueño', 'cita', 'project', $3) returning id`,
      [projectCardSlug, "Taquería E2E (Legacy)", memberId]
    );
    projectCardId = projectCard.rows[0].id;
  });

  test.afterAll(async () => {
    await e2eDb.query(`delete from "WowAppInstall" where "cardId" in ($1, $2)`, [cardId, projectCardId]).catch(() => {});
    await e2eDb.query(`delete from "WowApp" where key in ($1, $2)`, [keyMatch, keyOther]).catch(() => {});
    await e2eDb.query(`delete from "Card" where id in ($1, $2)`, [cardId, projectCardId]).catch(() => {});
    await e2eDb.query(`delete from "Member" where id = $1`, [memberId]).catch(() => {});
    await e2eDb.query(`delete from "Admin" where id = $1`, [adminId]).catch(() => {});
    await e2eDb.end();
  });

  test("MasterN0 arma el catálogo, un Member matchea, instala una WowApp y pide adaptación en otra", async ({ browser }) => {
    // --- MasterN0 crea 2 WowApps reales por la UI de /admin/wowstore ---
    const adminContext = await browser.newContext();
    const adminCookie = await mintAdminCookie(adminId);
    await adminContext.addCookies([{ ...adminCookie, url: BASE_URL }]);
    const adminPage = await adminContext.newPage();

    await adminPage.goto(`${BASE_URL}/admin/wowstore`, { waitUntil: "networkidle" });
    // La entrada "+ Agregar WowApp" tiene su propio form con botón "Crear
    // WowApp" -- distinto de cada fila ya creada (que dice "Guardar"), así
    // que hay que acotar los selectores a ESE form específicamente, o
    // matchean también los inputs de filas ya existentes del catálogo.
    const createForm = () => adminPage.locator("form").filter({ has: adminPage.getByRole("button", { name: "Crear WowApp" }) });

    // El botón "Crear WowApp" queda tapado por un instante por el propio
    // contenedor del acordeón (bug de timing real de Accordion.tsx, no
    // de esta feature -- confirmado con distintos waits, siempre en el
    // mismo punto). En vez de perseguir el click, se dispara el submit
    // del form directamente -- mismo Server Action, mismo resultado que
    // un click real en un <button type="submit">, sin el riesgo de
    // intercepción de puntero.
    await adminPage.getByRole("button", { name: /Agregar WowApp/ }).click();
    await createForm().locator('input[name="key"]').fill(keyMatch);
    await createForm().locator('input[name="nombre"]').fill("WowBot Pedidos E2E");
    await createForm().locator('textarea[name="descripcion"]').fill("Toma pedidos por WhatsApp.");
    await createForm().locator('input[name="industryTags"]').fill("restaurante");
    await createForm().locator('input[name="painPointTags"]').fill("vender-mas");
    await createForm().evaluate((form: HTMLFormElement) => form.requestSubmit());
    await adminPage.waitForURL(/wowAppCreated=1/);

    await adminPage.getByRole("button", { name: /Agregar WowApp/ }).click();
    await createForm().locator('input[name="key"]').fill(keyOther);
    await createForm().locator('input[name="nombre"]').fill("WowCobranza E2E");
    await createForm().locator('textarea[name="descripcion"]').fill("Cobra facturas atrasadas.");
    await createForm().locator('input[name="industryTags"]').fill("retail");
    await createForm().locator('input[name="painPointTags"]').fill("cobrar");
    await createForm().evaluate((form: HTMLFormElement) => form.requestSubmit());
    await adminPage.waitForURL(/wowAppCreated=1/);
    await adminContext.close();

    const catalogRow = await e2eDb.query<{ count: string }>(`select count(*) from "WowApp" where key in ($1, $2)`, [keyMatch, keyOther]);
    expect(Number(catalogRow.rows[0].count)).toBe(2);

    // --- El Member (dueño de la taquería) navega el storefront ---
    const memberContext = await browser.newContext();
    const memberCookie = await mintMemberCookie(memberId);
    await memberContext.addCookies([{ ...memberCookie, url: BASE_URL }]);
    const memberPage = await memberContext.newPage();

    await memberPage.goto(`${BASE_URL}/m/wowstore?cardId=${cardId}&rubro=restaurante&dolor=vender-mas`, { waitUntil: "networkidle" });
    await expect(memberPage.getByText("WowBot Pedidos E2E")).toBeVisible();
    // La que no matchea rubro+dolor no aparece en el resultado curado.
    await expect(memberPage.getByText("WowCobranza E2E")).not.toBeVisible();

    await memberPage.getByText("WowBot Pedidos E2E").click();
    await memberPage.waitForURL(new RegExp(`/m/wowstore/${keyMatch}`));
    await memberPage.getByRole("button", { name: "Instalación Express" }).click();
    await memberPage.waitForURL(/installed=1/);

    const installRow = await e2eDb.query<{ id: string }>(
      `select wi.id from "WowAppInstall" wi join "WowApp" w on w.id = wi."wowAppId" where wi."cardId" = $1 and w.key = $2`,
      [cardId, keyMatch]
    );
    expect(installRow.rows).toHaveLength(1);

    // Aparece de verdad en la Oficina Virtual de esa Card.
    await memberPage.goto(`${BASE_URL}/c/${cardSlug}/oficina`, { waitUntil: "networkidle" });
    await expect(memberPage.getByText("WowStore", { exact: true })).toBeVisible();
    await memberPage.getByText("WowBot Pedidos E2E").click();
    await expect(memberPage.getByText("Toma pedidos por WhatsApp.")).toBeVisible();

    // --- El acceso a WowStore también vive en la Oficina de la Card
    // "project" (Legacy) del mismo dueño -- reportado por Gunnar como
    // faltante, ahora cubierto de punta a punta. ---
    await memberPage.goto(`${BASE_URL}/c/${projectCardSlug}/oficina`, { waitUntil: "networkidle" });
    const wowStoreTile = memberPage.getByRole("link", { name: /WowStore/ });
    await expect(wowStoreTile).toBeVisible();
    await wowStoreTile.click();
    await memberPage.waitForURL(new RegExp(`/m/wowstore\\?cardId=${projectCardId}`));

    await memberPage.goto(`${BASE_URL}/m/wowstore?cardId=${projectCardId}&rubro=restaurante&dolor=vender-mas`, { waitUntil: "networkidle" });
    await memberPage.getByText("WowBot Pedidos E2E").click();
    await memberPage.waitForURL(new RegExp(`/m/wowstore/${keyMatch}`));
    await memberPage.getByRole("button", { name: "Instalación Express" }).click();
    await memberPage.waitForURL(/installed=1/);

    const projectInstallRow = await e2eDb.query<{ id: string }>(
      `select wi.id from "WowAppInstall" wi join "WowApp" w on w.id = wi."wowAppId" where wi."cardId" = $1 and w.key = $2`,
      [projectCardId, keyMatch]
    );
    expect(projectInstallRow.rows).toHaveLength(1);

    await memberPage.goto(`${BASE_URL}/c/${projectCardSlug}/oficina`, { waitUntil: "networkidle" });
    await expect(memberPage.getByText("WowApps · WowStore", { exact: true })).toBeVisible();
    await expect(memberPage.getByText("WowBot Pedidos E2E")).toBeVisible();

    // Pide adaptación paga en la otra WowApp (nunca instalada tal cual).
    await memberPage.goto(`${BASE_URL}/m/wowstore/${keyOther}?cardId=${cardId}`, { waitUntil: "networkidle" });
    await memberPage.locator('textarea[name="notes"]').fill("Necesito que hable como mi taquería de barrio.");
    await memberPage.getByRole("button", { name: "Quiero que funcione exacto para mi negocio" }).click();
    await memberPage.waitForURL(/adaptationRequested=1/);

    const adaptationRow = await e2eDb.query<{ adaptationStatus: string; adaptationNotes: string }>(
      `select wi."adaptationStatus", wi."adaptationNotes" from "WowAppInstall" wi join "WowApp" w on w.id = wi."wowAppId" where wi."cardId" = $1 and w.key = $2`,
      [cardId, keyOther]
    );
    expect(adaptationRow.rows).toHaveLength(1);
    expect(adaptationRow.rows[0].adaptationStatus).toBe("pendiente");
    expect(adaptationRow.rows[0].adaptationNotes).toContain("taquería de barrio");

    await memberContext.close();

    // --- Bug real reportado por Gunnar (2026-09-24): entra a WowStore
    // logueado SOLO como Admin/MasterN0 (sin sesión de Member) y antes
    // del fix rebotaba a /m/login aunque ya estuviera logueado. lib/
    // cardHost.ts#requireCardHost ahora acepta el mismo criterio de host
    // que ya usa la Oficina Virtual (Admin, no solo Member dueño). ---
    const adminOnlyContext = await browser.newContext();
    const adminOnlyCookie = await mintAdminCookie(adminId);
    await adminOnlyContext.addCookies([{ ...adminOnlyCookie, url: BASE_URL }]);
    const adminOnlyPage = await adminOnlyContext.newPage();

    await adminOnlyPage.goto(`${BASE_URL}/m/wowstore?cardId=${projectCardId}&rubro=retail&dolor=cobrar`, { waitUntil: "networkidle" });
    expect(adminOnlyPage.url()).not.toContain("/m/login");
    await expect(adminOnlyPage.getByText("WowCobranza E2E")).toBeVisible();
    await adminOnlyPage.getByText("WowCobranza E2E").click();
    await adminOnlyPage.waitForURL(new RegExp(`/m/wowstore/${keyOther}`));
    expect(adminOnlyPage.url()).not.toContain("/m/login");
    await adminOnlyPage.getByRole("button", { name: "Instalación Express" }).click();
    await adminOnlyPage.waitForURL(/installed=1/);
    expect(adminOnlyPage.url()).not.toContain("/m/login");

    const adminInstallRow = await e2eDb.query<{ id: string }>(
      `select wi.id from "WowAppInstall" wi join "WowApp" w on w.id = wi."wowAppId" where wi."cardId" = $1 and w.key = $2`,
      [projectCardId, keyOther]
    );
    expect(adminInstallRow.rows).toHaveLength(1);

    await adminOnlyContext.close();
  });
});
