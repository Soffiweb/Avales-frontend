"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Loader2, RotateCcw, Save } from "lucide-react";

import AlertBanner from "@/components/ui/alert-banner";
import { getApprovalStageLabel } from "@/lib/constants";
import {
  getHojaRutaComentarios,
  upsertHojaRutaComentario,
  type HojaRutaComentarioDefault,
} from "@/lib/api/hoja-ruta-comentarios";
import type { EtapaFlujo } from "@/types/aval";

// Orden visual de las etapas en el form. Coincide con el orden del flujo
// del aval para que sea fácil de revisar de arriba a abajo.
const ETAPA_ORDER: EtapaFlujo[] = [
  "SOLICITUD",
  "REVISION_METODOLOGO",
  "REVISION_DTM",
  "COMPRAS_PUBLICAS",
  "PDA",
  "CONTROL_PREVIO",
  "ADMINISTRADOR",
  "FINANCIERO",
];

type RowState = {
  comentario: string;
  original: string;
  saving: boolean;
  justSaved: boolean;
  error: string | null;
};

const EMPTY_ROW: RowState = {
  comentario: "",
  original: "",
  saving: false,
  justSaved: false,
  error: null,
};

export default function ComentariosHojaRutaPage() {
  const [rows, setRows] = useState<Record<string, RowState>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const res = await getHojaRutaComentarios();
      const map: Record<string, RowState> = {};
      for (const etapa of ETAPA_ORDER) {
        const found = (res.data ?? []).find(
          (c: HojaRutaComentarioDefault) => c.etapa === etapa,
        );
        map[etapa] = {
          ...EMPTY_ROW,
          comentario: found?.comentario ?? "",
          original: found?.comentario ?? "",
        };
      }
      setRows(map);
    } catch (err: unknown) {
      setLoadError(
        err instanceof Error
          ? err.message
          : "No se pudieron cargar los comentarios.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleChange = (etapa: EtapaFlujo, value: string) => {
    setRows((prev) => ({
      ...prev,
      [etapa]: {
        ...(prev[etapa] ?? EMPTY_ROW),
        comentario: value,
        justSaved: false,
        error: null,
      },
    }));
  };

  const handleReset = (etapa: EtapaFlujo) => {
    setRows((prev) => ({
      ...prev,
      [etapa]: {
        ...(prev[etapa] ?? EMPTY_ROW),
        comentario: prev[etapa]?.original ?? "",
        justSaved: false,
        error: null,
      },
    }));
  };

  const handleSave = async (etapa: EtapaFlujo) => {
    const row = rows[etapa];
    if (!row) return;
    const trimmed = row.comentario.trim();
    if (!trimmed) {
      setRows((prev) => ({
        ...prev,
        [etapa]: {
          ...row,
          error: "El comentario no puede estar vacío.",
        },
      }));
      return;
    }
    setRows((prev) => ({
      ...prev,
      [etapa]: { ...row, saving: true, error: null, justSaved: false },
    }));
    try {
      const res = await upsertHojaRutaComentario(etapa, trimmed);
      const saved = res.data?.comentario ?? trimmed;
      setRows((prev) => ({
        ...prev,
        [etapa]: {
          comentario: saved,
          original: saved,
          saving: false,
          justSaved: true,
          error: null,
        },
      }));
      // Limpiar el check después de 2 segundos.
      setTimeout(() => {
        setRows((prev) => ({
          ...prev,
          [etapa]: { ...prev[etapa], justSaved: false },
        }));
      }, 2000);
    } catch (err: unknown) {
      setRows((prev) => ({
        ...prev,
        [etapa]: {
          ...row,
          saving: false,
          error:
            err instanceof Error ? err.message : "No se pudo guardar.",
        },
      }));
    }
  };

  const orderedRows = useMemo(
    () =>
      ETAPA_ORDER.map((etapa) => ({
        etapa,
        row: rows[etapa] ?? EMPTY_ROW,
      })),
    [rows],
  );

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-semibold text-gray-900 dark:text-gray-100">
          Comentarios de la Hoja de Ruta
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Edita el texto por defecto que aparece en la columna “Comentario” de
          la hoja de ruta de cada aval. Si el responsable de la etapa escribe
          un comentario propio al aprobar, ese gana sobre este default.
        </p>
      </div>

      {loadError && (
        <div className="mb-6">
          <AlertBanner
            variant="error"
            message="No se pudieron cargar los comentarios."
            description={loadError}
          />
        </div>
      )}

      {loading ? (
        <div className="min-h-[30vh] flex items-center justify-center rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-8 h-8 text-violet-600 animate-spin" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Cargando comentarios...
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {orderedRows.map(({ etapa, row }) => {
            const dirty = row.comentario.trim() !== row.original.trim();
            const empty = !row.comentario.trim();
            return (
              <div
                key={etapa}
                className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 shadow-sm"
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                      {getApprovalStageLabel(etapa)}
                    </h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Etapa: <code className="font-mono">{etapa}</code>
                    </p>
                  </div>
                  {row.justSaved && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                      <Check className="w-4 h-4" /> Guardado
                    </span>
                  )}
                </div>

                <textarea
                  className="form-textarea w-full text-sm border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg"
                  rows={3}
                  maxLength={500}
                  placeholder="Texto por defecto para esta etapa..."
                  value={row.comentario}
                  onChange={(e) => handleChange(etapa, e.target.value)}
                  disabled={row.saving}
                />

                <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs text-gray-400">
                    {row.comentario.length}/500
                  </span>
                  <div className="flex items-center gap-2">
                    {row.error && (
                      <span className="text-xs text-rose-600 dark:text-rose-400">
                        {row.error}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => handleReset(etapa)}
                      disabled={!dirty || row.saving}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Descartar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSave(etapa)}
                      disabled={!dirty || row.saving || empty}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-violet-600 hover:bg-violet-700 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {row.saving ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Save className="w-3.5 h-3.5" />
                      )}
                      Guardar
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
