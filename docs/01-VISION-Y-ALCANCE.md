# Visión y alcance

## Qué es LyCard, en una frase

Una tarjeta de presentación digital (`/c/[slug]`) que es, a la vez, la puerta
de entrada a una **Oficina Virtual** — el panel donde el dueño de esa tarjeta
ve el resumen de sus operaciones y accede a su equipo de agentes de IA.

## Las tres capas del producto

### 1. La tarjetita (`/c/[slug]`)

Lo que ve cualquier visitante: identidad (nombre, cargo, foto), medallón,
canales de contacto, un botón para agendar, y el botón de **Oficina
Virtual**. Existe en 3 variantes (`Card.kind`): `project` (alguien dentro de
un Programa, ej. Legacy), `company` (un negocio con su propia red de
clientes) y `personal` (una tarjeta de persona suelta, sin red).

### 2. La Oficina Virtual (`/c/[slug]/oficina`)

Solo la ve el dueño de la tarjeta (o cualquiera, en modo "qué es esto" —
ver [06-CONTRIBUIR.md](./06-CONTRIBUIR.md), principio de "cáscara honesta").
Hoy tiene: saludo, Superpoderes (apps puntuales, ver abajo), la Malla del
equipo, y una demo guiada del Gemelo Digital. El objetivo declarado — todavía
en construcción, ver [05-ROADMAP-EDT.md](./05-ROADMAP-EDT.md) — es que sea
**un resumen ejecutivo real**: los resultados finales y los KPIs más
relevantes del negocio o programa de ese N0, de un vistazo.

### 3. El bot (Warren + Superpoderes)

El agente de cada Programa ya responde por WhatsApp — puede hacer
prácticamente todo desde ahí. Dentro de la Oficina Virtual, ese mismo agente
tiene **más visibilidad y control** porque ahí LyCard controla el ambiente
completo: la interfaz de chat embebida se presenta como **Warren** (el
agente orquestador — ver abajo), que rutea cada pedido a la **Skill**
correcta.

