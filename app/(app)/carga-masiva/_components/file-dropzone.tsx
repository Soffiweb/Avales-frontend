"use client";

import { useState, useRef } from "react";
import { Upload, FileSpreadsheet, X } from "lucide-react";

type Props = {
  file: File | null;
  onFileSelect: (file: File) => void;
  onFileClear: () => void;
  disabled?: boolean;
};

export default function FileDropzone({ file, onFileSelect, onFileClear, disabled }: Props) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const processFile = (f: File) => {
    if (!f.name.match(/\.(xlsx|xls|csv)$/)) return;
    onFileSelect(f);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
    if (disabled) return;
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) processFile(droppedFile);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) processFile(e.target.files[0]);
  };

  return (
    <div
      onClick={() => !disabled && !file && inputRef.current?.click()}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`
        relative border-2 border-dashed rounded-lg p-8 text-center transition-colors
        ${file ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/10" : "cursor-pointer"}
        ${dragging
          ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20"
          : !file
            ? "border-gray-300 hover:border-indigo-400 dark:border-gray-600"
            : ""}
      `}
    >
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept=".xlsx,.xls,.csv"
        onChange={handleChange}
        disabled={disabled}
      />

      {file ? (
        <div className="flex items-center justify-center gap-4">
          <FileSpreadsheet className="w-10 h-10 text-indigo-500 shrink-0" />
          <div className="text-left">
            <p className="font-medium text-gray-900 dark:text-gray-100">{file.name}</p>
            <p className="text-sm text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
          </div>
          {!disabled && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onFileClear();
                if (inputRef.current) inputRef.current.value = "";
              }}
              className="ml-2 p-1 text-gray-400 hover:text-rose-500 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center">
          <Upload className="w-12 h-12 text-gray-400 mb-2" />
          <p className="text-lg font-medium text-gray-700 dark:text-gray-200">
            {dragging ? "Suelta el archivo aqui" : "Arrastra o haz clic para seleccionar"}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Archivos soportados: .xlsx, .xls, .csv
          </p>
        </div>
      )}
    </div>
  );
}
