import { test, expect } from "@playwright/test";
import bcrypt from "bcryptjs";
import { createE2eDb, mintEmployeeCookie } from "./helpers/adminSession";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";

// BizToCard (2026-10-12, pedido de Gunnar: "arrancá con la pista personal
// nivel 1 y 2 nomás, pero quiero que se desarrolle el dashboard para la
// oreja") -- la Oreja, logueada en /empleados, abre la tarjeta personal
// de un Miembro de SU Programa y la completa un campo a la vez, en vivo.
// Ver lib/bizToCardScript.ts para el porqué de escribir directo a la Card
// (sin AssistantSession/AssistantAnswer).
test.describe("BizToCard -- Pista Personal, Niveles 1 y 2", () => {
  const e2eDb = createE2eDb();
  const suffix = Date.now();
  let programId: string;
  let employeeAdminId: string;
  let memberId: string;
  let personalCardId: string;
  let cardSlug: string;

  // Programa + Miembro ajenos, para probar que la Oreja de un Programa
  // nunca puede tocar la Card personal de otro Programa.
  let otroProgramId: string;
  let otroMemberId: string;
  let otroCardId: string;

  test.beforeAll(async () => {
    await e2eDb.connect();
    programId = `e2e-biztocard-${suffix}`;
    otroProgramId = `e2e-biztocard-otro-${suffix}`;
    cardSlug = `e2e-biztocard-slug-${suffix}`;

    await e2eDb.query(`insert into "Program" (id, slug, name, "updatedAt") values ($1, $2, $3, now())`, [
      programId,
      `${programId}-slug`,
      "E2E BizToCard",
    ]);
    await e2eDb.query(`insert into "Program" (id, slug, name, "updatedAt") values ($1, $2, $3, now())`, [
      otroProgramId,
      `${otroProgramId}-slug`,
      "E2E BizToCard (otro Programa)",
    ]);

    const passwordHash = await bcrypt.hash("empleado-password-123", 10);
    const admin = await e2eDb.query<{ id: string }>(
      `insert into "Admin" (id, email, "passwordHash", "programId", role, "updatedAt") values (gen_random_uuid()::text, $1, $2, $3, 'empleado', now()) returning id`,
      [`e2e-empleado-biztocard-${suffix}@example.com`, passwordHash, programId]
    );
    employeeAdminId = admin.rows[0].id;

    const member = await e2eDb.query<{ id: string }>(
      `insert into "Member" (id, name, "updatedAt") values (gen_random_uuid()::text, $1, now()) returning id`,
      [`E2E Miembro BizToCard ${suffix}`]
    );
    memberId = member.rows[0].id;
    await e2eDb.query(
      `insert into "ProgramMembership" (id, "memberId", "programId", status, "updatedAt") values (gen_random_uuid()::text, $1, $2, 'active', now())`,
      [memberId, programId]
    );

    const card = await e2eDb.query<{ id: string }>(
      `insert into "Card" (id, slug, name, title, quote, kind, "memberId", "programId", "updatedAt")
       values (gen_random_uuid()::text, $1, '', '', '', 'personal', $2, $3, now()) returning id`,
      [cardSlug, memberId, programId]
    );
    personalCardId = card.rows[0].id;

    const otroMember = await e2eDb.query<{ id: string }>(
      `insert into "Member" (id, name, "updatedAt") values (gen_random_uuid()::text, $1, now()) returning id`,
      [`E2E Miembro Otro Programa ${suffix}`]
    );
    otroMemberId = otroMember.rows[0].id;
    await e2eDb.query(
      `insert into "ProgramMembership" (id, "memberId", "programId", status, "updatedAt") values (gen_random_uuid()::text, $1, $2, 'active', now())`,
      [otroMemberId, otroProgramId]
    );
    const otroCard = await e2eDb.query<{ id: string }>(
      `insert into "Card" (id, slug, name, title, quote, kind, "memberId", "programId", "updatedAt")
       values (gen_random_uuid()::text, $1, '', '', '', 'personal', $2, $3, now()) returning id`,
      [`e2e-biztocard-otro-slug-${suffix}`, otroMemberId, otroProgramId]
    );
    otroCardId = otroCard.rows[0].id;
  });

  test.afterAll(async () => {
    await e2eDb.query(`delete from "Card" where id = any($1)`, [[personalCardId, otroCardId]]).catch(() => {});
    await e2eDb.query(`delete from "ProgramMembership" where "programId" = any($1)`, [[programId, otroProgramId]]).catch(() => {});
    await e2eDb.query(`delete from "Admin" where id = $1`, [employeeAdminId]).catch(() => {});
    await e2eDb.query(`delete from "Member" where id = any($1)`, [[memberId, otroMemberId]]).catch(() => {});
    await e2eDb.query(`delete from "Program" where id = any($1)`, [[programId, otroProgramId]]).catch(() => {});
    await e2eDb.end();
  });

  test("el Panel de Empleados muestra el link BizToCard para una Card personal con Miembro activo", async ({ browser }) => {
    const context = await browser.newContext();
    await context.addCookies([{ ...(await mintEmployeeCookie(employeeAdminId)), url: BASE_URL }]);
    const page = await context.newPage();

    await page.goto(`${BASE_URL}/empleados`, { waitUntil: "networkidle" });
    const link = page.getByRole("link", { name: "BizToCard: tarjeta personal →" });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute("href", `/empleados/biztocard/${personalCardId}`);

    await context.close();
  });

  test("responde, salta y completa las 6 preguntas -- escribe directo en la Card", async ({ browser }) => {
    const context = await browser.newContext();
    await context.addCookies([{ ...(await mintEmployeeCookie(employeeAdminId)), url: BASE_URL }]);
    const page = await context.newPage();

    await page.goto(`${BASE_URL}/empleados/biztocard/${personalCardId}`, { waitUntil: "networkidle" });
    await expect(page.getByText("Nivel 1 · Pregunta 1 de 6")).toBeVisible();

    // Paso 0 -- nombre
    await page.locator('input[name="respuesta"]').fill("Juancho E2E");
    await page.getByRole("button", { name: "Guardar y seguir" }).click();
    await page.waitForURL(/paso=1/);

    // Paso 1 -- título
    await page.locator('input[name="respuesta"]').fill("Oreja en entrenamiento");
    await page.getByRole("button", { name: "Guardar y seguir" }).click();
    await page.waitForURL(/paso=2/);

    // Paso 2 -- frase (saltada a propósito)
    await page.getByRole("button", { name: "Prefiero no responder ahora" }).click();
    await page.waitForURL(/paso=3/);

    // Paso 3 -- whatsapp
    await page.locator('input[name="respuesta"]').fill("+52 998 000 0000");
    await page.getByRole("button", { name: "Guardar y seguir" }).click();
    await page.waitForURL(/paso=4/);

    // Paso 4 -- camino, en una frase
    await expect(page.getByText("Nivel 2 · Pregunta 5 de 6")).toBeVisible();
    await page.locator('input[name="respuesta"]').fill("Llegué por casualidad, me quedé por convicción.");
    await page.getByRole("button", { name: "Guardar y seguir" }).click();
    await page.waitForURL(/paso=5/);

    // Paso 5 -- camino, historia completa (textarea)
    await page.locator('textarea[name="respuesta"]').fill("La historia larga de cómo Juancho llegó hasta acá.");
    await page.getByRole("button", { name: "Guardar y seguir" }).click();
    await page.waitForURL(/paso=6/);

    await expect(page.getByRole("heading", { name: "Nivel 1 y 2 completos" })).toBeVisible();
    const verTarjeta = page.getByRole("link", { name: "Ver tarjeta →" });
    await expect(verTarjeta).toHaveAttribute("href", `/c/${cardSlug}`);

    const final = await e2eDb.query<{
      name: string;
      title: string;
      quote: string;
      wa: string;
      storyQuote: string;
      storyBody: string;
    }>(`select name, title, quote, wa, "storyQuote", "storyBody" from "Card" where id = $1`, [personalCardId]);
    const row = final.rows[0];
    expect(row.name).toBe("Juancho E2E");
    expect(row.title).toBe("Oreja en entrenamiento");
    expect(row.quote).toBe(""); // saltada -- nunca se escribió
    expect(row.wa).toBe("+52 998 000 0000");
    expect(row.storyQuote).toBe("Llegué por casualidad, me quedé por convicción.");
    expect(row.storyBody).toBe("La historia larga de cómo Juancho llegó hasta acá.");

    await context.close();
  });

  test("guarda real de Programa: la Oreja de un Programa no puede abrir la Card personal de otro Programa", async ({ browser }) => {
    const context = await browser.newContext();
    await context.addCookies([{ ...(await mintEmployeeCookie(employeeAdminId)), url: BASE_URL }]);
    const page = await context.newPage();

    const response = await page.goto(`${BASE_URL}/empleados/biztocard/${otroCardId}`, { waitUntil: "networkidle" });
    expect(response?.status()).toBe(404);

    await context.close();
  });
});
