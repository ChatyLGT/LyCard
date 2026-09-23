import type { CSSProperties, ReactNode } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { currentAdminScope } from "@/lib/auth";
import { currentMemberId } from "@/lib/memberAuth";
import { computeBadge } from "@/lib/badge";
import MallaGraph from "@/components/MallaGraph";
import {
  PUBLIC_MALLA_NODES, PUBLIC_MALLA_EDGES, PUBLIC_MALLA_GHOSTS, PUBLIC_MALLA_KPIS,
  TEAM_MALLA_NODES, TEAM_MALLA_EDGES, TEAM_MALLA_GHOSTS,
} from "@/lib/mallaData";
import { buildRootMallaGraph, buildMemberFractalGraph, type MallaGraphData } from "@/lib/mallaReal";
import MallaExplorer from "@/components/MallaExplorer";
import { getFathomBrief, type FathomBrief } from "@/lib/fathom";
import { parseOfficeSkills, DEFAULT_OFFICE_SKILLS, type OfficeSkill } from "@/lib/officeSkills";
import OfficeSkillsBlock from "@/components/OfficeSkillsBlock";
import type { VoiceNoteSummary } from "@/components/VoiceNotesBlock";
import CardLeadsBlock, { type CardLeadSummary } from "@/components/CardLeadsBlock";
import TagsBlock from "@/components/TagsBlock";
import { listTagsAction } from "@/app/c/[slug]/oficina/tags-actions";
import type { TagSummary } from "@/lib/tags";
import {
  parseCalendarEvents,
  parseRealityCheckKpis,
  parseMotivationalPhrases,
  parseNewsItems,
  pickPhraseOfTheDay,
  DEFAULT_REALITY_CHECK_KPIS,
  DEFAULT_MOTIVATIONAL_PHRASES,
  DEFAULT_NEWS_ITEMS,
  type RealityCheckKpi,
  type NewsItem,
} from "@/lib/oficinaExtras";
import KeepInFlowBlock from "@/components/KeepInFlowBlock";
import CheckDeRealidadBlock from "@/components/CheckDeRealidadBlock";
import NewsTasksBlock from "@/components/NewsTasksBlock";
import { fetchLiveAgenda, defaultAgendaWindow, type AgendaEventItem, type AgendaTaskItem } from "@/lib/agenda";
import { refreshGoogleAccessToken } from "@/lib/googleOAuth";
import { buildCardMetadata } from "@/lib/cardMetadata";
import type { Card, OriginMemento, Program, Puesto } from "@/generated/prisma/client";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return buildCardMetadata(slug);
}

// La Oficina Virtual completa (PLAN.md Fase 12) — pantalla propia, no un
// modal: se llega acá desde el emblema circular de cualquier Card
// (project/company/personal), se vuelve con el link de arriba.
//
// Dos vistas totalmente separadas — un visitante nunca ve un aviso de
// "acá hay más si sos el dueño": VisitorOficina y OwnerOficina son dos
// árboles de JSX distintos, no un layout con una sección oculta.
//
// Piezas reales: officeItems (Portafolio), badge (Malla), "Tus primeras
// conexiones" (referrer + Programa, de OriginMemento — solo project),
// los links de "Accesos directos" que sí existen, y el botón de Simulador
// (manda al OnboardingChat real en /m/onboarding). Piezas cáscara,
// marcadas como tal: Gemelo Digital operativo del dueño (no existe
// backend todavía), Cartera NashMesh, Agenda, Tu equipo — ninguna inventa
// una cifra de plata real a nombre del dueño (Fase 11-C, cáscara
// honesta).

const kickerStyle: CSSProperties = {
  font: "600 8.5px 'Plus Jakarta Sans',sans-serif",
  letterSpacing: ".16em",
  textTransform: "uppercase",
  color: "#756c5e",
};
const panelStyle: CSSProperties = {
  padding: 14,
  borderRadius: 12,
  background: "rgba(255,255,255,.03)",
  border: "1px solid rgba(200,161,90,.18)",
};
const hr: CSSProperties = { height: 1, background: "rgba(200,161,90,.14)" };
const tileStyle: CSSProperties = { display: "flex", flexDirection: "column", alignItems: "center", gap: 6, textAlign: "center" };
const tileIcon: CSSProperties = { width: 34, height: 34, borderRadius: 10, background: "rgba(200,161,90,.08)", border: "1px solid rgba(200,161,90,.2)" };
const headerLinkStyle: CSSProperties = { color: "#C8A15A", font: "600 10px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".1em", textTransform: "uppercase" };
const navIconStyle: CSSProperties = {
  width: 32, height: 32, borderRadius: 999, display: "flex", alignItems: "center", justifyContent: "center",
  color: "#C8A15A", background: "rgba(200,161,90,.08)", border: "1px solid rgba(200,161,90,.2)",
};

type OfficeItem = { id: string; title: string; subtitle?: string; description?: string; imageUrl?: string };

function parseOfficeItems(value: unknown): OfficeItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((v): v is Record<string, unknown> => typeof v === "object" && v !== null)
    .map((v) => ({
      id: typeof v.id === "string" ? v.id : "",
      title: typeof v.title === "string" ? v.title : "",
      subtitle: typeof v.subtitle === "string" ? v.subtitle : undefined,
      description: typeof v.description === "string" ? v.description : undefined,
      imageUrl: typeof v.imageUrl === "string" ? v.imageUrl : undefined,
    }))
    .filter((item) => item.title.trim().length > 0);
}

type OriginSnapshot = {
  recruitedAt?: string;
  programName?: string;
  referrerName?: string;
  referrerCardTitle?: string | null;
  referrerPortraitUrl?: string | null;
};

