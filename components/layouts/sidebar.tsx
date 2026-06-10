"use client";

import { useEffect, useRef, useState } from "react";
import { useAppProvider } from "@/app/providers/app-provider";
import { useSelectedLayoutSegments } from "next/navigation";
import { useWindowWidth } from "@/components/utils/use-window-width";
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
  const expandOnly =
    !effectivelyExpanded && breakpoint && breakpoint >= 1024 && breakpoint < 1536;
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
        className={`fixed inset-0 bg-gray-900/30 z-40 lg:hidden lg:z-auto transition-opacity duration-200 ${
          sidebarOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        aria-hidden="true"
      ></div>

      {/* Sidebar */}
      <div
        id="sidebar"
        ref={sidebar}
        className={`flex lg:flex! flex-col absolute z-40 left-0 top-0 lg:static lg:left-auto lg:top-auto lg:translate-x-0 h-[100dvh] overflow-y-scroll lg:overflow-y-auto no-scrollbar w-64 lg:w-20 lg:sidebar-expanded:!w-64 2xl:w-64! shrink-0 bg-white dark:bg-gray-800 p-4 transition-all duration-200 ease-in-out ${
          sidebarOpen ? "translate-x-0" : "-translate-x-64"
        } ${
          variant === "v2"
            ? "border-r border-gray-200 dark:border-gray-700/60"
            : "rounded-r-2xl shadow-xs"
        }`}
      >
        {/* Sidebar header */}
        <div className="flex justify-between mb-10 pr-3 sm:px-2">
          {/* Close button */}
          <button
            className="lg:hidden text-gray-500 hover:text-gray-400"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-controls="sidebar"
            aria-expanded={sidebarOpen}
          >
            <span className="sr-only">Close sidebar</span>
            <svg
              className="w-6 h-6 fill-current"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M10.7 18.7l1.4-1.4L7.8 13H20v-2H7.8l4.3-4.3-1.4-1.4L4 12z" />
            </svg>
          </button>
          {/* Logo */}
          <Logo />
        </div>

        {/* Links */}
        <div className="space-y-8">
          {/* Pages group */}
          <div>
            <h3 className="text-xs uppercase text-gray-400 dark:text-gray-500 font-semibold pl-3">
              <span
                className="hidden lg:block lg:sidebar-expanded:hidden 2xl:hidden text-center w-6"
                aria-hidden="true"
              >
                •••
              </span>
              <span className="lg:hidden lg:sidebar-expanded:block 2xl:block">
                Pages
              </span>
            </h3>
            <ul className="mt-3">
              {items.map((item) => {
                const isActive = segments.includes(item.segment);

                // GROUP
                if (item.type === "group") {
                  const Icon = item.icon ? SidebarIcons[item.icon] : null;

                  return (
                    <SidebarLinkGroup key={item.label} open={isActive}>
                      {(handleClick, open) => (
                        <>
                          <a
                            href="#0"
                            className={`block text-gray-800 dark:text-gray-100 truncate transition ${
                              isActive
                                ? ""
                                : "hover:text-gray-900 dark:hover:text-white"
                            }`}
                            onClick={(e) => {
                              e.preventDefault();
                              if (expandOnly) {
                                setSidebarExpanded(true);
                                return;
                              }
                              handleClick();
                            }}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center">
                                {Icon && (
                                  <Icon
                                    size={18}
                                    className={
                                      isActive
                                        ? "text-violet-500"
                                        : "text-gray-400 dark:text-gray-500"
                                    }
                                  />
                                )}
                                <span
                                  className={`text-sm font-medium ${
                                    Icon ? "ml-4" : "ml-2"
                                  } block lg:hidden lg:sidebar-expanded:block 2xl:block duration-200`}
                                >
                                  {item.label}
                                </span>
                              </div>

                              <div className="flex shrink-0 ml-2">
                                <svg
                                  className={`w-3 h-3 shrink-0 ml-1 fill-current text-gray-400 dark:text-gray-500 ${
                                    open && "rotate-180"
                                  }`}
                                  viewBox="0 0 12 12"
                                >
                                  <path d="M5.9 11.4L.5 6l1.4-1.4 4 4 4-4L11.3 6z" />
                                </svg>
                              </div>
                            </div>
                          </a>

                          <div className="lg:hidden lg:sidebar-expanded:block 2xl:block">
                            <ul className={`pl-8 mt-2 ${!open && "hidden"}`}>
                              {item.children.map((c) => {
                                const ChildIcon = c.icon
                                  ? SidebarIcons[c.icon]
                                  : null;
                                const childActive = segments.includes(
                                  c.segment
                                );

                                return (
                                  <li key={c.href} className="mb-1 last:mb-0">
                                    <SidebarLink href={c.href}>
                                      <div className="flex items-center">
                                        {ChildIcon && (
                                          <ChildIcon
                                            size={16}
                                            className={
                                              childActive
                                                ? "text-violet-500"
                                                : "text-gray-400 dark:text-gray-500"
                                            }
                                          />
                                        )}
                                        <span
                                          className={`text-sm font-medium ${
                                            ChildIcon ? "ml-3" : "ml-2"
                                          } block lg:hidden lg:sidebar-expanded:block 2xl:block duration-200`}
                                        >
                                          {c.label}
                                        </span>
                                      </div>
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
                  <li
                    key={item.href}
                    className={`pl-4 pr-3 py-2 rounded-lg mb-0.5 last:mb-0 bg-linear-to-r ${
                      isActive &&
                      "from-violet-500/[0.12] dark:from-violet-500/[0.24] to-violet-500/[0.04]"
                    }`}
                  >
                    <SidebarLink href={item.href}>
                      <div className="flex items-center">
                        {Icon && (
                          <Icon
                            size={18}
                            className={
                              isActive
                                ? "text-violet-500"
                                : "text-gray-400 dark:text-gray-500"
                            }
                          />
                        )}
                        <span
                          className={`truncate text-sm font-medium ${
                            Icon ? "ml-4" : "ml-2"
                          } block lg:hidden lg:sidebar-expanded:block 2xl:block duration-200`}
                        >
                          {item.label}
                        </span>
                      </div>
                    </SidebarLink>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        {/* Version badge */}
        <div className="mt-auto pt-3 px-4 pb-1 text-center">
          <div className="block lg:hidden lg:sidebar-expanded:block 2xl:block">
            <VersionBadge />
          </div>
        </div>

        {/* Expand / collapse button */}
        <div className="pt-3 hidden lg:inline-flex 2xl:hidden justify-end ">
          <div className="w-12 pl-4 pr-3 py-2">
            <button
              className="text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400 cursor-pointer"
              onClick={() => setSidebarExpanded(!sidebarExpanded)}
            >
              <span className="sr-only">Expand / collapse sidebar</span>
              <svg
                className="shrink-0 fill-current text-gray-400 dark:text-gray-500 sidebar-expanded:rotate-180"
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 16 16"
              >
                <path d="M15 16a1 1 0 0 1-1-1V1a1 1 0 1 1 2 0v14a1 1 0 0 1-1 1ZM8.586 7H1a1 1 0 1 0 0 2h7.586l-2.793 2.793a1 1 0 1 0 1.414 1.414l4.5-4.5A.997.997 0 0 0 12 8.01M11.924 7.617a.997.997 0 0 0-.217-.324l-4.5-4.5a1 1 0 0 0-1.414 1.414L8.586 7M12 7.99a.996.996 0 0 0-.076-.373Z" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
