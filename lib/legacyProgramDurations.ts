// PASO 6 (2026-10-02) -- separado de app/c/legacy-funnel-actions.ts a
// propósito: un archivo "use server" solo puede exportar funciones
// async (todo lo demás se pierde/rompe al cruzar al bundle de cliente --
// confirmado en runtime: "PROGRAM_DURATIONS.map is not a function" al
// importarlo desde LyCardView.tsx). Este array lo usan los dos lados
// (la UI para los botones, la acción para validar), así que vive acá,
// un módulo plano sin "use server".
export const PROGRAM_DURATIONS = [
  { id: "3dias", label: "3 días" },
  { id: "1semana", label: "1 semana" },
  { id: "15dias", label: "15 días" },
  { id: "1mes", label: "1 mes" },
  { id: "3meses", label: "3 meses" },
] as const;
