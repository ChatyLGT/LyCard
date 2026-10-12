import { describe, it, expect } from "vitest";
import { leadTemperature, LEAD_TEMPERATURE_LABEL } from "../leadTemperature";

describe("leadTemperature", () => {
  const now = new Date("2026-10-12T12:00:00Z");

  it("menos de 2 horas es caliente", () => {
    expect(leadTemperature(new Date("2026-10-12T11:00:00Z"), now)).toBe("caliente");
  });

  it("justo en el límite de 2 horas ya es tibio", () => {
    expect(leadTemperature(new Date("2026-10-12T10:00:00Z"), now)).toBe("tibio");
  });

  it("menos de 24 horas es tibio", () => {
    expect(leadTemperature(new Date("2026-10-11T18:00:00Z"), now)).toBe("tibio");
  });

  it("24 horas o más es frío", () => {
    expect(leadTemperature(new Date("2026-10-11T12:00:00Z"), now)).toBe("frio");
  });

  it("varios días es frío", () => {
    expect(leadTemperature(new Date("2026-10-01T12:00:00Z"), now)).toBe("frio");
  });

  it("tiene una etiqueta legible para cada temperatura", () => {
    expect(LEAD_TEMPERATURE_LABEL.caliente).toBe("Caliente");
    expect(LEAD_TEMPERATURE_LABEL.tibio).toBe("Tibio");
    expect(LEAD_TEMPERATURE_LABEL.frio).toBe("Frío");
  });
});
