"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import AlertBanner from "@/components/ui/alert-banner";
import { useAuth } from "@/app/providers/auth-provider";
import { getNormalizedRoles } from "@/lib/auth/access";
import { getAvalReports } from "@/lib/api/aval-reports";
import type {
  AvalReportRow,
  AvalReportsSummary,
} from "@/lib/api/aval-reports";
import {
  formatCurrencyFromString,
  formatDateDMY,
} from "@/lib/utils/formatters";

type SortKey = "aprobacion" | "numero" | "estado";

const TYPE_LABELS = {
  FONDOS_PUBLICOS: "Fondos públicos",
  AUTOGESTION: "Autogestión",
  SOLO_RESULTADO: "Solo resultado",
} as const;

const STAGE_LABELS: Record<string, string> = {
  SOLICITUD: "Solicitud",
  REVISION_METODOLOGO: "Revisión metodólogo",
  REVISION_DTM: "Revisión DTM",
  PDA: "PDA",
  COMPRAS_PUBLICAS: "Compras públicas",
  CONTROL_PREVIO: "Control previo",
  SECRETARIA: "Secretaría",
  FINANCIERO: "Financiero",
};

const STATUS_LABELS: Record<string, string> = {
  ACEPTADO: "Aceptado",
  SOLICITADO: "Solicitado",
  RECHAZADO: "Rechazado",
  BORRADOR: "Borrador",
  DISPONIBLE: "Disponible",
};

const STATUS_STYLES: Record<string, string> = {
  ACEPTADO:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  SOLICITADO:
    "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  RECHAZADO:
    "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
  BORRADOR:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
};

function sortRows(rows: AvalReportRow[], sortKey: SortKey) {
  return [...rows].sort((a, b) => {
    if (sortKey === "numero") {
      return a.numeroAval.localeCompare(b.numeroAval, undefined, {
        numeric: true,
      });
    }
    if (sortKey === "estado") return a.estado.localeCompare(b.estado);
    return (b.fechaAprobacionFinal ?? "").localeCompare(
      a.fechaAprobacionFinal ?? "",
    );
  });
}

function formatDate(value: string | null) {
  return value ? formatDateDMY(value) : "—";
}

function StatusBadge({ estado }: { estado: string }) {
  return (
    <span
      className={`inline-flex whitespace-nowrap rounded px-2 py-0.5 text-xs font-medium ${
        STATUS_STYLES[estado] ?? "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200"
      }`}
    >
      {STATUS_LABELS[estado] ?? estado}
    </span>
  );
}

