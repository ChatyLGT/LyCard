// Semantic versioning (MAJOR.MINOR.PATCH, semver.org) for LyCard —
// shown on every card next to the idioma/tema/personalizar icons.
// Convención desde 2026-09-16: cada cambio que se shippea bumpea este
// número a mano junto con el código — MAJOR para cambios que rompen
// compatibilidad, MINOR para funcionalidad nueva, PATCH para fixes —
// y agrega una entrada corta a CHANGELOG, la bitácora visual que se ve
// al tocar la islita de versión en la tarjeta.
export const APP_VERSION = "1.25.0";

export type ChangelogEntry = { version: string; date: string; notes: string };

export const CHANGELOG: ChangelogEntry[] = [
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
