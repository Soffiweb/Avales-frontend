import type { ReactNode } from "react";

import Breadcrumb, { type BreadcrumbItem } from "@/components/ui/breadcrumb";

/**
 * Encabezado de página: título y bajada a la izquierda, rastro de navegación y
 * acciones a la derecha.
 *
 * Existe porque cada pantalla armaba su propio encabezado a mano y ninguna
 * coincidía: el detalle del aval ponía el rastro ARRIBA del título, el listado
 * directamente no lo tenía, y los tamaños de título no eran los mismos. Al ser
 * lo primero que se lee de cada pantalla, esa inconsistencia se nota más que en
 * cualquier otro bloque.
 *
 * El rastro va arriba de las acciones y no al lado: son cosas distintas —uno
 * dice dónde estás, las otras qué podés hacer— y compartir renglón las mezcla.
 * En pantalla angosta la columna derecha se alinea a la izquierda y queda
 * debajo del título, en vez de comprimir las dos columnas.
 */
export default function PageHeader({
  title,
  description,
  breadcrumb,
  actions,
}: {
  title: ReactNode;
  description?: ReactNode;
  /** Sin el item "Inicio": `Breadcrumb` ya lo antepone. */
  breadcrumb?: BreadcrumbItem[];
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold text-slate-900 md:text-3xl dark:text-slate-100">
          {title}
        </h1>
        {/* `div` y no `p`: la bajada no siempre es una frase. En el detalle del
            aval, por ejemplo, es el código del evento con su botón de copiar, y
            un bloque dentro de un `p` rompe la hidratación. */}
        {description ? (
          <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {description}
          </div>
        ) : null}
      </div>

      {breadcrumb || actions ? (
        <div className="flex shrink-0 flex-col items-start gap-3 sm:items-end">
          {breadcrumb ? <Breadcrumb items={breadcrumb} /> : null}
          {actions}
        </div>
      ) : null}
    </div>
  );
}
