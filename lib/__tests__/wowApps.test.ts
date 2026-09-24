import { describe, it, expect } from "vitest";
import { parseTags, toCatalogEntry, matchWowApps, countByRubro, simulatedRating, simulatedReviewCount, EXAMPLE_WOW_APPS, RUBROS, PAIN_POINTS, WOW_APP_TYPES, type WowAppCatalogEntry } from "@/lib/wowApps";

function entry(partial: Partial<WowAppCatalogEntry>): WowAppCatalogEntry {
  return {
    id: "id",
    key: "key",
    nombre: "nombre",
    descripcion: "descripcion",
    iconUrl: "",
    color: "#C8A15A",
    appType: "custom",
    industryTags: [],
    painPointTags: [],
    basePriceUsd: 0,
    status: "proximamente",
    demoVideoUrl: "",
    ...partial,
  };
}

describe("parseTags", () => {
  it("no es array -> lista vacía", () => {
    expect(parseTags(null)).toEqual([]);
    expect(parseTags(undefined)).toEqual([]);
    expect(parseTags("restaurante")).toEqual([]);
    expect(parseTags({ a: 1 })).toEqual([]);
  });

  it("filtra elementos que no son string o son vacíos", () => {
    expect(parseTags(["restaurante", 5, null, "  ", "retail"])).toEqual(["restaurante", "retail"]);
  });

  it("array de strings válido pasa tal cual", () => {
    expect(parseTags(["a", "b"])).toEqual(["a", "b"]);
  });
});

describe("toCatalogEntry", () => {
  it("parsea los campos Json crudos a string[]", () => {
    const result = toCatalogEntry({
      id: "1",
      key: "wowagenda-pro",
      nombre: "WowAgenda Pro",
      descripcion: "desc",
      iconUrl: "",
      color: "#C8A15A",
      appType: "agenda",
      industryTags: ["clinica", "despacho"],
      painPointTags: ["clientes"],
      basePriceUsd: 9.9,
      status: "activo",
      demoVideoUrl: "",
    });
    expect(result.industryTags).toEqual(["clinica", "despacho"]);
    expect(result.painPointTags).toEqual(["clientes"]);
    expect(result.basePriceUsd).toBe(9.9);
  });

  it("Json corrupto (no array) cae a lista vacía, no rompe", () => {
    const result = toCatalogEntry({
      id: "1",
      key: "k",
      nombre: "n",
      descripcion: "d",
      iconUrl: "",
      color: "#000",
      appType: "custom",
      industryTags: "no-es-array",
      painPointTags: null,
      basePriceUsd: 0,
      status: "proximamente",
      demoVideoUrl: "",
    });
    expect(result.industryTags).toEqual([]);
    expect(result.painPointTags).toEqual([]);
  });
});

describe("matchWowApps", () => {
  const catalog: WowAppCatalogEntry[] = [
    entry({ key: "wowbot-pedidos", industryTags: ["restaurante"], painPointTags: ["vender-mas"] }),
    entry({ key: "wowagenda-pro", industryTags: ["clinica", "despacho"], painPointTags: ["clientes"] }),
    entry({ key: "wowcobranza", industryTags: ["retail", "despacho"], painPointTags: ["cobrar"] }),
    entry({ key: "sin-tags" }),
  ];

  it("sin rubro ni dolor elegidos, no devuelve nada (todavía no se preguntó)", () => {
    expect(matchWowApps(catalog, null, null)).toEqual([]);
  });

  it("filtra por rubro solo", () => {
    const result = matchWowApps(catalog, "despacho", null);
    expect(result.map((a) => a.key)).toEqual(["wowagenda-pro", "wowcobranza"]);
  });

  it("filtra por dolor solo", () => {
    const result = matchWowApps(catalog, null, "vender-mas");
    expect(result.map((a) => a.key)).toEqual(["wowbot-pedidos"]);
  });

  it("una app que matchea rubro Y dolor puntúa más alto y sale primero", () => {
    const doubleMatch: WowAppCatalogEntry[] = [
      entry({ key: "solo-rubro", industryTags: ["restaurante"], painPointTags: [] }),
      entry({ key: "rubro-y-dolor", industryTags: ["restaurante"], painPointTags: ["vender-mas"] }),
    ];
    const result = matchWowApps(doubleMatch, "restaurante", "vender-mas");
    expect(result.map((a) => a.key)).toEqual(["rubro-y-dolor", "solo-rubro"]);
  });

  it("nunca devuelve más de 3, aunque matcheen más", () => {
    const many: WowAppCatalogEntry[] = Array.from({ length: 5 }, (_, i) => entry({ key: `app-${i}`, industryTags: ["retail"] }));
    expect(matchWowApps(many, "retail", null)).toHaveLength(3);
  });

  it("una app sin ninguna coincidencia no aparece", () => {
    const result = matchWowApps(catalog, "restaurante", null);
    expect(result.map((a) => a.key)).toEqual(["wowbot-pedidos"]);
  });
});

