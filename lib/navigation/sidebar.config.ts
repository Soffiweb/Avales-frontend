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
      "COMPRAS_PUBLICAS",
    ],
  },
  {
    type: "link",
    label: "Deportistas",
    href: "/deportistas",
    segment: "deportistas",
    icon: "deportistas",
    roles: ["SUPER_ADMIN", "ADMIN"],
  },
  {
    type: "link",
    label: "Usuarios",
    href: "/usuarios",
    segment: "usuarios",
    icon: "usuarios",
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
      "COMPRAS_PUBLICAS",
    ],
  },
  {
    type: "link",
    label: "Mi Historial",
    href: "/mi-historial",
    segment: "mi-historial",
    icon: "miHistorial",
    roles: [
      "METODOLOGO",
      "DTM",
      "PDA",
      "CONTROL_PREVIO",
      "FINANCIERO",
      "SECRETARIA",
      "COMPRAS_PUBLICAS",
    ],
  },
  {
    type: "link",
    label: "Eventos",
    href: "/eventos",
    segment: "eventos",
    icon: "eventos",
    roles: ["SUPER_ADMIN", "ADMIN", "SECRETARIA", "ENTRENADOR", "PDA"],
  },
  {
    type: "link",
    label: "Reformas",
    href: "/reformas",
    segment: "reformas",
    icon: "reformas",
    roles: ["SUPER_ADMIN", "ADMIN", "PDA", "ENTRENADOR"],
  },
  {
    type: "link",
    label: "Carga Masiva",
    href: "/carga-masiva",
    segment: "carga-masiva",
    icon: "cargaMasiva",
    roles: ["SUPER_ADMIN", "ADMIN"],
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
    ],
  },
];
