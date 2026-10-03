export type Lang = "es" | "en";

export const STR: Record<Lang, Record<string, string>> = {
  es: {
    // Placeholders de "espacio marcado" (2026-10-03, pedido de Gunnar al
    // repasar la tarjeta en esqueleto) -- distinto de los Empty de arriba:
    // esos avisan "todavía no cargado" con lenguaje honesto; estos dos
    // marcan visualmente DÓNDE va cada campo (nombre, CV) cuando está
    // vacío, mismo criterio que el placeholder gris de un input de
    // formulario -- nunca se guardan como valor real, solo se muestran.
    namePlaceholder: "Nombre Completo",
    titlePlaceholder: "Ej. PhD en Neuropsicología",
    // Defaults de PLATAFORMA (no de Legacy) -- 2026-10-03, pedido de
    // Gunnar: "esta no sería la Legacy Card de forma estricta.. nomás
    // sería una LyCard (general)". Estos dos ya son overridables por
    // Programa (Program.cardLabels, ver lib/cardLabels.ts) -- Legacy,
    // una vez armado como Programa real en /admin/programs, carga su
    // propio "Mi camino con Legacy"/"Info Legacy" ahí. El DEFAULT de la
    // plataforma (lo que ve cualquier Programa nuevo sin configurar) no
    // debe hablar en nombre de Legacy.
    storyBtn: "Mi camino",
    storyBtnCompany: "Mi camino con la Empresa",
    storyBtnPersonal: "Mi Trayectoria",
    storyKickerCompany: "Mi camino con la Empresa",
    storyKickerPersonal: "Mi Trayectoria",
    storyHeadEmpty: "{name} todavía no escribió su historia acá.",
    storyBodyEmpty: "Volvé más adelante — todavía no la cargó.",
    infoBtn: "Info",
    customize: "Personalizar mi LyCard",
    loginIcon: "Iniciar sesión",
    scheduleBtn: "Agendar tu Entrevista",
    scheduleBtnHost: "Agendar una Entrevista",
    coffeeBtn: "Agendar un Café",
    coffeeBtnHost: "Agendar un Café",
    coffeeTitle: "Agendá un Café",
    coffeeSub: "Elegí un horario disponible para coordinar con {name}.",
    qrSendKicker: "Compartir mi QR",
    qrSendTitle: "Enviate tu QR por WhatsApp",
    qrSendSub: "Te lo mandamos a ese número para que lo tengas siempre a mano.",
    qrSendBtn: "Enviar",
    qrSendSuccess: "¡Listo! Te lo enviamos a {whatsapp}.",
    createCardBtn: "Creá tu LyCard",
    inviteBtn: "Enviar Invitación",
    scheduleKicker: "Reservá tu lugar",
    scheduleTitle: "Agendá tu Entrevista",
    scheduleSub: "Elegí un horario disponible para conversar sobre el Programa Legacy.",
    fFullName: "Nombre completo",
    fWhatsapp: "WhatsApp",
    fEmailOptional: "Correo (opcional)",
    scheduleConfirm: "Confirmar mi lugar",
    scheduleSuccess: "¡Listo! Te esperamos el {slot}.",
    scheduleErrSlot: "Elegí un horario para continuar.",
    scheduleErrName: "Ingresá tu nombre.",
    scheduleErrWa: "Ingresá tu WhatsApp.",
    scheduleErrFull: "Ese horario ya se llenó — elegí otro.",
    scheduleErrEmail: "Revisá el formato del correo.",
    inviteKicker: "Enviar Invitación",
    inviteTitle: "Invitá a alguien a Legacy",
    inviteSub: "Le enviamos un correo personalizado en tu nombre, invitándolo a conocer el Programa Legacy.",
    fInviteeEmail: "Correo del invitado",
    inviteSend: "Enviar Invitación",
    inviteSuccess: "¡Invitación enviada!",
    inviteErrEmail: "Ingresá un correo válido.",
    inviteErrNotConfigured: "El envío de correos todavía no está activado.",
    inviteSubCompany: "Le enviamos un correo personalizado en tu nombre, invitándolo a conocer tu negocio.",
    close: "Cerrar",
    cardInfoProjectHead: "Tu tarjeta de Programa",
    cardInfoProjectBody: "Tu identidad dentro del Programa. Compartila para invitar gente a tu red — quien la escanee puede sumarse.",
    cardInfoCompanyHead: "Tu tarjeta de Negocio",
    cardInfoCompanyBody: "Tu tarjeta de negocio. Compartila con clientes y socios: mostrá tu marca, guardá contacto, agendá reuniones.",
    cardInfoPersonalHead: "Tu tarjeta Personal",
    cardInfoPersonalBody: "Tu tarjeta personal. Contacto directo — quien la reciba puede guardarte al toque.",
    versionInfoKicker: "Bitácora de Versión",
    versionInfoMeta: "LyCard",
    companyInfoBtn: "Sobre mi Empresa",
    companyInfoKicker: "Sobre la Empresa",
    companyInfoMeta: "Negocio Verificado",
    vcardBtn: "Guardar Contacto",
    sendMessageBtn: "Enviar Mensaje",
    contactKicker: "Enviar Mensaje",
    contactSub: "Escribile directo a {name} — le llega por correo.",
    fSenderName: "Tu nombre",
    fSenderEmail: "Tu correo",
    fMessage: "Mensaje",
    contactSend: "Enviar Mensaje",
    contactSuccess: "¡Mensaje enviado!",
    contactErrName: "Ingresá tu nombre.",
    contactErrEmail: "Ingresá un correo válido.",
    contactErrMessage: "Escribí tu mensaje.",
    contactErrNotConfigured: "El envío de mensajes todavía no está activado.",
    meetingBtn: "Agendar una Reunión",
    meetingBtnHost: "Agendar una Reunión",
    meetingTitle: "Agendá una Reunión",
    meetingSub: "Elegí un horario disponible para conversar con {name}.",
    linkCopied: "Link copiado",
    // Fallback honesto cuando el Programa no configuró esta distinción
    // (Puesto/escala vacíos, PLAN.md Fase 9) -- 2026-10-03, pedido de
    // Gunnar al repasar la tarjeta en esqueleto: antes esto caía al bio
    // personal fijo de Einar ("Diseñador, visionario y creador original
    // del ecosistema Legacy..."), que se mostraba en CUALQUIER Programa
    // nuevo sin configurar -- no es un fallback genérico, es contenido de
    // una sola persona hecho pasar por default de la plataforma. Ahora
    // explica honestamente que es un campo programable por Programa, sin
    // inventar una identidad que no corresponde.
    // Explicación GENERAL de cada uno de los 4 badges (2026-10-02, segunda
    // vuelta, pedido de Gunnar: "necesito que en cada medalla o
    // distincion.. se explique para que es cada una de forma general..
    // lo de aprendiz.. O.D. Ancient.. es solo para el legacy"). Van SIEMPRE
    // primero en el body del modal (configurado o no) -- explican el
    // CONCEPTO del slot (qué tipo de distinción es, en cualquier Programa),
    // distinto del fallback de arriba (odBody/ancBody/medalBody), que
    // explica el ESTADO puntual (configurado o no).
    //
    // CORRECCIÓN en vivo (mismo pedido): la primera versión decía "acá ves
    // las que eligió Legacy" -- Gunnar aclaró que esta Card (mastern0) NO
    // es la Legacy Card de forma estricta, es una LyCard general sin
    // Programa asociado (`programId: null` desde siempre) -- "O.D." y
    // "Aprendiz" son los valores CRUDOS por default del schema, no una
    // decisión real de Legacy. Corregido para no atribuirle a Legacy algo
    // que nadie configuró -- ahora dice honestamente que son valores de
    // ejemplo sin Programa real detrás todavía.
    // Reescrito 2026-10-03 (cuarta vuelta -- Gunnar: "esta horrible..
    // esta muy mal explicado.. quiero algo mas visual.. utiliza un
    // formato como el del modal Info.. mostrame logos.. dame imagenes").
    // La tercera vuelta metía los ejemplos de íconos como TEXTO dentro
    // del párrafo ("diamond (fundador), shield (guardián)...") -- eso no
    // es "ver" un ícono, es leer su nombre. Ahora el texto queda corto
    // (qué es + mecanismo, 2 frases) y los íconos se renderizan de
    // verdad en una grilla visual debajo (mismo patrón de tarjetitas que
    // ya usa el modal Info con pil1/pil2/pil3), ver BADGE_ICON_EXAMPLES
    // en components/LyCardView.tsx.
    odIntro:
      "Tu posición dentro de la estructura del Programa — un rol o título, no tu nivel de experiencia (eso es el Rango, el otro distintivo). El N0 arma su propia escalera de posiciones desde /admin/programs, de 3 a N roles.",
    ancIntro:
      "Tu rango de experiencia y trayectoria dentro del Programa — una escalera de progreso, como un sistema de cinturones. El N0 arma su propia escala desde /admin/programs, de 3 a N niveles.",
    medalIntro:
      "Tu nivel de distinción general dentro del Programa — un reconocimiento de tu compromiso, tipo bronce/plata/oro/diamante. El N0 arma su propia escala desde /admin/programs.",
    contactsIntro:
      "Tu alcance — cuánta gente contactaste o le compartiste tu LyCard. El N0 arma su propia escala de niveles desde /admin/programs.",
    badgeExamplesLabel: "Ejemplos de íconos",
    odBody:
      "Esta distinción todavía no fue configurada. El N0 del Programa define acá su nombre, ícono y descripción desde /admin/programs — cada Programa arma la suya, no hay una fija.",
    odMeta: "Estatus: Activo y Certificado",
    odMetaEmpty: "Sin configurar",
    ancKicker: "Rango de Sabiduría",
    ancBody:
      "Este rango todavía no fue configurado. El N0 del Programa arma su propia escala de rangos desde /admin/programs — cada Programa define los suyos, no hay uno fijo.",
    ancMeta: "Mentoría & Consejo",
    ancMetaEmpty: "Sin configurar",
    medalKicker: "Nivel de Medallón",
    medalBody:
      "Este nivel todavía no fue configurado. El N0 del Programa arma su propia escala de medallones desde /admin/programs — cada Programa define los suyos, no hay uno fijo.",
    medalMeta: "Distintivo Legacy",
    medalMetaEmpty: "Sin configurar",
    storyKicker: "Mi Camino con Legacy",
    storyHead: "«Descubrí en Legacy una forma de trascender.»",
    storyBody:
      "Durante años como inversionista busqué plataformas que integraran verdadero respaldo patrimonial con visión descentralizada y principios de honor familiar. Al ingresar al Programa Legacy encontré la sincronía entre formación de alto calibre, networking con líderes selectos y un ecosistema Web3 transparente. Hoy comparto esta llave exclusivamente con mi círculo íntimo de confianza.",
    storyMeta: "Verificado en Blockchain",
    infoKicker: "Programa Legacy • Oficial",
    infoTag: "Masterclass Oficial (3:45 min)",
    infoTitle: "Construcción y Protección de Legado Patrimonial",
    infoP1:
      "El Programa Legacy es una iniciativa privada de alta dirección y estructuración de riqueza que combina educación financiera descentralizada, activos soberanos y una red global de empresarios visionarios.",
    infoP2:
      "A través de {name} obtienes acceso por invitación a sesiones privadas de planeación estratégica y conexión con el nodo central.",
    infoCta: "Hablar con {name} sobre Legacy",
    pil1: "Activos NFT",
    pil1s: "Tokens de acceso",
    pil2: "Mentoría",
    pil2s: "1-a-1 Directa",
    pil3: "Soberanía",
    pil3s: "Patrimonio real",
    legacyPass: "Ecosistema Legacy Pass",
    portalTitle: "Accediendo",
    portalSub: "Sincronizando la Oficina Virtual de {name}...",
    tPhoto: "Arrastra tu retrato al marco circular",
    officeKickerProject: "Mi Origen",
    officeKickerCompany: "Portfolio",
    officeKickerPersonal: "Currículum",
    officeEmptyCompany: "{name} todavía no cargó ningún trabajo acá.",
    officeEmptyPersonal: "{name} todavía no cargó su currículum acá.",
    officeFounderHead: "✦ Fundador de la Red ✦",
    officeFounderBody: "{name} es la raíz de este árbol — no tiene un referente porque fue quien empezó todo.",
    officeReferredBy: "Te sumó",
    officeProgramLabel: "Programa",
    officeJoinedOn: "Se unió el {date}",
    back: "Volver",
    myCard: "Mi LyCard",
    saveBtn: "Guardar",
    config: "Mi tarjeta Legacy",
    edTitle: "Personalizar LyCard",
    edSub:
      "Tu tarjeta de presentación digital del Programa Legacy: foto, datos, distintivos y canales de contacto.",
    secPortrait: "Retrato Oficial",
    upload: "Subir nueva foto",
    crop: "Encuadre",
    portraitHint:
      "Formato JPG o PNG de alta densidad. Encuadre vertical recomendado (proporción 1:1 o 4:5).",
    secIdentity: "Identidad Fiduciaria",
    fName: "Nombre Completo",
    fTitle: "Cargo / Título Profesional",
    fQuote: "Cita de Marca / Lema",
    secBadges: "Distintivos & Honores",
    badgesSub:
      "Personaliza los distintivos de rango y honores que se mostrarán en tu tarjeta.",
    medalLabel: "Nivel de Medallón Principal",
    fSiglas: "Siglas",
    fTooltip: "Denominación / Tooltip",
    secWisdom: "Sabiduría",
    rankWord: "Rango",
    wisdomSub:
      "Jerarquía fiduciaria en el consejo intergeneracional de gobernanza.",
    secChannels: "Canales de Contacto",
    syncBtn: "Sincronizar con el Fiduciario",
    viewCard: "Ver mi LyCard",
  },
  en: {
    namePlaceholder: "Full Name",
    titlePlaceholder: "Ej. PhD in Neuropsychology",
    storyBtn: "My path",
    storyBtnCompany: "My path with the Business",
    storyBtnPersonal: "My Journey",
    storyKickerCompany: "My path with the Business",
    storyKickerPersonal: "My Journey",
    storyHeadEmpty: "{name} hasn't written their story here yet.",
    storyBodyEmpty: "Check back later — it hasn't been added yet.",
    infoBtn: "Info",
    customize: "Customize my LyCard",
    loginIcon: "Log in",
    scheduleBtn: "Book your Interview",
    scheduleBtnHost: "Book an Interview",
    coffeeBtn: "Book a Coffee",
    coffeeBtnHost: "Book a Coffee",
    coffeeTitle: "Book a Coffee",
    coffeeSub: "Pick an available time to connect with {name}.",
    qrSendKicker: "Share my QR",
    qrSendTitle: "Send yourself your QR on WhatsApp",
    qrSendSub: "We'll send it to that number so you always have it handy.",
    qrSendBtn: "Send",
    qrSendSuccess: "Done! We sent it to {whatsapp}.",
    createCardBtn: "Create your LyCard",
    inviteBtn: "Send Invitation",
    scheduleKicker: "Reserve your spot",
    scheduleTitle: "Book your Interview",
    scheduleSub: "Pick an available time to talk about the Legacy Program.",
    fFullName: "Full name",
    fWhatsapp: "WhatsApp",
    fEmailOptional: "Email (optional)",
    scheduleConfirm: "Confirm my spot",
    scheduleSuccess: "You're in! See you on {slot}.",
    scheduleErrSlot: "Pick a time slot to continue.",
    scheduleErrName: "Enter your name.",
    scheduleErrWa: "Enter your WhatsApp.",
    scheduleErrFull: "That time is already full — pick another one.",
    scheduleErrEmail: "Check the email format.",
    inviteKicker: "Send Invitation",
    inviteTitle: "Invite someone to Legacy",
    inviteSub: "We'll send a personalized email on your behalf, inviting them to discover the Legacy Program.",
    fInviteeEmail: "Invitee's email",
    inviteSend: "Send Invitation",
    inviteSuccess: "Invitation sent!",
    inviteErrEmail: "Enter a valid email.",
    inviteErrNotConfigured: "Email sending isn't set up yet.",
    inviteSubCompany: "We'll send a personalized email on your behalf, inviting them to discover your business.",
    close: "Close",
    cardInfoProjectHead: "Your Program card",
    cardInfoProjectBody: "Your identity inside the Program. Share it to invite people into your network — anyone who scans it can join.",
    cardInfoCompanyHead: "Your Business card",
    cardInfoCompanyBody: "Your business card. Share it with clients and partners — show your brand, save contact, book meetings.",
    cardInfoPersonalHead: "Your Personal card",
    cardInfoPersonalBody: "Your personal card. Direct contact — whoever gets it can save you in one tap.",
    versionInfoKicker: "Version Log",
    versionInfoMeta: "LyCard",
    companyInfoBtn: "About my Business",
    companyInfoKicker: "About the Business",
    companyInfoMeta: "Verified Business",
    vcardBtn: "Save Contact",
    sendMessageBtn: "Send Message",
    contactKicker: "Send a Message",
    contactSub: "Write directly to {name} — it lands in their inbox.",
    fSenderName: "Your name",
    fSenderEmail: "Your email",
    fMessage: "Message",
    contactSend: "Send Message",
    contactSuccess: "Message sent!",
    contactErrName: "Enter your name.",
    contactErrEmail: "Enter a valid email.",
    contactErrMessage: "Write your message.",
    contactErrNotConfigured: "Messaging isn't set up yet.",
    meetingBtn: "Book a Meeting",
    meetingBtnHost: "Book a Meeting",
    meetingTitle: "Book a Meeting",
    meetingSub: "Pick an available time to talk with {name}.",
    linkCopied: "Link copied",
    odIntro:
      "Your position within the Program's structure — a role or title, not your experience level (that's the Rank, the other distinction). The Program's N0 builds its own ladder of positions from /admin/programs, from 3 to N roles.",
    ancIntro:
      "Your rank of experience and track record within the Program — a progress ladder, like a belt system. The Program's N0 builds its own scale from /admin/programs, from 3 to N levels.",
    medalIntro:
      "Your general distinction level within the Program — recognition of commitment, like bronze/silver/gold/diamond. The Program's N0 builds its own scale from /admin/programs.",
    contactsIntro:
      "Your reach — how many people you contacted or shared your LyCard with. The Program's N0 builds its own scale of levels from /admin/programs.",
    badgeExamplesLabel: "Icon examples",
    odBody:
      "This distinction hasn't been configured yet. The Program's N0 sets its name, icon and description from /admin/programs — each Program builds its own, there's no fixed one.",
    odMeta: "Status: Active and Certified",
    odMetaEmpty: "Not configured",
    ancKicker: "Rank of Wisdom",
    ancBody:
      "This rank hasn't been configured yet. The Program's N0 builds its own rank scale from /admin/programs — each Program defines its own, there's no fixed one.",
    ancMeta: "Mentorship & Council",
    ancMetaEmpty: "Not configured",
    medalKicker: "Medallion Level",
    medalBody:
      "This level hasn't been configured yet. The Program's N0 builds its own medallion scale from /admin/programs — each Program defines its own, there's no fixed one.",
    medalMeta: "Legacy Distinction",
    medalMetaEmpty: "Not configured",
    storyKicker: "My Path with Legacy",
    storyHead: "“In Legacy I found a way to transcend.”",
    storyBody:
      "For years as an investor I looked for platforms combining real patrimonial backing with a decentralized vision and principles of family honor. Joining the Legacy Program I found the synchrony between high-calibre training, a network of select leaders and a transparent Web3 ecosystem. Today I share this key only with my closest circle of trust.",
    storyMeta: "Verified on-chain",
    infoKicker: "Legacy Program • Official",
    infoTag: "Official Masterclass (3:45 min)",
    infoTitle: "Building and Protecting Patrimonial Legacy",
    infoP1:
      "The Legacy Program is a private wealth-structuring initiative combining decentralized financial education, sovereign assets and a global network of visionary entrepreneurs.",
    infoP2:
      "Through {name} you gain invitation-only access to private strategic planning sessions and a connection to the central node.",
    infoCta: "Talk to {name} about Legacy",
    pil1: "NFT Assets",
    pil1s: "Access tokens",
    pil2: "Mentorship",
    pil2s: "Direct 1-on-1",
    pil3: "Sovereignty",
    pil3s: "Real assets",
    legacyPass: "Legacy Pass Ecosystem",
    portalTitle: "Accessing",
    portalSub: "Syncing {name}'s Virtual Office...",
    tPhoto: "Drop your portrait into the circular frame",
    officeKickerProject: "My Origin",
    officeKickerCompany: "Portfolio",
    officeKickerPersonal: "Résumé",
    officeEmptyCompany: "{name} hasn't added any work here yet.",
    officeEmptyPersonal: "{name} hasn't added their résumé here yet.",
    officeFounderHead: "✦ Founder of the Network ✦",
    officeFounderBody: "{name} is the root of this tree — no referrer, because they're the one who started it.",
    officeReferredBy: "Brought in by",
    officeProgramLabel: "Program",
    officeJoinedOn: "Joined on {date}",
    back: "Back",
    myCard: "My LyCard",
    saveBtn: "Save",
    config: "My Legacy card",
    edTitle: "Customize LyCard",
    edSub:
      "Your digital business card for the Legacy Program: photo, details, distinctions and contact channels.",
    secPortrait: "Official Portrait",
    upload: "Upload new photo",
    crop: "Reframe",
    portraitHint:
      "High-density JPG or PNG. Vertical framing recommended (1:1 or 4:5 ratio).",
    secIdentity: "Fiduciary Identity",
    fName: "Full Name",
    fTitle: "Role / Professional Title",
    fQuote: "Brand Quote / Motto",
    secBadges: "Distinctions & Honors",
    badgesSub: "Customize the rank distinctions and honors shown on your card.",
    medalLabel: "Primary Medallion Level",
    fSiglas: "Initials",
    fTooltip: "Denomination / Tooltip",
    secWisdom: "Wisdom",
    rankWord: "Rank",
    wisdomSub:
      "Fiduciary hierarchy within the intergenerational governance council.",
    secChannels: "Contact Channels",
    syncBtn: "Sync with the Trustee",
    viewCard: "View my LyCard",
  },
};

export function t(lang: Lang, key: string, vars: Record<string, string> = {}) {
  let value = STR[lang][key] ?? key;
  for (const [k, v] of Object.entries(vars)) {
    value = value.split(`{${k}}`).join(v);
  }
  return value;
}
