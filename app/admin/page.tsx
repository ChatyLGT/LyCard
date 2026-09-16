import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { currentAdminScope } from "@/lib/auth";
import { createCardAction, logoutAction } from "@/app/admin/actions";
import type { Card } from "@/generated/prisma/client";

export const dynamic = "force-dynamic";

const KIND_LABEL: Record<string, string> = { project: "Programa", company: "Business", personal: "Personal" };

type CardWithProgramName = Card & { programId: string | null };

// Groups every Card by the Program it actually belongs to — Fase D1 del
// Dashboard 2.0 (PLAN.md), reemplaza la lista plana de antes. Solo las
// Cards de proyecto tienen programId propio; una Company/Personal hereda
// el Programa de su hermana de proyecto (comparten memberId, las 3 las
// crea completeInterviewAction juntas) — sin hermana de proyecto ni
// programId propio, la Card cae en "Sin Programa" (ej. mastern0, el
// seed raíz, o data vieja de antes de que existieran los Programas).
function groupByProgram(cards: CardWithProgramName[]) {
  const byMember = new Map<string, CardWithProgramName[]>();
  for (const c of cards) {
    if (!c.memberId) continue;
    const list = byMember.get(c.memberId) ?? [];
    list.push(c);
    byMember.set(c.memberId, list);
  }

  const programIdFor = (card: CardWithProgramName): string | null => {
    if (card.programId) return card.programId;
    if (!card.memberId) return null;
    const siblings = byMember.get(card.memberId) ?? [];
    return siblings.find((s) => s.programId)?.programId ?? null;
  };

  const groups = new Map<string | null, CardWithProgramName[]>();
  for (const c of cards) {
    const key = programIdFor(c);
    const list = groups.get(key) ?? [];
    list.push(c);
    groups.set(key, list);
  }
  return groups;
}

