# Checklist — antes de salir al público

Este documento nace de la Fase de Endurecimiento que arrancamos el
2026-09-24 y pausamos casi enseguida (seguimos en fase de diseño, sin
usuarios reales todavía — no tenía sentido endurecer algo que todavía
está cambiando de forma). Nada de esto es urgente HOY. Es la lista de lo
que sí tiene que estar resuelto antes de que LyCard reciba tráfico de un
cliente real, no interno de Legacy.

Leyenda: ✅ hecho · ⏳ parcial · ❌ pendiente, no iniciado.

## 1. Seguridad — historial de git limpio

**✅ Hecho** (2026-09-24 y reconfirmado 2026-09-25). `gitleaks` corrido
sobre las 152 commits del historial completo (única rama existente en
ese momento, `main`): cero claves, tokens o contraseñas commiteadas
nunca. Cruzado a mano contra los nombres reales de nuestros secretos
(`SESSION_SECRET`, `GOOGLE_CLIENT_SECRET`, `RESEND_API_KEY`, etc.) — todo
limpio. El repo ya está en privado.

**Antes de lanzar**: volver a correr `gitleaks git --log-opts="--all"`
una última vez (por si algo se coló en el medio), y considerar sumarlo
como paso automático de `ci-qa.yml` para que cada PR se autochequee solo.

## 2. Staging con su propia base de datos

**⏳ Parcial.** Existe la rama `staging`, con su propio deploy de Vercel
en una URL fija: `lycard-git-staging-einaros.vercel.app`. Lo que falta
es que tenga su PROPIA base de datos — hoy no hay garantía de
aislamiento real de datos entre `staging` y producción.

Bloqueo real: esta sesión no tiene permiso para leer ni escribir las
variables de entorno ni los conectores del proyecto en Vercel (la API
devuelve 403 Forbidden en ambos casos), así que ese cableado no se pudo
terminar acá. Falta, hecho por alguien con acceso completo al proyecto
en Vercel:

1. Crear un branch/database nuevo en Neon para staging.
2. En Vercel → Project → Settings → Environment Variables, agregar
   `DATABASE_URL` con ese connection string, target `Preview`, con
   **"Git Branch" puesto en `staging`** (no en todas las Preview).
3. Redeployar `staging` para que tome la variable nueva.

**Mientras esto no esté**: no cargar en `staging` nada que no sea
descartable — no hay certeza de a qué base está escribiendo hoy.

**Estado del flujo de trabajo**: volvimos al flujo simple (push directo
a `main`, como antes de esta fase). `staging` queda armada y esperando
para cuando la necesitemos, sin uso activo por ahora.

## 3. Tests obligatorios (branch protection en `main`)

**❌ Pendiente.** Ya existe `.github/workflows/ci-qa.yml`: corre lint +
tests unitarios (con gate de cobertura) + build de producción + tests
E2E en cada Pull Request contra `main`. Pero hoy es informativo, no
bloqueante — se puede mergear un PR aunque el workflow esté en rojo, y
cualquiera con acceso de escritura puede pushear directo a `main` sin
pasar por PR.

Falta: en GitHub → repo → Settings → Branches → agregar una regla de
protección para `main` con "Require status checks to pass before
merging" (seleccionando los jobs de `ci-qa.yml`) y "Require a pull
request before merging". Eso convierte el checklist de
[06-CONTRIBUIR.md](./06-CONTRIBUIR.md) de sugerencia a obligación real.

## 4. Respaldo y alarmas

**❌ Pendiente, no iniciado.** Tres piezas separadas, cada una necesita
una decisión tuya antes de poder construirse:

- **Restauración a un punto en el tiempo (PITR) en Neon**: confirmar
  que está activo en el plan actual y a cuántos días de retención llega.
- **Respaldo semanal de la base a Google Drive**: necesita un script
  (`pg_dump`) + algo que lo dispare una vez por semana (GitHub Action
  con cron, por ejemplo) + credenciales de una cuenta de Drive para
  subir el archivo.
- **Monitoreo de errores en producción con aviso a tu email**: hoy no
  existe nada de esto. Opciones típicas: Sentry (gratis hasta cierto
  volumen) o las alertas nativas de Vercel (más simples, menos
  detalladas).

## 5. Métrica de distribución (Recibo de Decisión, ADR-004)

**❌ Pendiente, no iniciado.** Necesito leer el ADR-004 real (mencionaste
que está en tu Drive, carpeta `99_RAW`) antes de tocar cualquier
esquema — hoy esta sesión no tiene ese documento ni acceso a tu Drive.

Una vez que lo tenga, a grandes rasgos esto implica: un nuevo estado por
tarjeta compartida con 4 valores (visto, invitado, registrado, activo),
lógica que lo actualice en cada paso real del flujo (no a mano), y un
panel nuevo en la Oficina de MasterN0 con el % de conversión — "de cada
100 tarjetas compartidas, cuántas llegan a miembro activo".

---

**Cómo usar esta lista**: antes de anunciar LyCard a un cliente real (no
interno de Legacy), los 5 puntos de arriba deberían estar en ✅. Hasta
entonces, seguimos en fase de diseño, con el flujo simple de siempre —
esta lista solo evita que se nos olvide algo cuando llegue el momento.
