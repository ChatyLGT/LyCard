"use client";

import { useState, type CSSProperties } from "react";
import { simulateDesignExtraction } from "@/lib/designExtraction";

type BrandDesign = { imageUrl?: string; palette?: string[]; font?: string; buttonStyle?: string; extractedAt?: string };

// Real dominant-color extraction from the uploaded image's actual pixels —
// coarse-bucket quantization, no library needed. Everything past the
// palette (font, button style) is simulated (lib/designExtraction.ts)
// until there's a real vision model wired in.
function extractPalette(img: HTMLImageElement, count = 5): string[] {
  const canvas = document.createElement("canvas");
  const size = 60;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return [];
  ctx.drawImage(img, 0, 0, size, size);
  const { data } = ctx.getImageData(0, 0, size, size);

  const buckets = new Map<string, { r: number; g: number; b: number; n: number }>();
  const step = 32; // coarse quantization so near-identical pixels group together
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3];
    if (a < 128) continue; // skip transparent pixels
    const r = Math.round(data[i] / step) * step;
    const g = Math.round(data[i + 1] / step) * step;
    const b = Math.round(data[i + 2] / step) * step;
    const key = `${r},${g},${b}`;
    const bucket = buckets.get(key);
    if (bucket) {
      bucket.n++;
    } else {
      buckets.set(key, { r, g, b, n: 1 });
    }
  }

  return Array.from(buckets.values())
    .sort((a, b) => b.n - a.n)
    .slice(0, count)
    .map(({ r, g, b }) => `#${[r, g, b].map((v) => Math.min(255, v).toString(16).padStart(2, "0")).join("")}`);
}

const LABEL: CSSProperties = {
  font: "500 10px 'Plus Jakarta Sans',sans-serif",
  letterSpacing: ".16em",
  textTransform: "uppercase",
  color: "#C2BEB5",
};

export default function BrandDesignUploader({ current }: { current: BrandDesign }) {
  const [imagePreview, setImagePreview] = useState<string | null>(current.imageUrl ?? null);
  const [palette, setPalette] = useState<string[]>(current.palette ?? []);
  const [extraction, setExtraction] = useState(
    current.font ? { font: current.font, buttonStyle: current.buttonStyle ?? "" } : null
  );
  const [modalOpen, setModalOpen] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAnalyzing(true);
    const url = URL.createObjectURL(file);
    setImagePreview(url);
    const img = new Image();
    img.onload = () => {
      const extractedPalette = extractPalette(img);
      setPalette(extractedPalette);
      setExtraction(simulateDesignExtraction(extractedPalette));
      setAnalyzing(false);
    };
    img.src = url;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <span style={LABEL}>Diseño Corporativo (fonts/colores/botones — imagen con las pautas de marca)</span>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {imagePreview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imagePreview} alt="" style={{ width: 44, height: 44, borderRadius: 10, objectFit: "cover", background: "#0D0D0D", border: "1px solid rgba(200,161,90,.3)" }} />
        ) : (
          <span style={{ width: 44, height: 44, borderRadius: 10, background: "#0D0D0D", border: "1px dashed rgba(200,161,90,.3)", flex: "none" }} />
        )}
        <input type="file" name="brandImage" accept="image/*" onChange={onFileChange} style={{ font: "400 11px 'Plus Jakarta Sans',sans-serif", color: "#C2BEB5" }} />
        {analyzing && <span style={{ font: "400 11px 'Plus Jakarta Sans',sans-serif", color: "#5A5A5A" }}>Analizando…</span>}
        {!analyzing && extraction && (
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 10px", borderRadius: 999, background: "#1c1b1b", border: "1px solid rgba(200,161,90,.35)", color: "#E5C378", font: "700 10px 'Plus Jakarta Sans',sans-serif", cursor: "pointer" }}
          >
            🎨 Colores y estilo detectados
          </button>
        )}
      </div>
      <span style={{ font: "400 10.5px/1.5 'Plus Jakarta Sans',sans-serif", color: "#5A5A5A" }}>
        La paleta se lee de verdad de los píxeles de la imagen; la fuente y el estilo de botón son una simulación hasta que enchufemos un modelo real.
      </span>

      {/* Hidden fields so the wrapping form submits the extraction along with the file */}
      <input type="hidden" name="palette" value={JSON.stringify(palette)} />
      <input type="hidden" name="font" value={extraction?.font ?? ""} />
      <input type="hidden" name="buttonStyle" value={extraction?.buttonStyle ?? ""} />

      {modalOpen && extraction && (
        <div
          onClick={() => setModalOpen(false)}
          style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, background: "rgba(0,0,0,.75)" }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ width: "100%", maxWidth: 380, background: "linear-gradient(180deg,#1C1C1C,#0D0D0D)", border: "1px solid rgba(200,161,90,.4)", borderRadius: 16, padding: 20, display: "flex", flexDirection: "column", gap: 14 }}
          >
            <span style={{ font: "700 11px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".18em", textTransform: "uppercase", color: "#E5C378" }}>
              Colores y estilo detectados
            </span>
            <div style={{ display: "flex", gap: 6 }}>
              {palette.map((hex) => (
                <span key={hex} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                  <span style={{ width: 34, height: 34, borderRadius: 8, background: hex, border: "1px solid rgba(255,255,255,.15)" }} />
                  <span style={{ font: "400 9px 'Plus Jakarta Sans',sans-serif", color: "#9a8f80" }}>{hex}</span>
                </span>
              ))}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <span style={LABEL}>Fuente sugerida</span>
              <span style={{ font: "400 13px 'Plus Jakarta Sans',sans-serif", color: "#F5F2EB" }}>{extraction.font}</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <span style={LABEL}>Estilo de botón</span>
              <span style={{ font: "400 13px 'Plus Jakarta Sans',sans-serif", color: "#F5F2EB" }}>{extraction.buttonStyle}</span>
            </div>
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              style={{ marginTop: 4, padding: 10, border: "1px solid rgba(255,255,255,.1)", borderRadius: 10, background: "none", color: "#C2BEB5", font: "700 10px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".1em", textTransform: "uppercase", cursor: "pointer" }}
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
