import { unlockRecipientAction } from "@/app/c/recipient-gate-actions";

// Gate de tarjeta completa para Invitado/Visitante Especial (2026-10-05).
// Reemplaza TODO el render de LyCardView -- no es un modal, es la pantalla
// entera hasta que confirme la palabra secreta que le llegó junto a la
// invitación. Estética mínima a propósito (sin branding del Programa
// todavía: eso es justamente lo que está detrás del gate).
export default function RecipientGate({
  cardSlug,
  recipientSlug,
  recipientNombre,
  error,
}: {
  cardSlug: string;
  recipientSlug: string;
  recipientNombre: string;
  error?: string;
}) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0D0D0D",
        color: "#F5F2EB",
        fontFamily: "'Plus Jakarta Sans',sans-serif",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "calc(env(safe-area-inset-top,0px) + 24px) 24px 24px",
      }}
    >
      <div style={{ maxWidth: 360, width: "100%", display: "flex", flexDirection: "column", gap: 16, textAlign: "center" }}>
        <span style={{ font: "600 10px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".24em", textTransform: "uppercase", color: "#C8A15A" }}>
          Invitación personal
        </span>
        <h1 style={{ margin: 0, font: "500 22px 'Playfair Display',serif", color: "#F5F2EB" }}>
          {recipientNombre ? `Para ${recipientNombre}` : "Tu tarjeta personal"}
        </h1>
        <p style={{ margin: 0, font: "400 13px/1.6 'Plus Jakarta Sans',sans-serif", color: "#8a8378" }}>
          Ingresá la palabra secreta que recibiste junto a esta invitación.
        </p>

        <form action={unlockRecipientAction.bind(null, cardSlug, recipientSlug)} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <input
            name="palabraSecreta"
            type="text"
            autoFocus
            placeholder="Palabra secreta"
            style={{
              background: "#201f1f",
              border: "1px solid rgba(200,161,90,.3)",
              borderRadius: 10,
              padding: "12px 16px",
              color: "#F5F2EB",
              font: "400 14px 'Plus Jakarta Sans',sans-serif",
              outline: "none",
              textAlign: "center",
            }}
          />
          {error === "wrong" && (
            <p style={{ margin: 0, font: "600 11px 'Plus Jakarta Sans',sans-serif", color: "#e5928a" }}>Esa no es -- probá de nuevo.</p>
          )}
          {error === "empty" && (
            <p style={{ margin: 0, font: "600 11px 'Plus Jakarta Sans',sans-serif", color: "#e5928a" }}>Ingresá la palabra secreta.</p>
          )}
          <button
            type="submit"
            style={{
              padding: "12px 18px",
              border: "none",
              borderRadius: 10,
              background: "linear-gradient(90deg,#E5C378,#C8A15A 50%,#99732B)",
              color: "#0D0D0D",
              font: "700 11px 'Plus Jakarta Sans',sans-serif",
              letterSpacing: ".1em",
              textTransform: "uppercase",
              cursor: "pointer",
            }}
          >
            Abrir mi tarjeta
          </button>
        </form>
      </div>
    </div>
  );
}