describe("EXAMPLE_WOW_APPS", () => {
  const rubroKeys = RUBROS.map((r) => r.key);
  const dolorKeys = PAIN_POINTS.map((p) => p.key);

  it("todas usan tags reales del vocabulario -- ninguna queda invisible en el match por un typo", () => {
    for (const app of EXAMPLE_WOW_APPS) {
      for (const tag of app.industryTags) expect(rubroKeys).toContain(tag);
      for (const tag of app.painPointTags) expect(dolorKeys).toContain(tag);
      expect(WOW_APP_TYPES).toContain(app.appType);
    }
  });

  it("cada ejemplo tiene al menos 1 dolor -- si no, nunca aparece en un match", () => {
    for (const app of EXAMPLE_WOW_APPS) {
      expect(app.painPointTags.length).toBeGreaterThan(0);
    }
  });

  it("industryTags puede quedar vacío a propósito (rubro-agnóstico, ej. WowAwe) -- pero solo si matchea por dolor solo", () => {
    for (const app of EXAMPLE_WOW_APPS) {
      if (app.industryTags.length === 0) {
        expect(app.painPointTags.length).toBeGreaterThan(0);
      }
    }
  });

  it("keys únicas -- no hay dos ejemplos que se pisen", () => {
    const keys = EXAMPLE_WOW_APPS.map((a) => a.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe("countByRubro", () => {
  it("catálogo vacío -- todos los rubros en 0, ni un key de más ni de menos", () => {
    const counts = countByRubro([]);
    for (const r of RUBROS) expect(counts[r.key]).toBe(0);
    expect(Object.keys(counts).sort()).toEqual(RUBROS.map((r) => r.key).sort());
  });

  it("solo cuenta status:activo -- proximamente no suma aunque tenga el tag", () => {
    const catalog = [
      entry({ key: "a", status: "activo", industryTags: ["restaurante"] }),
      entry({ key: "b", status: "proximamente", industryTags: ["restaurante"] }),
    ];
    expect(countByRubro(catalog).restaurante).toBe(1);
  });

  it("una app con varios rubros suma a cada uno", () => {
    const catalog = [entry({ key: "a", status: "activo", industryTags: ["restaurante", "retail"] })];
    const counts = countByRubro(catalog);
    expect(counts.restaurante).toBe(1);
    expect(counts.retail).toBe(1);
    expect(counts.clinica).toBe(0);
  });

  it("industryTags vacío (rubro-agnóstico, ej. WowAwe) no suma a ningún rubro", () => {
    const catalog = [entry({ key: "wowawe", status: "activo", industryTags: [] })];
    const counts = countByRubro(catalog);
    for (const r of RUBROS) expect(counts[r.key]).toBe(0);
  });

  it("un tag que no está en RUBROS (dato corrupto/legacy) se ignora sin romper", () => {
    const catalog = [entry({ key: "a", status: "activo", industryTags: ["rubro-inventado"] })];
    const counts = countByRubro(catalog);
    for (const r of RUBROS) expect(counts[r.key]).toBe(0);
  });
});

describe("simulatedRating", () => {
  it("siempre cae en el rango 4.30 .. 5.00", () => {
    for (const key of ["a", "wowawe", "wowtest-match-123", "", "z".repeat(40)]) {
      const rating = simulatedRating(key);
      expect(rating).toBeGreaterThanOrEqual(4.3);
      expect(rating).toBeLessThanOrEqual(5.0);
    }
  });

  it("es determinístico -- la misma key siempre da el mismo número", () => {
    expect(simulatedRating("wowbot-pedidos")).toBe(simulatedRating("wowbot-pedidos"));
  });

  it("keys distintas dan ratings distintos (no es un valor fijo disfrazado)", () => {
    const ratings = new Set(["a", "b", "c", "d", "e"].map(simulatedRating));
    expect(ratings.size).toBeGreaterThan(1);
  });
});

describe("simulatedReviewCount", () => {
  it("siempre cae en el rango 8 .. 64", () => {
    for (const key of ["a", "wowawe", ""]) {
      const count = simulatedReviewCount(key);
      expect(count).toBeGreaterThanOrEqual(8);
      expect(count).toBeLessThanOrEqual(64);
    }
  });

  it("es determinístico", () => {
    expect(simulatedReviewCount("wowbot-pedidos")).toBe(simulatedReviewCount("wowbot-pedidos"));
  });
});
