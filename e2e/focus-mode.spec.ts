import { test, expect } from "@playwright/test";
import bcrypt from "bcryptjs";
import { createE2eDb, mintAdminCookie } from "./helpers/adminSession";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";

// Modo Foco (pedido de Gunnar, 2026-09-23) -- Superpoder nuevo de audio
// funcional generado 100% en el navegador (Web Audio API), sin pistas
// externas. Esta prueba no puede verificar el sonido en sí (Playwright
// no "escucha"), pero sí el flujo completo real: elegir modo/duración →
// arrancar sesión (el AudioContext se arma de verdad, sin tirar
// excepción) → terminar → pantalla de reflexión (sin invocar el
// micrófono real, eso exigiría permisos de media device que no hacen
// falta para confirmar que el flujo llega ahí).
test.describe("Modo Foco — Superpoder de audio funcional", () => {
  const e2eDb = createE2eDb();
  let cardSlug: string;
  let cardId: string;
  let adminId: string;

  test.beforeAll(async () => {
    await e2eDb.connect();
    const suffix = Date.now();
    cardSlug = `e2e-modo-foco-${suffix}`;
    const card = await e2eDb.query<{ id: string }>(
      `insert into "Card" (id, slug, "updatedAt", name, title, quote) values (gen_random_uuid()::text, $1, now(), $2, $3, $4) returning id`,
      [cardSlug, "E2E Modo Foco", "N/A", "cita"]
    );
    cardId = card.rows[0].id;

    const passwordHash = await bcrypt.hash("no-se-usa-login-por-cookie", 10);
    const admin = await e2eDb.query<{ id: string }>(
      `insert into "Admin" (id, email, "passwordHash", "programId", "updatedAt") values (gen_random_uuid()::text, $1, $2, null, now()) returning id`,
      [`e2e-modo-foco-admin-${suffix}@example.com`, passwordHash]
    );
    adminId = admin.rows[0].id;
  });

  test.afterAll(async () => {
    await e2eDb.query(`delete from "VoiceNote" where "cardId" = $1`, [cardId]).catch(() => {});
    await e2eDb.query(`delete from "Card" where id = $1`, [cardId]).catch(() => {});
    await e2eDb.query(`delete from "Admin" where id = $1`, [adminId]).catch(() => {});
    await e2eDb.end();
  });

  test("el dueño elige modo y duración, arranca la sesión de audio, y llega a la pantalla de reflexión al terminar", async ({ browser }) => {
    const context = await browser.newContext();
    const cookie = await mintAdminCookie(adminId);
    await context.addCookies([{ ...cookie, url: BASE_URL }]);
    const page = await context.newPage();

    await page.goto(`${BASE_URL}/c/${cardSlug}/oficina`, { waitUntil: "networkidle" });

    await page.getByRole("button", { name: "Modo Foco" }).click();
    await expect(page.getByText("Audio generado en vivo en tu navegador", { exact: false })).toBeVisible();

    // Elegí el modo "Creativo" y la duración de 10 min (la más corta)
    await page.getByRole("button", { name: "Creativo" }).click();
    await page.getByRole("button", { name: "10 min", exact: true }).click();

    await page.getByRole("button", { name: "Empezar sesión", exact: true }).click();

    // Sesión corriendo -- el timer arranca en 10:00 y el AudioContext se
    // armó sin tirar el error de "este navegador no puede reproducir".
    await expect(page.getByText("10:00", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Pausar", exact: true })).toBeVisible();
    await expect(page.getByText("Este navegador no puede reproducir", { exact: false })).toHaveCount(0);

    await page.getByRole("button", { name: "Terminar", exact: true }).click();

    // Pantalla de reflexión -- reusa el pipeline real de Notas de Voz
    await expect(page.getByText("¿Qué sacaste de esta sesión?", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Grabar reflexión" })).toBeVisible();

    await context.close();
  });

  // La base musical (house/lounge, pedido de Gunnar 2026-09-23: "que
  // acompañe las ondas") es un step-sequencer real -- Playwright no
  // puede "escuchar" el resultado, pero sí puede contar cuántos nodos de
  // Web Audio se crean de verdad con el tiempo. En Foco (tiene patrón:
  // kick+hats+bajo) el conteo tiene que seguir subiendo mientras corre
  // la sesión; en Sueño (sin patrón, a propósito -- ver FOCUS_MUSIC) el
  // conteo arranca y se queda fijo, prueba real de que ahí sigue sin
  // ritmo como se diseñó.
  test("Foco sigue creando nodos de audio con el tiempo (kick/hat/bajo reales) -- Sueño se queda fijo, sin ritmo", async ({ browser }) => {
    const context = await browser.newContext();
    const cookie = await mintAdminCookie(adminId);
    await context.addCookies([{ ...cookie, url: BASE_URL }]);
    const page = await context.newPage();

    await page.addInitScript(() => {
      (window as unknown as { __audioNodeCount: number }).__audioNodeCount = 0;
      const bump = () => {
        (window as unknown as { __audioNodeCount: number }).__audioNodeCount++;
      };
      const origOsc = AudioContext.prototype.createOscillator;
      AudioContext.prototype.createOscillator = function (...args) {
        bump();
        return origOsc.apply(this, args);
      };
      const origBuf = AudioContext.prototype.createBufferSource;
      AudioContext.prototype.createBufferSource = function (...args) {
        bump();
        return origBuf.apply(this, args);
      };
      // Guarda el último AudioContext creado -- para chequear que
      // resume() de verdad lo saca de "suspended" (bug real reportado
      // por Gunnar 2026-09-23: "no escucho nada", causa raíz confirmada
      // acá: varios navegadores mobile crean el contexto suspendido
      // aunque el click ya haya pasado).
      const OrigCtx = window.AudioContext;
      (window as unknown as { AudioContext: typeof AudioContext }).AudioContext = class extends OrigCtx {
        constructor(...args: ConstructorParameters<typeof OrigCtx>) {
          super(...args);
          (window as unknown as { __lastAudioCtx: AudioContext }).__lastAudioCtx = this;
        }
      };
    });

    await page.goto(`${BASE_URL}/c/${cardSlug}/oficina`, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Modo Foco" }).click();
    // "Foco profundo" ya viene seleccionado por default
    await page.getByRole("button", { name: "10 min", exact: true }).click();
    await page.getByRole("button", { name: "Empezar sesión", exact: true }).click();
    await expect(page.getByText("10:00", { exact: true })).toBeVisible();

    // El fix real del bug "no escucho nada": el AudioContext tiene que
    // quedar "running", no "suspended" -- sin el resume() explícito en
    // startEngine, esto se queda suspendido en silencio y nada de lo de
    // abajo (nodos creados o no) importa, porque no sale sonido.
    const ctxState = await page.evaluate(() => (window as unknown as { __lastAudioCtx: AudioContext }).__lastAudioCtx?.state);
    expect(ctxState).toBe("running");

    const afterStart = await page.evaluate(() => (window as unknown as { __audioNodeCount: number }).__audioNodeCount);
    await page.waitForTimeout(1500);
    const afterWait = await page.evaluate(() => (window as unknown as { __audioNodeCount: number }).__audioNodeCount);

    // Foco (house: kick en 4 steps, hats en 4, bajo en 4, ~124bpm) tiene
    // que seguir generando nodos mientras corre -- si esto no sube, el
    // scheduler no está de verdad corriendo, solo quedó el pad estático.
    expect(afterWait).toBeGreaterThan(afterStart + 5);

    await page.getByRole("button", { name: "Terminar", exact: true }).click();
    await context.close();
  });
});
