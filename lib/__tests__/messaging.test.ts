import { describe, it, expect } from "vitest";
import { isValidChannel, parseChannels, resolveNonNetworkOutcome, CHANNELS } from "@/lib/messaging";

describe("isValidChannel", () => {
  it("acepta los 4 canales reales del vocabulario", () => {
    expect(isValidChannel("lycard")).toBe(true);
    expect(isValidChannel("email")).toBe(true);
    expect(isValidChannel("telegram")).toBe(true);
    expect(isValidChannel("whatsapp")).toBe(true);
  });

  it("rechaza cualquier otra cosa", () => {
    expect(isValidChannel("sms")).toBe(false);
    expect(isValidChannel("")).toBe(false);
    expect(isValidChannel(null)).toBe(false);
    expect(isValidChannel(undefined)).toBe(false);
    expect(isValidChannel(42)).toBe(false);
  });
});

describe("parseChannels", () => {
  it("filtra valores inválidos y saca duplicados", () => {
    expect(parseChannels(["lycard", "email", "lycard", "sms", "fake"])).toEqual(["lycard", "email"]);
  });

  it("lista vacía -> array vacío", () => {
    expect(parseChannels([])).toEqual([]);
  });
});

describe("resolveNonNetworkOutcome", () => {
  it("lycard siempre es 'enviado' -- escribir la fila ya es la entrega completa", () => {
    expect(resolveNonNetworkOutcome("lycard", "")).toEqual({ status: "enviado" });
    expect(resolveNonNetworkOutcome("lycard", "alguien@ejemplo.com")).toEqual({ status: "enviado" });
  });

  it("telegram y whatsapp siempre son 'simulado' -- sin integración real todavía", () => {
    const telegram = resolveNonNetworkOutcome("telegram", "alguien@ejemplo.com");
    expect(telegram?.status).toBe("simulado");
    const whatsapp = resolveNonNetworkOutcome("whatsapp", "alguien@ejemplo.com");
    expect(whatsapp?.status).toBe("simulado");
  });

  it("email sin dirección cargada -> 'fallido', nunca finge un envío", () => {
    const result = resolveNonNetworkOutcome("email", "");
    expect(result?.status).toBe("fallido");
    expect(result?.errorDetail).toContain("email");
  });

  it("email CON dirección cargada -> null (se resuelve en la action, necesita red)", () => {
    expect(resolveNonNetworkOutcome("email", "alguien@ejemplo.com")).toBeNull();
  });
});

describe("CHANNELS", () => {
  it("lycard y email están marcados como reales; telegram y whatsapp no", () => {
    expect(CHANNELS.find((c) => c.key === "lycard")?.real).toBe(true);
    expect(CHANNELS.find((c) => c.key === "email")?.real).toBe(true);
    expect(CHANNELS.find((c) => c.key === "telegram")?.real).toBe(false);
    expect(CHANNELS.find((c) => c.key === "whatsapp")?.real).toBe(false);
  });
});
