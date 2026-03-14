import {
  Gauge,
  Users,
  BookOpen,
  BicepsFlexed,
  CalendarDays,
  ClipboardEdit,
} from "lucide-react";

export const SidebarIcons = {
  dashboard: Gauge,
  deportistas: BicepsFlexed,
  usuarios: Users,
  avales: BookOpen,
  eventos: CalendarDays,
  reformas: ClipboardEdit,
};

export type SidebarIconKey = keyof typeof SidebarIcons;
