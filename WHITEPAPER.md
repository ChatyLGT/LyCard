# LyCard / EinarOS / NashMesh — Visión, Modelo de Negocio y Estado del Proyecto

**Documento de continuidad.** Si estás leyendo esto porque una sesión anterior
se quedó sin contexto/crédito: este documento es autosuficiente. No hace
falta releer los ~60 documentos de Drive que generaron esta síntesis — están
resumidos acá. Para el detalle técnico fase-por-fase del código ya construido,
ver `PLAN.md` (documento hermano, en la misma carpeta). Este documento es el
"por qué" y el mapa completo; `PLAN.md` es el "cómo" y el log de commits.

Última actualización: 2026-09-17, sesión nocturna larga (auditoría del
funnel + diseño de la Oficina + síntesis completa del modelo de negocio,
de la mano de Gunnar explicando cada pieza).

---

## 0. Quién es quién en este documento

- **Gunnar Pareja Ballivián** — N0 (autoridad máxima), arquitecto de EinarOS,
  dueño de todas las decisiones de producto. `gunnarpareja@gmail.com`.
- **Sergio** — desarrollador, dueño de los microservicios, integraciones
  (Slack/Discord), y de convertir lo simulado en real cuando corresponda.
  Trabaja bajo "Mercosur Irpavi" (Irpavi = zona de La Paz, Bolivia).
- **René Sandoval** — dueño de HeroSuite (matching engine, ERP), autor de
  la propuesta técnica que ya está vendiendo (ver MLQR abajo).
- **Rogelio** — autor de la metodología de consultoría MIPYME sobre la que
  se basa "Legacy" aplicado a negocios.
- **Daniel Hergo** — presidente de Movimiento Laborista Quintana Roo (MLQR),
  primer cliente real y pagando.
- **Este agente (Claude, sesión Claude Code)** — construye y mantiene el
  repo `lycard` (este código). No construye HeroSuite, ni los microservicios
  de Sergio, ni el backend de EinarOS/Carbono — esos son proyectos
  paralelos de otras personas, documentados acá solo para dar contexto.

---

## 1. Qué es esto, en una frase

**LyCard es el canal de entrada** (una tarjeta digital + oficina virtual,
gratis o de bajo costo) **de un ecosistema más grande de consultoría
potenciada por IA para personas, MIPYMES y organizaciones** — el ecosistema
completo se llama EinarOS, y su motor de reparto de valor/talento se llama
NashMesh. LyCard no es "todo el negocio" — es la puerta de entrada visible
y el primer producto real que un usuario toca.

---

## 2. El problema que se está resolviendo

Tres problemas distintos, atendidos por la misma infraestructura:

1. **MIPYME desatendida** — el 80% de casi cualquier economía es MIPYME, y
   es el segmento menos atendido por tecnología/consultoría real: los
   consultores serios son caros y no atienden chico, los programas
   institucionales de apoyo tienen una brecha de implementación enorme
   entre lo que existe en papel y lo que llega al negocio del día a día.
2. **Talento sin monetizar** — gente con una habilidad real (vender,
   diseñar, enseñar, detectar errores) que no tiene forma de convertir eso
   en ingreso más allá de vender su tiempo 1:1.
3. **Captación política cara e ineficiente** — un partido chico no puede
   competir gastando en brigadas tradicionales contra partidos con 10-18x
   más presupuesto (caso real: MLQR tiene 18 veces menos presupuesto
   oficial que Morena en Quintana Roo). Necesita "cambiar de cancha" en
   vez de jugar el mismo juego con menos fichas.

---

## 3. LyCard — qué es, hoy, en código real (este repo)

Plataforma multi-programa de tarjetas digitales. Cada persona (`Member`)
puede tener hasta 3 tarjetas (`Card`, tipo `project`/`company`/`personal`),
agrupadas bajo un `Program` (ej. Legacy). Ya construido y en producción
(ver `PLAN.md` para el detalle fase por fase, Fases 0 a 9.6):

- Auth real de Miembro (Google + WhatsApp OTP simulado), sesión separada
  de Admin.
- Onboarding conversacional simulado tipo WhatsApp (`/m/onboarding`).
- Entrevista como gate de activación (`Registration` → `completeInterviewAction`
  activa la membresía y crea las 3 tarjetas automáticamente).
- Editores propios por tipo de tarjeta (`/m/dashboard/*`).
- Oficina Virtual real (Fase 7): portfolio/currículum (`Card.officeItems`),
  distinto contenido por tipo de tarjeta.
