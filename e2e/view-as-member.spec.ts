import { test, expect } from "@playwright/test";
import bcrypt from "bcryptjs";
import { createE2eDb, mintAdminCookie } from "./helpers/adminSession";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";

// "Entrar como este Miembro" (2026-10-06, pedido de Gunnar: "necesito que
// todas las pantallas sean accesibles en el Dashboard"). El hueco real:
// un Admin clásico (login por contraseña) nunca tiene sesión de Member
// propia -- /m/dashboard y todo lo que cuelga de ahí (WowStore, WowHead,
// Mensajes) le era literalmente invisible, sin ningún link de entrada.
// Este botón, en la sección "Miembros" de /admin/programs/[id], mintea
// una sesión de Member real para ese Miembro puntual y manda al N0 a su
// /m/dashboard -- cubre que de verdad entra ahí, Y que la sesión propia
// de Admin sigue intacta después (no se pisan entre sí).
test.describe("Entrar como este Miembro — acceso real a /m/dashboard desde el Admin", () => {
  const e2eDb = createE2eDb();
  let programId: string;
  let adminId: string;
  let memberId: string;
  let cardId: string;

  test.beforeAll(async () => {
    await e2eDb.connect();
    const suffix = Date.now();

    const prog = await e2eDb.query<{ id: string }>(
      `insert into "Program" (id, slug, name, "updatedAt") values (gen_random_uuid()::text, $1, $2, now()) returning id`,
      [`e2e-viewas-${suffix}`, "E2E ViewAs Program"]
    );
    programId = prog.rows[0].id;

    const passwordHash = await bcrypt.hash("no-se-usa-login-por-cookie", 10);
    const admin = await e2eDb.query<{ id: string }>(
      `insert into "Admin" (id, email, "passwordHash", "programId", "updatedAt") values (gen_random_uuid()::text, $1, $2, $3, now()) returning id`,
      [`e2e-viewas-admin-${suffix}@example.com`, passwordHash, programId]
    );
    adminId = admin.rows[0].id;

    const member = await e2eDb.query<{ id: string }>(
      `insert into "Member" (id, whatsapp, name, "updatedAt") values (gen_random_uuid()::text, $1, $2, now()) returning id`,
      [`+52777${suffix}`, "Miembro E2E ViewAs"]
    );
    memberId = member.rows[0].id;

    await e2eDb.query(
      `insert into "ProgramMembership" (id, "memberId", "programId", status, "updatedAt") values (gen_random_uuid()::text, $1, $2, 'active', now())`,
      [memberId, programId]
    );

    const card = await e2eDb.query<{ id: string }>(
      `insert into "Card" (id, slug, "updatedAt", name, title, quote, kind, "memberId", "programId") values (gen_random_uuid()::text, $1, now(), $2, 'N/A', 'cita', 'company', $3, $4) returning id`,
      [`e2e-viewas-card-${suffix}`, "Miembro E2E ViewAs", memberId, programId]
    );
    cardId = card.rows[0].id;
  });

  test.afterAll(async () => {
    await e2eDb.query(`delete from "Card" where id = $1`, [cardId]).catch(() => {});
    await e2eDb.query(`delete from "ProgramMembership" where "memberId" = $1`, [memberId]).catch(() => {});
    await e2eDb.query(`delete from "Member" where id = $1`, [memberId]).catch(() => {});
    await e2eDb.query(`delete from "Admin" where id = $1`, [adminId]).catch(() => {});
    await e2eDb.query(`delete from "Program" where id = $1`, [programId]).catch(() => {});
    await e2eDb.end();
  });

  test("el N0 entra de verdad al /m/dashboard de un Miembro, y conserva su propia sesión de Admin después", async ({ browser }) => {
    const context = await browser.newContext();
    const cookie = await mintAdminCookie(adminId);
    await context.addCookies([{ ...cookie, url: BASE_URL }]);
    const page = await context.newPage();

    await page.goto(`${BASE_URL}/admin/programs/${programId}`, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: /^Miembros/ }).click();
    await page.getByRole("button", { name: "Miembro E2E ViewAs" }).click();

    await page.getByRole("button", { name: "Entrar como este Miembro →" }).click();

    await page.waitForURL(`${BASE_URL}/m/dashboard`);
    await expect(page.getByRole("heading", { name: "Hola, Miembro E2E ViewAs" })).toBeVisible();

    // La sesión propia de Admin sigue intacta -- no se perdió al entrar
    // como el Miembro (cookies distintas, ver lib/memberAuth.ts).
    await page.goto(`${BASE_URL}/admin/programs/${programId}`, { waitUntil: "networkidle" });
    await expect(page).toHaveURL(`${BASE_URL}/admin/programs/${programId}`);
    await expect(page.getByRole("heading", { name: "E2E ViewAs Program" })).toBeVisible();

    await context.close();
  });
});
