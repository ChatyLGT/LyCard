# Adenda al WHITEPAPER — Radiografía de la Tarjeta, Metodología LGT, Funnel de Creación y Canales de Monetización

**Fecha:** 2026-10-07
**Motivo:** después de limpiar toda la data falsa de producción (reset completo vía
`/admin/reset`), Gunnar pidió frenar la ejecución y trabajar **pura lógica de
negocio primero** — cómo se crean los Programas, cómo se liga todo, qué
experiencia tiene el usuario, y cómo se monta la metodología LGT (Life
Gamification Theory) encima de la tarjeta real. Este documento es el registro
de esa sesión de diseño: nada de lo que está acá se ejecutó en código salvo
lo explícitamente marcado como "ya shippeado" (con su referencia a
`PLAN.md`). Se lee junto con `WHITEPAPER.md` — no lo reemplaza, lo completa.

---

## 1. Lo único de esta ronda que SÍ se shippeó (referencia, no duplicar detalle)

**v1.82.0** (`PLAN.md`, 2026-10-07) resolvió el defecto concreto que disparó
toda esta conversación — "hay dos Legacys, HeroSuite no se conecta a
ninguno, no puedo poner un miembro":

- `Program.isRoot` con índice único parcial en Postgres — ya no puede
  existir una segunda raíz, ni por bug ni por error humano.
- Crear un Programa nuevo exige elegir un origen real (`lib/programLineage.ts`,
  detección de ciclos multi-hop incluida).
- `addMemberToProgramAction` — un N0 ya puede sumar un Miembro directo a SU
  Programa sin pasar por el funnel público de WhatsApp/Google (que siempre
  aterrizaba en Legacy).
- Cookie de sesión de Admin: 12h → 30 días (bug de reconexión constante).

Detalle completo, migraciones y tests: ver `PLAN.md`, entrada
"2026-10-07 -- Linaje de Programas + alta directa de Miembros (v1.82.0)".

Después de esto, Gunnar borró **toda** la data de producción con el botón
de reset (`resetPlatformAction`) y confirmó la base limpia. Todo lo que
sigue en este documento es diseño sobre una plataforma vacía, de cero.

---

## 2. Linaje fractal de Programas — el modelo de crecimiento

Confirmado por Gunnar, sin ambigüedad:

- **Legacy es la única raíz.** Todo Programa nuevo deriva de un Programa
  previo — nunca hay un segundo huérfano (ver sección 1, ya enforced en DB).
- **Dos caminos de nacimiento de un Programa**, ambos válidos:
  1. **Top-down**: un N0 existente crea manualmente un Programa hijo y le
     asigna un nuevo N0 (ej. Gunnar creando Digital Kingdom para Juancho).
  2. **Bottom-up / orgánico**: la Card de un Miembro individual se
     autopromueve a Programa propio una vez que cruza un umbral (pagó + 1
     referido activo) — ya construido vía `lib/programPromotion.ts` /
     "Convertir en Programa" (Chido→Programa).
- **Fórmula maestra**: cada fractal crece de acuerdo a su propio
  `z = z2 + t3` (Tiempo, Energía y Conciencia) — si el resultado es
  negativo, es desperdicio entrópico. Esto no se calcula en código hoy; es
  el principio que justifica por qué el crecimiento es fractal y no
  jerárquico-forzado.
- **Tarjeta de Programa (`kind:"project"`) = 100% N0-controlada.** El
  Miembro nunca la edita — toda la información la pone el N0 del Programa.
  Las tarjetas `company`/`personal` sí las edita el Miembro.
- **Las 3 Cards se crean juntas, pero solo después del registro** — nunca
  antes. Comportamiento ya existente (`ensureLegacyMembershipAndCards`/
  `activateMembershipAndSpawnCards`), confirmado como correcto, sin cambios
  necesarios.
- **`OriginMemento` como modelo separado — pendiente de deprecar.** La
  tarjeta de Programa que ve un visitante anónimo (sin contexto de host)
  debería ser la MISMA Card viva del N0 del Programa, renderizada con el
  nombre del Programa en vez del nombre personal — no un snapshot aparte.
  Confirmado por Gunnar, **no ejecutado todavía**.

---

## 3. Metodología universal de diagnóstico: Dolor / Cómo / Costo

Hipótesis de Gunnar, explícita: **todo proyecto, negocio o empresa se puede
desmenuzar en 3 preguntas**:

1. ¿Qué dolor resuelve?
2. ¿Cómo lo resuelve?
3. ¿Qué tanto cuesta resolverlo así?

