import { apiFetch } from "@/lib/api/client";
import type {
  RegistroError,
  ReporteProblema,
  EstadoReporte,
  CrearReportePayload,
  RegistroErrorFiltros,
  ReporteFiltros,
} from "@/types/monitoreo";
import type { ApiResponse } from "@/types/api-response";

export async function reportarProblema(
  dto: CrearReportePayload
): Promise<ApiResponse<ReporteProblema>> {
  return apiFetch<ReporteProblema>("/monitoreo/reporte", {
    method: "POST",
    body: JSON.stringify(dto),
  });
}

export async function getRegistrosError(
  filtros: RegistroErrorFiltros = {}
): Promise<ApiResponse<RegistroError[]>> {
  const params = new URLSearchParams();
  if (filtros.page) params.set("page", String(filtros.page));
  if (filtros.limit) params.set("limit", String(filtros.limit));
  if (filtros.requestId) params.set("requestId", filtros.requestId);
  if (filtros.desde) params.set("desde", filtros.desde);
  if (filtros.hasta) params.set("hasta", filtros.hasta);

  const qs = params.toString();
  return apiFetch<RegistroError[]>(qs ? `/monitoreo/errores?${qs}` : "/monitoreo/errores", {
    method: "GET",
  });
}

export async function getReportesProblema(
  filtros: ReporteFiltros = {}
): Promise<ApiResponse<ReporteProblema[]>> {
  const params = new URLSearchParams();
  if (filtros.page) params.set("page", String(filtros.page));
  if (filtros.limit) params.set("limit", String(filtros.limit));
  if (filtros.requestId) params.set("requestId", filtros.requestId);
  if (filtros.estado) params.set("estado", filtros.estado);
  if (filtros.desde) params.set("desde", filtros.desde);
  if (filtros.hasta) params.set("hasta", filtros.hasta);

  const qs = params.toString();
  return apiFetch<ReporteProblema[]>(qs ? `/monitoreo/reportes?${qs}` : "/monitoreo/reportes", {
    method: "GET",
  });
}

export async function actualizarEstadoReporte(
  id: number,
  estado: EstadoReporte
): Promise<ApiResponse<ReporteProblema>> {
  return apiFetch<ReporteProblema>(`/monitoreo/reportes/${id}/estado`, {
    method: "PATCH",
    body: JSON.stringify({ estado }),
  });
}
