"use client";

import type { Deportista } from "@/types/deportista";

type Props = {
  deportistas: Deportista[];
  loading?: boolean;
  error?: string | null;
  onDelete?: (deportista: Deportista) => void;
};

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString();
}

function formatGenero(genero?: string | null) {
  if (!genero) return "-";
  const upper = genero.toUpperCase();
  if (upper === "M" || upper === "MASCULINO") return "Masculino";
  if (upper === "F" || upper === "FEMENINO") return "Femenino";
  if (upper === "O" || upper === "OTRO") return "Otro";
  return genero;
}

function formatAfiliacion(d: Deportista) {
  if (!d.afiliacion) return "No afiliado";
  if (d.afiliacionFin) {
    return `Vigente hasta ${formatDate(d.afiliacionFin)}`;
  }
  return "Vigente";
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

  return (
    <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl relative overflow-hidden">
      <div className="overflow-x-auto min-h-[26rem]">
        <table className="table-auto w-full dark:text-gray-300">
          <thead className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/20 border-b border-gray-100 dark:border-gray-700/60">
              <tr>
                <th className="px-2 first:pl-5 last:pr-5 py-3 whitespace-nowrap">
                  <div className="font-semibold text-left">Nombres</div>
                </th>
                <th className="px-2 first:pl-5 last:pr-5 py-3 whitespace-nowrap">
                  <div className="font-semibold text-left">Apellidos</div>
                </th>
                <th className="px-2 first:pl-5 last:pr-5 py-3 whitespace-nowrap">
                  <div className="font-semibold text-left">Cedula</div>
                </th>
                <th className="px-2 first:pl-5 last:pr-5 py-3 whitespace-nowrap">
                  <div className="font-semibold text-left">Categoria</div>
                </th>
                <th className="px-2 first:pl-5 last:pr-5 py-3 whitespace-nowrap">
                  <div className="font-semibold text-left">Disciplina</div>
                </th>
                <th className="px-2 first:pl-5 last:pr-5 py-3 whitespace-nowrap">
                  <div className="font-semibold text-left">Genero</div>
                </th>
                <th className="px-2 first:pl-5 last:pr-5 py-3 whitespace-nowrap">
                  <div className="font-semibold text-left">Afiliacion</div>
                </th>
                <th className="px-2 first:pl-5 last:pr-5 py-3 whitespace-nowrap">
                  <div className="font-semibold text-left">Acciones</div>
                </th>
              </tr>
            </thead>
            {/* Table body */}
            <tbody className="text-sm divide-y divide-gray-100 dark:divide-gray-700/60">
              {showInitialLoading && (
                <tr>
                  <td
                    className="px-2 first:pl-5 last:pr-5 py-4 whitespace-nowrap text-center text-gray-500 dark:text-gray-400"
                    colSpan={8}
                  >
                    Cargando deportistas...
                  </td>
                </tr>
              )}

              {showError && (
                <tr>
                  <td
                    className="px-2 first:pl-5 last:pr-5 py-4 whitespace-nowrap text-center text-red-500"
                    colSpan={8}
                  >
                    {error}
                  </td>
                </tr>
              )}

              {showEmpty && (
                <tr>
                  <td
                    className="px-2 first:pl-5 last:pr-5 py-4 whitespace-nowrap text-center text-gray-500 dark:text-gray-400"
                    colSpan={8}
                  >
                    No hay deportistas para mostrar.
                  </td>
                </tr>
              )}

              {hasRows &&
                deportistas.map((d) => (
                  <tr key={d.id}>
                    <td className="px-2 first:pl-5 last:pr-5 py-2 whitespace-nowrap">
                      <div className="font-semibold text-gray-800 dark:text-gray-100">
                        {d.nombres || "-"}
                      </div>
                    </td>
                    <td className="px-2 first:pl-5 last:pr-5 py-2 whitespace-nowrap">
                      <div className="text-gray-700 dark:text-gray-300">
                        {d.apellidos || "-"}
                      </div>
                    </td>
                    <td className="px-2 first:pl-5 last:pr-5 py-2 whitespace-nowrap">
                      <div className="text-gray-700 dark:text-gray-300">
                        {d.cedula || "-"}
                      </div>
                    </td>
                    <td className="px-2 first:pl-5 last:pr-5 py-2 whitespace-nowrap">
                      <div className="text-gray-700 dark:text-gray-300">
                        {d.categoria?.nombre ?? "-"}
                      </div>
                    </td>
                    <td className="px-2 first:pl-5 last:pr-5 py-2 whitespace-nowrap">
                      <div className="text-gray-700 dark:text-gray-300">
                        {d.disciplina?.nombre ?? "-"}
                      </div>
                    </td>
                    <td className="px-2 first:pl-5 last:pr-5 py-2 whitespace-nowrap">
                      <div className="text-gray-700 dark:text-gray-300">
                        {formatGenero(d.genero)}
                      </div>
                    </td>
                    <td className="px-2 first:pl-5 last:pr-5 py-2 whitespace-nowrap">
                      <div className="text-gray-700 dark:text-gray-300">
                        {formatAfiliacion(d)}
                      </div>
                    </td>
                    <td className="px-2 first:pl-5 last:pr-5 py-2 whitespace-nowrap">
                      {/*
                      <div className="flex items-center justify-start gap-2">
                        <Link
                          href={`/deportistas/${d.id}/editar`}
                          className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700/70 text-gray-600 dark:text-gray-200 hover:border-indigo-300 hover:text-indigo-600 dark:hover:border-indigo-500/60 dark:hover:text-indigo-300 transition-colors"
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
                          className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700/70 text-gray-600 dark:text-gray-200 hover:border-rose-300 hover:text-rose-600 dark:hover:border-rose-500/60 dark:hover:text-rose-300 transition-colors"
                          aria-label={`Eliminar ${
                            d.nombres ?? d.cedula ?? "deportista"
                          }`}
                          title="Eliminar deportista"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      */}
                    </td>
                  </tr>
                ))}
            </tbody>
        </table>
      </div>
    </div>
  );
}
