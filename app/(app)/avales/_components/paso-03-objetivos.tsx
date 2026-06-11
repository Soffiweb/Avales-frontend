"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, X, Target, CheckCircle } from "lucide-react";
import { avalFlowDebugLog } from "@/lib/debug/aval-flow";

type FormData = {
  deportistas: Array<{
    id: number;
    deportistaExternoId?: string;
    nombre: string;
    apellido?: string;
    nombres?: string;
    apellidos?: string;
    cedula?: string;
    payload?: Record<string, unknown>;
    rol?: string;
  }>;
  entrenadores: Array<{ id: number; nombre: string }>;
  fechaEmision?: string;
  fechaHoraSalida: string;
  fechaHoraRetorno: string;
  lugarSalida: string;
  lugarRetorno: string;
  transporteSalida: string;
  transporteRetorno: string;
  objetivos: string[];
  criterios: string[];
  observaciones?: string;
};

type Paso03ObjetivosProps = {
  formData: FormData;
  onComplete: (data: Partial<FormData>) => void;
  onPreviewChange?: (data: Partial<FormData>) => void;
  onBack: () => void;
};

export default function Paso03Objetivos({
  formData,
  onComplete,
  onPreviewChange,
  onBack,
}: Paso03ObjetivosProps) {
  const CRITERIOS_OPTIONS = useMemo(
    () => [
      "Asistencia a selectivos",
      "Asistencia a chequeos técnicos",
      "Asistencia a entrenamientos mínimo 90%",
      "Ubicación en el ranking nacional",
      "Participación en competencias nacionales",
      "Convocatoria de la federación",
      "Cumplimiento de marcas mínimas",
    ],
    []
  );
  const criteriosOptionsSet = useMemo(
    () => new Set(CRITERIOS_OPTIONS),
    [CRITERIOS_OPTIONS]
  );

  const [objetivos, setObjetivos] = useState<string[]>(
    formData.objetivos || []
  );
  const [criterios, setCriterios] = useState<string[]>(
    formData.criterios || []
  );
  const [otroCriterioEnabled, setOtroCriterioEnabled] = useState(() =>
    (formData.criterios || []).some((c) => !criteriosOptionsSet.has(c))
  );
  const [otroCriterio, setOtroCriterio] = useState("");
  const [otrosCriterios, setOtrosCriterios] = useState<string[]>(() => {
    const custom = (formData.criterios || []).filter(
      (c) => !criteriosOptionsSet.has(c)
    );
    return custom;
  });
  const [newObjetivo, setNewObjetivo] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    onPreviewChange?.({
      objetivos,
      criterios,
    });
  }, [objetivos, criterios, onPreviewChange]);

  const handleAddObjetivo = () => {
    const trimmed = newObjetivo.trim();
    if (!trimmed) return;

    if (objetivos.includes(trimmed)) {
      setError("Este objetivo ya fue agregado");
      return;
    }

    setObjetivos([...objetivos, trimmed]);
    setNewObjetivo("");
    setError(null);
  };

  const handleRemoveObjetivo = (index: number) => {
    setObjetivos(objetivos.filter((_, i) => i !== index));
  };

  const buildOrderedCriterios = (items: string[]) => {
    const ordered = CRITERIOS_OPTIONS.filter((item) => items.includes(item));
    const customItems = items.filter((item) => !criteriosOptionsSet.has(item));
    ordered.push(...customItems);
    return ordered;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (objetivos.length === 0) {
      setError("Debes agregar al menos un objetivo");
      return;
    }

    if (criterios.length === 0) {
      setError("Debes agregar al menos un criterio de selección");
      return;
    }

    const payload = {
      objetivos,
      criterios,
    };

    avalFlowDebugLog("paso-03", "objetivos y criterios confirmados", payload);
    onComplete(payload);
  };

  const handleKeyDownObjetivo = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddObjetivo();
    }
  };

  const handleToggleCriterio = (criterio: string) => {
    setCriterios((prev) => {
      const next = prev.includes(criterio)
        ? prev.filter((item) => item !== criterio)
        : [...prev, criterio];
      return buildOrderedCriterios(next);
    });
    setError(null);
  };

  const handleToggleOtro = (checked: boolean) => {
    setOtroCriterioEnabled(checked);
    if (!checked) {
      setOtroCriterio("");
      setOtrosCriterios([]);
      setCriterios((prev) =>
        buildOrderedCriterios(
          prev.filter((item) => criteriosOptionsSet.has(item))
        )
      );
    }
  };

  const syncCustomCriterios = (customItems: string[]) => {
    const base = criterios.filter((item) => criteriosOptionsSet.has(item));
    setCriterios(buildOrderedCriterios([...base, ...customItems]));
    setError(null);
  };

  const handleOtroCriterioAdd = () => {
    const trimmed = otroCriterio.trim();
    if (!trimmed) return;
    if (criterios.includes(trimmed)) {
      setError("Este criterio ya fue agregado");
      return;
    }
    const next = [...otrosCriterios, trimmed];
    setOtrosCriterios(next);
    syncCustomCriterios(next);
    setOtroCriterio("");
  };

  const handleOtroCriterioRemove = (value: string) => {
    const next = otrosCriterios.filter((item) => item !== value);
    setOtrosCriterios(next);
    syncCustomCriterios(next);
  };

  return (
    <div>
      <h1 className="text-2xl text-gray-800 dark:text-gray-100 font-bold mb-2">
        Objetivos y Criterios
      </h1>
      <p className="text-gray-600 dark:text-gray-400 mb-6">
        Define los objetivos del evento y los criterios de selección del desempeño.
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Objetivos Section */}
        <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-xl p-5 border border-indigo-200 dark:border-indigo-800">
          <div className="flex items-center gap-2 mb-4">
            <Target className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
              Objetivos del evento
            </h3>
          </div>

          <div className="space-y-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={newObjetivo}
                onChange={(e) => setNewObjetivo(e.target.value)}
                onKeyDown={handleKeyDownObjetivo}
                placeholder="Ej: Clasificar al campeonato mundial..."
                className="form-input flex-1"
              />
              <button
                type="button"
                onClick={handleAddObjetivo}
                disabled={!newObjetivo.trim()}
                className="btn bg-indigo-500 hover:bg-indigo-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>

            {objetivos.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {objetivos.length}{" "}
                  {objetivos.length === 1 ? "objetivo agregado" : "objetivos agregados"}
                </p>
                <div className="space-y-2">
                  {objetivos.map((objetivo, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-3 bg-white dark:bg-indigo-900/20 p-3 rounded-lg border border-indigo-200 dark:border-indigo-700"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-800 dark:text-gray-200">
                          {index + 1}. {objetivo}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveObjetivo(index)}
                        className="text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 p-1"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {objetivos.length === 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                No hay objetivos agregados. Ingresa al menos uno para continuar.
              </p>
            )}
          </div>
        </div>

        {/* Criterios Section */}
        <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-5 border border-green-200 dark:border-green-800">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
              Criterios de selección
            </h3>
          </div>

          <div className="space-y-3">
            <div className="space-y-2">
              {CRITERIOS_OPTIONS.map((criterio) => {
                const checked = criterios.includes(criterio);
                return (
                  <label
                    key={criterio}
                    className="flex items-start gap-2 rounded-lg border border-green-200 dark:border-green-800 bg-white dark:bg-green-900/20 px-3 py-2 text-sm text-gray-800 dark:text-gray-100"
                  >
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={checked}
                      onChange={() => handleToggleCriterio(criterio)}
                    />
                    <span>{criterio}</span>
                  </label>
                );
              })}

              <div className="rounded-lg border border-dashed border-green-200 dark:border-green-800 bg-white/70 dark:bg-green-900/10 px-3 py-2">
                <label className="flex items-start gap-2 text-sm text-gray-800 dark:text-gray-100">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={otroCriterioEnabled}
                    onChange={(e) => handleToggleOtro(e.target.checked)}
                  />
                  <span>Otro</span>
                </label>
                {otroCriterioEnabled && (
                  <div className="mt-2 space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={otroCriterio}
                        onChange={(e) => setOtroCriterio(e.target.value)}
                        placeholder="Escribe otro criterio de selección..."
                        className="form-input flex-1"
                      />
                      <button
                        type="button"
                        onClick={handleOtroCriterioAdd}
                        disabled={!otroCriterio.trim()}
                        className="btn bg-green-500 hover:bg-green-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Plus className="w-5 h-5" />
                      </button>
                    </div>
                    {otrosCriterios.length > 0 && (
                      <div className="space-y-2">
                        {otrosCriterios.map((item) => (
                          <div
                            key={item}
                            className="flex items-start gap-3 bg-white dark:bg-green-900/20 p-3 rounded-lg border border-green-200 dark:border-green-700"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-gray-800 dark:text-gray-200">
                                {item}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleOtroCriterioRemove(item)}
                              className="text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 p-1"
                            >
                              <X className="w-5 h-5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {criterios.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {criterios.length}{" "}
                  {criterios.length === 1 ? "criterio agregado" : "criterios agregados"}
                </p>
                <div className="space-y-2">
                  {criterios.map((criterio, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-3 bg-white dark:bg-green-900/20 p-3 rounded-lg border border-green-200 dark:border-green-700"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-800 dark:text-gray-200">
                          {index + 1}. {criterio}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (criteriosOptionsSet.has(criterio)) {
                            handleToggleCriterio(criterio);
                            return;
                          }
                          handleOtroCriterioRemove(criterio);
                        }}
                        className="text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 p-1"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {criterios.length === 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                No hay criterios agregados. Ingresa al menos uno para continuar.
              </p>
            )}
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 text-sm rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={onBack}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
          >
            ← Anterior
          </button>
          <button
            type="submit"
            className="btn bg-indigo-500 hover:bg-indigo-600 text-white"
          >
            Siguiente paso →
          </button>
        </div>
      </form>
    </div>
  );
}
