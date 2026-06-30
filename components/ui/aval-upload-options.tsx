"use client";

import { useEffect, useMemo } from "react";

import { TIPO_AVAL_OPTIONS, getTipoAvalLabel } from "@/lib/constants";
import { getFormasParticipacionConOcupacion } from "@/lib/utils/aval-collections";
import type { Evento } from "@/types/evento";
import type { Aval, TipoAval } from "@/types/aval";

type AvalUploadOptionsProps = {
  evento?: Evento | null;
  avalesEvento: Aval[];
  tipoAval: TipoAval;
  onTipoAvalChange: (value: TipoAval) => void;
  formaParticipacionId?: number | null;
  onFormaParticipacionChange?: (value: number | null) => void;
};

export default function AvalUploadOptions({
  evento,
  avalesEvento,
  tipoAval,
  onTipoAvalChange,
  formaParticipacionId,
  onFormaParticipacionChange,
}: AvalUploadOptionsProps) {
  const formasConOcupacion = useMemo(
    () =>
      getFormasParticipacionConOcupacion(
        evento?.formasParticipacion ?? [],
        avalesEvento,
      ),
    [evento, avalesEvento],
  );

  const tiposConFormaLibre = useMemo(
    () =>
      new Set(
        formasConOcupacion
          .filter((forma) => !forma.ocupada)
          .map((forma) => forma.tipoAval),
      ),
    [formasConOcupacion],
  );

  useEffect(() => {
    if (tiposConFormaLibre.has(tipoAval)) return;
    const fallback = TIPO_AVAL_OPTIONS.map((option) => option.value).find(
      (value) => tiposConFormaLibre.has(value),
    );
    if (fallback) {
      onTipoAvalChange(fallback);
    }
    // Si ningún tipo tiene forma libre, los tres botones quedan
    // deshabilitados y se mantiene el tipo seleccionado sin auto-fallback.
  }, [tiposConFormaLibre, onTipoAvalChange, tipoAval]);

  const formasDelTipoActual = useMemo(
    () => formasConOcupacion.filter((forma) => forma.tipoAval === tipoAval),
    [formasConOcupacion, tipoAval],
  );
  const formasLibresDelTipoActual = useMemo(
    () => formasDelTipoActual.filter((forma) => !forma.ocupada),
    [formasDelTipoActual],
  );

  useEffect(() => {
    if (!onFormaParticipacionChange) return;

    if (formasDelTipoActual.length === 0) {
      if (formaParticipacionId !== null) onFormaParticipacionChange(null);
      return;
    }

    if (formasLibresDelTipoActual.length === 1) {
      if (formaParticipacionId !== formasLibresDelTipoActual[0].id) {
        onFormaParticipacionChange(formasLibresDelTipoActual[0].id);
      }
      return;
    }

    // Varias formas libres (o ninguna): no se preselecciona, el usuario
    // debe elegir explícitamente. Si la selección actual quedó inválida
    // (p.ej. cambió de tipo, o la forma ya no está libre), se limpia.
    const seleccionSigueValida =
      typeof formaParticipacionId === "number" &&
      formasLibresDelTipoActual.some((forma) => forma.id === formaParticipacionId);

    if (!seleccionSigueValida && formaParticipacionId !== null) {
      onFormaParticipacionChange(null);
    }
  }, [
    formaParticipacionId,
    formasDelTipoActual,
    formasLibresDelTipoActual,
    onFormaParticipacionChange,
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
          const sinFormaLibre = !tiposConFormaLibre.has(option.value);
          const tieneAlgunaForma = formasConOcupacion.some(
            (forma) => forma.tipoAval === option.value,
          );
          const disabled = sinFormaLibre;
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
              {sinFormaLibre && (
                <p className="mt-2 text-xs font-medium text-amber-600 dark:text-amber-300">
                  {tieneAlgunaForma
                    ? "Todas las formas de participación de este tipo ya tienen un aval."
                    : "No existe esta forma de participación en el evento."}
                </p>
              )}
            </button>
          );
        })}
      </div>

      <div className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs text-indigo-800 dark:border-indigo-900 dark:bg-indigo-950/30 dark:text-indigo-200">
        Tipo seleccionado: <strong>{getTipoAvalLabel(tipoAval)}</strong>
      </div>

      {formasDelTipoActual.length > 0 && onFormaParticipacionChange ? (
        <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/20">
          <div>
            <h4 className="text-sm font-semibold text-amber-900 dark:text-amber-100">
              Forma de participación
            </h4>
            <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
              {formasLibresDelTipoActual.length > 1
                ? "Hay varias formas libres. Elige cuál usar para crear el aval."
                : formasLibresDelTipoActual.length === 1
                  ? "Es la única forma libre para este tipo, ya quedó seleccionada."
                  : "No quedan formas libres de este tipo."}
            </p>
          </div>

          <div className="space-y-2">
            {formasDelTipoActual.map((forma, index) => {
              const active = forma.id === formaParticipacionId;
              const soloUnaLibre = formasLibresDelTipoActual.length === 1;
              const disabled = forma.ocupada || soloUnaLibre;
              const titulo = forma.referencia?.trim() || `Forma ${index + 1}`;

              return (
                <button
                  key={forma.id}
                  type="button"
                  onClick={() => {
                    if (disabled) return;
                    onFormaParticipacionChange(forma.id);
                  }}
                  disabled={disabled}
                  className={`w-full rounded-lg border px-3 py-3 text-left transition ${
                    active
                      ? "border-amber-500 bg-white dark:border-amber-400 dark:bg-amber-950/30"
                      : "border-amber-200 bg-white/70 hover:border-amber-300 dark:border-amber-900 dark:bg-gray-900 dark:hover:border-amber-700"
                  } ${
                    forma.ocupada
                      ? "cursor-not-allowed opacity-50"
                      : soloUnaLibre
                        ? "cursor-default"
                        : ""
                  }`}
                >
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {titulo}
                  </p>
                  <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                    Delegación: {forma.numAtletasHombres + forma.numAtletasMujeres} deportistas,{" "}
                    {forma.numEntrenadoresHombres + forma.numEntrenadoresMujeres} entrenadores/otros
                  </p>
                  {forma.observacion?.trim() ? (
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      {forma.observacion.trim()}
                    </p>
                  ) : null}
                  {forma.ocupada && (
                    <p className="mt-2 text-xs font-medium text-rose-600 dark:text-rose-400">
                      Ya tiene un aval asociado.
                    </p>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
