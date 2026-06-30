import {
  Gauge,
  Users,
  BookOpen,
  BicepsFlexed,
  CalendarDays,
  ClipboardEdit,
  UploadCloud,
  FolderKanban,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";

export const SidebarIcons = {
  dashboard: Gauge,
  deportistas: BicepsFlexed,
  usuarios: Users,
  avales: BookOpen,
  eventos: CalendarDays,
  reformas: ClipboardEdit,
  cargaMasiva: UploadCloud,
  catalogos: FolderKanban,
  monitoreo: ShieldAlert,
  roles: ShieldCheck,
};

export type SidebarIconKey = keyof typeof SidebarIcons;
