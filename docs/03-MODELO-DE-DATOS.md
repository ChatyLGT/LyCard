# Modelo de datos

Fuente de verdad: `prisma/schema.prisma` — este documento es un mapa de
lectura, no un sustituto. El schema real tiene comentarios extensos en cada
campo no-obvio; léelos ahí cuando toques algo puntual.

## Diagrama de relaciones (simplificado)

```
Admin ──(programId?)──> Program
Program ──1:N──> Card, Puesto, ProgramSkin, Admin, ProgramMembership
Member ──1:N──> Card (hasta 3: project/company/personal), ProgramMembership,
                 CardNetworkMembership, OriginMemento
Card ──(memberId?, programId?, puestoId?)──> Member, Program, Puesto
Card ──1:N──> Registration, CardNetworkMembership
ProgramMembership ──self──> referredBy / referred (árbol de referidos)
CardNetworkMembership ──self──> referredBy / referred (mismo árbol, por Card)
```

## Modelos, uno por uno

### `Admin`
El superusuario de la plataforma. Si `programId` es `null` es **MasterN0**
(acceso global); si tiene `programId`, es un N0 de Programa, limitado a ese
Programa en toda pantalla y action de `/admin`.

### `Card`
Una tarjeta pública, en `/c/[slug]`. El modelo más grande del schema porque
concentra todo lo que se ve en la vitrina: identidad, medallón/rango/
contactados, canales de contacto, media, tema por defecto. `kind` decide el
comportamiento (`project` | `company` | `personal`):

- `project`: pertenece a un `Program` (vía `programId`), puede tener
  `puestoId` (hereda siglas/denominación de ahí en vez de sus propios
  campos), su Oficina Virtual muestra Superpoderes/Malla.
- `company`: tiene su propia red de clientes (`networkMemberships`),
  independiente de cualquier Program.
- `personal`: sin red, sin Program — la más simple de las tres.

`isOrigin` marca la Card raíz de todo el fractal (hoy, la de Gunnar/Einar) —
se muestra en modo host a cualquier visitante sin necesitar login.

### `Program`
Una marca/iniciativa corriendo sobre la plataforma (ej. Legacy). Solo el
MasterN0 crea Programs. Guarda branding compartido por todas sus Cards
`project` (logo, color, redes) y las 4 "escalas" configurables por el N0:
`medalScale`, `rankScale`, `contactsScale`, `officeSkills` (todas `Json`,
mismo patrón — ver [02-ARQUITECTURA.md](./02-ARQUITECTURA.md)). `active`
apaga el Programa para nuevos joins sin borrar nada existente.

### `ProgramSkin`
Hasta 3 skins de marca guardados por Programa, uno activo a la vez. Se
generan parseando un `design.md` subido (`lib/designMd.ts`) — colores y
tipografía reales, extraídos del archivo, no inventados.

### `Puesto`
Un cargo/rol dentro de la escalera de un Programa (ej. "Fundador",
"Experto"). Una Card `project` puede apuntar a uno (`puestoId`) en vez de
tener sus propios `siglas`/`title`/descripción — si el Puesto se borra, la
Card vuelve a su snapshot propio (`onDelete: SetNull`), nunca queda rota.

### `Member`
Una persona real (distinto del `Admin`, que es un superusuario de
plataforma). Puede tener hasta 3 Cards (una por `kind`). Login por Google o
WhatsApp OTP simulado (`OtpCode`).

### `ProgramMembership`
El árbol de referidos de un Member dentro de un Program — `referredBy`/
`referred` arman la cadena. `status` avanza `invited → interviewed →
active`; recién `active` desbloquea las Cards propias del Member.

### `CardNetworkMembership`
El mismo árbol de referidos que `ProgramMembership`, pero rooteado en una
Card `company` en vez de un Program — la red de clientes propia de un
negocio.

### `OriginMemento`
Snapshot de "la tarjeta que me reclutó", archivado en la Oficina Virtual de
un Member cuando pasa de invitado a host. Reemplaza la vista en vivo del
invitado una vez que ya tiene sus propias Cards.

### `Registration`
Una reserva de entrevista (`/agendar` en cualquier Card). Puede linkear a
una `ProgramMembership` o a una `CardNetworkMembership` si quien reserva es
un Member logueado — o quedar anónima si no.

### `OtpCode`
Código OTP simulado para el login por WhatsApp de `Member`. Corto, de un
solo uso, expirable.

## Campos `Json` — todos siguen el mismo contrato

`officeItems`, `cardLabels`, `medalScale`, `rankScale`, `contactsScale`,
`officeSkills`, `brandDesign`, `colors`/`lightColors` (en `ProgramSkin`):
nunca se leen crudos en un componente — siempre pasan por un parser en
`lib/` que valida forma y aplica un default sensato. Si vas a agregar un
campo `Json` nuevo, seguí ese mismo contrato (ver el patrón completo en
[02-ARQUITECTURA.md](./02-ARQUITECTURA.md)).
