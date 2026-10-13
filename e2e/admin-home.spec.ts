import { test, expect } from "@playwright/test";
import bcrypt from "bcryptjs";
import { createE2eDb, mintAdminCookie } from "./helpers/adminSession";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";

// Centro de Mando (2026-10-08, pedido de Gunnar: "no tenemos un Dashboard
// donde aterrice yo y pueda ver temas de la tarjeta o el Dashboard o
// empleados o metodología") -- /admin (donde cae todo login de MasterN0
// por default) pasa de ser el Roster Legacy viejo a un hub real con 4
// tiles: Tu Tarjeta, Dashboard (el Programa isRoot), Panel de Empleados y
// Metodología (el Whitepaper ya escrito). El Roster viejo no se borra --
// baja a "Administración clásica", colapsada.
test.describe("Centro de Mando -- Home real de MasterN0", () => {
  const e2eDb = createE2eDb();
  const suffix = Date.now();
  let rootProgramId: string;
  let adminId: string;

  test.beforeAll(async () => {
    await e2eDb.connect();

    // La raíz real es única (índice único parcial sobre isRoot=true) --
    // se reusa la existente, mismo criterio que program-lineage.spec.ts.
    const existingRoot = await e2eDb.query<{ id: string }>(`select id from "Program" where "isRoot" = true`);
    if (existingRoot.rows[0]) {
      rootProgramId = existingRoot.rows[0].id;
    } else {
      const root = await e2eDb.query<{ id: string }>(
        `insert into "Program" (id, slug, name, "isRoot", "updatedAt") values (gen_random_uuid()::text, $1, 'Legacy E2E', true, now()) returning id`,
        [`e2e-home-root-${suffix}`]
      );
      rootProgramId = root.rows[0].id;
    }

    const passwordHash = await bcrypt.hash("no-se-usa-login-por-cookie", 10);
    const admin = await e2eDb.query<{ id: string }>(
      `insert into "Admin" (id, email, "passwordHash", "programId", "updatedAt") values (gen_random_uuid()::text, $1, $2, null, now()) returning id`,
      [`e2e-home-admin-${suffix}@example.com`, passwordHash]
    );
    adminId = admin.rows[0].id;
  });

  test.afterAll(async () => {
    // La raíz no se borra -- compartida con el resto de la suite.
    await e2eDb.query(`delete from "Admin" where id = $1`, [adminId]).catch(() => {});
    await e2eDb.end();
  });

  test("los 4 tiles aparecen con sus links reales, y el Roster viejo sigue andando colapsado", async ({ browser }) => {
    const context = await browser.newContext();
    await context.addCookies([{ ...(await mintAdminCookie(adminId)), url: BASE_URL }]);
    const page = await context.newPage();

    await page.goto(`${BASE_URL}/admin`, { waitUntil: "networkidle" });
    await expect(page.getByRole("heading", { name: "LyCards" })).toBeVisible();
    await expect(page.getByText("Centro de Mando")).toBeVisible();

    // Tile Tu Tarjeta -- honesto en los dos estados posibles (existe o no).
    const mastern0 = await e2eDb.query<{ slug: string }>(`select slug from "Card" where slug = 'mastern0'`);
    if (mastern0.rows[0]) {
      await expect(page.getByRole("link", { name: "Editar" }).first()).toHaveAttribute("href", "/admin/mastern0");
    } else {
      await expect(page.getByText("No existe todavía la Card mastern0.")).toBeVisible();
    }

    // Tile Dashboard -- apunta directo al Programa isRoot real.
    await expect(page.getByRole("link", { name: "Abrir Dashboard →" })).toHaveAttribute("href", `/admin/programs/${rootProgramId}`);

    // Tile Panel de Empleados -- ambos links presentes.
    await expect(page.getByRole("link", { name: "Entrar como empleado →" })).toHaveAttribute("href", "/empleados/login");
    await expect(page.getByRole("link", { name: "Crear cuenta →" })).toHaveAttribute("href", `/admin/programs/${rootProgramId}?focus=admins`);

    // Tile Metodología.
    await expect(page.getByRole("link", { name: "Leer →" })).toHaveAttribute("href", "/admin/metodologia");

    // El Roster viejo sigue ahí, solo que colapsado -- lo abrimos y el
    // form de "Nueva LyCard" sigue presente.
    await page.getByRole("button", { name: /^Administración clásica/ }).click();
    await expect(page.getByRole("heading", { name: "Nueva LyCard" })).toBeVisible();
    await expect(page.locator('input[name="name"][placeholder="Nombre completo"]')).toBeVisible();

    await context.close();
  });

  test("Tu Tarjeta también ofrece 'Configura tu LyCard', y cambia a 'Seguir configurando' con sesión existente (pedido de Gunnar, 2026-10-08)", async ({ browser }) => {
    const mastern0 = await e2eDb.query<{ id: string }>(`select id from "Card" where slug = 'mastern0'`);
    test.skip(!mastern0.rows[0], "No existe la Card mastern0 en esta DB");

    const context = await browser.newContext();
    await context.addCookies([{ ...(await mintAdminCookie(adminId)), url: BASE_URL }]);
    const page = await context.newPage();

    await page.goto(`${BASE_URL}/admin`, { waitUntil: "networkidle" });
    const btn = page.getByRole("link", { name: "Configura tu LyCard" });
    await expect(btn).toBeVisible();
    await expect(btn).toHaveAttribute("href", "/c/mastern0/asistente");
    await btn.click();
    await page.waitForURL(/\/c\/mastern0\/asistente$/);

    await page.goto(`${BASE_URL}/admin`, { waitUntil: "networkidle" });
    await expect(page.getByRole("link", { name: "Seguir configurando" })).toBeVisible();

    await context.close();
    // Limpieza propia -- la sesión creada acá no la toca el afterAll
    // del describe (que solo borra el Admin), y la FK de AssistantSession
    // no tiene onDelete: Cascade.
    await e2eDb.query(`delete from "AssistantSession" where "adminId" = $1`, [adminId]);
  });

  test("el link del tile de Empleados abre directo la sección 'Roles del equipo'", async ({ browser }) => {
    const context = await browser.newContext();
    await context.addCookies([{ ...(await mintAdminCookie(adminId)), url: BASE_URL }]);
    const page = await context.newPage();

    await page.goto(`${BASE_URL}/admin/programs/${rootProgramId}?focus=admins`, { waitUntil: "networkidle" });
    // defaultOpen por el query param -- sin tocar nada, el form de roles
    // (fusión de identidad: ya no hay alta con password) debe estar
    // visible (altura > 0, no colapsado).
    await expect(page.getByTestId("grant-role-form").locator('select[name="role"]')).toBeVisible();

    await context.close();
  });

  test("Metodología muestra el contenido real del Whitepaper, no un placeholder", async ({ browser }) => {
    const context = await browser.newContext();
    await context.addCookies([{ ...(await mintAdminCookie(adminId)), url: BASE_URL }]);
    const page = await context.newPage();

    await page.goto(`${BASE_URL}/admin/metodologia`, { waitUntil: "networkidle" });
    await expect(page.getByRole("heading", { name: "Metodología" })).toBeVisible();
    await expect(page.getByText("MENU_ACCESO_LEGACY", { exact: false })).toBeVisible();
    await expect(page.getByText("No se encontró el documento", { exact: false })).not.toBeVisible();

    await page.getByRole("link", { name: "← Centro de Mando" }).click();
    await page.waitForURL(`${BASE_URL}/admin`);

    await context.close();
  });
});
