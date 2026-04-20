"use client";

import { useState, useRef, useEffect } from "react";
import { X, Upload, FileSpreadsheet, Loader2, CheckCircle, AlertTriangle } from "lucide-react";
import { uploadUsersExcel, type UploadUsersExcelResponse } from "@/lib/api/user";
import { ROLES } from "@/lib/constants";
import { formatRole } from "@/lib/utils/formatters/text";
import UploadInstructions from "@/components/ui/upload-instructions";

type UploadUsersExcelModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
};

export default function UploadUsersExcelModal({
  isOpen,
  onClose,
  onSuccess,
}: UploadUsersExcelModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [response, setResponse] = useState<UploadUsersExcelResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setFile(null);
      setResponse(null);
      setError(null);
      setUploading(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const processFile = (selectedFile: File) => {
    if (!selectedFile.name.match(/\.(xlsx|xls|csv)$/)) {
      setError("Por favor selecciona un archivo Excel (.xlsx, .xls) o CSV.");
      setFile(null);
      return;
    }
    setFile(selectedFile);
    setError(null);
    setResponse(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!uploading) setDragging(true);
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
    if (uploading) return;
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) processFile(droppedFile);
  };

  const handleUpload = async () => {
    if (!file) return;

    try {
      setUploading(true);
      setError(null);

      const result = await uploadUsersExcel(file);
      setResponse(result.data);
    } catch (err: any) {
      setError(err.message || "Ocurrio un error al subir el archivo.");
    } finally {
      setUploading(false);
    }
  };

  const hasErrors = response && response.errores && response.errores.length > 0;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div
        className="fixed inset-0 bg-gray-900/50 transition-opacity"
        onClick={onClose}
      />

      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg">

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Carga Masiva de Usuarios
            </h2>
            <button
              onClick={onClose}
              disabled={uploading}
              className="text-gray-400 hover:text-gray-500"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="px-6 py-6 space-y-6">

            {!response && (
              <div
                onClick={() => !uploading && fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`
                  relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
                  ${dragging
                    ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20"
                    : file
                      ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/10"
                      : "border-gray-300 hover:border-indigo-400 dark:border-gray-600"}
                `}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileChange}
                  disabled={uploading}
                />

                {file ? (
                  <div className="flex flex-col items-center">
                    <FileSpreadsheet className="w-12 h-12 text-indigo-500 mb-2" />
                    <p className="font-medium text-gray-900 dark:text-gray-100">{file.name}</p>
                    <p className="text-sm text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <Upload className="w-12 h-12 text-gray-400 mb-2" />
                    <p className="text-lg font-medium text-gray-700 dark:text-gray-200">
                      {dragging ? "Suelta el archivo aqui" : "Arrastra o haz clic para seleccionar"}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      Excel con columnas: CEDULA, APELLIDOS, NOMBRES, CARGO, CORREO
                    </p>
                    <p className="text-xs text-gray-500 mt-2 max-w-md">
                      Solo se aceptan disciplinas registradas en el catalogo; puedes enviar el codigo o el nombre exacto. Para CARGO se aceptan los roles validos del sistema:{" "}
                      {ROLES.map((role) => `${role} (${formatRole(role)})`).join(", ")}.
                    </p>
                  </div>
                )}
              </div>
            )}

            {!response && (
              <UploadInstructions type="usuarios" compact />
            )}

            {error && (
              <div className="bg-red-50 text-red-600 p-4 rounded-md flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            {response && (
              <div className="space-y-4">
                <div className={`p-4 rounded-md flex items-start gap-3 ${hasErrors ? "bg-amber-50 text-amber-800" : "bg-green-50 text-green-800"}`}>
                  {hasErrors ? (
                    <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                  ) : (
                    <CheckCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <h3 className="font-semibold text-sm">
                      {hasErrors ? "Carga con observaciones" : "Carga exitosa"}
                    </h3>
                    <p className="text-sm mt-1">
                      Procesados: <strong>{response.procesados}</strong> |
                      Creados: <strong>{response.creados.length}</strong> |
                      Actualizados: <strong>{response.actualizados.length}</strong>
                    </p>
                    {response.disciplinasCreadas?.length ? (
                      <p className="text-sm mt-1">
                        Disciplinas creadas: <strong>{response.disciplinasCreadas.join(", ")}</strong>
                      </p>
                    ) : null}
                  </div>
                </div>

                {hasErrors && (
                  <div className="border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden">
                    <div className="bg-gray-50 dark:bg-gray-800 px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Errores ({response.errores.length})</h4>
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-800">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Fila</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Detalle</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
                          {response.errores.map((err, idx) => (
                            <tr key={idx}>
                              <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100 font-medium">
                                {err.fila}
                              </td>
                              <td className="px-4 py-2 text-sm text-red-600 dark:text-red-400">
                                {err.error}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 rounded-b-xl">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
            >
              {response ? "Cerrar" : "Cancelar"}
            </button>

            {!response && (
              <button
                onClick={handleUpload}
                disabled={!file || uploading}
                className={`
                  flex items-center px-4 py-2 text-sm font-medium text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500
                  ${!file || uploading ? "bg-indigo-400 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-700"}
                `}
              >
                {uploading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {uploading ? "Subiendo..." : "Subir Archivo"}
              </button>
            )}

            {response && (
              <button
                onClick={() => {
                  setResponse(null);
                  setFile(null);
                  if (onSuccess) onSuccess();
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Subir otro
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
