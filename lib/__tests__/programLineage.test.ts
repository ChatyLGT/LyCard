import { describe, expect, it } from "vitest";
import { wouldCreateCycle } from "@/lib/programLineage";

describe("wouldCreateCycle", () => {
  it("no detecta ciclo cuando candidateOriginId es null (raíz)", () => {
    expect(wouldCreateCycle([{ id: "a", originProgramId: null }], "a", null)).toBe(false);
  });

  it("detecta el self-reference directo (A -> A)", () => {
    expect(wouldCreateCycle([{ id: "a", originProgramId: null }], "a", "a")).toBe(true);
  });

  it("no detecta ciclo en una cadena lineal válida (A <- B <- C)", () => {
    const programs = [
      { id: "a", originProgramId: null },
      { id: "b", originProgramId: "a" },
      { id: "c", originProgramId: "b" },
    ];
    // D nuevo, originándose de C -- válido, nadie vuelve a D.
    expect(wouldCreateCycle(programs, "d", "c")).toBe(false);
  });

  it("detecta un ciclo multi-hop (A -> B -> C, e intentar que A derive de C)", () => {
    const programs = [
      { id: "a", originProgramId: "c" }, // se está intentando setear esto
      { id: "b", originProgramId: "a" },
      { id: "c", originProgramId: "b" },
    ];
    // Si A ya apunta a C y C apunta a B y B apunta a A... pero lo que
    // probamos es: "¿asignar C como origen de A crea un ciclo?", caminando
    // desde C: C -> b -> a -- llega de vuelta a "a", es ciclo.
    expect(wouldCreateCycle(programs, "a", "c")).toBe(true);
  });

  it("candidato inexistente en el set (DB vacía/inconsistente) no cuelga, devuelve false", () => {
    expect(wouldCreateCycle([{ id: "a", originProgramId: null }], "a", "ghost")).toBe(false);
  });
});
