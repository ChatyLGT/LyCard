import Link from "next/link";

// Fase W2/W3 (2026-09-24) -- nav simple entre las 4 pantallas de WowStore
// (Explorar / Mis WowApps / Solicitudes / Perfil), pedida por Gunnar a
// partir de un mockup con tab bar nativa. LyCard no usa tab bar fija en
// ningún otro lado de la app (todo navega con "← Volver"), así que esto
// es una fila de links simples, no un componente de navegación global
// nuevo -- documentado como "fuera de alcance" en PLAN.md.
const TABS = [
  { key: "explorar", label: "Explorar", href: "" },
  { key: "mias", label: "Mis WowApps", href: "/mias" },
  { key: "solicitudes", label: "Solicitudes", href: "/solicitudes" },
  { key: "perfil", label: "Perfil", href: "/perfil" },
] as const;

export default function WowStoreTabs({
  cardId,
  cardSlug,
  active,
}: {
  cardId: string;
  cardSlug: string;
  active: "explorar" | "mias" | "solicitudes" | "perfil";
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {/* Bug real reportado por Gunnar (2026-09-24): ninguna pantalla de
          WowStore volvía a la Oficina -- quedabas atrapado adentro. */}
      <Link
        href={`/c/${cardSlug}/oficina`}
        style={{ color: "var(--ws-ink2,#8a8378)", font: "600 10px var(--ws-font,'Plus Jakarta Sans'),sans-serif", letterSpacing: ".1em", textTransform: "uppercase", textDecoration: "none" }}
      >
        ← Volver a tu tarjeta
      </Link>
      <div style={{ display: "flex", gap: 4, background: "var(--ws-surf,#201f1f)", borderRadius: 12, padding: 4, overflowX: "auto" }}>
        {TABS.map((tab) => {
          const isActive = tab.key === active;
          return (
            <Link
              key={tab.key}
              href={`/m/wowstore${tab.href}?cardId=${cardId}`}
              style={{
                flex: "1 0 auto",
                minWidth: 62,
                textAlign: "center",
                padding: "8px 5px",
                borderRadius: 9,
                textDecoration: "none",
                background: isActive ? "linear-gradient(90deg,var(--ws-accent-light,#E5C378),var(--ws-accent,#C8A15A) 50%,var(--ws-accent-dark,#99732B))" : "none",
                color: isActive ? "var(--ws-bg,#0D0D0D)" : "var(--ws-ink2,#9a8f80)",
                font: "700 10px var(--ws-font,'Plus Jakarta Sans'),sans-serif",
                letterSpacing: ".03em",
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
