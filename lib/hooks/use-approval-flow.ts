"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/app/providers/auth-provider";
import { getAval, rechazarAval } from "@/lib/api/avales";
import type { Aval, EtapaFlujo } from "@/types/aval";
import type { User } from "@/types/user";
import { getNormalizedRoles } from "@/lib/auth/access";
import { getApprovalStageLabel } from "@/lib/constants";
import {
  getAvalCurrentEtapa,
  getNextApprovalStageForAval,
} from "@/lib/approval-flow";
import { formatRoles } from "@/lib/utils/formatters";
import { avalFlowDebugLog, summarizeAval } from "@/lib/debug/aval-flow";

export type ToastState = { variant: "success" | "error"; message: string };

export type ApproveActionContext = {
  aval: Aval;
  userId: number;
  approvalEtapa: EtapaFlujo;
  /**
   * True cuando el user es SUPER_ADMIN/ADMIN y la etapa de la pagina ya pasó
   * (modo "fix data sin avanzar"). La pagina debe saltarse la llamada a
   * `aprobarAval` y solo persistir el data del paso.
   */
  adminSaveOnly?: boolean;
};

type RoleCheck = string | string[] | ((user: User | null | undefined) => boolean);

export type UseApprovalFlowOptions = {
  avalId: number;
  /** Role(s) allowed on this page, or a custom predicate. */
  requiredRole: RoleCheck;
  /** The currentEtapa that unlocks editing on this page. */
  editableEtapa: EtapaFlujo | ((aval: Aval | null) => EtapaFlujo);
  /** Fixed etapa sent to aprobarAval, or computed from currentEtapa/current aval. */
  approvalEtapa:
    | EtapaFlujo
    | ((currentEtapa: EtapaFlujo, aval: Aval | null) => EtapaFlujo);
  /** Page-specific action: validation + API calls. Must throw on error. */
  onApproveAction: (ctx: ApproveActionContext) => Promise<void>;
  /** Extra validation before onApproveAction. Receives the loaded aval. Return error string or null. */
  validateApprove?: (aval: Aval) => string | null;
  approveSuccessMessage?: string;
  rejectSuccessMessage?: string;
  /** Include etapaDestino state (for pages that let reviewer pick return stage). */
  enableEtapaDestino?: boolean;
  /** Extra isEditable condition beyond estado+etapa (e.g. !aval.comprasPublicas). */
  additionalEditableCheck?: (aval: Aval) => boolean;
  /** Called after a successful reject, before toast+redirect. */
  onRejectSuccess?: () => void;
};

function checkRole(user: User | null | undefined, check: RoleCheck): boolean {
  if (typeof check === "function") return check(user);
  const roles = getNormalizedRoles(user);
  if (Array.isArray(check)) return check.some((r) => roles.includes(r));
  return roles.includes(check);
}

// Override de desarrollador: SUPER_ADMIN y ADMIN entran a cualquier paso
// y pueden editar el formulario aunque la etapa ya haya pasado. Sirve para
// arreglar datos sin tocar la BDD. El cambio de estado/etapa sigue gateado
// por el backend — admin solo "ve y prepara"; el save sin advance de etapa
// queda para endpoints admin dedicados (Phase 2).
function isAdminOverride(user: User | null | undefined): boolean {
  const roles = getNormalizedRoles(user);
  return roles.includes("SUPER_ADMIN") || roles.includes("ADMIN");
}

