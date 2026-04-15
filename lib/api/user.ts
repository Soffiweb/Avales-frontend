import { apiFetch } from "@/lib/api/client";
import type { User, UserListResponse } from "@/types/user";
import type { ApiResponse } from "@/types/api-response";
import type {
  ProfileFormValues,
  CreateUserFormValues,
  UpdateUserFormValues,
} from "@/lib/validation/user";

type UserMutationValues = {
  categoriaId?: number;
  disciplinaId?: number;
  disciplinaIds?: number[];
  password?: string;
};

function normalizeUserPayload(values: UserMutationValues) {
  const payload: Record<string, unknown> = {
    ...values,
  };

  if (typeof payload.password === "string") {
    const password = payload.password.trim();
    if (password) {
      payload.password = password;
    } else {
      delete payload.password;
    }
  }

  const disciplinaIds = Array.isArray(values.disciplinaIds)
    ? values.disciplinaIds.filter((value) => Number.isFinite(value))
    : [];

  if (disciplinaIds.length === 1 && values.disciplinaId == null) {
    payload.disciplinaId = disciplinaIds[0];
    delete payload.disciplinaIds;
  } else if (disciplinaIds.length > 1) {
    payload.disciplinaIds = disciplinaIds;
    delete payload.disciplinaId;
  } else {
    delete payload.disciplinaIds;
    if (values.disciplinaId == null) {
      delete payload.disciplinaId;
    }
  }

  return payload;
}

export type ListUsersOptions = {
  query?: string;
  page?: number;
  limit?: number;
  rol?: string;
  genero?: string;
};

export type DirigidoRole =
  | "PDA"
  | "COMPRAS_PUBLICAS"
  | "METODOLOGO"
  | "DTM"
  | "ADMIN"
  | "ADMINISTRADOR"
  | "SUPER_ADMIN"
  | "SUPERADMIN";

export type DirigidoResponse = {
  nombre: string;
  apellido: string;
  cargo: string;
};

export type ListEntrenadoresOptions = {
  page?: number;
  limit?: number;
  genero?: string;
};

export type UsersPagination = {
  page?: number;
  limit?: number;
  total?: number;
  lastPage?: number;
  current_page?: number;
  per_page?: number;
  last_page?: number;
};

export type ListUsersResponse = ApiResponse<UserListResponse> & {
  pagination?: UsersPagination;
};

export async function listUsers(options: ListUsersOptions = {}) {
  const params = new URLSearchParams();

  if (options.query) params.set("query", options.query);
  if (options.page) params.set("page", String(options.page));
  if (options.limit) params.set("limit", String(options.limit));
  if (options.rol) params.set("rol", options.rol);
  if (options.genero) params.set("genero", options.genero);

  const qs = params.toString();
  const url = qs ? `/users?${qs}` : "/users";

  return apiFetch<UserListResponse>(url, {
    method: "GET",
  }) as Promise<ListUsersResponse>;
}

export async function getDirigido(role: DirigidoRole) {
  const params = new URLSearchParams();
  params.set("role", role);
  return apiFetch<DirigidoResponse>(`/users/dirigidos?${params.toString()}`, {
    method: "GET",
  });
}

export async function listEntrenadores(options: ListEntrenadoresOptions = {}) {
  const params = new URLSearchParams();

  if (options.page) params.set("page", String(options.page));
  if (options.limit) params.set("limit", String(options.limit));
  if (options.genero) params.set("genero", options.genero);

  const qs = params.toString();
  const url = qs ? `/users/entrenadores?${qs}` : "/users/entrenadores";

  return apiFetch<UserListResponse>(url, { method: "GET" });
}

export async function getUser(id: number) {
  return apiFetch<User>(`/users/${id}`, { method: "GET" });
}

export async function createUser(values: CreateUserFormValues) {
  return apiFetch<User>("/users/create", {
    method: "POST",
    body: JSON.stringify(normalizeUserPayload(values)),
  });
}

export async function updateUser(
  id: number,
  values: UpdateUserFormValues
) {
  return apiFetch<User>(`/users/${id}`, {
    method: "PATCH",
    body: JSON.stringify(normalizeUserPayload(values)),
  });
}

export async function softDeleteUser(id: number) {
  return apiFetch<{ id: number }>(`/users/${id}`, { method: "DELETE" });
}

export async function restoreUser(id: number) {
  return apiFetch<User>(`/users/${id}/restore`, { method: "POST" });
}

export async function listDeletedUsers() {
  return apiFetch<User[]>("/users/deleted", { method: "GET" });
}

export async function updateProfile(values: ProfileFormValues) {
  return apiFetch<User>("/users/profile", {
    method: "PATCH",
    body: JSON.stringify(normalizeUserPayload(values)),
  });
}

export async function updatePushToken(pushToken: string) {
  return apiFetch<User>("/users/me/push-token", {
    method: "PATCH",
    body: JSON.stringify({ pushToken }),
  });
}

export type CheckCedulasResponse = Record<
  string,
  { nombre: string; apellido: string }
>;

export async function checkCedulas(cedulas: string[]) {
  return apiFetch<CheckCedulasResponse>("/users/check-cedulas", {
    method: "POST",
    body: JSON.stringify({ cedulas }),
  });
}

export type UploadUsersExcelResponse = {
  procesados: number;
  creados: string[];
  actualizados: string[];
  errores: { fila: number; error: string }[];
  disciplinasCreadas?: string[];
};

export async function uploadUsersExcel(file: File) {
  const formData = new FormData();
  formData.append("file", file);

  return apiFetch<UploadUsersExcelResponse>("/users/upload-excel", {
    method: "POST",
    body: formData,
    headers: {},
  });
}
