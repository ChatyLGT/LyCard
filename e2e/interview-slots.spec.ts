import { test, expect } from "@playwright/test";
import { createE2eDb } from "./helpers/adminSession";
import { generateLegacySlots } from "../lib/interviewSlots";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";

// Auditoría 2026-09-23, hallazgos 1.2/1.3/2.1 -- "Agendar tu Entrevista"
// ahora: (a) no ofrece slots ya vencidos, (b) valida el formato del email
// cuando se da uno, y (c) no duplica una Registration por el mismo
// whatsapp -- la actualiza en vez de crear una fila nueva. Este flujo es
// público (sin login), así que la prueba entra como visitante anónimo,
// tal cual lo haría alguien real desde el link de una Card.
//
// Reescrito 2026-10-02: los slots eran 4 fechas de calendario fijas que
// quedaron vencidas con el tiempo real (lib/interviewSlots.ts ahora las
// genera relativas a "ahora", ver PLAN.md) -- esta prueba ya no puede
// hardcodear los labels en español, los calcula con la misma función que
// usa la app.
test.describe("Agendar tu Entrevista -- correcciones de la auditoría", () => {
  const e2eDb = createE2eDb();
  let cardSlug: string;
  let cardId: string;
  const slots = generateLegacySlots();

  test.beforeAll(async () => {
    await e2eDb.connect();
    const suffix = Date.now();
    cardSlug = `e2e-slots-${suffix}`;
    const card = await e2eDb.query<{ id: string }>(
      `insert into "Card" (id, slug, "updatedAt", name, title, quote, kind) values (gen_random_uuid()::text, $1, now(), $2, $3, $4, 'project') returning id`,
      [cardSlug, "E2E Slots", "N/A", "cita"]
    );
    cardId = card.rows[0].id;
  });

  test.afterAll(async () => {
    await e2eDb.query(`delete from "Registration" where "cardId" = $1`, [cardId]).catch(() => {});
    await e2eDb.query(`delete from "CardLead" where "cardId" = $1`, [cardId]).catch(() => {});
    await e2eDb.query(`delete from "Card" where id = $1`, [cardId]).catch(() => {});
    await e2eDb.end();
  });

  test("ofrece solo slots a futuro, rechaza un email con formato inválido, y no duplica al reagendar con el mismo whatsapp", async ({ page }) => {
    const whatsapp = `+52 998 000 ${Math.floor(Math.random() * 9000 + 1000)}`;

    await page.goto(`${BASE_URL}/c/${cardSlug}`, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Agendar tu Entrevista" }).click();

    // (a) los 4 slots generados están, todos a futuro por construcción
    for (const s of slots) {
      await expect(page.getByText(s.label)).toBeVisible();
    }

    await page.getByText(slots[1].label).click();
    await page.getByLabel("Nombre completo").fill("Visitante E2E");
    await page.getByLabel("WhatsApp").fill(whatsapp);

    // (b) email con formato inválido -- el server lo rechaza, no debe
    // llegar a la pantalla de éxito
    await page.getByLabel("Correo (opcional)").fill("no-es-un-email");
    await page.getByRole("button", { name: "Confirmar mi lugar" }).click();
    await expect(page.getByText("¡Listo! Te esperamos", { exact: false })).toHaveCount(0);

    let rows = await e2eDb.query(`select * from "Registration" where "cardId" = $1 and whatsapp = $2`, [cardId, whatsapp]);
    expect(rows.rows.length).toBe(0);

    // corrijo el email y reintento -- ahora sí debe entrar
    await page.getByLabel("Correo (opcional)").fill("visitante@example.com");
    await page.getByRole("button", { name: "Confirmar mi lugar" }).click();
    await expect(page.getByText("¡Listo! Te esperamos", { exact: false })).toBeVisible();

    rows = await e2eDb.query(`select * from "Registration" where "cardId" = $1 and whatsapp = $2`, [cardId, whatsapp]);
    expect(rows.rows.length).toBe(1);
    expect(rows.rows[0].slotId).toBe(slots[1].id);

    // (c) el mismo whatsapp vuelve a agendar, ahora para OTRO slot -- no
    // debe crear una segunda fila, tiene que actualizar la existente
    await page.reload({ waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Agendar tu Entrevista" }).click();
    await page.getByText(slots[2].label).click();
    await page.getByLabel("Nombre completo").fill("Visitante E2E");
    await page.getByLabel("WhatsApp").fill(whatsapp);
    await page.getByRole("button", { name: "Confirmar mi lugar" }).click();
    await expect(page.getByText("¡Listo! Te esperamos", { exact: false })).toBeVisible();

    rows = await e2eDb.query(`select * from "Registration" where "cardId" = $1 and whatsapp = $2`, [cardId, whatsapp]);
    expect(rows.rows.length).toBe(1); // sigue siendo una sola fila
    expect(rows.rows[0].slotId).toBe(slots[2].id); // pero ya apunta al nuevo slot
  });
});
