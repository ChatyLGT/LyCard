# Cómo contribuir

Este documento es la base — está pensado para cambiar. Si algo acá quedó
desactualizado por una decisión nueva de Gunnar o por algo que el equipo de
desarrollo encontró trabajando, se edita este archivo en el mismo commit
que el cambio. No hace falta pedir permiso para mantener la documentación
al día con la realidad del código.

## Antes de escribir código

1. Leé [02-ARQUITECTURA.md](./02-ARQUITECTURA.md) — especialmente el patrón
   de "lista editable por el N0" si lo que vas a construir se parece a eso.
2. Si el cambio es chico y acotado (un fix, un campo nuevo en un modelo ya
   documentado), andá directo.
3. Si el cambio es grande o ambiguo (un módulo nuevo, algo del
   [roadmap](./05-ROADMAP-EDT.md)), el flujo esperado por Gunnar es:
   **plan primero → aprobación → ejecución por fases**, con una verificación
   real (no solo `tsc`) al final de cada fase. Esto no es burocracia — es lo
   que mantuvo 90+ fases de este proyecto sin romper nada en producción.

## Reglas que no son opcionales

- **Cáscara honesta**: nunca simules una conexión, un dato o un acceso que
  no existe de verdad. Si algo no está conectado, la UI lo dice
  explícitamente.
- **Versionado**: cada cambio que se shippea bumpea `APP_VERSION` y agrega
  una entrada a `CHANGELOG` en `lib/version.ts`, en el mismo commit.
- **Nunca hardcodees un secreto**: API keys y webhook secrets van a
  variables de entorno de Vercel, nunca a un archivo del repo — ni de
  prueba, ni comentado.
- **Scope de Admin**: cualquier action de `/admin` valida
  `isMasterN0()`/`currentAdminScope()` antes de tocar datos, nunca confía
  en que la UI ya filtró.
- **Campos `Json`**: nunca se leen crudos en un componente — siempre pasan
  por un parser en `lib/` (ver [03-MODELO-DE-DATOS.md](./03-MODELO-DE-DATOS.md)).

## Checklist antes de dar por terminada una fase

1. `npx tsc --noEmit` sin errores.
2. `pnpm build` local sin errores.
3. Probado en el navegador (o Playwright contra un build real) — golden
   path + al menos un caso borde (dato vacío, usuario sin permiso, feature
   apagada).
4. `lib/version.ts` bumpeado con su entrada de changelog.
5. `PLAN.md` con una entrada nueva describiendo la fase (bitácora
   cronológica — no reemplaza estos docs, los complementa).
6. Commit + push. El deploy a Vercel es automático; confirmar `READY` antes
   de avisar que está listo.

## Cómo agregar un módulo nuevo del roadmap

El [roadmap](./05-ROADMAP-EDT.md) ya trae, para cada pieza pendiente
(HR, CRM, PM, Oficina+Negocio, NashMesh+MachineEngine, AppStore de Skills),
los archivos exactos a crear y el orden de pasos. Seguilo tal cual está
escrito la primera vez — si en el camino aparece una razón real para
desviarse, documentá el desvío ahí mismo (por qué, qué se decidió en su
lugar) en vez de silenciarlo.

## Dudas sobre el vocabulario del ecosistema (Einar, Chaty, Warren, N0/N1...)

Ver [01-VISION-Y-ALCANCE.md](./01-VISION-Y-ALCANCE.md#contexto-de-fondo-einaros)
para lo mínimo indispensable, y `../WHITEPAPER.md` para la versión completa.
Ninguno de esos nombres es necesario para tocar el código de LyCard — están
documentados para que el roadmap (que sí los usa) tenga sentido.

## Este documento está abierto a cambio

Tanto Gunnar como cualquier desarrollador del equipo pueden y deben
actualizar cualquiera de estos 6 archivos cuando la realidad del proyecto
cambie. La única regla: un cambio de arquitectura o de alcance se refleja
acá en el mismo PR/commit que lo introduce, no después — para que estos
docs nunca mientan sobre el estado real del código.
