import { test, expect } from "@playwright/test";
import bcrypt from "bcryptjs";
import { createE2eDb, mintAdminCookie } from "./helpers/adminSession";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";

// 1x1 PNG real, mínimo posible -- mismo truco que wowawe.spec.ts.
const TINY_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64"
);

// Posicionador de fotos (2026-10-04, pedido de Gunnar: "en todos los
// servicios que utilizamos para subir fotos.. dame la oportunidad de
// mover, posicionar, disminuir, aumentar el tamaño de la foto.. ahorita
// puse una para el programa Legacy.. y se ve cortada.. en el dashboard
// no en la tarjeta"). Cubre el caso real que reportó: el logo de un
// Programa, que antes se mandaba crudo al servidor y se recortaba a
// ciegas con CSS, ahora pasa por un editor de posición/zoom ANTES de
// subirse. También cubre el retrato de una Card (aspecto distinto,
// fit:"cover" en vez de "contain") y el flujo de "Reposicionar" una
// imagen ya subida, sin tener que volver a elegir un archivo.
test.describe("PhotoPositioner — mover/zoom en el dashboard antes de subir", () => {
  const e2eDb = createE2eDb();
  let programId: string;
  let programAdminId: string;
  let cardSlug: string;
  let cardAdminId: string;

  test.beforeAll(async () => {
    await e2eDb.connect();
    const suffix = Date.now();

    const program = await e2eDb.query<{ id: string }>(
      `insert into "Program" (id, slug, name, "updatedAt") values (gen_random_uuid()::text, $1, $2, now()) returning id`,
      [`e2e-photopos-${suffix}`, "E2E PhotoPositioner Program"]
    );
    programId = program.rows[0].id;

    const passwordHash = await bcrypt.hash("no-se-usa-login-por-cookie", 10);
    const progAdmin = await e2eDb.query<{ id: string }>(
      `insert into "Admin" (id, email, "passwordHash", "programId", "updatedAt") values (gen_random_uuid()::text, $1, $2, $3, now()) returning id`,
      [`e2e-photopos-prog-admin-${suffix}@example.com`, passwordHash, programId]
    );
    programAdminId = progAdmin.rows[0].id;

    cardSlug = `e2e-photopos-card-${suffix}`;
    await e2eDb.query(
      `insert into "Card" (id, slug, "updatedAt", name, title, quote) values (gen_random_uuid()::text, $1, now(), $2, $3, $4)`,
      [cardSlug, "E2E PhotoPositioner Card", "N/A", "cita"]
    );
    const cardAdmin = await e2eDb.query<{ id: string }>(
      `insert into "Admin" (id, email, "passwordHash", "programId", "updatedAt") values (gen_random_uuid()::text, $1, $2, null, now()) returning id`,
      [`e2e-photopos-card-admin-${suffix}@example.com`, passwordHash]
    );
    cardAdminId = cardAdmin.rows[0].id;
  });

  test.afterAll(async () => {
    await e2eDb.query(`delete from "Card" where slug = $1`, [cardSlug]).catch(() => {});
    await e2eDb.query(`delete from "Admin" where id = any($1)`, [[programAdminId, cardAdminId]]).catch(() => {});
    await e2eDb.query(`delete from "Program" where id = $1`, [programId]).catch(() => {});
    await e2eDb.end();
  });

  test("Logo de Programa: subir abre el editor de posición, Confirmar compone un PNG nuevo, y se guarda de verdad", async ({ browser }) => {
    const context = await browser.newContext();
    const cookie = await mintAdminCookie(programAdminId);
    await context.addCookies([{ ...cookie, url: BASE_URL }]);
    const page = await context.newPage();

    await page.goto(`${BASE_URL}/admin/programs/${programId}`, { waitUntil: "networkidle" });

    await page.locator('input[name="logo"]').setInputFiles({ name: "logo.png", mimeType: "image/png", buffer: TINY_PNG });

    await expect(page.getByText("Posicionar foto", { exact: true })).toBeVisible();
    const confirmBtn = page.getByRole("button", { name: "Confirmar", exact: true });
    await expect(confirmBtn).toBeEnabled();

    // Arrastro adentro del marco -- ejercita el pan real, no solo el
    // zoom por defecto.
    const frame = page.getByTestId("photo-positioner-frame");
    const box = await frame.boundingBox();
    if (box) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width / 2 + 15, box.y + box.height / 2 + 10);
      await page.mouse.up();
    }

    await confirmBtn.click();
    await expect(page.getByText("Posicionar foto", { exact: true })).toHaveCount(0);

    // waitForURL no sirve para esto: la URL puede quedar en ?saved=1 de
    // un paso anterior y "resolver" de inmediato sin esperar el POST
    // real -- esperamos la respuesta del submit en sí.
    const saveResponse = page.waitForResponse((r) => r.url().includes(`/admin/programs/${programId}`) && r.request().method() === "POST");
    // Scope por el <form> de "Identidad del Programa" -- el Editor de
    // Modales unificado (2026-10-06) agregó 12+ botones "Guardar" más
    // a esta misma página, uno por fila/modal.
    const identityForm = page.locator("form").filter({ has: page.locator('input[name="logo"]') });
    await identityForm.getByRole("button", { name: "Guardar", exact: true }).click();
    await saveResponse;
    await page.waitForLoadState("networkidle");

    const row = await e2eDb.query<{ logoUrl: string | null }>(`select "logoUrl" from "Program" where id = $1`, [programId]);
    expect(row.rows[0].logoUrl).toBeTruthy();
    expect(row.rows[0].logoUrl).toMatch(/\.png$/);

    await context.close();
  });

  test("Retrato de Card: fit cover + aspecto vertical, mismo flujo, persiste un portraitUrl nuevo", async ({ browser }) => {
    const context = await browser.newContext();
    const cookie = await mintAdminCookie(cardAdminId);
    await context.addCookies([{ ...cookie, url: BASE_URL }]);
    const page = await context.newPage();

    await page.goto(`${BASE_URL}/admin/${cardSlug}`, { waitUntil: "networkidle" });

    await page.locator('input[name="portrait"]').setInputFiles({ name: "portrait.png", mimeType: "image/png", buffer: TINY_PNG });
    await expect(page.getByText("Posicionar foto", { exact: true })).toBeVisible();

    // Zoom cover empieza en 1 (no se puede alejar más -- dejaría franjas
    // vacías en la tarjeta real). Confirmo que el slider respeta ese piso.
    const slider = page.locator('input[type="range"]');
    await expect(slider).toHaveAttribute("min", "1");

    await page.getByRole("button", { name: "Confirmar", exact: true }).click();
    await expect(page.getByText("Posicionar foto", { exact: true })).toHaveCount(0);

    const saveResponse = page.waitForResponse((r) => r.url().includes(`/admin/${cardSlug}`) && r.request().method() === "POST");
    await page.getByRole("button", { name: "Guardar Tarjeta", exact: true }).click();
    await saveResponse;
    await page.waitForLoadState("networkidle");

    const row = await e2eDb.query<{ portraitUrl: string | null }>(`select "portraitUrl" from "Card" where slug = $1`, [cardSlug]);
    expect(row.rows[0].portraitUrl).toBeTruthy();
    expect(row.rows[0].portraitUrl).toMatch(/\.png$/);

    await context.close();
  });

  // Skip a pedido explícito de Gunnar (2026-10-13): viene fallando de
  // forma intermitente hace varias entregas (carga de la foto YA subida
  // vía URL remota, onLoad no llega a tiempo bajo la carga del runner de
  // CI -- ver PLAN.md para el detalle) y estaba costando una corrida
  // entera de ~6min cada vez que pegaba, sin que nadie esté usando este
  // camino concreto (reabrir y reposicionar una foto que YA se subió,
  // sin elegir una nueva) en este momento del proyecto. El editor de
  // posición de fotos en sí (components/PhotoPositioner.tsx) sigue
  // intacto y funcionando en los 3 lugares reales (logo de Programa,
  // foto personal, retrato de Card) -- esto es solo este test puntual,
  // no la funcionalidad. Queda el código del test, sin borrar, para
  // retomarlo si hace falta.
  test.skip("Reposicionar: sin elegir un archivo nuevo, reabre la foto ya subida y la vuelve a guardar", async ({ browser }) => {
    const context = await browser.newContext();
    const cookie = await mintAdminCookie(programAdminId);
    await context.addCookies([{ ...cookie, url: BASE_URL }]);
    const page = await context.newPage();

    // Self-contained: sube su propio logo primero (no depende del orden
    // de ejecución de los otros tests del archivo).
    await page.goto(`${BASE_URL}/admin/programs/${programId}`, { waitUntil: "networkidle" });
    await page.locator('input[name="logo"]').setInputFiles({ name: "logo2.png", mimeType: "image/png", buffer: TINY_PNG });
    await expect(page.getByText("Posicionar foto", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Confirmar", exact: true }).click();
    await expect(page.getByText("Posicionar foto", { exact: true })).toHaveCount(0);
    // waitForURL no sirve: acá se guarda DOS veces seguidas en la misma
    // sesión (justo el caso real de "Reposicionar") y la URL se queda en
    // ?saved=1 desde el primer guardado -- un waitForURL en el segundo
    // resolvería de inmediato sin esperar ese POST real, dejando el
    // assert de abajo leyendo la DB antes de que el cambio llegara.
    const firstSave = page.waitForResponse((r) => r.url().includes(`/admin/programs/${programId}`) && r.request().method() === "POST");
    // Scope por el <form> de "Identidad del Programa" -- ver nota arriba.
    const identityForm = page.locator("form").filter({ has: page.locator('input[name="logo"]') });
    await identityForm.getByRole("button", { name: "Guardar", exact: true }).click();
    await firstSave;
    await page.waitForLoadState("networkidle");

    const before = await e2eDb.query<{ logoUrl: string | null }>(`select "logoUrl" from "Program" where id = $1`, [programId]);
    expect(before.rows[0].logoUrl).toBeTruthy();

    // El componente se remonta (key=logoUrl) recién cuando React aplica
    // el nuevo árbol tras el redirect -- esperar a que el <img> de
    // preview apunte de verdad a la URL real guardada (no a un blob:
    // viejo del navegador) confirma que ya remontó antes de tocar
    // "Reposicionar".
    await expect(page.locator('img[alt=""]').first()).toHaveAttribute("src", before.rows[0].logoUrl!, { timeout: 10000 });

    await page.getByRole("button", { name: "Reposicionar", exact: true }).click();
    await expect(page.getByText("Posicionar foto", { exact: true })).toBeVisible();
    const confirmBtn = page.getByRole("button", { name: "Confirmar", exact: true });
    await expect(confirmBtn).toBeEnabled({ timeout: 10000 });
    await confirmBtn.click();
    await expect(page.getByText("Posicionar foto", { exact: true })).toHaveCount(0);

    const secondSave = page.waitForResponse((r) => r.url().includes(`/admin/programs/${programId}`) && r.request().method() === "POST");
    await page.getByRole("button", { name: "Guardar", exact: true }).click();
    await secondSave;
    await page.waitForLoadState("networkidle");

    const after = await e2eDb.query<{ logoUrl: string | null }>(`select "logoUrl" from "Program" where id = $1`, [programId]);
    expect(after.rows[0].logoUrl).toBeTruthy();
    // Reposicionar vuelve a componer y subir -- queda una URL nueva, no
    // la misma (no hay metadata de posición separada, es la foto misma
    // recompuesta).
    expect(after.rows[0].logoUrl).not.toBe(before.rows[0].logoUrl);

    await context.close();
  });
});
