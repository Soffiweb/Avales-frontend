"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { X, Upload, FileText, Loader2 } from "lucide-react";

type UploadFiles = {
  convocatoria: File;
  certificadoMedico: File;
};

type UploadModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (files: UploadFiles) => Promise<void>;
  title?: string;
  description?: string;
  acceptedTypes?: string;
};

export default function UploadModal({
  isOpen,
  onClose,
  onUpload,
  title = "Subir documentos obligatorios",
  description = "Sube la convocatoria y el certificado médico para crear el borrador del aval.",
  acceptedTypes = ".pdf",
}: UploadModalProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [convocatoriaFile, setConvocatoriaFile] = useState<File | null>(null);
  const [certificadoMedicoFile, setCertificadoMedicoFile] =
    useState<File | null>(null);
  const [draggingOver, setDraggingOver] = useState<
    "convocatoria" | "certificado" | null
  >(null);
  const convocatoriaInputRef = useRef<HTMLInputElement>(null);
  const certificadoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) {
      setConvocatoriaFile(null);
      setCertificadoMedicoFile(null);
      setError(null);
      setUploading(false);
      setDraggingOver(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const validateAndSetFile = (
    file: File,
    type: "convocatoria" | "certificado",
  ) => {
    const isPdf =
      file.type === "application/pdf" ||
      file.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      setError("Solo se permiten archivos PDF.");
      return;
    }
    if (type === "convocatoria") {
      setConvocatoriaFile(file);
    } else {
      setCertificadoMedicoFile(file);
    }
    setError(null);
  };

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "convocatoria" | "certificado",
  ) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0], type);
      if (!e.target.files[0].type.includes("pdf")) {
        e.currentTarget.value = "";
      }
    }
  };

  const handleDragOver = (
    e: React.DragEvent,
    type: "convocatoria" | "certificado",
  ) => {
    e.preventDefault();
    e.stopPropagation();
    if (!uploading) {
      setDraggingOver(type);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDraggingOver(null);
  };

  const handleDrop = (
    e: React.DragEvent,
    type: "convocatoria" | "certificado",
  ) => {
    e.preventDefault();
    e.stopPropagation();
    setDraggingOver(null);
    if (uploading) return;

    const file = e.dataTransfer.files?.[0];
    if (file) {
      validateAndSetFile(file, type);
    }
  };

  const handleUpload = async () => {
    if (!convocatoriaFile || !certificadoMedicoFile) {
      setError(
        "Debes seleccionar la convocatoria y el certificado médico para continuar.",
      );
      return;
    }

    try {
      setUploading(true);
      setError(null);
      await onUpload({
        convocatoria: convocatoriaFile,
        certificadoMedico: certificadoMedicoFile,
      });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Error al subir los archivos";
      setError(message);
    } finally {
      setUploading(false);
    }
  };

  const handleClickUpload = (type: "convocatoria" | "certificado") => {
    if (type === "convocatoria") {
      convocatoriaInputRef.current?.click();
      return;
    }
    certificadoInputRef.current?.click();
  };

  const dropzoneClass = (type: "convocatoria" | "certificado") =>
    `relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
      draggingOver === type
        ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20"
        : "border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500"
    }`;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-gray-900/50 dark:bg-gray-900/80 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              disabled={uploading}
              className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 disabled:opacity-50"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="px-6 py-6">
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
              {description}
            </p>

            <div className="space-y-4">
              {/* Convocatoria */}
              <div
                onClick={() => handleClickUpload("convocatoria")}
                onDragOver={(e) => handleDragOver(e, "convocatoria")}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, "convocatoria")}
                className={dropzoneClass("convocatoria")}
              >
                <input
                  ref={convocatoriaInputRef}
                  type="file"
                  className="hidden"
                  accept={acceptedTypes}
                  onChange={(e) => handleFileChange(e, "convocatoria")}
                  disabled={uploading}
                />
                {convocatoriaFile ? (
                  <div className="flex items-center justify-center gap-3">
                    <FileText className="w-8 h-8 text-indigo-500" />
                    <div className="text-left">
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Convocatoria
                      </p>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {convocatoriaFile.name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {(convocatoriaFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
                      Subir convocatoria
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Arrastra un PDF aqui o haz clic para seleccionar
                    </p>
                  </>
                )}
              </div>

              {/* Certificado medico */}
              <div
                onClick={() => handleClickUpload("certificado")}
                onDragOver={(e) => handleDragOver(e, "certificado")}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, "certificado")}
                className={dropzoneClass("certificado")}
              >
                <input
                  ref={certificadoInputRef}
                  type="file"
                  className="hidden"
                  accept={acceptedTypes}
                  onChange={(e) => handleFileChange(e, "certificado")}
                  disabled={uploading}
                />
                {certificadoMedicoFile ? (
                  <div className="flex items-center justify-center gap-3">
                    <FileText className="w-8 h-8 text-indigo-500" />
                    <div className="text-left">
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Certificado medico
                      </p>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {certificadoMedicoFile.name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {(certificadoMedicoFile.size / 1024 / 1024).toFixed(2)}{" "}
                        MB
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
                      Subir certificado medico
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Arrastra un PDF aqui o haz clic para seleccionar
                    </p>
                  </>
                )}
              </div>
            </div>

            {/* Supported types */}
            <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
              Archivos soportados: PDF
            </p>

            {/* Error */}
            {error && (
              <div className="mt-4 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 text-sm rounded-lg px-4 py-3">
                {error}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              disabled={uploading}
              className="btn border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-gray-700 dark:text-gray-300 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleUpload}
              disabled={!convocatoriaFile || !certificadoMedicoFile || uploading}
              className="btn bg-indigo-500 hover:bg-indigo-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Subiendo...
                </>
              ) : (
                "Subir y continuar"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
