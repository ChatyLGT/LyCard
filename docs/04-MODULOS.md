# Módulos ya construidos

Todo lo de acá está en producción hoy. Para lo que falta construir, ver
[05-ROADMAP-EDT.md](./05-ROADMAP-EDT.md).

## Tarjeta pública

**Archivos:** `app/c/[slug]/page.tsx` (fetch de la Card + resolución de
Program/Member/Puesto), `components/LyCardView.tsx` (el render completo:
identidad, medallón, badges, canales, carrusel, QR, modal de versión).

Resuelve por `slug` sin importar sesión — pública por diseño. Si
`card.isOrigin` es true, se muestra en modo host a cualquiera sin login.

## Admin (panel del Admin/N0)

**Archivos:** `app/admin/page.tsx` (roster, agrupado por Programa),
`app/admin/[slug]/page.tsx` (editor de una Card), `app/admin/login`,
`app/admin/account` (cambio de contraseña), `app/admin/programs/*` (CRUD de
Programs, miembros, Puestos — MasterN0 crea Programs, un N0 de Programa
solo ve el suyo), `app/admin/interviews` (registros de "Agendar tu
Entrevista"), `app/admin/reset` (recuperación de contraseña).

Auth: `lib/auth.ts` (`isMasterN0()`, `currentAdminScope()`). Toda action de
`/admin` valida el scope antes de tocar datos — nunca confíes en que la UI
ya filtró.

## Oficina Virtual

**Archivo central:** `app/c/[slug]/oficina/page.tsx`. Se bifurca en
`OwnerOficina` (el dueño logueado) y `VisitorOficina` (cualquier otro) —
el visitante ve una versión de solo-explicación, nunca datos reales
(cáscara honesta). El dueño ve, de arriba a abajo hoy: saludo,
Superpoderes, la Malla del equipo, el botón del Gemelo Digital.

`dashboardHref` decide a dónde manda "Editar Oficina": si es un Admin, va
directo al dashboard del Programa (`/admin/programs/[id]?focus=officeSkills`)
o al roster (`/admin/[slug]`) — nunca a la pantalla de alta de Member
(`/m/login`), que es solo para Members reales.

## Superpoderes

**Archivos:** `lib/officeSkills.ts` (tipos + parser + `DEFAULT_OFFICE_SKILLS`),
`components/OfficeSkillsBlock.tsx` (el grid de íconos en la Oficina),
`components/OfficeSkillsEditor.tsx` (acordeón de edición, en el dashboard
del Programa). Cada Superpoder es `{key, nombre, descripcion, iconUrl,
color, appType, enabled}`, guardado en `Program.officeSkills`. Tocar un
ícono abre una tarjeta con dos caras: la app real de un lado (hoy: el Brief
de Fathom), la explicación del otro — el visitante solo ve la explicación.

## Brief de reuniones (Fathom) — el primer Superpoder real

**Archivos:** `lib/fathom.ts` (cliente de la API pública de Fathom, con
paginación completa hasta agotar la cuenta), `components/FathomBriefBlock.tsx`
(el render). Sin `FATHOM_API_KEY` configurada, se degrada limpio
(`enabled:false`) — nunca rompe la Oficina.

## La Malla del equipo

**Archivos:** `components/MallaGraph.tsx` (grafo 3D con three.js, hecho a
mano — no es una librería de grafos envuelta), `lib/mallaData.ts` (los dos
datasets: el de "vitrina" para el visitante y el del equipo real para el
dueño, con nodos fantasma para posiciones vacantes).

## Gemelo Digital — demo guiada

**Archivos:** `app/c/[slug]/oficina/demo/page.tsx`,
`components/OfficeDemoChat.tsx`. Simula, con un guion fijo tipo WhatsApp,
cómo se vería interactuar con el agente — todavía no hay backend de IA real
detrás. Es la base sobre la que se construye Warren (ver
[05-ROADMAP-EDT.md](./05-ROADMAP-EDT.md#bot-warren-en-la-oficina)).

## Dashboard del Member (`/m`)

**Archivos:** `app/m/dashboard/page.tsx` (lista sus hasta-3 Cards),
`app/m/dashboard/company` / `personal` / `project` (editores por tipo —
`components/MemberCardEditor.tsx` para company/personal,
`components/MemberStoryEditor.tsx` para "Mi camino con..." en project),
`app/m/dashboard/company/network` (la red de clientes de una Company),
`app/m/onboarding`, `app/m/auth/google/*` (OAuth), `app/m/login`.

## Onboarding / chat simulado de alta

**Archivo:** `components/OnboardingChat.tsx` — el flujo tipo WhatsApp para
que un invitado se registre y avance su `ProgramMembership`.

## PWA

**Archivos:** `app/manifest.ts`, `public/sw.js` (hand-rolled, cachea la
tarjeta pública para que abra offline),
`components/ServiceWorkerRegistration.tsx`, `app/offline/page.tsx`. Las
pantallas con sesión (admin, dashboard) siguen requiriendo conexión a
propósito.

## i18n y datos fijos

**Archivos:** `lib/i18n.ts` (copys ES/EN), `lib/data.ts` (escalas fijas de
fallback: `MEDALS`, `RANKS`), `lib/cardLabels.ts` (overrides de texto por
Programa), `lib/escalas.ts`, `lib/interviewSlots.ts` (horarios hardcodeados
de "Agendar tu Entrevista"), `lib/badge.ts`, `lib/color.ts`, `lib/slug.ts`.
