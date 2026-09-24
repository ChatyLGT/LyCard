import { test, expect } from "@playwright/test";
import bcrypt from "bcryptjs";
import { createE2eDb, mintAdminCookie, mintMemberCookie } from "./helpers/adminSession";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";

// Mensajería Interna (2026-09-24, ver PLAN.md "Mensajería Interna"):
// N0 manda masivo con canal elegible, cualquier otro humano solo
// directo 1:1 con su Programa. Este spec cubre el flujo real de punta a
// punta: el MasterN0 arma un mensaje masivo por la UI real de
// /admin/programs/[id] con los 4 canales tildados, se confirma en DB
// que cada canal quedó con el estado honesto que le corresponde (lycard
// enviado de verdad, email fallido porque no hay RESEND_API_KEY en este
// entorno -- nunca finge un envío, telegram/whatsapp simulados porque
// no tienen integración real todavía) -- y dos Members de ese Programa
// se mandan un directo 1:1 y lo ven en su bandeja.
test.describe("Mensajería Interna", () => {
  const e2eDb = createE2eDb();
  const suffix = Date.now();
  let legacyProgramId: string;
  let adminId: string;
  let memberAId: string;
  let memberBId: string;
  let messageId: string | undefined;
  let directMessageId: string | undefined;

  test.beforeAll(async () => {
    await e2eDb.connect();

    const existing = await e2eDb.query<{ id: string }>(`select id from "Program" where slug = 'legacy'`);
    if (existing.rows[0]) {
      legacyProgramId = existing.rows[0].id;
    } else {
      const program = await e2eDb.query<{ id: string }>(
        `insert into "Program" (id, slug, name, "updatedAt") values (gen_random_uuid()::text, 'legacy', 'Legacy', now()) returning id`
      );
      legacyProgramId = program.rows[0].id;
    }

    const passwordHash = await bcrypt.hash("no-se-usa-login-por-cookie", 10);
    const admin = await e2eDb.query<{ id: string }>(
      `insert into "Admin" (id, email, "passwordHash", "programId", "updatedAt") values (gen_random_uuid()::text, $1, $2, null, now()) returning id`,
      [`e2e-messaging-admin-${suffix}@example.com`, passwordHash]
    );
    adminId = admin.rows[0].id;

    const memberA = await e2eDb.query<{ id: string }>(
      `insert into "Member" (id, whatsapp, email, name, "updatedAt") values (gen_random_uuid()::text, $1, $2, $3, now()) returning id`,
      [`+52706${suffix}`, `e2e-msg-a-${suffix}@example.com`, "Equipo E2E Uno"]
    );
    memberAId = memberA.rows[0].id;
    await e2eDb.query(
      `insert into "ProgramMembership" (id, "memberId", "programId", status, "updatedAt") values (gen_random_uuid()::text, $1, $2, 'active', now())`,
      [memberAId, legacyProgramId]
    );

    const memberB = await e2eDb.query<{ id: string }>(
      `insert into "Member" (id, whatsapp, email, name, "updatedAt") values (gen_random_uuid()::text, $1, $2, $3, now()) returning id`,
      [`+52707${suffix}`, `e2e-msg-b-${suffix}@example.com`, "Equipo E2E Dos"]
    );
    memberBId = memberB.rows[0].id;
    await e2eDb.query(
      `insert into "ProgramMembership" (id, "memberId", "programId", status, "updatedAt") values (gen_random_uuid()::text, $1, $2, 'active', now())`,
      [memberBId, legacyProgramId]
    );
  });

  test.afterAll(async () => {
    await e2eDb.query(`delete from "MessageDelivery" where "recipientMemberId" in ($1, $2)`, [memberAId, memberBId]).catch(() => {});
    if (messageId) await e2eDb.query(`delete from "Message" where id = $1`, [messageId]).catch(() => {});
    if (directMessageId) await e2eDb.query(`delete from "Message" where id = $1`, [directMessageId]).catch(() => {});
    await e2eDb.query(`delete from "ProgramMembership" where "memberId" in ($1, $2)`, [memberAId, memberBId]).catch(() => {});
    await e2eDb.query(`delete from "Member" where id in ($1, $2)`, [memberAId, memberBId]).catch(() => {});
    await e2eDb.query(`delete from "Admin" where id = $1`, [adminId]).catch(() => {});
    await e2eDb.end();
  });

  test("el N0 manda un masivo con los 4 canales, y dos Members se mandan un directo", async ({ browser }) => {
    const messageBody = `Mensaje masivo de prueba ${suffix}`;

    // --- Masivo, por la UI real de /admin/programs/[id] ---
    const adminContext = await browser.newContext();
    const adminCookie = await mintAdminCookie(adminId);
    await adminContext.addCookies([{ ...adminCookie, url: BASE_URL }]);
    const adminPage = await adminContext.newPage();

    await adminPage.goto(`${BASE_URL}/admin/programs/${legacyProgramId}`, { waitUntil: "networkidle" });
    await adminPage.getByRole("button", { name: /Mensajería/ }).click();

    await adminPage.locator('textarea[name="body"]').fill(messageBody);
    await adminPage.getByLabel(/Telegram/).check();
    await adminPage.getByLabel(/WhatsApp/).check();
    await adminPage.getByLabel("Equipo E2E Uno").check();
    await adminPage.getByLabel("Equipo E2E Dos").check();
    await adminPage.getByRole("button", { name: "Enviar mensaje" }).click();
    await adminPage.waitForURL(/messageSent=1/);
    await adminContext.close();

    const messageRow = await e2eDb.query<{ id: string; scope: string }>(
      `select id, scope from "Message" where body = $1`,
      [messageBody]
    );
    expect(messageRow.rows).toHaveLength(1);
    messageId = messageRow.rows[0].id;
    expect(messageRow.rows[0].scope).toBe("masivo");

    const deliveries = await e2eDb.query<{ channel: string; status: string; errorDetail: string | null; recipientMemberId: string }>(
      `select channel, status, "errorDetail", "recipientMemberId" from "MessageDelivery" where "messageId" = $1 order by channel`,
      [messageId]
    );
    // 2 destinatarios x 4 canales = 8 entregas, cada una con su estado
    // honesto -- nunca "enviado" en un canal que no mandó nada real.
    expect(deliveries.rows).toHaveLength(8);
    for (const d of deliveries.rows) {
      if (d.channel === "lycard") expect(d.status).toBe("enviado");
      if (d.channel === "email") {
        expect(d.status).toBe("fallido");
        expect(d.errorDetail).toContain("RESEND_API_KEY");
      }
      if (d.channel === "telegram" || d.channel === "whatsapp") expect(d.status).toBe("simulado");
    }

    // --- El Member A ve el masivo en su bandeja y lo marca leído ---
    const memberAContext = await browser.newContext();
    const memberACookie = await mintMemberCookie(memberAId);
    await memberAContext.addCookies([{ ...memberACookie, url: BASE_URL }]);
    const memberAPage = await memberAContext.newPage();

    await memberAPage.goto(`${BASE_URL}/m/dashboard/messages`, { waitUntil: "networkidle" });
    await expect(memberAPage.getByText(messageBody)).toBeVisible();
    await memberAPage.getByRole("button", { name: "Marcar leído" }).first().click();
    await memberAPage.waitForLoadState("networkidle");
    await expect(memberAPage.getByRole("button", { name: "Marcar leído" })).toHaveCount(0);

    const readRow = await e2eDb.query<{ readAt: Date | null }>(
      `select "readAt" from "MessageDelivery" where "messageId" = $1 and "recipientMemberId" = $2 and channel = 'lycard'`,
      [messageId, memberAId]
    );
    expect(readRow.rows[0].readAt).not.toBeNull();

    // --- El Member A le manda un directo al Member B ---
    const directBody = `Directo de prueba ${suffix}`;
    await memberAPage.getByText("Equipo E2E Dos").click();
    await memberAPage.getByPlaceholder("Escribí tu mensaje...").fill(directBody);
    await memberAPage.getByRole("button", { name: "Enviar" }).click();
    await memberAPage.waitForURL(/sent=1/);
    await memberAContext.close();

    const directRow = await e2eDb.query<{ id: string; scope: string; "senderMemberId": string }>(
      `select id, scope, "senderMemberId" from "Message" where body = $1`,
      [directBody]
    );
    expect(directRow.rows).toHaveLength(1);
    directMessageId = directRow.rows[0].id;
    expect(directRow.rows[0].scope).toBe("directo");
    expect(directRow.rows[0].senderMemberId).toBe(memberAId);

    const directDelivery = await e2eDb.query<{ channel: string; status: string; recipientMemberId: string }>(
      `select channel, status, "recipientMemberId" from "MessageDelivery" where "messageId" = $1`,
      [directMessageId]
    );
    expect(directDelivery.rows).toHaveLength(1);
    expect(directDelivery.rows[0].channel).toBe("lycard");
    expect(directDelivery.rows[0].status).toBe("enviado");
    expect(directDelivery.rows[0].recipientMemberId).toBe(memberBId);

    // --- El Member B lo ve en su propia bandeja ---
    const memberBContext = await browser.newContext();
    const memberBCookie = await mintMemberCookie(memberBId);
    await memberBContext.addCookies([{ ...memberBCookie, url: BASE_URL }]);
    const memberBPage = await memberBContext.newPage();

    await memberBPage.goto(`${BASE_URL}/m/dashboard/messages`, { waitUntil: "networkidle" });
    await expect(memberBPage.getByText(directBody)).toBeVisible();
    await expect(memberBPage.getByText("Equipo E2E Uno").first()).toBeVisible();
    await memberBContext.close();
  });
});
