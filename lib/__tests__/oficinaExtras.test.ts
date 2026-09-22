import { describe, it, expect } from "vitest";
import {
  pickPhraseOfTheDay,
  parseRealityCheckKpis,
  parseNewsItems,
  parseCalendarEvents,
  parseMotivationalPhrases,
  generateSimulatedKpis,
  parseOficinaExtrasFormData,
  DEFAULT_REALITY_CHECK_KPIS,
} from "@/lib/oficinaExtras";

// Fase E1 de Oficina Virtual (docs del plan: "banner animado con una frase
// motivacional del día" + KPIs/noticias/calendario inventados por el N0).
// pickPhraseOfTheDay es la única función con lógica real acá — decide qué
// frase ve cada visitante, todo el día, sin llamar a ningún modelo en vivo
// (decisión explícita de Gunnar). Los parsers son la puerta de entrada de
// JSON no confiable (columna Json de Postgres) hacia el resto de la app —
// mismo criterio que ya cubren authScope/leads: si esto falla mal, se
// rompe la Oficina en producción con datos corruptos/viejos.

describe("pickPhraseOfTheDay", () => {
  it("happy path: mismo día siempre devuelve la misma frase (determinístico, no aleatorio)", () => {
    const phrases = ["Frase A", "Frase B", "Frase C"];
    const date = new Date(2026, 8, 22); // 22 de septiembre
    expect(pickPhraseOfTheDay(phrases, date)).toBe(pickPhraseOfTheDay(phrases, date));
  });

  it("happy path: rota — el día siguiente da otra frase cuando el largo del pool no lo alinea de nuevo", () => {
    const phrases = ["Frase A", "Frase B"];
    const day1 = pickPhraseOfTheDay(phrases, new Date(2026, 8, 22));
    const day2 = pickPhraseOfTheDay(phrases, new Date(2026, 8, 23));
    expect(day1).not.toBe(day2);
  });

  it("edge case: pool de una sola frase — siempre esa, todos los días", () => {
    const phrases = ["La única"];
    expect(pickPhraseOfTheDay(phrases, new Date(2026, 0, 1))).toBe("La única");
    expect(pickPhraseOfTheDay(phrases, new Date(2026, 11, 31))).toBe("La única");
  });

  it("caso de error: pool vacío (N0 todavía no cargó ninguna) devuelve null, no crashea", () => {
    expect(pickPhraseOfTheDay([], new Date())).toBeNull();
  });
});

describe("parseRealityCheckKpis", () => {
  it("happy path: un array válido de KPIs se parsea tal cual", () => {
    const raw = [{ key: "legacys", label: "Legacys activos", value: "12", unit: "", trend: [1, 2, 3] }];
    expect(parseRealityCheckKpis(raw)).toEqual([
      { key: "legacys", label: "Legacys activos", value: "12", unit: "", trend: [1, 2, 3] },
    ]);
  });

  it("edge case: filtra entradas sin key/label (dato corrupto), y elementos que ni siquiera son objetos", () => {
    const raw = [
      { key: "ok", label: "Bien", value: "1", unit: "", trend: [] },
      { key: "", label: "Sin key", value: "1", unit: "", trend: [] },
      { key: "sin-label", label: "", value: "1", unit: "", trend: [] },
      "esto-no-es-un-objeto",
      null,
    ];
    const parsed = parseRealityCheckKpis(raw);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].key).toBe("ok");
  });

  it("caso de error: valor que no es un array (JSON viejo/corrupto) devuelve lista vacía, no crashea", () => {
    expect(parseRealityCheckKpis(null)).toEqual([]);
    expect(parseRealityCheckKpis("no-es-un-array")).toEqual([]);
    expect(parseRealityCheckKpis({ key: "no-envuelto-en-array" })).toEqual([]);
  });

  it("caso de error: campos con el tipo equivocado (JSON corrupto) caen al fallback en vez de crashear", () => {
    const raw = [{ key: "k", label: "L", value: 42, unit: null, trend: ["no-numero", 3, null, 7] }];
    expect(parseRealityCheckKpis(raw)).toEqual([{ key: "k", label: "L", value: "", unit: "", trend: [3, 7] }]);
  });

  it("caso de error: trend que no es un array cae a lista vacía", () => {
    const raw = [{ key: "k", label: "L", value: "1", unit: "", trend: "no-es-array" }];
    expect(parseRealityCheckKpis(raw)[0].trend).toEqual([]);
  });

  it("caso de error: key/label con tipo equivocado caen a string vacío (y por eso se filtran)", () => {
    const raw = [{ key: 1, label: 2, value: "1", unit: "", trend: [] }];
    expect(parseRealityCheckKpis(raw)).toEqual([]);
  });
});

