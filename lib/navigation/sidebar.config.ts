// lib/navigation/nav.config.ts
import type { Role } from "@/types/user";
import { SidebarIconKey } from "@/components/icons/sidebar-icons";
import { ADMIN_ACCESS_ROLES } from "@/lib/auth/access";

export type SidebarItem =
  | {
      type: "link";
      label: string;
      href: string;
      segment: string;
      icon?: SidebarIconKey; // ← obligatorio
      roles?: Role[];
    }
  | {
      type: "group";
      label: string;
      segment: string;
      icon?: SidebarIconKey; // ← icono del grupo
      roles?: Role[];
      children: Array<{
        label: string;
        href: string;
        segment: string;
        icon?: SidebarIconKey; // ← icono de cada sublink
        roles?: Role[];
      }>;
    };

export const ROLES_WITHOUT_SIDEBAR: Role[] = [];

export const SIDEBAR_ITEMS: SidebarItem[] = [
  {
    type: "link",
    label: "Principal",
    href: "/dashboard",
    segment: "dashboard",
    icon: "dashboard",
    roles: [
      "SUPER_ADMIN",
      "ADMIN",
      "ENTRENADOR",
      "DTM",
      "METODOLOGO",
      "PDA",
      "CONTROL_PREVIO",
      "FINANCIERO",
      "SECRETARIA",
      "SECRETARIA_DTM",
      "COMPRAS_PUBLICAS",
      "LECTOR",
    ],
  },
  {
    type: "link",
    label: "Deportistas",
    href: "/deportistas",
    segment: "deportistas",
    icon: "deportistas",
    roles: ["SUPER_ADMIN", "ADMIN", "DTM", "DTM_EIDE"],
  },
  {
    type: "link",
    label: "Usuarios",
    href: "/usuarios",
    segment: "usuarios",
    icon: "usuarios",
    roles: ["SUPER_ADMIN", "ADMIN", "SECRETARIA_DTM"],
  },
  {
    type: "link",
    label: "Roles",
    href: "/roles",
    segment: "roles",
    icon: "roles",
    roles: ["SUPER_ADMIN", "ADMIN"],
  },
  {
    type: "link",
    label: "Avales",
    href: "/avales",
    segment: "avales",
    icon: "avales",
    roles: [
      "SUPER_ADMIN",
      "ADMIN",
      "ENTRENADOR",
      "METODOLOGO",
      "DTM",
      "PDA",
      "CONTROL_PREVIO",
      "FINANCIERO",
      "SECRETARIA",
      "SECRETARIA_DTM",
      "COMPRAS_PUBLICAS",
      "LECTOR",
    ],
  },
  {
    type: "link",
    label: "Eventos",
    href: "/eventos",
    segment: "eventos",
    icon: "eventos",
    roles: ["SUPER_ADMIN", "ADMIN", "SECRETARIA", "SECRETARIA_DTM", "ENTRENADOR", "PDA", "DTM", "DTM_EIDE", "METODOLOGO", "CONTROL_PREVIO", "LECTOR"],
  },
  {
    type: "link",
    label: "Reformas",
    href: "/reformas",
    segment: "reformas",
    icon: "reformas",
    roles: ["SUPER_ADMIN", "ADMIN", "PDA", "ENTRENADOR", "DTM", "DTM_EIDE", "CONTROL_PREVIO"],
  },
  {
    type: "link",
    label: "Carga Masiva",
    href: "/carga-masiva",
    segment: "carga-masiva",
    icon: "cargaMasiva",
    roles: ["SUPER_ADMIN", "ADMIN", "SECRETARIA_DTM"],
  },
  {
    type: "link",
    label: "Monitoreo",
    href: "/monitoreo",
    segment: "monitoreo",
    icon: "monitoreo",
    roles: ADMIN_ACCESS_ROLES,
  },
  {
    type: "group",
    label: "Catálogos",
    segment: "catalogos",
    icon: "catalogos",
    roles: ADMIN_ACCESS_ROLES,
    children: [
      {
        label: "Categorías",
        href: "/catalogos/categorias",
        segment: "categorias",
      },
      {
        label: "Disciplinas",
        href: "/catalogos/disciplinas",
        segment: "disciplinas",
      },
      {
        label: "Flujo de aprobación",
        href: "/catalogos/flujo",
        segment: "flujo",
      },
      {
        label: "Comentarios Hoja de Ruta",
        href: "/catalogos/comentarios-hoja-ruta",
        segment: "comentarios-hoja-ruta",
      },
    ],
  },
];