- Sistema de niveles/badges: Medallón, Sabiduría/Jerarquía, Puestos (sigla +
  denominación), configurables por cada N0 de Programa (Fase 9 completa).
- Red de clientes por tarjeta de Empresa (`CardNetworkMembership`), con
  badge N0/N1/NA visible — el germen de lo que en la teoría se llama
  "Malla".
- Multi-programa con dos niveles de administración (MasterN0 global, N0
  acotado por Programa).
- Skins de marca por Programa (parseo real de `design.md`, hasta 3 por
  Programa, aplicación real a la tarjeta).

**El objetivo del software** (por qué existe LyCard específicamente): ser
el punto de entrada de fricción mínima — una tarjeta digital gratis que
cualquiera puede recibir y usar — que después, mediante un proceso de
onboarding y diagnóstico, se convierte en la interfaz de una Oficina
Virtual con un equipo de agentes de IA armado a medida para esa persona o
negocio. Es el "lead magnet" y a la vez el producto final: la misma
interfaz que capta también sirve.

---

## 4. El ecosistema completo (fuera de este repo, para dar contexto — no se construye todo acá)

### 4.1 EinarOS

Sistema operativo de inteligencia diseñado para que el criterio/conocimiento
de una persona no se degrade al pasar por una máquina. Cuatro dominios:

- **Carbono** — el dominio humano (criterio, historia, decisiones — lo que
  no se puede automatizar, solo escuchar).
- **Silicio** — el dominio máquina (agentes de IA entrenados con el
  "Códice" de cada persona, ejecutan 24/7).
- **Bridge** — la capa de traducción entre ambos, preserva fidelidad.
- **HorusEye** — la auditoría; verifica que nada se distorsione o
  contamine en el camino.

Doctrina fundacional (inmutable, no reinterpretable por ningún agente):
**z = z² + t³** — z (estado/memoria viva) se procesa (z², el trabajo
recursivo de la red de agentes) guiado por t³ (Tiempo·Energía·Consciencia,
la variable antientrópica que preserva la intención original de N0).

**Punto clave, corregido en esta sesión (Gunnar fue explícito):** EinarOS
**no propone agentes que trabajen solos** — propone agentes que potencian
decisiones y trabajo de expertos/especialistas humanos. El copy de algunos
documentos de diseño ("tu IA trabajó 80 horas mientras vos dormías") suena
a autonomía total; la arquitectura real (Carbono/Silicio/Bridge separados,
con N1 humano coordinando y N2 auditando) es human-in-the-loop por diseño.
Ese es un gap de *comunicación*, no de arquitectura.

Hay código real arrancado (no solo diseño): un reino "CARBONO" con app
FastAPI + SQLAlchemy + auth, documentado en la carpeta de Drive de EinarOS
(fuera de este repo).

### 4.2 NashMesh

Motor de **reparto de valor y registro de contribución**, NO un motor de
pago (corregido explícitamente por Gunnar en esta sesión — el uso de
blockchain/ledger es para **trazabilidad absoluta de participación y
propiedad intelectual**, no para procesar pagos). Fórmula:

```
Payment_i = φ_i × ψ_i × (1 - ε)
```

- **φ (Shapley Value)** — tu contribución real a un resultado, calculada
  (no arbitraria) — teoría de juegos cooperativos legítima.
- **ψ (Reliability Weight)** — tu consistencia, empieza en 0.60, se
  recalcula mes a mes según entrega/calidad/retención de clientes.
- **ε** — comisión de infraestructura (3-5%).

Se llama "Malla" y no "red" porque no hay un jefe repartiendo a dedo — una
capa de auditoría calcula y registra. **Nota de esta sesión:** todas las
cifras de ejemplo en los papers de diseño (Marisol ganando $14k/mes, etc.)
son simulaciones de diseño, no datos reales — Gunnar lo confirmó
explícitamente. Nada de esto se ha vendido todavía; lo más cercano a
producción real es MLQR (ver 4.6).

### 4.3 Gemelo Digital

Una IA entrenada con el "Códice" de una persona (su conocimiento
documentado en sesiones estructuradas: quién es, su don, su metodología).
**Decisión de esta sesión para LyCard:** en la implementación de la
Oficina Virtual, el Gemelo Digital es **asistente + dashboard clásico
atrás**, no el operador autónomo de la visión completa — dirige a la
persona a las pantallas reales del sistema, no reemplaza el trabajo
humano.

### 4.4 Legacy / Legacy Corp

