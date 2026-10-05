import { test, expect } from "@playwright/test";
import { createE2eDb, mintMemberCookie } from "./helpers/adminSession";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";

// "Viaje del cliente" (2026-10-05, pedido de Gunnar) -- 3 piezas nuevas de
// la taxonomía de visitantes: la pantalla Mirón/NA en la raíz, el gate de
// palabra secreta a nivel de Card completa para Invitado/Visitante
// Especial, y el botón self-service "Convertir en Programa" en el
// dashboard del Member (caso Juancho/Digital Kingdom).
//
// Mirón/NA, segunda vuelta (2026-10-05, corrección de Gunnar sobre el
// primer intento -- una página aparte, MironLanding.tsx, ya borrada:
// "esto debería salir en vez del qr en la tarjeta del visitante.. el que
// viene de la nada"): la raíz ahora renderiza la Card Origen REAL vía el
// mismo LyCardView de siempre (isHost forzado a false, nadie edita nada),
// con el cubo central QR reemplazado por uno que abre un modal con
// escanear-QR + lista de Programas activos.
test.describe("Mirón/NA -- raíz sin host", () => {
  const e2eDb = createE2eDb();
  const suffix = Date.now() + 2;
  let originCardName: string;
  let naProgramId: string;

  test.beforeAll(async () => {
    await e2eDb.connect();

    const origin = await e2eDb.query<{ name: string }>(`select name from "Card" where "isOrigin" = true limit 1`);
    originCardName = origin.rows[0]?.name ?? "";

    const program = await e2eDb.query<{ id: string }>(
      `insert into "Program" (id, slug, name, active, "updatedAt") values (gen_random_uuid()::text, $1, $2, true, now()) returning id`,
      [`e2e-na-program-${suffix}`, "Programa E2E NA"]
    );
    naProgramId = program.rows[0].id;
    await e2eDb.query(
      `insert into "Card" (id, slug, "updatedAt", name, title, quote, kind, "programId") values (gen_random_uuid()::text, $1, now(), 'Programa E2E NA', 'N0', 'cita', 'project', $2)`,
      [`e2e-na-card-${suffix}`, naProgramId]
    );
  });

  test.afterAll(async () => {
    await e2eDb.query(`delete from "Card" where "programId" = $1`, [naProgramId]).catch(() => {});
    await e2eDb.query(`delete from "Program" where id = $1`, [naProgramId]).catch(() => {});
    await e2eDb.end();
  });

  test("sin ningún contexto de host, la raíz muestra la Card Origen real, no editable, con el cubo QR reemplazado", async ({ page }) => {
    await page.goto(`${BASE_URL}/`, { waitUntil: "networkidle" });

    // Es la Card Origen real -- no una pantalla bespoke con copy propio.
    if (originCardName) {
      await expect(page.getByRole("heading", { name: originCardName })).toBeVisible();
    }

    // No editable para nadie: el ícono de arriba manda a login, no a
    // /admin/[slug] (ver LyCardView.tsx, `badge === "NA"`).
    await expect(page.getByRole("link", { name: "Iniciar sesión" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Personalizar mi LyCard" })).not.toBeVisible();

    // El cubo central es el de escanear/elegir Programa, no el QR real ni
    // "Crea Tu LyCard".
    await expect(page.getByRole("button", { name: "Escanear QR o elegir Programa" })).toBeVisible();
    await page.getByRole("button", { name: "Escanear QR o elegir Programa" }).click();

    await expect(page.getByText("Escanear o elegir Programa", { exact: false })).toBeVisible();
    await expect(page.getByRole("button", { name: /Escanear QR$/ })).toBeVisible();
    await expect(page.getByRole("link", { name: "Programa E2E NA" })).toBeVisible();
  });
});

test.describe("Gate de palabra secreta -- tarjeta completa de Invitado Especial", () => {
  const e2eDb = createE2eDb();
  const suffix = Date.now();
  let cardId: string;
  let cardSlug: string;
  let recipientSlug: string;

  test.beforeAll(async () => {
    await e2eDb.connect();
    cardSlug = `e2e-gate-host-${suffix}`;
    const card = await e2eDb.query<{ id: string }>(
      `insert into "Card" (id, slug, "updatedAt", name, title, quote, kind) values (gen_random_uuid()::text, $1, now(), 'Host E2E', 'N0', 'cita', 'project') returning id`,
      [cardSlug]
    );
    cardId = card.rows[0].id;

    recipientSlug = "gloria";
    await e2eDb.query(
      `insert into "CardRecipient" (id, "cardId", slug, nombre, "palabraSecreta", "updatedAt") values (gen_random_uuid()::text, $1, $2, 'Gloria', 'laberinto', now())`,
      [cardId, recipientSlug]
    );
  });

  test.afterAll(async () => {
    await e2eDb.query(`delete from "Card" where id = $1`, [cardId]).catch(() => {});
    await e2eDb.end();
  });

  test("sin desbloquear no se ve la tarjeta; palabra incorrecta la mantiene cerrada; la correcta la abre y queda recordada", async ({ page }) => {
    const url = `${BASE_URL}/c/${cardSlug}?para=${recipientSlug}`;

    await page.goto(url, { waitUntil: "networkidle" });
    await expect(page.getByText("Para Gloria")).toBeVisible();
    await expect(page.getByText("Host E2E")).not.toBeVisible();

    await page.getByPlaceholder("Palabra secreta").fill("incorrecta");
    await page.getByRole("button", { name: "Abrir mi tarjeta" }).click();
    await page.waitForURL(/gateError=wrong/);
    await expect(page.getByText("Esa no es", { exact: false })).toBeVisible();

    await page.getByPlaceholder("Palabra secreta").fill("laberinto");
    await page.getByRole("button", { name: "Abrir mi tarjeta" }).click();
    await page.waitForURL((u) => !u.toString().includes("gateError"));
    await expect(page.getByRole("heading", { name: "Host E2E" })).toBeVisible();

    // La cookie queda -- recargar la misma URL no vuelve a pedir la palabra.
    await page.reload({ waitUntil: "networkidle" });
    await expect(page.getByRole("heading", { name: "Host E2E" })).toBeVisible();
    await expect(page.getByPlaceholder("Palabra secreta")).not.toBeVisible();
  });
});

test.describe("Convertir en Programa -- self-service, mismo gate honesto de siempre", () => {
  const e2eDb = createE2eDb();
  const suffix = Date.now() + 1;
  let legacyProgramId: string;
  let memberId: string;
  let membershipId: string;

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
      [`+52799${suffix}`, "Juancho E2E"]
    );
    memberId = member.rows[0].id;

    const membership = await e2eDb.query<{ id: string }>(
      `insert into "ProgramMembership" (id, "memberId", "programId", status, "updatedAt") values (gen_random_uuid()::text, $1, $2, 'active', now()) returning id`,
      [memberId, legacyProgramId]
    );
    membershipId = membership.rows[0].id;

    await e2eDb.query(
      `insert into "Card" (id, slug, "updatedAt", name, title, quote, kind, "memberId") values (gen_random_uuid()::text, $1, now(), $2, 'Empresa', 'cita', 'company', $3)`,
      [`e2e-juancho-company-${suffix}`, "Digital Kingdom", memberId]
    );
    await e2eDb.query(
      `insert into "Card" (id, slug, "updatedAt", name, title, quote, kind, "memberId", "programId") values (gen_random_uuid()::text, $1, now(), $2, 'N0', 'cita', 'project', $3, $4)`,
      [`e2e-juancho-project-${suffix}`, "Juancho E2E", memberId, legacyProgramId]
    );
  });

  test.afterAll(async () => {
    const admin = await e2eDb.query<{ programId: string | null }>(`select "programId" from "Admin" where "memberId" = $1`, [memberId]).catch(() => ({ rows: [] }) as { rows: { programId: string | null }[] });
    const newProgramId = admin.rows[0]?.programId;
    if (newProgramId) {
      await e2eDb.query(`delete from "Admin" where "programId" = $1`, [newProgramId]).catch(() => {});
      await e2eDb.query(`delete from "Card" where "programId" = $1`, [newProgramId]).catch(() => {});
    }
    await e2eDb.query(`delete from "ProgramMembership" where "memberId" = $1`, [memberId]).catch(() => {});
    await e2eDb.query(`delete from "Card" where "memberId" = $1`, [memberId]).catch(() => {});
    await e2eDb.query(`delete from "Member" where id = $1`, [memberId]).catch(() => {});
    if (newProgramId) await e2eDb.query(`delete from "Program" where id = $1`, [newProgramId]).catch(() => {});
    await e2eDb.end();
  });

  test("sin cumplir el umbral, el dashboard dice honestamente qué falta -- sin botón", async ({ browser }) => {
    const context = await browser.newContext();
    await context.addCookies([{ ...(await mintMemberCookie(memberId)), url: BASE_URL }]);
    const page = await context.newPage();

    await page.goto(`${BASE_URL}/m/dashboard`, { waitUntil: "networkidle" });
    await expect(page.getByText("Convertí tu Empresa en tu propio Programa")).toBeVisible();
    await expect(page.getByText("pagar tu membresía", { exact: false })).toBeVisible();
    await expect(page.getByText("conseguir al menos 1 referido activo", { exact: false })).toBeVisible();
    await expect(page.getByRole("button", { name: "Convertir en Programa" })).not.toBeVisible();

    await context.close();
  });

  test("cumplido el umbral (pagó + 1 referido activo), el botón promueve de verdad y linkea el linaje a Legacy", async ({ browser }) => {
    await e2eDb.query(`update "ProgramMembership" set "membershipPaidAt" = now() where id = $1`, [membershipId]);

    const recruit = await e2eDb.query<{ id: string }>(
      `insert into "Member" (id, whatsapp, name, "updatedAt") values (gen_random_uuid()::text, $1, $2, now()) returning id`,
      [`+52798${suffix}`, "Referido E2E"]
    );
    const recruitMembership = await e2eDb.query<{ id: string }>(
      `insert into "ProgramMembership" (id, "memberId", "programId", "referredByMembershipId", status, "updatedAt") values (gen_random_uuid()::text, $1, $2, $3, 'active', now()) returning id`,
      [recruit.rows[0].id, legacyProgramId, membershipId]
    );

    const context = await browser.newContext();
    await context.addCookies([{ ...(await mintMemberCookie(memberId)), url: BASE_URL }]);
    const page = await context.newPage();

    await page.goto(`${BASE_URL}/m/dashboard`, { waitUntil: "networkidle" });
    await expect(page.getByText("Ya cumplís las 2 condiciones", { exact: false })).toBeVisible();
    await page.getByRole("button", { name: "Convertir en Programa" }).click();
    await page.waitForURL(`${BASE_URL}/m/dashboard`);

    await expect(page.getByText("Ya tenés tu propio Programa")).toBeVisible();

    const adminRow = await e2eDb.query<{ programId: string }>(`select "programId" from "Admin" where "memberId" = $1`, [memberId]);
    expect(adminRow.rows).toHaveLength(1);
    const newProgramId = adminRow.rows[0].programId;

    // Linaje (2026-10-05, caso Juancho/Digital Kingdom): el Programa nuevo
    // nace YA ligado a Legacy, sin que nadie lo linkee a mano.
    const programRow = await e2eDb.query<{ name: string; originProgramId: string | null }>(
      `select name, "originProgramId" from "Program" where id = $1`,
      [newProgramId]
    );
    expect(programRow.rows[0].name).toBe("Digital Kingdom");
    expect(programRow.rows[0].originProgramId).toBe(legacyProgramId);

    await e2eDb.query(`delete from "ProgramMembership" where id = $1`, [recruitMembership.rows[0].id]).catch(() => {});
    await e2eDb.query(`delete from "Member" where id = $1`, [recruit.rows[0].id]).catch(() => {});
    await context.close();
  });
});
