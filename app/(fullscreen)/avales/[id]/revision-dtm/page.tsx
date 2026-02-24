"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";

import { useAuth } from "@/app/providers/auth-provider";
import { aprobarAval, createRevisionDtm, getAval, getRevisionMetodologoItems, rechazarAval } from "@/lib/api/avales";
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
import RevisionMetodologoPreview, {
  type ReviewItem,
  type ReviewStateItem,
} from "@/app/(app)/avales/_components/revision-metodologo-preview";
import AlertBanner from "@/components/ui/alert-banner";
import { getApprovalStageLabel, getNextApprovalStage, getPreviousApprovalStages } from "@/lib/constants";
import { getCurrentEtapa } from "@/lib/utils/aval-historial";
import {
  DEFAULT_REVIEW_ITEMS,
  mergeReviewStateFromApi,
  normalizeReviewItems,
} from "@/app/(app)/avales/_components/revision-metodologo-config";

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

const EMPTY_COMPRAS_DRAFT: ComprasPublicasDraft = {
  numeroCertificado: "",
  realizoProceso: null,
  codigoNecesidad: "",
  objetoContratacion: "",
  nombreFirmante: "",
  cargoFirmante: "",
  fechaEmision: "",
};

const INITIAL_DTM_DRAFT = {
  descripcion: "",
  observacion: "",
  fechaPresentacion: new Date().toISOString().slice(0, 10),
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

export default function RevisionDtmPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const avalId = Number(params.id);

  const [aval, setAval] = useState<Aval | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    variant: "success" | "error";
    message: string;
  } | null>(null);
  const [rechazoMotivo, setRechazoMotivo] = useState("");
  const [etapaDestino, setEtapaDestino] = useState("");
  const [draft, setDraft] = useState(INITIAL_DTM_DRAFT);
  const [reviewItems, setReviewItems] = useState<ReviewItem[]>(
    DEFAULT_REVIEW_ITEMS,
  );
  const [reviewState, setReviewState] = useState<Record<string, ReviewStateItem>>(
    {},
  );

  const isDtm = user?.roles?.includes("DTM") ?? false;

  useEffect(() => {
    setDraft(INITIAL_DTM_DRAFT);
    setActionError(null);
  }, [avalId]);

  useEffect(() => {
    let active = true;

    async function loadReviewItems() {
      try {
        const response = await getRevisionMetodologoItems();
        if (!active) return;
        const normalized = normalizeReviewItems(
          Array.isArray(response.data) ? response.data : [],
        );
        setReviewItems(normalized.length ? normalized : DEFAULT_REVIEW_ITEMS);
      } catch {
        if (!active) return;
        setReviewItems(DEFAULT_REVIEW_ITEMS);
      }
    }

    void loadReviewItems();
    return () => {
      active = false;
    };
  }, []);

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
  const comprasDraft = useMemo(() => {
    if (!aval?.comprasPublicas) return EMPTY_COMPRAS_DRAFT;
    const compras = aval.comprasPublicas;
    return {
      numeroCertificado: compras.numeroCertificado ?? "",
      realizoProceso:
        typeof compras.realizoProceso === "boolean"
          ? compras.realizoProceso
          : null,
      codigoNecesidad: compras.codigoNecesidad ?? "",
      objetoContratacion: compras.objetoContratacion ?? "",
      nombreFirmante: compras.nombreFirmante ?? "",
      cargoFirmante: compras.cargoFirmante ?? "",
      fechaEmision: compras.fechaEmision ?? "",
    };
  }, [aval]);

  useEffect(() => {
    if (!aval) return;
    setReviewState(
      mergeReviewStateFromApi(
        reviewItems,
        aval.revisionMetodologo?.items ?? [],
      ),
    );
  }, [aval, reviewItems]);

  const revisionHeader = useMemo(
    () => ({
      numeroRevision: aval?.revisionMetodologo?.numeroRevision ?? "",
      dirigidoA: aval?.revisionMetodologo?.dirigidoA ?? "",
      cargoDirigidoA: aval?.revisionMetodologo?.cargoDirigidoA ?? "",
      descripcionEncabezado:
        aval?.revisionMetodologo?.descripcionEncabezado ?? "",
      fechaRevision: aval?.revisionMetodologo?.fechaRevision ?? "",
    }),
    [aval],
  );

  const revisionFooter = useMemo(
    () => ({
      observacionesFinales:
        aval?.revisionMetodologo?.observacionesFinales ?? "",
      firmanteNombre: aval?.revisionMetodologo?.firmanteNombre ?? "",
      firmanteCargo: aval?.revisionMetodologo?.firmanteCargo ?? "",
    }),
    [aval],
  );

  const handleSave = useCallback(async () => {
    if (!aval) return;
    if (!user?.id) {
      setActionError("No se pudo identificar el usuario.");
      return;
    }
    if (!draft.descripcion.trim()) {
      setActionError("La descripción es obligatoria.");
      return;
    }

    setActionError(null);
    setActionLoading(true);
    try {
      await createRevisionDtm(aval.id, {
        descripcion: draft.descripcion.trim(),
        observacion: draft.observacion.trim() || undefined,
        fechaPresentacion: draft.fechaPresentacion,
      });
      setToast({
        variant: "success",
        message: "Revisión DTM guardada correctamente.",
      });
      await loadAval();
    } catch (err: unknown) {
      setActionError(
        err instanceof Error ? err.message : "No se pudo guardar la revisión DTM.",
      );
    } finally {
      setActionLoading(false);
    }
  }, [aval, user?.id, draft, loadAval]);

  const etapaActual = (aval?.etapaActual ?? getCurrentEtapa(aval?.historial) ?? "SOLICITUD") as EtapaFlujo;
  const dtmEtapa: EtapaFlujo = "REVISION_DTM";
  const nextEtapa = getNextApprovalStage(dtmEtapa);
  const showApprovalPanel =
    isDtm &&
    aval?.estado === "SOLICITADO" &&
    etapaActual === "REVISION_METODOLOGO";
  const currentStageLabel = getApprovalStageLabel(dtmEtapa);
  const nextStageLabel = nextEtapa
    ? getApprovalStageLabel(nextEtapa)
    : currentStageLabel;

  const handleSaveAndApprove = useCallback(async () => {
    if (!aval) return;
    if (!user?.id) {
      setActionError("No se pudo identificar el usuario.");
      return;
    }
    if (!draft.descripcion.trim()) {
      setActionError("La descripción es obligatoria para aprobar.");
      return;
    }

    setActionError(null);
    setActionLoading(true);
    try {
      await aprobarAval(aval.id, user.id, "REVISION_DTM", undefined, {
        descripcion: draft.descripcion.trim(),
        observacion: draft.observacion.trim() || undefined,
        fechaPresentacion: draft.fechaPresentacion,
        items: [],
      });
      setToast({
        variant: "success",
        message: "Revisión DTM aprobada correctamente.",
      });
      await loadAval();
    } catch (err: unknown) {
      setActionError(
        err instanceof Error ? err.message : "No se pudo aprobar.",
      );
    } finally {
      setActionLoading(false);
    }
  }, [aval, user?.id, draft, loadAval]);

  const handleReject = useCallback(async () => {
    if (!aval) return;
    if (!user?.id) {
      setActionError("No se pudo identificar el usuario.");
      return;
    }
    if (!rechazoMotivo.trim()) {
      setActionError("Debes indicar un motivo para el rechazo.");
      return;
    }

    setActionError(null);
    setActionLoading(true);
    try {
      await rechazarAval(
        aval.id,
        user.id,
        "REVISION_DTM" as EtapaFlujo,
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
      setActionError(
        err instanceof Error ? err.message : "No se pudo rechazar el aval.",
      );
    } finally {
      setActionLoading(false);
    }
  }, [aval, user?.id, rechazoMotivo, etapaDestino, loadAval]);

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

  if (!isDtm) {
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
                  Revisión DTM
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Completa los datos para registrar la revisión del DTM.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <label className="block">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Fecha de presentación
                  </span>
                  <input
                    type="date"
                    className="form-input w-full mt-1"
                    value={draft.fechaPresentacion}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        fechaPresentacion: e.target.value,
                      }))
                    }
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Descripción
                  </span>
                  <textarea
                    className="form-textarea w-full mt-1"
                    rows={4}
                    value={draft.descripcion}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        descripcion: e.target.value,
                      }))
                    }
                    placeholder="Describe la revisión DTM..."
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Observación (opcional)
                  </span>
                  <textarea
                    className="form-textarea w-full mt-1"
                    rows={3}
                    value={draft.observacion}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        observacion: e.target.value,
                      }))
                    }
                    placeholder="Observaciones adicionales..."
                  />
                </label>
              </div>

              {showApprovalPanel && (
                <>
                  <label className="block">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
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

                  {getPreviousApprovalStages(dtmEtapa).length > 0 && (
                    <label className="block">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Regresar a etapa (opcional)
                      </span>
                      <select
                        className="form-select w-full mt-1 text-sm"
                        value={etapaDestino}
                        onChange={(e) => setEtapaDestino(e.target.value)}
                      >
                        <option value="">Etapa anterior (por defecto)</option>
                        {getPreviousApprovalStages(dtmEtapa).map((e) => (
                          <option key={e} value={e}>
                            {getApprovalStageLabel(e)}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                </>
              )}

              {actionError && (
                <div className="text-xs text-rose-600 dark:text-rose-400">
                  {actionError}
                </div>
              )}

              <div className="flex items-center justify-end gap-2">
                {showApprovalPanel && (
                  <button
                    type="button"
                    onClick={handleReject}
                    disabled={actionLoading}
                    className="btn bg-rose-500 hover:bg-rose-600 text-white disabled:opacity-50"
                  >
                    Rechazar
                  </button>
                )}
                <button
                  type="button"
                  onClick={showApprovalPanel ? handleSaveAndApprove : handleSave}
                  disabled={actionLoading}
                  className="btn bg-emerald-500 hover:bg-emerald-600 text-white disabled:opacity-50"
                >
                  {showApprovalPanel ? "Aprobar etapa" : "Guardar revisión DTM"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="hidden lg:block lg:w-1/2 bg-slate-100 dark:bg-slate-900 overflow-y-auto">
        <div className="p-6 xl:p-8">
          <div className="space-y-6">
            <SolicitudAvalPreview aval={aval} formData={trainerDocsData} />
            <ListaDeportistasPreview aval={aval} formData={trainerDocsData} />
            <PdaPreview aval={aval} draft={pdaDraft} />
            <ComprasPublicasPreview aval={aval} draft={comprasDraft} />
            <RevisionMetodologoPreview
              aval={aval}
              header={revisionHeader}
              footer={revisionFooter}
              reviewItems={reviewItems}
              reviewState={reviewState}
              useDefaultObservations={false}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
