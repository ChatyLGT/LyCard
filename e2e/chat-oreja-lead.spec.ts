import { test, expect } from "@playwright/test";
import bcrypt from "bcryptjs";
import { createE2eDb, mintEmployeeCookie, mintMemberCookie } from "./helpers/adminSession";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";

// Viaje del Cliente, Fase 3 (2026-10-13) -- chat interno real
// Oreja↔Lead, mismo canal "lycard" de siempre (Message/MessageDelivery)
// que ya usaba Member↔Member -- ahora un Admin también puede ser
// destinatario real (MessageDelivery.recipientAdminId, nuevo). El Lead
// sigue "invited" (todavía no pagó/activó) durante todo este flujo --
// justo el momento real en que pasa esta conversación, antes de que se
// convierta en Miembro activo.
test.describe("Panel de Empleados -- chat interno real con el Lead", () => {
  const e2eDb = createE2eDb();
  const suffix = Date.now();
  let programId: string;
  let employeeAdminId: string;
  let memberId: string;
  let membershipId: string;

  test.beforeAll(async () => {
    await e2eDb.connect();
    programId = `e2e-chat-oreja-${suffix}`;

    await e2eDb.query(`insert into "Program" (id, slug, name, "updatedAt") values ($1, $2, $3, now())`, [
      programId,
      `${programId}-slug`,
      "E2E Chat Oreja",
    ]);

    const passwordHash = await bcrypt.hash("empleado-password-123", 10);
    const admin = await e2eDb.query<{ id: string }>(
      `insert into "Admin" (id, email, "passwordHash", "programId", role, "updatedAt") values (gen_random_uuid()::text, $1, $2, $3, 'empleado', now()) returning id`,
      [`e2e-chat-oreja-empleado-${suffix}@example.com`, passwordHash, programId]
    );
    employeeAdminId = admin.rows[0].id;

    const member = await e2eDb.query<{ id: string }>(
      `insert into "Member" (id, name, "updatedAt") values (gen_random_uuid()::text, $1, now()) returning id`,
      [`E2E Lead Chat ${suffix}`]
    );
    memberId = member.rows[0].id;

    // Membership todavía "invited" -- el chat tiene que funcionar ANTES
    // de activarse, no después.
    const membership = await e2eDb.query<{ id: string }>(
      `insert into "ProgramMembership" (id, "memberId", "programId", status, "updatedAt") values (gen_random_uuid()::text, $1, $2, 'invited', now()) returning id`,
      [memberId, programId]
    );
    membershipId = membership.rows[0].id;
  });

  test.afterAll(async () => {
    await e2eDb.query(`delete from "MessageDelivery" where "recipientMemberId" = $1 or "recipientAdminId" = $2`, [memberId, employeeAdminId]).catch(() => {});
    await e2eDb.query(`delete from "Message" where "senderMemberId" = $1 or "senderAdminId" = $2`, [memberId, employeeAdminId]).catch(() => {});
    await e2eDb.query(`delete from "ProgramMembership" where id = $1`, [membershipId]).catch(() => {});
    await e2eDb.query(`delete from "Member" where id = $1`, [memberId]).catch(() => {});
    await e2eDb.query(`delete from "Admin" where id = $1`, [employeeAdminId]).catch(() => {});
    await e2eDb.query(`delete from "Program" where id = $1`, [programId]).catch(() => {});
    await e2eDb.end();
  });

  test("la Oreja le escribe al Lead, y el Lead (todavía invited) ve el mensaje y le contesta de vuelta", async ({ browser }) => {
    // Hace falta una Card suelta del Programa + Registration para que el
    // Lead aparezca en LeadsPanel -- mismo fixture mínimo de siempre.
    const card = await e2eDb.query<{ id: string }>(
      `insert into "Card" (id, slug, name, title, quote, "programId", "updatedAt") values (gen_random_uuid()::text, $1, '', '', '', $2, now()) returning id`,
      [`e2e-chat-oreja-card-${suffix}`, programId]
    );
    const registration = await e2eDb.query<{ id: string }>(
      `insert into "Registration" (id, "cardId", "slotId", "slotLabel", name, whatsapp, "membershipId", "createdAt")
       values (gen_random_uuid()::text, $1, 'slot-1', 'Hoy 19:00', $2, $3, $4, now()) returning id`,
      [card.rows[0].id, `E2E Lead Chat ${suffix}`, `+52 994 ${suffix.toString().slice(-7)}`, membershipId]
    );

    // --- La Oreja le escribe al Lead desde /empleados ---
    const orejaContext = await browser.newContext();
    await orejaContext.addCookies([{ ...(await mintEmployeeCookie(employeeAdminId)), url: BASE_URL }]);
    const orejaPage = await orejaContext.newPage();

    await orejaPage.goto(`${BASE_URL}/empleados`, { waitUntil: "networkidle" });
    await expect(orejaPage.getByText(`Chat con E2E Lead Chat ${suffix}`)).toBeVisible();

    const orejaBody = `Hola, ¿cómo va todo? ${suffix}`;
    await orejaPage.getByPlaceholder("Escribile al Lead...").fill(orejaBody);
    await orejaPage.getByRole("button", { name: "Enviar" }).click();
    await orejaPage.waitForURL(/chatSent=1/);
    await expect(orejaPage.getByText(orejaBody)).toBeVisible();
    await orejaContext.close();

    const orejaMsgRow = await e2eDb.query<{ id: string; senderAdminId: string; scope: string }>(
      `select id, "senderAdminId", scope from "Message" where body = $1`,
      [orejaBody]
    );
    expect(orejaMsgRow.rows).toHaveLength(1);
    expect(orejaMsgRow.rows[0].senderAdminId).toBe(employeeAdminId);
    expect(orejaMsgRow.rows[0].scope).toBe("directo");

    const orejaDelivery = await e2eDb.query<{ recipientMemberId: string; channel: string; status: string }>(
      `select "recipientMemberId", channel, status from "MessageDelivery" where "messageId" = $1`,
      [orejaMsgRow.rows[0].id]
    );
    expect(orejaDelivery.rows[0].recipientMemberId).toBe(memberId);
    expect(orejaDelivery.rows[0].channel).toBe("lycard");
    expect(orejaDelivery.rows[0].status).toBe("enviado");

    // --- El Lead (todavía "invited") lo ve en su bandeja y le contesta ---
    const leadContext = await browser.newContext();
    await leadContext.addCookies([{ ...(await mintMemberCookie(memberId)), url: BASE_URL }]);
    const leadPage = await leadContext.newPage();

    await leadPage.goto(`${BASE_URL}/m/dashboard/messages`, { waitUntil: "networkidle" });
    await expect(leadPage.getByText("Tu Oreja")).toBeVisible();
    await expect(leadPage.getByText(orejaBody)).toBeVisible();

    const leadBody = `Todo bien, gracias! ${suffix}`;
    await leadPage.getByPlaceholder(/Contestarle a Tu Oreja/).fill(leadBody);
    await leadPage.getByRole("button", { name: "Enviar" }).click();
    await leadPage.waitForURL(/sent=1/);
    await leadContext.close();

    const leadMsgRow = await e2eDb.query<{ id: string; senderMemberId: string }>(
      `select id, "senderMemberId" from "Message" where body = $1`,
      [leadBody]
    );
    expect(leadMsgRow.rows).toHaveLength(1);
    expect(leadMsgRow.rows[0].senderMemberId).toBe(memberId);

    const leadDelivery = await e2eDb.query<{ recipientAdminId: string }>(
      `select "recipientAdminId" from "MessageDelivery" where "messageId" = $1`,
      [leadMsgRow.rows[0].id]
    );
    expect(leadDelivery.rows[0].recipientAdminId).toBe(employeeAdminId);

    // --- La Oreja ve el hilo completo, en orden, de vuelta en su tablero ---
    const orejaContext2 = await browser.newContext();
    await orejaContext2.addCookies([{ ...(await mintEmployeeCookie(employeeAdminId)), url: BASE_URL }]);
    const orejaPage2 = await orejaContext2.newPage();
    await orejaPage2.goto(`${BASE_URL}/empleados`, { waitUntil: "networkidle" });
    await expect(orejaPage2.getByText(orejaBody)).toBeVisible();
    await expect(orejaPage2.getByText(leadBody)).toBeVisible();
    await orejaContext2.close();

    await e2eDb.query(`delete from "Registration" where id = $1`, [registration.rows[0].id]).catch(() => {});
    await e2eDb.query(`delete from "Card" where id = $1`, [card.rows[0].id]).catch(() => {});
  });
});
