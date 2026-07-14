import type {
  Aval,
  AvalFormActionConfig,
  AvalFormConfig,
  AvalFormSectionConfig,
  EtapaFlujo,
} from "@/types/aval";
import {
  getApprovalFlowStages,
  getAvalCurrentEtapa,
  getPreviousApprovalStagesForAval,
} from "@/lib/approval-flow";

function buildSections(currentEtapa: EtapaFlujo, aval: Aval): AvalFormSectionConfig[] {
  const flow = getApprovalFlowStages(aval);
  const hasCompras = flow.includes("COMPRAS_PUBLICAS");
  const hasControlPrevio = flow.includes("CONTROL_PREVIO");
  const hasAdministrador = flow.includes("ADMINISTRADOR");
  const hasFinanciero = flow.includes("FINANCIERO");
  // Una sección es editable cuando el aval está en la etapa inmediatamente
  // anterior (i.e. es el turno de esa sección). Derivado del flujo real para
  // que sea independiente del orden de etapas.
  const prevStageOf = (stage: EtapaFlujo): EtapaFlujo =>
    getPreviousApprovalStagesForAval(aval, stage).at(-1) ?? "SOLICITUD";

  return [
    { key: "PARTICIPANTES", visible: true, editable: currentEtapa === "SOLICITUD", required: true },
    { key: "DOCUMENTOS", visible: true, editable: currentEtapa === "SOLICITUD", required: true },
    { key: "PRESUPUESTO", visible: aval.tipoAval !== "SOLO_RESULTADO", editable: currentEtapa === "SOLICITUD", required: aval.tipoAval !== "SOLO_RESULTADO" },
    { key: "PDA", visible: flow.includes("PDA"), editable: currentEtapa === prevStageOf("PDA"), required: flow.includes("PDA") },
    { key: "COMPRAS_PUBLICAS", visible: hasCompras, editable: currentEtapa === prevStageOf("COMPRAS_PUBLICAS"), required: hasCompras },
    { key: "REVISION_METODOLOGO", visible: true, editable: currentEtapa === prevStageOf("REVISION_METODOLOGO"), required: true },
    { key: "REVISION_DTM", visible: true, editable: currentEtapa === prevStageOf("REVISION_DTM"), required: true },
    { key: "CONTROL_PREVIO", visible: hasControlPrevio, editable: currentEtapa === prevStageOf("CONTROL_PREVIO"), required: hasControlPrevio },
    { key: "ADMINISTRADOR", visible: hasAdministrador, editable: currentEtapa === prevStageOf("ADMINISTRADOR"), required: hasAdministrador },
    { key: "FINANCIERO", visible: hasFinanciero, editable: currentEtapa === prevStageOf("FINANCIERO"), required: hasFinanciero },
  ];
}

function buildActions(currentEtapa: EtapaFlujo, aval: Aval): AvalFormActionConfig[] {
  const sections = buildSections(currentEtapa, aval);
  const hasEditableSection = sections.some((section) => section.editable);
  const canApprove = aval.estado === "SOLICITADO" && hasEditableSection;

  return [
    { key: "GUARDAR", visible: hasEditableSection, enabled: true },
    { key: "ENVIAR", visible: currentEtapa === "SOLICITUD", enabled: true },
    { key: "APROBAR", visible: canApprove, enabled: canApprove },
    { key: "RECHAZAR", visible: canApprove, enabled: canApprove },
  ];
}

export function buildFallbackAvalFormConfig(aval: Aval): AvalFormConfig {
  const currentEtapa = getAvalCurrentEtapa(aval);
  return {
    tipoAval: aval.tipoAval ?? undefined,
    etapaActual: currentEtapa,
    secciones: buildSections(currentEtapa, aval),
    acciones: buildActions(currentEtapa, aval),
  };
}

export function getActionConfig(
  config: AvalFormConfig | null | undefined,
  key: AvalFormActionConfig["key"],
) {
  return config?.acciones.find((action) => action.key === key);
}

export function getSectionConfig(
  config: AvalFormConfig | null | undefined,
  key: AvalFormSectionConfig["key"],
) {
  return config?.secciones.find((section) => section.key === key);
}