**Legacy** (personal) — programa de 4+ semanas que extrae el criterio de
una persona (ej. caso real: Rafael Rico Carrascosa, investigador bíblico,
creador de "Mayordomo 4.0") y lo convierte en un Códice operable + equipo
+ oficina virtual que sigue produciendo cuando esa persona no está.

**Legacy Corp** (empresas) — el mismo proceso aplicado a una empresa
completa, con estructura fractal interna: N0 (dueño) → N1 (triada
obligatoria: Einar=estrategia, Chaty=coordinación, Warren=orquestación) →
N2 (Guardianas, auditoría/doctrina) → N3 (Expertos) → N4 (Especialistas).
Tres tiers de precio: Tier 1 $3,500 (PyME), Tier 2 $10,000 (corporativo),
Tier 3 Custom.

**Aclarado en esta sesión (punto crítico para el modelo de negocio):** el
modelo NO es "comprás un lugar en la red para cobrar de otros" — es "una
empresa compra la herramienta para usarla en SU PROPIO negocio", porque
vio que le funcionó a su "programa patrocinador". El dueño de una empresa
con 5 empleados le paga la tarjeta del Programa a cada empleado porque
cumplen una función ahí; y EinarOS le da a ese dueño la oportunidad de
convertirse en N0 de su propia empresa — no porque compre el modelo para
cobrar en red, sino porque quiere los mismos "robots" para su propio
negocio (ejemplo real que dio Gunnar: alguien que ya tiene los robots en
su trabajo formal y los quiere también para su negocio nocturno de
sándwiches gourmet). Esto desactiva la principal alarma de "esto es un
MLM" — la transacción central es adopción de herramienta para uso propio,
no reclutamiento para comisión. El único lugar donde sigue habiendo una
mecánica tipo-override es en la red de **especialistas propios de
EinarOS** (SHERPA/ANCIENT cobrando royalty de gente que certificaron) —
esa pieza puntual sí necesita revisión legal cuando se empiece a cobrar
plata real (ya la están viendo abogados expertos, según Gunnar).

### 4.5 Niveles de Acceso / Sabiduría

Seeker → Padawan → Mutant → Superhuman → Sherpa → Ancient. **Ya
implementado en LyCard** como `RANKS` (`lib/data.ts`) — el badge de
Sabiduría que cualquier tarjeta ya muestra. No hace falta modelo nuevo.

### 4.6 MLQR — Movimiento Laborista Quintana Roo (cliente real, pagando, HOY)

El caso de uso más avanzado y el único con dinero real circulando. René
Sandoval ya construyó y vendió: tarjeta digital + WhatsApp con IA + base
de datos estructurada + dashboard ejecutivo, para captar y dar seguimiento
a registros de afiliados. Meta Fase 1: ~27,000 registros. Precio real:
setup USD $1,200 + IVA, luego USD $300/mes + IVA fijo + variable por
metas. Argumento de venta: "cambiar de cancha" (inspirado en la estrategia
de Milei en Argentina) — en vez de competir gastando en brigadas
tradicionales (MLQR tiene 18x menos presupuesto que Morena), construyen
una red donde cada afiliado registrado recibe su propia tarjeta digital y
se vuelve un punto de captación — la red multiplica, la brigada solo suma.

**Regla de oro ya aplicada y que hay que mantener siempre:** en material
de cara al cliente NUNCA se menciona NashMesh, Shapley, blockchain, ni
niveles internos (N0-N12) — eso es arquitectura interna, no argumento de
venta. Tampoco se usa iglesia/pastores como canal de ningún tipo — es
proselitismo de ministros de culto y le puede costar el registro legal al
partido. Esta disciplina ya existe (instrucción explícita de Gunnar a su
equipo) y hay que preservarla a medida que el equipo crezca.

**Esto es también el "programa patrocinador" que paga el MVP de la
distribución gratuita de tarjetas** (ver sección 5).

### 4.7 TalentMatch / HeroSuite Matching Engine (René)

Dos motores de matching relacionados pero distintos:

- **TalentMatch** — documenta el talento individual de una persona (2
  horas de sesión), lo entrena en una IA, la IA responde por esa persona
  24/7. 3 niveles de acceso: Observador ($10, solo mirar), Ejecutor ($45
  total, gana $50-200/mes), Empresario ($600 total, escala su negocio
  entero). Explícitamente dice "no es MLM" en su propio material.
