"use server";

import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";
import { TRANSLATION_SYSTEM_PROMPT, hashBundle, parseTranslationResponse } from "@/lib/translation";

// Traducción al vuelo con IA -- la llamada real a Anthropic (ver
// lib/translation.ts para la parte pura/testeada: el prompt y el
// parseo). Llamada DIRECTO desde LyCardView.tsx (client component) al
// tocar EN, mismo patrón que generatePodiumAiButtonAction
// (components/PodiumSlotEditor.tsx -> app/admin/programs/ai-agent-actions.ts).
//
// Sin ANTHROPIC_API_KEY configurada, o si Claude falla, devuelve {} --
// LyCardView.tsx cae al texto original en español, nunca rompe la
// tarjeta ni inventa una traducción a medias. Cacheado por hash del
// bundle + idioma en ContentTranslation: la primera visita en EN de un
// contenido puntual paga la llamada a Claude, todas las siguientes
// (mismo contenido, cualquier Card) salen de la DB.
export async function translateBundleAction(bundle: Record<string, string>, lang: string): Promise<Record<string, string>> {
  const entries = Object.entries(bundle).filter(([, v]) => typeof v === "string" && v.trim());
  if (entries.length === 0) return {};
  const trimmedBundle = Object.fromEntries(entries);
  const hash = hashBundle(trimmedBundle);

  const cached = await prisma.contentTranslation.findUnique({ where: { hash_lang: { hash, lang } } });
  if (cached) return cached.bundle as Record<string, string>;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return {};

  let translated: Record<string, string> = {};
  try {
    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: process.env.ANTHROPIC_MODEL || "claude-opus-5-5",
      max_tokens: 4000,
      output_config: { effort: "low" },
      system: TRANSLATION_SYSTEM_PROMPT,
      messages: [{ role: "user", content: JSON.stringify(trimmedBundle) }],
    });
    const textBlock = response.content.find((b): b is Anthropic.TextBlock => b.type === "text");
    translated = parseTranslationResponse(textBlock?.text ?? "", Object.keys(trimmedBundle));
  } catch {
    return {};
  }

  if (Object.keys(translated).length > 0) {
    await prisma.contentTranslation.upsert({
      where: { hash_lang: { hash, lang } },
      create: { hash, lang, bundle: translated },
      update: { bundle: translated },
    });
  }

  return translated;
}
