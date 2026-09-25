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
4. **`main` ya no recibe pushes directos** (Fase de Endurecimiento, Paso B,
   2026-09). Todo cambio se hace/pushea primero contra `staging` — ver la
   sección de abajo.

## Flujo de ramas: `staging` → `main`

Desde el Paso B de la Fase de Endurecimiento, `main` dejó de ser el lugar
donde se prueban cosas. El orden real:

1. **Todo trabajo nuevo pushea a `staging`**, no a `main`. `staging` tiene
   su propio deploy de Vercel, con su propia URL de preview (se genera
   sola: `lycard-git-staging-<team>.vercel.app` — confirmá la URL exacta
   en el dashboard de Vercel del proyecto, pestaña Deployments, filtrando
   por la rama `staging`).
2. Gunnar (o quien él delegue) prueba en esa URL de staging, no en
   producción.
3. Cuando está aprobado, se abre un Pull Request `staging → main` en
   GitHub. `ci-qa.yml` corre automático en ese PR (lint + unit +
   cobertura + build + E2E). **`main` solo se actualiza con la aprobación
   explícita de Gunnar** — hoy eso significa "Gunnar dice que sí" antes
   de mergear el PR; el Paso C de esta misma fase va a hacer que GitHub
   lo bloquee solo si el PR no está en verde.
4. Un merge a `main` dispara el deploy de producción real, igual que
   siempre.

**Aislamiento de base de datos (pendiente, necesita una acción tuya,
Gunnar — no de esta sesión):** el objetivo del Paso B es que `staging`
escriba en una base de datos DISTINTA a la de producción, para que un
bug ahí nunca toque datos reales. Esta sesión no tiene permiso para leer
ni escribir las variables de entorno ni los conectores del proyecto en
Vercel (los llamados a la API de Vercel para eso devuelven 403
Forbidden) — así que ese cableado no quedó hecho, y hace falta que lo
resuelvas vos (o alguien con acceso completo al proyecto en Vercel)
desde el dashboard:

1. En Neon, creá un branch/database nuevo para staging (Neon tiene
   "database branching" — un clic, parte de un snapshot de la
   producción o vacío, como prefieras).
2. En Vercel → Project → Settings → Environment Variables, agregá
   `DATABASE_URL` con el connection string de ESE branch de Neon, target
   `Preview`, **con "Git Branch" puesto en `staging`** (no en todas las
   Preview a la vez — si no, cualquier PR de cualquier feature branch
   también pegaría contra esa base, que ya sería mejor que producción
   pero no lo que pediste).
3. Redeployá `staging` una vez para que tome la variable nueva.

Hasta que ese paso se haga, **no hay garantía de aislamiento real de
datos** — solo aislamiento de código/URL. Esta sesión no pudo confirmar
(por el mismo 403) si el Preview de Vercel hoy ya apunta a producción o
a otra base, así que hay que asumir el peor caso: no probar en
`staging` nada que escriba datos reales hasta confirmar (vos, con
acceso al dashboard) qué `DATABASE_URL` está usando ese Preview hoy, y
después separarla como se explica arriba.

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
7. Commit + push **a `staging`** (ver "Flujo de ramas" más arriba — ya no
   se pushea directo a `main`). El deploy a Vercel de esa rama es
   automático; confirmar `READY` antes de avisar que está listo. Pasar a
   `main` es un paso aparte, con PR y aprobación de Gunnar.

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
