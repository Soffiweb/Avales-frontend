"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  GlobalWorkerOptions,
  getDocument,
  type PDFDocumentLoadingTask,
  type PDFDocumentProxy,
} from "pdfjs-dist";
import { Loader2, Move, QrCode } from "lucide-react";

import { fetchAvalPdfBuffer } from "@/lib/api/aval-pdfs";
import type { FirmaPosicion } from "@/lib/api/avales";

// Worker de pdf.js. Usamos `new URL(..., import.meta.url)` para que el bundler
// (webpack/Turbopack de Next 16) emita el worker y su versión coincida SIEMPRE
// con la del API — desalinear versiones es el error clásico de pdf.js.
GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

// Ancho al que renderizamos la página en pantalla (px CSS).
const TARGET_WIDTH_PX = 520;
// Tamaño mínimo del recuadro del sello, en px de pantalla.
const MIN_BOX_PX = 24;

// Posición por defecto del sello, en PUNTOS PDF (origen abajo-izquierda).
// Coincide con el default histórico de firma-service (LLX/LLY/ancho/alto).
const DEFAULT_PT = { x: 60, y: 150, width: 90, height: 70 };

type BoxPx = { left: number; top: number; width: number; height: number };

type PageMetrics = {
  // Escala del viewport de pdf.js con la que se renderizó en pantalla.
  scale: number;
  // Dimensiones naturales de la página, en puntos PDF.
  pageWidthPts: number;
  pageHeightPts: number;
  // Dimensiones del canvas en pantalla, en px CSS.
  canvasWidthPx: number;
  canvasHeightPx: number;
};

type DragState =
  | { mode: "move"; startX: number; startY: number; origin: BoxPx }
  | { mode: "resize"; startX: number; startY: number; origin: BoxPx };

type FirmaPosicionPickerProps = {
  avalId: number;
  /** Solo carga y renderiza el PDF cuando está activo (evita fetch inútil). */
  active: boolean;
  onChange: (posicion: FirmaPosicion) => void;
};

function clampBox(box: BoxPx, metrics: PageMetrics): BoxPx {
  const width = Math.min(
    Math.max(box.width, MIN_BOX_PX),
    metrics.canvasWidthPx,
  );
  const height = Math.min(
    Math.max(box.height, MIN_BOX_PX),
    metrics.canvasHeightPx,
  );
  const left = Math.min(Math.max(box.left, 0), metrics.canvasWidthPx - width);
  const top = Math.min(Math.max(box.top, 0), metrics.canvasHeightPx - height);
  return { left, top, width, height };
}

/**
 * Convierte el recuadro en px de pantalla (origen ARRIBA-izquierda) a puntos
 * PDF (origen ABAJO-izquierda). El eje Y se INVIERTE: en pantalla `top` crece
 * hacia abajo, pero en el PDF `y` crece hacia arriba, así que la `y` del PDF es
 * la altura de la página menos el borde inferior del recuadro.
 */
function boxToFirmaPosicion(
  box: BoxPx,
  metrics: PageMetrics,
  pagina: number,
): FirmaPosicion {
  const { scale, pageHeightPts } = metrics;
  const firmaAncho = box.width / scale;
  const firmaAlto = box.height / scale;
  const firmaPosX = box.left / scale;
  // Flip Y: borde inferior del recuadro medido desde abajo.
  const firmaPosY = pageHeightPts - box.top / scale - firmaAlto;
  return {
    firmaPosX: Math.round(firmaPosX),
    firmaPosY: Math.round(firmaPosY),
    firmaAncho: Math.round(firmaAncho),
    firmaAlto: Math.round(firmaAlto),
    firmaPagina: pagina,
  };
}

