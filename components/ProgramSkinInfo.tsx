"use client";

import { useState } from "react";

// Explains how to get a design.md to upload here — written from what's
// generally known about Stitch's export flow, not verified live against
// its current UI, so the exact button/menu wording may have moved on.
export default function ProgramSkinInfo() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 10px", borderRadius: 999, background: "#1c1b1b", border: "1px solid rgba(200,161,90,.35)", color: "#E5C378", font: "700 10px 'Plus Jakarta Sans',sans-serif", cursor: "pointer" }}
      >
        ℹ️ Cómo genero mi design.md
      </button>

      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, background: "rgba(0,0,0,.75)" }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ width: "100%", maxWidth: 420, background: "linear-gradient(180deg,#1C1C1C,#0D0D0D)", border: "1px solid rgba(200,161,90,.4)", borderRadius: 16, padding: 20, display: "flex", flexDirection: "column", gap: 12 }}
          >
            <span style={{ font: "700 11px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".18em", textTransform: "uppercase", color: "#E5C378" }}>
              Cómo genero mi design.md
            </span>
            <ol style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 8, font: "400 12.5px/1.6 'Plus Jakarta Sans',sans-serif", color: "#C2BEB5" }}>
              <li>Entrá a Google Stitch y describile la marca (o subile el brandbook/logo que ya tengas).</li>
              <li>Dejá que genere el diseño — colores, tipografía, estilo de componentes.</li>
              <li>Exportá/descargá el archivo <strong style={{ color: "#F5F2EB" }}>design.md</strong> que te da como resultado.</li>
              <li>Subilo acá abajo, en cualquiera de los 3 espacios de skin.</li>
            </ol>
            <span style={{ font: "400 10.5px/1.5 'Plus Jakarta Sans',sans-serif", color: "#5A5A5A" }}>
              Ojo: la interfaz de Stitch puede haber cambiado el nombre exacto de estos pasos — si no encontrás algo así, buscá la opción de "exportar" o "descargar" el archivo de diseño de tu proyecto.
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              style={{ marginTop: 4, padding: 10, border: "1px solid rgba(255,255,255,.1)", borderRadius: 10, background: "none", color: "#C2BEB5", font: "700 10px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".1em", textTransform: "uppercase", cursor: "pointer" }}
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </>
  );
}
