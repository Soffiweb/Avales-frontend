import { apiFetch } from "./client";
import type { LoginResult, RoleLike, User } from "@/types/user";
import { canonicalizeRoleCode, getRoleCode } from "@/lib/auth/roles";

/**
 * Login del usuario. El backend devuelve:
 * - Si tiene 1 rol → sesión lista (cookie `token` HttpOnly + data del user con rolActivo).
 * - Si tiene 2+ roles → `{ requiresRoleSelection: true, roles, selectionToken }`
 *   (cookie `selection_token` HttpOnly de 10 min). El frontend debe llamar `selectRole()`.
 */
export async function login(email: string, password: string) {
  return apiFetch<LoginResult>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

/** Elige el rol de trabajo de la sesión cuando el login requirió selección. */
export async function selectRole(rol: RoleLike, selectionToken?: string) {
  return apiFetch<User>("/auth/select-role", {
    method: "POST",
    body: JSON.stringify({ rol: canonicalizeRoleCode(getRoleCode(rol)) }),
    headers: selectionToken
      ? {
          "X-Selection-Token": selectionToken,
          Authorization: `Bearer ${selectionToken}`,
        }
      : undefined,
  });
}

/** Cambia el rol activo de una sesión ya autenticada. El backend emite un JWT nuevo. */
export async function switchRole(rol: RoleLike) {
  return apiFetch<User>("/auth/switch-role", {
    method: "POST",
    body: JSON.stringify({ rol: canonicalizeRoleCode(getRoleCode(rol)) }),
  });
}

export async function logout() {
  return apiFetch<null>("/auth/logout", { method: "POST" });
}

export async function getProfile() {
  return apiFetch<User>("/auth/profile", { method: "GET" });
}
