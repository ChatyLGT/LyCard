import { test, expect } from "@playwright/test";
import bcrypt from "bcryptjs";
import { createE2eDb, mintAdminCookie } from "./helpers/adminSession";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";

// Fase E5 — el ambiente de datos mock (Program.isDemo/Card.isDemo, ya
// desde Fase E1). Esta prueba es la que más le importa a Gunnar: generar
// N y borrar TODO con un solo botón, sin tocar nunca el roster real. Cada
// test usa su propio MasterN0 (programId null) para no interferir con los
// otros specs que también generan Admins — mismo patrón hermético que el
// resto de la suite.
test.describe("Ambiente de datos demo (/admin/demo-data)", () => {
  const e2eDb = createE2eDb();
  let adminId: string;

  test.beforeAll(async () => {
    await e2eDb.connect();
    const passwordHash = await bcrypt.hash("no-se-usa-login-por-cookie", 10);
    const admin = await e2eDb.query<{ id: string }>(
      `insert into "Admin" (id, email, "passwordHash", "programId", "updatedAt") values (gen_random_uuid()::text, $1, $2, null, now()) returning id`,
      [`e2e-mastern0-demodata-${Date.now()}@example.com`, passwordHash]
    );
    adminId = admin.rows[0].id;
  });

  test.afterAll(async () => {
    // Cinturón y tirantes: si algún test falla a mitad de camino, esto
    // igual deja la DB limpia de cualquier resto demo que haya quedado.
    await e2eDb.query(`delete from "Card" where "isDemo" = true`).catch(() => {});
    await e2eDb.query(`delete from "Program" where "isDemo" = true`).catch(() => {});
    await e2eDb.query(`delete from "Admin" where id = $1`, [adminId]).catch(() => {});
    await e2eDb.end();
  });

  test("generar N Programas demo, verlos en el roster con la etiqueta DEMO, y borrar todo con un botón", async ({ browser }) => {
    const context = await browser.newContext();
    const cookie = await mintAdminCookie(adminId);
    await context.addCookies([{ ...cookie, url: BASE_URL }]);
    const page = await context.newPage();

    // 1. Generar 2 Programas demo (2 Programas x 3 Cards = 6 Cards).
    await page.goto(`${BASE_URL}/admin/demo-data`, { waitUntil: "networkidle" });
    await page.fill('input[name="count"]', "2");
    await page.getByRole("button", { name: "Generar" }).click();
    await page.waitForURL(/generated=2/);

    const { rows: afterGenerate } = await e2eDb.query<{ programs: string; cards: string }>(
      `select (select count(*) from "Program" where "isDemo" = true)::text as programs, (select count(*) from "Card" where "isDemo" = true)::text as cards`
    );
    expect(afterGenerate[0].programs).toBe("2");
    expect(afterGenerate[0].cards).toBe("6");

    // 2. Aparecen en el roster real, marcados como DEMO.
    await page.goto(`${BASE_URL}/admin`, { waitUntil: "networkidle" });
    await expect(page.getByText("DEMO").first()).toBeVisible();

    // 3. Un intento de borrar con la frase equivocada no borra nada.
    await page.goto(`${BASE_URL}/admin/demo-data`, { waitUntil: "networkidle" });
    await page.fill('input[name="confirm"]', "no es la frase");
    await page.getByRole("button", { name: "Borrar todo lo demo" }).click();
    await page.waitForURL(/error=confirm/);
    const { rows: afterBadConfirm } = await e2eDb.query<{ count: string }>(
      `select count(*)::text from "Program" where "isDemo" = true`
    );
    expect(afterBadConfirm[0].count).toBe("2");

    // 4. Con la frase correcta, borra TODO lo demo de un tirón.
    await page.fill('input[name="confirm"]', "BORRAR DEMO");
    await page.getByRole("button", { name: "Borrar todo lo demo" }).click();
    await page.waitForURL(/deleted=1/);

    const { rows: afterDelete } = await e2eDb.query<{ programs: string; cards: string }>(
      `select (select count(*) from "Program" where "isDemo" = true)::text as programs, (select count(*) from "Card" where "isDemo" = true)::text as cards`
    );
    expect(afterDelete[0].programs).toBe("0");
    expect(afterDelete[0].cards).toBe("0");

    await context.close();
  });
});
