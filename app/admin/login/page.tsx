import { loginAction } from "@/app/admin/actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { error, next } = await searchParams;

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#09090b",
        padding: 24,
        fontFamily: "'Plus Jakarta Sans',sans-serif",
      }}
    >
      <form
        action={loginAction}
        style={{
          width: "100%",
          maxWidth: 360,
          display: "flex",
          flexDirection: "column",
          gap: 16,
          background: "#141414",
          border: "1px solid rgba(200,161,90,.3)",
          borderRadius: 20,
          padding: 28,
          boxShadow: "0 16px 40px rgba(0,0,0,.6)",
        }}
      >
        <input type="hidden" name="next" value={next || "/admin"} />
        <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 8 }}>
          <span
            style={{
              font: "600 10px 'Plus Jakarta Sans',sans-serif",
              letterSpacing: ".24em",
              textTransform: "uppercase",
              color: "#C8A15A",
            }}
          >
            Acceso Fiduciario
          </span>
          <h1 style={{ margin: 0, font: "500 22px 'Playfair Display',serif", color: "#F5F2EB" }}>
            Panel de administración
          </h1>
        </div>

        {error && (
          <p style={{ margin: 0, color: "#e5928a", font: "500 12px 'Plus Jakarta Sans',sans-serif" }}>
            Password incorrecta.
          </p>
        )}

        <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <span
            style={{
              font: "500 10px 'Plus Jakarta Sans',sans-serif",
              letterSpacing: ".16em",
              textTransform: "uppercase",
              color: "#C2BEB5",
            }}
          >
            Master Password
          </span>
          <input
            type="password"
            name="password"
            required
            autoFocus
            style={{
              background: "#0D0D0D",
              border: "1px solid rgba(200,161,90,.3)",
              borderRadius: 10,
              padding: "11px 14px",
              color: "#F5F2EB",
              font: "400 14px 'Plus Jakarta Sans',sans-serif",
              outline: "none",
            }}
          />
        </label>

        <button
          type="submit"
          style={{
            marginTop: 4,
            padding: 14,
            border: "none",
            borderRadius: 12,
            background: "linear-gradient(90deg,#E5C378,#C8A15A 50%,#99732B)",
            color: "#0D0D0D",
            font: "700 12px 'Plus Jakarta Sans',sans-serif",
            letterSpacing: ".14em",
            textTransform: "uppercase",
            cursor: "pointer",
          }}
        >
          Entrar
        </button>
      </form>
    </div>
  );
}
