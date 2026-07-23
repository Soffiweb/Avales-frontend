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
import type { Evento } from "@/types/evento";
import {
  aprobarReform,
  downloadReformExcel,
  getReform,
  rechazarReform,
  TIPO_REFORMA_LABELS,
  MES_NOMBRES,
  type ReformDestinoEntry,
  type ReformEventoEntry,
  type ReformFieldComparison,
  type ReformItemComparison,
  type ReformMovimientoLinea,
  type ReformOrigenEntry,
  type ReformResponse,
  type TipoReforma,
} from "@/lib/api/reforms";
import { canReviewReforms } from "@/lib/auth/access";
import {
  formatCurrency,
  formatCurrencyFromString,
  formatDateDMY,
} from "@/lib/utils/formatters";
import { getTipoAvalLabel } from "@/lib/constants";
import { getInvolvedEventoIds, getPrimaryEvento } from "../_lib/summary";
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

function hasRenderableFieldValue(value: unknown) {
  const formatted = formatFallbackValue(value);
  return formatted !== "-";
}

type CatalogNameMap = Map<number, { nombre: string; numero?: number }>;

/** Fallback cuando el backend no resuelve itemNombre/itemNumero (sucede cuando
 * el item propuesto cambia de mes respecto a la base). */
function buildCatalogNameMap(baseEvento?: Evento): CatalogNameMap {
  const map: CatalogNameMap = new Map();
  (baseEvento?.eventoItems ?? []).forEach((ei) => {
    if (!map.has(ei.item.id)) {
      map.set(ei.item.id, {
        nombre: ei.item.nombre,
        numero: ei.item.numero ?? undefined,
      });
    }
  });
  return map;
}

function resolveItemName(
  itemId: number,
  itemNombre: string | null | undefined,
  catalogNameMap: CatalogNameMap,
) {
  if (itemNombre?.trim()) return itemNombre;
  return catalogNameMap.get(itemId)?.nombre ?? `Item #${itemId}`;
}

function resolveItemNumero(
  itemId: number,
  itemNumero: number | null | undefined,
  catalogNameMap: CatalogNameMap,
) {
  if (itemNumero != null) return itemNumero;
  return catalogNameMap.get(itemId)?.numero ?? itemId;
}

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
  beforeMonth: string;
  month: string;
  before: string;
  after: string;
  beforeAmount: number;
  afterAmount: number;
  changed: boolean;
};

type EventoComparisonResult = {
  hasComparisonData: boolean;
  eventRows: EventComparisonRow[];
  participantRows: ParticipantComparisonRow[];
  budgetRows: BudgetComparisonRow[];
  totalBudgetBefore: number;
  totalBudgetAfter: number;
};

type ProposedFormaParticipacion = {
  tipoAval?: string;
  numAtletasHombres?: number;
  numAtletasMujeres?: number;
  numEntrenadoresHombres?: number;
  numEntrenadoresMujeres?: number;
};

/** Reconstruye la comparación de participantes con desglose por género, cruzando
 * el `cambiosPropuestos` crudo (que sí trae hombres/mujeres) con el evento base. */
function buildGenderSplitParticipantRows(
  eventoEntry: ReformEventoEntry,
  baseEvento?: Evento,
): ParticipantComparisonRow[] {
  const rawFormas = (
    eventoEntry.cambiosPropuestos as Record<string, unknown> | undefined
  )?.formasParticipacion;
  if (!Array.isArray(rawFormas) || !baseEvento) return [];

  const proposedFormas = rawFormas as ProposedFormaParticipacion[];

  return proposedFormas.flatMap((forma, index) => {
    const baseForma = baseEvento.formasParticipacion?.find(
      (entry) => entry.tipoAval === forma.tipoAval,
    );
    const formaLabel = getTipoAvalLabel(forma.tipoAval ?? "");

    const pairs: Array<{
      label: string;
      before?: number | null;
      after?: number;
    }> = [
      {
        label: "Atletas hombres",
        before: baseForma?.numAtletasHombres,
        after: forma.numAtletasHombres,
      },
      {
        label: "Atletas mujeres",
        before: baseForma?.numAtletasMujeres,
        after: forma.numAtletasMujeres,
      },
      {
        label: "Entrenadores hombres",
        before: baseForma?.numEntrenadoresHombres,
        after: forma.numEntrenadoresHombres,
      },
      {
        label: "Entrenadores mujeres",
        before: baseForma?.numEntrenadoresMujeres,
        after: forma.numEntrenadoresMujeres,
      },
    ];

    return pairs
      .filter((pair) => pair.after !== undefined)
      .map((pair) => ({
        key: `forma-${index}-${pair.label}`,
        forma: formaLabel,
        label: pair.label,
        before: formatFallbackValue(pair.before ?? 0),
        after: formatFallbackValue(pair.after ?? 0),
        changed: (pair.before ?? 0) !== (pair.after ?? 0),
      }));
  });
}

