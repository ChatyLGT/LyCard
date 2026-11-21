import "dotenv/config";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Alta directa de la LyCard de Javier González Alcántara Cáceres (tarjeta
// personal) en el Programa Legacy — instalación por código, sin paso
// manual en el admin. Forma parte del proceso mínimo de arquetipo previo
// al Golden Ticket (orden de Gunnar, N0, 2026-11-20): foto real
// confirmada → avatar canónico aprobado → arquetipo de capa pública
// verificada → ESTA LyCard instalada → Golden Ticket ya emitido (su
// activación es la puerta de consentimiento de Javier).
//
// Datos SOLO de la capa pública verificada: su CV 2026 (enviado por él)
// y su correo dicho por él en el chat. Sin portraitUrl, sin WhatsApp y
// sin Instagram (no confirmado en ninguna fuente).
//
// Idempotente: la tarjeta se identifica por su slug y una segunda corrida
// no la duplica ni pisa ediciones posteriores (update vacío, mismo
// criterio que prisma/seed.ts y prisma/seed-billy-springall.ts).
// Run with: npx tsx prisma/seed-javier-gonzalez.ts

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
    where: { slug: "javier-gonzalez" },
    update: {},
    create: {
      slug: "javier-gonzalez",
      name: "Javier González Alcántara Cáceres",
      title: "Subsecretario de Gestión Integral del Aire, Agua y Biodiversidad · Nuevo León",
      quote: "«Complejo, más no complicado»",
      kind: "personal",
      storyQuote: "«Cabeza fría y evaluar»",
      storyBody:
        "Abogado. Licenciado en Derecho y Finanzas por el ITESM, con maestrías en Derecho Penal y Sistema Acusatorio (UANL) y en Derecho Fiscal (UDEM). Asociado en Páramo, Fernández y Garza – Abogados desde 2012: asesoría empresarial jurídica y financiera, litigio y blindaje de contratos. Fue Regidor de San Pedro Garza García (2018–2024). Desde 2024 es Subsecretario de Medio Ambiente del Estado de Nuevo León — Subsecretario de Gestión Integral del Aire, Agua y Biodiversidad — con el proyecto especial de ampliar las áreas naturales protegidas del estado del 9.4% al 22%.",
      // Sin medal/contacts cargados: la tarjeta arranca en el primer nivel
      // de la escala del Programa (rank aprendiz, como toda tarjeta nueva).
      rank: "aprendiz",
      email: "javiergzzacl@gmail.com",
      location: "San Pedro Garza García, Nuevo León",
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
