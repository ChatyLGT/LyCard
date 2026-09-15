"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { currentAdminScope } from "@/lib/auth";
import { MEDALS, RANKS } from "@/lib/data";

const CONFIRM_PHRASE = "BORRAR TODO";

// MasterN0-only, one-shot reset of the whole platform back to a single
// seed identity: every Card, Program, Puesto, Member, Membership,
// Registration and scoped N0 Admin is deleted, and the one Card left is
// "MasterN0" — the root identity Programs get created from. Gunnar's own
// MasterN0 login survives (nothing about resetting the data should log
// out the person doing the reset). Guarded by scope + a typed
// confirmation phrase, both checked server-side — never trust the
// client-side gate alone for something this irreversible.
export async function resetPlatformAction(formData: FormData) {
  const scope = await currentAdminScope();
  if (!scope) redirect("/admin/login");
  if (scope.programId) redirect("/admin");

  const confirm = String(formData.get("confirm") || "").trim();
  if (confirm !== CONFIRM_PHRASE) {
    redirect("/admin/reset?error=confirm");
  }

  await prisma.$transaction([
    prisma.registration.deleteMany(),
    prisma.originMemento.deleteMany(),
    prisma.programMembership.deleteMany(),
    prisma.card.deleteMany(),
    prisma.otpCode.deleteMany(),
    prisma.admin.deleteMany({ where: { id: { not: scope.id } } }),
    prisma.puesto.deleteMany(),
    prisma.member.deleteMany(),
    prisma.program.deleteMany(),
    prisma.card.create({
      data: {
        slug: "mastern0",
        name: "MasterN0",
        title: "",
        quote: "",
        medal: MEDALS[2].id,
        rank: RANKS[1].id,
      },
    }),
  ]);

  revalidatePath("/admin");
  revalidatePath("/admin/programs");
  redirect("/admin/programs?reset=1");
}
