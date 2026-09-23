import { test, expect } from "@playwright/test";
import { createE2eDb } from "./helpers/adminSession";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";

// Auditoría 2026-09-23, hallazgos 1.2/1.3/2.1 -- "Agendar tu Entrevista"
// ahora: (a) no ofrece slots ya vencidos, (b) valida el formato del email
// cuando se da uno, y (c) no duplica una Registration por el mismo
// whatsapp -- la actualiza en vez de crear una fila nueva. Este flujo es
// público (sin login), así que la prueba entra como visitante anónimo,
// tal cual lo haría alguien real desde el link de una Card.
test.describe("Agendar tu Entrevista -- correcciones de la auditoría", () => {
  const e2eDb = createE2eDb();
  let cardSlug: string;
  let cardId: string;

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

  test("no ofrece el slot vencido, rechaza un email con formato inválido, y no duplica al reagendar con el mismo whatsapp", async ({ page }) => {
    const whatsapp = `+52 998 000 ${Math.floor(Math.random() * 9000 + 1000)}`;

    await page.goto(`${BASE_URL}/c/${cardSlug}`, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Agendar tu Entrevista" }).click();

    // (a) el slot vencido ("Martes 22 de Septiembre") no debe aparecer
    await expect(page.getByText("Martes 22 de Septiembre")).toHaveCount(0);
    await expect(page.getByText("Jueves 24 de Septiembre")).toBeVisible();

    await page.getByText("Jueves 24 de Septiembre").click();
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
    expect(rows.rows[0].slotId).toBe("s2");

    // (c) el mismo whatsapp vuelve a agendar, ahora para OTRO slot -- no
    // debe crear una segunda fila, tiene que actualizar la existente
    await page.reload({ waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Agendar tu Entrevista" }).click();
    await page.getByText("Sábado 26 de Septiembre").click();
    await page.getByLabel("Nombre completo").fill("Visitante E2E");
    await page.getByLabel("WhatsApp").fill(whatsapp);
    await page.getByRole("button", { name: "Confirmar mi lugar" }).click();
    await expect(page.getByText("¡Listo! Te esperamos", { exact: false })).toBeVisible();

    rows = await e2eDb.query(`select * from "Registration" where "cardId" = $1 and whatsapp = $2`, [cardId, whatsapp]);
    expect(rows.rows.length).toBe(1); // sigue siendo una sola fila
    expect(rows.rows[0].slotId).toBe("s3"); // pero ya apunta al nuevo slot
  });
});
