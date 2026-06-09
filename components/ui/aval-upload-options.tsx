"use client";

import { TIPO_AVAL_OPTIONS, getTipoAvalLabel } from "@/lib/constants";
import { canCreateCollectionByType } from "@/lib/utils/aval-collections";
import { eventoTieneFondosPublicos, type Evento } from "@/types/evento";
import type { Aval, TipoAval } from "@/types/aval";

type AvalUploadOptionsProps = {
  evento?: Evento | null;
  avales?: Aval[];
  tipoAval: TipoAval;
  onTipoAvalChange: (value: TipoAval) => void;
};

export default function AvalUploadOptions({
  evento,
  avales = [],
  tipoAval,
  onTipoAvalChange,
}: AvalUploadOptionsProps) {
  const tieneFondosPublicos = eventoTieneFondosPublicos(evento);
  const tipoAvalOptions =
    evento && !tieneFondosPublicos
      ? TIPO_AVAL_OPTIONS.filter((option) => option.value !== "FONDOS_PUBLICOS")
      : TIPO_AVAL_OPTIONS;

  return (
    <div className="space-y-4 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900">
      <div>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          Tipo de aval
        </h3>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          El flujo y presupuesto dependen de esta selección.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {tipoAvalOptions.map((option) => {
          const active = tipoAval === option.value;
          const blockedByCollection = !canCreateCollectionByType(
            avales,
            option.value,
          );
          const disabled = blockedByCollection;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                if (disabled) return;
                onTipoAvalChange(option.value);
              }}
              disabled={disabled}
              className={`rounded-xl border p-3 text-left transition ${
                active
                  ? "border-indigo-500 bg-indigo-50 dark:border-indigo-400 dark:bg-indigo-950/30"
                  : "border-gray-200 bg-white hover:border-indigo-300 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-indigo-700"
              } ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
            >
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {option.label}
              </p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {option.value === "FONDOS_PUBLICOS"
                  ? "Usa presupuesto planificado del POA."
                  : option.value === "AUTOGESTION"
                    ? "Permite monto solicitado editable luego por PDA."
                    : "Permite requerimientos manuales en la solicitud."}
              </p>
              {blockedByCollection && (
                <p className="mt-2 text-xs font-medium text-rose-600 dark:text-rose-300">
                  Ya existe una colección activa de fondos públicos.
                </p>
              )}
            </button>
          );
        })}
      </div>

      {/* {evento && !tieneFondosPublicos ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
          Este evento no tiene presupuesto. No se permite aval por fondos públicos.
        </div>
      ) : null} */}

      <div className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs text-indigo-800 dark:border-indigo-900 dark:bg-indigo-950/30 dark:text-indigo-200">
        Tipo seleccionado: <strong>{getTipoAvalLabel(tipoAval)}</strong>
      </div>
    </div>
  );
}
