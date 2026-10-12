import { test, expect } from "@playwright/test";
import bcrypt from "bcryptjs";
import { createE2eDb, mintEmployeeCookie } from "./helpers/adminSession";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";

// Viaje del Cliente, Fase 2 (2026-10-12) -- la entrevista 1:1 de Legacy se
// agenda a mano desde el tablero de la Oreja (ProgramMembership.
// nextInterviewAt), nunca en la tarjeta pública. Se limpia sola cuando
// completeInterviewAction marca la entrevista como hecha de verdad.
test.describe("Panel de Empleados -- Agendar entrevista 1:1", () => {
  const e2eDb = createE2eDb();
  const suffix = Date.now();
  let programId: string;
  let cardId: string;
  let employeeAdminId: string;
  let memberId: string;
  let membershipId: string;
  let registrationId: string;

  test.beforeAll(async () => {
    await e2eDb.connect();
    programId = `e2e-sched-interview-${suffix}`;

    await e2eDb.query(`insert into "Program" (id, slug, name, "updatedAt") values ($1, $2, $3, now())`, [
      programId,
      `${programId}-slug`,
      "E2E Agendar Entrevista",
    ]);

    const card = await e2eDb.query<{ id: string }>(
      `insert into "Card" (id, slug, name, title, quote, "programId", "updatedAt") values (gen_random_uuid()::text, $1, '', '', '', $2, now()) returning id`,
      [`e2e-sched-interview-card-${suffix}`, programId]
    );
    cardId = card.rows[0].id;

    const passwordHash = await bcrypt.hash("empleado-password-123", 10);
    const admin = await e2eDb.query<{ id: string }>(
      `insert into "Admin" (id, email, "passwordHash", "programId", role, "updatedAt") values (gen_random_uuid()::text, $1, $2, $3, 'empleado', now()) returning id`,
      [`e2e-sched-interview-empleado-${suffix}@example.com`, passwordHash, programId]
    );
    employeeAdminId = admin.rows[0].id;

    const member = await e2eDb.query<{ id: string }>(
      `insert into "Member" (id, name, "updatedAt") values (gen_random_uuid()::text, $1, now()) returning id`,
      [`E2E Lead Agendable ${suffix}`]
    );
    memberId = member.rows[0].id;

    const membership = await e2eDb.query<{ id: string }>(
      `insert into "ProgramMembership" (id, "memberId", "programId", status, "updatedAt") values (gen_random_uuid()::text, $1, $2, 'invited', now()) returning id`,
      [memberId, programId]
    );
    membershipId = membership.rows[0].id;

    // Lead ya asistió a su Masterclass -- el único estado desde el que la
    // Oreja puede agendar la entrevista 1:1 (lib/masterclassStatus.ts).
    const registration = await e2eDb.query<{ id: string }>(
      `insert into "Registration" (id, "cardId", "slotId", "slotLabel", name, whatsapp, "membershipId", "attendedAt", "createdAt")
       values (gen_random_uuid()::text, $1, 'slot-1', 'Hoy 19:00', $2, $3, $4, now(), now()) returning id`,
      [cardId, `E2E Lead Agendable ${suffix}`, `+52 995 ${suffix.toString().slice(-7)}`, membershipId]
    );
    registrationId = registration.rows[0].id;
  });

  test.afterAll(async () => {
    await e2eDb.query(`delete from "Registration" where id = $1`, [registrationId]).catch(() => {});
    await e2eDb.query(`delete from "Card" where id = $1`, [cardId]).catch(() => {});
    await e2eDb.query(`delete from "ProgramMembership" where id = $1`, [membershipId]).catch(() => {});
    await e2eDb.query(`delete from "Member" where id = $1`, [memberId]).catch(() => {});
    await e2eDb.query(`delete from "Admin" where id = $1`, [employeeAdminId]).catch(() => {});
    await e2eDb.query(`delete from "Program" where id = $1`, [programId]).catch(() => {});
    await e2eDb.end();
  });

  test("la Oreja agenda, reagenda, y al marcar hecha la entrevista se limpia sola", async ({ page }) => {
    await page.context().addCookies([{ ...(await mintEmployeeCookie(employeeAdminId)), url: BASE_URL }]);

    await page.goto(`${BASE_URL}/empleados`, { waitUntil: "networkidle" });
    await expect(page.getByText(`E2E Lead Agendable ${suffix}`).first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Agendar entrevista" })).toBeVisible();

    const future1 = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
    const pad = (n: number) => String(n).padStart(2, "0");
    const toLocalInput = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

    await page.locator('input[name="nextInterviewAt"]').fill(toLocalInput(future1));
    await page.getByRole("button", { name: "Agendar entrevista" }).click();
    await page.waitForURL(/interviewScheduled=1/);

    const row1 = await e2eDb.query<{ nextInterviewAt: Date }>(`select "nextInterviewAt" from "ProgramMembership" where id = $1`, [membershipId]);
    expect(row1.rows[0].nextInterviewAt).not.toBeNull();
    expect(Math.abs(row1.rows[0].nextInterviewAt.getTime() - future1.getTime())).toBeLessThan(60000);

    await expect(page.getByText(/📅 Entrevista:/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Reagendar" })).toBeVisible();

    // Reagendar a una fecha distinta -- misma acción, no-op idempotente a
    // nivel de UI (siempre se puede volver a elegir otra fecha). La URL
    // de destino (?interviewScheduled=1) es la MISMA que la de arriba, así
    // que esperamos el contenido real (la fecha mostrada cambió) en vez de
    // la URL -- waitForURL resuelve de una si el patrón ya coincidía antes
    // del click, sin esperar la navegación de verdad.
    const future2 = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
    const interviewDateFmt = new Intl.DateTimeFormat("es-MX", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
    await page.locator('input[name="nextInterviewAt"]').fill(toLocalInput(future2));
    await page.getByRole("button", { name: "Reagendar" }).click();
    await expect(page.getByText(interviewDateFmt.format(future2))).toBeVisible();

    const row2 = await e2eDb.query<{ nextInterviewAt: Date }>(`select "nextInterviewAt" from "ProgramMembership" where id = $1`, [membershipId]);
    expect(Math.abs(row2.rows[0].nextInterviewAt.getTime() - future2.getTime())).toBeLessThan(60000);

    // La entrevista ya ocurrió de verdad -- al marcarla hecha, activa la
    // membership Y limpia nextInterviewAt sola (lib/activateMembership.ts).
    await page.getByRole("button", { name: "Marcar entrevista hecha" }).click();
    await page.waitForURL(/activated=1/);

    const row3 = await e2eDb.query<{ status: string; nextInterviewAt: Date | null }>(
      `select status, "nextInterviewAt" from "ProgramMembership" where id = $1`,
      [membershipId]
    );
    expect(row3.rows[0].status).toBe("active");
    expect(row3.rows[0].nextInterviewAt).toBeNull();

    await expect(page.getByRole("button", { name: "Agendar entrevista" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Reagendar" })).toHaveCount(0);
  });
});
