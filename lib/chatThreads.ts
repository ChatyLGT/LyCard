// Viaje del Cliente, Fase 3 (2026-10-13) -- chat interno real
// Oreja↔Lead. La DB guarda cada mensaje como una fila de Message +
// una de MessageDelivery (igual que el resto de la mensajería interna,
// ver app/m/dashboard/messages-actions.ts); esta función agrupa esas
// filas en un hilo por Member -- la vista que necesita LeadsPanel.tsx
// (una conversación por Lead, no una bandeja plana de mensajes
// sueltos). Puro -- sin DB, 100% testeable.

export type ChatThreadMessage = {
  id: string;
  body: string;
  createdAt: Date;
  fromAdmin: boolean;
};

export type ChatDeliveryRow = {
  recipientMemberId: string | null;
  message: {
    id: string;
    body: string;
    createdAt: Date;
    senderMemberId: string | null;
    senderAdminId: string | null;
  };
};

export function groupThreadsByMemberId(deliveries: ChatDeliveryRow[]): Map<string, ChatThreadMessage[]> {
  const threads = new Map<string, ChatThreadMessage[]>();
  for (const d of deliveries) {
    // Exactamente uno de los dos identifica al otro lado de la
    // conversación con esta Oreja: si ella mandó el mensaje, el partner
    // es el destinatario (recipientMemberId); si lo mandó el Member, el
    // partner es quien lo mandó (message.senderMemberId).
    const partnerMemberId = d.message.senderMemberId ?? d.recipientMemberId;
    if (!partnerMemberId) continue;

    const list = threads.get(partnerMemberId) ?? [];
    list.push({
      id: d.message.id,
      body: d.message.body,
      createdAt: d.message.createdAt,
      fromAdmin: d.message.senderAdminId !== null,
    });
    threads.set(partnerMemberId, list);
  }
  for (const list of threads.values()) list.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  return threads;
}
