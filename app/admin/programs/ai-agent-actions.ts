"use server";

import { revalidatePath } from "next/cache";
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";
import { currentAdminScope, canAccessProgram } from "@/lib/auth";
import { parsePodiumButtons, upsertPodiumButton } from "@/lib/podiumButtons";
import { AI_AGENT_SYSTEM_PROMPT, parseAiAgentResponse } from "@/lib/aiAgent";

// Agente especialista para generar un botón del podio a medida
// (2026-10-04, pedido de Gunnar: "con apoyo de un agente especialista
// dedicado.. poder crear otras funcionalidades con ia"). El agente solo
// genera CONTENIDO estructurado (título/ícono/texto) para un modal
// informativo -- nunca código ni nada ejecutable, ver
// AI_AGENT_SYSTEM_PROMPT en lib/aiAgent.ts. Sin ANTHROPIC_API_KEY
// configurada, devuelve "not_configured" en vez de inventar una
// respuesta -- mismo criterio de honestidad que el resto de la app
// (nunca simula algo como si fuera real).
export async function generatePodiumAiButtonAction(
  programId: string,
  slot: "left" | "right",
  prompt: string
): Promise<{ ok: true } | { ok: false; error: "forbidden" | "empty_prompt" | "not_configured" | "failed" }> {
  const scope = await currentAdminScope();
  if (!scope || !canAccessProgram(scope, programId)) return { ok: false, error: "forbidden" };

  const trimmed = prompt.trim();
  if (!trimmed) return { ok: false, error: "empty_prompt" };

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { ok: false, error: "not_configured" };

  let text = "";
  try {
    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: process.env.ANTHROPIC_MODEL || "claude-opus-5-5",
      max_tokens: 400,
      output_config: { effort: "low" },
      system: AI_AGENT_SYSTEM_PROMPT,
      messages: [{ role: "user", content: trimmed }],
    });
    const textBlock = response.content.find((b): b is Anthropic.TextBlock => b.type === "text");
    text = textBlock?.text ?? "";
  } catch {
    return { ok: false, error: "failed" };
  }

  const spec = parseAiAgentResponse(text);
  if (!spec) return { ok: false, error: "failed" };

  const program = await prisma.program.findUnique({ where: { id: programId }, select: { podiumButtons: true } });
  const items = parsePodiumButtons(program?.podiumButtons);
  const next = upsertPodiumButton(items, {
    slot,
    kind: "ai_agent",
    aiTitle: spec.title,
    aiIcon: spec.icon,
    aiBody: spec.body,
    aiPrompt: trimmed,
  });
  await prisma.program.update({ where: { id: programId }, data: { podiumButtons: next } });

  revalidatePath(`/admin/programs/${programId}`);
  return { ok: true };
}
