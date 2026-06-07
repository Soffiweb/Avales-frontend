import { apiFetch } from "@/lib/api/client";
import type { Evento, EventoListResponse } from "@/types/evento";
import type { ApiResponse } from "@/types/api-response";
import type { CreateEventoPayload, EventoItemPayload } from "@/lib/validation/evento";

export type ListEventosOptions = {
  page?: number;
  limit?: number;
  estado?: string;
  search?: string;
  sinAval?: boolean;
  disciplinaId?: number;
};

export type EventsPagination = {
  page?: number;
  limit?: number;
  total?: number;
  lastPage?: number;
  current_page?: number;
  per_page?: number;
  last_page?: number;
};

export type ListEventosResponse = ApiResponse<EventoListResponse> & {
  pagination?: EventsPagination;
};

type EventoNestedPayload = {
  items?: Evento[];
  pagination?: EventsPagination;
};

type RawListEventosResponse = ApiResponse<Evento[] | EventoNestedPayload> & {
  pagination?: EventsPagination;
};

function normalizePagination(
  pagination?: EventsPagination
): EventsPagination | undefined {
  if (!pagination) return undefined;

  return {
    ...pagination,
    current_page: pagination.current_page ?? pagination.page,
    per_page: pagination.per_page ?? pagination.limit,
    last_page: pagination.last_page ?? pagination.lastPage,
  };
}

export async function listEventos(options: ListEventosOptions = {}) {
  const params = new URLSearchParams();

  if (options.page) params.set("page", String(options.page));
  if (options.limit) params.set("limit", String(options.limit));
  if (options.estado) params.set("estado", options.estado);
  if (options.search) params.set("search", options.search);
  if (options.sinAval !== undefined) params.set("sinAval", String(options.sinAval));
  if (options.disciplinaId !== undefined) {
    params.set("disciplinaId", String(options.disciplinaId));
  }

  const qs = params.toString();
  const url = qs ? `/events?${qs}` : "/events";

  const response = (await apiFetch<Evento[] | EventoNestedPayload>(url, {
    method: "GET",
  })) as RawListEventosResponse;

  const data = Array.isArray(response.data)
    ? response.data
    : (response.data?.items ?? []);
  const rawPagination = Array.isArray(response.data)
    ? response.pagination
    : response.data?.pagination ?? response.pagination;
  const pagination = normalizePagination(rawPagination);

  return {
    ...response,
    data,
    pagination,
    meta: response.meta
      ? {
          ...response.meta,
          page: pagination?.current_page ?? response.meta.page,
          limit: pagination?.per_page ?? response.meta.limit,
          total: pagination?.total ?? response.meta.total,
        }
      : response.meta,
  } as ListEventosResponse;
}

export async function getEvento(id: number) {
  return apiFetch<Evento>(`/events/${id}`, { method: "GET" });
}

export type GenerateEventoCodigoOptions = {
  nombre: string;
  mesProgramado: number;
  anio?: number;
};

export async function generateEventoCodigo(
  options: GenerateEventoCodigoOptions,
): Promise<{ codigo: string }> {
  const params = new URLSearchParams();
  params.set("nombre", options.nombre);
  params.set("mesProgramado", String(options.mesProgramado));
  if (options.anio !== undefined) {
    params.set("anio", String(options.anio));
  }

  const response = await apiFetch<{ codigo: string }>(
    `/events/generate-codigo?${params.toString()}`,
    { method: "GET" },
  );

  return response.data;
}

function appendEventoFormData(
  formData: FormData,
  values: CreateEventoPayload | UpdateEventoPayload,
  options: { includeEmptyEventoItems?: boolean } = {}
) {
  Object.entries(values).forEach(([key, value]) => {
    if (key === "eventoItems") return;
    if (value === undefined) return;
    formData.append(key, value === null ? "" : String(value));
  });

  if (values.eventoItems !== undefined) {
    const hasItems = values.eventoItems.length > 0;
    if (hasItems || options.includeEmptyEventoItems) {
      formData.append("eventoItems", JSON.stringify(values.eventoItems));
    }
  }
}

export async function createEvento(values: CreateEventoPayload, archivo?: File) {
  const formData = new FormData();
  appendEventoFormData(formData, values);
  if (archivo) {
    formData.append("archivo", archivo);
  }

  return apiFetch<Evento>("/events", {
    method: "POST",
    body: formData,
    headers: {},
  });
}

