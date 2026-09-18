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
reuniones vía Fathom, y una demo guiada del Gemelo Digital. La meta es un
catálogo tipo AppStore, alimentado en parte por herramientas externas ya
construidas (HeroSuite, Irpavi) — ver el detalle y lo que falta en
[05-ROADMAP-EDT.md](./05-ROADMAP-EDT.md#appstore-de-skills).

## Cómo un Negocio se convierte en Programa

**Estado real: cero clientes hoy.** La app no salió al mercado todavía —
todo lo de abajo es tesis de venta (leads y apuestas), no facturación
confirmada. MLQR es el lead más avanzado y tampoco pagó todavía.

Un Negocio pasa a ser **Programa** al entrar a uno de 3 planes (documentado,
todavía sin codificar — detalle completo en
[05-ROADMAP-EDT.md](./05-ROADMAP-EDT.md#modelo-de-negocio-programa-legacy-y-sus-planes)):

| Plan | Setup | Mensual | Extra |
| --- | --- | --- | --- |
| Automatizado | $100 | $25 | Legacy automatizado, sin Sherpa dedicado |
| Normal | $500 | $100 | El estándar — 1 Legacy = 3 Agentes Silicio |
| Plan B / Enterprise | $2.500 | $500 | + comisión sobre ventas |

Sin estar en alguno de estos 3, la Oficina Virtual de sus tarjetas muestra
el aviso honesto de "todavía sin activar" en vez de Superpoderes o bot —
nunca acceso simulado.

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
