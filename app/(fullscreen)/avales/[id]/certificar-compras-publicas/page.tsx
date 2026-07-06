"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Trash2 } from "lucide-react";

import { useApprovalFlow } from "@/lib/hooks/use-approval-flow";
import {
  aprobarAval,
  adminSaveComprasPublicas,
  createComprasPublicas,
  getAval,
} from "@/lib/api/avales";
import type { Aval } from "@/types/aval";
import {
  ListaDeportistasPreview,
  SolicitudAvalPreview,
  type AvalPreviewFormData,
} from "@/app/(app)/avales/_components/aval-document-preview";
import ComprasPublicasPreview, {
  type ComprasPublicasDraft,
} from "@/app/(app)/avales/_components/compras-publicas-preview";
import PresupuestoSalidaAnticipoPreview from "@/app/(app)/avales/_components/presupuesto-salida-anticipo-preview";
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
import AvalDocumentosSection from "@/app/(app)/avales/_components/aval-documentos-section";
import { avalFlowDebugLog, summarizeAval } from "@/lib/debug/aval-flow";

function getTodayInputDate() {
  return new Date().toISOString().slice(0, 10);
}

const INITIAL_DRAFT: ComprasPublicasDraft = {
  numeroCertificado: "",
  realizoProceso: null,
  codigos: [],
  nombreFirmante: "",
  cargoFirmante: "",
  fechaEmision: getTodayInputDate(),
};

const EMPTY_CODIGO_ROW = { codigo: "", descripcion: "" };

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
          .trim() || item.entrenadorNombre || `Entrenador ${item.id}`
      ).toUpperCase();
      return { id: item.entrenadorId ?? item.entrenador?.id ?? item.id, nombre };
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

function normalizeComprasDraft(
  value: Partial<ComprasPublicasDraft> | null | undefined,
): ComprasPublicasDraft {
  return {
    numeroCertificado: value?.numeroCertificado ?? INITIAL_DRAFT.numeroCertificado,
    realizoProceso:
      typeof value?.realizoProceso === "boolean" ? value.realizoProceso : null,
    codigos: Array.isArray(value?.codigos)
      ? value.codigos.map((item) => ({
          codigo: item?.codigo ?? "",
          descripcion: item?.descripcion ?? "",
        }))
      : [],
    nombreFirmante: value?.nombreFirmante ?? INITIAL_DRAFT.nombreFirmante,
    cargoFirmante: value?.cargoFirmante ?? INITIAL_DRAFT.cargoFirmante,
    fechaEmision: value?.fechaEmision ?? INITIAL_DRAFT.fechaEmision,
  };
}

function validateComprasDraft(
  draft: ComprasPublicasDraft,
  codigos: Array<{ codigo: string; descripcion: string }>,
) {
  if (typeof draft.realizoProceso !== "boolean") {
    return "Debes indicar si se realizó o no el proceso de contratación pública.";
  }

  if (draft.realizoProceso) {
    if (codigos.length === 0) {
      return "Debes ingresar al menos un código de necesidad.";
    }

    const invalidRow = codigos.find(
      (item) => !item.codigo.trim() || !item.descripcion.trim(),
    );

    if (invalidRow) {
      return "Cada código de necesidad debe tener código y descripción.";
    }
  }

  return null;
}

