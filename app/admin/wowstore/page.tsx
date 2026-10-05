import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { currentAdminScope, isMasterN0Scope } from "@/lib/auth";
import { createWowAppAction, updateWowAppAction, deleteWowAppAction, seedExampleWowAppsAction } from "./actions";
import {
  seedExampleEspecialistaAction,
  installEspecialistaAction,
  deleteEspecialistaAction,
  seedExampleExpertoAction,
  revokeExpertoConsentAction,
  deleteExpertoAction,
  promoverAExpertoAction,
} from "./actions-equipo";
import { RUBROS, PAIN_POINTS, WOW_APP_TYPES } from "@/lib/wowApps";
import { labelForToolKey } from "@/lib/especialistas";
import { canPublishExperto, parseRango, RANGO_LABEL } from "@/lib/expertos";
import { AccordionSection, AccordionRow, AccordionAddRow } from "@/components/Accordion";

export const dynamic = "force-dynamic";

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

const APP_TYPE_LABEL: Record<string, string> = {
  agenda: "Agenda / turnos",
  "whatsapp-bot": "Bot de WhatsApp",
  cobranza: "Cobranza",
  awe: "Caminata de Asombro (WowAwe)",
  custom: "Otro (sin app conectada todavía)",
};

const ERROR_COPY: Record<string, string> = {
  required: "Clave y nombre son obligatorios.",
  duplicateKey: "Ya existe una WowApp con esa clave.",
};

