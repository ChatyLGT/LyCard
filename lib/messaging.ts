// Mensajería Interna (2026-09-24) — ver PLAN.md "Mensajería Interna".
// Vocabulario fijo de canales + qué tan real es cada uno, mismo criterio
// de cáscara honesta que el resto del proyecto: nunca se marca
// "enviado" un canal que no mandó nada de verdad.

export type MessageChannel = "lycard" | "email" | "telegram" | "whatsapp";

export type ChannelInfo = { key: MessageChannel; label: string; real: boolean };

export const CHANNELS: ChannelInfo[] = [
  { key: "lycard", label: "LyCard (bandeja interna)", real: true },
  { key: "email", label: "Email", real: true },
  { key: "telegram", label: "Telegram", real: false },
  { key: "whatsapp", label: "WhatsApp", real: false },
];

export function isValidChannel(value: unknown): value is MessageChannel {
  return CHANNELS.some((c) => c.key === value);
}

export function parseChannels(values: FormDataEntryValue[]): MessageChannel[] {
  const unique = new Set(values.filter((v): v is string => typeof v === "string" && isValidChannel(v)));
  return Array.from(unique) as MessageChannel[];
}

export type MessageDeliveryOutcome = { status: "enviado" | "fallido" | "simulado"; errorDetail?: string };

// Resuelve qué pasa al "enviar" por un canal dado -- separado de
// cualquier llamada real (lib/messaging.ts es puro, testeable sin red
// ni DB; el envío real de Email vive en la action, que sí puede tocar
// Resend). Para lycard el resultado siempre es "enviado" -- escribir la
// fila en DB YA ES la entrega completa, no hay paso externo.
export function resolveNonNetworkOutcome(channel: MessageChannel, recipientEmail: string): MessageDeliveryOutcome | null {
  if (channel === "lycard") return { status: "enviado" };
  if (channel === "telegram" || channel === "whatsapp") {
    return { status: "simulado", errorDetail: `Canal ${channel} todavía no tiene integración real conectada.` };
  }
  if (channel === "email" && !recipientEmail.trim()) {
    return { status: "fallido", errorDetail: "El destinatario no tiene email cargado." };
  }
  // channel === "email" con email cargado -- se resuelve en la action
  // (necesita llamar a Resend de verdad), no acá.
  return null;
}
