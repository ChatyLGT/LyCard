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
  TEAM_MALLA_NODES, TEAM_MALLA_EDGES,
} from "@/lib/mallaData";
import type { Card, OriginMemento, Program, Puesto } from "@/generated/prisma/client";

export const dynamic = "force-dynamic";

// La Oficina Virtual completa (PLAN.md Fase 12) — pantalla propia, no un
// modal: se llega acá desde el emblema "Virtual Office" de cualquier Card
// (project/company/personal), se vuelve con el link de arriba.
//
// Dos vistas totalmente separadas, sin separador visual entre ellas — un
// visitante nunca ve un aviso de "acá hay más si sos el dueño" (esto es
// una app real, no una demo con easter eggs): un visitante recibe
// VisitorOficina, el dueño (isHost, mismo criterio que ya usa /c/[slug]
// para todo lo demás) recibe OwnerOficina, y son dos árboles de JSX
// distintos, no una página con una mitad oculta.
//
// Piezas reales: officeItems (Portafolio), badge (Malla), los links de
// "Accesos directos" que sí existen, y el CTA del Simulador (manda al
// OnboardingChat real en /m/onboarding). Piezas cáscara, marcadas como
// tal: Cartera NashMesh, Ingresos, Agenda, Tu equipo — ninguna inventa una
// cifra de plata real a nombre del dueño (ver Fase 11-C: "cáscara
// honesta", nunca una cifra cruda presentada como si fuera real).

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
};

