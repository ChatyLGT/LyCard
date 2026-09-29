import { test, expect } from "@playwright/test";
import bcrypt from "bcryptjs";
import { createE2eDb, mintAdminCookie, mintMemberCookie } from "./helpers/adminSession";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";

// Promoción automática Chido→Programa (2026-09-24, ver PLAN.md "Modelo de
// monetización cerrado"). Un Chido (Member con membershipPaidAt seteado)
// se convierte en N0 de su propio Programa en el instante en que tiene 1+
// humano real activo bajo él -- sin que MasterN0 apruebe la promoción en
// sí como paso aparte, reusando el mismo gate que ya existía
// (completeInterviewAction). Este spec cubre el flujo real de punta a
// punta: un admin marca la entrevista del reclutado, y de ahí en más todo
// lo demás pasa solo.
test.describe("Promoción Chido→Programa", () => {
  const e2eDb = createE2eDb();
  const suffix = Date.now();
  let legacyProgramId: string;
  let chidoMemberId: string;
  let chidoMembershipId: string;
  let chidoProjectCardId: string;
  let chidoProjectCardSlug: string;
  let chidoCompanyCardId: string;
  let recruitMemberId: string;
  let recruitMembershipId: string;
  let registrationId: string;
  let adminId: string;
  let newProgramId: string | undefined;

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

    // El Chido: ya pagó, todavía sin ningún humano reclutado -- el umbral
    // no debe cruzarse todavía en este punto.
    const chido = await e2eDb.query<{ id: string }>(
      `insert into "Member" (id, whatsapp, name, "updatedAt") values (gen_random_uuid()::text, $1, $2, now()) returning id`,
      [`+52700${suffix}`, "Chido E2E Consultora"]
    );
    chidoMemberId = chido.rows[0].id;

    const chidoMembership = await e2eDb.query<{ id: string }>(
      `insert into "ProgramMembership" (id, "memberId", "programId", status, "membershipPaidAt", "updatedAt") values (gen_random_uuid()::text, $1, $2, 'active', now(), now()) returning id`,
      [chidoMemberId, legacyProgramId]
    );
    chidoMembershipId = chidoMembership.rows[0].id;

    chidoProjectCardSlug = `e2e-chido-project-${suffix}`;
    const chidoProjectCard = await e2eDb.query<{ id: string }>(
      `insert into "Card" (id, slug, "updatedAt", name, title, quote, kind, "memberId", "programId") values (gen_random_uuid()::text, $1, now(), $2, 'N0', 'cita', 'project', $3, $4) returning id`,
      [chidoProjectCardSlug, "Chido E2E Consultora", chidoMemberId, legacyProgramId]
    );
    chidoProjectCardId = chidoProjectCard.rows[0].id;

    const chidoCompanyCard = await e2eDb.query<{ id: string }>(
      `insert into "Card" (id, slug, "updatedAt", name, title, quote, kind, "memberId") values (gen_random_uuid()::text, $1, now(), $2, 'Empresa', 'cita', 'company', $3) returning id`,
      [`e2e-chido-company-${suffix}`, "Chido E2E Consultora", chidoMemberId]
    );
    chidoCompanyCardId = chidoCompanyCard.rows[0].id;

    await e2eDb.query(
      `insert into "Card" (id, slug, "updatedAt", name, title, quote, kind, "memberId") values (gen_random_uuid()::text, $1, now(), $2, '', 'cita', 'personal', $3)`,
      [`e2e-chido-personal-${suffix}`, "Chido E2E Consultora", chidoMemberId]
    );

    // El reclutado: todavía sin Cards -- las tiene que crear
    // activateMembershipAndSpawnCards cuando el admin marque su entrevista.
    const recruit = await e2eDb.query<{ id: string }>(
      `insert into "Member" (id, whatsapp, name, "updatedAt") values (gen_random_uuid()::text, $1, $2, now()) returning id`,
      [`+52701${suffix}`, "Recluta E2E"]
    );
    recruitMemberId = recruit.rows[0].id;

    const recruitMembership = await e2eDb.query<{ id: string }>(
      `insert into "ProgramMembership" (id, "memberId", "programId", "referredByMembershipId", status, "updatedAt") values (gen_random_uuid()::text, $1, $2, $3, 'invited', now()) returning id`,
      [recruitMemberId, legacyProgramId, chidoMembershipId]
    );
    recruitMembershipId = recruitMembership.rows[0].id;

    const registration = await e2eDb.query<{ id: string }>(
      `insert into "Registration" (id, "cardId", "slotId", "slotLabel", name, whatsapp, "membershipId") values (gen_random_uuid()::text, $1, 'slot-e2e', 'Slot E2E', $2, $3, $4) returning id`,
      [chidoProjectCardId, "Recluta E2E", `+52701${suffix}`, recruitMembershipId]
    );
    registrationId = registration.rows[0].id;

    const passwordHash = await bcrypt.hash("no-se-usa-login-por-cookie", 10);
    const admin = await e2eDb.query<{ id: string }>(
      `insert into "Admin" (id, email, "passwordHash", "programId", "updatedAt") values (gen_random_uuid()::text, $1, $2, null, now()) returning id`,
      [`e2e-promotion-admin-${suffix}@example.com`, passwordHash]
    );
    adminId = admin.rows[0].id;
  });

  test.afterAll(async () => {
    if (newProgramId) {
      await e2eDb.query(`delete from "Admin" where "programId" = $1`, [newProgramId]).catch(() => {});
      await e2eDb.query(`delete from "Card" where "programId" = $1`, [newProgramId]).catch(() => {});
    }
    await e2eDb.query(`delete from "Registration" where id = $1`, [registrationId]).catch(() => {});
    await e2eDb.query(`delete from "ProgramMembership" where "memberId" in ($1, $2)`, [chidoMemberId, recruitMemberId]).catch(() => {});
    await e2eDb.query(`delete from "Card" where "memberId" in ($1, $2)`, [chidoMemberId, recruitMemberId]).catch(() => {});
    await e2eDb.query(`delete from "Member" where id in ($1, $2)`, [chidoMemberId, recruitMemberId]).catch(() => {});
    await e2eDb.query(`delete from "Admin" where id = $1`, [adminId]).catch(() => {});
    if (newProgramId) {
      await e2eDb.query(`delete from "Program" where id = $1`, [newProgramId]).catch(() => {});
    }
    await e2eDb.end();
  });

  test("el admin marca la entrevista del reclutado, y el Programa del Chido nace solo -- sin aprobación aparte", async ({ browser }) => {
    const adminContext = await browser.newContext();
    const adminCookie = await mintAdminCookie(adminId);
    await adminContext.addCookies([{ ...adminCookie, url: BASE_URL }]);
    const adminPage = await adminContext.newPage();

    await adminPage.goto(`${BASE_URL}/admin/interviews`, { waitUntil: "networkidle" });
    await expect(adminPage.getByText("Recluta E2E")).toBeVisible();
    await adminPage.getByRole("button", { name: "Marcar entrevista hecha" }).click();
    await adminPage.waitForURL(/activated=1/);
    await adminContext.close();

    // El Programa nuevo existe de verdad, con el nombre de la Card de
    // company del Chido -- nadie lo creó a mano en /admin/programs.
    const companyRow = await e2eDb.query<{ programId: string | null }>(
      `select "programId" from "Card" where id = $1`,
      [chidoCompanyCardId]
    );
    expect(companyRow.rows[0].programId).not.toBeNull();
    newProgramId = companyRow.rows[0].programId!;

    const programRow = await e2eDb.query<{ name: string; slug: string }>(
      `select name, slug from "Program" where id = $1`,
      [newProgramId]
    );
    expect(programRow.rows[0].name).toBe("Chido E2E Consultora");
    expect(programRow.rows[0].slug).not.toBe("legacy");

    // El Admin nuevo está linkeado al Member del Chido -- sin password ni
    // email propios, nunca un login de Admin separado.
    const adminRow = await e2eDb.query<{ email: string | null; passwordHash: string | null; programId: string }>(
      `select email, "passwordHash", "programId" from "Admin" where "memberId" = $1`,
      [chidoMemberId]
    );
    expect(adminRow.rows).toHaveLength(1);
    expect(adminRow.rows[0].email).toBeNull();
    expect(adminRow.rows[0].passwordHash).toBeNull();
    // Regla dura (2026-09-29, ver docs/02-ARQUITECTURA.md "Regla dura:
    // quién puede volverse Admin/N0"): una promoción automática nunca
    // puede producir un MasterN0 -- afirmación explícita e independiente
    // de la de abajo, para que este test falle fuerte si algún día ese
    // invariante se rompe.
    expect(adminRow.rows[0].programId).not.toBeNull();
    expect(adminRow.rows[0].programId).toBe(newProgramId);

    // El reclutado -- membresía Y su Card de proyecto -- migró de Legacy
    // al Programa nuevo, no se quedó pegado a Legacy.
    const recruitMembershipRow = await e2eDb.query<{ programId: string }>(
      `select "programId" from "ProgramMembership" where id = $1`,
      [recruitMembershipId]
    );
    expect(recruitMembershipRow.rows[0].programId).toBe(newProgramId);

    const recruitCardRow = await e2eDb.query<{ programId: string | null }>(
      `select "programId" from "Card" where "memberId" = $1 and kind = 'project'`,
      [recruitMemberId]
    );
    expect(recruitCardRow.rows[0].programId).toBe(newProgramId);

    // La Card de proyecto vieja del Chido (su relación con Legacy) queda
    // intacta -- no se borra, sigue apuntando a Legacy.
    const chidoProjectRow = await e2eDb.query<{ programId: string }>(
      `select "programId" from "Card" where id = $1`,
      [chidoProjectCardId]
    );
    expect(chidoProjectRow.rows[0].programId).toBe(legacyProgramId);

    // El Chido, con SU sesión de Member de siempre (nunca un login de
    // Admin), ve el aviso y el link a su Programa nuevo en su dashboard.
    const memberContext = await browser.newContext();
    const memberCookie = await mintMemberCookie(chidoMemberId);
    await memberContext.addCookies([{ ...memberCookie, url: BASE_URL }]);
    const memberPage = await memberContext.newPage();

    await memberPage.goto(`${BASE_URL}/m/dashboard`, { waitUntil: "networkidle" });
    await expect(memberPage.getByText("Ya tenés tu propio Programa", { exact: false })).toBeVisible();
    await expect(memberPage.getByText("Programa Legado", { exact: false })).toBeVisible();

    // Y esa MISMA sesión de Member, sin ninguna cookie de Admin, entra
    // directo a administrar su Programa nuevo -- el puente
    // Member→Admin de lib/auth.ts en acción.
    await memberPage.goto(`${BASE_URL}/admin/programs/${newProgramId}`, { waitUntil: "networkidle" });
    await expect(memberPage.getByText("Chido E2E Consultora", { exact: false }).first()).toBeVisible();
    await expect(memberPage).not.toHaveURL(/\/admin\/login/);

    await memberContext.close();
  });
});

