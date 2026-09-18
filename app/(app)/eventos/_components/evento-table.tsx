"use client";

import {
  TableContainer,
  Table,
  TableHead,
  TableBody,
  Th,
  Tr,
  Td,
  ExpandToggle,
  ExpandedRow,
} from "@/components/ui/table";
import { SectionLabel } from "@/components/ui/section-card";
import Link from "next/link";
import { Fragment, useState, type ReactNode } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { EyeIcon } from "@phosphor-icons/react";

import EventoIncompletoBadge from "@/components/ui/evento-incompleto-badge";
import type { Evento } from "@/types/evento";
import {
  getEventoFormasParticipacion,
  getEventoPresupuestoPorFuente,
  getEventoPresupuestoTotal,
  isEventoIncompleto,
} from "@/types/evento";
import {
  formatCurrency,
  formatEventScheduleLabel,
  formatLocationWithProvince,
} from "@/lib/utils/formatters";
import { formatCategoryLabel } from "@/lib/utils/categories";

type Props = {
  eventos: Evento[];
  loading?: boolean;
  error?: string | null;
  onDelete?: (evento: Evento) => void;
  /**
   * Permiso de gestión del evento, con el mismo significado que en
   * `EventoCard`: la página lo calcula una vez a partir del rol y se lo pasa
   * igual a las dos vistas. Si cada vista lo resolviera por su cuenta, un
   * mismo usuario podría ver acciones distintas según cómo se esté mostrando
   * el listado.
   *
   * Default `true` para que un consumidor que no conoce el permiso no oculte
   * acciones por accidente; quien sí lo conoce está obligado a pasarlo.
   */
  canManageEvents?: boolean;
};

/**
 * Seis columnas y no nueve, porque nueve obligaban a scrollear en horizontal y
 * un listado que se lee de costado deja de servir para comparar filas.
 *
 * El criterio para elegir cuáles quedan es el del propio `ExpandToggle`: se
 * ven los datos con los que el usuario compara y busca. En esta pantalla eso
 * está definido por los controles de `eventos/page.tsx` — busca por nombre,
 * lugar y código, y filtra por estado y disciplina. Filtrar por un campo que
 * no se ve obliga a confiar en que el filtro hizo lo que dijo, así que los
 * cinco campos filtrables/buscables se quedan en columna (nombre y código
 * comparten celda) y el resto se va al desplegable.
 *
 * OJO: también lo usan las filas de carga, error y vacío. Si queda
 * desincronizado con los `Th`, esas filas rompen el ancho de la tabla.
 */
const COLUMN_COUNT = 6;

/**
 * Mismo tono pastel que los badges de etapa de avales (`lib/constants.ts`):
 * fondo `-50`, borde `-200`, texto `-700`. El borde entra en la clase porque
 * un fondo `-50` sobre blanco no se recorta solo y el chip deja de leerse
 * como etiqueta.
 *
 * Están duplicados y no importados de `lib/constants` a propósito: los
 * estados de un evento no son los de un aval, y unificar el mapa ataría dos
 * dominios que cambian por motivos distintos. Lo que sí tiene que coincidir
 * es la receta de color.
 */
const STATUS_NEUTRO =
  "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-600 dark:bg-slate-700/40 dark:text-slate-300";

const STATUS_STYLES: Record<string, string> = {
  DISPONIBLE:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300",
  SOLICITADO:
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300",
  RECHAZADO:
    "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300",
  ACEPTADO:
    "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-300",
};

function getStatusClasses(status?: string | null) {
  if (!status) return STATUS_NEUTRO;
  return STATUS_STYLES[status.toUpperCase()] ?? STATUS_NEUTRO;
}

/**
 * Aviso de reforma pendiente, en índigo y no en ámbar como en la tarjeta.
 *
 * En la tarjeta vivía en el pie, lejos del badge de datos faltantes; acá los
 * dos avisos comparten la celda del nombre, y dos chips ámbar pegados se leen
 * como uno solo partido en dos. El índigo los separa de un vistazo sin
 * cambiar la receta pastel.
 */
const REFORMA_PENDIENTE_CLASSES =
  "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-300";

/**
 * Mismo resumen que mostraba la tarjeta. Se copia el texto tal cual para no
 * cambiar lo que el usuario venía leyendo.
 */
function getParticipacionSummary(evento: Evento) {
  const formas = getEventoFormasParticipacion(evento);
  if (formas.length === 0) return "Sin formas de participación";
  if (formas.length === 1) return "1 forma de participación";
  return `${formas.length} formas de participación`;
}

/**
 * Par rótulo/valor del panel desplegable.
 *
 * El rótulo sale de `SectionLabel` y no de una clase escrita a mano: es el
 * mismo micro-patrón que rotula datos en las fichas de detalle, y copiarlo
 * suelto es justamente lo que había hecho que el mismo tipo de etiqueta se
 * viera distinto en cada pantalla.
 */
