import { apiFetch, ensureFreshAccessToken } from '@/lib/api/client';
import type { Estado, EtapaFlujo, TipoAval } from '@/types/aval';

export type AvalReportRow = {
  id: number;
  numeroAval: string;
  tipoAval: TipoAval;
  estado: Estado;
  etapaActual: EtapaFlujo;
  fechaEmision: string | null;
  fechaRegistro: string;
  fechaAprobacionFinal: string | null;
  codigoEvento: string;
  nombreEvento: string;
  disciplina: string;
  categoria: string | null;
  provincia: string | null;
  ciudad: string | null;
  pais: string;
  fechaInicioEvento: string | null;
  fechaFinEvento: string | null;
  numeroDeportistas: number;
  numeroEntrenadores: number;
  montoSolicitado: string;
  montoAutorizado: string;
  montoEjecutado: string;
  baseCalculoHonorario: string;
  honorarioCalculado: string;
  esHistorico: boolean;
  esCobrable: boolean;
  motivoExclusion: string | null;
};

export type AvalReportsSummary = {
  totalAvales: number;
  avalesCobrables: number;
  avalesPendientes: number;
  avalesHistoricosExcluidos: number;
  avalesFondosPublicos: number;
  avalesAutogestion: number;
  avalesSoloResultado: number;
  montoAutorizadoTotal: string;
  montoEjecutadoTotal: string;
  honorarioTotal: string;
};

export type AvalReportsResponse = {
  cobrables: AvalReportRow[];
  pendientes: AvalReportRow[];
  historicos: AvalReportRow[];
  resumen: AvalReportsSummary;
  advertenciaMontoEjecutado: string | null;
};

export async function getAvalReports(fechaInicio: string, fechaFin: string) {
  const params = new URLSearchParams({ fechaInicio, fechaFin });
  return apiFetch<AvalReportsResponse>(`/reports/avales?${params.toString()}`, {
    method: 'GET',
  });
}

type AvalReportFile = 'excel' | 'pdf';

function getFilename(contentDisposition: string | null, fallback: string) {
  const match = contentDisposition?.match(/filename\*?=(?:UTF-8'')?([^;]+)/i);
  if (!match?.[1]) return fallback;

  try {
    return decodeURIComponent(match[1].trim().replace(/^"|"$/g, ''));
  } catch {
    return match[1].trim().replace(/^"|"$/g, '');
  }
}

async function getDownloadError(response: Response) {
  const payload = await response.json().catch(() => null);
  if (payload && typeof payload === 'object' && 'message' in payload) {
    const message = (payload as { message?: unknown }).message;
    if (typeof message === 'string') return message;
  }
  return `Error (${response.status})`;
}

export async function downloadAvalReport(
  format: AvalReportFile,
  fechaInicio: string,
  fechaFin: string,
) {
  const params = new URLSearchParams({ fechaInicio, fechaFin });
  const token = await ensureFreshAccessToken();
  const headers = new Headers();
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const response = await fetch(`/api/v1/reports/avales/${format}?${params}`, {
    credentials: 'include',
    headers,
  });

  if (!response.ok) throw new Error(await getDownloadError(response));

  const blob = await response.blob();
  const extension = format === 'excel' ? 'xlsx' : 'pdf';
  const fallback = `reportes-avales-${fechaInicio}-${fechaFin}.${extension}`;
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = getFilename(
    response.headers.get('content-disposition'),
    fallback,
  );
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
