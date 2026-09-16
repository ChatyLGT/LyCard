import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { currentAdminScope } from "@/lib/auth";
import { logoutAction } from "@/app/admin/actions";
import { completeInterviewAction } from "@/app/admin/interviews/actions";
import {
  updateProgramAction,
  createProgramAdminAction,
  updateCardLabelsAction,
  updateEscalaAction,
  createProgramSkinAction,
  activateProgramSkinAction,
  deleteProgramSkinAction,
} from "../actions";
import { updateMemberAction, deleteMemberAction, messageMemberAction } from "../members-actions";
import { createPuestoAction, updatePuestoAction, deletePuestoAction } from "../puestos-actions";
import { CARD_LABEL_FIELDS, defaultCardLabel } from "@/lib/cardLabels";
import { parseEscala } from "@/lib/escalas";
import EscalaEditor from "@/components/EscalaEditor";
import ProgramSkinInfo from "@/components/ProgramSkinInfo";
import { AccordionSection, AccordionRow, AccordionAddRow } from "@/components/Accordion";
import type { SkinColors } from "@/lib/designMd";

export const dynamic = "force-dynamic";

const CHANNEL_FIELDS = ["wa", "ig", "li", "x", "fb", "tiktok", "yt", "web"] as const;

const PILL = {
  font: "700 10px 'Plus Jakarta Sans',sans-serif",
  color: "#8a8378",
  background: "rgba(255,255,255,.05)",
  borderRadius: 999,
  padding: "3px 9px",
} as const;

const INPUT = {
  background: "#0D0D0D",
  border: "1px solid rgba(200,161,90,.25)",
  borderRadius: 8,
  padding: "8px 11px",
  color: "#F5F2EB",
  font: "400 12px 'Plus Jakarta Sans',sans-serif",
  outline: "none",
} as const;

const SAVE_BTN = {
  padding: 9,
  border: "none",
  borderRadius: 8,
  background: "#353534",
  color: "#F5F2EB",
  font: "700 10px 'Plus Jakarta Sans',sans-serif",
  letterSpacing: ".06em",
  textTransform: "uppercase",
  cursor: "pointer",
} as const;

const DELETE_ICON_BTN = {
  flex: "none",
  width: 28,
  height: 28,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  border: "none",
  borderRadius: 8,
  background: "rgba(229,146,138,.12)",
  color: "#e5928a",
  cursor: "pointer",
} as const;

