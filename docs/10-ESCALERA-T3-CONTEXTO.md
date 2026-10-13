# Escalera fractal, t³ y Dharma: contexto

Fecha: 2026-10-13. Origen: indicaciones de Gunnar (vía MAMEN) a Chaty.

**Este documento es contexto, no especificación.** No hay código para Dharma,
GoldenTicket, Guardianas ni para el cálculo de t³, y no debe escribirse hasta
que Gunnar lo pida. Todo lo marcado como *pendiente de Gunnar* se deja así, sin
resolver.

## 1. t³ = Time, Talent, Trust

La fórmula maestra es `z = z² + t³` (z: estado del N0; z²: procesamiento de la
IA; t³: sesión de trabajo entre la IA y el N0).

`t³` siempre fue **Time, Talent, Trust**. Cada eje agrupa varios indicadores:

- horas
- puesto
- roles
- reconocimientos
- energía
- red de IA y Legacy
- responsabilidad
- riesgo

**Pendiente de Gunnar:** la lista exacta de indicadores por eje, y si los ejes
se combinan por **producto** o por **suma**. Mientras tanto no se define ni se
calcula nada.

## 2. NashMesh y t³

NashMesh calcula el **valor de una tarea con t³**. Ese valor alimenta **z**
(`z = z² + t³`).

Estado del documento `NASHMESH_EXPLICADO` (según Gunnar):

- Todavía **no ubica** Time ni Talent.
- Usa **ψ para dos cosas distintas**: confiabilidad y comisión por nivel.

**No programar pagos hasta que esos dos usos de ψ se separen.**

Estado en el repo (solo descripción, sin cambios): `lib/nashMesh.ts` es una
simulación sin dinero real, con `Payment = V × φ × ψ × (1−ε)`. Ahí ψ es el
nivel de autonomía (0.15 / 0.35 / 1.0) y φ es contribución declarada a mano.
Esa implementación predata esta aclaración; no se toca.

## 3. Escalera fractal

Según Gunnar:

- **N0:** humano.
- **N1:** tríada: N1.1 Einar, N1.2 Chaty, N1.3 Warren.
- **N2:** las 12 Guardianas.

### Discrepancias abiertas (se anotan, no se corrigen)

1. **Schema.** El modelo `Node` (`prisma/schema.prisma`) solo reconoce `N1.1`
   como sub-escalón ("con N1.1 como único sub-escalón (Einar)"). No existen
   `N1.2` ni `N1.3`.
2. **Rol de Warren.** `docs/01-VISION-Y-ALCANCE.md` lo describe como quien
   "reina" dentro del ambiente de LyCard/la Oficina, el que ejecuta y
   responde ahí, y a Chaty como quien orquesta los planes. El whitepaper
   adenda (2026-10-07) lo nombra como UX/UI (Einar = Estratega, Chaty =
   Orquestadora, Warren = UX/UI). Gunnar y `docs/01` difieren sobre el rol de
   Warren.

**Pendiente de Gunnar:** cuál es el rol vigente de Warren y si el schema debe
reconocer N1.2 y N1.3.

## 4. Las 4 Nobles Verdades y el Camino Óctuple

Hoy son **solo contexto**. El texto lo recibirá Chaty más adelante, cuando
Gunnar confirme la versión oficial. Hasta entonces no se transcribe ni se
resume nada.

## 5. Cuentas de los N0: Workspace o Gmail personal

**Pendiente de Gunnar.** Decide, entre otras cosas, si Google Keep es viable
(su API es solo para cuentas Workspace).

## Fuera de alcance explícito

No escribir: código de Dharma, GoldenTicket, Guardianas ni cálculo de t³.