function ReportTable({
  title,
  rows,
  sortKey,
}: {
  title: string;
  rows: AvalReportRow[];
  sortKey: SortKey;
}) {
  const sortedRows = useMemo(() => sortRows(rows, sortKey), [rows, sortKey]);

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
          {title} ({rows.length})
        </h2>
      </div>
      <div className="max-h-[70vh] overflow-auto border border-gray-200 dark:border-gray-700">
        <table className="min-w-[2900px] table-auto text-left text-xs text-gray-700 dark:text-gray-200">
          <thead className="sticky top-0 z-10 bg-gray-100 text-[11px] uppercase tracking-wide text-gray-600 dark:bg-gray-700 dark:text-gray-200">
            <tr>
              <th className="px-3 py-2">Número de aval</th>
              <th className="px-3 py-2">Tipo</th>
              <th className="px-3 py-2">Estado</th>
              <th className="px-3 py-2">Aprobación final</th>
              <th className="px-3 py-2">Monto autorizado</th>
              <th className="px-3 py-2">Monto ejecutado</th>
              <th className="px-3 py-2">Honorario</th>
              <th className="px-3 py-2">ID interno</th>
              <th className="px-3 py-2">Etapa actual</th>
              <th className="px-3 py-2">Fecha emisión</th>
              <th className="px-3 py-2">Fecha registro</th>
              <th className="px-3 py-2">Código evento</th>
              <th className="px-3 py-2">Evento</th>
              <th className="px-3 py-2">Disciplina</th>
              <th className="px-3 py-2">Categoría</th>
              <th className="px-3 py-2">Provincia</th>
              <th className="px-3 py-2">Ciudad</th>
              <th className="px-3 py-2">País</th>
              <th className="px-3 py-2">Inicio evento</th>
              <th className="px-3 py-2">Fin evento</th>
              <th className="px-3 py-2">Deportistas</th>
              <th className="px-3 py-2">Entrenadores</th>
              <th className="px-3 py-2">Monto solicitado</th>
              <th className="px-3 py-2">Base honorario</th>
              <th className="px-3 py-2">Histórico</th>
              <th className="px-3 py-2">Cobrable</th>
              <th className="px-3 py-2">Motivo de exclusión</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {sortedRows.map((row) => (
              <tr key={row.id} className="whitespace-nowrap hover:bg-gray-50 dark:hover:bg-gray-800/60">
                <td className="px-3 py-2 font-semibold">{row.numeroAval}</td>
                <td className="px-3 py-2">{TYPE_LABELS[row.tipoAval]}</td>
                <td className="px-3 py-2"><StatusBadge estado={row.estado} /></td>
                <td className="px-3 py-2">{formatDate(row.fechaAprobacionFinal)}</td>
                <td className="px-3 py-2 text-right">{formatCurrencyFromString(row.montoAutorizado)}</td>
                <td className="px-3 py-2 text-right">{formatCurrencyFromString(row.montoEjecutado)}</td>
                <td className="px-3 py-2 text-right font-medium">{formatCurrencyFromString(row.honorarioCalculado)}</td>
                <td className="px-3 py-2">{row.id}</td>
                <td className="px-3 py-2">{STAGE_LABELS[row.etapaActual] ?? row.etapaActual}</td>
                <td className="px-3 py-2">{formatDate(row.fechaEmision)}</td>
                <td className="px-3 py-2">{formatDate(row.fechaRegistro)}</td>
                <td className="px-3 py-2">{row.codigoEvento}</td>
                <td className="max-w-64 truncate px-3 py-2" title={row.nombreEvento}>{row.nombreEvento}</td>
                <td className="px-3 py-2">{row.disciplina}</td>
                <td className="px-3 py-2">{row.categoria ?? "—"}</td>
                <td className="px-3 py-2">{row.provincia ?? "—"}</td>
                <td className="px-3 py-2">{row.ciudad ?? "—"}</td>
                <td className="px-3 py-2">{row.pais}</td>
                <td className="px-3 py-2">{formatDate(row.fechaInicioEvento)}</td>
                <td className="px-3 py-2">{formatDate(row.fechaFinEvento)}</td>
                <td className="px-3 py-2 text-center">{row.numeroDeportistas}</td>
                <td className="px-3 py-2 text-center">{row.numeroEntrenadores}</td>
                <td className="px-3 py-2 text-right">{formatCurrencyFromString(row.montoSolicitado)}</td>
                <td className="px-3 py-2 text-right">{formatCurrencyFromString(row.baseCalculoHonorario)}</td>
                <td className="px-3 py-2">{row.esHistorico ? "Sí" : "No"}</td>
                <td className="px-3 py-2">{row.esCobrable ? "Sí" : "No"}</td>
                <td className="max-w-96 whitespace-normal px-3 py-2">{row.motivoExclusion ?? "—"}</td>
              </tr>
            ))}
            {sortedRows.length === 0 && (
              <tr>
                <td colSpan={27} className="px-3 py-8 text-center text-gray-500 dark:text-gray-400">
                  No hay avales en esta sección para el rango seleccionado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function SummaryTable({
  summary,
}: {
  summary: AvalReportsSummary;
}) {
  const metrics = [
    ["Total de avales encontrados", summary.totalAvales],
    ["Avales cobrables", summary.avalesCobrables],
    ["Avales pendientes", summary.avalesPendientes],
    ["Avales históricos excluidos", summary.avalesHistoricosExcluidos],
    ["Avales de fondos públicos", summary.avalesFondosPublicos],
    ["Avales de autogestión", summary.avalesAutogestion],
    ["Avales solo por resultado", summary.avalesSoloResultado],
    ["Monto autorizado total", formatCurrencyFromString(summary.montoAutorizadoTotal)],
    ["Monto ejecutado total", formatCurrencyFromString(summary.montoEjecutadoTotal)],
    ["Honorario total", formatCurrencyFromString(summary.honorarioTotal)],
  ] as const;

  return (
    <div className="overflow-x-auto border border-gray-200 dark:border-gray-700">
      <table className="w-full min-w-[760px] text-sm">
        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
          <tr className="bg-gray-50 dark:bg-gray-800/60">
            {metrics.map(([label]) => (
              <th key={label} className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-300">{label}</th>
            ))}
          </tr>
          <tr>
            {metrics.map(([label, value]) => (
              <td key={label} className="px-3 py-3 font-semibold text-gray-900 dark:text-gray-100">{value}</td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function useReportQuery(fechaInicio: string, fechaFin: string, enabled: boolean) {
  return useQuery({
    queryKey: ["aval-reports", fechaInicio, fechaFin],
    queryFn: async () => (await getAvalReports(fechaInicio, fechaFin)).data,
    enabled,
  });
}

function ReportsContent() {
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [submittedRange, setSubmittedRange] = useState({ inicio: "", fin: "" });
  const [sortKey, setSortKey] = useState<SortKey>("aprobacion");
  const invalidRange = Boolean(fechaInicio && fechaFin && fechaInicio > fechaFin);
  const reportQuery = useReportQuery(
    submittedRange.inicio,
    submittedRange.fin,
    Boolean(submittedRange.inicio && submittedRange.fin),
  );

  const search = () => {
    if (!fechaInicio || !fechaFin || invalidRange) return;
    setSubmittedRange({ inicio: fechaInicio, fin: fechaFin });
  };

  return (
    <div className="mx-auto w-full max-w-[100rem] space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 md:text-3xl">Reportes de avales</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Consulta operativa y base de honorarios al 8%.</p>
      </div>

      <form
        className="flex flex-wrap items-end gap-3 border-b border-gray-200 pb-5 dark:border-gray-700"
        onSubmit={(event) => { event.preventDefault(); search(); }}
      >
        <label className="text-sm text-gray-600 dark:text-gray-300">
          Fecha inicio
          <input type="date" className="form-input mt-1 block w-full sm:w-48" value={fechaInicio} onChange={(event) => setFechaInicio(event.target.value)} required />
        </label>
        <label className="text-sm text-gray-600 dark:text-gray-300">
          Fecha fin
          <input type="date" className="form-input mt-1 block w-full sm:w-48" value={fechaFin} onChange={(event) => setFechaFin(event.target.value)} required />
        </label>
        <button type="submit" className="btn bg-gray-900 text-gray-100 hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-100 dark:text-gray-900" disabled={!fechaInicio || !fechaFin || invalidRange || reportQuery.isFetching}>
          {reportQuery.isFetching ? "Consultando…" : "Buscar avales"}
        </button>
        {invalidRange && <p className="basis-full text-sm text-rose-600">La fecha de inicio no puede ser mayor que la fecha fin.</p>}
      </form>

      {reportQuery.error && <AlertBanner variant="error" message={reportQuery.error instanceof Error ? reportQuery.error.message : "No se pudo cargar el reporte."} />}
      {reportQuery.data && (
        <>
          {reportQuery.data.advertenciaMontoEjecutado && <AlertBanner variant="error" message={reportQuery.data.advertenciaMontoEjecutado} />}
          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Resumen</h2>
              <label className="text-sm text-gray-600 dark:text-gray-300">
                Ordenar tablas
                <select className="form-select ml-2" value={sortKey} onChange={(event) => setSortKey(event.target.value as SortKey)}>
                  <option value="aprobacion">Aprobación descendente</option>
                  <option value="numero">Número de aval</option>
                  <option value="estado">Estado</option>
                </select>
              </label>
            </div>
            <SummaryTable summary={reportQuery.data.resumen} />
          </section>
          <ReportTable title="Avales cobrables" rows={reportQuery.data.cobrables} sortKey={sortKey} />
          <ReportTable title="Avales pendientes o no cobrables" rows={reportQuery.data.pendientes} sortKey={sortKey} />
          <ReportTable title="Avales históricos excluidos" rows={reportQuery.data.historicos} sortKey={sortKey} />
        </>
      )}
    </div>
  );
}

export default function AvalReportsPage() {
  const { user } = useAuth();
  const isSuperAdmin = getNormalizedRoles(user).includes("SUPER_ADMIN");

  if (!isSuperAdmin) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-gray-800 dark:text-gray-100">Acceso restringido</h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">No tienes permisos para acceder a esta sección.</p>
        </div>
      </div>
    );
  }

  return <ReportsContent />;
}
