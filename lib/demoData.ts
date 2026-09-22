// Ambiente de datos mock (Fase E5) — piezas puras separadas de
// app/admin/demo-data/actions.ts para poder testearlas sin tocar la DB,
// mismo criterio shift-left del resto de esta sesión.

export const MAX_DEMO_COUNT = 20;
export const DEMO_CONFIRM_PHRASE = "BORRAR DEMO";

// Nombres de pila para que las N Cards generadas no se vean todas
// idénticas — cáscara honesta igual: todo lleva "Demo" en el nombre del
// Programa/tarjeta, nunca se pretende que sean personas reales.
export const DEMO_FIRST_NAMES = [
  "Alejandro", "Valentina", "Mateo", "Sofía", "Joaquín",
  "Martina", "Bruno", "Camila", "Tomás", "Lucía",
];

// El input de "cantidad" es un <input type="number"> — nada impide que
// alguien mande texto vacío, un negativo, un decimal, o 999999 a mano
// (DevTools, un form armado a mano). Nunca se confía en el navegador para
// esto: clampeado siempre entre 1 y MAX_DEMO_COUNT antes de generar nada.
export function clampDemoCount(raw: unknown): number {
  const n = Number(raw);
  if (!Number.isFinite(n)) return 1;
  return Math.min(Math.max(Math.round(n), 1), MAX_DEMO_COUNT);
}

// 1-indexed (el primer Programa generado es el índice 1, no 0) — rota el
// pool en vez de fallar cuando count > DEMO_FIRST_NAMES.length.
export function demoNameFor(index: number): string {
  return DEMO_FIRST_NAMES[(index - 1) % DEMO_FIRST_NAMES.length];
}
