"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";

import { useAuth } from "@/app/providers/auth-provider";
import {
  aprobarAval,
  getAval,
  getRevisionMetodologoItems,
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
import RevisionMetodologoPreview, {
  type ReviewItem,
  type ReviewStateItem,
} from "@/app/(app)/avales/_components/revision-metodologo-preview";
import ApprovalFlowCard from "@/app/(app)/avales/_components/approval-flow-card";
import AlertBanner from "@/components/ui/alert-banner";
import { getCurrentEtapa } from "@/lib/utils/aval-historial";
import {
  getApprovalStageLabel,
  getNextApprovalStage,
} from "@/lib/constants";
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

export default function RevisionControlPrevioPage() {
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
  const [toast, setToast] = useState<{
    variant: "success" | "error";
    message: string;
  } | null>(null);
  const [reviewItems, setReviewItems] = useState<ReviewItem[]>(
    DEFAULT_REVIEW_ITEMS,
  );
  const [reviewState, setReviewState] = useState<Record<string, ReviewStateItem>>(
    {},
  );

  const isControlPrevio =
    user?.roles?.includes("CONTROL_PREVIO") ?? false;

  useEffect(() => {
    setActionError(null);
    setRechazoMotivo("");
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

  useEffect(() => {
    if (!aval) return;
    setReviewState(
      mergeReviewStateFromApi(
        reviewItems,
        aval.revisionMetodologo?.items ?? [],
      ),
    );
  }, [aval, reviewItems]);

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

  const etapaActualResponse = aval?.etapaActual;
  const etapaActualHistorial = getCurrentEtapa(aval?.historial);
  const currentEtapa = (etapaActualResponse ??
    etapaActualHistorial ??
    "SOLICITUD") as EtapaFlujo;
  const isEditable =
    aval?.estado === "SOLICITADO" &&
    currentEtapa === "REVISION_DTM";
  const approvalEtapa = getNextApprovalStage(currentEtapa) ?? currentEtapa;
  const showApprovalPanel = isControlPrevio && isEditable;

  const handleApprove = useCallback(async () => {
    if (!aval) return;
    if (!user?.id) {
      setActionError("No se pudo identificar el usuario.");
      return;
    }
    if (!showApprovalPanel) {
      setActionError("No puedes aprobar este aval en la etapa actual.");
      return;
    }

    setActionError(null);
    setActionLoading(true);
    try {
      await aprobarAval(aval.id, user.id, approvalEtapa);
      setToast({ variant: "success", message: "Aval aprobado correctamente." });
      await loadAval();
    } catch (err: unknown) {
      setActionError(
        err instanceof Error ? err.message : "No se pudo aprobar el aval.",
      );
    } finally {
      setActionLoading(false);
    }
  }, [aval, user?.id, showApprovalPanel, approvalEtapa, loadAval]);

  const handleReject = useCallback(async () => {
    if (!aval) return;
    if (!user?.id) {
      setActionError("No se pudo identificar el usuario.");
      return;
    }
    if (!showApprovalPanel) {
      setActionError("No puedes rechazar este aval en la etapa actual.");
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
        currentEtapa,
        rechazoMotivo.trim(),
      );
      setToast({
        variant: "success",
        message: "Aval rechazado correctamente.",
      });
      setRechazoMotivo("");
      await loadAval();
    } catch (err: unknown) {
      setActionError(
        err instanceof Error ? err.message : "No se pudo rechazar el aval.",
      );
    } finally {
      setActionLoading(false);
    }
  }, [
    aval,
    user?.id,
    showApprovalPanel,
    rechazoMotivo,
    currentEtapa,
    loadAval,
  ]);

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

  if (!isControlPrevio) {
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
          <div className="max-w-xl mx-auto px-6 sm:px-8 py-8 space-y-5">
            <button
              onClick={() => router.push("/avales")}
              className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
            >
              <ArrowLeft className="w-4 h-4" />
              Volver
            </button>

            <div>
              <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                Revisión Control Previo
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Revisa los documentos y aprueba o rechaza el aval.
              </p>
            </div>

            {showApprovalPanel ? (
              <ApprovalFlowCard
                title="Aprobación de Control Previo"
                currentStageLabel={getApprovalStageLabel(currentEtapa)}
                nextStageLabel={getApprovalStageLabel(approvalEtapa)}
                reasonValue={rechazoMotivo}
                onReasonChange={setRechazoMotivo}
                actionError={actionError}
                actionLoading={actionLoading}
                onApprove={handleApprove}
                onReject={handleReject}
              />
            ) : (
              <div className="rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 p-4 text-sm text-emerald-700 dark:text-emerald-300">
                Este aval no está disponible para revisión de Control Previo.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="w-full lg:w-1/2 bg-slate-100 dark:bg-slate-900 overflow-y-auto">
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
