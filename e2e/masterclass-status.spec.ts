import { test, expect } from "@playwright/test";
import bcrypt from "bcryptjs";
import { createE2eDb, mintEmployeeCookie } from "./helpers/adminSession";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";

// Pool General de Leads -- color real de Masterclass (2026-10-12,
// Viaje del Cliente). verde = recién agendado; amarillo = reagendó
// después de faltar a un slot ya vencido (acción real,
// registerInterviewAction, detectada contra un InterviewSlot real);
// rojo = 2+ reagendados, o la fecha de su slot ya pasó sin que haya
// vuelto a agendar ni asistido. Ver lib/masterclassStatus.ts.
test.describe("Pool General de Leads -- estado real de Masterclass", () => {
  const e2eDb = createE2eDb();
  const suffix = Date.now();
  let programId: string;
  let cardId: string;
  let cardSlug: string;
  let employeeAdminId: string;
  let slotPastId: string;
  let slotFuture1Id: string;
  let slotFuture2Id: string;
  let registrationAmarilloId: string;
  let registrationRojoId: string;

  test.beforeAll(async () => {
    await e2eDb.connect();
    programId = `e2e-masterclass-${suffix}`;
    cardSlug = `e2e-masterclass-card-${suffix}`;

    await e2eDb.query(`insert into "Program" (id, slug, name, "updatedAt") values ($1, $2, $3, now())`, [
      programId,
      `${programId}-slug`,
      "E2E Masterclass",
    ]);

    const card = await e2eDb.query<{ id: string }>(
      `insert into "Card" (id, slug, "updatedAt", name, title, quote, "programId", kind) values (gen_random_uuid()::text, $1, now(), $2, $3, $4, $5, 'project') returning id`,
      [cardSlug, "E2E Masterclass Card", "N/A", "cita", programId]
    );
    cardId = card.rows[0].id;

    const passwordHash = await bcrypt.hash("empleado-password-123", 10);
    const admin = await e2eDb.query<{ id: string }>(
      `insert into "Admin" (id, email, "passwordHash", "programId", role, "updatedAt") values (gen_random_uuid()::text, $1, $2, $3, 'empleado', now()) returning id`,
      [`e2e-masterclass-empleado-${suffix}@example.com`, passwordHash, programId]
    );
    employeeAdminId = admin.rows[0].id;

    const slotPast = await e2eDb.query<{ id: string }>(
      `insert into "InterviewSlot" (id, "programId", label, "labelEn", date, time, capacity, "updatedAt")
       values (gen_random_uuid()::text, $1, 'Masterclass vencida', 'Expired Masterclass', now() - interval '5 days', '18:00 hs', 20, now()) returning id`,
      [programId]
    );
    slotPastId = slotPast.rows[0].id;

    const slotFuture1 = await e2eDb.query<{ id: string }>(
      `insert into "InterviewSlot" (id, "programId", label, "labelEn", date, time, capacity, "updatedAt")
       values (gen_random_uuid()::text, $1, 'Masterclass de prueba 1', 'Test Masterclass 1', now() + interval '2 days', '18:00 hs', 20, now()) returning id`,
      [programId]
    );
    slotFuture1Id = slotFuture1.rows[0].id;

    const slotFuture2 = await e2eDb.query<{ id: string }>(
      `insert into "InterviewSlot" (id, "programId", label, "labelEn", date, time, capacity, "updatedAt")
       values (gen_random_uuid()::text, $1, 'Masterclass de prueba 2', 'Test Masterclass 2', now() + interval '9 days', '18:00 hs', 20, now()) returning id`,
      [programId]
    );
    slotFuture2Id = slotFuture2.rows[0].id;

    // Lead que "ya tenía" un slot vencido -- para probar el reagendado
    // real vía registerInterviewAction (amarillo).
    const regAmarillo = await e2eDb.query<{ id: string }>(
      `insert into "Registration" (id, "cardId", "slotId", "slotLabel", "interviewSlotId", name, whatsapp, "createdAt")
       values (gen_random_uuid()::text, $1, $2, 'Masterclass vencida', $2, $3, $4, now() - interval '5 days') returning id`,
      [cardId, slotPastId, `E2E Amarillo ${suffix}`, `+52 998 ${suffix.toString().slice(-7)}`]
    );
    registrationAmarilloId = regAmarillo.rows[0].id;

    // Lead que nunca volvió a agendar tras faltar -- rojo por tiempo,
    // sin ningún reagendado logueado.
    const regRojo = await e2eDb.query<{ id: string }>(
      `insert into "Registration" (id, "cardId", "slotId", "slotLabel", "interviewSlotId", name, whatsapp, "createdAt")
       values (gen_random_uuid()::text, $1, $2, 'Masterclass vencida', $2, $3, $4, now() - interval '5 days') returning id`,
      [cardId, slotPastId, `E2E Rojo ${suffix}`, `+52 997 ${suffix.toString().slice(-7)}`]
    );
    registrationRojoId = regRojo.rows[0].id;
  });

  test.afterAll(async () => {
    await e2eDb.query(`delete from "Registration" where "cardId" = $1`, [cardId]).catch(() => {});
    await e2eDb.query(`delete from "CardLead" where "cardId" = $1`, [cardId]).catch(() => {});
    await e2eDb.query(`delete from "InterviewSlot" where "programId" = $1`, [programId]).catch(() => {});
    await e2eDb.query(`delete from "Card" where id = $1`, [cardId]).catch(() => {});
    await e2eDb.query(`delete from "Admin" where id = $1`, [employeeAdminId]).catch(() => {});
    await e2eDb.query(`delete from "Program" where id = $1`, [programId]).catch(() => {});
    await e2eDb.end();
  });

  test("un lead recién agendado aparece Verde en la bolsa", async ({ browser }) => {
    const visitorContext = await browser.newContext();
    const visitorPage = await visitorContext.newPage();
    await visitorPage.goto(`${BASE_URL}/c/${cardSlug}`, { waitUntil: "networkidle" });
    await visitorPage.getByRole("button", { name: "Agendar tu Entrevista" }).click();
    await visitorPage.getByText("Masterclass de prueba 1").click();
    await visitorPage.getByLabel("Nombre completo").fill(`E2E Verde ${suffix}`);
    await visitorPage.getByLabel("WhatsApp").fill(`+52 996 ${suffix.toString().slice(-7)}`);
    await visitorPage.getByRole("button", { name: "Confirmar mi lugar" }).click();
    await expect(visitorPage.getByText("¡Listo! Te esperamos", { exact: false })).toBeVisible();
    await visitorContext.close();

    const employeeContext = await browser.newContext();
    await employeeContext.addCookies([{ ...(await mintEmployeeCookie(employeeAdminId)), url: BASE_URL }]);
    const employeePage = await employeeContext.newPage();
    await employeePage.goto(`${BASE_URL}/empleados`, { waitUntil: "networkidle" });
    await expect(employeePage.getByText(`E2E Verde ${suffix}`)).toBeVisible();
    await expect(employeePage.getByText("Verde").first()).toBeVisible();
    await employeeContext.close();
  });

  test("reagendar después de faltar a un slot vencido pasa a Amarillo -- acción real, no solo la fórmula", async ({ browser }) => {
    const visitorContext = await browser.newContext();
    const visitorPage = await visitorContext.newPage();
    await visitorPage.goto(`${BASE_URL}/c/${cardSlug}`, { waitUntil: "networkidle" });
    await visitorPage.getByRole("button", { name: "Agendar tu Entrevista" }).click();
    await visitorPage.getByText("Masterclass de prueba 2").click();
    await visitorPage.getByLabel("Nombre completo").fill(`E2E Amarillo ${suffix}`);
    // Mismo whatsapp que ya tenía el slot vencido -- dispara la
    // detección real de reagendado en registerInterviewAction.
    await visitorPage.getByLabel("WhatsApp").fill(`+52 998 ${suffix.toString().slice(-7)}`);
    await visitorPage.getByRole("button", { name: "Confirmar mi lugar" }).click();
    await expect(visitorPage.getByText("¡Listo! Te esperamos", { exact: false })).toBeVisible();
    await visitorContext.close();

    const row = await e2eDb.query<{ masterclassLog: unknown[]; interviewSlotId: string }>(
      `select "masterclassLog", "interviewSlotId" from "Registration" where id = $1`,
      [registrationAmarilloId]
    );
    expect(row.rows[0].masterclassLog).toHaveLength(1);
    expect(row.rows[0].interviewSlotId).toBe(slotFuture2Id); // el slot ya quedó actualizado al nuevo

    const employeeContext = await browser.newContext();
    await employeeContext.addCookies([{ ...(await mintEmployeeCookie(employeeAdminId)), url: BASE_URL }]);
    const employeePage = await employeeContext.newPage();
    await employeePage.goto(`${BASE_URL}/empleados`, { waitUntil: "networkidle" });
    const row2 = employeePage.getByText(`E2E Amarillo ${suffix}`, { exact: true }).locator("xpath=ancestor::div[2]");
    await expect(row2.getByText("Amarillo", { exact: true })).toBeVisible();
    await employeeContext.close();
  });

  test("un lead que faltó y nunca reagendó queda Rojo -- por fecha vencida, sin inventar nada", async ({ browser }) => {
    const employeeContext = await browser.newContext();
    await employeeContext.addCookies([{ ...(await mintEmployeeCookie(employeeAdminId)), url: BASE_URL }]);
    const employeePage = await employeeContext.newPage();
    await employeePage.goto(`${BASE_URL}/empleados`, { waitUntil: "networkidle" });
    const row = employeePage.getByText(`E2E Rojo ${suffix}`, { exact: true }).locator("xpath=ancestor::div[2]");
    await expect(row.getByText("Rojo", { exact: true })).toBeVisible();
    await employeeContext.close();
  });

  test("marcar asistió cambia el estado a Asistió y persiste en DB", async ({ browser }) => {
    const employeeContext = await browser.newContext();
    await employeeContext.addCookies([{ ...(await mintEmployeeCookie(employeeAdminId)), url: BASE_URL }]);
    const employeePage = await employeeContext.newPage();
    await employeePage.goto(`${BASE_URL}/empleados`, { waitUntil: "networkidle" });

    const row = employeePage.getByText(`E2E Rojo ${suffix}`, { exact: true }).locator("xpath=ancestor::div[2]");
    await row.getByRole("button", { name: "Marcar asistió" }).click();
    await employeePage.waitForURL(/masterclassAttended=1/);

    const updated = await e2eDb.query<{ attendedAt: Date }>(`select "attendedAt" from "Registration" where id = $1`, [registrationRojoId]);
    expect(updated.rows[0].attendedAt).not.toBeNull();

    const refreshedRow = employeePage.getByText(`E2E Rojo ${suffix}`, { exact: true }).locator("xpath=ancestor::div[2]");
    await expect(refreshedRow.getByText("Asistió", { exact: true })).toBeVisible();
    await expect(refreshedRow.getByRole("button", { name: "Marcar asistió" })).toHaveCount(0);
    await employeeContext.close();
  });
});
