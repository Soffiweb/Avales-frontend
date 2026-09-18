"use client";

import { Fragment, useState } from "react";
import { Dumbbell } from "lucide-react";

import {
  ExpandToggle,
  ExpandedRow,
  Table,
  TableBody,
  TableContainer,
  TableHead,
  Td,
  Th,
  Tr,
} from "@/components/ui/table";
import type { Deportista } from "@/types/deportista";
import { formatDateNumeric, formatGenero } from "@/lib/utils/formatters";
import { formatCategoryLabel } from "@/lib/utils/categories";

type Props = {
  deportistas: Deportista[];
  loading?: boolean;
  error?: string | null;
  onDelete?: (deportista: Deportista) => void;
};

/**
 * Columnas visibles, contando la del toggle y la de acciones.
 *
 * Lo usan también las filas de esqueleto, error y vacío: si queda
 * desincronizado con el `<tr>` del encabezado, esas filas ocupan un ancho
 * distinto al de la tabla y el borde del contenedor se rompe.
 */
const COLUMN_COUNT = 6;

function formatAfiliacion(d: Deportista) {
  if (!d.afiliacion) return "No afiliado";
  if (d.afiliacionFin) {
    return `Vigente hasta ${formatDateNumeric(d.afiliacionFin)}`;
  }
  return "Vigente";
}

/**
 * Nombres y apellidos son un solo dato para quien lee el listado: partidos en
 * dos columnas ocupaban el doble de ancho sin agregar información, y el
 * buscador de la página ya busca sobre los dos campos juntos.
 */
function nombreCompleto(d: Deportista) {
  return [d.nombres, d.apellidos].filter(Boolean).join(" ").trim();
}

/** Par rótulo/valor de la grilla del desplegable. */
function Dato({
  termino,
  children,
}: {
  termino: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
        {termino}
      </dt>
      <dd className="mt-1 text-sm text-slate-700 dark:text-slate-200">
        {children}
      </dd>
    </div>
  );
}

