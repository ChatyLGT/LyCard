"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { currentAdminScope, isMasterN0Scope } from "@/lib/auth";
import { slugify, uniqueSlug } from "@/lib/slug";
import { EXAMPLE_ESPECIALISTAS } from "@/lib/especialistas";
import { EXAMPLE_EXPERTO } from "@/lib/expertos";

// Fase 5 (2026-09-30) -- CRUD de Especialistas/Expertos, MasterN0-only,
// mismo patrón que app/admin/wowstore/actions.ts. Separado en su propio
// archivo para no infartar el diff de ese archivo existente.
async function requireMasterN0() {
  const scope = await currentAdminScope();
  if (!scope) redirect("/admin/login");
  if (!isMasterN0Scope(scope)) redirect("/admin");
}

// Sembrar "Calma" -- idempotente por key, mismo criterio que
// seedExampleWowAppsAction: nunca pisa una entrada que el N0 ya editó a
// mano.
export async function seedExampleEspecialistaAction() {
  await requireMasterN0();

  let created = 0;
  for (const example of EXAMPLE_ESPECIALISTAS) {
    const existing = await prisma.especialista.findUnique({ where: { key: example.key } });
    if (existing) continue;
    await prisma.especialista.create({
      data: {
        key: example.key,
        nombre: example.nombre,
        trabajo: example.trabajo,
        descripcion: example.descripcion,
        color: example.color,
        toolKeys: example.toolKeys,
        suggestion: example.suggestion,
        industryTags: example.industryTags,
        painPointTags: example.painPointTags,
        basePriceUsd: example.basePriceUsd,
        status: example.status,
        destacado: example.destacado,
      },
    });
    created++;
  }

  revalidatePath("/admin/wowstore");
  redirect(`/admin/wowstore?especialistasSeeded=${created}`);
}

async function requireEspecialista(id: string) {
  const especialista = await prisma.especialista.findUnique({ where: { id } });
  if (!especialista) redirect("/admin/wowstore");
  return especialista;
}

// Instalar un Especialista en una Card real, por slug -- mismo criterio
// "escribile el slug a mano" que el resto de las herramientas de
// MasterN0 que operan sobre una Card puntual (ej. mensajería interna).
// No hay todavía una vidriera pública de "explorar Especialistas" en
// esta ronda (Fase 5, MVP con un solo ejemplo) -- eso es scope de una
// fase futura, junto con el split real de WowStore en 2 secciones.
export async function installEspecialistaAction(especialistaId: string, formData: FormData) {
  await requireMasterN0();
  await requireEspecialista(especialistaId);

  const cardSlug = String(formData.get("cardSlug") || "").trim();
  const card = cardSlug ? await prisma.card.findUnique({ where: { slug: cardSlug } }) : null;
  if (!card) redirect("/admin/wowstore?especialistaError=cardNotFound");

  await prisma.especialistaInstall.upsert({
    where: { cardId_especialistaId: { cardId: card.id, especialistaId } },
    update: {},
    create: { cardId: card.id, especialistaId },
  });

  revalidatePath("/admin/wowstore");
  redirect("/admin/wowstore?especialistaInstalled=1");
}

export async function deleteEspecialistaAction(id: string) {
  await requireMasterN0();
  await requireEspecialista(id);

  // Cascade en EspecialistaInstall (onDelete: Cascade) -- borrar del
  // catálogo se lleva puestas las instalaciones existentes, mismo
  // criterio que deleteWowAppAction.
  await prisma.especialista.delete({ where: { id } });

  revalidatePath("/admin/wowstore");
  redirect("/admin/wowstore?especialistaDeleted=1");
}

