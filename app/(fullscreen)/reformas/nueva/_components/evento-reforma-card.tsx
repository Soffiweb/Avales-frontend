"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Trash2 } from "lucide-react";

import { formatCurrency } from "@/lib/utils/formatters";
import type { CatalogItemPresupuestario } from "@/types/catalog";
import type { Evento } from "@/types/evento";
import EventoAntesPanel from "./evento-antes-panel";
import EventoCambiosCard, { type EventoCambiosResult } from "./evento-cambios-card";

type Props = {
  evento: Evento;
  result?: EventoCambiosResult;
  itemsCatalogo: CatalogItemPresupuestario[];
  eligibleFormaIds: number[];
  onChange: (result: EventoCambiosResult) => void;
  onRemove: () => void;
  defaultExpanded?: boolean;
};

/** Un evento de la reforma: header compartido + antes (izquierda) | después (derecha). */
export default function EventoReformaCard({
  evento,
  result,
  itemsCatalogo,
  eligibleFormaIds,
  onChange,
  onRemove,
  defaultExpanded = true,
}: Props) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const hasAnyChange = Boolean(
    result && (Object.keys(result.cambiosPropuestos).length > 0 || result.movimientos.length > 0),
  );

  const { bajado, subido } = useMemo(() => {
    const movimientos = result?.movimientos ?? [];
    return movimientos.reduce(
      (acc, m) => {
        const delta = m.montoNuevo - m.montoOriginal;
        if (delta < 0) acc.bajado += -delta;
        if (delta > 0) acc.subido += delta;
        return acc;
      },
      { bajado: 0, subido: 0 },
    );
  }, [result]);

  return (
    <section className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-start justify-between gap-3 px-6 py-4">
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
        >
          <ChevronDown
            className={`h-5 w-5 shrink-0 text-gray-400 transition-transform ${
              expanded ? "rotate-180" : ""
            }`}
          />
          <div className="min-w-0">
            <p className="truncate font-semibold text-gray-900 dark:text-gray-100">
              {evento.nombre}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {evento.codigo}
              {hasAnyChange ? " · Con cambios propuestos" : " · Sin cambios"}
            </p>
            {bajado > 0 || subido > 0 ? (
              <p className="mt-0.5 flex flex-wrap gap-x-3 text-xs font-medium">
                {bajado > 0 ? (
                  <span className="text-rose-600 dark:text-rose-400">
                    Bajó {formatCurrency(bajado)}
                  </span>
                ) : null}
                {subido > 0 ? (
                  <span className="text-emerald-600 dark:text-emerald-400">
                    Subió {formatCurrency(subido)}
                  </span>
                ) : null}
              </p>
            ) : null}
          </div>
        </button>
        <button
          type="button"
          onClick={onRemove}
          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-950/30"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Quitar
        </button>
      </div>

      {/*
        No desmontar en base a `expanded`: EventoCambiosCard guarda su
        formulario en estado interno (no controlado desde afuera), así que
        desmontarlo al colapsar borraría los cambios sin guardar. Se oculta
        con `hidden`, se mantiene montado siempre.
      */}
      <div
        className={`grid gap-4 border-t border-gray-200 px-4 py-4 dark:border-gray-800 lg:grid-cols-2 ${
          expanded ? "" : "hidden"
        }`}
      >
        <EventoAntesPanel evento={evento} result={result} itemsCatalogo={itemsCatalogo} />
        <EventoCambiosCard
          evento={evento}
          result={result}
          itemsCatalogo={itemsCatalogo}
          eligibleFormaIds={eligibleFormaIds}
          onChange={onChange}
        />
      </div>
    </section>
  );
}