/** Arma las filas de comparación antes/después de un evento a partir de su `comparacion`. */
function buildEventoComparison(
  eventoEntry: ReformEventoEntry,
  baseEvento?: Evento,
): EventoComparisonResult {
  const comparacion = eventoEntry.comparacion;
  const hasComparisonData = Boolean(
    comparacion?.campos?.length ||
      comparacion?.eventoItems?.length ||
      comparacion?.formasParticipacion?.length,
  );

  let eventRows: EventComparisonRow[];
  if (comparacion?.campos?.length) {
    eventRows = comparacion.campos
      .filter((field) => !EXCLUDED_FIELD_KEYS.has(field.campo))
      .map((field) => ({
        key: field.campo,
        label: field.etiqueta,
        before: formatFallbackValue(field.antes),
        after: formatFallbackValue(field.despues),
        changed: isChangedField(field),
      }));
  } else {
    const readableFields = eventoEntry.cambiosPropuestosLegibles?.campos ?? [];
    const fallbackFields =
      readableFields.length > 0
        ? readableFields
            .filter(
              (field) =>
                !EXCLUDED_FIELD_KEYS.has(field.campo) &&
                hasRenderableFieldValue(field.valor),
            )
            .map((field) => ({
              campo: field.campo,
              etiqueta: field.etiqueta,
              valor: field.valor,
            }))
        : Object.entries(eventoEntry.cambiosPropuestos ?? {})
            .filter(
              ([key, valor]) =>
                !EXCLUDED_FIELD_KEYS.has(key) && hasRenderableFieldValue(valor),
            )
            .map(([campo, valor]) => ({ campo, etiqueta: campo, valor }));

    eventRows = fallbackFields.map(({ campo, etiqueta, valor }) => ({
      key: campo,
      label: etiqueta,
      before: "-",
      after: formatFallbackValue(valor),
      changed: true,
    }));
  }

  let itemComparisons: ReformItemComparison[];
  if (comparacion?.eventoItems?.length) {
    itemComparisons = comparacion.eventoItems;
  } else if (comparacion?.formasParticipacion?.length) {
    itemComparisons = comparacion.formasParticipacion.flatMap(
      (forma) => forma.items ?? [],
    );
  } else {
    const readableItems =
      eventoEntry.cambiosPropuestosLegibles?.eventoItems ?? [];
    itemComparisons = readableItems.map((item) => ({
      itemId: item.itemId,
      itemNumero: item.itemNumero,
      itemNombre: item.itemNombre,
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

  const catalogNameMap = buildCatalogNameMap(baseEvento);

  const budgetRows: BudgetComparisonRow[] = itemComparisons.map((item) => {
    const beforeAmount = item.antesPresupuesto ?? 0;
    const afterAmount = item.despuesPresupuesto ?? 0;
    return {
      key: `${item.itemId}-${item.mes}`,
      code: String(resolveItemNumero(item.itemId, item.itemNumero, catalogNameMap)),
      item: resolveItemName(item.itemId, item.itemNombre, catalogNameMap),
      month: item.mesNombre,
      beforeMonth:
        item.mesAntes != null
          ? item.mesNombreAntes ?? MES_NOMBRES[item.mesAntes] ?? `Mes ${item.mesAntes}`
          : item.mesNombre,
      before:
        typeof item.antesPresupuesto === "number"
          ? formatCurrency(item.antesPresupuesto)
          : hasComparisonData
            ? formatCurrency(0)
            : "No disponible",
      after: formatCurrency(afterAmount),
      beforeAmount,
      afterAmount,
      changed: isChangedItem(item),
    };
  });

  const genderSplitRows = buildGenderSplitParticipantRows(
    eventoEntry,
    baseEvento,
  );

  const participantRows: ParticipantComparisonRow[] =
    genderSplitRows.length > 0
      ? genderSplitRows
      : (comparacion?.formasParticipacion ?? []).flatMap((forma, index) => {
          const formaLabel = getTipoAvalLabel(forma.tipoAval);
          return [
            {
              key: `forma-${index}-atletas`,
              forma: formaLabel,
              label: "Deportistas",
              before: formatFallbackValue(forma.antesNumAtletas),
              after: formatFallbackValue(forma.despuesNumAtletas),
              changed: forma.antesNumAtletas !== forma.despuesNumAtletas,
            },
            {
              key: `forma-${index}-entrenadores`,
              forma: formaLabel,
              label: "Entrenadores",
              before: formatFallbackValue(forma.antesNumEntrenadores),
              after: formatFallbackValue(forma.despuesNumEntrenadores),
              changed:
                forma.antesNumEntrenadores !== forma.despuesNumEntrenadores,
            },
          ];
        });

  const totalBudgetBefore = budgetRows.reduce(
    (total, row) => total + row.beforeAmount,
    0,
  );
  const totalBudgetAfter = budgetRows.reduce(
    (total, row) => total + row.afterAmount,
    0,
  );

  return {
    hasComparisonData,
    eventRows,
    participantRows,
    budgetRows,
    totalBudgetBefore,
    totalBudgetAfter,
  };
}

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
                        {tone === "before" ? row.beforeMonth : row.month}
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

function TipoReformaBadge({ reform }: { reform: ReformResponse }) {
  if (reform.eventos.length === 1) {
    const tipo = reform.eventos[0].tipo;
    return (
      <span
        className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-medium ${
          TIPO_REFORMA_STYLES[tipo] ??
          "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
        }`}
        title="Tipo derivado según los campos editados"
      >
        {TIPO_REFORMA_LABELS[tipo] ?? tipo}
      </span>
    );
  }

  if (reform.eventos.length > 1 || reform.origenes.length > 0 || reform.destinos.length > 0) {
    return (
      <span className="inline-flex w-fit rounded-full bg-indigo-100 px-3 py-1 text-xs font-medium text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-200">
        Multi-evento
      </span>
    );
  }

  return null;
}

function ReformaEventoComparacion({
  eventoEntry,
  baseEvento,
}: {
  eventoEntry: ReformEventoEntry;
  baseEvento?: Evento;
}) {
  const {
    hasComparisonData,
    eventRows,
    participantRows,
    budgetRows,
    totalBudgetBefore,
    totalBudgetAfter,
  } = useMemo(
    () => buildEventoComparison(eventoEntry, baseEvento),
    [eventoEntry, baseEvento],
  );

  const eventoLabel = eventoEntry.evento?.nombre
    ? `${eventoEntry.evento.nombre}${
        eventoEntry.evento.codigo ? ` (${eventoEntry.evento.codigo})` : ""
      }`
    : `Evento #${eventoEntry.eventoId}`;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {eventoLabel}
          </h2>
          <span
            className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${
              TIPO_REFORMA_STYLES[eventoEntry.tipo] ??
              "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
            }`}
          >
            {TIPO_REFORMA_LABELS[eventoEntry.tipo] ?? eventoEntry.tipo}
          </span>
        </div>
        <Link
          href={`/eventos/${eventoEntry.eventoId}`}
          className="text-xs font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
        >
          Ver evento
        </Link>
      </div>

      {!hasComparisonData ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800 dark:border-amber-900/70 dark:bg-amber-900/20 dark:text-amber-200">
          Esta reforma no tiene comparación histórica completa para este
          evento. Se muestra el resumen registrado en la solicitud.
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
            hasComparisonData ? formatCurrency(totalBudgetBefore) : "No disponible"
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
    </div>
  );
}

type MovimientoLineaEntry =
  | (ReformMovimientoLinea & { montoCortado: string })
  | (ReformMovimientoLinea & { montoAsignado: string });

function getEntryMontoTotal(entry: ReformOrigenEntry | ReformDestinoEntry) {
  return "montoCortado" in entry ? entry.montoCortado : entry.montoAsignado;
}

function getLineaMonto(linea: MovimientoLineaEntry) {
  return "montoCortado" in linea ? linea.montoCortado : linea.montoAsignado;
}

function MovimientosPresupuestoTable({
  title,
  tipo,
  entries,
}: {
  title: string;
  tipo: "origen" | "destino";
  entries: (ReformOrigenEntry | ReformDestinoEntry)[];
}) {
  if (entries.length === 0) return null;

  const accentClass =
    tipo === "origen"
      ? "text-rose-700 dark:text-rose-400"
      : "text-emerald-700 dark:text-emerald-400";
  const sign = tipo === "origen" ? "-" : "+";

  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100">
        {title}
      </h3>
      <div className="space-y-4">
        {entries.map((entry) => {
          const totalAntes = Number.parseFloat(entry.totalEventoAntes) || 0;
          const totalDespues =
            entry.totalEventoDespues != null
              ? Number.parseFloat(entry.totalEventoDespues)
              : null;

          return (
            <div
              key={entry.id}
              className="rounded-lg border border-gray-200 p-4 dark:border-gray-700"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <Link
                    href={`/eventos/${entry.eventoId}`}
                    className="text-sm font-semibold text-gray-900 hover:text-indigo-600 dark:text-gray-100 dark:hover:text-indigo-400"
                  >
                    {entry.evento?.nombre ?? `Evento #${entry.eventoId}`}
                  </Link>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {entry.evento?.codigo ? `${entry.evento.codigo} · ` : ""}
                    Forma de participación #{entry.formaParticipacionId}
                  </p>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-semibold ${accentClass}`}>
                    {sign}
                    {formatCurrencyFromString(getEntryMontoTotal(entry))}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {formatCurrency(totalAntes)}
                    {totalDespues != null
                      ? ` → ${formatCurrency(totalDespues)}`
                      : ""}
                  </p>
                </div>
              </div>

              {entry.items.length > 0 ? (
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
                          Monto
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {entry.items.map((linea, index) => (
                        <tr key={`${linea.itemId}-${linea.mes}-${index}`}>
                          <td className="border-b border-gray-100 px-2 py-2 text-gray-700 dark:border-gray-800 dark:text-gray-200">
                            {linea.item?.nombre
                              ? `${linea.item.numero ?? linea.item.id} · ${linea.item.nombre}`
                              : `Item #${linea.itemId}`}
                          </td>
                          <td className="border-b border-gray-100 px-2 py-2 text-gray-700 dark:border-gray-800 dark:text-gray-200">
                            {MES_NOMBRES[linea.mes] ?? `Mes ${linea.mes}`}
                          </td>
                          <td
                            className={`border-b border-gray-100 px-2 py-2 text-right font-semibold dark:border-gray-800 ${accentClass}`}
                          >
                            {sign}
                            {formatCurrencyFromString(getLineaMonto(linea))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
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
  const [baseEventos, setBaseEventos] = useState<Map<number, Evento>>(
    new Map(),
  );
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

        const eventoIds = response.data.eventos.map((entry) => entry.eventoId);
        const eventosResults = await Promise.all(
          eventoIds.map((eventoId) => getEvento(eventoId).catch(() => null)),
        );
        const map = new Map<number, Evento>();
        eventosResults.forEach((result, index) => {
          if (result) map.set(eventoIds[index], result.data);
        });
        setBaseEventos(map);
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

  const primaryEvento = getPrimaryEvento(reform);
  const involvedEventoCount = getInvolvedEventoIds(reform).size;
  const extraEventosCount =
    involvedEventoCount > 1 ? involvedEventoCount - 1 : 0;

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
                Reforma {reform.numeroReforma}
              </h1>
              <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <span>
                  Evento: {primaryEvento?.nombre || "Sin evento asociado"}
                </span>
                {extraEventosCount > 0 ? (
                  <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                    +{extraEventosCount} evento
                    {extraEventosCount === 1 ? "" : "s"}
                  </span>
                ) : null}
              </p>
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
                <TipoReformaBadge reform={reform} />
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
              <TipoReformaBadge reform={reform} />
              <span className="inline-flex w-fit rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                {reform.mesEjecucion
                  ? (MES_NOMBRES[reform.mesEjecucion] ??
                    `Mes ${reform.mesEjecucion}`)
                  : "Sin mes"}
              </span>
            </div>
          </div>
        </section>

        {reform.eventos.length > 0 ? (
          <div className="space-y-6">
            {reform.eventos.map((eventoEntry) => (
              <ReformaEventoComparacion
                key={eventoEntry.id}
                eventoEntry={eventoEntry}
                baseEvento={baseEventos.get(eventoEntry.eventoId)}
              />
            ))}
          </div>
        ) : null}

        {reform.origenes.length > 0 || reform.destinos.length > 0 ? (
          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div className="mb-4">
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                Movimientos de presupuesto
              </p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Presupuesto cortado de eventos de origen y asignado a eventos
                de destino.
              </p>
            </div>
            <div className="grid gap-6 xl:grid-cols-2">
              <MovimientosPresupuestoTable
                title="Orígenes"
                tipo="origen"
                entries={reform.origenes}
              />
              <MovimientosPresupuestoTable
                title="Destinos"
                tipo="destino"
                entries={reform.destinos}
              />
            </div>
          </section>
        ) : null}

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