export type UpdateEventoPayload = {
  codigo?: string;
  tipoParticipacion?: string;
  tipoEvento?: string;
  nombre?: string;
  lugar?: string;
  genero?: "MASCULINO" | "FEMENINO" | "MASCULINO_FEMENINO";
  disciplinaId?: number;
  categoriaId?: number;
  mesProgramado?: number;
  provincia?: string;
  ciudad?: string;
  pais?: string;
  alcance?: string;
  fechaInicio?: string | null;
  fechaFin?: string | null;
  numEntrenadoresHombres?: number;
  numEntrenadoresMujeres?: number;
  numAtletasHombres?: number;
  numAtletasMujeres?: number;
  eventoItems?: EventoItemPayload[];
};

export type CompleteEventoDatosPayload = {
  genero?: "MASCULINO" | "FEMENINO" | "MASCULINO_FEMENINO";
  alcance?: string;
  tipoParticipacion?: string;
  categoriaId?: number;
  tipoEvento?: string;
};

export async function updateEvento(
  id: number,
  values: UpdateEventoPayload,
  archivo?: File
) {
  const cleanPayload = Object.fromEntries(
    Object.entries(values).filter(([, value]) => value !== undefined)
  );

  if (!Object.keys(cleanPayload).length) {
    throw new Error("Debes cambiar al menos un campo para actualizar el evento.");
  }

  if (archivo) {
    const formData = new FormData();
    Object.entries(cleanPayload).forEach(([key, value]) => {
      if (key === "eventoItems") {
        formData.append(key, JSON.stringify(value));
      } else {
        formData.append(key, value === null ? "" : String(value));
      }
    });
    formData.append("archivo", archivo);

    return apiFetch<Evento>(`/events/${id}`, {
      method: "PATCH",
      body: formData,
      headers: {},
    });
  }

  return apiFetch<Evento>(`/events/${id}`, {
    method: "PATCH",
    body: JSON.stringify(cleanPayload),
  });
}

export async function completeEventoDatos(
  id: number,
  values: CompleteEventoDatosPayload,
) {
  const cleanPayload = Object.fromEntries(
    Object.entries(values).filter(([, value]) => value !== undefined)
  ) as CompleteEventoDatosPayload;

  if (!Object.keys(cleanPayload).length) {
    throw new Error("No hay datos pendientes por completar.");
  }

  return apiFetch<Evento>(`/events/${id}/completar-datos`, {
    method: "PATCH",
    body: JSON.stringify(cleanPayload),
  });
}

export async function softDeleteEvento(id: number) {
  return apiFetch<{ id: number }>(`/events/${id}`, { method: "DELETE" });
}

export async function restoreEvento(id: number) {
  return apiFetch<Evento>(`/events/${id}/restore`, { method: "PATCH" });
}

export type EventoReformaListItem = {
  id: number;
  estado: "PENDIENTE" | "APROBADA" | "RECHAZADA" | string;
  motivo: string;
  observacion?: string | null;
  createdAt: string;
  reviewedAt?: string | null;
  solicitante?: {
    id: number;
    nombre?: string | null;
    apellido?: string | null;
    email?: string | null;
  } | null;
  aprobador?: {
    id: number;
    nombre?: string | null;
    apellido?: string | null;
    email?: string | null;
  } | null;
  versionBaseId?: number | null;
  versionAprobadaId?: number | null;
};

export async function listEventoReforms(eventoId: number) {
  return apiFetch<EventoReformaListItem[]>(`/events/${eventoId}/reforms`, {
    method: "GET",
  });
}

export type EventoVersionListItem = {
  id: number;
  eventoId: number;
  version: number;
  createdAt: string;
  motivo?: string | null;
  estado?: string | null;
  data?: unknown;
  items?: unknown;
};

export async function listEventoVersions(eventoId: number) {
  return apiFetch<EventoVersionListItem[]>(`/events/${eventoId}/versions`, {
    method: "GET",
  });
}

export type UploadExcelResponse = {
  procesados: number;
  creados: string[];
  errores: { fila: number; error: string }[];
};

export async function uploadEventsExcel(file: File) {
  const formData = new FormData();
  formData.append("file", file);

  return apiFetch<UploadExcelResponse>("/events/upload-excel", {
    method: "POST",
    body: formData,
    headers: {},
  });
}
