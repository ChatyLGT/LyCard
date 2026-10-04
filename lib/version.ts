// Semantic versioning (MAJOR.MINOR.PATCH, semver.org) for LyCard —
// shown on every card next to the idioma/tema/personalizar icons.
// Convención desde 2026-09-16: cada cambio que se shippea bumpea este
// número a mano junto con el código — MAJOR para cambios que rompen
// compatibilidad, MINOR para funcionalidad nueva, PATCH para fixes —
// y agrega una entrada corta a CHANGELOG, la bitácora visual que se ve
// al tocar la islita de versión en la tarjeta.
export const APP_VERSION = "1.72.0";

export type ChangelogEntry = { version: string; date: string; notes: string };

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: "1.72.0",
    date: "2026-10-04",
    notes:
      "El botón \"Mi camino\" de la tarjeta Legacy (proyecto) deja de abrir su propio modal y abre el mismo modal rico de \"Info\" que ya existía (pedido de Gunnar: \"ese boton.. que ahora es el boton de mas informacion sobre legacy.. quiero que al picar ese boton salga el modal que sale ahora en el que dice Info.. el mismo\"). Company y personal siguen con su propio \"Mi camino con...\"/\"Mi Viaje\" de siempre, sin cambios -- esto es específico de Legacy.",
  },
  {
    version: "1.71.2",
    date: "2026-10-04",
    notes:
      "Tercer y último rename de Categorización, pedido de Gunnar mirando la tarjeta real: Medallón de Resultados -> Medalla Rango, Imán Badge -> Badge de Rangos, Escalera de Puestos -> Badge de Puestos, Badge de Valor -> Medalla KPIs. Además, la sección Categorización del dashboard ahora lista los 4 en el mismo orden en que se leen en la tarjeta (izquierda a derecha, arriba a abajo): Medalla KPIs, Medalla Rango, Badge de Puestos, Badge de Rangos -- antes el orden no coincidía con lo que se ve en vivo. Puro rename + reorden de UI, los campos internos (Card.medal/rank/contacts/puestoId, Program.medalScale/rankScale/contactsScale) no cambian.",
  },
  {
    version: "1.71.1",
    date: "2026-10-04",
    notes:
      "Dos correcciones de nombre en Categorización (pedido de Gunnar sobre lo que acababa de ver en la tarjeta real): \"Medallón de Imán\" -> Imán Badge (\"no es medallon.. es un Badged\"). Y \"Escala de Gente Contactada\" -> Badge de Valor: deja de medir \"gente contactada\" -- mide valor real creado (ventas cerradas, referidos convertidos, o en Legacy: gemelos digitales Legacy nacidos por recomendación del host). Mismo mecanismo manual que Medallón de Resultados e Imán Badge -- el N0 elige el nivel a mano, sin contador automático de referidos (confirmado con Gunnar antes de construir: eso sería una fase aparte, no esta).",
  },
  {
    version: "1.71.0",
    date: "2026-10-04",
    notes:
      "Categorización: los modales de la tarjeta (Puesto/O.D., Medallón de Resultados, Medallón de Imán, Contactos) ya no muestran 4 íconos de EJEMPLO fijos -- muestran el roster REAL que el N0 armó en /admin/programs, con nombre/subtítulo/descripción completos de cada nivel, y el N0 puede tocar cualquier otro nivel ahí mismo para reasignarlo (antes había que ir al dashboard). Rename de dos escalas por pedido de Gunnar: \"Escala de Medallón\" -> Medallón de Resultados, \"Escala de Sabiduría\" -> Medallón de Imán (mide atracción/conversión de red, no sabiduría). El dashboard de Programa ahora agrupa Puestos + las 3 escalas en una sola sección \"Categorización\" (antes 4 secciones sueltas con \"Horarios de Entrevista\" metido en el medio). El editor de cada escala suma: círculo de color + ícono juntos (antes era uno u otro según el tipo -- Sabiduría/Imán no tenía color en absoluto), tooltip con la descripción al pasar el mouse, y un importador de JSON que reemplaza toda la escala de una -- pegar el bloque que armaste con un LLM (clave/nombre/color/ícono/descripción, con o sin tildes) reemplaza tipear cada nivel a mano.",
  },
  {
    version: "1.70.0",
    date: "2026-10-04",
    notes:
      "Posicionador de fotos en el dashboard (pedido de Gunnar: \"en todos los servicios que utilizamos para subir fotos.. dame la oportunidad de mover, posicionar, disminuir, aumentar el tamaño.. ahorita puse una para el programa Legacy.. se ve cortada\"). Nuevo componente `PhotoPositioner`: al elegir un archivo se abre un editor con arrastre + zoom sobre el recorte real (antes el archivo se mandaba crudo y la tarjeta lo recortaba a ciegas con CSS); al confirmar, esa selección se compone en un PNG y ES ese archivo el que se sube -- sin tocar ningún server action ni el schema. Alcance de esta vuelta: Retrato de la Card, Logo de Empresa, Logo de Programa (las 3 fotos que se ven en vivo en la tarjeta/oficina). Suma un botón \"Reposicionar\" para ajustar una foto ya subida sin tener que volver a elegir el archivo.",
  },
  {
    version: "1.69.1",
    date: "2026-10-03",
    notes:
      "Detalle 6, cuarta vuelta (Gunnar: \"esta horrible.. el unico que hiciste es el de Order of Distintion.. quiero algo mas visual.. utiliza un formato como el del modal Info.. mostrame logos.. dame imagenes\") -- la v1.69.0 seguía explicando los íconos como texto dentro de un párrafo (\"diamond (fundador)...\"), nunca se veían de verdad. Ahora los 4 modales de insignias/distinciones (Puesto, Rango, Medallón, Contactos) usan el mismo formato visual que el modal Info: recuadro de título, una intro corta, y una grilla de tarjetitas con el ícono real renderizado (Material Symbols) + su nombre, en vez de nombres de ícono escritos como palabras. Se mantiene el mensaje de estado (configurado / sin configurar) debajo de la grilla.",
  },
  {
    version: "1.69.0",
    date: "2026-10-03",
    notes:
      "Detalle 6: reescritos los 4 modales de insignias/distinciones (los dos dots junto al nombre + los dos badges bajo el CV) para explicar de verdad qué son, cómo funcionan y con ejemplos de íconos reales -- antes solo decían \"esto es configurable por tu Programa\" en una frase corta; ahora cada uno explica el MECANISMO completo (el N0 arma una escala de 3 a N niveles desde /admin/programs, cada nivel con su propio nombre/ícono/color) y da 4-5 ejemplos concretos de íconos típicos de Material Symbols para ese tipo de distinción -- el Puesto (diamond, shield, handshake, groups, verified), el Rango (school, trending_up, workspace_premium, terrain, all_inclusive), el Medallón (military_tech, workspace_premium, verified, star, emoji_events) y el de Contactos (groups, forum, diversity_3, contacts). También se aclara por primera vez la diferencia entre Puesto (qué rol ocupás) y Rango (cuánta experiencia tenés) -- antes no quedaba claro que son dos ejes distintos.",
  },
  {
    version: "1.68.6",
    date: "2026-10-03",
    notes:
      "Detalle 5: el rótulo de arriba de la tarjeta decía 'Legacy Card' y los botones 'Info Legacy'/'Mi camino con Legacy' aunque la Card no tenga ningún Programa real conectado -- mismo patrón que el hallazgo de los badges (v1.68.4/1.68.5), esta vez en el rótulo superior y en dos botones. Estos dos botones ya eran programables por Programa desde hace rato (Program.cardLabels, /admin/programs) -- el problema era el DEFAULT de la plataforma, lo que ve cualquier Programa nuevo sin configurar, que hablaba en nombre de Legacy sin que nadie lo haya puesto así. Corregido a 'LyCard' / 'Info' / 'Mi camino' -- genéricos por default; Legacy, una vez armada como Programa real, carga sus propios textos en /admin/programs igual que antes. Alcance acotado a propósito: Gunnar pidió separar esto de un barrido completo de TODAS las frases con 'Legacy' en el sistema (quedó pendiente para cuando se ponga a diseñar cómo presentar el Programa Legacy específicamente).",
  },
  {
    version: "1.68.5",
    date: "2026-10-03",
    notes:
      "Detalle 4: los 4 badges de la tarjeta (2 medallas junto al nombre, 2 distinciones debajo del CV) ahora explican SIEMPRE, en lenguaje general, para qué sirve cada tipo de slot -- independientemente de si el Programa ya lo configuró o no. Antes solo se explicaba el estado ('todavía no configurado'), sin decir qué ES conceptualmente cada cosa. Corrección en el camino: la primera versión de este texto decía 'acá ves lo que eligió Legacy' -- pero esta Card (mastern0) nunca estuvo asociada a ningún Programa real, los valores que muestra ('O.D.', 'Aprendiz') son los defaults crudos del sistema, no una decisión de Legacy. Corregido para no atribuirle a Legacy algo que nadie configuró todavía.",
  },
  {
    version: "1.68.4",
    date: "2026-10-03",
    notes:
      "Detalle 3 del repaso de Gunnar sobre la tarjeta en esqueleto: el Nombre vacío ya no es un espacio en blanco invisible -- muestra un placeholder atenuado ('Nombre Completo') que marca dónde va. El botón de CV/título (antes desaparecía entero si no había título cargado) ahora siempre se ve, con su propio placeholder ('Ej. PhD en Neuropsicología'), y se agrandó -- a 172px fijo un título real quedaba cortado con puntos suspensivos. Hallazgo real de paso: los 3 modales de distinción (O.D., Rango de Sabiduría, Medallón) caían, sin Programa configurado, al bio personal fijo de Einar ('Diseñador, visionario y creador original del ecosistema Legacy...') como si fuera el default genérico de la plataforma -- se mostraba en CUALQUIER Programa nuevo sin configurar, no solo en mastern0. Reemplazado por texto honesto que explica que cada Programa arma su propia distinción desde /admin/programs, y el renglón de estado del modal ahora dice 'Sin configurar' en vez de pretender que ya está activo y certificado.",
  },
  {
    version: "1.68.3",
    date: "2026-10-03",
    notes:
      "Favicon/ícono de la PWA: cambiado el triángulo genérico por el logo real de Legacy (el arco dorado con la J, la marca que Gunnar ya usa en otros lados) en los 4 tamaños (192/512/512 maskable/apple-touch-icon). De paso, un bug real encontrado en el service worker: los íconos se servían con estrategia cache-first asumiendo que su nombre de archivo cambia por build (como sí pasa con el JS) -- pero no es así, `icon-192.png` es siempre el mismo nombre, así que una vez cacheado el triángulo viejo en un teléfono, quedaba pegado ahí para siempre aunque el archivo cambiara en el servidor. Corregido a network-first (mismo criterio que la navegación), y subida la versión de caché del service worker para que todo dispositivo con la app instalada tire el caché viejo en el próximo lanzamiento. También se reforzó el fix de altura de pantalla completa de la v1.68.2 (Gunnar reportó que seguía igual): ahora se prioriza `visualViewport.height` sobre `window.innerHeight` y se vuelve a medir con un pequeño delay además de al montar, por si WebKit entrega un valor viejo en la primera lectura dentro de una PWA standalone.",
  },
  {
    version: "1.68.2",
    date: "2026-10-03",
    notes:
      "Fix: al abrir la app desde el ícono del home en iPhone (PWA instalada, 'standalone'), la tarjeta dejaba un espacio muerto sustancial abajo -- bug real y documentado de WebKit: el alto `100dvh` que usa toda la pantalla está pensado para Safari (donde existe una barra inferior que aparece/desaparece), pero una PWA standalone no tiene esa barra y aun así el cálculo deja el hueco como si existiera. Ahora se mide el alto real de la ventana (`window.innerHeight`) en cuanto el JS corre, en vez de depender de `100dvh` -- funciona igual en el navegador normal y ya no deja espacio en modo PWA. Corregido en los dos contenedores de pantalla completa que lo usaban (la tarjeta sola y el carrusel swipeable de las 3 tarjetas de un Member).",
  },
  {
    version: "1.68.1",
    date: "2026-10-03",
    notes:
      "Corrección del reset a esqueleto (v1.68.0): Gunnar aclaró que \"conservar mastern0\" significaba conservar la FILA (su login de MasterN0 necesita que exista esa Card), no su contenido -- \"si voy a entrar a una tarjeta no se vea nada\". Ahora, además de quedarse la fila, se le blanquea el contenido (nombre, foto, frase, redes, todo) de vuelta a los valores vacíos de una Card sin personalizar -- al entrar a esa tarjeta después del reset, no se ve nada. También se suma al borrado el panel interno de equipo/HR (Nodos, Proyectos, Tareas, NashMesh en /admin/equipo y /admin/nashmesh) -- Gunnar confirmó que es contenido recreable, no lógica, así que entra en el mismo borrón. Verificado de nuevo antes de shippear: sembré una Card raíz con contenido real de prueba (nombre, foto, redes) más datos en las 4 tablas del panel interno, corrí la transacción completa, y confirmé que la fila sobrevive con el mismo id/slug (el login sigue funcionando) pero con todo el contenido en blanco, y que las 4 tablas del panel interno quedaron en cero.",
  },
  {
    version: "1.68.0",
    date: "2026-10-03",
    notes:
      "Reset a esqueleto, completo: Gunnar pidió repasar la lógica precisa del negocio desde cero (\"no quiero que haya nada.. ningún programa.. nada.. quiero que esté todo en esqueleto\") antes de rediseñar cómo se presenta el primer programa (Legacy). La herramienta \"Zona de Riesgo\" en /admin/reset ya existía pero había quedado corta -- cubría solo lo que existía hasta la Fase 6 de 2026-09, no WowStore, Especialistas/Expertos, Mensajería Interna, Destinatarios, Janus, Notas de Voz ni WowAwe, todo sumado después. Reescrita para cubrir el schema completo (28 tipos de contenido) en el orden correcto para no romper ninguna referencia (varias relaciones clave -- Card-Member, Card-Programa, Experto-Member, Admin-Programa, Admin-Member -- no tienen borrado en cadena a propósito, así que hay un orden exacto a respetar). A diferencia de la versión vieja, esta ya NO borra ni recrea tu Card MasterN0 -- la dejamos intacta tal cual está, con tu nombre/foto/redes, solo le limpiamos el contenido de prueba colgado. Tu login de Admin tampoco se toca. Lo único explícitamente fuera de este borrón es el panel interno de equipo/HR (Node/ProjectNode/Task/NashMeshRun en /admin/equipo y /admin/nashmesh) y la bitácora de logins (AdminLoginEvent, que nunca se borra por diseño) -- ninguno de los dos es contenido de negocio de cara al cliente. Verificado de verdad antes de shippear: sembré datos reales en las 28 tablas (Programa, Members, Admins vinculados, Cards de los 3 tipos, Puestos, mensajes, WowApps instaladas, Especialistas/Expertos con equipo y consultas, horarios reales, etc.) y corrí la transacción completa contra esos datos -- cero violaciones de llave foránea, sobrevive exactamente lo pactado y nada más.",
  },
  {
    version: "1.67.1",
    date: "2026-10-02",
    notes:
      "Corrección de PASO 6: Gunnar pidió calcar el funnel REAL de MayanCity, no uno inventado -- ahora el funnel de \"Agendar una entrevista\" con destinatario es un wizard de 4 pantallas con barra de progreso, igual que el de MayanCity: 1) un video corto antes de agendar (sin video real cargado, placeholder marcado), 2) tus datos (nombre, email, WhatsApp, programa, privacidad), 3) elegí tu sesión -- ahora con el horario REAL elegido a mano, ya no auto-asignado, 4) \"Tu tarjeta ya existe\" con el link y la fecha. Los datos siguen quedando 100% en LyCard -- nunca se conecta con la app de MayanCity ni se crea ninguna billetera blockchain.",
  },
  {
    version: "1.67.0",
    date: "2026-10-02",
    notes:
      "PASO 6 de la tarjeta personalizada: con destinatario, el botón \"Agendar una entrevista\" abre un funnel nuevo -- sin código de acceso (el link personalizado ya identifica a la persona), nombre precargado, confirma email y WhatsApp, elige su programa (3 días a 3 meses, sin precios todavía), acepta el aviso de privacidad, y al confirmar le creamos su propia tarjeta oficial de LyCard Y le agendamos su entrevista inicial de Legacy en el próximo turno disponible -- todo junto, un solo paso. La pantalla final muestra \"Tu tarjeta ya existe\" con su link y la fecha de la entrevista. Arreglo de paso, necesario para que esto funcione: los horarios de \"Agendar tu Entrevista\" eran 4 fechas fijas que ya habían quedado en el pasado (el botón estaba roto hace rato para cualquier tarjeta sin horarios reales cargados) -- ahora se generan siempre a futuro, relativos a hoy, nunca vencen.",
  },
  {
    version: "1.66.0",
    date: "2026-10-02",
    notes:
      "PASO 5 de la tarjeta personalizada: con destinatario, el botón de siempre pasa a ser \"Deja tu Legado\" y abre el Documento de Bienvenida completo -- calcado de la estructura real del de Rafael Rico (carta de apertura, qué es EinarOS, el programa Legacy, el Códice, el camino de 4 semanas, qué esperar en cada sesión, del Códice al negocio, tus datos y tus reglas), personalizado con el nombre del destinatario y con placeholders marcados donde el contenido es específico de cada persona. De paso, un arreglo: el panel de Destinatarios (antes visible para cualquier visitante de la tarjeta, sin querer) ahora solo lo ve el dueño -- un visitante sin link de destinatario ve el mensaje de contacto de siempre en ese lugar.",
  },
  {
    version: "1.65.0",
    date: "2026-10-02",
    notes:
      "PASO 4 de la tarjeta personalizada: el botón \"Info Legacy\" pasa a ser \"Info [nombre]\" cuando alguien entra con su link de destinatario (ej. /c/mastern0?para=rogelio). Le podés cargar una palabra secreta por destinatario desde el panel de Destinatarios -- si la cargás, el botón pide esa palabra antes de abrir; si lo dejás vacío, abre directo. Adentro: qué fuentes usamos (las que ya le cargaste), cómo las usamos, nuestra metodología, un PDF de ejemplo de su Códice (descargable, marcado EJEMPLO), el botón \"Abrir mi cuaderno\" (solo si le cargaste el link), el texto \"Tu información es tuya\" con un botón para pedir el borrado, y \"Crear mi Gemelo Digital\" que por ahora lleva a una pantalla de \"Tu onboarding está en preparación\". Sin destinatario, el botón \"Info Legacy\" de siempre no cambió en nada.",
  },
  {
    version: "1.64.0",
    date: "2026-10-02",
    notes:
      "\"Enviar Invitación\" ahora es el panel de Destinatarios: creás uno por nombre, lo abrís directo a su tarjeta personalizada con un toque (\"Abrir\"), y le sumás fuentes -- links, archivos (cualquier tipo) o notas de texto -- que se van a usar para armar su perfil más adelante.",
  },
  {
    version: "1.63.1",
    date: "2026-10-02",
    notes:
      "Fix al mensaje de bienvenida de un destinatario (v1.63.0): no va en un cartel nuevo arriba de la foto, reemplaza tu frase/lema de marca en su lugar de siempre -- sin destinatario, tu frase se ve exactamente igual que antes.",
  },
  {
    version: "1.63.0",
    date: "2026-10-02",
    notes:
      "PASO 1 de la tarjeta personalizada para destinatarios: tu tarjeta ya acepta un link puntual por persona (ej. /c/mastern0?para=rogelio), editable desde tu editor en una sección nueva \"Destinatarios\" -- creás el nombre, el link sale solo. Quien entra con ese link ve un mensaje de bienvenida con su nombre arriba de todo (\"Hola, [nombre]...\"); sin el link de destinatario, tu tarjeta se ve exactamente igual que siempre.",
  },
  {
    version: "1.62.0",
    date: "2026-10-02",
    notes:
      "4 arreglos reales reportados por Gunnar: el logo del Programa ya no se recorta (en la tarjeta, en el botón de Oficina, y en el preview del editor) -- antes un logo rectangular se forzaba contra un círculo y perdía los bordes; el menú superior del Dashboard (tus 3 tarjetas, Mensajes, Mi Red de Clientes) ya no queda tapado por la isla dinámica/notch del celular; y el espacio vacío que podía quedar abajo de tu tarjeta en pantallas como la del iPhone 13 ahora lo absorbe el botón de Agendar, que queda siempre anclado al borde de abajo. Además, rediseño de la Oficina Virtual: el Chequeo de Realidad ahora muestra 6 KPIs en vez de 3 (los primeros 3 con su gráfico de tendencia, los otros 3 como cifra o comparativa -- ej. \"Metas del mes: 3/10\"), y arriba de todo, 3 accesos principales en una fila: tu Gemelo Digital al centro (con el logo real de tu Programa), WowHead a un lado para reclutar Agentes, y un tercer acceso nuevo (BirdBrain) que por ahora queda marcado \"Próximamente\" hasta terminar de definir qué hace.",
  },
  {
    version: "1.61.0",
    date: "2026-10-01",
    notes:
      "Nace WowHead, el HeadHunter de Agentes: la WowStore (la grilla de WowApps/\"Tu Equipo\" instalado) deja de verse en tu Oficina Virtual -- en su lugar, un único acceso a WowHead, donde explorás y filtrás por tipo (Legacy -- el Gemelo Digital de una persona real, o Silicio -- un Agente IA) para reclutar. Cada Agente tiene su propio perfil con CV (experiencia, especialidades/habilidades, herramientas) y calificación. Contratar un Silicio es inmediato; un Legacy te lleva a consultarlo de verdad. Nuevo: un Legacy publicado puede ser ascendido a \"Experto\" (MasterN0-only, nunca automático) -- a partir de ahí arma su propio equipo desde \"Mi Equipo\" en su Oficina, invitando a otros Legacy, que tienen que aceptar la invitación para sumarse (nunca es unilateral). El equipo reclutado se ve en un organigrama real (el mismo Cerebro Malla de siempre) y en el perfil público de ese Experto en WowHead. WowAwe, la única WowApp con lógica real conectada, sigue accesible desde tu Oficina como su propia fila -- todo lo demás de WowStore queda intacto en el código pero se recicla para una fase futura.",
  },
  {
    version: "1.60.0",
    date: "2026-09-30",
    notes:
      "Fase 5 de la ronda de endurecimiento -- MVP con datos de prueba de Especialistas y Expertos (todavía datos de ejemplo, marcados como tal). Nuevo: WowStore ahora tiene un Especialista de ejemplo (\"Calma\", que usa WowAwe y Modo Foco como herramientas) que se instala en una Card y aparece en la Oficina bajo \"Tu Equipo\", con una sugerencia de ejemplo siempre marcada \"(simulada)\". También un Experto de ejemplo -- el Gemelo Digital de una persona inventada, con su propia página pública de consulta (3 preguntas gratis, después pide registrarte) y un inbox en su Oficina para responder lo que su Gemelo no supo contestar y sumarlo a su Códice. Todo gestionado desde /admin/wowstore, MasterN0-only.",
  },
  {
    version: "1.59.2",
    date: "2026-09-29",
    notes:
      "Fase 2 de la ronda de endurecimiento -- pulido visual, sin funciones nuevas. El número de versión y el lápiz de editar en la tarjeta ya no se muestran a un visitante anónimo que entra por la tarjeta Origen, solo al dueño con sesión. Se corrigió un hueco visual que aparecía entre las redes sociales y la frase, en pantallas altas o con poco contenido. Se unificaron los colores de los íconos de contacto al dorado de marca (antes había un verde/rojo que no correspondía). Se corrigió un acento faltante en una de las categorías de tags. Y se tradujeron al español los últimos textos en inglés que quedaban sueltos: \"Oficina Virtual\", \"Cerrar\", \"Mi Tarjeta de Empresa/Personal\", y \"Keep in Flow\"/\"Check de Realidad\" ahora se llaman \"Objetivo del Día\" y \"Chequeo de Realidad\" en toda la app.",
  },
  {
    version: "1.59.1",
    date: "2026-09-29",
    notes:
      "Revisión de seguridad (Fase 1 de la ronda de endurecimiento): confirmado que ningún camino automático del código puede crear un Admin con acceso total (MasterN0) -- solo Gunnar puede darlo de alta, siempre a mano. Sin cambios visibles en la app; se sumaron tests que blindan esta regla para que no se rompa por accidente en el futuro.",
  },
  {
    version: "1.59.0",
    date: "2026-09-24",
    notes:
      "Rediseño real de WowStore (no solo colores esta vez): cards con más peso visual, precio y botón \"Ver App\" bien marcados, y tags de rubro/dolor reales en cada una. Nueva sección \"Destacadas\" que muestra siempre arriba las WowApps que MasterN0 marca a mano (arranca con WowAwe, la única con lógica real hoy) -- antes podía quedar invisible si no tocabas el filtro exacto. El detalle de cada WowApp suma una Ficha Técnica con sus rubros/dolores reales. Perfil ahora te deja escribirle por WhatsApp real al equipo de tu Programa (si lo cargó) en vez de un asesor inventado.",
  },
  {
    version: "1.58.0",
    date: "2026-09-24",
    notes:
      "WowStore ahora se pinta con la identidad de marca real de tu Programa (mismo sistema de Skins que tu LyCard) en sus 4 pantallas. Sumamos un testimonio corto (marcado \"(simulado)\") en el detalle de cada WowApp, y una pestaña nueva \"Perfil\" con los datos reales de tu negocio, tus canales de contacto y cuántas WowApps instalaste — sin inventar RFC, tarjeta de pago ni facturación falsa: ahí dice clarito que todavía no hay pasarela real.",
  },
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
