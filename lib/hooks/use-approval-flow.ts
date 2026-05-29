"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/app/providers/auth-provider";
import { getAval, rechazarAval } from "@/lib/api/avales";
import type { Aval, EtapaFlujo } from "@/types/aval";
import type { User } from "@/types/user";
import { getNormalizedRoles } from "@/lib/auth/access";
import { getCurrentEtapa } from "@/lib/utils/aval-historial";
import { APPROVAL_STAGE_FLOW, getApprovalStageLabel } from "@/lib/constants";
import { formatRoles } from "@/lib/utils/formatters";

export type ToastState = { variant: "success" | "error"; message: string };

export type ApproveActionContext = {
  aval: Aval;
  userId: number;
  approvalEtapa: EtapaFlujo;
};

type RoleCheck = string | string[] | ((user: User | null | undefined) => boolean);

export type UseApprovalFlowOptions = {
  avalId: number;
  /** Role(s) allowed on this page, or a custom predicate. */
  requiredRole: RoleCheck;
  /** The currentEtapa that unlocks editing on this page. */
  editableEtapa: EtapaFlujo;
  /** Fixed etapa sent to aprobarAval, or computed from currentEtapa. */
  approvalEtapa: EtapaFlujo | ((currentEtapa: EtapaFlujo) => EtapaFlujo);
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
    () => checkRole(user, requiredRole),
    [user, requiredRole],
  );

  const defaultSignerName = useMemo(() => {
    if (!user) return "";
    return [user.nombre, user.apellido].filter(Boolean).join(" ").trim();
  }, [user]);

  const defaultSignerCargo = useMemo(
    () => (user?.roles?.length ? formatRoles(user.roles) : ""),
    [user],
  );

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

  const rawCurrentEtapa = (
    (aval?.etapaActual ?? getCurrentEtapa(aval?.historial) ?? "SOLICITUD")
  ).toUpperCase() as EtapaFlujo;
  const currentEtapa: EtapaFlujo = APPROVAL_STAGE_FLOW.includes(rawCurrentEtapa)
    ? rawCurrentEtapa
    : "SOLICITUD";

  const resolvedApprovalEtapa: EtapaFlujo =
    typeof approvalEtapa === "function"
      ? approvalEtapa(currentEtapa)
      : approvalEtapa;

  const isEditable =
    aval?.estado === "SOLICITADO" &&
    currentEtapa === editableEtapa &&
    (additionalEditableCheck && aval ? additionalEditableCheck(aval) : true);

  const summaryText = `El aval pasará de "${getApprovalStageLabel(currentEtapa)}" a "${getApprovalStageLabel(resolvedApprovalEtapa)}" y quedará en "${getApprovalStageLabel(resolvedApprovalEtapa)}".`;

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
      await onApproveActionRef.current({
        aval,
        userId: user.id,
        approvalEtapa: resolvedApprovalEtapa,
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
  }, [aval, user?.id, isEditable, resolvedApprovalEtapa, approveSuccessMessage, router]);

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
    resolvedApprovalEtapa,
    isEditable,
    summaryText,
    // Actions
    handleApprove,
    handleReject,
  };
}
