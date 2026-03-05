import { apiFetch } from "@/lib/api/client";
import type { Deportista, DeportistaListResponse } from "@/types/deportista";
import type { ApiResponse } from "@/types/api-response";

export type ListDeportistasOptions = {
  genero?: string;
  query?: string;
  page?: number;
  limit?: number;
};

type SoffimedhDeportista = {
  id: number;
  name: string;
  cedula: string;
  gender?: string | null;
  phone?: string | null;
  birthdate?: string | null;
  deporte?: string | null;
  fecha_afiliacion?: string | null;
};

type SoffimedhPagination = {
  page?: number;
  limit?: number;
  lastPage?: number;
  hasNext?: boolean;
  hasPrev?: boolean;
  current_page?: number;
  per_page?: number;
  total?: number;
  last_page?: number;
  has_next?: boolean;
  has_prev?: boolean;
};

export type ListDeportistasResponse = ApiResponse<DeportistaListResponse> & {
  pagination?: SoffimedhPagination;
};

type SoffimedhNestedPayload = {
  items?: SoffimedhDeportista[];
  pagination?: SoffimedhPagination;
};

type SoffimedhRawResponse = ApiResponse<
  SoffimedhDeportista[] | SoffimedhNestedPayload
> & {
  pagination?: SoffimedhPagination;
};

function splitName(name: string) {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length <= 1) {
    return { nombres: parts[0] ?? "", apellidos: "" };
  }

  if (parts.length === 2) {
    return { apellidos: parts[0], nombres: parts[1] };
  }

  if (parts.length === 3) {
    return { apellidos: parts[0], nombres: `${parts[1]} ${parts[2]}` };
  }

  return {
    apellidos: `${parts[0]} ${parts[1]}`,
    nombres: parts.slice(2).join(" "),
  };
}

function mapGenero(gender?: string | null) {
  if (!gender) return undefined;
  const value = gender.toUpperCase();
  if (value === "F" || value === "FEMENINO") return "FEMENINO";
  if (value === "M" || value === "MASCULINO") return "MASCULINO";
  if (value === "O" || value === "OTRO") return "OTRO";
  return value;
}

function mapSoffimedhDeportista(item: SoffimedhDeportista): Deportista {
  const { nombres, apellidos } = splitName(item.name ?? "");

  return {
    id: item.id,
    nombres,
    apellidos,
    cedula: item.cedula ?? "",
    fechaNacimiento: item.birthdate ?? undefined,
    genero: mapGenero(item.gender),
    disciplina: item.deporte
      ? { id: 0, nombre: item.deporte }
      : undefined,
    afiliacion: Boolean(item.fecha_afiliacion),
    afiliacionInicio: item.fecha_afiliacion ?? null,
    afiliacionFin: null,
  };
}

function mapGeneroParam(genero?: string) {
  if (!genero) return undefined;
  const value = genero.toUpperCase();
  if (value === "F" || value === "FEMENINO") return "F";
  if (value === "M" || value === "MASCULINO") return "M";
  return genero;
}

function normalizePagination(
  pagination?: SoffimedhPagination
): SoffimedhPagination | undefined {
  if (!pagination) return undefined;

  return {
    ...pagination,
    current_page: pagination.current_page ?? pagination.page,
    per_page: pagination.per_page ?? pagination.limit,
    last_page: pagination.last_page ?? pagination.lastPage,
    has_next: pagination.has_next ?? pagination.hasNext,
    has_prev: pagination.has_prev ?? pagination.hasPrev,
  };
}

export async function listDeportistas(
  options: ListDeportistasOptions = {}
): Promise<ListDeportistasResponse> {
  const params = new URLSearchParams();

  const genero = mapGeneroParam(options.genero);

  if (genero) params.set("genero", genero);
  if (options.query) params.set("query", options.query);
  if (options.page) params.set("page", String(options.page));
  if (options.limit) params.set("limit", String(options.limit));

  const qs = params.toString();
  const url = qs
    ? `/soffimedh/deportistas?${qs}`
    : "/soffimedh/deportistas";

  const response = (await apiFetch<SoffimedhDeportista[] | SoffimedhNestedPayload>(
    url,
    {
    method: "GET",
  })) as SoffimedhRawResponse;

  const rawItems = Array.isArray(response.data)
    ? response.data
    : (response.data?.items ?? []);
  const rawPagination = Array.isArray(response.data)
    ? response.pagination
    : response.data?.pagination ?? response.pagination;

  const mappedData: DeportistaListResponse = rawItems.map(mapSoffimedhDeportista);
  const normalizedPagination = normalizePagination(rawPagination);

  return {
    ...response,
    data: mappedData,
    pagination: normalizedPagination,
    meta: response.meta
      ? {
          ...response.meta,
          page: normalizedPagination?.current_page ?? response.meta.page,
          limit: normalizedPagination?.per_page ?? response.meta.limit,
          total: normalizedPagination?.total ?? response.meta.total,
        }
      : response.meta,
  };
}

function unsupportedOperationError(operation: string) {
  return new Error(
    `${operation} no está disponible con la integración Soffimedh de deportistas.`
  );
}

export async function createDeportista(
  _values: unknown
): Promise<ApiResponse<Deportista>> {
  throw unsupportedOperationError("Crear deportista");
}

export async function getDeportista(
  _id: number
): Promise<ApiResponse<Deportista>> {
  throw unsupportedOperationError("Consultar deportista por ID");
}

export type UpdateDeportistaPayload = unknown;

export async function updateDeportista(
  _id: number,
  _values: UpdateDeportistaPayload
): Promise<ApiResponse<Deportista>> {
  throw unsupportedOperationError("Actualizar deportista");
}

export async function softDeleteDeportista(_id: number) {
  throw unsupportedOperationError("Eliminar deportista");
}

export async function restoreDeportista(_id: number) {
  throw unsupportedOperationError("Restaurar deportista");
}

export async function hardDeleteDeportista(_id: number) {
  throw unsupportedOperationError("Eliminar permanentemente deportista");
}

export async function getDeportistaByCedula(cedula: string) {
  const trimmedCedula = cedula.trim();
  if (!trimmedCedula) {
    throw new Error("La cédula es requerida.");
  }

  const res = await listDeportistas({ query: trimmedCedula, limit: 50, page: 1 });
  const found = (res.data ?? []).find((item) => item.cedula === trimmedCedula);

  if (!found) {
    throw new Error("Deportista no encontrado.");
  }

  return {
    ...res,
    data: found,
  } as ApiResponse<Deportista>;
}
