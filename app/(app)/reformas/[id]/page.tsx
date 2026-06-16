"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  ClipboardEdit,
  Coins,
  FileText,
  Layers3,
  Tag,
} from "lucide-react";

import { useAuth } from "@/app/providers/auth-provider";
import AlertBanner from "@/components/ui/alert-banner";
import { getEvento } from "@/lib/api/eventos";
import {
  aprobarReform,
  getReform,
  rechazarReform,
  type ReformFormaParticipacionComparison,
  TIPO_REFORMA_LABELS,
  type ReformResponse,
  type ReformFieldComparison,
  type ReformItemComparison,
  type TipoReforma,
} from "@/lib/api/reforms";
import { canReviewReforms } from "@/lib/auth/access";
import { formatCurrency, formatDateDMY, formatDateTime } from "@/lib/utils/formatters";
import { getTipoAvalLabel } from "@/lib/constants";
import type { Evento, EventoItem } from "@/types/evento";
import type { TipoAval } from "@/types/aval";
import ReformReviewCard from "../_components/reform-review-card";

const STATUS_STYLES: Record<string, string> = {
  PENDIENTE:
    "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
  APROBADA:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
  RECHAZADA:
    "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200",
};

function getStatusClasses(status?: string | null) {
  if (!status) {
    return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
  }
  return (
    STATUS_STYLES[status.toUpperCase()] ??
    "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
  );
}

const TIPO_REFORMA_STYLES: Record<TipoReforma, string> = {
  DATOS_INFORMATIVOS:
    "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200",
  PRESUPUESTO:
    "bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-200",
  MIXTA:
    "bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-900/40 dark:text-fuchsia-200",
};

const MES_NOMBRES = [
  "",
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

const ITEM_CHANGE_STYLES: Record<string, string> = {
  AGREGADO:
    "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:ring-emerald-800",
  ACTUALIZADO:
    "bg-amber-50 text-amber-700 ring-1 ring-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:ring-amber-800",
  ELIMINADO:
    "bg-rose-50 text-rose-700 ring-1 ring-rose-200 dark:bg-rose-900/20 dark:text-rose-300 dark:ring-rose-800",
};

const EXCLUDED_FIELD_KEYS = new Set([
  "eventoItems",
  "formaParticipacionId",
  "tipoAval",
  "formasParticipacion",
  "numAtletasHombres",
  "numAtletasMujeres",
  "numEntrenadoresHombres",
  "numEntrenadoresMujeres",
]);

function formatFallbackValue(value: unknown) {
  if (value === null || value === undefined) return "-";
  if (typeof value === "boolean") return value ? "Sí" : "No";
  if (typeof value === "number") return value.toLocaleString("es-EC");
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return "-";
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return formatDateDMY(trimmed);
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(trimmed))
      return formatDateDMY(trimmed);
    return trimmed;
  }
  return JSON.stringify(value);
}

function hasMeaningfulDifference(a: unknown, b: unknown) {
  const left = a === null || a === undefined ? null : String(a).trim();
  const right = b === null || b === undefined ? null : String(b).trim();
  return left !== right;
}

function isChangedField(field: ReformFieldComparison) {
  if (EXCLUDED_FIELD_KEYS.has(field.campo)) return false;
  return hasMeaningfulDifference(field.antes, field.despues);
}

function isChangedItem(item: ReformItemComparison) {
  if (item.tipoCambio === "AGREGADO" || item.tipoCambio === "ELIMINADO") return true;
  if (typeof item.diferencia === "number") return item.diferencia !== 0;
  if (
    typeof item.antesPresupuesto === "number" &&
    typeof item.despuesPresupuesto === "number"
  ) {
    return item.antesPresupuesto !== item.despuesPresupuesto;
  }
  return hasMeaningfulDifference(item.antesPresupuesto, item.despuesPresupuesto);
}

function isChangedFormaParticipacion(item: ReformFormaParticipacionComparison) {
  return item.antesNumAtletas !== item.despuesNumAtletas;
}

function hasRenderableFieldValue(value: unknown) {
  const formatted = formatFallbackValue(value);
  return formatted !== "-";
}