export function useApprovalFlow({
  avalId,
  requiredRole,
  editableEtapa,
  approvalEtapa,
  onApproveAction,
  validateApprove,
  approveSuccessMessage = "Aprobado correctamente.",
  rejectSuccessMessage = "Rechazado correctamente.",
  enableEtapaDestino = false,
  additionalEditableCheck,
  onRejectSuccess,
}: UseApprovalFlowOptions) {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  // Stable refs for callbacks that may change each render (draft closures, etc.)
  const onApproveActionRef = useRef(onApproveAction);
  useEffect(() => {
    onApproveActionRef.current = onApproveAction;
  }, [onApproveAction]);
  const validateApproveRef = useRef(validateApprove);
  useEffect(() => {
    validateApproveRef.current = validateApprove;
  }, [validateApprove]);

  const [aval, setAval] = useState<Aval | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [rechazoMotivo, setRechazoMotivo] = useState("");
  const [etapaDestino, setEtapaDestino] = useState("");
  const [toast, setToast] = useState<ToastState | null>(null);

  const hasRequiredRole = useMemo(
    () => checkRole(user, requiredRole) || isAdminOverride(user),
    [user, requiredRole],
  );

  const isAdmin = useMemo(() => isAdminOverride(user), [user]);

  const defaultSignerName = useMemo(() => {
    if (!user) return "";
    return [user.nombre, user.apellido].filter(Boolean).join(" ").trim();
  }, [user]);

  const defaultSignerCargo = useMemo(() => {
    // Preferimos `rolesDetalle` porque trae el `nombre` configurado en el
    // catálogo (ej. "Director del DTM") que es lo que el usuario quiere ver
    // en los formularios y PDFs. `roles` (strings) es el fallback.
    if (user?.rolesDetalle?.length) return formatRoles(user.rolesDetalle);
    if (user?.roles?.length) return formatRoles(user.roles);
    return "";
  }, [user]);

  useEffect(() => {
    setActionError(null);
    setRechazoMotivo("");
    if (enableEtapaDestino) setEtapaDestino("");
  }, [avalId, enableEtapaDestino]);

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
      avalFlowDebugLog("approval-flow", "aval cargado", {
        avalId,
        aval: summarizeAval(response.data),
      });
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "No se pudo cargar el aval.",
      );
    } finally {
      setLoading(false);
    }
  }, [avalId]);

  useEffect(() => {
    void loadAval();
  }, [loadAval]);

  const currentEtapa: EtapaFlujo = getAvalCurrentEtapa(aval);

  const resolvedApprovalEtapa: EtapaFlujo =
    typeof approvalEtapa === "function"
      ? approvalEtapa(currentEtapa, aval)
      : approvalEtapa;
  const resolvedEditableEtapa =
    typeof editableEtapa === "function" ? editableEtapa(aval) : editableEtapa;

  const computedNextEtapa =
    getNextApprovalStageForAval(aval, currentEtapa) ?? currentEtapa;

  const isNormalEditable =
    aval?.estado === "SOLICITADO" &&
    currentEtapa === resolvedEditableEtapa &&
    (additionalEditableCheck && aval ? additionalEditableCheck(aval) : true);

  const isEditable = isAdmin || isNormalEditable;

  // Admin esta editando una etapa que ya paso (o un aval ya aprobado). En este
  // caso el "Aprobar" se convierte en "Guardar (admin)" y la pagina debe
  // saltarse la llamada a aprobarAval.
  const adminSaveOnly = Boolean(isAdmin && aval && !isNormalEditable);

  const summaryText = adminSaveOnly
    ? `Modo admin: se guardara la información de "${getApprovalStageLabel(currentEtapa)}" sin avanzar la etapa.`
    : `El aval pasará de "${getApprovalStageLabel(currentEtapa)}" a "${getApprovalStageLabel(resolvedApprovalEtapa ?? computedNextEtapa)}" y quedará en "${getApprovalStageLabel(resolvedApprovalEtapa ?? computedNextEtapa)}".`;

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
    const validationError = validateApproveRef.current?.(aval);
    if (validationError) {
      setActionError(validationError);
      return;
    }
    setActionError(null);
    setActionLoading(true);
    try {
      avalFlowDebugLog("approval-flow", "iniciando aprobacion", {
        avalId: aval.id,
        currentEtapa,
        resolvedApprovalEtapa,
        aval: summarizeAval(aval),
      });
      await onApproveActionRef.current({
        aval,
        userId: user.id,
        approvalEtapa: resolvedApprovalEtapa,
        adminSaveOnly,
      });
      setToast({ variant: "success", message: approveSuccessMessage });
      setTimeout(() => router.push(`/avales/${aval.id}`), 1500);
    } catch (err: unknown) {
      setActionError(
        err instanceof Error ? err.message : "No se pudo aprobar.",
      );
    } finally {
      setActionLoading(false);
    }
  }, [aval, user?.id, isEditable, resolvedApprovalEtapa, adminSaveOnly, approveSuccessMessage, router]);

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
      avalFlowDebugLog("approval-flow", "iniciando rechazo", {
        avalId: aval.id,
        currentEtapa,
        resolvedApprovalEtapa,
        rechazoMotivo: rechazoMotivo.trim(),
        etapaDestino: etapaDestino || undefined,
        aval: summarizeAval(aval),
      });
      await rechazarAval(
        aval.id,
        user.id,
        resolvedApprovalEtapa,
        rechazoMotivo.trim(),
        etapaDestino ? (etapaDestino as EtapaFlujo) : undefined,
      );
      onRejectSuccess?.();
      setToast({ variant: "success", message: rejectSuccessMessage });
      setRechazoMotivo("");
      if (enableEtapaDestino) setEtapaDestino("");
      setTimeout(() => router.push(`/avales/${aval.id}`), 1500);
    } catch (err: unknown) {
      setActionError(
        err instanceof Error ? err.message : "No se pudo rechazar.",
      );
    } finally {
      setActionLoading(false);
    }
  }, [aval, user?.id, isEditable, rechazoMotivo, etapaDestino, resolvedApprovalEtapa, rejectSuccessMessage, enableEtapaDestino, onRejectSuccess, router]);

  return {
    // Auth
    authLoading,
    user,
    hasRequiredRole,
    isAdmin,
    defaultSignerName,
    defaultSignerCargo,
    // Aval fetch
    aval,
    loading,
    error,
    loadAval,
    // Action state
    actionLoading,
    actionError,
    setActionError,
    // Toast
    toast,
    setToast,
    // Rejection
    rechazoMotivo,
    setRechazoMotivo,
    etapaDestino,
    setEtapaDestino,
    // Computed
    currentEtapa,
    resolvedEditableEtapa,
    resolvedApprovalEtapa,
    isEditable,
    adminSaveOnly,
    summaryText,
    // Actions
    handleApprove,
    handleReject,
  };
}
