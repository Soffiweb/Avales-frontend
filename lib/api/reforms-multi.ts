import { apiFetch, ensureFreshAccessToken } from "@/lib/api/client";
import type {
  ReformaMultiSummary,
  ReformaMultiDetail,
  ListReformasMultiQuery,
  CreateReformaMultiPayload,
  EventoDisponibleReformaMulti,
  ListEventosDisponiblesReformaMultiQuery,
} from "@/types/reforma-multi";

function getFilenameFromContentDisposition(
  contentDisposition: string | null,
): string | null {
  if (!contentDisposition) return null;

  const utf8Match = contentDisposition.match(/filename\*\s*=\s*UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1].replace(/(^"|"$)/g, ""));
    } catch {
      return utf8Match[1].replace(/(^"|"$)/g, "");
    }
  }

  const filenameMatch = contentDisposition.match(/filename\s*=\s*([^;]+)/i);
  if (!filenameMatch?.[1]) return null;

  return filenameMatch[1].trim().replace(/^"|"$/g, "");
}

function triggerBrowserDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function extractBlobErrorMessage(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const payload = await response.json().catch(() => null);
    if (payload && typeof payload === "object") {
      const message =
        "message" in payload && typeof payload.message === "string"
          ? payload.message
          : "detail" in payload && typeof payload.detail === "string"
            ? payload.detail
            : null;
      if (message) return message;
    }
  }

  if (contentType.startsWith("text/")) {
    const text = await response.text().catch(() => "");
    if (text.trim()) return text.trim();
  }

  return `Error (${response.status})`;
}

export async function listReformasMulti(query: ListReformasMultiQuery = {}) {
  const params = new URLSearchParams();
  if (query.page) params.set("page", String(query.page));
  if (query.limit) params.set("limit", String(query.limit));
  if (query.estado) params.set("estado", query.estado);
  if (query.mesEjecucion) params.set("mesEjecucion", String(query.mesEjecucion));
  if (query.search) params.set("search", query.search);

  const qs = params.toString();
  const url = qs ? `/reforms-multi?${qs}` : "/reforms-multi";

  return apiFetch<ReformaMultiSummary[]>(url, { method: "GET" });
}

export async function getReformaMulti(id: number) {
  return apiFetch<ReformaMultiDetail>(`/reforms-multi/${id}`, { method: "GET" });
}

export async function downloadReformaMultiExcel(id: number) {
  const accessToken = await ensureFreshAccessToken();
  const headers = new Headers();

  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  const response = await fetch(`/api/v1/reforms-multi/${id}/excel`, {
    method: "GET",
    credentials: "include",
    headers,
  });

  if (!response.ok) {
    throw new Error(await extractBlobErrorMessage(response));
  }

  const blob = await response.blob();
  const filename =
    getFilenameFromContentDisposition(
      response.headers.get("content-disposition"),
    ) ?? `reforma-multi-${id}.xlsx`;

  triggerBrowserDownload(blob, filename);
}

export async function getEventosDisponiblesReformaMulti(
  query: ListEventosDisponiblesReformaMultiQuery,
) {
  const params = new URLSearchParams();
  params.set("fuente", query.fuente);
  if (query.search) params.set("search", query.search);
  if (query.disciplinaId !== undefined) {
    params.set("disciplinaId", String(query.disciplinaId));
  }

  return apiFetch<EventoDisponibleReformaMulti[]>(
    `/reforms-multi/eventos-disponibles?${params.toString()}`,
    { method: "GET" },
  );
}

export async function createReformaMulti(payload: CreateReformaMultiPayload) {
  return apiFetch<ReformaMultiDetail>("/reforms-multi", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function aprobarReformaMulti(id: number) {
  return apiFetch<ReformaMultiDetail>(`/reforms-multi/${id}/aprobar`, {
    method: "PATCH",
  });
}

export async function rechazarReformaMulti(id: number, observacion: string) {
  return apiFetch<ReformaMultiDetail>(`/reforms-multi/${id}/rechazar`, {
    method: "PATCH",
    body: JSON.stringify({ observacion }),
  });
}

export const ESTADO_REFORMA_MULTI_LABELS: Record<string, string> = {
  PENDIENTE: "Pendiente",
  APROBADA: "Aprobada",
  RECHAZADA: "Rechazada",
};

export const FUENTE_REFORMA_LABELS: Record<string, string> = {
  FONDOS_PUBLICOS: "Fondos Públicos",
  AUTOGESTION: "Autogestión",
};

export const MES_NOMBRES: Record<number, string> = {
  1: "Enero",
  2: "Febrero",
  3: "Marzo",
  4: "Abril",
  5: "Mayo",
  6: "Junio",
  7: "Julio",
  8: "Agosto",
  9: "Septiembre",
  10: "Octubre",
  11: "Noviembre",
  12: "Diciembre",
};

export const MES_OPCIONES = Array.from({ length: 12 }, (_, i) => ({
  value: i + 1,
  label: MES_NOMBRES[i + 1],
}));

export const ERROR_CODE_MESSAGES: Record<string, string> = {
  REFORMA_MULTI_NOT_FOUND: "La reforma no fue encontrada.",
  REFORMA_MULTI_NOT_PENDING: "La reforma no está en estado pendiente.",
  REFORMA_MULTI_ALREADY_APPROVED: "La reforma ya fue aprobada.",
  REFORMA_MULTI_SUM_MISMATCH:
    "La suma de montos de origen no coincide con la de destino.",
  REFORMA_MULTI_MIXED_SOURCE:
    "Todos los eventos deben tener la misma fuente presupuestaria.",
  REFORMA_MULTI_ORIGEN_LOCKED:
    "Uno o más eventos de origen están bloqueados por otra reforma pendiente.",
  REFORMA_MULTI_INSUFFICIENT_FUNDS:
    "Fondos insuficientes en uno o más eventos de origen.",
  REFORMA_MULTI_BELOW_COMMITTED:
    "El corte dejaría el presupuesto por debajo del monto comprometido.",
  REFORMA_MULTI_PERMISSION:
    "No tienes permiso para realizar esta operación.",
  REFORMA_MULTI_REJECTION_REASON_REQUIRED:
    "Debes indicar una observación para el rechazo.",
};

export function getErrorMessage(
  err: unknown,
  fallback = "Ocurrió un error inesperado.",
): string {
  if (err instanceof Error) {
    const code = (err as Error & { problem?: { errorCode?: string } }).problem
      ?.errorCode;
    if (code && ERROR_CODE_MESSAGES[code]) {
      return ERROR_CODE_MESSAGES[code];
    }
    return err.message || fallback;
  }
  return fallback;
}
