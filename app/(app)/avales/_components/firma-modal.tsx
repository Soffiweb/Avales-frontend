"use client";

import { Fragment, useEffect, useRef, useState, type FormEvent } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { FileKey2, Loader2, ShieldCheck } from "lucide-react";

import { firmarAprobarAval } from "@/lib/api/avales";
import { ApiError } from "@/lib/api/client";
import type { Aval, EtapaFlujo } from "@/types/aval";
import { getApprovalStageLabel } from "@/lib/constants";

const CERTIFICATE_ACCEPT = ".p12,.pfx";
const CERTIFICATE_MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB — ver SIGNATURE_CERTIFICATE_MAX_SIZE_BYTES en el backend

// El backend tipa cada error de firma con un `errorCode`
// (src/modules/signature/exceptions/signature.exceptions.ts). El
// `GlobalExceptionFilter` reenvía ese campo al cliente a nivel raíz del
// Problem Details (aplana `extensions` en http-error.handler.ts), así que
// `problem.errorCode` es fiable. Conservamos el match por texto del `detail`
// como fallback defensivo. Ambos deben coincidir EXACTAMENTE con lo que emite
// `SignatureWrongPasswordException` en el backend.
const WRONG_PASSWORD_ERROR_CODE = "WRONG_PASSWORD";
const WRONG_PASSWORD_DETAIL =
  "La contraseña del certificado es incorrecta o el archivo .p12 es inválido.";

type FirmaModalProps = {
  open: boolean;
  avalId: number;
  usuarioId: number;
  etapa: EtapaFlujo;
  comentario?: string;
  onSuccess: (aval: Aval) => void;
  onCancel: () => void;
};

export default function FirmaModal({
  open,
  avalId,
  usuarioId,
  etapa,
  comentario,
  onSuccess,
  onCancel,
}: FirmaModalProps) {
  const [certificateFile, setCertificateFile] = useState<File | null>(null);
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reinicia el formulario cada vez que se abre/cierra — nunca conservar
  // certificado/contraseña entre aperturas del modal.
  useEffect(() => {
    if (!open) {
      setCertificateFile(null);
      setPassword("");
      setSubmitting(false);
      setFormError(null);
      setPasswordError(null);
    }
  }, [open]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    if (file) {
      const name = file.name.toLowerCase();
      if (!name.endsWith(".p12") && !name.endsWith(".pfx")) {
        setFormError("El certificado debe ser un archivo .p12 o .pfx.");
        event.currentTarget.value = "";
        return;
      }
      if (file.size > CERTIFICATE_MAX_SIZE_BYTES) {
        setFormError("El certificado no debe superar los 5 MB.");
        event.currentTarget.value = "";
        return;
      }
    }
    setCertificateFile(file);
    setFormError(null);
  };

  const handleClose = () => {
    if (submitting) return;
    onCancel();
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (submitting) return;

    if (!certificateFile) {
      setFormError("Debes seleccionar el archivo .p12/.pfx del certificado.");
      return;
    }
    if (!password) {
      setPasswordError("Debes ingresar la contraseña del certificado.");
      passwordInputRef.current?.focus();
      return;
    }

    setSubmitting(true);
    setFormError(null);
    setPasswordError(null);

    try {
      const response = await firmarAprobarAval(avalId, {
        usuarioId,
        etapa,
        password,
        certificate: certificateFile,
        comentario,
      });
      onSuccess(response.data);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "No se pudo firmar el documento. Intenta nuevamente.";
      const isWrongPassword =
        (err instanceof ApiError && err.problem?.errorCode === WRONG_PASSWORD_ERROR_CODE) ||
        message === WRONG_PASSWORD_DETAIL;

      if (isWrongPassword) {
        setPasswordError(message);
        passwordInputRef.current?.focus();
      } else {
        setFormError(message);
      }
    } finally {
      // Invariante de seguridad: la contraseña nunca se conserva en estado
      // más allá del request en curso, sin importar si tuvo éxito o falló.
      setPassword("");
      setSubmitting(false);
    }
  };

  return (
    <Transition.Root show={open} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={handleClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 translate-y-2 scale-95"
              enterTo="opacity-100 translate-y-0 scale-100"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 translate-y-0 scale-100"
              leaveTo="opacity-0 translate-y-2 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-xl bg-white dark:bg-gray-800 text-left align-middle shadow-xl transition-all border border-gray-200 dark:border-gray-700/60">
                <form onSubmit={handleSubmit}>
                  <div className="px-6 py-5 space-y-1">
                    <Dialog.Title className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
                      <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                      Firmar y aprobar
                    </Dialog.Title>
                    <Dialog.Description className="text-sm text-gray-600 dark:text-gray-300">
                      Sube tu certificado electrónico para firmar el
                      documento de &ldquo;{getApprovalStageLabel(etapa)}&rdquo; y
                      aprobar el aval.
                    </Dialog.Description>
                  </div>

                  <div className="px-6 pb-2 space-y-4">
                    <label className="block">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Certificado (.p12/.pfx)
                      </span>
                      <div className="mt-1 flex items-center gap-3 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 px-3 py-3">
                        <FileKey2 className="w-5 h-5 text-gray-400 shrink-0" />
                        <div className="flex-1 min-w-0 text-left">
                          {certificateFile ? (
                            <p className="text-sm text-gray-900 dark:text-gray-100 truncate">
                              {certificateFile.name}
                            </p>
                          ) : (
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              Ningún archivo seleccionado
                            </p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={submitting}
                          className="btn border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600 disabled:opacity-50 shrink-0 text-xs px-3 py-1.5"
                        >
                          Elegir archivo
                        </button>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept={CERTIFICATE_ACCEPT}
                          onChange={handleFileChange}
                          disabled={submitting}
                          className="hidden"
                        />
                      </div>
                    </label>

                    <label className="block">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Contraseña del certificado
                      </span>
                      <input
                        ref={passwordInputRef}
                        type="password"
                        autoComplete="off"
                        className="form-input w-full mt-1"
                        value={password}
                        disabled={submitting}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          setPasswordError(null);
                        }}
                        placeholder="••••••••"
                      />
                      {passwordError && (
                        <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">
                          {passwordError}
                        </p>
                      )}
                    </label>

                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      El certificado y la contraseña solo se usan para esta
                      firma; no se guardan en el navegador ni en el servidor.
                    </p>

                    {formError && (
                      <div className="rounded-lg bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 text-sm px-3 py-2">
                        {formError}
                      </div>
                    )}

                    {submitting && (
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Firmando documento, esto puede tardar unos segundos...
                      </div>
                    )}
                  </div>

                  <div className="px-6 py-4 mt-2 border-t border-gray-200 dark:border-gray-700/60 flex justify-end gap-2 bg-gray-50/60 dark:bg-gray-900/30">
                    <button
                      type="button"
                      className="btn border-gray-200 dark:border-gray-700/60 text-gray-700 dark:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600 disabled:opacity-50"
                      onClick={handleClose}
                      disabled={submitting}
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="btn bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed"
                      disabled={submitting}
                    >
                      {submitting ? "Firmando..." : "Firmar y aprobar"}
                    </button>
                  </div>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
}