// A Program's own scoped dashboard (PLAN.md Fase 6): branding, its Members,
// and its interview queue. MasterN0 can open any Program's; a scoped
// Program N0 only their own — everything here is filtered to this one
// Program, which is the whole point of the permissions layer.
//
// Rediseño en acordeón (2026-09-16): cada categoría era una <section>
// siempre expandida, todo visible a la vez. Ahora cada una es un
// <AccordionSection> colapsado por defecto — salvo que su propio mensaje
// de confirmación/error necesite mostrarse, en cuyo caso arranca abierta
// para que esa confirmación no quede escondida. Puestos y Miembros, que
// ya tenían un <details> de edición por ítem, pasan a <AccordionRow>
// (mismo patrón visual que las demás listas) con un <AccordionAddRow>
// para crear.
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
    skinSaved?: string;
    skinError?: string;
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
    skinSaved,
    skinError,
  } = await searchParams;
  const SKIN_ERROR_COPY: Record<string, string> = {
    max: "Ya tenés los 3 skins guardados — borrá uno para subir otro.",
    empty: "Subí un archivo design.md.",
  };
  const ADMIN_ERROR_COPY: Record<string, string> = {
    email: "Ingresá un email válido.",
    password: "La contraseña debe tener al menos 8 caracteres.",
    exists: "Ese email ya es una cuenta de Admin — si es el tuyo, no hace falta agregarlo: ya administrás este Programa como MasterN0. Para delegarlo, usá el email de otra persona.",
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
      skins: { orderBy: { createdAt: "asc" } },
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
  const contactsScale = parseEscala(program.contactsScale);

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

      <div style={{ maxWidth: 640, margin: "0 auto", padding: "24px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
        {/* Branding */}
        <AccordionSection title="Marca del Programa" defaultOpen={true}>
          {saved && <p style={{ margin: 0, font: "600 11px 'Plus Jakarta Sans',sans-serif", color: "#8fd19e" }}>✓ Guardado.</p>}
          <form action={updateProgramAction.bind(null, program.id)} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <span style={{ font: "500 10px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".16em", textTransform: "uppercase", color: "#C2BEB5" }}>Nombre</span>
              <input name="name" defaultValue={program.name} style={{ background: "#0D0D0D", border: "1px solid rgba(200,161,90,.3)", borderRadius: 10, padding: "10px 14px", color: "#F5F2EB", font: "400 13px 'Plus Jakarta Sans',sans-serif", outline: "none" }} />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <span style={{ font: "500 10px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".16em", textTransform: "uppercase", color: "#C2BEB5" }}>
                Logo (abre en el botón de Oficina Virtual de cada tarjeta de este Programa)
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {program.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={program.logoUrl} alt="" style={{ width: 44, height: 44, borderRadius: 999, objectFit: "cover", background: "#0D0D0D", border: "1px solid rgba(200,161,90,.3)" }} />
                ) : (
                  <span style={{ width: 44, height: 44, borderRadius: 999, background: "#0D0D0D", border: "1px dashed rgba(200,161,90,.3)", flex: "none" }} />
                )}
                <input
                  type="file"
                  name="logo"
                  accept="image/*"
                  style={{ font: "400 11px 'Plus Jakarta Sans',sans-serif", color: "#C2BEB5" }}
                />
              </div>
              <span style={{ font: "400 10.5px/1.5 'Plus Jakarta Sans',sans-serif", color: "#5A5A5A" }}>
                Sin logo, se muestra el emblema decorativo de siempre.
              </span>
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
        </AccordionSection>

        {/* Skins de marca — hasta 3 por Programa, uno activo a la vez
            (2026-09-16, noche). Cada skin sale de un design.md real
            (Stitch u otro), parseado de verdad en lib/designMd.ts:
            colores, fuente y estilo de botón, no solo la paleta. El
            skin activo se aplica de verdad a las tarjetas de proyecto de
            este Programa (Fase 2, LyCardView.tsx). */}
        <AccordionSection
          title="Skins de Marca"
          meta={<span style={PILL}>{program.skins.length}/3</span>}
          defaultOpen={Boolean(skinSaved || skinError)}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
            <p style={{ margin: 0, font: "400 11.5px/1.6 'Plus Jakarta Sans',sans-serif", color: "#5A5A5A" }}>
              Cada skin sale de un archivo design.md — colores, fuente y estilo de botón reales, leídos del archivo. Solo uno puede estar encendido a la vez.
            </p>
            <ProgramSkinInfo />
          </div>
          {skinSaved && <p style={{ margin: 0, font: "600 11px 'Plus Jakarta Sans',sans-serif", color: "#8fd19e" }}>✓ Guardado.</p>}
          {skinError && <p style={{ margin: 0, font: "600 11px 'Plus Jakarta Sans',sans-serif", color: "#e5928a" }}>{SKIN_ERROR_COPY[skinError] ?? "No se pudo guardar."}</p>}

          {program.skins.map((skin) => {
            const colors = skin.colors as unknown as SkinColors;
            return (
              <div key={skin.id} style={{ background: "#161616", border: skin.active ? "1px solid rgba(200,161,90,.6)" : "1px solid rgba(255,255,255,.08)", borderRadius: 12, padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                  <span style={{ font: "600 12.5px 'Plus Jakarta Sans',sans-serif", color: "#F5F2EB" }}>{skin.name}</span>
                  {skin.active && (
                    <span style={{ font: "700 9px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".14em", textTransform: "uppercase", color: "#8fd19e" }}>● Encendido</span>
                  )}
                </div>
                <div style={{ display: "flex", gap: 4 }}>
                  {Object.values(colors ?? {}).map((hex, i) => (
                    <span key={i} style={{ width: 22, height: 22, borderRadius: 6, background: String(hex), border: "1px solid rgba(255,255,255,.15)" }} />
                  ))}
                </div>
                <span style={{ font: "400 11px 'Plus Jakarta Sans',sans-serif", color: "#9a8f80" }}>
                  {skin.font} · {skin.buttonStyle}
                </span>
                <div style={{ display: "flex", gap: 8 }}>
                  <form action={activateProgramSkinAction.bind(null, program.id, skin.id)}>
                    <button
                      type="submit"
                      style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid rgba(200,161,90,.4)", background: skin.active ? "none" : "rgba(200,161,90,.15)", color: "#E5C378", font: "700 10px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".08em", textTransform: "uppercase", cursor: "pointer" }}
                    >
                      {skin.active ? "Apagar" : "Encender"}
                    </button>
                  </form>
                  <form action={deleteProgramSkinAction.bind(null, program.id, skin.id)}>
                    <button
                      type="submit"
                      style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,.1)", background: "none", color: "#5A5A5A", font: "700 10px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".08em", textTransform: "uppercase", cursor: "pointer" }}
                    >
                      Borrar
                    </button>
                  </form>
                </div>
              </div>
            );
          })}

          {program.skins.length < 3 && (
            <form action={createProgramSkinAction.bind(null, program.id)} style={{ background: "#161616", border: "1px dashed rgba(200,161,90,.3)", borderRadius: 12, padding: 14, display: "flex", flexDirection: "column", gap: 8 }}>
              <input
                name="skinName"
                placeholder="Nombre del skin (opcional)"
                style={{ background: "#0D0D0D", border: "1px solid rgba(200,161,90,.3)", borderRadius: 8, padding: "8px 12px", color: "#F5F2EB", font: "400 12px 'Plus Jakarta Sans',sans-serif", outline: "none" }}
              />
              <input type="file" name="designMd" accept=".md,text/markdown,text/plain" style={{ font: "400 11px 'Plus Jakarta Sans',sans-serif", color: "#C2BEB5" }} />
              <button
                type="submit"
                style={{ padding: 11, border: "none", borderRadius: 8, background: "linear-gradient(90deg,#E5C378,#C8A15A 50%,#99732B)", color: "#0D0D0D", font: "700 10.5px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".08em", textTransform: "uppercase", cursor: "pointer" }}
              >
                Subir y Analizar
              </button>
            </form>
          )}
        </AccordionSection>

        {/* Card labels — title-only override for buttons/modals on project
            cards under this Program (PLAN.md Fase 9, atajo). Blank = default. */}
        <AccordionSection title="Textos de Botones y Modales" defaultOpen={Boolean(labelsSaved)}>
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
        </AccordionSection>

        {/* Puestos — the N0-designed ladder of positions (PLAN.md Fase 9.1)
            that project Cards will pick from instead of writing their own
            siglas/denominación/descripción by hand (wiring is Fase 9.2). */}
        <AccordionSection
          title="Escalera de Puestos"
          subtitle="Ej. O.D. / Founders / Experts / Specialists / Partners — cada uno con sigla, ícono, denominación y descripción. Orden más bajo aparece primero."
          meta={<span style={PILL}>{program.puestos.length}</span>}
          defaultOpen={Boolean(puestoCreated || puestoSaved || puestoDeleted || puestoError)}
        >
          {puestoCreated && <p style={{ margin: 0, font: "600 11px 'Plus Jakarta Sans',sans-serif", color: "#8fd19e" }}>✓ Puesto creado.</p>}
          {puestoSaved && <p style={{ margin: 0, font: "600 11px 'Plus Jakarta Sans',sans-serif", color: "#8fd19e" }}>✓ Puesto actualizado.</p>}
          {puestoDeleted && <p style={{ margin: 0, font: "600 11px 'Plus Jakarta Sans',sans-serif", color: "#8fd19e" }}>✓ Puesto eliminado.</p>}
          {puestoError && (
            <p style={{ margin: 0, font: "600 11px 'Plus Jakarta Sans',sans-serif", color: "#e5928a" }}>Sigla y denominación son obligatorias.</p>
          )}

          <AccordionAddRow label="Agregar Puesto" defaultOpen={program.puestos.length === 0}>
            <form action={createPuestoAction.bind(null, program.id)} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", gap: 8 }}>
                <input name="siglas" placeholder="Sigla (ej. O.D.)" required style={{ ...INPUT, flex: "1 1 100px" }} />
                <input name="order" type="number" defaultValue={program.puestos.length} placeholder="Orden" style={{ ...INPUT, width: 80 }} />
              </div>
              <input name="icono" placeholder="Ícono del badge (Material Symbols, ej. diamond)" style={INPUT} />
              <input name="denominacion" placeholder="Denominación (ej. Original Dreamer)" required style={INPUT} />
              <textarea name="descripcion" placeholder="Descripción del puesto" rows={2} style={{ ...INPUT, resize: "vertical" }} />
              <button type="submit" style={SAVE_BTN}>
                Crear Puesto
              </button>
            </form>
          </AccordionAddRow>

          {program.puestos.map((p) => (
            <AccordionRow
              key={p.id}
              title={`${p.siglas} — ${p.denominacion}`}
              subtitle={p.descripcion || `orden ${p.order}`}
              leading={
                <span className="material-symbols-outlined" style={{ flex: "none", fontSize: 19, color: "#C8A15A" }}>
                  {p.icono}
                </span>
              }
              trailing={
                <form action={deletePuestoAction.bind(null, p.id, program.id)}>
                  <button type="submit" aria-label="Borrar" style={DELETE_ICON_BTN}>
                    <span className="material-symbols-outlined" style={{ fontSize: 15 }}>delete</span>
                  </button>
                </form>
              }
            >
              <form action={updatePuestoAction.bind(null, p.id, program.id)} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", gap: 8 }}>
                  <input name="siglas" defaultValue={p.siglas} placeholder="Sigla (ej. O.D.)" style={{ ...INPUT, flex: "1 1 100px" }} />
                  <input name="order" type="number" defaultValue={p.order} placeholder="Orden" style={{ ...INPUT, width: 80 }} />
                </div>
                <input name="icono" defaultValue={p.icono} placeholder="Ícono del badge (Material Symbols, ej. diamond)" style={INPUT} />
                <input name="denominacion" defaultValue={p.denominacion} placeholder="Denominación (ej. Original Dreamer)" style={INPUT} />
                <textarea name="descripcion" defaultValue={p.descripcion} placeholder="Descripción del puesto" rows={3} style={{ ...INPUT, resize: "vertical" }} />
                <button type="submit" style={SAVE_BTN}>
                  Guardar
                </button>
              </form>
            </AccordionRow>
          ))}
        </AccordionSection>

        {/* Medallón + Sabiduría + Contactos scales — PLAN.md Fase 9.4/9.5
            + Fase Contactos (2026-09-16). Empty = keep the fixed scale in
            lib/data.ts, same fallback as every other piece of Fase 9. */}
        <AccordionSection
          title="Escala de Medallón"
          subtitle="Sin niveles acá, las tarjetas de Proyecto siguen usando la escala fija (Bronce → Diamante). La clave de cada nivel es lo que se guarda en la tarjeta — cambiarla después de asignada la rompe."
          meta={<span style={PILL}>{medalScale.length || "fija"}</span>}
          defaultOpen={escalaSaved === "medal"}
        >
          {escalaSaved === "medal" && <p style={{ margin: 0, font: "600 11px 'Plus Jakarta Sans',sans-serif", color: "#8fd19e" }}>✓ Escala guardada.</p>}
          <EscalaEditor type="medal" initialItems={medalScale} action={updateEscalaAction.bind(null, program.id, "medal")} />
        </AccordionSection>

        <AccordionSection
          title="Escala de Sabiduría"
          subtitle="Sin niveles acá, las tarjetas de Proyecto siguen usando la escala fija (Curioso → Ancient)."
          meta={<span style={PILL}>{rankScale.length || "fija"}</span>}
          defaultOpen={escalaSaved === "rank"}
        >
          {escalaSaved === "rank" && <p style={{ margin: 0, font: "600 11px 'Plus Jakarta Sans',sans-serif", color: "#8fd19e" }}>✓ Escala guardada.</p>}
          <EscalaEditor type="rank" initialItems={rankScale} action={updateEscalaAction.bind(null, program.id, "rank")} />
        </AccordionSection>

        <AccordionSection
          title="Escala de Gente Contactada"
          subtitle="Sin niveles acá, las tarjetas siguen usando la escala fija de medallones (Bronce → Diamante). El ícono de cada nivel es el que se muestra en el badge junto al nombre."
          meta={<span style={PILL}>{contactsScale.length || "fija"}</span>}
          defaultOpen={escalaSaved === "contacts"}
        >
          {escalaSaved === "contacts" && <p style={{ margin: 0, font: "600 11px 'Plus Jakarta Sans',sans-serif", color: "#8fd19e" }}>✓ Escala guardada.</p>}
          <EscalaEditor type="contacts" initialItems={contactsScale} action={updateEscalaAction.bind(null, program.id, "contacts")} />
        </AccordionSection>

        {/* N0 admins — MasterN0 only, per PLAN.md Fase 6 */}
        {isMasterN0 && (
          <AccordionSection
            title="N0 de este Programa"
            meta={<span style={PILL}>{program.admins.length}</span>}
            defaultOpen={Boolean(adminCreated || adminError)}
          >
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
          </AccordionSection>
        )}

        {/* Members */}
        <AccordionSection
          title="Miembros"
          meta={<span style={PILL}>{program.memberships.length}</span>}
          defaultOpen={Boolean(memberSaved || memberDeleted || memberMessaged || memberError)}
        >
          {memberSaved && <p style={{ margin: 0, font: "600 11px 'Plus Jakarta Sans',sans-serif", color: "#8fd19e" }}>✓ Miembro actualizado.</p>}
          {memberDeleted && <p style={{ margin: 0, font: "600 11px 'Plus Jakarta Sans',sans-serif", color: "#8fd19e" }}>✓ Miembro eliminado.</p>}
          {memberMessaged && <p style={{ margin: 0, font: "600 11px 'Plus Jakarta Sans',sans-serif", color: "#8fd19e" }}>✓ Mensaje enviado.</p>}
          {memberError && (
            <p style={{ margin: 0, font: "600 11px 'Plus Jakarta Sans',sans-serif", color: "#e5928a" }}>
              {MEMBER_ERROR_COPY[memberError] || "Algo falló."}
            </p>
          )}
          {program.memberships.length === 0 && <p style={{ margin: 0, color: "#5A5A5A", font: "400 12.5px 'Plus Jakarta Sans',sans-serif" }}>Todavía no hay miembros.</p>}
          {program.memberships.map((m) => {
            const projectCard = m.member.cards.find((c) => c.kind === "project");
            return (
              <AccordionRow
                key={m.id}
                title={m.member.name || "(sin nombre)"}
                subtitle={[m.member.whatsapp, m.member.email].filter(Boolean).join(" · ") || undefined}
                leading={
                  <span
                    style={{
                      flex: "none",
                      font: "700 9px 'Plus Jakarta Sans',sans-serif",
                      letterSpacing: ".06em",
                      textTransform: "uppercase",
                      color: m.status === "active" ? "#7BC98E" : "#C8A15A",
                      background: m.status === "active" ? "rgba(123,201,142,.12)" : "rgba(200,161,90,.12)",
                      borderRadius: 6,
                      padding: "3px 6px",
                    }}
                  >
                    {m.status === "active" ? "Activo" : "Invitado"}
                  </span>
                }
                trailing={
                  <form action={deleteMemberAction.bind(null, m.member.id, program.id)}>
                    <button type="submit" aria-label="Borrar" style={DELETE_ICON_BTN}>
                      <span className="material-symbols-outlined" style={{ fontSize: 15 }}>delete</span>
                    </button>
                  </form>
                }
              >
                {m.referredBy && (
                  <p style={{ margin: 0, font: "400 11.5px 'Plus Jakarta Sans',sans-serif", color: "#C2BEB5" }}>Referido por: {m.referredBy.member.name}</p>
                )}
                {projectCard && (
                  <Link href={`/c/${projectCard.slug}`} style={{ font: "400 11.5px 'Plus Jakarta Sans',sans-serif", color: "#C8A15A" }}>
                    /c/{projectCard.slug}
                  </Link>
                )}

                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <span style={{ font: "700 10px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".06em", textTransform: "uppercase", color: "#5A5A5A" }}>Editar</span>
                  <form
                    action={updateMemberAction.bind(null, m.member.id, program.id)}
                    style={{ display: "flex", flexDirection: "column", gap: 8 }}
                  >
                    <input name="name" defaultValue={m.member.name} placeholder="Nombre" style={INPUT} />
                    <input name="whatsapp" defaultValue={m.member.whatsapp || ""} placeholder="WhatsApp" style={INPUT} />
                    <input name="email" type="email" defaultValue={m.member.email} placeholder="Email" style={INPUT} />
                    <button type="submit" style={SAVE_BTN}>
                      Guardar
                    </button>
                  </form>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingTop: 6, borderTop: "1px solid rgba(255,255,255,.06)" }}>
                  <span style={{ font: "700 10px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".06em", textTransform: "uppercase", color: "#5A5A5A" }}>Mensaje</span>
                  <form
                    action={messageMemberAction.bind(null, m.member.id, program.id)}
                    style={{ display: "flex", flexDirection: "column", gap: 8 }}
                  >
                    <input name="subject" placeholder="Asunto" style={INPUT} />
                    <textarea name="message" placeholder="Mensaje" rows={3} style={{ ...INPUT, resize: "vertical" }} />
                    <button type="submit" style={SAVE_BTN}>
                      Enviar
                    </button>
                  </form>
                </div>
              </AccordionRow>
            );
          })}
        </AccordionSection>

        {/* Interviews */}
        <AccordionSection
          title="Inscriptos a Entrevistas"
          meta={<span style={PILL}>{registrations.length}</span>}
          defaultOpen={Boolean(activated)}
        >
          {activated && <p style={{ margin: 0, font: "600 11px 'Plus Jakarta Sans',sans-serif", color: "#8fd19e" }}>✓ Membership activada.</p>}
          {registrations.length === 0 && <p style={{ margin: 0, color: "#5A5A5A", font: "400 12.5px 'Plus Jakarta Sans',sans-serif" }}>Todavía no hay inscripciones.</p>}
          {registrations.map((r) => {
            const isActive = r.membership?.status === "active";
            return (
              <div key={r.id} style={{ background: "#151414", borderRadius: 12, padding: 14, display: "flex", flexDirection: "column", gap: 4 }}>
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
        </AccordionSection>
      </div>
    </div>
  );
}