- **HeroSuite Matching Engine** — motor B2B/B2G: matchea empresas/
  proveedores con oportunidades (proyectos, licitaciones) según
  capacidades/requisitos/territorio/crédito/volumen, calcula % de match,
  identifica "brechas" (qué falta para ser elegible), y convierte cada
  brecha en una oportunidad de negocio nueva dentro de la red. Es el motor
  de matching de **empresas**, no de personas — sirve como "Directorio
  Empresarial" de HeroSuite.

**Idea nueva de esta sesión (Gunnar):** cruzar TalentMatch con el matching
engine de HeroSuite — "un TalentMatch con un Tinder Corp" — talento
individual matcheado contra oportunidades reales dentro de empresas
MIPYME o tractoras. No hay modelo nuevo que inventar: es el mismo motor de
HeroSuite aplicado a un tipo de nodo distinto (persona en vez de empresa).

### 4.8 B4W / EnCadena Bolivia (producto paralelo, con respaldo institucional real)

Metodología de desarrollo de proveedores para Bolivia, con precedente real
y medido en 3 países: México (PNUD/Nafin, 4,200 PyMEs, +15% facturación en
la recesión de 2009), Colombia (BID, programa EnCadena, US$26.1M en
ventas adicionales + 277 empleos en fase piloto), Sudáfrica (SCNet.co.za,
+100 mil pymes). El programa boliviano ("EnCadena Bolivia") conecta
MIPYMES proveedoras con empresas ancla (IED — inversión extranjera
directa) vía 3 componentes: (I) Portal de Vinculación Digital — esto ES
HeroSuite Matching Engine; (II) Cierre de Brechas Críticas (categorías:
Tecnológica/Procesos, Certificación, Talento/Gestión) — esto es
exactamente lo que el diagnóstico + equipo de agentes de la Oficina
Virtual está pensado para resolver; (III) Módulo Financiero de Capital de
Trabajo con la Banca de Desarrollo de Bolivia. Gobernanza: Comité
Estratégico (Ministerios + BID + PNUD), Comité Técnico (Cámaras + banca de
desarrollo), Unidad Ejecutora Externa. Roadmap de implementación: 30
meses.

**Estado real (aclarado en esta sesión):** es un producto paralelo,
**todavía no firmado**. Una vez firmado, se conecta la base de datos —
conviene tanto a las cámaras como a las pymes, ya está hablado con las
partes. No forma parte todavía de la ejecución activa de LyCard.

### 4.9 Catálogo de servicios Irpavi / HeroSuite (el inventario real de "robots")

Existe un inventario real (hoja de cálculo de Gunnar) con decenas de
servicios ya vendidos o vendibles, con precio real, de dos empresas:

- **HeroSuite**: Módulo Transportes, Directorio Empresarial, Módulo
  Inmobiliario, Software a la Medida, Diagnóstico de Madurez Digital,
  Learning.
- **Mercosur Irpavi** (equipo de Sergio, La Paz, Bolivia): catálogo enorme
  de infraestructura (cloud, backup, firewall, WAF, storage), y
  específicamente **Agentes de IA para atención comercial** (TP $1,650),
  **Agentes de IA para soporte técnico** (TP $1,650), **Chatbots
  WhatsApp/web** ($4,500/año), **Automatización de leads** ($4,500/año),
  más SEO/SEM/Ads, licitaciones públicas (scraping SICOES Bolivia/Chile),
  e-commerce, IoT, ISP/WISP, ciberseguridad — y una línea de producto
  propia llamada **"Gemelos Digitales"**.

Esto es la materia prima real para el catálogo de "agentes por rubro" que
la Oficina Virtual necesita ofrecer en el diagnóstico — no hay que
inventarlo desde cero, hay que decidir cuáles de estas líneas se
**simulan** dentro de LyCard (decisión explícita de Gunnar: por ahora todo
lo que sea bot se simula, igual que el WhatsApp de la tarjeta — Sergio se
encarga de eso, este repo se enfoca en el canal de entrada).

---

## 5. Cómo encajan las piezas — mapa de responsabilidades

