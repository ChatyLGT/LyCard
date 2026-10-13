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

Pendiente de definir con Gunnar: qué variables de t³ usa NashMesh. Hoy
NashMesh usa φ (contribución declarada), ψ (nivel de autonomía) y ε
(comisión), y no usa z ni t³ todavía.

Las 4 Nobles Verdades y el Camino Óctuple: Gunnar los va a pasar. Guardarlos
en este archivo tal cual, sin interpretarlos ni resumirlos.

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

## Trabajo y costos

- Las tareas chicas de interfaz pueden hacerse con Haiku. Igual se verifican
  con tests y revisión visual.
- Cada entrega cumple el piso de shipeo: tsc, lint, unit 100%, build, E2E,
  verificación visual, PLAN.md y versión.
