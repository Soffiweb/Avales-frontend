"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Download,
  FileText,
} from "lucide-react";

import { useAuth } from "@/app/providers/auth-provider";
import AlertBanner from "@/components/ui/alert-banner";
import { getEvento } from "@/lib/api/eventos";
import {
  aprobarReform,
  downloadReformExcel,
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
import {
  formatCurrency,
  formatDateDMY,
  formatDateTime,
} from "@/lib/utils/formatters";
import { getTipoAvalLabel } from "@/lib/constants";
import type { Evento, EventoItem } from "@/types/evento";
import type { TipoAval } from "@/types/aval";
import ReformReviewCard from "../_components/reform-review-card";

const STATUS_STYLES: Record<string, string> = {
  PENDIENTE:
    "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
  APROBADA:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
  RECHAZADA: "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200",
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
  if (item.tipoCambio === "AGREGADO" || item.tipoCambio === "ELIMINADO")
    return true;
  if (item.mesAntes != null && item.mesAntes !== item.mes) return true;
  if (typeof item.diferencia === "number") return item.diferencia !== 0;
  if (
    typeof item.antesPresupuesto === "number" &&
    typeof item.despuesPresupuesto === "number"
  ) {
    return item.antesPresupuesto !== item.despuesPresupuesto;
  }
  return hasMeaningfulDifference(
    item.antesPresupuesto,
    item.despuesPresupuesto,
  );
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

type EventComparisonRow = {
  key: string;
  label: string;
  before: string;
  after: string;
  changed: boolean;
};

type ParticipantComparisonRow = {
  key: string;
  forma: string;
  label: string;
  before: string;
  after: string;
  changed: boolean;
};

type BudgetComparisonRow = {
  key: string;
  code: string;
  item: string;
  month: string;
  before: string;
  after: string;
  beforeAmount: number;
  afterAmount: number;
  changed: boolean;
};

function DetailValue({
  label,
  value,
  changed,
}: {
  label: string;
  value: string;
  changed: boolean;
}) {
  return (
    <div
      className={`rounded-lg border px-3 py-2 ${
        changed
          ? "border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20"
          : "border-gray-200 bg-gray-50/70 dark:border-gray-700 dark:bg-gray-900/30"
      }`}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">
        {label}
      </p>
      <p className="mt-1 text-sm font-medium text-gray-900 dark:text-gray-100">
        {value}
      </p>
    </div>
  );
}

function EventSidePanel({
  title,
  subtitle,
  tone,
  rows,
  participants,
  budgetRows,
  totalBudget,
}: {
  title: string;
  subtitle: string;
  tone: "before" | "after";
  rows: EventComparisonRow[];
  participants: ParticipantComparisonRow[];
  budgetRows: BudgetComparisonRow[];
  totalBudget: string;
}) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="border-b border-gray-200 px-5 py-4 dark:border-gray-700">
        <p
          className={`text-xs font-semibold uppercase tracking-[0.18em] ${
            tone === "after"
              ? "text-emerald-700 dark:text-emerald-300"
              : "text-gray-500 dark:text-gray-400"
          }`}
        >
          {subtitle}
        </p>
        <h2 className="mt-1 text-lg font-semibold text-gray-900 dark:text-gray-100">
          {title}
        </h2>
      </div>

      <div className="space-y-5 p-5">
        <div className="grid gap-3 sm:grid-cols-2">
          {rows.map((row) => (
            <DetailValue
              key={row.key}
              label={row.label}
              value={tone === "before" ? row.before : row.after}
              changed={row.changed}
            />
          ))}
        </div>

        <div>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Participación
            </h3>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {participants.filter((row) => row.changed).length} cambio(s)
            </span>
          </div>
          {participants.length === 0 ? (
            <div className="rounded-lg bg-gray-50 p-4 text-sm text-gray-500 dark:bg-gray-900/30 dark:text-gray-400">
              Sin datos de participación.
            </div>
          ) : (
            <div className="grid gap-2">
              {participants.map((row) => (
                <DetailValue
                  key={row.key}
                  label={`${row.forma} · ${row.label}`}
                  value={tone === "before" ? row.before : row.after}
                  changed={row.changed}
                />
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Presupuesto
            </h3>
            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              {totalBudget}
            </span>
          </div>
          {budgetRows.length === 0 ? (
            <div className="rounded-lg bg-gray-50 p-4 text-sm text-gray-500 dark:bg-gray-900/30 dark:text-gray-400">
              Sin ítems presupuestarios.
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 dark:bg-gray-900/50">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold text-gray-600 dark:text-gray-300">
                      Ítem
                    </th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-600 dark:text-gray-300">
                      Mes
                    </th>
                    <th className="px-3 py-2 text-right font-semibold text-gray-600 dark:text-gray-300">
                      Valor
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {budgetRows.map((row) => (
                    <tr
                      key={row.key}
                      className={
                        row.changed
                          ? "bg-amber-50/70 dark:bg-amber-900/10"
                          : undefined
                      }
                    >
                      <td className="border-t border-gray-100 px-3 py-2 text-gray-900 dark:border-gray-700 dark:text-gray-100">
                        <span className="font-semibold">{row.code}</span>{" "}
                        {row.item}
                      </td>
                      <td className="border-t border-gray-100 px-3 py-2 text-gray-600 dark:border-gray-700 dark:text-gray-300">
                        {row.month}
                      </td>
                      <td className="border-t border-gray-100 px-3 py-2 text-right font-semibold text-gray-900 dark:border-gray-700 dark:text-gray-100">
                        {tone === "before" ? row.before : row.after}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function SignatureCard({
  label,
  name,
  role,
}: {
  label: string;
  name?: string | null;
  role?: string | null;
}) {
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

function formatBytes(value?: number | null) {
  if (!value || value <= 0) return "-";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
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
  const [excelLoading, setExcelLoading] = useState(false);

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
      setActionError(
        err instanceof Error ? err.message : "No se pudo aprobar la reforma.",
      );
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
      setActionError(
        err instanceof Error ? err.message : "No se pudo rechazar la reforma.",
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleDownloadExcel = async () => {
    if (!reform) return;

    setActionError(null);
    setExcelLoading(true);
    try {
      await downloadReformExcel(reform.id);
    } catch (err: unknown) {
      setActionError(
        err instanceof Error
          ? err.message
          : "No se pudo descargar el archivo Excel.",
      );
    } finally {
      setExcelLoading(false);
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

  const budgetReformFormas = (
    reform?.cambiosPropuestos as Record<string, unknown>
  )?.formasParticipacion as Array<{ tipoAval?: string }> | undefined;
  const budgetReformTipoAval = budgetReformFormas?.[0]?.tipoAval ?? null;

  // Mapa de nombre/número por itemId desde todos los items del evento base,
  // sin importar el mes. Sirve como fallback cuando el backend no resuelve
  // itemNombre (sucede cuando el item propuesto cambia de mes respecto a la base).
  const catalogNameMap = useMemo(() => {
    const map = new Map<
      number,
      { nombre: string; numero: number | undefined }
    >();
    (baseEvento?.eventoItems ?? []).forEach((ei) => {
      if (!map.has(ei.item.id)) {
        map.set(ei.item.id, {
          nombre: ei.item.nombre,
          numero: ei.item.numero ?? undefined,
        });
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
      return reform.comparacion.eventoItems
        .filter(isChangedItem)
        .map((item) => ({
          ...item,
          itemNombre: resolveItemName(item.itemId, item.itemNombre),
          itemNumero: resolveItemNumero(item.itemId, item.itemNumero),
        }));
    }

    const comparisonFormaItems = (
      reform?.comparacion?.formasParticipacion ?? []
    )
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
        mesAntes: null,
        mesNombreAntes: null,
        antesPresupuesto: null,
        despuesPresupuesto: item.presupuesto,
        diferencia: null,
        tipoCambio: "ACTUALIZADO" as const,
      }));
    }

    const rawFormas = (
      reform?.cambiosPropuestos as Record<string, unknown> | undefined
    )?.formasParticipacion;
    if (!Array.isArray(rawFormas) || !baseEvento?.formasParticipacion?.length)
      return [];

    const proposedFormas = rawFormas as ProposedFormaParticipacion[];

    return proposedFormas.flatMap((forma) => {
      const proposedItems = Array.isArray(forma.items) ? forma.items : [];
      const baseItemsMap = getFormaBaseItemsMap(
        getBaseItemsForTipoAval(baseEvento, forma.tipoAval),
      );
      const comparisons: ReformItemComparison[] = [];

      proposedItems.forEach((item) => {
        if (typeof item.itemId !== "number" || typeof item.mes !== "number")
          return;
        const key = `${item.itemId}-${item.mes}`;
        const beforeItem = baseItemsMap.get(key);
        const beforeBudget = beforeItem
          ? Number.parseFloat(beforeItem.presupuesto) || 0
          : null;
        const afterBudget =
          typeof item.presupuesto === "number" ? item.presupuesto : 0;

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
          diferencia:
            beforeBudget === null ? afterBudget : afterBudget - beforeBudget,
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
    const rawFormas = (
      reform?.cambiosPropuestos as Record<string, unknown> | undefined
    )?.formasParticipacion;

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
          antesNumEntrenadoresHombres:
            baseForma?.numEntrenadoresHombres ?? null,
          despuesNumEntrenadoresHombres: forma.numEntrenadoresHombres ?? 0,
          antesNumEntrenadoresMujeres:
            baseForma?.numEntrenadoresMujeres ?? null,
          despuesNumEntrenadoresMujeres: forma.numEntrenadoresMujeres ?? 0,
        };
      })
      .filter((forma) =>
        [
          forma.antesNumAtletasHombres !== forma.despuesNumAtletasHombres,
          forma.antesNumAtletasMujeres !== forma.despuesNumAtletasMujeres,
          forma.antesNumEntrenadoresHombres !==
            forma.despuesNumEntrenadoresHombres,
          forma.antesNumEntrenadoresMujeres !==
            forma.despuesNumEntrenadoresMujeres,
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
  const fieldComparisonMap = useMemo(
    () => new Map(fieldComparisons.map((field) => [field.campo, field])),
    [fieldComparisons],
  );

  const eventRows = useMemo<EventComparisonRow[]>(() => {
    const evento = baseEvento;
    const fallbackEvento = reform?.evento;
    const getMes = (value?: number | null) =>
      value ? (MES_NOMBRES[value] ?? `Mes ${value}`) : "-";
    const getComparedBefore = (field: string, fallback: unknown) =>
      formatFallbackValue(fieldComparisonMap.get(field)?.antes ?? fallback);
    const getComparedAfter = (field: string, fallback: unknown) =>
      formatFallbackValue(fieldComparisonMap.get(field)?.despues ?? fallback);
    const isFieldChanged = (field: string) => fieldComparisonMap.has(field);

    return [
      {
        key: "codigo",
        label: "Código",
        before: getComparedBefore("codigo", evento?.codigo ?? fallbackEvento?.codigo),
        after: getComparedAfter("codigo", evento?.codigo ?? fallbackEvento?.codigo),
        changed: isFieldChanged("codigo"),
      },
      {
        key: "nombre",
        label: "Nombre",
        before: getComparedBefore("nombre", evento?.nombre ?? fallbackEvento?.nombre),
        after: getComparedAfter("nombre", evento?.nombre ?? fallbackEvento?.nombre),
        changed: isFieldChanged("nombre"),
      },
      {
        key: "disciplinaId",
        label: "Disciplina",
        before: getComparedBefore("disciplinaId", evento?.disciplina?.nombre),
        after: getComparedAfter("disciplinaId", evento?.disciplina?.nombre),
        changed: isFieldChanged("disciplinaId"),
      },
      {
        key: "categoriaId",
        label: "Categoría",
        before: getComparedBefore("categoriaId", evento?.categoria?.nombre),
        after: getComparedAfter("categoriaId", evento?.categoria?.nombre),
        changed: isFieldChanged("categoriaId"),
      },
      {
        key: "tipoParticipacion",
        label: "Tipo participación",
        before: getComparedBefore("tipoParticipacion", evento?.tipoParticipacion),
        after: getComparedAfter("tipoParticipacion", evento?.tipoParticipacion),
        changed: isFieldChanged("tipoParticipacion"),
      },
      {
        key: "tipoEvento",
        label: "Tipo evento",
        before: getComparedBefore("tipoEvento", evento?.tipoEvento),
        after: getComparedAfter("tipoEvento", evento?.tipoEvento),
        changed: isFieldChanged("tipoEvento"),
      },
      {
        key: "lugar",
        label: "Lugar",
        before: getComparedBefore("lugar", evento?.lugar),
        after: getComparedAfter("lugar", evento?.lugar),
        changed: isFieldChanged("lugar"),
      },
      {
        key: "provincia",
        label: "Provincia",
        before: getComparedBefore("provincia", evento?.provincia),
        after: getComparedAfter("provincia", evento?.provincia),
        changed: isFieldChanged("provincia"),
      },
      {
        key: "ciudad",
        label: "Ciudad",
        before: getComparedBefore("ciudad", evento?.ciudad),
        after: getComparedAfter("ciudad", evento?.ciudad),
        changed: isFieldChanged("ciudad"),
      },
      {
        key: "pais",
        label: "País",
        before: getComparedBefore("pais", evento?.pais),
        after: getComparedAfter("pais", evento?.pais),
        changed: isFieldChanged("pais"),
      },
      {
        key: "alcance",
        label: "Alcance",
        before: getComparedBefore("alcance", evento?.alcance),
        after: getComparedAfter("alcance", evento?.alcance),
        changed: isFieldChanged("alcance"),
      },
      {
        key: "genero",
        label: "Género",
        before: getComparedBefore("genero", evento?.genero),
        after: getComparedAfter("genero", evento?.genero),
        changed: isFieldChanged("genero"),
      },
      {
        key: "mesProgramado",
        label: "Mes planificado",
        before: getComparedBefore("mesProgramado", getMes(evento?.mesProgramado)),
        after: getComparedAfter("mesProgramado", getMes(evento?.mesProgramado)),
        changed: isFieldChanged("mesProgramado"),
      },
      {
        key: "fechaInicio",
        label: "Fecha inicio",
        before: getComparedBefore("fechaInicio", evento?.fechaInicio),
        after: getComparedAfter("fechaInicio", evento?.fechaInicio),
        changed: isFieldChanged("fechaInicio"),
      },
      {
        key: "fechaFin",
        label: "Fecha fin",
        before: getComparedBefore("fechaFin", evento?.fechaFin),
        after: getComparedAfter("fechaFin", evento?.fechaFin),
        changed: isFieldChanged("fechaFin"),
      },
    ];
  }, [baseEvento, fieldComparisonMap, reform?.evento]);

  const participantRows = useMemo<ParticipantComparisonRow[]>(() => {
    const baseFormas = baseEvento?.formasParticipacion ?? [];
    if (baseFormas.length > 0) {
      return baseFormas.flatMap((forma) => {
        const comparison = formaComparisons.find(
          (item) => item.tipoAval === forma.tipoAval,
        );
        const formaLabel = getTipoAvalLabel(forma.tipoAval);
        return [
          {
            key: `${forma.id}-atletas-hombres`,
            forma: formaLabel,
            label: "Deportistas varones",
            before: formatFallbackValue(
              comparison?.antesNumAtletasHombres ?? forma.numAtletasHombres,
            ),
            after: formatFallbackValue(
              comparison?.despuesNumAtletasHombres ?? forma.numAtletasHombres,
            ),
            changed:
              comparison?.antesNumAtletasHombres !==
              comparison?.despuesNumAtletasHombres,
          },
          {
            key: `${forma.id}-atletas-mujeres`,
            forma: formaLabel,
            label: "Deportistas damas",
            before: formatFallbackValue(
              comparison?.antesNumAtletasMujeres ?? forma.numAtletasMujeres,
            ),
            after: formatFallbackValue(
              comparison?.despuesNumAtletasMujeres ?? forma.numAtletasMujeres,
            ),
            changed:
              comparison?.antesNumAtletasMujeres !==
              comparison?.despuesNumAtletasMujeres,
          },
          {
            key: `${forma.id}-entrenadores-hombres`,
            forma: formaLabel,
            label: "Entrenadores varones",
            before: formatFallbackValue(
              comparison?.antesNumEntrenadoresHombres ??
                forma.numEntrenadoresHombres,
            ),
            after: formatFallbackValue(
              comparison?.despuesNumEntrenadoresHombres ??
                forma.numEntrenadoresHombres,
            ),
            changed:
              comparison?.antesNumEntrenadoresHombres !==
              comparison?.despuesNumEntrenadoresHombres,
          },
          {
            key: `${forma.id}-entrenadores-mujeres`,
            forma: formaLabel,
            label: "Entrenadores damas",
            before: formatFallbackValue(
              comparison?.antesNumEntrenadoresMujeres ??
                forma.numEntrenadoresMujeres,
            ),
            after: formatFallbackValue(
              comparison?.despuesNumEntrenadoresMujeres ??
                forma.numEntrenadoresMujeres,
            ),
            changed:
              comparison?.antesNumEntrenadoresMujeres !==
              comparison?.despuesNumEntrenadoresMujeres,
          },
        ];
      });
    }

    return [
      {
        key: "root-atletas-hombres",
        forma: "General",
        label: "Deportistas varones",
        before: formatFallbackValue(baseEvento?.numAtletasHombres),
        after: formatFallbackValue(baseEvento?.numAtletasHombres),
        changed: false,
      },
      {
        key: "root-atletas-mujeres",
        forma: "General",
        label: "Deportistas damas",
        before: formatFallbackValue(baseEvento?.numAtletasMujeres),
        after: formatFallbackValue(baseEvento?.numAtletasMujeres),
        changed: false,
      },
      {
        key: "root-entrenadores-hombres",
        forma: "General",
        label: "Entrenadores varones",
        before: formatFallbackValue(baseEvento?.numEntrenadoresHombres),
        after: formatFallbackValue(baseEvento?.numEntrenadoresHombres),
        changed: false,
      },
      {
        key: "root-entrenadores-mujeres",
        forma: "General",
        label: "Entrenadores damas",
        before: formatFallbackValue(baseEvento?.numEntrenadoresMujeres),
        after: formatFallbackValue(baseEvento?.numEntrenadoresMujeres),
        changed: false,
      },
    ];
  }, [baseEvento, formaComparisons]);

  const budgetRows = useMemo<BudgetComparisonRow[]>(() => {
    const comparisonMap = new Map(
      itemComparisons.map((item) => [`${item.itemId}-${item.mes}`, item]),
    );
    const usedKeys = new Set<string>();
    const baseItems =
      baseEvento?.formasParticipacion?.flatMap((forma) => forma.items ?? []) ??
      baseEvento?.eventoItems ??
      [];

    const rows = baseItems.map((item) => {
      const key = `${item.item.id}-${item.mes}`;
      const comparison = comparisonMap.get(key);
      const baseBudget = Number.parseFloat(item.presupuesto) || 0;
      if (comparison) usedKeys.add(key);
      return {
        key,
        code: String(item.item.numero ?? item.item.id),
        item: item.item.nombre,
        month: comparison?.mesNombre ?? MES_NOMBRES[item.mes] ?? `Mes ${item.mes}`,
        before: formatCurrency(comparison?.antesPresupuesto ?? baseBudget),
        after: formatCurrency(comparison?.despuesPresupuesto ?? baseBudget),
        beforeAmount: comparison?.antesPresupuesto ?? baseBudget,
        afterAmount: comparison?.despuesPresupuesto ?? baseBudget,
        changed: Boolean(comparison),
      };
    });

    itemComparisons.forEach((item) => {
      const key = `${item.itemId}-${item.mes}`;
      if (usedKeys.has(key)) return;
      rows.push({
        key,
        code: String(item.itemNumero ?? item.itemId),
        item: item.itemNombre || `Item #${item.itemId}`,
        month:
          item.mesAntes != null && item.mesAntes !== item.mes
            ? `${item.mesNombreAntes ?? MES_NOMBRES[item.mesAntes] ?? `Mes ${item.mesAntes}`} → ${item.mesNombre}`
            : item.mesNombre,
        before:
          hasComparisonData && typeof item.antesPresupuesto === "number"
            ? formatCurrency(item.antesPresupuesto)
            : "No disponible",
        after: formatCurrency(item.despuesPresupuesto ?? 0),
        beforeAmount:
          hasComparisonData && typeof item.antesPresupuesto === "number"
            ? item.antesPresupuesto
            : 0,
        afterAmount: item.despuesPresupuesto ?? 0,
        changed: true,
      });
    });

    return rows;
  }, [baseEvento, hasComparisonData, itemComparisons]);
  const totalBudgetBefore = useMemo(
    () => budgetRows.reduce((total, item) => total + item.beforeAmount, 0),
    [budgetRows],
  );
  const totalBudgetAfter = useMemo(
    () => budgetRows.reduce((total, item) => total + item.afterAmount, 0),
    [budgetRows],
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

            <div className="w-full max-w-md space-y-3 sm:w-auto">
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

              <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                <button
                  type="button"
                  onClick={handleDownloadExcel}
                  disabled={excelLoading}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Download className="h-4 w-4" />
                  {excelLoading
                    ? "Descargando Reforma (Excel)..."
                    : "Descargar Reforma (Excel)"}
                </button>

                {reform.adjuntos && reform.adjuntos.length > 0 ? (
                  <>
                    <div className="mb-3 mt-4 flex items-center gap-2">
                      <FileText className="h-4 w-4 text-gray-400" />
                      <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        Adjuntos
                      </h2>
                    </div>
                    <ul className="space-y-2">
                      {reform.adjuntos.map((adjunto) => (
                        <li key={adjunto.id}>
                          <a
                            href={adjunto.url}
                            target="_blank"
                            rel="noreferrer noopener"
                            download
                            title={`Descargar ${adjunto.nombreOriginal}`}
                            className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm transition hover:border-gray-300 hover:bg-white dark:border-gray-700 dark:bg-gray-900/40 dark:hover:border-gray-600 dark:hover:bg-gray-900/60"
                          >
                            <span className="min-w-0">
                              <span className="block truncate font-medium text-gray-900 dark:text-gray-100">
                                {adjunto.nombreOriginal}
                              </span>
                              <span className="block text-xs text-gray-500 dark:text-gray-400">
                                {formatBytes(adjunto.tamanoBytes)}
                              </span>
                            </span>
                            <span className="inline-flex shrink-0 items-center gap-2 rounded-md bg-indigo-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-600">
                              <Download className="h-3.5 w-3.5" />
                            </span>
                          </a>
                        </li>
                      ))}
                    </ul>
                  </>
                ) : null}
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
              <span
                className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-medium ${
                  TIPO_REFORMA_STYLES[reform.tipo] ??
                  "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                }`}
              >
                {TIPO_REFORMA_LABELS[reform.tipo] ?? reform.tipo}
              </span>
              <span className="inline-flex w-fit rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                {reform.mesEjecucion
                  ? (MES_NOMBRES[reform.mesEjecucion] ??
                    `Mes ${reform.mesEjecucion}`)
                  : "Sin mes"}
              </span>
            </div>
          </div>
        </section>

        {!hasComparisonData ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800 dark:border-amber-900/70 dark:bg-amber-900/20 dark:text-amber-200">
            Esta reforma no tiene comparación histórica completa. Se muestra el
            resumen registrado en la solicitud.
          </div>
        ) : null}

        <div className="grid gap-4 xl:grid-cols-2">
          <EventSidePanel
            title="Evento actual"
            subtitle="Antes de la reforma"
            tone="before"
            rows={eventRows}
            participants={participantRows}
            budgetRows={budgetRows}
            totalBudget={
              hasComparisonData
                ? formatCurrency(totalBudgetBefore)
                : "No disponible"
            }
          />
          <EventSidePanel
            title="Reforma solicitada"
            subtitle="Datos a aprobar"
            tone="after"
            rows={eventRows}
            participants={participantRows}
            budgetRows={budgetRows}
            totalBudget={formatCurrency(totalBudgetAfter)}
          />
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
