# Cómo contribuir

Este documento es la base — está pensado para cambiar. Si algo acá quedó
desactualizado por una decisión nueva de Gunnar o por algo que el equipo de
desarrollo encontró trabajando, se edita este archivo en el mismo commit
que el cambio. No hace falta pedir permiso para mantener la documentación
al día con la realidad del código.

## Flujo de trabajo (simple, mientras seguimos en diseño)

Push directo a `main` está bien — todavía no hay usuarios reales.
Existe una rama `staging` con su propio deploy de Vercel, armada y
esperando para cuando la necesitemos, pero hoy no está en uso activo.
Ver [09-CHECKLIST-LANZAMIENTO-PUBLICO.md](./09-CHECKLIST-LANZAMIENTO-PUBLICO.md)
para lo que falta endurecer antes de recibir tráfico real (staging con
su propia base, tests obligatorios, respaldos/alarmas, métrica de
distribución) — nada de eso es urgente ahora, es la lista para cuando
llegue el momento.

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
4. Si tocaste código con tests unitarios existentes, `pnpm test:unit`
   sigue pasando. Si escribiste lógica pura nueva y crítica para
   seguridad/datos (el criterio real: "si esto falla mal, hay una fuga o
   se pierde plata/data"), sumale tests — ver sección de abajo.
5. `lib/version.ts` bumpeado con su entrada de changelog.
6. `PLAN.md` con una entrada nueva describiendo la fase (bitácora
   cronológica — no reemplaza estos docs, los complementa).
7. Commit + push. El deploy a Vercel es automático; confirmar `READY` antes
   de avisar que está listo.

## Testing automático (Vitest + Playwright + CI)

Desde v1.35.0 existe un piso de testeo continuo, shift-left: no
reemplaza el checklist manual de arriba, lo respalda para que un
regresión real no dependa solo de que alguien se acuerde de probarla a
mano.

- **`pnpm test:unit`** (Vitest) — tests unitarios rápidos, sin DB ni
  red, para lógica **pura** en `lib/`. Patrón: si una función de
  seguridad/scope/cálculo se repite a mano en varios call sites (como
  pasaba con el chequeo de scope de Admin antes de `lib/authScope.ts`),
  extraela a una función pura, exportala, y testeala ahí — un solo
  lugar, un solo test, se usa en todos lados.
- **`pnpm test:unit:coverage`** — igual, con gate de cobertura. El gate
  es un **ratchet**, no un piso global: `vitest.config.mts` solo exige
  90% en los archivos que ya están en `coverage.include` (hoy
  `lib/authScope.ts`, `lib/leads.ts`). Si escribís tests nuevos y
  querés que el gate los proteja, agregá el archivo a esa lista — nunca
  al revés (nunca bajes el número para que pase).
- **`pnpm test:e2e`** (Playwright) — contra un server real
  (`pnpm dev` local, o un build de producción en CI). Cada spec crea y
  borra su propia data de prueba (`beforeAll`/`afterAll`) — nunca
  depende de que exista tal o cual Card/Program pre-sembrado, para que
  corra igual en cualquier DB.
- **`.github/workflows/ci-qa.yml`** — corre lint + `test:unit:coverage`
  en cada PR a `main`; si pasa, levanta Postgres + build de producción
  real y corre `test:e2e` headless. Un PR que rompe cualquiera de los
  dos no debería mergearse.

No todo necesita un test. La foto no es "100% de cobertura en todo
LyCard" — es "la lógica que, si se rompe en silencio, cuesta caro
(seguridad, plata, datos de un usuario) tiene un test que lo impide".

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
