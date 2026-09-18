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
