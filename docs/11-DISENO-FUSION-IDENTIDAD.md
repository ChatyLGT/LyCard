# Fusión de identidad: diseño propuesto (sin código)

Fecha: 2026-10-13. Estado: **APROBADO por Gunnar (2026-10-13)** con las decisiones de §9. Documento para que Sergio y Fabricio
puedan auditar el porqué de cada decisión.

## 1. Principios (ya aprobados por Gunnar)

1. Toda persona es un **Member**. Empleados, Orejas y N0 incluidos.
2. Los **roles se dan por Programa** (membresía), no por tipo de cuenta.
3. El único Admin global (MasterN0) es **Gunnar**. Sergio y Fabricio no son Admin.
   Einar, Chaty y Warren son sus N1, no cuentas de la plataforma.
4. Todos los datos actuales son de prueba: se puede limpiar sin migrar.

## 2. Situación hoy

| Pieza | Hoy |
|---|---|
| `Admin` | tabla aparte, email+password o Google; `programId` null = MasterN0; `role` owner/empleado |
| `Member` | tabla aparte, WhatsApp o Google |
| Cookies | `lycard_admin`, `lycard_empleado`, `lycard_member` (tres sesiones) |
| Puentes | `Admin.memberId` (promoción Chido→N0) y `Admin.ownMemberId` (Oreja con membresía propia) |
| Guards | `currentAdminScope`, `currentEmployeeScope`, `resolveActingScope` (56 archivos los usan) |

Problema: una persona real puede tener 2–3 identidades y 2–3 logins.

## 3. Modelo propuesto

### 3.1 Tablas

- **`Member`** queda como la única identidad. Se le agrega login por email+password
  opcional (`passwordHash String?`), para cubrir lo que hoy hace `Admin`.
- **`ProgramMembership`** (ya existe) gana `roles String[]` (o tabla `MembershipRole`
  si se quiere auditar quién otorgó cada rol y cuándo).
- **`PlatformRole`** (nueva, mínima): `memberId`, `role` (`"masterN0"`). Una sola
  fila válida: Gunnar. Es lo único global.
- `Admin` se **elimina** al final de la migración (ver §6).

### 3.2 Roles por Programa (catálogo inicial a validar)

| Rol | Puede |
|---|---|
| `miembro` (default) | su Card, su Oficina, su Gemelo, conectar su Google |
| `oreja` | Bolsa de Leads, agendar entrevista 1:1, chat con sus leads, bitácora, BizToCard, ver sus comisiones |
| `n0_programa` | todo lo de oreja + administrar el Programa (miembros, puertas, horarios, mensajería) |
| `masterN0` (global) | todo, en todos los Programas |

Un Member puede tener varios roles en un Programa y roles distintos en Programas
distintos. Permisos se resuelven con una función única `can(member, programId, permiso)`
en vez de las tres funciones de scope actuales.

### 3.3 Permisos (catálogo, cada uno atado a un rol)

`leads.claim`, `leads.view_pool`, `interview.schedule`, `interview.complete`,
`door.assign`, `payment.mark`, `session.log`, `biztocard.run`, `chat.lead`,
`program.edit`, `program.members`, `schedule.edit` (horarios de Masterclass),
`commission.view_own`, `commission.view_all`.

Lista a confirmar por Gunnar: en especial **quién tiene `schedule.edit`**
(pendiente #5 del PLAN: MasterN0, N0 de Programa, y Orejas solo para entrevistas).

## 4. Registro y login

- **Una sola pantalla de entrada** (`/entrar`): WhatsApp, Google o email+password.
- Quien se registra queda como `miembro` en el Programa de la invitación.
- Una Oreja es un Member al que un N0 le otorga el rol `oreja`; no se crea cuenta nueva.
- Una cookie (`lycard_member`). Las rutas `/admin/*` y `/empleados/*` pasan a exigir
  el permiso, no una cookie distinta.
- Nadie se da de alta como Admin a mano. Solo Gunnar tiene `masterN0`, sembrado
  por script una vez.

## 5. Qué NO cambia

Pool de Leads, entrevistas, comisiones, chat, BizToCard y Oficina: la lógica de
negocio queda igual; solo cambia **cómo se resuelve quién actúa**.
Comisiones y `soldByAdminId` / `claimedByAdminId` apuntan hoy a `Admin`: pasan a
apuntar a `Member`.

## 6. Plan de migración (por etapas, cada una con su PR y su E2E)

1. **Agregar** `Member.passwordHash`, `ProgramMembership.roles`, `PlatformRole`, y
   `can()`. Nada se borra todavía.
2. **Sembrar** a Gunnar como Member con `masterN0`.
3. **Mover guards**: reemplazar `currentAdminScope`/`currentEmployeeScope`/
   `resolveActingScope` por `can()`, archivo por archivo (56 archivos). Las
   cookies viejas siguen funcionando durante la transición.
4. **Repuntar FKs** de `Admin` a `Member` (`claimedByAdminId`, `soldByAdminId`,
   `senderAdminId`, `recipientAdminId`, `assistantSessions`).
5. **Limpiar** los Admin de prueba y borrar tabla `Admin`, cookies viejas,
   `ownMemberId`, `memberId`, `role` de Admin.

El riesgo está en la etapa 3 (login de todos). Cada etapa se prueba por separado.

## 7. Riesgos y decisiones abiertas

- **Seguridad:** juntar todo en una cuenta vuelve crítico el login del Member
  (WhatsApp es débil para quien administra). Propuesta: los roles `n0_programa`
  y `masterN0` exigen Google o password. **A decidir por Gunnar/Sergio.**
- **Auditoría de roles:** ¿tabla `MembershipRole` con quién y cuándo, o array?
  Recomendación: tabla.
- **Corte:** como los datos son de prueba, recomiendo reset limpio en vez de
  migrar filas.
- **Fuera de alcance:** Dharma, GoldenTicket, Guardianas y cálculo de t³.

## 8. Qué necesito de Gunnar para arrancar

1. ¿Catálogo de roles y permisos de §3 correcto, o ajustás?
2. ¿Quién tiene `schedule.edit`?
3. ¿Roles altos exigen Google/password?
4. ¿Reset limpio de datos de prueba (sí/no)?

## 9. Decisiones de Gunnar (2026-10-13)

1. Catálogo de roles y permisos de §3: **aprobado tal cual**.
2. `schedule.edit` (horarios de Masterclass): **N0 del Programa o MasterN0**.
3. **Todos se registran solo con Google.** Se descarta email+password y WhatsApp como
   login: `Member.passwordHash` ya no hace falta y el OTP de WhatsApp deja de ser
   vía de entrada (queda solo como dato de contacto). Consecuencia: el login es
   uniforme y los roles altos heredan la seguridad de Google.
4. **Reset limpio** de los datos de prueba, sin migrar filas. El reset de la base
   de **producción** se confirma con Gunnar justo antes de la etapa 5 (es irreversible).

Ajuste al plan de migración: la etapa 1 ya no agrega `passwordHash`.
