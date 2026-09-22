# QA Completo — Funcionalidad, Diseño, Arquitectura y Seguridad

**Fecha:** 2026-09-18
**Relación con los otros documentos:** este QA complementa `AUDITORIA-TECNICA-2026-09.md` (que cubrió rate-limiting, validación, backups, observabilidad, accesibilidad). Acá va todo lo nuevo que no estaba ahí.

---

## A. FUNCIONALIDAD

### A.1 vCard incompleto respecto a lo que la tarjeta muestra
**Verificado en vivo:** el `.vcf` descargado solo trae `FN`, `TITLE`, `TEL`, `URL`, `NOTE`. La tarjeta visible muestra foto, redes sociales (Facebook/Instagram/TikTok/LinkedIn/YouTube) y más de un link — nada de eso llega al contacto guardado.
**Por qué importa:** el "Guardar Contacto" es una de las conversiones más importantes del funnel (es la acción que saca a la persona de la app y la deja en su celular para siempre) y hoy entrega una versión pobre de lo que prometió.
**Qué hacer:** ampliar el generador de vCard para incluir `PHOTO` (URL o base64), `EMAIL` si existe, `ORG`, y los perfiles sociales como `X-SOCIALPROFILE` (soportado por iOS/Android modernos).

### A.2 Estados de fallo sin retry en Notas de Voz
**Documentado:** sin `ASSEMBLYAI_API_KEY`, la nota queda "esperando transcripción — para siempre" (comportamiento honesto, correcto). Pero **no está documentado qué pasa si la key SÍ existe y la llamada a AssemblyAI falla** (timeout, rate-limit del proveedor, audio corrupto). Hoy no hay evidencia de retry/backoff ni de un estado de error distinto a "esperando".
**Qué hacer:** diferenciar 3 estados: `sin_configurar` (actual), `procesando`, y `error_transcripcion` (nuevo) — el tercero con reintento manual desde la UI, no una espera infinita indistinguible de un fallo real.

### A.3 Revocación de OAuth de Google no contemplada
**Riesgo:** si un Member conecta Google y luego revoca el acceso desde su cuenta de Google (fuera de la app), el `refresh_token` queda inválido. No hay evidencia de manejo de ese caso — la Agenda podría fallar silenciosamente o mostrar un error críptico en vez de volver a ofrecer "Conectar Google" limpio.
**Qué hacer:** capturar el error específico de token revocado en `lib/googleServices.ts` y, ante ese error, resetear el estado de conexión del Member para que la UI vuelva a mostrar el botón "Conectar Google" en vez de un error genérico.

### A.4 Caché offline (PWA) sin invalidación explícita
**Documentado:** `public/sw.js` cachea la tarjeta pública para que abra offline — bien pensado para campo. **No documentado:** qué pasa cuando el dueño edita su Card — ¿el visitante que ya tiene la PWA instalada sigue viendo la versión vieja cacheada indefinidamente?
**Qué hacer:** estrategia de invalidación por versión/hash de contenido (no solo por versión de app), para que una edición real de la tarjeta se refleje sin esperar a que el visitante borre caché manualmente.

### A.5 Enumeración de cuentas en `/admin/reset`
**No documentado si ya se maneja:** un flujo de "recuperación de password" que responde distinto según si el email existe o no es una vía clásica de enumeración de cuentas (útil para un atacante dirigido contra una cuenta específica de Admin).
**Qué hacer:** confirmar que la respuesta de `/admin/reset` es idéntica (mismo mensaje, mismo tiempo de respuesta aproximado) exista o no el email.

---

## B. DISEÑO / UX

### B.1 Exceso de CTAs primarios por tarjeta
**Verificado en vivo:** una sola tarjeta llega a mostrar hasta 4-5 acciones al mismo nivel visual (Mi Camino, Más Información, Enviar Invitación, Agendar, más Guardar Contacto/Mensaje/Café en otra variante). Sin jerarquía clara, el visitante no sabe cuál es LA acción que quieres que tome.
**Qué hacer:** definir una acción primaria (visualmente dominante) por tipo de Card, y bajar el resto a acciones secundarias (texto/ícono más discreto). Esto es decisión de producto, no solo de estilo — probablemente le corresponde a Jauncho (marketing) definir cuál CTA prioriza cada tipo de Card.

