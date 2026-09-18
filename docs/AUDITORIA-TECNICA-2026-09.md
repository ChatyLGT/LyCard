# Auditoría Técnica — Backlog Priorizado para Próxima Sesión de Código

**Fecha:** 2026-09-18
**Alcance:** solo la app LyCard como software (el negocio/legal vive en `WHITEPAPER-ADENDA-2026-09.md`, sección 7, a cargo de Javier + despacho de abogados).
**Cómo leer esto:** cada punto tiene problema, ubicación exacta en el código, y qué hacer — al estilo de `05-ROADMAP-EDT.md`, para que quien programe lo ejecute sin tener que re-preguntar alcance.

---

## Prioridad 1 — Crítico (antes del próximo pico de tráfico real, ej. push de MLQR)

### 1.1 Rate-limiting ausente en server actions públicas
**Dónde:** `app/c/actions.ts` — las 4 server actions públicas ya identificadas en `PLAN.md` Fase 10.
**Problema:** sin límite, un bot o un ataque puede saturar el formulario público de registro/entrevista sin fricción.
**Qué hacer:** middleware de rate-limit por IP + por sesión (ej. `@upstash/ratelimit` con Redis, o una tabla `RateLimitEvent` en Postgres si no quieren dependencia nueva de infraestructura). Límite sugerido de partida: 5 intentos/10 min por IP en registro, ajustable.

### 1.2 Sin validación de email en `registerInterviewAction`
**Dónde:** `app/c/actions.ts` (la función mencionada en `PLAN.md` Fase 10).
**Problema:** entra cualquier string como email — contamina la base de datos y cualquier métrica de conversión futura.
**Qué hacer:** validación de formato server-side (no confiar solo en `type="email"` del HTML) + confirmación real por link/OTP antes de marcar el registro como válido.

### 1.3 Sin dedupe de registros
**Dónde:** mismo archivo, mismo flujo.
**Problema:** una persona puede registrarse N veces, inflando artificialmente los números de captación (justo los números que se usarían para pitchear inversión — hay que poder confiar en ellos).
**Qué hacer:** constraint único por (email normalizado + Program) o (teléfono normalizado + Program) a nivel de Prisma schema, no solo validación de UI.

### 1.4 Slots de entrevista hardcodeados sin cupo
**Dónde:** `lib/interviewSlots.ts`.
**Problema:** ya señalado en `PLAN.md` Fase 10 — no hay control de cupo, se puede sobre-agendar.
**Qué hacer:** ya está identificada la solución en su propio roadmap — migrar a modelo real `AvailabilitySlot` usando el patrón de recurrencia descubierto en el repo de referencia CNV (`admin/webinars/schedule.tsx`: plantilla + rango de fechas + días de semana + hora → preview → confirmar). No inventar de cero, ya tienen el patrón de referencia.

---

## Prioridad 2 — Alto (seguridad/continuidad de datos, dado que se maneja info de afiliados políticos)

### 2.1 Sin estrategia de backup documentada para Postgres
**Dónde:** infraestructura (Neon vía Vercel Postgres marketplace).
**Problema:** si la base tiene datos de afiliados de un partido político (MLQR, meta ~27,000 registros), perder esa data no es solo un bug — es un problema de cumplimiento y de confianza contractual.
**Qué hacer:** confirmar si Neon ya tiene point-in-time recovery habilitado en el plan actual; si no, documentar el plan de backup (frecuencia, retención, prueba de restauración) en `docs/02-ARQUITECTURA.md`.

### 2.2 Sin observabilidad/monitoreo de errores
**Dónde:** toda la app — no se menciona en ningún doc actual.
**Problema:** con tráfico real entrando, hoy no hay forma de saber que algo se rompió hasta que el cliente (o el afiliado) se queja.
**Qué hacer:** integrar Sentry (o similar) en las server actions públicas como mínimo — son el punto de mayor exposición a usuarios anónimos.

### 2.3 Pool de conexiones Prisma en entorno serverless
**Dónde:** configuración de `@prisma/adapter-pg` + Vercel functions.
**Problema:** patrón clásico de agotamiento de conexiones Postgres bajo carga en funciones serverless — no validado explícitamente en la documentación actual.
**Qué hacer:** confirmar que se está usando el connection pooler de Neon (modo `pooled` en el `DATABASE_URL`, puerto de pooler) y no la conexión directa, antes de cualquier campaña de tráfico masivo.

---

## Prioridad 3 — Medio (calidad/percepción, barato de arreglar, alto impacto en cualquier revisión externa)

### 3.1 Íconos sin `aria-label` (accesibilidad real, verificado en vivo)
**Dónde:** `components/LyCardView.tsx` y cualquier componente que use Material Symbols por ligadura (`military_tech`, `diamond`, `all_inclusive`, `work`, `mail`, `event`, `chat`, `storefront`, `contact_page`, `light_mode`).
**Problema:** un lector de pantalla anuncia literalmente el nombre del ícono en inglés — verificado directamente en `lycardeo.vercel.app`, no es una suposición.
**Qué hacer:** agregar `aria-label` en español (ej. `aria-label="Rango"` para `military_tech`) a cada uso de ícono, o marcar el ícono como `aria-hidden="true"` cuando ya hay texto visible al lado que cumple la misma función.

### 3.2 Placeholders filtrándose a la vista pública
**Dónde:** badge de "Puesto" en la tarjeta pública (se vio literal `"NA"` en una tarjeta de ejemplo en `lycardeo.vercel.app`); también el número de versión (`V. 1.30.0`) visible en el flujo principal.
**Qué hacer:** cuando `Puesto` no está configurado, no renderizar el badge en absoluto (en vez de mostrar el valor default sin traducir); mover el número de versión detrás de un ícono/modal explícito, no en el flujo principal visible a cualquier visitante.

### 3.3 Sin suite de tests automatizados
**Dónde:** todo el repo — no se menciona en `package.json` ni en ningún doc.
**Problema:** con aislamiento multi-tenant entre Programas ya construido (dato sensible: un N0 de un Programa nunca debería ver datos de otro), la ausencia de tests significa que cualquier cambio futuro puede romper ese aislamiento sin que nadie lo note hasta que ya pasó.
**Qué hacer:** empezar por tests de integración específicamente sobre el aislamiento de scope (`currentAdminScope()`, `isMasterN0()`) — es el área de mayor daño potencial si se rompe, no hace falta cobertura total desde el día uno.

---

## Nota final para quien retome esto en código

Este documento no reemplaza `05-ROADMAP-EDT.md` — es un audit externo que se debe fusionar con ese roadmap existente cuando se retome la sesión de código, evitando duplicar lo que ya está ahí (los puntos 1.3 y 1.2/1.1 en parte ya aparecen mencionados en `PLAN.md` Fase 10; lo nuevo real de esta auditoría son las secciones 2 y 3 completas).
