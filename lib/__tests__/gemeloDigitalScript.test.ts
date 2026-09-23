import { describe, it, expect } from "vitest";
import { buildGemeloScript, type GemeloContext } from "@/lib/gemeloDigitalScript";

// Bot Warren (pedido de Gunnar, 2026-09-23) — el guión real de la
// simulación del Gemelo Digital. Vale la pena cubrirlo bien: si esto
// falla mal, la Oficina de alguien muestra datos de otro Programa, un
// nodo roto (options que apuntan a un id que no existe), o una respuesta
// vacía en vez del caso honesto ("todavía no tenés KPIs cargados").

const baseCtx: GemeloContext = {
  ownerName: "Ana",
  roleLabel: "Directora de Estrategia",
  programName: "Digital Kingdom",
  quote: "La excelencia no es un acto, es un hábito.",
  objetivo: "Cerrar 3 clientes nuevos este mes.",
  enabledSkillNames: ["Brief de reuniones", "Notas de Voz"],
  kpis: [{ key: "ventas", label: "Ventas del mes", value: "42", unit: "k", trend: [10, 20, 42] }],
  kpisAreDefault: false,
};

const ALL_NODE_IDS = ["start", "menu", "vender", "app", "analisis", "redes", "facturar", "pronostico", "end"];

describe("buildGemeloScript", () => {
  it("estructura: todos los nodos existen y cada option apunta a un nodo real", () => {
    const script = buildGemeloScript(baseCtx);
    expect(Object.keys(script).sort()).toEqual([...ALL_NODE_IDS].sort());
    for (const node of Object.values(script)) {
      expect(node.botLines.length).toBeGreaterThan(0);
      for (const opt of node.options) {
        expect(ALL_NODE_IDS).toContain(opt.next);
      }
    }
  });

  it("start: saluda por nombre real y ofrece un único camino al menú", () => {
    const script = buildGemeloScript(baseCtx);
    expect(script.start.botLines[0]).toContain("Ana");
    expect(script.start.options).toEqual([{ label: "Dale, arrancamos", next: "menu" }]);
  });

  it("menu: 7 opciones, la última siempre termina la conversación", () => {
    const script = buildGemeloScript(baseCtx);
    expect(script.menu.options).toHaveLength(7);
    expect(script.menu.options.at(-1)).toEqual({ label: "Nada por ahora, gracias", next: "end" });
  });

  it("end: no tiene opciones (así el chat sabe que terminó)", () => {
    const script = buildGemeloScript(baseCtx);
    expect(script.end.options).toHaveLength(0);
  });

  it("vender: usa la cita real de la Card cuando existe", () => {
    const script = buildGemeloScript(baseCtx);
    expect(script.vender.botLines.some((l) => l.includes(baseCtx.quote))).toBe(true);
    expect(script.vender.botLines.some((l) => l.startsWith("Simulación —"))).toBe(true);
  });

  it("vender: sin cita, cae al objetivo del día", () => {
    const script = buildGemeloScript({ ...baseCtx, quote: "" });
    expect(script.vender.botLines.some((l) => l.includes(baseCtx.objetivo))).toBe(true);
  });

  it("vender: sin cita ni objetivo, cae a un genérico que igual nombra el Programa real", () => {
    const script = buildGemeloScript({ ...baseCtx, quote: "", objetivo: "" });
    expect(script.vender.botLines.some((l) => l.includes(baseCtx.programName))).toBe(true);
  });

  it("app: lista los Superpoderes reales habilitados", () => {
    const script = buildGemeloScript(baseCtx);
    expect(script.app.botLines[0]).toContain("Brief de reuniones, Notas de Voz");
  });

  it("app: sin Superpoderes habilitados, no queda una lista vacía", () => {
    const script = buildGemeloScript({ ...baseCtx, enabledSkillNames: [] });
    expect(script.app.botLines[0]).toContain("tus Superpoderes de siempre");
  });

  it("analisis: con KPI real (no default), lo usa y no muestra la advertencia de ejemplo", () => {
    const script = buildGemeloScript(baseCtx);
    expect(script.analisis.botLines[0]).toContain("Ventas del mes: 42k");
    expect(script.analisis.botLines.some((l) => l.includes("números reales de hoy"))).toBe(true);
  });

  it("analisis: con KPI de ejemplo (kpisAreDefault), avisa que son de ejemplo", () => {
    const script = buildGemeloScript({ ...baseCtx, kpisAreDefault: true });
    expect(script.analisis.botLines.some((l) => l.includes("de ejemplo"))).toBe(true);
  });

  it("analisis: sin ningún KPI cargado, caso honesto en vez de inventar un número", () => {
    const script = buildGemeloScript({ ...baseCtx, kpis: [] });
    expect(script.analisis.botLines[0]).toContain("Todavía no tenés KPIs cargados");
  });

  it("redes: arma un caption con el mismo gancho de venta", () => {
    const script = buildGemeloScript(baseCtx);
    expect(script.redes.botLines.some((l) => l.includes(baseCtx.quote))).toBe(true);
  });

  it("facturar: nombra el Programa real en la línea de factura", () => {
    const script = buildGemeloScript(baseCtx);
    expect(script.facturar.botLines[0]).toContain(baseCtx.programName);
  });

  it("pronostico: KPI subiendo (trend creciente) se describe como tal", () => {
    const script = buildGemeloScript({ ...baseCtx, kpis: [{ key: "k", label: "Ventas", value: "10", unit: "", trend: [1, 5, 10] }] });
    expect(script.pronostico.botLines[0]).toContain("subiendo");
  });

  it("pronostico: KPI bajando (trend decreciente) se describe como tal", () => {
    const script = buildGemeloScript({ ...baseCtx, kpis: [{ key: "k", label: "Ventas", value: "10", unit: "", trend: [10, 5, 1] }] });
    expect(script.pronostico.botLines[0]).toContain("bajando");
  });

  it("pronostico: KPI sin suficientes puntos de trend se describe como estable", () => {
    const script = buildGemeloScript({ ...baseCtx, kpis: [{ key: "k", label: "Ventas", value: "10", unit: "", trend: [10] }] });
    expect(script.pronostico.botLines[0]).toContain("estable");
  });

  it("pronostico: KPI con trend plano (primer y último punto iguales) se describe como estable", () => {
    const script = buildGemeloScript({ ...baseCtx, kpis: [{ key: "k", label: "Ventas", value: "10", unit: "", trend: [10, 20, 10] }] });
    expect(script.pronostico.botLines[0]).toContain("estable");
  });

  it("pronostico: sin ningún KPI cargado, caso honesto en vez de inventar una serie", () => {
    const script = buildGemeloScript({ ...baseCtx, kpis: [] });
    expect(script.pronostico.botLines[0]).toContain("no tengo una serie real");
  });

  it("end: cierra nombrando el rol y el Programa reales", () => {
    const script = buildGemeloScript(baseCtx);
    expect(script.end.botLines[0]).toContain(baseCtx.roleLabel);
    expect(script.end.botLines[0]).toContain(baseCtx.programName);
  });
});
