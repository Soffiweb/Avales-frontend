"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  UserPlus,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableContainer,
  TableHead,
  Td,
  Th,
  Tr,
} from "@/components/ui/table";
import { type ColumnDef } from "./template-columns";
import type { CheckCedulasResponse } from "@/lib/api/user";

type Props = {
  columns: ColumnDef[];
  rows: Record<string, string>[];
  existingCedulas?: CheckCedulasResponse | null;
  rowIssues?: Record<number, Record<string, string>>;
  pageSize?: number;
};

/**
 * Celda con dato inválido o faltante.
 *
 * Va aplicada a un elemento adentro del `Td` y no a su `className`: el
 * `text-slate-700` del primitivo y `text-rose-500` tienen la misma
 * especificidad, así que no gana el atributo sino el que Tailwind emite
 * último en la hoja de estilos — y `slate` va después de `rose`. Adentro de
 * la celda no compite con nada y el error se ve siempre.
 */
const INVALID_CELL_CLASS = "italic text-rose-500 dark:text-rose-400";

export default function DataPreviewTable({
  columns,
  rows,
  existingCedulas,
  rowIssues = {},
  pageSize = 50,
}: Props) {
  const [page, setPage] = useState(1);
  const showStatus = !!existingCedulas;
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  const end = Math.min(start + pageSize, rows.length);
  const displayRows = rows.slice(start, end);

  useEffect(() => {
    setPage(1);
  }, [rows.length, pageSize]);

  // Count new vs existing
  const newCount = showStatus
    ? rows.filter((r) => !existingCedulas![r["CEDULA"]]).length
    : 0;
  const existingCount = showStatus ? rows.length - newCount : 0;

  if (rows.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500 dark:text-slate-400">
        No se encontraron datos en el archivo.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-sm text-gray-600 dark:text-gray-300">
          <span className="font-semibold">{rows.length}</span> fila
          {rows.length !== 1 ? "s" : ""} encontrada
          {rows.length !== 1 ? "s" : ""}
        </p>

        {showStatus && (
          <div className="flex items-center gap-4 text-xs">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 font-medium">
              <UserPlus className="w-3.5 h-3.5" />
              {newCount} nuevo{newCount !== 1 ? "s" : ""}
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300 font-medium">
              <UserCheck className="w-3.5 h-3.5" />
              {existingCount} existente{existingCount !== 1 ? "s" : ""}
            </span>
          </div>
        )}

        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <span>
            Mostrando {start + 1}-{end} de {rows.length}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={safePage === 1}
              className="inline-flex items-center justify-center rounded-md border border-gray-200 dark:border-gray-700 p-1.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="Página anterior"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <span className="min-w-[72px] text-center font-medium text-gray-700 dark:text-gray-200">
              {safePage}/{totalPages}
            </span>
            <button
              type="button"
              onClick={() =>
                setPage((current) => Math.min(totalPages, current + 1))
              }
              disabled={safePage === totalPages}
              className="inline-flex items-center justify-center rounded-md border border-gray-200 dark:border-gray-700 p-1.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="Página siguiente"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/*
        Densidad `dense`: esto es una previsualización previa a confirmar la
        carga, donde lo que importa es cuántas filas del archivo se pueden
        revisar de un vistazo, no el descanso visual.

        `maxHeight` conserva el 70vh que ya tenía este bloque a mano. Es el
        alto que deja la tabla grande sin empujar fuera de pantalla el resumen
        de validación de arriba ni los botones de confirmar/cambiar archivo de
        abajo, que son los que cierran el flujo. Además es lo que habilita el
        encabezado fijo: sin un alto que recorte, el que scrollea es la página
        entera y el `sticky` no tiene contra qué anclarse.

        El `TableContainer` reemplaza el borde + scroll que este componente
        armaba a mano; su consumidor (`carga-masiva/page.tsx`) lo renderiza
        suelto dentro de un `space-y-6`, así que no hay riesgo de doble borde.
      */}
      <TableContainer density="dense" maxHeight="70vh">
        <Table>
          <TableHead sticky>
            <tr>
              <Th>#</Th>
              {showStatus && <Th>Estado</Th>}
              {columns.map((col) => (
                <Th
                  key={col.key}
                  className={col.itemDescription ? "min-w-[100px]" : ""}
                  title={col.itemDescription || undefined}
                >
                  {col.itemDescription ? (
                    <div className="flex flex-col gap-0.5">
                      {/* `whitespace-normal` explícito: el `Th` es nowrap y
                          estos nombres de ítem de presupuesto son largos, así
                          que sin esto una sola columna estiraría la tabla. */}
                      <span className="whitespace-normal font-bold text-indigo-600 dark:text-indigo-400">
                        {col.label}
                      </span>
                      <span className="text-[10px] font-normal normal-case text-slate-400 dark:text-slate-500 leading-tight whitespace-normal max-w-[120px]">
                        {col.itemDescription}
                      </span>
                    </div>
                  ) : (
                    <>
                      {col.label}
                      {col.required && (
                        <span className="text-rose-500 ml-0.5">*</span>
                      )}
                    </>
                  )}
                </Th>
              ))}
              <Th>Errores</Th>
            </tr>
          </TableHead>
          <TableBody>
            {displayRows.map((row, idx) => {
              const rowIndex = start + idx;
              const hasEmptyRequired = columns.some(
                (col) => col.required && !row[col.key]?.toString().trim()
              );
              const currentIssues = rowIssues[rowIndex] ?? {};
              const hasRowIssues =
                hasEmptyRequired || Object.keys(currentIssues).length > 0;
              const cedula = row["CEDULA"];
              const isExisting = showStatus && cedula && existingCedulas![cedula];
              const existingUser = isExisting ? existingCedulas![cedula] : null;
              const issueSummary = Object.values(currentIssues).flat().join(" | ");

              return (
                <Tr
                  key={rowIndex}
                  className={
                    hasRowIssues
                      ? "bg-rose-50/50 dark:bg-rose-900/10"
                      : idx % 2 === 0
                        ? ""
                        : "bg-slate-50/50 dark:bg-slate-800/30"
                  }
                >
                  <Td className="font-mono text-xs">
                    {/* El número de fila es referencia para ubicar el error en
                        el Excel, no un dato del archivo: va apagado para que no
                        compita con las columnas reales. */}
                    <span className="text-slate-400 dark:text-slate-500">
                      {rowIndex + 1}
                    </span>
                  </Td>
                  {showStatus && (
                    <Td>
                      {hasRowIssues ? (
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300"
                          title={issueSummary || "Fila con errores"}
                        >
                          <AlertTriangle className="w-3 h-3" />
                          Con error
                        </span>
                      ) : isExisting ? (
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300"
                          title={`Ya existe: ${existingUser!.nombre} ${existingUser!.apellido}`}
                        >
                          <UserCheck className="w-3 h-3" />
                          Existente
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                          <UserPlus className="w-3 h-3" />
                          Nuevo
                        </span>
                      )}
                    </Td>
                  )}
                  {columns.map((col) => {
                    const value = row[col.key] ?? "";
                    const isEmpty = col.required && !value.toString().trim();
                    const issueMessage = currentIssues[col.key];

                    // For budget item columns, show total + unit cost
                    const isBudgetCol = !!col.itemDescription;
                    const numValue = isBudgetCol ? Number(value) : 0;
                    const entrenadores = Number(row["Entrenadores"] || 0);
                    const atletas = Number(row["Atletas"] || 0);
                    const totalPersonas = entrenadores + atletas;
                    const unitCost =
                      isBudgetCol && numValue > 0 && totalPersonas > 0
                        ? (numValue / totalPersonas).toFixed(2)
                        : null;

                    return (
                      <Td
                        key={col.key}
                        title={issueMessage || (unitCost ? `Total: $${numValue} / ${totalPersonas} personas = $${unitCost} c/u` : undefined)}
                      >
                        {issueMessage ? (
                          <span className={INVALID_CELL_CLASS}>
                            {value.toString() || "inválido"}
                          </span>
                        ) : isEmpty ? (
                          <span className={INVALID_CELL_CLASS}>vacio</span>
                        ) : isBudgetCol && numValue > 0 ? (
                          <div className="flex flex-col">
                            <span>${numValue}</span>
                            {unitCost && (
                              <span className="text-[10px] text-slate-400 dark:text-slate-500">
                                ${unitCost}/persona
                              </span>
                            )}
                          </div>
                        ) : (
                          value.toString()
                        )}
                      </Td>
                    );
                  })}
                  {/* `wrap` acá y no en el resto: los mensajes de error son
                      texto largo y su `break-words` no sirve de nada si la
                      celda hereda el `whitespace-nowrap` del primitivo. */}
                  <Td wrap className="align-top">
                    {Object.keys(currentIssues).length > 0 ? (
                      <div className="space-y-1">
                        {Object.entries(currentIssues).map(([field, message]) => (
                          <div
                            key={field}
                            className="inline-flex max-w-full items-start gap-1 rounded-md bg-rose-100 px-2 py-1 text-xs text-rose-700 dark:bg-rose-900/40 dark:text-rose-300"
                            title={message}
                          >
                            <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                            <span className="break-words">
                              {field}: {message}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-emerald-600 dark:text-emerald-400">
                        Sin errores
                      </span>
                    )}
                  </Td>
                </Tr>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </div>
  );
}
