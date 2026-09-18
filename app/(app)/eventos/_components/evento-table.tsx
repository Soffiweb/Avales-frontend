"use client";

import {
  TableContainer,
  Table,
  TableHead,
  TableBody,
  Th,
  Tr,
  Td,
} from "@/components/ui/table";
import Link from "next/link";
import { Eye, Pencil, Trash2 } from "lucide-react";

import EventoIncompletoBadge from "@/components/ui/evento-incompleto-badge";
import type { Evento } from "@/types/evento";
import { isEventoIncompleto } from "@/types/evento";
import {
  formatEventScheduleLabel,
  formatLocationWithProvince,
} from "@/lib/utils/formatters";
import { formatCategoryLabel } from "@/lib/utils/categories";

type Props = {
  eventos: Evento[];
  loading?: boolean;
  error?: string | null;
  onDelete?: (evento: Evento) => void;
};

const COLUMN_COUNT = 8;

const STATUS_STYLES: Record<string, string> = {
  DISPONIBLE:
    "bg-green-100 text-green-800 dark:bg-green-900/60 dark:text-green-200",
  SOLICITADO:
    "bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200",
  RECHAZADO: "bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-200",
  ACEPTADO: "bg-sky-100 text-sky-800 dark:bg-sky-900/60 dark:text-sky-200",
};

function getStatusClasses(status?: string | null) {
  if (!status)
    return "bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-200";
  return (
    STATUS_STYLES[status.toUpperCase()] ??
    "bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-200"
  );
}

export default function EventoTable({
  eventos,
  loading,
  error,
  onDelete,
}: Props) {
  const showEmpty = !loading && !error && eventos.length === 0;

  return (
    <TableContainer>
        <Table>
          <TableHead>
              <tr>
                <Th>Nombre</Th>
                <Th>Tipo de evento</Th>

                <Th>Disciplina</Th>
                <Th>Categoría</Th>
                <Th>Lugar</Th>
                <Th>Programación</Th>
                <Th>Estado</Th>
                <Th>Acciones</Th>
              </tr>
            </TableHead>
            <TableBody>
              {loading && (
                <tr>
                  <Td
                    className="text-center text-gray-500 dark:text-gray-400"
                    colSpan={COLUMN_COUNT}
                  >
                    Cargando eventos...
                  </Td>
                </tr>
              )}

              {error && !loading && (
                <tr>
                  <Td
                    className="text-center text-red-500"
                    colSpan={COLUMN_COUNT}
                  >
                    {error}
                  </Td>
                </tr>
              )}

              {showEmpty && (
                <tr>
                  <Td
                    className="text-center text-gray-500 dark:text-gray-400"
                    colSpan={COLUMN_COUNT}
                  >
                    No hay eventos registrados.
                  </Td>
                </tr>
              )}

              {!loading &&
                !error &&
                eventos.map((evento) => (
                  <Tr key={evento.id}>
                    <Td>
                      <div className="font-semibold text-gray-800 dark:text-gray-100">
                        {evento.nombre || "-"}
                      </div>
                      {isEventoIncompleto(evento) && (
                        <div className="mt-1">
                          <EventoIncompletoBadge compact />
                        </div>
                      )}
                      {evento.codigo && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {evento.codigo}
                        </div>
                      )}
                    </Td>
                    <Td>
                      <div className="text-gray-700 dark:text-gray-300">
                        {evento.tipoEvento || "-"}
                      </div>
                    </Td>
                    <Td>
                      <div className="text-gray-700 dark:text-gray-300">
                        {evento.disciplina?.nombre || "-"}
                      </div>
                    </Td>
                    <Td>
                      <div className="text-gray-700 dark:text-gray-300">
                        {formatCategoryLabel(
                          evento.categoria?.nombre ?? evento.categoriaCodigo
                        )}
                      </div>
                    </Td>
                    <Td>
                      <div className="text-gray-700 dark:text-gray-300">
                        {formatLocationWithProvince(evento)}
                      </div>
                    </Td>
                    <Td>
                      <div className="text-gray-700 dark:text-gray-300">
                        {formatEventScheduleLabel(evento)}
                      </div>
                    </Td>
                    <Td>
                      <div className="flex flex-col gap-1">
                        <span
                          className={`inline-flex items-center justify-center rounded-full px-3 py-1 text-xs font-semibold tracking-wide uppercase ${getStatusClasses(
                            evento.estado
                          )}`}
                        >
                          {evento.estado || "Desconocido"}
                        </span>
                        {evento.alcance && (
                          <span className="text-xs text-gray-400 dark:text-gray-500">
                            {evento.alcance}
                          </span>
                        )}
                      </div>
                    </Td>
                    <Td>
                      <div className="flex items-center justify-start gap-2">
                        <Link
                          href={`/eventos/${evento.id}`}
                          className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700/70 text-gray-600 dark:text-gray-200 hover:border-sky-300 hover:text-sky-600 dark:hover:border-sky-500/60 dark:hover:text-sky-300 transition-colors"
                          aria-label={`Ver ${
                            evento.nombre ?? evento.codigo ?? "evento"
                          }`}
                          title="Ver evento"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        <Link
                          href={`/eventos/${evento.id}/editar`}
                          className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700/70 text-gray-600 dark:text-gray-200 hover:border-indigo-300 hover:text-indigo-600 dark:hover:border-indigo-500/60 dark:hover:text-indigo-300 transition-colors"
                          aria-label={`Editar ${
                            evento.nombre ?? evento.codigo ?? "evento"
                          }`}
                          title="Editar evento"
                        >
                          <Pencil className="w-4 h-4" />
                        </Link>
                        <button
                          type="button"
                          onClick={() => onDelete?.(evento)}
                          className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700/70 text-gray-600 dark:text-gray-200 hover:border-rose-300 hover:text-rose-600 dark:hover:border-rose-500/60 dark:hover:text-rose-300 transition-colors"
                          aria-label={`Eliminar ${
                            evento.nombre ?? evento.codigo ?? "evento"
                          }`}
                          title="Eliminar evento"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </Td>
                  </Tr>
                ))}
            </TableBody>
        </Table>
    </TableContainer>
  );
}
