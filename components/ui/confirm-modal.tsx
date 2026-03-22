"use client";

import { Fragment } from "react";
import { Dialog, Transition } from "@headlessui/react";

type Props = {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

export default function ConfirmModal({
  open,
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  loading = false,
  onConfirm,
  onClose,
}: Props) {
  return (
    <Transition.Root show={open} as={Fragment}>
      <Dialog as="div" className="relative z-50" role="alertdialog" onClose={onClose}>
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
                    {title}
                  </Dialog.Title>
                  {description && (
                    <Dialog.Description className="text-sm text-gray-600 dark:text-gray-300">
                      {description}
                    </Dialog.Description>
                  )}
                </div>

                <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700/60 flex justify-end gap-2 bg-gray-50/60 dark:bg-gray-900/30">
                  <button
                    type="button"
                    className="btn border-gray-200 dark:border-gray-700/60 text-gray-700 dark:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600"
                    onClick={onClose}
                    disabled={loading}
                  >
                    {cancelLabel}
                  </button>
                  <button
                    type="button"
                    className="btn bg-rose-600 text-white hover:bg-rose-500 disabled:opacity-60 disabled:cursor-not-allowed"
                    onClick={onConfirm}
                    disabled={loading}
                  >
                    {loading ? "Eliminando..." : confirmLabel}
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
}
