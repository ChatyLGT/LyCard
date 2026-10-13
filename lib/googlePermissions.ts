// Mapa de permisos de Google (fuente única). Cada permiso agrupa los scopes
// que una función necesita, con la explicación que ve la persona ANTES de
// mandarla a Google, y cuándo se pide de verdad. Regla de producto: nunca un
// pedido masivo al entrar; cada permiso se pide la primera vez que la función
// lo usa (ver CLAUDE.md, "Permisos y servicios externos").
// Pura: sin DB ni cookies, 100% testeable.

export type GooglePermissionKey = "identidad" | "calendario" | "tareas" | "drive";

export type GooglePermission = {
  key: GooglePermissionKey;
  label: string;
  scopes: string[];
  para: string;
  cuando: string;
};

export const GOOGLE_PERMISSIONS: GooglePermission[] = [
  {
    key: "identidad",
    label: "Tu identidad",
    scopes: ["openid", "email", "profile"],
    para: "Confirmar que sos vos y mostrar tu nombre y tu email dentro de LyCard.",
    cuando: "Siempre que conectás tu cuenta de Google.",
  },
  {
    key: "calendario",
    label: "Tu calendario",
    scopes: ["https://www.googleapis.com/auth/calendar.events"],
    para: "Leer tu agenda y crear o actualizar eventos, por ejemplo una capacitación con su link de Google Meet.",
    cuando: "Solo cuando usás la Agenda de tu Oficina o agendás una sesión.",
  },
  {
    key: "tareas",
    label: "Tus tareas",
    scopes: ["https://www.googleapis.com/auth/tasks"],
    para: "Leer y crear tareas en Google Tasks.",
    cuando: "Solo cuando usás las tareas de tu Oficina.",
  },
  {
    key: "drive",
    label: "Archivos que crea LyCard",
    scopes: ["https://www.googleapis.com/auth/drive.file"],
    para: "Crear y guardar solo los archivos que LyCard genera. No ve el resto de tu Drive.",
    cuando: "Solo cuando activás la carpeta Bridge.",
  },
];

export const GOOGLE_CONNECT_SCOPE_LIST = GOOGLE_PERMISSIONS.flatMap((p) => p.scopes);
