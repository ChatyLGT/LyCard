# Roadmap — EDT de lo que falta construir

Nivel de detalle: a archivo y campo de schema, para ejecutar sin dudas.
Nada de esto está construido todavía — es plan, no estado actual (para lo
que sí existe, ver [04-MODULOS.md](./04-MODULOS.md)). Sigue el mismo patrón
ya probado 5 veces en el repo (ver
[02-ARQUITECTURA.md](./02-ARQUITECTURA.md#el-patrón-que-se-repite-en-todo-el-repo)).

Orden de prioridad si el tiempo aprieta: ~~HR → PM~~ (shippeado, ver abajo) **→
CRM → Oficina/Negocio → NashMesh → MachineEngine → AppStore de Skills** (los
dos primeros eran lo que el equipo necesitaba para saber quién hace qué; el
resto es negocio/producto).

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

## Módulo HR — ✅ shippeado (2026-09-22, v1.31.0)

Ver [04-MODULOS.md](./04-MODULOS.md#equipo-interno--módulo-hr--pm) para
los archivos reales. El plan de abajo queda como referencia histórica de
diseño — el schema final es prácticamente idéntico a lo planeado acá,
salvo que el campo de formulario `nodeType` se expone como `kind` en el
HTML (bug de hidratación de React, ver el módulo en 04-MODULOS.md).

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

## Módulo PM — ✅ shippeado junto con HR (2026-09-22, v1.31.0)

Vista de `ProjectNode` (del Módulo HR) enfocada en avance/responsables —
mismo dato, otro acordeón, no una tabla nueva.

**lib/pm.ts** (nuevo): `groupProjectsByDomain`, `groupProjectsByProgram`,
`isBlocked(project)`. **UI**: pestaña adicional en `/admin/equipo/page.tsx`
(toggle Dominio/Programa, barra de `progressPct`, chip rojo si bloqueado).
**Poblar** con proyectos reales de hoy: LyCard (Oficina Virtual), MVP del
partido MLQR, esta documentación, Panel NashMesh, MachineEngine.

**Verificación:** `tsc --noEmit`, confirmar que el toggle no duplica filas.

## Módulo CRM

**Nota (2026-09-23):** antes de este módulo grande se shippeó una
versión mucho más chica y ya en producción — "Seguimiento" (modelo
`CardLead`, ver [04-MODULOS.md](./04-MODULOS.md#seguimiento-cardlead)):
por Card, sin puntaje de calidad ni Sherpa, solo "a quién le compartí
esta tarjeta y qué pasó después" (invitación, QR, mensaje, entrevista).
Pedido explícito de Gunnar como paso previo — el CRM de abajo (pipeline
de Sherpa, 5 dimensiones de calidad) sigue siendo roadmap, no se toca
todavía.

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

### Pendiente de definir: CRM del dashboard vs CRM de la Oficina Virtual

Gunnar marcó (2026-09-19, textual: "no sé si es lo mismo siendo fractal
para ser honesto") que hay una segunda idea de "CRM" distinta a la de
arriba, todavía sin especificar del todo: un CRM/auditoría **del propio
panel de Admin** — control y registro de la creación de Programs, Cards,
etc. — no del pipeline de onboarding de un cliente. Primer ladrillo real
ya construido: `AdminLoginEvent` (bitácora de todo login de Admin, ver
[04-MODULOS.md](./04-MODULOS.md)). Falta definir con Gunnar si esto se
extiende a loguear TODA acción de escritura del panel (crear Programa,
crear Card, cambiar un Admin de scope, etc.) como una bitácora genérica,
o si son cosas separadas — no construir el resto de esto sin esa
definición.

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

### Modelo de negocio: 3 ejes {#modelo-de-negocio-3-ejes}

**Estado real:** cero clientes hoy — la app no salió al mercado, todo esto
es tesis de venta (leads/apuestas), no facturación confirmada. MLQR es el
lead más avanzado y tampoco pagó todavía.

**Cerrado el 2026-09-24** — reemplaza por completo al modelo viejo de
"4 planes que se eligen" (Freemium/Automatizado/Normal/Enterprise como
puerta de entrada, con `Program.planTier` bloqueando el acceso). Lo que
antes se mezclaba en un solo eje son en realidad **3 ejes
independientes entre sí**:

#### Eje A — Programa es un umbral que se cruza, no un plan que se elige

Un Chido (persona que pagó y pasó por el proceso Legacy completo) se
convierte en **N0 de su propio Programa** en el momento exacto en que
tiene **1+ persona humana real activada bajo él** — no importa cuántos
agentes IA tenga, eso es indiferente para el umbral.

**✅ Ya construido y shippeado (Fase P1, v1.52.0)** — a diferencia de
todo lo demás de esta sección, esto no es roadmap, es código real en
producción:

1. El Chido recluta a un humano (flujo self-service de siempre, o
   invitación).
2. Ese humano pasa por su propio proceso de entrevista real bajo
   Legacy — mismo pipeline que ya existe (`registerInterviewAction` →
   `completeInterviewAction`), sin estado intermedio de "Programa
   embrionario".
3. Al activarse esa membresía, `lib/programPromotion.ts#checkAndPromoteToPrograma`
   **computa solo** (nadie aprueba un paso aparte) si el referente ya es
   Chido (`membershipPaidAt` seteado) y ahora tiene 1+ referido activo.
4. Si el umbral se cruza: nace el Programa nuevo (la Card de Empresa del
   Chido se vuelve su raíz), se crea un `Admin` linkeado por
   `Admin.memberId` (sin password/email propios — su sesión de Member de
   siempre le da la autoridad), y la membresía+Cards del humano recién
   activado migran del Programa Legacy al nuevo. La vieja Card de
   proyecto del Chido (su relación con Legacy) queda intacta, etiquetada
   **"Programa Legado"**.
5. La Oficina Virtual de ese humano recién activado, armada según su
   función (Puesto→Superpoderes específicos) — **este paso 5 sigue sin
   construir**, fuera de la Fase P1 a propósito.

Los dos disparadores reales (activar una entrevista con referente ya
pago, o marcar pagada una membresía que ya tenía un referido activo) y
el detalle completo de verificación están en `PLAN.md`, entrada "Fase
P1: detección + promoción automática Chido→Programa".

**Nota que corrige una regla vieja**: esto reemplaza la "regla dura" que
decía que un N0 de Programa nuevo siempre lo da de alta MasterN0 a mano
vía `/admin/programs` — eso sigue siendo cierto para un Programa creado
desde cero por MasterN0, pero un Programa que nace de este umbral se
crea solo, sin ese paso manual. Ver
[02-ARQUITECTURA.md#regla-dura-quién-puede-volverse-adminn0](./02-ARQUITECTURA.md#regla-dura-quién-puede-volverse-adminn0).

**"Programa Legado" es el principio recursivo "todo nace de Legacy" hecho
dato, no solo discurso** — Irpavi, HeroSuite, Digital Kingdom, MLQR,
Conce, todos pasaron/pasan por Legacy como si fueran clientes, y de cada
uno nace lo suyo después. Que la vieja Card de proyecto nunca se borre ni
se oculte al cruzar el umbral es ese principio aplicado: nadie tiene
contexto/acceso legítimo sin un origen trazable (mismo espíritu que
Protocolo Dharma).

#### Eje B — el embudo Mirón → Vividor → Chido → Chido+

Nombres 100% internos (Gunnar: "si sale a la luz nos cuelgan") — nunca en
la app ni en marketing.

1. **Mirón** — visitante sin cuenta al que le comparten una LyCard. Solo
   ve esa tarjeta puntual. Ya construido: es el `VisitorOficina` de hoy.
2. **Vividor** — se registra self-service, **sin que nadie apruebe
   nada**. **✅ Ya construido (v1.49.0)**: `ensureLegacyMembershipAndCards`
   le da sus 3 Cards al toque, con Oficina Virtual real desde el día
   uno — Superpoderes, WowStore, Modo Foco, todo lo construido hasta hoy
   en este repo es, en los hechos, el nivel Freemium/Vividor. **No pasa
   por ninguna entrevista** — corrige una ambigüedad vieja de este mismo
   documento (que sugería lo contrario).
3. **Chido** — paga, pasa por la entrevista Legacy real, arma su Oficina
   Virtual. El nivel de personalización depende de qué compró.
4. **Chido+** — variantes de escalamiento sobre Chido. **Sin definir en
   detalle todavía** (palabras de Gunnar).

Un Chido con solo agentes IA bajo él (cero humanos reales) sigue siendo
Chido para siempre — nunca cruza al Eje A.

#### Eje C — precio a la carta por WowApp/Superpoder

Cada Skill tiene su propio precio (suscripción o pago único),
independiente de si sos Vividor o Chido. Un Vividor puede comprar una
WowApp puntual sin pagar membresía. **✅ Ya construido y shippeado**:
WowStore (desde v1.53.0) — ver la sección
[Modelo de precio a la carta](#modelo-de-precio-a-la-carta-nueva-capa-de-monetización)
más abajo, que es la implementación real de este eje.

#### Qué queda de los $ de infraestructura (Automatizado/Normal/Enterprise)

Los montos que antes eran "el plan que alguien elige para entrar" no
desaparecen — cambian de rol. Pasan a describir el costo de
infraestructura de agentes que un Programa **ya formado** (ya cruzó el
Eje A) sigue pagando según cuánto necesite: sin Sherpa dedicado, 3
Agentes de Silicio con objetivos acotados, o ~10 agentes a medida + 3
empleados convertidos en Agentes Legacy. **Sin campo `planTier` real en
el schema todavía** — el draft de abajo queda como referencia de forma,
no como bloqueador de acceso (eso ya no existe, ver Eje A).

```prisma
model Program {
  // ...existentes...
  infraTier              String  @default("normal") // "automatizado" | "normal" | "enterprise"
  setupFeeUsd            Int     @default(0)
  monthlySubscriptionUsd Int     @default(0)
  commissionOnSalesPct   Float?  // solo Enterprise
}
```

**3 motores de venta (GTM), sin cambios por este modelo:**
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

### Simulador de escenarios fractales a escala (pedido de Gunnar, 2026-09-19 — sistema aparte)

Distinto del "Paso 3" de abajo (que simula UN proyecto cargado a mano,
nodo por nodo). Lo que pidió Gunnar es un **generador de escenarios
masivos** para estresar el fractal completo y ver qué pasa con los
pagos/comisiones a escala real — cita textual: *"quiero saber qué pasa
si a Legacy le pongo 12 programas y a cada programa 12 empresas y a
cada empresa 12 legacys... simular proyectos para ver qué pasa con los
pagos."*

Conecta con dos piezas que ya existen o están planeadas:
- `Card.isDemo`/`Program.isDemo` (Fase E1, ya en schema) y el ambiente
  de datos mock de Fase E5 (arriba, "Oficina Virtual") — mismo
  mecanismo de generación en bulk, marcado y borrable de un tirón, pero
  ahí pensado para Cards/Oficinas de ejemplo, no para árboles
  fractales completos con N niveles de profundidad configurable.
- `NashMeshRun`/`computePayment` (Paso 1-2 de abajo) — el motor de
  cálculo de pagos ya planeado; el simulador de escenarios lo llamaría
  en bulk sobre datos generados, no reemplaza ese motor.

**Explícitamente marcado por Gunnar como "un sistema aparte que debemos
armar, y Fabricio debe considerar"** — no se construye en esta ronda.
Falta definir con Gunnar, antes de especificarlo en serio: los
parámetros del generador (profundidad, fan-out por nivel, si es
determinístico o con variación aleatoria), qué se mide como salida
(¿solo pagos totales? ¿por nivel? ¿tiempo de cómputo a esa escala?), y
si vive en `/admin/nashmesh` como una pestaña más o es una pantalla
separada.

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

Esta sección es el **Eje C** del [modelo de negocio de 3 ejes](#modelo-de-negocio-3-ejes)
de arriba — **cada Skill puede tener su propio precio por profundidad de
uso**, independiente de si sos Vividor o Chido — ejemplo real de Gunnar:
Brief de las últimas 3 reuniones = $1/mes; sumás recordatorios + tareas +
agenda + calendario integrado = sube el precio. Es un add-on por Skill,
nunca depende de un plan de Programa completo.

**Ya construido y shippeado como WowStore** (desde v1.53.0): catálogo
navegado por rubro+dolor de negocio (`lib/wowApps.ts`,
`app/m/wowstore/*`), con instalación directa o pedido de adaptación a
medida por WowApp, precio propio por cada una (`WowApp.basePriceUsd`).
El plan original de abajo (extender `Program.officeSkills` con
`pricing`) quedó superado en la práctica por el modelo Catálogo (`WowApp`)
+ Instalación (`WowAppInstall`), que vive fuera de `Program` a propósito
— ver PLAN.md, "WowStore — Fase W1", sección "Hallazgo de arquitectura",
para el porqué (un Vividor sin Programa también puede instalar WowApps).
Lo que sigue documentado abajo es el plan histórico, útil como contexto
de cómo se llegó al diseño real.

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
