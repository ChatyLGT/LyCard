"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateMemberEmailAction } from "@/app/m/actions";

export default function MemberEmailCapture() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  if (done) {
    return (
      <p style={{ margin: 0, font: "600 12px 'Plus Jakarta Sans',sans-serif", color: "#8fd19e" }}>
        ✓ Listo, gracias.
      </p>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <p style={{ margin: 0, font: "400 12px/1.6 'Plus Jakarta Sans',sans-serif", color: "#C2BEB5" }}>
        Nos falta tu email — lo usamos para novedades del programa, no es tu credencial de acceso.
      </p>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="nombre@correo.com"
          style={{
            flex: 1,
            background: "#0D0D0D",
            border: "1px solid rgba(200,161,90,.3)",
            borderRadius: 10,
            padding: "10px 12px",
            color: "#F5F2EB",
            font: "400 13px 'Plus Jakarta Sans',sans-serif",
            outline: "none",
          }}
        />
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              setError(null);
              const res = await updateMemberEmailAction({ email });
              if (res.ok) {
                setDone(true);
                router.refresh();
              } else {
                setError("Email inválido.");
              }
            })
          }
          style={{
            padding: "0 16px",
            border: "none",
            borderRadius: 10,
            background: "linear-gradient(90deg,#E5C378,#C8A15A 50%,#99732B)",
            color: "#0D0D0D",
            font: "700 11px 'Plus Jakarta Sans',sans-serif",
            letterSpacing: ".08em",
            textTransform: "uppercase",
            cursor: pending ? "default" : "pointer",
            opacity: pending ? 0.7 : 1,
          }}
        >
          {pending ? "..." : "Guardar"}
        </button>
      </div>
      {error && <span style={{ font: "600 11px 'Plus Jakarta Sans',sans-serif", color: "#e5928a" }}>{error}</span>}
    </div>
  );
}
