// Viaje del Cliente -- catálogo de puertas de acceso (2026-10-07).
// Fuente: MENU_ACCESO_LEGACY v1.1 (Drive, MAMEN/HorusEye N3, 2026-10-07),
// reconciliado en docs/WHITEPAPER-ADENDA-2026-10-07.md sección 9. Mismo
// patrón que lib/legacyProgramDurations.ts -- módulo plano sin "use
// server" (un archivo "use server" solo puede exportar funciones async),
// usado tanto por la UI del colaborador como por la server action que
// valida antes de guardar.
//
// `precioDefault` es la referencia/hipótesis del menú -- el número REAL
// negociado con cada cliente se guarda aparte, en
// ProgramMembership.priceAgreedUsd (campo libre, no constreñido a este
// catálogo).
export const ACCESS_DOORS = [
  {
    key: "empezar",
    nombre: "Empezar (Gratis)",
    tiempo: "Inmediato",
    humanos: "0",
    precioDefault: 0,
    paymentModels: ["suscripcion"],
  },
  {
    key: "armar",
    nombre: "Armar (Express)",
    tiempo: "2h + ≥3 días",
    humanos: "0 -- todo IA",
    precioDefault: 99,
    paymentModels: ["unico"],
  },
  {
    key: "emprendedor",
    nombre: "Con Expertos -- Emprendedor",
    tiempo: "2 semanas",
    humanos: "Expertos",
    precioDefault: 249,
    paymentModels: ["unico", "cuotas", "bolsa_horas"],
  },
  {
    key: "constructor",
    nombre: "Con Expertos -- Constructor",
    tiempo: "1 mes",
    humanos: "Expertos",
    precioDefault: 399,
    paymentModels: ["unico", "cuotas"],
  },
  {
    key: "arquitecto",
    nombre: "Arquitecto (Legacy completo)",
    tiempo: "3 meses",
    humanos: "Oreja, maestro, consultor de negocio",
    precioDefault: 500,
    paymentModels: ["unico", "cuotas", "abono_ascenso"],
  },
  {
    key: "pyme",
    nombre: "Negocio -- Pyme",
    tiempo: "3 meses",
    humanos: "Consultores reales",
    precioDefault: 1500,
    paymentModels: ["unico", "cuotas", "retainer"],
  },
  {
    key: "pyme_plus",
    nombre: "Negocio -- Pyme+",
    tiempo: "3 meses",
    humanos: "Expertos y especialistas, real y creciente",
    precioDefault: 3500,
    paymentModels: ["unico", "retainer", "bolsa_horas"],
  },
  {
    key: "programa",
    nombre: "Negocio -- Programa",
    tiempo: "Continuo",
    humanos: "Expertos y especialistas a tiempo completo",
    precioDefault: 10000,
    paymentModels: ["retainer", "participacion"],
  },
] as const;

export type AccessDoorKey = (typeof ACCESS_DOORS)[number]["key"];
export type AccessDoor = (typeof ACCESS_DOORS)[number];

export function findAccessDoor(key: string): AccessDoor | undefined {
  return ACCESS_DOORS.find((d) => d.key === key);
}

export function isValidPaymentModel(doorKey: string, model: string): boolean {
  const door = findAccessDoor(doorKey);
  if (!door) return false;
  return (door.paymentModels as readonly string[]).includes(model);
}
