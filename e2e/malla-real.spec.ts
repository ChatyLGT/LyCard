import { test, expect, type Page } from "@playwright/test";
import bcrypt from "bcryptjs";
import { createE2eDb, mintAdminCookie } from "./helpers/adminSession";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";

// La Malla real (2026-09-22, pedido de Gunnar): reemplaza los datasets
// hardcodeados de lib/mallaData.ts por un grafo derivado de
// ProgramMembership de verdad, con click-to-info y drill-down fractal
// (Legacy → Programa real → sus propios miembros). El motor 3D
// (MallaGraph.tsx) ya traía el raycaster armado pero nadie lo escuchaba
// — esta prueba confirma que tocar un punto de verdad muestra info real,
// no solo que el grafo se dibuja.
//
// Clickear un canvas three.js no tiene un selector de Playwright —
// escanea una grilla de puntos hasta pegarle a un nodo (los nodos se
// mueven por la simulación de física, no hay coordenada fija posible).
// down/up explícitos en vez de page.mouse.click(): MallaGraph.tsx solo
// dispara el pick en "mouseup" si no hubo movimiento entre el down y el
// up (para no confundir un click con arrastrar la cámara) — .click() de
// Playwright puede meter un jitter de 1px entre ambos que ya cuenta como
// "se movió" para ese chequeo.
//
// Espiral desde el centro, no un raster completo del canvas: la cámara
// arranca mirando al origen (theta/phi fijos, MallaGraph.tsx) y todos los
// nodos gravitan hacia un único punto fantasma en el origen — así que el
// centro de la pantalla es, por lejos, el lugar más probable de pegarle a
// algo. Un raster completo del canvas (~800 clicks) tarda más que
// cualquier timeout razonable de test; esto encuentra un nodo en general
// dentro de los primeros anillos.
async function clickUntil(page: Page, canvas: { x: number; y: number; width: number; height: number }, matcher: () => Promise<boolean>) {
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  const points: [number, number][] = [[cx, cy]];
  for (let r = 12; r < Math.min(canvas.width, canvas.height) / 2; r += 12) {
    for (let a = 0; a < 360; a += 30) {
      const rad = (a * Math.PI) / 180;
      points.push([cx + r * Math.cos(rad), cy + r * Math.sin(rad)]);
    }
  }

  for (const [px, py] of points) {
    const x = canvas.x + px;
    const y = canvas.y + py;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.up();
    if (await matcher()) return true;
  }
  return false;
}

test.describe("Malla real (grafo derivado de ProgramMembership)", () => {
  const e2eDb = createE2eDb();
  let programId: string;
  let cardSlug: string;
  let adminId: string;
  let memberIds: string[];

  test.beforeAll(async () => {
    await e2eDb.connect();
    const suffix = Date.now();

    const prog = await e2eDb.query<{ id: string }>(
      `insert into "Program" (id, slug, name, "updatedAt") values (gen_random_uuid()::text, $1, $2, now()) returning id`,
      [`e2e-malla-${suffix}`, "E2E Digital Kingdom"]
    );
    programId = prog.rows[0].id;

    const m1 = await e2eDb.query<{ id: string }>(
      `insert into "Member" (id, name, whatsapp, "updatedAt") values (gen_random_uuid()::text, $1, $2, now()) returning id`,
      ["E2E Ana", `+549e2e${suffix}1`]
    );
    const m2 = await e2eDb.query<{ id: string }>(
      `insert into "Member" (id, name, whatsapp, "updatedAt") values (gen_random_uuid()::text, $1, $2, now()) returning id`,
      ["E2E Beto", `+549e2e${suffix}2`]
    );
    memberIds = [m1.rows[0].id, m2.rows[0].id];

    const pm1 = await e2eDb.query<{ id: string }>(
      `insert into "ProgramMembership" (id, "memberId", "programId", status, "updatedAt") values (gen_random_uuid()::text, $1, $2, 'active', now()) returning id`,
      [m1.rows[0].id, programId]
    );
    await e2eDb.query(
      `insert into "ProgramMembership" (id, "memberId", "programId", status, "referredByMembershipId", "updatedAt") values (gen_random_uuid()::text, $1, $2, 'active', $3, now())`,
      [m2.rows[0].id, programId, pm1.rows[0].id]
    );

    cardSlug = `e2e-malla-card-${suffix}`;
    await e2eDb.query(
      `insert into "Card" (id, slug, "updatedAt", name, title, quote, "programId") values (gen_random_uuid()::text, $1, now(), $2, $3, $4, $5)`,
      [cardSlug, "E2E Digital Kingdom N0", "N0", "Cita", programId]
    );

    const passwordHash = await bcrypt.hash("no-se-usa-login-por-cookie", 10);
    const admin = await e2eDb.query<{ id: string }>(
      `insert into "Admin" (id, email, "passwordHash", "programId", "updatedAt") values (gen_random_uuid()::text, $1, $2, null, now()) returning id`,
      [`e2e-malla-admin-${suffix}@example.com`, passwordHash]
    );
    adminId = admin.rows[0].id;
  });

  test.afterAll(async () => {
    await e2eDb.query(`delete from "ProgramMembership" where "programId" = $1`, [programId]).catch(() => {});
    await e2eDb.query(`delete from "Card" where slug = $1`, [cardSlug]).catch(() => {});
    await e2eDb.query(`delete from "Program" where id = $1`, [programId]).catch(() => {});
    await e2eDb.query(`delete from "Member" where id = any($1)`, [memberIds]).catch(() => {});
    await e2eDb.query(`delete from "Admin" where id = $1`, [adminId]).catch(() => {});
    await e2eDb.end();
  });

  test("un visitante ve conteos reales y puede tocar un punto para ver info real", async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(`${BASE_URL}/c/${cardSlug}/oficina`, { waitUntil: "networkidle" });

    // Nunca los números fijos de PUBLIC_MALLA_KPIS (3 brechas / 6 servicios) —
    // los labels reales son otros.
    await expect(page.getByText("Programas con red")).toBeVisible();
    await expect(page.getByText("Miembros activos")).toBeVisible();

    // Con el viewport default el canvas queda debajo del fold — hay que
    // scrollearlo a la vista antes de clickear, si no las coordenadas de
    // boundingBox() apuntan a un punto que el navegador nunca pintó.
    const canvasHandle = page.locator("canvas").first();
    await canvasHandle.scrollIntoViewIfNeeded();

    // La física del grafo (three.js) necesita un momento para acomodar los
    // nodos antes de que clickear coordenadas fijas tenga sentido.
    await page.waitForTimeout(1200);

    const box = await canvasHandle.boundingBox();
    expect(box).not.toBeNull();
    const hit = await clickUntil(page, box!, () => page.locator("text=/N[0-3] ·/").count().then((c) => c > 0));
    expect(hit).toBe(true);

    await context.close();
  });

  test("el dueño ve su Cerebro Malla real con el conteo real de miembros", async ({ browser }) => {
    const context = await browser.newContext();
    const cookie = await mintAdminCookie(adminId);
    await context.addCookies([{ ...cookie, url: BASE_URL }]);
    const page = await context.newPage();

    await page.goto(`${BASE_URL}/c/${cardSlug}/oficina`, { waitUntil: "networkidle" });

    await expect(page.getByText("Malla viva · tu equipo real")).toBeVisible();
    await expect(page.getByText("2 miembros")).toBeVisible();

    await context.close();
  });
});

