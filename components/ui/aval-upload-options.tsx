"use client";

import { useEffect } from "react";

import { TIPO_AVAL_OPTIONS, getTipoAvalLabel } from "@/lib/constants";
import { canCreateCollectionByType } from "@/lib/utils/aval-collections";
import {
  eventoTieneFormaParticipacion,
  type Evento,
} from "@/types/evento";
import type { Aval, TipoAval } from "@/types/aval";

type AvalUploadOptionsProps = {
  evento?: Evento | null;
  avales?: Aval[];
  tipoAval: TipoAval;
  onTipoAvalChange: (value: TipoAval) => void;
  formaParticipacionId?: number | null;
  onFormaParticipacionChange?: (value: number | null) => void;
};

export default function AvalUploadOptions({
  evento,
  avales = [],
  tipoAval,
  onTipoAvalChange,
  formaParticipacionId,
  onFormaParticipacionChange,
}: AvalUploadOptionsProps) {
  useEffect(() => {
    if (eventoTieneFormaParticipacion(evento, tipoAval)) return;
    if (eventoTieneFormaParticipacion(evento, "FONDOS_PUBLICOS")) {
      onTipoAvalChange("FONDOS_PUBLICOS");
      return;
    }
    if (eventoTieneFormaParticipacion(evento, "AUTOGESTION")) {
      onTipoAvalChange("AUTOGESTION");
      return;
    }
    if (eventoTieneFormaParticipacion(evento, "SOLO_RESULTADO")) {
      onTipoAvalChange("SOLO_RESULTADO");
      return;
    }
    // El evento no tiene ninguna forma de participación; los tres botones
    // quedan deshabilitados y se mantiene el tipo seleccionado sin auto-fallback.
  }, [evento, onTipoAvalChange, tipoAval]);

  const formasDisponibles = (evento?.formasParticipacion ?? []).filter(
    (forma) => forma.tipoAval === tipoAval,
  );

  useEffect(() => {
    if (!onFormaParticipacionChange) return;

    if (tipoAval === "SOLO_RESULTADO" || formasDisponibles.length === 0) {
      if (formaParticipacionId !== null) onFormaParticipacionChange(null);
      return;
    }

    if (
      typeof formaParticipacionId === "number" &&
      formasDisponibles.some((forma) => forma.id === formaParticipacionId)
    ) {
      return;
    }

    onFormaParticipacionChange(formasDisponibles[0]?.id ?? null);
  }, [
    formaParticipacionId,
    formasDisponibles,
    onFormaParticipacionChange,
    tipoAval,
  ]);

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
        {TIPO_AVAL_OPTIONS.map((option) => {
          const active = tipoAval === option.value;
          const blockedByForma = !eventoTieneFormaParticipacion(
            evento,
            option.value,
          );
          const blockedByCollection = !canCreateCollectionByType(
            avales,
            option.value,
          );
          const disabled = blockedByForma || blockedByCollection;
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
                  Ya existe un aval activo de {option.label.toLowerCase()}.
                </p>
              )}
              {blockedByForma && (
                <p className="mt-2 text-xs font-medium text-amber-600 dark:text-amber-300">
                  No existe esta forma de participación en el evento.
                </p>
              )}
            </button>
          );
        })}
      </div>

      <div className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs text-indigo-800 dark:border-indigo-900 dark:bg-indigo-950/30 dark:text-indigo-200">
        Tipo seleccionado: <strong>{getTipoAvalLabel(tipoAval)}</strong>
      </div>

      {tipoAval !== "SOLO_RESULTADO" &&
      formasDisponibles.length > 1 &&
      onFormaParticipacionChange ? (
        <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/20">
          <div>
            <h4 className="text-sm font-semibold text-amber-900 dark:text-amber-100">
              Forma de participación
            </h4>
            <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
              Este tipo tiene varias formas. Elige cuál usar para crear el aval.
            </p>
          </div>

          <div className="space-y-2">
            {formasDisponibles.map((forma, index) => {
              const active = forma.id === formaParticipacionId;

              return (
                <button
                  key={forma.id}
                  type="button"
                  onClick={() => onFormaParticipacionChange(forma.id)}
                  className={`w-full rounded-lg border px-3 py-3 text-left transition ${
                    active
                      ? "border-amber-500 bg-white dark:border-amber-400 dark:bg-amber-950/30"
                      : "border-amber-200 bg-white/70 hover:border-amber-300 dark:border-amber-900 dark:bg-gray-900 dark:hover:border-amber-700"
                  }`}
                >
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    Forma {index + 1}
                    {forma.referencia?.trim() ? ` · ${forma.referencia.trim()}` : ""}
                  </p>
                  <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                    Delegación: {forma.numAtletasHombres + forma.numAtletasMujeres} deportistas,{" "}
                    {forma.numEntrenadoresHombres + forma.numEntrenadoresMujeres} entrenadores
                  </p>
                  {forma.observacion?.trim() ? (
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      {forma.observacion.trim()}
                    </p>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