// El otro punto de entrada al mismo mecanismo: un Chido que YA tiene un
// referido activo antes de que alguien lo marque como pagado a mano en
// /admin/programs/[id] (markMembershipPaidAction) -- no solo el trigger de
// activateMembershipAndSpawnCards que cubre el describe de arriba. La
// promoción tiene que disparar en el instante exacto en que se marca
// "pagada", sin que haga falta ninguna entrevista nueva.
test.describe("Promoción Chido→Programa -- vía marcar como pagada", () => {
  const e2eDb = createE2eDb();
  const suffix = Date.now() + 1;
  let legacyProgramId: string;
  let chidoMemberId: string;
  let chidoMembershipId: string;
  let chidoCompanyCardId: string;
  let chidoProjectCardId: string;
  let recruitMemberId: string;
  let recruitMembershipId: string;
  let recruitProjectCardId: string;
  let adminId: string;
  let newProgramId: string | undefined;

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

    // El Chido: activo, todavía SIN pagar -- pero ya con un referido activo
    // debajo. El umbral de promoción no se cruza hasta que alguien lo
    // marque como pagado.
    const chido = await e2eDb.query<{ id: string }>(
      `insert into "Member" (id, whatsapp, name, "updatedAt") values (gen_random_uuid()::text, $1, $2, now()) returning id`,
      [`+52702${suffix}`, "Chido2 E2E SaaS"]
    );
    chidoMemberId = chido.rows[0].id;

    const chidoMembership = await e2eDb.query<{ id: string }>(
      `insert into "ProgramMembership" (id, "memberId", "programId", status, "updatedAt") values (gen_random_uuid()::text, $1, $2, 'active', now()) returning id`,
      [chidoMemberId, legacyProgramId]
    );
    chidoMembershipId = chidoMembership.rows[0].id;

    const chidoProjectCard = await e2eDb.query<{ id: string }>(
      `insert into "Card" (id, slug, "updatedAt", name, title, quote, kind, "memberId", "programId") values (gen_random_uuid()::text, $1, now(), $2, 'N0', 'cita', 'project', $3, $4) returning id`,
      [`e2e-chido2-project-${suffix}`, "Chido2 E2E SaaS", chidoMemberId, legacyProgramId]
    );
    chidoProjectCardId = chidoProjectCard.rows[0].id;

    const chidoCompanyCard = await e2eDb.query<{ id: string }>(
      `insert into "Card" (id, slug, "updatedAt", name, title, quote, kind, "memberId") values (gen_random_uuid()::text, $1, now(), $2, 'Empresa', 'cita', 'company', $3) returning id`,
      [`e2e-chido2-company-${suffix}`, "Chido2 E2E SaaS", chidoMemberId]
    );
    chidoCompanyCardId = chidoCompanyCard.rows[0].id;

    await e2eDb.query(
      `insert into "Card" (id, slug, "updatedAt", name, title, quote, kind, "memberId") values (gen_random_uuid()::text, $1, now(), $2, '', 'cita', 'personal', $3)`,
      [`e2e-chido2-personal-${suffix}`, "Chido2 E2E SaaS", chidoMemberId]
    );

    // El reclutado: YA activo -- se simula a mano el estado posterior a
    // activateMembershipAndSpawnCards, porque lo que se prueba acá es el
    // OTRO disparador (markMembershipPaidAction), no la entrevista.
    const recruit = await e2eDb.query<{ id: string }>(
      `insert into "Member" (id, whatsapp, name, "updatedAt") values (gen_random_uuid()::text, $1, $2, now()) returning id`,
      [`+52703${suffix}`, "Recluta2 E2E"]
    );
    recruitMemberId = recruit.rows[0].id;

    const recruitMembership = await e2eDb.query<{ id: string }>(
      `insert into "ProgramMembership" (id, "memberId", "programId", "referredByMembershipId", status, "updatedAt") values (gen_random_uuid()::text, $1, $2, $3, 'active', now()) returning id`,
      [recruitMemberId, legacyProgramId, chidoMembershipId]
    );
    recruitMembershipId = recruitMembership.rows[0].id;

    const recruitProjectCard = await e2eDb.query<{ id: string }>(
      `insert into "Card" (id, slug, "updatedAt", name, title, quote, kind, "memberId", "programId") values (gen_random_uuid()::text, $1, now(), $2, 'N0', 'cita', 'project', $3, $4) returning id`,
      [`e2e-recruit2-project-${suffix}`, "Recluta2 E2E", recruitMemberId, legacyProgramId]
    );
    recruitProjectCardId = recruitProjectCard.rows[0].id;

    const passwordHash = await bcrypt.hash("no-se-usa-login-por-cookie", 10);
    const admin = await e2eDb.query<{ id: string }>(
      `insert into "Admin" (id, email, "passwordHash", "programId", "updatedAt") values (gen_random_uuid()::text, $1, $2, null, now()) returning id`,
      [`e2e-promotion-paidtoggle-admin-${suffix}@example.com`, passwordHash]
    );
    adminId = admin.rows[0].id;
  });

  test.afterAll(async () => {
    if (newProgramId) {
      await e2eDb.query(`delete from "Admin" where "programId" = $1`, [newProgramId]).catch(() => {});
      await e2eDb.query(`delete from "Card" where "programId" = $1`, [newProgramId]).catch(() => {});
    }
    await e2eDb.query(`delete from "ProgramMembership" where "memberId" in ($1, $2)`, [chidoMemberId, recruitMemberId]).catch(() => {});
    await e2eDb.query(`delete from "Card" where "memberId" in ($1, $2)`, [chidoMemberId, recruitMemberId]).catch(() => {});
    await e2eDb.query(`delete from "Member" where id in ($1, $2)`, [chidoMemberId, recruitMemberId]).catch(() => {});
    await e2eDb.query(`delete from "Admin" where id = $1`, [adminId]).catch(() => {});
    if (newProgramId) {
      await e2eDb.query(`delete from "Program" where id = $1`, [newProgramId]).catch(() => {});
    }
    await e2eDb.end();
  });

  test("el admin marca la membresía como pagada desde /admin/programs/[id], y la promoción dispara ahí mismo", async ({ browser }) => {
    const adminContext = await browser.newContext();
    const adminCookie = await mintAdminCookie(adminId);
    await adminContext.addCookies([{ ...adminCookie, url: BASE_URL }]);
    const adminPage = await adminContext.newPage();

    await adminPage.goto(`${BASE_URL}/admin/programs/${legacyProgramId}`, { waitUntil: "networkidle" });
    await adminPage.getByRole("button", { name: /Miembros/ }).click();
    // El reclutado ("Recluta2 E2E") también está activo y sin pagar, así
    // que también tiene su propio botón "Marcar como pagada" -- hay que
    // acotar el click a la fila del Chido específicamente, no cualquiera.
    const chidoTitleButton = adminPage.getByRole("button", { name: /Chido2 E2E SaaS/ });
    await chidoTitleButton.click();
    const chidoRow = chidoTitleButton.locator("xpath=ancestor::div[2]");
    await chidoRow.getByRole("button", { name: "Marcar como pagada" }).click();
    await adminPage.waitForURL(/memberPaidToggled=1/);
    await adminContext.close();

    const membershipPaidRow = await e2eDb.query<{ membershipPaidAt: Date | null }>(
      `select "membershipPaidAt" from "ProgramMembership" where id = $1`,
      [chidoMembershipId]
    );
    expect(membershipPaidRow.rows[0].membershipPaidAt).not.toBeNull();

    // El Programa nuevo existe de verdad, disparado por el toggle de
    // "pagada" -- no por una entrevista nueva.
    const companyRow = await e2eDb.query<{ programId: string | null }>(
      `select "programId" from "Card" where id = $1`,
      [chidoCompanyCardId]
    );
    expect(companyRow.rows[0].programId).not.toBeNull();
    newProgramId = companyRow.rows[0].programId!;

    const programRow = await e2eDb.query<{ name: string; slug: string }>(
      `select name, slug from "Program" where id = $1`,
      [newProgramId]
    );
    expect(programRow.rows[0].name).toBe("Chido2 E2E SaaS");
    expect(programRow.rows[0].slug).not.toBe("legacy");

    const adminRow = await e2eDb.query<{ email: string | null; passwordHash: string | null; programId: string }>(
      `select email, "passwordHash", "programId" from "Admin" where "memberId" = $1`,
      [chidoMemberId]
    );
    expect(adminRow.rows).toHaveLength(1);
    expect(adminRow.rows[0].email).toBeNull();
    expect(adminRow.rows[0].passwordHash).toBeNull();
    // Regla dura (2026-09-29) -- mismo chequeo explícito que el escenario
    // de arriba, para este segundo disparador ("marcar como pagada").
    expect(adminRow.rows[0].programId).not.toBeNull();
    expect(adminRow.rows[0].programId).toBe(newProgramId);

    const recruitMembershipRow = await e2eDb.query<{ programId: string }>(
      `select "programId" from "ProgramMembership" where id = $1`,
      [recruitMembershipId]
    );
    expect(recruitMembershipRow.rows[0].programId).toBe(newProgramId);

    const recruitCardRow = await e2eDb.query<{ programId: string | null }>(
      `select "programId" from "Card" where id = $1`,
      [recruitProjectCardId]
    );
    expect(recruitCardRow.rows[0].programId).toBe(newProgramId);

    // La Card de proyecto vieja del Chido (su relación con Legacy) queda
    // intacta.
    const chidoProjectRow = await e2eDb.query<{ programId: string }>(
      `select "programId" from "Card" where id = $1`,
      [chidoProjectCardId]
    );
    expect(chidoProjectRow.rows[0].programId).toBe(legacyProgramId);
  });
});