type OficinaData = {
  card: Card;
  program: Program | null;
  puesto: Puesto | null;
  badge: string;
  accent: string;
  officeItems: OfficeItem[];
  origin: OriginSnapshot | undefined;
  dashboardHref: string;
  agentLogoUrl: string | null;
  fathomBrief: FathomBrief;
  officeSkills: OfficeSkill[];
  officeSkillsKicker: string;
  voiceNotes: VoiceNoteSummary[];
  agendaEvents: AgendaEventItem[];
  agendaTasks: AgendaTaskItem[];
  googleConnected: boolean;
  connectUrl: string;
  leads: CardLeadSummary[];
  // Janus (2026-09-23) — a diferencia de leads/KPIs, público a propósito:
  // el punto de "todos contra todos" es que se pueda descubrir. Se
  // calcula siempre, visitante u dueño, nunca gateado por isHost.
  tags: TagSummary[];
  oficinaObjetivo: string;
  realityCheckKpis: RealityCheckKpi[];
  kpisAreDefault: boolean;
  motivationalPhrase: string | null;
  phraseIsDefault: boolean;
  newsItems: NewsItem[];
  newsAreDefault: boolean;
  // Malla real (2026-09-22) — null cuando no hay data real todavía
  // (Programas sin memberships), en cuyo caso los bloques caen al
  // dataset de ejemplo de siempre en vez de mostrar un grafo vacío.
  mallaRoot: { root: MallaGraphData; subGraphs: Record<string, MallaGraphData> } | null;
  teamMalla: MallaGraphData | null;
};

// ---------------- Piezas compartidas ----------------

function Header({ slug, right }: { slug: string; right: ReactNode }) {
  return (
    <div
      style={{
        position: "sticky", top: 0, zIndex: 10,
        background: "rgba(11,11,10,.92)", backdropFilter: "blur(8px)",
        borderBottom: "1px solid rgba(200,161,90,.18)",
        padding: "calc(env(safe-area-inset-top,0px) + 14px) 20px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
      }}
    >
      <Link href={`/c/${slug}`} style={headerLinkStyle}>← Volver a la tarjeta</Link>
      {right}
    </div>
  );
}

// El botón circular del agente — mismo lenguaje visual que el emblema de
// "Virtual Office" en la tarjeta (LyCardView.tsx): logo propio si hay
// (Programa para project, Card para company; personal cae a la inicial),
// nunca el mismo para dos Cards distintas — cada Oficina es de su dueño.
function AgentButton({ data, href, label, sublabel, disabled }: { data: OficinaData; href?: string; label: string; sublabel: string; disabled?: boolean }) {
  const { card, accent, agentLogoUrl } = data;
  const circle = (
    <div
      style={{
        width: 76, height: 76, borderRadius: 999, padding: 2, flex: "none",
        background: disabled
          ? "rgba(255,255,255,.08)"
          : `linear-gradient(180deg, rgba(229,195,120,.7), ${accent}80, #141414)`,
        boxShadow: disabled ? "none" : "0 10px 26px rgba(0,0,0,.7)",
      }}
    >
      <div
        style={{
          width: "100%", height: "100%", borderRadius: 999, overflow: "hidden",
          background: `linear-gradient(160deg,#1C1C1C,#141414 55%,#0D0D0D)`,
          border: "1px solid rgba(255,255,255,.1)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >
        {agentLogoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={agentLogoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", opacity: disabled ? 0.5 : 1 }} />
        ) : (
          <span style={{ font: "700 24px 'Playfair Display',serif", color: disabled ? "#5A5A5A" : accent }}>{card.name.charAt(0)}</span>
        )}
      </div>
    </div>
  );
  const text = (
    <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
      <span style={{ font: "700 13px 'Plus Jakarta Sans',sans-serif", color: disabled ? "#8f8578" : "#F3F0E9" }}>{label}</span>
      <span style={{ font: "400 10.5px 'Plus Jakarta Sans',sans-serif", color: "#756c5e" }}>{sublabel}</span>
    </div>
  );
  const inner = (
    <div style={{ display: "flex", alignItems: "center", gap: 14, padding: 14, borderRadius: 16, background: "rgba(255,255,255,.03)", border: `1px solid ${disabled ? "rgba(255,255,255,.08)" : "rgba(200,161,90,.3)"}` }}>
      {circle}
      {text}
      {!disabled && <span style={{ marginLeft: "auto", color: accent, font: "700 16px sans-serif" }}>→</span>}
    </div>
  );
  return disabled || !href ? inner : <Link href={href} style={{ display: "block" }}>{inner}</Link>;
}

function IdentityBlock({ data }: { data: OficinaData }) {
  const { card, program, puesto, accent } = data;
  const roleLabel = puesto?.denominacion || card.title;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <span style={{ ...kickerStyle, color: accent }}>Oficina Virtual · {program?.name || "Legacy"}</span>
      <h1 style={{ margin: 0, font: "700 24px 'Playfair Display',serif" }}>{card.name}</h1>
      <span style={{ font: "400 12px 'Plus Jakarta Sans',sans-serif", color: "#A79E8E" }}>{roleLabel}</span>
    </div>
  );
}

// Solo la usa VisitorOficina (embudo público de reclutamiento) — se sacó
// de la Oficina del dueño (2026-09-23, pedido de Gunnar): ahí "Malla" en
// realidad mostraba el badge O.D. (nada que ver con el grafo real) y
// "Portafolio" duplicaba PortfolioBlock, que ya se muestra debajo.
function KpiRow({ data }: { data: OficinaData }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 6 }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, textAlign: "center" }}>
        <span style={{ font: "700 17px 'Playfair Display',serif" }}>{data.officeItems.length}</span>
        <span style={{ ...kickerStyle, fontSize: 7 }}>Portafolio</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, textAlign: "center" }}>
        <span style={{ font: "700 17px 'Playfair Display',serif", color: data.accent }}>{data.badge}</span>
        <span style={{ ...kickerStyle, fontSize: 7 }}>Malla</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, textAlign: "center", opacity: 0.5 }}>
        <span style={{ font: "600 13px 'Plus Jakarta Sans',sans-serif", color: "#8f8578" }}>Próx.</span>
        <span style={{ ...kickerStyle, fontSize: 7 }}>Cartera</span>
      </div>
    </div>
  );
}

