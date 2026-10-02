// Stub de PASO 4 (2026-10-02, pedido de Gunnar) -- "Crear mi Gemelo
// Digital" todavía no tiene onboarding real. Página fija, sin lógica,
// hasta que esa fase se construya.
export default function OnboardingPendientePage() {
  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 14,
        padding: 24,
        textAlign: "center",
        background: "#0D0D0D",
        color: "#F5F2EB",
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}
    >
      <span style={{ fontSize: 40 }}>⏳</span>
      <h1 style={{ margin: 0, font: "600 20px 'Playfair Display', serif", color: "#E5C378" }}>
        Tu onboarding está en preparación
      </h1>
      <p style={{ margin: 0, maxWidth: 320, font: "400 13px/1.6 'Plus Jakarta Sans', sans-serif", color: "#C2BEB5" }}>
        Ya anotamos tu interés. Te vamos a avisar en cuanto esté lista la creación de tu Gemelo Digital.
      </p>
    </div>
  );
}
