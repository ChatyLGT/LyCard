"use server";

import { prisma } from "@/lib/prisma";
import { slugify, uniqueSlug } from "@/lib/slug";
import { saveUpload } from "@/lib/storage";

// Destinatarios (2026-10-02, pedido de Gunnar: "una forma directa de
// ingresar a las tarjetas dirigidas a destinatarios en concreto" +
// "crear al destinatario... subir información... cualquier cosa...
// usemos para crear el NotebookLM"). Llamadas directas desde
// LyCardView.tsx (mismo patrón que sendInvitationAction de este mismo
// directorio) -- no por <form>, ese componente no usa ninguno.

export type RecipientWithSources = {
  id: string;
  slug: string;
  nombre: string;
  palabraSecreta: string;
  cuadernoUrl: string;
  sources: { id: string; type: string; label: string; value: string; createdAt: string }[];
};

export async function listRecipientsAction(cardSlug: string): Promise<RecipientWithSources[]> {
  const card = await prisma.card.findUnique({ where: { slug: cardSlug } });
  if (!card) return [];
  const rows = await prisma.cardRecipient.findMany({
    where: { cardId: card.id },
    include: { sources: { orderBy: { createdAt: "asc" } } },
    orderBy: { createdAt: "asc" },
  });
  return rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    nombre: r.nombre,
    palabraSecreta: r.palabraSecreta,
    cuadernoUrl: r.cuadernoUrl,
    sources: r.sources.map((s) => ({ id: s.id, type: s.type, label: s.label, value: s.value, createdAt: s.createdAt.toISOString() })),
  }));
}

// PASO 4 (2026-10-02) -- Gunnar define a mano, por destinatario, la
// palabra secreta que destraba su botón "Info [nombre]" y el link de
// "Abrir mi cuaderno". Guardado directo por campo (no hay <form>, mismo
// patrón de todo este archivo), sin validación de formato -- ambos son
// opcionales y vacío es un valor válido ("todavía sin configurar").
export async function updateRecipientMetaAction(
  recipientId: string,
  data: { palabraSecreta?: string; cuadernoUrl?: string }
): Promise<{ ok: boolean }> {
  await prisma.cardRecipient
    .update({
      where: { id: recipientId },
      data: {
        ...(data.palabraSecreta !== undefined ? { palabraSecreta: data.palabraSecreta.trim() } : {}),
        ...(data.cuadernoUrl !== undefined ? { cuadernoUrl: data.cuadernoUrl.trim() } : {}),
      },
    })
    .catch(() => {});
  return { ok: true };
}

export async function createRecipientQuickAction(
  cardSlug: string,
  nombre: string
): Promise<{ ok: true; recipient: RecipientWithSources } | { ok: false; error: string }> {
  const name = nombre.trim();
  if (!name) return { ok: false, error: "empty" };

  const card = await prisma.card.findUnique({ where: { slug: cardSlug } });
  if (!card) return { ok: false, error: "card" };

  const base = slugify(name);
  const slug = await uniqueSlug(base, async (s) => {
    const existing = await prisma.cardRecipient.findUnique({ where: { cardId_slug: { cardId: card.id, slug: s } } });
    return existing !== null;
  });

  const created = await prisma.cardRecipient.create({ data: { cardId: card.id, slug, nombre: name } });
  return {
    ok: true,
    recipient: { id: created.id, slug: created.slug, nombre: created.nombre, palabraSecreta: created.palabraSecreta, cuadernoUrl: created.cuadernoUrl, sources: [] },
  };
}

export async function deleteRecipientAction2(recipientId: string): Promise<{ ok: boolean }> {
  await prisma.cardRecipient.delete({ where: { id: recipientId } }).catch(() => {});
  return { ok: true };
}

export async function addRecipientLinkSourceAction(
  recipientId: string,
  label: string,
  url: string
): Promise<{ ok: true; source: RecipientWithSources["sources"][number] } | { ok: false; error: string }> {
  const value = url.trim();
  if (!value) return { ok: false, error: "empty" };
  const created = await prisma.cardRecipientSource.create({
    data: { cardRecipientId: recipientId, type: "link", label: label.trim(), value },
  });
  return { ok: true, source: { id: created.id, type: created.type, label: created.label, value: created.value, createdAt: created.createdAt.toISOString() } };
}

export async function addRecipientTextSourceAction(
  recipientId: string,
  label: string,
  text: string
): Promise<{ ok: true; source: RecipientWithSources["sources"][number] } | { ok: false; error: string }> {
  const value = text.trim();
  if (!value) return { ok: false, error: "empty" };
  const created = await prisma.cardRecipientSource.create({
    data: { cardRecipientId: recipientId, type: "texto", label: label.trim(), value },
  });
  return { ok: true, source: { id: created.id, type: created.type, label: created.label, value: created.value, createdAt: created.createdAt.toISOString() } };
}

export async function addRecipientFileSourceAction(
  recipientId: string,
  label: string,
  file: File
): Promise<{ ok: true; source: RecipientWithSources["sources"][number] } | { ok: false; error: string }> {
  if (!file || file.size === 0) return { ok: false, error: "empty" };
  const url = await saveUpload(file, `recipient-${recipientId}`, "document");
  const created = await prisma.cardRecipientSource.create({
    data: { cardRecipientId: recipientId, type: "archivo", label: label.trim() || file.name, value: url },
  });
  return { ok: true, source: { id: created.id, type: created.type, label: created.label, value: created.value, createdAt: created.createdAt.toISOString() } };
}

export async function deleteRecipientSourceAction(sourceId: string): Promise<{ ok: boolean }> {
  await prisma.cardRecipientSource.delete({ where: { id: sourceId } }).catch(() => {});
  return { ok: true };
}
