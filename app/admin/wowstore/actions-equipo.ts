"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { currentAdminScope, isMasterN0Scope } from "@/lib/auth";
import { slugify, uniqueSlug } from "@/lib/slug";
import { EXAMPLE_ESPECIALISTAS } from "@/lib/especialistas";
import { EXAMPLE_EXPERTO, EXAMPLE_EXPERTO_EQUIPO, parseRango } from "@/lib/expertos";

// Fase 5 (2026-09-30) -- CRUD de Especialistas/Expertos, MasterN0-only,
// mismo patrón que app/admin/wowstore/actions.ts. Separado en su propio
// archivo para no infartar el diff de ese archivo existente.
async function requireMasterN0() {
  const scope = await currentAdminScope();
  if (!scope) redirect("/admin/login");
  if (!isMasterN0Scope(scope)) redirect("/admin");
  return scope;
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
        habilidades: example.habilidades,
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
// ya corrió antes. Fase 6: además nace YA en rango "experto" con su
// CV y 3 especialistas de ejemplo reclutados a su equipo -- sembrar el
// ejemplo no pasa por el ascenso manual real (eso sigue siendo
// promoverAExpertoAction, MasterN0-only), es solo para que WowHead no
// arranque vacío.
export async function seedExampleExpertoAction() {
  const scope = await requireMasterN0();

  const existing = await prisma.experto.findUnique({ where: { key: EXAMPLE_EXPERTO.key } });
  if (existing) {
    revalidatePath("/admin/wowstore");
    redirect("/admin/wowstore?expertosSeeded=0");
  }

  const suffix = Date.now().toString(36);
  const cardSlugTaken = (slug: string) => prisma.card.findUnique({ where: { slug }, select: { id: true } }).then(Boolean);

  async function crearLegacyPublicado(
    tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
    nombre: string,
    profesion: string,
    key: string
  ) {
    const member = await tx.member.create({ data: { name: nombre } });
    await tx.card.create({
      data: {
        slug: await uniqueSlug(slugify(`experto-${key}-${suffix}`), cardSlugTaken),
        name: nombre,
        title: profesion,
        quote: "Perfil de ejemplo para probar WowHead.",
        kind: "personal",
        memberId: member.id,
        isDemo: true,
      },
    });
    const now = new Date();
    return tx.experto.create({
      data: {
        key,
        memberId: member.id,
        nombrePublico: nombre,
        profesion,
        descripcion: `Perfil de EJEMPLO -- especialista del equipo de ${EXAMPLE_EXPERTO.nombrePublico}.`,
        color: EXAMPLE_EXPERTO.color,
        // Pre-consentido y pre-bautizado a propósito, mismo criterio que
        // el Experto principal: el ejemplo existe para probar el FLUJO
        // de punta a punta, no el alta de consentimiento en sí.
        consentGivenAt: now,
        consentScope: ["transcripciones"],
        bautizoStatus: "bautizado",
      },
    });
  }

  await prisma.$transaction(async (tx) => {
    const member = await tx.member.create({ data: { name: EXAMPLE_EXPERTO.demoMemberName } });

    await tx.card.create({
      data: {
        slug: await uniqueSlug(slugify(`experto-${EXAMPLE_EXPERTO.key}-${suffix}`), cardSlugTaken),
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
        consentGivenAt: now,
        consentScope: ["transcripciones"],
        bautizoStatus: "bautizado",
        rango: "experto",
        promovidoAExpertoAt: now,
        promovidoPorAdminId: scope.id,
        experiencia: EXAMPLE_EXPERTO.experiencia,
        especialidades: EXAMPLE_EXPERTO.especialidades,
      },
    });

    for (const entry of EXAMPLE_EXPERTO.seedCodice) {
      await tx.codiceEntry.create({
        data: { expertoId: experto.id, pregunta: entry.pregunta, respuesta: entry.respuesta, aprobadaAt: now },
      });
    }

    for (let i = 0; i < EXAMPLE_EXPERTO_EQUIPO.length; i++) {
      const miembro = EXAMPLE_EXPERTO_EQUIPO[i];
      const especialista = await crearLegacyPublicado(tx, miembro.demoMemberName, miembro.profesion, `${EXAMPLE_EXPERTO.key}-equipo-${i}-${suffix}`);
      await tx.experto.update({ where: { id: especialista.id }, data: { recruitedById: experto.id } });
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

// Ascenso a Experto (Fase 6, WowHead) -- NUNCA automático, aunque el
// Legacy arme un equipo por su cuenta. Solo MasterN0 puede aprobarlo,
// mismo criterio que la regla dura de la Fase 1 (nadie se auto-otorga
// más alcance del que tiene). Un Silicio nunca llega acá -- este
// archivo solo opera sobre `Experto` (Legacy), el modelo `Especialista`
// (Silicio) ni siquiera tiene el campo `rango`.
export async function promoverAExpertoAction(id: string) {
  const scope = await requireMasterN0();
  const experto = await requireExperto(id);

  if (parseRango(experto.rango) === "experto") {
    redirect("/admin/wowstore?expertoPromovido=0");
  }

  await prisma.experto.update({
    where: { id },
    data: { rango: "experto", promovidoAExpertoAt: new Date(), promovidoPorAdminId: scope.id },
  });

  revalidatePath("/admin/wowstore");
  redirect("/admin/wowstore?expertoPromovido=1");
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