export default function CertificarComprasPublicasPage() {
  const params = useParams();
  const router = useRouter();
  const avalId = Number(params.id);

  const [draft, setDraft] = useState<ComprasPublicasDraft>(INITIAL_DRAFT);
  const [sumilla, setSumilla] = useState("Se emite el certificado y se adjunta la Resolución ");
  const [draftRestoredAt, setDraftRestoredAt] = useState<Date | null>(null);
  const [draftToastVisible, setDraftToastVisible] = useState(false);
  const [forceEdit, setForceEdit] = useState(false);
  const [forceEditLoading, setForceEditLoading] = useState(false);

  // Ref so onApproveAction/onRejectSuccess can call autosave.clear()
  // without creating a circular dependency (autosave needs isEditable from hook)
  const autosaveRef = useRef<{ clear: () => void }>({ clear: () => {} });
  const draftCodigos = draft.codigos ?? [];

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
    adminSaveOnly,
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
      if (!sumilla.trim()) {
        return "Debes completar la sumilla indicando la resolución adjunta.";
      }
      return validateComprasDraft(draft, draftCodigos);
    }, [sumilla, draft.realizoProceso, draftCodigos]),
    onApproveAction: useCallback(
      async ({ aval: a, userId, approvalEtapa, adminSaveOnly }) => {
        const requiresContratacion = draft.realizoProceso === true;
        const payload = {
          numeroCertificado: draft.numeroCertificado?.trim() || undefined,
          realizoProceso:
            typeof draft.realizoProceso === "boolean" ? draft.realizoProceso : undefined,
          codigos: requiresContratacion
            ? draftCodigos
                .map((item) => ({
                  codigo: item.codigo.trim(),
                  descripcion: item.descripcion.trim(),
                }))
                .filter((item) => item.codigo && item.descripcion)
            : undefined,
          nombreFirmante: draft.nombreFirmante?.trim() || undefined,
          cargoFirmante: draft.cargoFirmante?.trim() || undefined,
        };

        avalFlowDebugLog("compras-publicas", "payload de aprobacion listo", {
          aval: summarizeAval(a),
          userId,
          payload,
        });

        if (adminSaveOnly) {
          await adminSaveComprasPublicas(a.id, userId, payload, approvalEtapa);
        } else {
          await createComprasPublicas(a.id, payload);
          // Refresh aval to get updated etapa after creating compras
          const refreshed = await getAval(a.id);
          const refreshedEtapa = getAvalCurrentEtapa(refreshed.data);
          const nextEtapa = getNextApprovalStageForAval(
            refreshed.data,
            refreshedEtapa,
          );
          const resolvedEtapa = nextEtapa ?? refreshedEtapa;
          await aprobarAval(a.id, userId, resolvedEtapa, { comentario: sumilla });
        }
        autosaveRef.current.clear();
      },
      [draft, sumilla, autosaveRef],
    ),
    onRejectSuccess: useCallback(() => { autosaveRef.current.clear(); }, [autosaveRef]),
    approveSuccessMessage: "Certificación de Compras Públicas registrada correctamente.",
    rejectSuccessMessage: "Aval rechazado correctamente.",
  });

  const effectiveEditable = isEditable || forceEdit;

  const { config: formConfig } = useAvalFormConfig(aval);
  const comprasSection = getSectionConfig(formConfig, "COMPRAS_PUBLICAS");
  const approveAction = getActionConfig(formConfig, "APROBAR");
  const rejectAction = getActionConfig(formConfig, "RECHAZAR");

  // Autosave desactivado para este paso — patrón disponible en otros pasos
  const autosave = useAutosaveDraft<ComprasPublicasDraft>({
    key: `aval:${avalId}:compras-publicas`,
    state: draft,
    enabled: false,
    userId: user?.id,
  });

  // Keep ref in sync so callbacks can access current autosave.clear()
  // useEffect(() => { autosaveRef.current = autosave; }, [autosave]);

  // Reset local state on aval navigation
  useEffect(() => {
    setDraft(INITIAL_DRAFT);
    setForceEdit(false);
  }, [avalId]);

  // Restore autosave draft cuando entra en modo editable (desactivado)
  // useEffect(() => {
  //   if (!isEditable) return;
  //   if (!Number.isFinite(avalId)) return;
  //   const restored = autosave.restore();
  //   if (restored) {
  //     setDraft(normalizeComprasDraft(restored.state));
  //     setDraftRestoredAt(restored.savedAt);
  //     setDraftToastVisible(true);
  //   }
  // }, [isEditable, avalId]);


  // Populate draft (incluye firmante) desde Compras Publicas guardado.
  // Preserva el firmante original si ya hay uno. Si no, cae al usuario
  // actual (defaultSigner*) para que el PDA aprobando por primera vez se
  // autocomplete. Evita el bug de que un admin editando pise al firmante.
  useEffect(() => {
    if (!aval) return;
    const compras = aval.comprasPublicas;
    setDraft((prev) => ({
      ...normalizeComprasDraft(prev),
      numeroCertificado: compras?.numeroCertificado ?? prev.numeroCertificado,
      realizoProceso:
        typeof compras?.realizoProceso === "boolean"
          ? compras.realizoProceso
          : prev.realizoProceso,
      codigos:
        compras?.codigos?.length
          ? compras.codigos.map((item) => ({
              codigo: item.codigo ?? "",
              descripcion: item.descripcion ?? "",
            }))
          : prev.codigos,
      nombreFirmante:
        compras?.nombreFirmante ||
        prev.nombreFirmante ||
        defaultSignerName ||
        "",
      cargoFirmante:
        compras?.cargoFirmante ||
        prev.cargoFirmante ||
        defaultSignerCargo ||
        "",
      fechaEmision: toInputDate(compras?.fechaEmision) || prev.fechaEmision,
    }));
  }, [aval, defaultSignerName, defaultSignerCargo]);

  // const handleDiscardDraft = useCallback(() => {
  //   autosave.clear();
  //   setDraft(INITIAL_DRAFT);
  //   setDraftToastVisible(false);
  // }, [autosave]);

  const handleAdminSave = useCallback(async () => {
    if (!aval) return;
    const validationError = validateComprasDraft(draft, draftCodigos);
    if (validationError) {
      setToast({ variant: "error", message: validationError });
      return;
    }
    const requiresContratacion = draft.realizoProceso === true;
    const payload = {
      numeroCertificado: draft.numeroCertificado?.trim() || undefined,
      realizoProceso: typeof draft.realizoProceso === "boolean" ? draft.realizoProceso : undefined,
      codigos: requiresContratacion
        ? draftCodigos
            .map((item) => ({ codigo: item.codigo.trim(), descripcion: item.descripcion.trim() }))
            .filter((item) => item.codigo && item.descripcion)
        : undefined,
      nombreFirmante: draft.nombreFirmante?.trim() || undefined,
      cargoFirmante: draft.cargoFirmante?.trim() || undefined,
    };
    setForceEditLoading(true);
    try {
      await createComprasPublicas(aval.id, payload);
      setForceEdit(false);
      setToast({ variant: "success", message: "Cambios guardados correctamente." });
    } catch (err) {
      setToast({ variant: "error", message: err instanceof Error ? err.message : "No se pudo guardar." });
    } finally {
      setForceEditLoading(false);
    }
  }, [aval, draft, draftCodigos, setToast]);

  const handleCodigoChange = useCallback(
    (index: number, field: "codigo" | "descripcion", value: string) => {
      setDraft((prev) => ({
        ...prev,
        codigos: (prev.codigos ?? []).map((item, itemIndex) =>
          itemIndex === index ? { ...item, [field]: value } : item,
        ),
      }));
    },
    [],
  );

  const handleAddCodigo = useCallback(() => {
    setDraft((prev) => ({
      ...prev,
      codigos: [...(prev.codigos ?? []), { ...EMPTY_CODIGO_ROW }],
    }));
  }, []);

  const handleRemoveCodigo = useCallback((index: number) => {
    setDraft((prev) => ({
      ...prev,
      codigos: (prev.codigos ?? []).filter((_, itemIndex) => itemIndex !== index),
    }));
  }, []);

  const requiresContratacionData = draft.realizoProceso === true;

  const trainerDocsData = useMemo(
    () => (aval ? buildTrainerDocsData(aval) : EMPTY_DOCS_DATA),
    [aval],
  );
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
      {/* DraftRestoredToast desactivado para este paso
      <DraftRestoredToast
        visible={draftToastVisible}
        savedAt={draftRestoredAt}
        onDiscard={handleDiscardDraft}
        onDismiss={() => setDraftToastVisible(false)}
      /> */}
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
                {/* SaveIndicator desactivado para este paso
                {isEditable && (
                  <SaveIndicator
                    status={autosave.status}
                    lastSavedAt={autosave.lastSavedAt}
                    className="mt-2 shrink-0"
                  />
                )} */}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* <label className="block">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Fecha de emisión
                  </span>
                  <input
                    type="date"
                    className="form-input w-full mt-1"
                    value={draft.fechaEmision}
                    readOnly={!effectiveEditable}
                    disabled={!effectiveEditable}
                    onChange={(e) =>
                      setDraft((prev) => ({ ...prev, fechaEmision: e.target.value }))
                    }
                  />
                </label> */}

                <div className="md:col-span-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    ¿Se realizó proceso de contratación pública?
                  </span>
                  <div className="mt-2 flex items-center gap-4">
                    <label className="inline-flex items-center gap-2 text-sm">
                      <input
                        type="radio"
                        className="form-radio"
                        name="realizoProceso"
                        checked={draft.realizoProceso === true}
                        disabled={!effectiveEditable}
                        onChange={() =>
                          setDraft((prev) => ({
                            ...prev,
                            realizoProceso: true,
                            codigos:
                              (prev.codigos ?? []).length > 0
                                ? (prev.codigos ?? [])
                                : [{ ...EMPTY_CODIGO_ROW }],
                          }))
                        }
                      />
                      Sí
                    </label>
                    <label className="inline-flex items-center gap-2 text-sm">
                      <input
                        type="radio"
                        className="form-radio"
                        name="realizoProceso"
                        checked={draft.realizoProceso === false}
                        disabled={!effectiveEditable}
                        onChange={() =>
                          setDraft((prev) => ({
                            ...prev,
                            realizoProceso: false,
                            codigos: [],
                          }))
                        }
                      />
                      No
                    </label>
                  </div>
                </div>

                <div className="block md:col-span-2">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Códigos de necesidad
                    </span>
                    {effectiveEditable && requiresContratacionData && (
                      <button
                        type="button"
                        onClick={handleAddCodigo}
                        className="text-xs font-medium text-cyan-600 hover:text-cyan-700 dark:text-cyan-400 dark:hover:text-cyan-300"
                      >
                        + Agregar código
                      </button>
                    )}
                  </div>

                  <div className="mt-2 space-y-3">
                    {requiresContratacionData && draftCodigos.length === 0 ? (
                      <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-300">
                        Debes agregar al menos un código.
                      </div>
                    ) : null}

                    {draftCodigos.map((item, index) => (
                      <div
                        key={`codigo-${index}`}
                        className="grid grid-cols-1 gap-3 rounded-xl border border-gray-200 p-3 dark:border-gray-700 md:grid-cols-[200px_minmax(0,1fr)_44px]"
                      >
                        <input
                          className="form-input w-full"
                          value={item.codigo}
                          required={requiresContratacionData}
                          readOnly={!effectiveEditable || !requiresContratacionData}
                          disabled={!effectiveEditable || !requiresContratacionData}
                          onChange={(e) =>
                            handleCodigoChange(index, "codigo", e.target.value)
                          }
                          placeholder="Código"
                        />
                        <textarea
                          className="form-textarea w-full min-h-[88px] resize-y"
                          rows={3}
                          value={item.descripcion}
                          required={requiresContratacionData}
                          readOnly={!effectiveEditable || !requiresContratacionData}
                          disabled={!effectiveEditable || !requiresContratacionData}
                          onChange={(e) =>
                            handleCodigoChange(index, "descripcion", e.target.value)
                          }
                          placeholder="Descripción"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveCodigo(index)}
                          disabled={!effectiveEditable || !requiresContratacionData}
                          className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-rose-200 text-rose-500 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-rose-900/60 dark:hover:bg-rose-950/30"
                          aria-label={`Eliminar código ${index + 1}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <label className="block md:col-span-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Nombre firmante
                  </span>
                  <input
                    className="form-input w-full mt-1"
                    value={draft.nombreFirmante}
                    readOnly={!effectiveEditable}
                    disabled={!effectiveEditable}
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
                    readOnly={!effectiveEditable}
                    disabled={!effectiveEditable}
                    onChange={(e) =>
                      setDraft((prev) => ({ ...prev, cargoFirmante: e.target.value }))
                    }
                    placeholder="Ej: Encargada de Compras Públicas de FDPL"
                  />
                </label>
              </div>

              {(isEditable || forceEdit) && (comprasSection?.visible ?? true) && (
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
                      Sumilla
                    </span>
                    <textarea
                      className="form-textarea w-full mt-1 text-sm"
                      rows={2}
                      value={sumilla}
                      onChange={(e) => setSumilla(e.target.value)}
                      placeholder="Ej: Se emite el certificado y se adjunta la Resolución FDPL-2026-001"
                    />
                  </label>

                  {!adminSaveOnly && (
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
                  )}

                  {!adminSaveOnly &&
                    getPreviousApprovalStagesForAval(aval, currentEtapa).length >
                      0 && (
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
                          {getPreviousApprovalStagesForAval(
                            aval,
                            currentEtapa,
                          ).map((e) => (
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
                    {forceEdit ? (
                      <>
                        <button
                          type="button"
                          onClick={() => setForceEdit(false)}
                          disabled={forceEditLoading}
                          className="btn border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={handleAdminSave}
                          disabled={forceEditLoading}
                          className="btn bg-amber-500 hover:bg-amber-600 text-white disabled:opacity-50"
                        >
                          {forceEditLoading ? "Guardando..." : "Guardar cambios"}
                        </button>
                      </>
                    ) : (
                      <>
                        {!adminSaveOnly && (rejectAction?.visible ?? true) && (
                          <button
                            type="button"
                            onClick={handleReject}
                            disabled={actionLoading || !(rejectAction?.enabled ?? true)}
                            className="btn bg-rose-500 hover:bg-rose-600 text-white disabled:opacity-50"
                          >
                            Rechazar
                          </button>
                        )}
                        {(adminSaveOnly ? true : (approveAction?.visible ?? true)) && (
                          <button
                            type="button"
                            onClick={handleApprove}
                            disabled={actionLoading || !(adminSaveOnly ? true : (approveAction?.enabled ?? true))}
                            className={`btn text-white disabled:opacity-50 ${
                              adminSaveOnly
                                ? "bg-amber-500 hover:bg-amber-600"
                                : "bg-emerald-500 hover:bg-emerald-600"
                            }`}
                          >
                            {adminSaveOnly ? "Guardar (admin)" : "Aprobar"}
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}
              {!isEditable && !forceEdit && aval?.comprasPublicas && (
                <div className="rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 p-4 text-sm text-emerald-700 dark:text-emerald-300 flex items-center justify-between gap-3">
                  <span>Este aval ya fue certificado por Compras Públicas.</span>
                  <button
                    type="button"
                    onClick={() => setForceEdit(true)}
                    className="shrink-0 rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:bg-gray-900 dark:text-emerald-300 dark:hover:bg-emerald-950/30"
                  >
                    Editar
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="w-full lg:w-1/2 bg-slate-100 dark:bg-slate-900 overflow-y-auto">
        <div className="p-6 xl:p-8">
          <div className="space-y-6">
            <AvalDocumentosSection aval={aval} />
            <PreviewCollapsible title="Lista deportistas">
              <ListaDeportistasPreview aval={aval} formData={trainerDocsData} />
            </PreviewCollapsible>
            <PreviewCollapsible title="Solicitud aval">
              <SolicitudAvalPreview aval={aval} formData={trainerDocsData} />
            </PreviewCollapsible>
            <PreviewCollapsible title="Presupuesto de salida">
              <PresupuestoSalidaAnticipoPreview aval={aval} />
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
