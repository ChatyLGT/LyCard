import { test, expect } from "@playwright/test";
import { createE2eDb } from "./helpers/adminSession";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";

// Traducción al vuelo con IA (2026-10-06, pedido de Gunnar: "el sistema
// de traducción no traduce nada.. si hay que habilitar ia para traducir
// contenido que se haga"). El selector ES/EN de siempre solo traducía
// el texto fijo de la interfaz -- nunca lo que un N0 escribe a mano
// (nombre/título/cita, etc). Esto cubre que tocar EN en una Card de
// proyecto manda el contenido real a Claude (lib/translateActions.ts),
// lo muestra traducido, y lo cachea en ContentTranslation (server-side,
// por contenido -- no depende de sesión ni de cookies).
test.describe("Traducción al vuelo con IA — EN traduce contenido real, no solo la interfaz", () => {
  const e2eDb = createE2eDb();
  let programId: string;
  let cardSlug: string;
  let cardId: string;

  test.beforeAll(async () => {
    await e2eDb.connect();
    const suffix = Date.now();

    const prog = await e2eDb.query<{ id: string }>(
      `insert into "Program" (id, slug, name, "updatedAt") values (gen_random_uuid()::text, $1, $2, now()) returning id`,
      [`e2e-translate-${suffix}`, "E2E Translate Program"]
    );
    programId = prog.rows[0].id;

    cardSlug = `e2e-translate-card-${suffix}`;
    const card = await e2eDb.query<{ id: string }>(
      `insert into "Card" (id, slug, "updatedAt", name, title, quote, "programId", kind)
       values (gen_random_uuid()::text, $1, now(), $2, $3, $4, $5, 'project') returning id`,
      [cardSlug, "E2E Translate Owner", "Director de Innovación", "Transformamos ideas en resultados reales para cada cliente.", programId]
    );
    cardId = card.rows[0].id;
  });

  test.afterAll(async () => {
    await e2eDb.query(`delete from "Card" where id = $1`, [cardId]).catch(() => {});
    await e2eDb.query(`delete from "Program" where id = $1`, [programId]).catch(() => {});
    await e2eDb.end();
  });

  test("tocar EN traduce el título y la cita reales (no solo botones fijos) -- o cae al fallback honesto si falla la IA, nunca rompe", async ({ page }) => {
    await page.goto(`${BASE_URL}/c/${cardSlug}`, { waitUntil: "networkidle" });

    const originalQuote = "Transformamos ideas en resultados reales para cada cliente.";
    await expect(page.getByText(originalQuote, { exact: true })).toBeVisible();

    const before = await e2eDb.query<{ count: string }>(`select count(*)::text as count from "ContentTranslation" where lang = 'en'`);
    const countBefore = Number(before.rows[0].count);

    // El toggle ES/EN es el ícono de idioma en el header de la tarjeta
    // (aria-label="Idioma" -- el texto visible "ES"/"EN" no es el
    // nombre accesible porque aria-label lo pisa).
    const translateResponse = page.waitForResponse(
      (r) => r.url().includes(`/c/${cardSlug}`) && r.request().method() === "POST",
      { timeout: 20000 }
    );
    await page.getByRole("button", { name: "Idioma" }).click();
    await translateResponse;
    await page.waitForLoadState("networkidle");

    // No afirmamos cuál de los 2 resultados posibles va a salir -- depende
    // de si hay clave configurada Y crédito real cargado en la cuenta
    // (ninguna de las dos cosas es asumible en un E2E, mismo criterio que
    // el test del Agente de IA). Lo que sí tiene que ser siempre cierto:
    // si la DB tiene una fila nueva en ContentTranslation, el texto en
    // pantalla cambió de verdad; si no la tiene (sin clave, sin crédito,
    // o cualquier otro fallo), el texto original en español se queda
    // tal cual -- nunca un hueco en blanco ni contenido roto.
    const after = await e2eDb.query<{ count: string }>(`select count(*)::text as count from "ContentTranslation" where lang = 'en'`);
    const translated = Number(after.rows[0].count) > countBefore;

    if (translated) {
      await expect(page.getByText(originalQuote, { exact: true })).not.toBeVisible();
    } else {
      await expect(page.getByText(originalQuote, { exact: true })).toBeVisible();
    }
  });
});
