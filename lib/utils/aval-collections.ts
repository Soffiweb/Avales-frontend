import type { Aval, PresupuestoItem, TipoAval } from "@/types/aval";

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

function getFormaParticipacionActual(aval: Aval) {
  const forma = aval.evento.formaParticipacionActual;
  if (!forma || forma.tipoAval !== aval.tipoAval) return null;

  const tieneCupos =
    forma.numAtletasHombres > 0 ||
    forma.numAtletasMujeres > 0 ||
    forma.numEntrenadoresHombres > 0 ||
    forma.numEntrenadoresMujeres > 0;

  return tieneCupos ? forma : null;
}

export function getAvalCupos(aval: Aval) {
  const forma = getFormaParticipacionActual(aval);
  const source = forma ?? aval.evento;
  return {
    numEntrenadoresHombres: source.numEntrenadoresHombres,
    numEntrenadoresMujeres: source.numEntrenadoresMujeres,
    numAtletasHombres: source.numAtletasHombres,
    numAtletasMujeres: source.numAtletasMujeres,
  };
}

export function getAvalPresupuestoItems(aval: Aval): PresupuestoItem[] {
  const forma = getFormaParticipacionActual(aval);
  return forma ? forma.items : aval.evento.presupuesto;
}

export function canCreateCollectionByType(
  avales: Aval[],
  tipoAval: TipoAval,
) {
  if (tipoAval !== "FONDOS_PUBLICOS") return true;
  return !hasActiveFondosPublicosCollection(avales);
}
