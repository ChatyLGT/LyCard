import { describe, it, expect } from "vitest";
import { bumpStage, normalizeLeadStage } from "@/lib/leads";

describe("bumpStage", () => {
  it("happy path: avanza de compartido a contactado", () => {
    expect(bumpStage("compartido", "contactado")).toBe("contactado");
  });

  it("edge case: nunca retrocede — un evento automático más atrás que el estado actual no lo mueve", () => {
    expect(bumpStage("en_seguimiento", "compartido")).toBe("en_seguimiento");
  });

  it("caso negativo: un estado terminal (convertido/perdido) nunca lo toca un evento automático", () => {
    // Esto es la regla de negocio central del módulo: "convertido" y
    // "perdido" son manuales, exclusivos del dueño — si un evento
    // automático pudiera pisarlos, un lead ya cerrado por el dueño
    // podría "reabrirse" solo porque le llegó otro mensaje.
    expect(bumpStage("convertido", "en_seguimiento")).toBe("convertido");
    expect(bumpStage("perdido", "contactado")).toBe("perdido");
  });

  it("un evento automático nunca propone moverse a un estado terminal", () => {
    // bumpStage solo acepta LeadStage como "proposed", pero at runtime
    // (datos viejos, JSON malformado) esto documenta que aunque alguien
    // pase un terminal como propuesta, no se aplica.
    expect(bumpStage("compartido", "convertido")).toBe("compartido");
  });
});

describe("normalizeLeadStage", () => {
  it("happy path: un stage válido se devuelve tal cual", () => {
    expect(normalizeLeadStage("en_seguimiento")).toBe("en_seguimiento");
  });

  it("caso de error: un valor inválido (dato corrupto/viejo) cae a compartido en vez de crashear", () => {
    expect(normalizeLeadStage("estado-que-no-existe")).toBe("compartido");
    expect(normalizeLeadStage("")).toBe("compartido");
  });
});
