import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { currentAdminScope } from "@/lib/auth";
import { logoutAction } from "@/app/admin/actions";
import { completeInterviewAction } from "@/app/admin/interviews/actions";
import { updateProgramAction, createProgramAdminAction, updateCardLabelsAction, updateEscalaAction } from "../actions";
import { updateMemberAction, deleteMemberAction, messageMemberAction } from "../members-actions";
import { createPuestoAction, updatePuestoAction, deletePuestoAction } from "../puestos-actions";
import { CARD_LABEL_FIELDS, defaultCardLabel } from "@/lib/cardLabels";
import { parseEscala } from "@/lib/escalas";
import EscalaEditor from "@/components/EscalaEditor";

export const dynamic = "force-dynamic";

const CHANNEL_FIELDS = ["wa", "ig", "li", "x", "fb", "tiktok", "yt", "web"] as const;

// A Program's own scoped dashboard (PLAN.md Fase 6): branding, its Members,
// and its interview queue. MasterN0 can open any Program's; a scoped
// Program N0 only their own — everything here is filtered to this one
// Program, which is the whole point of the permissions layer.
export default async function AdminProgramDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    saved?: string;
    adminCreated?: string;
    activated?: string;
    adminError?: string;
    memberSaved?: string;
    memberDeleted?: string;
    memberMessaged?: string;
    memberError?: string;
    labelsSaved?: string;
    puestoCreated?: string;
    puestoSaved?: string;
    puestoDeleted?: string;
    puestoError?: string;
    escalaSaved?: string;
  }>;
}) {
  const { id } = await params;
  const {
    saved,
    adminCreated,
    activated,
    adminError,
    memberSaved,
    memberDeleted,
    memberMessaged,
    memberError,
    labelsSaved,
    puestoCreated,
    puestoSaved,
    puestoDeleted,
    puestoError,
    escalaSaved,
  } = await searchParams;
  const ADMIN_ERROR_COPY: Record<string, string> = {
    email: "Ingresá un email válido.",
    password: "La contraseña debe tener al menos 8 caracteres.",
    exists: "Ya existe un admin con ese email.",
  };
  const MEMBER_ERROR_COPY: Record<string, string> = {
    hasCards: "No se puede borrar — ya tiene tarjetas activas con links circulando.",
    messageEmpty: "Completá asunto y mensaje.",
    messageNotConfigured: "Este miembro no tiene email cargado, o el envío de correos no está activado.",
    messageFailed: "No se pudo enviar el mensaje, probá de nuevo.",
  };

  const scope = await currentAdminScope();
  if (!scope) redirect("/admin/login");
  const isMasterN0 = scope.programId === null;
  if (!isMasterN0 && scope.programId !== id) redirect(`/admin/programs/${scope.programId}`);

  const program = await prisma.program.findUnique({
    where: { id },
    include: {
      admins: { orderBy: { createdAt: "asc" } },
      puestos: { orderBy: { order: "asc" } },
      memberships: {
        orderBy: { createdAt: "desc" },
        include: { member: { include: { cards: true } }, referredBy: { include: { member: true } } },
      },
    },
  });
  if (!program) notFound();

  const cardLabels: Record<string, string> =
    program.cardLabels && typeof program.cardLabels === "object" && !Array.isArray(program.cardLabels)
      ? (program.cardLabels as Record<string, string>)
      : {};

  const medalScale = parseEscala(program.medalScale);
  const rankScale = parseEscala(program.rankScale);

  const registrations = await prisma.registration.findMany({
    where: { card: { programId: id } },
    orderBy: { createdAt: "desc" },
    include: { card: { select: { name: true, slug: true } }, membership: true },
  });
  const returnTo = `/admin/programs/${id}`;

  return (
    <div style={{ minHeight: "100vh", background: "#131313", color: "#e5e2e1", fontFamily: "'Plus Jakarta Sans',sans-serif", padding: "0 0 60px" }}>
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
        {isMasterN0 ? (
          <Link href="/admin/programs" style={{ color: "#C8A15A", font: "600 10px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".18em", textTransform: "uppercase" }}>
            ← Programas
          </Link>
        ) : (
          <span style={{ color: "#C8A15A", font: "600 10px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".18em", textTransform: "uppercase" }}>
            N0 · {program.name}
          </span>
        )}
        <h1 style={{ margin: 0, font: "500 18px 'Playfair Display',serif", color: "#F5F2EB" }}>{program.name}</h1>
        <form action={logoutAction}>
          <button
            type="submit"
            style={{ background: "none", border: "1px solid rgba(200,161,90,.3)", borderRadius: 999, padding: "8px 14px", color: "#C2BEB5", font: "600 10px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".1em", textTransform: "uppercase", cursor: "pointer" }}
          >
            Cerrar sesión
          </button>
        </form>
      </div>

      <div style={{ maxWidth: 640, margin: "0 auto", padding: "24px 20px", display: "flex", flexDirection: "column", gap: 24 }}>
        {/* Branding */}
        <section style={{ background: "#201f1f", borderRadius: 14, padding: 18, display: "flex", flexDirection: "column", gap: 12 }}>
          <h2 style={{ margin: 0, font: "600 14px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".08em", textTransform: "uppercase", color: "#F5F2EB" }}>
            Marca del Programa
          </h2>
          {saved && <p style={{ margin: 0, font: "600 11px 'Plus Jakarta Sans',sans-serif", color: "#8fd19e" }}>✓ Guardado.</p>}
          <form action={updateProgramAction.bind(null, program.id)} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <span style={{ font: "500 10px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".16em", textTransform: "uppercase", color: "#C2BEB5" }}>Nombre</span>
              <input name="name" defaultValue={program.name} style={{ background: "#0D0D0D", border: "1px solid rgba(200,161,90,.3)", borderRadius: 10, padding: "10px 14px", color: "#F5F2EB", font: "400 13px 'Plus Jakarta Sans',sans-serif", outline: "none" }} />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <span style={{ font: "500 10px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".16em", textTransform: "uppercase", color: "#C2BEB5" }}>Color primario</span>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input type="color" name="primaryColor" defaultValue={program.primaryColor} style={{ width: 40, height: 34, border: "none", borderRadius: 8, background: "none", padding: 0 }} />
                <span style={{ font: "400 12px 'Plus Jakarta Sans',sans-serif", color: "#C2BEB5" }}>{program.primaryColor}</span>
              </div>
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 8 }}>
              {CHANNEL_FIELDS.map((ch) => (
                <label key={ch} style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  <span style={{ font: "500 10px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".16em", textTransform: "uppercase", color: "#C2BEB5" }}>{ch}</span>
                  <input name={ch} defaultValue={program[ch]} style={{ background: "#0D0D0D", border: "1px solid rgba(200,161,90,.3)", borderRadius: 10, padding: "9px 12px", color: "#F5F2EB", font: "400 12.5px 'Plus Jakarta Sans',sans-serif", outline: "none" }} />
                </label>
              ))}
            </div>
            <button
              type="submit"
              style={{ marginTop: 4, padding: 13, border: "none", borderRadius: 10, background: "linear-gradient(90deg,#E5C378,#C8A15A 50%,#99732B)", color: "#0D0D0D", font: "700 11px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".1em", textTransform: "uppercase", cursor: "pointer" }}
            >
              Guardar
            </button>
          </form>
        </section>

        {/* Card labels — title-only override for buttons/modals on project
            cards under this Program (PLAN.md Fase 9, atajo). Blank = default. */}
        <section style={{ background: "#201f1f", borderRadius: 14, padding: 18, display: "flex", flexDirection: "column", gap: 12 }}>
          <h2 style={{ margin: 0, font: "600 14px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".08em", textTransform: "uppercase", color: "#F5F2EB" }}>
            Textos de Botones y Modales
          </h2>
          <p style={{ margin: 0, font: "400 11.5px/1.6 'Plus Jakarta Sans',sans-serif", color: "#5A5A5A" }}>
            Aplica a las tarjetas de Proyecto de este Programa. Dejá un campo
            vacío para usar el texto original.
          </p>
          {labelsSaved && <p style={{ margin: 0, font: "600 11px 'Plus Jakarta Sans',sans-serif", color: "#8fd19e" }}>✓ Textos guardados.</p>}
          <form action={updateCardLabelsAction.bind(null, program.id)} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {(["Botones", "Modales"] as const).map((group) => (
              <div key={group} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <span style={{ font: "600 10px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".14em", textTransform: "uppercase", color: "#C8A15A" }}>
                  {group}
                </span>
                {CARD_LABEL_FIELDS.filter((f) => f.group === group).map((f) => (
                  <label key={f.key} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <span style={{ font: "500 10px 'Plus Jakarta Sans',sans-serif", color: "#C2BEB5" }}>{f.label}</span>
                    <input
                      name={f.key}
                      defaultValue={cardLabels[f.key] || ""}
                      placeholder={defaultCardLabel(f.key)}
                      style={{ background: "#0D0D0D", border: "1px solid rgba(200,161,90,.25)", borderRadius: 8, padding: "8px 11px", color: "#F5F2EB", font: "400 12px 'Plus Jakarta Sans',sans-serif", outline: "none" }}
                    />
                  </label>
                ))}
              </div>
            ))}
            <button
              type="submit"
              style={{ marginTop: 4, padding: 13, border: "none", borderRadius: 10, background: "linear-gradient(90deg,#E5C378,#C8A15A 50%,#99732B)", color: "#0D0D0D", font: "700 11px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".1em", textTransform: "uppercase", cursor: "pointer" }}
            >
              Guardar Textos
            </button>
          </form>
        </section>

        {/* Puestos — the N0-designed ladder of positions (PLAN.md Fase 9.1)
            that project Cards will pick from instead of writing their own
            siglas/denominación/descripción by hand (wiring is Fase 9.2). */}
        <section style={{ background: "#201f1f", borderRadius: 14, padding: 18, display: "flex", flexDirection: "column", gap: 12 }}>
          <h2 style={{ margin: 0, font: "600 14px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".08em", textTransform: "uppercase", color: "#F5F2EB" }}>
            Escalera de Puestos ({program.puestos.length})
          </h2>
          <p style={{ margin: 0, font: "400 11.5px/1.6 'Plus Jakarta Sans',sans-serif", color: "#5A5A5A" }}>
            Los puestos de tu Programa (ej. O.D. / Founders / Experts /
            Specialists / Partners) — cada uno con su sigla, denominación
            completa y descripción. Orden más bajo aparece primero.
          </p>
          {puestoCreated && <p style={{ margin: 0, font: "600 11px 'Plus Jakarta Sans',sans-serif", color: "#8fd19e" }}>✓ Puesto creado.</p>}
          {puestoSaved && <p style={{ margin: 0, font: "600 11px 'Plus Jakarta Sans',sans-serif", color: "#8fd19e" }}>✓ Puesto actualizado.</p>}
          {puestoDeleted && <p style={{ margin: 0, font: "600 11px 'Plus Jakarta Sans',sans-serif", color: "#8fd19e" }}>✓ Puesto eliminado.</p>}
          {puestoError && (
            <p style={{ margin: 0, font: "600 11px 'Plus Jakarta Sans',sans-serif", color: "#e5928a" }}>Sigla y denominación son obligatorias.</p>
          )}
          {program.puestos.length === 0 && (
            <p style={{ margin: 0, font: "400 12px 'Plus Jakarta Sans',sans-serif", color: "#5A5A5A" }}>
              Todavía no hay puestos — mientras tanto cada tarjeta sigue usando su propia sigla/denominación.
            </p>
          )}
          {program.puestos.map((p) => (
            <div key={p.id} style={{ background: "#151414", borderRadius: 10, padding: 12, display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                <span style={{ font: "700 13px 'Plus Jakarta Sans',sans-serif", color: "#F5F2EB" }}>
                  {p.siglas} — {p.denominacion}
                </span>
                <span style={{ font: "400 10px 'Plus Jakarta Sans',sans-serif", color: "#5A5A5A" }}>orden {p.order}</span>
              </div>
              {p.descripcion && (
                <p style={{ margin: 0, font: "400 11.5px/1.6 'Plus Jakarta Sans',sans-serif", color: "#C2BEB5" }}>{p.descripcion}</p>
              )}
              <div style={{ display: "flex", gap: 14, marginTop: 4, flexWrap: "wrap" }}>
                <details>
                  <summary style={{ font: "700 10px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".06em", textTransform: "uppercase", color: "#C8A15A", cursor: "pointer" }}>
                    Editar
                  </summary>
                  <form
                    action={updatePuestoAction.bind(null, p.id, program.id)}
                    style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10, paddingTop: 10, borderTop: "1px solid rgba(255,255,255,.06)" }}
                  >
                    <div style={{ display: "flex", gap: 8 }}>
                      <input name="siglas" defaultValue={p.siglas} placeholder="Sigla (ej. O.D.)" style={{ flex: "1 1 100px", background: "#0D0D0D", border: "1px solid rgba(200,161,90,.25)", borderRadius: 8, padding: "8px 11px", color: "#F5F2EB", font: "400 12px 'Plus Jakarta Sans',sans-serif", outline: "none" }} />
                      <input name="order" type="number" defaultValue={p.order} placeholder="Orden" style={{ width: 80, background: "#0D0D0D", border: "1px solid rgba(200,161,90,.25)", borderRadius: 8, padding: "8px 11px", color: "#F5F2EB", font: "400 12px 'Plus Jakarta Sans',sans-serif", outline: "none" }} />
                    </div>
                    <input name="denominacion" defaultValue={p.denominacion} placeholder="Denominación (ej. Original Dreamer)" style={{ background: "#0D0D0D", border: "1px solid rgba(200,161,90,.25)", borderRadius: 8, padding: "8px 11px", color: "#F5F2EB", font: "400 12px 'Plus Jakarta Sans',sans-serif", outline: "none" }} />
                    <textarea name="descripcion" defaultValue={p.descripcion} placeholder="Descripción del puesto" rows={3} style={{ background: "#0D0D0D", border: "1px solid rgba(200,161,90,.25)", borderRadius: 8, padding: "8px 11px", color: "#F5F2EB", font: "400 12px 'Plus Jakarta Sans',sans-serif", outline: "none", resize: "vertical" }} />
                    <button type="submit" style={{ padding: 9, border: "none", borderRadius: 8, background: "#353534", color: "#F5F2EB", font: "700 10px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".06em", textTransform: "uppercase", cursor: "pointer" }}>
                      Guardar
                    </button>
                  </form>
                </details>
                <form action={deletePuestoAction.bind(null, p.id, program.id)}>
                  <button type="submit" style={{ background: "none", border: "none", padding: 0, color: "#e5928a", font: "700 10px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".06em", textTransform: "uppercase", cursor: "pointer" }}>
                    Borrar
                  </button>
                </form>
              </div>
            </div>
          ))}
          <form action={createPuestoAction.bind(null, program.id)} style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 6, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,.06)" }}>
            <div style={{ display: "flex", gap: 8 }}>
              <input name="siglas" placeholder="Sigla (ej. O.D.)" required style={{ flex: "1 1 100px", background: "#0D0D0D", border: "1px solid rgba(200,161,90,.3)", borderRadius: 10, padding: "9px 12px", color: "#F5F2EB", font: "400 12.5px 'Plus Jakarta Sans',sans-serif", outline: "none" }} />
              <input name="order" type="number" defaultValue={program.puestos.length} placeholder="Orden" style={{ width: 90, background: "#0D0D0D", border: "1px solid rgba(200,161,90,.3)", borderRadius: 10, padding: "9px 12px", color: "#F5F2EB", font: "400 12.5px 'Plus Jakarta Sans',sans-serif", outline: "none" }} />
            </div>
            <input name="denominacion" placeholder="Denominación (ej. Original Dreamer)" required style={{ background: "#0D0D0D", border: "1px solid rgba(200,161,90,.3)", borderRadius: 10, padding: "9px 12px", color: "#F5F2EB", font: "400 12.5px 'Plus Jakarta Sans',sans-serif", outline: "none" }} />
            <textarea name="descripcion" placeholder="Descripción del puesto" rows={2} style={{ background: "#0D0D0D", border: "1px solid rgba(200,161,90,.3)", borderRadius: 10, padding: "9px 12px", color: "#F5F2EB", font: "400 12.5px 'Plus Jakarta Sans',sans-serif", outline: "none", resize: "vertical" }} />
            <button type="submit" style={{ padding: "9px 16px", border: "none", borderRadius: 10, background: "#353534", color: "#F5F2EB", font: "700 10px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".1em", textTransform: "uppercase", cursor: "pointer" }}>
              Agregar Puesto
            </button>
          </form>
        </section>

        {/* Medallón + Sabiduría scales — PLAN.md Fase 9.4/9.5. Empty = keep
            the fixed scale in lib/data.ts, same fallback as every other
            piece of Fase 9. */}
        <section style={{ background: "#201f1f", borderRadius: 14, padding: 18, display: "flex", flexDirection: "column", gap: 12 }}>
          <h2 style={{ margin: 0, font: "600 14px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".08em", textTransform: "uppercase", color: "#F5F2EB" }}>
            Escala de Medallón
          </h2>
          <p style={{ margin: 0, font: "400 11.5px/1.6 'Plus Jakarta Sans',sans-serif", color: "#5A5A5A" }}>
            Sin niveles acá, las tarjetas de Proyecto siguen usando la escala
            fija (Bronce → Diamante). La clave de cada nivel es lo que se
            guarda en la tarjeta — cambiarla después de asignada la rompe.
          </p>
          {escalaSaved === "medal" && <p style={{ margin: 0, font: "600 11px 'Plus Jakarta Sans',sans-serif", color: "#8fd19e" }}>✓ Escala guardada.</p>}
          <EscalaEditor type="medal" initialItems={medalScale} action={updateEscalaAction.bind(null, program.id, "medal")} />
        </section>

        <section style={{ background: "#201f1f", borderRadius: 14, padding: 18, display: "flex", flexDirection: "column", gap: 12 }}>
          <h2 style={{ margin: 0, font: "600 14px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".08em", textTransform: "uppercase", color: "#F5F2EB" }}>
            Escala de Sabiduría
          </h2>
          <p style={{ margin: 0, font: "400 11.5px/1.6 'Plus Jakarta Sans',sans-serif", color: "#5A5A5A" }}>
            Sin niveles acá, las tarjetas de Proyecto siguen usando la escala
            fija (Curioso → Ancient).
          </p>
          {escalaSaved === "rank" && <p style={{ margin: 0, font: "600 11px 'Plus Jakarta Sans',sans-serif", color: "#8fd19e" }}>✓ Escala guardada.</p>}
          <EscalaEditor type="rank" initialItems={rankScale} action={updateEscalaAction.bind(null, program.id, "rank")} />
        </section>

        {/* N0 admins — MasterN0 only, per PLAN.md Fase 6 */}
        {isMasterN0 && (
          <section style={{ background: "#201f1f", borderRadius: 14, padding: 18, display: "flex", flexDirection: "column", gap: 12 }}>
            <h2 style={{ margin: 0, font: "600 14px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".08em", textTransform: "uppercase", color: "#F5F2EB" }}>
              N0 de este Programa
            </h2>
            {adminCreated && <p style={{ margin: 0, font: "600 11px 'Plus Jakarta Sans',sans-serif", color: "#8fd19e" }}>✓ N0 creado.</p>}
            {adminError && (
              <p style={{ margin: 0, font: "600 11px 'Plus Jakarta Sans',sans-serif", color: "#e5928a" }}>
                {ADMIN_ERROR_COPY[adminError] || "No se pudo crear el N0."}
              </p>
            )}
            {program.admins.length === 0 && (
              <p style={{ margin: 0, font: "400 12px 'Plus Jakarta Sans',sans-serif", color: "#5A5A5A" }}>Todavía no tiene N0 asignado — sos vos (MasterN0) quien lo administra.</p>
            )}
            {program.admins.map((a) => (
              <div key={a.id} style={{ font: "400 12.5px 'Plus Jakarta Sans',sans-serif", color: "#C2BEB5" }}>
                {a.email}
              </div>
            ))}
            <form action={createProgramAdminAction} style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 6 }}>
              <input type="hidden" name="programId" value={program.id} />
              <input name="email" type="email" placeholder="Email del N0" required style={{ flex: "1 1 160px", background: "#0D0D0D", border: "1px solid rgba(200,161,90,.3)", borderRadius: 10, padding: "9px 12px", color: "#F5F2EB", font: "400 12.5px 'Plus Jakarta Sans',sans-serif", outline: "none" }} />
              <input name="password" type="password" placeholder="Contraseña (8+ caracteres)" required style={{ flex: "1 1 160px", background: "#0D0D0D", border: "1px solid rgba(200,161,90,.3)", borderRadius: 10, padding: "9px 12px", color: "#F5F2EB", font: "400 12.5px 'Plus Jakarta Sans',sans-serif", outline: "none" }} />
              <button type="submit" style={{ padding: "9px 16px", border: "none", borderRadius: 10, background: "#353534", color: "#F5F2EB", font: "700 10px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".1em", textTransform: "uppercase", cursor: "pointer" }}>
                Agregar N0
              </button>
            </form>
          </section>
        )}

        {/* Members */}
        <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <h2 style={{ margin: 0, font: "600 14px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".08em", textTransform: "uppercase", color: "#F5F2EB" }}>
            Miembros ({program.memberships.length})
          </h2>
          {memberSaved && <p style={{ margin: 0, font: "600 11px 'Plus Jakarta Sans',sans-serif", color: "#8fd19e" }}>✓ Miembro actualizado.</p>}
          {memberDeleted && <p style={{ margin: 0, font: "600 11px 'Plus Jakarta Sans',sans-serif", color: "#8fd19e" }}>✓ Miembro eliminado.</p>}
          {memberMessaged && <p style={{ margin: 0, font: "600 11px 'Plus Jakarta Sans',sans-serif", color: "#8fd19e" }}>✓ Mensaje enviado.</p>}
          {memberError && (
            <p style={{ margin: 0, font: "600 11px 'Plus Jakarta Sans',sans-serif", color: "#e5928a" }}>
              {MEMBER_ERROR_COPY[memberError] || "Algo falló."}
            </p>
          )}
          {program.memberships.length === 0 && <p style={{ color: "#5A5A5A", font: "400 12.5px 'Plus Jakarta Sans',sans-serif" }}>Todavía no hay miembros.</p>}
          {program.memberships.map((m) => {
            const projectCard = m.member.cards.find((c) => c.kind === "project");
            return (
              <div key={m.id} style={{ background: "#201f1f", borderRadius: 12, padding: 14, display: "flex", flexDirection: "column", gap: 4 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                  <span style={{ font: "700 13px 'Plus Jakarta Sans',sans-serif", color: "#F5F2EB" }}>{m.member.name || "(sin nombre)"}</span>
                  <span style={{ font: "600 10px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".08em", textTransform: "uppercase", color: m.status === "active" ? "#7BC98E" : "#C8A15A" }}>
                    {m.status === "active" ? "Activo" : "Invitado"}
                  </span>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 12, font: "400 11.5px 'Plus Jakarta Sans',sans-serif", color: "#C2BEB5" }}>
                  {m.member.whatsapp && <span>WhatsApp: {m.member.whatsapp}</span>}
                  {m.member.email && <span>Email: {m.member.email}</span>}
                  {m.referredBy && <span>Referido por: {m.referredBy.member.name}</span>}
                  {projectCard && (
                    <Link href={`/c/${projectCard.slug}`} style={{ color: "#C8A15A" }}>
                      /c/{projectCard.slug}
                    </Link>
                  )}
                </div>

                <div style={{ display: "flex", gap: 14, marginTop: 6, flexWrap: "wrap" }}>
                  <details>
                    <summary style={{ font: "700 10px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".06em", textTransform: "uppercase", color: "#C8A15A", cursor: "pointer" }}>
                      Editar
                    </summary>
                    <form
                      action={updateMemberAction.bind(null, m.member.id, program.id)}
                      style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10, paddingTop: 10, borderTop: "1px solid rgba(255,255,255,.06)" }}
                    >
                      <input name="name" defaultValue={m.member.name} placeholder="Nombre" style={{ background: "#0D0D0D", border: "1px solid rgba(200,161,90,.25)", borderRadius: 8, padding: "8px 11px", color: "#F5F2EB", font: "400 12px 'Plus Jakarta Sans',sans-serif", outline: "none" }} />
                      <input name="whatsapp" defaultValue={m.member.whatsapp || ""} placeholder="WhatsApp" style={{ background: "#0D0D0D", border: "1px solid rgba(200,161,90,.25)", borderRadius: 8, padding: "8px 11px", color: "#F5F2EB", font: "400 12px 'Plus Jakarta Sans',sans-serif", outline: "none" }} />
                      <input name="email" type="email" defaultValue={m.member.email} placeholder="Email" style={{ background: "#0D0D0D", border: "1px solid rgba(200,161,90,.25)", borderRadius: 8, padding: "8px 11px", color: "#F5F2EB", font: "400 12px 'Plus Jakarta Sans',sans-serif", outline: "none" }} />
                      <button type="submit" style={{ padding: 9, border: "none", borderRadius: 8, background: "#353534", color: "#F5F2EB", font: "700 10px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".06em", textTransform: "uppercase", cursor: "pointer" }}>
                        Guardar
                      </button>
                    </form>
                  </details>

                  <details>
                    <summary style={{ font: "700 10px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".06em", textTransform: "uppercase", color: "#C8A15A", cursor: "pointer" }}>
                      Mensaje
                    </summary>
                    <form
                      action={messageMemberAction.bind(null, m.member.id, program.id)}
                      style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10, paddingTop: 10, borderTop: "1px solid rgba(255,255,255,.06)" }}
                    >
                      <input name="subject" placeholder="Asunto" style={{ background: "#0D0D0D", border: "1px solid rgba(200,161,90,.25)", borderRadius: 8, padding: "8px 11px", color: "#F5F2EB", font: "400 12px 'Plus Jakarta Sans',sans-serif", outline: "none" }} />
                      <textarea name="message" placeholder="Mensaje" rows={3} style={{ background: "#0D0D0D", border: "1px solid rgba(200,161,90,.25)", borderRadius: 8, padding: "8px 11px", color: "#F5F2EB", font: "400 12px 'Plus Jakarta Sans',sans-serif", outline: "none", resize: "vertical" }} />
                      <button type="submit" style={{ padding: 9, border: "none", borderRadius: 8, background: "#353534", color: "#F5F2EB", font: "700 10px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".06em", textTransform: "uppercase", cursor: "pointer" }}>
                        Enviar
                      </button>
                    </form>
                  </details>

                  <form action={deleteMemberAction.bind(null, m.member.id, program.id)}>
                    <button type="submit" style={{ background: "none", border: "none", padding: 0, color: "#e5928a", font: "700 10px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".06em", textTransform: "uppercase", cursor: "pointer" }}>
                      Borrar
                    </button>
                  </form>
                </div>
              </div>
            );
          })}
        </section>

        {/* Interviews */}
        <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <h2 style={{ margin: 0, font: "600 14px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".08em", textTransform: "uppercase", color: "#F5F2EB" }}>
            Inscriptos a Entrevistas ({registrations.length})
          </h2>
          {activated && <p style={{ margin: 0, font: "600 11px 'Plus Jakarta Sans',sans-serif", color: "#8fd19e" }}>✓ Membership activada.</p>}
          {registrations.length === 0 && <p style={{ color: "#5A5A5A", font: "400 12.5px 'Plus Jakarta Sans',sans-serif" }}>Todavía no hay inscripciones.</p>}
          {registrations.map((r) => {
            const isActive = r.membership?.status === "active";
            return (
              <div key={r.id} style={{ background: "#201f1f", borderRadius: 12, padding: 14, display: "flex", flexDirection: "column", gap: 4 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                  <span style={{ font: "700 13px 'Plus Jakarta Sans',sans-serif", color: "#F5F2EB" }}>{r.name}</span>
                  <span style={{ font: "600 10px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".08em", textTransform: "uppercase", color: "#C8A15A" }}>{r.slotLabel}</span>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 12, font: "400 11.5px 'Plus Jakarta Sans',sans-serif", color: "#C2BEB5" }}>
                  <span>WhatsApp: {r.whatsapp}</span>
                  {r.email && <span>Email: {r.email}</span>}
                </div>
                {r.membership && (
                  <div style={{ marginTop: 8, paddingTop: 10, borderTop: "1px solid rgba(255,255,255,.06)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                    <span style={{ font: "700 10px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".08em", textTransform: "uppercase", color: isActive ? "#7BC98E" : "#C8A15A" }}>
                      {isActive ? "✓ Membership activa" : "Membership: invitado"}
                    </span>
                    {!isActive && (
                      <form action={completeInterviewAction.bind(null, r.id, returnTo)}>
                        <button type="submit" style={{ background: "linear-gradient(90deg,#E5C378,#C8A15A 50%,#99732B)", border: "none", borderRadius: 999, padding: "7px 14px", color: "#0D0D0D", font: "700 10px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".06em", textTransform: "uppercase", cursor: "pointer" }}>
                          Marcar entrevista hecha
                        </button>
                      </form>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </section>
      </div>
    </div>
  );
}
