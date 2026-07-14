"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";

import { useApprovalFlow } from "@/lib/hooks/use-approval-flow";
import { aprobarAval, getRevisionMetodologoItems } from "@/lib/api/avales";
import type { Aval, EtapaFlujo } from "@/types/aval";
import {
  ListaDeportistasPreview,
  SolicitudAvalPreview,
  type AvalPreviewFormData,
} from "@/app/(app)/avales/_components/aval-document-preview";
import ComprasPublicasPreview, {
  type ComprasPublicasDraft,
} from "@/app/(app)/avales/_components/compras-publicas-preview";
import RevisionMetodologoPreview, {
  type ReviewItem,
  type ReviewStateItem,
} from "@/app/(app)/avales/_components/revision-metodologo-preview";
import AvalTecnicoCompetitivoPreview from "@/app/(app)/avales/_components/aval-tecnico-competitivo-preview";
import PresupuestoSalidaAnticipoPreview from "@/app/(app)/avales/_components/presupuesto-salida-anticipo-preview";
import PreviewCollapsible from "@/app/(app)/avales/_components/preview-collapsible";
import ApprovalFlowCard from "@/app/(app)/avales/_components/approval-flow-card";
import AlertBanner from "@/components/ui/alert-banner";
import { getApprovalStageLabel } from "@/lib/constants";
import { isAdminUser } from "@/lib/auth/access";
import {
  getApprovalFlowStages,
  getNextApprovalStageForAval,
  getPreviousApprovalStagesForAval,
} from "@/lib/approval-flow";
import { getActionConfig, getSectionConfig } from "@/lib/aval-form-config";
import { useAvalFormConfig } from "@/lib/hooks/use-aval-form-config";
import {
  DEFAULT_REVIEW_ITEMS,
  mergeReviewStateFromApi,
  normalizeReviewItems,
} from "@/app/(app)/avales/_components/revision-metodologo-config";
import AvalDocumentosSection from "@/app/(app)/avales/_components/aval-documentos-section";
import { parseNotasFromBd } from "@/lib/utils/aval-collections";

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

