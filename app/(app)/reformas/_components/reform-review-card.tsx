"use client";

import { Fragment, useMemo, useState } from "react";
import { Dialog, Transition } from "@headlessui/react";

type Props = {
  visible: boolean;
  status?: string | null;
  loading?: boolean;
  onApprove: () => Promise<void> | void;
  onReject: (reason: string) => Promise<void> | void;
};

export default function ReformReviewCard({
  visible,
  status,
  loading = false,
  onApprove,
  onReject,
}: Props) {
  const isPending = useMemo(() => status === "PENDIENTE", [status]);
  const canRender = visible && isPending;

  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!canRender) return null;

  const handleApprove = async () => {
    if (loading || submitting) return;
    setSubmitting(true);
    try {
      await onApprove();
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenReject = () => {
    if (loading || submitting) return;
    setReasonError(null);
    setRejectOpen(true);
  };

  const handleCloseReject = () => {
    if (submitting) return;
    setRejectOpen(false);
    setReasonError(null);
  };

  const handleConfirmReject = async () => {
    const trimmed = reason.trim();
    if (!trimmed) {
      setReasonError("Debes indicar una observación para el rechazo.");
      return;
    }
    if (loading || submitting) return;

    setSubmitting(true);
    try {
      await onReject(trimmed);
      setReason("");
      setRejectOpen(false);
      setReasonError(null);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          Revisión de reforma
        </h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          El evento siempre muestra la versión vigente; el historial y cambios
          se ven aquí.
        </p>

        <div className="mt-4 flex flex-wrap justify-end gap-3">
          <button
            type="button"
            disabled={loading || submitting}
            onClick={handleOpenReject}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold text-white bg-gradient-to-r from-rose-600 to-rose-500 shadow-lg hover:from-rose-500 hover:to-rose-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Rechazar
          </button>
          <button
            type="button"
            disabled={loading || submitting}
            onClick={handleApprove}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold text-white bg-gradient-to-r from-emerald-600 to-emerald-500 shadow-lg hover:from-emerald-500 hover:to-emerald-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Aprobar
          </button>
        </div>
      </section>

      <Transition.Root show={rejectOpen} as={Fragment}>
        <Dialog
          as="div"
          className="relative z-50"
          role="dialog"
          onClose={handleCloseReject}
        >
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
                  <div className="px-6 py-5 space-y-3">
                    <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      Rechazar reforma
                    </Dialog.Title>
                    <Dialog.Description className="text-sm text-gray-600 dark:text-gray-300">
                      Debes indicar una observación para registrar el rechazo.
                    </Dialog.Description>

                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Observación (obligatoria)
                      </label>
                      <textarea
                        value={reason}
                        onChange={(e) => {
                          setReason(e.target.value);
                          if (reasonError) setReasonError(null);
                        }}
                        rows={3}
                        className="form-textarea w-full text-sm border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                        placeholder="Describe a qué se debe el rechazo..."
                      />
                      {reasonError ? (
                        <p className="text-sm text-rose-500">{reasonError}</p>
                      ) : null}
                    </div>
                  </div>

                  <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700/60 flex justify-end gap-2 bg-gray-50/60 dark:bg-gray-900/30">
                    <button
                      type="button"
                      className="btn border-gray-200 dark:border-gray-700/60 text-gray-700 dark:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600"
                      onClick={handleCloseReject}
                      disabled={submitting}
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      className="btn bg-rose-600 text-white hover:bg-rose-500 disabled:opacity-60 disabled:cursor-not-allowed"
                      onClick={handleConfirmReject}
                      disabled={submitting}
                    >
                      Rechazar
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition.Root>
    </>
  );
}
