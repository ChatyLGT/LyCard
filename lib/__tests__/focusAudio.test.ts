import { describe, expect, it } from "vitest";
import {
  FOCUS_MODES,
  FOCUS_MODE_ORDER,
  DURATION_OPTIONS_SECONDS,
  getFocusMode,
  isDurationSeconds,
  formatDurationLabel,
  formatCountdown,
} from "../focusAudio";

describe("getFocusMode", () => {
  it("devuelve la config real para cada key válida", () => {
    for (const key of FOCUS_MODE_ORDER) {
      expect(getFocusMode(key)).toBe(FOCUS_MODES[key]);
    }
  });

  it("cae a 'foco' ante una key desconocida -- nunca revienta ni devuelve undefined", () => {
    expect(getFocusMode("no-existe")).toBe(FOCUS_MODES.foco);
    expect(getFocusMode("")).toBe(FOCUS_MODES.foco);
  });
});

describe("isDurationSeconds", () => {
  it("acepta solo las duraciones definidas", () => {
    for (const d of DURATION_OPTIONS_SECONDS) {
      expect(isDurationSeconds(d)).toBe(true);
    }
  });

  it("rechaza cualquier otro número", () => {
    expect(isDurationSeconds(123)).toBe(false);
    expect(isDurationSeconds(0)).toBe(false);
  });
});

describe("formatDurationLabel", () => {
  it("redondea a minutos enteros", () => {
    expect(formatDurationLabel(600)).toBe("10 min");
    expect(formatDurationLabel(1200)).toBe("20 min");
    expect(formatDurationLabel(2700)).toBe("45 min");
  });
});

describe("formatCountdown", () => {
  it("formatea mm:ss con ceros a la izquierda", () => {
    expect(formatCountdown(65)).toBe("01:05");
    expect(formatCountdown(600)).toBe("10:00");
    expect(formatCountdown(9)).toBe("00:09");
  });

  it("nunca baja de 00:00 aunque le pasen un número negativo", () => {
    expect(formatCountdown(-5)).toBe("00:00");
  });

  it("se topea en 99 minutos aunque le pasen algo absurdo", () => {
    expect(formatCountdown(99 * 60 + 999999)).toBe("99:39");
  });

  it("redondea segundos fraccionarios", () => {
    expect(formatCountdown(65.6)).toBe("01:06");
  });
});
