import "dotenv/config";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Fusión de identidad, etapa 2: siembra al ÚNICO MasterN0 (Gunnar) como Member
// con PlatformRole "masterN0". Se corre a mano, una vez por entorno:
//   MASTER_N0_EMAIL=<su email de Google> pnpm db:seed:master
// Nunca hay formulario para esto (docs/11-DISENO-FUSION-IDENTIDAD.md §3.1).
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const email = process.env.MASTER_N0_EMAIL?.trim().toLowerCase();
  if (!email) throw new Error("Falta MASTER_N0_EMAIL (el email de Google del MasterN0).");

  const existing = await prisma.platformRole.findFirst({ where: { role: "masterN0" }, include: { member: true } });
  if (existing && existing.member.email.toLowerCase() !== email) {
    throw new Error(`Ya hay un MasterN0 (${existing.member.email}). Solo puede haber uno; no se cambia por script.`);
  }

  const member =
    (await prisma.member.findFirst({ where: { email: { equals: email, mode: "insensitive" } } })) ??
    (await prisma.member.create({ data: { email, name: "MasterN0" } }));

  await prisma.platformRole.upsert({
    where: { memberId: member.id },
    update: {},
    create: { memberId: member.id, role: "masterN0" },
  });
  console.log(`MasterN0 sembrado: ${email}`);
}

main().finally(() => prisma.$disconnect());
