import type { Aval, EtapaFlujo, Historial, TipoAval } from "@/types/aval";
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
  "FINANCIERO",
];

// Fallback solo para respuestas sin `flujo`. La fuente de verdad es la
// configuracion del backend (`aval.flujo`), editable por admin.
const FLOW_BY_TIPO_AVAL: Record<TipoAval, EtapaFlujo[]> = {
  FONDOS_PUBLICOS: APPROVAL_STAGE_FLOW,
  AUTOGESTION: APPROVAL_STAGE_FLOW,
  SOLO_RESULTADO: ["SOLICITUD", "REVISION_METODOLOGO", "REVISION_DTM"],
};

function isEtapaFlujo(value: string): value is EtapaFlujo {
  return ETAPA_VALUES.includes(value as EtapaFlujo);
}

/**
 * Acepta el string plano o el objeto `{ codigo, nombre }` con el que el
 * backend serializa cada etapa del flujo configurado.
 */
export function normalizeEtapaFlujo(value?: unknown): EtapaFlujo | undefined {
  const raw =
    typeof value === "string"
      ? value
      : typeof value === "object" && value !== null && "codigo" in value
        ? (value as { codigo?: unknown }).codigo
        : undefined;
  if (typeof raw !== "string") return undefined;
  const normalized = raw.trim().toUpperCase();
  return isEtapaFlujo(normalized) ? normalized : undefined;
}

export function getApprovalFlowStages(aval?: Pick<Aval, "flujo" | "tipoAval"> | null): EtapaFlujo[] {
  const backendFlow = (aval?.flujo ?? [])
    .map((stage) => normalizeEtapaFlujo(stage))
    .filter((stage): stage is EtapaFlujo => Boolean(stage));

  if (backendFlow.length > 0) return [...new Set(backendFlow)];
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

/**
 * Etapas realmente aprobadas segun historial. Es la unica fuente confiable de
 * "ya se cumplio" cuando el flujo se reordena: un aval en curso pudo pasar por
 * las etapas en un orden distinto al configurado hoy.
 */
export function getEtapasAprobadas(historial?: Historial[] | null): Set<EtapaFlujo> {
  const aprobadas = new Set<EtapaFlujo>();
  for (const entry of historial ?? []) {
    const etapa = normalizeEtapaFlujo(entry.etapa);
    if (!etapa) continue;
    // SOLICITUD nunca recibe un ACEPTADO propio: se registra como SOLICITADO
    // al enviar el aval, y con eso ya quedo cumplida.
    if (entry.estado === "ACEPTADO" || etapa === "SOLICITUD") {
      aprobadas.add(etapa);
    }
  }
  return aprobadas;
}

export function isAvalFlowApproved(
  aval?:
    | Pick<Aval, "flujo" | "tipoAval" | "etapaActual" | "historial" | "estado">
    | null,
): boolean {
  if (!aval) return false;
  if (aval.estado === "ACEPTADO") return true;
  return getAvalCurrentEtapa(aval) === getFinalApprovalStageForAval(aval);
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

/**
 * Etapa que habilita a `etapa` segun el flujo configurado. Es lo que define
 * quien puede actuar y que seccion es editable: nunca asumir un predecesor
 * fijo, el orden lo decide la configuracion del backend.
 */
export function getStagePredecessorForAval(
  aval: Pick<Aval, "flujo" | "tipoAval"> | null | undefined,
  etapa: EtapaFlujo,
): EtapaFlujo | undefined {
  return getPreviousApprovalStagesForAval(aval, etapa).at(-1);
}

/**
 * `true` si el aval esta parado justo antes de `etapa`, es decir si la etapa
 * existe en el flujo y la etapa actual es su predecesora.
 */
export function isStageReadyForAval(
  aval: Pick<Aval, "flujo" | "tipoAval"> | null | undefined,
  etapa: EtapaFlujo,
  etapaActual?: string | null,
): boolean {
  if (!getApprovalFlowStages(aval).includes(etapa)) return false;
  const predecessor = getStagePredecessorForAval(aval, etapa) ?? "SOLICITUD";
  return normalizeEtapaFlujo(etapaActual) === predecessor;
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