// A Program's own N0 lands directly on /admin/programs/[id] (PLAN.md Fase
// 6) — this cross-Program view is MasterN0-only, so scoped admins have no
// reason to see cards outside their own Program.
export default async function AdminRosterPage() {
  const scope = await currentAdminScope();
  if (!scope) redirect("/admin/login");
  if (scope.programId) redirect(`/admin/programs/${scope.programId}`);

  const [cards, programs] = await Promise.all([
    prisma.card.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.program.findMany({ orderBy: { name: "asc" } }),
  ]);

  const grouped = groupByProgram(cards);
  const programById = new Map(programs.map((p) => [p.id, p]));
  // Programs with cards first (most useful), each internally newest-first;
  // "Sin Programa" always last since it's the catch-all, not a real group.
  const orderedProgramIds = programs.map((p) => p.id).filter((id) => grouped.has(id));
  const noProgramCards = grouped.get(null) ?? [];

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#131313",
        color: "#e5e2e1",
        fontFamily: "'Plus Jakarta Sans',sans-serif",
        padding: "0 0 60px",
      }}
    >
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          background: "rgba(20,20,20,.96)",
          borderBottom: "1px solid rgba(200,161,90,.22)",
          padding: "16px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <div>
          <span
            style={{
              font: "600 10px 'Plus Jakarta Sans',sans-serif",
              letterSpacing: ".24em",
              textTransform: "uppercase",
              color: "#C8A15A",
            }}
          >
            Roster Legacy
          </span>
          <h1 style={{ margin: 0, font: "500 20px 'Playfair Display',serif", color: "#F5F2EB" }}>
            LyCards
          </h1>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Link
            href="/admin/programs"
            style={{
              background: "none",
              border: "1px solid rgba(200,161,90,.3)",
              borderRadius: 999,
              padding: "8px 14px",
              color: "#C2BEB5",
              font: "600 10px 'Plus Jakarta Sans',sans-serif",
              letterSpacing: ".1em",
              textTransform: "uppercase",
              display: "inline-flex",
              alignItems: "center",
            }}
          >
            Programas
          </Link>
          <Link
            href="/admin/interviews"
            style={{
              background: "none",
              border: "1px solid rgba(200,161,90,.3)",
              borderRadius: 999,
              padding: "8px 14px",
              color: "#C2BEB5",
              font: "600 10px 'Plus Jakarta Sans',sans-serif",
              letterSpacing: ".1em",
              textTransform: "uppercase",
              display: "inline-flex",
              alignItems: "center",
            }}
          >
            Entrevistas
          </Link>
          <Link
            href="/admin/account"
            style={{
              background: "none",
              border: "1px solid rgba(200,161,90,.3)",
              borderRadius: 999,
              padding: "8px 14px",
              color: "#C2BEB5",
              font: "600 10px 'Plus Jakarta Sans',sans-serif",
              letterSpacing: ".1em",
              textTransform: "uppercase",
              display: "inline-flex",
              alignItems: "center",
            }}
          >
            Mi cuenta
          </Link>
          <form action={logoutAction}>
            <button
              type="submit"
              style={{
                background: "none",
                border: "1px solid rgba(200,161,90,.3)",
                borderRadius: 999,
                padding: "8px 14px",
                color: "#C2BEB5",
                font: "600 10px 'Plus Jakarta Sans',sans-serif",
                letterSpacing: ".1em",
                textTransform: "uppercase",
                cursor: "pointer",
              }}
            >
              Cerrar sesión
            </button>
          </form>
        </div>
      </div>

      <div style={{ maxWidth: 640, margin: "0 auto", padding: "24px 20px", display: "flex", flexDirection: "column", gap: 24 }}>
        <section
          style={{
            background: "#201f1f",
            borderRadius: 14,
            padding: 18,
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <h2 style={{ margin: 0, font: "600 14px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".08em", textTransform: "uppercase", color: "#F5F2EB" }}>
            Nueva LyCard
          </h2>
          <form action={createCardAction} style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <input
              name="name"
              placeholder="Nombre completo"
              required
              style={{
                flex: "1 1 200px",
                background: "#0D0D0D",
                border: "1px solid rgba(200,161,90,.3)",
                borderRadius: 10,
                padding: "10px 14px",
                color: "#F5F2EB",
                font: "400 13px 'Plus Jakarta Sans',sans-serif",
                outline: "none",
              }}
            />
            <input
              name="slug"
              placeholder="slug (opcional)"
              style={{
                flex: "1 1 140px",
                background: "#0D0D0D",
                border: "1px solid rgba(200,161,90,.3)",
                borderRadius: 10,
                padding: "10px 14px",
                color: "#F5F2EB",
                font: "400 13px 'Plus Jakarta Sans',sans-serif",
                outline: "none",
              }}
            />
            <button
              type="submit"
              style={{
                padding: "10px 18px",
                border: "none",
                borderRadius: 10,
                background: "linear-gradient(90deg,#E5C378,#C8A15A 50%,#99732B)",
                color: "#0D0D0D",
                font: "700 11px 'Plus Jakarta Sans',sans-serif",
                letterSpacing: ".1em",
                textTransform: "uppercase",
                cursor: "pointer",
              }}
            >
              Crear
            </button>
          </form>
        </section>

        {cards.length === 0 && (
          <p style={{ color: "#C2BEB5", font: "400 13px 'Plus Jakarta Sans',sans-serif" }}>
            Todavía no hay LyCards. Creá la primera arriba.
          </p>
        )}

        {orderedProgramIds.map((programId) => {
          const program = programById.get(programId)!;
          const programCards = grouped.get(programId) ?? [];
          return (
            <details key={programId} style={{ background: "#1a1919", borderRadius: 14 }} open={orderedProgramIds.length <= 2}>
              <summary
                style={{
                  padding: 16,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                  listStyle: "none",
                }}
              >
                <span style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                  <span style={{ font: "600 15px 'Playfair Display',serif", color: "#F5F2EB" }}>{program.name}</span>
                  {!program.active && (
                    <span style={{ font: "700 9px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".08em", textTransform: "uppercase", color: "#5A5A5A" }}>
                      Pausado
                    </span>
                  )}
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: 10, flex: "none" }}>
                  <span style={{ font: "600 10px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".08em", textTransform: "uppercase", color: "#C8A15A" }}>
                    {programCards.length} tarjeta{programCards.length === 1 ? "" : "s"}
                  </span>
                  <Link
                    href={`/admin/programs/${program.id}`}
                    style={{ padding: "6px 12px", borderRadius: 8, background: "#2a2a2a", color: "#e5e2e1", font: "600 10px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".06em", textTransform: "uppercase" }}
                  >
                    Dashboard →
                  </Link>
                </span>
              </summary>
              <div style={{ padding: "0 14px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
                {programCards.map((card) => (
                  <CardRow key={card.id} card={card} />
                ))}
              </div>
            </details>
          );
        })}

        {noProgramCards.length > 0 && (
          <details style={{ background: "#1a1919", borderRadius: 14 }} open={orderedProgramIds.length === 0}>
            <summary
              style={{
                padding: 16,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
                listStyle: "none",
              }}
            >
              <span style={{ font: "600 15px 'Playfair Display',serif", color: "#F5F2EB" }}>Sin Programa</span>
              <span style={{ font: "600 10px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".08em", textTransform: "uppercase", color: "#C8A15A" }}>
                {noProgramCards.length} tarjeta{noProgramCards.length === 1 ? "" : "s"}
              </span>
            </summary>
            <div style={{ padding: "0 14px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
              {noProgramCards.map((card) => (
                <CardRow key={card.id} card={card} />
              ))}
            </div>
          </details>
        )}
      </div>
    </div>
  );
}

function CardRow({ card }: { card: Card }) {
  return (
    <div
      style={{
        background: "#201f1f",
        borderRadius: 12,
        padding: 14,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
      }}
    >
      <div style={{ minWidth: 0 }}>
        <p style={{ margin: 0, display: "flex", alignItems: "center", gap: 8, font: "600 14px 'Plus Jakarta Sans',sans-serif", color: "#F5F2EB" }}>
          {card.name || "(sin nombre)"}
          <span style={{ font: "600 9px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".06em", textTransform: "uppercase", color: "#5A5A5A" }}>
            {KIND_LABEL[card.kind] ?? card.kind}
          </span>
        </p>
        <p style={{ margin: 0, font: "400 11px 'Plus Jakarta Sans',sans-serif", color: "#C8A15A" }}>
          /c/{card.slug}
        </p>
      </div>
      <div style={{ display: "flex", gap: 8, flex: "none" }}>
        <Link
          href={`/c/${card.slug}`}
          target="_blank"
          style={{
            padding: "7px 12px",
            borderRadius: 8,
            background: "#2a2a2a",
            color: "#e5e2e1",
            font: "600 10px 'Plus Jakarta Sans',sans-serif",
            letterSpacing: ".08em",
            textTransform: "uppercase",
          }}
        >
          Ver
        </Link>
        <Link
          href={`/admin/${card.slug}`}
          style={{
            padding: "7px 12px",
            borderRadius: 8,
            background: "linear-gradient(90deg,#E5C378,#C8A15A 50%,#99732B)",
            color: "#0D0D0D",
            font: "700 10px 'Plus Jakarta Sans',sans-serif",
            letterSpacing: ".08em",
            textTransform: "uppercase",
          }}
        >
          Editar
        </Link>
      </div>
    </div>
  );
}
