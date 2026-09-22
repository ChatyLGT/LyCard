import type { CSSProperties } from "react";
import type { NewsItem } from "@/lib/oficinaExtras";

const kicker: CSSProperties = {
  font: "600 8.5px 'Plus Jakarta Sans',sans-serif",
  letterSpacing: ".16em",
  textTransform: "uppercase",
  color: "#756c5e",
};
const panel: CSSProperties = {
  padding: 12,
  borderRadius: 12,
  background: "rgba(255,255,255,.03)",
  border: "1px solid rgba(200,161,90,.18)",
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("es-AR", { day: "2-digit", month: "short" });
}

// Fase E4 — "Noticias", privado del dueño (mismo criterio que Keep in
// Flow/Check de Realidad): novedades cortas inventadas/editables desde
// OficinaExtrasEditor. isDefault marca cuando son los ejemplos fijos de
// DEFAULT_NEWS_ITEMS, nadie cargó las propias todavía.
export default function NewsTasksBlock({ items, isDefault }: { items: NewsItem[]; isDefault: boolean }) {
  if (items.length === 0) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <span style={kicker}>Noticias</span>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {items.map((item) => (
          <div key={item.id} style={{ ...panel, display: "flex", gap: 10 }}>
            <span style={{ flex: "none", font: "600 9px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".04em", textTransform: "uppercase", color: "#C8A15A", paddingTop: 2 }}>
              {formatDate(item.date)}
            </span>
            <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
              <span style={{ font: "700 12px 'Plus Jakarta Sans',sans-serif", color: "#F3F0E9" }}>{item.title}</span>
              {item.body && <span style={{ font: "400 11px/1.4 'Plus Jakarta Sans',sans-serif", color: "#C2BEB5" }}>{item.body}</span>}
            </div>
          </div>
        ))}
      </div>
      {isDefault && (
        <span style={{ font: "400 9px 'Plus Jakarta Sans',sans-serif", color: "#5A5A5A" }}>
          Noticias de ejemplo — cargá las tuyas desde tu editor.
        </span>
      )}
    </div>
  );
}
