import { apiFetch } from '@/lib/api/client';
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
