"use client";

import { useState, useTransition, type CSSProperties } from "react";
import { CARD_SIZE_KEYS, CARD_SIZE_LABEL, SIZE_MIN, SIZE_MAX, type CardSizeConfig } from "@/lib/cardSizeConfig";
import { updateCardSizeConfigAction } from "@/app/c/sizeConfig-actions";

const OVERLAY: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 80,
  display: "flex",
  alignItems: "flex-end",
  justifyContent: "center",
};

// 0.01 == 1 punto porcentual: el slider queda 1 a 1 con el % que se
// muestra al lado (antes era 0.05 -- saltaba de a 5%, se sentía "duro" /
// poco sensible comparado con lo que el número decía que hacía).
const STEP = 0.01;

// Panel de ajuste de tamaños (2026-09-23, pedido de Gunnar: "aprieto de
// forma sostenida y salta el ajuste"). No es una vista previa aparte --
// `liveConfig` es el MISMO estado que arma las variables CSS del
// wrapper de LyCardView, así que mover un slider acá cambia la tarjeta
// real, atrás, al toque. "Cancelar" descarta el ajuste en vivo sin
// tocar la DB; "Guardar" persiste.
export default function CardSizePanel({
  cardId,
  liveConfig,
  savedConfig,
  onChange,
  onClose,
}: {
  cardId: string;
  liveConfig: CardSizeConfig;
  savedConfig: CardSizeConfig;
  onChange: (config: CardSizeConfig) => void;
  onClose: (nextSaved: CardSizeConfig | null) => void;
}) {
  const [saving, startSaving] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function setValue(key: keyof CardSizeConfig, value: number) {
    onChange({ ...liveConfig, [key]: value });
  }

  function handleCancel() {
    onChange(savedConfig); // vuelve la tarjeta real al último guardado
    onClose(null);
  }

  function handleSave() {
    setError(null);
    startSaving(async () => {
      try {
        await updateCardSizeConfigAction(cardId, liveConfig);
        onClose(liveConfig);
      } catch {
        setError("No se pudo guardar — probá de nuevo.");
      }
    });
  }

  return (
    <div style={OVERLAY}>
      <div onClick={handleCancel} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.15)" }} />
      <div
        role="dialog"
        aria-label="Ajustar tamaños"
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 430,
          // Traslúcido a propósito (pedido de Gunnar, 2026-09-23: "poder
          // ver cómo aumentan el tamaño las cosas") -- el blur mantiene
          // el texto legible, pero la tarjeta real de atrás (que ya está
          // cambiando en vivo con cada slider) se ve moverse a través
          // del panel, no solo alrededor de él.
          background: "rgba(20,20,20,.3)",
          backdropFilter: "blur(10px) saturate(160%)",
          borderTop: "1px solid rgba(200,161,90,.35)",
          borderRadius: "20px 20px 0 0",
          padding: "16px 20px calc(env(safe-area-inset-bottom,0px) + 20px)",
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        <span style={{ width: 40, height: 4, borderRadius: 999, background: "rgba(200,161,90,.4)", margin: "0 auto" }} />
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <span style={{ font: "700 14px 'Playfair Display',serif", color: "#F5F2EB" }}>Ajustar tamaños</span>
          <span style={{ font: "400 11px 'Plus Jakarta Sans',sans-serif", color: "#8a8378" }}>
            Movés el slider y ves el cambio en tu tarjeta, en vivo, atrás.
          </span>
        </div>

        {CARD_SIZE_KEYS.map((key) => (
          <label key={key} style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <span style={{ display: "flex", justifyContent: "space-between", font: "600 10.5px 'Plus Jakarta Sans',sans-serif", color: "#C2BEB5" }}>
              <span>{CARD_SIZE_LABEL[key]}</span>
              <span style={{ color: "#E5C378" }}>{Math.round(liveConfig[key] * 100)}%</span>
            </span>
            <input
              type="range"
              min={SIZE_MIN}
              max={SIZE_MAX}
              step={STEP}
              value={liveConfig[key]}
              onChange={(e) => setValue(key, Number(e.target.value))}
              style={{ width: "100%", accentColor: "#C8A15A" }}
            />
          </label>
        ))}

        {error && <p style={{ margin: 0, font: "600 11px 'Plus Jakarta Sans',sans-serif", color: "#e5928a" }}>{error}</p>}

        <div style={{ display: "flex", gap: 10 }}>
          <button
            type="button"
            onClick={handleCancel}
            disabled={saving}
            style={{ flex: 1, padding: "11px 0", borderRadius: 10, border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.04)", color: "#C2BEB5", font: "700 11px 'Plus Jakarta Sans',sans-serif", cursor: "pointer" }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            style={{
              flex: 1,
              padding: "11px 0",
              borderRadius: 10,
              border: "none",
              background: "linear-gradient(90deg,#E5C378,#C8A15A 50%,#99732B)",
              color: "#0D0D0D",
              font: "700 11px 'Plus Jakarta Sans',sans-serif",
              letterSpacing: ".04em",
              textTransform: "uppercase",
              cursor: saving ? "default" : "pointer",
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}
