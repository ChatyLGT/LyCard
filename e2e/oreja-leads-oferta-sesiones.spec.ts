import { test, expect } from "@playwright/test";
import bcrypt from "bcryptjs";
import { createE2eDb, mintEmployeeCookie } from "./helpers/adminSession";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";

// Puntos "gettables" del mockup "Óculo de la Oreja" (2026-10-12, pedido
// de Gunnar tras revisarlo: "arrancá con los 3 puntos gettables"):
// Bolsa de Leads con claim real (lib/leadTemperature.ts), Matriz de
// oferta de un tap (quickAssignDoorAction sobre ACCESS_DOORS real), y
// bitácora de sesiones (lib/sessionLog.ts, sin checklist/cantidad
// inventada). Todo sobre el Panel de Empleados existente.
test.describe("Panel de Empleados -- Bolsa de Leads, Oferta rápida, Sesiones", () => {
  const e2eDb = createE2eDb();
  const suffix = Date.now();
  let programId: string;
  let cardId: string;
  let employeeAdminId: string;
  let employeeEmail: string;
  let otroEmployeeAdminId: string;
  let registrationId: string;
  let memberId: string;
  let membershipId: string;

  test.beforeAll(async () => {
    await e2eDb.connect();
    programId = `e2e-oreja-${suffix}`;
    employeeEmail = `e2e-oreja-empleado-${suffix}@example.com`;

    await e2eDb.query(`insert into "Program" (id, slug, name, "updatedAt") values ($1, $2, $3, now())`, [
      programId,
      `${programId}-slug`,
      "E2E Óculo de la Oreja",
    ]);

    const passwordHash = await bcrypt.hash("empleado-password-123", 10);
    const admin = await e2eDb.query<{ id: string }>(
      `insert into "Admin" (id, email, "passwordHash", "programId", role, "updatedAt") values (gen_random_uuid()::text, $1, $2, $3, 'empleado', now()) returning id`,
      [employeeEmail, passwordHash, programId]
    );
    employeeAdminId = admin.rows[0].id;

    const otroAdmin = await e2eDb.query<{ id: string }>(
      `insert into "Admin" (id, email, "passwordHash", "programId", role, "updatedAt") values (gen_random_uuid()::text, $1, $2, $3, 'empleado', now()) returning id`,
      [`e2e-oreja-empleado2-${suffix}@example.com`, passwordHash, programId]
    );
    otroEmployeeAdminId = otroAdmin.rows[0].id;

    // Card suelta del Programa, solo para que el Registration tenga un
    // cardId real -- no hace falta que esté asociada a ningún Member.
    const card = await e2eDb.query<{ id: string }>(
      `insert into "Card" (id, slug, name, title, quote, "programId", "updatedAt") values (gen_random_uuid()::text, $1, '', '', '', $2, now()) returning id`,
      [`e2e-oreja-card-${suffix}`, programId]
    );
    cardId = card.rows[0].id;

    const registration = await e2eDb.query<{ id: string }>(
      `insert into "Registration" (id, "cardId", "slotId", "slotLabel", name, whatsapp, "createdAt") values (gen_random_uuid()::text, $1, 'slot-1', 'Hoy 19:00', $2, $3, now()) returning id`,
      [cardId, `E2E Lead ${suffix}`, `+52 998 ${suffix.toString().slice(-7)}`]
    );
    registrationId = registration.rows[0].id;

    // Member + Membership activa, para probar oferta rápida y sesiones.
    const member = await e2eDb.query<{ id: string }>(
      `insert into "Member" (id, name, "updatedAt") values (gen_random_uuid()::text, $1, now()) returning id`,
      [`E2E Miembro Oreja ${suffix}`]
    );
    memberId = member.rows[0].id;
    const membership = await e2eDb.query<{ id: string }>(
      `insert into "ProgramMembership" (id, "memberId", "programId", status, "updatedAt") values (gen_random_uuid()::text, $1, $2, 'active', now()) returning id`,
      [memberId, programId]
    );
    membershipId = membership.rows[0].id;
  });

  test.afterAll(async () => {
    await e2eDb.query(`delete from "Registration" where id = $1`, [registrationId]).catch(() => {});
    await e2eDb.query(`delete from "Card" where id = $1`, [cardId]).catch(() => {});
    await e2eDb.query(`delete from "ProgramMembership" where id = $1`, [membershipId]).catch(() => {});
    await e2eDb.query(`delete from "Member" where id = $1`, [memberId]).catch(() => {});
    await e2eDb.query(`delete from "Admin" where id = any($1)`, [[employeeAdminId, otroEmployeeAdminId]]).catch(() => {});
    await e2eDb.query(`delete from "Program" where id = $1`, [programId]).catch(() => {});
    await e2eDb.end();
  });

  test("Bolsa de Leads: aparece sin reclamar, una Oreja lo toma, y desaparece de la bolsa de otra Oreja", async ({ browser }) => {
    const context = await browser.newContext();
    await context.addCookies([{ ...(await mintEmployeeCookie(employeeAdminId)), url: BASE_URL }]);
    const page = await context.newPage();

    await page.goto(`${BASE_URL}/empleados`, { waitUntil: "networkidle" });
    await expect(page.getByText(`E2E Lead ${suffix}`)).toBeVisible();
    // Pool General de Leads reemplazó la "temperatura" por tiempo por el
    // estado real de Masterclass (2026-10-12) -- sin InterviewSlot real
    // detrás de este Registration de prueba, cae honesto a "Verde".
    await expect(page.getByText("Verde")).toBeVisible();

    await page.getByRole("button", { name: "Tomar lead" }).click();
    await page.waitForURL(/leadClaimed=1/);

    const claimed = await e2eDb.query<{ claimedByAdminId: string }>(`select "claimedByAdminId" from "Registration" where id = $1`, [registrationId]);
    expect(claimed.rows[0].claimedByAdminId).toBe(employeeAdminId);

    // Otra Oreja del mismo Programa ya no lo ve en su bolsa.
    const otroContext = await browser.newContext();
    await otroContext.addCookies([{ ...(await mintEmployeeCookie(otroEmployeeAdminId)), url: BASE_URL }]);
    const otroPage = await otroContext.newPage();
    await otroPage.goto(`${BASE_URL}/empleados`, { waitUntil: "networkidle" });
    await expect(otroPage.getByText(`E2E Lead ${suffix}`)).not.toBeVisible();

    await context.close();
    await otroContext.close();
  });

  test("Matriz de oferta, un tap: asigna la puerta con sus defaults reales, sin tipear nada", async ({ browser }) => {
    const context = await browser.newContext();
    await context.addCookies([{ ...(await mintEmployeeCookie(employeeAdminId)), url: BASE_URL }]);
    const page = await context.newPage();

    await page.goto(`${BASE_URL}/empleados`, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: new RegExp(`^E2E Miembro Oreja ${suffix}`) }).click();
    await page.getByRole("button", { name: /^Armar \(Express\)/ }).click();
    await page.waitForURL(/doorAssigned=1/);

    const row = await e2eDb.query<{ doorKey: string; priceAgreedUsd: number; paymentModel: string; traidoPor: string; soldByAdminId: string }>(
      `select "doorKey", "priceAgreedUsd", "paymentModel", "traidoPor", "soldByAdminId" from "ProgramMembership" where id = $1`,
      [membershipId]
    );
    expect(row.rows[0].doorKey).toBe("armar");
    expect(row.rows[0].priceAgreedUsd).toBe(99);
    expect(row.rows[0].paymentModel).toBe("unico");
    expect(row.rows[0].traidoPor).toBe("oreja");
    expect(row.rows[0].soldByAdminId).toBe(employeeAdminId);

    await context.close();
  });

  test("Bitácora de sesiones: registra una sesión con notas, sin checklist ni cantidad fija", async ({ browser }) => {
    const context = await browser.newContext();
    await context.addCookies([{ ...(await mintEmployeeCookie(employeeAdminId)), url: BASE_URL }]);
    const page = await context.newPage();

    await page.goto(`${BASE_URL}/empleados`, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: new RegExp(`^E2E Miembro Oreja ${suffix}`) }).click();
    await expect(page.getByText("Sesiones (0)")).toBeVisible();

    await page.locator('textarea[name="notes"]').fill("Primera sesión -- fue bien, sigue avanzando.");
    await page.getByRole("button", { name: "Registrar sesión" }).click();
    await page.waitForURL(/sessionLogged=1/);

    await expect(page.getByText("Sesiones (1)")).toBeVisible();
    await expect(page.getByText(/Sesión 1/)).toBeVisible();
    await expect(page.getByText("Primera sesión -- fue bien, sigue avanzando.")).toBeVisible();

    const row = await e2eDb.query<{ sessionLog: { sessionNumber: number; notes: string; loggedByAdminId: string }[] }>(
      `select "sessionLog" from "ProgramMembership" where id = $1`,
      [membershipId]
    );
    expect(row.rows[0].sessionLog).toHaveLength(1);
    expect(row.rows[0].sessionLog[0].sessionNumber).toBe(1);
    expect(row.rows[0].sessionLog[0].loggedByAdminId).toBe(employeeAdminId);

    await context.close();
  });
});
