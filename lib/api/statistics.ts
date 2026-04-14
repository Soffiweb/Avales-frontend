import { apiFetch } from "@/lib/api/client";
import { listDeportistas } from "@/lib/api/deportistas";

export type StatisticsQuery = {
  fechaInicio?: string;
  fechaFin?: string;
  disciplinaCodigo?: string;
  categoriaId?: number;
};

export type CountItem = {
  label: string;
  value: number;
  color?: string;
};

export type DashboardStats = {
  totalAvales: number;
  avalesPendientes: number;
  avalesAprobados: number;
  avalesRechazados: number;
  totalEventos: number;
  totalDeportistas: number;
  totalEntrenadores: number;
};

export type DistributionStats = {
  total: number;
  items: CountItem[];
};

export type TimelineItem = {
  mes: string;
  label: string;
  creados: number;
  aprobados: number;
  rechazados: number;
};

export type TimelineStats = {
  items: TimelineItem[];
};

export type AllStatistics = {
  dashboard: DashboardStats;
  porEstado: DistributionStats;
  porEtapa: DistributionStats;
  porDisciplina: DistributionStats;
  porCategoria: DistributionStats;
};

export async function getDashboardStats() {
  return apiFetch<DashboardStats>("/statistics/dashboard");
}

export async function getAvalesPorEstado(query?: StatisticsQuery) {
  const params = new URLSearchParams();
  if (query?.fechaInicio) params.set("fechaInicio", query.fechaInicio);
  if (query?.fechaFin) params.set("fechaFin", query.fechaFin);
  if (query?.disciplinaCodigo) params.set("disciplinaCodigo", query.disciplinaCodigo);
  if (query?.categoriaId) params.set("categoriaId", String(query.categoriaId));
  const qs = params.toString();
  
  return apiFetch<DistributionStats>(qs ? `/statistics/avales/por-estado?${qs}` : "/statistics/avales/por-estado");
}

export async function getAvalesPorEtapa(query?: StatisticsQuery) {
  const params = new URLSearchParams();
  if (query?.fechaInicio) params.set("fechaInicio", query.fechaInicio);
  if (query?.fechaFin) params.set("fechaFin", query.fechaFin);
  if (query?.disciplinaCodigo) params.set("disciplinaCodigo", query.disciplinaCodigo);
  if (query?.categoriaId) params.set("categoriaId", String(query.categoriaId));
  const qs = params.toString();

  return apiFetch<DistributionStats>(qs ? `/statistics/avales/por-etapa?${qs}` : "/statistics/avales/por-etapa");
}

export async function getAvalesTimeline(meses = 12) {
  return apiFetch<TimelineStats>(`/statistics/avales/timeline?meses=${meses}`);
}

export async function getAvalesPorDisciplina(query?: StatisticsQuery) {
  const params = new URLSearchParams();
  if (query?.fechaInicio) params.set("fechaInicio", query.fechaInicio);
  if (query?.fechaFin) params.set("fechaFin", query.fechaFin);
  const qs = params.toString();

  return apiFetch<DistributionStats>(qs ? `/statistics/avales/por-disciplina?${qs}` : "/statistics/avales/por-disciplina");
}

export async function getAllStatistics(query?: StatisticsQuery) {
  const params = new URLSearchParams();
  if (query?.fechaInicio) params.set("fechaInicio", query.fechaInicio);
  if (query?.fechaFin) params.set("fechaFin", query.fechaFin);
  if (query?.disciplinaCodigo) params.set("disciplinaCodigo", query.disciplinaCodigo);
  if (query?.categoriaId) params.set("categoriaId", String(query.categoriaId));
  const qs = params.toString();

  return apiFetch<AllStatistics>(qs ? `/statistics?${qs}` : "/statistics");
}

export type PresupuestoMesItem = {
  label: string;
  mes: number;
  value: number;
};

export type PresupuestoStats = {
  resumen: {
    totalPresupuesto: number;
    totalEventosConPresupuesto: number;
  };
  porMes: { items: PresupuestoMesItem[]; total: number };
  porDisciplina: { items: CountItem[]; total: number };
  porItem: { items: CountItem[]; total: number };
};

export async function getPresupuestoStats() {
  return apiFetch<PresupuestoStats>("/statistics/presupuesto");
}

export async function getTotalDeportistasFromSoffimedh() {
  const res = await listDeportistas({ page: 1, limit: 1 });
  const pagination = res.pagination;
  const total = pagination?.total ?? res.meta?.total;

  if (typeof total === "number" && total >= 0) {
    return total;
  }

  return null;
}
