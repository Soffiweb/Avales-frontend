"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Pencil, Plus, Trash2 } from "lucide-react";

import { useAuth } from "@/app/providers/auth-provider";
import { aprobarAval, getAval, rechazarAval } from "@/lib/api/avales";
import type { Aval, EtapaFlujo } from "@/types/aval";
import ApprovalFlowCard from "@/app/(app)/avales/_components/approval-flow-card";
import CertificacionFinancieraPreview from "@/app/(app)/avales/_components/certificacion-financiera-preview";
import PresupuestoSalidaAnticipoPreview from "@/app/(app)/avales/_components/presupuesto-salida-anticipo-preview";
import PreviewCollapsible from "@/app/(app)/avales/_components/preview-collapsible";
import AlertBanner from "@/components/ui/alert-banner";
import { getCurrentEtapa } from "@/lib/utils/aval-historial";
import { getApprovalStageLabel } from "@/lib/constants";
import { getNormalizedRoles } from "@/lib/auth/access";
import { formatRoles } from "@/lib/utils/formatters";

type FinancieroDraft = {
  descripcionCertificacion: string;
  firmanteNombre: string;
  firmanteCargo: string;
  fechaEmision: string;
  notas: string[];
};

const INITIAL_DRAFT: FinancieroDraft = {
  descripcionCertificacion: "",
  firmanteNombre: "",
  firmanteCargo: "",
  fechaEmision: new Date().toISOString().slice(0, 10),
  notas: ["", "", ""],
};

function joinWithCommaAndY(items: string[]) {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} y ${items[1]}`;
  return `${items.slice(0, -1).join(", ")} y ${items[items.length - 1]}`;
}

export default function CertificacionFinancieraPage() {
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
  const [draft, setDraft] = useState<FinancieroDraft>(INITIAL_DRAFT);
  const [editableNotas, setEditableNotas] = useState<boolean[]>([
    false,
    false,
    false,
  ]);
  const [notesInitialized, setNotesInitialized] = useState(false);

  const isFinanciero = getNormalizedRoles(user).includes("FINANCIERO");

  useEffect(() => {
    setDraft(INITIAL_DRAFT);
    setRechazoMotivo("");
    setActionError(null);
    setEditableNotas([false, false, false]);
    setNotesInitialized(false);
  }, [avalId]);

  useEffect(() => {
    if (!user) return;
    const nombre = [user.nombre, user.apellido].filter(Boolean).join(" ").trim();
    const cargo = user.roles?.length ? formatRoles(user.roles) : "";
    setDraft((prev) => ({
      ...prev,
      firmanteNombre: prev.firmanteNombre || nombre,
      firmanteCargo: prev.firmanteCargo || cargo,
    }));
  }, [user]);

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

  const currentEtapa = useMemo(() => {
    const etapaActualResponse = aval?.etapaActual;
    const etapaActualHistorial = getCurrentEtapa(aval?.historial);
    return (etapaActualResponse ?? etapaActualHistorial ?? "SOLICITUD") as EtapaFlujo;
  }, [aval]);

  const isEditable =
    aval?.estado === "SOLICITADO" && currentEtapa === "CONTROL_PREVIO";

  const approvalEtapa: EtapaFlujo = "FINANCIERO";

  const defaultDescripcionCertificacion = useMemo(() => {
    if (!aval) return "";
    return `De acuerdo a la sumilla Aval Nro. ${aval.avalTecnico?.numeroAval || aval.numeroColeccion || aval.aval || aval.id}, me permito certificar la disponibilidad presupuestaria de la cuenta de PUBLICOS.`;
  }, [aval]);

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

  const defaultNotas = useMemo(() => {
    const requerimientosRaw = (aval?.evento?.presupuesto ?? [])
      .map((item) => item.item?.nombre?.trim().toLowerCase())
      .filter((item): item is string => Boolean(item));
    const requerimientos = Array.from(new Set(requerimientosRaw));
    const requerimientosTexto = joinWithCommaAndY(requerimientos);

    const nota1 = requerimientosTexto
      ? `El requerimiento es ${requerimientosTexto}`
      : "El requerimiento es pasajes ida y vuelta, hospedaje, transporte de personal y deportistas, afiliacion y alimentacion";

    const nota2 = `Las facturas de gastos deben solicitarse con los siguientes datos:
