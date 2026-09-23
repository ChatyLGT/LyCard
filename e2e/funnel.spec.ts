import { test, expect } from "@playwright/test";
import bcrypt from "bcryptjs";
import { createE2eDb, mintAdminCookie } from "./helpers/adminSession";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";

// Embudo de Conversión (pedido de Gunnar, 2026-09-23) -- "CRM" redefinido
// como seguimiento de QR compartido -> registrado -> entrevistado ->
// Oficina activa -> membresía pagada (marcado a mano). Este test siembra
// los 3 modelos que el embudo une (CardLead, Registration,
// ProgramMembership) y confirma que /admin/programs/[id] cuenta bien y
// que el toggle "Marcar como pagada" persiste de verdad en la DB.
test.describe("Embudo de Conversión — /admin/programs/[id]", () => {
  const e2eDb = createE2eDb();
  let programId: string;
  let cardId: string;
  let adminId: string;
  let adminEmail: string;
  const memberIds: string[] = [];

  test.beforeAll(async () => {
    await e2eDb.connect();
    const suffix = Date.now();
    programId = `e2e-funnel-${suffix}`;
    cardId = `e2e-funnel-card-${suffix}`;

    await e2eDb.query(
      `insert into "Program" (id, slug, name, "updatedAt") values ($1, $2, $3, now())`,
      [programId, `e2e-funnel-slug-${suffix}`, "E2E Funnel Program"]
    );

    const passwordHash = await bcrypt.hash("no-se-usa-login-por-cookie", 10);
    adminEmail = `e2e-funnel-admin-${suffix}@example.com`;
    const admin = await e2eDb.query<{ id: string }>(
      `insert into "Admin" (id, email, "passwordHash", "programId", "updatedAt") values (gen_random_uuid()::text, $1, $2, $3, now()) returning id`,
      [adminEmail, passwordHash, programId]
    );
    adminId = admin.rows[0].id;

    await e2eDb.query(
      `insert into "Card" (id, slug, "updatedAt", name, title, quote, "programId", kind) values ($1, $2, now(), $3, $4, $5, $6, 'project')`,
      [cardId, `e2e-funnel-card-slug-${suffix}`, "E2E Funnel Card", "N/A", "cita", programId]
    );

    // 8 leads compartidos (QR)
    for (let i = 0; i < 8; i++) {
      await e2eDb.query(
        `insert into "CardLead" (id, "cardId", name, contact, source, stage, "updatedAt") values (gen_random_uuid()::text, $1, $2, $3, 'qr_whatsapp', 'compartido', now())`,
        [cardId, `Lead ${i}`, `lead${i}-${suffix}@example.com`]
      );
    }

    // 4 members: 1 invited, 1 active-sin-pagar, 2 active-pagados
    for (let i = 0; i < 4; i++) {
      const member = await e2eDb.query<{ id: string }>(
        `insert into "Member" (id, name, email, "updatedAt") values (gen_random_uuid()::text, $1, $2, now()) returning id`,
        [`E2E Funnel Member ${i}`, `funnel-member${i}-${suffix}@example.com`]
      );
      const memberId = member.rows[0].id;
      memberIds.push(memberId);

      const status = i >= 1 ? "active" : "invited";
      const interviewedAt = i >= 1 ? new Date() : null;
      const paidAt = i >= 2 ? new Date() : null;

      await e2eDb.query(
        `insert into "ProgramMembership" (id, "memberId", "programId", status, "interviewedAt", "membershipPaidAt", "updatedAt")
         values (gen_random_uuid()::text, $1, $2, $3, $4, $5, now())`,
        [memberId, programId, status, interviewedAt, paidAt]
      );
    }

    // 3 registrations (se registraron para la entrevista) sobre esta Card
    for (let i = 0; i < 3; i++) {
      await e2eDb.query(
        `insert into "Registration" (id, "cardId", "slotId", "slotLabel", name, whatsapp) values (gen_random_uuid()::text, $1, 'slot1', '10:00', $2, '+591700000')`,
        [cardId, `Registrado ${i}`]
      );
    }
  });

  test.afterAll(async () => {
    await e2eDb.query(`delete from "Registration" where "cardId" = $1`, [cardId]).catch(() => {});
    await e2eDb.query(`delete from "ProgramMembership" where "programId" = $1`, [programId]).catch(() => {});
    for (const id of memberIds) await e2eDb.query(`delete from "Member" where id = $1`, [id]).catch(() => {});
    await e2eDb.query(`delete from "CardLead" where "cardId" = $1`, [cardId]).catch(() => {});
    await e2eDb.query(`delete from "Card" where id = $1`, [cardId]).catch(() => {});
    await e2eDb.query(`delete from "Admin" where id = $1`, [adminId]).catch(() => {});
    await e2eDb.query(`delete from "Program" where id = $1`, [programId]).catch(() => {});
    await e2eDb.end();
  });

  test("cuenta bien cada etapa del embudo, y 'Marcar como pagada' persiste de verdad", async ({ browser }) => {
    const context = await browser.newContext();
    const cookie = await mintAdminCookie(adminId);
    await context.addCookies([{ ...cookie, url: BASE_URL }]);
    const page = await context.newPage();

    await page.goto(`${BASE_URL}/admin/programs/${programId}`, { waitUntil: "networkidle" });

    await page.getByRole("button", { name: "Embudo de Conversión" }).click();
    await expect(page.getByText("QR compartido", { exact: true })).toBeVisible();
    await expect(page.getByText("Se registró", { exact: true })).toBeVisible();
    // 3 de 8 leads se registraron
    await expect(page.getByText(/3\s?\(38%\)/)).toBeVisible();
    // 3 de 4 members tienen interviewedAt seteado (status !== invited)
    await expect(page.getByText("Entrevistado", { exact: true })).toBeVisible();
    await expect(page.getByText("Oficina activa", { exact: true })).toBeVisible();
    // 2 de 4 members están pagados de arranque
    await expect(page.getByText("Membresía pagada", { exact: true })).toBeVisible();

    // El miembro "E2E Funnel Member 1" está activo pero sin pagar -- togglealo
    await page.getByRole("button", { name: "Miembros" }).click();
    await page.getByText("E2E Funnel Member 1", { exact: true }).click();
    const paidToggle = page.locator("form").filter({ hasText: "Marcar como pagada" }).getByRole("button");
    await expect(paidToggle).toBeVisible();
    await paidToggle.click();
    await page.waitForURL(/memberPaidToggled=1/, { waitUntil: "networkidle" });

    const membershipRow = await e2eDb.query<{ membershipPaidAt: Date | null }>(
      `select "membershipPaidAt" from "ProgramMembership" where "memberId" = $1`,
      [memberIds[1]]
    );
    expect(membershipRow.rows[0].membershipPaidAt).not.toBeNull();

    await context.close();
  });
});
