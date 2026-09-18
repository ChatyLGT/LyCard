// Minimal Google OAuth 2.0 (authorization code flow), no SDK — same lean
// approach as the rest of this project's auth. Needs GOOGLE_CLIENT_ID /
// GOOGLE_CLIENT_SECRET set to actually work; see .env.example.

export const GOOGLE_STATE_COOKIE = "lycard_google_state";
export const GOOGLE_CONNECT_COOKIE = "lycard_google_connect";
export const ADMIN_GOOGLE_STATE_COOKIE = "lycard_admin_google_state";

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo";

// Alcance real, a propósito acotado (Fase F, 2026-09-19): Calendar +
// Tasks para orquestar Notas de Voz/reuniones, y drive.file — no `drive`
// completo — para la carpeta Bridge de #Dirac. drive.file solo ve lo que
// esta app crea, así que nunca dispara la revisión de apps sensibles de
// Google; a cambio, la carpeta Bridge la crea la app (Gunnar la reubica
// una vez dentro de su 99_RAW real si quiere).
export const GOOGLE_CONNECT_SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/tasks",
  "https://www.googleapis.com/auth/drive.file",
].join(" ");

function redirectUri() {
  const base = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  return `${base}/m/auth/google/callback`;
}

function connectRedirectUri() {
  const base = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  return `${base}/m/auth/google/connect-callback`;
}

function adminRedirectUri() {
  const base = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  return `${base}/admin/auth/google/callback`;
}

export function isGoogleAuthConfigured() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export function buildGoogleAuthUrl(state: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) throw new Error("GOOGLE_CLIENT_ID is not set");

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri(),
    response_type: "code",
    scope: "openid email profile",
    access_type: "online",
    prompt: "select_account",
    state,
  });
  return `${AUTH_URL}?${params.toString()}`;
}

export async function exchangeGoogleCode(code: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("Google OAuth is not configured");

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri(),
    }),
  });
  if (!res.ok) {
    throw new Error(`Google token exchange failed: ${res.status} ${await res.text()}`);
  }
  const { access_token } = (await res.json()) as { access_token: string };

  const userRes = await fetch(USERINFO_URL, {
    headers: { Authorization: `Bearer ${access_token}` },
  });
  if (!userRes.ok) {
    throw new Error(`Google userinfo failed: ${userRes.status}`);
  }
  return (await userRes.json()) as { sub: string; email?: string; name?: string; picture?: string };
}

// Flujo "Conectar Google" (Fase F) — access_type=offline + prompt=consent
// para forzar que Google emita un refresh_token, distinto del login de
// arriba (que es access_type=online, sin refresh_token, y no lo necesita).
export function buildGoogleConnectUrl(state: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) throw new Error("GOOGLE_CLIENT_ID is not set");

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: connectRedirectUri(),
    response_type: "code",
    scope: GOOGLE_CONNECT_SCOPES,
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state,
  });
  return `${AUTH_URL}?${params.toString()}`;
}

export async function exchangeGoogleConnectCode(code: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("Google OAuth is not configured");

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: connectRedirectUri(),
    }),
  });
  if (!res.ok) {
    throw new Error(`Google connect token exchange failed: ${res.status} ${await res.text()}`);
  }
  return (await res.json()) as {
    access_token: string;
    refresh_token?: string;
    scope: string;
    expires_in: number;
  };
}

// Login con Google para /admin (2026-09-19, pedido de Gunnar) — un tercer
// flujo, separado del de Member y del de "Conectar Google": es SOLO el
// método de autenticación (mismo scope liviano que el login de Member,
// access_type=online, sin refresh_token — acá no hace falta), nunca
// otorga permisos de Admin por sí mismo. Quién es Admin lo sigue
// decidiendo únicamente createProgramAdminAction (ver
// docs/02-ARQUITECTURA.md#regla-dura) — el callback busca el email
// contra la tabla Admin ya existente y si no hay match, no entra.
export function buildAdminGoogleAuthUrl(state: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) throw new Error("GOOGLE_CLIENT_ID is not set");

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: adminRedirectUri(),
    response_type: "code",
    scope: "openid email profile",
    access_type: "online",
    prompt: "select_account",
    state,
  });
  return `${AUTH_URL}?${params.toString()}`;
}

export async function exchangeAdminGoogleCode(code: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("Google OAuth is not configured");

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: adminRedirectUri(),
    }),
  });
  if (!res.ok) {
    throw new Error(`Google admin token exchange failed: ${res.status} ${await res.text()}`);
  }
  const { access_token } = (await res.json()) as { access_token: string };

  const userRes = await fetch(USERINFO_URL, {
    headers: { Authorization: `Bearer ${access_token}` },
  });
  if (!userRes.ok) {
    throw new Error(`Google userinfo failed: ${userRes.status}`);
  }
  return (await userRes.json()) as { sub: string; email?: string; name?: string };
}

export async function refreshGoogleAccessToken(refreshToken: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("Google OAuth is not configured");

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) {
    throw new Error(`Google token refresh failed: ${res.status} ${await res.text()}`);
  }
  const { access_token } = (await res.json()) as { access_token: string };
  return access_token;
}
