import { test, expect } from "@playwright/test";
import bcrypt from "bcryptjs";
import { createE2eDb, mintEmployeeCookie } from "./helpers/adminSession";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";

// Panel de Empleados (2026-10-07, pedido de Gunnar: "un panel de control
// para 'empleados' es un sistema aparte, tratalo como tal, y dame un
// acceso independiente") -- cookie propia (lycard_empleado), rutas
// propias (/empleados/login, /empleados), reusando las MISMAS acciones
// de negocio que el dashboard completo (addMemberToProgramAction,
// assignDoorAction) vía lib/auth.ts#resolveActingScope -- nunca una
// pipeline de negocio aparte. Ver docs del plan en PLAN.md.
test.describe("Panel de Empleados -- acceso independiente", () => {
  const e2eDb = createE2eDb();
  const suffix = Date.now();
  const PASSWORD = "empleado-password-123";
  let programId: string;
  let employeeAdminId: string;
  let employeeEmail: string;

  test.beforeAll(async () => {
    await e2eDb.connect();
    programId = `e2e-empleados-${suffix}`;
    employeeEmail = `e2e-empleado-${suffix}@example.com`;

    await e2eDb.query(
      `insert into "Program" (id, slug, name, "updatedAt") values ($1, $2, $3, now())`,
      [programId, `e2e-empleados-slug-${suffix}`, "E2E Panel de Empleados"]
    );

    const passwordHash = await bcrypt.hash(PASSWORD, 10);
    const admin = await e2eDb.query<{ id: string }>(
      `insert into "Admin" (id, email, "passwordHash", "programId", role, "updatedAt") values (gen_random_uuid()::text, $1, $2, $3, 'empleado', now()) returning id`,
      [employeeEmail, passwordHash, programId]
    );
    employeeAdminId = admin.rows[0].id;
  });

  test.afterAll(async () => {
    await e2eDb.query(`delete from "ProgramMembership" where "programId" = $1`, [programId]).catch(() => {});
    await e2eDb.query(`delete from "Admin" where id = $1`, [employeeAdminId]).catch(() => {});
    await e2eDb.query(`delete from "Program" where id = $1`, [programId]).catch(() => {});
    await e2eDb.end();
  });

  test("login real con credenciales de empleado entra a /empleados, con acceso mínimo", async ({ page }) => {
    await page.goto(`${BASE_URL}/empleados/login`, { waitUntil: "networkidle" });
    await page.locator('input[name="email"]').fill(employeeEmail);
    await page.locator('input[name="password"]').fill(PASSWORD);
    await page.getByRole("button", { name: "Entrar" }).click();
    await page.waitForURL(/\/empleados$/);

    await expect(page.getByRole("heading", { name: "Panel de Empleados" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Agregar Miembro" }).first()).toBeVisible();

    // Acceso mínimo real, no solo de nombre: ninguna de las secciones del
    // dashboard completo (sistema aparte) existe en esta página.
    await expect(page.getByText("Identidad del Programa")).not.toBeVisible();
    await expect(page.getByText("N0 de este Programa")).not.toBeVisible();
    await expect(page.getByText("Mensajería", { exact: true })).not.toBeVisible();
  });

  test("desde /empleados: agregar Miembro + asignar puerta -- misma acción de negocio que el dashboard completo", async ({ browser }) => {
    const context = await browser.newContext();
    await context.addCookies([{ ...(await mintEmployeeCookie(employeeAdminId)), url: BASE_URL }]);
    const page = await context.newPage();

    await page.goto(`${BASE_URL}/empleados`, { waitUntil: "networkidle" });

    const addMemberForm = page.locator("form").filter({ has: page.getByRole("button", { name: "Agregar Miembro", exact: true }) });
    await addMemberForm.locator('input[name="name"]').fill("Juan Sebastián Restrepo (E2E Empleado)");
    await addMemberForm.locator('input[name="whatsapp"]').fill(`+57 300 ${suffix.toString().slice(-7)}`);
    await addMemberForm.getByRole("button", { name: "Agregar Miembro", exact: true }).click();
    await page.waitForURL(/memberAdded=1/);

    const added = await e2eDb.query<{ id: string; status: string; memberId: string }>(
      `select pm.id, pm.status, pm."memberId" from "ProgramMembership" pm join "Member" m on m.id = pm."memberId" where pm."programId" = $1 and m.name = 'Juan Sebastián Restrepo (E2E Empleado)'`,
      [programId]
    );
    expect(added.rows[0].status).toBe("active");
    const membershipId = added.rows[0].id;
    const memberId = added.rows[0].memberId;

    await page.getByRole("button", { name: /^Juan Sebastián Restrepo \(E2E Empleado\)/ }).click();
    await page.locator('select[name="doorKey"]').selectOption("arquitecto");
    await page.locator('input[name="priceAgreedUsd"]').fill("500");
    await page.getByRole("button", { name: "Asignar puerta" }).click();
    await page.waitForURL(/doorAssigned=1/);

    const final = await e2eDb.query<{ doorKey: string; soldByAdminId: string }>(
      `select "doorKey", "soldByAdminId" from "ProgramMembership" where id = $1`,
      [membershipId]
    );
    expect(final.rows[0].doorKey).toBe("arquitecto");
    expect(final.rows[0].soldByAdminId).toBe(employeeAdminId);

    // Un empleado no ve "Borrar"/"Editar"/"Mensaje"/"Entrar como este
    // Miembro" -- herramientas administrativas, fuera del acceso mínimo.
    await expect(page.getByRole("button", { name: "Entrar como este Miembro →" })).not.toBeVisible();
    await expect(page.getByText("Editar", { exact: true })).not.toBeVisible();

    await e2eDb.query(`delete from "Card" where "memberId" = $1`, [memberId]).catch(() => {});
    await e2eDb.query(`delete from "ProgramMembership" where id = $1`, [membershipId]).catch(() => {});
    await e2eDb.query(`delete from "Member" where id = $1`, [memberId]).catch(() => {});

    await context.close();
  });

  test("separación de una sola vía: la cookie de empleado no destraba el dashboard completo", async ({ browser }) => {
    const context = await browser.newContext();
    await context.addCookies([{ ...(await mintEmployeeCookie(employeeAdminId)), url: BASE_URL }]);
    const page = await context.newPage();

    await page.goto(`${BASE_URL}/admin/programs/${programId}`, { waitUntil: "networkidle" });
    await expect(page).toHaveURL(/\/admin\/login/);

    await context.close();
  });

  test("separación de una sola vía: credenciales de empleado rechazadas en /admin/login", async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/login`, { waitUntil: "networkidle" });
    await page.locator('input[name="email"]').fill(employeeEmail);
    await page.locator('input[name="password"]').fill(PASSWORD);
    await page.getByRole("button", { name: "Entrar" }).click();
    await page.waitForURL(/\/admin\/login\?error=1/);
  });
});
