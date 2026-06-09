import {
  Gauge,
  Users,
  BookOpen,
  BicepsFlexed,
  CalendarDays,
  ClipboardEdit,
  UploadCloud,
  FolderKanban,
  History,
  ShieldAlert,
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
  miHistorial: History,
  monitoreo: ShieldAlert,
};

export type SidebarIconKey = keyof typeof SidebarIcons;
