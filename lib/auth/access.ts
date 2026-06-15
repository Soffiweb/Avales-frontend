import type { User, Role, RoleLike } from "@/types/user";
import type { SidebarItem } from "@/lib/navigation/sidebar.config";
import { getRoleCode, normalizeRoleCode } from "@/lib/auth/roles";

const ROLE_ALIASES: Partial<Record<Role, Role>> = {
  ADMINISTRADOR: "ADMIN",
  SUPERADMIN: "SUPER_ADMIN",
};

export const ADMIN_ACCESS_ROLES: Role[] = [
  "SUPER_ADMIN",
  "SUPERADMIN",
  "ADMIN",
  "ADMINISTRADOR",
];

export function normalizeRole(role: Role): Role {
  return ROLE_ALIASES[role] ?? role;
}

function normalizeRoleLike(role: RoleLike): string {
  const code = normalizeRoleCode(getRoleCode(role));
  return normalizeRole(code);
}

/**
 * Devuelve los roles efectivos del usuario para checks de autorización en UI.
 *
 * - Si hay `rolActivo` (usuario eligió un rol en login o hizo switch-role) → solo ese.
 *   Esto refleja exactamente lo que el backend autoriza (el JWT lleva un solo rolActivo).
 * - Si no hay `rolActivo` → todos los roles del user (fallback para sesiones antes del
 *   flujo multi-rol; el backend rechazará estas sesiones).
 */
export function getNormalizedRoles(user: User | null | undefined): Role[] {
  if (user?.rolActivo) {
    return [normalizeRoleLike(user.rolActivo)];
  }
  return (user?.roles ?? []).map((role) => normalizeRoleLike(role));
}

/** Roles que el usuario podría seleccionar (todos los asignados). */
export function getAllUserRoles(user: User | null | undefined): Role[] {
  return (user?.roles ?? []).map((role) => normalizeRoleLike(role));
}

/** True si el usuario tiene 2+ roles y por tanto puede cambiar de rol activo. */
export function canSwitchRole(user: User | null | undefined): boolean {
  return (user?.roles?.length ?? 0) > 1;
}

export function hasAnyRole(userRoles: Role[], required?: Role[]) {
  if (!required || required.length === 0) return true;

  const normalizedUserRoles = userRoles.map((role) => normalizeRole(role));
  return required.some((role) =>
    normalizedUserRoles.includes(normalizeRole(role))
  );
}

export function isAdminUser(user: User | null | undefined) {
  return getNormalizedRoles(user).some((role) =>
    ADMIN_ACCESS_ROLES.includes(role)
  );
}

export function isTrainerUser(user: User | null | undefined) {
  return getNormalizedRoles(user).includes("ENTRENADOR");
}

export function canManageCatalogs(user: User | null | undefined) {
  return isAdminUser(user);
}

export function canAccessReforms(user: User | null | undefined) {
  if (!user) return false;

  const roles = getNormalizedRoles(user);

  return (
    isAdminUser(user) ||
    roles.includes("PDA") ||
    isDTMUser(user) ||
    (roles.includes("ENTRENADOR") && Boolean(user.puedeSolicitarReformas))
  );
}

export function canCreateReforma(user: User | null | undefined) {
  if (!user) return false;

  const roles = getNormalizedRoles(user);

  return (
    isAdminUser(user) ||
    (roles.includes("ENTRENADOR") && Boolean(user.puedeSolicitarReformas))
  );
}

export function canReviewReforms(user: User | null | undefined) {
  if (!user) return false;
  const roles = getNormalizedRoles(user);
  return isAdminUser(user) || roles.includes("PDA");
}

export function isDTMUser(user: User | null | undefined) {
  const roles = getNormalizedRoles(user);
  return roles.includes("DTM") || roles.includes("DTM_EIDE");
}

export function isMetodologoUser(user: User | null | undefined) {
  return getNormalizedRoles(user).includes("METODOLOGO");
}

export function isPdaUser(user: User | null | undefined) {
  return getNormalizedRoles(user).includes("PDA");
}

export function isFinancieroUser(user: User | null | undefined) {
  return getNormalizedRoles(user).includes("FINANCIERO");
}

export function isControlPrevioUser(user: User | null | undefined) {
  return getNormalizedRoles(user).includes("CONTROL_PREVIO");
}

export function isComprasPublicasUser(user: User | null | undefined) {
  return getNormalizedRoles(user).includes("COMPRAS_PUBLICAS");
}

export function isSecretariaUser(user: User | null | undefined) {
  const roles = getNormalizedRoles(user);
  return roles.includes("SECRETARIA") || roles.includes("SECRETARIA_DTM");
}

export function isSecretariaDtmUser(user: User | null | undefined) {
  return getNormalizedRoles(user).includes("SECRETARIA_DTM");
}

export function isAvalReviewer(user: User | null | undefined) {
  return (
    isDTMUser(user) ||
    isMetodologoUser(user) ||
    isPdaUser(user) ||
    isControlPrevioUser(user) ||
    isComprasPublicasUser(user) ||
    isFinancieroUser(user)
  );
}

export function canSeeSidebar(
  user: User | null | undefined,
  noSidebar: Role[]
) {
  const roles = getNormalizedRoles(user);
  const hiddenRoles = noSidebar.map((role) => normalizeRole(role));
  return !roles.some((r) => hiddenRoles.includes(r));
}

export function filterSidebarItems(items: SidebarItem[], user: User) {
  const roles = getNormalizedRoles(user);

  return items
    .filter((it) => {
      if (it.type === "link" && (it.href === "/reformas" || it.href === "/reformas-multi")) {
        return canAccessReforms(user);
      }
      return hasAnyRole(roles, it.roles);
    })
    .map((it) => {
      if (it.type === "group") {
        const children = it.children.filter((c) => hasAnyRole(roles, c.roles));
        return { ...it, children };
      }
      return it;
    })
    .filter((it) => (it.type === "group" ? it.children.length > 0 : true));
}
