# LyCard — Plan vigente

Documento vivo, depurado el 2026-10-13. Contiene solo lo que está vigente:
reglas, decisiones de producto, pendientes ordenados por urgencia.

El historial completo de fases cerradas (sesión por sesión, ~10.900 líneas)
vive en `docs/PLAN-HISTORIAL.md`. No se lee por default; consultarlo solo
cuando haga falta el detalle de una decisión pasada.

---

## Regla permanente (no negociable)

**Esto no es para salir al mercado.** Todo lo que se construye en este repo
es para entregárselo a **Sergio y Fabricio**, los únicos que dan luz verde
para producción real. Ninguna sesión decide ni implica que algo "ya está
listo para salir".

- Objetivo de cada feature: que Sergio/Fabricio puedan auditarlo, entender
  el porqué de cada decisión y retomarlo sin arqueología.
- Lenguaje correcto: "construido, testeado y documentado para que Sergio y
  Fabricio lo evalúen". Nunca más que eso.
- Piso de shipeo: `tsc` + lint + tests unitarios al 100% + build + E2E +
  verificación visual + PLAN.md + versión.
- Cáscara honesta: lo simulado, parcial o no validado se marca como tal.

---

## Decisiones de producto cerradas

- **Precio base del Programa Legacy:** la puerta Arquitecto ($500 único /
  $100 mensual) es la referencia. Los precios son por Programa: cada
  Programa define los suyos. (`lib/accessDoors.ts` tiene el catálogo.)
- **Integración HeroSuite (Rene):** es por API real. Se implementa en
  producción; es una orden para Sergio y Fabricio, no para hacerla desde
  este repo.
- **Viaje del Cliente (5 fases): cerrado y en producción.**
  Pool de Leads → agendar entrevista 1:1 → chat Oreja↔Lead → comisiones
  sobre `traidoPor` → la Oreja también puede ser Member (vinculación, sin
  fusionar identidades).
- **Fusión de identidad Admin/Member:** fuera de alcance. Hoy son dos
  sistemas de login separados a propósito (cookies y tablas distintas).
  Unificarlos cambia el login de todos; requiere decisión propia.
- **Cadena de referidos N0–N3:** la carga real de quién refirió a quién
  está pausada por pedido de Gunnar ("quiero que entiendas el proceso").

---

## Pendientes, ordenados por urgencia e importancia

### Urgente (depende de Gunnar, bloquea valor)

1. **Rotar la API key de AssemblyAI** que quedó expuesta en el chat y
   cargarla como variable de entorno (`ASSEMBLYAI_API_KEY`) en Vercel y en
   `.env` local. Nunca va al repo ni a este documento. Sin esto, las notas
   de voz quedan en "esperando transcripción".
2. **Credenciales de Google OAuth** (client ID y secret en Google Cloud
   Console, más la URL de redirección registrada). Sin esto, el botón de
   conectar Google queda inerte. Ver Glosario.

### Importante (producto)

3. **Calendario de capacitaciones (primera versión del Funnel de
   certificación de la Oreja).** Gunnar (MasterN0) publica fechas de
   capacitación por tema. Oreja, Member o cualquier programa invitado entra
   y se conecta a Google Meet; las sesiones pueden quedar registradas en
   Fathom. Solo agenda y acceso; el recorrido completo de certificación
   (capacitación → shadowing → sesiones asistidas → libertad → rangos)
   queda para después. **Pendiente: aprobación de diseño antes de construir.**
4. **Menú digital (WowApp `menuDigital`).** Cada empresa crea su catálogo
   de productos y servicios de forma simple. Se construye sobre el modelo
   WowApp existente. **Pendiente: diseño y aprobación.**
5. **Horarios de la Masterclass configurables por privilegio.** Hoy
   "Agendar tu entrevista" tiene horarios hardcodeados. Debe poder
   administrarlos quien tenga el permiso (MasterN0 y, según se defina, N0
   de Programa). Aplica a la Masterclass, no a la entrevista 1:1.
   **Pendiente: definir qué roles tienen el permiso.**
6. **Tarjeta Rogelio, pasos 2, 3 y 7** (redes del Programa Legacy, botón
   "Programa Legacy", QR + E2E del recorrido). Quedan para la fase de
   pruebas funcionales, por pedido de Gunnar.

### Técnico / deuda

7. **Editor de tarjeta: ítems sin hacer** (detalle abajo).
8. **Gemelo Digital y Oficina, Fase D2–D4:** acordeón encendido/apagado por
   sección, tracking real de QRs enviados, dashboard "Mis QRs". Fase D5 es
   opcional.
9. **NashMesh, φ real:** hoy φ es una contribución declarada a mano. El
   cálculo completo (Shapley) queda pendiente de definir. Ver Glosario.
10. **Suite E2E:** hay flakes conocidos y todavía no hay una suite de
    regresión automatizada completa.

### Bajo / a futuro (no tocar sin pedido concreto)

11. Fusión de identidad Admin/Member.
12. Cadena de referidos N0–N3 (carga real de datos).
13. Gemelo Digital con IA real entrenada por persona. Hoy es un chat guiado
    de demostración, no IA entrenada.

---

## Editor de tarjeta: ítems pendientes

- Rediseñar el editor: hoy es una lista plana de inputs.
- Video que aparezca antes del título "Descubrí en…".
- Subida de hasta 3 archivos (PDF o imagen), con tope definido.
- Botón de acción configurable (tipos fijos hoy).
- Campo de video (`videoThumbnailUrl`) que acepte un link real.
- QR y "Enviar Invitación": mismo tratamiento de acción, imagen y texto.
- Títulos de todos los popups, editables.
- Línea de cita/lema con line-clamp ajustable.

---

## Glosario

- **Fase 5 / fusión de identidad:** hoy una persona puede tener dos cuentas
  separadas: una de Admin (Oreja, N0) y una de Member (cliente). Fusionar
  sería tener una sola cuenta con rangos. Lo ya hecho solo vincula ambas
  sin tocar los logins.
- **Google OAuth:** protocolo para "entrar con Google" y pedir permisos
  (Calendar, Drive). Requiere credenciales en Google Cloud Console y la URL
  de redirección registrada. Sin credenciales, el botón no hace nada.
- **Oficina Virtual:** página interna de cada Card para su dueño: KPIs,
  equipo, malla, superpoderes, objetivo del día y noticias.
- **Gemelo Digital:** chat guiado que representa al dueño. Hoy es una demo
  con respuestas preparadas; no es IA entrenada.
- **Fase 9 (Programas configurables):** cargos (Puestos), escalas de
  medallón, jerarquía, historia personal, skins y modales dejan de estar
  hardcodeados y los configura el N0 de cada Programa. Quedan partes sin
  verificar en la UI real.
- **Deuda técnica:** trabajo que funciona pero se hizo rápido o sin
  automatizar (tests intermitentes, cobertura incompleta, partes sin
  validación visual). Se paga antes de entregar.
- **NashMesh:** motor de reparto de pago simulado, en `lib/nashMesh.ts`:
  `Payment = V × φ × ψ × (1−ε)`. ψ son tres niveles de autonomía (15%, 35%,
  100%). φ hoy es contribución declarada a mano, no Shapley. Sin dinero real
  ni blockchain.

---

## Estado de verificación

Último ciclo completo: Viaje del Cliente Fase 5 (PR #12, v1.99.0).
Unit tests 410/410 con cobertura 100%. E2E 114 pasando, 1 skip documentado
("Reposicionar", pedido explícito de Gunnar). Build y lint limpios.
