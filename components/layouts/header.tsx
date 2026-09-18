"use client";

import { useMemo, useState } from "react";
import { Menu } from "lucide-react";
import { useAppProvider } from "@/app/providers/app-provider";

import ThemeToggle from "@/components/theme-toggle";
import DropdownProfile from "@/components/dropdown-profile";
import { useAuth } from "@/app/providers/auth-provider";
import type { RoleLike } from "@/types/user";
import { getRoleCode, getRoleName } from "@/lib/auth/roles";

export default function Header({
  variant = "default",
}: {
  variant?: "default" | "v2" | "v3";
}) {
  const { sidebarOpen, setSidebarOpen } = useAppProvider();
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
            {/* Hamburguesa: botón con contorno, como el resto de los controles,
                en vez de un icono suelto sin área clickeable clara. */}
            <button
              className="rounded-lg border border-gray-200 p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 lg:hidden dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
              aria-controls="sidebar"
              aria-expanded={sidebarOpen}
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <span className="sr-only">Abrir menú</span>
              <Menu className="h-5 w-5" aria-hidden="true" />
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
