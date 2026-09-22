import { test, expect } from "@playwright/test";
import bcrypt from "bcryptjs";
import { createE2eDb, mintAdminCookie } from "./helpers/adminSession";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";

// Fase E2 de Oficina Virtual: el editor de "Keep in Flow" (objetivo del
// día) vive adentro del form grande de EditorForm.tsx (OficinaExtrasEditor,
// sin <form> propio — ver el comentario en ese archivo sobre por qué). Esta
// prueba cierra el círculo end-to-end: escribir el objetivo en el navegador
// de verdad, guardar, y confirmar que quedó en la DB — no solo que el
// parser (lib/__tests__/oficinaExtras.test.ts) sabe leerlo.
test.describe("OficinaExtrasEditor — Keep in Flow (objetivo del día)", () => {
  const e2eDb = createE2eDb();
  let cardSlug: string;
  let adminId: string;

  test.beforeAll(async () => {
    await e2eDb.connect();
    const suffix = Date.now();
    cardSlug = `e2e-oficina-extras-${suffix}`;

    await e2eDb.query(
      `insert into "Card" (id, slug, "updatedAt", name, title, quote) values (gen_random_uuid()::text, $1, now(), $2, $3, $4)`,
      [cardSlug, "E2E Oficina Extras", "Test Title", "Test Quote"]
    );

    const passwordHash = await bcrypt.hash("no-se-usa-login-por-cookie", 10);
    const admin = await e2eDb.query<{ id: string }>(
      `insert into "Admin" (id, email, "passwordHash", "programId", "updatedAt") values (gen_random_uuid()::text, $1, $2, null, now()) returning id`,
      [`e2e-mastern0-oficina-${suffix}@example.com`, passwordHash]
    );
    adminId = admin.rows[0].id;
  });

  test.afterAll(async () => {
    await e2eDb.query(`delete from "Admin" where id = $1`, [adminId]).catch(() => {});
    await e2eDb.query(`delete from "Card" where slug = $1`, [cardSlug]).catch(() => {});
    await e2eDb.end();
  });

  test("escribir el objetivo del día, guardar, y encontrarlo persistido tras recargar", async ({ browser }) => {
    const context = await browser.newContext();
    const cookie = await mintAdminCookie(adminId);
    await context.addCookies([{ ...cookie, url: BASE_URL }]);
    const page = await context.newPage();

    await page.goto(`${BASE_URL}/admin/${cardSlug}`, { waitUntil: "networkidle" });

    // La sección arranca colapsada (AccordionSection defaultOpen=false) —
    // hay que abrirla antes de que el input sea interactuable.
    await page.getByRole("button", { name: /keep in flow/i }).click();
    await page.getByPlaceholder("Ej. Cerrar 3 Legacys nuevos esta semana").fill("Cerrar 3 Legacys esta semana");

    await page.getByRole("button", { name: "Guardar Tarjeta" }).click();
    await page.waitForURL(/saved=1/);

    const { rows } = await e2eDb.query<{ oficinaObjetivo: string }>(
      `select "oficinaObjetivo" from "Card" where slug = $1`,
      [cardSlug]
    );
    expect(rows[0].oficinaObjetivo).toBe("Cerrar 3 Legacys esta semana");

    await context.close();
  });
});
