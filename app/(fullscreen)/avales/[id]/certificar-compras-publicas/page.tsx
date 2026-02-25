"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";

import { useAuth } from "@/app/providers/auth-provider";
import {
  aprobarAval,
  createComprasPublicas,
  getAval,
  rechazarAval,
} from "@/lib/api/avales";
import type { Aval, EtapaFlujo } from "@/types/aval";
import {
  ListaDeportistasPreview,
  SolicitudAvalPreview,
  type AvalPreviewFormData,
} from "@/app/(app)/avales/_components/aval-document-preview";
import PdaPreview, { type PdaDraft } from "@/app/(app)/avales/_components/pda-preview";
import ComprasPublicasPreview, {
  type ComprasPublicasDraft,
} from "@/app/(app)/avales/_components/compras-publicas-preview";
import AlertBanner from "@/components/ui/alert-banner";
import { getCurrentEtapa } from "@/lib/utils/aval-historial";
import { formatRoles } from "@/lib/utils/formatters";
import { getApprovalStageLabel, getNextApprovalStage, getPreviousApprovalStages } from "@/lib/constants";

const INITIAL_DRAFT: ComprasPublicasDraft = {
  numeroCertificado: "",
  realizoProceso: null,
  codigoNecesidad: "",
  objetoContratacion: "",
  nombreFirmante: "",
  cargoFirmante: "",
  fechaEmision: new Date().toISOString().slice(0, 10),
};

const EMPTY_DOCS_DATA: AvalPreviewFormData = {
  deportistas: [],
  entrenadores: [],
  fechaHoraSalida: "",
  fechaHoraRetorno: "",
  lugarSalida: "",
  lugarRetorno: "",
  transporteSalida: "",
  transporteRetorno: "",
  objetivos: [],
  criterios: [],
  observaciones: "",
};

const EMPTY_PDA_DRAFT: PdaDraft = {
  descripcion: "",
  numeroPda: "",
  numeroAval: "",
  codigoActividad: "005",
  nombreFirmante: "",
  cargoFirmante: "",
};

function buildTrainerDocsData(aval: Aval): AvalPreviewFormData {
  const tecnico = aval.avalTecnico;

  const deportistas = (tecnico?.deportistasAval ?? []).map((item) => {
    const withExtras = item as typeof item & {
      observacion?: string | null;
      deportista: typeof item.deportista & { fechaNacimiento?: string | null };
    };

    return {
      id: item.deportista?.id ?? item.id,
      nombre: item.deportista?.nombre ?? `Deportista ${item.id}`,
      cedula: item.deportista?.cedula ?? undefined,
      fechaNacimiento: withExtras.deportista?.fechaNacimiento ?? undefined,
      observacion: withExtras.observacion ?? undefined,
      rol: item.rol ?? undefined,
    };
  });

  const entrenadores = [...(aval.entrenadores ?? [])]
    .sort((a, b) => Number(Boolean(b.esPrincipal)) - Number(Boolean(a.esPrincipal)))
    .map((item) => {
      const withUser = item as typeof item & {
        usuario?: { nombre?: string; apellido?: string };
        entrenador?: { nombre?: string; apellido?: string };
        nombre?: string;
        apellido?: string;
      };

      const nombre = (
        [
          withUser.entrenador?.nombre ?? withUser.usuario?.nombre ?? withUser.nombre,
          withUser.entrenador?.apellido ?? withUser.usuario?.apellido ?? withUser.apellido,
        ]
          .filter(Boolean)
          .join(" ")
          .trim() || `Entrenador ${item.entrenadorId}`
      ).toUpperCase();

      return {
        id: item.entrenadorId,
        nombre,
      };
    });

  return {
    deportistas,
    entrenadores,
    fechaHoraSalida: tecnico?.fechaHoraSalida ?? "",
    fechaHoraRetorno: tecnico?.fechaHoraRetorno ?? "",
    lugarSalida: tecnico?.lugarSalida ?? "",
    lugarRetorno: tecnico?.lugarRetorno ?? "",
    transporteSalida: tecnico?.transporteSalida ?? "",
    transporteRetorno: tecnico?.transporteRetorno ?? "",
    objetivos: [...(tecnico?.objetivos ?? [])]
      .sort((a, b) => a.orden - b.orden)
      .map((item) => item.descripcion),
    criterios: [...(tecnico?.criterios ?? [])]
      .sort((a, b) => a.orden - b.orden)
      .map((item) => item.descripcion),
    observaciones: tecnico?.observaciones ?? "",
  };
}