export default async function AdminWowStorePage({
  searchParams,
}: {
  searchParams: Promise<{
    wowAppCreated?: string;
    wowAppSaved?: string;
    wowAppDeleted?: string;
    wowAppError?: string;
    wowAppsSeeded?: string;
    especialistasSeeded?: string;
    especialistaInstalled?: string;
    especialistaDeleted?: string;
    especialistaError?: string;
    expertosSeeded?: string;
    expertoRevoked?: string;
    expertoDeleted?: string;
    expertoPromovido?: string;
  }>;
}) {
  const scope = await currentAdminScope();
  if (!scope) redirect("/admin/login");
  if (!isMasterN0Scope(scope)) redirect("/admin");

  const {
    wowAppCreated,
    wowAppSaved,
    wowAppDeleted,
    wowAppError,
    wowAppsSeeded,
    especialistasSeeded,
    especialistaInstalled,
    especialistaDeleted,
    especialistaError,
    expertosSeeded,
    expertoRevoked,
    expertoDeleted,
    expertoPromovido,
  } = await searchParams;
  const catalog = await prisma.wowApp.findMany({ orderBy: { createdAt: "asc" } });
  const especialistas = await prisma.especialista.findMany({ orderBy: { createdAt: "asc" }, include: { installs: true } });
  const expertos = await prisma.experto.findMany({ orderBy: { createdAt: "asc" }, include: { member: true, consultas: true } });
  const wowAppNames: Record<string, string> = Object.fromEntries(catalog.map((a) => [a.key, a.nombre]));

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
        <Link href="/admin/programs" style={{ color: "#C8A15A", font: "600 10px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".18em", textTransform: "uppercase" }}>
          ← Programas
        </Link>
        <h1 style={{ margin: 0, font: "500 18px 'Playfair Display',serif", color: "#F5F2EB" }}>WowHead</h1>
        <span />
      </div>

      <div style={{ maxWidth: 560, margin: "0 auto", padding: "24px 20px", display: "flex", flexDirection: "column", gap: 20 }}>
        <p style={{ margin: 0, font: "400 12.5px/1.7 'Plus Jakarta Sans',sans-serif", color: "#C2BEB5" }}>
          Catálogo de WowApps para cualquier MiPyME (restaurante, retail, despacho, emprendedor) -- vidriera pública en{" "}
          <code>/m/wowstore</code>, navegada por rubro + dolor, no por categoría técnica. Independiente de los
          Superpoderes internos de cada Programa.
        </p>

        <form action={seedExampleWowAppsAction}>
          <button
            type="submit"
            style={{
              alignSelf: "flex-start",
              padding: "10px 16px",
              border: "1px dashed rgba(200,161,90,.4)",
              borderRadius: 10,
              background: "none",
              color: "#C8A15A",
              font: "700 10.5px 'Plus Jakarta Sans',sans-serif",
              letterSpacing: ".08em",
              textTransform: "uppercase",
              cursor: "pointer",
            }}
          >
            Sembrar catálogo de ejemplo
          </button>
        </form>
        {wowAppsSeeded !== undefined && (
          <p style={{ margin: 0, font: "600 11px 'Plus Jakarta Sans',sans-serif", color: "#8fd19e" }}>
            {Number(wowAppsSeeded) > 0
              ? `✓ ${wowAppsSeeded} WowApp${wowAppsSeeded === "1" ? "" : "s"} de ejemplo agregada${wowAppsSeeded === "1" ? "" : "s"}.`
              : "Ya estaban todas -- no había ninguna nueva para agregar."}
          </p>
        )}

        <AccordionSection
          title="Catálogo de WowApps"
          meta={<span style={{ font: "700 10px 'Plus Jakarta Sans',sans-serif", color: "#8a8378", background: "rgba(255,255,255,.05)", borderRadius: 999, padding: "3px 9px" }}>{catalog.length}</span>}
          defaultOpen
        >
          {wowAppCreated && <p style={{ margin: 0, font: "600 11px 'Plus Jakarta Sans',sans-serif", color: "#8fd19e" }}>✓ WowApp creada.</p>}
          {wowAppSaved && <p style={{ margin: 0, font: "600 11px 'Plus Jakarta Sans',sans-serif", color: "#8fd19e" }}>✓ WowApp actualizada.</p>}
          {wowAppDeleted && <p style={{ margin: 0, font: "600 11px 'Plus Jakarta Sans',sans-serif", color: "#8fd19e" }}>✓ WowApp eliminada.</p>}
          {wowAppError && (
            <p style={{ margin: 0, font: "600 11px 'Plus Jakarta Sans',sans-serif", color: "#e5928a" }}>{ERROR_COPY[wowAppError] || "Algo falló."}</p>
          )}

          <AccordionAddRow label="Agregar WowApp" defaultOpen={catalog.length === 0}>
            <form action={createWowAppAction} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <WowAppFields />
              <button type="submit" style={SAVE_BTN}>
                Crear WowApp
              </button>
            </form>
          </AccordionAddRow>

          {catalog.map((app) => (
            <AccordionRow
              key={app.id}
              title={app.nombre}
              subtitle={`${app.key} · ${app.status === "activo" ? "activa" : "próximamente"}${app.destacado ? " · ★ destacada" : ""}`}
              leading={
                <span style={{ flex: "none", width: 26, height: 26, borderRadius: 8, background: `${app.color}1F`, border: `1px solid ${app.color}55`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 15, color: app.color }}>bolt</span>
                </span>
              }
              trailing={
                <form action={deleteWowAppAction.bind(null, app.id)}>
                  <button type="submit" aria-label="Borrar" style={DELETE_ICON_BTN}>
                    <span className="material-symbols-outlined" style={{ fontSize: 15 }}>delete</span>
                  </button>
                </form>
              }
            >
              <form action={updateWowAppAction.bind(null, app.id)} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <WowAppFields
                  defaults={{
                    key: app.key,
                    nombre: app.nombre,
                    descripcion: app.descripcion,
                    iconUrl: app.iconUrl,
                    color: app.color,
                    appType: app.appType,
                    industryTags: Array.isArray(app.industryTags) ? (app.industryTags as string[]).join(", ") : "",
                    painPointTags: Array.isArray(app.painPointTags) ? (app.painPointTags as string[]).join(", ") : "",
                    basePriceUsd: app.basePriceUsd,
                    status: app.status,
                    demoVideoUrl: app.demoVideoUrl,
                    destacado: app.destacado,
                  }}
                />
                <button type="submit" style={SAVE_BTN}>
                  Guardar
                </button>
              </form>
            </AccordionRow>
          ))}
        </AccordionSection>

        <AccordionSection
          title="Especialistas"
          subtitle="Agentes con un trabajo -- usan WowApps/Superpoderes ya existentes como herramientas."
          meta={<span style={{ font: "700 10px 'Plus Jakarta Sans',sans-serif", color: "#8a8378", background: "rgba(255,255,255,.05)", borderRadius: 999, padding: "3px 9px" }}>{especialistas.length}</span>}
        >
          {especialistaInstalled && <p style={{ margin: 0, font: "600 11px 'Plus Jakarta Sans',sans-serif", color: "#8fd19e" }}>✓ Instalado en la Card.</p>}
          {especialistaDeleted && <p style={{ margin: 0, font: "600 11px 'Plus Jakarta Sans',sans-serif", color: "#8fd19e" }}>✓ Especialista eliminado.</p>}
          {especialistaError === "cardNotFound" && (
            <p style={{ margin: 0, font: "600 11px 'Plus Jakarta Sans',sans-serif", color: "#e5928a" }}>No existe ninguna Card con ese slug.</p>
          )}

          <form action={seedExampleEspecialistaAction}>
            <button type="submit" style={{ alignSelf: "flex-start", padding: "10px 16px", border: "1px dashed rgba(200,161,90,.4)", borderRadius: 10, background: "none", color: "#C8A15A", font: "700 10.5px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".08em", textTransform: "uppercase", cursor: "pointer" }}>
              Sembrar ejemplo (Calma)
            </button>
          </form>
          {especialistasSeeded !== undefined && (
            <p style={{ margin: 0, font: "600 11px 'Plus Jakarta Sans',sans-serif", color: "#8fd19e" }}>
              {Number(especialistasSeeded) > 0 ? `✓ ${especialistasSeeded} Especialista de ejemplo agregado.` : "Ya estaba -- no había ninguno nuevo para agregar."}
            </p>
          )}

          {especialistas.map((esp) => (
            <AccordionRow
              key={esp.id}
              title={esp.nombre}
              subtitle={`${esp.trabajo} · ${esp.installs.length} instalación${esp.installs.length === 1 ? "" : "es"}`}
              leading={
                <span style={{ flex: "none", width: 26, height: 26, borderRadius: 8, background: `${esp.color}1F`, border: `1px solid ${esp.color}55`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 15, color: esp.color }}>support_agent</span>
                </span>
              }
              trailing={
                <form action={deleteEspecialistaAction.bind(null, esp.id)}>
                  <button type="submit" aria-label="Borrar" style={DELETE_ICON_BTN}>
                    <span className="material-symbols-outlined" style={{ fontSize: 15 }}>delete</span>
                  </button>
                </form>
              }
            >
              <p style={{ margin: 0, font: "400 11.5px/1.6 'Plus Jakarta Sans',sans-serif", color: "#C2BEB5" }}>{esp.descripcion}</p>
              <p style={{ margin: 0, font: "600 10.5px 'Plus Jakarta Sans',sans-serif", color: "#8a8378" }}>
                Herramientas: {(esp.toolKeys as string[]).map((k) => labelForToolKey(k, wowAppNames)).join(" · ")}
              </p>
              <p style={{ margin: 0, font: "italic 400 11px/1.5 'Plus Jakarta Sans',sans-serif", color: "#7FB0C4" }}>
                Sugerencia de ejemplo (simulada): &ldquo;{esp.suggestion}&rdquo;
              </p>
              <form action={installEspecialistaAction.bind(null, esp.id)} style={{ display: "flex", gap: 8 }}>
                <input name="cardSlug" placeholder="Slug de la Card donde instalarlo" style={{ ...INPUT, flex: 1, minWidth: 0 }} />
                <button type="submit" style={SAVE_BTN}>Instalar</button>
              </form>
            </AccordionRow>
          ))}
        </AccordionSection>

        <AccordionSection
          title="Expertos"
          subtitle="El Gemelo Digital publicado de una persona real -- con consentimiento y Bautizo."
          meta={<span style={{ font: "700 10px 'Plus Jakarta Sans',sans-serif", color: "#8a8378", background: "rgba(255,255,255,.05)", borderRadius: 999, padding: "3px 9px" }}>{expertos.length}</span>}
        >
          {expertoRevoked && <p style={{ margin: 0, font: "600 11px 'Plus Jakarta Sans',sans-serif", color: "#8fd19e" }}>✓ Consentimiento revocado -- ya no publica.</p>}
          {expertoDeleted && <p style={{ margin: 0, font: "600 11px 'Plus Jakarta Sans',sans-serif", color: "#8fd19e" }}>✓ Experto eliminado.</p>}
          {expertoPromovido === "1" && <p style={{ margin: 0, font: "600 11px 'Plus Jakarta Sans',sans-serif", color: "#8fd19e" }}>✓ Ascendido a Experto -- ya puede armar su equipo.</p>}

          <form action={seedExampleExpertoAction}>
            <button type="submit" style={{ alignSelf: "flex-start", padding: "10px 16px", border: "1px dashed rgba(200,161,90,.4)", borderRadius: 10, background: "none", color: "#C8A15A", font: "700 10.5px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".08em", textTransform: "uppercase", cursor: "pointer" }}>
              Sembrar ejemplo (Experto)
            </button>
          </form>
          {expertosSeeded !== undefined && (
            <p style={{ margin: 0, font: "600 11px 'Plus Jakarta Sans',sans-serif", color: "#8fd19e" }}>
              {Number(expertosSeeded) > 0 ? "✓ Experto de ejemplo agregado (con su propio Member/Card de prueba)." : "Ya estaba -- no había ninguno nuevo para agregar."}
            </p>
          )}

          {expertos.map((exp) => {
            const published = canPublishExperto(exp);
            const rango = parseRango(exp.rango);
            return (
              <AccordionRow
                key={exp.id}
                title={exp.nombrePublico}
                subtitle={`${exp.profesion} · ${RANGO_LABEL[rango]} · ${published ? "publicado" : "no publica"} · ${exp.consultas.length} consulta${exp.consultas.length === 1 ? "" : "s"}`}
                leading={
                  <span style={{ flex: "none", width: 26, height: 26, borderRadius: 8, background: `${exp.color}1F`, border: `1px solid ${exp.color}55`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 15, color: exp.color }}>psychology</span>
                  </span>
                }
                trailing={
                  <form action={deleteExpertoAction.bind(null, exp.id)}>
                    <button type="submit" aria-label="Borrar" style={DELETE_ICON_BTN}>
                      <span className="material-symbols-outlined" style={{ fontSize: 15 }}>delete</span>
                    </button>
                  </form>
                }
              >
                <p style={{ margin: 0, font: "400 11.5px/1.6 'Plus Jakarta Sans',sans-serif", color: "#C2BEB5" }}>{exp.descripcion}</p>
                <p style={{ margin: 0, font: "600 10.5px 'Plus Jakarta Sans',sans-serif", color: "#8a8378" }}>
                  {exp.esProfesionRegulada ? "Profesión regulada -- solo orienta y refiere, nunca diagnostica." : "Profesión no regulada."}
                </p>
                <Link href={`/experto/${exp.key}`} style={{ font: "700 10px 'Plus Jakarta Sans',sans-serif", color: "#C8A15A", textDecoration: "none" }}>
                  Ver página pública →
                </Link>
                <Link href={`/m/wowhead/legacy/${exp.key}`} style={{ font: "700 10px 'Plus Jakarta Sans',sans-serif", color: "#C8A15A", textDecoration: "none" }}>
                  Ver perfil en WowHead →
                </Link>
                {published && (
                  <form action={revokeExpertoConsentAction.bind(null, exp.id)}>
                    <button type="submit" style={{ ...SAVE_BTN, background: "rgba(229,146,138,.12)", color: "#e5928a" }}>
                      Revocar consentimiento
                    </button>
                  </form>
                )}
                {rango === "especialista" && (
                  <form action={promoverAExpertoAction.bind(null, exp.id)}>
                    <button type="submit" style={{ ...SAVE_BTN, background: "rgba(200,161,90,.16)", color: "#C8A15A" }}>
                      Promover a Experto (arma su propio equipo)
                    </button>
                  </form>
                )}
              </AccordionRow>
            );
          })}
        </AccordionSection>
      </div>
    </div>
  );
}

function WowAppFields({
  defaults,
}: {
  defaults?: {
    key: string;
    nombre: string;
    descripcion: string;
    iconUrl: string;
    color: string;
    appType: string;
    industryTags: string;
    painPointTags: string;
    basePriceUsd: number;
    status: string;
    demoVideoUrl: string;
    destacado: boolean;
  };
}) {
  return (
    <>
      <div style={{ display: "flex", gap: 8 }}>
        <input name="key" defaultValue={defaults?.key} placeholder="Clave (ej. wowagenda-pro)" required style={{ ...INPUT, flex: 1, minWidth: 0 }} />
        <input name="nombre" defaultValue={defaults?.nombre} placeholder="Nombre (ej. WowAgenda Pro)" required style={{ ...INPUT, flex: 1, minWidth: 0 }} />
      </div>
      <textarea name="descripcion" defaultValue={defaults?.descripcion} placeholder="Descripción -- cara 'Qué es esto'" rows={2} style={{ ...INPUT, resize: "vertical" }} />
      <div style={{ display: "flex", gap: 8 }}>
        <input name="color" defaultValue={defaults?.color || "#C8A15A"} placeholder="Color" style={{ ...INPUT, flex: 1, minWidth: 0 }} />
        <select name="appType" defaultValue={defaults?.appType || "custom"} style={{ ...INPUT, flex: 1, minWidth: 0 }}>
          {WOW_APP_TYPES.map((t) => (
            <option key={t} value={t}>{APP_TYPE_LABEL[t]}</option>
          ))}
        </select>
      </div>
      <input
        name="industryTags"
        defaultValue={defaults?.industryTags}
        placeholder={`Rubros separados por coma (${RUBROS.map((r) => r.key).join(", ")})`}
        style={INPUT}
      />
      <input
        name="painPointTags"
        defaultValue={defaults?.painPointTags}
        placeholder={`Dolores separados por coma (${PAIN_POINTS.map((p) => p.key).join(", ")})`}
        style={INPUT}
      />
      <div style={{ display: "flex", gap: 8 }}>
        <input name="basePriceUsd" type="number" step="0.01" min={0} defaultValue={defaults?.basePriceUsd ?? 0} placeholder="Precio base USD" style={{ ...INPUT, flex: 1, minWidth: 0 }} />
        <select name="status" defaultValue={defaults?.status || "proximamente"} style={{ ...INPUT, flex: 1, minWidth: 0 }}>
          <option value="proximamente">Próximamente</option>
          <option value="activo">Activa</option>
        </select>
      </div>
      <input name="iconUrl" defaultValue={defaults?.iconUrl} placeholder="URL de ícono (opcional)" style={INPUT} />
      <input name="demoVideoUrl" defaultValue={defaults?.demoVideoUrl} placeholder="URL de video demo (opcional)" style={INPUT} />
      <label style={{ display: "flex", alignItems: "center", gap: 8, font: "600 12px 'Plus Jakarta Sans',sans-serif", color: "#F5F2EB" }}>
        <input type="checkbox" name="destacado" defaultChecked={defaults?.destacado} />
        Destacada (aparece siempre arriba de Explorar en WowStore, sin depender de rubro/dolor)
      </label>
    </>
  );
}