```
                    ┌─────────────────────────────────────┐
                    │        MLQR (cliente real, HOY)       │
                    │  paga el MVP de distribución gratis   │
                    └───────────────┬───────────────────────┘
                                    │ financia
                                    ▼
        ┌───────────────────────────────────────────────────┐
        │   LyCard (ESTE REPO) — canal de entrada gratuito    │
        │   tarjeta digital + oficina virtual básica          │
        │   Construido y mantenido por Claude/Gunnar          │
        └───────────────┬───────────────────────┬─────────────┘
                        │ onboarding             │ diagnóstico
                        ▼                        ▼
        ┌─────────────────────────┐   ┌───────────────────────────┐
        │  Legacy / Legacy Corp    │   │  Catálogo de agentes        │
        │  (Códice + estructura    │   │  (HeroSuite + Irpavi,        │
        │   N0-N4 por empresa)     │   │   simulados por ahora)       │
        └───────────┬───────────────┘   └──────────────┬─────────────┘
                    │                                  │
                    ▼                                  ▼
        ┌─────────────────────────────────────────────────────────┐
        │   NashMesh — registro de valor/contribución/IP            │
        │   (trazabilidad, NO motor de pago)                        │
        └─────────────────────────────────────────────────────────┘

  En paralelo, sin bloquear lo anterior:
  - HeroSuite Matching Engine (René) — empresas↔oportunidades, y
    próximamente talento↔oportunidades (TalentMatch + Tinder Corp).
  - B4W/EnCadena Bolivia — pendiente de firma, gobierno+BID+PNUD.
```

**Quién construye qué:**
- **LyCard (este repo, Claude)**: la tarjeta, el onboarding, la Oficina
  Virtual, el sistema de niveles/Puestos/skins — el canal de entrada.
- **Sergio**: microservicios reales, integración Slack/Discord, convertir
  bots simulados en reales, refinar el onboarding automático.
