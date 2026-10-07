import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { currentAdminScope, isMasterN0Scope } from "@/lib/auth";
import { createSlotTemplateAction, updateSlotTemplateAction, deleteSlotTemplateAction } from "./actions";
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

const ERROR_COPY: Record<string, string> = {
  required: "El nombre es obligatorio.",
  badPayload: "El payload no es un JSON válido para ese tipo de slot -- para 'escala' tiene que ser un array con clave/nombre por nivel (mismo shape que 'Importar JSON').",
};

function SlotTemplateFields({
  defaults,
}: {
  defaults?: {
    slotType: string;
    nombre: string;
    descripcion: string;
    industryTags: string;
    painPointTags: string;
    payload: string;
  };
}) {
  return (
    <>
      <div style={{ display: "flex", gap: 8 }}>
        <input name="slotType" defaultValue={defaults?.slotType ?? "escala"} placeholder="Tipo de slot (ej. escala)" style={{ ...INPUT, flex: 1, minWidth: 0 }} />
        <input name="nombre" defaultValue={defaults?.nombre} placeholder="Nombre (ej. Madurez Operativa)" required style={{ ...INPUT, flex: 2, minWidth: 0 }} />
      </div>
      <textarea name="descripcion" defaultValue={defaults?.descripcion} placeholder="Descripción -- para qué sirve este template" rows={2} style={{ ...INPUT, resize: "vertical" }} />
      <div style={{ display: "flex", gap: 8 }}>
        <input name="industryTags" defaultValue={defaults?.industryTags} placeholder="Rubros, separados por coma (ej. iglesia, restaurante)" style={{ ...INPUT, flex: 1, minWidth: 0 }} />
        <input name="painPointTags" defaultValue={defaults?.painPointTags} placeholder="Dolores, separados por coma (ej. adopcion)" style={{ ...INPUT, flex: 1, minWidth: 0 }} />
      </div>
      <textarea
        name="payload"
        defaultValue={defaults?.payload}
        placeholder='[{"clave":"diagnostico","nombre":"Diagnóstico","subtitulo":"...","color":"#C8A15A","icono":"military_tech","descripcion":"..."}]'
        rows={5}
        required
        style={{ ...INPUT, resize: "vertical", fontFamily: "monospace" }}
      />
    </>
  );
}

export default async function AdminSlotTemplatesPage({
  searchParams,
}: {
  searchParams: Promise<{
    slotTemplateCreated?: string;
    slotTemplateSaved?: string;
    slotTemplateDeleted?: string;
    slotTemplateError?: string;
  }>;
}) {
  const scope = await currentAdminScope();
  if (!scope) redirect("/admin/login");
  if (!isMasterN0Scope(scope)) redirect("/admin");

  const { slotTemplateCreated, slotTemplateSaved, slotTemplateDeleted, slotTemplateError } = await searchParams;
  const catalog = await prisma.slotTemplate.findMany({ orderBy: { createdAt: "asc" } });

  return (
    <div style={{ minHeight: "100vh", background: "#131313", color: "#e5e2e1", fontFamily: "'Plus Jakarta Sans',sans-serif", padding: "0 0 60px" }}>
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          background: "rgba(20,20,20,.96)",
          borderBottom: "1px solid rgba(200,161,90,.22)",
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
        <h1 style={{ margin: 0, font: "500 18px 'Playfair Display',serif", color: "#F5F2EB" }}>Librería de Slots</h1>
        <span />
      </div>

      <div style={{ maxWidth: 560, margin: "0 auto", padding: "24px 20px", display: "flex", flexDirection: "column", gap: 20 }}>
        <p style={{ margin: 0, font: "400 12.5px/1.7 'Plus Jakarta Sans',sans-serif", color: "#C2BEB5" }}>
          Plantillas que cualquier N0 puede ELEGIR al armar un slot de su tarjeta (hoy: Medallón/Rango/Contactos),
          en vez de ARMAR el suyo desde cero -- mismo mecanismo de &quot;Importar JSON&quot; que ya usa el Editor de Escalas,
          solo que el JSON lo elige de acá en vez de pegarlo a mano.
        </p>

        <AccordionSection
          title="Templates"
          meta={<span style={{ font: "700 10px 'Plus Jakarta Sans',sans-serif", color: "#8a8378", background: "rgba(255,255,255,.05)", borderRadius: 999, padding: "3px 9px" }}>{catalog.length}</span>}
          defaultOpen
        >
          {slotTemplateCreated && <p style={{ margin: 0, font: "600 11px 'Plus Jakarta Sans',sans-serif", color: "#8fd19e" }}>✓ Template creado.</p>}
          {slotTemplateSaved && <p style={{ margin: 0, font: "600 11px 'Plus Jakarta Sans',sans-serif", color: "#8fd19e" }}>✓ Template actualizado.</p>}
          {slotTemplateDeleted && <p style={{ margin: 0, font: "600 11px 'Plus Jakarta Sans',sans-serif", color: "#8fd19e" }}>✓ Template eliminado.</p>}
          {slotTemplateError && (
            <p style={{ margin: 0, font: "600 11px 'Plus Jakarta Sans',sans-serif", color: "#e5928a" }}>{ERROR_COPY[slotTemplateError] || "Algo falló."}</p>
          )}

          <AccordionAddRow label="Agregar Template" defaultOpen={catalog.length === 0}>
            <form action={createSlotTemplateAction} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <SlotTemplateFields />
              <button type="submit" style={SAVE_BTN}>
                Crear Template
              </button>
            </form>
          </AccordionAddRow>

          {catalog.map((t) => (
            <AccordionRow
              key={t.id}
              title={t.nombre}
              subtitle={t.slotType}
              leading={
                <span style={{ flex: "none", width: 26, height: 26, borderRadius: 8, background: "rgba(200,161,90,.12)", border: "1px solid rgba(200,161,90,.35)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 15, color: "#C8A15A" }}>dashboard_customize</span>
                </span>
              }
              trailing={
                <form action={deleteSlotTemplateAction.bind(null, t.id)}>
                  <button type="submit" aria-label="Borrar" style={DELETE_ICON_BTN}>
                    <span className="material-symbols-outlined" style={{ fontSize: 15 }}>delete</span>
                  </button>
                </form>
              }
            >
              <form action={updateSlotTemplateAction.bind(null, t.id)} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <SlotTemplateFields
                  defaults={{
                    slotType: t.slotType,
                    nombre: t.nombre,
                    descripcion: t.descripcion,
                    industryTags: Array.isArray(t.industryTags) ? (t.industryTags as string[]).join(", ") : "",
                    painPointTags: Array.isArray(t.painPointTags) ? (t.painPointTags as string[]).join(", ") : "",
                    payload: JSON.stringify(t.payload, null, 2),
                  }}
                />
                <button type="submit" style={SAVE_BTN}>
                  Guardar
                </button>
              </form>
            </AccordionRow>
          ))}
        </AccordionSection>
      </div>
    </div>
  );
}
