import { test, expect } from "@playwright/test";
import bcrypt from "bcryptjs";
import { createE2eDb, mintAdminCookie } from "./helpers/adminSession";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";

// Viaje del Cliente -- puerta de acceso (2026-10-07): el colaborador
// registra, sobre la ProgramMembership que ya viaja por el Embudo de
// Conversión (invited -> interviewed -> active -> paid), qué puerta del
// MENU_ACCESO_LEGACY v1.1 eligió el cliente y a qué precio -- sin crear
// ningún modelo nuevo. Ver docs/WHITEPAPER-ADENDA-2026-10-07.md sección 9.
test.describe("Viaje del Cliente -- asignar puerta de acceso", () => {
  const e2eDb = createE2eDb();
  const suffix = Date.now();
  let programId: string;
  let cardId: string;
  let cardSlug: string;
  let adminId: string;
  let memberId: string;
  let membershipId: string;
  let registrationId: string;

  test.beforeAll(async () => {
    await e2eDb.connect();
    programId = `e2e-door-${suffix}`;
    cardSlug = `e2e-door-card-${suffix}`;

    await e2eDb.query(
      `insert into "Program" (id, slug, name, "updatedAt") values ($1, $2, $3, now())`,
      [programId, `e2e-door-slug-${suffix}`, "E2E Puerta de Acceso"]
    );

    const card = await e2eDb.query<{ id: string }>(
      `insert into "Card" (id, slug, "updatedAt", name, title, quote, "programId", kind) values (gen_random_uuid()::text, $1, now(), $2, $3, $4, $5, 'project') returning id`,
      [cardSlug, "E2E Puerta Card", "N/A", "cita", programId]
    );
    cardId = card.rows[0].id;

    const passwordHash = await bcrypt.hash("no-se-usa-login-por-cookie", 10);
    const admin = await e2eDb.query<{ id: string }>(
      `insert into "Admin" (id, email, "passwordHash", "programId", "updatedAt") values (gen_random_uuid()::text, $1, $2, $3, now()) returning id`,
      [`e2e-door-admin-${suffix}@example.com`, passwordHash, programId]
    );
    adminId = admin.rows[0].id;

    const member = await e2eDb.query<{ id: string }>(
      `insert into "Member" (id, whatsapp, name, "updatedAt") values (gen_random_uuid()::text, $1, $2, now()) returning id`,
      [`+52 998 000 ${suffix.toString().slice(-4)}`, "Cliente E2E Puerta"]
    );
    memberId = member.rows[0].id;

    const membership = await e2eDb.query<{ id: string }>(
      `insert into "ProgramMembership" (id, "memberId", "programId", status, "updatedAt") values (gen_random_uuid()::text, $1, $2, 'invited', now()) returning id`,
      [memberId, programId]
    );
    membershipId = membership.rows[0].id;

    const registration = await e2eDb.query<{ id: string }>(
      `insert into "Registration" (id, "cardId", "slotId", "slotLabel", name, whatsapp, "membershipId", "createdAt") values (gen_random_uuid()::text, $1, 'e2e-slot', 'Horario E2E', $2, $3, $4, now()) returning id`,
      [cardId, "Cliente E2E Puerta", "+52 998 000 0000", membershipId]
    );
    registrationId = registration.rows[0].id;
  });

  test.afterAll(async () => {
    await e2eDb.query(`delete from "Registration" where id = $1`, [registrationId]).catch(() => {});
    await e2eDb.query(`delete from "ProgramMembership" where id = $1`, [membershipId]).catch(() => {});
    await e2eDb.query(`delete from "Member" where id = $1`, [memberId]).catch(() => {});
    await e2eDb.query(`delete from "Card" where id = $1`, [cardId]).catch(() => {});
    await e2eDb.query(`delete from "Admin" where id = $1`, [adminId]).catch(() => {});
    await e2eDb.query(`delete from "Program" where id = $1`, [programId]).catch(() => {});
    await e2eDb.end();
  });

  test("el N0 marca la entrevista hecha y asigna una puerta con precio/forma de pago/traído por", async ({ browser }) => {
    const context = await browser.newContext();
    await context.addCookies([{ ...(await mintAdminCookie(adminId)), url: BASE_URL }]);
    const page = await context.newPage();

    await page.goto(`${BASE_URL}/admin/programs/${programId}`, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: /^Inscriptos a Entrevistas/ }).click();
    await page.getByRole("button", { name: "Marcar entrevista hecha" }).click();
    // "activated=1" en la URL hace que el AccordionSection ya quede
    // abierto por su defaultOpen -- un segundo click acá lo CERRARÍA
    // (toggle), dejando los campos del form con altura 0 (mismo bug ya
    // pisado con "Badge de Puestos" en la Fase 2 de la Librería de Slots).
    await page.waitForURL(/activated=1/);

    await page.locator('select[name="doorKey"]').selectOption("arquitecto");
    await page.locator('input[name="priceAgreedUsd"]').fill("500");
    await page.locator('select[name="paymentModel"]').selectOption("unico");
    await page.locator('select[name="traidoPor"]').selectOption("empresa");
    await page.getByRole("button", { name: "Asignar puerta" }).click();
    await page.waitForURL(/doorAssigned=1/);

    await expect(page.getByText("Puerta asignada: Arquitecto", { exact: false })).toBeVisible();
    await expect(page.getByText("$500 -- unico -- traído por empresa", { exact: false })).toBeVisible();

    const row = await e2eDb.query<{ doorKey: string; priceAgreedUsd: number; paymentModel: string; traidoPor: string; soldByAdminId: string }>(
      `select "doorKey", "priceAgreedUsd", "paymentModel", "traidoPor", "soldByAdminId" from "ProgramMembership" where id = $1`,
      [membershipId]
    );
    expect(row.rows[0].doorKey).toBe("arquitecto");
    expect(row.rows[0].priceAgreedUsd).toBe(500);
    expect(row.rows[0].paymentModel).toBe("unico");
    expect(row.rows[0].traidoPor).toBe("empresa");
    expect(row.rows[0].soldByAdminId).toBe(adminId);

    await context.close();
  });
});
