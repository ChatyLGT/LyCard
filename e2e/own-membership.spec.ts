import { test, expect } from "@playwright/test";
import bcrypt from "bcryptjs";
import { createE2eDb, mintEmployeeCookie } from "./helpers/adminSession";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";

// Viaje del Cliente, Fase 5 (2026-10-13) -- "un oreja tendría que ser un
// miembro también... de hecho es lo que quiero incentivar" (Gunnar): la
// estrategia real de reclutamiento. Admin.ownMemberId es puro bookkeeping
// -- NUNCA toca cookies ni resolución de auth (currentAdminScope sigue
// usando únicamente memberId, el bridge de Chido→Programa, sin tocar).
// Este spec cubre que la Oreja pueda darse de alta a sí misma como
// Member real, con sus 3 Cards, desde /empleados.
test.describe("Viaje del Cliente, Fase 5 -- la Oreja también es Member", () => {
  const e2eDb = createE2eDb();
  const suffix = Date.now();
  const PASSWORD = "empleado-password-123";
  let programId: string;
  let employeeAdminId: string;
  let employeeEmail: string;
  let ownMemberId: string | null = null;

  test.beforeAll(async () => {
    await e2eDb.connect();
    programId = `e2e-ownmember-${suffix}`;
    employeeEmail = `e2e-ownmember-empleado-${suffix}@example.com`;

    await e2eDb.query(`insert into "Program" (id, slug, name, "updatedAt") values ($1, $2, $3, now())`, [
      programId,
      `e2e-ownmember-slug-${suffix}`,
      "E2E Oreja también es Member",
    ]);

    const passwordHash = await bcrypt.hash(PASSWORD, 10);
    const admin = await e2eDb.query<{ id: string }>(
      `insert into "Admin" (id, email, "passwordHash", "programId", role, "updatedAt") values (gen_random_uuid()::text, $1, $2, $3, 'empleado', now()) returning id`,
      [employeeEmail, passwordHash, programId]
    );
    employeeAdminId = admin.rows[0].id;
  });

  test.afterAll(async () => {
    if (ownMemberId) {
      await e2eDb.query(`delete from "Card" where "memberId" = $1`, [ownMemberId]).catch(() => {});
      await e2eDb.query(`delete from "ProgramMembership" where "memberId" = $1`, [ownMemberId]).catch(() => {});
    }
    await e2eDb.query(`delete from "Admin" where id = $1`, [employeeAdminId]).catch(() => {});
    if (ownMemberId) {
      await e2eDb.query(`delete from "Member" where id = $1`, [ownMemberId]).catch(() => {});
    }
    await e2eDb.query(`delete from "Program" where id = $1`, [programId]).catch(() => {});
    await e2eDb.end();
  });

  test("la Oreja se da de alta a sí misma como Member real, con sus 3 Cards -- y el link no toca ninguna cookie/auth", async ({ browser }) => {
    const context = await browser.newContext();
    await context.addCookies([{ ...(await mintEmployeeCookie(employeeAdminId)), url: BASE_URL }]);
    const page = await context.newPage();

    await page.goto(`${BASE_URL}/empleados`, { waitUntil: "networkidle" });
    await expect(page.getByText("Date de alta como Miembro real")).toBeVisible();

    // Scopeado por data-testid -- MembersPanel.tsx también tiene un form
    // "Agregar Miembro" con los mismos name="name"/placeholder="Nombre",
    // y hasta el mismo "Email (opcional)".
    const form = page.getByTestId("own-membership-form");
    const ownName = `E2E Oreja Propia ${suffix}`;
    const ownWhatsapp = `+52 998 ${suffix.toString().slice(-7)}`;
    await form.locator('input[name="name"]').fill(ownName);
    await form.locator('input[name="whatsapp"]').fill(ownWhatsapp);
    await form.getByRole("button", { name: "Crear mi Membresía" }).click();
    await page.waitForURL(/ownMemberLinked=1/);

    await expect(page.getByText("Tu Membresía quedó creada")).toBeVisible();
    // Scopeado -- el mismo nombre también aparece como fila en
    // MembersPanel.tsx más abajo, porque la Membership creada es real y
    // vive en el mismo Programa.
    const linked = page.getByTestId("own-membership-linked");
    await expect(linked.getByText(ownName)).toBeVisible();
    await expect(linked.getByRole("link", { name: "Ver tu Card →" })).toBeVisible();
    // El form de alta ya no se muestra -- queda linkeado, no se puede
    // crear una segunda Membresía por encima.
    await expect(page.getByRole("button", { name: "Crear mi Membresía" })).toHaveCount(0);

    const row = await e2eDb.query<{ ownMemberId: string | null }>(`select "ownMemberId" from "Admin" where id = $1`, [employeeAdminId]);
    ownMemberId = row.rows[0].ownMemberId;
    expect(ownMemberId).toBeTruthy();

    const membership = await e2eDb.query<{ status: string }>(`select status from "ProgramMembership" where "memberId" = $1 and "programId" = $2`, [
      ownMemberId,
      programId,
    ]);
    expect(membership.rows[0].status).toBe("active");

    const cards = await e2eDb.query<{ kind: string }>(`select kind from "Card" where "memberId" = $1`, [ownMemberId]);
    expect(cards.rows.map((r) => r.kind).sort()).toEqual(["company", "personal", "project"]);

    // El link es puro bookkeeping -- nunca se mintió una cookie de Member
    // (lycard_member) ni de Admin "owner" (lycard_admin) para esta Oreja,
    // a pesar de que ahora tiene una Membership real detrás.
    const cookieNames = (await context.cookies()).map((c) => c.name);
    expect(cookieNames).not.toContain("lycard_member");
    expect(cookieNames).not.toContain("lycard_admin");
    expect(cookieNames).toContain("lycard_empleado");

    await context.close();
  });
});
