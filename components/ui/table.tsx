"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
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

/* ── Ordenamiento ────────────────────────────────────────────────────────── */

export type SortDirection = "asc" | "desc";

export type SortState<K extends string = string> = {
  key: K;
  direction: SortDirection;
} | null;

/**
 * Encabezado ordenable.
 *
 * OJO: solo tiene sentido cuando la tabla recibe la lista COMPLETA. Si los
 * datos vienen paginados del servidor, ordenar en el cliente reordena
 * únicamente la página visible y el usuario cree que ordenó todo. En ese caso
 * el orden tiene que pedirse al backend.
 */
export function SortableTh<K extends string>({
  sortKey,
  sort,
  onSort,
  children,
  className = "",
}: {
  sortKey: K;
  sort: SortState<K>;
  onSort: (key: K) => void;
  children: ReactNode;
  className?: string;
}) {
  const active = sort?.key === sortKey;
  const direction = active ? sort.direction : undefined;

  return (
    <Th
      className={className}
      aria-sort={
        active ? (direction === "asc" ? "ascending" : "descending") : "none"
      }
    >
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className="group inline-flex items-center gap-1.5 uppercase tracking-wider transition-colors hover:text-gray-700 dark:hover:text-gray-200"
      >
        {children}
        <span className="flex flex-col leading-none" aria-hidden="true">
          <span
            className={`text-[8px] ${
              active && direction === "asc"
                ? "text-violet-600 dark:text-violet-400"
                : "text-gray-300 dark:text-gray-600"
            }`}
          >
            ▲
          </span>
          <span
            className={`text-[8px] ${
              active && direction === "desc"
                ? "text-violet-600 dark:text-violet-400"
                : "text-gray-300 dark:text-gray-600"
            }`}
          >
            ▼
          </span>
        </span>
      </button>
    </Th>
  );
}

/**
 * Ordena una lista COMPLETA en el cliente. Devuelve las filas ordenadas más el
 * estado y el handler que consume `SortableTh`.
 *
 * Compara con `localeCompare` y sensibilidad a acentos apagada, porque los
 * datos son en español: sin eso "Álvarez" cae después de "Zapata".
 */
export function useTableSort<T, K extends string>(
  rows: T[],
  getValue: (row: T, key: K) => string | number | null | undefined,
  initial: SortState<K> = null,
) {
  const [sort, setSort] = useState<SortState<K>>(initial);

  const onSort = (key: K) => {
    setSort((prev) => {
      if (prev?.key !== key) return { key, direction: "asc" };
      if (prev.direction === "asc") return { key, direction: "desc" };
      // Tercer click: vuelve al orden original en vez de quedar atrapado
      // alternando entre asc y desc.
      return null;
    });
  };

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const factor = sort.direction === "asc" ? 1 : -1;

    return [...rows].sort((a, b) => {
      const av = getValue(a, sort.key);
      const bv = getValue(b, sort.key);

      // Los vacíos van siempre al final, ordene como ordene: una fila sin dato
      // no es "la más chica", es una fila sin dato.
      const aEmpty = av === null || av === undefined || av === "";
      const bEmpty = bv === null || bv === undefined || bv === "";
      if (aEmpty && bEmpty) return 0;
      if (aEmpty) return 1;
      if (bEmpty) return -1;

      if (typeof av === "number" && typeof bv === "number") {
        return (av - bv) * factor;
      }
      return (
        String(av).localeCompare(String(bv), "es", { sensitivity: "base" }) *
        factor
      );
    });
  }, [rows, sort, getValue]);

  return { sorted, sort, onSort };
}
