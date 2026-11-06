"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { currentAdminScope, isMasterN0Scope } from "@/lib/auth";
import { describeChange, parseProgramJson, MAX_PROGRAM_JSON_BYTES, type Issue } from "@/lib/programJson";
import { EMPTY_PROGRAM_JSON_STATE, type ProgramJsonState } from "@/lib/programJsonState";
import { applyImport, planFor } from "@/lib/programJsonDb";

const MAX_LINES = 200;

function fail(errors: Issue[], extra: Partial<ProgramJsonState> = {}): ProgramJsonState {
  return { ...EMPTY_PROGRAM_JSON_STATE, status: "error", errors, ...extra };
}

// Validar (dry run, no escribe nada) o Importar. Importar es solo MasterN0
// (igual que crear Programas); el N0 de un Programa puede validar el suyo.
// Todo se recalcula acá en el servidor: nada de lo que muestra la pantalla se
// da por bueno.
export async function programJsonAction(_prev: ProgramJsonState, formData: FormData): Promise<ProgramJsonState> {
  const scope = await currentAdminScope();
  if (!scope) redirect("/admin/login");
  const intent = formData.get("intent") === "import" ? "import" : "validate";
  const masterN0 = isMasterN0Scope(scope);
  if (intent === "import" && !masterN0) {
    return fail([{ path: "(permisos)", message: "Solo MasterN0 puede importar. Podés validar el JSON de tu Programa." }]);
  }

  const raw = String(formData.get("json") ?? "");
  if (raw.length > MAX_PROGRAM_JSON_BYTES) {
    return fail([{ path: "(archivo)", message: `El archivo supera el máximo de ${MAX_PROGRAM_JSON_BYTES / 1024} KB.` }]);
  }
  const parsed = parseProgramJson(raw);
  if (!parsed.ok || !parsed.data) return fail(parsed.errors, { discarded: parsed.discarded, warnings: parsed.warnings });

  if (!masterN0) {
    const own = await prisma.program.findUnique({ where: { id: scope.programId! }, select: { slug: true } });
    if (!own || own.slug !== parsed.data.program.slug) {
      return fail([{ path: "program.slug", message: "Como N0 de Programa solo podés validar el JSON de tu propio Programa." }], { discarded: parsed.discarded, warnings: parsed.warnings });
    }
  }

  const { plan, ctx } = await planFor(parsed.data);
  if (!plan.ok) return fail(plan.errors, { discarded: parsed.discarded, warnings: parsed.warnings });

  const c = plan.counts;
  const name = parsed.data.program.name;
  const headline =
    plan.programAction === "crear"
      ? `Se va a crear el Programa "${name}" con ${plan.writes.puestos.length} puestos y ${plan.writes.cards.length} tarjetas.`
      : `Se va a actualizar el Programa "${name}": ${c.tarjetasNuevas} tarjetas nuevas, ${c.tarjetasCambian} con cambios, ${c.tarjetasIguales} sin cambios; ${c.tarjetasConservadas} existentes que no vienen en el JSON se conservan.`;
  const changed = plan.changes.filter((ch) => ch.kind !== "igual");
  const lines = changed.slice(0, MAX_LINES).map(describeChange);
  if (changed.length > MAX_LINES) lines.push(`...y ${changed.length - MAX_LINES} cambios más.`);
  const base: ProgramJsonState = { ...EMPTY_PROGRAM_JSON_STATE, errors: [], discarded: parsed.discarded, warnings: parsed.warnings, lines, counts: c, headline };

  if (intent === "validate") return { ...base, status: "valid" };

  const member = await prisma.admin.findUnique({ where: { id: scope.id }, select: { memberId: true } });
  let result: { programId: string; version: number };
  try {
    result = await applyImport(plan, parsed.data, JSON.parse(raw), ctx.current, member?.memberId ?? null);
  } catch (err) {
    console.error("programJson import failed", err);
    return fail([{ path: "(base de datos)", message: "No se pudo aplicar: no se guardó nada. Probá de nuevo; si sigue, avisale a Sergio o Fabricio." }], { discarded: parsed.discarded, warnings: parsed.warnings });
  }
  revalidatePath("/admin/programs");
  revalidatePath(`/admin/programs/${result.programId}`);
  return { ...base, status: "imported", headline: `✓ Importado como versión ${result.version}. ${headline.replace("Se va a", "Se")}`, programId: result.programId, version: result.version };
}
