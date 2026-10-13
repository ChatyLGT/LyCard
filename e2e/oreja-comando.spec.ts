import { test, expect } from "@playwright/test";
import bcrypt from "bcryptjs";
import { createE2eDb, mintEmployeeCookie } from "./helpers/adminSession";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";

// Pestaña "Comando" del Óculo de la Oreja (2026-10-13): resumen de filas
// reales de esta Oreja. Se siembra un cliente vendido por ella con
// comisiones acumuladas y se verifica que el panel las muestra.
test.describe("Óculo de la Oreja -- Comando", () => {
  const e2eDb = createE2eDb();
  const suffix = Date.now();
  let programId: string;
  let adminId: string;
  let memberId: string;

  test.beforeAll(async () => {
    await e2eDb.connect();
    programId = `e2e-comando-${suffix}`;
    await e2eDb.query(`insert into "Program" (id, slug, name, "updatedAt") values ($1, $2, $3, now())`, [programId, `e2e-comando-slug-${suffix}`, "E2E Comando"]);
    const hash = await bcrypt.hash("empleado-password-123", 10);
    const admin = await e2eDb.query<{ id: string }>(
      `insert into "Admin" (id, email, "passwordHash", "programId", role, "updatedAt") values (gen_random_uuid()::text, $1, $2, $3, 'empleado', now()) returning id`,
      [`e2e-comando-${suffix}@example.com`, hash, programId]
    );
    adminId = admin.rows[0].id;
    const member = await e2eDb.query<{ id: string }>(`insert into "Member" (id, name, "updatedAt") values (gen_random_uuid()::text, $1, now()) returning id`, [`E2E Comando Cliente ${suffix}`]);
    memberId = member.rows[0].id;
    await e2eDb.query(
      `insert into "ProgramMembership" (id, "programId", "memberId", status, "soldByAdminId", "membershipPaidAt", "totalCommissionsUsd", "updatedAt") values (gen_random_uuid()::text, $1, $2, 'active', $3, now(), 47, now())`,
      [programId, memberId, adminId]
    );
  });

  test.afterAll(async () => {
    await e2eDb.query(`delete from "ProgramMembership" where "programId" = $1`, [programId]).catch(() => {});
    await e2eDb.query(`delete from "Admin" where id = $1`, [adminId]).catch(() => {});
    await e2eDb.query(`delete from "Member" where id = $1`, [memberId]).catch(() => {});
    await e2eDb.query(`delete from "Program" where id = $1`, [programId]).catch(() => {});
    await e2eDb.end();
  });

  test("Comando muestra comisiones y clientes reales de la Oreja", async ({ browser }) => {
    const context = await browser.newContext();
    await context.addCookies([{ ...(await mintEmployeeCookie(adminId)), url: BASE_URL }]);
    const page = await context.newPage();
    await page.goto(`${BASE_URL}/empleados`, { waitUntil: "networkidle" });

    await expect(page.getByTestId("comando-comisiones")).toContainText("$47 USD");
    await expect(page.getByTestId("comando-cerrados")).toContainText("1");
    await expect(page.getByTestId("comando-pagados")).toContainText("1");
    await expect(page.getByTestId("comando-libres")).toContainText("0");
    await context.close();
  });
});
