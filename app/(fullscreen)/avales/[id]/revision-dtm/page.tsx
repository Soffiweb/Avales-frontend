"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";

import { useApprovalFlow } from "@/lib/hooks/use-approval-flow";
import {
  aprobarAval,
  getRevisionMetodologoItems,
} from "@/lib/api/avales";
import type { Aval, EtapaFlujo } from "@/types/aval";
import {
  SolicitudAvalPreview,
  type AvalPreviewFormData,
} from "@/app/(app)/avales/_components/aval-document-preview";
import ComprasPublicasPreview, {
  type ComprasPublicasDraft,
} from "@/app/(app)/avales/_components/compras-publicas-preview";
import PresupuestoSalidaAnticipoPreview from "@/app/(app)/avales/_components/presupuesto-salida-anticipo-preview";
import RevisionMetodologoPreview, {
  type ReviewItem,
  type ReviewStateItem,
} from "@/app/(app)/avales/_components/revision-metodologo-preview";
import AvalTecnicoCompetitivoPreview from "@/app/(app)/avales/_components/aval-tecnico-competitivo-preview";
import CertificacionAfiliacionesPreview, {
  SECRETARIA_DTM_NOMBRE_DEFAULT,
  SECRETARIA_DTM_CARGO_DEFAULT,
} from "@/app/(app)/avales/_components/certificacion-afiliaciones-preview";
import PreviewCollapsible from "@/app/(app)/avales/_components/preview-collapsible";
import AlertBanner from "@/components/ui/alert-banner";
import {
  DEFAULT_REVIEW_ITEMS,
  mergeReviewStateFromApi,
  normalizeReviewItems,
} from "@/app/(app)/avales/_components/revision-metodologo-config";
import { isDTMUser } from "@/lib/auth/access";
import {
  formatEventScheduleSentence,
  formatLocationWithProvince,
  getResponsibleTrainerName,
} from "@/lib/utils/formatters";
import AvalDocumentosSection from "@/app/(app)/avales/_components/aval-documentos-section";

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
  codigoNecesidad: "",
  objetoContratacion: "",
  nombreFirmante: "",
  cargoFirmante: "",
  fechaEmision: "",
};

type DtmDraft = {
  descripcion: string;
  observacion: string;
  fechaPresentacion: string;
  firmanteNombre: string;
  firmanteCargo: string;
};

const INITIAL_DTM_DRAFT: DtmDraft = {
  descripcion: "",
  observacion: "",
  fechaPresentacion: new Date().toISOString().slice(0, 10),
  firmanteNombre: "",
  firmanteCargo: "",
};

function buildDtmDraft(
  aval?: Aval | null,
  defaults: Pick<DtmDraft, "firmanteNombre" | "firmanteCargo"> = {
    firmanteNombre: "",
    firmanteCargo: "",
  },
): DtmDraft {
  const revisionDtm = aval?.revisionDtm;
  return {
    descripcion: revisionDtm?.descripcion ?? "",
    observacion: revisionDtm?.observacion ?? "",
    fechaPresentacion:
      revisionDtm?.fechaPresentacion ?? new Date().toISOString().slice(0, 10),
    firmanteNombre: revisionDtm?.firmanteNombre ?? defaults.firmanteNombre,
    firmanteCargo: revisionDtm?.firmanteCargo ?? defaults.firmanteCargo,
  };
}

function buildDefaultDtmDescripcion(aval: Aval) {
  const evento = aval.evento;
  const entrenador = getResponsibleTrainerName(aval, "[ENTRENADOR RESPONSABLE]");
  const disciplina = evento?.disciplina?.nombre ?? "[DISCIPLINA]";
  const eventoNombre = (evento?.nombre ?? "[NOMBRE EVENTO]").toUpperCase();
  const numeroSolicitud =
    aval.avalTecnico?.numeroAval ??
    aval.aval ??
    aval.numeroColeccion ??
    `[SOLICITUD ${aval.id}]`;
  const lugar =
    [evento?.provincia, evento?.ciudad].filter(Boolean).join("-") ||
    formatLocationWithProvince(evento) ||
    "[LUGAR]";
  const rangoFechas = formatEventScheduleSentence(evento);

  return `En base a la presentación de la solicitud de aval ${numeroSolicitud}, presentado por ${entrenador}, entrenador de ${disciplina}, el cual solicita aval de participación para ${eventoNombre} a desarrollarse en ${lugar}, ${rangoFechas}.`;
}

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

const APPROVAL_ETAPA: EtapaFlujo = "REVISION_DTM";
const EDITABLE_ETAPA: EtapaFlujo = "REVISION_METODOLOGO";

