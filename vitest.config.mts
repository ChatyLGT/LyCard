import { defineConfig } from "vitest/config";
import path from "path";

// Unit tests solamente acá — pruebas de lógica pura en lib/**, sin
// levantar Next.js ni la DB real (eso es trabajo de Playwright, ver
// playwright.config.ts). Alias "@/*" replicado a mano desde tsconfig.json
// porque Vitest no lee ese archivo por sí solo.
export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(import.meta.dirname, ".") },
  },
  test: {
    environment: "node",
    include: ["lib/**/__tests__/**/*.test.ts", "app/**/__tests__/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      // Cobertura global reportada, sin puerta dura todavía — el repo
      // arranca de 0% de tests hoy (ver PLAN.md, auditoría CQE
      // 2026-09-23). Poner un mínimo global de 90% de entrada rompería
      // el próximo PR legítimo y terminaría deshabilitado en una semana.
      // En cambio: 90% es la puerta real, pero SOLO sobre los archivos
      // que ya tienen tests (`include` abajo) — sube de a uno a medida
      // que se van cubriendo más módulos, nunca baja.
      include: ["lib/authScope.ts", "lib/leads.ts", "lib/oficinaExtras.ts", "lib/sparkline.ts", "lib/demoData.ts"],
      thresholds: {
        lines: 90,
        functions: 90,
        branches: 90,
        statements: 90,
      },
    },
  },
});
