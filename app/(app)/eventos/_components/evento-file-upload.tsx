"use client";

import type { ChangeEvent, DragEvent } from "react";
import { Upload, X } from "lucide-react";

type EventoFileUploadProps = {
  archivo: File | null;
  archivoPreview: string | null;
  draggingArchivo: boolean;
  currentArchivoLabel?: string | null;
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onDragOver: (event: DragEvent<HTMLLabelElement | HTMLDivElement>) => void;
  onDragLeave: (event: DragEvent<HTMLLabelElement | HTMLDivElement>) => void;
  onDrop: (event: DragEvent<HTMLLabelElement | HTMLDivElement>) => void;
  onRemove: () => void;
};

export default function EventoFileUpload({
  archivo,
  archivoPreview,
  draggingArchivo,
  currentArchivoLabel,
  onFileChange,
  onDragOver,
  onDragLeave,
  onDrop,
  onRemove,
}: EventoFileUploadProps) {
  return (
    <div className="p-5 space-y-4">
      <label
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={`
          relative block border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
          ${
            draggingArchivo
              ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20"
              : archivo
                ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/10"
                : "border-gray-300 hover:border-indigo-400 dark:border-gray-600"
          }
        `}
      >
        <input
          type="file"
          accept=".pdf,.png,.jpg,.jpeg,.xlsx,.xls,.csv"
          onChange={onFileChange}
          className="hidden"
        />

        {archivo ? (
          <div className="flex flex-col items-center">
            <Upload className="w-10 h-10 text-indigo-500 mb-2" />
            <p className="font-medium text-gray-900 dark:text-gray-100">{archivo.name}</p>
            <p className="text-sm text-gray-500">{(archivo.size / 1024).toFixed(1)} KB</p>
            <button
              type="button"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onRemove();
              }}
              className="mt-2 text-sm text-red-500 hover:text-red-600 flex items-center gap-1"
            >
              <X className="w-3 h-3" />
              Quitar archivo
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <Upload className="w-10 h-10 text-gray-400 mb-2" />
            <p className="font-medium text-gray-700 dark:text-gray-200">
              {draggingArchivo
                ? "Suelta el archivo aqui"
                : "Arrastra o haz clic para seleccionar"}
            </p>
            <p className="text-sm text-gray-500 mt-1">JPG, PNG o PDF (max 5MB)</p>
          </div>
        )}
      </label>

      {archivoPreview && (
        <div className="mt-2">
          <img
            src={archivoPreview}
            alt="Vista previa"
            className="max-w-xs rounded-lg border border-gray-200 dark:border-gray-700"
          />
        </div>
      )}

      {currentArchivoLabel && !archivo && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Archivo actual: {currentArchivoLabel}
        </p>
      )}
    </div>
  );
}
