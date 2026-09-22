# Adenda al WHITEPAPER — Corrección de Marco Estratégico y Legal

**Fecha:** 2026-09-18
**Motivo:** corregir tres lecturas imprecisas que surgieron de una revisión externa del proyecto (arquitecta/analista de VC), y dejar documentado formalmente lo que hasta ahora vivía solo en conversación con Gunnar/el equipo. Este documento se lee junto con `WHITEPAPER.md` — no lo reemplaza, lo corrige y lo completa en los puntos de abajo.

---

## 1. Por qué esto NO es un esquema MLM — marco de verificación

La preocupación de "esto suena a MLM" no se resuelve explicándolo mejor — se resuelve con un checklist verificable. Estos son los 4 criterios que efectivamente usan reguladores de venta directa (ej. FTC) para distinguir un modelo de negocio con niveles/red de un esquema piramidal:

| # | Criterio | Estado en LyCard/EinarOS/NashMesh |
|---|---|---|
| 1 | **¿El ingreso principal viene de ventas reales a clientes finales externos, o de cuotas que paga la gente para "entrar" a la red?** | Viene de la venta de Legacy/Legacy Corp a MIPYMES/personas que compran la herramienta para usarla en **su propio negocio** — no para revenderla ni para cobrar de otros. ✅ |
| 2 | **¿Se puede ganar dinero sin reclutar a nadie?** | Sí — un especialista cobra por Shapley (φ, contribución real a un resultado) × confiabilidad (ψ), auditado. No depende de cuánta gente metió. ✅ |
| 3 | **¿Hay compra obligatoria de inventario/licencia para "participar"?** | No existe ese requisito. ✅ |
| 4 | **¿La auditoría verifica entrega real antes de pagar, o es un cálculo automático ciego por estructura?** | **Punto abierto.** La capa HorusEye está diseñada para esto, pero la mecánica de royalty SHERPA/ANCIENT (override sobre especialistas que certificaron a otros) todavía no tiene el dictamen legal que confirme que el royalty es proporcional a *servicio de mentoría/soporte continuo verificado*, y no una comisión por cabeza reclutada. ⚠️ Pendiente de revisión legal ya en curso.

**Conclusión operativa:** 3 de 4 criterios están resueltos por diseño. El criterio #4 es el único que debe quedar cerrado (con dictamen legal firmado) **antes de que circule dinero real** por la mecánica SHERPA/ANCIENT. Hasta entonces, cualquier material de venta o pitch debe seguir la regla ya vigente: nunca mencionar NashMesh, Shapley, blockchain, ni niveles internos frente a un cliente o inversionista — es arquitectura interna, no argumento de venta, y punto de riesgo legal si se presenta sin el dictamen.

**Acción sugerida:** cuando llegue la revisión de los abogados, anexar aquí el resultado del criterio #4 con fecha y firma. Ese día, esta tabla se puede citar directamente ante cualquier inversionista o socio nuevo en vez de tener que re-explicar la lógica desde cero.

---

## 2. Equipo fundador — 6 socios (a formalizar)

Documentado hoy solo de forma verbal/dispersa. Se debe llevar a un documento societario real (pacto de socios / cap table) cuanto antes — mientras tanto, este es el registro de continuidad:

| Socio | Especialidad |
|---|---|
| (Usuario/fundador) | — |
| Sergio | 25 años en ciberseguridad e IA, Google Cloud |
| René Sandoval | ERP y negocios (dueño de HeroSuite) |
| Alejandro | Procesos |
| Jauncho | Marketing |
| Rogelio | Metodología (base de la consultoría "Legacy" aplicada a MIPYME) |

**Pendiente de documentar formalmente** (no repreguntar cada vez, resolver una vez):
- % de equity o participación de cada socio.
- Responsabilidades y autoridad de decisión por área (quién decide qué, sin superposición con Sergio/René que ya tienen roles técnicos definidos en `WHITEPAPER.md` sección 0).
- Vesting / condiciones de salida.
- Cómo se relaciona esta estructura societaria con los roles ya descritos en la sección 0 del `WHITEPAPER.md` (Gunnar como N0, Sergio como dueño de microservicios, René como dueño de HeroSuite) — evitar dos fuentes de verdad sobre "quién es quién".

---

## 3. Foco estratégico correcto — Legacy es el producto, todo lo demás es infraestructura y leads

Corrección importante de encuadre: HeroSuite, TalentMatch, B4W/EnCadena Bolivia, y el caso MLQR **no son el modelo de negocio** — son **leads, oportunidades y "centros de gravedad"**: piezas que generan infraestructura, canal de distribución o acceso a bases de contactos, pero el camino a ingresos es uno solo:

> **La venta del producto principal Legacy (~$500 [confirmar moneda]).**

Ejemplo del propio equipo: el partido político (MLQR) no es un cliente que "paga hoy" — es un centro de gravedad que da acceso a una base de ~14,000 contactos; de ahí se espera convertir un % a clientes reales de Legacy. Esa es la lógica correcta: no monetizar el acceso en sí, sino usarlo como canal de adquisición para el producto ancla.

**Recomendación de documentación:** en cualquier resumen ejecutivo o pitch, separar siempre dos columnas: "Producto que genera ingreso hoy: Legacy" vs. "Infraestructura/leads en construcción: HeroSuite, TalentMatch, B4W, MLQR, etc." — mezclar ambas columnas es lo que generó la lectura de "modelo disperso" en la revisión externa.

---

## 4. Estado real de MLQR — corrección

**Corrección respecto a versiones previas de este análisis:** MLQR **no es un cliente pagando**. Es la **propuesta más avanzada enviada**, en negociación — nada firmado, nada cobrando todavía. Debe tratarse como pipeline/oportunidad en curso, no como revenue realizado, en cualquier material interno o externo.

---

## 5. Etapa del proyecto — diseño, financiado con recursos personales de los socios

El proyecto está en **etapa de diseño (pre-revenue)**, financiado hasta ahora con recursos personales de los socios. Esto es la etapa normal de bootstrap de cualquier venture pre-seed y no debe presentarse como una debilidad — pero tampoco debe ocultarse ni disfrazarse de tracción. Regla a mantener: cualquier documento a un tercero (inversionista, banco, socio potencial) debe declarar explícitamente "en etapa de diseño, sin ingresos cerrados todavía" mientras ese sea el estado real. Sobre-representar esta etapa es el error que más rápido rompe confianza con un inversionista serio.

---

## 6. Resumen de correcciones aplicadas en esta adenda

- [x] MLQR reclasificado de "cliente pagando" a "propuesta en negociación".
- [x] Checklist de 4 criterios anti-MLM documentado, con 1 punto abierto explícito (royalty SHERPA/ANCIENT, pendiente de dictamen legal).
- [x] Equipo de 6 socios registrado (pendiente: formalizar equity/roles en documento societario aparte).
- [x] Foco estratégico reordenado: Legacy = producto de ingreso; todo lo demás = leads/infraestructura.
- [x] Etapa del proyecto declarada explícitamente: diseño, pre-revenue, financiado por socios.
