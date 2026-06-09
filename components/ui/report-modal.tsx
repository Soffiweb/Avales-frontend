"use client";

import { Fragment, useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { reportarProblema } from "@/lib/api/monitoreo";
import { getLastRequestId } from "@/lib/api/client";
import AlertBanner from "@/components/ui/alert-banner";

const MAX_DESC = 2000;

const schema = z.object({
  descripcion: z
    .string()
    .min(1, "La descripción es requerida.")
    .max(MAX_DESC, `La descripción no puede superar los ${MAX_DESC} caracteres.`),
});

type FormValues = z.infer<typeof schema>;

type Props = {
  open: boolean;
  onClose: () => void;
  initialDescripcion?: string;
};

export default function ReportModal({ open, onClose, initialDescripcion = "" }: Props) {
  const [submitStatus, setSubmitStatus] = useState<"idle" | "success" | "error">("idle");
  const [submitMessage, setSubmitMessage] = useState("");

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { descripcion: initialDescripcion },
  });

  const descripcion = watch("descripcion");

  const handleClose = () => {
    if (isSubmitting) return;
    reset({ descripcion: initialDescripcion });
    setSubmitStatus("idle");
    setSubmitMessage("");
    onClose();
  };

  const onSubmit = async (values: FormValues) => {
    setSubmitStatus("idle");
    try {
      await reportarProblema({
        descripcion: values.descripcion,
        requestId: getLastRequestId() ?? undefined,
        url: typeof window !== "undefined" ? window.location.href : undefined,
        userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
      });
      setSubmitStatus("success");
      setSubmitMessage("Tu reporte fue enviado. Gracias por ayudarnos a mejorar.");
      reset({ descripcion: "" });
    } catch (err: unknown) {
      setSubmitStatus("error");
      setSubmitMessage(
        err instanceof Error ? err.message : "No se pudo enviar el reporte. Intenta nuevamente."
      );
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
              <Dialog.Panel className="w-full max-w-lg transform overflow-hidden rounded-xl bg-white dark:bg-gray-800 text-left align-middle shadow-xl transition-all border border-gray-200 dark:border-gray-700/60">
                <div className="px-6 py-5 space-y-1">
                  <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    Reportar un problema
                  </Dialog.Title>
                  <Dialog.Description className="text-sm text-gray-500 dark:text-gray-400">
                    Describe lo que ocurrió. Tu reporte ayuda a mejorar el sistema.
                  </Dialog.Description>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} noValidate>
                  <div className="px-6 pb-4 space-y-4">
                    {submitStatus !== "idle" && (
                      <AlertBanner
                        variant={submitStatus}
                        message={submitMessage}
                        onClose={() => setSubmitStatus("idle")}
                      />
                    )}

                    <div>
                      <label
                        htmlFor="report-descripcion"
                        className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                      >
                        Descripción <span className="text-rose-500">*</span>
                      </label>
                      <textarea
                        id="report-descripcion"
                        rows={5}
                        className={`form-textarea w-full resize-none ${
                          errors.descripcion
                            ? "border-rose-400 focus:border-rose-500 focus:ring-rose-500"
                            : ""
                        }`}
                        placeholder="¿Qué ocurrió? Describe el problema con el mayor detalle posible."
                        {...register("descripcion")}
                      />
                      <div className="flex justify-between items-start mt-1">
                        <span className="text-xs text-rose-600 dark:text-rose-400">
                          {errors.descripcion?.message ?? ""}
                        </span>
                        <span
                          className={`text-xs tabular-nums ${
                            descripcion.length > MAX_DESC
                              ? "text-rose-600 dark:text-rose-400"
                              : "text-gray-400 dark:text-gray-500"
                          }`}
                        >
                          {descripcion.length}/{MAX_DESC}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700/60 flex justify-end gap-2 bg-gray-50/60 dark:bg-gray-900/30">
                    <button
                      type="button"
                      className="btn border-gray-200 dark:border-gray-700/60 text-gray-700 dark:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600"
                      onClick={handleClose}
                      disabled={isSubmitting}
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="btn bg-gray-900 text-gray-100 hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-800 dark:hover:bg-white disabled:opacity-60 disabled:cursor-not-allowed"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? "Enviando..." : "Enviar reporte"}
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
