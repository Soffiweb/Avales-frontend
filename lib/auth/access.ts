import type { User, Role } from "@/types/user";
import type { SidebarItem } from "@/lib/navigation/sidebar.config";

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

export function getNormalizedRoles(user: User | null | undefined): Role[] {
  return (user?.roles ?? []).map((role) => normalizeRole(role));
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

export function canManageCatalogs(user: User | null | undefined) {
  return isAdminUser(user);
}

export function canAccessReforms(user: User | null | undefined) {
  if (!user) return false;

  const roles = getNormalizedRoles(user);

  return (
    isAdminUser(user) ||
    roles.includes("PDA") ||
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
      if (it.type === "link" && it.href === "/reformas") {
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
