"use client";

import { useState } from "react";
import * as XLSX from "xlsx";
import { Download, Loader2 } from "lucide-react";
import { type UploadType, getColumnsForType, getUploadLabel } from "./template-columns";
import { getItemsPresupuestarios } from "@/lib/api/catalog";

type Props = {
  type: UploadType;
};

export default function TemplateDownload({ type }: Props) {
  const baseColumns = getColumnsForType(type);
  const label = getUploadLabel(type);
  const [loading, setLoading] = useState(false);

  const handleDownload = async () => {
    if (type === "usuarios") {
      // Simple single-row header for users
      const headers = baseColumns.map((c) => c.key);
      const ws = XLSX.utils.aoa_to_sheet([headers]);
      ws["!cols"] = headers.map((h) => ({ wch: Math.max(h.length + 4, 14) }));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, label);
      XLSX.writeFile(wb, `plantilla_${type}.xlsx`);
      return;
    }

    // Events: fetch budget items from API and build two-row header
    setLoading(true);
    try {
      const result = await getItemsPresupuestarios();
      const items = result.data ?? [];

      // Sort items by numero
      const sortedItems = [...items].sort((a, b) => a.numero - b.numero);

      // Row 1: base column names + item codes
      const headerRow1: string[] = baseColumns.map((c) => c.key);
      // Row 2: empty for base columns + item descriptions
      const headerRow2: string[] = baseColumns.map(() => "");

      for (const item of sortedItems) {
        headerRow1.push(String(item.numero));
        headerRow2.push(item.descripcion || item.nombre);
      }

      const ws = XLSX.utils.aoa_to_sheet([headerRow1, headerRow2]);

      // Merge base column headers across 2 rows (like the real format)
      const merges: XLSX.Range[] = [];
      for (let i = 0; i < baseColumns.length; i++) {
        merges.push({ s: { r: 0, c: i }, e: { r: 1, c: i } });
      }
      ws["!merges"] = merges;

      // Set column widths
      ws["!cols"] = headerRow1.map((h, i) => {
        if (i < baseColumns.length) {
          return { wch: Math.max(h.length + 4, 16) };
        }
        // Budget columns: wider to fit description
        const desc = headerRow2[i] || "";
        return { wch: Math.max(desc.length + 2, 14) };
      });

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, label);
      XLSX.writeFile(wb, `plantilla_${type}.xlsx`);
    } catch {
      // Fallback: download without budget items
      const headers = baseColumns.map((c) => c.key);
      const ws = XLSX.utils.aoa_to_sheet([headers]);
      ws["!cols"] = headers.map((h) => ({ wch: Math.max(h.length + 4, 14) }));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, label);
      XLSX.writeFile(wb, `plantilla_${type}.xlsx`);
    } finally {
      setLoading(false);
    }
  };

  return (
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
  );
}
