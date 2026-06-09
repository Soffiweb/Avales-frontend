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
  MES_NOMBRES,
  MES_OPCIONES,
  getErrorMessage,
} from "@/lib/api/reforms-multi";
import { canCreateReforma, getNormalizedRoles } from "@/lib/auth/access";
import { formatCurrency } from "@/lib/utils/formatters";
import EventoItemsPanel, {
  type SelectedEvento,
} from "../_components/multi-event-selector";
import BalanceBar, { isBalanced } from "../_components/balance-bar";
import type { FuentePresupuestoReforma } from "@/types/reforma-multi";

type Step = "form" | "confirm";

type ResumenProps = {
  origenes: SelectedEvento[];
  destinos: SelectedEvento[];
  totalCortado: number;
  totalAsignado: number;
  balanced: boolean;
};

function ResumenCambios({ origenes, destinos, totalCortado, totalAsignado, balanced }: ResumenProps) {
  const origenResumen = origenes
    .map((e) => ({
      ...e,
      delta: e.items.reduce((s, it) => s + Math.max(0, it.presupuesto - it.monto), 0),
    }))
    .filter((e) => e.delta > 0);

  const destinoResumen = destinos
    .map((e) => ({
      ...e,
      delta: e.items.reduce((s, it) => s + Math.max(0, it.monto - it.presupuesto), 0),
    }))
    .filter((e) => e.delta > 0);

  if (origenResumen.length === 0 && destinoResumen.length === 0) return null;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <p className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
        Resumen de cambios
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {origenResumen.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-rose-600 dark:text-rose-400">
              Recortes
            </p>
            <div className="space-y-1">
              {origenResumen.map((e) => (
                <div key={e.eventoId} className="flex justify-between text-sm">
                  <span className="truncate text-gray-700 dark:text-gray-300" title={e.nombre}>
                    {e.codigo}
                  </span>
                  <span className="shrink-0 tabular-nums font-medium text-rose-600 dark:text-rose-400">
                    −{formatCurrency(e.delta)}
                  </span>
                </div>
              ))}
              <div className="flex justify-between border-t border-gray-200 pt-1 text-xs font-semibold dark:border-gray-700">
                <span className="text-gray-500 dark:text-gray-400">Total recortado</span>
                <span className="tabular-nums text-rose-600 dark:text-rose-400">
                  −{formatCurrency(totalCortado)}
                </span>
              </div>
            </div>
          </div>
        )}

        {destinoResumen.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
              Adiciones
            </p>
            <div className="space-y-1">
              {destinoResumen.map((e) => (
                <div key={e.eventoId} className="flex justify-between text-sm">
                  <span className="truncate text-gray-700 dark:text-gray-300" title={e.nombre}>
                    {e.codigo}
                  </span>
                  <span className="shrink-0 tabular-nums font-medium text-emerald-600 dark:text-emerald-400">
                    +{formatCurrency(e.delta)}
                  </span>
                </div>
              ))}
              <div className="flex justify-between border-t border-gray-200 pt-1 text-xs font-semibold dark:border-gray-700">
                <span className="text-gray-500 dark:text-gray-400">Total agregado</span>
                <span className="tabular-nums text-emerald-600 dark:text-emerald-400">
                  +{formatCurrency(totalAsignado)}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {totalCortado > 0 && totalAsignado > 0 && (
        <div
          className={`mt-4 pt-3 border-t border-gray-200 dark:border-gray-700 text-center text-sm font-semibold ${
            balanced
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-rose-600 dark:text-rose-400"
          }`}
        >
          {balanced
            ? `✓ Bien distribuido — ${formatCurrency(totalCortado)} redistribuidos correctamente`
            : `✗ Diferencia de ${formatCurrency(Math.abs(totalCortado - totalAsignado))} — ajusta los montos`}
        </div>
      )}
    </div>
  );
}