export default function RevisionDtmPage() {
  const params = useParams();
  const router = useRouter();
  const avalId = Number(params.id);

  const [draft, setDraft] = useState<DtmDraft>(INITIAL_DTM_DRAFT);
  const [reviewItems, setReviewItems] = useState<ReviewItem[]>(DEFAULT_REVIEW_ITEMS);
  const [reviewState, setReviewState] = useState<Record<string, ReviewStateItem>>({});

  const {
    authLoading,
    user,
    hasRequiredRole: isDtm,
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
    isEditable,
    summaryText,
    handleApprove,
    handleReject,
  } = useApprovalFlow({
    avalId,
    requiredRole: isDTMUser,
    editableEtapa: EDITABLE_ETAPA,
    approvalEtapa: APPROVAL_ETAPA,
    onApproveAction: useCallback(
      async ({ aval: a, userId, approvalEtapa }) => {
        const items = reviewItems.map((item) => {
          const state = reviewState[item.key];
          return {
            key: item.key,
            cumple: state?.cumple ?? item.defaultCumple,
            observacion: state?.observacion?.trim() || "",
          };
        });
        await aprobarAval(a.id, userId, approvalEtapa, undefined, {
          descripcion: draft.descripcion.trim(),
          observacion: draft.observacion.trim() || undefined,
          fechaPresentacion: draft.fechaPresentacion,
          firmanteNombre: draft.firmanteNombre.trim() || undefined,
          firmanteCargo: draft.firmanteCargo.trim() || undefined,
          items,
        });
      },
      [draft, reviewItems, reviewState],
    ),
    approveSuccessMessage: "Revisión DTM aprobada correctamente.",
  });

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
    return () => { active = false; };
  }, []);

  useEffect(() => {
    setDraft(
      buildDtmDraft(aval, {
        firmanteNombre: defaultSignerName,
        firmanteCargo: defaultSignerCargo,
      }),
    );
  }, [aval, defaultSignerName, defaultSignerCargo]);

  useEffect(() => {
    if (!aval) return;
    if (draft.descripcion.trim()) return;
    setDraft((prev) => ({
      ...prev,
      descripcion: buildDefaultDtmDescripcion(aval),
    }));
  }, [aval, draft.descripcion]);

  useEffect(() => {
    if (!aval) return;
    setReviewState(
      mergeReviewStateFromApi(reviewItems, aval.revisionMetodologo?.items ?? []),
    );
  }, [aval, reviewItems]);

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
                    Fecha del documento
                  </span>
                  <input
                    type="date"
                    className="form-input w-full mt-1"
                    value={draft.fechaPresentacion}
                    readOnly={!isEditable}
                    disabled={!isEditable}
                    onChange={(e) =>
                      setDraft((prev) => ({ ...prev, fechaPresentacion: e.target.value }))
                    }
                  />
                </label>

                <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-3 space-y-3">
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    Firmante del aval técnico (DTM)
                  </p>
                  <label className="block">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Nombre
                    </span>
                    <input
                      type="text"
                      className="form-input w-full mt-1"
                      value={draft.firmanteNombre}
                      readOnly={!isEditable}
                      disabled={!isEditable}
                      onChange={(e) =>
                        setDraft((prev) => ({ ...prev, firmanteNombre: e.target.value }))
                      }
                      placeholder="Nombre del DTM"
                    />
                  </label>
                  <label className="block">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Cargo
                    </span>
                    <input
                      type="text"
                      className="form-input w-full mt-1"
                      value={draft.firmanteCargo}
                      readOnly={!isEditable}
                      disabled={!isEditable}
                      onChange={(e) =>
                        setDraft((prev) => ({ ...prev, firmanteCargo: e.target.value }))
                      }
                      placeholder="Cargo del DTM"
                    />
                  </label>
                </div>

                <label className="block">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Observación (opcional)
                  </span>
                  <textarea
                    className="form-textarea w-full mt-1"
                    rows={3}
                    value={draft.observacion}
                    readOnly={!isEditable}
                    disabled={!isEditable}
                    onChange={(e) =>
                      setDraft((prev) => ({ ...prev, observacion: e.target.value }))
                    }
                    placeholder="Observaciones adicionales..."
                  />
                </label>
              </div>

              {actionError && (
                <div className="text-xs text-rose-600 dark:text-rose-400">{actionError}</div>
              )}

              {isEditable && (
                <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/40 p-4 space-y-3">
                  <div>
                    <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      Aprobación revisión DTM
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
              {!isEditable && aval?.dtm?.length ? (
                <div className="rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 p-4 text-sm text-emerald-700 dark:text-emerald-300">
                  Este aval ya fue revisado por DTM.
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className="hidden lg:block lg:w-1/2 bg-slate-100 dark:bg-slate-900 overflow-y-auto">
        <div className="p-6 xl:p-8">
          <div className="space-y-6">
            <AvalDocumentosSection aval={aval} />
            <PreviewCollapsible title="Solicitud aval">
              <SolicitudAvalPreview aval={aval} formData={trainerDocsData} />
            </PreviewCollapsible>
            <PreviewCollapsible title="Certificado de afiliación" defaultOpen>
              <CertificacionAfiliacionesPreview
                aval={aval}
                secretariaNombre={SECRETARIA_DTM_NOMBRE_DEFAULT}
                secretariaCargo={SECRETARIA_DTM_CARGO_DEFAULT}
              />
            </PreviewCollapsible>
            <PreviewCollapsible title="Presupuesto de salida">
              <PresupuestoSalidaAnticipoPreview aval={aval} />
            </PreviewCollapsible>
            <PreviewCollapsible title="Certificacion compras publicas">
              <ComprasPublicasPreview aval={aval} draft={comprasDraft} />
            </PreviewCollapsible>
            <PreviewCollapsible title="Revision metodologo">
              <RevisionMetodologoPreview
                aval={aval}
                header={revisionHeader}
                footer={revisionFooter}
                reviewItems={reviewItems}
                reviewState={reviewState}
                useDefaultObservations={false}
              />
            </PreviewCollapsible>
            <PreviewCollapsible title="Aval Técnico Competitivo" defaultOpen>
              <AvalTecnicoCompetitivoPreview
                aval={aval}
                fechaEmision={draft.fechaPresentacion}
                observacion={draft.observacion}
                firmanteNombre={draft.firmanteNombre || defaultSignerName}
                firmanteCargo={draft.firmanteCargo || defaultSignerCargo}
              />
            </PreviewCollapsible>
          </div>
        </div>
      </div>
    </div>
  );
}
