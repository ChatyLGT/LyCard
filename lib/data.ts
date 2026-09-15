export const MEDALS = [
  {
    id: "bronce",
    es: "Bronce",
    en: "Bronze",
    esSub: "Honor",
    enSub: "Honor",
    gem: "linear-gradient(145deg,#E8B27A,#8C5A2B)",
  },
  {
    id: "plata",
    es: "Plata",
    en: "Silver",
    esSub: "Dist.",
    enSub: "Dist.",
    gem: "linear-gradient(145deg,#F2F2F2,#8E8E8E)",
  },
  {
    id: "oro",
    es: "Oro",
    en: "Gold",
    esSub: "Fiduc.",
    enSub: "Fiduc.",
    gem: "linear-gradient(145deg,#FFE6A3,#B8892A)",
  },
  {
    id: "platino",
    es: "Platino",
    en: "Platinum",
    esSub: "Gob.",
    enSub: "Gov.",
    gem: "linear-gradient(145deg,#FFFFFF,#BFC6CC)",
  },
  {
    id: "diamante",
    es: "Diamante",
    en: "Diamond",
    esSub: "Élite",
    enSub: "Elite",
    gem: "linear-gradient(145deg,#FFFFFF,#9ED8E8)",
  },
] as const;

export const RANKS = [
  { id: "curioso", es: "Curioso", en: "Curious", esSub: "Ingreso", enSub: "Entry", icon: "explore" },
  { id: "aprendiz", es: "Aprendiz", en: "Apprentice", esSub: "Formación", enSub: "Training", icon: "school" },
  { id: "practicante", es: "Practicante", en: "Practitioner", esSub: "Ejecución", enSub: "Execution", icon: "trending_up" },
  { id: "maestro", es: "Maestro", en: "Master", esSub: "Dominio", enSub: "Mastery", icon: "workspace_premium" },
  { id: "sherpa", es: "Sherpa", en: "Sherpa", esSub: "Guía", enSub: "Guide", icon: "terrain" },
  { id: "ancient", es: "Ancient", en: "Ancient", esSub: "Consejo", enSub: "Council", icon: "auto_awesome" },
] as const;

export const CHANNELS = [
  { id: "wa", label: "WhatsApp", icon: "chat" },
  { id: "ig", label: "Instagram", icon: "photo_camera" },
  { id: "li", label: "LinkedIn", icon: "work" },
  { id: "x", label: "X / Twitter", icon: "alternate_email" },
] as const;

export type MedalId = (typeof MEDALS)[number]["id"];
export type RankId = (typeof RANKS)[number]["id"];

export function medalById(id: string) {
  return MEDALS.find((m) => m.id === id) ?? MEDALS[2];
}

export function rankById(id: string) {
  return RANKS.find((r) => r.id === id) ?? RANKS[1];
}