function Header({ slug, right }: { slug: string; right: ReactNode }) {
  return (
    <div
      style={{
        position: "sticky", top: 0, zIndex: 10,
        background: "rgba(11,11,10,.92)", backdropFilter: "blur(8px)",
        borderBottom: "1px solid rgba(200,161,90,.18)",
        padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
      }}
    >
      <Link href={`/c/${slug}`} style={{ color: "#C8A15A", font: "600 10px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".1em", textTransform: "uppercase" }}>
        ← Volver a la tarjeta
      </Link>
      {right}
    </div>
  );
}

// ---------------- Origin/Portafolio: contenido real, compartido por ambas vistas ----------------
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

// Origin story (project) / Portafolio (company, personal) — el contenido
// real que antes vivía en el modal "office".
function PortfolioBlock({ data }: { data: OficinaData }) {
  const { card, origin, officeItems, accent } = data;
  if (card.kind === "project") {
    return origin ? (
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
    ) : (
      <div style={{ ...panelStyle, textAlign: "center", display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ font: "700 15px 'Playfair Display',serif", color: "#E5C378" }}>✦ Fundador de la Red ✦</span>
        <p style={{ margin: 0, font: "400 12px/1.5 'Plus Jakarta Sans',sans-serif", color: "rgba(245,242,235,.92)" }}>
          {card.name} es la raíz de este árbol — no tiene un referente porque fue quien empezó todo.
        </p>
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

function TeamMallaBlock({ accent }: { accent: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
        <span style={kickerStyle}>Malla viva · tu equipo + tus agentes</span>
        <span style={{ font: "600 9px 'Plus Jakarta Sans',sans-serif", color: "#6FCF7A" }}>4 de 6 activos</span>
      </div>
      <div style={{ borderRadius: 14, overflow: "hidden", border: "1px solid rgba(200,161,90,.18)", background: "#0B0B0A" }}>
        <MallaGraph nodes={TEAM_MALLA_NODES} edges={TEAM_MALLA_EDGES} height={220} camRadius={130} maxRadius={320} repel={140} linkRest={40} fog={0.012} />
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
        <div style={hr} />
        <PortfolioBlock data={data} />
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

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
            <span style={kickerStyle}>La Malla · organismo completo</span>
            <span style={{ font: "400 8px 'Plus Jakarta Sans',sans-serif", color: "#6b6459" }}>arrastrá para rotar</span>
          </div>
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
        </div>

        <div style={{ borderRadius: 14, padding: "14px 15px", background: "#121611", border: "1px solid rgba(37,211,102,.22)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 10 }}>
            <span style={{ font: "700 8px 'Plus Jakarta Sans',sans-serif", color: "#5fa96b", letterSpacing: ".08em", textTransform: "uppercase" }}>Simulador · Gemelo Digital</span>
          </div>
          <div style={{ background: "#1a211a", borderRadius: "10px 10px 10px 3px", padding: "9px 11px", marginBottom: 11 }}>
            <span style={{ font: "400 10.5px/1.5 'Plus Jakarta Sans',sans-serif", color: "#E6E6E1" }}>
              Contame a qué te dedicás y te muestro cómo sería tener tu propio Gemelo Digital.
            </span>
          </div>
          <Link
            href={`/m/onboarding?ref=${card.slug}`}
            style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", borderRadius: 10, padding: "11px 15px", background: "linear-gradient(90deg,#E5C378,#C8A15A 50%,#99732B)", color: "#0D0D0D", font: "700 11.5px 'Plus Jakarta Sans',sans-serif" }}
          >
            <span>Simulá tu Gemelo Digital</span>
            <span>→</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

// ==================== Vista privada — lo único que ve el dueño (isHost) ====================
function OwnerOficina({ data }: { data: OficinaData }) {
  const { card, program, badge, accent, dashboardHref } = data;

  return (
    <div style={{ minHeight: "100vh", background: "#0B0B0A", color: "#F3F0E9", fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
      <Header slug={card.slug} right={<span style={kickerStyle}>Vista privada</span>} />

      <div style={{ maxWidth: 460, margin: "0 auto", padding: "24px 20px 40px", display: "flex", flexDirection: "column", gap: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
          <div style={{ width: 40, height: 40, borderRadius: 999, background: `linear-gradient(160deg,#E5C378,${accent})`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <span style={{ font: "700 15px 'Playfair Display',serif", color: "#0D0D0D" }}>{card.name.charAt(0)}</span>
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ font: "700 15px 'Plus Jakarta Sans',sans-serif" }}>Hola, {card.name}</div>
            <span style={{ font: "400 10.5px 'Plus Jakarta Sans',sans-serif", color: "#756c5e" }}>{program?.name || "Legacy"} · {badge}</span>
          </div>
        </div>

        <Link
          href={dashboardHref}
          style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", borderRadius: 10, padding: "12px 15px", background: "linear-gradient(90deg,#E5C378,#C8A15A 50%,#99732B)", color: "#0D0D0D", font: "700 11.5px 'Plus Jakarta Sans',sans-serif" }}
        >
          <span>Editar la información de esta Oficina</span>
          <span>→</span>
        </Link>

        <div style={hr} />

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <span style={kickerStyle}>Lo que ve el público</span>
          <KpiRow data={data} />
          <PortfolioBlock data={data} />
        </div>

        <div style={hr} />

        {/* Cartera / ingresos — todavía no hay motor de pago real, no se
            inventa una cifra a nombre del dueño (Fase 11-C, cáscara
            honesta). Distinto del resto de placeholders porque acá el
            dato sería plata real de una persona real. */}
        <div style={{ ...panelStyle, opacity: 0.6, textAlign: "center" }}>
          <span style={{ font: "400 11px 'Plus Jakarta Sans',sans-serif", color: "#8f8578" }}>
            Cartera NashMesh e ingresos — se activa cuando el motor de reparto esté listo (ver PLAN.md).
          </span>
        </div>

        <div style={hr} />

        <TeamMallaBlock accent={accent} />

        <div style={hr} />

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <span style={kickerStyle}>Agenda de hoy</span>
          <p style={{ margin: 0, font: "400 11px 'Plus Jakarta Sans',sans-serif", color: "#5A5A5A" }}>Todavía sin conectar — próximamente.</p>
        </div>

        <div style={hr} />

        {/* Accesos directos — los que existen de verdad, enlazan; el resto
            queda atenuado, sin fingir que ya está */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <span style={kickerStyle}>Tu Oficina, herramienta de trabajo</span>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "10px 6px" }}>
            {card.kind === "company" ? (
              <Link href="/m/dashboard/company/network" style={tileStyle}>
                <div style={tileIcon} />
                <span style={{ font: "400 9px 'Plus Jakarta Sans',sans-serif", color: "#C2BEB5" }}>Mi Red (Malla)</span>
              </Link>
            ) : (
              <div style={{ ...tileStyle, opacity: 0.5 }}>
                <div style={tileIcon} />
                <span style={{ font: "400 9px 'Plus Jakarta Sans',sans-serif", color: "#8f8578" }}>Mi Red (Malla)</span>
              </div>
            )}
            {["Agenda", "Mensajes", "Cartera NashMesh", "Configuración"].map((label) => (
              <div key={label} style={{ ...tileStyle, opacity: 0.5 }}>
                <div style={tileIcon} />
                <span style={{ font: "400 9px 'Plus Jakarta Sans',sans-serif", color: "#8f8578" }}>{label}</span>
              </div>
            ))}
          </div>
        </div>
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

  const data: OficinaData = {
    card,
    program: card.program,
    puesto: card.puesto,
    badge,
    accent: card.program?.primaryColor || "#C8A15A",
    officeItems: parseOfficeItems(card.officeItems),
    origin: originMemento?.snapshot as OriginSnapshot | undefined,
    dashboardHref: card.kind === "project" ? "/m/dashboard/project" : card.kind === "company" ? "/m/dashboard/company" : "/m/dashboard/personal",
  };

  return isHost ? <OwnerOficina data={data} /> : <VisitorOficina data={data} />;
}
