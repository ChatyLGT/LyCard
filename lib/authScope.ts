// Extraído a propósito en su propio módulo, sin ningún import de
// `next/headers`/`prisma`/`jose` (auditoría CQE, 2026-09-23): son las
// dos funciones puras más críticas del panel de Admin, y separadas así
// se pueden unit-testear al 100% sin mockear cookies/DB — la puerta de
// cobertura de `vitest.config.ts` apunta directo a este archivo.
//
// Antes de esto, el mismo booleano (`scope.programId === null`) estaba
// reimplementado a mano en ~13 lugares distintos de app/admin/**, cada
// uno confiando en que la próxima persona copie la lógica exacta. Es el
// punto de mayor daño potencial del panel entero: un solo `||` en vez
// de `&&`, o un chequeo olvidado, filtra datos de un Programa a un N0
// de otro — ya señalado como prioridad #1 de testing en
// docs/AUDITORIA-TECNICA-2026-09.md §3.3, antes de que existiera
// ninguna suite en el repo. `lib/auth.ts` re-exporta ambas para no
// tener que tocar los ~14 archivos que ya las importan de ahí.

export type AdminScope = { id: string; programId: string | null };

export function isMasterN0Scope(scope: AdminScope): boolean {
  return scope.programId === null;
}

// Un N0 de Programa solo puede tocar SU propio Programa; MasterN0 puede
// tocar cualquiera. `programId` acá es el recurso que se está por leer/
// escribir (nunca el del scope) — puede ser `null` (ej. una Card
// company/personal sin Program): un N0 escopeado nunca tiene acceso a
// eso, solo MasterN0.
export function canAccessProgram(scope: AdminScope, programId: string | null): boolean {
  return isMasterN0Scope(scope) || scope.programId === programId;
}
