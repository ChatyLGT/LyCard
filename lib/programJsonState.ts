import type { Discard, Issue, Plan } from "@/lib/programJson";

// Estado que devuelve la acción de importar/validar (app/admin/programs/json-actions.ts)
// y que dibuja components/ProgramJsonPanel.tsx. Vive acá porque un archivo
// "use server" solo puede exportar funciones async.
export type ProgramJsonState = {
  status: "idle" | "error" | "valid" | "imported";
  errors: Issue[];
  discarded: Discard[];
  warnings: string[];
  lines: string[];
  counts: Plan["counts"] | null;
  headline: string;
  programId?: string;
  version?: number;
};

export const EMPTY_PROGRAM_JSON_STATE: ProgramJsonState = { status: "idle", errors: [], discarded: [], warnings: [], lines: [], counts: null, headline: "" };