Razon Social: Federacion Deportiva Provincial de Loja
RUC: 1191708241001
Direccion: Macara entre Mercadillo y Azuay
Telefono: 72570734`;

    const nota3 =
      "El informe de gastos, se entregara como maximo 72 horas culminada la competencia";

    return [nota1, nota2, nota3];
  }, [aval]);

  useEffect(() => {
    if (notesInitialized) return;
    if (!aval) return;
    setDraft((prev) => ({ ...prev, notas: defaultNotas }));
    setEditableNotas(defaultNotas.map(() => false));
    setNotesInitialized(true);
  }, [notesInitialized, aval, defaultNotas]);

  const handleNotaChange = useCallback((index: number, value: string) => {
    setDraft((prev) => ({
      ...prev,
      notas: prev.notas.map((nota, i) => (i === index ? value : nota)),
    }));
  }, []);

  const handleAddNota = useCallback(() => {
    setDraft((prev) => ({
      ...prev,
      notas: [...prev.notas, ""],
    }));
    setEditableNotas((prev) => [...prev, true]);
  }, []);

  const handleRemoveNota = useCallback((index: number) => {
    setDraft((prev) => {
      if (prev.notas.length <= 1) return prev;
      return {
        ...prev,
        notas: prev.notas.filter((_, i) => i !== index),
      };
    });
    setEditableNotas((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const handleEnableNotaEdit = useCallback((index: number) => {
    setEditableNotas((prev) => prev.map((editable, i) => (i === index ? true : editable)));
  }, []);

  const handleApprove = useCallback(async () => {
    if (!aval) return;
    if (!user?.id) {
      setActionError("No se pudo identificar el usuario.");
      return;
    }
    if (!isEditable || !isFinanciero) {
      setActionError("No puedes aprobar este aval en la etapa actual.");
      return;
    }

    setActionError(null);
    setActionLoading(true);
    try {
      const notasPayload = draft.notas
        .map((texto, index) => ({
          titulo: `NOTA ${index + 1}`,
          texto: texto.trim(),
        }))
        .filter((nota) => nota.texto.length > 0);

      const notasActualesNormalizadas = draft.notas.map((nota) => nota.trim());
      const notasDefaultNormalizadas = defaultNotas.map((nota) => nota.trim());
      const notasSinCambios =
        notasActualesNormalizadas.length === notasDefaultNormalizadas.length &&
        notasActualesNormalizadas.every(
          (nota, index) => nota === notasDefaultNormalizadas[index],
        );

      await aprobarAval(
        aval.id,
        user.id,
        approvalEtapa,
        undefined,
        undefined,
        notasSinCambios ? { notas: [] } : { notas: notasPayload },
      );
      setToast({
        variant: "success",
        message: "Certificación financiera aprobada correctamente.",
      });
      setTimeout(() => router.push(`/avales/${aval.id}`), 1500);
    } catch (err: unknown) {
      setActionError(
        err instanceof Error ? err.message : "No se pudo aprobar el aval.",
      );
    } finally {
      setActionLoading(false);
    }
  }, [
    aval,
    user?.id,
    isEditable,
    isFinanciero,
    loadAval,
    draft.notas,
    defaultNotas,
  ]);

  const handleReject = useCallback(async () => {
    if (!aval) return;
    if (!user?.id) {
      setActionError("No se pudo identificar el usuario.");
      return;
    }
    if (!isEditable || !isFinanciero) {
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
      await rechazarAval(aval.id, user.id, approvalEtapa, rechazoMotivo.trim());
      setToast({ variant: "success", message: "Aval rechazado correctamente." });
      setRechazoMotivo("");
      setTimeout(() => router.push(`/avales/${aval.id}`), 1500);
    } catch (err: unknown) {
      setActionError(
        err instanceof Error ? err.message : "No se pudo rechazar el aval.",
      );
    } finally {
      setActionLoading(false);
    }
  }, [aval, user?.id, isEditable, isFinanciero, rechazoMotivo, currentEtapa, loadAval]);

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

  if (!isFinanciero) {
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
                Completa los datos y revisa los 2 documentos financieros antes de aprobar.
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
                  placeholder={defaultDescripcionCertificacion || "Describe la certificación presupuestaria..."}
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
                      setDraft((prev) => ({ ...prev, firmanteNombre: e.target.value }))
                    }
                    placeholder="Nombre completo"
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
                      setDraft((prev) => ({ ...prev, firmanteCargo: e.target.value }))
                    }
                    placeholder="Cargo"
                  />
                </label>

                <label className="block md:col-span-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Fecha
                  </span>
                  <input
                    type="date"
                    className="form-input w-full mt-1"
                    value={draft.fechaEmision}
                    onChange={(e) =>
                      setDraft((prev) => ({ ...prev, fechaEmision: e.target.value }))
                    }
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
                      value={nota}
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

            {isEditable ? (
              <ApprovalFlowCard
                title="Aprobación financiera"
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
                Este aval no está disponible para certificación financiera.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="w-full lg:w-1/2 bg-slate-100 dark:bg-slate-900 overflow-y-auto">
        <div className="p-6 xl:p-8">
          <div className="space-y-6">
            <PreviewCollapsible title="Certificacion financiera" defaultOpen>
              <CertificacionFinancieraPreview aval={aval} draft={draft} />
            </PreviewCollapsible>
            <PreviewCollapsible title="Presupuesto salida anticipo">
              <PresupuestoSalidaAnticipoPreview aval={aval} draft={draft} />
            </PreviewCollapsible>
          </div>
        </div>
      </div>
    </div>
  );
}
