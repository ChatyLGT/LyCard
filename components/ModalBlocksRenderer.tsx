import type { ModalBlock } from "@/lib/modalBlocks";
import { isEmbedVideoUrl, toEmbedVideoUrl } from "@/lib/modalBlocks";

function Icon({ name, size = 18 }: { name: string; size?: number }) {
  return <span className="material-symbols-outlined" style={{ fontSize: size }}>{name}</span>;
}

// Render público de los bloques armados en el dashboard
// (components/ModalBlocksEditor.tsx) -- ver lib/modalBlocks.ts para el
// contexto completo del Editor de Modales (2026-10-04). Un switch por
// kind, nada más -- cada rama es puro display, sin estado.
export default function ModalBlocksRenderer({ blocks }: { blocks: ModalBlock[] }) {
  if (blocks.length === 0) {
    return (
      <p style={{ margin: 0, font: "400 12px 'Plus Jakarta Sans',sans-serif", color: "var(--ink2,#8a8378)" }}>
        Todavía no se armó contenido para este modal.
      </p>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {blocks.map((b) => {
        if (b.kind === "texto") {
          return (
            <section key={b.id} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {b.heading && (
                <h4 style={{ margin: 0, font: "600 13px 'Playfair Display',serif", color: "var(--accentLight,#E5C378)" }}>{b.heading}</h4>
              )}
              {b.body && (
                <p style={{ margin: 0, whiteSpace: "pre-line", font: "400 12px/1.7 'Plus Jakarta Sans',sans-serif", color: "var(--ink2,#C2BEB5)" }}>{b.body}</p>
              )}
            </section>
          );
        }
        if (b.kind === "imagen") {
          return b.mediaUrl ? (
            <figure key={b.id} style={{ margin: 0, display: "flex", flexDirection: "column", gap: 6 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={b.mediaUrl} alt={b.body || ""} style={{ width: "100%", borderRadius: 12, border: "1px solid rgba(var(--accentRgb,200,161,90),.25)" }} />
              {b.body && <figcaption style={{ font: "400 11px 'Plus Jakarta Sans',sans-serif", color: "var(--ink2,#8a8378)" }}>{b.body}</figcaption>}
            </figure>
          ) : null;
        }
        if (b.kind === "video_audio") {
          if (!b.mediaUrl) return null;
          return (
            <section key={b.id} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {b.heading && <span style={{ font: "600 12px 'Plus Jakarta Sans',sans-serif", color: "var(--ink,#F5F2EB)" }}>{b.heading}</span>}
              {b.mediaType === "audio" ? (
                <audio controls src={b.mediaUrl} style={{ width: "100%" }} />
              ) : isEmbedVideoUrl(b.mediaUrl) ? (
                <iframe
                  src={toEmbedVideoUrl(b.mediaUrl)}
                  style={{ width: "100%", aspectRatio: "16/9", borderRadius: 12, border: "1px solid rgba(var(--accentRgb,200,161,90),.25)" }}
                  allow="autoplay; encrypted-media; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <video controls src={b.mediaUrl} style={{ width: "100%", borderRadius: 12, border: "1px solid rgba(var(--accentRgb,200,161,90),.25)" }} />
              )}
            </section>
          );
        }
        if (b.kind === "archivo_link") {
          return b.mediaUrl ? (
            <a
              key={b.id}
              href={b.mediaUrl}
              target="_blank"
              rel="noopener"
              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: 13, borderRadius: 12, border: "1px solid rgba(var(--accentRgb,200,161,90),.4)", color: "var(--accentLight,#E5C378)", font: "700 11.5px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".06em", textTransform: "uppercase", textDecoration: "none" }}
            >
              <Icon name="open_in_new" />
              {b.linkLabel || "Abrir"}
            </a>
          ) : null;
        }
        // kpi
        return (
          <div key={b.id} style={{ display: "flex", flexDirection: "column", gap: 2, padding: "14px 16px", borderRadius: 12, background: "var(--surf,#141414)", border: "1px solid rgba(var(--accentRgb,200,161,90),.25)" }}>
            {b.heading && (
              <span style={{ font: "600 9.5px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".1em", textTransform: "uppercase", color: "var(--ink2,#8a8378)" }}>{b.heading}</span>
            )}
            <span style={{ font: "700 26px 'Playfair Display',serif", color: "var(--accentLight,#E5C378)" }}>{b.kpiValue || "--"}</span>
            {b.kpiSub && <span style={{ font: "400 11px 'Plus Jakarta Sans',sans-serif", color: "var(--ink2,#C2BEB5)" }}>{b.kpiSub}</span>}
          </div>
        );
      })}
    </div>
  );
}
