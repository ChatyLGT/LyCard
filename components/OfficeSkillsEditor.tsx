"use client";

import { useState } from "react";
import type { OfficeSkill, OfficeSkillAppType } from "@/lib/officeSkills";
import { AccordionRow } from "@/components/Accordion";

type EditableSkill = OfficeSkill & { _uid: string };

function uid() {
  return Math.random().toString(36).slice(2);
}

const FIELD: React.CSSProperties = {
  background: "#0D0D0D",
  border: "1px solid rgba(200,161,90,.25)",
  borderRadius: 8,
  padding: "8px 11px",
  color: "#F5F2EB",
  font: "400 12px 'Plus Jakarta Sans',sans-serif",
  outline: "none",
};

const APP_TYPE_OPTIONS: { value: OfficeSkillAppType; label: string }[] = [
  { value: "malla", label: "Malla (Mi Red)" },
  { value: "fathom-brief", label: "Brief de reuniones (Fathom)" },
  { value: "agenda", label: "Agenda" },
  { value: "mensajes", label: "Mensajes" },
  { value: "cartera", label: "Cartera NashMesh" },
  { value: "configuracion", label: "Configuración" },
  { value: "custom", label: "Otro (sin app conectada todavía)" },
];

// Editor client-side de Program.officeSkills — mismo patrón que
// EscalaEditor.tsx: estado local, un input JSON oculto, una sola action
// que guarda la lista entera. El ícono (archivo) NO viaja acá: solo se
// puede subir a un power que ya existe guardado, vía su propia mini-form
// más abajo en la página (setOfficeSkillIconAction), igual que los
// colores de modo claro de un Skin.
export default function OfficeSkillsEditor({
  initialSkills,
  action,
}: {
  initialSkills: OfficeSkill[];
  action: (formData: FormData) => Promise<void>;
}) {
  const [skills, setSkills] = useState<EditableSkill[]>(() => initialSkills.map((s) => ({ ...s, _uid: uid() })));
  const [openUid, setOpenUid] = useState<string | null>(null);

  function addSkill() {
    const newUid = uid();
    setSkills((ss) => [
      ...ss,
      { key: "", nombre: "", descripcion: "", iconUrl: "", color: "#C8A15A", appType: "custom", enabled: true, _uid: newUid },
    ]);
    setOpenUid(newUid);
  }
  function updateSkill(uidToUpdate: string, patch: Partial<OfficeSkill>) {
    setSkills((ss) => ss.map((s) => (s._uid === uidToUpdate ? { ...s, ...patch } : s)));
  }
  function removeSkill(uidToRemove: string) {
    setSkills((ss) => ss.filter((s) => s._uid !== uidToRemove));
    setOpenUid((cur) => (cur === uidToRemove ? null : cur));
  }

  return (
    <form action={action} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <input
        type="hidden"
        name="skills"
        value={JSON.stringify(
          skills.filter((s) => s.key.trim() && s.nombre.trim()).map(({ _uid, ...rest }) => rest)
        )}
      />

      {skills.length === 0 && (
        <p style={{ margin: 0, font: "400 12px 'Plus Jakarta Sans',sans-serif", color: "#5A5A5A" }}>
          Sin superpoderes propios todavía — tocá "Agregar superpoder" para armar los tuyos (mientras tanto se
          muestran los 6 de siempre).
        </p>
      )}

      {skills.map((skill) => (
        <AccordionRow
          key={skill._uid}
          open={openUid === skill._uid}
          onToggle={() => setOpenUid((cur) => (cur === skill._uid ? null : skill._uid))}
          leading={
            <span
              style={{
                flex: "none", width: 26, height: 26, borderRadius: 8, background: skill.color || "#353534",
                display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden",
              }}
            >
              {skill.iconUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={skill.iconUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              )}
            </span>
          }
          title={skill.nombre || "(sin nombre)"}
          subtitle={skill.enabled ? "activo" : "oculto"}
          trailing={
            <button
              type="button"
              onClick={() => removeSkill(skill._uid)}
              aria-label="Quitar"
              style={{ flex: "none", width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", border: "none", borderRadius: 8, background: "rgba(229,146,138,.12)", color: "#e5928a", cursor: "pointer" }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 15 }}>close</span>
            </button>
          }
        >
          <div style={{ display: "flex", gap: 8 }}>
            <input
              placeholder="Clave (ej. agenda)"
              value={skill.key}
              onChange={(e) => updateSkill(skill._uid, { key: e.target.value })}
              style={{ ...FIELD, flex: 1, minWidth: 0, color: "#E5C378", font: "600 12px 'Plus Jakarta Sans',sans-serif" }}
            />
            <input
              placeholder="Nombre (ej. Agenda)"
              value={skill.nombre}
              onChange={(e) => updateSkill(skill._uid, { nombre: e.target.value })}
              style={{ ...FIELD, flex: 1, minWidth: 0 }}
            />
          </div>
          <textarea
            placeholder="Descripción (cara 'Qué es esto' del modal)"
            value={skill.descripcion}
            onChange={(e) => updateSkill(skill._uid, { descripcion: e.target.value })}
            rows={2}
            style={{ ...FIELD, color: "#C2BEB5", resize: "vertical" }}
          />
          <div style={{ display: "flex", gap: 8 }}>
            <label style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ font: "500 10px 'Plus Jakarta Sans',sans-serif", color: "#5A5A5A" }}>Color</span>
              <input
                value={skill.color}
                onChange={(e) => updateSkill(skill._uid, { color: e.target.value })}
                style={{ ...FIELD, width: "100%", color: "#C2BEB5" }}
              />
            </label>
            <label style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ font: "500 10px 'Plus Jakarta Sans',sans-serif", color: "#5A5A5A" }}>App conectada</span>
              <select
                value={skill.appType}
                onChange={(e) => updateSkill(skill._uid, { appType: e.target.value as OfficeSkillAppType })}
                style={{ ...FIELD, width: "100%", color: "#C2BEB5" }}
              >
                {APP_TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </label>
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 8, font: "400 11px 'Plus Jakarta Sans',sans-serif", color: "#C2BEB5" }}>
            <input type="checkbox" checked={skill.enabled} onChange={(e) => updateSkill(skill._uid, { enabled: e.target.checked })} />
            Visible en la Oficina
          </label>
        </AccordionRow>
      ))}

      <button
        type="button"
        onClick={addSkill}
        style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7, padding: 12, border: "1px dashed rgba(200,161,90,.4)", borderRadius: 12, background: "none", color: "#C8A15A", font: "700 11px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".08em", textTransform: "uppercase", cursor: "pointer" }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add</span>
        Agregar superpoder
      </button>

      <button
        type="submit"
        style={{ padding: 13, border: "none", borderRadius: 10, background: "linear-gradient(90deg,#E5C378,#C8A15A 50%,#99732B)", color: "#0D0D0D", font: "700 11px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".1em", textTransform: "uppercase", cursor: "pointer" }}
      >
        Guardar Superpoderes
      </button>
    </form>
  );
}
