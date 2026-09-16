// Semantic versioning (MAJOR.MINOR.PATCH, semver.org) for LyCard —
// shown on every card next to the idioma/tema/personalizar icons.
// Convención desde 2026-09-16: cada cambio que se shippea bumpea este
// número a mano junto con el código — MAJOR para cambios que rompen
// compatibilidad, MINOR para funcionalidad nueva, PATCH para fixes —
// y agrega una entrada corta a CHANGELOG, la bitácora visual que se ve
// al tocar la islita de versión en la tarjeta.
export const APP_VERSION = "1.9.0";

export type ChangelogEntry = { version: string; date: string; notes: string };

export const CHANGELOG: ChangelogEntry[] = [
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
