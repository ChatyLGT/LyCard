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
datos demo — sigue siendo la base, esto la extiende.

**Corrección de objetivo:** la Oficina Virtual del dueño es, en el fondo,
un **resumen ejecutivo de operaciones** — resultados finales + KPIs más
relevantes del negocio/programa. "Check de Realidad" de E1–E5 ya es ese
resumen; falta dejarlo explícito como propósito central (jerarquía visual
propia, no una sección más).

**Modelo de negocio — Negocio → Programa:**
- Un Negocio se convierte en Programa al pagar por al menos **1 paquete
  Legacy** (= 3 Agentes de Silicio) con mensualidad mínima de **USD
  100/mes**.
- Schema: `Program.legacyPackages Int @default(0)`,
  `Program.monthlySubscriptionUsd Int @default(0)`. Default
  `legacyPackages:1, monthlySubscriptionUsd:100` en la migración, para no
  desactivar Programas ya existentes.
- `upgradeToProgramAction(programId, legacyPackages, monthlySubscriptionUsd)`
  en `app/admin/programs/actions.ts` — valida el mínimo antes de togglear
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

### ⚠️ Insumo pendiente

Hay una referencia a un Excel de HeroSuite/Irpavi con el catálogo real de
Skills que Gunnar mencionó haber compartido — no se localizó en la revisión
de Drive hecha al escribir este documento. Antes de cerrar la lista final
de Skills, confirmar con Gunnar y cargar los datos reales de ese archivo —
no inventar el catálogo.

### Qué es

Catálogo de Skills que el N0 de cada Programa invoca puntualmente desde la
Oficina, vía Warren — mismo concepto que un AppStore: ícono, nombre,
estado (activo/próximamente) y qué hace.

**Skills ya reales en el código hoy:**

| Skill | Estado | Archivo |
| --- | --- | --- |
| Brief de reuniones (Fathom) | Activo | `lib/fathom.ts`, `components/FathomBriefBlock.tsx` |
| Gemelo Digital — demo guiada | Activo (demo) | `components/OfficeDemoChat.tsx` → pasa a `WarrenChat.tsx` |

**Skills mencionadas y diferidas en rondas anteriores del proyecto (no
construidas):** Notas de voz, Guías/speech de venta, Foto → avatar.

**Paso 1** — reusa `Program.officeSkills` (ya existe, `Json`), sumando
`category` y `status:'activo'|'proximamente'|'beta'` a cada entrada.

**Paso 2** — `components/SkillsAppStore.tsx` (nuevo): grilla de cards por
categoría, mismo lenguaje visual que `OfficeSkillsBlock.tsx` — se extiende,
no se reemplaza.

**Paso 3** — una vez confirmado el Excel: cada fila se mapea 1 a 1 a una
entrada de `officeSkills` con su categoría real.

**Verificación:** `tsc --noEmit`, confirmar que una Skill sin `status`
definido cae en `'proximamente'` por default — nunca aparece activa sin
serlo.
