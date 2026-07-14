import type { Aval, EtapaFlujo, TipoAval } from "@/types/aval";
import { APPROVAL_STAGE_FLOW } from "@/lib/constants";
import { getCurrentEtapa } from "@/lib/utils/aval-historial";

const ETAPA_VALUES: EtapaFlujo[] = [
  "SOLICITUD",
  "REVISION_METODOLOGO",
  "REVISION_DTM",
  "PDA",
  "COMPRAS_PUBLICAS",
  "CONTROL_PREVIO",
  "SECRETARIA",
  "ADMINISTRADOR",
  "FINANCIERO",
];

const FLOW_BY_TIPO_AVAL: Record<TipoAval, EtapaFlujo[]> = {
  FONDOS_PUBLICOS: [
    "SOLICITUD",
    "REVISION_METODOLOGO",
    "REVISION_DTM",
    "COMPRAS_PUBLICAS",
    "PDA",
    "CONTROL_PREVIO",
    "ADMINISTRADOR",
    "FINANCIERO",
  ],
  AUTOGESTION: [
    "SOLICITUD",
    "REVISION_METODOLOGO",
    "REVISION_DTM",
    "COMPRAS_PUBLICAS",
    "PDA",
    "CONTROL_PREVIO",
    "ADMINISTRADOR",
    "FINANCIERO",
  ],
  SOLO_RESULTADO: ["SOLICITUD", "REVISION_METODOLOGO", "REVISION_DTM"],
};

function isEtapaFlujo(value: string): value is EtapaFlujo {
  return ETAPA_VALUES.includes(value as EtapaFlujo);
}

export function normalizeEtapaFlujo(value?: string | null): EtapaFlujo | undefined {
  if (!value || typeof value !== "string") return undefined;
  const normalized = value.trim().toUpperCase();
  return isEtapaFlujo(normalized) ? normalized : undefined;
}

export function getApprovalFlowStages(aval?: Pick<Aval, "flujo" | "tipoAval"> | null): EtapaFlujo[] {
  const backendFlow = (aval?.flujo ?? [])
    .map((stage) => normalizeEtapaFlujo(stage))
    .filter((stage): stage is EtapaFlujo => Boolean(stage));

  if (backendFlow.length > 0) return backendFlow;
  if (aval?.tipoAval) return FLOW_BY_TIPO_AVAL[aval.tipoAval] ?? APPROVAL_STAGE_FLOW;
  return APPROVAL_STAGE_FLOW;
}

export function getFinalApprovalStageForAval(
  aval?: Pick<Aval, "flujo" | "tipoAval"> | null,
): EtapaFlujo {
  const stages = getApprovalFlowStages(aval);
  return stages[stages.length - 1] ?? "FINANCIERO";
}

export function getAvalCurrentEtapa(aval?: Pick<Aval, "etapaActual" | "historial"> | null): EtapaFlujo {
  return (
    normalizeEtapaFlujo(aval?.etapaActual) ??
    normalizeEtapaFlujo(getCurrentEtapa(aval?.historial)) ??
    "SOLICITUD"
  );
}

export function isAvalFlowApproved(
  aval?:
    | Pick<Aval, "flujo" | "tipoAval" | "etapaActual" | "historial" | "estado">
    | null,
): boolean {
  if (!aval) return false;
  if (aval.estado === "ACEPTADO") return true;
  return getAvalCurrentEtapa(aval) === "FINANCIERO";
}

export function getNextApprovalStageForAval(
  aval: Pick<Aval, "flujo" | "tipoAval"> | null | undefined,
  etapa?: string | null,
): EtapaFlujo | undefined {
  const stages = getApprovalFlowStages(aval);
  const current = normalizeEtapaFlujo(etapa);
  if (!current) return stages[0];
  const index = stages.indexOf(current);
  if (index === -1 || index === stages.length - 1) return undefined;
  return stages[index + 1];
}

export function getPreviousApprovalStagesForAval(
  aval: Pick<Aval, "flujo" | "tipoAval"> | null | undefined,
  etapa?: string | null,
): EtapaFlujo[] {
  const stages = getApprovalFlowStages(aval);
  const current = normalizeEtapaFlujo(etapa);
  if (!current) return [];
  const index = stages.indexOf(current);
  if (index <= 0) return [];
  return stages.slice(0, index);
}
