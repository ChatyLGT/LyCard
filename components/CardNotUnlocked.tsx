import Link from "next/link";

// Shown at /m/dashboard/company|personal when the member's ProgramMembership
// hasn't been activated yet (PLAN.md Fase 4 creates these cards only once
// MasterN0 marks the interview done) — so there's nothing to edit yet.
export default function CardNotUnlocked({ label }: { label: string }) {
  return (
    <div style={{ minHeight: "100vh", background: "#131313", color: "#e5e2e1", fontFamily: "'Plus Jakarta Sans',sans-serif", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ maxWidth: 360, textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
        <span className="material-symbols-outlined" style={{ fontSize: 34, color: "#C8A15A" }}>
          lock
        </span>
        <h2 style={{ margin: 0, font: "500 20px 'Playfair Display',serif", color: "#F5F2EB" }}>
          Tu tarjeta {label} todavía no está desbloqueada
        </h2>
        <p style={{ margin: 0, font: "400 12.5px/1.6 'Plus Jakarta Sans',sans-serif", color: "#C2BEB5" }}>
          Se activa automáticamente cuando tu entrevista queda marcada como hecha.
        </p>
        <Link
          href="/m/dashboard"
          style={{
            marginTop: 6,
            padding: "10px 18px",
            borderRadius: 999,
            background: "linear-gradient(90deg,#E5C378,#C8A15A 50%,#99732B)",
            color: "#0D0D0D",
            font: "700 11px 'Plus Jakarta Sans',sans-serif",
            letterSpacing: ".12em",
            textTransform: "uppercase",
          }}
        >
          Volver a mi cuenta
        </Link>
      </div>
    </div>
  );
}
