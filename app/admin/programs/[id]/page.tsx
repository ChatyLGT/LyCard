import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import PhotoPositioner from "@/components/PhotoPositioner";
import { prisma } from "@/lib/prisma";
import { currentAdminScope, isMasterN0Scope, canAccessProgram } from "@/lib/auth";
import { logoutAction } from "@/app/admin/actions";
import { completeInterviewAction } from "@/app/admin/interviews/actions";
import {
  updateProgramAction,
  setProgramOriginAction,
  createProgramAdminAction,
  updateCardLabelsAction,
  updateEscalaAction,
  createProgramSkinAction,
  activateProgramSkinAction,
  deleteProgramSkinAction,
  setProgramSkinLightColorsAction,
  updateOfficeSkillsAction,
  setOfficeSkillIconAction,
  updateMotivationalPhrasesAction,
} from "../actions";
import { addMemberToProgramAction, updateMemberAction, deleteMemberAction, messageMemberAction, markMembershipPaidAction, viewAsMemberAction } from "../members-actions";
import { sendMassMessageAction } from "../messages-actions";
import { CHANNELS } from "@/lib/messaging";
import { buildFunnelStages } from "@/lib/funnel";
import { createPuestoAction, updatePuestoAction, deletePuestoAction } from "../puestos-actions";
import { createInterviewSlotAction, updateInterviewSlotAction, deleteInterviewSlotAction } from "../interview-slots-actions";
import { setPodiumButtonAction, updateVaultAction, updateModalContentAction } from "../podium-actions";
import { CARD_LABEL_FIELDS, defaultCardLabel } from "@/lib/cardLabels";
import { parseEscala } from "@/lib/escalas";
import { parseOfficeSkills, DEFAULT_OFFICE_SKILLS } from "@/lib/officeSkills";
import { parseMotivationalPhrases } from "@/lib/oficinaExtras";
import { parsePodiumButtons, getPodiumButton } from "@/lib/podiumButtons";
import { parseModalBlocksMap } from "@/lib/modalBlocks";
import { wouldCreateCycle } from "@/lib/programLineage";
import { toCatalogEntry as toSlotTemplateCatalogEntry, matchSlotTemplates } from "@/lib/slotTemplates";
import { MODAL_EDITOR_ENTRIES, parseModalIcons, parseTierIntros } from "@/lib/modalEditor";
import EscalaEditor from "@/components/EscalaEditor";
import OfficeSkillsEditor from "@/components/OfficeSkillsEditor";
import PhraseListEditor from "@/components/PhraseListEditor";
import ProgramSkinInfo from "@/components/ProgramSkinInfo";
import PodiumSlotEditor from "@/components/PodiumSlotEditor";
import ModalBlocksEditor from "@/components/ModalBlocksEditor";
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
    memberPaidToggled?: string;
    labelsSaved?: string;
    puestoCreated?: string;
    puestoSaved?: string;
    puestoDeleted?: string;
    puestoError?: string;
    slotCreated?: string;
    slotSaved?: string;
    slotDeleted?: string;
    slotError?: string;
    escalaSaved?: string;
    skinSaved?: string;
    skinError?: string;
    officeSkillsSaved?: string;
    officeSkillsError?: string;
    motivationalPhrasesSaved?: string;
    podiumSaved?: string;
    modalSaved?: string;
    originSaved?: string;
    error?: string;
    focus?: string;
    messageSent?: string;
    messageError?: string;
    memberAdded?: string;
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
    memberPaidToggled,
    messageSent,
    messageError,
    labelsSaved,
    puestoCreated,
    puestoSaved,
    puestoDeleted,
    puestoError,
    slotCreated,
    slotSaved,
    slotDeleted,
    slotError,
    escalaSaved,
    skinSaved,
    skinError,
    officeSkillsSaved,
    officeSkillsError,
    motivationalPhrasesSaved,
    podiumSaved,
    modalSaved,
    originSaved,
    error,
    focus,
    memberAdded,
  } = await searchParams;
  const ORIGIN_ERROR_COPY: Record<string, string> = {
    "origin-self": "Un Programa no puede ser su propio origen.",
    "origin-required": "Solo Legacy (la raíz) puede quedarse sin origen -- elegí uno real.",
    "origin-cycle": "Ese origen crearía un ciclo (A deriva de B que ya deriva de A) -- elegí otro.",
  };
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
    addName: "El nombre es obligatorio.",
    hasCards: "No se puede borrar — ya tiene tarjetas activas con links circulando.",
    messageEmpty: "Completá asunto y mensaje.",
    messageNotConfigured: "Este miembro no tiene email cargado, o el envío de correos no está activado.",
    messageFailed: "No se pudo enviar el mensaje, probá de nuevo.",
    paidRequiresActive: "Solo se puede marcar como pagada una membresía ya activa.",
    viewAsRequiresOwnLogin: "Para entrar como un Miembro necesitás tu propia sesión de Admin (no la del puente Chido→Programa) -- vos ya tenés tu /m/dashboard a un click, sin este atajo.",
  };

  const scope = await currentAdminScope();
  if (!scope) redirect("/admin/login");
  const isMasterN0 = isMasterN0Scope(scope);
  if (!canAccessProgram(scope, id)) redirect(`/admin/programs/${scope.programId}`);

  const program = await prisma.program.findUnique({
    where: { id },
    include: {
      admins: { orderBy: { createdAt: "asc" }, include: { member: true } },
      puestos: { orderBy: { order: "asc" } },
      interviewSlots: { orderBy: { date: "asc" } },
      skins: { orderBy: { createdAt: "asc" } },
      memberships: {
        orderBy: { createdAt: "desc" },
        include: { member: { include: { cards: true } }, referredBy: { include: { member: true } } },
      },
      originProgram: { select: { id: true, name: true } },
    },
  });
  if (!program) notFound();

  // Linaje (2026-10-05) -- lista de candidatos para "Programa de origen",
  // solo para el selector MasterN0 de abajo: todos salvo este mismo y,
  // desde el 2026-10-07, salvo cualquiera que crearía un ciclo (ej. un
  // descendiente de este Programa -- elegirlo como origen lo pondría a
  // derivar de su propio hijo).
  const allProgramsForLineage = isMasterN0
    ? await prisma.program.findMany({ select: { id: true, name: true, originProgramId: true }, orderBy: { name: "asc" } })
    : [];
  const originCandidates = allProgramsForLineage.filter(
    (p) => p.id !== program.id && !wouldCreateCycle(allProgramsForLineage, program.id, p.id)
  );

  const cardLabels: Record<string, string> =
    program.cardLabels && typeof program.cardLabels === "object" && !Array.isArray(program.cardLabels)
      ? (program.cardLabels as Record<string, string>)
      : {};

  const medalScale = parseEscala(program.medalScale);
  const rankScale = parseEscala(program.rankScale);
  const contactsScale = parseEscala(program.contactsScale);
  // Librería "elegir o armar" (2026-10-07) -- los 3 editores de Escala
  // comparten el mismo slotType ("escala"): medal/rank/contacts tienen
  // exactamente el mismo shape (EscalaItem[]), así que un template sirve
  // para cualquiera de los 3. Sin filtro de rubro/dolor acá -- la lista
  // completa, ver lib/slotTemplates.ts.
  const slotTemplateCatalog = (await prisma.slotTemplate.findMany({ orderBy: { createdAt: "asc" } })).map(
    toSlotTemplateCatalogEntry
  );
  const escalaTemplates = matchSlotTemplates(slotTemplateCatalog, "escala", null, null);
  const officeSkills = parseOfficeSkills(program.officeSkills);
  const motivationalPhrases = parseMotivationalPhrases(program.motivationalPhrases);
  const podiumButtons = parsePodiumButtons(program.podiumButtons);
  const modalBlocksMap = parseModalBlocksMap(program.modalBlocks);
  const modalIcons = parseModalIcons(program.modalIcons);
  const tierIntros = parseTierIntros(program.tierIntros);

  const registrations = await prisma.registration.findMany({
    where: { card: { programId: id } },
    orderBy: { createdAt: "desc" },
    include: { card: { select: { name: true, slug: true } }, membership: true },
  });
  const returnTo = `/admin/programs/${id}`;

  // Embudo de Conversión (pedido de Gunnar, 2026-09-23) -- une 3 modelos
  // que ya existían sueltos: CardLead (compartida del QR), Registration
  // (se registró para la entrevista) y ProgramMembership (entrevistado /
  // activó su Oficina Virtual / pagó -- este último marcado a mano, no
  // hay pasarela de pago real).
  const leadCount = await prisma.cardLead.count({ where: { card: { programId: id } } });
  const interviewedCount = program.memberships.filter((m) => m.interviewedAt !== null).length;
  const activeCount = program.memberships.filter((m) => m.status === "active").length;
  const paidCount = program.memberships.filter((m) => m.membershipPaidAt !== null).length;
  const funnelStages = buildFunnelStages({
    shared: leadCount,
    registered: registrations.length,
    interviewed: interviewedCount,
    active: activeCount,
    paid: paidCount,
  });
  const funnelMax = Math.max(1, ...funnelStages.map((s) => s.count));

  return (
    <div style={{ minHeight: "100vh", background: "#131313", color: "#e5e2e1", fontFamily: "'Plus Jakarta Sans',sans-serif", padding: "0 0 60px" }}>
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          background: "rgba(20,20,20,.96)",
          borderBottom: "1px solid rgba(200,161,90,.22)",
          // Fix (2026-10-05, reportado por Gunnar): notch/isla dinámica.
          padding: "calc(env(safe-area-inset-top,0px) + 16px) 20px 16px",
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
        <AccordionSection title="Identidad del Programa" defaultOpen={true}>
          {saved && <p style={{ margin: 0, font: "600 11px 'Plus Jakarta Sans',sans-serif", color: "#8fd19e" }}>✓ Guardado.</p>}
          <form action={updateProgramAction.bind(null, program.id)} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <span style={{ font: "500 10px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".16em", textTransform: "uppercase", color: "#C2BEB5" }}>Nombre</span>
              <input name="name" defaultValue={program.name} style={{ background: "#0D0D0D", border: "1px solid rgba(200,161,90,.3)", borderRadius: 10, padding: "10px 14px", color: "#F5F2EB", font: "400 13px 'Plus Jakarta Sans',sans-serif", outline: "none" }} />
            </label>
            {/* div, no label -- PhotoPositioner ya trae su propio <button>
                para abrir el selector; anidarlo en un <label> asociado al
                input de archivo arriesga que un click en "Confirmar" o
                arrastrar dentro del editor reabra el picker nativo. */}
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <span style={{ font: "500 10px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".16em", textTransform: "uppercase", color: "#C2BEB5" }}>
                Logo (abre en el botón de Oficina Virtual de cada tarjeta de este Programa)
              </span>
              {/* Posicionador real (2026-10-04, pedido de Gunnar: "se ve
                  cortada.. no puedo editar o modificar su posicion o
                  tamaño") -- reemplaza el <input type="file"> crudo de
                  antes. Ya no depende de objectFit:contain para no
                  recortar el logo: ahora el propio N0 elige, con
                  arrastre + zoom, cómo se compone dentro del círculo
                  antes de subirlo. Ver components/PhotoPositioner.tsx. */}
              <PhotoPositioner
                // key=initialUrl (2026-10-04): fuerza un remount cuando el
                // logo guardado cambia -- sin esto, "Reposicionar" dos
                // veces seguidas en la misma sesión (sin recargar a mano)
                // podía reabrir un blob: URL viejo del navegador en vez
                // del archivo real recién guardado, y el modal no abría.
                key={program.logoUrl ?? "empty"}
                name="logo"
                label="Subir logo"
                initialUrl={program.logoUrl}
                aspect="square"
                fit="contain"
                previewShape="circle"
                previewSize={44}
                helpText="Sin logo, se muestra el emblema decorativo de siempre."
              />
            </div>
            <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <span style={{ font: "500 10px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".16em", textTransform: "uppercase", color: "#C2BEB5" }}>
                Nombre de la app (pestaña del navegador)
              </span>
              <input
                name="cardAppName"
                defaultValue={program.cardAppName}
                placeholder="LyCard"
                style={{ background: "#0D0D0D", border: "1px solid rgba(200,161,90,.3)", borderRadius: 10, padding: "10px 14px", color: "#F5F2EB", font: "400 13px 'Plus Jakarta Sans',sans-serif", outline: "none" }}
              />
              <span style={{ font: "400 10.5px/1.5 'Plus Jakarta Sans',sans-serif", color: "#5A5A5A" }}>
                Reemplaza &quot;LyCard&quot; y el favicon genérico en las tarjetas de
                este Programa (ej. &quot;Legacy Card&quot; + el logo de arriba). Vacío
                = queda &quot;LyCard&quot; con el ícono de siempre.
              </span>
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

        {/* Editor de Modales -- Unificación completa (2026-10-06, pedido
            de Gunnar tras no encontrar dónde vivía el título/contenido
            de "cardInfo": "no se que has echo.. en ningun lado puedo
            leer ni se donde esta el texto del título o del contenido
            del modal de cardinfo" -> "dale con todos los 14, hacelo
            bien completo"). Antes esto era ícono+intro nomás, con el
            texto del botón en "Textos de Botones y Modales" y el
            contenido pesado (Bóveda/cardInfo) en 2 secciones más --
            3 lugares para entender UN modal. Ahora cada una de las 14
            filas trae TODO lo que ese modal tiene (ícono, texto del
            botón, contenido), un solo "Guardar" por fila -- ver
            lib/modalEditor.ts (MODAL_EDITOR_ENTRIES) para qué campo
            aplica a cada bodyKind. */}
        <AccordionSection
          title="Editor de Modales"
          subtitle="Los 14 modales reales de la tarjeta, cada uno con todo lo que lo compone en su propia fila: ícono, texto del botón que lo abre, y contenido. Tocá uno para abrirlo y editarlo -- un solo Guardar por modal."
          meta={<span style={PILL}>{MODAL_EDITOR_ENTRIES.length}</span>}
          defaultOpen={Boolean(modalSaved)}
        >
          {MODAL_EDITOR_ENTRIES.map((entry) => {
            const blocks = modalBlocksMap[entry.key] || [];
            const justSaved = modalSaved === entry.key;
            return (
              <AccordionRow
                key={entry.key}
                defaultOpen={justSaved}
                leading={
                  <span className="material-symbols-outlined" style={{ fontSize: 18, color: "#C8A15A", flex: "none" }}>
                    {modalIcons[entry.key] || entry.defaultIcon}
                  </span>
                }
                title={entry.name}
                subtitle={
                  entry.bodyKind === "bloques"
                    ? `${blocks.length} bloque${blocks.length === 1 ? "" : "s"}`
                    : entry.bodyKind === "niveles"
                    ? tierIntros[entry.key]
                      ? "Intro propia cargada"
                      : "Intro de siempre"
                    : "Automático"
                }
              >
                {justSaved && <p style={{ margin: 0, font: "600 11px 'Plus Jakarta Sans',sans-serif", color: "#8fd19e" }}>✓ Guardado.</p>}
                <form
                  action={entry.key === "vault" ? updateVaultAction.bind(null, program.id) : updateModalContentAction.bind(null, program.id, entry.key)}
                  style={{ display: "flex", flexDirection: "column", gap: 10 }}
                >
                  {entry.iconEditable && (
                    <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <span style={{ font: "500 10px 'Plus Jakarta Sans',sans-serif", color: "#C2BEB5" }}>Ícono del botón (nombre Material Symbol)</span>
                      <input name="icon" defaultValue={modalIcons[entry.key] || ""} placeholder={entry.defaultIcon} style={INPUT} />
                    </label>
                  )}

                  {entry.key === "vault" ? (
                    <>
                      <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        <span style={{ font: "500 10px 'Plus Jakarta Sans',sans-serif", color: "#C2BEB5" }}>Título</span>
                        <input name="vaultTitle" defaultValue={program.vaultTitle} placeholder="Bóveda Legacy" style={INPUT} />
                      </label>
                      <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        <span style={{ font: "500 10px 'Plus Jakarta Sans',sans-serif", color: "#C2BEB5" }}>Palabra secreta (guardada para más adelante -- ya no bloquea el contenido)</span>
                        <input name="vaultPalabraSecreta" defaultValue={program.vaultPalabraSecreta} style={INPUT} />
                      </label>
                    </>
                  ) : entry.kickerFieldKey ? (
                    <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <span style={{ font: "500 10px 'Plus Jakarta Sans',sans-serif", color: "#C2BEB5" }}>Texto del botón</span>
                      <input name="kicker" defaultValue={cardLabels[entry.kickerFieldKey] || ""} placeholder={defaultCardLabel(entry.kickerFieldKey)} style={INPUT} />
                    </label>
                  ) : null}

                  {entry.bodyKind === "bloques" && <ModalBlocksEditor name="blocks" initialBlocks={blocks} />}

                  {entry.bodyKind === "niveles" && (
                    <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <span style={{ font: "500 10px 'Plus Jakarta Sans',sans-serif", color: "#C2BEB5" }}>Texto introductorio (arriba de los niveles)</span>
                      <textarea
                        name="intro"
                        defaultValue={tierIntros[entry.key] || ""}
                        rows={2}
                        placeholder="Vacío = texto fijo de siempre"
                        style={{ ...INPUT, resize: "vertical" }}
                      />
                    </label>
                  )}

                  <span style={{ font: "400 10.5px/1.5 'Plus Jakarta Sans',sans-serif", color: "#5A5A5A" }}>{entry.bodyHint}</span>

                  {(entry.iconEditable || entry.key === "vault" || entry.kickerFieldKey || entry.bodyKind !== "fijo") && (
                    // aria-label único por fila (2026-10-06) -- con 14
                    // filas, un simple "Guardar" repetido 14 veces rompe
                    // cualquier locator exacto en otras secciones de esta
                    // misma página (ya pasó: fotos de perfil, mensajería).
                    <button
                      type="submit"
                      aria-label={`Guardar ${entry.name}`}
                      style={{ padding: 11, border: "none", borderRadius: 10, background: "linear-gradient(90deg,#E5C378,#C8A15A 50%,#99732B)", color: "#0D0D0D", font: "700 11px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".1em", textTransform: "uppercase", cursor: "pointer" }}
                    >
                      Guardar
                    </button>
                  )}
                </form>
              </AccordionRow>
            );
          })}
        </AccordionSection>

        {/* Linaje de Programas (2026-10-05, caso Juancho/Digital Kingdom):
            solo MasterN0 puede ver/cambiar de dónde "cuelga" este Programa.
            No es parte de "Identidad" porque es un dato de plataforma, no
            de marca -- un N0 scoped no debería ni verlo. */}
        {isMasterN0 && (
          <AccordionSection title="Linaje" meta={program.originProgram ? <span style={PILL}>desde {program.originProgram.name}</span> : program.isRoot ? <span style={PILL}>raíz</span> : undefined}>
            {originSaved && <p style={{ margin: 0, font: "600 11px 'Plus Jakarta Sans',sans-serif", color: "#8fd19e" }}>✓ Guardado.</p>}
            {error && ORIGIN_ERROR_COPY[error] && (
              <p style={{ margin: 0, font: "600 11px 'Plus Jakarta Sans',sans-serif", color: "#e5928a" }}>{ORIGIN_ERROR_COPY[error]}</p>
            )}
            <p style={{ margin: 0, font: "400 11.5px/1.5 'Plus Jakarta Sans',sans-serif", color: "#8a8378" }}>
              De qué Programa salió este -- se setea solo cuando se promueve un Chido a su propio Programa; acá se puede linkear a mano uno creado directo (ej. Digital Kingdom → Legacy).
              {!program.isRoot && " Todo Programa que no sea la raíz (Legacy) tiene que tener uno."}
            </p>
            <form action={setProgramOriginAction.bind(null, program.id)} style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <select
                name="originProgramId"
                defaultValue={program.originProgramId ?? ""}
                required={!program.isRoot}
                style={{ flex: "1 1 200px", background: "#0D0D0D", border: "1px solid rgba(200,161,90,.3)", borderRadius: 10, padding: "10px 14px", color: "#F5F2EB", font: "400 13px 'Plus Jakarta Sans',sans-serif", outline: "none" }}
              >
                {program.isRoot ? (
                  <option value="">Sin origen (raíz)</option>
                ) : (
                  <option value="" disabled>
                    Elegí un origen...
                  </option>
                )}
                {originCandidates.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                style={{ padding: "10px 18px", border: "none", borderRadius: 10, background: "linear-gradient(90deg,#E5C378,#C8A15A 50%,#99732B)", color: "#0D0D0D", font: "700 11px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".1em", textTransform: "uppercase", cursor: "pointer" }}
              >
                Guardar
              </button>
            </form>
          </AccordionSection>
        )}

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
            const lightColors = skin.lightColors as unknown as SkinColors | null;
            return (
              <div key={skin.id} style={{ background: "#161616", border: skin.active ? "1px solid rgba(200,161,90,.6)" : "1px solid rgba(255,255,255,.08)", borderRadius: 12, padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                  <span style={{ font: "600 12.5px 'Plus Jakarta Sans',sans-serif", color: "#F5F2EB" }}>{skin.name}</span>
                  {skin.active && (
                    <span style={{ font: "700 9px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".14em", textTransform: "uppercase", color: "#8fd19e" }}>● Encendido</span>
                  )}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <span style={{ font: "600 8.5px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".1em", textTransform: "uppercase", color: "#5A5A5A" }}>Oscuro</span>
                  <div style={{ display: "flex", gap: 4 }}>
                    {Object.values(colors ?? {}).map((hex, i) => (
                      <span key={i} style={{ width: 22, height: 22, borderRadius: 6, background: String(hex), border: "1px solid rgba(255,255,255,.15)" }} />
                    ))}
                  </div>
                </div>
                {lightColors && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <span style={{ font: "600 8.5px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".1em", textTransform: "uppercase", color: "#5A5A5A" }}>Claro</span>
                    <div style={{ display: "flex", gap: 4 }}>
                      {Object.values(lightColors).map((hex, i) => (
                        <span key={i} style={{ width: 22, height: 22, borderRadius: 6, background: String(hex), border: "1px solid rgba(255,255,255,.15)" }} />
                      ))}
                    </div>
                  </div>
                )}
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
                {/* Retrofit para skins creados antes de que esto existiera
                    (2026-09-18) — subir/reemplazar solo el set claro sin
                    tocar el resto del skin. Sin esto, el toggle claro/oscuro
                    de la tarjeta sigue oculto (ver LyCardView.tsx). */}
                <form action={setProgramSkinLightColorsAction.bind(null, program.id, skin.id)} style={{ display: "flex", gap: 6, alignItems: "center", paddingTop: 6, borderTop: "1px solid rgba(255,255,255,.06)" }}>
                  <input type="file" name="designMdLight" accept=".md,text/markdown,text/plain" style={{ flex: 1, minWidth: 0, font: "400 10px 'Plus Jakarta Sans',sans-serif", color: "#C2BEB5" }} />
                  <button
                    type="submit"
                    style={{ padding: "7px 10px", borderRadius: 8, border: "1px solid rgba(200,161,90,.3)", background: "none", color: "#C8A15A", font: "700 9px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".06em", textTransform: "uppercase", cursor: "pointer", flexShrink: 0 }}
                  >
                    {lightColors ? "Reemplazar claro" : "+ Modo claro"}
                  </button>
                </form>
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
              <label style={{ font: "400 10px 'Plus Jakarta Sans',sans-serif", color: "#5A5A5A" }}>
                design.md — modo oscuro
                <input type="file" name="designMd" accept=".md,text/markdown,text/plain" style={{ display: "block", marginTop: 4, font: "400 11px 'Plus Jakarta Sans',sans-serif", color: "#C2BEB5" }} />
              </label>
              <label style={{ font: "400 10px 'Plus Jakarta Sans',sans-serif", color: "#5A5A5A" }}>
                design.md — modo claro (opcional, activa el toggle de la tarjeta)
                <input type="file" name="designMdLight" accept=".md,text/markdown,text/plain" style={{ display: "block", marginTop: 4, font: "400 11px 'Plus Jakarta Sans',sans-serif", color: "#C2BEB5" }} />
              </label>
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
            cards under this Program (PLAN.md Fase 9, atajo). Blank = default.
            Los 6 textos que eran el botón/kicker de uno de los 14 modales
            del "Editor de Modales" se mudaron a su fila ahí (2026-10-06) --
            lo que queda acá son botones puros y los 4 de Virtual
            Office/Agendar, que no son parte de ese sistema. */}
        <AccordionSection title="Textos de Botones y Modales" defaultOpen={Boolean(labelsSaved)}>
          <p style={{ margin: 0, font: "400 11.5px/1.6 'Plus Jakarta Sans',sans-serif", color: "#5A5A5A" }}>
            Aplica a las tarjetas de Proyecto de este Programa. Dejá un campo
            vacío para usar el texto original. Los textos de cada modal del
            &quot;Editor de Modales&quot; (de arriba) se editan en su propia
            fila, no acá.
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

        {/* Categorización — unifica los 4 distintivos en un solo lugar
            (2026-10-04, pedido de Gunnar: "todo eso no esta muy
            funcional.. ayudame a mejorarlo.. vamos a poner ahi una seccion
            que agrupe todo lo que ahora esta separado"). Antes eran 4
            AccordionSection sueltas intercaladas con Horarios de
            Entrevista, que no tiene nada que ver con gamificación — esa
            sección se corrió fuera de este bloque, ver más abajo.
            Orden y nombres (2026-10-04, segunda corrección de Gunnar
            viendo la tarjeta real en vivo): izquierda a derecha / arriba
            a abajo tal como se leen en la tarjeta -- Medalla KPIs (dot a
            la izquierda del nombre), Medalla Rango (dot a la derecha del
            nombre), Badge de Puestos y Badge de Rangos (fila de abajo,
            en ese orden). */}
        <AccordionSection
          title="Categorización"
          subtitle="Toda la gamificación del Programa en un solo lugar, en el mismo orden en que se leen en la tarjeta: Medalla KPIs, Medalla Rango, Badge de Puestos y Badge de Rangos. Editá colores, íconos y títulos acá — el modal de cada distintivo en la tarjeta ya refleja esto automáticamente."
          meta={<span style={PILL}>{program.puestos.length + medalScale.length + rankScale.length + contactsScale.length || "fijo"}</span>}
          defaultOpen={Boolean(puestoCreated || puestoSaved || puestoDeleted || puestoError || escalaSaved)}
        >
        {/* "Escala de Gente Contactada" → Medalla KPIs (2026-10-04 --
            primero "Badge de Valor", corregido otra vez por Gunnar viendo
            la tarjeta real: "tiene que ver con cantidad de valor
            creado.. o de ventas realizadas.. o en el caso de legacy..
            gemelos digitales legacies creados a recomendacion del host").
            Mismo mecanismo manual que los otros 3, confirmado con Gunnar
            antes de construir -- el N0 elige el nivel a mano, sin
            contador automático de referidos todavía. Internamente sigue
            siendo type="contacts" (Card.contacts, Program.contactsScale).
            Primero en el orden -- es el dot a la izquierda del nombre. */}
        <AccordionSection
          title="Medalla KPIs"
          subtitle="Sin niveles acá, las tarjetas siguen usando la escala fija de medallones (Bronce → Diamante). El ícono de cada nivel es el que se muestra en el badge junto al nombre."
          meta={<span style={PILL}>{contactsScale.length || "fija"}</span>}
          defaultOpen={escalaSaved === "contacts"}
        >
          {escalaSaved === "contacts" && <p style={{ margin: 0, font: "600 11px 'Plus Jakarta Sans',sans-serif", color: "#8fd19e" }}>✓ Escala guardada.</p>}
          <EscalaEditor type="contacts" initialItems={contactsScale} templates={escalaTemplates} action={updateEscalaAction.bind(null, program.id, "contacts")} />
        </AccordionSection>

        {/* "Escala de Medallón" → Medalla Rango (2026-10-04 -- primero
            "Medallón de Resultados", corregido por Gunnar en la misma
            vuelta que Medalla KPIs: mide rendimiento/impacto real, de
            crítico a liderazgo). Internamente sigue siendo type="medal"
            (Card.medal, Program.medalScale). Segundo en el orden -- es
            el dot a la derecha del nombre. */}
        <AccordionSection
          title="Medalla Rango"
          subtitle="Sin niveles acá, las tarjetas de Proyecto siguen usando la escala fija (Bronce → Diamante). La clave de cada nivel es lo que se guarda en la tarjeta — cambiarla después de asignada la rompe."
          meta={<span style={PILL}>{medalScale.length || "fija"}</span>}
          defaultOpen={escalaSaved === "medal"}
        >
          {escalaSaved === "medal" && <p style={{ margin: 0, font: "600 11px 'Plus Jakarta Sans',sans-serif", color: "#8fd19e" }}>✓ Escala guardada.</p>}
          <EscalaEditor type="medal" initialItems={medalScale} templates={escalaTemplates} action={updateEscalaAction.bind(null, program.id, "medal")} />
        </AccordionSection>

        {/* Puestos — Badge de Puestos (2026-10-04, antes "Escalera de
            Puestos") -- el N0 arma su propia escalera de posiciones
            (PLAN.md Fase 9.1) que project Cards pican en vez de escribir
            su propia siglas/denominación/descripción a mano (wiring Fase
            9.2). Tercero en el orden -- primer botón de la fila de abajo
            en la tarjeta. */}
        <AccordionSection
          title="Badge de Puestos"
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

        {/* "Escala de Sabiduría" → Badge de Rangos (2026-10-04 -- primero
            "Imán Badge", corregido por Gunnar en la misma vuelta que
            Medalla KPIs/Medalla Rango/Badge de Puestos). Mide capacidad
            de atracción/conversión de red -- QR compartido, visitantes
            convertidos en miembros/Especialistas/Expertos/Programas/
            Corporaciones. Internamente sigue siendo type="rank"
            (Card.rank, Program.rankScale). Último en el orden -- segundo
            botón de la fila de abajo en la tarjeta. */}
        <AccordionSection
          title="Badge de Rangos"
          subtitle="Sin niveles acá, las tarjetas de Proyecto siguen usando la escala fija (Curioso → Ancient)."
          meta={<span style={PILL}>{rankScale.length || "fija"}</span>}
          defaultOpen={escalaSaved === "rank"}
        >
          {escalaSaved === "rank" && <p style={{ margin: 0, font: "600 11px 'Plus Jakarta Sans',sans-serif", color: "#8fd19e" }}>✓ Escala guardada.</p>}
          <EscalaEditor type="rank" initialItems={rankScale} templates={escalaTemplates} action={updateEscalaAction.bind(null, program.id, "rank")} />
        </AccordionSection>
        </AccordionSection>

        {/* Botones del Podio (2026-10-04, pedido de Gunnar: "poder
            elegir desde el dashboard de cada programa los Botones que
            ibamos a colocar abajo.. son 3 botones.. los laterales
            pequeños y el principal grande.. el N0 decide que poner
            alli"). Solo los 2 cubos LATERALES son elegibles -- el del
            centro queda fijo en el QR real (compartir la Card), decisión
            explícita confirmada con Gunnar. */}
        <AccordionSection
          title="Botones del Podio"
          subtitle="Los 2 cubos chicos de la tarjeta (el del medio queda siempre con el QR real). Elegí qué va en cada uno: el modal Info de siempre, el modal simple que antes abría 'Mi camino', Enviar Invitación, Bóveda Legacy, o un botón armado a medida con el agente de IA."
          meta={<span style={PILL}>{podiumButtons.length ? `${podiumButtons.length}/2` : "fijo"}</span>}
          defaultOpen={Boolean(podiumSaved)}
        >
          {podiumSaved && <p style={{ margin: 0, font: "600 11px 'Plus Jakarta Sans',sans-serif", color: "#8fd19e" }}>✓ Botón guardado.</p>}
          <section style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ font: "600 10px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".08em", textTransform: "uppercase", color: "#5A5A5A" }}>
              Cubo izquierdo
            </span>
            <PodiumSlotEditor
              programId={program.id}
              slot="left"
              current={getPodiumButton(podiumButtons, "left")}
              setKindAction={setPodiumButtonAction.bind(null, program.id, "left")}
            />
          </section>
          <section style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ font: "600 10px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".08em", textTransform: "uppercase", color: "#5A5A5A" }}>
              Cubo derecho
            </span>
            <PodiumSlotEditor
              programId={program.id}
              slot="right"
              current={getPodiumButton(podiumButtons, "right")}
              setKindAction={setPodiumButtonAction.bind(null, program.id, "right")}
            />
          </section>
        </AccordionSection>


        {/* Horarios de Entrevista — cupo real por Programa (Auditoría
            2026-09-23, hallazgo 1.4). Sin filas acá, "Agendar tu
            Entrevista" sigue cayendo a los 4 horarios fijos de
            lib/interviewSlots.ts, mismo criterio honesto de siempre.
            Se corrió fuera del bloque de Categorización (2026-10-04) --
            no es gamificación, es agenda de entrevistas. */}
        <AccordionSection
          title="Horarios de Entrevista"
          subtitle="Cupo real por horario -- cuando se llena, deja de ofrecerse. Sin filas acá, se usan los 4 horarios fijos de ejemplo."
          meta={<span style={PILL}>{program.interviewSlots.length || "fijos"}</span>}
          defaultOpen={Boolean(slotCreated || slotSaved || slotDeleted || slotError)}
        >
          {slotCreated && <p style={{ margin: 0, font: "600 11px 'Plus Jakarta Sans',sans-serif", color: "#8fd19e" }}>✓ Horario creado.</p>}
          {slotSaved && <p style={{ margin: 0, font: "600 11px 'Plus Jakarta Sans',sans-serif", color: "#8fd19e" }}>✓ Horario actualizado.</p>}
          {slotDeleted && <p style={{ margin: 0, font: "600 11px 'Plus Jakarta Sans',sans-serif", color: "#8fd19e" }}>✓ Horario eliminado.</p>}
          {slotError === "required" && (
            <p style={{ margin: 0, font: "600 11px 'Plus Jakarta Sans',sans-serif", color: "#e5928a" }}>Completá etiqueta, hora y una fecha válida.</p>
          )}
          {slotError === "hasRegistrations" && (
            <p style={{ margin: 0, font: "600 11px 'Plus Jakarta Sans',sans-serif", color: "#e5928a" }}>No se puede borrar -- ya hay gente anotada en ese horario.</p>
          )}

          <AccordionAddRow label="Agregar Horario" defaultOpen={program.interviewSlots.length === 0}>
            <form action={createInterviewSlotAction.bind(null, program.id)} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <input name="label" placeholder="Etiqueta (ej. Martes 30 de Septiembre)" required style={INPUT} />
              <input name="labelEn" placeholder="Etiqueta en inglés (opcional, cae a la de arriba)" style={INPUT} />
              <div style={{ display: "flex", gap: 8 }}>
                <input name="date" type="date" required style={{ ...INPUT, flex: 1 }} />
                <input name="time" placeholder="Hora (ej. 18:00 hs GMT-6)" required style={{ ...INPUT, flex: 1 }} />
              </div>
              <input name="capacity" type="number" min={1} defaultValue={20} placeholder="Cupo" style={{ ...INPUT, width: 100 }} />
              <button type="submit" style={SAVE_BTN}>
                Crear Horario
              </button>
            </form>
          </AccordionAddRow>

          {program.interviewSlots.map((s) => (
            <AccordionRow
              key={s.id}
              title={s.label}
              subtitle={`${s.time} · cupo ${s.capacity}`}
              trailing={
                <form action={deleteInterviewSlotAction.bind(null, s.id, program.id)}>
                  <button type="submit" aria-label="Borrar" style={DELETE_ICON_BTN}>
                    <span className="material-symbols-outlined" style={{ fontSize: 15 }}>delete</span>
                  </button>
                </form>
              }
            >
              <form action={updateInterviewSlotAction.bind(null, s.id, program.id)} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <input name="label" defaultValue={s.label} placeholder="Etiqueta" style={INPUT} />
                <input name="labelEn" defaultValue={s.labelEn} placeholder="Etiqueta en inglés" style={INPUT} />
                <div style={{ display: "flex", gap: 8 }}>
                  <input name="date" type="date" defaultValue={s.date.toISOString().slice(0, 10)} style={{ ...INPUT, flex: 1 }} />
                  <input name="time" defaultValue={s.time} placeholder="Hora" style={{ ...INPUT, flex: 1 }} />
                </div>
                <input name="capacity" type="number" min={1} defaultValue={s.capacity} placeholder="Cupo" style={{ ...INPUT, width: 100 }} />
                <button type="submit" style={SAVE_BTN}>
                  Guardar
                </button>
              </form>
            </AccordionRow>
          ))}
        </AccordionSection>

        {/* "Superpoderes" de la Oficina Virtual (2026-09-18) — sin nada acá,
            se usan los de siempre (DEFAULT_OFFICE_SKILLS en
            lib/officeSkills.ts, hoy 8 -- crece cada vez que se suma un
            Superpoder nuevo, por eso el badge de abajo lee su .length en
            vez de un número a mano). El ícono de cada power sube aparte, una
            vez que ya está guardado (no entra en el JSON del array). */}
        <AccordionSection
          title="WowApps internas de la Oficina"
          subtitle={`Nombre, descripción y color de cada herramienta de trabajo que ve el dueño en su Oficina Virtual (equipo de Legacy -- para el catálogo público de MiPyMEs, ver /admin/wowstore). Sin nada acá, se muestran las ${DEFAULT_OFFICE_SKILLS.length} de siempre.`}
          meta={<span style={PILL}>{officeSkills.length || `${DEFAULT_OFFICE_SKILLS.length} fijos`}</span>}
          defaultOpen={!!officeSkillsSaved || !!officeSkillsError || focus === "officeSkills"}
        >
          {officeSkillsSaved && <p style={{ margin: 0, font: "600 11px 'Plus Jakarta Sans',sans-serif", color: "#8fd19e" }}>✓ Guardado.</p>}
          {officeSkillsError === "empty" && <p style={{ margin: 0, font: "600 11px 'Plus Jakarta Sans',sans-serif", color: "#e5928a" }}>Elegí un archivo de imagen primero.</p>}
          <OfficeSkillsEditor initialSkills={officeSkills} action={updateOfficeSkillsAction.bind(null, program.id)} />
          {officeSkills.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingTop: 4 }}>
              <span style={{ font: "600 10px 'Plus Jakarta Sans',sans-serif", color: "#5A5A5A", letterSpacing: ".08em", textTransform: "uppercase" }}>
                Íconos (solo para los superpoderes ya guardados arriba)
              </span>
              {officeSkills.map((skill) => (
                <form
                  key={skill.key}
                  action={setOfficeSkillIconAction.bind(null, program.id, skill.key)}
                  style={{ display: "flex", gap: 6, alignItems: "center" }}
                >
                  <span style={{ width: 26, height: 26, borderRadius: 8, flexShrink: 0, background: skill.color || "#353534", overflow: "hidden" }}>
                    {skill.iconUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={skill.iconUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    )}
                  </span>
                  <span style={{ flex: "none", font: "600 10px 'Plus Jakarta Sans',sans-serif", color: "#C2BEB5", minWidth: 90 }}>{skill.nombre}</span>
                  <input type="file" name="icon" accept="image/*" style={{ flex: 1, minWidth: 0, font: "400 10px 'Plus Jakarta Sans',sans-serif", color: "#C2BEB5" }} />
                  <button
                    type="submit"
                    style={{ padding: "7px 10px", borderRadius: 8, border: "1px solid rgba(200,161,90,.3)", background: "none", color: "#C8A15A", font: "700 9px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".06em", textTransform: "uppercase", cursor: "pointer", flexShrink: 0 }}
                  >
                    Subir
                  </button>
                </form>
              ))}
            </div>
          )}
        </AccordionSection>

        {/* Pool de frases para "Objetivo del Día" (Fase E2) — el N0 las escribe
            a mano, lib/oficinaExtras.ts#pickPhraseOfTheDay rota una
            distinta por día en la Oficina de cada Card. Sin nada acá, se
            usan las 3 de ejemplo de DEFAULT_MOTIVATIONAL_PHRASES. */}
        <AccordionSection
          title="Frases motivacionales (Objetivo del Día)"
          subtitle="Una distinta rota sola cada día en la Oficina Virtual de tus Cards. Sin nada acá, se muestran 3 de ejemplo."
          meta={<span style={PILL}>{motivationalPhrases.length || "3 de ejemplo"}</span>}
          defaultOpen={!!motivationalPhrasesSaved || focus === "motivationalPhrases"}
        >
          {motivationalPhrasesSaved && <p style={{ margin: 0, font: "600 11px 'Plus Jakarta Sans',sans-serif", color: "#8fd19e" }}>✓ Guardado.</p>}
          <PhraseListEditor initialPhrases={motivationalPhrases} action={updateMotivationalPhrasesAction.bind(null, program.id)} />
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
                {a.email ?? (
                  // Sin email == promovido automático (Admin.memberId,
                  // 2026-09-24) -- nunca tuvo login propio, opera con su
                  // sesión de Member de siempre.
                  <>
                    {a.member?.name || a.member?.whatsapp || "N0 promovido"}{" "}
                    <span style={{ color: "#5A5A5A" }}>(vía su cuenta, sin password propio)</span>
                  </>
                )}
              </div>
            ))}
            <AccordionAddRow label="Agregar N0 delegado" defaultOpen={Boolean(adminError)}>
              <form action={createProgramAdminAction} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <input type="hidden" name="programId" value={program.id} />
                <input name="email" type="email" placeholder="Email del N0" required style={{ flex: "1 1 160px", background: "#0D0D0D", border: "1px solid rgba(200,161,90,.3)", borderRadius: 10, padding: "9px 12px", color: "#F5F2EB", font: "400 12.5px 'Plus Jakarta Sans',sans-serif", outline: "none" }} />
                <input name="password" type="password" placeholder="Contraseña (8+ caracteres)" required style={{ flex: "1 1 160px", background: "#0D0D0D", border: "1px solid rgba(200,161,90,.3)", borderRadius: 10, padding: "9px 12px", color: "#F5F2EB", font: "400 12.5px 'Plus Jakarta Sans',sans-serif", outline: "none" }} />
                <button type="submit" style={SAVE_BTN}>
                  Crear N0
                </button>
              </form>
            </AccordionAddRow>
          </AccordionSection>
        )}

        {/* Embudo de Conversión */}
        <AccordionSection title="Embudo de Conversión" meta={<span style={PILL}>{funnelStages[0].count}</span>} defaultOpen={Boolean(memberPaidToggled)}>
          {memberPaidToggled && <p style={{ margin: 0, font: "600 11px 'Plus Jakarta Sans',sans-serif", color: "#8fd19e" }}>✓ Membership actualizada.</p>}
          <p style={{ margin: 0, font: "400 11.5px 'Plus Jakarta Sans',sans-serif", color: "#5A5A5A" }}>
            Cuánta gente recibió el QR de una tarjeta de este Programa, y cuántos llegaron hasta pagar su membresía.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {funnelStages.map((stage) => {
              const widthPct = Math.round((stage.count / funnelMax) * 100);
              return (
                <div key={stage.key} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
                    <span style={{ font: "600 11.5px 'Plus Jakarta Sans',sans-serif", color: "#C2BEB5" }}>{stage.label}</span>
                    <span style={{ font: "700 13px 'Plus Jakarta Sans',sans-serif", color: "#F5F2EB" }}>
                      {stage.count}
                      {stage.conversionFromPrevious !== null && (
                        <span style={{ font: "600 10px 'Plus Jakarta Sans',sans-serif", color: "#8a8378", marginLeft: 6 }}>
                          ({Math.round(stage.conversionFromPrevious * 100)}%)
                        </span>
                      )}
                    </span>
                  </div>
                  <div style={{ background: "rgba(255,255,255,.06)", borderRadius: 6, height: 8, overflow: "hidden" }}>
                    <div style={{ width: `${widthPct}%`, height: "100%", borderRadius: 6, background: "linear-gradient(90deg,#E5C378,#C8A15A 50%,#99732B)" }} />
                  </div>
                </div>
              );
            })}
          </div>
        </AccordionSection>

        {/* Members */}
        <AccordionSection
          title="Miembros"
          meta={<span style={PILL}>{program.memberships.length}</span>}
          defaultOpen={Boolean(memberSaved || memberDeleted || memberMessaged || memberError || memberAdded)}
        >
          {memberSaved && <p style={{ margin: 0, font: "600 11px 'Plus Jakarta Sans',sans-serif", color: "#8fd19e" }}>✓ Miembro actualizado.</p>}
          {memberDeleted && <p style={{ margin: 0, font: "600 11px 'Plus Jakarta Sans',sans-serif", color: "#8fd19e" }}>✓ Miembro eliminado.</p>}
          {memberMessaged && <p style={{ margin: 0, font: "600 11px 'Plus Jakarta Sans',sans-serif", color: "#8fd19e" }}>✓ Mensaje enviado.</p>}
          {memberAdded && <p style={{ margin: 0, font: "600 11px 'Plus Jakarta Sans',sans-serif", color: "#8fd19e" }}>✓ Miembro agregado -- ya tiene sus 3 tarjetas.</p>}
          {memberError && (
            <p style={{ margin: 0, font: "600 11px 'Plus Jakarta Sans',sans-serif", color: "#e5928a" }}>
              {MEMBER_ERROR_COPY[memberError] || "Algo falló."}
            </p>
          )}

          {/* Alta directa (2026-10-07) -- hasta ahora un Member solo
              nacía por el funnel self-service público, que además
              siempre aterriza en Legacy. Esto deja al N0 sumar gente
              real a SU Programa sin pasar por ahí -- si el WhatsApp ya
              existe como Member de otro Programa, lo suma en vez de
              duplicarlo. */}
          <AccordionAddRow label="Agregar Miembro" defaultOpen={program.memberships.length === 0}>
            <form action={addMemberToProgramAction.bind(null, program.id)} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <input name="name" placeholder="Nombre" required style={INPUT} />
              <input name="whatsapp" placeholder="WhatsApp (opcional -- si ya existe, lo suma en vez de duplicar)" style={INPUT} />
              <input name="email" type="email" placeholder="Email (opcional)" style={INPUT} />
              <button type="submit" style={SAVE_BTN}>
                Agregar Miembro
              </button>
            </form>
          </AccordionAddRow>

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

                {/* "Entrar como este Miembro" (2026-10-06, pedido de Gunnar:
                    "necesito que todas las pantallas sean accesibles en el
                    Dashboard") -- único acceso real a /m/dashboard y todo lo
                    que cuelga de ahí (WowStore, WowHead, Mensajes, Red de
                    Clientes) para un Admin clásico, que nunca tiene sesión
                    de Member propia. Solo para membresías activas -- las
                    "Invitado" todavía no tienen las 3 Cards creadas, no hay
                    nada que ver. */}
                {m.status === "active" && (
                  <form action={viewAsMemberAction.bind(null, m.member.id, program.id)}>
                    <button
                      type="submit"
                      style={{ background: "none", border: "1px solid rgba(200,161,90,.3)", borderRadius: 999, padding: "6px 12px", color: "#C8A15A", font: "700 10px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".06em", textTransform: "uppercase", cursor: "pointer", width: "fit-content" }}
                    >
                      Entrar como este Miembro →
                    </button>
                  </form>
                )}

                {m.status === "active" && (
                  <form action={markMembershipPaidAction.bind(null, m.member.id, program.id)}>
                    <button
                      type="submit"
                      style={{
                        background: m.membershipPaidAt ? "rgba(123,201,142,.12)" : "none",
                        border: `1px solid ${m.membershipPaidAt ? "rgba(123,201,142,.4)" : "rgba(200,161,90,.3)"}`,
                        borderRadius: 999,
                        padding: "6px 12px",
                        color: m.membershipPaidAt ? "#7BC98E" : "#C2BEB5",
                        font: "700 10px 'Plus Jakarta Sans',sans-serif",
                        letterSpacing: ".06em",
                        textTransform: "uppercase",
                        cursor: "pointer",
                        width: "fit-content",
                      }}
                    >
                      {m.membershipPaidAt ? "✓ Pagada -- marcar como no pagada" : "Marcar como pagada"}
                    </button>
                  </form>
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

        {/* Mensajería Interna (2026-09-24) -- solo N0 llega hasta acá
            (requireProgramAccess ya lo filtra en la action). Sin
            destinatarios tildados, manda a todos los miembros activos
            del Programa -- mismo criterio de "menos clicks para el caso
            común" que el resto del panel. */}
        <AccordionSection
          title="Mensajería"
          subtitle="Mandale un mensaje a todo tu Programa, o a una selección -- por el canal (o combinación de canales) que elijas."
          defaultOpen={Boolean(messageSent || messageError)}
        >
          {messageSent && <p style={{ margin: 0, font: "600 11px 'Plus Jakarta Sans',sans-serif", color: "#8fd19e" }}>✓ Mensaje enviado.</p>}
          {messageError === "empty" && <p style={{ margin: 0, font: "600 11px 'Plus Jakarta Sans',sans-serif", color: "#e5928a" }}>Escribí algo antes de mandar.</p>}
          {messageError === "noChannel" && <p style={{ margin: 0, font: "600 11px 'Plus Jakarta Sans',sans-serif", color: "#e5928a" }}>Elegí al menos un canal.</p>}
          {messageError === "noRecipients" && <p style={{ margin: 0, font: "600 11px 'Plus Jakarta Sans',sans-serif", color: "#e5928a" }}>No hay destinatarios activos con esa selección.</p>}

          <form action={sendMassMessageAction.bind(null, program.id)} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <textarea name="body" placeholder="Tu mensaje..." rows={4} style={{ ...INPUT, resize: "vertical" }} />

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ font: "700 10px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".06em", textTransform: "uppercase", color: "#5A5A5A" }}>Canales</span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                {CHANNELS.map((c) => (
                  <label key={c.key} style={{ display: "flex", alignItems: "center", gap: 6, font: "400 11.5px 'Plus Jakarta Sans',sans-serif", color: c.real ? "#C2BEB5" : "#5A5A5A" }}>
                    <input type="checkbox" name="channels" value={c.key} defaultChecked={c.real} />
                    {c.label} {!c.real && "(simulado -- sin integración real todavía)"}
                  </label>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ font: "700 10px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".06em", textTransform: "uppercase", color: "#5A5A5A" }}>
                Destinatarios (sin tildar ninguno = todos los activos)
              </span>
              <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 160, overflowY: "auto" }}>
                {program.memberships
                  .filter((m) => m.status === "active")
                  .map((m) => (
                    <label key={m.member.id} style={{ display: "flex", alignItems: "center", gap: 6, font: "400 11.5px 'Plus Jakarta Sans',sans-serif", color: "#C2BEB5" }}>
                      <input type="checkbox" name="recipientIds" value={m.member.id} />
                      {m.member.name || m.member.whatsapp || "Miembro"}
                    </label>
                  ))}
              </div>
            </div>

            <button type="submit" style={SAVE_BTN}>
              Enviar mensaje
            </button>
          </form>
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
