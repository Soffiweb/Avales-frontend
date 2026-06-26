import {
  Gauge,
  Users,
  BookOpen,
  BicepsFlexed,
  CalendarDays,
  ClipboardEdit,
  ClipboardCheck,
  UploadCloud,
  FolderKanban,
  History,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";

export const SidebarIcons = {
  dashboard: Gauge,
  deportistas: BicepsFlexed,
  usuarios: Users,
  avales: BookOpen,
  revisarAvales: ClipboardCheck,
  eventos: CalendarDays,
  reformas: ClipboardEdit,
  cargaMasiva: UploadCloud,
  catalogos: FolderKanban,
  miHistorial: History,
  monitoreo: ShieldAlert,
  roles: ShieldCheck,
};

export type SidebarIconKey = keyof typeof SidebarIcons;
