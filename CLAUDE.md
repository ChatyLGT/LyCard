@AGENTS.md

# Memoria del proyecto LyCard (decisiones de Gunnar)

Estas reglas son vigentes y tienen prioridad sobre cualquier suposición.
Si algo acá contradice el código o el plan, preguntar antes de cambiar nada.

## Cuentas y roles

- **El único Admin es Gunnar (MasterN0).** No deben existir otros Admin.
- **Einar, Chaty y Warren son N1 de Gunnar.** No son Admin, no son referidos
  de nadie y no tienen login de Admin.
- **Sergio y Fabricio no son Admin.** Son quienes dan luz verde a producción
  y ejecutan las órdenes de producción (incluida la integración real con
  HeroSuite/Rene por API).
- **Todos los datos actuales son de prueba y se pueden borrar.** Estamos en
  fase de estructura, no de datos reales.
- Filosofía de EinarOS: todos los empleados son clientes. Todos entran como
  Member, cada Programa tiene sus indicadores, roles, accesos, calificaciones
  y comentarios. Es una red social orientada a la mipyme y la IA. Legacy es el
  Programa raíz y MasterN0 (Gunnar) es el N0 raíz.
- La regla de registro, login y roles es un diseño pendiente que hay que
  hacer robusto antes de construir (ver PLAN.md).

## Google: cuentas y permisos (decisión de Gunnar, 2026-10-13)

- Cada persona autoriza **su propia** cuenta de Google desde LyCard, en el
  momento en que una función la necesita. LyCard nunca usa la cuenta de otro
  para leer o escribir en Drive, Calendar o Tasks.
- Hoy Gunnar usa su cuenta personal de Google, solo para él.
- La cuenta de empresa (utoppian.bot@gmail.com, de Silicio) existe pero **no
  se usa todavía**. Es una cuenta del sistema para acciones de empresa, no para
  datos personales de nadie. Cuando haya producción, se reemplaza por una
  cuenta de Workspace con dominio propio.
- Mientras la app esté en modo "Testing", cada cuenta que se conecte debe estar
  en la lista de usuarios de prueba.

## Escalera fractal (fuente: docs/WHITEPAPER-ADENDA-2026-10-07.md, sección "La escalera fractal")

Escala de potencias de 12:

- N0 = 12⁰ = conciencia plena.
- N0 se convierte en 3 N1 = 12ᵗ (caso MasterN0: Einar = Estratega, Chaty =
  Orquestadora, Warren = UX/UI).
- Los 3 N1 se dividen en 12 Guardianas N2 = 12¹ (los 6 Pilares × 5 etapas +
  propósito).
- Las 12 Guardianas dan 144 Expertos = 12².
- 12³ = capacidad de Especialistas.

Regla dura: cada agente es independiente, con su propio cerebro (hoy alojado
en NotebookLM). Nunca un mismo agente actuando como otro.

## Fórmula maestra (definición final de Gunnar, 2026-10-13; reemplaza cualquier otra)

z = z² + t³

- **z** = estado del N0.
- **z²** = procesamiento de la IA.
- **t³** = sesión de trabajo entre la IA y el N0. Sus variables: Time, Talent,
  Trust (tiempo, talento y confianza). De ahí se derivan otros nombres según
  el contexto (ej. energía y conciencia).

t³ siempre fue Time, Talent, Trust. Cada eje agrupa varios indicadores (horas,
puesto, roles, reconocimientos, energía, red de IA y Legacy, responsabilidad,
riesgo). Pendiente de Gunnar: la lista exacta y si los ejes se combinan por
producto o por suma.

NashMesh calcula el valor de una tarea con t³, y ese valor alimenta z. El
documento NASHMESH_EXPLICADO todavía no ubica Time ni Talent y usa ψ para dos
cosas distintas (confiabilidad y comisión por nivel). No programar pagos hasta
que se separen.

Escalera según Gunnar: N0 humano; N1 tríada (N1.1 Einar, N1.2 Chaty, N1.3
Warren); N2 las 12 Guardianas. Discrepancias abiertas, a anotar y no corregir:
el schema `Node` solo reconoce N1.1, y docs/01 y Gunnar difieren sobre el rol
de Warren. Detalle en docs/10-ESCALERA-T3-CONTEXTO.md.

Las 4 Nobles Verdades y el Camino Óctuple: hoy son solo contexto. Gunnar los
pasará cuando confirme la versión oficial. Guardarlos tal cual, sin
interpretarlos.

NO escribir código de Dharma, GoldenTicket, Guardianas ni cálculo de t³ hasta
que Gunnar lo pida.

## Permisos y servicios externos

- Cada permiso se pide solo cuando la función lo necesita, con una explicación
  previa dentro del flujo de la tarjeta (no un pedido masivo al entrar).
