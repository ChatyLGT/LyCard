import { defineConfig, devices } from "@playwright/test";

// E2E real contra un server real (pnpm dev localmente, o build+start ya
// arrancado en CI — ver .github/workflows/ci-qa.yml). Necesita Postgres
// + DATABASE_URL/SESSION_SECRET configurados, igual que la app.
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false, // los specs tocan la misma DB compartida — evita carreras entre tests
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  // "github" para anotaciones inline en el PR + "html" para que el
  // workflow tenga algo que subir como artifact cuando falla (ver
  // .github/workflows/ci-qa.yml).
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        // Entorno de desarrollo: usa el Chromium ya preinstalado en vez
        // de que Playwright intente bajar el suyo (puede no coincidir
        // exactamente con la versión que npm resolvió). Ruta directa, no
        // el symlink /opt/pw-browsers/chromium — en este sandbox
        // `fs.existsSync` de Node no sigue ese symlink bien (aunque el
        // shell sí lo resuelve), y Playwright usa exactamente ese check
        // antes de lanzar. En CI real, sin este binario preinstalado, se
        // omite (ver el check de abajo) y Playwright usa el que instale
        // `playwright install --with-deps`.
        ...(process.env.CI ? {} : { launchOptions: { executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" } }),
      },
    },
  ],
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined // CI ya levantó el server por su cuenta (build de producción), no lo dupliques
    : {
        command: "pnpm dev",
        url: "http://localhost:3000",
        reuseExistingServer: true,
        timeout: 60_000,
      },
});
