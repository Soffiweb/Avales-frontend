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
  usuario?: {
    nombre?: string;
    apellido?: string;
    cedula?: string;
    ruc?: string | null;
    usarRuc?: boolean;
  };
  entrenador?: {
    nombre?: string;
    apellido?: string;
    cedula?: string;
    ruc?: string | null;
    usarRuc?: boolean;
  };
  nombre?: string;
  apellido?: string;
  cedula?: string;
  ruc?: string | null;
  usarRuc?: boolean;
};

function pickIdentificador(t: ExtendedTrainer): {
  identificador: string;
  esRuc: boolean;
} {
  // Prioridad: usuario, entrenador, raíz.
  const usarRuc =
    t.usuario?.usarRuc ?? t.entrenador?.usarRuc ?? t.usarRuc ?? false;
  const ruc = t.usuario?.ruc ?? t.entrenador?.ruc ?? t.ruc;
  const cedula = t.usuario?.cedula ?? t.entrenador?.cedula ?? t.cedula;
  if (usarRuc && ruc?.trim()) {
    return { identificador: ruc.trim(), esRuc: true };
  }
  return { identificador: cedula?.trim() || "-", esRuc: false };
}

export function getResponsibleTrainerName(
  aval: Aval,
  fallback = "-",
): string {
  const sorted = [...(aval.entrenadores ?? [])].sort(
    (a, b) => Number(Boolean(b.esPrincipal)) - Number(Boolean(a.esPrincipal)),
  );
  const first = sorted[0] as ExtendedTrainer | undefined;

  if (!first) {
    // Sin entrenadores en la delegación: el creador del aval es el responsable.
    const creador = aval.avalTecnico?.creador;
    if (creador) {
      return (
        [creador.nombre, creador.apellido].filter(Boolean).join(" ").trim() ||
        fallback
      );
    }
    return fallback;
  }

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
    // Sin entrenadores: usar el creador del aval como responsable.
    const creador = aval.avalTecnico?.creador;
    if (creador) {
      const nombre = (
        [creador.nombre, creador.apellido].filter(Boolean).join(" ").trim() ||
        fallbackName
      ).toUpperCase();
      const { identificador, esRuc } = pickIdentificador({
        cedula: creador.cedula ?? undefined,
        ruc: creador.ruc,
        usarRuc: creador.usarRuc,
      } as ExtendedTrainer);
      return { nombre, cedula: identificador, identificador, esRuc };
    }
    return { nombre: fallbackName, cedula: "-", identificador: "-", esRuc: false };
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

  const { identificador, esRuc } = pickIdentificador(first);
  // `cedula` se mantiene como alias del identificador (RUC o cédula) para no
  // romper los previews actuales (PDA, presupuesto-salida, certificación
  // financiera) que muestran "C.I." pero ahora reciben el RUC cuando el
  // responsable lo tiene activado.
  return { nombre, cedula: identificador, identificador, esRuc };
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