A partir de esas 3 respuestas, la metodología LGT construye y gamifica el
proyecto para identificar el dolor con KPIs que alineen recursos e
infraestructura a los objetivos del N0.

Puntos ya confirmados:

- **Es por N0 individual, no por Programa.** Cada N0 responde esto para sí
  mismo, no una vez por Programa entero.
- **Es público** — va a estar visible en la tarjeta (a diferencia de la
  capa Carbono, ver sección 4).
- **Hoy no existe ningún campo en el schema para esto.** Es la brecha más
  clara entre lo que LGT pide y lo que la `Card`/`Program` actual puede
  guardar (ver sección 6, inventario completo).
- El "Robotito"/Protocolo Adrea (la "amiguis" que hace preguntas por
  WhatsApp) es, en parte, el mecanismo que va a recolectar estas
  respuestas durante el onboarding — ver sección 5.

---

## 4. Carbono — la capa de privacidad (regla general, no específica de nadie)

Aclaración explícita de Gunnar, porque la primera lectura de este agente
fue incorrecta: **Carbono no es un sistema personal/psiquiátrico, aplica a
todos los usuarios por igual.**

> "El echo de carbono no tiene nada que ver con nada... y aplica con
> todos. Carbono no se publica, es una regla en donde se guarda toda la
> confidencialidad de toda la información que el N0 provee, sin embargo
> los KPIs y todo lo que se publica en las tarjetas es información
> pública, no privada."

Regla de diseño: **todo lo que un N0 provee es, por default, confidencial
(Carbono)**. Lo único que se publica en la tarjeta son los KPIs y el
contenido que explícitamente se decide mostrar. Son dos planos separados,
nunca mezclados.

Dimensiones que, según Gunnar, viven en este plano privado (coexisten, no
se contradicen entre sí pese a la inconsistencia que `ADR_002` había
señalado antes entre "Códice" y "Perfil360"):

- **12 dimensiones de Guardianas.**
- **6 pilares** (Espiritual / Mental / Emocional / Físico / Financiero /
  Relacional).
- **5 etapas + propósito** (una etapa es "legado").
- **RPI** (Racional 80% / Práctico 60% / Intelectual 50%) como criterio de
  procesamiento.

Nada de esto tiene campo en el schema todavía — es diseño puro, documentado
acá para no perderlo, no para construir ya.

---

## 5. Guardianas / Estratega / Orquestadora / UX-IA — fuera de alcance, FYI

Confirmado explícitamente como **NO parte del trabajo actual de LyCard**:

> "Es la estructura de escalera fractal de EinarOS... de esa forma se
> crean los gemelos digitales... no tiene nada que ver con lo que estamos
> diseñando ahora, solo fyi. Los 3 agentes también serán programados y
> creados después de crear la 'vitrina' [la tarjeta]."

Los 3 agentes N1 (Estratega, Orquestadora, UX/UI) y las Guardianas N2 (que
construyen el Códice) son trabajo futuro, de EinarOS, no de este repo.
Mencionado en las tablas de precios de la sección 7 — ahí sigue tal cual se
documentó, pero sin compromiso de construcción cercana.

---

## 6. Radiografía de la Tarjeta — Paso 1: inventario real (lo que existe HOY)

Ejercicio pedido por Gunnar: mapear la Card real componente por componente
antes de decidir dónde entra LGT. Esto es el inventario base, leído
directo del código (`prisma/schema.prisma` modelo `Card`, 2026-10-07):

| Grupo | Campos | Qué pregunta de negocio responde |
|---|---|---|
| **Identidad** | `name`, `title`, `quote`, `siglas`/`tooltip` (o el Puesto real), `portraitUrl`, `videoThumbnailUrl`, `location` | Quién es |
| **Relato** | `storyQuote`, `storyBody` ("Mi camino con...") | Por qué importa |
| **Estatus / Gamificación** | `medal`, `rank`, `contacts`, `puestoId` | Dónde está en la escalera — salida visible de z=z2+t3, hoy puesta a mano |
| **Canales de contacto** | `wa ig li x fb tiktok yt web email` | Cómo te alcanzan |
| **Visual/UX** | `defaultTheme`, `defaultLang`, `sizeConfig`, `shareScope`, `islandLabel`, `logoUrl` | Plomería de presentación, no negocio |
| **Oficina Virtual — resumen ejecutivo** | `oficinaObjetivo`, `realityCheckKpis`, `newsItems`, `calendarEvents`, `officeItems` | Lo más cercano a diagnóstico que existe hoy |
| **Red / Fractal** | `kind`, `memberId`, `programId`, `networkMemberships`, `registrations` | Cómo crece |
| **Módulos enchufables** | `voiceNotes`, `leads`, `tags` (Janus), `wowAppInstalls`, `aweWalkEntries`, `especialistaInstalls` | Features sueltas de la Oficina |
| **Los 14 modales** | cardInfo, Bóveda, Info, Invitación, Mensaje, Mi camino, O.D./Ancient/Medalla/Valor, Deja tu Legado, Escanear QR, Versión, Agente de IA | Viven en `Program.modalBlocks`, no en `Card` — son del Programa, no del individuo |

