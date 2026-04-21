"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  UserPlus,
} from "lucide-react";
import { type ColumnDef } from "./template-columns";
import type { CheckCedulasResponse } from "@/lib/api/user";

type Props = {
  columns: ColumnDef[];
  rows: Record<string, string>[];
  existingCedulas?: CheckCedulasResponse | null;
  rowIssues?: Record<number, Record<string, string>>;
  pageSize?: number;
};

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
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
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

      <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        <div className="overflow-auto max-h-[70vh] min-h-[320px]">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0 z-10">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  #
                </th>
                {showStatus && (
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Estado
                  </th>
                )}
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={`px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider ${
                      col.itemDescription ? "min-w-[100px]" : "whitespace-nowrap"
                    }`}
                    title={col.itemDescription || undefined}
                  >
                    {col.itemDescription ? (
                      <div className="flex flex-col gap-0.5">
                        <span className="font-bold text-indigo-600 dark:text-indigo-400">
                          {col.label}
                        </span>
                        <span className="text-[10px] font-normal normal-case text-gray-400 dark:text-gray-500 leading-tight whitespace-normal max-w-[120px]">
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
                  </th>
                ))}
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Errores
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
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
                  <tr
                    key={rowIndex}
                    className={
                      hasRowIssues
                        ? "bg-rose-50/50 dark:bg-rose-900/10"
                        : idx % 2 === 0
                          ? ""
                          : "bg-gray-50/50 dark:bg-gray-800/30"
                    }
                    >
                    <td className="px-3 py-2 text-xs text-gray-400 font-mono">
                      {rowIndex + 1}
                    </td>
                    {showStatus && (
                      <td className="px-3 py-2 whitespace-nowrap">
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
                      </td>
                    )}
                    {columns.map((col) => {
                      const value = row[col.key] ?? "";
                      const isEmpty =
                        col.required && !value.toString().trim();
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
                        <td
                          key={col.key}
                          className={`px-3 py-2 text-sm whitespace-nowrap ${
                            issueMessage || isEmpty
                              ? "text-rose-500 dark:text-rose-400 italic"
                              : "text-gray-900 dark:text-gray-100"
                          }`}
                          title={issueMessage || (unitCost ? `Total: $${numValue} / ${totalPersonas} personas = $${unitCost} c/u` : undefined)}
                        >
                          {issueMessage ? (
                            value.toString() || "inválido"
                          ) : isEmpty ? (
                            "vacio"
                          ) : isBudgetCol && numValue > 0 ? (
                            <div className="flex flex-col">
                              <span>${numValue}</span>
                              {unitCost && (
                                <span className="text-[10px] text-gray-400 dark:text-gray-500">
                                  ${unitCost}/persona
                                </span>
                              )}
                            </div>
                          ) : (
                            value.toString()
                          )}
                        </td>
                      );
                    })}
                    <td className="px-3 py-2 align-top">
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
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
