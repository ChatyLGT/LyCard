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
1. Revisar lo ya acordado (PLAN.md, docs/PLAN-HISTORIAL.md, código) y citarlo. No
   volver a preguntar lo que Gunnar ya definió, sobre todo dinero y precios.
2. Repetir lo entendido en pocas líneas y marcar discrepancias con lo registrado.
3. Preguntar de a pocas cosas, ordenadas, empezando por lo que bloquea.
4. Recién con las respuestas, proponer y construir.
Los montos de comisión de la Oreja están en `lib/commissions.ts`; si Gunnar los
recuerda distinto, se confirman con él antes de tocarlos.

## Trabajo y costos

- Las tareas chicas de interfaz pueden hacerse con Haiku. Igual se verifican
  con tests y revisión visual.
- Cada entrega cumple el piso de shipeo: tsc, lint, unit 100%, build, E2E,
  verificación visual, PLAN.md y versión.
