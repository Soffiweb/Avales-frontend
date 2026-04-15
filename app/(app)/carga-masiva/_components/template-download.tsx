"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import {
  type UploadType,
  getUploadLabel,
} from "./template-columns";
import {
  downloadEventsTemplate,
  downloadUsersTemplate,
} from "@/lib/api/template-download";

type Props = {
  type: UploadType;
};

export default function TemplateDownload({ type }: Props) {
  const label = getUploadLabel(type);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDownload = async () => {
    setLoading(true);
    setError(null);
    try {
      if (type === "usuarios") {
        await downloadUsersTemplate();
      } else {
        await downloadEventsTemplate();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "No se pudo descargar la plantilla.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={handleDownload}
        disabled={loading}
        className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 dark:text-indigo-400 dark:bg-indigo-900/20 dark:hover:bg-indigo-900/40 transition-colors disabled:opacity-50"
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Download className="w-4 h-4" />
        )}
        {loading ? "Generando..." : `Descargar plantilla de ${label}`}
      </button>
      {error && (
        <p className="mt-2 text-xs text-rose-600 dark:text-rose-400">
          {error}
        </p>
      )}
    </div>
  );
}
