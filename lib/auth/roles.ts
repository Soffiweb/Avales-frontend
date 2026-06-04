import type { Role, RoleDto, RoleLike } from "@/types/user";
import { formatRole } from "@/lib/utils/formatters";

export function isRoleDto(value: unknown): value is RoleDto {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as RoleDto).codigo === "string" &&
    typeof (value as RoleDto).nombre === "string"
  );
}

export function getRoleCode(role: RoleLike): string {
  if (typeof role === "string") return role;
  return role.codigo;
}

export function normalizeRoleCode(code: string): string {
  return code
    .trim()
    .replaceAll("-", "_")
    .replaceAll(" ", "_")
    .toUpperCase();
}

export function canonicalizeRoleCode(code: string): string {
  const normalized = normalizeRoleCode(code);
  const aliases: Record<string, string> = {
    SUPERADMIN: "SUPER_ADMIN",
    ADMINISTRADOR: "ADMIN",
  };
  return aliases[normalized] ?? normalized;
}

export function toBackendRoleCode(code: string): string {
  return code.trim().toLowerCase();
}

export function getRoleName(role: RoleLike): string {
  if (typeof role === "string") {
    return formatRole(normalizeRoleCode(role));
  }
  return formatRole(normalizeRoleCode(role.codigo));
}
