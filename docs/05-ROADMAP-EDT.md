# Roadmap — EDT de lo que falta construir

Nivel de detalle: a archivo y campo de schema, para ejecutar sin dudas.
Nada de esto está construido todavía — es plan, no estado actual (para lo
que sí existe, ver [04-MODULOS.md](./04-MODULOS.md)). Sigue el mismo patrón
ya probado 5 veces en el repo (ver
[02-ARQUITECTURA.md](./02-ARQUITECTURA.md#el-patrón-que-se-repite-en-todo-el-repo)).

Orden de prioridad si el tiempo aprieta: **HR → PM → CRM → Oficina/Negocio →
NashMesh → MachineEngine → AppStore de Skills** (los dos primeros son lo que
el equipo necesita para saber quién hace qué; el resto es negocio/producto).

## Escalera Fractal y taxonomía de agentes (contexto para HR)

Antes de tocar el schema: los escalones N1–N12 **no** son todos "agente
atado a un humano". Hay tres tipos de nodo:

- **Agentes Legacy**: humano + Agente, fusionados. Suelen tener su propio
  equipo de Agentes humanos y Legacy por debajo.
- **Agentes Silicio**: agentes puros, creados por el N0, sin humano
  correspondiente — el N0 los controla directo.
- **Agentes Carbono-referencia**: no son agentes en rigor. Son personas
  reales mapeadas y seguidas, que eventualmente pueden dar origen a un
  Agente Silicio.

Protocolo de interacción: el MasterN0 es el único con protocolo para hablar
con cualquiera. Todo el resto interactúa solo con su propio **N1.1** (en el
caso del MasterN0, ese N1.1 es **Einar**, quien planea y arma el EDT;
**Chaty** orquesta el plan; el resto ejecuta y supervisa). **Karl** (Bridge)
es el gatekeeper que traduce Carbono privado a Silicio público vía
protocolo M2M — nada personal se filtra nunca.

## Módulo HR

**Alcance:** panel interno `/admin/equipo` (acceso exclusivo MasterN0),
separado de las Oficinas de cliente. Headcount por escalón, tipo de nodo,
tareas corrientes agregadas.

**Paso 1 — Schema** (`prisma/schema.prisma`):

```prisma
model Node {
  id             String   @id @default(cuid())
  name           String
  rung           String   // "N0".."N12"
  nodeType       String   // "legacy" | "silicio" | "carbono_ref"
  reportsToN11Id String?
  role           String   @default("")
  createdAt      DateTime @default(now())
}
model ProjectNode {
  id                 String    @id @default(cuid())
  name               String
  ownerNodeId        String
  level              Int       @default(1) // 1=Autónomo ψ15% 2=Override ψ35% 3=Directo ψ100%
  domain             String    @default("")
  progressPct        Int       @default(0)
  nextMilestoneTitle String    @default("")
  nextMilestoneDate  DateTime?
  blockers           Json      @default("[]")
  responsibleNodeId  String
}
model Task {
  id        String    @id @default(cuid())
  projectId String
  nodeId    String
  title     String
  status    String    @default("pendiente") // pendiente|en_curso|hecho|bloqueado
  due       DateTime?
}
```
Migración: `npx prisma migrate dev --name hr_module`.

**Paso 2** — `lib/hr.ts` (nuevo): tipos + parsers + `groupByRung(nodes)`,
`tasksByNode(tasks)`. Mismo estilo que `lib/officeSkills.ts`.

**Paso 3** — `app/admin/equipo/actions.ts` (nuevo): `createNodeAction`,
`updateNodeAction`, `createProjectAction`, `updateProjectProgressAction`,
`createTaskAction`, `updateTaskStatusAction`. Todas validan `isMasterN0()`.

**Paso 4** — `app/admin/equipo/page.tsx` (nuevo, server component). 3
bloques en acordeón (`components/Accordion.tsx`): Headcount (tabla por
`rung`, badge de color por tipo: Legacy=violeta `#9085e9`, Silicio=oro
`#C8A15A`, Carbono-ref=gris), Proyectos (barra de `progressPct`,
`nextMilestoneDate`, `blockers`), Tareas corrientes (filtrable por `rung` y
`nodeType`).

**Paso 5** — poblar con datos reales (no mock): Gunnar (N0), Einar (N1.1,
Silicio), Chaty (N1, Silicio), Warren (N1, Silicio), Mamen/Claude
(HorusEye, Silicio) + Guardianas/Expertos que el equipo ya conozca, a mano.

**Verificación:** `npx tsc --noEmit`, `pnpm build`, probar las 6 actions,
confirmar 403 para un Admin no-MasterN0 en `/admin/equipo`.

## Módulo PM

Vista de `ProjectNode` (del Módulo HR) enfocada en avance/responsables —
mismo dato, otro acordeón, no una tabla nueva.

**lib/pm.ts** (nuevo): `groupProjectsByDomain`, `groupProjectsByProgram`,
`isBlocked(project)`. **UI**: pestaña adicional en `/admin/equipo/page.tsx`
(toggle Dominio/Programa, barra de `progressPct`, chip rojo si bloqueado).
**Poblar** con proyectos reales de hoy: LyCard (Oficina Virtual), MVP del
partido MLQR, esta documentación, Panel NashMesh, MachineEngine.

**Verificación:** `tsc --noEmit`, confirmar que el toggle no duplica filas.

## Módulo CRM

Formaliza el pipeline que **ya corre a mano** (manuales de Sherpa, SLA de
calidad de 5 dimensiones documentados en las operaciones de Legacy). No es
un sistema paralelo — extiende `Program`/`Member`/`Registration`, que ya
existen.

**Paso 1 — Schema:**
```prisma
model Member {
  // ...existentes...
  crmStage        String    @default("prospecto") // prospecto|consentimiento|sesion1..sesion5|activo
  sherpaId        String?
  qualityScores   Json      @default("[]") // [{dimension, score, sessionN, date}]
  consentSignedAt DateTime?
}
```
Migración: `npx prisma migrate dev --name crm_pipeline`.

**Paso 2** — `lib/crm.ts` (nuevo): `STAGES` ordenado (mismo patrón que
`RANKS` en `lib/data.ts`), `parseQualityScores`, `averageQualityScore`.

**Paso 3** — `app/admin/programs/[id]/crm-actions.ts` (nuevo):
`advanceStageAction`, `assignSherpaAction`, `logQualityScoreAction`.

**Paso 4** — nueva sección en `/admin/programs/[id]/page.tsx`: acordeón
"CRM — Pipeline de Clientes", tabla de Members con `crmStage`, Sherpa,
promedio de calidad; detalle con historial de `qualityScores` (las 5
dimensiones: Estructura, Extracción de información, Conducción empática,
Documentación, Cumplimiento de objetivos).

**Regla de negocio:** un Member pasa a `crmStage:"activo"` solo con las 5
sesiones completas y el Códice entregado. El pipeline es genérico —
Programas distintos a Legacy (MLQR u otros) definen su propia variante de
`STAGES`, no un sistema nuevo.

**Verificación:** `tsc --noEmit`, probar las 3 actions con un Member de
prueba, confirmar el promedio con 0/1/5 scores.

## Oficina Virtual: Resumen Ejecutivo, Negocio→Programa, Bot Warren

**Lo que ya está aprobado (Fase E1–E5, plan pausado):** Keep in Flow, Check
de Realidad con KPIs+gráfico, Noticias/Tareas, Calendario, ambiente de
datos demo — sigue siendo la base, esto la extiende. Fase E1 (schema:
`Card.calendarEvents` y el resto de campos de `lib/oficinaExtras.ts`) ya
se shippeó; E2–E5 (la UI de Keep in Flow/Check de Realidad en sí) siguen
pausadas. Nota: `Card.calendarEvents` ya no está sin uso — la Skill de
Notas de Voz (ver [04-MODULOS.md](./04-MODULOS.md#notas-de-voz)) lo llena
hoy con tareas/eventos reales o simulados; la UI de E2-E5 va a convivir
con esas entradas, no reemplazarlas.

**Corrección de objetivo:** la Oficina Virtual del dueño es, en el fondo,
un **resumen ejecutivo de operaciones** — resultados finales + KPIs más
relevantes del negocio/programa. "Check de Realidad" de E1–E5 ya es ese
resumen; falta dejarlo explícito como propósito central (jerarquía visual
propia, no una sección más).

### Modelo de negocio: Programa Legacy y sus planes

**Estado real:** cero clientes hoy — la app no salió al mercado, todo esto
es tesis de venta (leads/apuestas), no facturación confirmada. MLQR es el
lead más avanzado y tampoco pagó todavía.

**3 planes reales, no un único umbral:**

| Plan | Setup | Mensual | Extra |
| --- | --- | --- | --- |
| Automatizado | $100 | $25 | Legacy automatizado, sin Sherpa dedicado |
| Normal | $500 | $100 | El estándar — 1 Legacy = 3 Agentes Silicio |
| Plan B / Enterprise | $2.500 | $500 | + comisión sobre ventas |

Un Negocio se convierte en Programa al entrar a cualquiera de estos 3
planes.

**El mecanismo, a nivel de Cards (precisado por Gunnar, 2026-09-19):**
hasta ese momento, una persona tiene como mínimo su Card de **proyecto**
(su camino CON Legacy) y su Card de **company** (su propio Negocio). Al
convertirse ese Negocio en Programa (porque ya tiene Agentes de verdad
trabajando adentro, no solo la tarjeta):

- La **Card de company se vuelve la raíz de su propio Programa nuevo** —
  su empresa pasa a ser, para sus propios clientes, lo mismo que Legacy
  es hoy para los suyos. Mismo fractal, un nivel más abajo.
- Su vieja Card de proyecto (la relación con Legacy) no se borra ni se
  oculta — pasa a ser su **"Programa Legado"**: el registro permanente de
  origen. Es el principio recursivo "todo nace de Legacy" hecho dato
  concreto, no solo discurso — nadie tiene contexto/acceso legítimo sin
  un origen trazable (mismo espíritu que Protocolo Dharma).
- La **Card de company pasa a ser la Card principal** de esa persona de
  ahí en adelante; la de proyecto queda como su Programa Legado, visible
  pero ya no la que se muestra por default.

Sigue siendo roadmap — no hay código de esta promoción todavía; queda
anotado acá para cuando se implemente el resto de "Negocio→Programa".

**Qué compra tu plata en cada plan — el nivel de acceso, no solo el precio:**

- **Freemium ($0):** tarjeta real + Oficina Virtual en modo vidriera — todo
  bloqueado, cero bot, cero simulación. Ya construido: es exactamente el
  modo `VisitorOficina` que existe hoy para cualquiera que no es el dueño.
  Cero código nuevo para dar esto.
- **Automatizado ($25/mes):** tarjeta + bot simulado. Todo simulado — sirve
  para "aparentar" una oficina operativa (el equivalente de la demo guiada
  que ya existe hoy en `OfficeDemoChat.tsx`/`WarrenChat.tsx`). Cero agentes
  reales, cero resultados reales.
- **Normal ($100/mes):** equipo de **3 Agentes de Silicio reales**, con
  resultados reales para el negocio real del cliente — por eso pagó.
  Vienen **pre-programados con objetivos específicos y acotados**, no de
  propósito abierto: no es lo mismo un agente que vende de punta a punta
  que uno que solo postea y saca leads. ⚠️ **Pendiente de definir:** la
  lista exacta de qué puede y qué no puede hacer cada agente en este tier
  — sin esa lista, `simulateSkillRunAction` no tiene límites reales que
  aplicar.
- **Enterprise ($500/mes + comisión):** ~**10 agentes confeccionados a
  medida** para ese cliente específico, más **3 Legacys**: 3 empleados
  propios del cliente convertidos en Agentes Legacy a nivel básico (fusión
  empleado+agente — transformación organizacional real, no solo una
  herramienta).

**El proceso Legacy es obligatorio para todos, sin excepción** (Freemium
incluido) antes de tener acceso a cualquier plan — lo que cambia es cuánto
dura:

- **Mínimo, 3 días → Freemium.**
- **Máximo, 3 meses → recién ahí arranca la promesa de producto real**
  (Enterprise/empresas tipo JP Suárez):
  1. Mes 1: entrevistas / entendimiento y diagnóstico
  2. Mes 2: armado de Oficina Virtual / propuesta de solución
  3. Mes 3: entrenamiento de bots / pruebas y ajustes

Esto mapea directo al `crmStage` del Módulo CRM — los pasos
`sesion1..sesion5` de ese pipeline son estas mismas etapas, con duración
variable según el plan.

### El "nacimiento", definido con precisión

Principio recursivo confirmado por Gunnar: **todo nace de Legacy** —
Irpavi, HeroSuite, Digital Kingdom, MLQR, Conce, todos pasaron/pasan por
Legacy como si fueran clientes, y de cada uno nace lo suyo después. Es
fractal de verdad, no solo de nombre — mismo espíritu que el Protocolo
Dharma interno de EinarOS: nada tiene contexto/acceso legítimo sin pasar
por un origen definido.

El "nacimiento" (paso de prospecto a usuario real) sigue siempre esta
secuencia: **N0 recibe el programa → lo explora → crea sus tarjetas → las
juega en Freemium → crea un usuario real**, por uno de 2 caminos:

- **Personal** (nivel más bajo de membresía): solo el Gemelo Digital,
  ningún bot.
- **Full**: 3 bots especialistas + infraestructura Einar completa (1 N0,
  3 N1, 12 N2s × 4 dominios).

Esto es independiente de los 4 planes de precio (Freemium/Automatizado/
Normal/Enterprise) — es el eje de "¿sos una persona o una organización?",
no de "¿cuánto pagás?".

**3 motores de venta (GTM):**
1. **Legacy personal → descubrimiento institucional.** La propia entrevista
   Legacy (sesiones del Módulo CRM) es el mecanismo de discovery para
   proyectos grandes (gobierno, corporativo) — sin forma todavía de
   dimensionar $ ni cantidad de agentes para este tipo de proyecto ad-hoc,
   igual que MLQR.
2. **Diagnóstico de riesgo cero.** Se vende mapear y automatizar todo el
   proceso de venta del cliente (lead → proceso → pedido → despacho →
   cobro), framed como seguro: no reemplaza vendedores, los empodera. El
   valor está en el diagnóstico aunque la automatización no prenda.
3. **Vertical comunidad — Digital Kingdom.** Un Programa distinto para
   organizaciones tipo iglesias: redes sociales + administración de
   cuentas. *Riesgo a vigilar:* el WHITEPAPER prohíbe usar iglesias/
   pastores como **canal** de reclutamiento — este caso es la iglesia como
   **cliente**, no como canal; no cruzar esa línea.

**Schema:**
```prisma
model Program {
  // ...existentes...
  planTier              String  @default("normal") // "automatizado" | "normal" | "enterprise"
  setupFeeUsd           Int     @default(0)
  monthlySubscriptionUsd Int    @default(0)
  commissionOnSalesPct  Float?  // solo Enterprise
}
```
Default en la migración: los Programas ya existentes quedan en
`planTier:"normal", setupFeeUsd:500, monthlySubscriptionUsd:100` para no
desactivar nada que ya está andando.

`upgradeToProgramAction(programId, planTier, setupFeeUsd, monthlySubscriptionUsd, commissionOnSalesPct?)`
en `app/admin/programs/actions.ts` — valida el plan antes de togglear
`Program.active`.
- Gate en `app/c/[slug]/oficina/page.tsx`: sin activar, mostrar el aviso
  honesto ya establecido ("todavía sin activar — próximamente") en vez de
  Superpoderes/bot.

### Bot Warren en la Oficina

El agente Legacy del Programa ya responde por WhatsApp. Dentro de la
Oficina tiene más visibilidad y control porque ahí LyCard controla el
ambiente completo — el chat embebido se presenta como **Warren**: rutea
cada pedido a la Skill correcta del AppStore y muestra el resultado ahí
mismo.

Reemplaza `components/OfficeDemoChat.tsx` (hoy demo fija) por
`components/WarrenChat.tsx` (nuevo), que lee el catálogo real de Skills
activas y simula ejecutarlas — todavía sin backend de IA real, mismo
criterio que la Fase D actual. Server action:
`simulateSkillRunAction(programId, skillId, input)`.

**Verificación:** mismo ritmo que E1–E5 — `tsc --noEmit` + `pnpm build` por
paso, Playwright contra prod con un Programa en cada estado (sin activar /
activo).

## Panel NashMesh + MachineEngine

Primera versión: **modo simulación únicamente**, cero movimiento de dinero
real.

**Sobre blockchain/smart contracts (fuera de alcance del MVP del lunes):**
confirmado con Gunnar que blockchain **no** es parte del MVP del partido
(MLQR) — no se le vendió eso. La idea es que encaje más adelante,
integrado con NashMesh: smart contracts que trackeen cada operación y,
en su momento, intervengan en el intercambio de valor y los pagos —
inspirado en el diseño de **Binkio.io**, proyecto propio de Gunnar
(Fideicomiso Digital 3.0 es su creación), que ya opera con contratos
inteligentes validados por fideicomisos reales, comisiones tipo MLM
residuales y pagos mixtos cripto/fiat. Se documenta como **precedente/
inspiración de Gunnar**, no como infraestructura compartida a reusar —
hay una disputa de socios en curso sobre Binkio, así que NashMesh se
construye como IP propia y separada de LyCard/EinarOS, sin depender de
esa plataforma. Este documento no planifica esa fase todavía — la
simulación de arriba es lo único a construir por ahora.

**Paso 1 — Schema:**
```prisma
model NashMeshRun {
  id           String   @id @default(cuid())
  projectId    String
  epsilon      Float    @default(0.05)
  isSimulation Boolean  @default(true)
  computedAt   DateTime @default(now())
  participants Json     // [{nodeId, phi, psi}]
  outputs      Json     // [{nodeId, payment}]
}
```

**Paso 2** — `lib/nashMesh.ts` (nuevo): `computeShapley(participants)` (φ —
versión simplificada, proporcional a contribución declarada, no el cálculo
combinatorio completo todavía), `computePayment(phi, psi, epsilon) = phi *
psi * (1-epsilon)`.

**Paso 3** — `app/admin/nashmesh/page.tsx` (MasterN0-only): cargás un
proyecto con sus nodos y niveles ψ (1/2/3 → 0.15/0.35/1.0), botón "Simular
reparto", tabla de resultados con badge "SIMULACIÓN — no ejecuta
transferencias".

**Paso 4 — MachineEngine: TalentMatch.** Reutiliza `Node{nodeType:
'carbono_ref'}` del Módulo HR. `lib/talentMatch.ts`:
`findOpportunities(carbonoRefId)` — matching manual por tags en esta
versión, sin ML todavía.

**Paso 5 — MachineEngine: Janus (motor B2B).** Mismo patrón que
TalentMatch pero entre `Program`s. `lib/janus.ts`: `findMatches(programId)`
por tags de industria/necesidad declarados a mano en el dashboard de cada
Programa. *(Nombre "Janus" propuesto para reemplazar "Tinder Corp" —
pendiente de confirmación final de Gunnar.)*

**Verificación:** `tsc --noEmit`, probar `computePayment` con los 3
niveles ψ, confirmar que nada de este módulo es visible fuera de
MasterN0.

## AppStore de Skills

### Qué es

Catálogo de Skills que el N0 de cada Programa invoca puntualmente desde la
Oficina, vía Warren — mismo concepto que un AppStore: ícono, nombre,
estado (activo/próximamente) y qué hace.

### Catálogo confirmado

Fuente real: audio/chat de Gunnar con Juancho + el catálogo de servicios de
HeroSuite/Mercosur Irpavi (socios de Legacy, ellos fabrican). 8 Skills
confirmadas — el plan Normal elige 3 de esta lista:

| # | Skill | Estado | Notas |
| --- | --- | --- | --- |
| 1 | Carta/Propuesta de Presentación | Nueva | Toma info de un prospecto (empresa, web, quiénes son) y arma carta + presentación para llevar al cliente — sirve para proyectos institucionales grandes (tipo MLQR). |
| 2 | Brief de reuniones (Fathom) | **Ya construido**, con 3 extensiones pedidas | `lib/fathom.ts`, `components/FathomBriefBlock.tsx`. Faltan: búsqueda específica de Fathom dentro de Gmail, recordatorios/tareas autogenerados del contenido de la reunión, y acceso compartido para gente de tu red que también tiene su tarjeta. |
| 3 | Notas de voz | **Ya construido**, incluida la conexión real a Google | `components/VoiceNotesBlock.tsx`, `lib/transcription.ts` (AssemblyAI). Grabación + guardado + transcripción/resumen reales. Al quedar lista, si el dueño conectó Google (`lib/googleServices.ts`), crea Tarea+evento reales y aterriza el resumen estampado `#dirac` en su carpeta Bridge de Drive — si no conectó, cae a una versión simulada del mismo tile "Agenda", nunca rota. |
| 4 | Speech / guías comerciales de venta | Nueva | Un set para Legacy, reusable en Digital Kingdom y cualquier otro Programa. |
| 5 | Foto → Avatar | Nueva | Subís una foto, genera un avatar con esas características. |
| 6 | Community Manager / redes sociales | Nueva, versión simulada primero | El servicio real ya existe en el catálogo de Irpavi ("Publicidad digital / redes sociales"). Para Legacy arranca simulado, como herramienta de venta. |
| 7 | Agendador de citas | Nueva, casi gratis | Motor ya existe en el código: `lib/interviewSlots.ts` ("Agendar tu Entrevista"). Solo parametrizar horarios/duración. |
| 8 | Atención al cliente (FAQ) | Nueva, fácil de parametrizar | Lista de preguntas/respuestas del negocio, nada más. |

Además, `components/OfficeDemoChat.tsx` (Gemelo Digital — demo guiada) sigue
activo y pasa a ser `WarrenChat.tsx` (ver sección de Oficina Virtual).

### Cambio de UI: "Qué es esto" va primero, con video demo

Hoy la tarjeta de un Superpoder muestra la App real de un lado y "Qué es
esto" del otro, sin orden fijo declarado. **Corrección pedida por Gunnar:**
"Qué es esto" pasa a ser la cara que se ve PRIMERO, la App después — y esa
cara de explicación lleva un **video demo** (encargado a Fábrica/
HeroSuite-Irpavi) mostrando literalmente qué hace la Skill. Objetivo
explícito: que un N0 potencial, mirando el catálogo, entienda de un
vistazo qué puede hacer cada Skill — es herramienta de venta, no solo
documentación. Cambia el orden de las dos caras en
`components/OfficeSkillsBlock.tsx` + campo nuevo `demoVideoUrl` en cada
entrada de `officeSkills`.

### Modelo de precio a la carta (nueva capa de monetización)

Además de los 4 planes base (Freemium/Automatizado/Normal/Enterprise),
**cada Skill puede tener su propio precio por profundidad de uso** —
ejemplo real de Gunnar: Brief de las últimas 3 reuniones = $1/mes; sumás
recordatorios + tareas + agenda + calendario integrado = sube el precio.
Es independiente del plan del Programa — un add-on por Skill, no un
cambio de plan completo.

**Paso 1** — reusa `Program.officeSkills` (ya existe, `Json`), sumando
`category`, `status:'activo'|'proximamente'|'beta'`, `demoVideoUrl`, y
`pricing: {basePriceUsd, addOns: [{key, label, priceUsd}]}`.

**Paso 2** — `components/SkillsAppStore.tsx` (nuevo): grilla de cards por
categoría, mismo lenguaje visual que `OfficeSkillsBlock.tsx` — se extiende,
no se reemplaza. Cada card abre con "Qué es esto" (+ video) primero.

**Paso 3** — pedirle a Fábrica (HeroSuite/Irpavi) el video demo de cada
Skill y, para la Skill 6 (Community Manager), una versión simulada
navegable.

**Verificación:** `tsc --noEmit`, confirmar que una Skill sin `status`
definido cae en `'proximamente'` por default — nunca aparece activa sin
serlo.
