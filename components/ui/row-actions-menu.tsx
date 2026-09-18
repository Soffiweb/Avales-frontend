"use client";

import { Fragment, type ReactNode } from "react";
import Link from "next/link";
import {
  Menu,
  MenuButton,
  MenuItem,
  MenuItems,
  Transition,
} from "@headlessui/react";
import { MoreVertical } from "lucide-react";

/**
 * Menú de acciones de una fila, detrás de un botón de tres puntos.
 *
 * Las filas de un listado suelen ofrecer varias acciones condicionadas por rol
 * y estado. Ponerlas todas como botones hace que el ancho de la columna cambie
 * de fila en fila y empuja al resto de las columnas. Detrás del menú, la
 * columna mide siempre lo mismo.
 */

export type RowAction = {
  label: string;
  icon: typeof MoreVertical;
  /** Navega a una ruta. Excluyente con `onClick`. */
  href?: string;
  onClick?: () => void;
  /** Acciones destructivas: se pintan en rojo y van separadas al final. */
  danger?: boolean;
};

function itemClasses(active: boolean, danger?: boolean) {
  const base =
    "flex w-full items-center gap-2.5 px-3 py-2 text-sm transition-colors";
  if (danger) {
    return `${base} ${
      active
        ? "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300"
        : "text-rose-600 dark:text-rose-400"
    }`;
  }
  return `${base} ${
    active
      ? "bg-gray-100 text-gray-900 dark:bg-gray-700 dark:text-gray-100"
      : "text-gray-700 dark:text-gray-200"
  }`;
}

export default function RowActionsMenu({
  actions,
  label,
}: {
  actions: RowAction[];
  /** Se usa en el aria-label, ej. "el aval 167". */
  label: string;
}) {
  const visibles = actions.filter(Boolean);
  if (visibles.length === 0) return null;

  const normales = visibles.filter((a) => !a.danger);
  const peligrosas = visibles.filter((a) => a.danger);

  const renderItem = (action: RowAction) => {
    const contenido = (active: boolean) => (
      <>
        <action.icon
          className={`h-4 w-4 shrink-0 ${
            action.danger
              ? ""
              : active
                ? "text-gray-500 dark:text-gray-300"
                : "text-gray-400 dark:text-gray-500"
          }`}
          aria-hidden="true"
        />
        {action.label}
      </>
    );

    return (
      <MenuItem key={action.label} as={Fragment}>
        {({ focus }: { focus: boolean }) =>
          action.href ? (
            <Link href={action.href} className={itemClasses(focus, action.danger)}>
              {contenido(focus)}
            </Link>
          ) : (
            <button
              type="button"
              onClick={action.onClick}
              className={`${itemClasses(focus, action.danger)} cursor-pointer text-left`}
            >
              {contenido(focus)}
            </button>
          )
        }
      </MenuItem>
    );
  };

  return (
    <Menu as="div" className="relative inline-flex">
      <MenuButton
        className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-200"
        aria-label={`Acciones para ${label}`}
      >
        <MoreVertical className="h-4 w-4" aria-hidden="true" />
      </MenuButton>

      <Transition
        as={Fragment}
        enter="transition ease-out duration-150"
        enterFrom="opacity-0 scale-95"
        enterTo="opacity-100 scale-100"
        leave="transition ease-in duration-100"
        leaveFrom="opacity-100 scale-100"
        leaveTo="opacity-0 scale-95"
      >
        {/* `anchor` deja que Headless UI reposicione el panel solo cuando la
            fila está cerca del borde inferior; dentro de una tabla con scroll
            un `absolute` fijo quedaría cortado. */}
        <MenuItems
          anchor="bottom end"
          className="z-50 mt-1 w-52 origin-top-right overflow-hidden rounded-lg border border-gray-200 bg-white py-1 shadow-lg focus:outline-hidden dark:border-gray-700 dark:bg-gray-800"
        >
          {normales.map(renderItem)}

          {peligrosas.length > 0 && normales.length > 0 && (
            <div
              className="my-1 border-t border-gray-200 dark:border-gray-700"
              aria-hidden="true"
            />
          )}

          {peligrosas.map(renderItem)}
        </MenuItems>
      </Transition>
    </Menu>
  );
}

export type { ReactNode };
