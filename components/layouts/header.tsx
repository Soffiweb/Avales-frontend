"use client";

import { useMemo, useState } from "react";
import { Menu, PanelLeftClose } from "lucide-react";
import { useAppProvider } from "@/app/providers/app-provider";

import ThemeToggle from "@/components/theme-toggle";
import DropdownProfile from "@/components/dropdown-profile";
import { useAuth } from "@/app/providers/auth-provider";
import type { RoleLike } from "@/types/user";
import { getRoleCode, getRoleName } from "@/lib/auth/roles";

/** Mismo contorno que el resto de los controles del header, para que el menú
 *  no se lea como un icono suelto sin área clickeable. */
const CONTROL_CLASS =
  "items-center rounded-lg border border-gray-200 p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200";

export default function Header({
  variant = "default",
}: {
  variant?: "default" | "v2" | "v3";
}) {
  const { sidebarOpen, setSidebarOpen, sidebarExpanded, setSidebarExpanded } =
    useAppProvider();
  const { user, switchRole } = useAuth();
  const [switching, setSwitching] = useState(false);

  const roles = useMemo(() => (user?.roles ?? []) as RoleLike[], [user?.roles]);
  const showRoleSwitcher = roles.length > 1 && Boolean(user?.rolActivo);
  const activeCode = user?.rolActivo ? getRoleCode(user.rolActivo) : "";

  return (
    <header
      className={`sticky top-0 before:absolute before:inset-0 before:backdrop-blur-md max-lg:before:bg-white/90 dark:max-lg:before:bg-gray-800/90 before:-z-10 z-30 ${
        variant === "v2" || variant === "v3"
          ? "before:bg-white after:absolute after:h-px after:inset-x-0 after:top-full after:bg-gray-200 dark:after:bg-gray-700/60 after:-z-10"
          : "max-lg:shadow-sm lg:before:bg-gray-100/90 dark:lg:before:bg-gray-900/90"
      } ${variant === "v2" ? "dark:before:bg-gray-800" : ""} ${
        variant === "v3" ? "dark:before:bg-gray-900" : ""
      }`}
    >
      <div className="px-4 sm:px-6 lg:px-8">
        <div
          className={`flex h-16 items-center justify-between ${
            variant === "v2" || variant === "v3"
              ? ""
              : "lg:border-b border-gray-200 dark:border-gray-700/60"
          }`}
        >
          {/* Izquierda */}
          <div className="flex items-center">
            {/* Son dos botones y no uno con lógica adentro porque el menú se
                comporta distinto según el ancho: en móvil se abre y se cierra
                como cajón encima del contenido, y en escritorio se expande y
                se colapsa sin taparlo. Resolverlo por breakpoint de CSS evita
                tener que medir la ventana en JavaScript, que además daría un
                primer render equivocado. */}
            <button
              className={CONTROL_CLASS + " lg:hidden"}
              aria-controls="sidebar"
              aria-expanded={sidebarOpen}
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <span className="sr-only">Abrir menú</span>
              <Menu className="h-5 w-5" aria-hidden="true" />
            </button>

            <button
              className={CONTROL_CLASS + " hidden lg:inline-flex"}
              aria-controls="sidebar"
              aria-expanded={sidebarExpanded}
              title={sidebarExpanded ? "Colapsar menú" : "Expandir menú"}
              onClick={() => setSidebarExpanded(!sidebarExpanded)}
            >
              <span className="sr-only">Expandir o colapsar el menú</span>
              <PanelLeftClose
                className={`h-5 w-5 transition-transform duration-200 ${
                  sidebarExpanded ? "" : "rotate-180"
                }`}
                aria-hidden="true"
              />
            </button>
          </div>

          {/* Derecha */}
          <div className="flex items-center gap-2 sm:gap-3">
            {showRoleSwitcher ? (
              <label className="flex items-center gap-2">
                <span className="sr-only">Cambiar rol activo</span>
                <select
                  className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 transition-colors hover:border-gray-300 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:border-gray-600"
                  value={activeCode}
                  disabled={switching}
                  onChange={async (e) => {
                    const nextCode = e.target.value;
                    if (!nextCode || nextCode === activeCode) return;
                    try {
                      setSwitching(true);
                      await switchRole(nextCode);
                    } finally {
                      setSwitching(false);
                    }
                  }}
                >
                  {roles.map((role) => (
                    <option key={getRoleCode(role)} value={getRoleCode(role)}>
                      {getRoleName(role)}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            <ThemeToggle />

            <hr className="h-6 w-px border-none bg-gray-200 dark:bg-gray-700/60" />

            <DropdownProfile align="right" />
          </div>
        </div>
      </div>
    </header>
  );
}
