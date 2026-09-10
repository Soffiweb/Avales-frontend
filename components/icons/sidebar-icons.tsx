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
  FileSpreadsheet,
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
  reportes: FileSpreadsheet,
};

export type SidebarIconKey = keyof typeof SidebarIcons;
