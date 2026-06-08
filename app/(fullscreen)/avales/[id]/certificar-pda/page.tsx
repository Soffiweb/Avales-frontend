"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ExternalLink, FileText, Loader2 } from "lucide-react";

import { useApprovalFlow } from "@/lib/hooks/use-approval-flow";
import { aprobarAval, createPda } from "@/lib/api/avales";
import type { Aval, AvalPresupuestoFuente } from "@/types/aval";
import {
  formatCurrency,
  formatEventScheduleSentence,
  getResponsibleTrainerName,
} from "@/lib/utils/formatters";
import { formatCategoryLabel } from "@/lib/utils/categories";
import {
  ListaDeportistasPreview,
  SolicitudAvalPreview,
  type AvalPreviewFormData,
} from "@/app/(app)/avales/_components/aval-document-preview";
import PdaPreview, {
  type PdaDraft,
} from "@/app/(app)/avales/_components/pda-preview";
import PresupuestoSalidaAnticipoPreview from "@/app/(app)/avales/_components/presupuesto-salida-anticipo-preview";
import AlertBanner from "@/components/ui/alert-banner";
import PreviewCollapsible from "@/app/(app)/avales/_components/preview-collapsible";
import { isPdaUser } from "@/lib/auth/access";
import {
  getApprovalStageLabel,
  getTipoAvalLabel,
} from "@/lib/constants";
import {
  getNextApprovalStageForAval,
  getPreviousApprovalStagesForAval,
} from "@/lib/approval-flow";

