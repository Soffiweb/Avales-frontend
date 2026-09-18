"use client";

import { useEffect, useRef, useState } from "react";
import { useAppProvider } from "@/app/providers/app-provider";
import { useSelectedLayoutSegments } from "next/navigation";
import { useWindowWidth } from "@/components/utils/use-window-width";
import { ChevronDown, X } from "lucide-react";
import SidebarLinkGroup from "../ui/sidebar-link-group";
import SidebarLink from "../ui/sidebar-link";
import Logo from "../ui/logo";
import VersionBadge from "../ui/version-badge";
import { useAuth } from "@/app/providers/auth-provider";
import {
  SIDEBAR_ITEMS,
  ROLES_WITHOUT_SIDEBAR,
} from "@/lib/navigation/sidebar.config";
import { canSeeSidebar, filterSidebarItems } from "@/lib/auth/access";
import { SidebarIcons } from "@/components/icons/sidebar-icons";

/**
 * Clases del "pill" de navegación.
 *
 * El estado activo usa un fondo sólido suave en vez del degradado anterior:
 * a simple vista hay que poder responder "¿dónde estoy?" sin buscar. El hover
 * también pinta fondo, no solo texto, para que el objetivo clickeable se vea
 * antes de hacer click.
 */
const ITEM_BASE =
  "group/item flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-150";
const ITEM_ACTIVE =
  "bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300";
const ITEM_IDLE =
  "text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700/50 dark:hover:text-gray-100";

/**
 * Las etiquetas de cada ítem: visibles siempre en móvil (donde el menú es un
 * cajón ancho) y en escritorio solo cuando está expandido.
 *
 * Antes llevaban `2xl:block`, que a partir de 1536px las mostraba siempre e
 * ignoraba el estado de colapso. Eso dejaba el control de expandir sin efecto
 * en pantallas grandes, que es justo donde más se lo usa.
 */
const LABEL_COLLAPSE = "lg:hidden lg:sidebar-expanded:block";

