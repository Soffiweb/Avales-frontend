"use client";

import { useMemo, useState } from "react";
import { Download, ExternalLink, Loader2, X } from "lucide-react";

import AlertBanner from "@/components/ui/alert-banner";
import {
  DOCUMENT_LABELS,
  PREVIEW_ENDPOINTS,
  downloadComposedPdf,
  openAvalPdfPreview,
  type ComposableDocumentKey,
} from "@/lib/api/aval-pdfs";

type Props = {
  avalId: number;
  /** Mapa documento → URL (o null si no existe). El user solo puede marcar los que tienen URL. */
  availableDocs: Partial<Record<ComposableDocumentKey, string | null>>;
  onClose: () => void;
};

/**
 * Documentos que se ofrecen en el composer, en orden de aparición.
 *
 * Son únicamente los cuatro que emite la federación. Los archivos que carga el
 * solicitante (convocatoria y certificado médico) siguen accesibles desde
 * `AvalDocumentosSection` en las pantallas de revisión, y los pasos internos de
 * revisión no son documentos descargables.
 */
const DOC_ORDER: ComposableDocumentKey[] = [
  "avalTecnico",
  "pronosticoDeportistas",
  "comprasPublicas",
  "certificacionPresupuestaria",
];

// Escuela de iniciación dejó de generarse para avales nuevos (queda solo en
// avales viejos). No tiene sentido mostrarla deshabilitada para siempre —
// se oculta la fila directamente cuando no hay archivo.
const HIDDEN_WHEN_UNAVAILABLE = new Set<ComposableDocumentKey>([
  "escuelaIniciacion",
]);

// Pronóstico de deportistas no tiene endpoint de generación on-the-fly: es
// un archivo ya guardado (generado por el sistema en avales nuevos, subido
// a mano en los viejos) y basta con abrirlo directo, sin pasar por
// openAvalPdfPreview (que espera un endpoint de PREVIEW_ENDPOINTS).
const DIRECT_URL_PREVIEW_KEYS = new Set<ComposableDocumentKey>([
  "pronosticoDeportistas",
]);

export default function AvalPdfComposerModal({
  avalId,
  availableDocs,
  onClose,
}: Props) {
  const [selected, setSelected] = useState<Set<ComposableDocumentKey>>(
    new Set(),
  );
  const [previewing, setPreviewing] = useState<ComposableDocumentKey | null>(
    null,
  );
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rows = useMemo(
    () =>
      DOC_ORDER.map((key) => {
        const url = availableDocs[key];
        const available = Boolean(url);
        const hasPreview =
          key === "pronosticoDeportistas" ? available : !!PREVIEW_ENDPOINTS[key];
        return { key, available, hasPreview };
      }).filter((row) => row.available || !HIDDEN_WHEN_UNAVAILABLE.has(row.key)),
    [availableDocs],
  );

  function toggle(key: ComposableDocumentKey) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function handlePreview(key: ComposableDocumentKey) {
    setError(null);

    if (DIRECT_URL_PREVIEW_KEYS.has(key)) {
      const url = availableDocs[key];
      if (url) window.open(url, "_blank", "noopener,noreferrer");
      return;
    }

    setPreviewing(key);
    try {
      await openAvalPdfPreview(avalId, key);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo abrir la vista previa");
    } finally {
      setPreviewing(null);
    }
  }

  async function handleDownload() {
    if (selected.size === 0) return;
    setError(null);
    setDownloading(true);
    try {
      await downloadComposedPdf(
        avalId,
        DOC_ORDER.filter((key) => selected.has(key)),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo descargar el PDF");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Documentos del aval
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Vista previa individual o descarga combinada en un solo PDF.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error ? (
          <div className="mb-4">
            <AlertBanner variant="error" message={error} />
          </div>
        ) : null}

        <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 dark:divide-slate-700/60 dark:border-slate-700">
          {rows.map(({ key, available, hasPreview }) => (
            <li
              key={key}
              className={`flex items-center gap-3 px-3 py-2.5 ${
                available
                  ? ""
                  : "opacity-60"
              }`}
            >
              <input
                type="checkbox"
                checked={selected.has(key)}
                onChange={() => toggle(key)}
                disabled={!available}
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <label className="flex-1 text-sm text-slate-800 dark:text-slate-200 select-none cursor-pointer" onClick={() => available && toggle(key)}>
                {DOCUMENT_LABELS[key]}
                {!available ? (
                  <span className="ml-2 text-xs text-slate-400">
                    (sin archivo)
                  </span>
                ) : null}
              </label>
              {available && hasPreview ? (
                <button
                  onClick={() => handlePreview(key)}
                  disabled={previewing === key}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                  title="Abrir vista previa en otra pestaña"
                >
                  {previewing === key ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <ExternalLink className="h-3 w-3" />
                  )}
                  Ver
                </button>
              ) : null}
            </li>
          ))}
        </ul>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleDownload}
            disabled={selected.size === 0 || downloading}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {downloading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            Descargar PDF compuesto
            {selected.size > 0 ? ` (${selected.size})` : ""}
          </button>
        </div>
      </div>
    </div>
  );
}
