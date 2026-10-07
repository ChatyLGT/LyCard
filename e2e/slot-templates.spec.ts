import { test, expect } from "@playwright/test";
import bcrypt from "bcryptjs";
import { createE2eDb, mintAdminCookie } from "./helpers/adminSession";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";

// Librería "elegir o armar" (2026-10-07, ver docs/WHITEPAPER-ADENDA-2026-10-07.md
// sección 8) -- Fase 1 del patrón Slot+Shape+Payload, aplicado a Escalas
// (medal/rank/contacts). De punta a punta, por la UI real:
// 1. MasterN0 arma 2 SlotTemplate reales en /admin/slot-templates.
// 2. En un Programa cualquiera, el N0 abre "Medalla Rango", ve "Elegir
//    de la librería" con esos 2 templates, elige uno, guarda.
// 3. El payload elegido queda en Program.medalScale (DB).
// 4. La tarjeta pública de un Miembro de ese Programa refleja el nuevo
//    medallón -- no el genérico de siempre.
test.describe("Librería de Slots -- Elegir de la librería en Escalas", () => {
  const e2eDb = createE2eDb();
  const suffix = Date.now();
  let rootProgramId: string;
  let adminId: string;
  let childProgramId: string;
  let templateAId: string | undefined;
  let templateBId: string | undefined;
  let memberId: string | undefined;
  let projectCardSlug: string | undefined;

  test.beforeAll(async () => {
    await e2eDb.connect();

    const existingRoot = await e2eDb.query<{ id: string }>(`select id from "Program" where slug = 'legacy'`);
    if (existingRoot.rows[0]) {
      rootProgramId = existingRoot.rows[0].id;
    } else {
      const root = await e2eDb.query<{ id: string }>(
        `insert into "Program" (id, slug, name, "isRoot", "updatedAt") values (gen_random_uuid()::text, 'legacy', 'Legacy', true, now()) returning id`
      );
      rootProgramId = root.rows[0].id;
    }

    const passwordHash = await bcrypt.hash("no-se-usa-login-por-cookie", 10);
    const admin = await e2eDb.query<{ id: string }>(
      `insert into "Admin" (id, email, "passwordHash", "programId", "updatedAt") values (gen_random_uuid()::text, $1, $2, null, now()) returning id`,
      [`e2e-slottpl-admin-${suffix}@example.com`, passwordHash]
    );
    adminId = admin.rows[0].id;

    const child = await e2eDb.query<{ id: string }>(
      `insert into "Program" (id, slug, name, "originProgramId", "updatedAt") values (gen_random_uuid()::text, $1, $2, $3, now()) returning id`,
      [`e2e-slottpl-child-${suffix}`, `Librería E2E ${suffix}`, rootProgramId]
    );
    childProgramId = child.rows[0].id;
  });

  test.afterAll(async () => {
    if (memberId) {
      await e2eDb.query(`delete from "Card" where "memberId" = $1`, [memberId]).catch(() => {});
      await e2eDb.query(`delete from "ProgramMembership" where "memberId" = $1`, [memberId]).catch(() => {});
      await e2eDb.query(`delete from "Member" where id = $1`, [memberId]).catch(() => {});
    }
    if (templateAId) await e2eDb.query(`delete from "SlotTemplate" where id = $1`, [templateAId]).catch(() => {});
    if (templateBId) await e2eDb.query(`delete from "SlotTemplate" where id = $1`, [templateBId]).catch(() => {});
    await e2eDb.query(`delete from "Program" where id = $1`, [childProgramId]).catch(() => {});
    await e2eDb.query(`delete from "Admin" where id = $1`, [adminId]).catch(() => {});
    await e2eDb.end();
  });

  test("MasterN0 arma 2 templates, un N0 elige uno para su Medalla Rango, y la tarjeta pública lo refleja", async ({ browser }) => {
    const context = await browser.newContext();
    const adminCookie = await mintAdminCookie(adminId);
    await context.addCookies([{ ...adminCookie, url: BASE_URL }]);
    const page = await context.newPage();

    // --- 1. Crear 2 SlotTemplate reales de tipo "escala" ---
    const templateAName = `Madurez Operativa E2E ${suffix}`;
    const templateAPayload = JSON.stringify([
      { clave: "diagnostico", nombre: "Diagnóstico", subtitulo: "Recién empieza", color: "#C8A15A", icono: "search", descripcion: "Todavía mapeando el negocio." },
      { clave: "implementacion", nombre: "Implementación", subtitulo: "En marcha", color: "#7FB0C4", icono: "build", descripcion: "Ya está usando el sistema." },
      { clave: "autonoma", nombre: "Autónoma", subtitulo: "Referente", color: "#8fd19e", icono: "verified", descripcion: "Opera sola, es ejemplo para otros." },
    ]);
    await page.goto(`${BASE_URL}/admin/slot-templates`, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: /Agregar Template/ }).click();
    const addForm = page.locator("form").filter({ has: page.getByRole("button", { name: "Crear Template" }) });
    await addForm.locator('input[name="nombre"]').fill(templateAName);
    await addForm.locator('textarea[name="payload"]').fill(templateAPayload);
    await addForm.getByRole("button", { name: "Crear Template" }).click();
    await page.waitForURL(/slotTemplateCreated=1/);

    const templateBName = `Adopción E2E ${suffix}`;
    const templateBPayload = JSON.stringify([
      { clave: "nuevo", nombre: "Nuevo", subtitulo: "", color: "#C8A15A", icono: "fiber_new", descripcion: "Recién se unió." },
      { clave: "activo", nombre: "Activo", subtitulo: "", color: "#7FB0C4", icono: "bolt", descripcion: "Usa el sistema seguido." },
    ]);
    // Navegación real, no soft-nav -- el AccordionAddRow es cliente y
    // conserva su propio estado "open" entre renders server-driven; un
    // goto() fuerza un remount limpio en vez de depender de que el
    // segundo click sobre "Agregar Template" lo abra (podría cerrarlo si
    // ya había quedado abierto de la vuelta anterior).
    await page.goto(`${BASE_URL}/admin/slot-templates`, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: /Agregar Template/ }).click();
    const addForm2 = page.locator("form").filter({ has: page.getByRole("button", { name: "Crear Template" }) });
    await addForm2.locator('input[name="nombre"]').fill(templateBName);
    await addForm2.locator('textarea[name="payload"]').fill(templateBPayload);
    await addForm2.getByRole("button", { name: "Crear Template" }).click();
    await page.waitForURL(/slotTemplateCreated=1/);

    const templateRows = await e2eDb.query<{ id: string; nombre: string }>(
      `select id, nombre from "SlotTemplate" where nombre = $1 or nombre = $2`,
      [templateAName, templateBName]
    );
    expect(templateRows.rows).toHaveLength(2);
    templateAId = templateRows.rows.find((r) => r.nombre === templateAName)?.id;
    templateBId = templateRows.rows.find((r) => r.nombre === templateBName)?.id;
    expect(templateAId).toBeTruthy();

    // --- 2. En el Programa hijo, abrir Medalla Rango y elegir el template A ---
    // Los 3 editores de Escala (Medalla KPIs/contacts, Medalla Rango/medal,
    // Badge de Rangos/rank) reciben los MISMOS templates -- "Elegir de la
    // librería" aparece 3 veces en el DOM (AccordionSection no desmonta su
    // contenido al cerrar, solo lo colapsa por CSS). Escopeamos al <form>
    // que es hermano directo del botón "Medalla Rango" -- ahí adentro solo
    // hay UN form, sin ambigüedad con los otros 2 editores.
    await page.goto(`${BASE_URL}/admin/programs/${childProgramId}`, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: /Categorización/ }).click();
    // Anclado al inicio -- el botón "Categorización" incluye su propio
    // subtítulo como parte del nombre accesible, y ese subtítulo
    // menciona "Medalla Rango" de pasada (lista las 4 subsecciones) --
    // un regex sin anclar matchea los dos botones.
    await page.getByRole("button", { name: /^Medalla Rango/ }).click();
    const medalForm = page.locator("xpath=//button[starts-with(normalize-space(.), 'Medalla Rango')]/following-sibling::div[1]//form");
    await medalForm.getByRole("button", { name: /Elegir de la librería/ }).click();
    await medalForm.getByRole("button", { name: new RegExp(templateAName) }).click();
    await medalForm.getByRole("button", { name: "Guardar Escala" }).click();
    await page.waitForURL(/escalaSaved=medal/);

    // --- 3. Confirmar en DB que medalScale quedó con el payload elegido ---
    const programRow = await e2eDb.query<{ medalScale: unknown }>(`select "medalScale" from "Program" where id = $1`, [childProgramId]);
    const savedScale = programRow.rows[0].medalScale as { key: string; nombre: string }[];
    expect(savedScale.map((s) => s.key).sort()).toEqual(["autonoma", "diagnostico", "implementacion"]);
    expect(savedScale.find((s) => s.key === "diagnostico")?.nombre).toBe("Diagnóstico");

    // --- 4. Agregar un Miembro directo (v1.82.0) para tener una Card
    //        pública real, y confirmar que el modal de medalla muestra
    //        el nuevo nivel en vez del genérico Bronce/Plata/Oro ---
    await page.getByRole("button", { name: /Miembros/ }).click();
    const addMemberForm = page.locator("form").filter({ has: page.locator('input[name="whatsapp"]') });
    await addMemberForm.locator('input[name="name"]').fill("Slot Template E2E");
    await addMemberForm.locator('input[name="whatsapp"]').fill(`+52709${suffix}`);
    await addMemberForm.getByRole("button", { name: "Agregar Miembro" }).click();
    await page.waitForURL(/memberAdded=1/);

    const memberRow = await e2eDb.query<{ id: string }>(`select id from "Member" where whatsapp = $1`, [`+52709${suffix}`]);
    memberId = memberRow.rows[0].id;
    const cardRow = await e2eDb.query<{ slug: string }>(`select slug from "Card" where "memberId" = $1 and kind = 'project'`, [memberId]);
    projectCardSlug = cardRow.rows[0].slug;

    await page.goto(`${BASE_URL}/c/${projectCardSlug}`, { waitUntil: "networkidle" });
    // El visitante ve un carrusel con las 3 Cards del Miembro (project/
    // company/personal) -- cada una trae su propio botón "Medalla
    // Rango" en el DOM. La primera es la project Card, la que abrimos
    // por slug.
    await page.getByLabel("Medalla Rango").first().click();
    await expect(page.getByText("Diagnóstico")).toBeVisible();
    await expect(page.getByText("Implementación")).toBeVisible();
    await expect(page.getByText("Autónoma")).toBeVisible();

    await context.close();
  });
});