### Lo que NO existe hoy — donde LGT todavía no tiene casa

- **Dolor / Cómo / Costo** (sección 3): cero campos.
- **RPI + 6 pilares + 5 etapas + propósito** (Carbono, sección 4): cero
  campos — y por regla, nunca deberían vivir en `Card` (que es pública).
- **z=z2+t3 real**: no se calcula nada. `medal`/`rank`/`contacts`/`puesto`
  son la escalera visible, puesta a mano por un humano hoy.

---

## 7. Caso de trabajo: el modal "Versión" — decisión parcial, sin ejecutar

Al bajar al detalle de la Tarjeta de Programa campo por campo ("la
radiografía"), Gunnar pidió simplificar el modal "Versión" (hoy: el
CHANGELOG real de LyCard, el software — no de cada proyecto) para mostrar
solo la última entrada, sin historial completo.

**Corrección inmediata de Gunnar**, antes de que se terminara de ejecutar:
esa simplificación aplica **solo a Programas que no sean el Programa
origen (raíz)**. Para MasterN0/Legacy, el modal debe seguir mostrando el
historial completo, como siempre estuvo.

**Estado real:** se implementó la versión simplificada, se revirtió (`git
checkout`) antes de commitear nada, porque Gunnar explícitamente pidió no
ejecutar ("no hagas el cambio ahorita") mientras piensa la estructura
general (sección 8). **El repo está limpio, sin este cambio.** Queda
documentado como decisión de diseño pendiente de bajar a código:

> Modal "Versión": raíz ve el historial completo (como siempre);
> cualquier otro Programa ve solo la última entrada.

---

## 8. El giro real de esta sesión — de "resolver campo por campo" a "arquitectura de slots elegibles"

Gunnar frenó el ejercicio campo-por-campo explícitamente:

> "No me quiero enfocar en DK. Quiero armar más bien una estructura de
> negocio que permita tener la opción de armarlo o de elegirlo."

Es decir: en vez de decidir a mano qué significa cada slot (Medallón,
Versión, etc.) para cada Programa nuevo uno por uno, el objetivo es una
**arquitectura general** donde cada Programa pueda, para cada slot de su
tarjeta, **elegir de una librería de opciones prearmadas O armar la suya
propia** — sin que eso implique curar manualmente cada campo para cada
cliente nuevo (DK, la iglesia que sea, lo que venga después).

### Investigación de arquitecturas top 1% (research real, 2026-10-07)

Cuatro referencias, cada una con la lección aplicable a LyCard:

