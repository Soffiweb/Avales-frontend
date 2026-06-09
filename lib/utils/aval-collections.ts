import type { Aval, TipoAval } from "@/types/aval";

export function isAvalCollectionEditableRequest(aval: Aval) {
  return (
    aval.estado === "BORRADOR" ||
    (aval.estado === "SOLICITADO" && aval.etapaActual === "SOLICITUD")
  );
}

export function isAvalCollectionDeletableRequest(aval: Aval) {
  return isAvalCollectionEditableRequest(aval);
}

export function isAvalCollectionActive(aval: Aval) {
  return aval.estado === "BORRADOR" || aval.estado === "SOLICITADO";
}

export function hasActiveFondosPublicosCollection(avales: Aval[]) {
  return avales.some(
    (aval) =>
      aval.tipoAval === "FONDOS_PUBLICOS" && isAvalCollectionActive(aval),
  );
}

export function getCollectionIdentifier(aval: Aval) {
  return (
    aval.avalTecnico?.numeroAval?.trim() ||
    aval.numeroColeccion?.trim() ||
    (aval.coleccionAvalId ? `COL-${aval.coleccionAvalId}` : `AV-${aval.id}`)
  );
}

export function getAvalBudgetBySource(aval: Aval) {
  const source = aval.presupuesto?.fuente ?? aval.tipoAval ?? "SOLO_RESULTADO";

  if (source === "SOLO_RESULTADO") {
    return {
      fuente: source,
      asignado: aval.montoAsignado ?? 0,
      comprometido: 0,
      disponible: 0,
      solicitado: aval.montoSolicitado ?? 0,
    };
  }

  return {
    fuente: source,
    asignado: aval.presupuesto?.asignado ?? aval.montoAsignado ?? 0,
    comprometido: aval.presupuesto?.comprometido ?? 0,
    disponible: aval.presupuesto?.disponible ?? 0,
    solicitado: aval.montoSolicitado ?? 0,
  };
}

export function canCreateCollectionByType(
  avales: Aval[],
  tipoAval: TipoAval,
) {
  if (tipoAval !== "FONDOS_PUBLICOS") return true;
  return !hasActiveFondosPublicosCollection(avales);
}