Las Skills son apps puntuales que el N0 puede invocar — hoy: un Brief de
reuniones vía Fathom, y una demo guiada del Gemelo Digital. Ya hay un
catálogo de 8 Skills confirmado (con HeroSuite/Mercosur Irpavi como
socios/fabricantes) para el AppStore completo — ver el detalle y lo que
falta en
[05-ROADMAP-EDT.md](./05-ROADMAP-EDT.md#appstore-de-skills).

## Cómo un Negocio se convierte en Programa

**Estado real: cero clientes hoy.** La app no salió al mercado todavía —
todo lo de abajo es tesis de venta (leads y apuestas), no facturación
confirmada. MLQR es el lead más avanzado y tampoco pagó todavía.

El modelo de monetización quedó cerrado el 2026-09-24 en **3 ejes
independientes entre sí** — reemplaza al modelo viejo de "4 planes que se
eligen" (Freemium/Automatizado/Normal/Enterprise como puerta de entrada).
Detalle completo de cada eje en
[05-ROADMAP-EDT.md](./05-ROADMAP-EDT.md#modelo-de-negocio-3-ejes).

**Eje A — Programa no es un plan que se elige, es un umbral estructural
que se cruza.** Un Chido (alguien que pagó y pasó por el proceso Legacy
completo) se convierte en **N0 de su propio Programa** en el momento
exacto en que tiene 1+ persona humana real activada bajo él — no importa
cuántos agentes IA tenga, eso es indiferente para el umbral. **Ya
construido y shippeado (Fase P1, v1.52.0)**: la detección y la promoción
son automáticas — el sistema las dispara solo cuando el umbral se cruza
(al activarse la membresía de un referido, o al marcar pagada la del
referente si el referido ya estaba activo), sin que MasterN0 tenga que
dar de alta nada a mano para ESE caso puntual. Su Card de Empresa se
vuelve la raíz del Programa nuevo; su vieja Card de Legacy queda intacta,
etiquetada "Programa Legado".

**Eje B — el embudo Mirón → Vividor → Chido → Chido+** (nombres 100%
internos, nunca en la app ni en marketing):

1. **Mirón** — visitante sin cuenta al que alguien le comparte su LyCard.
   Solo ve esa tarjeta puntual, nada de registrarse ni crear.
2. **Vividor** — se registra self-service, **sin que nadie apruebe nada**
   (ya construido, v1.49.0: `ensureLegacyMembershipAndCards`). Tiene sus
   3 Cards y una Oficina Virtual real desde el día uno — no una versión
   "de mentira": Superpoderes, WowStore, Modo Foco, todo lo que ya está
   construido en este repo es, hoy, para el Vividor.
3. **Chido** — pasa por la entrevista Legacy real y paga. El nivel de
   personalización de su Oficina depende de qué compró.
4. **Chido+** — variantes de escalamiento sobre Chido, todavía sin
   definir en detalle.

Un Chido con solo agentes IA bajo él (cero humanos reales) sigue siendo
Chido para siempre — nunca cruza al Eje A, sin importar cuántos agentes
tenga.

**Eje C — precio a la carta por WowApp/Superpoder.** Cada Skill tiene su
propio precio (suscripción o pago único), independiente de si sos
Vividor o Chido — un Vividor puede comprar una WowApp puntual sin
necesidad de pagar membresía. **Ya construido y shippeado**: WowStore
(desde v1.53.0), el catálogo navegado por rubro+dolor de negocio, con
instalación directa o adaptación a medida.

**Lo que este modelo dejó atrás**: los $ de infraestructura de agentes
que antes eran "el plan que alguien elige para entrar" (Automatizado
$25/Normal $100/Enterprise $500) pasan a describir el costo de
infraestructura que un Programa YA formado sigue pagando — nunca la
puerta de entrada, y nunca "simulado para aparentar": si algo no está
conectado de verdad, la Oficina lo dice explícito, sin excepción (cáscara
honesta, ver [06-CONTRIBUIR.md](./06-CONTRIBUIR.md)).

**3 motores de venta reales, no un solo canal:** (1) la propia entrevista
Legacy como mecanismo de discovery para proyectos institucionales grandes,
(2) un diagnóstico de riesgo cero que automatiza el proceso de venta
existente sin reemplazar vendedores, (3) verticales de comunidad (ej.
Digital Kingdom para iglesias/organizaciones). Detalle de cada uno en el
roadmap.

## Contexto de fondo: EinarOS

LyCard es la cara visible de un ecosistema más grande, EinarOS, con su
propia jerarquía de agentes (documentada en `../WHITEPAPER.md`). Lo mínimo
que hace falta saber para trabajar en este repo:

- **N0** es el dueño (Gunnar, o el N0 de un Programa). Interactúa siempre a
  través de su propio **N1.1** — en el caso del MasterN0, ese N1.1 es
  **Einar** (agente de Silicio, el que planea). **Chaty** orquesta esos
  planes. **Warren** es quien "reina" dentro del ambiente de LyCard/la
  Oficina — el que ejecuta y responde ahí.
- Los nodos de la escalera (N1 a N12) no son todos "agente atado a un
  humano": hay **Agentes Legacy** (humano + agente fusionados, con su
  propio equipo abajo), **Agentes Silicio** (agentes puros, sin humano,
  controlados directo por el N0), y **Carbono-referencia** (personas reales
  mapeadas y seguidas, que todavía no son un agente).
- **Karl** (dominio Bridge) es el gatekeeper: traduce info privada (Carbono)
  a pública (Silicio) — nada personal se filtra nunca.
- **Protocolo Dirac:** todo lo que entra a EinarOS aterriza primero en una
  carpeta única de crudos (`99_RAW`, dominio Bridge) — nunca directo a su
  destino final. De ahí, un agente lo "estampa" (`#dirac`: origen, timestamp,
  autoridad, la fórmula z=z²+t³) y lo clasifica; recién con esa estampa se
  mueve y se acomoda donde tiene más "peso específico" (una matriz fija:
  código → su Reino, documentación de diseño → Arquitectura, datos
  temporales → se quedan en RAW con TTL). Es el mismo principio de "nada
  tiene contexto legítimo sin pasar por un origen definido" que ya se
  documentó para Protocolo Dharma — Dirac es la versión de ese principio
  para *archivos y contenido*, no para autenticación de agentes. Referencia
  completa (fuera del scope de LyCard hoy, pero relevante para cualquier
  Skill que vaya a "entender" contenido nuevo — ej. Notas de Voz → NashMesh):
  carpeta de Drive
  [`1xatFWg7lcPVd58FO8Fi5V2sXebJiIICc`](https://drive.google.com/drive/folders/1xatFWg7lcPVd58FO8Fi5V2sXebJiIICc)
  (raíz que contiene EinarOS V3.0 completo + Legacy + WhatsApp Chats).
  **Pendiente de Gunnar:** darle acceso a esta carpeta a la cuenta de Google
  que use el asistente de Fabricio, para que pueda leerla igual que este
  repo de GitHub.

**Sobre el vocabulario (4 Nobles Verdades, GoldenTicket, la fórmula
z=z²+t³, Protocolo Dharma):** no es mitología decorativa encima de la
arquitectura — es el lenguaje semántico propio que Gunnar diseñó a
propósito, con un objetivo explícito de EinarOS: invertir la relación de
siempre entre humano y máquina, para que sea la máquina la que aprenda a
entender a su N0 y sus órdenes, no al revés. Se documenta y se respeta
como tal, aunque este repo (LyCard) no dependa de esos mecanismos para
funcionar hoy.

Nada de esto es necesario para escribir código en LyCard hoy — está acá
para que el vocabulario de comentarios, nombres de agentes y el roadmap
(HR/CRM/PM/NashMesh/MachineEngine) tenga sentido cuando aparezca.

## Qué NO es LyCard (todavía)

Para evitar promesas que el código no cumple — mismo principio de cáscara
honesta que rige toda la UI: **no** hay IA real generando contenido en vivo
en ningún punto del producto hoy (ni frases motivacionales, ni matching, ni
distribución de pagos). Todo lo que parece "inteligente" es, o dato real
(Fathom), o una simulación explícitamente marcada como tal en la propia
pantalla.
