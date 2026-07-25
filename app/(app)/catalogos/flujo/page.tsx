"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Check, Loader2, RotateCcw, Save } from "lucide-react";

import AlertBanner from "@/components/ui/alert-banner";
import { getApprovalStageLabel } from "@/lib/constants";
import {
  getFlujoConfig,
  updateFlujoConfig,
  type FlujoEtapaConfig,
} from "@/lib/api/flujo";
import type { TipoAval } from "@/types/aval";

const TIPO_AVAL_LABEL: Record<TipoAval, string> = {
  FONDOS_PUBLICOS: "Fondos Públicos",
  AUTOGESTION: "Autogestión",
  SOLO_RESULTADO: "Solo Resultados",
};

type CardState = {
  etapas: FlujoEtapaConfig[];
  original: FlujoEtapaConfig[];
  saving: boolean;
  justSaved: boolean;
  error: string | null;
};

const sameOrder = (a: FlujoEtapaConfig[], b: FlujoEtapaConfig[]) =>
  a.length === b.length &&
  a.every((e, i) => e.etapa === b[i].etapa && e.activo === b[i].activo);

export default function FlujoPage() {
  const [cards, setCards] = useState<Record<string, CardState>>({});
  const [tipos, setTipos] = useState<TipoAval[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const res = await getFlujoConfig();
      const next: Record<string, CardState> = {};
      const orden: TipoAval[] = [];
      for (const cfg of res.data ?? []) {
        const etapas = [...cfg.etapas].sort((a, b) => a.orden - b.orden);
        next[cfg.tipoAval] = {
          etapas,
          original: etapas,
          saving: false,
          justSaved: false,
          error: null,
        };
        orden.push(cfg.tipoAval);
      }
      setCards(next);
      setTipos(orden);
    } catch (err: unknown) {
      setLoadError(
        err instanceof Error ? err.message : "No se pudo cargar el flujo.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const mutate = (tipo: TipoAval, etapas: FlujoEtapaConfig[]) => {
    setCards((prev) => ({
      ...prev,
      [tipo]: {
        ...prev[tipo],
        etapas: etapas.map((e, i) => ({ ...e, orden: i + 1 })),
        justSaved: false,
        error: null,
      },
    }));
  };

  const move = (tipo: TipoAval, index: number, delta: number) => {
    const etapas = [...(cards[tipo]?.etapas ?? [])];
    const target = index + delta;
    if (target < 0 || target >= etapas.length) return;
    [etapas[index], etapas[target]] = [etapas[target], etapas[index]];
    mutate(tipo, etapas);
  };

  const toggle = (tipo: TipoAval, index: number) => {
    const etapas = [...(cards[tipo]?.etapas ?? [])];
    etapas[index] = { ...etapas[index], activo: !etapas[index].activo };
    mutate(tipo, etapas);
  };

  const reset = (tipo: TipoAval) => {
    setCards((prev) => ({
      ...prev,
      [tipo]: {
        ...prev[tipo],
        etapas: prev[tipo].original,
        justSaved: false,
        error: null,
      },
    }));
  };

  const save = async (tipo: TipoAval) => {
    const card = cards[tipo];
    if (!card) return;
    setCards((prev) => ({
      ...prev,
      [tipo]: { ...card, saving: true, error: null, justSaved: false },
    }));
    try {
      const res = await updateFlujoConfig(
        tipo,
        card.etapas.map(({ etapa, orden, activo }) => ({
          etapa,
          orden,
          activo,
        })),
      );
      const guardadas = [...(res.data?.etapas ?? card.etapas)].sort(
        (a, b) => a.orden - b.orden,
      );
      setCards((prev) => ({
        ...prev,
        [tipo]: {
          etapas: guardadas,
          original: guardadas,
          saving: false,
          justSaved: true,
          error: null,
        },
      }));
      setTimeout(() => {
        setCards((prev) => ({
          ...prev,
          [tipo]: { ...prev[tipo], justSaved: false },
        }));
      }, 2000);
    } catch (err: unknown) {
      setCards((prev) => ({
        ...prev,
        [tipo]: {
          ...prev[tipo],
          saving: false,
          error: err instanceof Error ? err.message : "No se pudo guardar.",
        },
      }));
    }
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-semibold text-gray-900 dark:text-gray-100">
          Flujo de aprobación
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Define el orden de las etapas por tipo de aval y cuáles se aplican.
          Una etapa desactivada se saltea sin perder su configuración. Los
          avales ya en curso siguen la secuencia vigente al momento de avanzar.
        </p>
      </div>

      {loadError && (
        <div className="mb-6">
          <AlertBanner
            variant="error"
            message="No se pudo cargar el flujo."
            description={loadError}
          />
        </div>
      )}

      {loading ? (
        <div className="min-h-[30vh] flex items-center justify-center rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-8 h-8 text-violet-600 animate-spin" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Cargando flujo...
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {tipos.map((tipo) => {
            const card = cards[tipo];
            if (!card) return null;
            const dirty = !sameOrder(card.etapas, card.original);

            return (
              <div
                key={tipo}
                className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 shadow-sm"
              >
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                    {TIPO_AVAL_LABEL[tipo] ?? tipo}
                  </h2>
                  {card.justSaved && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                      <Check className="w-4 h-4" /> Guardado
                    </span>
                  )}
                </div>

                <ul className="divide-y divide-gray-200 dark:divide-gray-700 rounded-lg border border-gray-200 dark:border-gray-700">
                  {card.etapas.map((e, i) => {
                    // SOLICITUD es la creación del aval: sin ella no hay
                    // expediente, así que no se puede mover ni desactivar.
                    const fija = e.etapa === "SOLICITUD";
                    return (
                      <li
                        key={e.etapa}
                        className={`flex items-center gap-3 px-3 py-2.5 ${
                          e.activo ? "" : "opacity-50"
                        }`}
                      >
                        <span className="w-6 text-xs font-mono text-gray-400">
                          {i + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-800 dark:text-gray-200 truncate">
                            {getApprovalStageLabel(e.etapa)}
                            {fija && (
                              <span className="ml-2 text-xs text-gray-400">
                                (fija)
                              </span>
                            )}
                          </p>
                          {e.rol && (
                            <p className="text-xs text-gray-400 font-mono">
                              {e.rol}
                            </p>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => toggle(tipo, i)}
                          disabled={fija || card.saving}
                          className="px-2 py-1 text-xs font-medium rounded-md border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
                          title={e.activo ? "Desactivar etapa" : "Activar etapa"}
                        >
                          {e.activo ? "Activa" : "Inactiva"}
                        </button>
                        <button
                          type="button"
                          onClick={() => move(tipo, i, -1)}
                          disabled={fija || i === 0 || card.saving}
                          className="rounded-md border border-gray-300 dark:border-gray-600 p-1 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
                          aria-label="Subir etapa"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => move(tipo, i, 1)}
                          disabled={
                            fija || i === card.etapas.length - 1 || card.saving
                          }
                          className="rounded-md border border-gray-300 dark:border-gray-600 p-1 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
                          aria-label="Bajar etapa"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                      </li>
                    );
                  })}
                </ul>

                <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
                  {card.error && (
                    <span className="mr-auto text-xs text-rose-600 dark:text-rose-400">
                      {card.error}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => reset(tipo)}
                    disabled={!dirty || card.saving}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Descartar
                  </button>
                  <button
                    type="button"
                    onClick={() => save(tipo)}
                    disabled={!dirty || card.saving}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-violet-600 hover:bg-violet-700 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {card.saving ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Save className="w-3.5 h-3.5" />
                    )}
                    Guardar
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
