"use client";

import {
  useState,
  useRef,
  useEffect,
  type ReactNode,
} from "react";
import { X, Upload, FileText, Loader2, Plus, Trash2 } from "lucide-react";

type UploadFiles = {
  convocatoria: File;
  certificadoMedico: File;
  pronosticoDeportistas: File[];
};

type DraggingTarget = "convocatoria" | "certificado" | "pronostico";

type UploadModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (files: UploadFiles) => Promise<void>;
  title?: string;
  description?: string;
  acceptedTypes?: string;
  children?: ReactNode;
  submitDisabled?: boolean;
  submitDisabledReason?: string;
};

const ALLOWED_EXTENSIONS = [
  ".pdf",
  ".png",
  ".jpg",
  ".jpeg",
  ".xlsx",
  ".xls",
  ".csv",
];

const isAllowedFile = (file: File) => {
  const name = file.name.toLowerCase();
  return ALLOWED_EXTENSIONS.some((ext) => name.endsWith(ext));
};

const isPdfFile = (file: File) => file.name.toLowerCase().endsWith(".pdf");

const FORMATS_ERROR =
  "Formatos permitidos: PDF, PNG, JPG, JPEG, XLSX, XLS, CSV.";
const CONVOCATORIA_FORMAT_ERROR = "La convocatoria debe ser un único archivo PDF.";