export default function FirmaPosicionPicker({
  avalId,
  active,
  onChange,
}: FirmaPosicionPickerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const docRef = useRef<PDFDocumentProxy | null>(null);
  const loadingTaskRef = useRef<PDFDocumentLoadingTask | null>(null);
  const dragRef = useRef<DragState | null>(null);

  const [numPages, setNumPages] = useState(1);
  const [page, setPage] = useState(1);
  const [metrics, setMetrics] = useState<PageMetrics | null>(null);
  const [box, setBox] = useState<BoxPx | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Renderiza una página del PDF ya cargado y calcula sus métricas.
  const renderPage = useCallback(async (pageNumber: number) => {
    const doc = docRef.current;
    const canvas = canvasRef.current;
    if (!doc || !canvas) return;

    const pdfPage = await doc.getPage(pageNumber);
    const natural = pdfPage.getViewport({ scale: 1 });
    const scale = TARGET_WIDTH_PX / natural.width;
    const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;

    // Backing store a mayor resolución (DPR) para nitidez; el tamaño CSS
    // se mantiene en `scale` para que las cuentas de coordenadas sean 1:1.
    const renderViewport = pdfPage.getViewport({ scale: scale * dpr });
    const cssWidth = natural.width * scale;
    const cssHeight = natural.height * scale;

    canvas.width = Math.floor(renderViewport.width);
    canvas.height = Math.floor(renderViewport.height);
    canvas.style.width = `${cssWidth}px`;
    canvas.style.height = `${cssHeight}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    await pdfPage.render({
      canvas,
      canvasContext: ctx,
      viewport: renderViewport,
    }).promise;

    const nextMetrics: PageMetrics = {
      scale,
      pageWidthPts: natural.width,
      pageHeightPts: natural.height,
      canvasWidthPx: cssWidth,
      canvasHeightPx: cssHeight,
    };
    setMetrics(nextMetrics);

    // Recuadro por defecto (zona inferior), derivado del default en puntos.
    const defaultBox = clampBox(
      {
        left: DEFAULT_PT.x * scale,
        top: (natural.height - DEFAULT_PT.y - DEFAULT_PT.height) * scale,
        width: DEFAULT_PT.width * scale,
        height: DEFAULT_PT.height * scale,
      },
      nextMetrics,
    );
    setBox(defaultBox);
  }, []);

  // Carga el documento cuando el picker se activa.
  useEffect(() => {
    if (!active || docRef.current) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const buffer = await fetchAvalPdfBuffer(avalId, "comprasPublicas");
        if (cancelled) return;
        const loadingTask = getDocument({ data: buffer });
        loadingTaskRef.current = loadingTask;
        const doc = await loadingTask.promise;
        if (cancelled) {
          void loadingTask.destroy();
          return;
        }
        docRef.current = doc;
        setNumPages(doc.numPages);
        setPage(1);
        await renderPage(1);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "No se pudo cargar el documento para elegir la posición.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [active, avalId, renderPage]);

  // Libera el documento al desmontar.
  useEffect(() => {
    return () => {
      void loadingTaskRef.current?.destroy();
      loadingTaskRef.current = null;
      docRef.current = null;
    };
  }, []);

  // Cambio de página.
  const goToPage = useCallback(
    (next: number) => {
      if (next < 1 || next > numPages || next === page) return;
      setPage(next);
      setLoading(true);
      renderPage(next).finally(() => setLoading(false));
    },
    [numPages, page, renderPage],
  );

  // Emite las coordenadas cada vez que cambia el recuadro o la página.
  useEffect(() => {
    if (!box || !metrics) return;
    onChange(boxToFirmaPosicion(box, metrics, page));
  }, [box, metrics, page, onChange]);

  const handlePointerMove = useCallback(
    (event: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag || !metrics) return;
      const dx = event.clientX - drag.startX;
      const dy = event.clientY - drag.startY;
      const nextRaw: BoxPx =
        drag.mode === "move"
          ? {
              ...drag.origin,
              left: drag.origin.left + dx,
              top: drag.origin.top + dy,
            }
          : {
              ...drag.origin,
              width: drag.origin.width + dx,
              height: drag.origin.height + dy,
            };
      setBox(clampBox(nextRaw, metrics));
    },
    [metrics],
  );

  const endDrag = useCallback(() => {
    dragRef.current = null;
    window.removeEventListener("pointermove", handlePointerMove);
    window.removeEventListener("pointerup", endDrag);
  }, [handlePointerMove]);

  const startDrag = useCallback(
    (mode: DragState["mode"]) => (event: React.PointerEvent) => {
      if (!box) return;
      event.preventDefault();
      event.stopPropagation();
      dragRef.current = {
        mode,
        startX: event.clientX,
        startY: event.clientY,
        origin: box,
      };
      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", endDrag);
    },
    [box, handlePointerMove, endDrag],
  );

  // Limpia listeners si el componente se desmonta a mitad de un drag.
  useEffect(() => endDrag, [endDrag]);

  return (
    <div className="space-y-2">
      <p className="text-xs text-gray-500 dark:text-gray-400">
        Arrastrá el recuadro para elegir dónde irá el sello de firma (QR).
        Usá la esquina para redimensionarlo.
      </p>

      {error && (
        <div className="rounded-lg bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 text-sm px-3 py-2">
          {error}
        </div>
      )}

      <div className="relative flex justify-center rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 p-3 overflow-auto">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center gap-2 bg-white/60 dark:bg-gray-900/60 text-sm text-gray-600 dark:text-gray-300">
            <Loader2 className="w-4 h-4 animate-spin" />
            Cargando documento…
          </div>
        )}

        <div className="relative" style={{ lineHeight: 0 }}>
          <canvas ref={canvasRef} className="block shadow-sm" />

          {box && metrics && (
            <div
              onPointerDown={startDrag("move")}
              className="absolute cursor-move rounded-sm border-2 border-emerald-500 bg-emerald-500/15 touch-none select-none"
              style={{
                left: box.left,
                top: box.top,
                width: box.width,
                height: box.height,
              }}
            >
              <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-[10px] font-medium text-emerald-700 dark:text-emerald-300 pointer-events-none">
                <QrCode className="w-4 h-4" />
                <span className="px-1 text-center leading-tight">
                  Sello de firma / QR
                </span>
              </div>
              <Move className="absolute -top-1.5 -left-1.5 w-3 h-3 text-emerald-600 bg-white dark:bg-gray-800 rounded-full pointer-events-none" />
              <div
                onPointerDown={startDrag("resize")}
                className="absolute -bottom-1.5 -right-1.5 h-4 w-4 cursor-se-resize rounded-full border-2 border-white bg-emerald-600 touch-none"
                aria-label="Redimensionar sello"
              />
            </div>
          )}
        </div>
      </div>

      {numPages > 1 && (
        <div className="flex items-center justify-center gap-3 text-sm text-gray-600 dark:text-gray-300">
          <button
            type="button"
            className="btn text-xs px-2 py-1 border-gray-200 dark:border-gray-700 disabled:opacity-40"
            onClick={() => goToPage(page - 1)}
            disabled={page <= 1 || loading}
          >
            Anterior
          </button>
          <span>
            Página {page} de {numPages}
          </span>
          <button
            type="button"
            className="btn text-xs px-2 py-1 border-gray-200 dark:border-gray-700 disabled:opacity-40"
            onClick={() => goToPage(page + 1)}
            disabled={page >= numPages || loading}
          >
            Siguiente
          </button>
        </div>
      )}
    </div>
  );
}
