"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Pencil, Plus, Trash2 } from "lucide-react";

import { useApprovalFlow } from "@/lib/hooks/use-approval-flow";
import { aprobarAval, adminSaveFinanciero } from "@/lib/api/avales";
import type { Aval, EtapaFlujo } from "@/types/aval";
import ApprovalFlowCard from "@/app/(app)/avales/_components/approval-flow-card";
import CertificacionFinancieraPreview from "@/app/(app)/avales/_components/certificacion-financiera-preview";
import { type PdaDraft } from "@/app/(app)/avales/_components/pda-preview";
import PresupuestoSalidaAnticipoPreview from "@/app/(app)/avales/_components/presupuesto-salida-anticipo-preview";
import PreviewCollapsible from "@/app/(app)/avales/_components/preview-collapsible";
import AlertBanner from "@/components/ui/alert-banner";
import {
  ListaDeportistasPreview,
  SolicitudAvalPreview,
  type AvalPreviewFormData,
} from "@/app/(app)/avales/_components/aval-document-preview";
import ComprasPublicasPreview, {
  type ComprasPublicasDraft,
} from "@/app/(app)/avales/_components/compras-publicas-preview";
import RevisionMetodologoPreview from "@/app/(app)/avales/_components/revision-metodologo-preview";
import AvalTecnicoCompetitivoPreview from "@/app/(app)/avales/_components/aval-tecnico-competitivo-preview";
import { getApprovalStageLabel } from "@/lib/constants";
import { isFinancieroUser } from "@/lib/auth/access";
import { getApprovalFlowStages } from "@/lib/approval-flow";
import { getActionConfig, getSectionConfig } from "@/lib/aval-form-config";
import { useAvalFormConfig } from "@/lib/hooks/use-aval-form-config";
import AvalDocumentosSection from "@/app/(app)/avales/_components/aval-documentos-section";
import { listUsers } from "@/lib/api/user";
import { getAvalPresupuestoItems } from "@/lib/utils/aval-collections";
import {
  formatEventScheduleSentence,
  formatRole,
  getResponsibleTrainerName,
} from "@/lib/utils/formatters";
import {
  DEFAULT_REVIEW_ITEMS,
  mergeReviewStateFromApi,
} from "@/app/(app)/avales/_components/revision-metodologo-config";
import { avalFlowDebugLog, summarizeAval } from "@/lib/debug/aval-flow";

type FinancieroNotaDraft = {
  texto: string;
};

type FinancieroDraft = {
  descripcionCertificacion: string;
  periodoComision: string;
  periodoComisionFin: string;
  firmanteNombre: string;
  firmanteCargo: string;
  fechaEmision: string;
  notas: FinancieroNotaDraft[];
};

const INITIAL_DRAFT: FinancieroDraft = {
  descripcionCertificacion: "",
  periodoComision: "",
  periodoComisionFin: "",
  firmanteNombre: "",
  firmanteCargo: "",
  fechaEmision: "",
  notas: [],
};

