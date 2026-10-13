import { test, expect } from "@playwright/test";
import { createE2eDb, mintMemberCookie } from "./helpers/adminSession";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";

// "Conectar mi Google" (2026-10-13): la pantalla de permisos explica cada
// scope antes de mandar a Google, y solo el dueño de la tarjeta puede
// conectar o desconectar su cuenta. Este spec NO hace el consentimiento real
// con Google (eso requiere una cuenta humana); cubre la pantalla, la regla de
// dueño y la desconexión, que es lo que LyCard controla.
test.describe("Conectar mi Google -- permisos explicados y solo para el dueño", () => {
  const e2eDb = createE2eDb();
  const suffix = Date.now();
  let ownerMemberId: string;
  let otherMemberId: string;
  let cardId: string;

  test.beforeAll(async () => {
    await e2eDb.connect();

    const owner = await e2eDb.query<{ id: string }>(
      `insert into "Member" (id, name, "updatedAt", "googleRefreshToken") values (gen_random_uuid()::text, $1, now(), 'e2e-fake-refresh-token') returning id`,
      [`E2E Google Owner ${suffix}`]
    );
    ownerMemberId = owner.rows[0].id;

    const other = await e2eDb.query<{ id: string }>(
      `insert into "Member" (id, name, "updatedAt") values (gen_random_uuid()::text, $1, now()) returning id`,
      [`E2E Google Other ${suffix}`]
    );
    otherMemberId = other.rows[0].id;

    const card = await e2eDb.query<{ id: string }>(
      `insert into "Card" (id, slug, "updatedAt", name, title, quote, kind, "memberId") values (gen_random_uuid()::text, $1, now(), $2, '', '', 'personal', $3) returning id`,
      [`e2e-google-card-${suffix}`, "E2E Google Card", ownerMemberId]
    );
    cardId = card.rows[0].id;
  });

  test.afterAll(async () => {
    await e2eDb.query(`delete from "Card" where id = $1`, [cardId]).catch(() => {});
    await e2eDb.query(`delete from "Member" where id = any($1)`, [[ownerMemberId, otherMemberId]]).catch(() => {});
    await e2eDb.end();
  });

  test("el dueño ve los 4 permisos con para qué y cuándo, y el botón de autorizar apunta a Google", async ({ browser }) => {
    const context = await browser.newContext();
    await context.addCookies([{ ...(await mintMemberCookie(ownerMemberId)), url: BASE_URL }]);
    const page = await context.newPage();

    await page.goto(`${BASE_URL}/m/google/conectar?cardId=${cardId}`, { waitUntil: "networkidle" });

    await expect(page.getByText("Permisos de tu cuenta")).toBeVisible();
    for (const label of ["Tu identidad", "Tu calendario", "Tus tareas", "Archivos que crea LyCard"]) {
      await expect(page.getByText(label, { exact: true })).toBeVisible();
    }
    await expect(page.getByText(/Cuándo se usa: Solo cuando usás la Agenda/)).toBeVisible();

    // Ya tiene token de prueba: muestra desconectar, no autorizar.
    await expect(page.getByRole("button", { name: "Desconectar mi cuenta de Google" })).toBeVisible();
    await expect(page.getByText("Autorizar con Google")).toHaveCount(0);

    await context.close();
  });

  test("sin conexión, el botón de autorizar lleva a connect-start con la tarjeta", async ({ browser }) => {
    await e2eDb.query(`update "Member" set "googleRefreshToken" = null where id = $1`, [ownerMemberId]);

    const context = await browser.newContext();
    await context.addCookies([{ ...(await mintMemberCookie(ownerMemberId)), url: BASE_URL }]);
    const page = await context.newPage();

    await page.goto(`${BASE_URL}/m/google/conectar?cardId=${cardId}`, { waitUntil: "networkidle" });
    // El botón solo existe si el entorno tiene GOOGLE_CLIENT_ID/SECRET (en CI
    // no están); sin ellos la pantalla lo dice en vez de ofrecer un botón roto.
    const link = page.getByRole("link", { name: "Autorizar con Google" });
    if (await link.count()) {
      await expect(link).toHaveAttribute("href", new RegExp(`/m/auth/google/connect-start\\?cardId=${cardId}`));
    } else {
      await expect(page.getByText("todavía no está configurada")).toBeVisible();
    }

    await context.close();
  });

  test("desconectar borra el token guardado y deja la pantalla en modo 'no conectado'", async ({ browser }) => {
    await e2eDb.query(`update "Member" set "googleRefreshToken" = 'e2e-fake-refresh-token' where id = $1`, [ownerMemberId]);

    const context = await browser.newContext();
    await context.addCookies([{ ...(await mintMemberCookie(ownerMemberId)), url: BASE_URL }]);
    const page = await context.newPage();

    await page.goto(`${BASE_URL}/m/google/conectar?cardId=${cardId}`, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Desconectar mi cuenta de Google" }).click();
    await page.waitForURL(/disconnected=1/);

    await expect(page.getByText("Cuenta desconectada.")).toBeVisible();
    const row = await e2eDb.query<{ googleRefreshToken: string | null }>(`select "googleRefreshToken" from "Member" where id = $1`, [ownerMemberId]);
    expect(row.rows[0].googleRefreshToken).toBeNull();

    await context.close();
  });

  test("otro Member no puede ver ni tocar la cuenta de Google de esta tarjeta", async ({ browser }) => {
    await e2eDb.query(`update "Member" set "googleRefreshToken" = 'e2e-fake-refresh-token' where id = $1`, [ownerMemberId]);

    const context = await browser.newContext();
    await context.addCookies([{ ...(await mintMemberCookie(otherMemberId)), url: BASE_URL }]);
    const page = await context.newPage();

    await page.goto(`${BASE_URL}/m/google/conectar?cardId=${cardId}`, { waitUntil: "networkidle" });
    await expect(page.getByText("No tenés permiso para conectar la cuenta de Google de esta tarjeta.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Desconectar mi cuenta de Google" })).toHaveCount(0);

    const row = await e2eDb.query<{ googleRefreshToken: string | null }>(`select "googleRefreshToken" from "Member" where id = $1`, [ownerMemberId]);
    expect(row.rows[0].googleRefreshToken).toBe("e2e-fake-refresh-token");

    await context.close();
  });
});
