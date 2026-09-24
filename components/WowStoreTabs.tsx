import Link from "next/link";

// Fase W2 (2026-09-24) -- nav simple entre las 3 pantallas de WowStore
// (Explorar / Mis WowApps / Solicitudes), pedida por Gunnar a partir de
// un mockup con tab bar nativa. LyCard no usa tab bar fija en ningún
// otro lado de la app (todo navega con "← Volver"), así que esto es
// una fila de links simples, no un componente de navegación global
// nuevo -- documentado como "fuera de alcance" en PLAN.md.
const TABS = [
  { key: "explorar", label: "Explorar", href: "" },
  { key: "mias", label: "Mis WowApps", href: "/mias" },
  { key: "solicitudes", label: "Solicitudes", href: "/solicitudes" },
] as const;

export default function WowStoreTabs({
  cardId,
  cardSlug,
  active,
}: {
  cardId: string;
  cardSlug: string;
  active: "explorar" | "mias" | "solicitudes";
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {/* Bug real reportado por Gunnar (2026-09-24): ninguna pantalla de
          WowStore volvía a la Oficina -- quedabas atrapado adentro. */}
      <Link
        href={`/c/${cardSlug}/oficina`}
        style={{ color: "#8a8378", font: "600 10px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".1em", textTransform: "uppercase", textDecoration: "none" }}
      >
        ← Volver a tu tarjeta
      </Link>
      <div style={{ display: "flex", gap: 6, background: "#201f1f", borderRadius: 12, padding: 4 }}>
        {TABS.map((tab) => {
          const isActive = tab.key === active;
          return (
            <Link
              key={tab.key}
              href={`/m/wowstore${tab.href}?cardId=${cardId}`}
              style={{
                flex: 1,
                textAlign: "center",
                padding: "8px 6px",
                borderRadius: 9,
                textDecoration: "none",
                background: isActive ? "linear-gradient(90deg,#E5C378,#C8A15A 50%,#99732B)" : "none",
                color: isActive ? "#0D0D0D" : "#9a8f80",
                font: "700 10.5px 'Plus Jakarta Sans',sans-serif",
                letterSpacing: ".04em",
              }}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
