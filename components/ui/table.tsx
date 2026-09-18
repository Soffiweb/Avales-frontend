"use client";

import {
  CaretDownIcon,
  CaretRightIcon,
  CaretUpIcon,
} from "@phosphor-icons/react";
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
 * Las tablas de reporte muy anchas SÍ pueden usarlos desde que existe
 * `TableHead sticky` junto con `maxHeight` en `TableContainer`.
 *
 * Las que NO deben usarlos son las que imitan papel: previsualizaciones de PDF
 * y secciones con fondo blanco fijo. Estos primitivos traen variantes `dark:`
 * incondicionales, así que sobre una tarjeta que se queda blanca a propósito el
 * cuerpo de la tabla se vuelve ilegible en modo oscuro.
 */

type Density = "comfortable" | "dense";

const DensityContext = createContext<Density>("comfortable");

const CELL_PADDING: Record<Density, string> = {
  comfortable: "px-4 py-4",
  dense: "px-4 py-2",
};

const HEAD_PADDING: Record<Density, string> = {
  comfortable: "px-4 py-3.5",
  dense: "px-4 py-2",
};

export function TableContainer({
  children,
  density = "comfortable",
  maxHeight,
}: {
  children: ReactNode;
  density?: Density;
  /**
   * Altura máxima del área de scroll, ej. `"70vh"`.
   *
   * Es lo que habilita el encabezado fijo: `position: sticky` se ancla al
   * ancestro que scrollea, y sin un alto que recorte, el que scrollea es la
   * página entera — pero el borde redondeado de esta tarjeta necesita
   * `overflow-hidden`, y un ancestro recortado deja al sticky sin efecto. Con
   * `maxHeight` el scroll vertical pasa a ser del contenedor y el encabezado
   * tiene contra qué fijarse.
   *
   * Solo tiene sentido en tablas largas o muy anchas. Ponerlo en un listado
   * corto le mete un scroll interno al usuario sin necesidad.
   */
  maxHeight?: string;
}) {
  return (
    <DensityContext.Provider value={density}>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-slate-700 dark:bg-slate-800">
        <div
          className={maxHeight ? "overflow-auto" : "overflow-x-auto"}
          style={maxHeight ? { maxHeight } : undefined}
        >
          {children}
        </div>
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
  const table = (
    <table className={`w-full table-auto text-left ${className}`}>
      {children}
    </table>
  );
  if (!density) return table;
  return (
    <DensityContext.Provider value={density}>{table}</DensityContext.Provider>
  );
}

export function TableHead({
  children,
  sticky = false,
}: {
  children: ReactNode;
  /**
   * Mantiene el encabezado a la vista al scrollear. Requiere que
   * `TableContainer` reciba `maxHeight`; sin eso no hay contra qué fijarse.
   *
   * El fondo pasa a ser opaco: el `/80` del encabezado normal deja ver las
   * filas pasando por debajo, que con el encabezado quieto se lee como un
   * error de renderizado.
   */
  sticky?: boolean;
}) {
  return (
    <thead
      // `whitespace-nowrap` vive acá y no en cada `Th` porque `white-space`
      // se hereda: así un `Th` que necesita envolver alcanza con pasar
      // `whitespace-normal` en su `className`. Puesto en el `th`, las dos
      // clases tienen la misma especificidad y gana la que Tailwind emite
      // última, no la del atributo — el encabezado nunca envolvía.
      className={`whitespace-nowrap border-b border-slate-200 dark:border-slate-700 ${
        sticky
          ? "sticky top-0 z-10 bg-slate-100 dark:bg-slate-900"
          : "bg-slate-50/80 dark:bg-slate-900/40"
      }`}
    >
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
      className={`text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 ${HEAD_PADDING[density]} ${className}`}
      {...rest}
    >
      {children}
    </th>
  );
}

export function TableBody({ children }: { children: ReactNode }) {
  return (
    // El color del texto se define acá, en el `tbody`, y no en cada `Td`.
    // `color` se hereda, así que una celda que pase su propio `text-*` gana
    // siempre sobre lo heredado. Cuando el color vivía en el `td`, un
    // `<Td className="text-red-500">` competía con la clase del primitivo con
    // la misma especificidad y perdía contra el orden de emisión de Tailwind:
    // los mensajes de error de varias tablas se veían grises en vez de rojos.
    <tbody className="divide-y divide-slate-100 bg-white text-sm text-slate-700 dark:divide-slate-700/60 dark:bg-transparent dark:text-slate-300">
      {children}
    </tbody>
  );
}

/**
 * Fila con feedback de hover: deja claro qué renglón estás leyendo.
 *
 * Lleva `group` para que las celdas puedan revelar controles con
 * `group-hover:` (por ejemplo acciones que solo aparecen sobre la fila activa)
 * sin tener que envolver cada `td` en otro contenedor.
 */
export function Tr({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <tr
      className={`group transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-700/30 ${className}`}
    >
      {children}
    </tr>
  );
}

export function Td({
  children,
  className = "",
  wrap = false,
  ...rest
}: TdHTMLAttributes<HTMLTableCellElement> & {
  children?: ReactNode;
  /**
   * Permite que el contenido use varias líneas.
   *
   * Es un prop y no una clase que se pase por `className` a propósito:
   * `whitespace-normal` y `whitespace-nowrap` tienen la misma especificidad,
   * así que al apilarlas no gana la última del atributo sino la que Tailwind
   * emite después en la hoja de estilos — y ahí gana `nowrap`. El texto nunca
   * wrappeaba y cualquier `line-clamp` quedaba reducido a una sola línea.
   */
  wrap?: boolean;
}) {
  const density = useContext(DensityContext);
  return (
    <td
      className={`${
        wrap ? "whitespace-normal" : "whitespace-nowrap"
      } ${CELL_PADDING[density]} ${className}`}
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
        className="inline-flex items-center gap-1.5 uppercase tracking-wider transition-colors hover:text-slate-900 dark:hover:text-slate-200"
      >
        {children}
        {/* Las dos flechas se muestran siempre, no solo la activa: así la
            columna se lee como ordenable antes de que nadie la toque. */}
        <span className="flex flex-col leading-none" aria-hidden="true">
          <CaretUpIcon
            size={8}
            weight="fill"
            className={
              active && direction === "asc"
                ? "text-indigo-600 dark:text-indigo-400"
                : "text-slate-300 dark:text-slate-600"
            }
          />
          <CaretDownIcon
            size={8}
            weight="fill"
            className={
              active && direction === "desc"
                ? "text-indigo-600 dark:text-indigo-400"
                : "text-slate-300 dark:text-slate-600"
            }
          />
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

/* ── Filas desplegables ──────────────────────────────────────────────────── */

/**
 * Botón de expandir/colapsar para la primera celda de una fila.
 *
 * El patrón es: columnas para los datos con los que el usuario compara y
 * busca, y el resto detrás del despliegue. Evita tener que elegir entre una
 * tabla que no muestra lo suficiente y una fila con veinte columnas.
 */
export function ExpandToggle({
  expanded,
  onToggle,
  label,
}: {
  expanded: boolean;
  onToggle: () => void;
  /** Se usa en el aria-label, ej. "el pedido PED-1631". */
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={expanded}
      aria-label={`${expanded ? "Ocultar" : "Ver"} el detalle de ${label}`}
      className={`inline-flex h-7 w-7 items-center justify-center rounded-lg transition-colors hover:bg-slate-100 dark:hover:bg-slate-700 ${
        expanded
          ? "text-indigo-600 dark:text-indigo-400"
          : "text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
      }`}
    >
      <CaretRightIcon
        size={16}
        weight="bold"
        aria-hidden="true"
        className={`transition-transform duration-200 ${
          expanded ? "rotate-90" : ""
        }`}
      />
    </button>
  );
}

/**
 * Fila de detalle que aparece debajo de su fila principal.
 *
 * Se renderiza como una `tr` propia con `colSpan` completo: meter el detalle
 * dentro de la misma fila rompería la alineación de columnas.
 *
 * El contenido va dentro de una tarjeta con borde propio en vez de apoyarse
 * solo en un fondo distinto. Sin ese borde el detalle se lee como texto suelto
 * flotando entre dos filas, y no queda claro a cuál pertenece.
 */
export function ExpandedRow({
  colSpan,
  children,
  footer,
}: {
  colSpan: number;
  children: ReactNode;
  /**
   * Zona de acciones al pie del detalle.
   *
   * Es un prop y no contenido suelto dentro de `children` porque el separador
   * y la alineación son parte del patrón, no decisión de cada consumidor: si
   * cada listado los escribiera a mano, el pie quedaría a distinta altura y
   * con distinto separador en cada tabla.
   */
  footer?: ReactNode;
}) {
  return (
    // Los bordes de acento arriba y abajo encierran el detalle junto con su
    // fila: sin ellos el bloque se lee como una fila más del listado.
    <tr className="border-y border-indigo-100 dark:border-indigo-900/40">
      {/* Sin padding lateral propio: la tarjeta de adentro pone su margen, así
          queda alineada con el contenido de la fila y no con el borde. */}
      <td colSpan={colSpan} className="bg-slate-50/60 p-0 dark:bg-slate-900/50">
        <div className="mx-4 my-3 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-slate-700 dark:bg-slate-800">
          {children}
          {/* Sin pie no hay separador: una línea sola al final se lee como un
              bloque vacío que faltó completar. */}
          {footer && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 dark:border-slate-700">
              {footer}
            </div>
          )}
        </div>
      </td>
    </tr>
  );
}
