// Fallback que sirve el service worker cuando falla la red en una
// navegación pública sin nada guardado todavía. Página estática (nada de
// force-dynamic) para que el propio Next la precachee en el build.
export default function OfflinePage() {
  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        padding: 24,
        textAlign: "center",
        background: "#09090b",
        color: "#f5f2eb",
        font: "400 14px 'Plus Jakarta Sans',sans-serif",
      }}
    >
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: "50%",
          background: "#0B0B0A",
          border: "1px solid #C8A15A",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 20,
        }}
      >
        📡
      </div>
      <p style={{ margin: 0, font: "700 16px 'Plus Jakarta Sans',sans-serif" }}>Sin conexión</p>
      <p style={{ margin: 0, color: "#9c9686", maxWidth: 280 }}>
        No pudimos cargar esta página porque no hay señal y todavía no la habías visitado antes en este
        dispositivo. Probá de nuevo cuando vuelva la conexión.
      </p>
    </div>
  );
}
