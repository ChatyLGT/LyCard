import { describe, expect, it } from "vitest";
import { toCatalogEntry, matchSlotTemplates, type SlotTemplateCatalogEntry } from "@/lib/slotTemplates";

describe("toCatalogEntry", () => {
  it("parsea los tags Json crudos y deja el payload sin tocar", () => {
    const entry = toCatalogEntry({
      id: "t1",
      slotType: "escala",
      nombre: "Madurez Operativa",
      descripcion: "3 niveles",
      industryTags: ["iglesia"],
      painPointTags: ["adopcion"],
      payload: [{ clave: "diagnostico", nombre: "Diagnóstico" }],
    });
    expect(entry).toEqual({
      id: "t1",
      slotType: "escala",
      nombre: "Madurez Operativa",
      descripcion: "3 niveles",
      industryTags: ["iglesia"],
      painPointTags: ["adopcion"],
      payload: [{ clave: "diagnostico", nombre: "Diagnóstico" }],
    });
  });

  it("tags Json inválidos (no array) caen a []", () => {
    const entry = toCatalogEntry({
      id: "t2",
      slotType: "escala",
      nombre: "X",
      descripcion: "",
      industryTags: null,
      painPointTags: "no-es-array",
      payload: [],
    });
    expect(entry.industryTags).toEqual([]);
    expect(entry.painPointTags).toEqual([]);
  });
});

describe("matchSlotTemplates", () => {
  const catalog: SlotTemplateCatalogEntry[] = [
    { id: "a", slotType: "escala", nombre: "Madurez", descripcion: "", industryTags: ["iglesia"], painPointTags: ["adopcion"], payload: [] },
    { id: "b", slotType: "escala", nombre: "Adopción", descripcion: "", industryTags: ["restaurante"], painPointTags: ["adopcion"], payload: [] },
    { id: "c", slotType: "escala", nombre: "Genérica", descripcion: "", industryTags: [], painPointTags: [], payload: [] },
    { id: "d", slotType: "modal", nombre: "Modal X", descripcion: "", industryTags: ["iglesia"], painPointTags: ["adopcion"], payload: {} },
  ];

  it("filtra siempre por slotType, aunque matchee rubro/dolor de otro tipo", () => {
    const result = matchSlotTemplates(catalog, "escala", "iglesia", "adopcion");
    expect(result.map((t) => t.id)).not.toContain("d");
  });

  it("sin rubro ni dolor, devuelve TODOS los del slotType sin recortar a 3", () => {
    const result = matchSlotTemplates(catalog, "escala", null, null);
    expect(result.map((t) => t.id).sort()).toEqual(["a", "b", "c"]);
  });

  it("con rubro+dolor, puntúa y devuelve el mejor match primero", () => {
    const result = matchSlotTemplates(catalog, "escala", "iglesia", "adopcion");
    expect(result[0].id).toBe("a"); // matchea rubro Y dolor (score 2)
  });

  it("con filtro, descarta los que no matchean ningún criterio", () => {
    const result = matchSlotTemplates(catalog, "escala", "iglesia", "adopcion");
    expect(result.map((t) => t.id)).not.toContain("c"); // sin tags, score 0
  });

  it("catálogo vacío devuelve vacío", () => {
    expect(matchSlotTemplates([], "escala", null, null)).toEqual([]);
  });

  it("slotType sin ningún template devuelve vacío", () => {
    expect(matchSlotTemplates(catalog, "officeSkill", null, null)).toEqual([]);
  });
});