// Origin story (project) / Portafolio (company, personal).
function PortfolioBlock({ data }: { data: OficinaData }) {
  const { card, origin, officeItems, accent } = data;
  if (card.kind === "project") {
    if (!origin) return null;
    return (
      <div style={{ ...panelStyle, display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 48, height: 48, flex: "none", borderRadius: 999, overflow: "hidden", background: "#0D0D0D" }}>
          {origin.referrerPortraitUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={origin.referrerPortraitUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          )}
        </div>
        <div style={{ minWidth: 0 }}>
          <span style={{ display: "block", ...kickerStyle, color: accent }}>Referido por</span>
          <span style={{ display: "block", font: "700 14px 'Playfair Display',serif" }}>{origin.referrerName}</span>
          {origin.referrerCardTitle && <span style={{ display: "block", font: "400 11px 'Plus Jakarta Sans',sans-serif", color: "#C2BEB5" }}>{origin.referrerCardTitle}</span>}
        </div>
      </div>
    );
  }
  if (officeItems.length === 0) {
    return (
      <p style={{ margin: 0, font: "400 12px/1.6 'Plus Jakarta Sans',sans-serif", color: "#8f8578", textAlign: "center" }}>
        {card.name} todavía no cargó su Portafolio.
      </p>
    );
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {officeItems.map((item) => (
        <div key={item.id || item.title} style={{ ...panelStyle, display: "flex", gap: 12 }}>
          {item.imageUrl && (
            <div style={{ width: 48, height: 48, flex: "none", borderRadius: 8, overflow: "hidden", background: "#0D0D0D" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.imageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
          )}
          <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ font: "700 12.5px 'Plus Jakarta Sans',sans-serif" }}>{item.title}</span>
            {item.subtitle && <span style={{ font: "600 9.5px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".06em", textTransform: "uppercase", color: accent }}>{item.subtitle}</span>}
            {item.description && <span style={{ font: "400 11px/1.4 'Plus Jakarta Sans',sans-serif", color: "#C2BEB5" }}>{item.description}</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

// "Tus primeras conexiones" — quién te invitó y a qué Programa pertenecés,
// como mini-Malla de 3 nodos con datos reales (OriginMemento). Solo tiene
// sentido para project (es la única Card con referrer + Programa
// modelados). La cadena completa que describió Gunnar (Programa → Legacy,
// Programa → su propio N0/CEO) todavía no está modelada en Prisma — se
// dice así en vez de inventar nodos, ver PLAN.md.
function FirstConnections({ data }: { data: OficinaData }) {
  const { card, origin, accent } = data;
  if (card.kind !== "project" || !origin) return null;
  const nodes = [
    { id: "self", color: "#6FCF7A", size: 6 },
    { id: "referrer", color: "#F3F0E9", size: 5 },
    { id: "program", color: accent, size: 5.5 },
  ];
  const edges: [string, string][] = [["self", "referrer"], ["self", "program"]];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <span style={kickerStyle}>Tus primeras conexiones</span>
      <div style={{ borderRadius: 12, overflow: "hidden", border: "1px solid rgba(200,161,90,.18)", background: "#0B0B0A" }}>
        <MallaGraph nodes={nodes} edges={edges} height={140} camRadius={70} maxRadius={160} repel={130} linkRest={26} fog={0.02} haloScale={8} />
      </div>
      <div style={{ display: "flex", justifyContent: "center", gap: 14, flexWrap: "wrap" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 5, font: "400 9px 'Plus Jakarta Sans',sans-serif", color: "#A79E8E" }}>
          <span style={{ width: 7, height: 7, borderRadius: 999, background: "#6FCF7A" }} /> Vos
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 5, font: "400 9px 'Plus Jakarta Sans',sans-serif", color: "#A79E8E" }}>
          <span style={{ width: 7, height: 7, borderRadius: 999, background: "#F3F0E9" }} /> {origin.referrerName}
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 5, font: "400 9px 'Plus Jakarta Sans',sans-serif", color: "#A79E8E" }}>
          <span style={{ width: 7, height: 7, borderRadius: 999, background: accent }} /> {origin.programName || "Programa"}
        </span>
      </div>
      <p style={{ margin: 0, font: "400 9.5px/1.5 'Plus Jakarta Sans',sans-serif", color: "#5A5A5A", textAlign: "center" }}>
        El resto de la cadena (tu Programa hacia arriba) todavía no está modelado — próximamente.
      </p>
    </div>
  );
}

// Real cuando el Programa de esta Card tiene ProgramMembership de verdad
// (teamMalla !== null) — cada punto es un miembro real, tocalo y ves
// quién es. Sin eso todavía, cae al dataset de ejemplo de siempre,
// marcado como tal (cáscara honesta, mismo criterio del resto de la
// Oficina).
function TeamMallaBlock({ accent, teamMalla, memberCount }: { accent: string; teamMalla: MallaGraphData | null; memberCount: number }) {
  if (teamMalla) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
          <span style={kickerStyle}>Malla viva · tu equipo real</span>
          <span style={{ font: "600 9px 'Plus Jakarta Sans',sans-serif", color: "#6FCF7A" }}>
            {memberCount} miembro{memberCount === 1 ? "" : "s"}
          </span>
        </div>
        <MallaExplorer root={teamMalla} subGraphs={{}} height={220} camRadius={130} maxRadius={320} haloScale={8} accent={accent} />
        <p style={{ margin: 0, font: "400 9.5px 'Plus Jakarta Sans',sans-serif", color: "#5A5A5A", textAlign: "center" }}>
          Tocá un punto para ver quién es.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
        <span style={kickerStyle}>Malla viva · tu equipo + tus agentes</span>
        <span style={{ font: "600 9px 'Plus Jakarta Sans',sans-serif", color: "#6FCF7A" }}>4 de 6 activos</span>
      </div>
      <div style={{ borderRadius: 14, overflow: "hidden", border: "1px solid rgba(200,161,90,.18)", background: "#0B0B0A" }}>
        <MallaGraph nodes={TEAM_MALLA_NODES} edges={TEAM_MALLA_EDGES} ghosts={TEAM_MALLA_GHOSTS} height={220} camRadius={130} maxRadius={320} repel={140} linkRest={40} fog={0.012} />
      </div>
      <div style={{ display: "flex", justifyContent: "center", gap: 14, flexWrap: "wrap" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 5, font: "400 8.5px 'Plus Jakarta Sans',sans-serif", color: "#A79E8E" }}>
          <span style={{ width: 8, height: 8, borderRadius: 999, background: "#F3F0E9" }} /> Humano
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 5, font: "400 8.5px 'Plus Jakarta Sans',sans-serif", color: "#A79E8E" }}>
          <span style={{ width: 8, height: 8, borderRadius: 999, background: accent }} /> Agente IA
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 5, font: "400 8.5px 'Plus Jakarta Sans',sans-serif", color: "#A79E8E" }}>
          <span style={{ width: 7, height: 7, borderRadius: 999, background: "#6FCF7A" }} /> Activo
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 5, font: "400 8.5px 'Plus Jakarta Sans',sans-serif", color: "#A79E8E" }}>
          <span style={{ width: 7, height: 7, borderRadius: 999, background: "#E0954B" }} /> Necesita revisión
        </span>
      </div>
      <p style={{ margin: 0, font: "400 10px 'Plus Jakarta Sans',sans-serif", color: "#5A5A5A", textAlign: "center" }}>
        Vista general de demo — todavía sin conectar a tu equipo real.
      </p>
    </div>
  );
}

