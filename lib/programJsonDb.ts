// Parte con base de datos del importador de JSON de Programa
// (lib/programJson.ts es la parte pura, con los tests unitarios).
// Esto lo cubre el E2E (e2e/program-json.spec.ts).
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { MEDALS, RANKS } from "@/lib/data";
import {
  planImport,
  stateFromRows,
  type NormalizedProgram,
  type Plan,
  type PlanContext,
  type ProgramState,
  type PuestoItem,
} from "@/lib/programJson";

const cardInclude = { puesto: { select: { siglas: true } }, member: { select: { email: true } } } as const;

type CardWithRels = Prisma.CardGetPayload<{ include: typeof cardInclude }>;

function cardRow(c: CardWithRels) {
  return { ...c, puestoSiglas: c.puesto?.siglas ?? null, ownerEmail: c.member?.email || c.pendingOwnerEmail || "" };
}

// Estado exportable de un Programa (null si no existe).
export async function loadProgramState(slug: string): Promise<{ id: string; state: ProgramState } | null> {
  const program = await prisma.program.findUnique({
    where: { slug },
    include: { puestos: true, cards: { include: cardInclude, orderBy: { createdAt: "asc" } }, originProgram: { select: { slug: true } } },
  });
  if (!program) return null;
  const puestos: PuestoItem[] = program.puestos.map((p) => ({ siglas: p.siglas, denominacion: p.denominacion, descripcion: p.descripcion, icono: p.icono, order: p.order }));
  const state = stateFromRows(program as unknown as Parameters<typeof stateFromRows>[0], program.originProgram?.slug ?? null, puestos, program.cards.map(cardRow));
  return { id: program.id, state };
}

export async function loadPlanContext(data: NormalizedProgram): Promise<PlanContext> {
  const [programs, loaded] = await Promise.all([
    prisma.program.findMany({ select: { slug: true, originProgram: { select: { slug: true } } } }),
    loadProgramState(data.program.slug),
  ]);
  const slugs = (data.cards ?? []).map((c) => c.slug);
  const existing = slugs.length
    ? await prisma.card.findMany({ where: { slug: { in: slugs } }, select: { slug: true, pendingOwnerEmail: true, program: { select: { slug: true } }, member: { select: { email: true } } } })
    : [];
  return {
    programs: programs.map((p) => ({ slug: p.slug, originSlug: p.originProgram?.slug ?? null })),
    current: loaded?.state ?? null,
    existingCards: existing.map((c) => ({ slug: c.slug, programSlug: c.program?.slug ?? null, ownerEmail: c.member?.email || c.pendingOwnerEmail || "" })),
    defaultTiers: { medal: MEDALS.map((m) => m.id), rank: RANKS.map((r) => r.id), contacts: MEDALS.map((m) => m.id) },
  };
}

export async function planFor(data: NormalizedProgram) {
  const ctx = await loadPlanContext(data);
  return { plan: planImport(data, ctx), ctx };
}

// Aplica el plan completo en UNA transacción (todo o nada) y guarda la
// importación como versión nueva. Devuelve el número de versión.
export async function applyImport(
  plan: Plan,
  data: NormalizedProgram,
  rawDoc: unknown,
  previous: ProgramState | null,
  createdByMemberId: string | null
): Promise<{ programId: string; version: number }> {
  const { program: pw, puestos, cards } = plan.writes;
  return prisma.$transaction(
    async (tx) => {
      const originId = pw.originSlug ? (await tx.program.findUnique({ where: { slug: pw.originSlug }, select: { id: true } }))?.id ?? null : null;
      if (pw.originSlug && !originId && pw.originSlug !== data.program.slug) throw new Error(`Origen inexistente: ${pw.originSlug}`);

      const jsonData = pw.data as Prisma.ProgramUncheckedUpdateInput;
      let programId: string;
      if (pw.create) {
        const isRoot = !originId && (await tx.program.count()) === 0;
        const created = await tx.program.create({
          data: { ...(jsonData as Prisma.ProgramUncheckedCreateInput), slug: data.program.slug, originProgramId: originId, isRoot },
        });
        programId = created.id;
      } else {
        const existing = await tx.program.findUniqueOrThrow({ where: { slug: data.program.slug }, select: { id: true } });
        programId = existing.id;
        await tx.program.update({ where: { id: programId }, data: { ...jsonData, ...(pw.originProvided ? { originProgramId: originId } : {}) } });
      }

      for (const p of puestos) {
        await tx.puesto.upsert({
          where: { programId_siglas: { programId, siglas: p.siglas } },
          create: { programId, ...p },
          update: { denominacion: p.denominacion, descripcion: p.descripcion, icono: p.icono, order: p.order },
        });
      }

      for (const c of cards) {
        const cardData: Prisma.CardUncheckedUpdateInput = { ...(c.data as Prisma.CardUncheckedUpdateInput) };
        if (c.puesto !== undefined) {
          cardData.puestoId = c.puesto ? (await tx.puesto.findUniqueOrThrow({ where: { programId_siglas: { programId, siglas: c.puesto } }, select: { id: true } })).id : null;
        }
        if (c.ownerEmail !== undefined) {
          if (c.ownerEmail === null) {
            cardData.pendingOwnerEmail = null;
          } else {
            const member = await tx.member.findFirst({ where: { email: { equals: c.ownerEmail, mode: "insensitive" } }, select: { id: true } });
            if (member) {
              cardData.memberId = member.id;
              cardData.pendingOwnerEmail = null;
              await tx.programMembership.upsert({
                where: { memberId_programId: { memberId: member.id, programId } },
                update: {},
                create: { memberId: member.id, programId, status: "active" },
              });
            } else {
              cardData.pendingOwnerEmail = c.ownerEmail;
            }
          }
        }
        await tx.card.upsert({
          where: { slug: c.slug },
          create: { ...(cardData as Prisma.CardUncheckedCreateInput), slug: c.slug, programId, name: String(c.data.name ?? c.slug), title: String(c.data.title ?? ""), quote: String(c.data.quote ?? "") },
          update: cardData,
        });
      }

      const last = await tx.programImport.aggregate({ where: { programId }, _max: { version: true } });
      const version = (last._max.version ?? 0) + 1;
      await tx.programImport.create({
        data: {
          programId,
          version,
          createdByMemberId,
          payload: rawDoc as Prisma.InputJsonValue,
          meta: data.meta as Prisma.InputJsonValue,
          previous: previous ? (JSON.parse(JSON.stringify(previous)) as Prisma.InputJsonValue) : undefined,
          summary: JSON.parse(JSON.stringify({ counts: plan.counts, action: plan.programAction, changes: plan.changes.filter((c) => c.kind !== "igual") })) as Prisma.InputJsonValue,
        },
      });
      return { programId, version };
    },
    { timeout: 60_000, maxWait: 10_000 }
  );
}

export async function listImports(programId: string) {
  return prisma.programImport.findMany({
    where: { programId },
    orderBy: { version: "desc" },
    take: 10,
    select: { id: true, version: true, createdAt: true, meta: true, summary: true },
  });
}