### B.2 Selector de idioma sin confirmar que funcione
**Observado:** aparece "ES" como texto/label en el render de la tarjeta, y existe `lib/i18n.ts` con copys ES/EN. No pude confirmar interactivamente si el toggle cambia el idioma en vivo o es solo un indicador estático.
**Qué hacer:** QA manual explícito: tocar el selector de idioma en un dispositivo real y confirmar que renderiza en inglés antes de asumir que la feature está completa.

### B.3 Sin validación de formato de URL en los campos de redes sociales
**Verificado en vivo (data de seed, pero revela ausencia de validación):** links como `https://legacy`, `https://A`, `https://D` — URLs sintácticamente "válidas" pero rotas en la práctica. Si esto pasó en seed, un Member real editando su Card desde el celular puede guardar el mismo tipo de link roto sin que nadie se lo advierta.
**Qué hacer:** validación de formato (dominio real, no solo `https://` + string) en el editor del Member, con preview del link antes de guardar.

---

## C. ARQUITECTURA

### C.1 Tres sistemas de autenticación en paralelo
Admin (bcrypt + cookie), Member (Google + WhatsApp OTP simulado), y el login alterno de Admin vía Google — documentado y separado a propósito, lo cual está bien. Pero son **tres superficies de ataque distintas** que hay que auditar cada una, no asumir que revisar una cubre las otras.
**Qué hacer:** checklist de seguridad idéntico aplicado a los 3 flujos (rate-limit, enumeración, expiración de sesión, rotación de cookie).

### C.2 Modelo de Admin único (Master Admin) sin RBAC granular
Hoy es "cuenta única guardada en la base" para MasterN0, más N0 acotados por Programa. Con 6 socios y un equipo creciendo, compartir una sola cuenta o credenciales por Programa es frágil (no hay revocación individual, no hay atribución clara de quién hizo qué más allá de lo que ya registra `AdminLoginEvent`).
**Qué hacer:** evolucionar a admins individuales con rol explícito (ya existe la infraestructura de logging — falta el modelo de múltiples cuentas reales por persona en vez de una compartida).

### C.3 Migraciones de Prisma corriendo directo contra producción en cada deploy
`prisma migrate deploy && next build` corre en cada deploy, según el propio README. Es simple y funciona, pero no hay evidencia de un paso de staging/dry-run antes de aplicar una migración a la base de producción — con datos reales de un partido político circulando, un solo `migrate deploy` mal escrito puede tirar la tabla equivocada sin red de seguridad.
**Qué hacer:** al menos correr `prisma migrate diff` o un ambiente de preview con su propia base antes de que el deploy a `main` toque producción.

### C.4 Componente de grafo 3D hecho a mano (Malla)
`components/MallaGraph.tsx`, three.js sin librería envolvente. Poderoso visualmente, pero es el componente de mayor complejidad de mantenimiento del repo — cualquier bug ahí requiere a alguien que entienda three.js a fondo, no un desarrollador Next.js promedio.
**Qué hacer:** documentar ese componente específicamente mejor que el resto (comentarios inline, decisiones de diseño) porque es el que más va a costar depurar si algo se rompe y la persona original no está disponible.

---

## D. SEGURIDAD

### D.1 Dato sensible sin tratamiento especial: afiliación política
Los registros de MLQR implican **afiliación política**, categoría de dato personal sensible bajo la ley mexicana de protección de datos (LFPDPPP) — requiere aviso de privacidad explícito y, idealmente, cifrado a nivel de campo, no solo la protección genérica de la base de datos.
**Qué hacer (alcance técnico, no legal — el marco legal ya es de Javier/el despacho):** (a) pantalla de aviso de privacidad explícita antes de capturar el dato en el flujo de registro de MLQR, con registro de que la persona lo aceptó; (b) evaluar cifrado a nivel de columna para el campo de afiliación/Programa político específicamente, no solo TLS + cifrado de disco genérico de la base.

