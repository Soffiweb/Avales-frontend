"use client";

import { Fragment, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Calendar, ClipboardEdit, Download } from "lucide-react";
import { Dialog, Transition } from "@headlessui/react";

import { useAuth } from "@/app/providers/auth-provider";
import AlertBanner from "@/components/ui/alert-banner";
import { getItemsPresupuestarios } from "@/lib/api/catalog";
import {
  getReformaMulti,
  downloadReformaMultiExcel,
  aprobarReformaMulti,
  rechazarReformaMulti,
  ESTADO_REFORMA_MULTI_LABELS,
  FUENTE_REFORMA_LABELS,
  MES_NOMBRES,
  getErrorMessage,
} from "@/lib/api/reforms-multi";
import { canReviewReforms } from "@/lib/auth/access";
import { formatCurrencyFromString, formatDateTime } from "@/lib/utils/formatters";
import type { CatalogItemPresupuestario } from "@/types/catalog";
import type {
  CambiosSnapshot,
  ReformaMultiDestinoLinea,
  ReformaMultiOrigenLinea,
} from "@/types/reforma-multi";

const STATUS_STYLES: Record<string, string> = {
  PENDIENTE:
    "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
  APROBADA:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
  RECHAZADA:
    "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200",
};

function getStatusClasses(status?: string | null) {
  if (!status) return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
  return (
    STATUS_STYLES[status.toUpperCase()] ??
    "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
  );
}

type SnapshotBudgetItem = {
  itemId: number;
  presupuesto: string;
};

type BudgetChangeRow = {
  itemId: number;
  before: number;
  after: number;
  diff: number;
};

type SignatureCardProps = {
  label: string;
  name?: string | null;
  role?: string | null;
};

function SignatureCard({ label, name, role }: SignatureCardProps) {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50/70 px-4 py-4 text-center dark:border-gray-700 dark:bg-gray-900/30">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">
        {label}
      </p>
      <div className="mx-auto my-4 h-px w-32 bg-gray-300 dark:bg-gray-600" />
      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
        {name || "-"}
      </p>
      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
        {role || "-"}
      </p>
    </div>
  );
}

function parseBudget(value?: string | null) {
  return Number.parseFloat(value ?? "0") || 0;
}

function buildBudgetChangeRows(
  before: SnapshotBudgetItem[],
  after: SnapshotBudgetItem[],
  mode: "decrease" | "increase",
) {
  const budgetMap = new Map<number, BudgetChangeRow>();

  before.forEach((item) => {
    budgetMap.set(item.itemId, {
      itemId: item.itemId,
      before: parseBudget(item.presupuesto),
      after: 0,
      diff: 0,
    });
  });

  after.forEach((item) => {
    const current = budgetMap.get(item.itemId);
    if (current) {
      current.after = parseBudget(item.presupuesto);
      current.diff = current.after - current.before;
      return;
    }

    budgetMap.set(item.itemId, {
      itemId: item.itemId,
      before: 0,
      after: parseBudget(item.presupuesto),
      diff: parseBudget(item.presupuesto),
    });
  });

  return Array.from(budgetMap.values())
    .filter((item) => {
      if (mode === "decrease") return item.diff < 0;
      return item.diff > 0;
    })
    .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));
}

function getItemLabel(
  itemId: number,
  itemsCatalog: CatalogItemPresupuestario[],
) {
  const item = itemsCatalog.find((catalogItem) => catalogItem.id === itemId);
  if (!item) return `Item #${itemId}`;
  return `${item.numero} · ${item.nombre}`;
}

function getMonthLabel(month?: number | null) {
  if (!month) return "-";
  return MES_NOMBRES[month] ?? `Mes ${month}`;
}

function getDetailItemLabel(
  item:
    | ReformaMultiOrigenLinea["item"]
    | ReformaMultiDestinoLinea["item"]
    | undefined
    | null,
  itemId: number,
  itemsCatalog: CatalogItemPresupuestario[],
) {
  if (item?.numero != null && item?.nombre) {
    return `${item.numero} · ${item.nombre}`;
  }

  return getItemLabel(itemId, itemsCatalog);
}

