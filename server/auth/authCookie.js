export const AUTH_COOKIE_NAME = "mji_token";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function resolveSameSite() {
  const configured = process.env.AUTH_COOKIE_SAMESITE?.trim().toLowerCase();
  if (configured === "none" || configured === "lax" || configured === "strict") return configured;
  if (process.env.AUTH_CROSS_ORIGIN_COOKIES === "true") return "none";
  return process.env.NODE_ENV === "production" ? "strict" : "lax";
}

export function getAuthCookieOptions() {
  const sameSite = resolveSameSite();
  const isProduction = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure: sameSite === "none" || isProduction,
    sameSite,
    maxAge: SEVEN_DAYS_MS,
    path: "/",
  };
}

export function setAuthCookie(res, token) {
  res.cookie(AUTH_COOKIE_NAME, token, getAuthCookieOptions());
}

export function clearAuthCookie(res) {
  const { secure, sameSite, path } = getAuthCookieOptions();
  res.clearCookie(AUTH_COOKIE_NAME, { httpOnly: true, secure, sameSite, path });
}

function isDevOAuthRedirectUri(redirectUri) {
  try {
    const url = new URL(redirectUri);
    return (
      url.hostname === "localhost" ||
      url.hostname === "127.0.0.1" ||
      url.hostname.endsWith(".chromiumapp.org") ||
      redirectUri.endsWith("/auth/expert-hub/callback") ||
      redirectUri.endsWith("/auth/experthub/extension-callback")
    );
  } catch {
    return false;
  }
}

export function isAllowedOAuthRedirectUri(redirectUri) {
  const allowed = (process.env.OAUTH_REDIRECT_URIS ?? "")
    .split(",")
    .map((uri) => uri.trim())
    .filter(Boolean);

  if (allowed.length > 0) {
    if (allowed.includes(redirectUri)) return true;
    // В dev разрешаем localhost/chromiumapp даже если забыли добавить в OAUTH_REDIRECT_URIS
    if (process.env.NODE_ENV !== "production" && isDevOAuthRedirectUri(redirectUri)) return true;
    return false;
  }

  if (process.env.NODE_ENV !== "production") {
    return isDevOAuthRedirectUri(redirectUri);
  }
  return false;
}