### D.2 Falta de rate-limit específico en `/admin/login` y `/admin/reset`
La recomendación de rate-limiting de la auditoría técnica se enfocó en las server actions públicas de captación — hay que extender exactamente el mismo control a los endpoints de autenticación de Admin, que son objetivo aún más valioso para un atacante (acceso completo a un Programa o a todo el sistema si es MasterN0).

### D.3 Headers de seguridad / CSP no confirmados
No hay evidencia en `next.config.ts` (según lo documentado) de configuración explícita de Content-Security-Policy, `X-Frame-Options`, `Strict-Transport-Security`, etc.
**Qué hacer:** confirmar y, si falta, agregar vía `headers()` en `next.config.ts` — es configuración de una sola vez, bajo costo, buena práctica estándar.

---

## E. Propuesta de proceso de QA hacia adelante (no hay uno hoy)

Hoy no existe ningún proceso de QA formal ni suite de tests. Antes de escalar tráfico real, se recomienda como mínimo:

1. **Checklist de smoke test manual** antes de cada deploy a producción: ver tarjeta pública, guardar vCard, agendar entrevista, login de Admin (los 3 métodos), editar una Card como Member. 10 minutos, cero automatización, pero atrapa el 80% de regresiones evidentes.
2. **Ambiente de staging** con su propia base de datos, para probar migraciones antes de que toquen producción (ligado a C.3).
3. **Tests automatizados de aislamiento multi-tenant** (ya mencionado en la auditoría técnica, sección 3.3) — es el único punto donde recomiendo automatización desde ya, porque el costo de que se rompa en silencio es el más alto de toda la lista.
4. Una vez que Sentry (u otro) esté integrado (auditoría técnica, sección 2.2), definir un **canal de alertas** (Slack/Discord, que ya usan) para errores en producción — no solo capturarlos, sino que alguien se entere en minutos, no en el próximo reporte del cliente.

---

## F. Reportes de Usuario (QA manual, en dispositivo real) — fuente de mayor confianza que las secciones A-E

Esta sección es distinta a las anteriores: A-E son hallazgos inferidos de código/documentación/inspección remota. Lo que va acá es **reportado directamente por quien probó la app en su propio dispositivo** — mayor prioridad de investigación que cualquier cosa inferida arriba.

### F.1 — PWA instalada no funciona sin conexión como se esperaba
**Reportado por:** founder, en celular real, 2026-09-18.
**Comportamiento esperado (según diseño documentado en `docs/04-MODULOS.md`, sección PWA):** instalar la tarjeta como ícono de escritorio (`app/manifest.ts`) y que funcione offline gracias al service worker (`public/sw.js`, cachea la tarjeta pública) con fallback a `app/offline/page.tsx`.
**Comportamiento reportado:** no está funcionando como una PWA normal sin conexión.
**Estado:** 🔴 abierto — falta precisar el modo de fallo exacto (ver pregunta en el chat: ¿falla la instalación en sí, o instala bien pero no funciona offline?) antes de poder asignar causa raíz. Se actualiza este registro en cuanto se confirme.
**Por qué es prioritario:** esta feature es específicamente relevante para el caso de uso de captación en campo (afiliados de MLQR, zonas con conectividad irregular) — si no funciona, se pierde una de las razones de negocio para haberla construido.

---

## Resumen de este documento

Esto no cierra la auditoría — es la segunda capa, y ahora incluye una sección viva (F) para reportes reales de uso en dispositivo, que van a pesar más que cualquier inferencia mía. Mándame los siguientes reportes tal como te vayan saliendo (qué esperabas, qué pasó, en qué dispositivo/navegador) y los agrego a la sección F con la misma estructura, además de cruzarlos contra lo ya documentado. Quedan también temas que todavía no he mirado a fondo por falta de acceso directo al código completo (por ejemplo, el modelo de datos completo de Prisma) — si en algún momento me compartes `02-ARQUITECTURA.md`, `03-MODELO-DE-DATOS.md` o el `schema.prisma` pegado en el chat, profundizo ahí también.
