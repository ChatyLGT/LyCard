# Documentación de LyCard

Este índice es el punto de entrada para cualquiera que se sume al proyecto
(hoy: Fabricio, Sergio). Léelos en este orden la primera vez:

1. **[01-VISION-Y-ALCANCE.md](./01-VISION-Y-ALCANCE.md)** — qué es LyCard, para
   qué existe, y qué tan lejos llega hoy vs. hacia dónde va (la tarjetita, la
   Oficina Virtual, el bot).
2. **[02-ARQUITECTURA.md](./02-ARQUITECTURA.md)** — stack técnico, estructura
   de carpetas, y los patrones que se repiten en todo el código (léelo antes
   de tocar cualquier archivo).
3. **[03-MODELO-DE-DATOS.md](./03-MODELO-DE-DATOS.md)** — cada modelo de
   Prisma, qué representa y cómo se relaciona con los demás.
4. **[04-MODULOS.md](./04-MODULOS.md)** — qué hace cada feature ya construida,
   con sus archivos exactos.
5. **[05-ROADMAP-EDT.md](./05-ROADMAP-EDT.md)** — lo que falta construir,
   a nivel de archivo y campo de schema, para que se pueda ejecutar sin dudas.
6. **[06-CONTRIBUIR.md](./06-CONTRIBUIR.md)** — convenciones para agregar o
   cambiar algo sin romper el resto.
7. **[07-AUDITORIA-MODULOS-QA-2026-09.md](./07-AUDITORIA-MODULOS-QA-2026-09.md)**
   — mapa completo de los 18 módulos del sistema (incluido lo que todavía
   NO está construido), con documentación por módulo y una matriz de QA
   lista para marcar Sí/No/Parcial — el punto de partida para cualquier
   ronda de QA nueva.

## Otros documentos de auditoría (hallazgos puntuales, no mapa completo)

- **[AUDITORIA-TECNICA-2026-09.md](./AUDITORIA-TECNICA-2026-09.md)** —
  backlog priorizado de riesgos de seguridad/infraestructura.
- **[QA-COMPLETO-2026-09.md](./QA-COMPLETO-2026-09.md)** — hallazgos de
  funcionalidad/diseño/arquitectura/seguridad, con una sección viva (F)
  de reportes de usuario real en dispositivo.

## Adendas al WHITEPAPER (diseño/negocio, por fecha — no reemplazan el
## documento base, lo completan o corrigen en puntos puntuales)

- **[WHITEPAPER-ADENDA-2026-09.md](./WHITEPAPER-ADENDA-2026-09.md)** —
  marco de verificación "no es MLM", equipo fundador (6 socios), foco
  estratégico (Legacy es el producto, lo demás es infraestructura/leads).
- **[WHITEPAPER-ADENDA-2026-10-07.md](./WHITEPAPER-ADENDA-2026-10-07.md)** —
  radiografía completa de la Tarjeta de Programa (inventario real de
  componentes), metodología LGT (dolor/cómo/costo, Carbono, RPI/pilares),
  linaje fractal de Programas, funnel de creación de tarjeta (personal →
  empresarial → gemelo digital), los 5 Canales de monetización, y la
  investigación de arquitecturas top 1% (Shopify Sections&Blocks, Beacons,
  Notion) para slots configurables por Programa.

## Otros documentos en la raíz del repo

- **`../WHITEPAPER.md`** — la visión completa del ecosistema EinarOS del que
  LyCard es una pieza (contexto de negocio de fondo, no hace falta leerlo
  para programar).
- **`../PLAN.md`** — bitácora técnica cronológica de cada fase ya shippeada.
  Es historial, no una guía de arquitectura — para eso están estos docs.
- **`../AGENTS.md`** / **`../CLAUDE.md`** — instrucciones para agentes de IA
  que trabajen en este repo.

## Documento vivo de planeación

La versión "viva" de la visión completa (HR/CRM/PM/NashMesh/MachineEngine +
comentarios y ediciones en curso) vive fuera del repo, en un documento
compartido con Gunnar. Estos archivos en `docs/` son su versión estable,
exportada al repo para que quede con el código — si hay diferencias, pedile
a Gunnar el link actualizado.
