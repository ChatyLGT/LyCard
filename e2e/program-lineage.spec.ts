import { test, expect } from "@playwright/test";
import bcrypt from "bcryptjs";
import { createE2eDb, mintAdminCookie } from "./helpers/adminSession";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";

// Linaje de Programas + alta directa de Miembros (2026-10-07, diagnóstico
// de Gunnar: "tenemos un desmadre... hay dos Legacys, HeroSuite no se
// conecta a ninguno, no puedo poner un miembro"). Por la UI real de
// /admin/programs, de punta a punta:
// 1. Un Programa nuevo exige elegir un origen real (ya no hay "Sin
//    origen (raíz)" disponible salvo que la plataforma esté vacía) --
//    el hueco que dejaba crear una segunda raíz por error.
// 2. El selector de Linaje de un Programa nunca ofrece un candidato que
//    crearía un ciclo (su propio descendiente) -- ni siquiera se puede
//    intentar por la UI.
// 3. El N0 puede agregar un Miembro directo a SU Programa sin pasar por
//    el funnel público de WhatsApp/Google (que además siempre aterriza
//    en Legacy) -- y le nacen sus 3 Cards de una.
// 4. Agregar el mismo WhatsApp a un segundo Programa reusa el Member en
//    vez de duplicarlo.
test.describe("Linaje de Programas + alta directa de Miembros", () => {
  const e2eDb = createE2eDb();
  const suffix = Date.now();
  let rootProgramId: string;
  let adminId: string;
  let childProgramId: string;
  let secondChildProgramId: string | undefined;
  let memberWhatsapp: string;
  let memberId: string | undefined;

  test.beforeAll(async () => {
    await e2eDb.connect();

    // La raíz real es única en toda la DB (índice único parcial sobre
    // isRoot=true) -- no se puede crear una segunda a mano ni para un
    // test. Reusamos la que ya exista con slug "legacy" (mismo patrón
    // que el resto de la suite, ver messaging.spec.ts), o la creamos si
    // esta corrida parte de una DB sin ninguna todavía.
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
      // programId null == MasterN0, el único que puede crear Programas.
      `insert into "Admin" (id, email, "passwordHash", "programId", "updatedAt") values (gen_random_uuid()::text, $1, $2, null, now()) returning id`,
      [`e2e-lineage-admin-${suffix}@example.com`, passwordHash]
    );
    adminId = admin.rows[0].id;
    memberWhatsapp = `+52708${suffix}`;
  });

  test.afterAll(async () => {
    if (memberId) {
      await e2eDb.query(`delete from "Card" where "memberId" = $1`, [memberId]).catch(() => {});
      await e2eDb.query(`delete from "ProgramMembership" where "memberId" = $1`, [memberId]).catch(() => {});
      await e2eDb.query(`delete from "Member" where id = $1`, [memberId]).catch(() => {});
    }
    if (secondChildProgramId) await e2eDb.query(`delete from "Program" where id = $1`, [secondChildProgramId]).catch(() => {});
    if (childProgramId) await e2eDb.query(`delete from "Program" where id = $1`, [childProgramId]).catch(() => {});
    // La raíz (legacy) no se borra -- es compartida con el resto de la
    // suite (mismo criterio que messaging.spec.ts y los demás specs que
    // la reusan).
    await e2eDb.query(`delete from "Admin" where id = $1`, [adminId]).catch(() => {});
    await e2eDb.end();
  });

  test("crear Programa exige origen real, el selector nunca ofrece un ciclo, y se agrega un Miembro directo", async ({ browser }) => {
    const context = await browser.newContext();
    const adminCookie = await mintAdminCookie(adminId);
    await context.addCookies([{ ...adminCookie, url: BASE_URL }]);
    const page = await context.newPage();

    // --- 1. Crear "Guns and Roses" derivado de la Raíz E2E ---
    const childName = `Guns and Roses E2E ${suffix}`;
    await page.goto(`${BASE_URL}/admin/programs`, { waitUntil: "networkidle" });
    await page.locator('input[name="name"]').fill(childName);
    await page.locator('select[name="originProgramId"]').selectOption(rootProgramId);
    await page.getByRole("button", { name: "Crear" }).click();
    await page.waitForURL(/\/admin\/programs\/[a-z0-9-]+$/);
    childProgramId = page.url().split("/").pop()!;

    const childRow = await e2eDb.query<{ originProgramId: string | null; isRoot: boolean }>(
      `select "originProgramId", "isRoot" from "Program" where id = $1`,
      [childProgramId]
    );
    expect(childRow.rows[0].originProgramId).toBe(rootProgramId);
    expect(childRow.rows[0].isRoot).toBe(false);

    // --- 2. El selector de Linaje de la Raíz nunca ofrece a su propio
    //        hijo como origen (crearía un ciclo) ---
    await page.goto(`${BASE_URL}/admin/programs/${rootProgramId}`, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: /Linaje/ }).click();
    await expect(page.locator(`option[value="${childProgramId}"]`)).toHaveCount(0);

    // --- 3. Agregar un Miembro directo al Programa hijo, sin pasar por
    //        el funnel público ---
    await page.goto(`${BASE_URL}/admin/programs/${childProgramId}`, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: /Miembros/ }).click();
    const addMemberForm = page.locator("form").filter({ has: page.locator('input[name="whatsapp"]') });
    await addMemberForm.locator('input[name="name"]').fill("Axl E2E");
    await addMemberForm.locator('input[name="whatsapp"]').fill(memberWhatsapp);
    await addMemberForm.getByRole("button", { name: "Agregar Miembro" }).click();
    await page.waitForURL(/memberAdded=1/);

    const memberRow = await e2eDb.query<{ id: string }>(`select id from "Member" where whatsapp = $1`, [memberWhatsapp]);
    expect(memberRow.rows).toHaveLength(1);
    memberId = memberRow.rows[0].id;

    const membership = await e2eDb.query<{ status: string }>(
      `select status from "ProgramMembership" where "memberId" = $1 and "programId" = $2`,
      [memberId, childProgramId]
    );
    expect(membership.rows).toHaveLength(1);
    expect(membership.rows[0].status).toBe("active");

    const cards = await e2eDb.query<{ kind: string }>(`select kind from "Card" where "memberId" = $1 order by kind`, [memberId]);
    expect(cards.rows.map((r) => r.kind).sort()).toEqual(["company", "personal", "project"]);

    // --- 4. Un segundo Programa, mismo WhatsApp -- reusa el Member, no
    //        lo duplica ---
    const secondChildName = `MayanCity E2E ${suffix}`;
    await page.goto(`${BASE_URL}/admin/programs`, { waitUntil: "networkidle" });
    await page.locator('input[name="name"]').fill(secondChildName);
    await page.locator('select[name="originProgramId"]').selectOption(rootProgramId);
    await page.getByRole("button", { name: "Crear" }).click();
    await page.waitForURL(/\/admin\/programs\/[a-z0-9-]+$/);
    secondChildProgramId = page.url().split("/").pop()!;

    await page.getByRole("button", { name: /Miembros/ }).click();
    const secondAddForm = page.locator("form").filter({ has: page.locator('input[name="whatsapp"]') });
    await secondAddForm.locator('input[name="name"]').fill("Axl E2E (otro Programa)");
    await secondAddForm.locator('input[name="whatsapp"]').fill(memberWhatsapp);
    await secondAddForm.getByRole("button", { name: "Agregar Miembro" }).click();
    await page.waitForURL(/memberAdded=1/);

    const membersWithThatWhatsapp = await e2eDb.query<{ id: string }>(`select id from "Member" where whatsapp = $1`, [memberWhatsapp]);
    expect(membersWithThatWhatsapp.rows).toHaveLength(1);
    expect(membersWithThatWhatsapp.rows[0].id).toBe(memberId);

    const secondMembership = await e2eDb.query(
      `select status from "ProgramMembership" where "memberId" = $1 and "programId" = $2`,
      [memberId, secondChildProgramId]
    );
    expect(secondMembership.rows).toHaveLength(1);

    await context.close();
  });
});
