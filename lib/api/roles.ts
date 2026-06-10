import { apiFetch } from "@/lib/api/client";
import type { Role, UpdateRolePayload } from "@/types/role";

export async function listRoles() {
  return apiFetch<Role[]>("/roles", { method: "GET" });
}

export async function getRole(id: number) {
  return apiFetch<Role>(`/roles/${id}`, { method: "GET" });
}

export async function updateRole(id: number, payload: UpdateRolePayload) {
  return apiFetch<Role>(`/roles/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}
