// lib/navigation/nav.config.ts
import type { Role } from "@/types/user";
import { SidebarIconKey } from "@/components/icons/sidebar-icons";

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
    label: "Eventos",
    href: "/eventos",
    segment: "eventos",
    icon: "eventos",
    roles: ["SUPER_ADMIN", "ADMIN", "SECRETARIA", "ENTRENADOR"],
  },
];
