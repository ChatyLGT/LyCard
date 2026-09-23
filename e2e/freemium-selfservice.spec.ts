import { test, expect } from "@playwright/test";
import bcrypt from "bcryptjs";
import { createE2eDb, mintAdminCookie } from "./helpers/adminSession";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";

// Alta Freemium self-service (2026-09-23, pedido de Gunnar: "el registro
// Freemium no debería necesitar aprobación de nadie. Cualquier persona
// puede registrarse"). Antes de esto, "Crear tu LyCard" llevaba a
// /m/login -> verifyOtpAction, que solo creaba el Member y la sesión --
// nunca lo unía a Legacy ni le creaba sus 3 Cards (ese único camino real
// era completeInterviewAction, gateado por un admin en /admin/interviews).
// Este spec confirma el flujo real de punta a punta: un visitante ve la
// LyCard de un Host, toca "Creá tu LyCard", el ?ref= viaja hasta el login,
// y al verificar el OTP queda con sus 3 Cards YA CREADAS, sin que nadie
// del lado admin toque nada -- más el referral (OriginMemento) apuntando
// al Host que lo trajo.
test.describe("Alta Freemium self-service — Crear tu LyCard sin aprobación", () => {
  const e2eDb = createE2eDb();
  const suffix = Date.now();
  const referrerCardSlug = `e2e-ref-${suffix}`;
  const newWhatsapp = `+52555${suffix}`;
  let legacyProgramId: string;
  let referrerMemberId: string;
  let newMemberId: string | undefined;

  test.beforeAll(async () => {
    await e2eDb.connect();

    const existing = await e2eDb.query<{ id: string }>(`select id from "Program" where slug = 'legacy'`);
    if (existing.rows[0]) {
      legacyProgramId = existing.rows[0].id;
    } else {
      const program = await e2eDb.query<{ id: string }>(
        `insert into "Program" (id, slug, name, "updatedAt") values (gen_random_uuid()::text, 'legacy', 'Legacy', now()) returning id`
      );
      legacyProgramId = program.rows[0].id;
    }

    const referrer = await e2eDb.query<{ id: string }>(
      `insert into "Member" (id, whatsapp, name, "updatedAt") values (gen_random_uuid()::text, $1, $2, now()) returning id`,
      [`+52444${suffix}`, "Host E2E Referente"]
    );
    referrerMemberId = referrer.rows[0].id;

    await e2eDb.query(
      `insert into "ProgramMembership" (id, "memberId", "programId", status, "updatedAt") values (gen_random_uuid()::text, $1, $2, 'active', now())`,
      [referrerMemberId, legacyProgramId]
    );

    await e2eDb.query(
      `insert into "Card" (id, slug, "updatedAt", name, title, quote, kind, "memberId", "programId") values (gen_random_uuid()::text, $1, now(), $2, 'Fundador', 'cita', 'project', $3, $4)`,
      [referrerCardSlug, "Host E2E Referente", referrerMemberId, legacyProgramId]
    );
  });

  test.afterAll(async () => {
    if (newMemberId) {
      await e2eDb.query(`delete from "OriginMemento" where "memberId" = $1`, [newMemberId]).catch(() => {});
      await e2eDb.query(`delete from "Card" where "memberId" = $1`, [newMemberId]).catch(() => {});
      await e2eDb.query(`delete from "ProgramMembership" where "memberId" = $1`, [newMemberId]).catch(() => {});
      await e2eDb.query(`delete from "Member" where id = $1`, [newMemberId]).catch(() => {});
    }
    await e2eDb.query(`delete from "Card" where slug = $1`, [referrerCardSlug]).catch(() => {});
    await e2eDb.query(`delete from "ProgramMembership" where "memberId" = $1`, [referrerMemberId]).catch(() => {});
    await e2eDb.query(`delete from "Member" where id = $1`, [referrerMemberId]).catch(() => {});
    await e2eDb.end();
  });

  test("visitante ve la LyCard del Host, se registra por WhatsApp OTP, y queda con sus 3 Cards + referido sin que nadie apruebe nada", async ({ page }) => {
    await page.goto(`${BASE_URL}/c/${referrerCardSlug}`, { waitUntil: "networkidle" });

    const createLink = page.getByRole("link", { name: "Creá tu LyCard" });
    await expect(createLink).toBeVisible();
    await expect(createLink).toHaveAttribute("href", `/m/login?ref=${referrerCardSlug}`);
    await createLink.click();

    await expect(page).toHaveURL(new RegExp(`/m/login\\?ref=${referrerCardSlug}`));

    await page.getByPlaceholder("+52 998 000 0000").fill(newWhatsapp);
    await page.getByRole("button", { name: "Enviar código" }).click();

    const codeEl = page.locator("span", { hasText: /^\d{6}$/ });
    await expect(codeEl).toBeVisible();
    const code = (await codeEl.textContent())?.trim() ?? "";
    expect(code).toMatch(/^\d{6}$/);

    await page.getByLabel("Código").fill(code);
    await page.getByLabel("Tu nombre (si es la primera vez)").fill("Visitante E2E");
    await page.getByRole("button", { name: "Confirmar" }).click();

    await expect(page).toHaveURL(`${BASE_URL}/m/dashboard`);
    await expect(page.getByText("Proyecto", { exact: true })).toBeVisible();
    await expect(page.getByText("Empresa", { exact: true })).toBeVisible();
    await expect(page.getByText("Personal", { exact: true })).toBeVisible();
    await expect(page.getByText("Volvé a entrar con tu WhatsApp")).toHaveCount(0);

    const memberRow = await e2eDb.query<{ id: string }>(`select id from "Member" where whatsapp = $1`, [newWhatsapp]);
    expect(memberRow.rows).toHaveLength(1);
    newMemberId = memberRow.rows[0].id;

    const membershipRow = await e2eDb.query<{ status: string; interviewedAt: string | null }>(
      `select status, "interviewedAt" from "ProgramMembership" where "memberId" = $1 and "programId" = $2`,
      [newMemberId, legacyProgramId]
    );
    expect(membershipRow.rows).toHaveLength(1);
    // Autoservicio, no una entrevista real -- nunca debe contar para el
    // Embudo (lib/funnel.ts) como "Entrevistado".
    expect(membershipRow.rows[0].status).toBe("active");
    expect(membershipRow.rows[0].interviewedAt).toBeNull();

    const cardsRow = await e2eDb.query<{ kind: string }>(`select kind from "Card" where "memberId" = $1`, [newMemberId]);
    expect(cardsRow.rows.map((r) => r.kind).sort()).toEqual(["company", "personal", "project"]);

    const mementoRow = await e2eDb.query<{ snapshot: { referrerCardSlug: string; referrerName: string } }>(
      `select snapshot from "OriginMemento" where "memberId" = $1`,
      [newMemberId]
    );
    expect(mementoRow.rows).toHaveLength(1);
    expect(mementoRow.rows[0].snapshot.referrerCardSlug).toBe(referrerCardSlug);
    expect(mementoRow.rows[0].snapshot.referrerName).toBe("Host E2E Referente");
  });

  test("un segundo login del mismo Member no duplica sus Cards (idempotente)", async ({ page }) => {
    expect(newMemberId, "depende del test anterior para tener un Member ya creado").toBeTruthy();

    await page.goto(`${BASE_URL}/m/login`, { waitUntil: "networkidle" });
    await page.getByPlaceholder("+52 998 000 0000").fill(newWhatsapp);
    await page.getByRole("button", { name: "Enviar código" }).click();

    const codeEl = page.locator("span", { hasText: /^\d{6}$/ });
    const code = (await codeEl.textContent())?.trim() ?? "";
    await page.getByLabel("Código").fill(code);
    await page.getByRole("button", { name: "Confirmar" }).click();

    await expect(page).toHaveURL(`${BASE_URL}/m/dashboard`);

    const cardsRow = await e2eDb.query<{ kind: string }>(`select kind from "Card" where "memberId" = $1`, [newMemberId]);
    expect(cardsRow.rows).toHaveLength(3);
  });
});

