"use client";

import { useState } from "react";
import ReportModal from "@/components/ui/report-modal";

type Props = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ErrorBoundary({ error, reset }: Props) {
  const [reportOpen, setReportOpen] = useState(false);

  const initialDesc = error.message
    ? `Error: ${error.message}${error.digest ? ` (digest: ${error.digest})` : ""}`
    : "";

  return (
    <>
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
        <div className="max-w-md space-y-4">
          <div className="text-5xl" aria-hidden>
            ⚠️
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Algo salió mal
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Ocurrió un error inesperado en esta sección. Puedes intentar nuevamente o reportar el
            problema para que lo revisemos.
          </p>
          {error.digest && (
            <p className="text-xs font-mono text-gray-400 dark:text-gray-500">
              ref: {error.digest}
            </p>
          )}
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <button
              type="button"
              onClick={reset}
              className="btn bg-gray-900 text-gray-100 hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-800 dark:hover:bg-white"
            >
              Reintentar
            </button>
            <button
              type="button"
              onClick={() => setReportOpen(true)}
              className="btn border-gray-200 dark:border-gray-700/60 text-gray-700 dark:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600"
            >
              Reportar problema
            </button>
          </div>
        </div>
      </div>

      <ReportModal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        initialDescripcion={initialDesc}
      />
    </>
  );
}