// La Malla pública real: Legacy → su triada N1 fija → cada Programa real
// (N3), y tocando uno se "entra" a su propio fractal de miembros —
// ver components/MallaExplorer.tsx. Los 3 números de abajo son reales
// (edges/Programas/miembros activos), no la vitrina fija de
// PUBLIC_MALLA_KPIS.
function PublicMallaReal({ mallaRoot, accent }: { mallaRoot: NonNullable<OficinaData["mallaRoot"]>; accent: string }) {
  const { root, subGraphs } = mallaRoot;
  const subGraphList = Object.values(subGraphs);
  const totalEdges = root.edges.length + subGraphList.reduce((sum, g) => sum + g.edges.length, 0);
  const activeMembers = subGraphList.reduce(
    (sum, g) => sum + Object.entries(g.info).filter(([id, info]) => id.startsWith("member-") && info.subtitle === "Activo").length,
    0
  );
  const programCount = subGraphList.length;

  return (
    <>
      <MallaExplorer root={root} subGraphs={subGraphs} height={210} camRadius={165} haloScale={9} accent={accent} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 6 }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, textAlign: "center" }}>
          <span style={{ font: "700 14px 'Playfair Display',serif", color: accent }}>{totalEdges}</span>
          <span style={{ ...kickerStyle, fontSize: 6.5 }}>Enlaces reales</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, textAlign: "center" }}>
          <span style={{ font: "700 14px 'Playfair Display',serif" }}>{programCount}</span>
          <span style={{ ...kickerStyle, fontSize: 6.5 }}>Programas con red</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, textAlign: "center" }}>
          <span style={{ font: "700 14px 'Playfair Display',serif" }}>{activeMembers}</span>
          <span style={{ ...kickerStyle, fontSize: 6.5 }}>Miembros activos</span>
        </div>
      </div>
    </>
  );
}

