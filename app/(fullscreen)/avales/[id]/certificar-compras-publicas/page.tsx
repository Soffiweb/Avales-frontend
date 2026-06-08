"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";

import { useApprovalFlow } from "@/lib/hooks/use-approval-flow";
import {
  aprobarAval,
  createComprasPublicas,
  getAval,
} from "@/lib/api/avales";
import type { Aval } from "@/types/aval";
import {
  ListaDeportistasPreview,
  SolicitudAvalPreview,
  type AvalPreviewFormData,
} from "@/app/(app)/avales/_components/aval-document-preview";
import PdaPreview, { type PdaDraft } from "@/app/(app)/avales/_components/pda-preview";
import ComprasPublicasPreview, {
  type ComprasPublicasDraft,
} from "@/app/(app)/avales/_components/compras-publicas-preview";
import PreviewCollapsible from "@/app/(app)/avales/_components/preview-collapsible";
import AlertBanner from "@/components/ui/alert-banner";
import SaveIndicator from "@/components/ui/save-indicator";
import DraftRestoredToast from "@/components/ui/draft-restored-toast";
import { useAutosaveDraft } from "@/lib/hooks/use-autosave-draft";
import { getApprovalStageLabel } from "@/lib/constants";
import { isComprasPublicasUser } from "@/lib/auth/access";
import {
  getApprovalFlowStages,
  getAvalCurrentEtapa,
  getNextApprovalStageForAval,
  getPreviousApprovalStagesForAval,
} from "@/lib/approval-flow";
import { getActionConfig, getSectionConfig } from "@/lib/aval-form-config";
import { useAvalFormConfig } from "@/lib/hooks/use-aval-form-config";

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
      return { id: item.entrenadorId, nombre };
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
  const avalId = Number(params.id);

  const [draft, setDraft] = useState<ComprasPublicasDraft>(INITIAL_DRAFT);
  const [draftRestoredAt, setDraftRestoredAt] = useState<Date | null>(null);
  const [draftToastVisible, setDraftToastVisible] = useState(false);

  // Ref so onApproveAction/onRejectSuccess can call autosave.clear()
  // without creating a circular dependency (autosave needs isEditable from hook)
  const autosaveRef = useRef<{ clear: () => void }>({ clear: () => {} });

  const {
    authLoading,
    user,
    hasRequiredRole: isComprasPublicas,
    defaultSignerName,
    defaultSignerCargo,
    aval,
    loading,
    error,
    actionLoading,
    actionError,
    toast,
    setToast,
    rechazoMotivo,
    setRechazoMotivo,
    etapaDestino,
    setEtapaDestino,
    currentEtapa,
    isEditable,
    summaryText,
    handleApprove,
    handleReject,
  } = useApprovalFlow({
    avalId,
    requiredRole: isComprasPublicasUser,
    editableEtapa: (currentAval) =>
      getApprovalFlowStages(currentAval).includes("COMPRAS_PUBLICAS")
        ? "PDA"
        : "COMPRAS_PUBLICAS",
    approvalEtapa: (etapa, currentAval) =>
      getNextApprovalStageForAval(currentAval, etapa) ?? etapa,
    enableEtapaDestino: true,
    additionalEditableCheck: useCallback((a: Aval) => !a.comprasPublicas, []),
    validateApprove: useCallback((_currentAval: Aval) => {
      if (draft.realizoProceso === true) {
        if (!draft.codigoNecesidad?.trim()) {
          return "Debes ingresar el código de necesidad cuando sí existe proceso de contratación pública.";
        }
        if (!draft.objetoContratacion?.trim()) {
          return "Debes ingresar el objeto de contratación cuando sí existe proceso de contratación pública.";
        }
      }
      return null;
    }, [draft.realizoProceso, draft.codigoNecesidad, draft.objetoContratacion]),
    onApproveAction: useCallback(
      async ({ aval: a, userId }) => {
        const requiresContratacion = draft.realizoProceso === true;
        const payload = {
          numeroCertificado: draft.numeroCertificado?.trim() || undefined,
          realizoProceso:
            typeof draft.realizoProceso === "boolean" ? draft.realizoProceso : undefined,
          codigoNecesidad: requiresContratacion
            ? draft.codigoNecesidad?.trim() || undefined
            : undefined,
          objetoContratacion: requiresContratacion
            ? draft.objetoContratacion?.trim() || undefined
            : undefined,
          nombreFirmante: draft.nombreFirmante?.trim() || undefined,
          cargoFirmante: draft.cargoFirmante?.trim() || undefined,
          fechaEmision: draft.fechaEmision?.trim() || undefined,
        };

        await createComprasPublicas(a.id, payload);
        // Refresh aval to get updated etapa after creating compras
        const refreshed = await getAval(a.id);
        const refreshedEtapa = getAvalCurrentEtapa(refreshed.data);
        const nextEtapa = getNextApprovalStageForAval(refreshed.data, refreshedEtapa);
        const resolvedEtapa = nextEtapa ?? refreshedEtapa;
        await aprobarAval(a.id, userId, resolvedEtapa);
        autosaveRef.current.clear();
      },
      [draft, autosaveRef],
    ),
    onRejectSuccess: useCallback(() => { autosaveRef.current.clear(); }, [autosaveRef]),
    approveSuccessMessage: "Certificación de Compras Públicas registrada correctamente.",
    rejectSuccessMessage: "Aval rechazado correctamente.",
  });
  const { config: formConfig } = useAvalFormConfig(aval);
  const comprasSection = getSectionConfig(formConfig, "COMPRAS_PUBLICAS");
  const approveAction = getActionConfig(formConfig, "APROBAR");
  const rejectAction = getActionConfig(formConfig, "RECHAZAR");

  const autosave = useAutosaveDraft<ComprasPublicasDraft>({
    key: `aval:${avalId}:compras-publicas`,
    state: draft,
    enabled: isEditable && Number.isFinite(avalId),
    userId: user?.id,
  });

  // Keep ref in sync so callbacks can access current autosave.clear()
  useEffect(() => { autosaveRef.current = autosave; }, [autosave]);

  // Reset local state on aval navigation
  useEffect(() => {
    setDraft(INITIAL_DRAFT);
  }, [avalId]);

  // Restore autosave draft when entering editable state
  useEffect(() => {
    if (!isEditable) return;
    if (!Number.isFinite(avalId)) return;
    const restored = autosave.restore();
    if (restored) {
      setDraft(restored.state);
      setDraftRestoredAt(restored.savedAt);
      setDraftToastVisible(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditable, avalId]);

  // Populate draft from existing comprasPublicas data
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

  // Populate signer defaults from user
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

  const handleDiscardDraft = useCallback(() => {
    autosave.clear();
    setDraft(INITIAL_DRAFT);
    setDraftToastVisible(false);
  }, [autosave]);

  const requiresContratacionData = draft.realizoProceso === true;

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

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-cyan-600" />
          <p className="text-sm text-gray-600 dark:text-gray-400">Cargando sesión...</p>
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
      <DraftRestoredToast
        visible={draftToastVisible}
        savedAt={draftRestoredAt}
        onDiscard={handleDiscardDraft}
        onDismiss={() => setDraftToastVisible(false)}
      />
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
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                    Certificado de Compras Públicas
                  </h1>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Completa los datos para emitir el certificado.
                  </p>
                </div>
                {isEditable && (
                  <SaveIndicator
                    status={autosave.status}
                    lastSavedAt={autosave.lastSavedAt}
                    className="mt-2 shrink-0"
                  />
                )}
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
                      setDraft((prev) => ({ ...prev, fechaEmision: e.target.value }))
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
                          setDraft((prev) => ({ ...prev, realizoProceso: true }))
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
                            codigoNecesidad: "",
                            objetoContratacion: "",
                          }))
                        }
                      />
                      No
                    </label>
                  </div>
                </div>

                <label className="block md:col-span-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Código(s) de necesidad
                  </span>
                  <textarea
                    className="form-textarea w-full mt-1"
                    rows={2}
                    value={draft.codigoNecesidad}
                    readOnly={!isEditable || !requiresContratacionData}
                    disabled={!isEditable || !requiresContratacionData}
                    onChange={(e) =>
                      setDraft((prev) => ({ ...prev, codigoNecesidad: e.target.value }))
                    }
                    placeholder="Ej: CN-2026-001, CN-2026-002, CN-2026-003"
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Si existen varios códigos, sepáralos por coma y mantén el mismo orden de
                    sus descripciones.
                  </p>
                </label>

                <label className="block md:col-span-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Objeto(s) de contratación
                  </span>
                  <textarea
                    className="form-textarea w-full mt-1"
                    rows={4}
                    value={draft.objetoContratacion}
                    readOnly={!isEditable || !requiresContratacionData}
                    disabled={!isEditable || !requiresContratacionData}
                    onChange={(e) =>
                      setDraft((prev) => ({ ...prev, objetoContratacion: e.target.value }))
                    }
                    placeholder="Ej: Servicio A, Servicio B, Servicio C"
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Si ingresas varios objetos, sepáralos por coma y colócalos en el mismo
                    orden que los códigos de necesidad.
                  </p>
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
                      setDraft((prev) => ({ ...prev, nombreFirmante: e.target.value }))
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
                      setDraft((prev) => ({ ...prev, cargoFirmante: e.target.value }))
                    }
                    placeholder="Ej: Encargada de Compras Públicas de FDPL"
                  />
                </label>
              </div>

              {isEditable && (comprasSection?.visible ?? true) && (
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

                  {getPreviousApprovalStagesForAval(aval, currentEtapa).length > 0 && (
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
                        {getPreviousApprovalStagesForAval(aval, currentEtapa).map((e) => (
                          <option key={e} value={e}>
                            {getApprovalStageLabel(e)}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}

                  {actionError && (
                    <div className="text-xs text-rose-600 dark:text-rose-400">{actionError}</div>
                  )}

                  <div className="flex items-center justify-end gap-2">
                    {(rejectAction?.visible ?? true) && (
                      <button
                        type="button"
                        onClick={handleReject}
                        disabled={actionLoading || !(rejectAction?.enabled ?? true)}
                        className="btn bg-rose-500 hover:bg-rose-600 text-white disabled:opacity-50"
                      >
                        Rechazar
                      </button>
                    )}
                    {(approveAction?.visible ?? true) && (
                      <button
                        type="button"
                        onClick={handleApprove}
                        disabled={actionLoading || !(approveAction?.enabled ?? true)}
                        className="btn bg-emerald-500 hover:bg-emerald-600 text-white disabled:opacity-50"
                      >
                        Aprobar
                      </button>
                    )}
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
            <PreviewCollapsible title="Lista deportistas">
              <ListaDeportistasPreview aval={aval} formData={trainerDocsData} />
            </PreviewCollapsible>
            <PreviewCollapsible title="Solicitud aval">
              <SolicitudAvalPreview aval={aval} formData={trainerDocsData} />
            </PreviewCollapsible>
            <PreviewCollapsible title="Certificacion PDA">
              <PdaPreview aval={aval} draft={pdaDraft} />
            </PreviewCollapsible>
            <PreviewCollapsible title="Certificacion compras publicas" defaultOpen>
              <ComprasPublicasPreview aval={aval} draft={draft} />
            </PreviewCollapsible>
          </div>
        </div>
      </div>
    </div>
  );
}
