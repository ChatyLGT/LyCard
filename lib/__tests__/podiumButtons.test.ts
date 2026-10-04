import { describe, it, expect } from "vitest";
import {
  parsePodiumButtons,
  getPodiumButton,
  upsertPodiumButton,
  parseVaultSources,
  type PodiumButtonConfig,
} from "@/lib/podiumButtons";

const BLANK: Omit<PodiumButtonConfig, "slot" | "kind"> = { aiTitle: "", aiIcon: "", aiBody: "", aiPrompt: "" };

describe("parsePodiumButtons", () => {
  it("devuelve [] si no es un array", () => {
    expect(parsePodiumButtons(null)).toEqual([]);
    expect(parsePodiumButtons(undefined)).toEqual([]);
    expect(parsePodiumButtons("no es un array")).toEqual([]);
  });

  it("parsea un array válido con los 2 slots", () => {
    const result = parsePodiumButtons([
      { slot: "left", kind: "vault" },
      { slot: "right", kind: "invite" },
    ]);
    expect(result).toEqual([
      { slot: "left", kind: "vault", ...BLANK },
      { slot: "right", kind: "invite", ...BLANK },
    ]);
  });

  it("cae a slot:'left' si no es 'right'", () => {
    expect(parsePodiumButtons([{ slot: "arriba", kind: "info" }])).toEqual([{ slot: "left", kind: "info", ...BLANK }]);
    expect(parsePodiumButtons([{ kind: "info" }])).toEqual([{ slot: "left", kind: "info", ...BLANK }]);
  });

  it("cae a kind:'info' si el kind no es válido", () => {
    expect(parsePodiumButtons([{ slot: "left", kind: "lo_que_sea" }])).toEqual([{ slot: "left", kind: "info", ...BLANK }]);
    expect(parsePodiumButtons([{ slot: "left" }])).toEqual([{ slot: "left", kind: "info", ...BLANK }]);
  });

  it("lee los campos de ai_agent cuando son strings", () => {
    const result = parsePodiumButtons([
      { slot: "left", kind: "ai_agent", aiTitle: "Calculadora", aiIcon: "calculate", aiBody: "desc", aiPrompt: "pedido original" },
    ]);
    expect(result).toEqual([{ slot: "left", kind: "ai_agent", aiTitle: "Calculadora", aiIcon: "calculate", aiBody: "desc", aiPrompt: "pedido original" }]);
  });

  it("trata campos ai_* que no son string como vacíos", () => {
    const result = parsePodiumButtons([{ slot: "left", kind: "ai_agent", aiTitle: 5, aiIcon: null, aiBody: {}, aiPrompt: [] }]);
    expect(result).toEqual([{ slot: "left", kind: "ai_agent", ...BLANK }]);
  });

  it("descarta entradas que no son objetos", () => {
    expect(parsePodiumButtons(["x", 5, null, { slot: "left", kind: "info" }])).toEqual([{ slot: "left", kind: "info", ...BLANK }]);
  });

  it("si hay 2 entradas para el mismo slot, se queda con la primera", () => {
    const result = parsePodiumButtons([
      { slot: "left", kind: "vault" },
      { slot: "left", kind: "invite" },
    ]);
    expect(result).toEqual([{ slot: "left", kind: "vault", ...BLANK }]);
  });
});

describe("getPodiumButton", () => {
  const items: PodiumButtonConfig[] = [
    { slot: "left", kind: "vault", ...BLANK },
    { slot: "right", kind: "invite", ...BLANK },
  ];

  it("devuelve la config del slot pedido", () => {
    expect(getPodiumButton(items, "left")).toEqual(items[0]);
    expect(getPodiumButton(items, "right")).toEqual(items[1]);
  });

  it("devuelve null si no hay config para ese slot", () => {
    expect(getPodiumButton([items[0]], "right")).toBeNull();
    expect(getPodiumButton([], "left")).toBeNull();
  });
});

describe("upsertPodiumButton", () => {
  it("agrega un slot nuevo si no existía", () => {
    const result = upsertPodiumButton([{ slot: "left", kind: "info", ...BLANK }], { slot: "right", kind: "vault", ...BLANK });
    expect(result).toEqual([
      { slot: "left", kind: "info", ...BLANK },
      { slot: "right", kind: "vault", ...BLANK },
    ]);
  });

  it("reemplaza la config existente del mismo slot", () => {
    const result = upsertPodiumButton(
      [
        { slot: "left", kind: "info", ...BLANK },
        { slot: "right", kind: "invite", ...BLANK },
      ],
      { slot: "left", kind: "vault", ...BLANK }
    );
    expect(result).toEqual([
      { slot: "right", kind: "invite", ...BLANK },
      { slot: "left", kind: "vault", ...BLANK },
    ]);
  });
});

describe("parseVaultSources", () => {
  it("devuelve [] si no es un array", () => {
    expect(parseVaultSources(null)).toEqual([]);
    expect(parseVaultSources("no es un array")).toEqual([]);
  });

  it("parsea fuentes válidas", () => {
    const result = parseVaultSources([
      { type: "link", label: "Sitio", value: "https://example.com" },
      { type: "texto", label: "Nota", value: "algo" },
    ]);
    expect(result).toEqual([
      { type: "link", label: "Sitio", value: "https://example.com" },
      { type: "texto", label: "Nota", value: "algo" },
    ]);
  });

  it("cae a type:'link' si no es 'texto'", () => {
    expect(parseVaultSources([{ type: "archivo", label: "x", value: "v" }])).toEqual([{ type: "link", label: "x", value: "v" }]);
  });

  it("descarta entradas sin value y entradas que no son objetos", () => {
    expect(parseVaultSources([{ type: "link", label: "x", value: "" }, "no objeto", 5, null])).toEqual([]);
  });

  it("trata label que no es string como vacío", () => {
    expect(parseVaultSources([{ type: "link", label: 5, value: "v" }])).toEqual([{ type: "link", label: "", value: "v" }]);
  });

  it("trata value que no es string como vacío (y lo descarta)", () => {
    expect(parseVaultSources([{ type: "link", label: "x", value: 123 }])).toEqual([]);
  });
});