- Cada permiso debe quedar mapeado en PLAN.md: función → scope → cuándo se pide.
- Los servicios de servidor con clave propia (ej. AssemblyAI) no piden permiso
  de usuario.
- Las instrucciones de configuración siempre van paso a paso, con URLs y links.

## Claves y entorno

- La clave de prueba de AssemblyAI vive solo en `.env.local` (ignorado por git).
  Nunca va al repo, a PLAN.md, a commits ni a docs.
- **Checklist de producción:** antes de salir, rotar TODAS las API keys que
  hayan estado en chats o en archivos de prueba, y avisar a Sergio y Fabricio
  que las carguen en Vercel como variables de entorno.

## Protocolo de excelencia (pedido de Gunnar, 2026-10-14, siempre activo)

Antes de crear nada (código, diseño, documento largo): primero aclarar dudas,
profundizar y guiar con preguntas. Orden fijo:
1. Revisar lo ya acordado (PLAN.md, docs/PLAN-HISTORIAL.md, código, Drive) y citarlo.
   No volver a preguntar lo que Gunnar ya definió, sobre todo dinero y precios.
2. Repetir lo entendido en pocas líneas y marcar discrepancias con lo registrado.
3. Preguntar de a pocas cosas, ordenadas, empezando por lo que bloquea.
4. Recién con las respuestas, proponer y construir.

## LGT: origen de EinarOS (Drive de Gunnar, carpeta "LGT"; leído 2026-10-15)

**LGT = Life Gamification Theory** (Gunnar Pareja Ballivián, PhD). Documentos:
"LGT_MASTER" (manual completo) y la tesis doctoral "Life Gamification Theory (LGT)".
Es "un sistema de gobernanza algorítmica que usa blockchain para crear entornos de
información perfecta donde el Equilibrio de Nash Colaborativo es la única estrategia
dominante". Fórmula: **LGT = Nash (cooperación) + Flow (biología) + Blockchain (certeza)**.
Tres pilares: teoría de juegos (cambiar la matriz de pagos para que cooperar rinda más),
neuropsicología del Flow (roles por **Talento Natural**, ingeniería narrativa: de KPI a
"Misión Épica") y blockchain (**Proof of Performance**: el aporte real se valida antes
de recompensar). Las comisiones salen solo de valor real, nunca de reclutar (Malla de
Valor, 7 niveles). Para jobs y recompensas de WowJobs, este es el marco: roles por
talento, tareas como misiones, recompensa atada a Proof of Performance.

## Metodología del Códice: Estándar del Arquitecto (Drive: "Masterplan Metodologia Codice y Escalera Fractal EinarOS")

Ciclo de 3 meses. Mes 1: diagnóstico, Perfil360 y Cerebro N0 (Sesión 1 de arranque,
BirdBrain, 8 sesiones de 45 min con la Oreja, 2 por semana, grabadas con Meet y Fathom).
Mes 2: enjambre y ejecución asistida. Mes 3: calibración, auditoría y sello.
Gunnar lo describe como tres etapas: 1 entendimiento (Códice, pilar 360, escalera
N0/N1/N2, herramientas de carbono, WLM), 2 setup de Oficina Virtual y equipo (consultores
de negocio y TI, diagnóstico con **RFI = Request for Information**, metodología a diseñar
con Gunnar, aún no existe), 3 pruebas y ajustes.

## Legacy como programa modelo, etapas, jobs y talentos (acuerdos de Gunnar, 2026-10-15)

- **Legacy es el programa modelo.** Toda esta lógica y su nomenclatura (Oreja, Hayuko,
  niveles) aplican **solo a Legacy**. Se define aquí el funcionamiento y los demás
  programas se adaptan a la lógica con su propia narrativa.
- **3 etapas de Legacy:** 1 Códice, 2 OV&AT (Oficina Virtual y Agentic Team), 3 Tests y
  PoP (Proof of Performance).
- **WowJobs, primer menú:** el job 1 es **Oreja** y el job 2 es **Hayuko**. Son la forma
  de contratar a la Oreja y al Hayuko. La estructura es fractal y funciona como Proof of
  Performance: cada nivel de experto valida el trabajo del nivel inferior (la Oreja la
  valida el Sherpa al verificar el Códice).
- **Talentos naturales:** la teoría se desarrolló con **Miguel Aldape** y es lo que vende
  **Protalent** (Protalent Detector: define las habilidades que pide un puesto y las
  compara con las capacidades del candidato para hallar a los naturalmente compatibles;
  "cuatro veces más asertivo", en línea; protalent.com.mx). En el Drive aparece como
  "HPT (Aldape)" y "Diagnóstico de Talentos (ProTalent)" (Universidad Abundancia 360).
  Cada job debe definir el perfil de talento que pide. Protalent se usa como **fuente y
  validez del método**, no como herramienta a integrar. Idea central: **no se contrata
  por estudios académicos sino por talentos naturales**, que se identifican con el **RFI**
  (Request for Information) y los **pilares**.