const INITIAL_PDA_DRAFT: PdaDraft = {
  descripcion: "",
  numeroPda: "",
  numeroAval: "",
  codigoActividad: "005",
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

type BudgetDraftDia = {
  numeroDia: number;
  cantidad?: number;
  valorUnitario?: number;
};

type BudgetDraftItem = {
  id: number;
  itemId: number;
  codigo: number;
  nombre: string;
  actividad: string;
  dias: BudgetDraftDia[];
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

function buildDefaultDescripcion(aval: Aval) {
  const evento = aval.evento;
  const disciplina = evento?.disciplina?.nombre ?? "[DISCIPLINA]";
  const fecha = formatEventScheduleSentence(evento);
  const eventoNombre = evento?.nombre ?? "[NOMBRE EVENTO]";
  const categoria = formatCategoryLabel(
    evento?.categoria?.nombre ?? evento?.categoriaCodigo,
    "",
  );
  const entrenadorResponsable = getResponsibleTrainerName(
    aval,
    "[NOMBRE ENTRENADOR RESPONSABLE]",
  );
  const numeroAval =
    aval.avalTecnico?.numeroAval ??
    aval.aval ??
    aval.numeroColeccion ??
    String(aval.id);

  return `De acuerdo al aval Técnico de Participación Competitiva ${numeroAval}, de la disciplina de ${disciplina} con fecha ${fecha}, suscrito por el ${entrenadorResponsable} Entrenador de la disciplina me permito certificar que el evento ${eventoNombre.toUpperCase()}${
    categoria ? ` (${categoria.toUpperCase()})` : ""
  } consta en el PDA 2026 aprobado por el Ministerio del Deporte.`;
}

function validatePdaDraft(draft: PdaDraft): string | null {
  if (!draft.descripcion.trim()) return "La descripción del certificado es obligatoria.";
  if (draft.descripcion.includes("[NUMERO AVAL]"))
    return "La descripción aún contiene [NUMERO AVAL]. Debes reemplazarlo.";
  if (draft.descripcion.includes("[NOMBRE PRESIDENTE]"))
    return "La descripción aún contiene [NOMBRE PRESIDENTE]. Debes reemplazarlo.";
  return null;
}

function normalizePositiveNumber(value: string, fallback?: number) {
  if (!value.trim()) return fallback;
  const parsed = Number.parseFloat(value.replace(",", "."));
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

function normalizePositiveInteger(value: string, fallback?: number) {
  if (!value.trim()) return fallback;
  const digitsOnly = value.replace(/\D/g, "");
  if (!digitsOnly) return fallback;
  const parsed = Number.parseInt(digitsOnly, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}

function getDraftItemDiaTotal(dia: BudgetDraftDia) {
  return roundCurrency((dia.cantidad ?? 0) * (dia.valorUnitario ?? 0));
}

function getDraftItemTotal(item: BudgetDraftItem) {
  return roundCurrency(item.dias.reduce((sum, dia) => sum + getDraftItemDiaTotal(dia), 0));
}

function buildBudgetDraftItems(aval: Aval): BudgetDraftItem[] {
  const requerimientos = aval.avalTecnico?.requerimientos ?? [];
  const fuenteObjetivo = aval.tipoAval === "AUTOGESTION" ? "AUTOGESTION" : "FONDOS_PUBLICOS";
  return (aval.evento?.presupuesto ?? [])
    .filter((item) => item.fuente === fuenteObjetivo)
    .map((item) => {
    const totalOriginal = roundCurrency(Number.parseFloat(item.presupuesto ?? "0") || 0);
    const requerimiento = requerimientos.find(
      (c) => c.rubroId === item.item.id || c.rubroId === item.id,
    );
    const cantidadDias =
      normalizePositiveNumber(requerimiento?.cantidadDias ?? "1") || 1;
    const valorUnitario = roundCurrency(
      requerimiento?.valorUnitario && requerimiento.valorUnitario > 0
        ? requerimiento.valorUnitario
        : totalOriginal / cantidadDias,
    );
    return {
      id: item.id,
      itemId: item.item.id,
      codigo: item.item.numero,
      nombre: item.item.nombre,
      actividad: item.item.actividad?.nombre ?? "EVENTOS DE PREPARACION Y COMPETENCIA",
      dias: [{ numeroDia: 1, cantidad: 1, valorUnitario }],
    };
    });
}

function PresupuestoFuenteWidget({ presupuesto }: { presupuesto: AvalPresupuestoFuente }) {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 px-4 py-3 space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
        Presupuesto{presupuesto.fuente ? ` — ${getTipoAvalLabel(presupuesto.fuente)}` : ""}
      </p>
      <div className="grid grid-cols-3 gap-3">
        {(
          [
            { label: "Asignado", value: presupuesto.asignado },
            { label: "Comprometido", value: presupuesto.comprometido },
            { label: "Disponible", value: presupuesto.disponible },
          ] as const
        ).map(({ label, value }) => (
          <div key={label}>
            <p className="text-[0.65rem] text-gray-500 dark:text-gray-400">{label}</p>
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              {formatCurrency(value)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function CertificarAvalPage() {
  const params = useParams();
  const router = useRouter();
  const avalId = Number(params.id);

  const [draft, setDraft] = useState<PdaDraft>(INITIAL_PDA_DRAFT);
  const [budgetDraftItems, setBudgetDraftItems] = useState<BudgetDraftItem[]>([]);
  const [montoAsignado, setMontoAsignado] = useState("");
  const [justificacionAjuste, setJustificacionAjuste] = useState("");
  const montoAsignadoInitialized = useRef(false);

  const totalPresupuestoDraft = useMemo(
    () => budgetDraftItems.reduce((total, item) => total + getDraftItemTotal(item), 0),
    [budgetDraftItems],
  );

  const {
    authLoading,
    user,
    hasRequiredRole: isPda,
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
    requiredRole: isPdaUser,
    editableEtapa: "SOLICITUD",
    approvalEtapa: (etapa, currentAval) =>
      getNextApprovalStageForAval(currentAval, etapa) ?? etapa,
    enableEtapaDestino: true,
    validateApprove: useCallback((currentAval: Aval) => {
      const pdaError = validatePdaDraft(draft);
      if (pdaError) return pdaError;

      if (currentAval.tipoAval === "AUTOGESTION") {
        const monto = Number.parseFloat(montoAsignado.replace(",", "."));
        if (!Number.isFinite(monto) || monto <= 0) {
          return "Debes ingresar el monto aprobado por PDA (mayor a 0).";
        }
        const montoOriginal = currentAval.montoSolicitado ?? 0;
        if (Math.abs(monto - montoOriginal) >= 0.01 && !justificacionAjuste.trim()) {
          return "Debes justificar el ajuste del monto solicitado.";
        }
      }

      const invalidItems = budgetDraftItems.filter(
        (item) =>
          item.dias.length === 0 ||
          item.dias.some(
            (dia) =>
              !dia.cantidad ||
              !dia.valorUnitario ||
              dia.cantidad <= 0 ||
              dia.valorUnitario <= 0,
          ),
      );
      if (invalidItems.length > 0) {
        return "Todos los ítems deben tener al menos un día con cantidad y valor unitario mayores a 0.";
      }

      const totalOriginal = (currentAval?.evento?.presupuesto ?? []).reduce(
        (t, item) => t + (Number.parseFloat(item.presupuesto ?? "0") || 0),
        0,
      );
      const difference = roundCurrency(totalPresupuestoDraft - totalOriginal);
      if (Math.abs(difference) >= 0.01) {
        return "El total del presupuesto editado debe coincidir con el total original del evento.";
      }

      return null;
    }, [draft, budgetDraftItems, totalPresupuestoDraft, montoAsignado, justificacionAjuste]),
    onApproveAction: useCallback(
      async ({ aval: a, userId, approvalEtapa }) => {
        const isAutogestion = a.tipoAval === "AUTOGESTION";

        const items = budgetDraftItems
          .map((item) => ({
            itemId: item.itemId,
            presupuesto: getDraftItemTotal(item),
            dias: item.dias.map((dia) => ({
              numeroDia: dia.numeroDia,
              cantidad: dia.cantidad!,
              valorUnitario: dia.valorUnitario!,
            })),
          }))
          .filter((item) => Number.isFinite(item.presupuesto) && item.itemId > 0);

        const monto = isAutogestion
          ? normalizePositiveNumber(montoAsignado)
          : undefined;

        const pdaPayload = {
          descripcion: draft.descripcion.trim(),
          numeroPda: draft.numeroPda?.trim() || undefined,
          numeroAval: draft.numeroAval?.trim() || undefined,
          codigoActividad: draft.codigoActividad?.trim() || "005",
          nombreFirmante: draft.nombreFirmante?.trim() || undefined,
          cargoFirmante: draft.cargoFirmante?.trim() || undefined,
          montoAsignado: monto,
          items: items.length > 0 ? items : undefined,
        };

        await createPda(a.id, pdaPayload);
        await aprobarAval(a.id, userId, approvalEtapa);
      },
      [draft, budgetDraftItems, montoAsignado],
    ),
    approveSuccessMessage: "PDA aprobado correctamente.",
    rejectSuccessMessage: "PDA rechazado correctamente.",
  });

  // Reset local state when navigating between avales
  useEffect(() => {
    setDraft(INITIAL_PDA_DRAFT);
    setBudgetDraftItems([]);
    setMontoAsignado("");
    setJustificacionAjuste("");
    montoAsignadoInitialized.current = false;
  }, [avalId]);

  // Populate draft description and pda numbers from loaded aval
  useEffect(() => {
    if (!aval) return;
    if (draft.descripcion.trim()) return;
    setDraft((prev) => ({
      ...prev,
      descripcion: buildDefaultDescripcion(aval),
      numeroPda: prev.numeroPda || aval.pda?.numeroPda || "",
      numeroAval: prev.numeroAval || aval.pda?.numeroAval || "",
    }));
  }, [aval, draft.descripcion]);

  // Populate signer fields from current user
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

  // Build budget items by aval funding source
  useEffect(() => {
    if (!aval) return;
    if (aval.tipoAval === "SOLO_RESULTADO") {
      setBudgetDraftItems([]);
      return;
    }
    setBudgetDraftItems(buildBudgetDraftItems(aval));
  }, [aval]);

  // Pre-populate montoAsignado for AUTOGESTION — useRef evita re-set al recargar aval
  useEffect(() => {
    if (!aval || aval.tipoAval !== "AUTOGESTION") return;
    if (montoAsignadoInitialized.current) return;
    const initial = aval.montoAsignado ?? aval.montoSolicitado;
    if (initial != null && initial > 0) {
      setMontoAsignado(String(initial));
      montoAsignadoInitialized.current = true;
    }
  }, [aval]);

  const trainerDocsData = useMemo(
    () => (aval ? buildTrainerDocsData(aval) : EMPTY_DOCS_DATA),
    [aval],
  );

  const presupuestoItems = useMemo(() => {
    if (!aval) return [];
    const fuenteObjetivo = aval.tipoAval === "AUTOGESTION" ? "AUTOGESTION" : "FONDOS_PUBLICOS";
    return (aval.evento?.presupuesto ?? []).filter((item) => item.fuente === fuenteObjetivo);
  }, [aval]);
  const totalPresupuestoOriginal = useMemo(
    () =>
      presupuestoItems.reduce(
        (total, item) => total + (Number.parseFloat(item.presupuesto ?? "0") || 0),
        0,
      ),
    [presupuestoItems],
  );
  const totalDifference = useMemo(
    () => roundCurrency(totalPresupuestoDraft - totalPresupuestoOriginal),
    [totalPresupuestoDraft, totalPresupuestoOriginal],
  );
  const totalMatches = Math.abs(totalDifference) < 0.01;

  const budgetPreviewItems = useMemo(
    () =>
      budgetDraftItems.map((item) => ({
        id: item.id,
        nombre: item.nombre,
        total: getDraftItemTotal(item),
        dias: item.dias
          .filter(
            (dia): dia is { numeroDia: number; cantidad: number; valorUnitario: number } =>
              typeof dia.cantidad === "number" &&
              typeof dia.valorUnitario === "number",
          )
          .map((dia) => ({
            numeroDia: dia.numeroDia,
            cantidad: dia.cantidad,
            valorUnitario: dia.valorUnitario,
          })),
      })),
    [budgetDraftItems],
  );

  const handleDiaChange = useCallback(
    (itemId: number, numeroDia: number, field: "cantidad" | "valorUnitario", value: string) => {
      setBudgetDraftItems((prev) =>
        prev.map((item) => {
          if (item.id !== itemId) return item;
          return {
            ...item,
            dias: item.dias.map((dia) => {
              if (dia.numeroDia !== numeroDia) return dia;
              return {
                ...dia,
                [field]:
                  field === "cantidad"
                    ? normalizePositiveInteger(value)
                    : normalizePositiveNumber(value),
              };
            }),
          };
        }),
      );
    },
    [],
  );

  const handleAddDia = useCallback((itemId: number) => {
    setBudgetDraftItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;
        const maxDia = Math.max(...item.dias.map((d) => d.numeroDia), 0);
        return {
          ...item,
          dias: [...item.dias, { numeroDia: maxDia + 1, cantidad: 1, valorUnitario: 0 }],
        };
      }),
    );
  }, []);

  const handleRemoveDia = useCallback((itemId: number, numeroDia: number) => {
    setBudgetDraftItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;
        if (item.dias.length <= 1) return item;
        return { ...item, dias: item.dias.filter((dia) => dia.numeroDia !== numeroDia) };
      }),
    );
  }, []);

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

  if (!isPda) {
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

  if (aval.tipoAval === "SOLO_RESULTADO") {
    return (
      <div className="px-6 py-8">
        <div className="bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 rounded-xl p-6 text-center">
          Este aval es de tipo <strong>Solo por Resultados</strong> y no requiere certificación PDA.
        </div>
      </div>
    );
  }

  const isAutogestion = aval.tipoAval === "AUTOGESTION";
  const montoAsignadoNum = Number.parseFloat(montoAsignado.replace(",", "."));
  const montoSolicitadoNum = aval.montoSolicitado ?? 0;
  const montoChanged =
    isAutogestion &&
    montoAsignado.trim() !== "" &&
    Number.isFinite(montoAsignadoNum) &&
    aval.montoSolicitado != null &&
    Math.abs(montoAsignadoNum - montoSolicitadoNum) >= 0.01;

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
          <div className="max-w-2xl mx-auto px-6 sm:px-8 py-8">
            <button
              onClick={() => router.push("/avales")}
              className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 mb-6"
            >
              <ArrowLeft className="w-4 h-4" />
              Volver
            </button>

            <div className="space-y-5">
              <div className="max-w-xl">
                <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                  Certificacion PDA
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Completa los datos del modelo PDA. El parrafo principal se agregara despues.
                </p>
              </div>

              <div className="max-w-xl">
                {aval.convocatoriaUrl ? (
                  <a
                    href={aval.convocatoriaUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="btn w-full justify-center bg-indigo-500 text-white hover:bg-indigo-600 sm:w-auto"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Ver convocatoria
                    <ExternalLink className="w-4 h-4 ml-2" />
                  </a>
                ) : (
                  <button
                    type="button"
                    disabled
                    className="btn w-full justify-center border border-gray-200 bg-gray-100 text-gray-400 disabled:cursor-not-allowed dark:border-gray-700 dark:bg-gray-900 dark:text-gray-500 sm:w-auto"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Convocatoria no disponible
                  </button>
                )}
              </div>

              <div className="grid max-w-xl grid-cols-1 gap-4 md:grid-cols-2">
                <label className="block md:col-span-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Descripcion del certificado
                  </span>
                  <textarea
                    className="form-textarea w-full mt-1"
                    rows={4}
                    value={draft.descripcion}
                    readOnly={!isEditable}
                    disabled={!isEditable}
                    onChange={(e) => setDraft((prev) => ({ ...prev, descripcion: e.target.value }))}
                    placeholder="Escribe la descripcion que va en la parte superior del certificado..."
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
                      setDraft((prev) => ({ ...prev, nombreFirmante: e.target.value }))
                    }
                    placeholder="Ej: Lic. Juan Perez"
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
                    placeholder="Ej: Metodologo Provincial"
                  />
                </label>
              </div>

              {/* Sección AUTOGESTION */}
              {isAutogestion && (
                <div className="max-w-xl space-y-4">
                  <div>
                    <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      Presupuesto de autogestión
                    </h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Revisa el monto solicitado y aprueba o ajusta el monto asignado.
                    </p>
                  </div>

                  {/* Monto solicitado por entrenador */}
                  <div className="rounded-xl border border-indigo-100 dark:border-indigo-900/50 bg-indigo-50/50 dark:bg-indigo-950/20 px-4 py-3">
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Monto solicitado por entrenador
                    </p>
                    <p className="mt-1 text-lg font-bold text-gray-900 dark:text-gray-100">
                      {aval.montoSolicitado != null
                        ? formatCurrency(aval.montoSolicitado)
                        : "—"}
                    </p>
                  </div>

                  {/* Monto aprobado por PDA */}
                  <label className="block">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Monto aprobado por PDA *
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      inputMode="decimal"
                      className="form-input w-full mt-1"
                      value={montoAsignado}
                      readOnly={!isEditable}
                      disabled={!isEditable}
                      onChange={(e) => setMontoAsignado(e.target.value)}
                      placeholder="0.00"
                    />
                  </label>

                  {/* Justificación si el monto cambia */}
                  {montoChanged && (
                    <label className="block">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Justificación del ajuste
                      </span>
                      <textarea
                        className="form-textarea w-full mt-1"
                        rows={3}
                        value={justificacionAjuste}
                        readOnly={!isEditable}
                        disabled={!isEditable}
                        onChange={(e) => setJustificacionAjuste(e.target.value)}
                        placeholder="Explica por qué se ajustó el monto solicitado..."
                      />
                    </label>
                  )}
                </div>
              )}

              {/* Presupuesto por fuente */}
              {aval.presupuesto && (
                <div className="max-w-xl">
                  <PresupuestoFuenteWidget presupuesto={aval.presupuesto} />
                </div>
              )}

              <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/40">
                <div className="flex items-center justify-between gap-4 border-b border-gray-200 dark:border-gray-800 px-4 py-3">
                  <div>
                    <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      Items del presupuesto
                    </h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Desglose por día del presupuesto por ítem.
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">
                      Total
                    </p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      {formatCurrency(totalPresupuestoDraft)}
                    </p>
                  </div>
                </div>

                <div className="px-4 pt-4">
                  <div
                    className={`rounded-xl border px-3 py-2 text-xs ${
                      totalMatches
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-950/40 dark:text-emerald-300"
                        : "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-300"
                    }`}
                  >
                    <p>Total original: {formatCurrency(totalPresupuestoOriginal)}</p>
                    <p>Total editado: {formatCurrency(totalPresupuestoDraft)}</p>
                    <p>
                      Diferencia: {formatCurrency(Math.abs(totalDifference))}
                      {!totalMatches ? " (debe quedar en 0)" : ""}
                    </p>
                  </div>
                </div>

                {budgetDraftItems.length === 0 ? (
                  <div className="px-4 py-6 text-sm text-gray-500 dark:text-gray-400">
                    Este aval no tiene items presupuestarios registrados.
                  </div>
                ) : (
                  <div className="space-y-6 p-4">
                    {budgetDraftItems.map((item) => (
                      <div
                        key={item.id}
                        className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
                      >
                        <div className="bg-gray-50 dark:bg-gray-800/60 px-4 py-3">
                          <p className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                            {item.codigo} - {item.nombre}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {item.actividad}
                          </p>
                        </div>

                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead className="bg-gray-100 dark:bg-gray-800">
                              <tr>
                                <th className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-300">
                                  Día
                                </th>
                                <th className="px-3 py-2 text-right font-medium text-gray-600 dark:text-gray-300">
                                  Cantidad
                                </th>
                                <th className="px-3 py-2 text-right font-medium text-gray-600 dark:text-gray-300">
                                  V. Unitario
                                </th>
                                <th className="px-3 py-2 text-right font-medium text-gray-600 dark:text-gray-300">
                                  Subtotal
                                </th>
                                <th className="px-3 py-2 text-center font-medium text-gray-600 dark:text-gray-300">
                                  Acciones
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                              {item.dias.map((dia) => (
                                <tr key={`${item.id}-${dia.numeroDia}`}>
                                  <td className="px-3 py-2 text-gray-700 dark:text-gray-300">
                                    Día {dia.numeroDia}
                                  </td>
                                  <td className="px-3 py-2 text-right">
                                    <input
                                      type="text"
                                      inputMode="numeric"
                                      className="form-input w-20 ml-auto text-right"
                                      value={dia.cantidad || ""}
                                      readOnly={!isEditable}
                                      disabled={!isEditable}
                                      onChange={(e) => {
                                        const value = e.target.value.replace(/\D/g, "");
                                        handleDiaChange(item.id, dia.numeroDia, "cantidad", value);
                                      }}
                                    />
                                  </td>
                                  <td className="px-3 py-2 text-right">
                                    <input
                                      type="text"
                                      inputMode="decimal"
                                      className="form-input w-24 ml-auto text-right"
                                      value={dia.valorUnitario || ""}
                                      readOnly={!isEditable}
                                      disabled={!isEditable}
                                      onChange={(e) => {
                                        const value = e.target.value
                                          .replace(/[^0-9.,]/g, "")
                                          .replace(",", ".");
                                        handleDiaChange(
                                          item.id,
                                          dia.numeroDia,
                                          "valorUnitario",
                                          value,
                                        );
                                      }}
                                    />
                                  </td>
                                  <td className="px-3 py-2 text-right font-medium text-gray-900 dark:text-gray-100">
                                    {formatCurrency(getDraftItemDiaTotal(dia))}
                                  </td>
                                  <td className="px-3 py-2 text-center">
                                    {isEditable && item.dias.length > 1 && (
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveDia(item.id, dia.numeroDia)}
                                        className="text-rose-500 hover:text-rose-600 text-lg"
                                      >
                                        ×
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        <div className="bg-gray-50 dark:bg-gray-800/40 px-4 py-2 flex items-center justify-between">
                          <div className="flex gap-2">
                            {isEditable && (
                              <button
                                type="button"
                                onClick={() => handleAddDia(item.id)}
                                className="text-xs font-medium text-cyan-600 hover:text-cyan-700 dark:text-cyan-400 dark:hover:text-cyan-300"
                              >
                                + Agregar día
                              </button>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              Total del ítem
                            </p>
                            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                              {formatCurrency(getDraftItemTotal(item))}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {isEditable && (
                <div className="max-w-xl rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/40 p-4 space-y-3">
                  <div>
                    <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      Certificación PDA
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
            <PreviewCollapsible title="Certificacion PDA" defaultOpen>
              <PdaPreview
                aval={{
                  ...aval,
                  evento: {
                    ...aval.evento,
                    presupuesto: presupuestoItems.map((item) => {
                      const budgetItem = budgetDraftItems.find((d) => d.id === item.id);
                      return {
                        ...item,
                        presupuesto: String(
                          budgetItem
                            ? getDraftItemTotal(budgetItem)
                            : Number.parseFloat(item.presupuesto ?? "0") || 0,
                        ),
                      };
                    }),
                  },
                }}
                draft={draft}
              />
            </PreviewCollapsible>
            <PreviewCollapsible title="Presupuesto de salida" defaultOpen>
              <PresupuestoSalidaAnticipoPreview
                aval={aval}
                items={budgetPreviewItems}
                draft={{
                  notas: [],
                  codigoActividad: draft.codigoActividad,
                  numeroAval: draft.numeroAval,
                }}
              />
            </PreviewCollapsible>
          </div>
        </div>
      </div>
    </div>
  );
}
