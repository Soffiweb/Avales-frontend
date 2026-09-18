"use client";

import {
  createContext,
  useContext,
  type ReactNode,
  type ThHTMLAttributes,
  type TdHTMLAttributes,
} from "react";

/**
 * Primitivos de tabla con el estilo compartido de la app.
 *
 * Existen porque las clases de `th`/`td` estaban copiadas casi idénticas en
 * una decena de listados: cualquier ajuste visual obligaba a tocar todos.
 *
 * Dos densidades, porque no todas las tablas sirven para lo mismo:
 * - `comfortable` (default) para listados de lectura, donde importa el
 *   descanso visual.
 * - `dense` para previsualizaciones dentro de modales, donde lo que importa
 *   es cuántas filas entran sin scrollear.
 *
 * Las tablas de reporte muy anchas o las de impresión NO deberían usar estos
 * primitivos: tienen restricciones propias (header sticky, `border-collapse`,
 * colores fijos para papel) que acá no se contemplan.
 */

type Density = "comfortable" | "dense";

const DensityContext = createContext<Density>("comfortable");

const CELL_PADDING: Record<Density, string> = {
  comfortable: "px-5 py-4",
  dense: "px-4 py-2",
};

const HEAD_PADDING: Record<Density, string> = {
  comfortable: "px-5 py-3",
  dense: "px-4 py-2",
};

export function TableContainer({
  children,
  density = "comfortable",
}: {
  children: ReactNode;
  density?: Density;
}) {
  return (
    <DensityContext.Provider value={density}>
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        <div className="overflow-x-auto">{children}</div>
      </div>
    </DensityContext.Provider>
  );
}

/**
 * `density` acá es para tablas que YA viven dentro de su propio contenedor
 * (por ejemplo un área con scroll vertical propio): permite usar los
 * primitivos sin que `TableContainer` agregue un segundo borde.
 */
export function Table({
  children,
  density,
  className = "",
}: {
  children: ReactNode;
  density?: Density;
  className?: string;
}) {
  const table = <table className={`w-full table-auto ${className}`}>{children}</table>;
  if (!density) return table;
  return (
    <DensityContext.Provider value={density}>{table}</DensityContext.Provider>
  );
}

export function TableHead({ children }: { children: ReactNode }) {
  return (
    <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900/40">
      {children}
    </thead>
  );
}

export function Th({
  children,
  className = "",
  ...rest
}: ThHTMLAttributes<HTMLTableCellElement> & { children?: ReactNode }) {
  const density = useContext(DensityContext);
  return (
    <th
      className={`whitespace-nowrap text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 ${HEAD_PADDING[density]} ${className}`}
      {...rest}
    >
      {children}
    </th>
  );
}

export function TableBody({ children }: { children: ReactNode }) {
  return (
    <tbody className="divide-y divide-gray-100 text-sm dark:divide-gray-700/60">
      {children}
    </tbody>
  );
}

/** Fila con feedback de hover: deja claro qué renglón estás leyendo. */
export function Tr({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <tr
      className={`transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/30 ${className}`}
    >
      {children}
    </tr>
  );
}

export function Td({
  children,
  className = "",
  ...rest
}: TdHTMLAttributes<HTMLTableCellElement> & { children?: ReactNode }) {
  const density = useContext(DensityContext);
  return (
    <td
      className={`whitespace-nowrap text-gray-700 dark:text-gray-300 ${CELL_PADDING[density]} ${className}`}
      {...rest}
    >
      {children}
    </td>
  );
}