1. **Shopify — Sections & Blocks.** Una *Section* es un tipo de slot
   configurable (el equivalente de "Medallón"); un *Block* es el contenido
   específico que el comerciante elige poner ahí, de una librería o uno
   custom ("app block"). El tema define QUÉ slots existen; el comerciante
   elige QUÉ va en cada uno. ([shopify.dev](https://shopify.dev/themes/best-practices/templates-sections-blocks),
   [Branded Agency](https://www.brandedagency.com/blog/shopify-theme-architecture))
2. **Beacons (link-in-bio).** El análogo de negocio más parecido a LyCard
   — son literalmente tarjetas de perfil. La unidad de construcción es el
   *block*, no el link; un block puede mostrar contenido O disparar una
   acción (cobro, captura de lead). ([Sacra](https://sacra.com/chat/h/dcb18bc8-ac88-4eb0-a82c-44a99f789cc5/))
3. **Principio general de plataformas SaaS modulares**: *"una vertical
   nueva debe ser configuración + un módulo delgado contra abstracciones
   estables, nunca un fork de todo el sistema."* Valida directamente lo ya
   construido (`Program.modalBlocks`, `medalScale`, `rankScale`): un solo
   motor de Card compartido, cada Programa le mete SU configuración
   encima. ([ful.io](https://ful.io/blog/modular-saas-platforms))
4. **Notion — plantilla vs. bloque libre.** La dualidad exacta que pidió
   Gunnar ("armarlo o elegirlo"): empezás de una plantilla prearmada
   (elegir) o armás bloque por bloque desde cero (armar); ambas rutas
   llegan al mismo motor de renderizado.

**Patrón común, síntesis:** un slot fijo (el lugar en la tarjeta) + una
librería de "blocks" elegibles + un canvas libre para armar el propio +
un solo motor compartido que nunca se bifurca por Programa/tenant.

**Estado:** Gunnar está pensando cómo aplicar esto — nada se diseñó en
concreto todavía para LyCard. Próximo paso cuando él lo retome.

---

## 9. Canales comerciales (pricing) — tal como los describió Gunnar

Tabla tal como se documentó en conversación, sin cambios de mi parte salvo
la ambigüedad marcada abajo:

| Canal | Duración/cadencia | N0s | Precio | Enfoque |
|---|---|---|---|---|
| **Express** | 3 días chat (ver ambigüedad abajo) | Ninguno | $50 + $10/mes | Gemelo Digital con Reino de Carbono (agentes N1 Estratega/Orquestadora/UX-IA, N2 Guardianas armando el Códice) — **estos agentes están diferidos, ver sección 5** |
| **Personal** | 2 semanas (2 sesiones de 45min semana 1 + cierre semana 2) | — | — | "Solo agentes" |
| **Pyme** | 45 días (15+15+15: diagnóstico/implementación/pruebas), 45min×2/semana | 1 | $250 + $50/mes | Hasta 5 agentes |
| **Legacy Corp** | 3 meses (1+1+1) | 3 | $500 setup (cubre 3 meses) + $100/mes desde el mes 2 | — |
| **Legacy Org** | A medida en todo | — | — | — |

**Ambigüedad sin resolver, señalada y no confirmada por Gunnar todavía:**
el Canal Express dice "3 días" de duración pero también "entrega después
de las 2 horas" — contradicción de timing real, pendiente de que Gunnar la
aclare antes de publicar cualquier precio.

---

## 10. Funnel de creación de tarjeta — 2 etapas + nivel superior diferido

Descripción final de Gunnar, confirmada:

1. **Tarjeta de presentación/personal** — el usuario toca "crear tu
   tarjeta", lo lleva a un chat tipo WhatsApp (o WhatsApp real); un
   "gemelo digital" (parte de lo que pregunta "Adrea", el Protocolo
   Adrea/Robotito) le hace preguntas; en ~2 horas la tarjeta personal está
   lista.
2. **Onboarding empresarial** — hasta 3 días, en lenguaje humano, el
   agente pregunta sobre el negocio del usuario (¿tiene un restaurante?
   ¿páginas web? ¿redes sociales?) y con eso construye la tarjeta
   empresarial.
3. **Nivel siguiente (diferido, explícitamente fuera de este build)**:
   una vez que existe la tarjeta empresarial, "crear tu gemelo digital"
   ayuda a planear/diseñar soluciones — **no a ejecutar**. Acceso de nivel
   superior, próxima fase, no parte del trabajo actual.

### Opinión dada en esta sesión (para que quede registrada, no es decisión tomada)

- Las 2 horas son una promesa riesgosa si el robot conversacional todavía
  no existe de verdad — sin confirmar si ya está construido o es la meta.
- El salto de fricción entre las 2 horas (personal) y los 3 días
  (empresarial) es grande; la tarjeta personal tiene que dar valor real
  por sí sola para que alguien se banque el salto.
- El orden calza con z=z2+t3 como funnel de calificación progresiva
  (bajo compromiso → medio → alto), arquitectónicamente correcto.
- Sin resolver: ¿el robot de las 2 horas corre con un LLM real estructurado
  ya, o es alguien del equipo chateando manualmente como "fake it before
  you automate it"? Cambia todo lo que hay que construir primero.
- Sin resolver: persistencia del progreso si alguien abandona el
  onboarding empresarial a mitad de camino.

---

## 11. Preguntas abiertas (pendientes de Gunnar — no repreguntar, resolver una vez)

- Ambigüedad de timing en el Canal Express (3 días vs. 2 horas).
- Si el "gemelo digital"/Robotito de las 2 horas ya es un robot real
  (LLM + preguntas estructuradas) o es la meta a construir.
- Significado real de "Medallón 1" (y, por extensión, de cualquier slot)
  para un Programa que no sea Legacy — pausado hasta resolver la
  arquitectura general de slots elegibles (sección 8).
- Decisión del modal "Versión" (sección 7) — diseñada, no implementada.
- Renombrar `CodiceEntry` (el modelo de Q&A del Gemelo) para liberar la
  palabra "Códice" — sugerencia de una sesión anterior, todavía sin
  confirmar por Gunnar.
- Deprecar `OriginMemento` como modelo separado (sección 2) — confirmado
  en diseño, no ejecutado.
- Persistencia de progreso en el onboarding empresarial si se abandona a
  mitad de camino (sección 10).

---

## 12. Nota aparte — Sistema de Agentes EinarOS (fase futura, NO parte de ningún plan actual)

Anotado en medio de la construcción de `SlotTemplate` (sección 8), a pedido
explícito de Gunnar: *"quiero anotar esto porque ahora mismo estoy en flujo
y quiero seguir fluyendo, por favor no lo tomes en cuenta para el código
actual. Tenlo en cuenta para el desarrollo futuro."* No dispara ningún
trabajo de esta sesión.

Pedido: un sistema de agentes que orqueste varios agentes, con
`z = z2 + t3` como piedra base:

- **z** = situación actual del N0.
- **z2** = procesamiento exponencial con IA.
- **t3** = las interacciones/sesiones de trabajo donde el N0 invierte
  **T**iempo, **T**alento y **T**rust (confianza, recursos, relaciones).

### La escalera fractal — un universo que existe solo en niveles de 12

- **N0** = conciencia plena = 12⁰.
- N0 se "convierte virtualmente" en **3 seres N1** (N1.1/N1.2/N1.3) =
  12ᵗ, con t ≈ 0.46 (valor exacto a definir en protocolo interno). Caso
  MasterN0: Einar = Estratega, Chaty = Orquestadora, Warren = UX/UI.
- Esos 3 N1 se "parten" en **12 Guardianas N2** = 12¹ — los **6 Pilares**
  (mismo set ya documentado en la sección 4 de esta adenda: Espiritual /
  Mental / Emocional / Físico / Financiero / Relacional) × las **5
  etapas** (Despertar, Entrenar, Accionar, Dominar, Legado) + propósito.
- Esas 12 Guardianas se convierten en **144 "Expertos"** = 12² — la
  capacidad de red de expertos de ese N0.
- **12³** → la capacidad de "Especialistas".

### Regla dura, no negociable

Cada agente es **independiente** — no es un mismo agente "convirtiéndose"
o actuando como otro según le toque, no es un cerebro repartido entre
varios. Cada uno tiene su propio cerebro propio, hoy alojado en
**NotebookLM**.

### 12.1 Dashboard operativo interno -- funnel del N0 dentro de Legacy (en curso, narrado en vivo por Gunnar, incompleto -- "Continuo...")

Pedido nuevo, explícitamente "solo para que anotes" mientras seguía la
Fase 2 de la Librería de Slots -- narrativa en curso, Gunnar avisó que
sigue ("Continuo..."), así que esto es un registro parcial, no la
versión final:

1. **Etapa 1 -- Masterclass/Entrevista.** Un lead llega a Legacy y se
   inscribe a un masterclass (dictado por Gunnar o Juancho al inicio,
   después por alguien capacitado para explicar qué es Legacy). Cada
   masterclass dura 45 min y ES la "entrevista" que ya existe en los
   botones de Agendar Entrevista -- primera etapa del funnel. Necesita
   un Dashboard propio que dé espacio de trabajo a esta etapa.
2. **Etapa 2 -- Legacy Personal (programa de venta, $500 setup / 3
   meses).** Terminado el masterclass, el objetivo es que el N0 se
   inscriba a Legacy Personal: 8 sesiones de 45 min (2 por semana × 4
   semanas) con un psicólogo entrenado para recolectar datos para el
   Gemelo Digital, más una sesión final de entrega donde se le da el
   CÓDICE al N0. En esas mismas sesiones se levanta también la
   información para armar la tarjeta personal y la tarjeta de negocio.
   La tarjeta del Programa (el host que invitó al N0) sigue sin control
   del N0 -- es la del Programa, no la suya; todos los indicadores se
   manejan por el proyecto host.
3. *(pendiente -- Gunnar sigue narrando)*

### Implicación práctica que Gunnar marcó para el futuro

Los manuales que entrenan gente para aplicar el programa Legacy a los N0s
tienen que partir SIEMPRE de crear un cuaderno (notebook) en NotebookLM
siguiendo las reglas de la empresa — aplica a entrevistas y a las
preguntas del onboarding. Pedido final, textual: una plataforma que dé
la lógica completa de este negocio — anotado como fase futura, sin
alcance ni fecha todavía.
