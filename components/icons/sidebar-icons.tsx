import {
  Gauge,
  Users,
  BookOpen,
  BicepsFlexed,
  CalendarDays,
  ClipboardEdit,
  UploadCloud,
} from "lucide-react";

export const SidebarIcons = {
  dashboard: Gauge,
  deportistas: BicepsFlexed,
  usuarios: Users,
  avales: BookOpen,
  eventos: CalendarDays,
  reformas: ClipboardEdit,
  cargaMasiva: UploadCloud,
};

export type SidebarIconKey = keyof typeof SidebarIcons;