const EMPTY_PDA_DRAFT: PdaDraft = {
  descripcion: "",
  numeroPda: "",
  numeroAval: "",
  codigoActividad: "004",
  nombreFirmante: "",
  cargoFirmante: "",
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

const APPROVAL_ETAPA: EtapaFlujo = "FINANCIERO";

function joinWithCommaAndY(items: string[]) {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} y ${items[1]}`;
  return `${items.slice(0, -1).join(", ")} y ${items[items.length - 1]}`;
}

function toInputDate(value?: string | null) {
  if (!value) return "";
  const isoMatch = value.match(/^(\d{4}-\d{2}-\d{2})/);
  if (isoMatch) return isoMatch[1];
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function getPeriodoComisionError(
  periodoComision: string,
  periodoComisionFin: string,
) {
  const inicio = periodoComision.trim();
  const fin = periodoComisionFin.trim();

  if (!inicio || !fin) {
    return "El período de comisión inicio y fin es obligatorio.";
  }

  if (inicio > fin) {
    return "El período de comisión inicio debe ser menor o igual al fin.";
  }

  return null;
}

export default function CertificacionFinancieraPage() {
  const params = useParams();
  const router = useRouter();
  const avalId = Number(params.id);

  const [draft, setDraft] = useState<FinancieroDraft>(INITIAL_DRAFT);
  const [fixedSigner, setFixedSigner] = useState({
    nombre: "",
    cargo: "",
  });
  const [editableNotas, setEditableNotas] = useState<boolean[]>([
    false,
    false,
    false,
  ]);
  const [notesInitialized, setNotesInitialized] = useState(false);
  const periodoComisionError = getPeriodoComisionError(
    draft.periodoComision,
    draft.periodoComisionFin,
  );

  const {
    authLoading,
    hasRequiredRole: hasFinancialAccess,
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
    requiredRole: isFinancieroUser,
    editableEtapa: (currentAval) =>
      getApprovalFlowStages(currentAval).includes("CONTROL_PREVIO")
        ? "CONTROL_PREVIO"
        : "REVISION_DTM",
    approvalEtapa: APPROVAL_ETAPA,
    additionalEditableCheck: (currentAval) =>
      getApprovalFlowStages(currentAval).includes("FINANCIERO"),
    validateApprove: useCallback(
      () => periodoComisionError,
      [periodoComisionError],
    ),
    onApproveAction: useCallback(
      async ({ aval: a, userId, approvalEtapa, adminSaveOnly }) => {
        const notasPayload = draft.notas
          .map((nota, index) => ({
            titulo: `NOTA ${index + 1}`,
            texto: nota.texto.trim(),
          }))
          .filter((nota) => nota.texto.length > 0);

        avalFlowDebugLog("financiero", "payload final de aprobacion listo", {
          aval: summarizeAval(a),
          userId,
          approvalEtapa,
          draft,
          notasPayload,
          adminSaveOnly,
        });

        if (adminSaveOnly) {
          await adminSaveFinanciero(a.id, userId, {
            financieroNotas: {
              notas: notasPayload,
              nombreFirmante: draft.firmanteNombre.trim() || undefined,
              cargoFirmante: draft.firmanteCargo.trim() || undefined,
            },
            periodoComision: draft.periodoComision.trim() || undefined,
            periodoComisionFin: draft.periodoComisionFin.trim() || undefined,
          }, approvalEtapa);
        } else {
          await aprobarAval(a.id, userId, approvalEtapa, {
            financieroNotas: {
              notas: notasPayload,
              nombreFirmante: draft.firmanteNombre.trim() || undefined,
              cargoFirmante: draft.firmanteCargo.trim() || undefined,
            },
            periodoComision: draft.periodoComision.trim() || undefined,
            periodoComisionFin: draft.periodoComisionFin.trim() || undefined,
          });
        }
      },
      [
        draft.notas,
        draft.periodoComision,
        draft.periodoComisionFin,
        draft.firmanteNombre,
        draft.firmanteCargo,
      ],
    ),
    approveSuccessMessage: "Certificación financiera aprobada correctamente.",
  });

  const { config: formConfig } = useAvalFormConfig(aval);
  const financieroSection = getSectionConfig(formConfig, "FINANCIERO");
  const approveAction = getActionConfig(formConfig, "APROBAR");
  const rejectAction = getActionConfig(formConfig, "RECHAZAR");
  const pdaDraft = useMemo(() => {
    if (!aval?.pda) return EMPTY_PDA_DRAFT;
    const pda = aval.pda;
    return {
      descripcion: pda.descripcion ?? "",
      numeroPda: pda.numeroPda ?? "",
      numeroAval: pda.numeroAval ?? "",
      codigoActividad: (pda.codigoActividad ?? "004").replace("005", "004"),
      nombreFirmante: pda.nombreFirmante ?? "",
      cargoFirmante: pda.cargoFirmante ?? "",
    };
  }, [aval]);
  const financieroRecord = aval?.financiero?.[0] ?? null;
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
  const reviewState = useMemo(
    () => mergeReviewStateFromApi(DEFAULT_REVIEW_ITEMS, aval?.revisionMetodologo?.items ?? []),
    [aval],
  );
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

  // Reset local state on aval navigation
  useEffect(() => {
    setDraft(INITIAL_DRAFT);
    setFixedSigner({ nombre: "", cargo: "" });
    setEditableNotas([]);
    setNotesInitialized(false);
  }, [avalId]);

  useEffect(() => {
    let cancelled = false;

    async function loadFixedSigner() {
      try {
        const res = await listUsers({ role: "FINANCIERO", limit: 1 });
        if (cancelled) return;
        const signer = res.data?.[0];
        const nombre = signer
          ? [signer.nombre, signer.apellido].filter(Boolean).join(" ").trim()
          : "";
        setFixedSigner({ nombre, cargo: formatRole("FINANCIERO") });
      } catch {
        if (cancelled) return;
      }
    }

    void loadFixedSigner();

    return () => {
      cancelled = true;
    };
  }, [avalId]);

  const defaultDescripcionCertificacion = useMemo(() => {
    if (!aval) return "";
    const evento = aval.evento;
    const numeroAval =
      aval.avalTecnico?.numeroAval ??
      aval.aval ??
      aval.numeroColeccion ??
      String(aval.id);
    const disciplina = evento?.disciplina?.nombre ?? "[DISCIPLINA]";
    const fecha = formatEventScheduleSentence(evento);
    const entrenador = getResponsibleTrainerName(
      aval,
      "[ENTRENADOR RESPONSABLE]",
    );
    const eventoNombre = (evento?.nombre ?? "[NOMBRE EVENTO]").toUpperCase();
    const categoria = evento?.categoria?.nombre ?? evento?.categoriaCodigo;
    const esFondosPublicos = aval.tipoAval === "FONDOS_PUBLICOS";
    const cierreFrase = esFondosPublicos
      ? "consta en el PDA 2026 aprobado por el Ministerio del Deporte."
      : "ha sido aprobado y cuenta con el financiamiento correspondiente.";
    return `De acuerdo al aval Técnico de Participación Competitiva ${numeroAval}, de la disciplina de ${disciplina} con fecha ${fecha}, suscrito por ${entrenador} Entrenador de la disciplina me permito certificar que el evento ${eventoNombre}${categoria ? ` (${categoria.toUpperCase()})` : ""} ${cierreFrase}`;
  }, [aval]);

  const defaultPeriodoComision = useMemo(() => {
    return toInputDate(aval?.avalTecnico?.fechaHoraSalida);
  }, [aval]);

  const defaultFechaSalida = useMemo(() => {
    return (
      toInputDate(aval?.evento?.fechaInicio) ||
      toInputDate(aval?.avalTecnico?.fechaHoraSalida)
    );
  }, [aval]);

  // Populate description from aval once available
  useEffect(() => {
    if (!defaultDescripcionCertificacion) return;
    setDraft((prev) => {
      if (prev.descripcionCertificacion.trim()) return prev;
      return {
        ...prev,
        descripcionCertificacion: defaultDescripcionCertificacion,
      };
    });
  }, [defaultDescripcionCertificacion]);

  useEffect(() => {
    if (!defaultPeriodoComision) return;
    setDraft((prev) => {
      if (prev.periodoComision.trim()) return prev;
      return { ...prev, periodoComision: defaultPeriodoComision };
    });
  }, [defaultPeriodoComision]);

  useEffect(() => {
    if (!aval) return;
    setDraft((prev) => ({
      ...prev,
      descripcionCertificacion:
        prev.descripcionCertificacion || defaultDescripcionCertificacion,
      periodoComision:
        financieroRecord?.periodoComision?.trim() ||
        prev.periodoComision ||
        defaultPeriodoComision,
      periodoComisionFin:
        financieroRecord?.periodoComisionFin?.trim() || prev.periodoComisionFin,
      fechaEmision:
        toInputDate(financieroRecord?.fechaSalida) ||
        defaultFechaSalida ||
        prev.fechaEmision,
      firmanteNombre:
        financieroRecord?.nombreFirmante?.trim() ||
        prev.firmanteNombre ||
        fixedSigner.nombre,
      firmanteCargo:
        financieroRecord?.cargoFirmante?.trim() ||
        prev.firmanteCargo ||
        fixedSigner.cargo,
    }));
  }, [
    aval,
    financieroRecord,
    defaultDescripcionCertificacion,
    defaultFechaSalida,
    defaultPeriodoComision,
    fixedSigner.cargo,
    fixedSigner.nombre,
  ]);

  // Initialize notes once aval loads — prefer BD data, fall back to computed defaults
  useEffect(() => {
    if (notesInitialized) return;
    if (!aval) return;
    const savedNotas = parseNotasFromBd(financieroRecord?.notas);
    const initialNotas = savedNotas ?? buildDefaultNotas(aval);
    const fromBd = savedNotas !== null;
    setDraft((prev) => ({ ...prev, notas: initialNotas }));
    setEditableNotas(initialNotas.map(() => fromBd));
    setNotesInitialized(true);
  }, [notesInitialized, aval, financieroRecord]);

  const handleNotaChange = useCallback((index: number, value: string) => {
    setDraft((prev) => ({
      ...prev,
      notas: prev.notas.map((nota, i) =>
        i === index ? { ...nota, texto: value } : nota,
      ),
    }));
  }, []);

  const handleAddNota = useCallback(() => {
    setDraft((prev) => ({ ...prev, notas: [...prev.notas, { texto: "" }] }));
    setEditableNotas((prev) => [...prev, true]);
  }, []);

  const handleRemoveNota = useCallback((index: number) => {
    setDraft((prev) => {
      if (prev.notas.length <= 1) return prev;
      return { ...prev, notas: prev.notas.filter((_, i) => i !== index) };
    });
    setEditableNotas((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const handleEnableNotaEdit = useCallback((index: number) => {
    setEditableNotas((prev) =>
      prev.map((editable, i) => (i === index ? true : editable)),
    );
  }, []);

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

  if (!hasFinancialAccess) {
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
          <div className="max-w-xl mx-auto px-4 sm:px-5 py-5 space-y-3">
            <button
              onClick={() => router.push("/avales")}
              className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
            >
              <ArrowLeft className="w-4 h-4" />
              Volver
            </button>

            <div>
              <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                Certificación Financiera
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Completa los datos y revisa los 2 documentos financieros antes
                de aprobar.
              </p>
            </div>

            <div className="space-y-3 rounded-2xl border border-gray-200 dark:border-gray-800 p-3">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                1) Certificación presupuestaria
              </h2>

              <label className="block">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Descripción
                </span>
                <textarea
                  className="form-textarea w-full mt-1"
                  rows={3}
                  value={draft.descripcionCertificacion}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      descripcionCertificacion: e.target.value,
                    }))
                  }
                  placeholder="Describe la certificación presupuestaria..."
                />
              </label>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Nombre firmante
                  </span>
                  <input
                    className="form-input w-full mt-1"
                    value={draft.firmanteNombre}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        firmanteNombre: e.target.value,
                      }))
                    }
                    placeholder={fixedSigner.nombre || "Nombre completo"}
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Cargo firmante
                  </span>
                  <input
                    className="form-input w-full mt-1"
                    value={draft.firmanteCargo}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        firmanteCargo: e.target.value,
                      }))
                    }
                    placeholder={fixedSigner.cargo || "Cargo"}
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Período de comisión - Inicio
                  </span>
                  <input
                    type="date"
                    className="form-input w-full mt-1"
                    value={draft.periodoComision}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        periodoComision: e.target.value,
                      }))
                    }
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Período de comisión - Fin
                  </span>
                  <input
                    type="date"
                    className="form-input w-full mt-1"
                    value={draft.periodoComisionFin}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        periodoComisionFin: e.target.value,
                      }))
                    }
                  />
                </label>

                <label className="block md:col-span-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Fecha de salida
                  </span>
                  <input
                    type="date"
                    className="form-input w-full mt-1"
                    value={draft.fechaEmision}
                    disabled
                    readOnly
                  />
                </label>
              </div>
            </div>

            <div className="space-y-3 rounded-2xl border border-gray-200 dark:border-gray-800 p-3">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  2) Presupuesto de salida (notas)
                </h2>
                <button
                  type="button"
                  onClick={handleAddNota}
                  className="btn bg-gray-900 text-white hover:bg-gray-800 text-xs"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Agregar nota
                </button>
              </div>

              <div className="space-y-2">
                {draft.notas.map((nota, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <textarea
                      className="form-textarea w-full text-sm"
                      rows={4}
                      value={nota.texto}
                      readOnly={!editableNotas[index]}
                      disabled={!editableNotas[index]}
                      onChange={(e) => handleNotaChange(index, e.target.value)}
                      placeholder={`Nota ${index + 1}`}
                    />
                    <button
                      type="button"
                      onClick={() => handleEnableNotaEdit(index)}
                      className="btn bg-cyan-600 text-white hover:bg-cyan-700 text-xs"
                      title="Editar nota"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveNota(index)}
                      disabled={draft.notas.length <= 1}
                      className="btn bg-rose-500 text-white hover:bg-rose-600 disabled:opacity-50 disabled:cursor-not-allowed text-xs"
                      title="Eliminar nota"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {isEditable && (financieroSection?.visible ?? true) ? (
              <ApprovalFlowCard
                title="Aprobación financiera"
                currentStageLabel={getApprovalStageLabel(currentEtapa)}
                nextStageLabel={getApprovalStageLabel(APPROVAL_ETAPA)}
                reasonValue={rechazoMotivo}
                onReasonChange={setRechazoMotivo}
                actionError={actionError}
                actionLoading={actionLoading}
                onApprove={handleApprove}
                onReject={handleReject}
                approveVisible={
                  adminSaveOnly ? true : (approveAction?.visible ?? true)
                }
                approveEnabled={
                  adminSaveOnly ? true : (approveAction?.enabled ?? true)
                }
                rejectVisible={rejectAction?.visible ?? true}
                rejectEnabled={rejectAction?.enabled ?? true}
                adminSaveOnly={adminSaveOnly}
              />
            ) : (
              <div className="rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 p-4 text-sm text-emerald-700 dark:text-emerald-300">
                Este aval no está disponible para certificación financiera.
              </div>
            )}
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
            <PreviewCollapsible title="Certificacion compras publicas">
              <ComprasPublicasPreview aval={aval} draft={comprasDraft} />
            </PreviewCollapsible>
            <PreviewCollapsible title="Revision metodologo">
              <RevisionMetodologoPreview
                aval={aval}
                header={revisionHeader}
                footer={revisionFooter}
                reviewItems={DEFAULT_REVIEW_ITEMS}
                reviewState={reviewState}
              />
            </PreviewCollapsible>
            <PreviewCollapsible title="Aval Técnico Competitivo">
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
            <PreviewCollapsible title="Certificacion financiera" defaultOpen>
              <CertificacionFinancieraPreview aval={aval} draft={draft} />
            </PreviewCollapsible>
            <PreviewCollapsible title="Presupuesto salida anticipo" defaultOpen>
              <PresupuestoSalidaAnticipoPreview
                aval={aval}
                draft={{
                  notas: draft.notas.map((n) => n.texto),
                  codigoActividad: pdaDraft.codigoActividad,
                  numeroAval: pdaDraft.numeroAval,
                  fechaSalida: draft.fechaEmision,
                  periodoComision: draft.periodoComision,
                  periodoComisionFin: draft.periodoComisionFin,
                  pdaFirmanteNombre: pdaDraft.nombreFirmante,
                  pdaFirmanteCargo: pdaDraft.cargoFirmante,
                  financieroFirmanteNombre: draft.firmanteNombre,
                  financieroFirmanteCargo: draft.firmanteCargo,
                }}
              />
            </PreviewCollapsible>
          </div>
        </div>
      </div>
    </div>
  );
}

function buildDefaultNotas(aval: Aval): FinancieroNotaDraft[] {
  const requerimientosRaw = getAvalPresupuestoItems(aval)
    .map((item) => item.item?.nombre?.trim().toLowerCase())
    .filter((item): item is string => Boolean(item));
  const requerimientos = Array.from(new Set(requerimientosRaw));
  const requerimientosTexto = joinWithCommaAndY(requerimientos);

  return [
    {
      texto: requerimientosTexto
        ? `El requerimiento es ${requerimientosTexto}`
        : "El requerimiento es pasajes ida y vuelta, hospedaje, transporte de personal y deportistas, afiliacion y alimentacion",
    },
    {
      texto: `Las facturas de gastos deben solicitarse con los siguientes datos:
Razon Social: FEDERACION DEPORTIVA PROVINCIAL DE LOJA
RUC: 1191708241001
Direccion: EL TEJAR, CALLE MACARA SN ENTRE MERCADILLO Y AZUAY
Email: federacionloja@yahoo.es
Telefono: 0999819109`,
    },
    {
      texto: "El informe de gastos, se entregara como maximo 72 horas culminada la competencia",
    },
  ];
}

function parseNotasFromBd(notasJson: string | null | undefined): FinancieroNotaDraft[] | null {
  if (!notasJson) return null;
  try {
    const parsed: unknown = JSON.parse(notasJson);
    if (!Array.isArray(parsed) || parsed.length === 0) return null;
    return (parsed as Array<Record<string, unknown>>).map((n) => ({
      texto: typeof n.texto === "string" ? n.texto : "",
    }));
  } catch {
    return null;
  }
}
