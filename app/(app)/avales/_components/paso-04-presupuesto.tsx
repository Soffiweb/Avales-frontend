"use client";

import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import {
  FileText,
  DollarSign,
  Paperclip,
  X,
  Plus,
  Trash2,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils/formatters";
import { getTodayDateInputValue } from "@/lib/utils/formatters/dates";
import { useRouter } from "next/navigation";
import {
  createAval,
  updateAvalRequest,
  uploadAdjuntosSolicitud,
} from "@/lib/api/avales";
import { updateEvento } from "@/lib/api/eventos";
import { getTipoAvalLabel } from "@/lib/constants";
import { getAvalPresupuestoItems } from "@/lib/utils/aval-collections";
import type {
  Aval,
  EditAvalPayload,
  ModalidadParticipacion,
  RubroPresupuestarioDto,
  TipoAval,
  TipoCoberturaAval,
} from "@/types/aval";
import { inferEventoGenero } from "@/types/evento";
import {
  buildInitialManualRequirements,
  getDraftSubtotal,
  getDraftTitle,
  getTotalOriginalManual,
  serializeManualRequirements,
  sumManualRequirementAmount,
  type ManualRequirementDraft,
} from "./paso-04-presupuesto.helpers";
import { avalFlowDebugLog } from "@/lib/debug/aval-flow";

type FormData = {
  deportistas: Array<{
    id: number;
    deportistaExternoId?: string;
    nombre: string;
    apellido?: string;
    nombres?: string;
    apellidos?: string;
    cedula?: string;
    payload?: Record<string, unknown>;
    rol?: string;
    modalidadParticipacion?: ModalidadParticipacion;
  }>;
  entrenadores: Array<{ id: number; nombre: string; esTextoLibre?: boolean }>;
  otrosParticipantes?: Array<{
    cargo: string;
    nombre?: string;
    usuarioId?: number;
  }>;
  fechaEmision?: string;
  fechaHoraSalida: string;
  fechaHoraRetorno: string;
  lugarSalida: string;
  lugarRetorno: string;
  transporteSalida: string;
  transporteRetorno: string;
  objetivos: string[];
  criterios: string[];
  observaciones?: string;
  adjuntosSolicitud?: File[];
  tipoAval?: TipoAval;
  requerimientos?: RubroPresupuestarioDto[];
  montoSolicitado?: number;
};

const MAX_ADJUNTOS_SOLICITUD = 10;

type Paso04PresupuestoProps = {
  formData: FormData;
  onComplete: (data: Partial<FormData>) => void;
  onPreviewChange?: (data: Partial<FormData>) => void;
  onBack: () => void;
  avalId: number;
  aval: Aval;
  isAdminLike?: boolean;
};

export default function Paso04Presupuesto({
  formData,
  onBack,
  onPreviewChange,
  avalId,
  aval,
  isAdminLike = false,
}: Paso04PresupuestoProps) {
  const router = useRouter();
  const [numeroAval] = useState(aval.avalTecnico?.numeroAval ?? "");
  const [observaciones, setObservaciones] = useState(
    formData.observaciones || "",
  );
  const [adjuntosSolicitud, setAdjuntosSolicitud] = useState<File[]>(
    formData.adjuntosSolicitud ?? [],
  );
  const [adjuntosWarning, setAdjuntosWarning] = useState<string | null>(null);
  const [manualRequirements, setManualRequirements] = useState<
    ManualRequirementDraft[]
  >(() => buildInitialManualRequirements(formData.requerimientos));
  const [detallesByItemId, setDetallesByItemId] = useState<Record<number, string>>(() => {
    const reqs = aval.avalTecnico?.requerimientos ?? [];
    const items = getAvalPresupuestoItems(aval);
    const result: Record<number, string> = {};
    items.forEach((pi) => {
      const detalle = reqs.find((r) => r.formaParticipacionItemId === pi.id)?.detalle;
      if (detalle) result[pi.item.id] = detalle;
    });
    return result;
  });
  const [error, setError] = useState<string | null>(null);
  const [createdAvalIdWithError, setCreatedAvalIdWithError] = useState<
    number | null
  >(null);
  const [submitting, setSubmitting] = useState(false);
  const tipoAval = formData.tipoAval ?? aval.tipoAval ?? undefined;
  const isFondosPublicos = tipoAval === "FONDOS_PUBLICOS";
  const isSoloResultado = tipoAval === "SOLO_RESULTADO";
  const isAutogestion = tipoAval === "AUTOGESTION";
  const usesManualRequirements = tipoAval === "SOLO_RESULTADO";

  const serializedManualRequirements = useMemo(
    () => serializeManualRequirements(manualRequirements),
    [manualRequirements],
  );
  const totalMontoSolicitado = useMemo(
    () => sumManualRequirementAmount(serializedManualRequirements),
    [serializedManualRequirements],
  );

  useEffect(() => {
    onPreviewChange?.({
      observaciones,
      adjuntosSolicitud,
      montoSolicitado: usesManualRequirements
        ? totalMontoSolicitado
        : undefined,
      requerimientos: usesManualRequirements
        ? serializedManualRequirements
        : [],
    });
  }, [
    observaciones,
    adjuntosSolicitud,
    onPreviewChange,
    usesManualRequirements,
    serializedManualRequirements,
    totalMontoSolicitado,
  ]);

  const toggleEspecie = (id: string) => {
    setManualRequirements((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const newTipo: TipoCoberturaAval =
          item.tipoCobertura === "ESPECIE" ? "DINERO" : "ESPECIE";
        return {
          ...item,
          tipoCobertura: newTipo,
          montoSolicitado: newTipo === "ESPECIE" ? "0.00" : "",
        };
      }),
    );
  };

  const presupuestoItems = getAvalPresupuestoItems(aval);

  const getTotalPresupuesto = () =>
    presupuestoItems.reduce((sum, item) => sum + (parseFloat(item.presupuesto) || 0), 0);

  const totalOriginalManual = getTotalOriginalManual(
    aval,
    tipoAval === "AUTOGESTION",
    getTotalPresupuesto(),
  );
  const totalDifferenceManual = Math.abs(
    totalMontoSolicitado - totalOriginalManual,
  );
  const hasExistingAvalTecnico = Boolean(aval.avalTecnico);
  const isEditingSolicitud =
    aval.estado === "SOLICITADO" && aval.etapaActual === "SOLICITUD";
  const isEditingExistingAval =
    hasExistingAvalTecnico && (isEditingSolicitud || isAdminLike);
  const submitLabel = isEditingExistingAval
    ? "Editar aval técnico"
    : "Crear aval técnico";
  const submittingLabel = isEditingExistingAval
    ? "Actualizando aval..."
    : "Creando aval...";

  const formatBytes = (value: number) => {
    if (value < 1024) return `${value} B`;
    if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
    return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleAdjuntosSolicitudChange = (e: ChangeEvent<HTMLInputElement>) => {
    const incoming = Array.from(e.target.files ?? []);
    if (incoming.length === 0) return;

    setAdjuntosWarning(null);
    setAdjuntosSolicitud((prev) => {
      // Evitar duplicados por nombre + tamaño (heurística simple)
      const existingKeys = new Set(prev.map((f) => `${f.name}_${f.size}`));
      const fresh = incoming.filter(
        (f) => !existingKeys.has(`${f.name}_${f.size}`),
      );

      const combined = [...prev, ...fresh];
      if (combined.length > MAX_ADJUNTOS_SOLICITUD) {
        setAdjuntosWarning(
          `Solo podes subir hasta ${MAX_ADJUNTOS_SOLICITUD} archivos. Se descartaron ${
            combined.length - MAX_ADJUNTOS_SOLICITUD
          } archivo(s).`,
        );
        return combined.slice(0, MAX_ADJUNTOS_SOLICITUD);
      }
      return combined;
    });

    // Limpiar el input para permitir re-seleccionar el mismo archivo si el usuario quiere
    e.target.value = "";
  };

  const handleRemoveAdjunto = (index: number) => {
    setAdjuntosWarning(null);
    setAdjuntosSolicitud((prev) => prev.filter((_, i) => i !== index));
  };

  const addManualRequirement = () => {
    setManualRequirements((prev) => [
      ...prev,
      {
        id: `req-${Date.now()}-${prev.length}`,
        otroConcepto: "",
        detalle: "",
        cantidad: "1",
        montoSolicitado: isSoloResultado ? "0.00" : "",
        tipoCobertura: isSoloResultado ? "ESPECIE" : "DINERO",
      },
    ]);
  };

  const updateManualRequirement = (
    id: string,
    field: keyof Omit<ManualRequirementDraft, "id">,
    value: string,
  ) => {
    setManualRequirements((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        return { ...item, [field]: value };
      }),
    );
  };

  const removeManualRequirement = (id: string) => {
    setManualRequirements((prev) => prev.filter((item) => item.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let createdAvalId: number | null = null;

    try {
      setSubmitting(true);
      setError(null);
      setCreatedAvalIdWithError(null);

      if (
        usesManualRequirements &&
        serializedManualRequirements.some((item) => !item.otroConcepto?.trim())
      ) {
        setError("Cada requerimiento debe tener un concepto.");
        return;
      }

      if (
        isSoloResultado &&
        serializedManualRequirements.some((item) => {
          const monto = Number.parseFloat(item.montoSolicitado ?? "0");
          return (
            item.tipoCobertura !== "ESPECIE" ||
            (Number.isFinite(monto) && monto > 0)
          );
        })
      ) {
        setError(
          "En avales solo por resultado solo se permiten conceptos propios sin costo monetario.",
        );
        return;
      }

      // Preparar el payload según la estructura esperada por la API
      const generoEvento = inferEventoGenero(formData.deportistas);
      avalFlowDebugLog("paso-04", "preparando submit final del aval", {
        avalId,
        tipoAval,
        isEditingSolicitud,
        generoEvento,
        observaciones,
        adjuntosSolicitud,
        requerimientos: serializedManualRequirements,
        totalMontoSolicitado,
        formData,
      });

      if (
        aval.evento?.id &&
        generoEvento &&
        aval.evento.genero !== generoEvento
      ) {
        avalFlowDebugLog("paso-04", "actualizando genero del evento", {
          eventoId: aval.evento.id,
          generoAnterior: aval.evento.genero,
          generoNuevo: generoEvento,
        });
        await updateEvento(aval.evento.id, { genero: generoEvento });
      }

      const payloadBase = {
        tipoAval,
        montoSolicitado:
          usesManualRequirements && serializedManualRequirements.length > 0
            ? totalMontoSolicitado
            : undefined,
        montoAsignado: aval.montoAsignado ?? undefined,
        fechaEmision: formData.fechaEmision || getTodayDateInputValue(),
        numeroAval: numeroAval.trim() || undefined,
        fechaHoraSalida: formData.fechaHoraSalida,
        fechaHoraRetorno: formData.fechaHoraRetorno,
        lugarSalida: formData.lugarSalida,
        lugarRetorno: formData.lugarRetorno,
        transporteSalida: formData.transporteSalida,
        transporteRetorno: formData.transporteRetorno,
        objetivos: formData.objetivos.map((obj, index) => ({
          orden: index + 1,
          descripcion: obj,
        })),
        criterios: formData.criterios.map((crit, index) => ({
          orden: index + 1,
          descripcion: crit,
        })),
        deportistas: formData.deportistas.map((d) => ({
          deportistaExternoId: d.deportistaExternoId ?? String(d.id),
          rol: d.rol ?? "ATLETA",
          nombre: d.nombre?.trim() || undefined,
          apellido: d.apellido?.trim() || undefined,
          nombres: d.nombres?.trim() || undefined,
          apellidos: d.apellidos?.trim() || undefined,
          cedula: d.cedula?.trim() || undefined,
          payload: d.payload,
          modalidadParticipacion: d.modalidadParticipacion,
        })),
        entrenadores: formData.entrenadores.map((e, index) => ({
          ...(e.esTextoLibre
            ? { entrenadorNombre: e.nombre }
            : { entrenadorId: e.id }),
          rol: index === 0 ? "ENTRENADOR PRINCIPAL" : "ENTRENADOR",
          esPrincipal: index === 0,
        })),
        otrosParticipantes: (formData.otrosParticipantes ?? []).map((o) => ({
          cargo: o.cargo,
          ...(o.usuarioId ? { usuarioId: o.usuarioId } : { nombre: o.nombre }),
        })),
        requerimientos: usesManualRequirements
          ? serializedManualRequirements
          : presupuestoItems.length > 0
            ? presupuestoItems.map((pi) => ({
                formaParticipacionItemId: pi.id,
                detalle: detallesByItemId[pi.item.id] || undefined,
              }))
            : undefined,
        observaciones: observaciones.trim() || undefined,
      };

      const { montoAsignado: _ignoredMontoAsignado, ...createPayloadBase } =
        payloadBase;

      avalFlowDebugLog("paso-04", "payload final armado", {
        payloadBase,
        createPayloadBase,
      });

      const response = isEditingExistingAval
        ? await updateAvalRequest(aval.id, payloadBase as EditAvalPayload)
        : await createAval({
            ...createPayloadBase,
            coleccionAvalId: avalId,
          });
      createdAvalId = response.data.id;

      avalFlowDebugLog("paso-04", "aval persistido", {
        createdAvalId,
        isEditingExistingAval,
        response: response.data,
      });

      if (adjuntosSolicitud.length > 0) {
        avalFlowDebugLog("paso-04", "subiendo adjuntos de solicitud", {
          createdAvalId,
          adjuntosSolicitud,
        });
        await uploadAdjuntosSolicitud(createdAvalId, adjuntosSolicitud);
      }

      router.push(
        `/avales/${createdAvalId}?status=${isEditingExistingAval ? "updated" : "created"}`,
      );
    } catch (err: any) {
      console.error("Error al crear el aval:", err);
      if (createdAvalId) {
        setCreatedAvalIdWithError(createdAvalId);
        setError(
          err?.message ??
            `El aval se ${
              isEditingExistingAval ? "actualizó" : "creó"
            }, pero hubo un problema al subir el documento adjunto.`,
        );
      } else {
        setError(
          err?.message ??
            `No se pudo ${isEditingExistingAval ? "actualizar" : "crear"} el aval técnico`,
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl text-gray-800 dark:text-gray-100 font-bold mb-2">
        Requerimientos del Evento
      </h1>
      <p className="text-gray-600 dark:text-gray-400 mb-6">
        Revisa los requerimientos y completa el cierre de la solicitud.
      </p>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="inline-flex rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300">
          {getTipoAvalLabel(tipoAval)}
        </span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Info banner
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex gap-3">
            <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800 dark:text-blue-300">
              <p className="font-medium mb-1">Información del presupuesto</p>
              <p>
                La única manera de cambiar el presupuesto es solicitando una
                reforma directamente desde el evento. Esta sección es solo
                informativa para la creación del aval.
              </p>
            </div>
          </div>
        </div>
        */}
        {/* Presupuesto según tipo de aval */}
        {isFondosPublicos && (
          <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
            <div className="mb-4 flex items-start gap-3">
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-2 text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
                <DollarSign className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  Requerimientos del evento
                </h2>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Revisa los requerimientos registrados para esta solicitud.
                </p>
              </div>
            </div>

            {presupuestoItems.length > 0 ? (
              <div className="rounded-xl border border-gray-200 bg-gray-50/70 dark:border-gray-700 dark:bg-gray-800/60">
                <div className="border-b border-gray-200 px-4 py-3 dark:border-gray-700">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {presupuestoItems.length}{" "}
                    {presupuestoItems.length === 1
                      ? "requerimiento"
                      : "requerimientos"}
                  </p>
                </div>
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {presupuestoItems.map((presupuestoItem) => {
                    const valor = parseFloat(presupuestoItem.presupuesto) || 0;
                    return (
                      <div key={presupuestoItem.id} className="px-4 py-4 space-y-2">
                        <div className="flex items-start justify-between gap-3">
                          <p className="flex-1 min-w-0 font-semibold text-gray-900 dark:text-gray-100">
                            {presupuestoItem.item.nombre}
                          </p>
                          <p className="whitespace-nowrap font-semibold text-gray-900 dark:text-gray-100">
                            {formatCurrency(valor)}
                          </p>
                        </div>
                        <label className="block">
                          <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                            Detalle{" "}
                            <span className="font-normal text-gray-400">(opcional)</span>
                          </span>
                          <input
                            type="text"
                            maxLength={500}
                            value={detallesByItemId[presupuestoItem.item.id] ?? ""}
                            onChange={(e) =>
                              setDetallesByItemId((prev) => ({
                                ...prev,
                                [presupuestoItem.item.id]: e.target.value,
                              }))
                            }
                            className="form-input mt-1 w-full border-gray-200 bg-white text-sm dark:border-gray-700 dark:bg-gray-900"
                          />
                        </label>
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-900/60">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                    Total presupuesto
                  </p>
                  <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                    {formatCurrency(getTotalPresupuesto())}
                  </p>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-8 text-center dark:border-gray-700 dark:bg-gray-800">
                <DollarSign className="mx-auto mb-3 h-12 w-12 text-gray-400" />
                <p className="text-gray-600 dark:text-gray-400">
                  No hay requerimientos asociados a este evento.
                </p>
              </div>
            )}
          </section>
        )}

        {isAutogestion && (
          <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
            <div className="mb-4 flex items-start gap-3">
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-2 text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
                <DollarSign className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  Presupuesto asignado por la federación
                </h2>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  El presidente de la federación fijó este presupuesto al crear el evento. Solo puede ser aprobado por el PDA.
                </p>
              </div>
            </div>

            {aval.montoAsignado != null && (
              <div className="mb-4 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 dark:border-indigo-900/70 dark:bg-indigo-950/30">
                <p className="text-xs text-indigo-600 dark:text-indigo-400">Monto asignado</p>
                <p className="text-2xl font-bold text-indigo-700 dark:text-indigo-300">
                  {formatCurrency(aval.montoAsignado)}
                </p>
              </div>
            )}

            {presupuestoItems.length > 0 ? (
              <div className="rounded-xl border border-gray-200 bg-gray-50/70 dark:border-gray-700 dark:bg-gray-800/60">
                <div className="border-b border-gray-200 px-4 py-3 dark:border-gray-700">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {presupuestoItems.length}{" "}
                    {presupuestoItems.length === 1 ? "requerimiento" : "requerimientos"}
                  </p>
                </div>
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {presupuestoItems.map((presupuestoItem) => {
                    const valor = parseFloat(presupuestoItem.presupuesto) || 0;
                    return (
                      <div key={presupuestoItem.id} className="px-4 py-4 space-y-2">
                        <div className="flex items-start justify-between gap-3">
                          <p className="flex-1 min-w-0 font-semibold text-gray-900 dark:text-gray-100">
                            {presupuestoItem.item.nombre}
                          </p>
                          <p className="whitespace-nowrap font-semibold text-gray-900 dark:text-gray-100">
                            {formatCurrency(valor)}
                          </p>
                        </div>
                        <label className="block">
                          <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                            Detalle{" "}
                            <span className="font-normal text-gray-400">(opcional)</span>
                          </span>
                          <input
                            type="text"
                            maxLength={500}
                            value={detallesByItemId[presupuestoItem.item.id] ?? ""}
                            onChange={(e) =>
                              setDetallesByItemId((prev) => ({
                                ...prev,
                                [presupuestoItem.item.id]: e.target.value,
                              }))
                            }
                            className="form-input mt-1 w-full border-gray-200 bg-white text-sm dark:border-gray-700 dark:bg-gray-900"
                          />
                        </label>
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-900/60">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                    Total presupuesto
                  </p>
                  <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                    {formatCurrency(getTotalPresupuesto())}
                  </p>
                </div>
              </div>
            ) : aval.montoAsignado == null ? (
              <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-8 text-center dark:border-gray-700 dark:bg-gray-800">
                <DollarSign className="mx-auto mb-3 h-12 w-12 text-gray-400" />
                <p className="text-gray-600 dark:text-gray-400">
                  No hay presupuesto registrado para este evento.
                </p>
              </div>
            ) : null}
          </section>
        )}

        {usesManualRequirements && (
          <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-2 text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
                  <DollarSign className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    Requerimientos / Rubros solicitados
                  </h2>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {isSoloResultado
                      ? "Agrega conceptos propios obligatoriamente sin costo monetario."
                      : "Edita los montos, elimina los que no apliquen o agrega rubros propios."}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Monto solicitado
                </p>
                <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  {formatCurrency(totalMontoSolicitado)}
                </p>
              </div>
            </div>

            {!isSoloResultado &&
              manualRequirements.length > 0 &&
              totalOriginalManual > 0 && (
              <div
                className={`mb-4 rounded-xl border px-3 py-2 text-xs ${
                  totalDifferenceManual < 0.01
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-950/40 dark:text-emerald-300"
                    : "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-300"
                }`}
              >
                <p>Total original: {formatCurrency(totalOriginalManual)}</p>
                <p>Total editado: {formatCurrency(totalMontoSolicitado)}</p>
                <p>Diferencia: {formatCurrency(totalDifferenceManual)}</p>
              </div>
            )}

            <div className="mb-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => addManualRequirement()}
                className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300"
              >
                <Plus className="h-4 w-4" />
                Concepto propio
              </button>
            </div>

            {manualRequirements.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-6 text-center dark:border-gray-700 dark:bg-gray-800">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  No hay requerimientos manuales agregados.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {manualRequirements.map((item, index) => {
                  const isEspecie =
                    isSoloResultado || item.tipoCobertura === "ESPECIE";
                  return (
                    <div
                      key={item.id}
                      className="overflow-hidden rounded-xl border border-gray-200 bg-gray-50/70 dark:border-gray-700 dark:bg-gray-800/60"
                    >
                      <div className="flex items-center justify-between gap-3 border-b border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-900/60">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                              isEspecie
                                ? "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                                : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                            }`}
                          >
                            {isEspecie ? "En especie" : "Propio"}
                          </span>
                          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                            {getDraftTitle(item, index)}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeManualRequirement(item.id)}
                          className="shrink-0 text-rose-500 hover:text-rose-600"
                          aria-label={`Eliminar requerimiento ${index + 1}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="space-y-3 p-4">
                        <div>
                          <label className="block">
                            <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                              Concepto
                            </span>
                            <input
                              type="text"
                              value={item.otroConcepto}
                              onChange={(e) =>
                                updateManualRequirement(
                                  item.id,
                                  "otroConcepto",
                                  e.target.value,
                                )
                              }
                              placeholder="Ej: Pesas, uniformes, fisioterapeuta..."
                              className="form-input mt-1 w-full border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900"
                            />
                          </label>
                          {isSoloResultado ? (
                            <p className="mt-2 text-xs font-medium text-amber-700 dark:text-amber-300">
                              Sin costo monetario
                            </p>
                          ) : (
                            <label className="mt-2 flex cursor-pointer items-center gap-2">
                              <input
                                type="checkbox"
                                checked={isEspecie}
                                onChange={() => toggleEspecie(item.id)}
                                className="rounded border-gray-300 dark:border-gray-600"
                              />
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                Sin costo monetario
                              </span>
                            </label>
                          )}
                        </div>

                        <label className="block w-full">
                          <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                            Detalle{" "}
                            <span className="font-normal text-gray-400">(opcional)</span>
                          </span>
                          <input
                            type="text"
                            maxLength={500}
                            value={item.detalle}
                            onChange={(e) =>
                              updateManualRequirement(item.id, "detalle", e.target.value)
                            }
                            className="form-input mt-1 w-full border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900"
                          />
                        </label>

                        <div className="flex flex-wrap items-end gap-3">
                          <label className="block w-24 shrink-0">
                            <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                              Cantidad
                            </span>
                            <input
                              type="text"
                              inputMode="decimal"
                              value={item.cantidad}
                              onChange={(e) =>
                                updateManualRequirement(
                                  item.id,
                                  "cantidad",
                                  e.target.value
                                    .replace(/[^0-9.,]/g, "")
                                    .replace(",", "."),
                                )
                              }
                              placeholder="1"
                              className="form-input mt-1 w-full border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900"
                            />
                          </label>

                          <label className="block min-w-35 flex-1">
                            <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                              Monto solicitado
                            </span>
                            <input
                              type="text"
                              inputMode="decimal"
                              value={item.montoSolicitado}
                              disabled={isEspecie}
                              onChange={(e) =>
                                updateManualRequirement(
                                  item.id,
                                  "montoSolicitado",
                                  e.target.value
                                    .replace(/[^0-9.,]/g, "")
                                    .replace(",", "."),
                                )
                              }
                              placeholder="0.00"
                              className={`form-input mt-1 w-full border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900 ${isEspecie ? "cursor-not-allowed opacity-50" : ""}`}
                            />
                          </label>

                          <div className="shrink-0 text-right">
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              Total del rubro
                            </p>
                            <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                              {formatCurrency(getDraftSubtotal(item))}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-2 text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
                <Paperclip className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  Documentos adjuntos a la solicitud
                </h2>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Subi uno o varios archivos de respaldo opcionales para
                  complementar esta solicitud.
                </p>
              </div>
            </div>
            <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-300">
              {adjuntosSolicitud.length}/{MAX_ADJUNTOS_SOLICITUD}
            </span>
          </div>
          <input
            type="file"
            multiple
            onChange={handleAdjuntosSolicitudChange}
            disabled={adjuntosSolicitud.length >= MAX_ADJUNTOS_SOLICITUD}
            className="form-input w-full border-gray-200 bg-white file:mr-3 file:rounded-md file:border-0 file:bg-gray-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-gray-700 hover:file:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed dark:border-gray-700 dark:bg-gray-950 dark:file:bg-gray-800 dark:file:text-gray-200"
          />
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            Podes adjuntar hasta {MAX_ADJUNTOS_SOLICITUD} archivos de respaldo
            para esta solicitud.
          </p>
          {adjuntosWarning && (
            <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
              {adjuntosWarning}
            </p>
          )}
          {adjuntosSolicitud.length > 0 && (
            <ul className="mt-3 space-y-2">
              {adjuntosSolicitud.map((archivo, index) => (
                <li
                  key={`${archivo.name}_${archivo.size}_${index}`}
                  className="flex items-start justify-between gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-gray-900 dark:text-gray-100">
                      {archivo.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {formatBytes(archivo.size)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveAdjunto(index)}
                    className="shrink-0 text-gray-400 hover:text-rose-600 dark:hover:text-rose-400"
                    aria-label={`Quitar ${archivo.name}`}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/*
        <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <div className="mb-3 flex items-start gap-3">
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-2 text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
              <Hash className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                Número de la solicitud
              </h2>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Número identificador de la solicitud (ej: 001, 002, etc.)
              </p>
            </div>
          </div>
          <input
            type="text"
            value={numeroAval}
            onChange={(e) => setNumeroAval(e.target.value)}
            placeholder="001"
            className="form-input w-full border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900"
          />
        </section>
        */}

        {/* Observaciones generales */}
        <section className="rounded-xl border border-dashed border-gray-200 bg-gray-50/60 p-4 dark:border-gray-700 dark:bg-gray-800/60">
          <div className="mb-3 flex items-start gap-3">
            <div className="rounded-lg border border-gray-200 bg-white p-2 text-gray-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                Observaciones generales
              </h2>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Usa este espacio para escribir notas o contexto adicional que no
                dependa de un archivo adjunto.
              </p>
            </div>
          </div>
          <textarea
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
            placeholder="Información adicional relevante para el aval..."
            rows={4}
            className="form-textarea w-full border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900"
          />
        </section>

        {/* Error message */}
        {error && (
          <div className="bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 text-sm rounded-lg px-4 py-3">
            <p>{error}</p>
            {createdAvalIdWithError && (
              <a
                href={`/avales/${createdAvalIdWithError}`}
                className="mt-2 inline-flex items-center gap-2 font-medium underline"
              >
                Ir al detalle del aval creado
              </a>
            )}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={onBack}
            disabled={submitting}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 disabled:opacity-50"
          >
            ← Anterior
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="btn bg-green-500 hover:bg-green-600 text-white disabled:opacity-50"
          >
            {submitting ? submittingLabel : submitLabel}
          </button>
        </div>
      </form>
    </div>
  );
}
