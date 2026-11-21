import "dotenv/config";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Alta directa de la LyCard de Billy Springall (tarjeta personal) en el
// Programa Legacy — instalación por código, sin paso manual en el admin.
// Forma parte del proceso mínimo de arquetipo previo al Golden Ticket
// (orden de Gunnar, N0, 2026-11-20): foto real confirmada → avatar
// canónico aprobado → arquetipo de capa pública verificada → ESTA LyCard
// instalada → recién ahí se emite el Golden Ticket.
//
// Idempotente: la tarjeta se identifica por su slug y una segunda corrida
// no la duplica ni pisa ediciones posteriores (update vacío, mismo
// criterio que prisma/seed.ts).
// Run with: npx tsx prisma/seed-billy-springall.ts

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const program = await prisma.program.findUnique({ where: { slug: "legacy" } });
  if (!program) {
    console.warn(
      "Programa 'legacy' no encontrado — la tarjeta se crea sin programa. Corré antes prisma/seed-legacy-program.ts si hace falta el vínculo."
    );
  }

  const card = await prisma.card.upsert({
    where: { slug: "billy-springall" },
    update: {},
    create: {
      slug: "billy-springall",
      name: "Billy Springall",
      title: "Arquitecto · Director de Springall+MK",
      quote: "«Antropogénicamente positivo»",
      kind: "personal",
      storyQuote: "«La paz-ciencia: construir los espacios donde la vida sucede.»",
      storyBody:
        "Arquitecto (CDMX, 1962). En 1988 cofundó Springall+Lira con Miguel Ángel Lira. Su obra incluye el Call Center Santander de Querétaro —el icónico OVNI—, las fachadas de Liverpool y la arquitectura interior de Mítikah; en 2019 recibió el Premio Interceramic de Arquitectura Comercial por el CAT Liverpool de Morelia. Hoy dirige Springall+MK, es docente universitario y es el autor y director de Mayan City, la comunidad antropogénicamente positiva de la Ruta de los Cenotes, concebida junto a Gunnar Pareja.",
      // Sin medal/contacts cargados: la tarjeta arranca en el primer nivel
      // de la escala del Programa (rank aprendiz, como toda tarjeta nueva).
      rank: "aprendiz",
      ig: "@billyspringall",
      web: "https://springall-mk.com",
      email: "elsy@springall-mk.com",
      location: "Ciudad de México",
      defaultTheme: "dark",
      defaultLang: "es",
      programId: program?.id ?? null,
    },
  });
  console.log(`Seeded card: /c/${card.slug} (program: ${program?.slug ?? "sin programa"})`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
