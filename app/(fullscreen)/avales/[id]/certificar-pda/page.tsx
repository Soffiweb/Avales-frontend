"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";

import { useAuth } from "@/app/providers/auth-provider";
import { aprobarAval, createPda, getAval, rechazarAval } from "@/lib/api/avales";
import type { Aval, EtapaFlujo } from "@/types/aval";
import {
  formatCurrency,
  formatDate,
  formatRoles,
  getResponsibleTrainerName,
} from "@/lib/utils/formatters";
import {
  ListaDeportistasPreview,
  SolicitudAvalPreview,
  type AvalPreviewFormData,
} from "@/app/(app)/avales/_components/aval-document-preview";
import PdaPreview, { type PdaDraft } from "@/app/(app)/avales/_components/pda-preview";
import PresupuestoSalidaAnticipoPreview from "@/app/(app)/avales/_components/presupuesto-salida-anticipo-preview";
import AlertBanner from "@/components/ui/alert-banner";
import PreviewCollapsible from "@/app/(app)/avales/_components/preview-collapsible";
import { getCurrentEtapa } from "@/lib/utils/aval-historial";
import { getApprovalStageLabel, getNextApprovalStage, getPreviousApprovalStages } from "@/lib/constants";

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

type BudgetDraftItem = {
  id: number;
  itemId: number;
  codigo: number;
  nombre: string;
  actividad: string;
  cantidad: number;
  dias: number;
  valorUnitario: number;
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

function buildDefaultDescripcion(aval: Aval) {
  const evento = aval.evento;
  const disciplina = evento?.disciplina?.nombre ?? "[DISCIPLINA]";
  const fecha = evento?.fechaInicio
    ? formatDate(evento.fechaInicio)
    : "[FECHA EVENTO]";
  const eventoNombre = evento?.nombre ?? "[NOMBRE EVENTO]";
  const categoria = evento?.categoria?.nombre;
  const entrenadorResponsable = getResponsibleTrainerName(
    aval,
    "[NOMBRE ENTRENADOR RESPONSABLE]",
  );
  const numeroAval =
    aval.avalTecnico?.numeroAval ??
    aval.aval ??
    aval.numeroColeccion ??
    String(aval.id);

  return `De acuerdo al aval Técnico de Participación Competitiva ${numeroAval}, de la disciplina de ${disciplina} con fecha ${fecha}, suscrito por el ${entrenadorResponsable} Entrenador de la disciplina y la [NOMBRE PRESIDENTE] Presidente del Comité de Funcionamiento me permito certificar que el evento ${eventoNombre.toUpperCase()}${
    categoria ? ` (${categoria.toUpperCase()})` : ""
  } consta en el PDA 2026 aprobado por el Ministerio del Deporte.`;
}

function validatePdaDraft(draft: PdaDraft): string | null {
  if (!draft.descripcion.trim()) {
    return "La descripción del certificado es obligatoria.";
  }
  if (draft.descripcion.includes("[NUMERO AVAL]")) {
    return "La descripción aún contiene [NUMERO AVAL]. Debes reemplazarlo.";
  }
  if (draft.descripcion.includes("[NOMBRE PRESIDENTE]")) {
    return "La descripción aún contiene [NOMBRE PRESIDENTE]. Debes reemplazarlo.";
  }
  return null;
}

function normalizePositiveNumber(value: string, fallback = 1) {
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}

function getDraftItemTotal(item: BudgetDraftItem) {
  return roundCurrency(item.cantidad * item.dias * item.valorUnitario);
}

function buildBudgetDraftItems(aval: Aval): BudgetDraftItem[] {
  const requerimientos = aval.avalTecnico?.requerimientos ?? [];

  return (aval.evento?.presupuesto ?? []).map((item) => {
    const totalOriginal = roundCurrency(
      Number.parseFloat(item.presupuesto ?? "0") || 0,
    );
    const requerimiento = requerimientos.find(
      (candidate) =>
        candidate.rubroId === item.item.id || candidate.rubroId === item.id,
    );
    const dias = normalizePositiveNumber(requerimiento?.cantidadDias ?? "1");
    const cantidad = 1;
    const valorUnitario = roundCurrency(
      requerimiento?.valorUnitario && requerimiento.valorUnitario > 0
        ? requerimiento.valorUnitario
        : totalOriginal / (cantidad * dias || 1),
    );

    return {
      id: item.id,
      itemId: item.item.id,
      codigo: item.item.numero,
      nombre: item.item.nombre,
      actividad: item.item.actividad?.nombre ?? "EVENTOS DE PREPARACION Y COMPETENCIA",
      cantidad,
      dias,
      valorUnitario,
    };
  });
}

export default function CertificarAvalPage() {
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
  const [draft, setDraft] = useState<PdaDraft>(INITIAL_PDA_DRAFT);
  const [budgetDraftItems, setBudgetDraftItems] = useState<BudgetDraftItem[]>([]);

  const isPda = user?.roles?.includes("PDA") ?? false;
  const defaultSignerName = useMemo(() => {
    if (!user) return "";
    return [user.nombre, user.apellido].filter(Boolean).join(" ").trim();
  }, [user]);
  const defaultSignerCargo = useMemo(
    () => (user?.roles?.length ? formatRoles(user.roles) : ""),
    [user],
  );

  useEffect(() => {
    setDraft(INITIAL_PDA_DRAFT);
    setBudgetDraftItems([]);
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
    if (draft.descripcion.trim()) return;
    setDraft((prev) => ({
      ...prev,
      descripcion: buildDefaultDescripcion(aval),
      numeroPda: prev.numeroPda || aval.pda?.numeroPda || "",
      numeroAval: prev.numeroAval || aval.pda?.numeroAval || "",
    }));
  }, [aval, draft.descripcion]);

  useEffect(() => {
    if (!aval) return;
    setBudgetDraftItems(buildBudgetDraftItems(aval));
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
  const presupuestoItems = aval?.evento?.presupuesto ?? [];
  const totalPresupuestoOriginal = useMemo(
    () =>
      presupuestoItems.reduce(
        (total, item) => total + (Number.parseFloat(item.presupuesto ?? "0") || 0),
        0,
      ),
    [presupuestoItems],
  );
  const totalPresupuestoDraft = useMemo(
    () => budgetDraftItems.reduce((total, item) => total + getDraftItemTotal(item), 0),
    [budgetDraftItems],
  );
  const totalDifference = useMemo(
    () => roundCurrency(totalPresupuestoDraft - totalPresupuestoOriginal),
    [totalPresupuestoDraft, totalPresupuestoOriginal],
  );
  const budgetPreviewItems = useMemo(
    () =>
      budgetDraftItems.map((item) => ({
        id: item.id,
        nombre: item.nombre,
        total: getDraftItemTotal(item),
      })),
    [budgetDraftItems],
  );
  const totalMatches = Math.abs(totalDifference) < 0.01;

  const etapaActualResponse = aval?.etapaActual;
  const etapaActualHistorial = getCurrentEtapa(aval?.historial);
  const currentEtapa = (etapaActualResponse ??
    etapaActualHistorial ??
    "SOLICITUD") as EtapaFlujo;
  const isEditable =
    aval?.estado === "SOLICITADO" && currentEtapa === "SOLICITUD";
  const nextEtapa = getNextApprovalStage(currentEtapa);
  const approvalEtapa = nextEtapa ?? currentEtapa;
  const currentStageLabel = getApprovalStageLabel(currentEtapa);
  const nextStageLabel = getApprovalStageLabel(approvalEtapa);
  const summaryText = `El aval pasará de "${currentStageLabel}" a "${nextStageLabel}" y quedará en "${nextStageLabel}".`;

  const handleApprove = useCallback(async () => {
    if (!aval) return;
    if (!user?.id) {
      setActionError("No se pudo identificar el usuario.");
      return;
    }
    if (!isEditable) {
      setActionError("No puedes aprobar este aval en la etapa actual.");
      return;
    }
    const validationError = validatePdaDraft(draft);
    if (validationError) {
      setActionError(validationError);
      return;
    }
    if (!totalMatches) {
      setActionError("El total del presupuesto editado debe coincidir con el total original del evento.");
      return;
    }

    setActionError(null);
    setActionLoading(true);
    try {
      const items = budgetDraftItems
        .map((item) => ({
          itemId: item.itemId,
          presupuesto: getDraftItemTotal(item),
        }))
        .filter((item) => Number.isFinite(item.presupuesto) && item.itemId > 0);

      const pdaPayload = {
        descripcion: draft.descripcion.trim(),
        numeroPda: draft.numeroPda?.trim() || undefined,
        numeroAval: draft.numeroAval?.trim() || undefined,
        codigoActividad: draft.codigoActividad?.trim() || "005",
        nombreFirmante: draft.nombreFirmante?.trim() || undefined,
        cargoFirmante: draft.cargoFirmante?.trim() || undefined,
        items,
      };

      await createPda(aval.id, pdaPayload);
      await aprobarAval(aval.id, user.id, approvalEtapa);
      setToast({ variant: "success", message: "PDA aprobado correctamente." });
      await loadAval();
    } catch (err: unknown) {
      setActionError(
        err instanceof Error
          ? err.message
          : "No se pudo crear o aprobar el PDA.",
      );
    } finally {
      setActionLoading(false);
    }
  }, [aval, user?.id, approvalEtapa, loadAval, draft, isEditable, budgetDraftItems, totalMatches]);

  const handleBudgetItemChange = useCallback(
    (id: number, field: "cantidad" | "dias" | "valorUnitario", value: string) => {
      setBudgetDraftItems((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                [field]:
                  field === "valorUnitario"
                    ? roundCurrency(normalizePositiveNumber(value))
                    : normalizePositiveNumber(value),
              }
            : item,
        ),
      );
    },
    [],
  );

  const handleReject = useCallback(async () => {
    if (!aval) return;
    if (!user?.id) {
      setActionError("No se pudo identificar el usuario.");
      return;
    }
    if (!isEditable) {
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
        etapaDestino ? (etapaDestino as EtapaFlujo) : undefined,
      );
      setToast({ variant: "success", message: "PDA rechazado correctamente." });
      setRechazoMotivo("");
      setEtapaDestino("");
      await loadAval();
    } catch (err: unknown) {
      setActionError(
        err instanceof Error ? err.message : "No se pudo rechazar el PDA.",
      );
    } finally {
      setActionLoading(false);
    }
  }, [aval, user?.id, rechazoMotivo, etapaDestino, currentEtapa, loadAval, isEditable]);

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
                  Certificacion PDA
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Completa los datos del modelo PDA. El parrafo principal se agregara despues.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    onChange={(e) =>
                      setDraft((prev) => ({ ...prev, descripcion: e.target.value }))
                    }
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

              <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/40">
                <div className="flex items-center justify-between gap-4 border-b border-gray-200 dark:border-gray-800 px-4 py-3">
                  <div>
                    <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      Items del presupuesto
                    </h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Ajusta cantidades, dias o valor unitario sin cambiar el total general.
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
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead className="bg-gray-50 dark:bg-gray-800/60">
                        <tr>
                          <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">
                            Cantidad
                          </th>
                          <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">
                            Dias
                          </th>
                          <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">
                            Codigo
                          </th>
                          <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">
                            Nombre
                          </th>
                          <th className="px-4 py-3 text-right font-medium text-gray-600 dark:text-gray-300">
                            V. unitario
                          </th>
                          <th className="px-4 py-3 text-right font-medium text-gray-600 dark:text-gray-300">
                            Valor
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                        {budgetDraftItems.map((item) => (
                          <tr key={item.id}>
                            <td className="px-4 py-3 text-gray-700 dark:text-gray-200">
                              <input
                                type="number"
                                min="1"
                                step="1"
                                className="form-input w-20"
                                value={item.cantidad}
                                readOnly={!isEditable}
                                disabled={!isEditable}
                                onChange={(e) =>
                                  handleBudgetItemChange(item.id, "cantidad", e.target.value)
                                }
                              />
                            </td>
                            <td className="px-4 py-3 text-gray-700 dark:text-gray-200">
                              <input
                                type="number"
                                min="1"
                                step="1"
                                className="form-input w-20"
                                value={item.dias}
                                readOnly={!isEditable}
                                disabled={!isEditable}
                                onChange={(e) =>
                                  handleBudgetItemChange(item.id, "dias", e.target.value)
                                }
                              />
                            </td>
                            <td className="px-4 py-3 text-gray-700 dark:text-gray-200">
                              {item.codigo}
                            </td>
                            <td className="px-4 py-3 text-gray-900 dark:text-gray-100">
                              <div className="min-w-[220px]">
                                <p>{item.nombre}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                  {item.actividad}
                                </p>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right text-gray-900 dark:text-gray-100">
                              <input
                                type="number"
                                min="0.01"
                                step="0.01"
                                className="form-input w-28 ml-auto text-right"
                                value={item.valorUnitario}
                                readOnly={!isEditable}
                                disabled={!isEditable}
                                onChange={(e) =>
                                  handleBudgetItemChange(item.id, "valorUnitario", e.target.value)
                                }
                              />
                            </td>
                            <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-gray-100">
                              {formatCurrency(getDraftItemTotal(item))}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {isEditable && (
                <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/40 p-4 space-y-3">
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
            </div>
          </div>
        </div>
      </div>

      <div className="w-full lg:w-1/2 bg-slate-100 dark:bg-slate-900 overflow-y-auto">
        <div className="p-6 xl:p-8">
          <div className="space-y-6">
            <PreviewCollapsible title="Preview lista deportistas">
              <ListaDeportistasPreview aval={aval} formData={trainerDocsData} />
            </PreviewCollapsible>
            <PreviewCollapsible title="Preview solicitud aval">
              <SolicitudAvalPreview aval={aval} formData={trainerDocsData} />
            </PreviewCollapsible>
            <PreviewCollapsible title="Preview certificacion PDA" defaultOpen>
              <PdaPreview
                aval={{
                  ...aval,
                  evento: {
                    ...aval.evento,
                    presupuesto: aval.evento.presupuesto.map((item) => {
                      const budgetItem = budgetDraftItems.find((draftItem) => draftItem.id === item.id);
                      return {
                        ...item,
                        presupuesto: String(
                          budgetItem ? getDraftItemTotal(budgetItem) : Number.parseFloat(item.presupuesto ?? "0") || 0,
                        ),
                      };
                    }),
                  },
                }}
                draft={draft}
              />
            </PreviewCollapsible>
            <PreviewCollapsible title="Preview presupuesto de salida" defaultOpen>
              <PresupuestoSalidaAnticipoPreview
                aval={aval}
                items={budgetPreviewItems}
                draft={{ notas: [] }}
              />
            </PreviewCollapsible>
          </div>
        </div>
      </div>
    </div>
  );
}
