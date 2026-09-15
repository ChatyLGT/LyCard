import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL;
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;
  if (!adminEmail || !adminPassword) {
    throw new Error(
      "Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD before seeding — no hardcoded default, this repo is public."
    );
  }
  const admin = await prisma.admin.upsert({
    where: { email: adminEmail },
    update: {},
    create: { email: adminEmail, passwordHash: await bcrypt.hash(adminPassword, 10) },
  });
  console.log(`Seeded admin: ${admin.email} (change the password from /admin/account)`);

  const card = await prisma.card.upsert({
    where: { slug: "gunnar" },
    update: {},
    create: {
      slug: "gunnar",
      name: "Gunnar Pareja Ballivian",
      title: "Founding Partner & Strategic Investor",
      quote: "«La experiencia se convierte en legado.»",
      siglas: "O.D.",
      tooltip: "Order of Distinction #042",
      medal: "platino",
      rank: "ancient",
      wa: "+52 998 340 7098",
      ig: "@gunnar.pareja",
      li: "in/gunnarpareja",
      x: "@gpballivian",
    },
  });
  console.log(`Seeded card: /c/${card.slug}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
