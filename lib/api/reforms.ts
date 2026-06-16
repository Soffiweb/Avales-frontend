import { apiFetch } from "@/lib/api/client";
import type { CatalogItem } from "@/types/catalog";
import type { EventoEstado } from "@/types/evento";
import type { TipoAval } from "@/types/aval";

export type TipoReforma = "DATOS_INFORMATIVOS" | "PRESUPUESTO" | "MIXTA";

export type ReformEventoItemPayload = {
  itemId: number;
  mes: number;
  presupuesto: number;
};

export type ReformFormaParticipacionChanges = {
  tipoAval: TipoAval;
  numEntrenadoresHombres: number;
  numEntrenadoresMujeres: number;
  numAtletasHombres: number;
  numAtletasMujeres: number;
  items?: ReformEventoItemPayload[];
};

export type ReformChangesDto = {
  codigo?: string;
  tipoParticipacion?: string;
  tipoEvento?: string;
  nombre?: string;
  lugar?: string;
  genero?: string;
  disciplinaId?: number;
  categoriaId?: number;
  provincia?: string;
  ciudad?: string;
  pais?: string;
  alcance?: string;
  mesProgramado?: number;
  fechaInicio?: string;
  fechaFin?: string;
  cargadoPorExcel?: boolean;
  formasParticipacion?: ReformFormaParticipacionChanges[];
};

export type CreateReformPayload = {
  eventoId: number;
  versionBaseId?: number;
  motivo: string;
  observacion?: string;
  mesEjecucion: number;
  cambiosPropuestos: ReformChangesDto;
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

export type ReformFormaParticipacionComparison = {
  tipoAval?: string | null;
  antesNumAtletas?: number | null;
  despuesNumAtletas?: number | null;
  antesNumEntrenadores?: number | null;
  despuesNumEntrenadores?: number | null;
  antesPresupuestoTotal?: number | null;
  despuesPresupuestoTotal?: number | null;
  items?: ReformItemComparison[];
};

export type ReformComparison = {
  campos?: ReformFieldComparison[];
  eventoItems?: ReformItemComparison[];
  formasParticipacion?: ReformFormaParticipacionComparison[];
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
    disciplina?: CatalogItem | null;
  };
  solicitante?: {
    id: number;
    nombre?: string | null;
    apellido?: string | null;
    email?: string | null;
  } | null;
  createdAt?: string;
  reviewedAt?: string | null;
};

export type ListReformsOptions = {
  tipo?: TipoReforma;
};

export async function createReform(payload: CreateReformPayload) {
  console.log("[API createReform] payload:", JSON.stringify(payload, null, 2));
  return apiFetch<ReformResponse>("/reforms", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function aprobarReform(
  id: number,
  payload?: { usuarioId?: number },
) {
  console.log("[API aprobarReform] id:", id, "payload:", JSON.stringify(payload));
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
