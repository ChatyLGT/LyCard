import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentAdminScope, canAccessProgram } from "@/lib/auth";
import { buildExport } from "@/lib/programJson";
import { loadProgramState } from "@/lib/programJsonDb";

// Descarga el Programa (con sus tarjetas) como .json: punto de partida para
// editar y volver a subir, y prueba de ida y vuelta. MasterN0 o el N0 del
// propio Programa.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const scope = await currentAdminScope();
  if (!scope) return new NextResponse("No autorizado", { status: 401 });
  if (!canAccessProgram(scope, id)) return new NextResponse("No autorizado", { status: 403 });

  const program = await prisma.program.findUnique({ where: { id }, select: { slug: true } });
  if (!program) return new NextResponse("No existe", { status: 404 });
  const loaded = await loadProgramState(program.slug);
  if (!loaded) return new NextResponse("No existe", { status: 404 });

  const body = JSON.stringify(buildExport(loaded.state, { exportedFrom: "lycard", exportedAt: new Date().toISOString() }), null, 2);
  return new NextResponse(body, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${program.slug}.program.json"`,
      "Cache-Control": "no-store",
    },
  });
}
