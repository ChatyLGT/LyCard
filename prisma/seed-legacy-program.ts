import "dotenv/config";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// One-off, idempotent: creates the Legacy Program row and bootstraps
// Gunnar as its root Member/ProgramMembership, and backfills his existing
// Card with kind/memberId/programId. Nothing in the app reads these yet
// (PLAN.md Phase 0 is schema-only) — this just seeds the data so Phase 2+
// has something real to build against instead of starting from empty.
//
// Safe to re-run: every step checks for an existing row first.
// Run with: npx tsx prisma/seed-legacy-program.ts

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const gunnarCard = await prisma.card.findUnique({ where: { slug: "gunnar" } });
  if (!gunnarCard) {
    throw new Error("No card with slug 'gunnar' found — run the regular seed first.");
  }

  const program = await prisma.program.upsert({
    where: { slug: "legacy" },
    update: {},
    create: {
      slug: "legacy",
      name: "Legacy",
      primaryColor: "#C8A15A",
      // Placeholder — copied from Gunnar's card as a starting point.
      // Replace with the program's real official channels when you have them.
      wa: gunnarCard.wa,
      ig: gunnarCard.ig,
      li: gunnarCard.li,
      x: gunnarCard.x,
      fb: gunnarCard.fb,
      tiktok: gunnarCard.tiktok,
      yt: gunnarCard.yt,
      web: gunnarCard.web,
      videoThumbnailUrl: gunnarCard.videoThumbnailUrl,
    },
  });
  console.log(`Program: ${program.slug} (${program.id})`);

  const member = await prisma.member.upsert({
    where: { whatsapp: gunnarCard.wa || "gunnar-bootstrap" },
    update: {},
    create: {
      whatsapp: gunnarCard.wa || "gunnar-bootstrap",
      name: gunnarCard.name,
      email: "",
    },
  });
  console.log(`Member: ${member.name} (${member.id})`);

  const membership = await prisma.programMembership.upsert({
    where: { memberId_programId: { memberId: member.id, programId: program.id } },
    update: {},
    create: {
      memberId: member.id,
      programId: program.id,
      referredByMembershipId: null, // root of the tree — bootstrapped, no host
      status: "active",
    },
  });
  console.log(`Membership: ${membership.status} (${membership.id})`);

  await prisma.card.update({
    where: { id: gunnarCard.id },
    data: { kind: "project", memberId: member.id, programId: program.id },
  });
  console.log(`Card '${gunnarCard.slug}' backfilled: kind=project, linked to Member+Program.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