// El refactor de completeInterviewAction (2026-09-23, extrajo su lógica a
// lib/activateMembership.ts para reusarla acá arriba) no tenía ningún E2E
// propio que lo cubriera -- este confirma que el camino real de la
// entrevista (admin la marca hecha a mano) sigue funcionando igual que
// antes, con la única diferencia real: interviewedAt SÍ queda seteado acá
// (a diferencia del alta Freemium self-service), porque esto es lo único
// que debe contar para el Embudo (lib/funnel.ts).
test.describe("completeInterviewAction (admin) sigue activando membresía + creando 3 Cards tras el refactor", () => {
  const e2eDb = createE2eDb();
  const suffix = Date.now();
  const hostCardSlug = `e2e-interview-host-${suffix}`;
  let legacyProgramId: string;
  let memberId: string;
  let adminId: string;
  let registrationId: string;

  test.beforeAll(async () => {
    await e2eDb.connect();

    const existing = await e2eDb.query<{ id: string }>(`select id from "Program" where slug = 'legacy'`);
    if (existing.rows[0]) {
      legacyProgramId = existing.rows[0].id;
    } else {
      const program = await e2eDb.query<{ id: string }>(
        `insert into "Program" (id, slug, name, "updatedAt") values (gen_random_uuid()::text, 'legacy', 'Legacy', now()) returning id`
      );
      legacyProgramId = program.rows[0].id;
    }

    const member = await e2eDb.query<{ id: string }>(
      `insert into "Member" (id, whatsapp, name, "updatedAt") values (gen_random_uuid()::text, $1, $2, now()) returning id`,
      [`+52333${suffix}`, "Entrevistado E2E"]
    );
    memberId = member.rows[0].id;

    const membership = await e2eDb.query<{ id: string }>(
      `insert into "ProgramMembership" (id, "memberId", "programId", status, "updatedAt") values (gen_random_uuid()::text, $1, $2, 'invited', now()) returning id`,
      [memberId, legacyProgramId]
    );

    const hostCard = await e2eDb.query<{ id: string }>(
      `insert into "Card" (id, slug, "updatedAt", name, title, quote) values (gen_random_uuid()::text, $1, now(), $2, 'N/A', 'cita') returning id`,
      [hostCardSlug, "Card para inscripción E2E"]
    );

    const registration = await e2eDb.query<{ id: string }>(
      `insert into "Registration" (id, "cardId", "slotId", "slotLabel", name, whatsapp, "membershipId") values (gen_random_uuid()::text, $1, 'slot-e2e', 'Slot E2E', $2, $3, $4) returning id`,
      [hostCard.rows[0].id, "Entrevistado E2E", `+52333${suffix}`, membership.rows[0].id]
    );
    registrationId = registration.rows[0].id;

    const passwordHash = await bcrypt.hash("no-se-usa-login-por-cookie", 10);
    const admin = await e2eDb.query<{ id: string }>(
      `insert into "Admin" (id, email, "passwordHash", "programId", "updatedAt") values (gen_random_uuid()::text, $1, $2, null, now()) returning id`,
      [`e2e-interview-admin-${suffix}@example.com`, passwordHash]
    );
    adminId = admin.rows[0].id;
  });

  test.afterAll(async () => {
    await e2eDb.query(`delete from "Card" where "memberId" = $1`, [memberId]).catch(() => {});
    await e2eDb.query(`delete from "Registration" where id = $1`, [registrationId]).catch(() => {});
    await e2eDb.query(`delete from "Card" where slug = $1`, [hostCardSlug]).catch(() => {});
    await e2eDb.query(`delete from "ProgramMembership" where "memberId" = $1`, [memberId]).catch(() => {});
    await e2eDb.query(`delete from "Member" where id = $1`, [memberId]).catch(() => {});
    await e2eDb.query(`delete from "Admin" where id = $1`, [adminId]).catch(() => {});
    await e2eDb.end();
  });

  test("el admin marca la entrevista hecha, la membresía queda activa con interviewedAt, y se crean las 3 Cards", async ({ browser }) => {
    const context = await browser.newContext();
    const cookie = await mintAdminCookie(adminId);
    await context.addCookies([{ ...cookie, url: BASE_URL }]);
    const page = await context.newPage();

    await page.goto(`${BASE_URL}/admin/interviews`, { waitUntil: "networkidle" });
    await expect(page.getByText("Entrevistado E2E")).toBeVisible();

    await page.getByRole("button", { name: "Marcar entrevista hecha" }).click();
    await page.waitForURL(/activated=1/);

    const membershipRow = await e2eDb.query<{ status: string; interviewedAt: string | null }>(
      `select status, "interviewedAt" from "ProgramMembership" where "memberId" = $1`,
      [memberId]
    );
    expect(membershipRow.rows[0].status).toBe("active");
    expect(membershipRow.rows[0].interviewedAt).not.toBeNull();

    const cardsRow = await e2eDb.query<{ kind: string }>(`select kind from "Card" where "memberId" = $1`, [memberId]);
    expect(cardsRow.rows.map((r) => r.kind).sort()).toEqual(["company", "personal", "project"]);

    await context.close();
  });
});
