import { apiFetch } from "@/lib/api/client";
import type { EventoEstado } from "@/types/evento";

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
  motivo: string;
  observacion?: string | null;
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
};

export async function createReform(payload: CreateReformPayload) {
  return apiFetch<ReformResponse>("/reforms", {
    method: "POST",
    body: JSON.stringify(payload),
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

export async function listReforms() {
  return apiFetch<ReformResponse[]>("/reforms", {
    method: "GET",
  });
}

export async function getReform(id: number) {
  return apiFetch<ReformResponse>(`/reforms/${id}`, {
    method: "GET",
  });
}