export default function Sidebar({
  variant = "default",
}: {
  variant?: "default" | "v2";
}) {
  const sidebar = useRef<HTMLDivElement>(null);
  const { sidebarOpen, setSidebarOpen, sidebarExpanded, setSidebarExpanded } =
    useAppProvider();
  const segments = useSelectedLayoutSegments();
  const breakpoint = useWindowWidth();
  // Hover-to-expand: solo cuando el usuario NO lo expandió manualmente.
  // Si ya está expanded, no hay nada que hacer en hover.
  const [isHovering, setIsHovering] = useState(false);
  const effectivelyExpanded = sidebarExpanded || isHovering;
  // Con el menú colapsado a iconos no hay dónde dibujar un submenú, así que
  // el primer click expande en vez de desplegar. Antes esto se cortaba en
  // 1536px porque ahí el menú estaba fijo en ancho completo; ahora que se
  // puede colapsar en cualquier ancho de escritorio, el corte ya no aplica.
  const expandOnly = !effectivelyExpanded && breakpoint && breakpoint >= 1024;
  const { user, loading } = useAuth();
  const items = user ? filterSidebarItems(SIDEBAR_ITEMS, user) : [];
  const shouldRender =
    !loading &&
    Boolean(user) &&
    canSeeSidebar(user, ROLES_WITHOUT_SIDEBAR) &&
    items.length > 0;

  // close on click outside
  useEffect(() => {
    if (!shouldRender) return;
    const clickHandler = ({ target }: { target: EventTarget | null }): void => {
      if (!sidebar.current) return;
      if (!sidebarOpen || sidebar.current.contains(target as Node)) return;
      setSidebarOpen(false);
    };
    document.addEventListener("click", clickHandler);
    return () => document.removeEventListener("click", clickHandler);
  }, [shouldRender, sidebarOpen, setSidebarOpen]);

  // close if the esc key is pressed
  useEffect(() => {
    if (!shouldRender) return;
    const keyHandler = ({ keyCode }: { keyCode: number }): void => {
      if (!sidebarOpen || keyCode !== 27) return;
      setSidebarOpen(false);
    };
    document.addEventListener("keydown", keyHandler);
    return () => document.removeEventListener("keydown", keyHandler);
  }, [shouldRender, sidebarOpen, setSidebarOpen]);

  if (!shouldRender) return null;

  return (
    <div
      className={`min-w-fit ${effectivelyExpanded ? "sidebar-expanded" : ""}`}
      onMouseEnter={() => {
        // Solo activar hover si el sidebar NO está expandido manualmente.
        if (!sidebarExpanded) setIsHovering(true);
      }}
      onMouseLeave={() => setIsHovering(false)}
    >
      {/* Sidebar backdrop (mobile only) */}
      <div
        className={`fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-40 lg:hidden lg:z-auto transition-opacity duration-200 ${
          sidebarOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        aria-hidden="true"
      ></div>

      {/* Sidebar */}
      <div
        id="sidebar"
        ref={sidebar}
        className={`flex lg:flex! flex-col absolute z-40 left-0 top-0 lg:static lg:left-auto lg:top-auto lg:translate-x-0 h-[100dvh] overflow-y-scroll lg:overflow-y-auto no-scrollbar w-64 lg:w-20 lg:sidebar-expanded:!w-64 shrink-0 bg-white dark:bg-gray-800 px-3 py-4 transition-all duration-200 ease-in-out ${
          sidebarOpen ? "translate-x-0" : "-translate-x-64"
        } ${
          variant === "v2"
            ? "border-r border-gray-200 dark:border-gray-700/60"
            : "border-r border-gray-200 dark:border-gray-700/60"
        }`}
      >
        {/* Sidebar header */}
        <div className="flex items-center justify-between mb-8 px-1">
          <Logo />
          {/* Close button (mobile only) */}
          <button
            className="lg:hidden rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 transition-colors"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-controls="sidebar"
            aria-expanded={sidebarOpen}
          >
            <span className="sr-only">Cerrar menú</span>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Links */}
        <nav className="grow">
          <h3 className="mb-3 px-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
            <span
              className="hidden lg:block lg:sidebar-expanded:hidden text-center w-6"
              aria-hidden="true"
            >
              •••
            </span>
            <span className={LABEL_COLLAPSE}>Menú</span>
          </h3>

          <ul className="space-y-1">
            {items.map((item) => {
              // SECTION — encabezado que agrupa los items siguientes. Cuando el
              // sidebar está colapsado se reduce a un separador, porque un
              // título recortado a 20px no comunica nada.
              if (item.type === "section") {
                return (
                  <li key={`section-${item.label}`} className="pt-4 first:pt-0">
                    <div
                      className="mx-3 hidden lg:block lg:sidebar-expanded:hidden border-t border-gray-200 dark:border-gray-700"
                      aria-hidden="true"
                    />
                    <h4
                      className={`px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 ${LABEL_COLLAPSE}`}
                    >
                      {item.label}
                    </h4>
                  </li>
                );
              }

              const isActive = segments.includes(item.segment);

              // GROUP
              if (item.type === "group") {
                const Icon = item.icon ? SidebarIcons[item.icon] : null;

                return (
                  <SidebarLinkGroup key={item.label} open={isActive}>
                    {(handleClick, open) => (
                      <>
                        <button
                          type="button"
                          className={`w-full ${ITEM_BASE} ${
                            isActive ? ITEM_ACTIVE : ITEM_IDLE
                          }`}
                          aria-expanded={open}
                          onClick={(e) => {
                            e.preventDefault();
                            if (expandOnly) {
                              setSidebarExpanded(true);
                              return;
                            }
                            handleClick();
                          }}
                        >
                          {Icon && (
                            <Icon
                              size={20}
                              className="shrink-0"
                              aria-hidden="true"
                            />
                          )}
                          <span className={`grow text-left ${LABEL_COLLAPSE}`}>
                            {item.label}
                          </span>
                          <ChevronDown
                            size={16}
                            className={`shrink-0 transition-transform duration-200 ${LABEL_COLLAPSE} ${
                              open ? "rotate-180" : ""
                            }`}
                            aria-hidden="true"
                          />
                        </button>

                        <div className={LABEL_COLLAPSE}>
                          <ul
                            className={`mt-1 space-y-0.5 border-l border-gray-200 dark:border-gray-700 pl-3 ml-5 ${
                              !open && "hidden"
                            }`}
                          >
                            {item.children.map((c) => {
                              const childActive = segments.includes(c.segment);

                              return (
                                <li key={c.href}>
                                  <SidebarLink href={c.href}>
                                    <span
                                      className={`block rounded-lg px-3 py-2 text-sm transition-colors duration-150 ${
                                        childActive
                                          ? "bg-violet-50 font-medium text-violet-700 dark:bg-violet-500/15 dark:text-violet-300"
                                          : "text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700/50 dark:hover:text-gray-100"
                                      }`}
                                    >
                                      {c.label}
                                    </span>
                                  </SidebarLink>
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      </>
                    )}
                  </SidebarLinkGroup>
                );
              }

              // LINK
              const Icon = item.icon ? SidebarIcons[item.icon] : null;
              return (
                <li key={item.href}>
                  <SidebarLink href={item.href}>
                    {/* `title` da tooltip nativo cuando el sidebar está
                        colapsado y solo se ve el icono. */}
                    <span
                      className={`${ITEM_BASE} ${
                        isActive ? ITEM_ACTIVE : ITEM_IDLE
                      }`}
                      title={item.label}
                    >
                      {Icon && (
                        <Icon size={20} className="shrink-0" aria-hidden="true" />
                      )}
                      <span className={`truncate ${LABEL_COLLAPSE}`}>
                        {item.label}
                      </span>
                    </span>
                  </SidebarLink>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Footer: versión + colapsar */}
        <div className="mt-auto pt-4 border-t border-gray-200 dark:border-gray-700/60">
          <div className={`px-3 pb-2 text-center ${LABEL_COLLAPSE}`}>
            <VersionBadge />
          </div>

        </div>
      </div>
    </div>
  );
}
