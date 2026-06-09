"use client";

import { Fragment, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Dialog, Transition } from "@headlessui/react";
import { useMutation } from "@tanstack/react-query";

import { useAuth } from "@/app/providers/auth-provider";
import AlertBanner from "@/components/ui/alert-banner";
import {
  createReformaMulti,
  MES_OPCIONES,
  getErrorMessage,
} from "@/lib/api/reforms-multi";
import { canCreateReforma, getNormalizedRoles } from "@/lib/auth/access";
import { formatCurrency } from "@/lib/utils/formatters";
import MultiEventSelector, {
  type SelectedEvento,
} from "../_components/multi-event-selector";
import BalanceBar, { isBalanced } from "../_components/balance-bar";
import type { FuentePresupuestoReforma } from "@/types/reforma-multi";

type Step = "form" | "confirm";

export default function NuevaReformaMultiPage() {
  const { user } = useAuth();
  const router = useRouter();

  const roles = getNormalizedRoles(user);
  const isPda = roles.includes("PDA");
  const canCreate = canCreateReforma(user) || isPda;

  const [step, setStep] = useState<Step>("form");

  // Form state
  const [motivo, setMotivo] = useState("");
  const [mesEjecucion, setMesEjecucion] = useState<number | "">("");
  const [fuente, setFuente] = useState<FuentePresupuestoReforma | "">("");
  const [origenes, setOrigenes] = useState<SelectedEvento[]>([]);
  const [destinos, setDestinos] = useState<SelectedEvento[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  const totalCortado = useMemo(
    () => origenes.reduce((sum, e) => sum + e.monto, 0),
    [origenes],
  );

  const totalAsignado = useMemo(
    () => destinos.reduce((sum, e) => sum + e.monto, 0),
    [destinos],
  );

  const balanced = isBalanced(totalCortado, totalAsignado);

  const hasMontoErrors = useMemo(
    () =>
      origenes.some((e) => e.monto <= 0 || e.monto > e.totalDisponible) ||
      destinos.some((e) => e.monto <= 0),
    [origenes, destinos],
  );

  const mutation = useMutation({
    mutationFn: () =>
      createReformaMulti({
        motivo: motivo.trim(),
        mesEjecucion: Number(mesEjecucion),
        fuente: fuente as FuentePresupuestoReforma,
        eventosOrigen: origenes.map((e) => ({
          eventoId: e.eventoId,
          monto: e.monto,
        })),
        eventosDestino: destinos.map((e) => ({
          eventoId: e.eventoId,
          monto: e.monto,
        })),
      }),
    onSuccess: (res) => {
      const id = res.data?.id;
      if (id) {
        router.push(`/reformas-multi/${id}`);
      } else {
        router.push("/reformas-multi");
      }
    },
    onError: (err) => {
      setFormError(getErrorMessage(err));
      setStep("form");
    },
  });

  if (!canCreate) {
    return (
      <div className="px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <AlertBanner
            variant="error"
            message="No tienes permiso para crear reformas multi-evento."
          />
          <Link
            href="/reformas-multi"
            className="mt-4 inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver a reformas
          </Link>
        </div>
      </div>
    );
  }

  function validateForm(): string | null {
    if (!motivo.trim()) return "El motivo es obligatorio.";
    if (motivo.trim().length > 600)
      return "El motivo no puede superar los 600 caracteres.";
    if (!mesEjecucion) return "Selecciona el mes de ejecución.";
    if (!fuente) return "Selecciona la fuente presupuestaria.";
    if (origenes.length === 0)
      return "Debes seleccionar al menos un evento de origen.";
    if (destinos.length === 0)
      return "Debes seleccionar al menos un evento de destino.";
    if (origenes.some((e) => e.monto <= 0))
      return "Todos los montos de origen deben ser mayores a 0.";
    if (destinos.some((e) => e.monto <= 0))
      return "Todos los montos de destino deben ser mayores a 0.";
    if (!balanced)
      return "La suma de montos de origen debe ser igual a la de destino.";
    // origin ≠ destination overlap check (frontend guard)
    const origenIds = new Set(origenes.map((e) => e.eventoId));
    const overlap = destinos.some((e) => origenIds.has(e.eventoId));
    if (overlap)
      return "Un mismo evento no puede ser origen y destino a la vez.";
    return null;
  }

  function handleContinue() {
    const err = validateForm();
    if (err) {
      setFormError(err);
      return;
    }
    setFormError(null);
    setStep("confirm");
  }

  function handleConfirmSubmit() {
    mutation.mutate();
  }

  const origenExcludeIds = destinos.map((e) => e.eventoId);
  const destinoExcludeIds = origenes.map((e) => e.eventoId);

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <Link
            href="/reformas-multi"
            className="inline-flex items-center gap-2 text-sm text-gray-500 transition hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver a reformas multi-evento
          </Link>
          <h1 className="mt-4 text-2xl font-bold text-gray-900 dark:text-gray-100">
            Nueva reforma multi-evento
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Solicita una transferencia presupuestaria entre múltiples eventos.
          </p>
        </div>

        {formError ? (
          <AlertBanner
            variant="error"
            message={formError}
            onClose={() => setFormError(null)}
          />
        ) : null}

        <div className="space-y-5 rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          {/* Motivo */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Motivo <span className="text-rose-500">*</span>
            </label>
            <textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              rows={3}
              maxLength={600}
              className="form-textarea w-full border border-gray-300 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              placeholder="Describe el motivo de la reforma..."
            />
            <p className="mt-1 text-right text-xs text-gray-400">
              {motivo.length}/600
            </p>
          </div>

          {/* Mes + Fuente */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Mes de ejecución <span className="text-rose-500">*</span>
              </label>
              <select
                value={mesEjecucion}
                onChange={(e) =>
                  setMesEjecucion(e.target.value ? Number(e.target.value) : "")
                }
                className="form-select w-full border border-gray-300 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              >
                <option value="">Selecciona un mes</option>
                {MES_OPCIONES.map((mes) => (
                  <option key={mes.value} value={mes.value}>
                    {mes.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Fuente presupuestaria <span className="text-rose-500">*</span>
              </label>
              <select
                value={fuente}
                onChange={(e) => {
                  setFuente((e.target.value as FuentePresupuestoReforma) || "");
                  // Reset selections when fuente changes
                  setOrigenes([]);
                  setDestinos([]);
                }}
                className="form-select w-full border border-gray-300 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              >
                <option value="">Selecciona una fuente</option>
                <option value="FONDOS_PUBLICOS">Fondos Públicos</option>
                <option value="AUTOGESTION">Autogestión</option>
              </select>
            </div>
          </div>
        </div>

        {/* Origenes */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <MultiEventSelector
            label="Eventos de origen (se reducirá su presupuesto)"
            fuente={fuente}
            selected={origenes}
            onChange={setOrigenes}
            excludeIds={origenExcludeIds}
          />
        </div>

        {/* Destinos */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <MultiEventSelector
            label="Eventos de destino (recibirán presupuesto)"
            fuente={fuente}
            selected={destinos}
            onChange={setDestinos}
            excludeIds={destinoExcludeIds}
          />
        </div>

        {/* Balance bar */}
        <BalanceBar totalCortado={totalCortado} totalAsignado={totalAsignado} />

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Link
            href="/reformas-multi"
            className="btn border-gray-200 text-gray-700 hover:border-gray-300 dark:border-gray-700/60 dark:text-gray-200 dark:hover:border-gray-600"
          >
            Cancelar
          </Link>
          <button
            type="button"
            disabled={!balanced || hasMontoErrors || mutation.isPending}
            onClick={handleContinue}
            className="btn bg-indigo-600 text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Continuar
          </button>
        </div>
      </div>

      {/* Confirm modal */}
      <Transition.Root show={step === "confirm"} as={Fragment}>
        <Dialog
          as="div"
          className="relative z-50"
          role="dialog"
          onClose={() => {
            if (!mutation.isPending) setStep("form");
          }}
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
            <div className="flex min-h-full items-center justify-center p-4">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-200"
                enterFrom="opacity-0 translate-y-2 scale-95"
                enterTo="opacity-100 translate-y-0 scale-100"
                leave="ease-in duration-150"
                leaveFrom="opacity-100 translate-y-0 scale-100"
                leaveTo="opacity-0 translate-y-2 scale-95"
              >
                <Dialog.Panel className="w-full max-w-lg transform overflow-hidden rounded-xl border border-gray-200 bg-white text-left align-middle shadow-xl transition-all dark:border-gray-700/60 dark:bg-gray-800">
                  <div className="space-y-4 px-6 py-5">
                    <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      Confirmar solicitud
                    </Dialog.Title>
                    <Dialog.Description className="text-sm text-gray-600 dark:text-gray-300">
                      Revisa el resumen antes de enviar la reforma.
                    </Dialog.Description>

                    {/* Summary */}
                    <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm dark:border-gray-700 dark:bg-gray-900/40">
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Motivo</p>
                        <p className="font-medium text-gray-900 dark:text-gray-100">
                          {motivo.trim()}
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Mes</p>
                          <p className="font-medium text-gray-900 dark:text-gray-100">
                            {mesEjecucion
                              ? (MES_OPCIONES.find((m) => m.value === mesEjecucion)?.label ?? String(mesEjecucion))
                              : "-"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Fuente</p>
                          <p className="font-medium text-gray-900 dark:text-gray-100">
                            {fuente === "FONDOS_PUBLICOS"
                              ? "Fondos Públicos"
                              : fuente === "AUTOGESTION"
                                ? "Autogestión"
                                : "-"}
                          </p>
                        </div>
                      </div>

                      <div>
                        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-rose-600 dark:text-rose-400">
                          Orígenes
                        </p>
                        {origenes.map((e) => (
                          <div
                            key={e.eventoId}
                            className="flex items-center justify-between text-xs"
                          >
                            <span className="truncate text-gray-700 dark:text-gray-300">
                              {e.nombre} ({e.codigo})
                            </span>
                            <span className="ml-2 flex-shrink-0 font-medium text-rose-600 dark:text-rose-400">
                              -{formatCurrency(e.monto)}
                            </span>
                          </div>
                        ))}
                        <div className="mt-1 flex justify-between border-t border-gray-200 pt-1 text-xs font-semibold dark:border-gray-700">
                          <span className="text-gray-500 dark:text-gray-400">Total cortado</span>
                          <span className="text-rose-600 dark:text-rose-400">
                            -{formatCurrency(totalCortado)}
                          </span>
                        </div>
                      </div>

                      <div>
                        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
                          Destinos
                        </p>
                        {destinos.map((e) => (
                          <div
                            key={e.eventoId}
                            className="flex items-center justify-between text-xs"
                          >
                            <span className="truncate text-gray-700 dark:text-gray-300">
                              {e.nombre} ({e.codigo})
                            </span>
                            <span className="ml-2 flex-shrink-0 font-medium text-emerald-600 dark:text-emerald-400">
                              +{formatCurrency(e.monto)}
                            </span>
                          </div>
                        ))}
                        <div className="mt-1 flex justify-between border-t border-gray-200 pt-1 text-xs font-semibold dark:border-gray-700">
                          <span className="text-gray-500 dark:text-gray-400">Total asignado</span>
                          <span className="text-emerald-600 dark:text-emerald-400">
                            +{formatCurrency(totalAsignado)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 border-t border-gray-200 bg-gray-50/60 px-6 py-4 dark:border-gray-700/60 dark:bg-gray-900/30">
                    <button
                      type="button"
                      className="btn border-gray-200 text-gray-700 hover:border-gray-300 dark:border-gray-700/60 dark:text-gray-200 dark:hover:border-gray-600"
                      onClick={() => setStep("form")}
                      disabled={mutation.isPending}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      className="btn bg-indigo-600 text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
                      onClick={handleConfirmSubmit}
                      disabled={mutation.isPending}
                    >
                      {mutation.isPending ? "Enviando..." : "Confirmar y enviar"}
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition.Root>
    </div>
  );
}
