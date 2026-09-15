import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { createCardAction, logoutAction } from "@/app/admin/actions";

export const dynamic = "force-dynamic";

export default async function AdminRosterPage() {
  const cards = await prisma.card.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#131313",
        color: "#e5e2e1",
        fontFamily: "'Plus Jakarta Sans',sans-serif",
        padding: "0 0 60px",
      }}
    >
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          background: "rgba(20,20,20,.96)",
          borderBottom: "1px solid rgba(200,161,90,.22)",
          padding: "16px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <div>
          <span
            style={{
              font: "600 10px 'Plus Jakarta Sans',sans-serif",
              letterSpacing: ".24em",
              textTransform: "uppercase",
              color: "#C8A15A",
            }}
          >
            Roster Legacy
          </span>
          <h1 style={{ margin: 0, font: "500 20px 'Playfair Display',serif", color: "#F5F2EB" }}>
            LyCards
          </h1>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Link
            href="/admin/account"
            style={{
              background: "none",
              border: "1px solid rgba(200,161,90,.3)",
              borderRadius: 999,
              padding: "8px 14px",
              color: "#C2BEB5",
              font: "600 10px 'Plus Jakarta Sans',sans-serif",
              letterSpacing: ".1em",
              textTransform: "uppercase",
              display: "inline-flex",
              alignItems: "center",
            }}
          >
            Mi cuenta
          </Link>
          <form action={logoutAction}>
            <button
              type="submit"
              style={{
                background: "none",
                border: "1px solid rgba(200,161,90,.3)",
                borderRadius: 999,
                padding: "8px 14px",
                color: "#C2BEB5",
                font: "600 10px 'Plus Jakarta Sans',sans-serif",
                letterSpacing: ".1em",
                textTransform: "uppercase",
                cursor: "pointer",
              }}
            >
              Cerrar sesión
            </button>
          </form>
        </div>
      </div>

      <div style={{ maxWidth: 640, margin: "0 auto", padding: "24px 20px", display: "flex", flexDirection: "column", gap: 24 }}>
        <section
          style={{
            background: "#201f1f",
            borderRadius: 14,
            padding: 18,
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <h2 style={{ margin: 0, font: "600 14px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".08em", textTransform: "uppercase", color: "#F5F2EB" }}>
            Nueva LyCard
          </h2>
          <form action={createCardAction} style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <input
              name="name"
              placeholder="Nombre completo"
              required
              style={{
                flex: "1 1 200px",
                background: "#0D0D0D",
                border: "1px solid rgba(200,161,90,.3)",
                borderRadius: 10,
                padding: "10px 14px",
                color: "#F5F2EB",
                font: "400 13px 'Plus Jakarta Sans',sans-serif",
                outline: "none",
              }}
            />
            <input
              name="slug"
              placeholder="slug (opcional)"
              style={{
                flex: "1 1 140px",
                background: "#0D0D0D",
                border: "1px solid rgba(200,161,90,.3)",
                borderRadius: 10,
                padding: "10px 14px",
                color: "#F5F2EB",
                font: "400 13px 'Plus Jakarta Sans',sans-serif",
                outline: "none",
              }}
            />
            <button
              type="submit"
              style={{
                padding: "10px 18px",
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
              Crear
            </button>
          </form>
        </section>

        <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {cards.length === 0 && (
            <p style={{ color: "#C2BEB5", font: "400 13px 'Plus Jakarta Sans',sans-serif" }}>
              Todavía no hay LyCards. Creá la primera arriba.
            </p>
          )}
          {cards.map((card) => (
            <div
              key={card.id}
              style={{
                background: "#201f1f",
                borderRadius: 12,
                padding: 14,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <div style={{ minWidth: 0 }}>
                <p style={{ margin: 0, font: "600 14px 'Plus Jakarta Sans',sans-serif", color: "#F5F2EB" }}>
                  {card.name || "(sin nombre)"}
                </p>
                <p style={{ margin: 0, font: "400 11px 'Plus Jakarta Sans',sans-serif", color: "#C8A15A" }}>
                  /c/{card.slug}
                </p>
              </div>
              <div style={{ display: "flex", gap: 8, flex: "none" }}>
                <Link
                  href={`/c/${card.slug}`}
                  target="_blank"
                  style={{
                    padding: "7px 12px",
                    borderRadius: 8,
                    background: "#2a2a2a",
                    color: "#e5e2e1",
                    font: "600 10px 'Plus Jakarta Sans',sans-serif",
                    letterSpacing: ".08em",
                    textTransform: "uppercase",
                  }}
                >
                  Ver
                </Link>
                <Link
                  href={`/admin/${card.slug}`}
                  style={{
                    padding: "7px 12px",
                    borderRadius: 8,
                    background: "linear-gradient(90deg,#E5C378,#C8A15A 50%,#99732B)",
                    color: "#0D0D0D",
                    font: "700 10px 'Plus Jakarta Sans',sans-serif",
                    letterSpacing: ".08em",
                    textTransform: "uppercase",
                  }}
                >
                  Editar
                </Link>
              </div>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