- **René**: HeroSuite (ERP + matching engine).
- **Abogados**: Términos y Condiciones (pendiente, "primordial que se
  haga" — palabras de Gunnar), y revisión de la mecánica de royalties
  SHERPA/ANCIENT antes de que circule dinero real.

---

## 6. Qué se hizo en ESTA sesión (continuidad exacta — empezar leyendo acá)

1. Se creó el repo `github.com/ChatyLGT/lycardmisocio` y se subió
   `cnv_respaldo_app.tar` (backup limpio, sin `.env.local`, de la app
   Ciudad Nueva Vida/NexID — resultó ser el repo de referencia de
   "MayanCity" que estaba bloqueando el Grupo K del backlog).
2. `PLAN.md`, Fase 10: auditoría del funnel de entrevista actual
   (`registerInterviewAction` sin validar email, cero rate-limiting en
   toda la app, slots hardcodeados sin cupo, sin dedupe de registros) +
   hallazgo de que el patrón de horarios recurrentes de CNV
   (`admin/webinars/schedule.tsx`) resuelve la pregunta abierta de
   "¿slots recurrentes o puntuales?" del Grupo K.
3. `PLAN.md`, Fase 11: diseño del "Letrero" (primera pantalla pública de
   la Oficina Virtual — video + causa/links + KPIs Portafolio/Malla/
   Cartera + botón "Gemelo Digital" → dashboard privado por Legacy Corp),
   con mapeo honesto de qué se construye ya (Portafolio=`officeItems`,
   Malla=`CardNetworkMembership` como badge) vs. qué es cáscara (Cartera,
   Gemelo Digital autónomo — requieren infraestructura que no existe
   todavía).
4. Conversación larga de modelo de negocio con Gunnar explicando cada
   pieza (resumida completa en la sección 4 de este documento) — incluyó
   revisión de ~15 documentos de Drive (NashMesh, Legacy Corp, Gemelo
   Digital Operacional, Niveles de Acceso, TalentMatch, HeroSuite,
   B4W/EnCadena Bolivia, propuesta real a MLQR, inventario de servicios
   Irpavi) y varias correcciones de mi lectura inicial (no es MLM en el
   sentido que asumí; los agentes potencian, no reemplazan; blockchain es
   para registro de valor/IP, no para pagos).
5. **Este documento (`WHITEPAPER.md`)** se creó como síntesis de
   continuidad, a pedido explícito de Gunnar ("por si nos quedamos sin
   crédito").

**Cero cambios de código de producto en esta sesión** (fue una sesión de
auditoría, diseño y documentación, por decisión explícita de Gunnar cada
vez que se le preguntó alcance). Los únicos commits fueron a `PLAN.md`,
al tar de `lycardmisocio`, y a este archivo.

---

## 7. Qué falta por hacer (priorizado)

### Corto plazo (próxima sesión de código)
- [ ] **Malla 3D navegable** (`3d-force-graph`/three.js + técnica de
      "nodos fantasma" para agrupar sin pelear con la física) — spec
      completa en `PLAN.md`, Fase 12. Demo interactiva ya entregada por
      chat en esta sesión; falta integrarla al repo con datos reales.
      Candidata directa a dashboard de MLQR (Fase 12, punto F).
- [ ] Definir dónde vive el video/causa/links del Letrero: ¿a nivel
      `Program` o a nivel `Card` individual? (pregunta abierta, Fase 11).
- [ ] Migrar `lib/interviewSlots.ts` (hardcodeado) a modelo real
      `AvailabilitySlot`, usando el patrón de recurrencia descubierto en
      CNV (plantilla + rango de fechas + días de semana + hora → preview
      → confirmar) en vez de fechas sueltas.
- [ ] Validación de email + rate-limiting en las 4 server actions
      públicas de `app/c/actions.ts` (hallazgos de la Fase 10).
- [ ] Construir la sección "Mi Red"/Malla dentro de la Oficina Virtual
      pública de Empresa (hoy `CardNetworkMembership` solo es panel de
      admin del dueño, no se ve en la vista pública).
- [ ] Decidir y construir el catálogo de "agentes simulados" para el
      diagnóstico de la Oficina, tomando como base las líneas del
      inventario Irpavi/HeroSuite (sección 4.9) que Gunnar priorice.

### Mediano plazo
- [ ] Términos y Condiciones — "primordial", palabras textuales de
      Gunnar. No hay ningún borrador todavía.
- [ ] Documento de integración técnica entre LyCard, HeroSuite y los
      microservicios de Irpavi (qué expone cada API, cómo se consumen)
      — Sergio va a mandar una indicación para empezar a documentar esto.
- [ ] TalentMatch + HeroSuite Matching Engine cruzados ("Tinder Corp") —
      todavía sin diseño concreto, solo la idea.
- [ ] Revisión legal específica de la mecánica de royalties SHERPA/ANCIENT
      (override sobre especialistas certificados) antes de que circule
      dinero real — ya la están viendo abogados, falta el resultado.

### Largo plazo / visión completa (no para una sesión corta)
- [ ] Gemelo Digital autónomo real (requiere Códice + entrenamiento por
      persona + auditoría en vivo) — hoy es cáscara/asistente.
- [ ] Motor NashMesh de registro de valor/IP real (requiere decidir
      blockchain permisionado vs. ledger con hash-chaining vs. blockchain
      pública, y diseñar qué se registra).
- [ ] Conexión con B4W/EnCadena Bolivia — pendiente de firma con
      gobierno/BID/PNUD.
- [ ] Marketplace de onboarders pagados (idea nueva de esta sesión: cardholders
      certificados cobran ~$15/hora por hacer onboarding a otros MIPYMEs,
      grabado con Fathom o similar, idealmente integrado a Slack/Discord
      — Sergio está viendo la integración). Pendiente: contrato tipo
      revisado localmente por país antes de escalar, y rúbrica de
      auditoría de calidad (HorusEye) para esas sesiones.

---

## 8. Decisiones ya tomadas (no repreguntar)

- El regalo de tarjetas/oficinas básicas en el MVP lo paga MLQR como
  programa patrocinador — no es "gratis para todo el mundo" sin gate de
  costo.
- El Gemelo Digital en LyCard es asistente + dashboard clásico, no
  operador autónomo (por ahora).
- Legacy Corp no es sinónimo de `Program` en el schema — es un producto/
  servicio más rico, pero su jerarquía interna (N0-N4) se puede modelar
  con lo que ya existe (`Puesto`).
- Todo lo que sea bot/agente se simula en LyCard por ahora (mismo patrón
  que el WhatsApp OTP y la transcripción simulada) — Sergio decide cuándo
  y qué se vuelve real.
- Blockchain/NashMesh es para registro de valor y propiedad intelectual
  trazable, no para procesar pagos.
- En material de cara a clientes reales (ej. MLQR) nunca se menciona
  NashMesh, Shapley, blockchain, ni niveles internos — y nunca se usa
  iglesia/pastores como canal, por razones legales.

## 9. Preguntas abiertas (pendientes de Gunnar)

- ¿Dónde vive el contenido del Letrero (video/causa/links): `Program` o
  `Card`?
- ¿Cuál es el documento/indicación que va a mandar Sergio para empezar a
  documentar la integración técnica?
- Contrato tipo para onboarders pagados ($15/hora) — ¿ya existe un
  borrador o hay que partir de cero?
- Resultado de la revisión legal de abogados sobre la mecánica
  SHERPA/ANCIENT — todavía no llegó.
