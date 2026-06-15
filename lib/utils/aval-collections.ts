import type { Aval, PresupuestoItem, TipoAval } from "@/types/aval";

type GeneroCountEntry = {
  genero?: string | null;
  payload?: Record<string, unknown> | null;
  usuario?: {
    genero?: string | null;
  } | null;
  entrenador?: {
    genero?: string | null;
  } | null;
};

type DelegationCount = {
  hombres: number;
  mujeres: number;
  total: number;
};

export type AvalDelegationSummary = {
  entrenadores: DelegationCount;
  deportistas: DelegationCount;
  total: number;
};

function normalizeGenero(value: unknown) {
  if (typeof value !== "string") return null;
  const genero = value.trim().toUpperCase();
  if (genero === "MASCULINO") return "MASCULINO";
  if (genero === "FEMENINO") return "FEMENINO";
  return null;
}

function getEntryGenero(entry: GeneroCountEntry) {
  return (
    normalizeGenero(entry.genero) ??
    normalizeGenero(entry.usuario?.genero) ??
    normalizeGenero(entry.entrenador?.genero) ??
    normalizeGenero(entry.payload?.genero)
  );
}

function countEntriesByGenero(
  entries: GeneroCountEntry[],
  fallbackHombres: number,
  fallbackMujeres: number,
): DelegationCount {
  if (entries.length === 0) {
    return {
      hombres: fallbackHombres,
      mujeres: fallbackMujeres,
      total: fallbackHombres + fallbackMujeres,
    };
  }

  let hombres = 0;
  let mujeres = 0;

  entries.forEach((entry) => {
    const genero = getEntryGenero(entry);
    if (genero === "MASCULINO") hombres += 1;
    if (genero === "FEMENINO") mujeres += 1;
  });

  let pendientes = Math.max(0, entries.length - hombres - mujeres);

  const mujeresFallback = Math.max(0, fallbackMujeres - mujeres);
  const mujeresExtra = Math.min(pendientes, mujeresFallback);
  mujeres += mujeresExtra;
  pendientes -= mujeresExtra;

  const hombresFallback = Math.max(0, fallbackHombres - hombres);
  const hombresExtra = Math.min(pendientes, hombresFallback);
  hombres += hombresExtra;
  pendientes -= hombresExtra;

  if (pendientes > 0) hombres += pendientes;

  return {
    hombres,
    mujeres,
    total: entries.length,
  };
}

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
  const formaActual = aval.evento.formaParticipacionActual;
  if (formaActual && formaActual.tipoAval === aval.tipoAval) {
    const tieneCupos =
      formaActual.numAtletasHombres > 0 ||
      formaActual.numAtletasMujeres > 0 ||
      formaActual.numEntrenadoresHombres > 0 ||
      formaActual.numEntrenadoresMujeres > 0;

    if (tieneCupos || (formaActual.items?.length ?? 0) > 0) {
      return formaActual;
    }
  }

  const forma = aval.evento.formasParticipacion?.find(
    (item) => item.tipoAval === aval.tipoAval,
  );
  if (!forma) return null;

  const tieneCupos =
    forma.numAtletasHombres > 0 ||
    forma.numAtletasMujeres > 0 ||
    forma.numEntrenadoresHombres > 0 ||
    forma.numEntrenadoresMujeres > 0;

  return tieneCupos || (forma.items?.length ?? 0) > 0 ? forma : null;
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
  return forma?.items ?? aval.evento.presupuesto ?? [];
}

export function getAvalDelegationSummary(
  aval: Aval,
  options?: {
    deportistas?: GeneroCountEntry[];
    entrenadores?: GeneroCountEntry[];
  },
): AvalDelegationSummary {
  const cupos = getAvalCupos(aval);
  const deportistas = countEntriesByGenero(
    options?.deportistas ?? [],
    cupos.numAtletasHombres,
    cupos.numAtletasMujeres,
  );
  const entrenadores = countEntriesByGenero(
    options?.entrenadores ?? [],
    cupos.numEntrenadoresHombres,
    cupos.numEntrenadoresMujeres,
  );

  return {
    entrenadores,
    deportistas,
    total: entrenadores.total + deportistas.total,
  };
}

export function canCreateCollectionByType(
  avales: Aval[],
  tipoAval: TipoAval,
) {
  if (tipoAval !== "FONDOS_PUBLICOS") return true;
  return !hasActiveFondosPublicosCollection(avales);
}