function getDetailLineAmount(
  line: ReformaMultiOrigenLinea | ReformaMultiDestinoLinea,
  type: "origen" | "destino",
) {
  if (type === "origen") {
    return "montoCortado" in line ? line.montoCortado : "0";
  }

  return "montoAsignado" in line ? line.montoAsignado : "0";
}

function ItemBudgetChanges({
  before,
  after,
  mode,
  itemsCatalog,
}: {
  before: SnapshotBudgetItem[];
  after: SnapshotBudgetItem[];
  mode: "decrease" | "increase";
  itemsCatalog: CatalogItemPresupuestario[];
}) {
  const rows = buildBudgetChangeRows(before, after, mode);

  if (rows.length === 0) {
    return (
      <p className="text-xs text-gray-500 dark:text-gray-400">
        No hay cambios por ítem para este evento.
      </p>
    );
  }

  return (
    <div className="mt-2 overflow-hidden rounded-md border border-gray-200 dark:border-gray-700">
      <table className="w-full border-collapse text-xs">
        <thead className="bg-gray-50 dark:bg-gray-800/80">
          <tr>
            <th className="border-b border-gray-200 px-2 py-2 text-left font-medium text-gray-600 dark:border-gray-700 dark:text-gray-300">
              Ítem
            </th>
            <th className="border-b border-gray-200 px-2 py-2 text-right font-medium text-gray-600 dark:border-gray-700 dark:text-gray-300">
              Antes
            </th>
            <th className="border-b border-gray-200 px-2 py-2 text-right font-medium text-gray-600 dark:border-gray-700 dark:text-gray-300">
              Después
            </th>
            <th className="border-b border-gray-200 px-2 py-2 text-right font-medium text-gray-600 dark:border-gray-700 dark:text-gray-300">
              {mode === "decrease" ? "Corte" : "Incremento"}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((item) => (
            <tr key={item.itemId}>
              <td className="border-b border-gray-100 px-2 py-2 text-gray-700 dark:border-gray-800 dark:text-gray-200">
                {getItemLabel(item.itemId, itemsCatalog)}
              </td>
              <td className="border-b border-gray-100 px-2 py-2 text-right text-gray-700 dark:border-gray-800 dark:text-gray-200">
                {formatCurrencyFromString(String(item.before))}
              </td>
              <td className="border-b border-gray-100 px-2 py-2 text-right text-gray-700 dark:border-gray-800 dark:text-gray-200">
                {formatCurrencyFromString(String(item.after))}
              </td>
              <td
                className={`border-b border-gray-100 px-2 py-2 text-right font-semibold dark:border-gray-800 ${
                  mode === "decrease"
                    ? "text-rose-700 dark:text-rose-400"
                    : "text-emerald-700 dark:text-emerald-400"
                }`}
              >
                {mode === "decrease" ? "-" : "+"}
                {formatCurrencyFromString(String(Math.abs(item.diff)))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EventDetailItems({
  items,
  type,
  itemsCatalog,
}: {
  items: ReformaMultiOrigenLinea[] | ReformaMultiDestinoLinea[];
  type: "origen" | "destino";
  itemsCatalog: CatalogItemPresupuestario[];
}) {
  if (items.length === 0) return null;

  return (
    <div className="mt-3 overflow-hidden rounded-md border border-gray-200 dark:border-gray-700">
      <table className="w-full border-collapse text-xs">
        <thead className="bg-gray-50 dark:bg-gray-800/80">
          <tr>
            <th className="border-b border-gray-200 px-2 py-2 text-left font-medium text-gray-600 dark:border-gray-700 dark:text-gray-300">
              Ítem
            </th>
            <th className="border-b border-gray-200 px-2 py-2 text-left font-medium text-gray-600 dark:border-gray-700 dark:text-gray-300">
              Mes
            </th>
            <th className="border-b border-gray-200 px-2 py-2 text-right font-medium text-gray-600 dark:border-gray-700 dark:text-gray-300">
              {type === "origen" ? "Monto cortado" : "Monto asignado"}
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((line) => (
            <tr key={line.id}>
              <td className="border-b border-gray-100 px-2 py-2 text-gray-700 dark:border-gray-800 dark:text-gray-200">
                {getDetailItemLabel(line.item, line.itemId, itemsCatalog)}
              </td>
              <td className="border-b border-gray-100 px-2 py-2 text-gray-700 dark:border-gray-800 dark:text-gray-200">
                {getMonthLabel(line.mes)}
              </td>
              <td
                className={`border-b border-gray-100 px-2 py-2 text-right font-semibold dark:border-gray-800 ${
                  type === "origen"
                    ? "text-rose-700 dark:text-rose-400"
                    : "text-emerald-700 dark:text-emerald-400"
                }`}
              >
                {type === "origen" ? "-" : "+"}
                {formatCurrencyFromString(getDetailLineAmount(line, type))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function ReformaMultiDetailPage() {
  const params = useParams();
  const id = Number(params.id);
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [rejectOpen, setRejectOpen] = useState(false);
  const [observacion, setObservacion] = useState("");
  const [observacionError, setObservacionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [excelLoading, setExcelLoading] = useState(false);

  const canReview = canReviewReforms(user);

  const {
    data,
    isLoading,
    error: fetchError,
  } = useQuery({
    queryKey: ["reforma-multi", id],
    queryFn: () => getReformaMulti(id),
    enabled: !Number.isNaN(id) && id > 0,
  });

  const reform = data?.data;

  const { data: itemsCatalogData } = useQuery({
    queryKey: ["catalog-items-presupuestarios"],
    queryFn: () => getItemsPresupuestarios(),
  });

  const itemsCatalog = itemsCatalogData?.data ?? [];

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["reforma-multi", id] });

  const aprobarMutation = useMutation({
    mutationFn: () => aprobarReformaMulti(id),
    onSuccess: async () => {
      setActionSuccess("Reforma aprobada correctamente.");
      setActionError(null);
      await invalidate();
    },
    onError: (err) => {
      setActionError(getErrorMessage(err));
      setActionSuccess(null);
    },
  });

  const rechazarMutation = useMutation({
    mutationFn: (obs: string) => rechazarReformaMulti(id, obs),
    onSuccess: async () => {
      setActionSuccess("Reforma rechazada correctamente.");
      setActionError(null);
      setRejectOpen(false);
      setObservacion("");
      await invalidate();
    },
    onError: (err) => {
      setActionError(getErrorMessage(err));
      setActionSuccess(null);
    },
  });

  const handleAprobar = () => {
    if (!reform || reform.estado !== "PENDIENTE") return;
    setActionError(null);
    setActionSuccess(null);
    aprobarMutation.mutate();
  };

  const handleOpenReject = () => {
    setObservacionError(null);
    setRejectOpen(true);
  };

  const handleConfirmReject = () => {
    const trimmed = observacion.trim();
    if (!trimmed) {
      setObservacionError("Debes indicar una observación para el rechazo.");
      return;
    }
    if (trimmed.length > 600) {
      setObservacionError("La observación no puede superar los 600 caracteres.");
      return;
    }
    rechazarMutation.mutate(trimmed);
  };

  const handleDownloadExcel = async () => {
    setActionError(null);
    setActionSuccess(null);
    setExcelLoading(true);

    try {
      await downloadReformaMultiExcel(id);
    } catch (err) {
      setActionError(getErrorMessage(err, "No se pudo descargar el Excel."));
    } finally {
      setExcelLoading(false);
    }
  };

  const actionsLoading = aprobarMutation.isPending || rechazarMutation.isPending;

  if (!id || Number.isNaN(id)) {
    return (
      <div className="px-4 py-8 sm:px-6 lg:px-8">
        <AlertBanner variant="error" message="ID de reforma inválido." />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl space-y-4">
          <div className="h-8 w-56 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
          <div className="h-40 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-700" />
          <div className="h-64 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-700" />
        </div>
      </div>
    );
  }

  if (fetchError || !reform) {
    return (
      <div className="px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl space-y-4">
          <AlertBanner
            variant="error"
            message={
              fetchError instanceof Error
                ? fetchError.message
                : "No se encontró la reforma."
            }
          />
          <Link
            href="/reformas-multi"
            className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver a reformas multi-evento
          </Link>
        </div>
      </div>
    );
  }

  const cambios = reform.cambios as CambiosSnapshot | null | undefined;
  const totalCortado = reform.origenes.reduce(
    (total, origen) => total + parseBudget(origen.montoCortado),
    0,
  );
  const totalAsignado = reform.destinos.reduce(
    (total, destino) => total + parseBudget(destino.montoAsignado),
    0,
  );
  const balance = totalAsignado - totalCortado;

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
        {actionSuccess ? (
          <AlertBanner
            variant="success"
            message={actionSuccess}
            onClose={() => setActionSuccess(null)}
          />
        ) : null}
        {actionError ? (
          <AlertBanner
            variant="error"
            message={actionError}
            onClose={() => setActionError(null)}
          />
        ) : null}

        {/* Back + header */}
        <div>
          <Link
            href="/reformas-multi"
            className="inline-flex items-center gap-2 text-sm text-gray-500 transition hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver a reformas multi-evento
          </Link>

          <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.18em] text-amber-700 dark:text-amber-300">
                Reforma Multi-Evento
              </p>
              <h1 className="mt-2 text-3xl font-bold text-gray-900 dark:text-gray-100">
                Reforma #{reform.id}
              </h1>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                {reform.motivo}
              </p>
            </div>
            <div className="w-full max-w-md space-y-3 sm:w-auto">
              <div className="flex flex-col items-start gap-2 sm:items-end">
                <span
                  className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${getStatusClasses(reform.estado)}`}
                >
                  {ESTADO_REFORMA_MULTI_LABELS[reform.estado] ?? reform.estado}
                </span>
                <span className="inline-flex rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                  {FUENTE_REFORMA_LABELS[reform.fuente] ?? reform.fuente}
                </span>
              </div>

              <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                <button
                  type="button"
                  onClick={handleDownloadExcel}
                  disabled={excelLoading}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Download className="h-4 w-4" />
                  {excelLoading
                    ? "Descargando Reforma Multi (Excel)..."
                    : "Descargar Reforma Multi (Excel)"}
                </button>
              </section>
            </div>
          </div>
        </div>

        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-start">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-amber-700 dark:text-amber-300">
                Solicitud
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-gray-200 bg-gray-50/70 px-3 py-2 dark:border-gray-700 dark:bg-gray-900/30">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">
                    De
                  </p>
                  <p className="mt-1 text-sm font-medium text-gray-900 dark:text-gray-100">
                    {reform.de || "-"}
                  </p>
                </div>
                <div className="rounded-lg border border-gray-200 bg-gray-50/70 px-3 py-2 dark:border-gray-700 dark:bg-gray-900/30">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">
                    Para
                  </p>
                  <p className="mt-1 text-sm font-medium text-gray-900 dark:text-gray-100">
                    {reform.para || "-"}
                  </p>
                </div>
              </div>
              <p className="mt-4 text-sm text-gray-600 dark:text-gray-300">
                {reform.motivo || "-"}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 lg:justify-end">
              <span className="inline-flex w-fit rounded-full bg-violet-100 px-3 py-1 text-xs font-medium text-violet-800 dark:bg-violet-900/40 dark:text-violet-200">
                Presupuesto
              </span>
              <span className="inline-flex w-fit rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                {FUENTE_REFORMA_LABELS[reform.fuente] ?? reform.fuente}
              </span>
              <span className="inline-flex w-fit rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                {MES_NOMBRES[reform.mesEjecucion] ?? `Mes ${reform.mesEjecucion}`}
              </span>
            </div>
            <div>
              <dt className="text-gray-500 dark:text-gray-400">De</dt>
              <dd className="mt-1 text-gray-900 dark:text-gray-100">{reform.de || "-"}</dd>
            </div>
            <div>
              <dt className="text-gray-500 dark:text-gray-400">Para</dt>
              <dd className="mt-1 text-gray-900 dark:text-gray-100">{reform.para || "-"}</dd>
            </div>
            <div>
              <dt className="text-gray-500 dark:text-gray-400">Solicitante</dt>
              <dd className="mt-1 text-gray-900 dark:text-gray-100">
                {reform.solicitante.nombre} {reform.solicitante.apellido}
              </dd>
            </div>
            <div className="rounded-lg border border-emerald-100 bg-emerald-50/70 px-4 py-3 dark:border-emerald-900/30 dark:bg-emerald-900/10">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-300">
                Total asignado
              </p>
              <p className="mt-1 text-lg font-semibold text-emerald-800 dark:text-emerald-200">
                +{formatCurrencyFromString(String(totalAsignado))}
              </p>
            </div>
            {reform.aprobador ? (
              <>
                <div>
                  <dt className="text-gray-500 dark:text-gray-400">Revisado por</dt>
                  <dd className="mt-1 text-gray-900 dark:text-gray-100">
                    {reform.aprobador.nombre} {reform.aprobador.apellido}
                  </dd>
                </div>
                <div>
                  <dt className="text-gray-500 dark:text-gray-400">Fecha de revisión</dt>
                  <dd className="mt-1 text-gray-900 dark:text-gray-100">
                    {reform.reviewedAt ? formatDateTime(reform.reviewedAt) : "-"}
                  </dd>
                </div>
              </>
            ) : null}
            <div>
              <dt className="text-gray-500 dark:text-gray-400">Firma solicitante</dt>
              <dd className="mt-1 text-gray-900 dark:text-gray-100">
                {reform.firmaCreadorNombre || "-"}
              </dd>
              <dd className="text-xs text-gray-500 dark:text-gray-400">
                {reform.firmaCreadorCargo || "-"}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500 dark:text-gray-400">Firma revisor</dt>
              <dd className="mt-1 text-gray-900 dark:text-gray-100">
                {reform.firmaRevisorNombre || "-"}
              </dd>
              <dd className="text-xs text-gray-500 dark:text-gray-400">
                {reform.firmaRevisorCargo || "-"}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500 dark:text-gray-400">Firma aprobador</dt>
              <dd className="mt-1 text-gray-900 dark:text-gray-100">
                {reform.firmaAprobadorNombre || "-"}
              </dd>
              <dd className="text-xs text-gray-500 dark:text-gray-400">
                {reform.firmaAprobadorCargo || "-"}
              </dd>
            </div>
            {reform.observacion ? (
              <div className="sm:col-span-2">
                <dt className="text-gray-500 dark:text-gray-400">Observación</dt>
                <dd className="mt-1 text-gray-900 dark:text-gray-100">{reform.observacion}</dd>
              </div>
            ) : null}
          </div>
        </section>


        {/* Origenes / Destinos side-by-side */}
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Origenes */}
          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <h2 className="mb-3 font-semibold text-gray-900 dark:text-gray-100">
              Eventos de origen ({reform.origenes.length})
            </h2>
            {reform.origenes.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-gray-500">Sin orígenes.</p>
            ) : (
              <ul className="space-y-3">
                {reform.origenes.map((origen) => {
                  const eventoId = origen.eventoId;
                  const cambioOrigen = cambios?.origenes.find(
                    (c) => c.eventoId === eventoId,
                  );
                  return (
                    <li
                      key={origen.id}
                      className="rounded-lg border border-rose-100 bg-rose-50/50 p-3 dark:border-rose-900/30 dark:bg-rose-900/10"
                    >
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {origen.evento.nombre}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {origen.evento.codigo}
                        {origen.evento.disciplina
                          ? ` · ${origen.evento.disciplina.nombre}`
                          : ""}
                      </p>
                      <dl className="mt-2 grid grid-cols-2 gap-1 text-xs">
                        <div>
                          <dt className="text-gray-500 dark:text-gray-400">Monto cortado</dt>
                          <dd className="font-medium text-rose-700 dark:text-rose-400">
                            -{formatCurrencyFromString(origen.montoCortado)}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-gray-500 dark:text-gray-400">Total antes</dt>
                          <dd className="font-medium text-gray-900 dark:text-gray-100">
                            {formatCurrencyFromString(origen.totalEventoAntes)}
                          </dd>
                        </div>
                        {origen.totalEventoDespues != null ? (
                          <div className="col-span-2">
                            <dt className="text-gray-500 dark:text-gray-400">Total después</dt>
                            <dd className="font-medium text-gray-900 dark:text-gray-100">
                              {formatCurrencyFromString(origen.totalEventoDespues)}
                            </dd>
                          </div>
                        ) : null}
                      </dl>

                      {origen.items?.length ? (
                        <details className="mt-2" open>
                          <summary className="cursor-pointer text-xs text-indigo-600 dark:text-indigo-400">
                            Ver items desde donde se cortó
                          </summary>
                          <EventDetailItems
                            items={origen.items}
                            type="origen"
                            itemsCatalog={itemsCatalog}
                          />
                        </details>
                      ) : null}

                      {!origen.items?.length && cambioOrigen && (
                        <details className="mt-2">
                          <summary className="cursor-pointer text-xs text-indigo-600 dark:text-indigo-400">
                            Ver items desde donde se cortó
                          </summary>
                          <ItemBudgetChanges
                            before={cambioOrigen.before}
                            after={cambioOrigen.after}
                            mode="decrease"
                            itemsCatalog={itemsCatalog}
                          />
                        </details>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* Destinos */}
          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <h2 className="mb-3 font-semibold text-gray-900 dark:text-gray-100">
              Eventos de destino ({reform.destinos.length})
            </h2>
            {reform.destinos.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-gray-500">Sin destinos.</p>
            ) : (
              <ul className="space-y-3">
                {reform.destinos.map((destino) => {
                  const eventoId = destino.eventoId;
                  const cambioDestino = cambios?.destinos.find(
                    (c) => c.eventoId === eventoId,
                  );
                  return (
                    <li
                      key={destino.id}
                      className="rounded-lg border border-emerald-100 bg-emerald-50/50 p-3 dark:border-emerald-900/30 dark:bg-emerald-900/10"
                    >
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {destino.evento.nombre}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {destino.evento.codigo}
                        {destino.evento.disciplina
                          ? ` · ${destino.evento.disciplina.nombre}`
                          : ""}
                      </p>
                      <dl className="mt-2 grid grid-cols-2 gap-1 text-xs">
                        <div>
                          <dt className="text-gray-500 dark:text-gray-400">Monto asignado</dt>
                          <dd className="font-medium text-emerald-700 dark:text-emerald-400">
                            +{formatCurrencyFromString(destino.montoAsignado)}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-gray-500 dark:text-gray-400">Total antes</dt>
                          <dd className="font-medium text-gray-900 dark:text-gray-100">
                            {formatCurrencyFromString(destino.totalEventoAntes)}
                          </dd>
                        </div>
                        {destino.totalEventoDespues != null ? (
                          <div className="col-span-2">
                            <dt className="text-gray-500 dark:text-gray-400">Total después</dt>
                            <dd className="font-medium text-gray-900 dark:text-gray-100">
                              {formatCurrencyFromString(destino.totalEventoDespues)}
                            </dd>
                          </div>
                        ) : null}
                      </dl>

                      {destino.items?.length ? (
                        <details className="mt-2" open>
                          <summary className="cursor-pointer text-xs text-indigo-600 dark:text-indigo-400">
                            Ver items en donde se agregó
                          </summary>
                          <EventDetailItems
                            items={destino.items}
                            type="destino"
                            itemsCatalog={itemsCatalog}
                          />
                        </details>
                      ) : null}

                      {!destino.items?.length && cambioDestino && (
                        <details className="mt-2">
                          <summary className="cursor-pointer text-xs text-indigo-600 dark:text-indigo-400">
                            Ver items en donde se agregó
                          </summary>
                          <ItemBudgetChanges
                            before={cambioDestino.before}
                            after={cambioDestino.after}
                            mode="increase"
                            itemsCatalog={itemsCatalog}
                          />
                        </details>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>

        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="mb-4">
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Firmas de la reforma
            </p>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Personas registradas como firmantes de esta solicitud.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <SignatureCard
              label="Solicitante"
              name={reform.firmaCreadorNombre}
              role={reform.firmaCreadorCargo}
            />
            <SignatureCard
              label="Revisor"
              name={reform.firmaRevisorNombre}
              role={reform.firmaRevisorCargo}
            />
            <SignatureCard
              label="Aprobador"
              name={reform.firmaAprobadorNombre}
              role={reform.firmaAprobadorCargo}
            />
          </div>
        </section>

        {/* Approve / Reject actions */}
        {canReview && reform.estado === "PENDIENTE" ? (
          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Revisión de reforma multi-evento
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Al aprobar, los presupuestos de todos los eventos serán modificados
              de forma atómica.
            </p>
            <div className="mt-4 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                disabled={actionsLoading}
                onClick={handleOpenReject}
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-rose-600 to-rose-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg hover:from-rose-500 hover:to-rose-400 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-500"
              >
                Rechazar
              </button>
              <button
                type="button"
                disabled={actionsLoading}
                onClick={handleAprobar}
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-600 to-emerald-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg hover:from-emerald-500 hover:to-emerald-400 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
              >
                {aprobarMutation.isPending ? "Aprobando..." : "Aprobar"}
              </button>
            </div>
          </section>
        ) : null}
      </div>

      {/* Reject modal */}
      <Transition.Root show={rejectOpen} as={Fragment}>
        <Dialog
          as="div"
          className="relative z-50"
          role="dialog"
          onClose={() => {
            if (!rechazarMutation.isPending) setRejectOpen(false);
          }}
        >
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-200"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-150"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm" />
          </Transition.Child>

          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-200"
                enterFrom="opacity-0 translate-y-2 scale-95"
                enterTo="opacity-100 translate-y-0 scale-100"
                leave="ease-in duration-150"
                leaveFrom="opacity-100 translate-y-0 scale-100"
                leaveTo="opacity-0 translate-y-2 scale-95"
              >
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-xl border border-gray-200 bg-white text-left align-middle shadow-xl transition-all dark:border-gray-700/60 dark:bg-gray-800">
                  <div className="space-y-3 px-6 py-5">
                    <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      Rechazar reforma multi-evento
                    </Dialog.Title>
                    <Dialog.Description className="text-sm text-gray-600 dark:text-gray-300">
                      Indica el motivo del rechazo. Será visible para el solicitante.
                    </Dialog.Description>
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Observación (obligatoria)
                      </label>
                      <textarea
                        value={observacion}
                        onChange={(e) => {
                          setObservacion(e.target.value);
                          if (observacionError) setObservacionError(null);
                        }}
                        maxLength={600}
                        rows={3}
                        className="form-textarea w-full border border-gray-300 bg-white text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                        placeholder="Describe el motivo del rechazo..."
                      />
                      <p className="text-right text-xs text-gray-400">
                        {observacion.length}/600
                      </p>
                      {observacionError ? (
                        <p className="text-sm text-rose-500">{observacionError}</p>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 border-t border-gray-200 bg-gray-50/60 px-6 py-4 dark:border-gray-700/60 dark:bg-gray-900/30">
                    <button
                      type="button"
                      className="btn border-gray-200 text-gray-700 hover:border-gray-300 dark:border-gray-700/60 dark:text-gray-200 dark:hover:border-gray-600"
                      onClick={() => setRejectOpen(false)}
                      disabled={rechazarMutation.isPending}
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      className="btn bg-rose-600 text-white hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-60"
                      onClick={handleConfirmReject}
                      disabled={rechazarMutation.isPending}
                    >
                      {rechazarMutation.isPending ? "Rechazando..." : "Rechazar"}
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition.Root>
    </div>
  );
}