// Sembrar el Experto de ejemplo -- a diferencia de una WowApp o un
// Especialista, un Experto SIEMPRE cuelga de un Member real (regla dura
// de la Fase 4), así que sembrar el ejemplo crea también ese Member +
// su Card, marcados como ejemplo en su propio nombre/descripción
// (nunca con datos que puedan confundirse con una persona real).
// Idempotente por key del Experto -- no crea un segundo Member/Card si
// ya corrió antes.
export async function seedExampleExpertoAction() {
  await requireMasterN0();

  const existing = await prisma.experto.findUnique({ where: { key: EXAMPLE_EXPERTO.key } });
  if (existing) {
    revalidatePath("/admin/wowstore");
    redirect("/admin/wowstore?expertosSeeded=0");
  }

  const suffix = Date.now().toString(36);
  const baseSlug = slugify(`experto-${EXAMPLE_EXPERTO.key}-${suffix}`);
  const cardSlugTaken = (slug: string) => prisma.card.findUnique({ where: { slug }, select: { id: true } }).then(Boolean);

  await prisma.$transaction(async (tx) => {
    const member = await tx.member.create({ data: { name: EXAMPLE_EXPERTO.demoMemberName } });

    await tx.card.create({
      data: {
        slug: await uniqueSlug(baseSlug, cardSlugTaken),
        name: EXAMPLE_EXPERTO.demoMemberName,
        title: EXAMPLE_EXPERTO.profesion,
        quote: "Perfil de ejemplo para probar el flujo de consulta a un Experto.",
        kind: "personal",
        memberId: member.id,
        isDemo: true,
      },
    });

    const now = new Date();
    const experto = await tx.experto.create({
      data: {
        key: EXAMPLE_EXPERTO.key,
        memberId: member.id,
        nombrePublico: EXAMPLE_EXPERTO.nombrePublico,
        profesion: EXAMPLE_EXPERTO.profesion,
        esProfesionRegulada: EXAMPLE_EXPERTO.esProfesionRegulada,
        descripcion: EXAMPLE_EXPERTO.descripcion,
        color: EXAMPLE_EXPERTO.color,
        // Pre-consentido y pre-bautizado a propósito: el ejemplo existe
        // para probar el FLUJO de consulta de punta a punta, no el
        // flujo de alta de consentimiento en sí (eso es un toggle
        // manual aparte, ver los botones de abajo en la lista).
        consentGivenAt: now,
        consentScope: ["transcripciones"],
        bautizoStatus: "bautizado",
      },
    });

    for (const entry of EXAMPLE_EXPERTO.seedCodice) {
      await tx.codiceEntry.create({
        data: { expertoId: experto.id, pregunta: entry.pregunta, respuesta: entry.respuesta, aprobadaAt: now },
      });
    }
  });

  revalidatePath("/admin/wowstore");
  redirect("/admin/wowstore?expertosSeeded=1");
}

async function requireExperto(id: string) {
  const experto = await prisma.experto.findUnique({ where: { id } });
  if (!experto) redirect("/admin/wowstore");
  return experto;
}

// Revocar consentimiento -- regla dura de la Fase 4: revocar vuelve el
// Experto no publicable (canPublishExperto en lib/expertos.ts) de
// inmediato. El contenido del Códice queda en DB (no lo borramos acá
// para no destruir historial sin que el propio MasterN0 lo pida
// explícito), pero deja de responder consultas nuevas.
export async function revokeExpertoConsentAction(id: string) {
  await requireMasterN0();
  await requireExperto(id);

  await prisma.experto.update({ where: { id }, data: { consentRevokedAt: new Date() } });

  revalidatePath("/admin/wowstore");
  redirect("/admin/wowstore?expertoRevoked=1");
}

export async function deleteExpertoAction(id: string) {
  await requireMasterN0();
  await requireExperto(id);

  // Cascade en CodiceEntry/Consulta (onDelete: Cascade) -- el Member y
  // su Card NO se borran acá (podrían seguir usando LyCard aunque dejen
  // de ser Experto), solo el perfil de Experto en sí.
  await prisma.experto.delete({ where: { id } });

  revalidatePath("/admin/wowstore");
  redirect("/admin/wowstore?expertoDeleted=1");
}