// ==================== Vista pública — lo único que ve un visitante ====================
function VisitorOficina({ data }: { data: OficinaData }) {
  const { card, program, accent } = data;
  const videoUrl = card.videoThumbnailUrl || program?.videoThumbnailUrl || null;

  return (
    <div style={{ minHeight: "100vh", background: "#0B0B0A", color: "#F3F0E9", fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
      <Header slug={card.slug} right={<span style={kickerStyle}>Vista pública</span>} />

      <div style={{ maxWidth: 460, margin: "0 auto", padding: "24px 20px 40px", display: "flex", flexDirection: "column", gap: 18 }}>
        <IdentityBlock data={data} />

        {videoUrl ? (
          <a href={videoUrl} target="_blank" rel="noreferrer" style={{ position: "relative", display: "block", width: "100%", height: 150, borderRadius: 12, overflow: "hidden", border: "1px solid rgba(200,161,90,.18)" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={videoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(0deg,rgba(0,0,0,.55),transparent 50%)" }} />
            <div style={{ position: "absolute", left: 12, bottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 26, height: 26, borderRadius: 999, border: "1px solid rgba(255,255,255,.6)", display: "flex", alignItems: "center", justifyContent: "center" }}>▶</div>
              <span style={{ font: "400 10px 'Plus Jakarta Sans',sans-serif", color: "#F3F0E9" }}>De qué se trata {program?.name || card.name}</span>
            </div>
          </a>
        ) : (
          <div style={{ width: "100%", height: 110, borderRadius: 12, background: "linear-gradient(160deg,#1c1710,#121110 65%)", border: "1px solid rgba(200,161,90,.18)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ font: "400 10px 'Plus Jakarta Sans',sans-serif", color: "#756c5e" }}>De qué se trata {program?.name || card.name}</span>
          </div>
        )}

        <AgentButton data={data} href={`/m/onboarding?ref=${card.slug}`} label="Simulá tu Gemelo Digital" sublabel="Contame a qué te dedicás" />

        <p style={{ margin: 0, font: "400 12px/1.55 'Plus Jakarta Sans',sans-serif", color: "#A79E8E" }}>{card.quote}</p>

        <div style={hr} />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {["Presentación", "Audiolibro"].map((label) => (
            <div key={label} style={{ ...panelStyle, opacity: 0.55, display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ font: "600 11px 'Plus Jakarta Sans',sans-serif" }}>{label}</span>
              <span style={{ font: "400 9px 'Plus Jakarta Sans',sans-serif", color: "#756c5e" }}>Próximamente</span>
            </div>
          ))}
        </div>

        <div style={hr} />
        <KpiRow data={data} />
        {(card.kind !== "project" || data.origin) && (
          <>
            <div style={hr} />
            <PortfolioBlock data={data} />
          </>
        )}
        <div style={hr} />

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <span style={kickerStyle}>Esto ya se lo piden todos los días</span>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "10px 6px" }}>
            {["Video a redes", "Presupuesto del mes", "WhatsApp 24/7", "Buscar licitaciones", "Flyer promocional", "Recordar pagos"].map((c) => (
              <div key={c} style={tileStyle}>
                <div style={tileIcon} />
                <span style={{ font: "400 9px 'Plus Jakarta Sans',sans-serif", color: "#C2BEB5", lineHeight: 1.25 }}>{c}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={hr} />

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <span style={kickerStyle}>Cambiá de cancha</span>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", borderRadius: 12, overflow: "hidden", border: "1px solid rgba(200,161,90,.16)" }}>
            <div style={{ padding: 12 }}>
              <span style={{ font: "600 8.5px 'Plus Jakarta Sans',sans-serif", color: "#756c5e", textTransform: "uppercase", letterSpacing: ".1em" }}>Método tradicional</span>
              <div style={{ font: "700 16px 'Plus Jakarta Sans',sans-serif", color: "#8f8578", marginTop: 4, textDecoration: "line-through" }}>$200–500</div>
            </div>
            <div style={{ padding: 12, background: "rgba(200,161,90,.06)" }}>
              <span style={{ font: "600 8.5px 'Plus Jakarta Sans',sans-serif", color: accent, textTransform: "uppercase", letterSpacing: ".1em" }}>Con tu Gemelo</span>
              <div style={{ font: "700 16px 'Playfair Display',serif", marginTop: 4 }}>$15–30</div>
            </div>
          </div>
        </div>

        <div style={hr} />

        <TagsBlock cardId={data.card.id} initialTags={data.tags} accent={accent} editable={false} />
        {data.tags.length > 0 && <div style={hr} />}

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
            <span style={kickerStyle}>La Malla · organismo completo</span>
            <span style={{ font: "400 8px 'Plus Jakarta Sans',sans-serif", color: "#6b6459" }}>arrastrá para rotar</span>
          </div>
          {data.mallaRoot ? (
            <PublicMallaReal mallaRoot={data.mallaRoot} accent={accent} />
          ) : (
            <>
              <div style={{ borderRadius: 12, overflow: "hidden", border: "1px solid rgba(200,161,90,.18)", background: "#0B0B0A" }}>
                <MallaGraph nodes={PUBLIC_MALLA_NODES} edges={PUBLIC_MALLA_EDGES} ghosts={PUBLIC_MALLA_GHOSTS} height={210} camRadius={165} haloScale={9} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 6 }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, textAlign: "center" }}>
                  <span style={{ font: "700 14px 'Playfair Display',serif", color: accent }}>{PUBLIC_MALLA_EDGES.length}</span>
                  <span style={{ ...kickerStyle, fontSize: 6.5 }}>Enlaces creados</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, textAlign: "center" }}>
                  <span style={{ font: "700 14px 'Playfair Display',serif" }}>{PUBLIC_MALLA_KPIS.brechasCerradas}</span>
                  <span style={{ ...kickerStyle, fontSize: 6.5 }}>Brechas cerradas</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, textAlign: "center" }}>
                  <span style={{ font: "700 14px 'Playfair Display',serif" }}>{PUBLIC_MALLA_KPIS.serviciosOfrecidos}</span>
                  <span style={{ ...kickerStyle, fontSize: 6.5 }}>Servicios ofrecidos</span>
                </div>
              </div>
            </>
          )}
        </div>

        <div style={hr} />

        <OfficeSkillsBlock
          skills={data.officeSkills}
          kicker={data.officeSkillsKicker}
          isHost={false}
          fathomBrief={{ enabled: false }}
          companyNetworkHref={null}
          cardId={data.card.id}
          voiceNotes={[]}
          agendaEvents={[]}
          agendaTasks={[]}
          googleConnected={false}
          connectUrl={data.connectUrl}
        />
      </div>
    </div>
  );
}

// ==================== Vista privada — lo único que ve el dueño (isHost) ====================
function OwnerOficina({ data }: { data: OficinaData }) {
  const { card, program, badge, accent, dashboardHref } = data;

  return (
    <div style={{ minHeight: "100vh", background: "#0B0B0A", color: "#F3F0E9", fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
      {/* Sin Header fijo acá (Fase A) el saludo es lo primero que se
          renderiza — necesita su propio safe-area-inset-top o queda
          tapado por la isla dinámica / notch en iPhone, sin poder
          tocar los íconos de volver/editar (bug reportado 2026-09-19). */}
      <div style={{ maxWidth: 460, margin: "0 auto", padding: "calc(env(safe-area-inset-top,0px) + 24px) 20px 40px", display: "flex", flexDirection: "column", gap: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
          <div style={{ width: 40, height: 40, borderRadius: 999, padding: 2, background: `linear-gradient(160deg,#E5C378,${accent})`, flexShrink: 0 }}>
            <div style={{ width: "100%", height: "100%", borderRadius: 999, overflow: "hidden", background: "#141414", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {card.portraitUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={card.portraitUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <span style={{ font: "700 15px 'Playfair Display',serif", color: accent }}>{card.name.charAt(0)}</span>
              )}
            </div>
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ font: "700 15px 'Plus Jakarta Sans',sans-serif" }}>Hola, {card.name}</div>
            <span style={{ font: "400 10.5px 'Plus Jakarta Sans',sans-serif", color: "#756c5e" }}>{program?.name || "Legacy"} · {badge}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
            <Link href={`/c/${card.slug}`} aria-label="Volver a la tarjeta" style={navIconStyle}>
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_back</span>
            </Link>
            <Link href={dashboardHref} aria-label="Editar Oficina" style={navIconStyle}>
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>edit</span>
            </Link>
          </div>
        </div>

        {/* Orden pedido por Gunnar (2026-09-23): Keep in Flow → Gemelo
            Digital → Check de Realidad → Seguimiento → Superpoderes →
            Noticias → BrainNet (Cerebro Malla) al final. Se sacaron dos
            bloques de acá: KpiRow (Portafolio/Malla/Cartera) era cáscara
            vestigial de antes de que existiera Check de Realidad — el
            "Portafolio" duplicaba PortfolioBlock de abajo, "Malla" en
            realidad mostraba el badge O.D. (nada que ver con el grafo real)
            y "Cartera" era un placeholder deshabilitado; y el Calendario
            suelto de Fase E4, que mostraba el mismo Card.calendarEvents que
            ya se ve adentro del Superpoder Agenda, dos veces la misma info
            en formato distinto. */}
        <KeepInFlowBlock
          objetivo={data.oficinaObjetivo}
          phrase={data.motivationalPhrase}
          isDefaultPhrase={data.phraseIsDefault}
          accent={accent}
        />

        <div style={hr} />

        <AgentButton data={data} href={`/c/${card.slug}/oficina/demo`} label="Tu Gemelo Digital" sublabel="Demo del flujo — todavía no hay backend real" />

        {/* Para la Card raíz (sin referente, ex-"Fundador de la Red") no hay
            nada real que mostrar acá — se salta el bloque entero en vez de
            dejar dos separadores pegados sin contenido en el medio. */}
        {(card.kind !== "project" || data.origin) && (
          <>
            <div style={hr} />
            <FirstConnections data={data} />
            <div style={hr} />
            <PortfolioBlock data={data} />
          </>
        )}

        <div style={hr} />

        <CheckDeRealidadBlock kpis={data.realityCheckKpis} isDefault={data.kpisAreDefault} accent={accent} />

        <div style={hr} />

        <CardLeadsBlock cardId={data.card.id} initialLeads={data.leads} />

        <div style={hr} />

        <TagsBlock cardId={data.card.id} initialTags={data.tags} accent={accent} editable />

        <div style={hr} />

        <OfficeSkillsBlock
          skills={data.officeSkills}
          kicker={data.officeSkillsKicker}
          isHost
          fathomBrief={data.fathomBrief}
          companyNetworkHref={card.kind === "company" ? "/m/dashboard/company/network" : null}
          cardId={data.card.id}
          voiceNotes={data.voiceNotes}
          agendaEvents={data.agendaEvents}
          agendaTasks={data.agendaTasks}
          googleConnected={data.googleConnected}
          connectUrl={data.connectUrl}
        />

        <div style={hr} />

        <NewsTasksBlock items={data.newsItems} isDefault={data.newsAreDefault} />

        <div style={hr} />

        {/* Legacy (isOrigin) no es "un equipo más" — es el N0 de todos los
            Programas, así que su Cerebro Malla es el organismo completo
            (mismo componente que ve un visitante), no la Malla de un solo
            Programa. El resto de las Cards project sigue viendo su propio
            equipo real vía TeamMallaBlock. */}
        {card.isOrigin && data.mallaRoot ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
              <span style={kickerStyle}>Malla viva · el organismo completo</span>
            </div>
            <PublicMallaReal mallaRoot={data.mallaRoot} accent={accent} />
            <p style={{ margin: 0, font: "400 9.5px 'Plus Jakarta Sans',sans-serif", color: "#5A5A5A", textAlign: "center" }}>
              Tocá un Programa para entrar a su propia red.
            </p>
          </div>
        ) : (
          <TeamMallaBlock accent={accent} teamMalla={data.teamMalla} memberCount={data.teamMalla ? Object.keys(data.teamMalla.info).length - 1 : 0} />
        )}
      </div>
    </div>
  );
}

export default async function OficinaPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const card = await prisma.card.findUnique({
    where: { slug },
    include: { program: true, puesto: true },
  });
  if (!card) notFound();

  const [adminScope, memberId, originMemento] = await Promise.all([
    currentAdminScope(),
    currentMemberId(),
    card.kind === "project" && card.memberId ? prisma.originMemento.findUnique({ where: { memberId: card.memberId } }) : Promise.resolve(null as OriginMemento | null),
  ]);
  const isAdmin = adminScope !== null;
  const isHost = isAdmin || card.isOrigin || (memberId !== null && memberId === card.memberId);
  const badge = await computeBadge(card, adminScope, memberId);

  const baseDashboardHref = card.kind === "project" ? "/m/dashboard/project" : card.kind === "company" ? "/m/dashboard/company" : "/m/dashboard/personal";

  // Solo el dueño ve el Brief de reuniones — nada de pegarle a la API de
  // Fathom en cada visita de un desconocido a la Oficina.
  const fathomBrief: FathomBrief = isHost ? await getFathomBrief() : { enabled: false };

  // Mismo criterio: las Notas de Voz son privadas del dueño, un
  // visitante nunca dispara esta query.
  const voiceNotes: VoiceNoteSummary[] = isHost
    ? (
        await prisma.voiceNote.findMany({
          where: { cardId: card.id },
          orderBy: { createdAt: "desc" },
          take: 20,
        })
      ).map((n) => ({
        id: n.id,
        status: n.status,
        audioUrl: n.audioUrl,
        transcript: n.transcript,
        summary: n.summary,
        createdAt: n.createdAt.toISOString(),
      }))
    : [];

  // Seguimiento (2026-09-23): igual de privado que Notas de Voz — un
  // visitante nunca dispara esta query ni ve a quién le compartió su
  // Card el dueño.
  const leads: CardLeadSummary[] = isHost
    ? (
        await prisma.cardLead.findMany({
          where: { cardId: card.id },
          orderBy: { updatedAt: "desc" },
          take: 100,
        })
      ).map((l) => ({
        id: l.id,
        name: l.name,
        contact: l.contact,
        source: l.source,
        stage: l.stage,
        notes: l.notes,
        createdAt: l.createdAt.toISOString(),
        updatedAt: l.updatedAt.toISOString(),
      }))
    : [];

  // Janus (2026-09-23) — público a propósito, tanto para el dueño (que la
  // edita) como para un visitante (que la ve, sin poder editarla): es la
  // materia prima del emparejamiento "todos contra todos" entre Cards.
  const tags = await listTagsAction(card.id);

  // Fase F (2026-09-19): si el dueño ya conectó Google (Calendar+Tasks+
  // Drive real), la Agenda lo dice y el botón de conectar desaparece.
  const ownerMember = isHost && card.memberId ? await prisma.member.findUnique({ where: { id: card.memberId } }) : null;
  const googleConnected = Boolean(ownerMember?.googleRefreshToken);
  const connectUrl = `/m/auth/google/connect-start?cardId=${card.id}&returnTo=${encodeURIComponent(`/c/${slug}/oficina`)}`;

  // Alimenta el fallback simulado de la Agenda (Superpoder, abajo) cuando
  // no hay Google conectado. El bloque "Calendario" suelto de Fase E4 se
  // sacó de la Oficina (2026-09-23, pedido de Gunnar): mostraba el mismo
  // Card.calendarEvents que ya se ve adentro del Superpoder Agenda, dos
  // veces la misma info en dos formatos.
  const calendarEventsParsed = isHost ? parseCalendarEvents(card.calendarEvents) : [];

  // Agenda real (2026-09-22, ver lib/agenda.ts): conectado, se leen
  // Calendar+Tasks de verdad; sin conectar, cae al cache local
  // simulado de siempre (Card.calendarEvents), marcado como tal — nunca
  // mezclado como si fuera la agenda real del dueño.
  let agendaEvents: AgendaEventItem[] = [];
  let agendaTasks: AgendaTaskItem[] = [];
  if (isHost && ownerMember?.googleRefreshToken) {
    try {
      const accessToken = await refreshGoogleAccessToken(ownerMember.googleRefreshToken);
      const live = await fetchLiveAgenda(accessToken, defaultAgendaWindow());
      agendaEvents = live.events;
      agendaTasks = live.tasks;
    } catch (err) {
      console.error("No se pudo traer la Agenda real de Google para la Card", card.id, err);
    }
  } else if (isHost) {
    agendaEvents = calendarEventsParsed.map((e) => ({
      id: e.id,
      title: e.title,
      start: e.date,
      source: "simulado" as const,
    }));
  }

  // Fase E3 — Keep in Flow / Check de Realidad, solo para el dueño (mismo
  // criterio que Notas de Voz/Seguimiento arriba: nada de esto es público).
  // El objetivo (texto libre) no tiene fallback inventado — vacío es
  // vacío. Los KPIs y la frase del día sí caen a un ejemplo fijo cuando
  // nadie cargó los propios, marcados como tal en el bloque.
  const realityCheckKpisParsed = isHost ? parseRealityCheckKpis(card.realityCheckKpis) : [];
  const realityCheckKpis = realityCheckKpisParsed.length > 0 ? realityCheckKpisParsed : DEFAULT_REALITY_CHECK_KPIS;
  const kpisAreDefault = realityCheckKpisParsed.length === 0;

  const motivationalPhrasesParsed = parseMotivationalPhrases(card.program?.motivationalPhrases);
  const motivationalPhrases = motivationalPhrasesParsed.length > 0 ? motivationalPhrasesParsed : DEFAULT_MOTIVATIONAL_PHRASES;
  const motivationalPhrase = isHost ? pickPhraseOfTheDay(motivationalPhrases) : null;
  const phraseIsDefault = motivationalPhrasesParsed.length === 0;

  // Fase E4 — Noticias + Calendario, mismo criterio host-only que arriba.
  const newsItemsParsed = isHost ? parseNewsItems(card.newsItems) : [];
  const newsItems = newsItemsParsed.length > 0 ? newsItemsParsed : DEFAULT_NEWS_ITEMS;
  const newsAreDefault = newsItemsParsed.length === 0;

  // Malla real (2026-09-22, pedido de Gunnar) — reemplaza los datasets
  // hardcodeados de lib/mallaData.ts por un grafo derivado de
  // ProgramMembership de verdad. El organismo completo (Legacy → triada
  // N1 → cada Programa real como N3) hace falta calcularlo para un
  // visitante (es lo único que VisitorOficina muestra) Y para el dueño de
  // la Card raíz (card.isOrigin) — Legacy no tiene programId propio (es
  // el N0 de todos los Programas, no "uno más"), así que su Cerebro Malla
  // es directamente el organismo completo, no un equipo de un solo
  // Programa (bug reportado 2026-09-23: Gunnar no veía nada real en su
  // propia Malla porque ninguna de las dos ramas lo cubría). El Cerebro
  // Malla del resto de los dueños de project sigue siendo su propio
  // Programa con miembros reales — company/personal siguen sin un equipo
  // real modelado todavía (ver CardNetworkMembership, próximo paso), caen
  // al dataset de ejemplo de siempre.
  let mallaRoot: OficinaData["mallaRoot"] = null;
  if (!isHost || card.isOrigin) {
    const realPrograms = await prisma.program.findMany({
      where: { isDemo: false },
      select: {
        id: true,
        name: true,
        memberships: { select: { id: true, status: true, referredByMembershipId: true, member: { select: { name: true } } } },
      },
    });
    const subGraphs: Record<string, MallaGraphData> = {};
    for (const p of realPrograms) {
      if (p.memberships.length > 0) {
        subGraphs[p.id] = buildMemberFractalGraph(
          `program-${p.id}`,
          p.name,
          p.memberships.map((m) => ({ membershipId: m.id, name: m.member.name, status: m.status, referredByMembershipId: m.referredByMembershipId }))
        );
      }
    }
    mallaRoot = { root: buildRootMallaGraph(realPrograms.map((p) => ({ id: p.id, name: p.name }))), subGraphs };
  }

  let teamMalla: MallaGraphData | null = null;
  if (isHost && card.kind === "project" && card.programId) {
    const teamMemberships = await prisma.programMembership.findMany({
      where: { programId: card.programId },
      select: { id: true, status: true, referredByMembershipId: true, member: { select: { name: true } } },
    });
    if (teamMemberships.length > 0) {
      teamMalla = buildMemberFractalGraph(
        "team-root",
        card.program?.name || "Tu Programa",
        teamMemberships.map((m) => ({ membershipId: m.id, name: m.member.name, status: m.status, referredByMembershipId: m.referredByMembershipId }))
      );
    }
  }

  const parsedSkills = parseOfficeSkills(card.program?.officeSkills);
  const officeSkills = parsedSkills.length > 0 ? parsedSkills : DEFAULT_OFFICE_SKILLS;
  const officeSkillsKickerOverride = card.program?.cardLabels;
  const officeSkillsKicker =
    officeSkillsKickerOverride && typeof officeSkillsKickerOverride === "object" && !Array.isArray(officeSkillsKickerOverride)
      ? (officeSkillsKickerOverride as Record<string, unknown>).officeSkillsKicker
      : undefined;

  const data: OficinaData = {
    card,
    program: card.program,
    puesto: card.puesto,
    badge,
    accent: card.program?.primaryColor || "#C8A15A",
    officeItems: parseOfficeItems(card.officeItems),
    origin: originMemento?.snapshot as OriginSnapshot | undefined,
    // "Editar Oficina" mandaba siempre a /m/dashboard/... — esas rutas
    // exigen currentMemberId() y redirigen a /m/login si no hay uno, así
    // que un Admin (MasterN0/N0) viendo su propia tarjeta (isOrigin, o
    // simulando) quedaba tirado en la pantalla de "poné tu WhatsApp" del
    // alta de Miembro, sin salida (bug reportado 2026-09-19). Un Admin va
    // a un editor real que sí puede usar: el Programa (donde vive el
    // editor de Superpoderes, Fase C) si la tarjeta tiene uno, si no el
    // editor genérico de /admin/[slug]. Company/personal: sigue mandando
    // directo a la sección "Oficina Virtual" del editor de Miembro
    // (defaultOpen + auto-scroll, ver MemberCardEditor.tsx). Project no
    // tiene esa sección propia (su Oficina es la historia de origen, no
    // editable a mano) — el editor de "Mi camino" ya es la página entera.
    dashboardHref: isAdmin
      ? card.program
        ? `/admin/programs/${card.program.id}?focus=officeSkills`
        : `/admin/${card.slug}`
      : card.kind === "project"
        ? baseDashboardHref
        : `${baseDashboardHref}?focus=oficina`,
    agentLogoUrl: card.kind === "project" ? card.program?.logoUrl ?? null : card.kind === "company" ? card.logoUrl : null,
    fathomBrief,
    officeSkills,
    officeSkillsKicker: typeof officeSkillsKicker === "string" && officeSkillsKicker.trim() ? officeSkillsKicker : "Superpoderes",
    voiceNotes,
    agendaEvents,
    agendaTasks,
    googleConnected,
    connectUrl,
    leads,
    tags,
    oficinaObjetivo: card.oficinaObjetivo,
    realityCheckKpis,
    kpisAreDefault,
    motivationalPhrase,
    phraseIsDefault,
    newsItems,
    newsAreDefault,
    mallaRoot,
    teamMalla,
  };

  return isHost ? <OwnerOficina data={data} /> : <VisitorOficina data={data} />;
}
