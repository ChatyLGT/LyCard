import { test, expect } from "@playwright/test";
import { createE2eDb, mintAdminCookie, mintMemberCookie } from "./helpers/adminSession";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";

// Fase 5 (2026-09-30) -- ver PLAN.md "Fase 4: DISEÑO -- Especialistas y
// Expertos". Dos flujos reales de punta a punta: (1) un Especialista
// instalado se ve en "Tu Equipo" con su sugerencia marcada simulada, y
// (2) un visitante anónimo le pregunta a un Experto, la pregunta queda
// sin responder (sin match en el Códice), se registra, y esa pregunta
// aparece en el inbox de la Oficina del propio Experto.
test.describe("Especialistas y Expertos (Fase 5)", () => {
  const e2eDb = createE2eDb();
  const suffix = Date.now();

  let cardSlug: string;
  let especialistaId: string;
  let adminId: string;

  let expertoKey: string;
  let expertoCardSlug: string;
  let expertoMemberId: string;
  let visitorMemberId: string;
  let consultaId: string;

  test.beforeAll(async () => {
    await e2eDb.connect();

    // --- Especialista + una Card cualquiera donde instalarlo ---
    cardSlug = `e2e-especialista-${suffix}`;
    await e2eDb.query(
      `insert into "Card" (id, slug, "updatedAt", name, title, quote, kind) values (gen_random_uuid()::text, $1, now(), $2, $3, $4, 'personal')`,
      [cardSlug, "E2E Dueño Especialista", "Test Title", "Test Quote"]
    );
    const cardRow = await e2eDb.query<{ id: string }>(`select id from "Card" where slug = $1`, [cardSlug]);
    const cardId = cardRow.rows[0].id;

    const especialista = await e2eDb.query<{ id: string }>(
      `insert into "Especialista" (id, key, nombre, trabajo, descripcion, color, "toolKeys", suggestion, "updatedAt") values (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, $7, now()) returning id`,
      [
        `e2e-calma-${suffix}`,
        "Calma",
        "Cuidar que no te quemes",
        "Mira tu Caminata de Asombro y tus rachas de Modo Foco.",
        "#7FB0C4",
        JSON.stringify(["wowawe", "modo-foco"]),
        "Llevás 6 días sin cargar tu Caminata de Asombro -- ¿arrancamos una de 15 minutos?",
      ]
    );
    especialistaId = especialista.rows[0].id;

    await e2eDb.query(`insert into "EspecialistaInstall" (id, "cardId", "especialistaId") values (gen_random_uuid()::text, $1, $2)`, [cardId, especialistaId]);

    const admin = await e2eDb.query<{ id: string }>(
      `insert into "Admin" (id, email, "passwordHash", "programId", "updatedAt") values (gen_random_uuid()::text, $1, $2, null, now()) returning id`,
      [`e2e-mastern0-especialista-${suffix}@example.com`, "no-se-usa-login-por-cookie"]
    );
    adminId = admin.rows[0].id;

    // --- Experto (Member + Card + perfil ya publicado, sin Códice) ---
    expertoKey = `e2e-experto-${suffix}`;
    const expertoMember = await e2eDb.query<{ id: string }>(
      `insert into "Member" (id, name, "updatedAt") values (gen_random_uuid()::text, $1, now()) returning id`,
      ["Experto de Prueba (ejemplo)"]
    );
    expertoMemberId = expertoMember.rows[0].id;

    expertoCardSlug = `e2e-experto-card-${suffix}`;
    await e2eDb.query(
      `insert into "Card" (id, slug, "updatedAt", name, title, quote, kind, "memberId") values (gen_random_uuid()::text, $1, now(), $2, $3, $4, 'personal', $5)`,
      [expertoCardSlug, "Experto de Prueba (ejemplo)", "Nutrición (ejemplo)", "Perfil de prueba", expertoMemberId]
    );

    await e2eDb.query(
      `insert into "Experto" (id, key, "memberId", "nombrePublico", profesion, descripcion, color, "consentGivenAt", "bautizoStatus", "updatedAt") values (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, now(), 'bautizado', now())`,
      [expertoKey, expertoMemberId, "Experto de Prueba (ejemplo)", "Nutrición (ejemplo)", "Perfil de prueba para el flujo de consulta E2E.", "#C8A15A"]
    );

    const visitorMember = await e2eDb.query<{ id: string }>(
      `insert into "Member" (id, name, "updatedAt") values (gen_random_uuid()::text, $1, now()) returning id`,
      ["Visitante Registrado E2E"]
    );
    visitorMemberId = visitorMember.rows[0].id;
  });

  test.afterAll(async () => {
    await e2eDb.query(`delete from "Consulta" where "expertoId" in (select id from "Experto" where key = $1)`, [expertoKey]).catch(() => {});
    await e2eDb.query(`delete from "Experto" where key = $1`, [expertoKey]).catch(() => {});
    await e2eDb.query(`delete from "Member" where id = any($1)`, [[expertoMemberId, visitorMemberId]]).catch(() => {});
    await e2eDb.query(`delete from "EspecialistaInstall" where "especialistaId" = $1`, [especialistaId]).catch(() => {});
    await e2eDb.query(`delete from "Especialista" where id = $1`, [especialistaId]).catch(() => {});
    await e2eDb.query(`delete from "Admin" where id = $1`, [adminId]).catch(() => {});
    await e2eDb.query(`delete from "Card" where slug = any($1)`, [[cardSlug, expertoCardSlug]]).catch(() => {});
    await e2eDb.end();
  });

  test("un Especialista instalado se ve en 'Tu Equipo' con su sugerencia marcada simulada", async ({ browser }) => {
    const context = await browser.newContext();
    const cookie = await mintAdminCookie(adminId);
    await context.addCookies([{ ...cookie, url: BASE_URL }]);
    const page = await context.newPage();

    await page.goto(`${BASE_URL}/c/${cardSlug}/oficina`, { waitUntil: "networkidle" });

    await expect(page.getByText("Tu Equipo", { exact: true })).toBeVisible();
    await page.getByText("Calma", { exact: true }).click();
    await expect(page.getByText("arrancamos una de 15 minutos", { exact: false })).toBeVisible();
    await expect(page.getByText("Sugerencia de ejemplo (simulada)", { exact: false })).toBeVisible();
    await expect(page.getByText("Herramientas: wowawe · Modo Foco", { exact: false })).toBeVisible();

    await context.close();
  });

  test("un visitante anónimo le pregunta a un Experto, se registra, y el Experto ve la pregunta en su inbox", async ({ browser }) => {
    // 1) Visitante SIN sesión le pregunta algo que no matchea ningún Códice.
    const visitorContext = await browser.newContext();
    const visitorPage = await visitorContext.newPage();
    await visitorPage.goto(`${BASE_URL}/experto/${expertoKey}`, { waitUntil: "networkidle" });

    await expect(visitorPage.getByText(`Gemelo digital de Experto de Prueba (ejemplo)`)).toBeVisible();
    await visitorPage.getByPlaceholder("Escribí tu pregunta").fill("¿Qué desayuno me conviene antes de entrenar?");
    await visitorPage.getByRole("button", { name: "Preguntar" }).click();
    await visitorPage.waitForURL(/asked=1/);

    await expect(visitorPage.getByText("todavía no supo responder esto", { exact: false })).toBeVisible();

    const anonRows = await e2eDb.query<{ id: string; visitorToken: string | null; memberId: string | null; respuesta: string | null }>(
      `select id, "visitorToken", "memberId", respuesta from "Consulta" where "expertoId" = (select id from "Experto" where key = $1) order by "createdAt" asc`,
      [expertoKey]
    );
    expect(anonRows.rows.length).toBe(1);
    expect(anonRows.rows[0].visitorToken).not.toBeNull();
    expect(anonRows.rows[0].memberId).toBeNull();
    expect(anonRows.rows[0].respuesta).toBeNull();
    consultaId = anonRows.rows[0].id;
    await visitorContext.close();

    // 2) El mismo visitante "se registra" (sesión real de Member) y pregunta de nuevo.
    const registeredContext = await browser.newContext();
    const memberCookie = await mintMemberCookie(visitorMemberId);
    await registeredContext.addCookies([{ ...memberCookie, url: BASE_URL }]);
    const registeredPage = await registeredContext.newPage();
    await registeredPage.goto(`${BASE_URL}/experto/${expertoKey}`, { waitUntil: "networkidle" });

    await registeredPage.getByPlaceholder("Escribí tu pregunta").fill("¿Cuánta agua tengo que tomar en verano?");
    await registeredPage.getByRole("button", { name: "Preguntar" }).click();
    await registeredPage.waitForURL(/asked=1/);

    const registeredRows = await e2eDb.query<{ memberId: string | null }>(
      `select "memberId" from "Consulta" where "expertoId" = (select id from "Experto" where key = $1) and "memberId" is not null`,
      [expertoKey]
    );
    expect(registeredRows.rows.length).toBe(1);
    expect(registeredRows.rows[0].memberId).toBe(visitorMemberId);
    await registeredContext.close();

    // 3) El propio Experto entra a SU Oficina y ve la primera pregunta en el inbox.
    const expertContext = await browser.newContext();
    const expertCookie = await mintMemberCookie(expertoMemberId);
    await expertContext.addCookies([{ ...expertCookie, url: BASE_URL }]);
    const expertPage = await expertContext.newPage();
    await expertPage.goto(`${BASE_URL}/c/${expertoCardSlug}/oficina`, { waitUntil: "networkidle" });

    await expect(expertPage.getByText("Preguntas que tu gemelo no supo responder")).toBeVisible();
    await expect(expertPage.getByText("¿Qué desayuno me conviene antes de entrenar?")).toBeVisible();
    await expect(expertPage.getByText("¿Cuánta agua tengo que tomar en verano?")).toBeVisible();

    // 4) Responde la primera y la aprueba -- entra al Códice real.
    await expertPage.getByText("¿Qué desayuno me conviene antes de entrenar?").click();
    await expertPage.getByPlaceholder("Tu respuesta").fill("Algo liviano en carbohidratos, 60-90 minutos antes.");
    await expertPage.getByText("Sumar esta respuesta a mi Códice", { exact: false }).click();
    await expertPage.getByRole("button", { name: "Responder" }).click();
    await expertPage.waitForURL(/expertoAnswered=1/);

    const answered = await e2eDb.query<{ respuesta: string | null }>(`select respuesta from "Consulta" where id = $1`, [consultaId]);
    expect(answered.rows[0].respuesta).not.toBeNull();
    const codice = await e2eDb.query<{ id: string }>(
      `select id from "CodiceEntry" where "expertoId" = (select id from "Experto" where key = $1) and "aprobadaAt" is not null`,
      [expertoKey]
    );
    expect(codice.rows.length).toBe(1);

    await expertContext.close();
  });
});