type ProposedFormaParticipacion = {
  tipoAval?: string;
  numAtletasHombres?: number;
  numAtletasMujeres?: number;
  numEntrenadoresHombres?: number;
  numEntrenadoresMujeres?: number;
  items?: Array<{
    itemId?: number;
    mes?: number;
    presupuesto?: number;
  }>;
};

function getFormaBaseItemsMap(items: EventoItem[] = []) {
  return new Map(items.map((item) => [`${item.item.id}-${item.mes}`, item]));
}

function getBaseItemsForTipoAval(
  evento: Evento | null,
  tipoAval?: string,
): EventoItem[] {
  if (!evento || !tipoAval) return [];

  const formaItems =
    evento.formasParticipacion?.find((entry) => entry.tipoAval === tipoAval)
      ?.items ?? [];
  if (formaItems.length > 0) return formaItems;

  if (tipoAval === "FONDOS_PUBLICOS" || tipoAval === "AUTOGESTION") {
    return (evento.eventoItems ?? []).filter(
      (item) => item.fuente === (tipoAval as TipoAval),
    );
  }

  return [];
}

export default function ReformaDetailPage() {
  const params = useParams();
  const id = Number(params.id);
  const { user } = useAuth();

  const [reform, setReform] = useState<ReformResponse | null>(null);
  const [baseEvento, setBaseEvento] = useState<Evento | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!id || Number.isNaN(id)) {
      setError("ID de reforma inválido.");
      setLoading(false);
      return;
    }

    async function fetchReform() {
      try {
        setLoading(true);
        setError(null);
        const response = await getReform(id);
        setReform(response.data);

        if (response.data.eventoId) {
          const eventoResponse = await getEvento(response.data.eventoId);
          setBaseEvento(eventoResponse.data);
        } else {
          setBaseEvento(null);
        }
      } catch (err: unknown) {
        setError(
          err instanceof Error ? err.message : "No se pudo cargar la reforma.",
        );
      } finally {
        setLoading(false);
      }
    }

    void fetchReform();
  }, [id]);

  const canReview = canReviewReforms(user);

  const reloadReform = async () => {
    const response = await getReform(id);
    setReform(response.data);
    if (response.data.eventoId) {
      const eventoResponse = await getEvento(response.data.eventoId);
      setBaseEvento(eventoResponse.data);
    } else {
      setBaseEvento(null);
    }
  };

  const handleApprove = async () => {
    if (!reform) return;
    if (reform.estado !== "PENDIENTE") return;

    setActionError(null);
    setActionSuccess(null);
    setActionLoading(true);
    try {
      await aprobarReform(reform.id);
      setActionSuccess("Reforma aprobada correctamente.");
      await reloadReform();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "No se pudo aprobar la reforma.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (observacion: string) => {
    if (!reform) return;
    if (reform.estado !== "PENDIENTE") return;
    const trimmed = observacion.trim();
    if (!trimmed) return;

    setActionError(null);
    setActionSuccess(null);
    setActionLoading(true);
    try {
      await rechazarReform(reform.id, trimmed);
      setActionSuccess("Reforma rechazada correctamente.");
      await reloadReform();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "No se pudo rechazar la reforma.");
    } finally {
      setActionLoading(false);
    }
  };

  const fieldComparisons = useMemo(() => {
    if (reform?.comparacion?.campos?.length) {
      return reform.comparacion.campos.filter(isChangedField);
    }

    const readableFields = reform?.cambiosPropuestosLegibles?.campos ?? [];
    if (readableFields.length > 0) {
      return readableFields
        .filter(
          (field) =>
            !EXCLUDED_FIELD_KEYS.has(field.campo) &&
            hasRenderableFieldValue(field.valor),
        )
        .map((field) => ({
          campo: field.campo,
          etiqueta: field.etiqueta,
          antes: null,
          despues: formatFallbackValue(field.valor),
        }));
    }

    const rawChanges = reform?.cambiosPropuestos ?? {};
    return Object.entries(rawChanges)
      .filter(
        ([key, valor]) =>
          !EXCLUDED_FIELD_KEYS.has(key) && hasRenderableFieldValue(valor),
      )
      .map(([campo, valor]) => ({
        campo,
        etiqueta: campo,
        antes: null,
        despues: formatFallbackValue(valor),
      }));
  }, [reform]);

  const budgetReformFormas =
    (reform?.cambiosPropuestos as Record<string, unknown>)?.formasParticipacion as
      | Array<{ tipoAval?: string }>
      | undefined;
  const budgetReformTipoAval = budgetReformFormas?.[0]?.tipoAval ?? null;

  // Mapa de nombre/número por itemId desde todos los items del evento base,
  // sin importar el mes. Sirve como fallback cuando el backend no resuelve
  // itemNombre (sucede cuando el item propuesto cambia de mes respecto a la base).
  const catalogNameMap = useMemo(() => {
    const map = new Map<number, { nombre: string; numero: number | undefined }>();
    (baseEvento?.eventoItems ?? []).forEach((ei) => {
      if (!map.has(ei.item.id)) {
        map.set(ei.item.id, { nombre: ei.item.nombre, numero: ei.item.numero ?? undefined });
      }
    });
    return map;
  }, [baseEvento]);

  function resolveItemName(itemId: number, itemNombre?: string | null) {
    if (itemNombre) return itemNombre;
    return catalogNameMap.get(itemId)?.nombre ?? `Item #${itemId}`;
  }

  function resolveItemNumero(itemId: number, itemNumero?: number | null) {
    if (itemNumero != null) return itemNumero;
    return catalogNameMap.get(itemId)?.numero ?? itemId;
  }

  const itemComparisons = useMemo(() => {
    if (reform?.comparacion?.eventoItems?.length) {
      return reform.comparacion.eventoItems.filter(isChangedItem).map((item) => ({
        ...item,
        itemNombre: resolveItemName(item.itemId, item.itemNombre),
        itemNumero: resolveItemNumero(item.itemId, item.itemNumero),
      }));
    }

    const comparisonFormaItems = (reform?.comparacion?.formasParticipacion ?? [])
      .filter((forma) =>
        budgetReformTipoAval ? forma.tipoAval === budgetReformTipoAval : true,
      )
      .flatMap((forma) => forma.items ?? [])
      .filter(isChangedItem)
      .map((item) => ({
        ...item,
        itemNombre: resolveItemName(item.itemId, item.itemNombre),
        itemNumero: resolveItemNumero(item.itemId, item.itemNumero),
      }));
    if (comparisonFormaItems.length > 0) {
      return comparisonFormaItems;
    }

    const readableItems = reform?.cambiosPropuestosLegibles?.eventoItems ?? [];
    if (readableItems.length > 0) {
      return readableItems.map((item) => ({
        itemId: item.itemId,
        itemNumero: resolveItemNumero(item.itemId, item.itemNumero),
        itemNombre: resolveItemName(item.itemId, item.itemNombre),
        mes: item.mes,
        mesNombre: item.mesNombre,
        antesPresupuesto: null,
        despuesPresupuesto: item.presupuesto,
        diferencia: null,
        tipoCambio: "ACTUALIZADO" as const,
      }));
    }

    const rawFormas = (reform?.cambiosPropuestos as Record<string, unknown> | undefined)
      ?.formasParticipacion;
    if (!Array.isArray(rawFormas) || !baseEvento?.formasParticipacion?.length) return [];

    const proposedFormas = rawFormas as ProposedFormaParticipacion[];

    return proposedFormas.flatMap((forma) => {
      const proposedItems = Array.isArray(forma.items) ? forma.items : [];
      const baseItemsMap = getFormaBaseItemsMap(
        getBaseItemsForTipoAval(baseEvento, forma.tipoAval),
      );
      const comparisons: ReformItemComparison[] = [];

      proposedItems.forEach((item) => {
        if (typeof item.itemId !== "number" || typeof item.mes !== "number") return;
        const key = `${item.itemId}-${item.mes}`;
        const beforeItem = baseItemsMap.get(key);
        const beforeBudget = beforeItem
          ? Number.parseFloat(beforeItem.presupuesto) || 0
          : null;
        const afterBudget = typeof item.presupuesto === "number" ? item.presupuesto : 0;

        if (beforeItem) {
          baseItemsMap.delete(key);
        }

        if (beforeBudget === afterBudget) return;

        comparisons.push({
          itemId: item.itemId,
          itemNumero: resolveItemNumero(item.itemId, beforeItem?.item.numero),
          itemNombre: resolveItemName(item.itemId, beforeItem?.item.nombre),
          mes: item.mes,
          mesNombre: MES_NOMBRES[item.mes] ?? `Mes ${item.mes}`,
          antesPresupuesto: beforeBudget,
          despuesPresupuesto: afterBudget,
          diferencia: beforeBudget === null ? afterBudget : afterBudget - beforeBudget,
          tipoCambio: beforeItem ? "ACTUALIZADO" : "AGREGADO",
        });
      });

      baseItemsMap.forEach((beforeItem) => {
        comparisons.push({
          itemId: beforeItem.item.id,
          itemNumero: beforeItem.item.numero ?? beforeItem.item.id,
          itemNombre: beforeItem.item.nombre ?? `Item #${beforeItem.item.id}`,
          mes: beforeItem.mes,
          mesNombre: MES_NOMBRES[beforeItem.mes] ?? `Mes ${beforeItem.mes}`,
          antesPresupuesto: Number.parseFloat(beforeItem.presupuesto) || 0,
          despuesPresupuesto: 0,
          diferencia: -(Number.parseFloat(beforeItem.presupuesto) || 0),
          tipoCambio: "ELIMINADO",
        });
      });

      return comparisons;
    });
  }, [baseEvento, budgetReformTipoAval, reform]);

  const formaComparisons = useMemo(() => {
    const rawFormas = (reform?.cambiosPropuestos as Record<string, unknown> | undefined)
      ?.formasParticipacion;

    if (!Array.isArray(rawFormas)) return [];

    const proposedFormas = rawFormas as ProposedFormaParticipacion[];

    const fallbackComparisons = proposedFormas
      .map((forma) => {
        const baseForma = baseEvento?.formasParticipacion?.find(
          (entry) => entry.tipoAval === forma.tipoAval,
        );
        return {
          tipoAval: forma.tipoAval ?? null,
          antesNumAtletasHombres: baseForma?.numAtletasHombres ?? null,
          despuesNumAtletasHombres: forma.numAtletasHombres ?? 0,
          antesNumAtletasMujeres: baseForma?.numAtletasMujeres ?? null,
          despuesNumAtletasMujeres: forma.numAtletasMujeres ?? 0,
          antesNumEntrenadoresHombres: baseForma?.numEntrenadoresHombres ?? null,
          despuesNumEntrenadoresHombres: forma.numEntrenadoresHombres ?? 0,
          antesNumEntrenadoresMujeres: baseForma?.numEntrenadoresMujeres ?? null,
          despuesNumEntrenadoresMujeres: forma.numEntrenadoresMujeres ?? 0,
        };
      })
      .filter((forma) =>
        [
          forma.antesNumAtletasHombres !== forma.despuesNumAtletasHombres,
          forma.antesNumAtletasMujeres !== forma.despuesNumAtletasMujeres,
          forma.antesNumEntrenadoresHombres !== forma.despuesNumEntrenadoresHombres,
          forma.antesNumEntrenadoresMujeres !== forma.despuesNumEntrenadoresMujeres,
        ].some(Boolean),
      );

    if (fallbackComparisons.length > 0) return fallbackComparisons;

    if (reform?.comparacion?.formasParticipacion?.length) {
      return reform.comparacion.formasParticipacion
        .filter(isChangedFormaParticipacion)
        .map((forma) => ({
          tipoAval: forma.tipoAval,
          antesNumAtletasHombres: forma.antesNumAtletas ?? null,
          despuesNumAtletasHombres: forma.despuesNumAtletas ?? null,
          antesNumAtletasMujeres: null,
          despuesNumAtletasMujeres: null,
          antesNumEntrenadoresHombres: forma.antesNumEntrenadores ?? null,
          despuesNumEntrenadoresHombres: forma.despuesNumEntrenadores ?? null,
          antesNumEntrenadoresMujeres: null,
          despuesNumEntrenadoresMujeres: null,
        }));
    }

    return [];
  }, [baseEvento, reform]);

  const hasComparisonData =
    (reform?.comparacion?.campos?.length ?? 0) > 0 ||
    (reform?.comparacion?.eventoItems?.length ?? 0) > 0 ||
    (reform?.comparacion?.formasParticipacion?.length ?? 0) > 0 ||
    Boolean(baseEvento);
  const totalItemsBefore = useMemo(
    () =>
      itemComparisons.reduce(
        (total, item) =>
          total +
          (typeof item.antesPresupuesto === "number" ? item.antesPresupuesto : 0),
        0,
      ),
    [itemComparisons],
  );
  const totalItemsAfter = useMemo(
    () =>
      itemComparisons.reduce(
        (total, item) =>
          total +
          (typeof item.despuesPresupuesto === "number" ? item.despuesPresupuesto : 0),
        0,
      ),
    [itemComparisons],
  );

  if (loading) {
    return (
      <div className="px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl space-y-4">
          <div className="h-8 w-56 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
          <div className="h-40 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-700" />
          <div className="h-64 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-700" />
        </div>
      </div>
    );
  }

  if (error || !reform) {
    return (
      <div className="px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl space-y-4">
          <AlertBanner
            variant="error"
            message={error ?? "No se encontró la reforma."}
            onClose={() => setError(null)}
          />
          <Link
            href="/reformas"
            className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver a reformas
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
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
        <div>
          <Link
            href="/reformas"
            className="inline-flex items-center gap-2 text-sm text-gray-500 transition hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver a reformas
          </Link>

          <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.18em] text-amber-700 dark:text-amber-300">
                Detalle de reforma
              </p>
              <h1 className="mt-2 text-3xl font-bold text-gray-900 dark:text-gray-100">
                Reforma #{reform.id}
              </h1>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Evento: {reform.evento?.nombre || "Sin evento asociado"}
              </p>
              {reform.eventoId ? (
                <Link
                  href={`/eventos/${reform.eventoId}`}
                  className="mt-3 inline-flex w-fit items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-800 shadow-sm transition hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-200 dark:hover:border-gray-600 dark:hover:bg-gray-900/60"
                >
                  Ver evento
                </Link>
              ) : null}
            </div>

            <div className="flex flex-col items-start gap-2 sm:items-end">
              <span
                className={`inline-flex w-fit rounded-full px-3 py-1 text-sm font-medium ${getStatusClasses(
                  reform.estado,
                )}`}
              >
                {reform.estado}
              </span>
              {reform.tipo ? (
                <span
                  className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-medium ${
                    TIPO_REFORMA_STYLES[reform.tipo] ??
                    "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                  }`}
                  title="Tipo derivado según los campos editados"
                >
                  {TIPO_REFORMA_LABELS[reform.tipo] ?? reform.tipo}
                </span>
              ) : null}
            </div>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div className="mb-4 flex items-center gap-2">
              <ClipboardEdit className="h-5 w-5 text-gray-400" />
              <h2 className="font-semibold text-gray-900 dark:text-gray-100">
                Solicitud
              </h2>
            </div>
            <dl className="space-y-4 text-sm">
              <div>
                <dt className="text-gray-500 dark:text-gray-400">Motivo</dt>
                <dd className="mt-1 text-gray-900 dark:text-gray-100">
                  {reform.motivo || "-"}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500 dark:text-gray-400">Observación</dt>
                <dd className="mt-1 text-gray-900 dark:text-gray-100">
                  {reform.observacion || "-"}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500 dark:text-gray-400">
                  Mes de ejecución
                </dt>
                <dd className="mt-1 inline-flex items-center gap-2 text-gray-900 dark:text-gray-100">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  {reform.mesEjecucion
                    ? MES_NOMBRES[reform.mesEjecucion] ?? `Mes ${reform.mesEjecucion}`
                    : "-"}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500 dark:text-gray-400">Fecha</dt>
                <dd className="mt-1 inline-flex items-center gap-2 text-gray-900 dark:text-gray-100">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  {formatDateTime(reform.createdAt)}
                </dd>
              </div>
            </dl>
          </section>

          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div className="mb-4 flex items-center gap-2">
              <Tag className="h-5 w-5 text-gray-400" />
              <h2 className="font-semibold text-gray-900 dark:text-gray-100">
                Evento asociado
              </h2>
            </div>
            <dl className="space-y-4 text-sm">
              <div>
                <dt className="text-gray-500 dark:text-gray-400">Nombre</dt>
                <dd className="mt-1 text-gray-900 dark:text-gray-100">
                  {reform.evento?.nombre || "-"}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500 dark:text-gray-400">Código</dt>
                <dd className="mt-1 text-gray-900 dark:text-gray-100">
                  {reform.evento?.codigo || "-"}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500 dark:text-gray-400">
                  Estado del evento
                </dt>
                <dd className="mt-1 text-gray-900 dark:text-gray-100">
                  {reform.evento?.estado || "-"}
                </dd>
              </div>
            </dl>
          </section>

        </div>

        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="mb-4 flex items-center gap-2">
            <FileText className="h-5 w-5 text-gray-400" />
            <h2 className="font-semibold text-gray-900 dark:text-gray-100">
              Campos reformados
            </h2>
          </div>
          {!hasComparisonData ? (
            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800 dark:border-amber-900/70 dark:bg-amber-900/20 dark:text-amber-200">
              Esta reforma no tiene comparacion historica completa. Se muestra el
              resumen registrado en la solicitud.
            </div>
          ) : null}

          {fieldComparisons.length === 0 ? (
            <div className="rounded-lg bg-gray-50 p-6 text-sm text-gray-500 dark:bg-gray-900/40 dark:text-gray-400">
              Esta reforma no reporta cambios de campos simples.
            </div>
          ) : (
            <div className="space-y-3">
              {fieldComparisons.map((field) => (
                <article
                  key={field.campo}
                  className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/40"
                >
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    {field.etiqueta}
                  </p>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <div className="rounded-lg border border-gray-200 bg-white px-3 py-3 dark:border-gray-700 dark:bg-gray-950/40">
                      <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
                        Antes
                      </p>
                      <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                        {hasComparisonData
                          ? formatFallbackValue(field.antes)
                          : "No disponible"}
                      </p>
                    </div>
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 px-3 py-3 dark:border-emerald-800 dark:bg-emerald-900/10">
                      <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">
                        Después
                      </p>
                      <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                        {formatFallbackValue(field.despues)}
                      </p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="mb-4 flex items-center gap-2">
            <Layers3 className="h-5 w-5 text-gray-400" />
            <h2 className="font-semibold text-gray-900 dark:text-gray-100">
              Formas de participación reformadas
            </h2>
          </div>

          {formaComparisons.length === 0 ? (
            <div className="rounded-lg bg-gray-50 p-6 text-sm text-gray-500 dark:bg-gray-900/40 dark:text-gray-400">
              Esta reforma no reporta cambios de atletas por forma de participación.
            </div>
          ) : (
            <div className="space-y-3">
              {formaComparisons.map((forma, index) => (
                <article
                  key={`${forma.tipoAval ?? "sin-tipo"}-${index}`}
                  className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/40"
                >
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    {getTipoAvalLabel(forma.tipoAval)}
                  </p>
                  <div className="mt-3 space-y-3">
                    {[
                      {
                        label: "Atletas hombres",
                        before: forma.antesNumAtletasHombres,
                        after: forma.despuesNumAtletasHombres,
                      },
                      {
                        label: "Atletas mujeres",
                        before: forma.antesNumAtletasMujeres,
                        after: forma.despuesNumAtletasMujeres,
                      },
                      {
                        label: "Entrenadores hombres",
                        before: forma.antesNumEntrenadoresHombres,
                        after: forma.despuesNumEntrenadoresHombres,
                      },
                      {
                        label: "Entrenadores mujeres",
                        before: forma.antesNumEntrenadoresMujeres,
                        after: forma.despuesNumEntrenadoresMujeres,
                      },
                    ]
                      .filter(({ before, after }) => before !== after)
                      .map(({ label, before, after }) => (
                        <div key={label}>
                          <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
                            {label}
                          </p>
                          <div className="grid gap-3 md:grid-cols-2">
                            <div className="rounded-lg border border-gray-200 bg-white px-3 py-3 dark:border-gray-700 dark:bg-gray-950/40">
                              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
                                Antes
                              </p>
                              <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                                {hasComparisonData
                                  ? formatFallbackValue(before)
                                  : "No disponible"}
                              </p>
                            </div>
                            <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 px-3 py-3 dark:border-emerald-800 dark:bg-emerald-900/10">
                              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">
                                Después
                              </p>
                              <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                                {formatFallbackValue(after)}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="border-b border-gray-200 px-5 py-4 dark:border-gray-700">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                <Coins className="h-5 w-5" />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 sm:text-base">
                  Items presupuestarios reformados
                </p>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 sm:text-sm">
                  {itemComparisons.length > 0
                    ? `${itemComparisons.length} item${itemComparisons.length === 1 ? "" : "s"} ${hasComparisonData ? "con comparación antes y después" : "registrado" + (itemComparisons.length === 1 ? "" : "s") + " en la solicitud"}`
                    : "Esta reforma no incluye cambios en items presupuestarios."}
                </p>
                {budgetReformTipoAval ? (
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    Forma de participación: {getTipoAvalLabel(budgetReformTipoAval)}
                  </p>
                ) : null}
              </div>
            </div>
          </div>

          {itemComparisons.length > 0 ? (
            <>
              <div className="grid gap-3 border-b border-gray-200 px-5 py-4 sm:grid-cols-3 dark:border-gray-700">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-gray-500 dark:text-gray-400">
                    Total antes
                  </p>
                  <p className="mt-1 text-xl font-semibold tracking-tight text-gray-900 dark:text-gray-100 sm:text-2xl">
                    {hasComparisonData ? formatCurrency(totalItemsBefore) : "No disponible"}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-gray-500 dark:text-gray-400">
                    Total después
                  </p>
                  <p className="mt-1 text-xl font-semibold tracking-tight text-gray-900 dark:text-gray-100 sm:text-2xl">
                    {formatCurrency(totalItemsAfter)}
                  </p>
                </div>
                <div className="sm:text-right">
                  <p className="text-xs uppercase tracking-[0.22em] text-gray-500 dark:text-gray-400">
                    Items comparados
                  </p>
                  <p className="mt-1 text-xl font-semibold text-gray-900 dark:text-gray-100 sm:text-2xl">
                    {itemComparisons.length}
                  </p>
                </div>
              </div>

              <div className="space-y-3 p-5">
                {itemComparisons.map((item) => (
                  <article
                    key={`${item.itemId}-${item.mes}-${item.itemNumero ?? "na"}`}
                    className="rounded-xl border border-gray-200 bg-gray-50/80 p-4 transition hover:border-emerald-200 hover:bg-white dark:border-gray-700 dark:bg-gray-900/30 dark:hover:border-emerald-800 dark:hover:bg-gray-900/50"
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                            {item.itemNombre || `Item #${item.itemId}`}
                          </h3>
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium ${
                              ITEM_CHANGE_STYLES[item.tipoCambio] ??
                              "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                            }`}
                          >
                            {item.tipoCambio}
                          </span>
                        </div>

                        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-600 dark:text-gray-300 sm:text-sm">
                          <span className="inline-flex items-center gap-2">
                            <Tag className="h-3.5 w-3.5 text-gray-400" />
                            Item #{item.itemNumero ?? item.itemId}
                          </span>
                          <span className="inline-flex items-center gap-2">
                            <Layers3 className="h-3.5 w-3.5 text-gray-400" />
                            Eventos de Preparación y Competencia
                          </span>
                          <span className="inline-flex items-center gap-2">
                            <Calendar className="h-3.5 w-3.5 text-gray-400" />
                            {item.mesNombre}
                          </span>
                        </div>
                      </div>

                      <div className="grid gap-2 sm:grid-cols-2 md:min-w-[250px]">
                        <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-950/40">
                          <p className="text-[11px] uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
                            Antes
                          </p>
                          <p className="mt-1 text-sm font-medium text-gray-900 dark:text-gray-100">
                            {hasComparisonData
                              ? formatCurrency(item.antesPresupuesto ?? 0)
                              : "No disponible"}
                          </p>
                        </div>

                        <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 px-3 py-2 dark:border-emerald-800 dark:bg-emerald-900/10">
                          <p className="text-[11px] uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">
                            Después
                          </p>
                          <p className="mt-1 text-sm font-medium text-gray-900 dark:text-gray-100">
                            {formatCurrency(item.despuesPresupuesto ?? 0)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </>
          ) : (
            <div className="p-5">
              <div className="rounded-xl bg-gray-50 p-6 text-sm text-gray-500 dark:bg-gray-900/40 dark:text-gray-400">
                No hay items reformados para comparar.
              </div>
            </div>
          )}
        </section>

        <ReformReviewCard
          visible={canReview}
          status={reform.estado}
          loading={actionLoading}
          onApprove={handleApprove}
          onReject={handleReject}
        />
      </div>
    </div>
  );
}
