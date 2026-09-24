// WowAwe (2026-09-24) — "Índice de Asombro" 100% SIMULADO. El estudio
// real (ver PLAN.md) mide esto con visión por computadora (proporción
// de encuadre ocupada por la persona, intensidad de la Unidad de Acción
// 12 de la sonrisa) sobre las fotos — este proyecto no tiene esa
// infraestructura construida (ni ninguna de IA real, confirmado). En vez
// de fingir un análisis que no existe, generamos un número orientativo
// al azar dentro de un rango plausible, siempre con la misma etiqueta
// "simulado, no es una medición clínica real" en la UI.

// Rango 40-85: ni siempre bajo (desalentador, sin sentido) ni siempre
// alto (vacío de significado) — deja lugar a que la tendencia semanal
// se vea variar de verdad.
export function generateSimulatedAweIndex(): number {
  return 40 + Math.floor(Math.random() * 46);
}
