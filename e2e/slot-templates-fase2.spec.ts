import { test, expect } from "@playwright/test";
import bcrypt from "bcryptjs";
import { createE2eDb, mintAdminCookie } from "./helpers/adminSession";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";

// Librería de Slots -- Fase 2 (2026-10-07): el mismo patrón Armar/Elegir
// de la Fase 1 (Escalas), generalizado a los 3 slot types restantes --
// "puesto" (filas de DB, bulk-replace), "officeSkill" (Program.officeSkills,
// mismo mecanismo que Escalas) y "modal" (los 3 modales bodyKind:"bloques",
// probado acá con Bóveda Legacy). De punta a punta, por la UI real.
test.describe("Librería de Slots -- Fase 2 (puesto/officeSkill/modal)", () => {
  const e2eDb = createE2eDb();
  const suffix = Date.now();
  let adminId: string;
  let programId: string;
  let puestoTemplateId: string | undefined;
  let officeSkillTemplateId: string | undefined;
  let modalTemplateId: string | undefined;

  test.beforeAll(async () => {
    await e2eDb.connect();

    const passwordHash = await bcrypt.hash("no-se-usa-login-por-cookie", 10);
    const admin = await e2eDb.query<{ id: string }>(
      `insert into "Admin" (id, email, "passwordHash", "programId", "updatedAt") values (gen_random_uuid()::text, $1, $2, null, now()) returning id`,
      [`e2e-fase2-admin-${suffix}@example.com`, passwordHash]
    );
    adminId = admin.rows[0].id;

    const existingRoot = await e2eDb.query<{ id: string }>(`select id from "Program" where slug = 'legacy'`);
    const rootId = existingRoot.rows[0]
      ? existingRoot.rows[0].id
      : (
          await e2eDb.query<{ id: string }>(
            `insert into "Program" (id, slug, name, "isRoot", "updatedAt") values (gen_random_uuid()::text, 'legacy', 'Legacy', true, now()) returning id`
          )
        ).rows[0].id;

    const program = await e2eDb.query<{ id: string }>(
      `insert into "Program" (id, slug, name, "originProgramId", "updatedAt") values (gen_random_uuid()::text, $1, $2, $3, now()) returning id`,
      [`e2e-fase2-${suffix}`, `Fase 2 E2E ${suffix}`, rootId]
    );
    programId = program.rows[0].id;

    // Un Puesto previo, para confirmar que aplicar el template lo
    // REEMPLAZA (no lo suma).
    await e2eDb.query(
      `insert into "Puesto" (id, "programId", siglas, denominacion, descripcion, "order", icono, "createdAt", "updatedAt") values (gen_random_uuid()::text, $1, 'VIEJO', 'Puesto Viejo', '', 0, 'diamond', now(), now())`,
      [programId]
    );
  });

  test.afterAll(async () => {
    if (puestoTemplateId) await e2eDb.query(`delete from "SlotTemplate" where id = $1`, [puestoTemplateId]).catch(() => {});
    if (officeSkillTemplateId) await e2eDb.query(`delete from "SlotTemplate" where id = $1`, [officeSkillTemplateId]).catch(() => {});
    if (modalTemplateId) await e2eDb.query(`delete from "SlotTemplate" where id = $1`, [modalTemplateId]).catch(() => {});
    await e2eDb.query(`delete from "Puesto" where "programId" = $1`, [programId]).catch(() => {});
    await e2eDb.query(`delete from "Program" where id = $1`, [programId]).catch(() => {});
    await e2eDb.query(`delete from "Admin" where id = $1`, [adminId]).catch(() => {});
    await e2eDb.end();
  });

  test("Puesto: elegir un template reemplaza toda la escalera existente", async ({ browser }) => {
    const context = await browser.newContext();
    await context.addCookies([{ ...(await mintAdminCookie(adminId)), url: BASE_URL }]);
    const page = await context.newPage();

    const templateName = `Escalera E2E ${suffix}`;
    const payload = JSON.stringify([
      { siglas: "O.D.", denominacion: "Original Dreamer", descripcion: "", icono: "diamond", order: 0 },
      { siglas: "F.", denominacion: "Founder", descripcion: "", icono: "star", order: 1 },
    ]);
    await page.goto(`${BASE_URL}/admin/slot-templates`, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: /Agregar Template/ }).click();
    const addForm = page.locator("form").filter({ has: page.getByRole("button", { name: "Crear Template" }) });
    await addForm.locator('select[name="slotType"]').selectOption("puesto");
    await addForm.locator('input[name="nombre"]').fill(templateName);
    await addForm.locator('textarea[name="payload"]').fill(payload);
    await addForm.getByRole("button", { name: "Crear Template" }).click();
    await page.waitForURL(/slotTemplateCreated=1/);

    const tplRow = await e2eDb.query<{ id: string }>(`select id from "SlotTemplate" where nombre = $1`, [templateName]);
    puestoTemplateId = tplRow.rows[0].id;

    // "Badge de Puestos" vive anidado adentro de "Categorización"
    // (AccordionSection dentro de AccordionSection) -- colapsada por
    // defecto, hay que abrirla primero o el botón de adentro queda con
    // altura 0 y el click cae sobre otro elemento.
    await page.goto(`${BASE_URL}/admin/programs/${programId}`, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: /^Categorización/ }).click();
    await page.getByRole("button", { name: /^Badge de Puestos/ }).click();
    // "reemplaza toda la escalera" (Puesto) vs "reemplaza toda la
    // escala" (Escalas, 3 veces -- medal/rank/contacts): palabras
    // distintas, evita el choque con los AccordionAddRow de EscalaEditor.
    await page.getByRole("button", { name: /reemplaza toda la escalera/ }).click();
    await page.getByRole("button", { name: new RegExp(templateName) }).click();
    await page.waitForURL(/puestoTemplateApplied=1/);

    const puestos = await e2eDb.query<{ siglas: string; denominacion: string }>(
      `select siglas, denominacion from "Puesto" where "programId" = $1 order by "order" asc`,
      [programId]
    );
    expect(puestos.rows.map((p) => p.siglas)).toEqual(["O.D.", "F."]);
    expect(puestos.rows.map((p) => p.denominacion)).toEqual(["Original Dreamer", "Founder"]);

    await context.close();
  });

  test("officeSkill: elegir un template reemplaza los Superpoderes propios", async ({ browser }) => {
    const context = await browser.newContext();
    await context.addCookies([{ ...(await mintAdminCookie(adminId)), url: BASE_URL }]);
    const page = await context.newPage();

    const templateName = `Superpoderes E2E ${suffix}`;
    const payload = JSON.stringify([
      { key: "custom-e2e", nombre: "Skill E2E", descripcion: "Un superpoder de prueba.", iconUrl: "", color: "#C8A15A", appType: "custom", enabled: true },
    ]);
    await page.goto(`${BASE_URL}/admin/slot-templates`, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: /Agregar Template/ }).click();
    const addForm = page.locator("form").filter({ has: page.getByRole("button", { name: "Crear Template" }) });
    await addForm.locator('select[name="slotType"]').selectOption("officeSkill");
    await addForm.locator('input[name="nombre"]').fill(templateName);
    await addForm.locator('textarea[name="payload"]').fill(payload);
    await addForm.getByRole("button", { name: "Crear Template" }).click();
    await page.waitForURL(/slotTemplateCreated=1/);

    const tplRow = await e2eDb.query<{ id: string }>(`select id from "SlotTemplate" where nombre = $1`, [templateName]);
    officeSkillTemplateId = tplRow.rows[0].id;

    await page.goto(`${BASE_URL}/admin/programs/${programId}`, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: /WowApps internas de la Oficina/ }).click();
    const skillsForm = page.locator("form").filter({ has: page.getByRole("button", { name: "Guardar Superpoderes" }) });
    await skillsForm.getByRole("button", { name: /Elegir de la librería/ }).click();
    await skillsForm.getByRole("button", { name: new RegExp(templateName) }).click();
    await skillsForm.getByRole("button", { name: "Guardar Superpoderes" }).click();
    await page.waitForURL(/officeSkillsSaved=1/);

    const programRow = await e2eDb.query<{ officeSkills: unknown }>(`select "officeSkills" from "Program" where id = $1`, [programId]);
    const skills = programRow.rows[0].officeSkills as { key: string; nombre: string }[];
    expect(skills).toHaveLength(1);
    expect(skills[0].key).toBe("custom-e2e");
    expect(skills[0].nombre).toBe("Skill E2E");

    await context.close();
  });

  test("modal (Bóveda Legacy): elegir un template reemplaza todos los bloques", async ({ browser }) => {
    const context = await browser.newContext();
    await context.addCookies([{ ...(await mintAdminCookie(adminId)), url: BASE_URL }]);
    const page = await context.newPage();

    const templateName = `Bloques E2E ${suffix}`;
    const payload = JSON.stringify([
      { id: "b1", kind: "texto", heading: "Título E2E", body: "Cuerpo E2E", mediaUrl: "", mediaType: "video", linkLabel: "", kpiValue: "", kpiSub: "" },
    ]);
    await page.goto(`${BASE_URL}/admin/slot-templates`, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: /Agregar Template/ }).click();
    const addForm = page.locator("form").filter({ has: page.getByRole("button", { name: "Crear Template" }) });
    await addForm.locator('select[name="slotType"]').selectOption("modal");
    await addForm.locator('input[name="nombre"]').fill(templateName);
    await addForm.locator('textarea[name="payload"]').fill(payload);
    await addForm.getByRole("button", { name: "Crear Template" }).click();
    await page.waitForURL(/slotTemplateCreated=1/);

    const tplRow = await e2eDb.query<{ id: string }>(`select id from "SlotTemplate" where nombre = $1`, [templateName]);
    modalTemplateId = tplRow.rows[0].id;

    // "Bóveda Legacy" es uno de los 3 modales bodyKind:"bloques" -- los
    // 3 reciben los MISMOS templates, así que "Elegir de la librería"
    // aparece 3 veces en el DOM. Escopeamos al <form> de ESTE modal
    // puntual filtrando por su propio botón "Guardar" (único por
    // aria-name), no contando niveles de <div> a mano.
    await page.goto(`${BASE_URL}/admin/programs/${programId}`, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: /Editor de Modales/ }).click();
    await page.getByRole("button", { name: /^Bóveda Legacy/ }).click();
    const vaultForm = page.locator("form").filter({ has: page.getByRole("button", { name: "Guardar Bóveda Legacy" }) });
    await vaultForm.getByRole("button", { name: /Elegir de la librería/ }).click();
    await vaultForm.getByRole("button", { name: new RegExp(templateName) }).click();
    await vaultForm.getByRole("button", { name: "Guardar Bóveda Legacy" }).click();
    await page.waitForURL(/modalSaved=vault/);

    const programRow = await e2eDb.query<{ modalBlocks: unknown }>(`select "modalBlocks" from "Program" where id = $1`, [programId]);
    const modalBlocks = programRow.rows[0].modalBlocks as Record<string, { heading: string; body: string }[]>;
    expect(modalBlocks.vault).toHaveLength(1);
    expect(modalBlocks.vault[0].heading).toBe("Título E2E");
    expect(modalBlocks.vault[0].body).toBe("Cuerpo E2E");

    await context.close();
  });
});
