import { apiFetch } from "./client";
import type { LoginResult, RoleLike, User } from "@/types/user";
import { canonicalizeRoleCode, getRoleCode } from "@/lib/auth/roles";
import { clearAuthTokens } from "@/lib/auth/tokens";

export async function login(email: string, password: string) {
  return apiFetch<LoginResult>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function selectRole(rol: RoleLike, selectionToken?: string) {
  return apiFetch<LoginResult>("/auth/select-role", {
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

export async function switchRole(rol: RoleLike) {
  return apiFetch<LoginResult>("/auth/switch-role", {
    method: "POST",
    body: JSON.stringify({ rol: canonicalizeRoleCode(getRoleCode(rol)) }),
  });
}

export async function logout() {
  try {
    return await apiFetch<null>("/auth/logout", { method: "POST" });
  } finally {
    clearAuthTokens();
  }
}

export async function getProfile() {
  return apiFetch<User>("/auth/profile", { method: "GET" });
}
