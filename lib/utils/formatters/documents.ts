import type { Aval } from "@/types/aval";

import { formatDate, formatDateDMY, formatDateRange } from "./dates";
import { formatCurrencyFromString } from "./numbers";
import { formatEnumLabel } from "./text";

const TRANSPORTE_LABELS: Record<string, string> = {
  AEREO: "TRANSPORTE AEREO",
  TERRESTRE: "TRANSPORTE TERRESTRE",
  VEHICULO_PROPIO: "VEHICULO PROPIO",
  MARITIMO: "TRANSPORTE MARITIMO",
  OTRO: "OTRO",
};

type ExtendedTrainer = NonNullable<Aval["entrenadores"]>[number] & {
  usuario?: { nombre?: string; apellido?: string; cedula?: string };
  entrenador?: { nombre?: string; apellido?: string; cedula?: string };
  nombre?: string;
  apellido?: string;
  cedula?: string;
};

export function getResponsibleTrainerName(
  aval: Aval,
  fallback = "-",
): string {
  const sorted = [...(aval.entrenadores ?? [])].sort(
    (a, b) => Number(Boolean(b.esPrincipal)) - Number(Boolean(a.esPrincipal)),
  );
  const first = sorted[0] as ExtendedTrainer | undefined;

  if (!first) return fallback;

  return (
    [
      first.entrenador?.nombre ?? first.usuario?.nombre ?? first.nombre,
      first.entrenador?.apellido ?? first.usuario?.apellido ?? first.apellido,
    ]
      .filter(Boolean)
      .join(" ")
      .trim() || fallback
  );
}

export function getResponsibleTrainerData(
  aval: Aval,
  fallbackName = "-",
) {
  const sorted = [...(aval.entrenadores ?? [])].sort(
    (a, b) => Number(Boolean(b.esPrincipal)) - Number(Boolean(a.esPrincipal)),
  );
  const first = sorted[0] as ExtendedTrainer | undefined;

  if (!first) {
    return { nombre: fallbackName, cedula: "-" };
  }

  const nombre = (
    [
      first.entrenador?.nombre ?? first.usuario?.nombre ?? first.nombre,
      first.entrenador?.apellido ?? first.usuario?.apellido ?? first.apellido,
    ]
      .filter(Boolean)
      .join(" ")
      .trim() || fallbackName
  ).toUpperCase();

  const cedula =
    first.entrenador?.cedula ?? first.usuario?.cedula ?? first.cedula ?? "-";

  return { nombre, cedula };
}

export function formatTransport(value?: string | null): string {
  if (!value) return "-";
  return TRANSPORTE_LABELS[value] ?? formatEnumLabel(value);
}

export function formatDocumentMoney(value?: string | null): string {
  return formatCurrencyFromString(value);
}

export function formatTramiteDate(value?: string | null): string {
  if (!value) return "-";
  const normalized = value.trim();
  const datePart = normalized.includes("T")
    ? normalized.split("T")[0]
    : normalized;

  if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
    return formatDateDMY(datePart);
  }

  return normalized;
}

export function formatAvalDepartureDate(aval: Aval): string {
  const salida = aval.avalTecnico?.fechaHoraSalida;
  const retorno = aval.avalTecnico?.fechaHoraRetorno;
  if (!salida && !retorno) return "-";
  if (salida && retorno) return `DEL ${formatDate(salida)} AL ${formatDate(retorno)}`;
  return formatDate(salida ?? retorno);
}

export function formatAvalTravelRange(aval: Aval): string {
  return formatDateRange(
    aval.avalTecnico?.fechaHoraSalida,
    aval.avalTecnico?.fechaHoraRetorno,
  );
}
