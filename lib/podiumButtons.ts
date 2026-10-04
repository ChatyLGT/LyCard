// Botones del podio configurables por Programa (2026-10-04, pedido de
// Gunnar: "poder elegir desde el dashboard de cada programa los Botones
// que ibamos a colocar abajo.. son 3 botones.. los laterales pequeños y
// el principal grande.. el N0 decide que poner alli"). Solo los 2 cubos
// LATERALES son configurables -- el del centro queda fijo en el QR real.
export type PodiumButtonKind = "info" | "story" | "invite" | "vault" | "ai_agent";

export const PODIUM_BUTTON_KINDS: PodiumButtonKind[] = ["info", "story", "invite", "vault", "ai_agent"];

export type PodiumButtonConfig = {
  slot: "left" | "right";
  kind: PodiumButtonKind;
  // Solo tienen sentido para kind:"ai_agent" -- lo que generó el agente
  // la última vez que el N0 lo pidió (lib/aiAgent.ts). Vacíos para
  // cualquier otro kind.
  aiTitle: string;
  aiIcon: string;
  aiBody: string;
  // El pedido original en lenguaje natural que escribió el N0 -- se
  // guarda para poder mostrarlo de nuevo en el dashboard y permitir
  // "regenerar" sin tener que volver a escribirlo.
  aiPrompt: string;
};

export function parsePodiumButtons(value: unknown): PodiumButtonConfig[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((v): v is Record<string, unknown> => typeof v === "object" && v !== null)
    .map((v): PodiumButtonConfig => ({
      slot: v.slot === "right" ? "right" : "left",
      kind: PODIUM_BUTTON_KINDS.includes(v.kind as PodiumButtonKind) ? (v.kind as PodiumButtonKind) : "info",
      aiTitle: typeof v.aiTitle === "string" ? v.aiTitle : "",
      aiIcon: typeof v.aiIcon === "string" ? v.aiIcon : "",
      aiBody: typeof v.aiBody === "string" ? v.aiBody : "",
      aiPrompt: typeof v.aiPrompt === "string" ? v.aiPrompt : "",
    }))
    // Un slot por lado nada más -- si por error hay 2 "left" se queda
    // con el primero, igual que un Map de slot->config.
    .filter((item, idx, arr) => arr.findIndex((o) => o.slot === item.slot) === idx);
}

export function getPodiumButton(items: PodiumButtonConfig[], slot: "left" | "right"): PodiumButtonConfig | null {
  return items.find((i) => i.slot === slot) ?? null;
}

// Reemplaza (o agrega) la config de UN slot dentro del array completo --
// mismo criterio de "reemplazo total al guardar" que medalScale/
// officeSkills, pero acá granular por slot porque el form del dashboard
// edita un lado a la vez.
export function upsertPodiumButton(items: PodiumButtonConfig[], next: PodiumButtonConfig): PodiumButtonConfig[] {
  const rest = items.filter((i) => i.slot !== next.slot);
  return [...rest, next];
}

// Bóveda Legacy / "Legacy Vault" -- una fuente del dossier a nivel
// Programa (2026-10-04). Mismo shape conceptual que CardRecipientSource
// pero sin archivos (JSON plano, no hay storage por Programa todavía) --
// alcanza para link y nota de texto, que es lo que Gunnar pidió
// replicar ("el link a su notebooklm").
export type VaultSourceType = "link" | "texto";

export type VaultSource = {
  type: VaultSourceType;
  label: string;
  value: string;
};

export function parseVaultSources(value: unknown): VaultSource[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((v): v is Record<string, unknown> => typeof v === "object" && v !== null)
    .map((v): VaultSource => ({
      type: v.type === "texto" ? "texto" : "link",
      label: typeof v.label === "string" ? v.label : "",
      value: typeof v.value === "string" ? v.value : "",
    }))
    .filter((item) => item.value.trim());
}