export default function DeportistaTable({
  deportistas,
  loading,
  error,
}: Props) {
  const hasRows = deportistas.length > 0;
  const showInitialLoading = Boolean(loading) && !hasRows;
  const showEmpty = !loading && !error && !hasRows;
  const showError = Boolean(error) && !hasRows;

  // Varias filas pueden estar abiertas a la vez: sirve para comparar dos
  // deportistas sin tener que cerrar uno para ver el otro.
  const [abiertos, setAbiertos] = useState<Set<number>>(new Set());

  const toggle = (id: number) =>
    setAbiertos((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    // Densidad `comfortable`: es un listado de lectura paginado, donde el
    // usuario recorre filas buscando una persona. No hay `maxHeight` a
    // propósito — la página ya scrollea y un scroll interno en un listado
    // corto solo agrega una barra más para pelear.
    <TableContainer>
      {/* `table-fixed` + anchos explícitos: con `auto`, una disciplina larga
          estiraba la tabla más allá del contenedor y aparecía el scroll
          horizontal que este listado justamente quiere evitar. Con anchos
          fijos el texto se recorta y el dato completo vive en el desplegable. */}
      <Table className="table-fixed">
        <TableHead>
          <tr>
            <Th className="w-10" aria-label="Detalle" />
            {/* Sin ancho: el nombre se queda con el espacio sobrante porque es
                la columna con la que el usuario identifica la fila. */}
            <Th>Deportista</Th>
            <Th className="w-36">Cedula</Th>
            <Th className="w-48">Disciplina</Th>
            <Th className="w-32">Genero</Th>
            {/* `w-16` (64px) no alcanza para la palabra "Acciones": el encabezado
                no envuelve y su contenido pedía 83px, así que la tabla
                desbordaba 19px y aparecía scroll horizontal — justo lo que el
                desplegable vino a evitar. */}
            <Th className="w-24">Acciones</Th>
          </tr>
        </TableHead>
        <TableBody>
          {showInitialLoading &&
            Array.from({ length: 6 }).map((_, i) => (
              // Sin `Tr`: el hover marca la fila que el usuario está leyendo,
              // y en un esqueleto no hay nada que leer todavía.
              <tr key={`skeleton-${i}`} className="animate-pulse">
                {Array.from({ length: COLUMN_COUNT }).map((__, j) => (
                  <Td key={j}>
                    <div className="h-4 w-20 rounded bg-slate-200 dark:bg-slate-700" />
                  </Td>
                ))}
              </tr>
            ))}

          {showError && (
            <tr>
              <Td className="text-center text-red-500" colSpan={COLUMN_COUNT}>
                {error}
              </Td>
            </tr>
          )}

          {showEmpty && (
            <tr>
              <Td className="py-12 text-center" colSpan={COLUMN_COUNT}>
                <Dumbbell className="mx-auto mb-3 h-10 w-10 text-slate-300 dark:text-slate-600" />
                <p className="text-base text-slate-500 dark:text-slate-400">
                  No hay deportistas para mostrar.
                </p>
              </Td>
            </tr>
          )}

          {hasRows &&
            deportistas.map((d) => {
              const nombre = nombreCompleto(d);
              const abierto = abiertos.has(d.id);

              return (
                <Fragment key={d.id}>
                  <Tr
                    className={abierto ? "bg-slate-50 dark:bg-slate-900/50" : ""}
                  >
                    <Td className="w-10 pr-0">
                      <ExpandToggle
                        expanded={abierto}
                        onToggle={() => toggle(d.id)}
                        label={`el deportista ${nombre || d.cedula || d.id}`}
                      />
                    </Td>
                    <Td>
                      {/* Única celda con `div` propio: el nombre es la columna
                          con la que el usuario identifica la fila, por eso pesa
                          más que el resto. Las demás celdas se quedan con el
                          color del primitivo en vez de repetirlo. */}
                      <div
                        className="truncate font-semibold text-slate-800 dark:text-slate-100"
                        title={nombre || undefined}
                      >
                        {nombre || "-"}
                      </div>
                    </Td>
                    <Td className="truncate">{d.cedula || "-"}</Td>
                    <Td
                      className="truncate"
                      title={d.disciplina?.nombre ?? undefined}
                    >
                      {d.disciplina?.nombre ?? "-"}
                    </Td>
                    <Td className="truncate">{formatGenero(d.genero)}</Td>
                    <Td>
                      {/*
                      <div className="flex items-center justify-start gap-2">
                        <Link
                          href={`/deportistas/${d.id}/editar`}
                          className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700/70 text-slate-600 dark:text-slate-200 hover:border-indigo-300 hover:text-indigo-600 dark:hover:border-indigo-500/60 dark:hover:text-indigo-300 transition-colors"
                          aria-label={`Editar ${
                            d.nombres ?? d.cedula ?? "deportista"
                          }`}
                          title="Editar deportista"
                        >
                          <Pencil className="w-4 h-4" />
                        </Link>
                        <button
                          type="button"
                          onClick={() => onDelete?.(d)}
                          className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700/70 text-slate-600 dark:text-slate-200 hover:border-rose-300 hover:text-rose-600 dark:hover:border-rose-500/60 dark:hover:text-rose-300 transition-colors"
                          aria-label={`Eliminar ${
                            d.nombres ?? d.cedula ?? "deportista"
                          }`}
                          title="Eliminar deportista"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      */}
                    </Td>
                  </Tr>

                  {abierto && (
                    // Sin pie: este módulo no tiene pantalla de detalle
                    // (`/deportistas/[id]` no existe, solo `[id]/editar`), y un
                    // "Ver detalle completo" que abriera el formulario de
                    // edición prometería una cosa y haría otra.
                    <ExpandedRow colSpan={COLUMN_COUNT}>
                      <dl className="grid grid-cols-1 gap-x-10 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
                        <Dato termino="Categoria">
                          {formatCategoryLabel(
                            d.categoria?.nombre ?? d.categoriaCodigo,
                          )}
                        </Dato>
                        <Dato termino="Afiliacion">{formatAfiliacion(d)}</Dato>
                      </dl>
                    </ExpandedRow>
                  )}
                </Fragment>
              );
            })}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