- **Sherpa es un nivel transversal a los talentos:** se puede ser Sherpa en psicólogos, en
  negocios, en construcción, etc. Es un rango que se gana con experiencia y calificaciones.
- Los "Talento #1 a #16" de las carpetas TALENTOS del Drive son **skills** de Einar (usar
  siempre la palabra "skills" para eso, "talentos" es solo para talentos naturales).
- **Códice Extendido** (plan técnico del 9-oct dirigido a Chaty, Drive): Coordenadas del
  Ser (IPR/RPI) + 6 Esferas de Poder (1 a 9: Espiritual, Mental, Emocional, Financiero,
  Relacional, Físico) + Llave de acceso (Etapa D/E/A/O/M, Membresía, ID de 9 dígitos).
  Sin implementar en el código. Barra superior: botón izquierdo al Dashboard, badge de
  nivel a la derecha abre el modal del Códice.
- **El Códice de la persona** incluye el RFI (el RFI es parte del Códice) y además sus
  credenciales: académicas, peritajes, certificaciones y premios, todo con la lógica de
  **medallas** que ya existe en LyCard.
- **Rangos de Legacy** (solo Legacy, sirven de ejemplo para otros programas): Padawan,
  Mutant, Superhuman, Sherpa, Ancient. **Una persona tiene UN solo rango**, en su línea de
  talento. Oreja y Hayuko son puestos (jobs), no rangos. Tener la capacitación o experiencia
  de una Oreja no la hace Oreja; puede haberlo sido.
- **Reglas flexibles (Gunnar, 2026-10-16):** no hay un rango máximo rígido por job. Ej.: un
  Hayuko normalmente es hasta Mutant, pero una persona de mucha experiencia puede ser
  Sherpa y optar por apoyar solo en la parte de Oreja. Son casos especiales y valen para
  todos los jobs. En general **cada job tiene requisitos y estándares normales, a definir
  y marcar** (con excepciones aprobadas). La línea de talento es asunto del **matching de
  talento**, que se hace con el **Códice**. El **RFI ya está hecho**: hay que aplicar lo ya
  trabajado (carpeta de MAMEN en Drive), no rehacerlo.
- **Validación superior:** el trabajo de cada nivel lo valida uno superior (Hayuko Padawan:
  Superhuman o Sherpa; Hayuko Mutant: Sherpa; guía, no tope). Siempre debe haber validación.
- Talento Natural, gamificación (niveles, etapas, poderes, talentos) y Proof of
  Performance son parte de LGT: ver la sección LGT.

## Roles, niveles y pagos del Programa Legacy (acuerdos de Gunnar, 2026-10-14)

- **Puestos** (WowJobs): **Oreja** (psicólogo, acompaña al N0 en la etapa 1) y **Hayuko**
  (consultor junior, misma mecánica de acceso y pago que la Oreja; su trabajo es el
  diagnóstico de la etapa 2). Nombres internos, pueden cambiar.
- **Niveles** de Sabiduría (`RANKS` en `lib/data.ts`): Seeker/Curioso, Padawan, Mutant,
  Superhuman, Sherpa, Ancient. "Sherpa para arriba" = nivel Sherpa o Ancient.
- **Sherpa:** psicólogo senior. Da la Masterclass (grupal) y verifica el Códice.
- N0 paga $500 el mes 1 (setup) y $100 por mes desde el mes 2.
- Oreja: $15 por sesión de onboarding hecha. Bono de captación $120 si trajo al lead, al
  pagar el N0 sus $500. Sherpa: $30 por N0 registrado por su Masterclass y $30 por
  verificar el Códice. Mensualidad de la Oreja: $12 si trajo al lead, $5 si lo asignó la
  empresa, desde el mes 2. Margen de LyCard: 40% (Oreja trajo al lead) o 64% (empresa).
- Se paga por hora efectivamente hecha. Todo es cálculo simulado en dólares: el dinero
  real circula en tokens internos con on/off-ramp y fideicomiso, que definen Sergio,
  Fabricio y asesoría legal. Detalle en docs/12-DISENO-OREJA-PSICOLOGO.md.
- Menú de jobs que publica el N0 (qué necesita, objetivo, tareas, perfiles, recompensa):
  idea de Gunnar, a definir con el protocolo de excelencia. Aún no se construye.

## Trabajo y costos

- Las tareas chicas de interfaz pueden hacerse con Haiku. Igual se verifican
  con tests y revisión visual.
- Cada entrega cumple el piso de shipeo: tsc, lint, unit 100%, build, E2E,
  verificación visual, PLAN.md y versión.
