const ACCESS_TOKEN_KEY = "avales:accessToken";
const LEGACY_REFRESH_TOKEN_KEY = "avales:refreshToken";
const ROLE_SELECTION_KEY = "avales:rolesToSelect";
const SELECTION_TOKEN_KEY = "avales:selectionToken";

export const AUTH_TOKENS_CLEARED_EVENT = "avales:auth-tokens-cleared";

function canUseStorage() {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

export function getAccessToken() {
  if (!canUseStorage()) return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function hasAuthTokens() {
  return Boolean(getAccessToken());
}

export function setAuthTokens(tokens: {
  accessToken?: string | null;
}) {
  if (!canUseStorage()) return;

  if (tokens.accessToken) {
    localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
  }
}

export function clearAuthTokens() {
  if (!canUseStorage()) return;

  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(LEGACY_REFRESH_TOKEN_KEY);
  clearPendingRoleSelection();
  window.dispatchEvent(new Event(AUTH_TOKENS_CLEARED_EVENT));
}

export function clearPendingRoleSelection() {
  if (typeof window === "undefined" || typeof sessionStorage === "undefined") {
    return;
  }
  sessionStorage.removeItem(ROLE_SELECTION_KEY);
  sessionStorage.removeItem(SELECTION_TOKEN_KEY);
}

function getStringProp(value: unknown, key: string) {
  if (typeof value !== "object" || value === null) return undefined;
  const prop = (value as Record<string, unknown>)[key];
  return typeof prop === "string" && prop.length > 0 ? prop : undefined;
}

export function readTokensFromPayload(value: unknown) {
  const direct = {
    accessToken: getStringProp(value, "accessToken"),
  };

  if (direct.accessToken) return direct;

  if (typeof value !== "object" || value === null) return direct;

  const nestedTokens = (value as Record<string, unknown>).tokens;
  return {
    accessToken: getStringProp(nestedTokens, "accessToken"),
  };
}

export function saveTokensFromPayload(value: unknown) {
  const tokens = readTokensFromPayload(value);
  if (!tokens.accessToken) return false;

  setAuthTokens(tokens);
  return true;
}

export function getJwtExpirationMs(token: string) {
  const [, payload] = token.split(".");
  if (!payload) return null;

  try {
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(
      normalized.length + ((4 - (normalized.length % 4)) % 4),
      "="
    );
    const decoded = JSON.parse(atob(padded)) as { exp?: unknown };
    return typeof decoded.exp === "number" ? decoded.exp * 1000 : null;
  } catch {
    return null;
  }
}
