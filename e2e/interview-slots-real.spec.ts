import { test, expect } from "@playwright/test";
import bcrypt from "bcryptjs";
import { createE2eDb, mintAdminCookie } from "./helpers/adminSession";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";

// Auditoría 2026-09-23, hallazgo 1.4 (resolución real, preparada sin
// pushear a main -- ver PLAN.md): cupo real por Programa. Un
// InterviewSlot con capacity=1 debe: (a) aparecer en el picker público en
// vez de los 4 fijos, (b) aceptar la primera reserva, (c) rechazar una
// SEGUNDA persona distinta con error "full", y (d) el admin puede
// crear/editar/borrar sus propios horarios desde /admin/programs/[id].
test.describe("Cupo real de InterviewSlot por Programa", () => {
  const e2eDb = createE2eDb();
  let programId: string;
  let cardSlug: string;
  let cardId: string;
  let adminId: string;
  let slotId: string;

  test.beforeAll(async () => {
    await e2eDb.connect();
    const suffix = Date.now();
    programId = `e2e-slotcap-${suffix}`;
    cardSlug = `e2e-slotcap-card-${suffix}`;

    await e2eDb.query(
      `insert into "Program" (id, slug, name, "updatedAt") values ($1, $2, $3, now())`,
      [programId, `e2e-slotcap-slug-${suffix}`, "E2E Cupo Real"]
    );

    const card = await e2eDb.query<{ id: string }>(
      `insert into "Card" (id, slug, "updatedAt", name, title, quote, "programId", kind) values (gen_random_uuid()::text, $1, now(), $2, $3, $4, $5, 'project') returning id`,
      [cardSlug, "E2E Cupo Real Card", "N/A", "cita", programId]
    );
    cardId = card.rows[0].id;

    const passwordHash = await bcrypt.hash("no-se-usa-login-por-cookie", 10);
    const admin = await e2eDb.query<{ id: string }>(
      `insert into "Admin" (id, email, "passwordHash", "programId", "updatedAt") values (gen_random_uuid()::text, $1, $2, null, now()) returning id`,
      [`e2e-slotcap-admin-${suffix}@example.com`, passwordHash]
    );
    adminId = admin.rows[0].id;

    // Cupo de 1 -- a propósito, para poder llenarlo con una sola reserva
    const slot = await e2eDb.query<{ id: string }>(
      `insert into "InterviewSlot" (id, "programId", label, "labelEn", date, time, capacity, "updatedAt")
       values (gen_random_uuid()::text, $1, 'Viernes de prueba', 'Test Friday', now() + interval '2 days', '15:00 hs', 1, now()) returning id`,
      [programId]
    );
    slotId = slot.rows[0].id;
  });

  test.afterAll(async () => {
    await e2eDb.query(`delete from "Registration" where "cardId" = $1`, [cardId]).catch(() => {});
    await e2eDb.query(`delete from "CardLead" where "cardId" = $1`, [cardId]).catch(() => {});
    await e2eDb.query(`delete from "InterviewSlot" where "programId" = $1`, [programId]).catch(() => {});
    await e2eDb.query(`delete from "Card" where id = $1`, [cardId]).catch(() => {});
    await e2eDb.query(`delete from "Admin" where id = $1`, [adminId]).catch(() => {});
    await e2eDb.query(`delete from "Program" where id = $1`, [programId]).catch(() => {});
    await e2eDb.end();
  });

  test("el horario real se ofrece, una segunda persona distinta lo encuentra lleno, y el admin lo administra", async ({ browser }) => {
    // Primera persona -- llena el único lugar
    const visitorContext = await browser.newContext();
    const visitorPage = await visitorContext.newPage();
    await visitorPage.goto(`${BASE_URL}/c/${cardSlug}`, { waitUntil: "networkidle" });
    await visitorPage.getByRole("button", { name: "Agendar tu Entrevista" }).click();

    // El horario real reemplaza a los 4 fijos -- "Martes 22" no debe estar
    await expect(visitorPage.getByText("Martes 22 de Septiembre")).toHaveCount(0);
    await expect(visitorPage.getByText("Viernes de prueba")).toBeVisible();

    await visitorPage.getByText("Viernes de prueba").click();
    await visitorPage.getByLabel("Nombre completo").fill("Primera Persona");
    await visitorPage.getByLabel("WhatsApp").fill("+52 998 111 1111");
    await visitorPage.getByRole("button", { name: "Confirmar mi lugar" }).click();
    await expect(visitorPage.getByText("¡Listo! Te esperamos", { exact: false })).toBeVisible();
    await visitorContext.close();

    const bookedRow = await e2eDb.query(`select * from "Registration" where "cardId" = $1 and "interviewSlotId" = $2`, [cardId, slotId]);
    expect(bookedRow.rows.length).toBe(1);

    // Segunda persona, WhatsApp distinto -- el único lugar ya está ocupado
    const secondContext = await browser.newContext();
    const secondPage = await secondContext.newPage();
    await secondPage.goto(`${BASE_URL}/c/${cardSlug}`, { waitUntil: "networkidle" });
    await secondPage.getByRole("button", { name: "Agendar tu Entrevista" }).click();
    await secondPage.getByText("Viernes de prueba").click();
    await secondPage.getByLabel("Nombre completo").fill("Segunda Persona");
    await secondPage.getByLabel("WhatsApp").fill("+52 998 222 2222");
    await secondPage.getByRole("button", { name: "Confirmar mi lugar" }).click();
    await expect(secondPage.getByText("ya se llenó", { exact: false })).toBeVisible();
    await expect(secondPage.getByText("¡Listo! Te esperamos", { exact: false })).toHaveCount(0);
    await secondContext.close();

    const stillOneRow = await e2eDb.query(`select * from "Registration" where "cardId" = $1 and "interviewSlotId" = $2`, [cardId, slotId]);
    expect(stillOneRow.rows.length).toBe(1); // el cupo real no se pasó de 1

    // Admin: ve el horario en /admin/programs/[id] y puede crear uno nuevo
    const adminContext = await browser.newContext();
    const cookie = await mintAdminCookie(adminId);
    await adminContext.addCookies([{ ...cookie, url: BASE_URL }]);
    const adminPage = await adminContext.newPage();
    await adminPage.goto(`${BASE_URL}/admin/programs/${programId}`, { waitUntil: "networkidle" });
    await adminPage.getByRole("button", { name: "Horarios de Entrevista" }).click();
    await expect(adminPage.getByText("Viernes de prueba").first()).toBeVisible();
    await expect(adminPage.getByText("cupo 1", { exact: false })).toBeVisible();
    await adminContext.close();
  });
});
