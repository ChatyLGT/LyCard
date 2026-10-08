import Link from "next/link";
import { redirect } from "next/navigation";
import { readFile } from "fs/promises";
import path from "path";
import { currentAdminScope, isMasterN0Scope } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Centro de Mando -- tile "Metodología" (2026-10-08): el Whitepaper/Menú
// de Acceso Legacy (docs/WHITEPAPER-ADENDA-2026-10-07.md, MENU_ACCESO_LEGACY
// v1.1 + las 8 puertas + metodología LGT) ya existía escrito, solo vivía
// como un archivo .md en el repo -- invisible para Gunnar desde el
// teléfono. Se lee del filesystem en el server y se muestra tal cual, sin
// agregar ninguna librería de markdown: el doc ya es texto plano legible
// con headers/listas simples, pre-wrap alcanza.
export default async function MetodologiaPage() {
  const scope = await currentAdminScope();
  if (!scope) redirect("/admin/login");
  if (!isMasterN0Scope(scope)) redirect(`/admin/programs/${scope.programId}`);

  let content: string;
  try {
    content = await readFile(path.join(process.cwd(), "docs", "WHITEPAPER-ADENDA-2026-10-07.md"), "utf-8");
  } catch {
    content = "No se encontró el documento (docs/WHITEPAPER-ADENDA-2026-10-07.md) en este deploy.";
  }

  return (
    <div style={{ minHeight: "100vh", background: "#131313", color: "#e5e2e1", fontFamily: "'Plus Jakarta Sans',sans-serif", padding: "0 0 60px" }}>
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          background: "rgba(20,20,20,.96)",
          borderBottom: "1px solid rgba(200,161,90,.22)",
          padding: "calc(env(safe-area-inset-top,0px) + 16px) 20px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <Link href="/admin" style={{ color: "#C8A15A", font: "600 10px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".18em", textTransform: "uppercase" }}>
          ← Centro de Mando
        </Link>
        <h1 style={{ margin: 0, font: "500 18px 'Playfair Display',serif", color: "#F5F2EB" }}>Metodología</h1>
      </div>

      <div style={{ maxWidth: 640, margin: "0 auto", padding: "24px 20px" }}>
        <pre
          style={{
            margin: 0,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            background: "#1a1919",
            borderRadius: 14,
            padding: 20,
            color: "#C2BEB5",
            font: "400 12.5px/1.7 'Plus Jakarta Sans',sans-serif",
          }}
        >
          {content}
        </pre>
      </div>
    </div>
  );
}
