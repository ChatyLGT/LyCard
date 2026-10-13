import { test, expect } from "@playwright/test";
import { createE2eDb, mintMemberCookie, mintAdminCookie } from "./helpers/adminSession";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";

// Fusión de identidad, etapa 3 (2026-10-13): todos entran con Google (sesión
// de Member) y el ROL decide a qué pantalla llegan. El MasterN0 otorga el rol
// de Oreja a un Member del Programa desde "Roles del equipo"; ese Member
// entra a /empleados con su sesión de Member, sin password ni cookie aparte,
// y NO puede entrar a /admin.
test.describe("Roles por Programa -- acceso con sesión de Member", () => {
  const e2eDb = createE2eDb();
  const suffix = Date.now();
  let programId: string;
  let masterAdminId: string;
  let orejaMemberId: string;
  let plainMemberId: string;
  let orejaMembershipId: string;

  test.beforeAll(async () => {
    await e2eDb.connect();
    programId = `e2e-roles-${suffix}`;
    await e2eDb.query(`insert into "Program" (id, slug, name, "updatedAt") values ($1, $2, $3, now())`, [programId, `e2e-roles-slug-${suffix}`, "E2E Roles"]);
    const master = await e2eDb.query<{ id: string }>(
      `insert into "Admin" (id, email, "passwordHash", "updatedAt") values (gen_random_uuid()::text, $1, 'x', now()) returning id`,
      [`e2e-roles-master-${suffix}@example.com`]
    );
    masterAdminId = master.rows[0].id;
    const oreja = await e2eDb.query<{ id: string }>(`insert into "Member" (id, name, "updatedAt") values (gen_random_uuid()::text, $1, now()) returning id`, [`E2E Oreja ${suffix}`]);
    orejaMemberId = oreja.rows[0].id;
    const plain = await e2eDb.query<{ id: string }>(`insert into "Member" (id, name, "updatedAt") values (gen_random_uuid()::text, $1, now()) returning id`, [`E2E Plano ${suffix}`]);
    plainMemberId = plain.rows[0].id;
    const pm = await e2eDb.query<{ id: string }>(
      `insert into "ProgramMembership" (id, "programId", "memberId", status, "updatedAt") values (gen_random_uuid()::text, $1, $2, 'active', now()) returning id`,
      [programId, orejaMemberId]
    );
    orejaMembershipId = pm.rows[0].id;
  });

  test.afterAll(async () => {
    await e2eDb.query(`delete from "Admin" where id = $1 or "memberId" = any($2)`, [masterAdminId, [orejaMemberId, plainMemberId]]).catch(() => {});
    await e2eDb.query(`delete from "ProgramMembership" where "programId" = $1`, [programId]).catch(() => {});
    await e2eDb.query(`delete from "Member" where id = any($1)`, [[orejaMemberId, plainMemberId]]).catch(() => {});
    await e2eDb.query(`delete from "Program" where id = $1`, [programId]).catch(() => {});
    await e2eDb.end();
  });

  test("sin rol, un Member no entra a /empleados ni a /admin", async ({ browser }) => {
    const context = await browser.newContext();
    await context.addCookies([{ ...(await mintMemberCookie(plainMemberId)), url: BASE_URL }]);
    const page = await context.newPage();
    await page.goto(`${BASE_URL}/empleados`, { waitUntil: "networkidle" });
    await expect(page).toHaveURL(/\/empleados\/login/);
    await page.goto(`${BASE_URL}/admin/programs/${programId}`, { waitUntil: "networkidle" });
    await expect(page).toHaveURL(/\/admin\/login/);
    await context.close();
  });

  test("el MasterN0 otorga Oreja; el Member entra a /empleados con su sesión y no a /admin", async ({ browser }) => {
    const masterCtx = await browser.newContext();
    await masterCtx.addCookies([{ ...(await mintAdminCookie(masterAdminId)), url: BASE_URL }]);
    const masterPage = await masterCtx.newPage();
    await masterPage.goto(`${BASE_URL}/admin/programs/${programId}?focus=admins`, { waitUntil: "networkidle" });

    const form = masterPage.getByTestId("grant-role-form");
    await form.locator('select[name="membershipId"]').selectOption(orejaMembershipId);
    await form.locator('select[name="role"]').selectOption("oreja");
    await Promise.all([masterPage.waitForResponse((r) => r.url().includes(`/admin/programs/${programId}`) && r.request().method() === "POST"), form.getByRole("button", { name: "Otorgar" }).click()]);
    await masterPage.waitForURL(/adminCreated=1/);

    const role = await e2eDb.query(`select role from "MembershipRole" where "membershipId" = $1`, [orejaMembershipId]);
    expect(role.rows[0].role).toBe("oreja");
    const bridge = await e2eDb.query(`select role, "programId" from "Admin" where "memberId" = $1`, [orejaMemberId]);
    expect(bridge.rows[0]).toEqual({ role: "empleado", programId });
    await masterCtx.close();

    const ctx = await browser.newContext();
    await ctx.addCookies([{ ...(await mintMemberCookie(orejaMemberId)), url: BASE_URL }]);
    const page = await ctx.newPage();
    await page.goto(`${BASE_URL}/empleados`, { waitUntil: "networkidle" });
    await expect(page.getByRole("heading", { name: "Panel de Empleados" })).toBeVisible();
    await page.goto(`${BASE_URL}/admin/programs/${programId}`, { waitUntil: "networkidle" });
    await expect(page).toHaveURL(/\/admin\/login/);
    await ctx.close();
  });

  test("al quitar el rol se pierde el acceso", async ({ browser }) => {
    const masterCtx = await browser.newContext();
    await masterCtx.addCookies([{ ...(await mintAdminCookie(masterAdminId)), url: BASE_URL }]);
    const masterPage = await masterCtx.newPage();
    await masterPage.goto(`${BASE_URL}/admin/programs/${programId}?focus=admins`, { waitUntil: "networkidle" });
    await masterPage.getByTestId(`roles-row-${orejaMembershipId}`).getByRole("button", { name: /Oreja/ }).evaluate((el) => (el as HTMLButtonElement).click());
    await masterPage.waitForURL(/adminCreated=1/);
    await masterCtx.close();

    const bridge = await e2eDb.query(`select 1 from "Admin" where "memberId" = $1`, [orejaMemberId]);
    expect(bridge.rowCount).toBe(0);

    const ctx = await browser.newContext();
    await ctx.addCookies([{ ...(await mintMemberCookie(orejaMemberId)), url: BASE_URL }]);
    const page = await ctx.newPage();
    await page.goto(`${BASE_URL}/empleados`, { waitUntil: "networkidle" });
    await expect(page).toHaveURL(/\/empleados\/login/);
    await ctx.close();
  });
});
