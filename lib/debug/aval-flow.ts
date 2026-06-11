"use client";

import type { Aval } from "@/types/aval";

const AVAL_FLOW_DEBUG_KEY = "avales:debug-flow";

function canUseBrowser() {
  return typeof window !== "undefined";
}

export function isAvalFlowDebugEnabled() {
  if (!canUseBrowser()) return false;

  const searchParams = new URLSearchParams(window.location.search);
  const queryValue = searchParams.get("debugAvalFlow");

  if (queryValue === "1") {
    sessionStorage.setItem(AVAL_FLOW_DEBUG_KEY, "1");
    return true;
  }

  return (
    localStorage.getItem(AVAL_FLOW_DEBUG_KEY) === "1" ||
    sessionStorage.getItem(AVAL_FLOW_DEBUG_KEY) === "1"
  );
}

export function enableAvalFlowDebug(scope: "local" | "session" = "session") {
  if (!canUseBrowser()) return;
  const storage = scope === "local" ? localStorage : sessionStorage;
  storage.setItem(AVAL_FLOW_DEBUG_KEY, "1");
}

function sanitizePrimitive(value: unknown) {
  if (
    value == null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (value instanceof File) {
    return {
      name: value.name,
      size: value.size,
      type: value.type,
      lastModified: value.lastModified,
    };
  }

  return null;
}

function sanitizeFormData(formData: FormData) {
  const result: Record<string, unknown[]> = {};

  formData.forEach((value, key) => {
    if (!result[key]) result[key] = [];
    result[key].push(sanitizeValue(value, 1));
  });

  return result;
}

function sanitizeObject(value: Record<string, unknown>, depth: number) {
  const result: Record<string, unknown> = {};

  Object.entries(value).forEach(([key, nestedValue]) => {
    if (typeof nestedValue === "function") return;
    result[key] = sanitizeValue(nestedValue, depth + 1);
  });

  return result;
}

export function sanitizeValue(value: unknown, depth = 0): unknown {
  const primitive = sanitizePrimitive(value);
  if (primitive !== null) return primitive;

  if (depth > 4) {
    if (Array.isArray(value)) return `[array:${value.length}]`;
    if (value && typeof value === "object") return "[object]";
    return value;
  }

  if (value instanceof FormData) {
    return sanitizeFormData(value);
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item, depth + 1));
  }

  if (value && typeof value === "object") {
    return sanitizeObject(value as Record<string, unknown>, depth);
  }

  return String(value);
}

export function summarizeAval(aval: Aval | null | undefined) {
  if (!aval) return null;

  return {
    id: aval.id,
    estado: aval.estado,
    etapaActual: aval.etapaActual,
    tipoAval: aval.tipoAval,
    flujo: aval.flujo,
    montoSolicitado: aval.montoSolicitado,
    montoAsignado: aval.montoAsignado,
    numeroAval:
      aval.numeroAval ??
      aval.avalTecnico?.numeroAval ??
      aval.numeroColeccion ??
      aval.aval,
    evento: aval.evento
      ? {
          id: aval.evento.id,
          codigo: aval.evento.codigo,
          nombre: aval.evento.nombre,
          genero: aval.evento.genero,
        }
      : null,
    participantes: {
      deportistas: aval.avalTecnico?.deportistasAval?.length ?? 0,
      entrenadores: aval.entrenadores?.length ?? 0,
    },
    objetivos: aval.avalTecnico?.objetivos?.length ?? 0,
    criterios: aval.avalTecnico?.criterios?.length ?? 0,
    requerimientos: aval.avalTecnico?.requerimientos?.length ?? 0,
    documentos: {
      solicitudUrl: Boolean(aval.solicitudUrl),
      convocatoriaUrl: Boolean(aval.convocatoriaUrl),
      certificadoMedicoUrl: Boolean(aval.certificadoMedicoUrl),
      pronosticoDeportistasUrl: Boolean(aval.pronosticoDeportistasUrl),
      avalTecnicoPdfUrl: Boolean(aval.avalTecnicoPdfUrl),
      pda: Boolean(aval.pda),
      comprasPublicas: Boolean(aval.comprasPublicas),
      revisionMetodologo: Boolean(aval.revisionMetodologo),
      revisionDtm: Boolean(aval.revisionDtm),
    },
  };
}

export function avalFlowDebugLog(
  scope: string,
  message: string,
  meta?: Record<string, unknown>,
) {
  if (!isAvalFlowDebugEnabled()) return;

  const timestamp = new Date().toISOString();
  const prefix = `[aval-flow ${timestamp}] [${scope}] ${message}`;

  if (meta) {
    console.info(prefix, sanitizeValue(meta));
    return;
  }

  console.info(prefix);
}