export default function NuevaReformaMultiPage() {
  const { user } = useAuth();
  const router = useRouter();

  const roles = getNormalizedRoles(user);
  const isPda = roles.includes("PDA");
  const canCreate = canCreateReforma(user) || isPda;

  const [step, setStep] = useState<Step>("form");

  const [motivo, setMotivo] = useState("");
  const [mesEjecucion, setMesEjecucion] = useState<number | "">("");
  const [fuente, setFuente] = useState<FuentePresupuestoReforma | "">("");
  const [origenes, setOrigenes] = useState<SelectedEvento[]>([]);
  const [destinos, setDestinos] = useState<SelectedEvento[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  const totalCortado = useMemo(
    () =>
      origenes
        .flatMap((e) => e.items)
        .reduce((s, it) => s + Math.max(0, it.presupuesto - it.monto), 0),
    [origenes],
  );

  const totalAsignado = useMemo(
    () =>
      destinos
        .flatMap((e) => e.items)
        .reduce((s, it) => s + Math.max(0, it.monto - it.presupuesto), 0),
    [destinos],
  );

  const balanced = isBalanced(totalCortado, totalAsignado);

  const hasMontoErrors = useMemo(
    () =>
      origenes.some((e) =>
        e.items.some(
          (it) => it.monto < 0 || (it.disponible > 0 && it.presupuesto - it.monto > it.disponible),
        ),
      ) ||
      destinos.some((e) => e.items.some((it) => it.monto < 0)),
    [origenes, destinos],
  );

  const mutation = useMutation({
    mutationFn: () =>
      createReformaMulti({
        motivo: motivo.trim(),
        mesEjecucion: Number(mesEjecucion),
        fuente: fuente as FuentePresupuestoReforma,
        eventosOrigen: origenes
          .map((e) => ({
            eventoId: e.eventoId,
            items: e.items
              .filter((it) => it.presupuesto - it.monto > 0)
              .map((it) => ({ itemId: it.itemId, mes: it.mes, monto: it.presupuesto - it.monto })),
          }))
          .filter((e) => e.items.length > 0),
        eventosDestino: destinos
          .map((e) => ({
            eventoId: e.eventoId,
            items: e.items
              .filter((it) => it.monto - it.presupuesto > 0)
              .map((it) => ({ itemId: it.itemId, mes: it.mes, monto: it.monto - it.presupuesto })),
          }))
          .filter((e) => e.items.length > 0),
      }),
    onSuccess: (res) => {
      const id = res.data?.id;
      router.push(id ? `/reformas-multi/${id}` : "/reformas-multi");
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
    if (motivo.trim().length > 600) return "El motivo no puede superar los 600 caracteres.";
    if (!mesEjecucion) return "Selecciona el mes de ejecución.";
    if (!fuente) return "Selecciona la fuente presupuestaria.";
    if (origenes.length === 0) return "Debes seleccionar al menos un evento de origen.";
    if (destinos.length === 0) return "Debes seleccionar al menos un evento de destino.";
    if (origenes.some((e) => e.items.length === 0))
      return "Todos los eventos de origen deben tener al menos un ítem.";
    if (destinos.some((e) => e.items.length === 0))
      return "Todos los eventos de destino deben tener al menos un ítem.";
    if (origenes.every((e) => e.items.every((it) => it.presupuesto - it.monto <= 0)))
      return "Al menos un ítem de origen debe tener un recorte.";
    if (destinos.every((e) => e.items.every((it) => it.monto - it.presupuesto <= 0)))
      return "Al menos un ítem de destino debe recibir presupuesto.";
    if (!balanced) return "El total recortado debe ser igual al total asignado.";
    return null;
  }

  function handleContinue() {
    const err = validateForm();
    if (err) { setFormError(err); return; }
    setFormError(null);
    setStep("confirm");
  }

  const origenEventoIds = origenes.map((e) => e.eventoId);

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Nav + title */}
        <div className="max-w-3xl">
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
          <div className="max-w-3xl">
            <AlertBanner
              variant="error"
              message={formError}
              onClose={() => setFormError(null)}
            />
          </div>
        ) : null}

        {/* Header form */}
        <div className="max-w-3xl space-y-5 rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
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
            <p className="mt-1 text-right text-xs text-gray-400">{motivo.length}/600</p>
          </div>

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

        {/* Two-column panels */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-xl border border-rose-200 bg-white p-5 shadow-sm dark:border-rose-900/40 dark:bg-gray-800">
            <EventoItemsPanel
              label="Orígenes — se reducirá su presupuesto"
              fuente={fuente}
              selected={origenes}
              onChange={setOrigenes}
              mode="origen"
              defaultMes={mesEjecucion}
            />
          </div>

          <div className="rounded-xl border border-emerald-200 bg-white p-5 shadow-sm dark:border-emerald-900/40 dark:bg-gray-800">
            <EventoItemsPanel
              label="Destinos — recibirán presupuesto"
              fuente={fuente}
              selected={destinos}
              onChange={setDestinos}
              mode="destino"
              defaultMes={mesEjecucion}
              highlightEventoIds={origenEventoIds}
            />
          </div>
        </div>

        {/* Resumen de cambios */}
        <ResumenCambios
          origenes={origenes}
          destinos={destinos}
          totalCortado={totalCortado}
          totalAsignado={totalAsignado}
          balanced={balanced}
        />

        {/* Balance */}
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
          onClose={() => { if (!mutation.isPending) setStep("form"); }}
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
                            {mesEjecucion ? (MES_NOMBRES[mesEjecucion] ?? String(mesEjecucion)) : "-"}
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
                        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-rose-600 dark:text-rose-400">
                          Orígenes
                        </p>
                        <div className="space-y-2">
                          {origenes.map((e) => {
                            const total = e.items.reduce((s, it) => s + it.monto, 0);
                            return (
                              <div key={e.eventoId}>
                                <div className="flex items-center justify-between text-xs">
                                  <span className="truncate font-medium text-gray-700 dark:text-gray-300">
                                    {e.nombre} ({e.codigo})
                                  </span>
                                  <span className="ml-2 shrink-0 font-semibold text-rose-600 dark:text-rose-400">
                                    -{formatCurrency(total)}
                                  </span>
                                </div>
                                <div className="mt-0.5 pl-2 space-y-0.5">
                                  {e.items.map((it) => (
                                    <div
                                      key={`${it.itemId}-${it.mes}`}
                                      className="flex justify-between text-[0.65rem] text-gray-500 dark:text-gray-400"
                                    >
                                      <span>
                                        {it.itemNombre} · {MES_NOMBRES[it.mes]}
                                      </span>
                                      <span>-{formatCurrency(it.monto)}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                          <div className="flex justify-between border-t border-gray-200 pt-1 text-xs font-semibold dark:border-gray-700">
                            <span className="text-gray-500 dark:text-gray-400">Total cortado</span>
                            <span className="text-rose-600 dark:text-rose-400">
                              -{formatCurrency(totalCortado)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
                          Destinos
                        </p>
                        <div className="space-y-2">
                          {destinos.map((e) => {
                            const total = e.items.reduce((s, it) => s + it.monto, 0);
                            return (
                              <div key={e.eventoId}>
                                <div className="flex items-center justify-between text-xs">
                                  <span className="truncate font-medium text-gray-700 dark:text-gray-300">
                                    {e.nombre} ({e.codigo})
                                  </span>
                                  <span className="ml-2 shrink-0 font-semibold text-emerald-600 dark:text-emerald-400">
                                    +{formatCurrency(total)}
                                  </span>
                                </div>
                                <div className="mt-0.5 pl-2 space-y-0.5">
                                  {e.items.map((it) => (
                                    <div
                                      key={`${it.itemId}-${it.mes}`}
                                      className="flex justify-between text-[0.65rem] text-gray-500 dark:text-gray-400"
                                    >
                                      <span>
                                        {it.itemNombre} · {MES_NOMBRES[it.mes]}
                                      </span>
                                      <span>+{formatCurrency(it.monto)}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                          <div className="flex justify-between border-t border-gray-200 pt-1 text-xs font-semibold dark:border-gray-700">
                            <span className="text-gray-500 dark:text-gray-400">Total asignado</span>
                            <span className="text-emerald-600 dark:text-emerald-400">
                              +{formatCurrency(totalAsignado)}
                            </span>
                          </div>
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
                      onClick={() => mutation.mutate()}
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
