// Semantic versioning (MAJOR.MINOR.PATCH, semver.org) for LyCard —
// shown on every card next to the idioma/tema/personalizar icons.
// Convención desde 2026-09-16: cada cambio que se shippea bumpea este
// número a mano junto con el código — MAJOR para cambios que rompen
// compatibilidad, MINOR para funcionalidad nueva, PATCH para fixes —
// y agrega una entrada corta a CHANGELOG, la bitácora visual que se ve
// al tocar la islita de versión en la tarjeta.
export const APP_VERSION = "1.39.0";

export type ChangelogEntry = { version: string; date: string; notes: string };

export const CHANGELOG: ChangelogEntry[] = [
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