describe("parseNewsItems", () => {
  it("happy path: una noticia válida se parsea tal cual", () => {
    const raw = [{ id: "n1", title: "Novedad", body: "Cuerpo", date: "2026-09-22T00:00:00.000Z" }];
    expect(parseNewsItems(raw)).toEqual(raw);
  });

  it("edge case: descarta entradas sin id/title", () => {
    const raw = [{ id: "", title: "Sin id", body: "", date: "" }];
    expect(parseNewsItems(raw)).toEqual([]);
  });

  it("caso de error: input no-array devuelve lista vacía", () => {
    expect(parseNewsItems(undefined)).toEqual([]);
  });

  it("caso de error: campos con el tipo equivocado caen al fallback vacío en vez de crashear", () => {
    const raw = [{ id: "n1", title: "Novedad", body: 42, date: null }];
    expect(parseNewsItems(raw)).toEqual([{ id: "n1", title: "Novedad", body: "", date: "" }]);
  });

  it("caso de error: id/title con tipo equivocado caen a string vacío (y por eso se filtran)", () => {
    const raw = [{ id: 1, title: 2, body: "b", date: "2026-01-01" }];
    expect(parseNewsItems(raw)).toEqual([]);
  });
});

describe("parseCalendarEvents", () => {
  it("happy path: un evento válido con hora opcional se parsea tal cual", () => {
    const raw = [{ id: "e1", title: "Sesión 1", date: "2026-09-25T00:00:00.000Z", time: "10:00" }];
    expect(parseCalendarEvents(raw)).toEqual(raw);
  });

  it("edge case: evento sin date se descarta (el calendario lo ordena por fecha, no puede faltar)", () => {
    const raw = [{ id: "e1", title: "Sin fecha" }];
    expect(parseCalendarEvents(raw)).toEqual([]);
  });

  it("caso de error: input no-array devuelve lista vacía", () => {
    expect(parseCalendarEvents(42)).toEqual([]);
  });

  it("caso de error: date/time con el tipo equivocado — date corrupta lo descarta, time cae a undefined", () => {
    const raw = [
      { id: "e1", title: "Sesión 1", date: 123, time: 456 },
      { id: "e2", title: "Sesión 2", date: "2026-09-25T00:00:00.000Z", time: 456 },
    ];
    const parsed = parseCalendarEvents(raw);
    expect(parsed).toEqual([{ id: "e2", title: "Sesión 2", date: "2026-09-25T00:00:00.000Z", time: undefined }]);
  });

  it("caso de error: id/title con tipo equivocado caen a string vacío (y por eso se filtran)", () => {
    const raw = [{ id: 1, title: 2, date: "2026-01-01" }];
    expect(parseCalendarEvents(raw)).toEqual([]);
  });
});

describe("parseMotivationalPhrases", () => {
  it("happy path: un array de strings se devuelve tal cual", () => {
    expect(parseMotivationalPhrases(["Frase A", "Frase B"])).toEqual(["Frase A", "Frase B"]);
  });

  it("edge case: descarta strings vacíos/solo-espacios y valores que no son string", () => {
    expect(parseMotivationalPhrases(["Frase real", "  ", "", 42, null])).toEqual(["Frase real"]);
  });

  it("caso de error: input no-array devuelve lista vacía", () => {
    expect(parseMotivationalPhrases({ not: "an array" })).toEqual([]);
  });
});