function Detalle({
  termino,
  children,
}: {
  termino: string;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <SectionLabel as="dt">{termino}</SectionLabel>
      <dd className="mt-1 text-sm text-slate-700 dark:text-slate-300">
        {children}
      </dd>
    </div>
  );
}

export default function EventoTable({
  eventos,
  loading,
  error,
  onDelete,
  canManageEvents = true,
}: Props) {
  const showEmpty = !loading && !error && eventos.length === 0;
  // Varias filas pueden estar abiertas a la vez, igual que en avales: sirve
  // para comparar el presupuesto o la programación de dos eventos sin tener
  // que cerrar uno para ver el otro.
  const [abiertos, setAbiertos] = useState<Set<number>>(new Set());

  const toggle = (id: number) =>
    setAbiertos((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <TableContainer>
        <Table>
          <TableHead>
              <tr>
                <Th className="w-10" aria-label="Detalle" />
                <Th>Nombre</Th>
                <Th>Disciplina</Th>
                <Th>Lugar</Th>
                <Th>Estado</Th>
                <Th>Acciones</Th>
              </tr>
            </TableHead>
            <TableBody>
              {loading && (
                <tr>
                  <Td
                    className="text-center text-slate-500 dark:text-slate-400"
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
                    className="text-center text-slate-500 dark:text-slate-400"
                    colSpan={COLUMN_COUNT}
                  >
                    No hay eventos registrados.
                  </Td>
                </tr>
              )}

              {!loading &&
                !error &&
                eventos.map((evento) => {
                  // Mismos helpers que usaba la tarjeta: el cálculo del
                  // presupuesto vive en `types/evento`, no se rehace acá.
                  const presupuestoPorFuente =
                    getEventoPresupuestoPorFuente(evento);
                  const totalFondosPublicos =
                    presupuestoPorFuente.find(
                      (item) => item.fuente === "FONDOS_PUBLICOS"
                    )?.total ?? 0;
                  const totalAutogestion =
                    presupuestoPorFuente.find(
                      (item) => item.fuente === "AUTOGESTION"
                    )?.total ?? 0;
                  const totalPresupuesto = getEventoPresupuestoTotal(evento);
                  const hasBudget = totalPresupuesto > 0;
                  const abierto = abiertos.has(evento.id);
                  const nombreLegible =
                    evento.nombre ?? evento.codigo ?? "evento";

                  return (
                  <Fragment key={evento.id}>
                  <Tr
                    className={
                      abierto ? "bg-slate-50 dark:bg-slate-900/50" : ""
                    }
                  >
                    <Td className="w-10 pr-0">
                      <ExpandToggle
                        expanded={abierto}
                        onToggle={() => toggle(evento.id)}
                        label={`el evento ${nombreLegible}`}
                      />
                    </Td>
                    <Td>
                      {/* El nombre es el enlace al detalle. La tarjeta
                          navegaba desde cualquier punto, pero hacer clickeable
                          la fila entera rompe la selección de texto y anida
                          los botones de acción dentro de un enlace. OJO: esto
                          NO copia a `aval-list-table.tsx` — ahí el nombre es
                          un `span` y el detalle se abre solo desde el botón.
                          Es un patrón nuevo, elegido para no perder el acceso
                          rápido que daba la tarjeta. */}
                      {/* Ancho acotado + `truncate` en vez de dejar crecer la
                          celda: la tarjeta recortaba el nombre a dos líneas, y
                          sin tope un solo evento de nombre largo estira toda
                          la tabla. El `title` conserva el texto completo. */}
                      <Link
                        href={`/eventos/${evento.id}`}
                        title={evento.nombre ?? undefined}
                        className="block max-w-[260px] truncate font-semibold text-slate-800 hover:text-indigo-600 hover:underline dark:text-slate-100 dark:hover:text-indigo-400 transition-colors"
                      >
                        {evento.nombre || "-"}
                      </Link>
                      {(isEventoIncompleto(evento) ||
                        evento.tieneReformaPendiente) && (
                        <div className="mt-1 flex flex-wrap items-center gap-1">
                          {isEventoIncompleto(evento) && (
                            <EventoIncompletoBadge compact />
                          )}
                          {evento.tieneReformaPendiente && (
                            <span
                              className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${REFORMA_PENDIENTE_CLASSES}`}
                            >
                              Reforma pendiente
                            </span>
                          )}
                        </div>
                      )}
                      {evento.codigo && (
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          {evento.codigo}
                        </div>
                      )}
                    </Td>
                    {/* El color del texto lo pone el `tbody`; repetirlo acá
                        solo duplicaba la clase sin cambiar nada. */}
                    <Td>{evento.disciplina?.nombre || "-"}</Td>
                    <Td>{formatLocationWithProvince(evento)}</Td>
                    <Td>
                      <div className="flex flex-col gap-1">
                        <span
                          className={`inline-flex items-center justify-center rounded-full border px-3 py-1 text-xs font-semibold tracking-wide uppercase ${getStatusClasses(
                            evento.estado
                          )}`}
                        >
                          {evento.estado || "Desconocido"}
                        </span>
                        {evento.alcance && (
                          <span className="text-xs text-slate-400 dark:text-slate-500">
                            {evento.alcance}
                          </span>
                        )}
                      </div>
                    </Td>
                    <Td>
                      <div className="flex items-center justify-start gap-2">
                        {/* Acá vivía un botón-ojo hacia el detalle. Se sacó al
                            aparecer el desplegable: el nombre de la fila ya es
                            ese enlace y el pie del detalle lo repite, así que
                            eran tres accesos al mismo lugar en la misma fila.
                            Editar y Eliminar se quedan porque no tienen otra
                            puerta de entrada desde el listado. */}
                        {canManageEvents && (
                          <Link
                            href={`/eventos/${evento.id}/editar`}
                            className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700/70 text-slate-600 dark:text-slate-200 hover:border-indigo-300 hover:text-indigo-600 dark:hover:border-indigo-500/60 dark:hover:text-indigo-300 transition-colors"
                            aria-label={`Editar ${nombreLegible}`}
                            title="Editar evento"
                          >
                            <Pencil className="w-4 h-4" />
                          </Link>
                        )}
                        {/* Eliminar exige las DOS condiciones y no solo el
                            permiso: `onDelete` es opcional, así que sin
                            handler el click no dispara nada. Un botón que se
                            dibuja y no hace nada es peor que uno ausente,
                            porque el usuario cree que la acción existe y no
                            entiende por qué no pasa nada. */}
                        {canManageEvents && onDelete && (
                          <button
                            type="button"
                            onClick={() => onDelete(evento)}
                            className="h-9 w-9 inline-flex cursor-pointer items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700/70 text-slate-600 dark:text-slate-200 hover:border-rose-300 hover:text-rose-600 dark:hover:border-rose-500/60 dark:hover:text-rose-300 transition-colors"
                            aria-label={`Eliminar ${nombreLegible}`}
                            title="Eliminar evento"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </Td>
                  </Tr>

                  {abierto && (
                    <ExpandedRow
                      colSpan={COLUMN_COUNT}
                      // Sin condición de permiso, igual que el enlace del
                      // nombre: consultar el detalle es lo que puede hacer
                      // cualquiera que ya tiene acceso al listado; lo que
                      // `canManageEvents` restringe son editar y eliminar.
                      footer={
                        <Link
                          href={`/eventos/${evento.id}`}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 transition-colors hover:bg-indigo-100 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-300 dark:hover:bg-indigo-500/20"
                        >
                          <EyeIcon size={14} aria-hidden="true" />
                          Ver detalle completo
                        </Link>
                      }
                    >
                      <dl className="grid grid-cols-1 gap-x-10 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
                        <Detalle termino="Tipo de evento">
                          <div>{evento.tipoEvento || "-"}</div>
                          {/* Las formas de participación cuelgan del tipo de
                              evento y no son un dato aparte: es un conteo, y
                              justamente describe cómo se participa en ese
                              tipo de evento. */}
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            {getParticipacionSummary(evento)}
                          </div>
                        </Detalle>
                        <Detalle termino="Categoría">
                          {formatCategoryLabel(
                            evento.categoria?.nombre ?? evento.categoriaCodigo
                          )}
                        </Detalle>
                        <Detalle termino="Programación">
                          {formatEventScheduleLabel(evento)}
                        </Detalle>
                        {/* `tabular-nums` fija el ancho de cada dígito: sin
                            eso las cifras no alinean y comparar dos eventos
                            abiertos a la vez obliga a leer número por
                            número. */}
                        <Detalle termino="Presupuesto">
                          {hasBudget ? (
                            <div className="tabular-nums">
                              <div className="font-semibold text-emerald-600 dark:text-emerald-400">
                                {formatCurrency(totalPresupuesto)}
                              </div>
                              <div className="text-xs text-slate-500 dark:text-slate-400">
                                Públicos {formatCurrency(totalFondosPublicos)} ·
                                Autogestión {formatCurrency(totalAutogestion)}
                              </div>
                            </div>
                          ) : (
                            // La tarjeta directamente escondía el bloque
                            // cuando no había presupuesto; acá el rótulo
                            // existe igual, así que el vacío se marca
                            // explícito.
                            <span className="text-slate-400 dark:text-slate-500">
                              -
                            </span>
                          )}
                        </Detalle>
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
