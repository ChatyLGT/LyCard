import { describe, it, expect } from "vitest";
import { calculateCommissionUsd, COMMISSION_RATES_USD } from "@/lib/commissions";

describe("calculateCommissionUsd", () => {
  it("cobra $35 cuando la oreja trajo al lead y no es suscripción", () => {
    expect(calculateCommissionUsd("oreja", "unico")).toBe(35);
    expect(calculateCommissionUsd("oreja", null)).toBe(35);
  });

  it("cobra $12/mes cuando la oreja trajo al lead y es suscripción", () => {
    expect(calculateCommissionUsd("oreja", "suscripcion")).toBe(12);
  });

  it("cobra $15 cuando la trajo la empresa y no es suscripción", () => {
    expect(calculateCommissionUsd("empresa", "cuotas")).toBe(15);
    expect(calculateCommissionUsd("empresa", null)).toBe(15);
  });

  it("cobra $5/mes cuando la trajo la empresa y es suscripción", () => {
    expect(calculateCommissionUsd("empresa", "suscripcion")).toBe(5);
  });

  it("devuelve 0 si todavía no se asignó puerta (traidoPor null)", () => {
    expect(calculateCommissionUsd(null, "suscripcion")).toBe(0);
  });

  it("devuelve 0 defensivamente ante un valor de traidoPor desconocido", () => {
    expect(calculateCommissionUsd("quien-sabe", "unico")).toBe(0);
  });

  it("expone las tarifas reales para que la UI las muestre sin duplicarlas", () => {
    expect(COMMISSION_RATES_USD.oreja.session).toBe(35);
    expect(COMMISSION_RATES_USD.oreja.suscripcion).toBe(12);
    expect(COMMISSION_RATES_USD.empresa.session).toBe(15);
    expect(COMMISSION_RATES_USD.empresa.suscripcion).toBe(5);
  });
});
