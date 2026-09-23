import { describe, expect, it } from "vitest";
import {
  FOCUS_MODES,
  FOCUS_MODE_ORDER,
  FOCUS_MUSIC,
  DURATION_OPTIONS_SECONDS,
  getFocusMode,
  isDurationSeconds,
  formatDurationLabel,
  formatCountdown,
  stepDurationSeconds,
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

describe("stepDurationSeconds", () => {
  it("una corchea de 16 a 120 BPM dura 1/8 de segundo", () => {
    expect(stepDurationSeconds(120)).toBeCloseTo(0.125);
  });

  it("a más BPM, el step dura menos", () => {
    expect(stepDurationSeconds(160)).toBeLessThan(stepDurationSeconds(80));
  });
});

describe("FOCUS_MUSIC", () => {
  it("sueño se queda sin secuencia rítmica a propósito -- un modo de sueño no debería tener beat", () => {
    expect(FOCUS_MUSIC.sueno).toBeNull();
  });

  it("los otros 3 modos sí tienen patrón, con al menos un step disparando algo (kick, bajo o acorde)", () => {
    for (const key of FOCUS_MODE_ORDER) {
      if (key === "sueno") continue;
      const pattern = FOCUS_MUSIC[key];
      expect(pattern).not.toBeNull();
      const totalHits = (pattern!.kickSteps.length + pattern!.bassSteps.length + pattern!.stabSteps.length);
      expect(totalHits).toBeGreaterThan(0);
      expect(pattern!.bpm).toBeGreaterThan(0);
    }
  });

  it("todos los steps declarados caen dentro del compás de 16", () => {
    for (const key of FOCUS_MODE_ORDER) {
      const pattern = FOCUS_MUSIC[key];
      if (!pattern) continue;
      const allSteps = [...pattern.kickSteps, ...pattern.hatSteps, ...pattern.bassSteps, ...pattern.stabSteps];
      for (const step of allSteps) {
        expect(step).toBeGreaterThanOrEqual(0);
        expect(step).toBeLessThan(16);
      }
    }
  });
});
