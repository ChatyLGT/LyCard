import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { currentAdminId, currentAdminScope } from "@/lib/auth";
import { changePasswordAction } from "@/app/admin/actions";

export const dynamic = "force-dynamic";

const ERROR_COPY: Record<string, string> = {
  current: "La password actual no coincide.",
  short: "La password nueva tiene que tener al menos 8 caracteres.",
  mismatch: "La confirmación no coincide con la password nueva.",
};

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const { error, saved } = await searchParams;
  const adminId = await currentAdminId();
  if (!adminId) redirect("/admin/login");

  const admin = await prisma.admin.findUnique({ where: { id: adminId } });
  if (!admin) redirect("/admin/login");
  const scope = await currentAdminScope();
  const isMasterN0 = scope !== null && scope.programId === null;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#131313",
        color: "#e5e2e1",
        fontFamily: "'Plus Jakarta Sans',sans-serif",
      }}
    >
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 40,
          background: "rgba(20,20,20,.96)",
          borderBottom: "1px solid rgba(200,161,90,.22)",
          padding: "0 16px",
          height: 64,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Link
          href="/admin"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            color: "#eac076",
            font: "600 10px 'Plus Jakarta Sans',sans-serif",
            letterSpacing: ".18em",
            textTransform: "uppercase",
          }}
        >
          ← Roster
        </Link>
        <h2
          style={{
            margin: 0,
            font: "600 11px 'Plus Jakarta Sans',sans-serif",
            letterSpacing: ".24em",
            textTransform: "uppercase",
            color: "#C8A15A",
          }}
        >
          Mi cuenta
        </h2>
        <span style={{ width: 60 }} />
      </div>

      <div style={{ maxWidth: 440, margin: "0 auto", padding: "24px 20px 60px", display: "flex", flexDirection: "column", gap: 20 }}>
        <div>
          <h1 style={{ margin: 0, font: "500 20px 'Playfair Display',serif", color: "#F5F2EB" }}>
            Cambiar password
          </h1>
          <p style={{ margin: "4px 0 0", font: "400 12px/1.6 'Plus Jakarta Sans',sans-serif", color: "#C2BEB5" }}>
            Cuenta: {admin.email}
          </p>
        </div>

        {saved === "1" && (
          <p style={{ margin: 0, font: "600 11px 'Plus Jakarta Sans',sans-serif", color: "#8fd19e" }}>
            ✓ Password actualizada.
          </p>
        )}
        {error && (
          <p style={{ margin: 0, font: "600 11px 'Plus Jakarta Sans',sans-serif", color: "#e5928a" }}>
            {ERROR_COPY[error] || "No se pudo actualizar la password."}
          </p>
        )}

        <form
          action={changePasswordAction}
          style={{
            background: "#201f1f",
            borderRadius: 14,
            padding: 16,
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          {[
            { name: "currentPassword", label: "Password actual", autoComplete: "current-password" },
            { name: "newPassword", label: "Password nueva", autoComplete: "new-password" },
            { name: "confirmPassword", label: "Confirmar password nueva", autoComplete: "new-password" },
          ].map((f) => (
            <label key={f.name} style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <span
                style={{
                  font: "500 10px 'Plus Jakarta Sans',sans-serif",
                  letterSpacing: ".16em",
                  textTransform: "uppercase",
                  color: "#C2BEB5",
                }}
              >
                {f.label}
              </span>
              <input
                type="password"
                name={f.name}
                required
                autoComplete={f.autoComplete}
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
          ))}

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
            Actualizar password
          </button>
        </form>

        {isMasterN0 && (
          <Link
            href="/admin/login-history"
            style={{ textAlign: "center", font: "600 10px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".14em", textTransform: "uppercase", color: "#5A5A5A" }}
          >
            Ver bitácora de login →
          </Link>
        )}
      </div>
    </div>
  );
}
