// lib/auth/access.ts
import type { User, Role } from "@/types/user";
import type { SidebarItem } from "@/lib/navigation/sidebar.config";

const hasAnyRole = (userRoles: Role[], required?: Role[]) => {
  if (!required || required.length === 0) return true;
  return required.some((r) => userRoles.includes(r));
};

export function canCreateReforma(user: User | null | undefined) {
  if (!user) return false;

  const roles = (user.roles ?? []) as Role[];

  return (
    roles.includes("SUPER_ADMIN") ||
    roles.includes("ADMIN") ||
    (roles.includes("ENTRENADOR") && Boolean(user.puedeSolicitarReformas))
  );
}

export function canSeeSidebar(
  user: User | null | undefined,
  noSidebar: Role[]
) {
  const roles = (user?.roles ?? []) as Role[];
  return !roles.some((r) => noSidebar.includes(r));
}

export function filterSidebarItems(items: SidebarItem[], user: User) {
  const roles = (user.roles ?? []) as Role[];

  return items
    .filter((it) => hasAnyRole(roles, it.roles))
    .map((it) => {
      if (it.type === "group") {
        const children = it.children.filter((c) => hasAnyRole(roles, c.roles));
        return { ...it, children };
      }
      return it;
    })
    .filter((it) => (it.type === "group" ? it.children.length > 0 : true));
}
