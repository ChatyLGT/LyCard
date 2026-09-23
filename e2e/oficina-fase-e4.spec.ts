import { test, expect } from "@playwright/test";
import bcrypt from "bcryptjs";
import { createE2eDb, mintAdminCookie } from "./helpers/adminSession";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";

// Fase E4 de Oficina Virtual: Noticias, en la Oficina del dueño. El
// bloque "Calendario" suelto que vivía acá se sacó (2026-09-23, pedido de
// Gunnar): mostraba el mismo Card.calendarEvents que ya se ve adentro del
// Superpoder Agenda — dos veces la misma info en formato distinto. Los
// eventos siguen persistiendo (alimentan el fallback simulado de Agenda
// cuando no hay Google conectado) y sortCalendarEventsByDate sigue
// probado en lib/__tests__/oficinaExtras.test.ts — esta prueba ahora
// confirma que Noticias se ve y que el bloque suelto de Calendario NO
// vuelve a aparecer (regresión).
test.describe("Oficina Virtual — Fase E4 (Noticias)", () => {
  const e2eDb = createE2eDb();
  let cardSlug: string;
  let adminId: string;

  test.beforeAll(async () => {
    await e2eDb.connect();
    const suffix = Date.now();
    cardSlug = `e2e-fase-e4-${suffix}`;
    const soon = new Date(Date.now() + 1 * 86_400_000).toISOString();
    const later = new Date(Date.now() + 5 * 86_400_000).toISOString();

    await e2eDb.query(
      `insert into "Card" (id, slug, "updatedAt", name, title, quote, "newsItems", "calendarEvents") values (gen_random_uuid()::text, $1, now(), $2, $3, $4, $5, $6)`,
      [
        cardSlug,
        "E2E Fase E4",
        "Test Title",
        "Test Quote",
        JSON.stringify([{ id: "n1", title: "Noticia de prueba E2E", body: "Cuerpo de prueba", date: new Date().toISOString() }]),
        // A propósito en orden invertido (el evento MÁS LEJANO primero en
        // el JSON) — si la pantalla los mostrara tal cual vienen de la DB
        // en vez de ordenarlos, este test lo detecta.
        JSON.stringify([
          { id: "later", title: "Evento lejano", date: later },
          { id: "sooner", title: "Evento próximo", date: soon },
        ]),
      ]
    );

    const passwordHash = await bcrypt.hash("no-se-usa-login-por-cookie", 10);
    const admin = await e2eDb.query<{ id: string }>(
      `insert into "Admin" (id, email, "passwordHash", "programId", "updatedAt") values (gen_random_uuid()::text, $1, $2, null, now()) returning id`,
      [`e2e-mastern0-e4-${suffix}@example.com`, passwordHash]
    );
    adminId = admin.rows[0].id;
  });

  test.afterAll(async () => {
    await e2eDb.query(`delete from "Admin" where id = $1`, [adminId]).catch(() => {});
    await e2eDb.query(`delete from "Card" where slug = $1`, [cardSlug]).catch(() => {});
    await e2eDb.end();
  });

  test("el dueño ve sus noticias, y el bloque suelto de Calendario ya no está", async ({ browser }) => {
    const context = await browser.newContext();
    const cookie = await mintAdminCookie(adminId);
    await context.addCookies([{ ...cookie, url: BASE_URL }]);
    const page = await context.newPage();

    await page.goto(`${BASE_URL}/c/${cardSlug}/oficina`, { waitUntil: "networkidle" });

    await expect(page.getByText("Noticia de prueba E2E")).toBeVisible();

    // Regresión: el bloque suelto "Calendario" (Fase E4 original) se sacó
    // por duplicar el Superpoder Agenda — no debe reaparecer en la vista
    // principal de la Oficina.
    await expect(page.getByText("Evento próximo")).toHaveCount(0);
    await expect(page.getByText("Evento lejano")).toHaveCount(0);
  });

  test("un visitante (sin sesión) no ve Noticias", async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto(`${BASE_URL}/c/${cardSlug}/oficina`, { waitUntil: "networkidle" });

    await expect(page.getByText("Noticia de prueba E2E")).toHaveCount(0);

    await context.close();
  });
});
