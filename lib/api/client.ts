import type { ApiResponse } from "@/types/api-response";
import type { ProblemDetails } from "@/types/problem-details";

export type ApiEnvelope<T> = ApiResponse<T>;

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
  // En el cliente (browser), usamos el proxy local para manejar cookies HttpOnly correctamente
  if (typeof window !== "undefined") {
    return "/api/v1";
  }

  // En el servidor (SSR), usamos la URL completa
  const url = process.env.NEXT_PUBLIC_API_URL;
  if (!url) return "http://localhost:3000/api/v1";
  return url;
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
  // Si el body es FormData, no establecer Content-Type para que el browser lo haga automáticamente
  const isFormData = options.body instanceof FormData;
  console.log("apiFetch preparando request", {
    path,
    method: options.method ?? "GET",
    isFormData,
    headers: options.headers,
    body: isFormData ? "(FormData oculto)" : options.body,
  });

  const res = await fetch(`${getApiUrl()}${path}`, {
    ...options,
    credentials: "include",
    headers: isFormData
      ? {
          ...(options.headers ?? {}),
        }
      : {
          "Content-Type": "application/json",
          ...(options.headers ?? {}),
        },
  });
  console.log("apiFetch received raw status", res.status, res.statusText);
  const payload = (await res.json().catch(() => null)) as
    | ApiResponse<T>
    | ProblemDetails
    | null;
  console.log("apiFetch parsed payload", payload);

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
      }
    }

    throw new ApiError(msg, res.status, problem);
  }

  if (!payload || !isApiResponse(payload)) {
    throw new Error("Respuesta invalida del servidor");
  }

  return payload;
}