function toInputDate(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

export default function CertificarComprasPublicasPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const avalId = Number(params.id);

  const [aval, setAval] = useState<Aval | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [rechazoMotivo, setRechazoMotivo] = useState("");
  const [etapaDestino, setEtapaDestino] = useState("");
  const [toast, setToast] = useState<{
    variant: "success" | "error";
    message: string;
  } | null>(null);
  const [draft, setDraft] = useState<ComprasPublicasDraft>(INITIAL_DRAFT);

  const isComprasPublicas = user?.roles?.includes("COMPRAS_PUBLICAS") ?? false;
  const defaultSignerName = useMemo(() => {
    if (!user) return "";
    return [user.nombre, user.apellido].filter(Boolean).join(" ").trim();
  }, [user]);
  const defaultSignerCargo = useMemo(
    () => (user?.roles?.length ? formatRoles(user.roles) : ""),
    [user],
  );

  useEffect(() => {
    setDraft(INITIAL_DRAFT);
    setRechazoMotivo("");
    setActionError(null);
  }, [avalId]);

  const loadAval = useCallback(async () => {
    if (!avalId || Number.isNaN(avalId)) {
      setError("ID de aval inválido.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await getAval(avalId);
      setAval(response.data);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "No se pudo cargar el aval.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [avalId]);

  useEffect(() => {
    void loadAval();
  }, [loadAval]);

  useEffect(() => {
    if (!aval) return;
    const compras = aval.comprasPublicas;
    setDraft((prev) => ({
      ...prev,
      numeroCertificado: compras?.numeroCertificado ?? prev.numeroCertificado,
      realizoProceso:
        typeof compras?.realizoProceso === "boolean"
          ? compras.realizoProceso
          : prev.realizoProceso,
      codigoNecesidad: compras?.codigoNecesidad ?? prev.codigoNecesidad,
      objetoContratacion: compras?.objetoContratacion ?? prev.objetoContratacion,
      nombreFirmante: compras?.nombreFirmante ?? prev.nombreFirmante,
      cargoFirmante: compras?.cargoFirmante ?? prev.cargoFirmante,
      fechaEmision: toInputDate(compras?.fechaEmision) || prev.fechaEmision,
    }));
  }, [aval]);

  useEffect(() => {
    if (!user) return;
    setDraft((prev) => {
      const next = { ...prev };
      if (!prev.nombreFirmante?.trim() && defaultSignerName) {
        next.nombreFirmante = defaultSignerName;
      }
      if (!prev.cargoFirmante?.trim() && defaultSignerCargo) {
        next.cargoFirmante = defaultSignerCargo;
      }
      return next;
    });
  }, [user, defaultSignerName, defaultSignerCargo]);

  const trainerDocsData = useMemo(
    () => (aval ? buildTrainerDocsData(aval) : EMPTY_DOCS_DATA),
    [aval],
  );
  const pdaDraft = useMemo(() => {
    if (!aval?.pda) return EMPTY_PDA_DRAFT;
    const pda = aval.pda;
    return {
      descripcion: pda?.descripcion ?? "",
      numeroPda: pda?.numeroPda ?? "",
      numeroAval: pda?.numeroAval ?? "",
      codigoActividad: pda?.codigoActividad ?? "005",
      nombreFirmante: pda?.nombreFirmante ?? "",
      cargoFirmante: pda?.cargoFirmante ?? "",
    };
  }, [aval]);

  const etapaActualResponse = aval?.etapaActual;
  const etapaActualHistorial = getCurrentEtapa(aval?.historial);
  const currentEtapa = (etapaActualResponse ??
    etapaActualHistorial ??
    "SOLICITUD") as EtapaFlujo;
  const isEditable =
    aval?.estado === "SOLICITADO" &&
    currentEtapa === "PDA" &&
    !aval?.comprasPublicas;
  const approvalEtapa = getNextApprovalStage(currentEtapa) ?? currentEtapa;
  const summaryText =
    "Al aprobarlo quedará certificado por Compras Públicas y continuará el flujo.";

  const pushError = useCallback((message: string) => {
    setActionError(message);
    setToast({ variant: "error", message });
  }, []);

  const handleApprove = useCallback(async () => {
    if (!aval) return;
    if (!user?.id) {
      pushError("No se pudo identificar el usuario.");
      return;
    }
    if (!isEditable) {
      pushError("No puedes certificar este aval en la etapa actual.");
      return;
    }

    setActionError(null);
    setActionLoading(true);
    try {
      const payload = {
        numeroCertificado: draft.numeroCertificado?.trim() || undefined,
        realizoProceso:
          typeof draft.realizoProceso === "boolean"
            ? draft.realizoProceso
            : undefined,
        codigoNecesidad: draft.codigoNecesidad?.trim() || undefined,
        objetoContratacion: draft.objetoContratacion?.trim() || undefined,
        nombreFirmante: draft.nombreFirmante?.trim() || undefined,
        cargoFirmante: draft.cargoFirmante?.trim() || undefined,
        fechaEmision: draft.fechaEmision?.trim() || undefined,
      };

      await createComprasPublicas(aval.id, payload);
      const refreshed = await getAval(aval.id);
      setAval(refreshed.data);
      const refreshedEtapa =
        refreshed.data.etapaActual ??
        getCurrentEtapa(refreshed.data.historial) ??
        currentEtapa;
      const nextEtapa = getNextApprovalStage(refreshedEtapa);
      const resolvedApprovalEtapa = nextEtapa ?? refreshedEtapa;
      await aprobarAval(aval.id, user.id, resolvedApprovalEtapa);
      setToast({
        variant: "success",
        message: "Certificación de Compras Públicas registrada correctamente.",
      });
      await loadAval();
    } catch (err: unknown) {
      pushError(
        err instanceof Error
          ? err.message
          : "No se pudo certificar Compras Públicas.",
      );
    } finally {
      setActionLoading(false);
    }
  }, [aval, user?.id, loadAval, draft, isEditable, pushError]);

  const handleReject = useCallback(async () => {
    if (!aval) return;
    if (!user?.id) {
      pushError("No se pudo identificar el usuario.");
      return;
    }
    if (!isEditable) {
      pushError("No puedes rechazar este aval en la etapa actual.");
      return;
    }
    if (!rechazoMotivo.trim()) {
      pushError("Debes indicar un motivo para el rechazo.");
      return;
    }

    setActionError(null);
    setActionLoading(true);
    try {
      await rechazarAval(
        aval.id,
        user.id,
        currentEtapa,
        rechazoMotivo.trim(),
        etapaDestino ? (etapaDestino as EtapaFlujo) : undefined,
      );
      setToast({
        variant: "success",
        message: "Aval rechazado correctamente.",
      });
      setRechazoMotivo("");
      setEtapaDestino("");
      await loadAval();
    } catch (err: unknown) {
      pushError(
        err instanceof Error ? err.message : "No se pudo rechazar el aval.",
      );
    } finally {
      setActionLoading(false);
    }
  }, [aval, user?.id, rechazoMotivo, etapaDestino, currentEtapa, loadAval, isEditable, pushError]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-cyan-600" />
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Cargando sesión...
          </p>
        </div>
      </div>
    );
  }

  if (!isComprasPublicas) {
    return (
      <div className="px-6 py-8">
        <div className="bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-xl p-6 text-center">
          No tienes permisos para acceder a esta pantalla.
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-cyan-600" />
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Cargando información del aval...
          </p>
        </div>
      </div>
    );
  }

  if (error || !aval) {
    return (
      <div className="px-6 py-8">
        <div className="bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-xl p-6 text-center">
          {error || "No se encontró el aval."}
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex">
      {toast && (
        <div className="fixed top-4 right-4 z-50 max-w-sm w-full drop-shadow-lg">
          <AlertBanner
            variant={toast.variant}
            message={toast.message}
            onClose={() => setToast(null)}
          />
        </div>
      )}
      <div className="w-full lg:w-1/2 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800">
        <div className="h-full w-full overflow-y-auto">
          <div className="max-w-xl mx-auto px-6 sm:px-8 py-8">
            <button
              onClick={() => router.push("/avales")}
              className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 mb-6"
            >
              <ArrowLeft className="w-4 h-4" />
              Volver
            </button>

            <div className="space-y-5">
              <div>
                <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                  Certificado de Compras Públicas
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Completa los datos para emitir el certificado.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="block">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Fecha de emisión
                  </span>
                  <input
                    type="date"
                    className="form-input w-full mt-1"
                    value={draft.fechaEmision}
                    readOnly={!isEditable}
                    disabled={!isEditable}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        fechaEmision: e.target.value,
                      }))
                    }
                  />
                </label>

                <div className="md:col-span-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    ¿Se realizó proceso de contratación pública?
                  </span>
                  <div className="mt-2 flex items-center gap-4">
                    <label className="inline-flex items-center gap-2 text-sm">
                      <input
                        type="radio"
                        className="form-radio"
                        checked={draft.realizoProceso === true}
                        disabled={!isEditable}
                        onChange={() =>
                          setDraft((prev) => ({
                            ...prev,
                            realizoProceso: true,
                          }))
                        }
                      />
                      Sí
                    </label>
                    <label className="inline-flex items-center gap-2 text-sm">
                      <input
                        type="radio"
                        className="form-radio"
                        checked={draft.realizoProceso === false}
                        disabled={!isEditable}
                        onChange={() =>
                          setDraft((prev) => ({
                            ...prev,
                            realizoProceso: false,
                          }))
                        }
                      />
                      No
                    </label>
                  </div>
                </div>

                <label className="block md:col-span-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Código de necesidad
                  </span>
                  <input
                    className="form-input w-full mt-1"
                    value={draft.codigoNecesidad}
                    readOnly={!isEditable}
                    disabled={!isEditable}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        codigoNecesidad: e.target.value,
                      }))
                    }
                    placeholder="Ej: CN-2026-001"
                  />
                </label>

                <label className="block md:col-span-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Objeto de contratación
                  </span>
                  <textarea
                    className="form-textarea w-full mt-1"
                    rows={3}
                    value={draft.objetoContratacion}
                    readOnly={!isEditable}
                    disabled={!isEditable}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        objetoContratacion: e.target.value,
                      }))
                    }
                    placeholder="Describe el objeto de contratación..."
                  />
                </label>

                <label className="block md:col-span-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Nombre firmante
                  </span>
                  <input
                    className="form-input w-full mt-1"
                    value={draft.nombreFirmante}
                    readOnly={!isEditable}
                    disabled={!isEditable}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        nombreFirmante: e.target.value,
                      }))
                    }
                    placeholder="Ej: Ing. Flor María Hualpa Palacios"
                  />
                </label>

                <label className="block md:col-span-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Cargo firmante
                  </span>
                  <input
                    className="form-input w-full mt-1"
                    value={draft.cargoFirmante}
                    readOnly={!isEditable}
                    disabled={!isEditable}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        cargoFirmante: e.target.value,
                      }))
                    }
                    placeholder="Ej: Encargada de Compras Públicas de FDPL"
                  />
                </label>
              </div>

              {isEditable && (
                <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/40 p-4 space-y-3">
                  <div>
                    <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      Certificación Compras Públicas
                    </h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {summaryText}
                    </p>
                  </div>

                  <label className="block">
                    <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                      Motivo de rechazo (si aplica)
                    </span>
                    <textarea
                      className="form-textarea w-full mt-1 text-sm"
                      rows={3}
                      value={rechazoMotivo}
                      onChange={(e) => setRechazoMotivo(e.target.value)}
                      placeholder="Escribe el motivo si vas a rechazar..."
                    />
                  </label>

                  {getPreviousApprovalStages(currentEtapa).length > 0 && (
                    <label className="block">
                      <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                        Regresar a etapa (opcional)
                      </span>
                      <select
                        className="form-select w-full mt-1 text-sm"
                        value={etapaDestino}
                        onChange={(e) => setEtapaDestino(e.target.value)}
                      >
                        <option value="">Etapa anterior (por defecto)</option>
                        {getPreviousApprovalStages(currentEtapa).map((e) => (
                          <option key={e} value={e}>
                            {getApprovalStageLabel(e)}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}

                  {actionError && (
                    <div className="text-xs text-rose-600 dark:text-rose-400">
                      {actionError}
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={handleReject}
                      disabled={actionLoading}
                      className="btn bg-rose-500 hover:bg-rose-600 text-white disabled:opacity-50"
                    >
                      Rechazar
                    </button>
                    <button
                      type="button"
                      onClick={handleApprove}
                      disabled={actionLoading}
                      className="btn bg-emerald-500 hover:bg-emerald-600 text-white disabled:opacity-50"
                    >
                      Aprobar
                    </button>
                  </div>
                </div>
              )}
              {!isEditable && aval?.comprasPublicas && (
                <div className="rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 p-4 text-sm text-emerald-700 dark:text-emerald-300">
                  Este aval ya fue certificado por Compras Públicas.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="w-full lg:w-1/2 bg-slate-100 dark:bg-slate-900 overflow-y-auto">
        <div className="p-6 xl:p-8">
          <div className="space-y-6">
            <ListaDeportistasPreview aval={aval} formData={trainerDocsData} />
            <SolicitudAvalPreview aval={aval} formData={trainerDocsData} />
            <PdaPreview aval={aval} draft={pdaDraft} />
            <ComprasPublicasPreview aval={aval} draft={draft} />
          </div>
        </div>
      </div>
    </div>
  );
}
