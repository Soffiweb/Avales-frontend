"use client";

import Link from "next/link";
import { Fragment, useState, type ReactNode } from "react";
import { ClipboardTextIcon, EyeIcon } from "@phosphor-icons/react";

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
import {
  TIPO_REFORMA_LABELS,
  type ReformResponse,
  type TipoReforma,
} from "@/lib/api/reforms";
import { formatDateTimeShort } from "@/lib/utils/formatters";
import { getInvolvedEventoIds, getPrimaryEvento } from "../_lib/summary";

type Props = {
  reformas: ReformResponse[];
  /**
   * Disciplina por id de evento. Viene de afuera porque no está en la reforma:
   * la página ya trae el listado de eventos para filtrar por rol y arma el
   * mapa de paso. Pedirlo acá de nuevo sería una segunda llamada para un dato
   * que el padre ya tiene en memoria.
   */
  disciplinaMap: Map<number, string>;
  loading?: boolean;
};

/**
 * Seis columnas y no diez, porque diez obligaban a scrollear en horizontal y
 * un listado que se lee de costado deja de servir para comparar filas.
 *
 * El criterio para elegir cuáles quedan es el del propio `ExpandToggle`: se
 * ven los datos con los que el usuario compara y busca. Acá eso lo definen
 * los controles de `reformas/page.tsx` — busca por motivo y por evento, y
 * filtra por estado y por tipo. Filtrar por un campo que no se ve obliga a
 * confiar en que el filtro hizo lo que dijo, así que esos cuatro se quedan a
 * la vista; el tipo comparte celda con el número de reforma, que es la
 * identidad de la fila y no puede faltar.
 *
 * OJO: también lo usan las filas fantasma y la fila de vacío. Si queda
 * desincronizado con los `Th`, esas filas rompen el ancho de la tabla.
 */
const COLUMN_COUNT = 6;

/**
 * Misma receta pastel que `evento-table.tsx` y los badges de etapa de avales:
 * fondo `-50`, borde `-200`, texto `-700`; en oscuro `-500/10`, `-500/30` y
 * `-300`. El borde es parte de la receta porque un fondo `-50` sobre blanco no
 * se recorta solo y el chip deja de leerse como etiqueta.
 *
 * Los mapas son propios y no importados: los estados de una reforma
 * (PENDIENTE / APROBADA / RECHAZADA) no son los de un evento ni los de un
 * aval. Lo que se comparte es la receta de color, no la lista de estados.
 */
const BADGE_NEUTRO =
  "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-600 dark:bg-slate-700/40 dark:text-slate-300";

const STATUS_STYLES: Record<string, string> = {
  PENDIENTE:
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300",
  APROBADA:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300",
  RECHAZADA:
    "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300",
};

function getStatusClasses(status?: string | null) {
  if (!status) return BADGE_NEUTRO;
  return STATUS_STYLES[status.toUpperCase()] ?? BADGE_NEUTRO;
}

const TIPO_REFORMA_STYLES: Record<TipoReforma, string> = {
  DATOS_INFORMATIVOS:
    "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-300",
  PRESUPUESTO:
    "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-300",
  MIXTA:
    "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700 dark:border-fuchsia-500/30 dark:bg-fuchsia-500/10 dark:text-fuchsia-300",
};

/**
 * Una reforma multi-evento no tiene un tipo derivable: cada evento tocado
 * puede haber cambiado por motivos distintos. Por eso lleva su propio chip en
 * vez de mostrar el tipo del primer evento, que sería mentir por omisión.
 */
const TIPO_MULTI_EVENTO =
  "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-300";

const BADGE_BASE =
  "inline-flex items-center justify-center rounded-full border px-3 py-1 text-xs font-semibold tracking-wide uppercase";

const MES_NOMBRES_CORTOS = [
  "",
  "Ene",
  "Feb",
  "Mar",
  "Abr",
  "May",
  "Jun",
  "Jul",
  "Ago",
  "Sep",
  "Oct",
  "Nov",
  "Dic",
];

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