export default function UploadModal({
  isOpen,
  onClose,
  onUpload,
  title = "Subir documentos obligatorios",
  description = "Sube la convocatoria, el certificado médico y el pronóstico de deportistas para crear el borrador del aval.",
  acceptedTypes = ".pdf,.png,.jpg,.jpeg,.xlsx,.xls,.csv",
  children,
  submitDisabled = false,
  submitDisabledReason,
}: UploadModalProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [convocatoriaFile, setConvocatoriaFile] = useState<File | null>(null);
  const [certificadoMedicoFile, setCertificadoMedicoFile] =
    useState<File | null>(null);
  const [pronosticoFiles, setPronosticoFiles] = useState<File[]>([]);
  const [draggingOver, setDraggingOver] = useState<DraggingTarget | null>(null);
  const convocatoriaInputRef = useRef<HTMLInputElement>(null);
  const certificadoInputRef = useRef<HTMLInputElement>(null);
  const pronosticoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) {
      setConvocatoriaFile(null);
      setCertificadoMedicoFile(null);
      setPronosticoFiles([]);
      setError(null);
      setUploading(false);
      setDraggingOver(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const appendToList = (
    setter: React.Dispatch<React.SetStateAction<File[]>>,
    files: File[],
  ) => {
    const valid = files.filter(isAllowedFile);
    if (valid.length < files.length) {
      setError(FORMATS_ERROR);
      return;
    }
    setter((prev) => [...prev, ...valid]);
    setError(null);
  };

  const removeFromList = (
    setter: React.Dispatch<React.SetStateAction<File[]>>,
    index: number,
  ) => {
    setter((prev) => prev.filter((_, i) => i !== index));
  };

  const handleConvocatoriaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.currentTarget.value = "";
    if (file) {
      if (!isPdfFile(file)) {
        setError(CONVOCATORIA_FORMAT_ERROR);
        return;
      }
      setConvocatoriaFile(file);
      setError(null);
    }
  };

  const handlePronosticoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      appendToList(setPronosticoFiles, Array.from(e.target.files));
      e.currentTarget.value = "";
    }
  };

  const handleCertificadoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!isAllowedFile(file)) {
        setError(FORMATS_ERROR);
        e.currentTarget.value = "";
        return;
      }
      setCertificadoMedicoFile(file);
      setError(null);
    }
  };

  const handleDragOver = (e: React.DragEvent, type: DraggingTarget) => {
    e.preventDefault();
    e.stopPropagation();
    if (!uploading) setDraggingOver(type);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDraggingOver(null);
  };

  const handleDrop = (e: React.DragEvent, type: DraggingTarget) => {
    e.preventDefault();
    e.stopPropagation();
    setDraggingOver(null);
    if (uploading) return;

    const dropped = Array.from(e.dataTransfer.files);
    if (dropped.length === 0) return;

    if (type === "convocatoria") {
      const file = dropped[0];
      if (!isPdfFile(file) || dropped.length > 1) {
        setError(CONVOCATORIA_FORMAT_ERROR);
        return;
      }
      setConvocatoriaFile(file);
      setError(null);
      return;
    }
    if (type === "pronostico") {
      appendToList(setPronosticoFiles, dropped);
      return;
    }
    // certificado: solo uno
    const file = dropped[0];
    if (!isAllowedFile(file)) {
      setError(FORMATS_ERROR);
      return;
    }
    setCertificadoMedicoFile(file);
    setError(null);
  };

  const handleUpload = async () => {
    if (
      !convocatoriaFile ||
      !certificadoMedicoFile ||
      pronosticoFiles.length === 0
    ) {
      setError(
        "Debes subir la convocatoria, el certificado médico y el pronóstico de deportistas para continuar.",
      );
      return;
    }

    if (submitDisabled) {
      setError(submitDisabledReason ?? "Completa la selección requerida para continuar.");
      return;
    }

    try {
      setUploading(true);
      setError(null);
      await onUpload({
        convocatoria: convocatoriaFile,
        certificadoMedico: certificadoMedicoFile,
        pronosticoDeportistas: pronosticoFiles,
      });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Error al subir los archivos";
      setError(message);
    } finally {
      setUploading(false);
    }
  };

  const dropzoneClass = (type: DraggingTarget) =>
    `relative border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors min-h-[120px] flex items-center justify-center ${
      draggingOver === type
        ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20"
        : "border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-900 hover:border-gray-400 dark:hover:border-gray-500"
    }`;

  // Helper para renderizar la lista de archivos seleccionados con su botón de remover.
  const renderFileList = (
    files: File[],
    onRemove: (index: number) => void,
  ) => (
    <ul className="space-y-2 mb-2">
      {files.map((file, idx) => (
        <li
          key={`${file.name}-${file.size}-${idx}`}
          className="flex items-center gap-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg px-3 py-2"
        >
          <FileText className="w-5 h-5 text-indigo-500 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
              {file.name}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {(file.size / 1024 / 1024).toFixed(2)} MB
            </p>
          </div>
          <button
            type="button"
            onClick={() => onRemove(idx)}
            disabled={uploading}
            className="text-gray-400 hover:text-rose-500 disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </li>
      ))}
    </ul>
  );

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div
        className="fixed inset-0 bg-gray-900/50 dark:bg-gray-900/80 transition-opacity"
        onClick={onClose}
      />

      <div className="flex min-h-full items-center justify-center p-3 sm:p-4">
        <div className="relative flex w-full max-w-2xl max-h-[92vh] flex-col overflow-hidden rounded-2xl bg-white shadow-xl dark:bg-gray-800">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-gray-700 sm:px-6">
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
          <div className="overflow-y-auto px-5 py-5 sm:px-6">
            <p className="mb-4 text-sm text-gray-600 dark:text-gray-300">
              {description}
            </p>

            <div className="space-y-4">
              {children ? <div>{children}</div> : null}

              {/* Convocatoria — único PDF */}
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Convocatoria
                </p>
                {convocatoriaFile &&
                  renderFileList([convocatoriaFile], () =>
                    setConvocatoriaFile(null),
                  )}
                <div
                  onClick={() => convocatoriaInputRef.current?.click()}
                  onDragOver={(e) => handleDragOver(e, "convocatoria")}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, "convocatoria")}
                  className={dropzoneClass("convocatoria")}
                >
                  <input
                    ref={convocatoriaInputRef}
                    type="file"
                    className="hidden"
                    accept=".pdf,application/pdf"
                    onChange={handleConvocatoriaChange}
                    disabled={uploading}
                  />
                  <div>
                    {convocatoriaFile ? (
                      <>
                        <Upload className="w-6 h-6 mx-auto mb-1 text-gray-400" />
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Reemplazar convocatoria
                        </p>
                      </>
                    ) : (
                      <>
                        <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
                          Subir convocatoria
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Arrastra un PDF aquí o haz clic para seleccionar
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Certificado médico — único */}
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Certificado médico
                </p>
                <div
                  onClick={() => certificadoInputRef.current?.click()}
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
                    onChange={handleCertificadoChange}
                    disabled={uploading}
                  />
                  {certificadoMedicoFile ? (
                    <div className="flex items-center justify-center gap-3">
                      <FileText className="w-8 h-8 text-indigo-500" />
                      <div className="text-left">
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
                    <div>
                      <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
                        Subir certificado médico
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Arrastra un archivo aquí o haz clic para seleccionar
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Pronóstico de deportistas — múltiples archivos */}
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Pronóstico de deportistas
                </p>
                {pronosticoFiles.length > 0 &&
                  renderFileList(pronosticoFiles, (idx) =>
                    removeFromList(setPronosticoFiles, idx),
                  )}
                <div
                  onClick={() => pronosticoInputRef.current?.click()}
                  onDragOver={(e) => handleDragOver(e, "pronostico")}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, "pronostico")}
                  className={dropzoneClass("pronostico")}
                >
                  <input
                    ref={pronosticoInputRef}
                    type="file"
                    className="hidden"
                    accept={acceptedTypes}
                    multiple
                    onChange={handlePronosticoChange}
                    disabled={uploading}
                  />
                  <div>
                    {pronosticoFiles.length > 0 ? (
                      <>
                        <Plus className="w-6 h-6 mx-auto mb-1 text-gray-400" />
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Agregar más documentos
                        </p>
                      </>
                    ) : (
                      <>
                        <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
                          Subir pronóstico de deportistas
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Arrastra archivos aquí o haz clic para seleccionar
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <p className="text-xs text-gray-500 dark:text-gray-400">
                Archivos soportados: PDF, PNG, JPG, JPEG, XLSX, XLS, CSV
              </p>
            </div>

            {error && (
              <div className="mt-4 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 text-sm rounded-lg px-4 py-3">
                {error}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 border-t border-gray-200 px-5 py-4 dark:border-gray-700 sm:px-6">
            {submitDisabled && submitDisabledReason && (
              <p className="mr-auto text-xs text-amber-600 dark:text-amber-400">
                {submitDisabledReason}
              </p>
            )}
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
              disabled={
                !convocatoriaFile ||
                !certificadoMedicoFile ||
                pronosticoFiles.length === 0 ||
                uploading ||
                submitDisabled
              }
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