// Bug reportado por Gunnar (2026-09-23): siendo MasterN0, su propia Card
// raíz (isOrigin) no mostraba nada real — ni el organismo completo (solo
// se calculaba para visitantes) ni el Cerebro Malla de un Programa (Legacy
// no tiene programId propio, es el N0 de todos, no "un equipo más"). Esta
// prueba cubre el fix: la Card raíz ahora ve el organismo completo, con la
// misma info real que un visitante, nunca el fallback de demo.
test.describe("Malla real — la Card raíz (isOrigin) ve el organismo completo", () => {
  const e2eDb = createE2eDb();
  let programId: string;
  let originSlug: string;
  let memberIds: string[];

  test.beforeAll(async () => {
    await e2eDb.connect();
    const suffix = Date.now();

    const prog = await e2eDb.query<{ id: string }>(
      `insert into "Program" (id, slug, name, "updatedAt") values (gen_random_uuid()::text, $1, $2, now()) returning id`,
      [`e2e-malla-origin-${suffix}`, "E2E Legacy Program"]
    );
    programId = prog.rows[0].id;

    const m1 = await e2eDb.query<{ id: string }>(
      `insert into "Member" (id, name, whatsapp, "updatedAt") values (gen_random_uuid()::text, $1, $2, now()) returning id`,
      ["E2E Root Member", `+549e2eorigin${suffix}`]
    );
    memberIds = [m1.rows[0].id];

    await e2eDb.query(
      `insert into "ProgramMembership" (id, "memberId", "programId", status, "updatedAt") values (gen_random_uuid()::text, $1, $2, 'active', now())`,
      [m1.rows[0].id, programId]
    );

    // La Card raíz: isOrigin true, sin programId propio — Legacy de
    // verdad no pertenece a ningún Programa, es el N0 de todos.
    originSlug = `e2e-malla-origin-card-${suffix}`;
    await e2eDb.query(
      `insert into "Card" (id, slug, "updatedAt", name, title, quote, "isOrigin") values (gen_random_uuid()::text, $1, now(), $2, $3, $4, true)`,
      [originSlug, "E2E Legacy Raíz", "N0", "Cita"]
    );
  });

  test.afterAll(async () => {
    await e2eDb.query(`delete from "ProgramMembership" where "programId" = $1`, [programId]).catch(() => {});
    await e2eDb.query(`delete from "Card" where slug = $1`, [originSlug]).catch(() => {});
    await e2eDb.query(`delete from "Program" where id = $1`, [programId]).catch(() => {});
    await e2eDb.query(`delete from "Member" where id = any($1)`, [memberIds]).catch(() => {});
    await e2eDb.end();
  });

  test("el organismo completo se ve en la Card raíz, no el fallback de demo — sin login, isOrigin ya es host", async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(`${BASE_URL}/c/${originSlug}/oficina`, { waitUntil: "networkidle" });

    await expect(page.getByText("Malla viva · el organismo completo")).toBeVisible();
    await expect(page.getByText("Vista general de demo")).toHaveCount(0);

    const canvasHandle = page.locator("canvas").first();
    await canvasHandle.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1200);

    const box = await canvasHandle.boundingBox();
    expect(box).not.toBeNull();
    const hit = await clickUntil(page, box!, () => page.locator("text=/N[0-3] ·/").count().then((c) => c > 0));
    expect(hit).toBe(true);

    await context.close();
  });
});