export default function ReformaTable({
  reformas,
  disciplinaMap,
  loading,
}: Props) {
  const showEmpty = !loading && reformas.length === 0;
  // Varias filas pueden estar abiertas a la vez, igual que en avales: sirve
  // para comparar dos solicitudes sin tener que cerrar una para ver la otra.
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
            <Th>Reforma</Th>
            <Th>Motivo</Th>
            <Th>Evento</Th>
            <Th>Estado</Th>
            <Th>Acciones</Th>
          </tr>
        </TableHead>
        <TableBody>
          {/* Filas fantasma en vez de un "Cargando...": mantienen el alto del
              listado mientras llega la respuesta, así el resto de la página no
              salta cuando aparecen los datos. */}
          {loading &&
            Array.from({ length: 6 }).map((_, index) => (
              <tr key={`skeleton-${index}`} className="animate-pulse">
                <Td className="w-10 pr-0">
                  <div className="h-4 w-4 rounded bg-slate-200 dark:bg-slate-700" />
                </Td>
                <Td>
                  <div className="h-4 w-20 rounded bg-slate-200 dark:bg-slate-700" />
                </Td>
                <Td>
                  <div className="h-4 w-48 rounded bg-slate-200 dark:bg-slate-700" />
                </Td>
                <Td>
                  <div className="h-4 w-40 rounded bg-slate-200 dark:bg-slate-700" />
                </Td>
                <Td>
                  <div className="h-4 w-20 rounded bg-slate-200 dark:bg-slate-700" />
                </Td>
                <Td>
                  <div className="h-4 w-9 rounded bg-slate-200 dark:bg-slate-700" />
                </Td>
              </tr>
            ))}

          {showEmpty && (
            <tr>
              <Td className="py-12 text-center" colSpan={COLUMN_COUNT}>
                <ClipboardTextIcon
                  size={40}
                  aria-hidden="true"
                  className="mx-auto mb-3 text-slate-300 dark:text-slate-600"
                />
                <p className="text-base font-semibold text-slate-700 dark:text-slate-200">
                  No hay reformas para mostrar
                </p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Ajusta los filtros o espera nuevas solicitudes de reforma.
                </p>
              </Td>
            </tr>
          )}

          {!loading &&
            reformas.map((reform) => {
              const primaryEvento = getPrimaryEvento(reform);
              const involvedEventoCount = getInvolvedEventoIds(reform).size;
              const extraEventoCount =
                involvedEventoCount > 1 ? involvedEventoCount - 1 : 0;
              const isSingleEventoReform =
                reform.eventos.length === 1 &&
                reform.origenes.length === 0 &&
                reform.destinos.length === 0;
              const disciplinaNombre = primaryEvento
                ? disciplinaMap.get(primaryEvento.id)
                : undefined;
              const solicitante = reform.solicitante
                ? `${reform.solicitante.nombre ?? ""} ${reform.solicitante.apellido ?? ""}`
                : "-";
              const abierto = abiertos.has(reform.id);

              return (
                <Fragment key={reform.id}>
                <Tr
                  className={abierto ? "bg-slate-50 dark:bg-slate-900/50" : ""}
                >
                  <Td className="w-10 pr-0">
                    <ExpandToggle
                      expanded={abierto}
                      onToggle={() => toggle(reform.id)}
                      label={`la reforma ${reform.numeroReforma}`}
                    />
                  </Td>
                  <Td>
                    <div className="font-semibold text-slate-800 dark:text-slate-100">
                      {reform.numeroReforma}
                    </div>
                    {/* El tipo perdió su columna pero no se va al desplegable:
                        se filtra por él, y un filtro cuyo resultado no se ve
                        obliga a confiar a ciegas. Cuelga del número porque
                        califica a la reforma entera, igual que la disciplina
                        cuelga del evento en `aval-list-table.tsx`. */}
                    <div className="mt-1">
                      {isSingleEventoReform ? (
                        <span
                          className={`${BADGE_BASE} ${
                            TIPO_REFORMA_STYLES[reform.eventos[0].tipo] ??
                            BADGE_NEUTRO
                          }`}
                          title="Tipo derivado según los campos editados"
                        >
                          {TIPO_REFORMA_LABELS[reform.eventos[0].tipo] ??
                            reform.eventos[0].tipo}
                        </span>
                      ) : (
                        <span className={`${BADGE_BASE} ${TIPO_MULTI_EVENTO}`}>
                          Multi-evento
                        </span>
                      )}
                    </div>
                  </Td>
                  {/* El motivo es texto libre y suele ser largo: va con `wrap`
                      y ancho acotado para que no estire la tabla entera ni
                      quede cortado en una sola línea. */}
                  <Td wrap className="w-[280px] max-w-[280px]">
                    <span title={reform.motivo}>
                      {reform.motivo || "Sin motivo especificado"}
                    </span>
                  </Td>
                  <Td wrap className="w-[240px] max-w-[240px]">
                    <div>
                      {primaryEvento?.nombre ?? "Sin evento asociado"}
                      {extraEventoCount > 0
                        ? ` +${extraEventoCount} evento${extraEventoCount === 1 ? "" : "s"}`
                        : ""}
                    </div>
                    {/* El estado del evento vive acá y no en su propia columna
                        porque describe al evento, no a la reforma: junto al
                        nombre se lee sin confundirse con el estado de la
                        solicitud, que ya tiene columna propia. */}
                    <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                      Estado del evento: {primaryEvento?.estado || "-"}
                    </div>
                  </Td>
                  <Td>
                    <span
                      className={`${BADGE_BASE} ${getStatusClasses(reform.estado)}`}
                    >
                      {reform.estado}
                    </span>
                  </Td>
                  <Td>
                    <div className="flex items-center justify-start gap-2">
                      {/* El ojo se queda, a diferencia de eventos: acá el
                          número de reforma es texto plano, así que sin este
                          botón la fila cerrada no tendría ningún acceso al
                          detalle y habría que desplegarla para llegar. */}
                      <Link
                        href={`/reformas/${reform.id}`}
                        className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700/70 text-slate-600 dark:text-slate-200 hover:border-indigo-300 hover:text-indigo-600 dark:hover:border-indigo-500/60 dark:hover:text-indigo-300 transition-colors"
                        aria-label={`Ver detalle de la reforma ${reform.numeroReforma}`}
                        title="Ver detalle"
                      >
                        <EyeIcon size={16} aria-hidden="true" />
                      </Link>
                    </div>
                  </Td>
                </Tr>

                {abierto && (
                  <ExpandedRow
                    colSpan={COLUMN_COUNT}
                    footer={
                      <Link
                        href={`/reformas/${reform.id}`}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 transition-colors hover:bg-indigo-100 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-300 dark:hover:bg-indigo-500/20"
                      >
                        <EyeIcon size={14} aria-hidden="true" />
                        Ver detalle completo
                      </Link>
                    }
                  >
                    <dl className="grid grid-cols-1 gap-x-10 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
                      <Detalle termino="Disciplina">
                        {disciplinaNombre || "-"}
                      </Detalle>
                      <Detalle termino="Solicitante">
                        {solicitante.trim() || "-"}
                      </Detalle>
                      <Detalle termino="Mes de ejecución">
                        {reform.mesEjecucion
                          ? (MES_NOMBRES_CORTOS[reform.mesEjecucion] ??
                            `Mes ${reform.mesEjecucion}`)
                          : "-"}
                      </Detalle>
                      <Detalle termino="Fecha de solicitud">
                        {formatDateTimeShort(reform.createdAt)}
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
