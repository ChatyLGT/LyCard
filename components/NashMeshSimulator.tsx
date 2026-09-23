"use client";

import { useState } from "react";
import { AccordionRow } from "@/components/Accordion";
import { PSI_TIERS, PSI_TIER_LABEL, type PsiTier } from "@/lib/nashMesh";

type Row = { _uid: string; cardId: string; name: string; declaredContributionPct: number; psiTier: PsiTier };

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

// Simulador de reparto NashMesh (pedido de Gunnar, 2026-09-23) — mismo
// patrón que EscalaEditor.tsx: estado local + un campo JSON oculto +
// una sola action de guardado. `prefill` llega desde un cruce confirmado
// de /admin/janus (ver ?fromCardId=&fromName=&toCardId=&toName=) — el
// resto de los participantes (ej. un financiador que no tiene Card
// todavía, caso B4W) se agregan a mano.
export default function NashMeshSimulator({
  cards,
  prefill,
  action,
}: {
  cards: { id: string; name: string }[];
  prefill: { cardId: string; name: string }[];
  action: (formData: FormData) => Promise<void>;
}) {
  const [rows, setRows] = useState<Row[]>(() =>
    prefill.length > 0
      ? prefill.map((p) => ({ _uid: uid(), cardId: p.cardId, name: p.name, declaredContributionPct: 50, psiTier: 3 as PsiTier }))
      : []
  );
  const [openUid, setOpenUid] = useState<string | null>(rows[0]?._uid ?? null);

  function addRow() {
    const newUid = uid();
    setRows((rs) => [...rs, { _uid: newUid, cardId: "", name: "", declaredContributionPct: 0, psiTier: 3 }]);
    setOpenUid(newUid);
  }
  function updateRow(uidToUpdate: string, patch: Partial<Row>) {
    setRows((rs) => rs.map((r) => (r._uid === uidToUpdate ? { ...r, ...patch } : r)));
  }
  function removeRow(uidToRemove: string) {
    setRows((rs) => rs.filter((r) => r._uid !== uidToRemove));
    setOpenUid((cur) => (cur === uidToRemove ? null : cur));
  }

  const totalPct = rows.reduce((sum, r) => sum + Math.max(0, r.declaredContributionPct), 0);

  return (
    <form action={action} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <input
        type="hidden"
        name="participants"
        value={JSON.stringify(
          rows.filter((r) => r.name.trim()).map(({ _uid, ...rest }) => rest)
        )}
      />

      <input name="label" placeholder="Nombre de esta simulación (ej. Reparto Digital Kingdom × Panadería Doña Rosa)" style={FIELD} />

      <div style={{ display: "flex", gap: 8 }}>
        <label style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ font: "500 10px 'Plus Jakarta Sans',sans-serif", color: "#5A5A5A" }}>Valor total a repartir (USD)</span>
          <input name="totalValueUsd" type="number" min={0} step="0.01" required style={FIELD} />
        </label>
        <label style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ font: "500 10px 'Plus Jakarta Sans',sans-serif", color: "#5A5A5A" }}>Comisión de plataforma (ε, 0-1)</span>
          <input name="epsilon" type="number" min={0} max={1} step="0.01" defaultValue={0.05} style={FIELD} />
        </label>
      </div>

      {rows.length === 0 && (
        <p style={{ margin: 0, font: "400 12px 'Plus Jakarta Sans',sans-serif", color: "#5A5A5A" }}>
          Sin participantes todavía — tocá &quot;Agregar participante&quot;.
        </p>
      )}

      {rows.map((row) => (
        <AccordionRow
          key={row._uid}
          open={openUid === row._uid}
          onToggle={() => setOpenUid((cur) => (cur === row._uid ? null : row._uid))}
          title={row.name || "(sin nombre)"}
          subtitle={`${row.declaredContributionPct}% declarado · ${PSI_TIER_LABEL[row.psiTier]}`}
          trailing={
            <button
              type="button"
              onClick={() => removeRow(row._uid)}
              aria-label="Quitar participante"
              style={{ flex: "none", width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", border: "none", borderRadius: 8, background: "rgba(229,146,138,.12)", color: "#e5928a", cursor: "pointer" }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 15 }}>close</span>
            </button>
          }
        >
          <select
            value={row.cardId}
            onChange={(e) => {
              const card = cards.find((c) => c.id === e.target.value);
              updateRow(row._uid, { cardId: e.target.value, name: card ? card.name : row.name });
            }}
            style={FIELD}
          >
            <option value="">— Sin Card (participante externo, ej. &quot;El Estado&quot;) —</option>
            {cards.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <input
            placeholder="Nombre"
            value={row.name}
            onChange={(e) => updateRow(row._uid, { name: e.target.value })}
            style={FIELD}
          />
          <div style={{ display: "flex", gap: 8 }}>
            <label style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ font: "500 10px 'Plus Jakarta Sans',sans-serif", color: "#5A5A5A" }}>Contribución declarada (%)</span>
              <input
                type="number"
                min={0}
                max={100}
                value={row.declaredContributionPct}
                onChange={(e) => updateRow(row._uid, { declaredContributionPct: Number(e.target.value) })}
                style={FIELD}
              />
            </label>
            <label style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ font: "500 10px 'Plus Jakarta Sans',sans-serif", color: "#5A5A5A" }}>ψ (confiabilidad)</span>
              <select value={row.psiTier} onChange={(e) => updateRow(row._uid, { psiTier: Number(e.target.value) as PsiTier })} style={FIELD}>
                {PSI_TIERS.map((t) => (
                  <option key={t} value={t}>
                    {PSI_TIER_LABEL[t]}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </AccordionRow>
      ))}

      <button
        type="button"
        onClick={addRow}
        style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7, padding: 12, border: "1px dashed rgba(200,161,90,.4)", borderRadius: 12, background: "none", color: "#C8A15A", font: "700 11px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".08em", textTransform: "uppercase", cursor: "pointer" }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add</span>
        Agregar participante
      </button>

      {rows.length > 0 && totalPct !== 100 && (
        <p style={{ margin: 0, font: "400 10.5px 'Plus Jakarta Sans',sans-serif", color: "#8a8378" }}>
          Los % declarados suman {totalPct}, no 100 — no hace falta que sumen exacto, se normalizan solos al simular.
        </p>
      )}

      <button
        type="submit"
        disabled={rows.length === 0}
        style={{
          padding: 13, border: "none", borderRadius: 10, cursor: rows.length === 0 ? "default" : "pointer",
          background: rows.length === 0 ? "rgba(255,255,255,.06)" : "linear-gradient(90deg,#E5C378,#C8A15A 50%,#99732B)",
          color: rows.length === 0 ? "#5A5A5A" : "#0D0D0D",
          font: "700 11px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".1em", textTransform: "uppercase",
        }}
      >
        Simular reparto
      </button>
    </form>
  );
}
