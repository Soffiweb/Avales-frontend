import { apiFetch } from "@/lib/api/client";
import type { EventoEstado } from "@/types/evento";

export type TipoReforma = "DATOS_INFORMATIVOS" | "PRESUPUESTO" | "MIXTA";

export type ReformEventoItemPayload = {
  itemId: number;
  mes: number;
  presupuesto: number;
};

export type CreateReformPayload = {
  eventoId: number;
  versionBaseId?: number;
  motivo: string;
  observacion?: string;
  mesEjecucion: number;
  cambiosPropuestos: Record<string, unknown> & {
    eventoItems?: ReformEventoItemPayload[];
  };
};

export type ReformReadableField = {
  campo: string;
  etiqueta: string;
  valor?: unknown;
};

export type ReformReadableEventoItem = {
  itemId: number;
  itemNumero?: number | null;
  itemNombre?: string | null;
  mes: number;
  mesNombre: string;
  presupuesto: number;
};

export type ReformReadableChanges = {
  campos?: ReformReadableField[];
  eventoItems?: ReformReadableEventoItem[];
};

export type ReformFieldComparison = {
  campo: string;
  etiqueta: string;
  antes?: string | null;
  despues?: string | null;
};

export type ReformItemComparison = {
  itemId: number;
  itemNumero?: number | null;
  itemNombre?: string | null;
  mes: number;
  mesNombre: string;
  antesPresupuesto?: number | null;
  despuesPresupuesto?: number | null;
  diferencia?: number | null;
  tipoCambio: "AGREGADO" | "ACTUALIZADO" | "ELIMINADO";
};

export type ReformComparison = {
  campos?: ReformFieldComparison[];
  eventoItems?: ReformItemComparison[];
};

export type ReformResponse = {
  id: number;
  estado: string;
  eventoId: number;
  versionBaseId?: number | null;
  versionAprobadaId?: number | null;
  motivo: string;
  observacion?: string | null;
  mesEjecucion: number;
  tipo: TipoReforma;
  cambiosPropuestos: Record<string, unknown>;
  cambiosPropuestosLegibles?: ReformReadableChanges;
  comparacion?: ReformComparison;
  evento?: {
    id: number;
    codigo?: string | null;
    nombre: string;
    estado?: EventoEstado | null;
  };
  createdAt?: string;
  reviewedAt?: string | null;
};

export type ListReformsOptions = {
  tipo?: TipoReforma;
};

export async function createReform(payload: CreateReformPayload) {
  return apiFetch<ReformResponse>("/reforms", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function aprobarReform(
  id: number,
  payload?: { usuarioId?: number },
) {
  return apiFetch<ReformResponse>(`/reforms/${id}/aprobar`, {
    method: "PATCH",
    body: payload ? JSON.stringify(payload) : undefined,
  });
}

export async function rechazarReform(
  id: number,
  observacion: string,
) {
  return apiFetch<ReformResponse>(`/reforms/${id}/rechazar`, {
    method: "PATCH",
    body: JSON.stringify({ observacion }),
  });
}

export async function listReformsByEvento(eventoId: number, estado?: string) {
  const params = new URLSearchParams();
  params.set("eventoId", String(eventoId));
  if (estado) params.set("estado", estado);

  return apiFetch<ReformResponse[]>(`/reforms?${params.toString()}`, {
    method: "GET",
  });
}

export async function listReforms(options: ListReformsOptions = {}) {
  const params = new URLSearchParams();
  if (options.tipo) params.set("tipo", options.tipo);

  const query = params.toString();
  const url = query ? `/reforms?${query}` : "/reforms";

  return apiFetch<ReformResponse[]>(url, {
    method: "GET",
  });
}

export const TIPO_REFORMA_LABELS: Record<TipoReforma, string> = {
  DATOS_INFORMATIVOS: "Datos informativos",
  PRESUPUESTO: "Presupuesto",
  MIXTA: "Mixta",
};

export const TIPO_REFORMA_OPTIONS: { value: TipoReforma; label: string }[] = [
  { value: "DATOS_INFORMATIVOS", label: TIPO_REFORMA_LABELS.DATOS_INFORMATIVOS },
  { value: "PRESUPUESTO", label: TIPO_REFORMA_LABELS.PRESUPUESTO },
  { value: "MIXTA", label: TIPO_REFORMA_LABELS.MIXTA },
];

export async function getReform(id: number) {
  return apiFetch<ReformResponse>(`/reforms/${id}`, {
    method: "GET",
  });
}
