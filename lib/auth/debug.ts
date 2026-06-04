"use client";

const AUTH_DEBUG_KEY = "avales:debug-auth";

function canUseBrowser() {
  return typeof window !== "undefined";
}

export function isAuthDebugEnabled() {
  if (!canUseBrowser()) return false;
  return (
    localStorage.getItem(AUTH_DEBUG_KEY) === "1" ||
    sessionStorage.getItem(AUTH_DEBUG_KEY) === "1"
  );
}

export function authDebugLog(message: string, meta?: Record<string, unknown>) {
  if (!isAuthDebugEnabled()) return;
  const timestamp = new Date().toISOString();
  if (meta) {
    console.debug(`[auth-debug ${timestamp}] ${message}`, meta);
    return;
  }
  console.debug(`[auth-debug ${timestamp}] ${message}`);
}

export function describeToken(token: string | null) {
  if (!token) {
    return { present: false };
  }

  const [, payload] = token.split(".");
  if (!payload) {
    return { present: true, malformed: true };
  }

  try {
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(
      normalized.length + ((4 - (normalized.length % 4)) % 4),
      "="
    );
    const decoded = JSON.parse(atob(padded)) as {
      exp?: number;
      iat?: number;
      sub?: string;
      rolActivo?: string;
    };

    return {
      present: true,
      exp: decoded.exp ?? null,
      iat: decoded.iat ?? null,
      sub: decoded.sub ?? null,
      rolActivo: decoded.rolActivo ?? null,
    };
  } catch {
    return { present: true, malformed: true };
  }
}
