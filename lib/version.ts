// Semantic versioning (MAJOR.MINOR.PATCH, semver.org) for LyCard —
// shown on every card next to the idioma/tema/personalizar icons.
// Convención desde 2026-09-16: cada cambio que se shippea bumpea este
// número a mano junto con el código — MAJOR para cambios que rompen
// compatibilidad, MINOR para funcionalidad nueva, PATCH para fixes —
// y agrega una entrada corta a CHANGELOG, la bitácora visual que se ve
// al tocar la islita de versión en la tarjeta.
export const APP_VERSION = "1.57.2";

export type ChangelogEntry = { version: string; date: string; notes: string };

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: "1.57.2",
    date: "2026-09-24",
    notes:
      "Cada WowApp en Explorar y en su detalle ahora muestra un rating con estrellas y cantidad de reseñas -- marcado siempre \"(simulado)\", igual que el resto de la app nunca finge algo que todavía no existe de verdad.",
  },
  {
    version: "1.57.1",
    date: "2026-09-24",
    notes:
      "4 correcciones reales a WowStore: ahora todas sus pantallas tienen un \"← Volver a tu tarjeta\" (antes quedabas atrapado adentro); la sección de tu Oficina pasa a llamarse \"WowStore\" en vez de dos títulos distintos; las herramientas reales de tu equipo (Brief, Notas de Voz, Agenda, Mensajes, Malla, Modo Foco, etc.) ahora aparecen en \"Mis WowApps\"; y las tarjetas de cada WowApp en Explorar y su detalle se ven con más peso — precio destacado, insignia de \"Instalación inmediata\".",
  },
  {
    version: "1.57.0",
    date: "2026-09-24",
    notes:
      "WowStore se pone las pilas: elegís tu rubro y tu dolor tocando chips en vez de 2 menús desplegables, y cada chip de rubro muestra cuántas WowApps hay de verdad disponibles para él. Sumamos 2 pestañas nuevas -- \"Mis WowApps\" (todo lo que ya instalaste en esa tarjeta) y \"Solicitudes\" (el estado real de cada adaptación que pediste) -- y el detalle de cada WowApp ahora muestra las 2 formas de tenerla (Instalación Express / Adaptación a medida) como 2 opciones del mismo peso, más fáciles de comparar.",
  },
  {
    version: "1.56.2",
    date: "2026-09-24",
    notes:
      "Fix real: entrar a WowStore como N0/MasterN0 (logueado por /admin, sin sesión de Member) rebotaba a la pantalla de login aunque ya estuvieras adentro. Las 3 pantallas de WowApps -- \"Explorar\", detalle de cada app y \"pedir adaptación a medida\" -- ya funcionan con tu login de siempre.",
  },
  {
    version: "1.56.1",
    date: "2026-09-24",
    notes:
      "Fix: la entrada a WowStore (\"+ WowStore\" en la sección WowApps de tu Oficina Virtual) faltaba en tu tarjeta Legacy — solo se veía en las de Empresa y Personal. Ahora está en las 3, así que podés instalar y ver tus WowApps desde cualquiera de tus tarjetas.",
  },
  {
    version: "1.56.0",
    date: "2026-09-24",
    notes:
      "Nueva Mensajería Interna: si sos N0 de un Programa, ahora podés mandarle un mensaje a todo tu equipo de una — elegís el texto y por qué canales sale (LyCard, Email real; Telegram y WhatsApp quedan simulados hasta que tengamos esas integraciones de verdad). Cualquier otro miembro puede mandarle un directo 1:1 a alguien de su mismo equipo, y todos ven su propia bandeja con \"marcar como leído\" desde su cuenta.",
  },
  {
    version: "1.55.0",
    date: "2026-09-24",
    notes:
      "Nueva WowApp: WowAwe, la caminata de asombro semanal — salí 15 minutos, sacate una selfie al arrancar, otra a mitad de camino y otra al volver, y (si querés) grabale una nota a tu Legacy Card contando qué viste. La nota queda transcrita de verdad. Tu Índice de Asombro es un número orientativo para ver la tendencia semana a semana — no es una medición clínica real, y nunca decimos que lo sea.",
  },
  {
    version: "1.54.0",
    date: "2026-09-24",
    notes:
      "El acceso a WowStore ahora vive adentro de tu propia Oficina Virtual, no escondido en el editor: si tu tarjeta es de Empresa o Personal, la sección \"WowApps\" te muestra las que ya instalaste y un tile \"+ WowStore\" para buscar más, todo en el mismo lugar. De paso, \"Superpoderes\" pasa a llamarse \"WowApps\" en toda la app — un solo nombre para todo lo que abrís en tu Oficina.",
  },
  {
    version: "1.53.1",
    date: "2026-09-24",
    notes:
      "WowStore ya no arranca vacía: un botón nuevo en el panel de MasterN0 (\"Sembrar catálogo de ejemplo\") carga 6 WowApps de ejemplo reales — atención por WhatsApp, reservas automáticas, sitio de ventas, redes sociales, QR dinámico y notas de voz — para que el catálogo se vea poblado desde el primer día.",
  },
  {
    version: "1.53.0",
    date: "2026-09-24",
    notes:
      "Nace WowStore: un catálogo de WowApps pensado para cualquier negocio chico (restaurante, comercio, despacho, emprendedor) — elegís tu rubro y tu problema del día y te mostramos hasta 3 apps hechas para eso, no un catálogo entero. Instalación directa o, si querés que quede exacta para tu negocio, pedís una adaptación a medida y te contactamos. Lo que instalás aparece de verdad en la Oficina Virtual de tu tarjeta de Empresa o Personal.",
  },
  {
    version: "1.52.0",
    date: "2026-09-24",
    notes:
      "Cuando alguien que ya paga su membresía recluta a una persona real y esa persona activa su propia Oficina Virtual, la del reclutador se convierte sola en su propio Programa — sin que nadie lo apruebe como paso aparte. Administra su Programa nuevo con la misma cuenta de siempre (WhatsApp/Google), nunca un login separado. Su tarjeta de origen queda intacta, marcada como \"Programa Legado\".",
  },
  {
    version: "1.51.0",
    date: "2026-09-24",
    notes:
      "Modo Foco: ahora elegís el estilo de música dentro de cada modo — Foco profundo tiene House/Techno/Minimal, Creativo tiene Lounge/Downtempo, Relajación tiene Lounge/Chill House. Cada variante respeta el propósito del modo (Foco siempre tiene kick real, Sueño nunca tiene ninguna variante — sigue sin ritmo, a propósito). Se elige en el selector antes de arrancar la sesión.",
  },
  {
    version: "1.50.0",
    date: "2026-09-23",
    notes:
      "3 módulos más en \"Ajustar tamaños\": Mi camino, Agendar entrevista y el Logo (antes solo Foto/QR/Cubos/Íconos). Y en Modo Foco, dos cosas: un mezclador para subir/bajar el volumen de la Onda (pulso+ruido) y la Música (kick/bajo/hats) por separado, y las frecuencias del kick/bajo subidas una octava — en el parlante chico de un celular, las de antes casi no se escuchaban.",
  },
  {
    version: "1.49.3",
    date: "2026-09-23",
    notes:
      "Fix real de Modo Foco: en algunos navegadores mobile (Safari/iOS sobre todo) el audio podía quedar completamente mudo — el AudioContext se creaba \"suspendido\" y nada avisaba del problema. Ahora se destraba explícitamente al arrancar la sesión. Si seguís sin escuchar nada, revisá que el celular no esté en modo silencio (el switch físico de iPhone corta el audio web igual que el de cualquier app).",
  },
  {
    version: "1.49.2",
    date: "2026-09-23",
    notes:
      "Panel de \"Ajustar tamaños\" traslúcido: ahora se ve tu tarjeta real (foto, botón QR, cubos) cambiando de tamaño A TRAVÉS del panel mientras movés los sliders, no solo alrededor de él. Además, cada slider quedó 1 a 1 con el % que muestra al lado (antes saltaba de a 5%, se sentía menos preciso).",
  },
  {
    version: "1.49.1",
    date: "2026-09-23",
    notes:
      "Modo Foco suma música de verdad: Foco profundo (house minimal), Creativo y Relajación (lounge) ahora tienen kick, bajo, hats y acordes cortos generados en vivo debajo del pulso de siempre — ya no es solo tono + ruido. Sueño se queda sin ritmo a propósito, como cualquier pista pensada para dormir. Sigue siendo 100% sintetizado en tu navegador, cero pistas externas, cero streaming de terceros.",
  },
  {
    version: "1.49.0",
    date: "2026-09-23",
    notes:
      "El registro Freemium ya no necesita que nadie lo apruebe: hasta hoy, tocar \"Creá tu LyCard\" desde cualquier tarjeta ajena creaba tu cuenta pero te dejaba sin tus 3 tarjetas hasta que un admin marcara a mano una entrevista que nunca existió — un bache real. Ahora, al verificar tu WhatsApp (o entrar con Google), quedás con tus 3 tarjetas ya creadas al toque, y si veniste desde el link de alguien, queda guardado quién te trajo. Entrevistarte con un N0 sigue existiendo para escalar de Freemium a un nivel pago, pero ya no es el único camino para tener tu LyCard.",
  },
  {
    version: "1.48.0",
    date: "2026-09-23",
    notes:
      "Nuevo: tamaños ajustables en tu propia LyCard. Mantené presionada la tarjeta (sin soltar) y aparece un panel con 4 sliders — Foto, Botón QR, Cubos laterales, Íconos sociales — que cambian tu tarjeta real EN VIVO, atrás del panel, mientras los movés. Guardá cuando te guste el resultado, o cancelá y queda todo como estaba. Por tarjeta, no por Programa: cada quien ajusta la suya.",
  },
  {
    version: "1.47.0",
    date: "2026-09-23",
    notes:
      "Cupo real de entrevistas: cada Programa ya puede cargar sus propios horarios (fecha, hora y cupo) desde su dashboard, en vez de los 4 fijos de ejemplo. Cuando un horario se llena, deja de ofrecerse — ya no se puede anotar más gente de la que entra. Un Programa que todavía no cargó los suyos sigue viendo los 4 de siempre, nada cambia para nadie hasta que el N0 los configure.",
  },
  {
    version: "1.46.1",
    date: "2026-09-23",
    notes:
      "3 fixes de la auditoría técnica del día: \"Agendar tu Entrevista\" ya no ofrece horarios que ya pasaron (un bug real -- un slot vencido seguía siendo reservable), valida el formato del email cuando das uno, y ya no crea una reserva duplicada si volvés a agendar con el mismo WhatsApp (actualiza la que ya tenías). Además, el contador de Superpoderes en el dashboard de cada Programa ya no dice un número fijo desactualizado.",
  },
  {
    version: "1.46.0",
    date: "2026-09-23",
    notes:
      "Nuevo Superpoder \"Modo Foco\": audio funcional generado en vivo en tu propio navegador — un pulso de volumen, ruido de fondo y un pad sostenido, en 4 modos (Foco profundo, Creativo, Relajación, Sueño). Nada de pistas externas ni de licencias que curar: todo se sintetiza al vuelo. Al terminar la sesión, grabás una reflexión corta que queda guardada como una Nota de Voz más de esa tarjeta. Honesto a propósito: el copy no promete \"sincronizar tus neuronas\", solo lo que de verdad se puede sostener — un ambiente sonoro constante, sin distracciones.",
  },
  {
    version: "1.45.0",
    date: "2026-09-23",
    notes:
      "Nuevo \"Embudo de Conversión\" en el dashboard de cada Programa: cuánta gente recibió el QR de una tarjeta, cuántos se registraron, fueron entrevistados, activaron su Oficina Virtual y — marcado a mano por ahora, todavía no hay pasarela de pago real — cuántos pagaron su membresía. Une 3 cosas que ya existían sueltas (Seguimiento por tarjeta, inscripciones a entrevistas, y el estado de cada miembro) en una sola vista con el embudo y el % de conversión de cada paso.",
  },
  {
    version: "1.44.0",
    date: "2026-09-23",
    notes:
      "Nuevo: NashMesh, el simulador de reparto (Payment = φ × ψ × (1-ε)). Desde cualquier cruce real de Janus, un click arma la simulación con los dos participantes ya cargados — sumás el valor total, quién más participó, y ves cómo se repartiría. 100% simulación, cero movimiento de dinero real.",
  },
  {
    version: "1.43.0",
    date: "2026-09-23",
    notes:
      "Nuevo: Janus, el motor de emparejamiento \"todos contra todos\". Cualquier tarjeta puede marcar Ofrezco/Busco con texto libre — desde una certificación real hasta un sandwich de miga — y ahora se cruza con el resto de la red para encontrar coincidencias reales. Los tags se ven en tu Oficina; los cruces se ven en el panel de MasterN0.",
  },
  {
    version: "1.42.0",
    date: "2026-09-23",
    notes:
      "Bot Warren: tu Gemelo Digital deja de repetir el mismo guión fijo para todos. Ahora le pedís algo de verdad — que te ayude a vender, te arme una app a medida, te analice una oportunidad, te publique en redes, te facture o te dé un pronóstico — y responde con tus propios datos (tu nombre, tu Programa, tu cita, tus Superpoderes activos, tus KPIs si ya cargaste los tuyos). Sigue siendo 100% simulado y honesto sobre serlo.",
  },
  {
    version: "1.41.0",
    date: "2026-09-23",
    notes:
      "Reorden de tu Oficina: Keep in Flow, Tu Gemelo Digital, Check de Realidad, Seguimiento, Superpoderes, Noticias y la Malla al final. Se sacaron dos secciones que duplicaban info: el Calendario suelto (ya está adentro del Superpoder Agenda) y una fila de KPIs vieja que mezclaba tu badge con el conteo de Portafolio.",
  },
  {
    version: "1.40.1",
    date: "2026-09-23",
    notes:
      "Fix: tu propia Malla (MasterN0, tarjeta Legacy) ahora muestra el organismo completo de verdad — antes no veías nada real ahí porque Legacy no tiene un Programa propio (es el N0 de todos, no \"un equipo más\"), así que ni la vista de equipo ni la del organismo te aplicaban.",
  },
  {
    version: "1.40.0",
    date: "2026-09-22",
    notes:
      "La Malla ya no es un dibujo de ejemplo — cada punto es real. Tocá cualquier nodo y te dice quién es de verdad (Legacy, cada Programa, cada miembro con su estado). Tocá un Programa y \"entrás\" a ver su propia red por dentro — el mismo mecanismo se repite, nivel por nivel. Tu Oficina también suma \"Malla viva · tu equipo real\" con la gente real de tu Programa.",
  },
  {
    version: "1.39.0",
    date: "2026-09-22",
    notes:
      "Nuevo /admin/demo-data (solo MasterN0): generá N Programas de prueba de un saque (cada uno con su Legacy, Business y Personal) para probar la plataforma llena sin crear todo a mano — y borrá todo lo demo con un solo botón cuando termines, sin tocar nunca tu roster real. Todo lo demo se ve marcado con una etiqueta DEMO en el roster y en Programas para que nunca se confunda con datos reales.",
  },
  {
    version: "1.38.0",
    date: "2026-09-22",
    notes:
      "Cierra la Oficina Virtual ampliada: al final, Noticias (novedades cortas) y Calendario (tus próximos eventos/tareas, siempre en orden de fecha, no como los fuiste cargando). Igual que Keep in Flow y Check de Realidad: privado, inventado por vos, editable desde tu editor.",
  },
  {
    version: "1.37.0",
    date: "2026-09-22",
    notes:
      "Ahora sí se ve: tu Oficina Virtual arranca con \"Keep in Flow\" (tu objetivo del día + una frase motivacional que rota sola, con un banner animado) y \"Check de Realidad\" (tus KPIs del día, cada uno con su propio gráfico de tendencia). Todo lo que cargaste en el editor desde la versión anterior. Privado — solo lo ves vos, nunca un visitante.",
  },
  {
    version: "1.36.0",
    date: "2026-09-22",
    notes:
      "Empieza a armarse el contenido de tu Oficina Virtual (Fase E2, todavía no se ve en la tarjeta pública — eso es el próximo paso). En el editor de cada tarjeta (Legacy, Business, Personal) hay 4 secciones nuevas: tu objetivo del día (\"Keep in Flow\"), tus KPIs (\"Check de Realidad\", con un botón para que se llenen solos de ejemplo y los ajustás), noticias cortas, y calendario — todo inventado por vos, editable, por tarjeta. Y en el dashboard de cada Programa, un pool de frases motivacionales a mano tuya que van a rotar solas, una por día.",
  },
  {
    version: "1.35.1",
    date: "2026-09-22",
    notes:
      "Nada visible tampoco — esta cierra lo que dejó a medio armar la anterior. Los tests de la Fase E1 de Oficina Virtual (tu objetivo del día, KPIs, noticias, calendario) ya tienen su cobertura real. En el camino, correr el pipeline de verdad por primera vez encontró que el lint venía roto desde antes (comillas sin escapar en varias pantallas, un bug real de re-render en \"Seguimiento\") — nadie lo había notado porque nunca se había corrido como bloqueo antes de hoy. Todo corregido.",
  },
  {
    version: "1.35.0",
    date: "2026-09-22",
    notes:
      "Nada visible en la tarjeta — esta es para adentro. Se armó el primer piso de testeo automático del proyecto: tests que corren solos en cada Pull Request y bloquean el merge si algo se rompe (lint, tests unitarios con 100% de cobertura en el código ya cubierto, y 4 pruebas E2E contra un server real). El primer blanco: la regla de \"un N0 de un Programa nunca ve el de otro\" — estaba repetida a mano en 12 lugares distintos del código (riesgo real de fuga entre Programas por un typo), ahora es una sola función, tested y reusada en los 12.",
  },
  {
    version: "1.34.0",
    date: "2026-09-23",
    notes:
      "Nueva sección \"Seguimiento\" en tu Oficina Virtual: quién recibió o interactuó con ESA tarjeta puntual (invitación por mail, QR por WhatsApp, mensaje de contacto, agendó entrevista) y en qué etapa quedó — se llena sola desde esos 4 puntos reales, vos podés mover el estado, dejar notas, o agregar a mano a alguien que conociste offline. Estrictamente por tarjeta, nunca mezclado entre tus 3.",
  },
  {
    version: "1.33.0",
    date: "2026-09-23",
    notes:
      "Notas de Voz: ya se puede eliminar una nota (ícono de basura en el detalle, con confirmación) — y se vació la base para arrancar limpio tras la nota de prueba que dio error. El error de transcripción ahora se ve de verdad (antes se perdía en silencio) y, si el resumen automático no está disponible para español, la transcripción real igual se guarda en vez de perderse. Superpoderes: el selector \"APP / Qué es esto\" se reemplaza por un ícono (i) que abre la explicación en una burbuja flotante encima de la app real, en vez de taparla.",
  },
  {
    version: "1.32.1",
    date: "2026-09-23",
    notes:
      "Ajustes tras probar en producción el rediseño anterior. Brief: la hora ya no se sale del círculo (formato 24hrs en vez de AM/PM) — mismo fix en Agenda y Notas de Voz. Notas de Voz: grabar/escuchar ya funcionaba, pero al salir y volver a entrar una nota grabada podía verse como si hubiera desaparecido — no se perdía, la Oficina no la volvía a pedir; ahora siempre trae el estado real. La transcripción quedó fija en español (antes a veces detectaba mal el idioma). Y la pantalla cambia de raíz: entra directo a un botón grande de Grabar, con \"Ver notas guardadas\" como acceso aparte al calendario de antes.",
  },
  {
    version: "1.32.0",
    date: "2026-09-22",
    notes:
      "Rediseño de calendario para Brief, Notas de Voz y Agenda: calendario mensual con puntos por día → lista del día → popup con el detalle. Agenda ahora lee tu Google Calendar/Tasks de verdad (antes solo mostraba un cache local simulado). Fix real: Notas de Voz no reproducía el audio grabado (el archivo se guardaba con el formato equivocado) y a veces una nota se perdía sin avisar — los dos quedaron resueltos.",
  },
  {
    version: "1.31.0",
    date: "2026-09-22",
    notes:
      "Nuevo panel interno /admin/equipo (Módulo HR + PM, solo MasterN0): headcount del Escalón Fractal N0-N12 (quién es Agente Legacy, Silicio o Carbono-referencia), proyectos con avance/nivel ψ/bloqueos, y tareas corrientes filtrables por escalón y tipo de nodo.",
  },
  {
    version: "1.30.1",
    date: "2026-09-22",
    notes:
      "Fix: en Notas de Voz no se podía escuchar ni leer la transcripción de una nota ya grabada — el audio se guardaba bien pero la Oficina nunca lo mostraba. Ahora cada nota tiene su reproductor de audio y, cuando ya está lista, un botón para ver la transcripción completa (antes solo se veía el resumen corto).",
  },
  {
    version: "1.30.0",
    date: "2026-09-19",
    notes:
      "El favicon/nombre por defecto de TODA la app (admin, login, cualquier tarjeta sin su propio Programa) ahora es el logo real de Legacy — no solo el de sus propias tarjetas. Si un Negocio se vuelve su propio Programa, el suyo pisa este default solo en sus tarjetas, no al revés. Fix: /m/login estaba cacheada como estática y no se actualizaba con nada de esto.",
  },
  {
    version: "1.29.0",
    date: "2026-09-19",
    notes:
      "Nueva bitácora de login de Admin (MasterN0 → Mi cuenta → \"Ver bitácora de login\"): cada intento de entrar al panel, con password o con Google, éxito o falla, queda registrado — quién, cómo, y si falló, por qué.",
  },
  {
    version: "1.28.0",
    date: "2026-09-19",
    notes:
      "Privacidad entre tus 3 tarjetas: antes, mandar cualquiera de tus 3 links dejaba ver las otras 2 igual. Ahora cada tarjeta se ve SOLA por default — vos elegís, tarjeta por tarjeta, cuáles de las otras 2 sumar cuando la compartís (nuevo campo en cada editor). Vos mismo, mirando tus propias tarjetas, seguís viendo las 3 juntas como siempre.",
  },
  {
    version: "1.27.0",
    date: "2026-09-19",
    notes:
      "Cada Programa ya puede poner su propio nombre de app y favicon en las tarjetas de sus miembros (editable en el dashboard del Programa) — reemplaza \"LyCard\" y el ícono genérico por, por ejemplo, \"Legacy Card\" con el logo real. Se sacó además el triángulo feo que quedaba pisando el favicon.",
  },
  {
    version: "1.26.0",
    date: "2026-09-19",
    notes:
      "El panel de Admin (/admin/login) ya tiene \"Continuar con Google\" — un método de login alternativo, más seguro, para una cuenta de Admin que ya existe. No crea cuentas nuevas: si tu Google no coincide con un Admin ya dado de alta a mano, no entra.",
  },
  {
    version: "1.25.2",
    date: "2026-09-19",
    notes:
      "El modal de bitácora de versiones (el que se abre tocando la islita de versión) baja un 50% de alto — la explicación de qué significa cada número queda fija arriba, y la lista de versiones anteriores scrollea sola debajo, en vez de arrastrar todo el modal hacia abajo.",
  },
  {
    version: "1.25.1",
    date: "2026-09-19",
    notes:
      "Fix: el ícono de \"Personalizar\" (arriba a la izquierda) para alguien sin relación con esa tarjeta (NA) siempre terminaba mandándolo a la pantalla de login del Admin de todos modos — ahora, para esa persona, el ícono ya se ve como lo que es: un botón de Iniciar sesión.",
  },
  {
    version: "1.25.0",
    date: "2026-09-19",
    notes:
      "Nuevo botón \"Conectar Google\" en el Superpoder Agenda: si lo activás, cada Nota de Voz lista crea de verdad una Tarea y un evento en tu Google Calendar/Tasks, y deja el resumen guardado en una carpeta propia de tu Drive (el aterrizaje #Dirac). Sin conectarlo, la Agenda se sigue llenando igual pero marcada \"Simulado\" — nunca se rompe, nunca inventa que ya está conectado.",
  },
  {
    version: "1.24.0",
    date: "2026-09-19",
    notes:
      "Nuevo Superpoder \"Notas de Voz\": grabá desde tu Oficina con el micrófono del celular, la nota se guarda de verdad. La transcripción y el resumen automático están armados y listos, pero necesitan que activemos la cuenta del servicio que transcribe — hasta entonces, cada nota queda guardada mostrando \"esperando transcripción\", nunca inventa un resumen falso.",
  },
  {
    version: "1.23.0",
    date: "2026-09-19",
    notes:
      "Fase E1 (de 5): la base de datos de tu Oficina Virtual ya tiene lugar para tu objetivo del día (\"Keep in Flow\"), tus KPIs (\"Check de Realidad\"), noticias y calendario — todavía no se ve nada nuevo en pantalla, eso llega en las próximas versiones.",
  },
  {
    version: "1.22.1",
    date: "2026-09-19",
    notes:
      "Fix: los íconos (Material Symbols) dependían de que cargara una fuente externa de Google en cada visita — si esa red fallaba (celular sin señal, wifi restrictivo, modo offline de la PWA), se veían como texto crudo tipo \"diamond\" o \"mail\" pisando el resto de la pantalla. Ahora la fuente vive adentro de LyCard, no depende de internet.",
  },
  {
    version: "1.22.0",
    date: "2026-09-19",
    notes:
      "El Brief de reuniones ya no se corta en los últimos 30 días ni en 5 — trae todo el historial real de tu cuenta de Fathom (paginando de verdad) y te avisa cuántas hay en total, aunque en el modal solo se muestren las últimas 25 para que no sea una lista eterna en el celular.",
  },
  {
    version: "1.21.1",
    date: "2026-09-19",
    notes:
      "Fix: en tu Oficina, arriba quedaba tapado por la isla dinámica / notch del celular y no se podía tocar nada. Fix: \"Editar Oficina\" te mandaba a la pantalla de alta de miembro (poné tu WhatsApp) sin salida si entrabas como Admin — ahora va directo al editor real de Superpoderes de tu Programa.",
  },
  {
    version: "1.21.0",
    date: "2026-09-18",
    notes:
      "El botón de \"Tu Gemelo Digital\" en tu Oficina ya no está apagado — ahora te muestra una demo guiada (chat tipo WhatsApp) de cómo se arma tu Oficina Virtual. Todavía no es el Gemelo Digital operativo real, eso sigue sin backend.",
  },
  {
    version: "1.20.0",
    date: "2026-09-18",
    notes:
      "Los accesos directos de tu Oficina pasan a ser \"Superpoderes\" de verdad: cada uno con su propio ícono (subible desde el dashboard del Programa), color y explicación. Tocalo y se abre una tarjeta con dos caras: la app real de un lado (por ahora, tu Brief de reuniones de Fathom) y qué es del otro — un visitante solo ve la explicación, nunca tus datos.",
  },
  {
    version: "1.19.0",
    date: "2026-09-18",
    notes:
      "Reordenamos tu Oficina Virtual: el saludo pasa a ser lo primero, con \"volver\"/\"editar\" como dos íconos a su altura en vez de una barra separada arriba. Se sacó el mensaje de \"Fundador de la Red\". Y la Malla de tu equipo ya no se desarma cuando alejás la cámara.",
  },
  {
    version: "1.18.0",
    date: "2026-09-18",
    notes:
      "LyCard ya se puede instalar como app real desde el celular (\"Agregar a pantalla de inicio\") y guarda en caché tu tarjeta pública para que abra aunque te quedes sin señal. El resto de las pantallas (admin, dashboard) sigue necesitando conexión, a propósito — son pantallas con tu sesión adentro.",
  },
  {
    version: "1.17.0",
    date: "2026-09-18",
    notes:
      "Primer \"superpoder\" real en tu Oficina Virtual: Brief de reuniones conectado a Fathom — tus últimas reuniones grabadas, con resumen corto y link directo a cada una. Sin conectar tu cuenta, se ve un aviso de \"próximamente\" en vez de romperse.",
  },
  {
    version: "1.16.0",
    date: "2026-09-17",
    notes:
      "La foto baja un 15% para que el panel de abajo respire, los puntitos del carrusel ya no pisan el botón de Agendar, y 3 badges cambian de tamaño (Cargo +15%, Mi camino -20%, Agenda -30%). El modal de versión ahora explica cada punto del historial (hasta 10 atrás, letra más chica). El CV deja el visor de PDF crudo — se ve como imagen, en el mismo modal que todo lo demás, nunca se sale de pantalla.",
  },
  {
    version: "1.15.0",
    date: "2026-09-17",
    notes:
      "Fix: el botón de Tema (día/noche) se ocultaba en vez de arreglarse en tarjetas de Programa con un skin activo — un skin es una identidad de marca fija, no tenía un claro/oscuro que mostrar, así que quedaba ahí sin hacer nada. Además: Email y Ubicación nuevos en Canales de Contacto, \"Agregar N0\" y menús de select con mejor comportamiento, \"Identidad Fiduciaria\" pasa a llamarse \"Identidad\".",
  },
  {
    version: "1.14.0",
    date: "2026-09-16",
    notes:
      "Rediseño en acordeón de las pantallas de personalización (dashboard de Programa y editor de tarjeta): cada categoría se colapsa en un menú que se abre al tocarlo, en vez de mostrar todo junto. Puestos, niveles de Medallón/Sabiduría/Contactos, Miembros e ítems de Oficina Virtual pasan a listas de \"tocá para editar\" con su propio \"+ Agregar\" — más ordenado y manejable.",
  },
  {
    version: "1.13.0",
    date: "2026-09-16",
    notes:
      "El punto de \"gente contactada\" junto al nombre ya no está simulado — ahora es un nivel real, editable como el de Medallón. Y en las 4 islitas (O.D., Ancient, Medallón, Contactados) el ícono que se ve pasa a ser el mismo que elijas en el dashboard: la de O.D. ya no es un diamante fijo, la de Ancient ya no es un sol fijo — cada Programa puede poner el suyo desde \"Escala de...\" en su dashboard.",
  },
  {
    version: "1.12.0",
    date: "2026-09-16",
    notes:
      "El listado de tarjetas de /admin deja de ser una sola lista mezclada — ahora se agrupa por Programa, cada uno colapsable, con la cantidad de tarjetas y acceso directo a su dashboard. Primer paso del Dashboard 2.0.",
  },
  {
    version: "1.11.1",
    date: "2026-09-16",
    notes:
      "La etiqueta del Cargo/Título debajo del nombre baja un 30% de tamaño y queda con ancho fijo centrado — el texto que no entra se recorta en vez de estirar la tarjeta.",
  },
  {
    version: "1.11.0",
    date: "2026-09-16",
    notes:
      "El skin de marca activo de un Programa ahora se aplica de verdad a sus tarjetas: fondo, acentos, botones y hasta la fuente cambian según el design.md que subiste. Sin skin activo, la tarjeta queda exactamente como siempre.",
  },
  {
    version: "1.10.0",
    date: "2026-09-16",
    notes:
      "Nuevo sistema de Skins de Marca para cada Programa: subís un archivo design.md (por ejemplo, el que te da Google Stitch) y se leen de verdad sus colores, fuente y estilo de botón. Hasta 3 guardados por Programa, uno encendido a la vez. Todavía no cambia la tarjeta — eso llega en el próximo paso.",
  },
  {
    version: "1.9.1",
    date: "2026-09-16",
    notes:
      "Fix: subir una foto o brandbook real (más de 1MB) hacía fallar el guardado en silencio en varias pantallas de carga de imagen. Subido el límite a 10MB.",
  },
  {
    version: "1.9.0",
    date: "2026-09-16",
    notes:
      "Debajo del nombre aparece tu Cargo / Título Profesional — tocalo y se abre tu CV en pantalla completa (por ahora un demo, hasta que cada quien suba el suyo). Al lado del nombre suman dos puntitos: a la derecha tu Nivel de Medallón, a la izquierda cuánta gente contactaste — el badge viejo de medalla con texto se saca de la fila de abajo, ahora vive ahí.",
  },
  {
    version: "1.8.0",
    date: "2026-09-16",
    notes:
      "Nuevo campo \"Diseño Corporativo\" en cada Programa: subís la imagen con las pautas de marca y te mostramos la paleta de colores real (leída de la imagen) más una fuente y estilo de botón sugeridos — el modelo real llega después, por ahora es una simulación honesta.",
  },
  {
    version: "1.7.0",
    date: "2026-09-16",
    notes:
      "Nueva pantalla \"Mi Red de Clientes\" para dueños de Business: ver quién agendó una reunión y marcarla como hecha — eso activa su lugar en tu red y su N1 empieza a mostrarse.",
  },
  {
    version: "1.6.0",
    date: "2026-09-16",
    notes:
      "El círculo de arriba ya no es solo para vos: ahora muestra tu propio nivel en el fractal de esa tarjeta (N0, N1...) o NA si no tenés relación con ella — y nunca desaparece. Las Empresas suman su propia red de clientes, independiente de Legacy.",
  },
  {
    version: "1.5.0",
    date: "2026-09-16",
    notes:
      "El QR cambia según quién mira: si es tu propia tarjeta, tocalo para mandarte el QR por WhatsApp; si es de otro, en su lugar aparece \"Creá tu LyCard\" — ahora en las 3 tarjetas, no solo en Legacy.",
  },
  {
    version: "1.4.0",
    date: "2026-09-16",
    notes:
      "El botón de Oficina Virtual ahora muestra tu logo real — el del Programa en Legacy, el de tu negocio en Business — en vez del emblema decorativo fijo. Sin logo cargado, se ve como siempre.",
  },
  {
    version: "1.3.0",
    date: "2026-09-16",
    notes:
      "\"Mi camino\" y el botón de agenda ya están en las 3 tarjetas, no solo en Legacy — Business y Personal suman su propia historia editable y su propio agendamiento (café, en el caso de Personal).",
  },
  {
    version: "1.2.2",
    date: "2026-09-16",
    notes:
      "Los puntitos que marcan en qué tarjeta estás (Legacy/Business/Personal) bajan del todo, debajo del botón principal — en vez de convivir con las islitas de arriba.",
  },
  {
    version: "1.2.1",
    date: "2026-09-16",
    notes:
      "Los íconos de arriba (personalizar, idioma, tema) ahora quedan centrados con el espacio entre las dos islitas, en vez de solo pegados arriba.",
  },
  {
    version: "1.2.0",
    date: "2026-09-16",
    notes:
      "Nueva forma de crear las tarjetas de Business y Personal desde el editor, sin pasar por el WhatsApp simulado. La islita de arriba ahora también muestra el nombre de cada tarjeta — tocala para ver para qué sirve.",
  },
  {
    version: "1.1.0",
    date: "2026-09-16",
    notes:
      "La tarjeta marcada como Origen ya no necesita que estés logueado para mostrarse en modo host a cualquiera que la abra.",
  },
  {
    version: "1.0.0",
    date: "2026-09-16",
    notes: "Arranca el versionado visual — cada tarjeta muestra su versión arriba, junto a los íconos de idioma y tema.",
  },
];