const EMPTY_COMPRAS_DRAFT: ComprasPublicasDraft = {
  numeroCertificado: "",
  realizoProceso: null,
  codigos: [],
  descripcion: "",
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

export default function AprobarAdministradorPage() {
  const params = useParams();
  const router = useRouter();
  const avalId = Number(params.id);

  const [reviewItems, setReviewItems] = useState<ReviewItem[]>(DEFAULT_REVIEW_ITEMS);
  const [comentario, setComentario] = useState("");

  const {
    authLoading,
    hasRequiredRole: hasAccess,
    aval,
    loading,
    error,
    actionLoading,
    actionError,
    toast,
    setToast,
    rechazoMotivo,
    setRechazoMotivo,
    currentEtapa,
    isEditable,
    adminSaveOnly,
    handleApprove,
    handleReject,
  } = useApprovalFlow({
    avalId,
    requiredRole: isAdminUser,
    editableEtapa: (currentAval) =>
      getPreviousApprovalStagesForAval(currentAval, "ADMINISTRADOR").at(-1) ??
      "CONTROL_PREVIO",
    additionalEditableCheck: (currentAval) =>
      getApprovalFlowStages(currentAval).includes("ADMINISTRADOR"),
    approvalEtapa: (etapa, currentAval) =>
      getNextApprovalStageForAval(currentAval, etapa) ?? etapa,
    onApproveAction: useCallback(
      async ({ aval: a, userId, approvalEtapa }) => {
        await aprobarAval(a.id, userId, approvalEtapa, {
          comentario: comentario.trim() || undefined,
        });
      },
      [comentario],
    ),
    approveSuccessMessage: "Aval aprobado por el administrador.",
  });
  const { config: formConfig } = useAvalFormConfig(aval);
  const administradorSection = getSectionConfig(formConfig, "ADMINISTRADOR");
  const approveAction = getActionConfig(formConfig, "APROBAR");
  const rejectAction = getActionConfig(formConfig, "RECHAZAR");

  const showApprovalPanel =
    hasAccess &&
    (isEditable || adminSaveOnly) &&
    (administradorSection?.visible ?? true);

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

  const reviewState = useMemo<Record<string, ReviewStateItem>>(
    () =>
      aval
        ? mergeReviewStateFromApi(reviewItems, aval.revisionMetodologo?.items ?? [])
        : {},
    [aval, reviewItems],
  );

  const trainerDocsData = useMemo(
    () => (aval ? buildTrainerDocsData(aval) : EMPTY_DOCS_DATA),
    [aval],
  );
  const comprasDraft = useMemo(() => {
    if (!aval?.comprasPublicas) return EMPTY_COMPRAS_DRAFT;
    const compras = aval.comprasPublicas;
    return {
      numeroCertificado: compras.numeroCertificado ?? "",
      realizoProceso:
        typeof compras.realizoProceso === "boolean" ? compras.realizoProceso : null,
      codigos:
        compras.codigos?.map((item) => ({
          codigo: item.codigo ?? "",
          descripcion: item.descripcion ?? "",
        })) ?? [],
      descripcion: compras.descripcion ?? "",
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
      descripcionEncabezado: aval?.revisionMetodologo?.descripcionEncabezado ?? "",
      fechaRevision: aval?.revisionMetodologo?.fechaRevision ?? "",
    }),
    [aval],
  );
  const revisionFooter = useMemo(
    () => ({
      observacionesFinales: aval?.revisionMetodologo?.observacionesFinales ?? "",
      firmanteNombre: aval?.revisionMetodologo?.firmanteNombre ?? "",
      firmanteCargo: aval?.revisionMetodologo?.firmanteCargo ?? "",
    }),
    [aval],
  );
  const presupuestoSalidaDraft = useMemo(
    () => ({
      notas: (parseNotasFromBd(aval?.pda?.notas) ?? []).map((n) => n.texto),
      codigoActividad: aval?.pda?.codigoActividad ?? "004",
      numeroAval:
        aval?.pda?.numeroAval ??
        aval?.avalTecnico?.numeroAval ??
        aval?.aval ??
        aval?.numeroColeccion ??
        "",
      fechaSalida:
        aval?.financiero?.[0]?.fechaSalida ??
        aval?.avalTecnico?.fechaHoraSalida ??
        "",
      periodoComision:
        aval?.financiero?.[0]?.periodoComision ?? aval?.periodoComision ?? "",
      periodoComisionFin:
        aval?.financiero?.[0]?.periodoComisionFin ??
        aval?.periodoComisionFin ??
        "",
      pdaFirmanteNombre: aval?.pda?.nombreFirmante ?? "",
      pdaFirmanteCargo: aval?.pda?.cargoFirmante ?? "",
      financieroFirmanteNombre: aval?.financiero?.[0]?.nombreFirmante ?? "",
      financieroFirmanteCargo: aval?.financiero?.[0]?.cargoFirmante ?? "",
    }),
    [aval],
  );

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
          <p className="text-sm text-gray-600 dark:text-gray-400">Cargando sesión...</p>
        </div>
      </div>
    );
  }

  if (!hasAccess) {
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
          <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
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

  const approvalEtapa = (getNextApprovalStageForAval(aval, currentEtapa) ??
    currentEtapa) as EtapaFlujo;

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
                Aprobación del Administrador
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Revisa el expediente completo y aprueba o rechaza el aval.
              </p>
            </div>

            <label className="block">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Comentario (opcional)
              </span>
              <textarea
                className="form-textarea w-full mt-1"
                rows={4}
                value={comentario}
                disabled={!showApprovalPanel}
                onChange={(e) => setComentario(e.target.value)}
                placeholder="Comentario para la aprobación..."
              />
            </label>

            {showApprovalPanel ? (
              <ApprovalFlowCard
                title="Aprobación del Administrador"
                currentStageLabel={getApprovalStageLabel(currentEtapa)}
                nextStageLabel={getApprovalStageLabel(approvalEtapa)}
                reasonValue={rechazoMotivo}
                onReasonChange={setRechazoMotivo}
                actionError={actionError}
                actionLoading={actionLoading}
                onApprove={handleApprove}
                onReject={handleReject}
                approveVisible={adminSaveOnly ? true : (approveAction?.visible ?? true)}
                approveEnabled={adminSaveOnly ? true : (approveAction?.enabled ?? true)}
                rejectVisible={rejectAction?.visible ?? true}
                rejectEnabled={rejectAction?.enabled ?? true}
              />
            ) : (
              <div className="rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 p-4 text-sm text-emerald-700 dark:text-emerald-300">
                Este aval no está disponible para aprobación del Administrador.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="w-full lg:w-1/2 bg-slate-100 dark:bg-slate-900 overflow-y-auto">
        <div className="p-6 xl:p-8">
          <div className="space-y-6">
            <AvalDocumentosSection aval={aval} />
            <PreviewCollapsible title="Lista deportistas" defaultOpen>
              <ListaDeportistasPreview aval={aval} formData={trainerDocsData} />
            </PreviewCollapsible>
            <PreviewCollapsible title="Solicitud aval" defaultOpen>
              <SolicitudAvalPreview aval={aval} formData={trainerDocsData} />
            </PreviewCollapsible>
            <PreviewCollapsible title="Certificacion compras publicas" defaultOpen>
              <ComprasPublicasPreview aval={aval} draft={comprasDraft} />
            </PreviewCollapsible>
            <PreviewCollapsible title="Revision metodologo" defaultOpen>
              <RevisionMetodologoPreview
                aval={aval}
                header={revisionHeader}
                footer={revisionFooter}
                reviewItems={reviewItems}
                reviewState={reviewState}
              />
            </PreviewCollapsible>
            <PreviewCollapsible title="Aval Técnico Competitivo" defaultOpen>
              <AvalTecnicoCompetitivoPreview
                aval={aval}
                fechaEmision={
                  aval.revisionDtm?.fechaPresentacion ??
                  aval.revisionDtm?.createdAt ??
                  aval.createdAt
                }
                observacion={aval.revisionDtm?.observacion ?? ""}
                firmanteNombre={aval.revisionDtm?.firmanteNombre ?? ""}
                firmanteCargo={aval.revisionDtm?.firmanteCargo ?? ""}
              />
            </PreviewCollapsible>
            <PreviewCollapsible title="Presupuesto de salida" defaultOpen>
              <PresupuestoSalidaAnticipoPreview
                aval={aval}
                draft={presupuestoSalidaDraft}
              />
            </PreviewCollapsible>
          </div>
        </div>
      </div>
    </div>
  );
}
