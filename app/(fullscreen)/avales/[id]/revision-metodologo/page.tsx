"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";

import { useApprovalFlow } from "@/lib/hooks/use-approval-flow";
import {
  aprobarAval,
  adminSaveRevisionMetodologo,
  getRevisionMetodologoItems,
} from "@/lib/api/avales";
import { getDirigido } from "@/lib/api/user";
import { listRoles } from "@/lib/api/roles";
import type { Aval } from "@/types/aval";
import {
  formatRoles,
  formatEventScheduleSentence,
  getResponsibleTrainerName,
} from "@/lib/utils/formatters";
import {
  ListaDeportistasPreview,
  SolicitudAvalPreview,
  type AvalPreviewFormData,
} from "@/app/(app)/avales/_components/aval-document-preview";
import RevisionMetodologoPreview, {
  type ReviewItem,
} from "@/app/(app)/avales/_components/revision-metodologo-preview";
import ComprasPublicasPreview, {
  type ComprasPublicasDraft,
} from "@/app/(app)/avales/_components/compras-publicas-preview";
import PresupuestoSalidaAnticipoPreview from "@/app/(app)/avales/_components/presupuesto-salida-anticipo-preview";
import PreviewCollapsible from "@/app/(app)/avales/_components/preview-collapsible";
import ApprovalFlowCard from "@/app/(app)/avales/_components/approval-flow-card";
import { getApprovalStageLabel } from "@/lib/constants";
import {
  getApprovalFlowStages,
  getNextApprovalStageForAval,
  getPreviousApprovalStagesForAval,
} from "@/lib/approval-flow";
import AlertBanner from "@/components/ui/alert-banner";
import {
  DEFAULT_REVIEW_ITEMS,
  buildInitialReviewState,
  normalizeReviewItems,
  mergeReviewStateFromApi,
} from "@/app/(app)/avales/_components/revision-metodologo-config";
import { isMetodologoUser } from "@/lib/auth/access";
import { getActionConfig, getSectionConfig } from "@/lib/aval-form-config";
import { useAvalFormConfig } from "@/lib/hooks/use-aval-form-config";
import AvalDocumentosSection from "@/app/(app)/avales/_components/aval-documentos-section";
import { avalFlowDebugLog, summarizeAval } from "@/lib/debug/aval-flow";

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
    .sort(
      (a, b) => Number(Boolean(b.esPrincipal)) - Number(Boolean(a.esPrincipal)),
    )
    .map((item) => {
      const withUser = item as typeof item & {
        usuario?: { nombre?: string; apellido?: string };
        entrenador?: { nombre?: string; apellido?: string };
        nombre?: string;
        apellido?: string;
      };
      const nombre = (
        [
          withUser.entrenador?.nombre ??
            withUser.usuario?.nombre ??
            withUser.nombre,
          withUser.entrenador?.apellido ??
            withUser.usuario?.apellido ??
            withUser.apellido,
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

function buildDefaultDescripcion(aval: Aval) {
  const evento = aval.evento;
  const disciplina = evento?.disciplina?.nombre ?? "la disciplina";
  const fecha = formatEventScheduleSentence(evento);
  const eventoNombre = evento?.nombre ?? "el evento";
  const entrenadorResponsable = getResponsibleTrainerName(
    aval,
    "[NOMBRE ENTRENADOR RESPONSABLE]",
  );
  return `En base a la presentación del Aval Técnico de Participación Competitiva de ${disciplina}, "${eventoNombre}", con fechas ${fecha}, suscrito por ${entrenadorResponsable}, se detalla la tabla de cumplimiento y no cumplimiento de los ítems revisados.`;
}

type ReviewSection = ReviewItem["section"];

const SECTION_LABELS: Record<ReviewSection, string> = {
  PARAMETROS: "Parametros",
  HOJA_EXCEL_ANEXOS: "Hoja excel-anexos",
  FECHAS: "Fechas",
};

function resolveReviewItemCumple(
  aval: Aval | null,
  item: ReviewItem,
  state: { cumple: boolean } | undefined,
) {
  if (typeof state?.cumple === "boolean") return state.cumple;
  if (!aval) return item.defaultCumple;
  if (item.key === "AVAL_TECNICO") return aval.tipoAval === "FONDOS_PUBLICOS";
  if (item.key === "CERT_COMPRAS_PUBLICAS")
    return aval.tipoAval === "AUTOGESTION";
  if (item.key === "CERT_MET_PDA") return Boolean(aval.pda);
  return item.defaultCumple;
}

function getTodayLocalDate() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function RevisionMetodologoPage() {
  const params = useParams();
  const router = useRouter();
  const avalId = Number(params.id);

  const [reviewItems, setReviewItems] =
    useState<ReviewItem[]>(DEFAULT_REVIEW_ITEMS);
  const [reviewState, setReviewState] = useState(() =>
    buildInitialReviewState(DEFAULT_REVIEW_ITEMS),
  );
  const [dtmName, setDtmName] = useState("");
  const [dtmCargo, setDtmCargo] = useState("");
  const [revisionHeader, setRevisionHeader] = useState({
    numeroRevision: "",
    dirigidoA: "",
    cargoDirigidoA: "",
    descripcionEncabezado: "",
    fechaRevision: getTodayLocalDate(),
    observacionFechaTramite: "",
  });
  const [revisionFooter, setRevisionFooter] = useState({
    observacionesFinales: "",
    firmanteNombre: "",
    firmanteCargo: "",
  });

  const {
    // hasRequiredRole only used to compute showApprovalPanel — no early return (page is viewable by all)
    hasRequiredRole: isMetodologo,
    user,
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
    handleApprove,
    handleReject,
  } = useApprovalFlow({
    avalId,
    requiredRole: isMetodologoUser,
    editableEtapa: (currentAval) =>
      getPreviousApprovalStagesForAval(currentAval, "REVISION_METODOLOGO").at(
        -1,
      ) ?? "SOLICITUD",
    // approve always promotes to REVISION_METODOLOGO regardless of currentEtapa
    approvalEtapa: "REVISION_METODOLOGO",
    enableEtapaDestino: true,
    onApproveAction: useCallback(
      async ({ aval: a, userId, adminSaveOnly, approvalEtapa }) => {
        const items = reviewItems
          .map((item) => {
            const state = reviewState[item.key];
            return {
              key: item.key,
              cumple: resolveReviewItemCumple(a, item, state),
              observacion: state?.observacion?.trim() || "",
            };
          })
          .filter(
            (item) =>
              !item.cumple || (item.observacion && item.observacion.length > 0),
          );

        avalFlowDebugLog("revision-metodologo", "payload de aprobacion listo", {
          aval: summarizeAval(a),
          userId,
          revisionHeader,
          revisionFooter,
          items,
        });
        const payload = {
          numeroRevision: revisionHeader.numeroRevision.trim(),
          dirigidoA: revisionHeader.dirigidoA.trim(),
          cargoDirigidoA: revisionHeader.cargoDirigidoA.trim(),
          descripcionEncabezado: revisionHeader.descripcionEncabezado.trim(),
          firmanteNombre: revisionFooter.firmanteNombre.trim(),
          firmanteCargo: revisionFooter.firmanteCargo.trim(),
          observacionesFinales:
            revisionHeader.observacionFechaTramite.trim() ||
            revisionFooter.observacionesFinales.trim(),
          items,
        };

        if (adminSaveOnly) {
          await adminSaveRevisionMetodologo(a.id, userId, payload, approvalEtapa);
        } else {
          await aprobarAval(a.id, userId, "REVISION_METODOLOGO", { revisionMetodologo: payload });
        }
      },
      [reviewItems, reviewState, revisionHeader, revisionFooter],
    ),
    approveSuccessMessage: "Revisión del metodólogo generada correctamente.",
  });

  const { config: formConfig } = useAvalFormConfig(aval);
  const reviewSection = getSectionConfig(formConfig, "REVISION_METODOLOGO");
  const approveAction = getActionConfig(formConfig, "APROBAR");
  const rejectAction = getActionConfig(formConfig, "RECHAZAR");

  // showApprovalPanel combines role + stage — page is viewable by non-metodologos
  const showApprovalPanel =
    isMetodologo && (isEditable || adminSaveOnly) && (reviewSection?.visible ?? true);

  // Reset local state on aval navigation
  useEffect(() => {
    setReviewState(buildInitialReviewState(reviewItems));
    setDtmName("");
    setDtmCargo("");
    setRevisionHeader({
      numeroRevision: "",
      dirigidoA: "",
      cargoDirigidoA: "",
      descripcionEncabezado: "",
      fechaRevision: getTodayLocalDate(),
      observacionFechaTramite: "",
    });
    setRevisionFooter({
      observacionesFinales: "",
      firmanteNombre: "",
      firmanteCargo: "",
    });
  }, [avalId]);

  // Load review items from API
  useEffect(() => {
    let active = true;
    async function loadReviewItems() {
      try {
        const response = await getRevisionMetodologoItems();
        if (!active) return;
        const normalized = normalizeReviewItems(
          Array.isArray(response.data) ? response.data : [],
        );
        const nextItems = normalized.length ? normalized : DEFAULT_REVIEW_ITEMS;
        setReviewItems(nextItems);
        setReviewState((prev) => {
          const next = buildInitialReviewState(nextItems);
          nextItems.forEach((item) => {
            if (prev[item.key]) next[item.key] = prev[item.key];
          });
          return next;
        });
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

  // Load DTM user + nombre del rol DTM (catalogo de roles) para "Dirigido a"
  useEffect(() => {
    let active = true;
    async function loadDtmUser() {
      try {
        const [dirigidoRes, rolesRes] = await Promise.all([
          getDirigido("DTM"),
          listRoles().catch(() => null),
        ]);
        if (!active) return;
        const first = dirigidoRes.data;
        const nombre = first
          ? [first.nombre, first.apellido].filter(Boolean).join(" ").trim()
          : "";
        const rolDtm = rolesRes?.data?.find((r) => r.codigo === "DTM");
        setDtmName(nombre);
        setDtmCargo(rolDtm?.nombre?.trim() || "DTM");
      } catch {
        if (!active) return;
        setDtmName("");
        setDtmCargo("");
      }
    }
    void loadDtmUser();
    return () => {
      active = false;
    };
  }, []);

  // Populate revisionHeader from API data or defaults when aval loads
  useEffect(() => {
    if (!aval) return;
    setRevisionHeader((prev) => ({
      ...prev,
      descripcionEncabezado:
        prev.descripcionEncabezado || buildDefaultDescripcion(aval),
    }));
  }, [aval]);

  useEffect(() => {
    if (!aval?.revisionMetodologo) return;
    setRevisionHeader((prev) => ({
      ...prev,
      numeroRevision:
        aval.revisionMetodologo?.numeroRevision ?? prev.numeroRevision,
      dirigidoA: aval.revisionMetodologo?.dirigidoA ?? prev.dirigidoA,
      cargoDirigidoA:
        aval.revisionMetodologo?.cargoDirigidoA ?? prev.cargoDirigidoA,
      descripcionEncabezado:
        aval.revisionMetodologo?.descripcionEncabezado ??
        prev.descripcionEncabezado,
      fechaRevision:
        aval.revisionMetodologo?.fechaRevision ?? prev.fechaRevision,
      observacionFechaTramite:
        prev.observacionFechaTramite ||
        aval.revisionMetodologo?.observacionesFinales ||
        "",
    }));
    // Firmante: BD siempre tiene prioridad sobre el usuario actual
    setRevisionFooter((prev) => ({
      ...prev,
      firmanteNombre:
        aval.revisionMetodologo?.firmanteNombre || prev.firmanteNombre || "",
      firmanteCargo:
        aval.revisionMetodologo?.firmanteCargo || prev.firmanteCargo || "",
    }));
  }, [aval]);

  // Populate revisionHeader "Dirigido a" from DTM user
  useEffect(() => {
    if (!dtmName) return;
    setRevisionHeader((prev) => ({
      ...prev,
      dirigidoA: prev.dirigidoA || dtmName,
      cargoDirigidoA: prev.cargoDirigidoA || dtmCargo || "DTM",
    }));
  }, [dtmName, dtmCargo]);

  // Populate revisionFooter from current user solo si no hay revision preexistente en BD
  useEffect(() => {
    if (!user) return;
    if (aval?.revisionMetodologo?.firmanteNombre) return;
    const nombre = [user.nombre, user.apellido]
      .filter(Boolean)
      .join(" ")
      .trim();
    const cargo = user.roles?.length ? formatRoles(user.roles) : "";
    setRevisionFooter((prev) => ({
      ...prev,
      firmanteNombre: prev.firmanteNombre || nombre,
      firmanteCargo: prev.firmanteCargo || cargo,
    }));
  }, [user, aval]);

  // Merge API review items into reviewState when aval loads
  useEffect(() => {
    if (!aval) return;
    const apiItems = aval.revisionMetodologo?.items ?? [];
    if (!apiItems.length) return;
    setReviewState(mergeReviewStateFromApi(reviewItems, apiItems));
    setRevisionFooter((prev) => ({
      ...prev,
      observacionesFinales:
        prev.observacionesFinales ||
        aval.revisionMetodologo?.observacionesFinales ||
        "",
    }));
  }, [aval, reviewItems]);

  // Set default observations for items 16 (AVAL_TECNICO) and 17 (CERT_COMPRAS_PUBLICAS)
  // based on tipoAval when those items don't have existing observations.
  useEffect(() => {
    if (!aval?.tipoAval) return;
    const numeroAval =
      aval.avalTecnico?.numeroAval ??
      aval.aval ??
      aval.numeroColeccion ??
      `#${aval.id}`;
    setReviewState((prev) => {
      const next = { ...prev };
      if (aval.tipoAval === "FONDOS_PUBLICOS") {
        const certCompras = next["CERT_COMPRAS_PUBLICAS"];
        if (!certCompras?.observacion?.trim()) {
          next["CERT_COMPRAS_PUBLICAS"] = {
            cumple: certCompras?.cumple ?? false,
            observacion: `No aplica debido a que el aval número ${numeroAval} es por fondos públicos`,
          };
        }
      }
      if (aval.tipoAval === "AUTOGESTION") {
        const avalTecnico = next["AVAL_TECNICO"];
        if (!avalTecnico?.observacion?.trim()) {
          next["AVAL_TECNICO"] = {
            cumple: avalTecnico?.cumple ?? false,
            observacion: `No aplica debido a que el aval número ${numeroAval} es por fondos propios de la federación`,
          };
        }
      }
      return next;
    });
  }, [aval]);

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
        typeof compras.realizoProceso === "boolean"
          ? compras.realizoProceso
          : null,
      codigos:
        compras.codigos?.map((item) => ({
          codigo: item.codigo ?? "",
          descripcion: item.descripcion ?? "",
        })) ?? [],
      nombreFirmante: compras.nombreFirmante ?? "",
      cargoFirmante: compras.cargoFirmante ?? "",
      fechaEmision: compras.fechaEmision ?? "",
    };
  }, [aval]);
  const noCumpleCount = reviewItems.filter((item) => {
    const state = reviewState[item.key];
    return !resolveReviewItemCumple(aval, item, state);
  }).length;

  const currentStageLabel = getApprovalStageLabel(currentEtapa);
  const nextStageLabel = getApprovalStageLabel(
    getNextApprovalStageForAval(aval, currentEtapa) ?? "REVISION_METODOLOGO",
  );

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
    <div className="h-screen flex bg-gray-50 dark:bg-slate-950">
      {toast && (
        <div className="fixed top-4 right-4 z-50 max-w-sm w-full drop-shadow-lg">
          <AlertBanner
            variant={toast.variant}
            message={toast.message}
            onClose={() => setToast(null)}
          />
        </div>
      )}
      {/* Left Panel */}
      <div className="w-full lg:w-[45%] bg-white dark:bg-gray-900 flex flex-col">
        <div className="h-full overflow-y-auto">
          <div className="max-w-2xl mx-auto px-6 sm:px-10 py-6">
            <div className="mb-6">
              <button
                onClick={() => router.push("/avales")}
                className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 mb-6"
              >
                <ArrowLeft className="w-4 h-4" />
                Volver
              </button>
            </div>
            <div className="space-y-5">
              <div className="space-y-4 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/40 p-4">
                <div>
                  <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                    Revisión del metodólogo
                  </h1>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Completa los datos generales antes de la revisión.
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* <label className="block">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Fecha de revisión
                    </span>
                    <input
                      type="date"
                      className="form-input w-full mt-1"
                      value={revisionHeader.fechaRevision}
                      onChange={(e) =>
                        setRevisionHeader((prev) => ({
                          ...prev,
                          fechaRevision: e.target.value,
                        }))
                      }
                    />
                  </label> */}
                  <label className="block">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Dirigido a
                    </span>
                    <input
                      className="form-input w-full mt-1"
                      value={revisionHeader.dirigidoA}
                      onChange={(e) =>
                        setRevisionHeader((prev) => ({
                          ...prev,
                          dirigidoA: e.target.value,
                        }))
                      }
                      placeholder="Nombre completo"
                    />
                  </label>
                  <label className="block">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Cargo de la persona dirigida
                    </span>
                    <input
                      className="form-input w-full mt-1"
                      value={revisionHeader.cargoDirigidoA}
                      onChange={(e) =>
                        setRevisionHeader((prev) => ({
                          ...prev,
                          cargoDirigidoA: e.target.value,
                        }))
                      }
                      placeholder="Ej: Director Técnico"
                    />
                  </label>
                  <label className="block md:col-span-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Descripción / Encabezado
                    </span>
                    <textarea
                      className="form-textarea w-full mt-1"
                      rows={4}
                      value={revisionHeader.descripcionEncabezado}
                      onChange={(e) =>
                        setRevisionHeader((prev) => ({
                          ...prev,
                          descripcionEncabezado: e.target.value,
                        }))
                      }
                      placeholder="Escribe el encabezado de la revisión..."
                    />
                  </label>
                  <label className="block md:col-span-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Observación de fecha de trámite
                    </span>
                    <textarea
                      className="form-textarea w-full mt-1"
                      rows={3}
                      value={revisionHeader.observacionFechaTramite}
                      onChange={(e) =>
                        setRevisionHeader((prev) => ({
                          ...prev,
                          observacionFechaTramite: e.target.value,
                        }))
                      }
                      placeholder="Escribe la observación para la fecha de trámite..."
                    />
                  </label>
                  <label className="block">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Nombre del firmante
                    </span>
                    <input
                      className="form-input w-full mt-1"
                      value={revisionFooter.firmanteNombre}
                      onChange={(e) =>
                        setRevisionFooter((prev) => ({
                          ...prev,
                          firmanteNombre: e.target.value,
                        }))
                      }
                      placeholder="Nombre completo"
                    />
                  </label>
                  <label className="block">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Cargo del firmante
                    </span>
                    <input
                      className="form-input w-full mt-1"
                      value={revisionFooter.firmanteCargo}
                      onChange={(e) =>
                        setRevisionFooter((prev) => ({
                          ...prev,
                          firmanteCargo: e.target.value,
                        }))
                      }
                      placeholder="Ej: Metodólogo Provincial"
                    />
                  </label>
                </div>
              </div>

              {(
                ["PARAMETROS", "HOJA_EXCEL_ANEXOS", "FECHAS"] as const
              ).map((section) => {
                const sectionItems = reviewItems
                  .filter((item) => item.section === section)
                  .sort((a, b) => a.order - b.order);
                const sectionNoCumple = sectionItems.filter((item) => {
                  const state = reviewState[item.key];
                  return !resolveReviewItemCumple(aval, item, state);
                }).length;

                if (!sectionItems.length) return null;

                return (
                  <details
                    key={section}
                    open={section === "PARAMETROS"}
                    className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/40 overflow-hidden"
                  >
                    <summary className="cursor-pointer list-none px-4 py-3 bg-gray-50 dark:bg-gray-900/40 border-b border-gray-200 dark:border-gray-800">
                      <div className="flex items-center justify-between gap-3">
                        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                          {SECTION_LABELS[section]}
                        </h2>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="rounded-full px-2 py-0.5 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300">
                            {sectionItems.length} items
                          </span>
                          <span className="rounded-full px-2 py-0.5 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400">
                            {sectionNoCumple} no cumple
                          </span>
                        </div>
                      </div>
                    </summary>
                    <div className="p-3 space-y-2">
                      {sectionItems.map((item) => {
                        const itemState = reviewState[item.key];
                        const cumple = resolveReviewItemCumple(
                          aval,
                          item,
                          itemState,
                        );
                        const observacion = itemState?.observacion ?? "";

                        return (
                          <div
                            key={item.key}
                            className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/40 px-3 py-3"
                          >
                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                              <p className="text-sm text-gray-800 dark:text-gray-100 sm:max-w-[70%]">
                                {item.order}. {item.label}
                              </p>
                              <div className="flex items-center gap-3 text-xs">
                                <label className="inline-flex items-center gap-1 text-emerald-600">
                                  <input
                                    type="radio"
                                    name={`cumple-${item.key}`}
                                    className="form-radio"
                                    checked={cumple}
                                    onChange={() =>
                                      setReviewState((prev) => ({
                                        ...prev,
                                        [item.key]: {
                                          ...prev[item.key],
                                          cumple: true,
                                        },
                                      }))
                                    }
                                  />
                                  Sí
                                </label>
                                <label className="inline-flex items-center gap-1 text-rose-600">
                                  <input
                                    type="radio"
                                    name={`cumple-${item.key}`}
                                    className="form-radio"
                                    checked={!cumple}
                                    onChange={() =>
                                      setReviewState((prev) => ({
                                        ...prev,
                                        [item.key]: {
                                          ...prev[item.key],
                                          cumple: false,
                                        },
                                      }))
                                    }
                                  />
                                  No
                                </label>
                              </div>
                            </div>
                            {!cumple || observacion.trim() ? (
                              <div className="mt-3">
                                <textarea
                                  className="form-textarea w-full text-xs min-h-[60px]"
                                  placeholder="Observación"
                                  value={observacion}
                                  onChange={(e) =>
                                    setReviewState((prev) => ({
                                      ...prev,
                                      [item.key]: {
                                        ...prev[item.key],
                                        observacion: e.target.value,
                                      },
                                    }))
                                  }
                                />
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  </details>
                );
              })}

              <div className="space-y-4 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/40 p-4">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    Cierre de la revisión
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Observaciones finales y firmante.
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="block md:col-span-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Observaciones finales
                    </span>
                    <textarea
                      className="form-textarea w-full mt-1"
                      rows={4}
                      value={revisionFooter.observacionesFinales}
                      onChange={(e) =>
                        setRevisionFooter((prev) => ({
                          ...prev,
                          observacionesFinales: e.target.value,
                        }))
                      }
                      placeholder="Escribe las observaciones finales..."
                    />
                  </label>
                </div>
              </div>

              {showApprovalPanel && (
                <ApprovalFlowCard
                  title="Aprobación del aval"
                  currentStageLabel={currentStageLabel}
                  nextStageLabel={nextStageLabel}
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
                  adminSaveOnly={adminSaveOnly}
                  etapaDestinoOptions={getPreviousApprovalStagesForAval(
                    aval,
                    currentEtapa,
                  ).map((e) => ({
                    value: e,
                    label: getApprovalStageLabel(e),
                  }))}
                  etapaDestinoValue={etapaDestino}
                  onEtapaDestinoChange={setEtapaDestino}
                />
              )}
              {!showApprovalPanel &&
                aval?.revisionMetodologo?.numeroRevision && (
                  <div className="rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 p-4 text-sm text-emerald-700 dark:text-emerald-300">
                    Revisión del metodólogo generada correctamente.
                  </div>
                )}
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel */}
      <div className="hidden lg:block lg:w-[55%] bg-slate-100 dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 overflow-y-auto">
        <div className="p-6 xl:p-8">
          <div className="space-y-6">
            <AvalDocumentosSection aval={aval} />
            <PreviewCollapsible title="Solicitud aval">
              <SolicitudAvalPreview aval={aval} formData={trainerDocsData} />
            </PreviewCollapsible>
            <PreviewCollapsible title="Lista deportistas">
              <ListaDeportistasPreview aval={aval} formData={trainerDocsData} />
            </PreviewCollapsible>
            {aval?.tipoAval !== "SOLO_RESULTADO" && (
              <PreviewCollapsible title="Presupuesto de salida">
                <PresupuestoSalidaAnticipoPreview aval={aval} />
              </PreviewCollapsible>
            )}
            <PreviewCollapsible title="Certificacion compras publicas">
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
          </div>
        </div>
      </div>
    </div>
  );
}
