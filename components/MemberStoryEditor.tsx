"use client";

import Link from "next/link";
import type { Card } from "@/generated/prisma/client";
import { updateMemberStoryAction } from "@/app/m/dashboard/actions";

export default function MemberStoryEditor({ card, saved }: { card: Card; saved: boolean }) {
  const boundAction = updateMemberStoryAction.bind(null, card.slug);

  return (
    <div style={{ minHeight: "100vh", background: "#131313", color: "#e5e2e1", fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
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
          href="/m/dashboard"
          style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "#eac076", font: "600 10px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".18em", textTransform: "uppercase" }}
        >
          ← Mi cuenta
        </Link>
        <h2 style={{ margin: 0, font: "600 11px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".24em", textTransform: "uppercase", color: "#C8A15A" }}>
          Mi Camino con Legacy
        </h2>
        <Link
          href={`/c/${card.slug}`}
          target="_blank"
          style={{ padding: "7px 13px", borderRadius: 999, background: "linear-gradient(90deg,#E5C378,#C8A15A 50%,#99732B)", color: "#0D0D0D", font: "700 10px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".12em", textTransform: "uppercase" }}
        >
          Ver
        </Link>
      </div>

      <form action={boundAction} style={{ padding: "18px 16px 40px", display: "flex", flexDirection: "column", gap: 20, maxWidth: 520, margin: "0 auto" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <h2 style={{ margin: 0, font: "500 22px 'Playfair Display',serif", color: "#F5F2EB" }}>Mi Camino con Legacy</h2>
          <p style={{ margin: 0, font: "400 12px/1.6 'Plus Jakarta Sans',sans-serif", color: "#C2BEB5" }}>
            Lo que ve quien toca el botón &quot;Mi camino con Legacy&quot; en tu tarjeta — tu propia razón, en tus palabras.
          </p>
          {saved && <p style={{ margin: 0, font: "600 11px 'Plus Jakarta Sans',sans-serif", color: "#8fd19e" }}>✓ Guardado.</p>}
        </div>

        <section style={{ background: "#201f1f", borderRadius: 14, padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <span style={{ font: "500 10px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".16em", textTransform: "uppercase", color: "#C2BEB5" }}>
              Tu frase (aparece como cita destacada)
            </span>
            <div style={{ background: "#0D0D0D", borderRadius: 10, padding: "11px 14px" }}>
              <input
                name="storyQuote"
                defaultValue={card.storyQuote}
                placeholder="Ej. «Porque creo en el Movimiento Laborista.»"
                style={{ width: "100%", background: "none", border: "none", outline: "none", color: "#F5F2EB", font: "italic 400 14px 'Plus Jakarta Sans',sans-serif" }}
              />
            </div>
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <span style={{ font: "500 10px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".16em", textTransform: "uppercase", color: "#C2BEB5" }}>
              Tu historia
            </span>
            <div style={{ background: "#0D0D0D", borderRadius: 10, padding: "11px 14px" }}>
              <textarea
                name="storyBody"
                defaultValue={card.storyBody}
                rows={7}
                placeholder="Contá por qué te sumaste, qué te convenció, qué representa esto para vos."
                style={{ width: "100%", background: "none", border: "none", outline: "none", color: "#F5F2EB", font: "400 13px/1.7 'Plus Jakarta Sans',sans-serif", resize: "vertical" }}
              />
            </div>
          </label>
          <p style={{ margin: 0, font: "400 11px/1.6 'Plus Jakarta Sans',sans-serif", color: "#5A5A5A" }}>
            Dejalo vacío para usar el texto oficial de Legacy mientras tanto.
          </p>
        </section>

        <button
          type="submit"
          style={{ width: "100%", padding: 15, border: "none", borderRadius: 14, background: "linear-gradient(90deg,#E5C378,#C8A15A 50%,#99732B)", color: "#0D0D0D", font: "700 13px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".14em", textTransform: "uppercase", cursor: "pointer" }}
        >
          Guardar
        </button>
      </form>
    </div>
  );
}
