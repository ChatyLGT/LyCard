import type { RealityCheckKpi } from "@/lib/oficinaExtras";

// Bot Warren en la Oficina (pedido de Gunnar, 2026-09-23): la puerta al
// Gemelo Digital — el "CEO de tu Oficina Virtual", el único con quien el
// N0 habla y a quien le pide cosas. NO es el desarrollo de IA real (eso
// lo hace otro equipo en producción aparte); esto es la simulación para
// que la gente lo juegue: un menú de pedidos reales (vender, crear una
// app a medida, analizar una oportunidad, publicar en redes, facturar,
// pronosticar — el rango de posibilidades que habilita el equipo de
// microservicios de Sergio) con respuestas armadas a partir de los datos
// reales de la Card/Programa, no un guión genérico repetido para
// cualquiera. Sigue siendo 100% simulado — nunca texto libre (la regla de
// oro del proyecto: nunca fingir que se entiende algo que no se entiende)
// y cada respuesta se cierra con una línea "Simulación —" que aclara qué
// falta para que sea real, mismo criterio honesto que el resto de la
// Oficina (KPIs/noticias/calendario de ejemplo).

export type GemeloContext = {
  ownerName: string;
  roleLabel: string;
  programName: string;
  quote: string;
  objetivo: string;
  enabledSkillNames: string[];
  kpis: RealityCheckKpi[];
  kpisAreDefault: boolean;
};

export type GemeloNodeId = "start" | "menu" | "vender" | "app" | "analisis" | "redes" | "facturar" | "pronostico" | "end";

export type GemeloOption = { label: string; next: GemeloNodeId };
export type GemeloNode = { botLines: string[]; options: GemeloOption[] };

const MENU_OPTIONS: GemeloOption[] = [
  { label: "Ayudame a vender", next: "vender" },
  { label: "Creame una app específica para esto", next: "app" },
  { label: "Hazme un análisis completo de esta oportunidad", next: "analisis" },
  { label: "Publicá esto en mis redes", next: "redes" },
  { label: "Necesito facturar esto", next: "facturar" },
  { label: "Dame un pronóstico", next: "pronostico" },
  { label: "Nada por ahora, gracias", next: "end" },
];

const BACK_OPTIONS: GemeloOption[] = [
  { label: "Otra cosa", next: "menu" },
  { label: "Listo, gracias", next: "end" },
];

// El gancho de venta: la cita corta de la Card si existe, si no el
// objetivo del día, si no un genérico que igual nombra el Programa real
// en vez de quedar vacío.
function pitchHook(ctx: GemeloContext): string {
  if (ctx.quote.trim()) return ctx.quote.trim();
  if (ctx.objetivo.trim()) return ctx.objetivo.trim();
  return `lo que hace ${ctx.programName} todos los días`;
}

function trendDirection(kpi: RealityCheckKpi): "subiendo" | "bajando" | "estable" {
  if (kpi.trend.length < 2) return "estable";
  const first = kpi.trend[0];
  const last = kpi.trend[kpi.trend.length - 1];
  if (last > first) return "subiendo";
  if (last < first) return "bajando";
  return "estable";
}

export function buildGemeloScript(ctx: GemeloContext): Record<GemeloNodeId, GemeloNode> {
  const kpi = ctx.kpis[0];
  const kpiCaveat = ctx.kpisAreDefault
    ? "ojo, estos son tus KPIs de ejemplo — todavía no cargaste los tuyos"
    : "estos son tus números reales de hoy";
  const skillsLine = ctx.enabledSkillNames.length > 0 ? ctx.enabledSkillNames.join(", ") : "tus Superpoderes de siempre";

  return {
    start: {
      botLines: [
        `Hola ${ctx.ownerName} 👋 Soy tu Gemelo Digital — el CEO de tu Oficina Virtual. Acá adentro, soy el único con quien hablás.`,
        "Todavía es una simulación — pedime algo, como lo harías de verdad, y te muestro cómo se vería la respuesta.",
      ],
      options: [{ label: "Dale, arrancamos", next: "menu" }],
    },
    menu: {
      botLines: ["¿Qué necesitás hoy?"],
      options: MENU_OPTIONS,
    },
    vender: {
      botLines: [
        `Con lo que tengo de ${ctx.programName}, un primer borrador de pitch sería algo así:`,
        `"${pitchHook(ctx)}" — corto, directo, con tu propia voz, no una plantilla genérica.`,
        "Simulación — con la Skill de Speech comercial conectada, esto sale personalizado en segundos, no como este único ejemplo fijo.",
      ],
      options: BACK_OPTIONS,
    },
    app: {
      botLines: [
        `Para ${ctx.programName} armaría algo enfocado en lo que ya tenés activo: ${skillsLine}.`,
        "Una app a medida así junta 2 o 3 de esas herramientas en un solo flujo pensado para tu operación puntual, no algo genérico de catálogo.",
        "Simulación — el armado real de apps a medida es el desarrollo grande que está en producción aparte, todavía no acá.",
      ],
      options: BACK_OPTIONS,
    },
    analisis: {
      botLines: kpi
        ? [
            `Mirando ${kpi.label}: ${kpi.value}${kpi.unit} — la oportunidad más clara para ${ctx.programName} está en sostener lo que ya funciona y mover foco a lo que quedó plano.`,
            `Simulación — ${kpiCaveat}. Un análisis real cruza tus KPIs, tu Malla y tu Seguimiento juntos, más de lo que puedo mirar acá.`,
          ]
        : [
            `Todavía no tenés KPIs cargados para ${ctx.programName}, así que no tengo con qué armar un análisis de verdad.`,
            "Simulación — cargá tus primeros KPIs en Check de Realidad y volvé a pedirme esto.",
          ],
      options: BACK_OPTIONS,
    },
    redes: {
      botLines: [
        `Para ${ctx.programName}, algo así funcionaría como caption:`,
        `"${pitchHook(ctx)}"`,
        "Simulación — publicar de verdad es la Skill de Community Manager, todavía en modo simulado también.",
      ],
      options: BACK_OPTIONS,
    },
    facturar: {
      botLines: [
        `Borrador de línea de factura para ${ctx.programName}: 1x Servicio — monto a definir.`,
        "Simulación — la facturación real todavía no está conectada a ningún backend.",
      ],
      options: BACK_OPTIONS,
    },
    pronostico: {
      botLines: kpi
        ? [
            `Con ${kpi.label} ${trendDirection(kpi)}, si el ritmo se sostiene el próximo número razonable ronda los ${kpi.value}${kpi.unit} ± un margen chico.`,
            `Simulación — ${kpiCaveat}. Un pronóstico real se arma con tu historial completo, no con unos pocos puntos de ejemplo.`,
          ]
        : [
            `Sin KPIs cargados todavía para ${ctx.programName}, no tengo una serie real de la que pronosticar nada.`,
            "Simulación — cargá tus primeros KPIs en Check de Realidad y volvé a pedirme esto.",
          ],
      options: BACK_OPTIONS,
    },
    end: {
      botLines: [
        `Eso es todo por ahora. El Gemelo Digital operativo de verdad (con IA entrenada con tu propio Códice, como ${ctx.roleLabel} de ${ctx.programName}) todavía no existe — esto fue solo una simulación.`,
        "¡Gracias por probarlo!",
      ],
      options: [],
    },
  };
}
