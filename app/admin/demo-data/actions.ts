"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { currentAdminScope, isMasterN0Scope } from "@/lib/auth";
import { MEDALS, RANKS } from "@/lib/data";
import { slugify, uniqueSlug } from "@/lib/slug";
import { clampDemoCount, demoNameFor, DEMO_CONFIRM_PHRASE } from "@/lib/demoData";

async function requireMasterN0() {
  const scope = await currentAdminScope();
  if (!scope) redirect("/admin/login");
  if (!isMasterN0Scope(scope)) redirect("/admin");
}

const cardSlugTaken = (slug: string) => prisma.card.findUnique({ where: { slug }, select: { id: true } }).then(Boolean);
const programSlugTaken = (slug: string) => prisma.program.findUnique({ where: { slug }, select: { id: true } }).then(Boolean);

// Genera N Programas de prueba, cada uno con sus 3 Cards (project ligada
// al Programa, company/personal independientes — mismo criterio que
// mastern0 y cualquier Card sin Member: memberId nulo, no hace falta un
// Member falso para que se vea y funcione en /admin y /c/[slug]).
// Todo marcado isDemo:true (Fase E1) para poder identificarlo y borrarlo
// en bloque después, nunca mezclado con el roster real. Los campos de
// Oficina Virtual (KPIs/noticias/calendario/frases) se dejan vacíos a
// propósito — la Oficina ya sabe caer sola a sus DEFAULT_* con la
// etiqueta de "ejemplo" (Fase E1-E4), no hace falta duplicar ese
// contenido acá.
export async function generateDemoDataAction(formData: FormData) {
  await requireMasterN0();

  const count = clampDemoCount(formData.get("count"));
  const suffix = Date.now().toString(36);

  await prisma.$transaction(
    async (tx) => {
      for (let i = 1; i <= count; i++) {
        const name = demoNameFor(i);
        const baseSlug = slugify(`demo-${name}-${suffix}-${i}`);

        const program = await tx.program.create({
          data: {
            slug: await uniqueSlug(baseSlug, programSlugTaken),
            name: `Demo — Legacy de ${name}`,
            isDemo: true,
          },
        });

        await tx.card.createMany({
          data: [
            {
              slug: await uniqueSlug(baseSlug, cardSlugTaken),
              name,
              title: "N0 de Programa",
              quote: "Mi legado no espera a que esté listo.",
              medal: MEDALS[2].id,
              rank: RANKS[1].id,
              kind: "project",
              programId: program.id,
              isDemo: true,
            },
            {
              slug: await uniqueSlug(`${baseSlug}-business`, cardSlugTaken),
              name: `${name} Studio`,
              title: "Fundador/a",
              quote: "Un negocio de ejemplo para probar la Oficina Virtual.",
              medal: MEDALS[2].id,
              rank: RANKS[1].id,
              kind: "company",
              isDemo: true,
            },
            {
              slug: await uniqueSlug(`${baseSlug}-personal`, cardSlugTaken),
              name,
              title: "Persona de ejemplo",
              quote: "Una tarjeta personal de ejemplo para probar la Oficina Virtual.",
              medal: MEDALS[2].id,
              rank: RANKS[1].id,
              kind: "personal",
              isDemo: true,
            },
          ],
        });
      }
    },
    { timeout: 20_000 }
  );

  revalidatePath("/admin");
  revalidatePath("/admin/programs");
  revalidatePath("/admin/demo-data");
  redirect(`/admin/demo-data?generated=${count}`);
}

// Borra TODO lo marcado isDemo:true — Cards primero (tienen programId
// apuntando a un Programa demo, hay que sacarlas antes de borrar el
// Programa o la FK lo impide), Programas después. Guardado por scope +
// una frase escrita a mano, mismo patrón exacto que
// app/admin/reset-actions.ts#resetPlatformAction — nunca confiar en el
// gate del cliente solo para algo irreversible, aunque acá "irreversible"
// sea mucho menos grave (solo se pierde data de prueba).
export async function deleteAllDemoDataAction(formData: FormData) {
  await requireMasterN0();

  const confirm = String(formData.get("confirm") || "").trim();
  if (confirm !== DEMO_CONFIRM_PHRASE) {
    redirect("/admin/demo-data?error=confirm");
  }

  await prisma.$transaction([
    prisma.card.deleteMany({ where: { isDemo: true } }),
    prisma.program.deleteMany({ where: { isDemo: true } }),
  ]);

  revalidatePath("/admin");
  revalidatePath("/admin/programs");
  revalidatePath("/admin/demo-data");
  redirect("/admin/demo-data?deleted=1");
}
