import type { ApiResponse } from "@/types/api-response";
import type { ProblemDetails } from "@/types/problem-details";
import {
  clearAuthTokens,
  getAccessToken,
  getJwtExpirationMs,
  saveTokensFromPayload,
} from "@/lib/auth/tokens";
import { avalFlowDebugLog, sanitizeValue } from "@/lib/debug/aval-flow";

export type ApiEnvelope<T> = ApiResponse<T>;

let lastRequestId: string | null = null;
export function getLastRequestId() {
  return lastRequestId;
}

export class ApiError extends Error {
  status: number;
  problem?: ProblemDetails | null;
  constructor(
    message: string,
    status: number,
    problem?: ProblemDetails | null
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.problem = problem;
  }
}

function getApiUrl() {
  if (typeof window !== "undefined") {
    return "/api/v1";
  }
  return null;
}

async function getServerApiUrl() {
  const appUrl =
    process.env.APP_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.VERCEL_PROJECT_PRODUCTION_URL ??
    process.env.VERCEL_URL;

  try {
    const { headers } = await import("next/headers");
    const headerStore = await headers();
    const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host");
    const protocol =
      headerStore.get("x-forwarded-proto") ??
      (host?.includes("localhost") ? "http" : "https");

    if (host) {
      return `${protocol}://${host}/api/v1`;
    }
  } catch {}

  if (appUrl) {
    const normalized = appUrl.startsWith("http") ? appUrl : `https://${appUrl}`;
    return `${normalized.replace(/\/$/, "")}/api/v1`;
  }

  return "http://localhost:4000/api/v1";
}

async function resolveApiUrl() {
  const clientUrl = getApiUrl();
  if (clientUrl) return clientUrl;
  return getServerApiUrl();
}

const REFRESH_THRESHOLD_MS = 2 * 60 * 1000;

let refreshPromise: Promise<string | null> | null = null;

function isAuthPath(path: string, authPath: string) {
  return path === authPath || path.startsWith(`${authPath}?`);
}

function allowsRawAuthResponse(path: string) {
  return (
    isAuthPath(path, "/auth/login") ||
    isAuthPath(path, "/auth/select-role") ||
    isAuthPath(path, "/auth/switch-role") ||
    isAuthPath(path, "/auth/logout")
  );
}

function shouldRefreshToken(token: string | null) {
  if (!token) return true;

  const expiresAt = getJwtExpirationMs(token);
  if (!expiresAt) return false;

  return expiresAt - Date.now() <= REFRESH_THRESHOLD_MS;
}

function redirectToLogin() {
  if (typeof window === "undefined") return;
  if (window.location.pathname === "/signin") return;
  window.location.assign("/signin");
}

async function refreshAccessToken() {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const res = await fetch(`${getApiUrl()}/auth/refresh`, {
      method: "POST",
      credentials: "include",
    });

    const payload = (await res.json().catch(() => null)) as
      | ApiResponse<unknown>
      | Record<string, unknown>
      | null;

    if (!res.ok) {
      clearAuthTokens();
      if (res.status === 401) redirectToLogin();
      return null;
    }

    const data =
      payload && typeof payload === "object" && "data" in payload
        ? (payload as ApiResponse<unknown>).data
        : payload;

    if (!saveTokensFromPayload(data)) return null;

    return getAccessToken();
  })().finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
}

export async function ensureFreshAccessToken() {
  if (typeof window === "undefined") return null;

  const accessToken = getAccessToken();

  if (!shouldRefreshToken(accessToken)) return accessToken;

  return refreshAccessToken();
}

function isProblemDetails(value: unknown): value is ProblemDetails {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as ProblemDetails).type === "string" &&
    (typeof (value as ProblemDetails).title === "string" ||
      typeof (value as ProblemDetails).status === "number")
  );
}

function isApiResponse(value: unknown): value is ApiResponse<unknown> {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const payload = value as ApiResponse<unknown>;
  return payload.status === "success" || payload.status === "error";
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const isFormData = options.body instanceof FormData;
  const isAvalFlowRequest =
    path.startsWith("/avales") || path.startsWith("/eventos/");
  const shouldUseAuth =
    !isAuthPath(path, "/auth/login") && !isAuthPath(path, "/auth/refresh");

  const buildHeaders = (token: string | null) => {
    const headers = new Headers(options.headers);

    if (!isFormData && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    if (shouldUseAuth && token && !headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    return headers;
  };

  const request = async (token: string | null) =>
    fetch(`${await resolveApiUrl()}${path}`, {
      ...options,
      credentials: "include",
      headers: buildHeaders(token),
    });

  let token = shouldUseAuth ? await ensureFreshAccessToken() : null;
  if (isAvalFlowRequest) {
    avalFlowDebugLog("apiFetch", "request", {
      path,
      method: options.method ?? "GET",
      body: options.body ? sanitizeValue(options.body) : undefined,
    });
  }
  let res = await request(token);

  if (
    res.status === 401 &&
    shouldUseAuth &&
    !isAuthPath(path, "/auth/logout")
  ) {
    token = await refreshAccessToken();
    if (token) {
      res = await request(token);
    }
  }

  const rid = res.headers.get("X-Request-Id");
  if (rid) lastRequestId = rid;

  const payload = (await res.json().catch(() => null)) as
    | ApiResponse<T>
    | ProblemDetails
    | null;

  if (isAvalFlowRequest) {
    avalFlowDebugLog("apiFetch", "response", {
      path,
      method: options.method ?? "GET",
      status: res.status,
      requestId: rid,
      ok: res.ok,
      payload: sanitizeValue(payload),
    });
  }

  if (!res.ok) {
    const problem = isProblemDetails(payload) ? payload : null;
    const fallbackMessage =
      (payload && typeof payload === "object"
        ? "message" in payload
          ? (payload as { message?: string }).message
          : undefined
        : undefined) ?? `Error (${res.status})`;
    const msg = problem?.detail ?? problem?.title ?? fallbackMessage;

    if (typeof window !== "undefined" && res.status === 401) {
      const text = `${problem?.detail ?? ""} ${problem?.title ?? ""} ${fallbackMessage ?? ""}`
        .toLowerCase()
        .trim();
      const missingActiveRole =
        /ses[ií]on sin rol activo/.test(text) ||
        /sin rol activo/.test(text) ||
        /session without active role/.test(text);
      if (missingActiveRole && window.location.pathname !== "/select-role") {
        window.location.assign("/select-role");
      } else if (shouldUseAuth) {
        clearAuthTokens();
        redirectToLogin();
      }
    }

    throw new ApiError(msg, res.status, problem);
  }

  if (!payload || !isApiResponse(payload)) {
    if (allowsRawAuthResponse(path)) {
      saveTokensFromPayload(payload);
      return {
        status: "success",
        message: "OK",
        data: payload as T,
      };
    }

    throw new Error("Respuesta invalida del servidor");
  }

  saveTokensFromPayload(payload.data);
  return payload;
}
