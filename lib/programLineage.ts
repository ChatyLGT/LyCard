export type ProgramLineageNode = { id: string; originProgramId: string | null };

// Todo Programa nuevo deriva de uno previo (2026-10-07, diagnóstico del
// desmadre "dos Legacys/HeroSuite no se conecta"): el único chequeo que
// existía antes era el self-reference directo (A -> A). Esto cubre el
// caso general -- caminar la cadena de origen desde candidateOriginId
// hacia arriba y ver si en algún punto se vuelve a programId, sea en 1
// salto o en 5. maxHops protege contra un ciclo que ya existiera en datos
// corruptos (no debería pasar con esto puesto, pero si pasa no cuelga).
export function wouldCreateCycle(
  programs: ProgramLineageNode[],
  programId: string,
  candidateOriginId: string | null
): boolean {
  if (!candidateOriginId) return false;
  if (candidateOriginId === programId) return true;

  const byId = new Map(programs.map((p) => [p.id, p]));
  const maxHops = programs.length + 1;
  let current: string | null = candidateOriginId;
  let hops = 0;

  while (current && hops <= maxHops) {
    if (current === programId) return true;
    current = byId.get(current)?.originProgramId ?? null;
    hops++;
  }

  return false;
}
