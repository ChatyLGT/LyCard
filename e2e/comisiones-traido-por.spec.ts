import { test, expect } from "@playwright/test";
import bcrypt from "bcryptjs";
import { createE2eDb, mintEmployeeCookie } from "./helpers/adminSession";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";

// Viaje del Cliente, Fase 4 (2026-10-13) -- comisiones reales sobre
// ProgramMembership.traidoPor (lib/commissions.ts): $35 por sesión si la
// Oreja trajo al Lead, $15 si fue asignada por la empresa; $12 o $5
// mensuales si el pago es una suscripción. Cada registro de sesión
// (logSessionAction) calcula y snapshotea el monto -- este spec cubre
// las 3 combinaciones reales (oreja+sesión, empresa+suscripción, y sin
// puerta asignada todavía -- 0, nada inventado) de punta a punta.
test.describe("Comisiones sobre traidoPor -- snapshot por sesión + acumulado real", () => {
  const e2eDb = createE2eDb();
  const suffix = Date.now();
  let programId: string;
  let employeeAdminId: string;
  const memberIds: string[] = [];
  const membershipIds: string[] = [];
  let membershipOrejaId: string;
  let membershipEmpresaSuscripcionId: string;
  let membershipSinPuertaId: string;

  test.beforeAll(async () => {
    await e2eDb.connect();
    programId = `e2e-comisiones-${suffix}`;

    await e2eDb.query(`insert into "Program" (id, slug, name, "updatedAt") values ($1, $2, $3, now())`, [
      programId,
      `${programId}-slug`,
      "E2E Comisiones",
    ]);

    const passwordHash = await bcrypt.hash("empleado-password-123", 10);
    const admin = await e2eDb.query<{ id: string }>(
      `insert into "Admin" (id, email, "passwordHash", "programId", role, "updatedAt") values (gen_random_uuid()::text, $1, $2, $3, 'empleado', now()) returning id`,
      [`e2e-comisiones-empleado-${suffix}@example.com`, passwordHash, programId]
    );
    employeeAdminId = admin.rows[0].id;

    const crearMiembroActivo = async (nombre: string, doorKey: string | null, traidoPor: string | null, paymentModel: string | null) => {
      const member = await e2eDb.query<{ id: string }>(
        `insert into "Member" (id, name, "updatedAt") values (gen_random_uuid()::text, $1, now()) returning id`,
        [nombre]
      );
      memberIds.push(member.rows[0].id);
      const membership = await e2eDb.query<{ id: string }>(
        `insert into "ProgramMembership" (id, "memberId", "programId", status, "doorKey", "traidoPor", "paymentModel", "priceAgreedUsd", "doorAssignedAt", "updatedAt")
         values (gen_random_uuid()::text, $1, $2, 'active', $3, $4, $5, $6, now(), now()) returning id`,
        [member.rows[0].id, programId, doorKey, traidoPor, paymentModel, doorKey ? 100 : null]
      );
      membershipIds.push(membership.rows[0].id);
      return membership.rows[0].id;
    };

    membershipOrejaId = await crearMiembroActivo(`E2E Comisión Oreja ${suffix}`, "armar", "oreja", "unico");
    membershipEmpresaSuscripcionId = await crearMiembroActivo(`E2E Comisión Suscripción ${suffix}`, "arquitecto", "empresa", "suscripcion");
    membershipSinPuertaId = await crearMiembroActivo(`E2E Comisión Sin Puerta ${suffix}`, null, null, null);
  });

  test.afterAll(async () => {
    await e2eDb.query(`delete from "ProgramMembership" where id = any($1)`, [membershipIds]).catch(() => {});
    await e2eDb.query(`delete from "Member" where id = any($1)`, [memberIds]).catch(() => {});
    await e2eDb.query(`delete from "Admin" where id = $1`, [employeeAdminId]).catch(() => {});
    await e2eDb.query(`delete from "Program" where id = $1`, [programId]).catch(() => {});
    await e2eDb.end();
  });

  // Los 3 Miembros de este Programa están todos "active", así que las 3
  // bitácoras de sesión existen en el DOM al mismo tiempo -- AccordionRow
  // no desmonta el contenido cerrado, lo colapsa con grid-template-
  // rows:0fr (components/Accordion.tsx), así que ":visible" NO alcanza
  // para distinguir un textarea real de uno colapsado (conserva su
  // propio bounding box). Se escopa cada fila por su `data-testid`
  // (`membership-<id>`, agregado a AccordionRow en esta misma Fase) en
  // vez de por nombre -- determinístico, sin pelear con CSS.
  function filaMiembro(page: import("@playwright/test").Page, membershipId: string) {
    return page.getByTestId(`membership-${membershipId}`);
  }

  async function abrirMiembro(row: import("@playwright/test").Locator) {
    // El botón del título (nombre del Miembro) es siempre el primer
    // <button> de la fila -- togglea abrir/cerrar, mismo onClick que el
    // chevron de al lado.
    await row.locator("button").first().click();
  }

  // No vuelve a tocar el botón del nombre -- ya abierto, un segundo click
  // lo cerraría en vez de loguear otra sesión (toggle, no acumulación).
  // waitForURL NO sirve para una segunda sesión: logSessionAction
  // siempre redirige al mismo `?sessionLogged=1` plano (no es por-sesión),
  // así que si la URL actual YA lo tiene (por la primera sesión), el
  // regex "resuelve" de una sin esperar el segundo POST real -- mismo
  // bug ya documentado en PLAN.md para "Reposicionar"/"Reagendar". Se
  // espera la respuesta real del submit en su lugar.
  // .evaluate(el => el.click()) en vez de un click de mouse real -- en
  // `next dev` (no en el build de producción que corre CI) el badge
  // flotante "Open Next.js Dev Tools" queda fijo en una esquina de la
  // ventana y puede tapar el botón de la fila que termina más abajo en
  // la lista (acá, la última creada); click({force:true}) sigue
  // apuntando mouse a esas coordenadas de pantalla y termina clickeando
  // el badge, no el botón real -- confirmado (la segunda sesión nunca
  // llegaba al servidor). Disparar el click nativo sobre el elemento
  // evita toda posición de pantalla, así que da igual qué lo tape --
  // sigue siendo un <button type="submit"> real dentro de su <form>.
  async function loggearSesion(row: import("@playwright/test").Locator, notas: string, page: import("@playwright/test").Page) {
    await row.locator('textarea[name="notes"]').fill(notas);
    const saveResponse = page.waitForResponse((r) => r.url().includes("/empleados") && r.request().method() === "POST");
    await row.getByRole("button", { name: "Registrar sesión" }).evaluate((el: HTMLElement) => el.click());
    await saveResponse;
    await page.waitForLoadState("networkidle");
  }

  test("Oreja trajo al Lead, pago único: $35 por sesión, snapshot + acumulado reales", async ({ browser }) => {
    const context = await browser.newContext();
    await context.addCookies([{ ...(await mintEmployeeCookie(employeeAdminId)), url: BASE_URL }]);
    const page = await context.newPage();

    await page.goto(`${BASE_URL}/empleados`, { waitUntil: "networkidle" });
    const fila = filaMiembro(page, membershipOrejaId);
    await abrirMiembro(fila);
    await loggearSesion(fila, "Primera sesión de 45min.", page);

    await expect(fila.getByText("+$35")).toBeVisible();
    await expect(fila.getByText("$35 USD acumulados")).toBeVisible();

    const row = await e2eDb.query<{ sessionLog: { commissionUsd: number }[]; totalCommissionsUsd: number }>(
      `select "sessionLog", "totalCommissionsUsd" from "ProgramMembership" where id = $1`,
      [membershipOrejaId]
    );
    expect(row.rows[0].sessionLog[0].commissionUsd).toBe(35);
    expect(row.rows[0].totalCommissionsUsd).toBe(35);

    // Una segunda sesión se SUMA al acumulado -- $70 en total, cada
    // entrada conserva su propio snapshot de $35. El revalidatePath del
    // primer submit vuelve a traer la lista completa de Miembros -- da
    // tiempo a que la transición CSS de la fila (grid-template-rows,
    // components/Accordion.tsx) termine de asentarse antes de tocarla
    // de nuevo, mismo criterio que otros specs de esta sesión frente a
    // animaciones/timing bajo carga.
    await page.waitForTimeout(300);
    await loggearSesion(fila, "Segunda sesión de 45min.", page);
    await expect(fila.getByText("$70 USD acumulados")).toBeVisible();
    const after = await e2eDb.query<{ sessionLog: { commissionUsd: number }[]; totalCommissionsUsd: number }>(
      `select "sessionLog", "totalCommissionsUsd" from "ProgramMembership" where id = $1`,
      [membershipOrejaId]
    );
    expect(after.rows[0].sessionLog).toHaveLength(2);
    expect(after.rows[0].sessionLog.every((s) => s.commissionUsd === 35)).toBe(true);
    expect(after.rows[0].totalCommissionsUsd).toBe(70);

    await context.close();
  });

  test("Trajo la empresa, suscripción: $5/mes por revisión, no la tarifa de sesión completa", async ({ browser }) => {
    const context = await browser.newContext();
    await context.addCookies([{ ...(await mintEmployeeCookie(employeeAdminId)), url: BASE_URL }]);
    const page = await context.newPage();

    await page.goto(`${BASE_URL}/empleados`, { waitUntil: "networkidle" });
    const fila = filaMiembro(page, membershipEmpresaSuscripcionId);
    await abrirMiembro(fila);
    await loggearSesion(fila, "Revisión mensual de indicadores de estrés.", page);

    await expect(fila.getByText("+$5")).toBeVisible();
    await expect(fila.getByText("$5 USD acumulados")).toBeVisible();

    const row = await e2eDb.query<{ sessionLog: { commissionUsd: number }[]; totalCommissionsUsd: number }>(
      `select "sessionLog", "totalCommissionsUsd" from "ProgramMembership" where id = $1`,
      [membershipEmpresaSuscripcionId]
    );
    expect(row.rows[0].sessionLog[0].commissionUsd).toBe(5);
    expect(row.rows[0].totalCommissionsUsd).toBe(5);

    await context.close();
  });

  test("Sin puerta asignada todavía: comisión $0 -- nada inventado antes de que haya un traidoPor real", async ({ browser }) => {
    const context = await browser.newContext();
    await context.addCookies([{ ...(await mintEmployeeCookie(employeeAdminId)), url: BASE_URL }]);
    const page = await context.newPage();

    await page.goto(`${BASE_URL}/empleados`, { waitUntil: "networkidle" });
    const fila = filaMiembro(page, membershipSinPuertaId);
    await abrirMiembro(fila);
    await loggearSesion(fila, "Sesión antes de cerrar ninguna puerta.", page);

    await expect(fila.getByText("$0 USD acumulados")).toBeVisible();

    const row = await e2eDb.query<{ totalCommissionsUsd: number }>(`select "totalCommissionsUsd" from "ProgramMembership" where id = $1`, [
      membershipSinPuertaId,
    ]);
    expect(row.rows[0].totalCommissionsUsd).toBe(0);

    await context.close();
  });
});
