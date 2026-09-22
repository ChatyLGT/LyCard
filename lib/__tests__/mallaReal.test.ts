import { describe, it, expect } from "vitest";
import { buildRootMallaGraph, buildMemberFractalGraph } from "@/lib/mallaReal";

// La Malla real (pedido de Gunnar, 2026-09-22) — reemplaza los datasets
// hardcodeados de lib/mallaData.ts por un grafo derivado de datos de
// verdad. Estas dos funciones son la única lógica real: arman
// nodos/edges a partir de Programas y de cadenas de referidos
// (ProgramMembership/CardNetworkMembership, misma forma). Si esto falla
// mal, la Malla muestra conexiones que no existen o pierde miembros
// reales del grafo — vale la pena cubrirlo bien.

describe("buildRootMallaGraph", () => {
  it("happy path: Legacy + triada N1 fija + un nodo N3 por cada Programa real", () => {
    const graph = buildRootMallaGraph([
      { id: "p1", name: "MLQR" },
      { id: "p2", name: "Digital Kingdom" },
    ]);
    expect(graph.nodes.map((n) => n.id)).toEqual([
      "n0-legacy", "n1-einar", "n1-chaty", "n1-warren", "program-p1", "program-p2",
    ]);
    expect(graph.edges).toContainEqual(["n0-legacy", "program-p1"]);
    expect(graph.edges).toContainEqual(["n0-legacy", "program-p2"]);
    expect(graph.info["program-p2"].title).toBe("Digital Kingdom");
  });

  it("edge case: sin Programas reales, la triada N1 sigue ahí (nunca queda un grafo vacío)", () => {
    const graph = buildRootMallaGraph([]);
    expect(graph.nodes).toHaveLength(4); // legacy + 3 de la triada
    expect(graph.edges).toHaveLength(3);
  });
});

describe("buildMemberFractalGraph", () => {
  it("happy path: un miembro sin referente cuelga directo del root", () => {
    const graph = buildMemberFractalGraph("program-p1", "MLQR", [
      { membershipId: "m1", name: "Ana", status: "active", referredByMembershipId: null },
    ]);
    expect(graph.edges).toContainEqual(["program-p1", "member-m1"]);
  });

  it("happy path: la cadena de referidos arma el fractal real (m2 referido por m1, no por el root)", () => {
    const graph = buildMemberFractalGraph("program-p1", "MLQR", [
      { membershipId: "m1", name: "Ana", status: "active", referredByMembershipId: null },
      { membershipId: "m2", name: "Beto", status: "invited", referredByMembershipId: "m1" },
    ]);
    expect(graph.edges).toContainEqual(["member-m1", "member-m2"]);
    expect(graph.edges).not.toContainEqual(["program-p1", "member-m2"]);
  });

  it("edge case: referredByMembershipId apunta a alguien fuera de esta lista (dato de otro alcance) — cae al root en vez de crear un edge huérfano", () => {
    const graph = buildMemberFractalGraph("program-p1", "MLQR", [
      { membershipId: "m1", name: "Ana", status: "active", referredByMembershipId: "fantasma-de-otro-programa" },
    ]);
    expect(graph.edges).toContainEqual(["program-p1", "member-m1"]);
  });

  it("edge case: sin miembros, el grafo es solo el nodo raíz, sin edges", () => {
    const graph = buildMemberFractalGraph("program-p1", "MLQR", []);
    expect(graph.nodes).toHaveLength(1);
    expect(graph.edges).toHaveLength(0);
  });

  it("caso de error: un status inválido/viejo (dato corrupto) cae a 'Invitado' en vez de crashear", () => {
    const graph = buildMemberFractalGraph("program-p1", "MLQR", [
      { membershipId: "m1", name: "Ana", status: "estado-que-no-existe", referredByMembershipId: null },
    ]);
    expect(graph.info["member-m1"].subtitle).toBe("Invitado");
  });

  it("caso de error: nombre vacío (dato viejo/corrupto) no rompe el label del nodo", () => {
    const graph = buildMemberFractalGraph("program-p1", "MLQR", [
      { membershipId: "m1", name: "", status: "active", referredByMembershipId: null },
    ]);
    expect(graph.info["member-m1"].title).toBe("(sin nombre)");
  });

  it("caso de error: el nombre del referente está vacío — el texto 'Referido por' no queda roto", () => {
    const graph = buildMemberFractalGraph("program-p1", "MLQR", [
      { membershipId: "m1", name: "", status: "active", referredByMembershipId: null },
      { membershipId: "m2", name: "Beto", status: "invited", referredByMembershipId: "m1" },
    ]);
    expect(graph.info["member-m2"].body).toBe("Referido por (sin nombre).");
  });
});