describe("generateSimulatedKpis", () => {
  it("happy path: devuelve un KPI por cada ejemplo fijo, con key/label/unit intactos", () => {
    const generated = generateSimulatedKpis();
    expect(generated).toHaveLength(DEFAULT_REALITY_CHECK_KPIS.length);
    generated.forEach((kpi, i) => {
      expect(kpi.key).toBe(DEFAULT_REALITY_CHECK_KPIS[i].key);
      expect(kpi.label).toBe(DEFAULT_REALITY_CHECK_KPIS[i].label);
      expect(kpi.unit).toBe(DEFAULT_REALITY_CHECK_KPIS[i].unit);
    });
  });

  it("edge case: el jitter nunca lleva el trend a negativo, sin importar la tirada de dados", () => {
    // 200 corridas cubre las 3 salidas posibles de Math.random() (-1/0/+1)
    // muchas veces cada una — si el clamp a 0 tuviera un bug, esto lo agarra.
    for (let i = 0; i < 200; i++) {
      const generated = generateSimulatedKpis();
      for (const kpi of generated) {
        expect(kpi.trend.every((n) => n >= 0)).toBe(true);
        expect(kpi.value).toBe(String(kpi.trend[kpi.trend.length - 1]));
      }
    }
  });

  it("caso de error: no muta los ejemplos fijos (DEFAULT_REALITY_CHECK_KPIS sigue igual después de generar)", () => {
    const before = JSON.stringify(DEFAULT_REALITY_CHECK_KPIS);
    generateSimulatedKpis();
    expect(JSON.stringify(DEFAULT_REALITY_CHECK_KPIS)).toBe(before);
  });
});

describe("parseOficinaExtrasFormData", () => {
  it("happy path: lee objetivo + los 3 campos Json del FormData que manda OficinaExtrasEditor", () => {
    const fd = new FormData();
    fd.set("oficinaObjetivo", "Cerrar 3 Legacys");
    fd.set("realityCheckKpis", JSON.stringify([{ key: "k", label: "L", value: "1", unit: "", trend: [1, 2] }]));
    fd.set("newsItems", JSON.stringify([{ id: "n1", title: "Novedad", body: "", date: "2026-01-01" }]));
    fd.set("calendarEvents", JSON.stringify([{ id: "e1", title: "Sesión", date: "2026-01-02" }]));

    const result = parseOficinaExtrasFormData(fd);
    expect(result.oficinaObjetivo).toBe("Cerrar 3 Legacys");
    expect(result.realityCheckKpis).toEqual([{ key: "k", label: "L", value: "1", unit: "", trend: [1, 2] }]);
    expect(result.newsItems).toHaveLength(1);
    expect(result.calendarEvents).toHaveLength(1);
  });

  it("edge case: FormData vacío (campos nunca enviados) devuelve objetivo vacío y las 3 listas vacías", () => {
    const result = parseOficinaExtrasFormData(new FormData());
    expect(result).toEqual({ oficinaObjetivo: "", realityCheckKpis: [], newsItems: [], calendarEvents: [] });
  });

  it("caso de error: JSON roto en cualquiera de los 3 campos no crashea, cae a lista vacía", () => {
    const fd = new FormData();
    fd.set("realityCheckKpis", "{esto no es json válido");
    fd.set("newsItems", "{esto no es json válido");
    fd.set("calendarEvents", "{esto no es json válido");

    expect(parseOficinaExtrasFormData(fd)).toEqual({
      oficinaObjetivo: "",
      realityCheckKpis: [],
      newsItems: [],
      calendarEvents: [],
    });
  });
});
