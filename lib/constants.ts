import type { EtapaFlujo } from "@/types/aval";

/**
 * Constantes globales de la aplicación.
 * Centraliza valores que se usan en múltiples lugares.
 */

/** Número de items por página en listados */
export const DEFAULT_PAGE_SIZE = 10;

/** Duración del toast en milisegundos antes de ocultarse */
export const TOAST_DURATION = 4000;

/** Delay para limpiar item de confirmación después de cerrar modal */
export const CONFIRM_CLEANUP_DELAY = 180;

/** Roles disponibles en el sistema */
export const ROLES = [
  "SUPER_ADMIN",
  "ADMIN",
  "ADMINISTRADOR",
  "SECRETARIA",
  "DTM",
  "METODOLOGO",
  "ENTRENADOR",
  "USUARIO",
  "DEPORTISTA",
  "PDA",
  "CONTROL_PREVIO",
  "COMPRAS_PUBLICAS",
  "FINANCIERO",
] as const;

export type Role = (typeof ROLES)[number];

/** Opciones de género para formularios */
export const GENERO_OPTIONS = [
  { value: "masculino", label: "Masculino" },
  { value: "femenino", label: "Femenino" },
  { value: "otro", label: "Otro" },
] as const;

export const EVENTO_TIPO_PARTICIPACION_OPTIONS = [
  { value: "participación", label: "Participación" },
  { value: "organización", label: "Organización" },
  { value: "ejecución y adquisición", label: "Ejecución y adquisición" },
] as const;

export type EventoTipoParticipacion =
  (typeof EVENTO_TIPO_PARTICIPACION_OPTIONS)[number]["value"];

const EVENTO_TIPO_PARTICIPACION_ALIASES: Record<string, EventoTipoParticipacion> = {
  PARTICIPACION: "participación",
  PARTICIPACIÓN: "participación",
  ORGANIZACION: "organización",
  ORGANIZACIÓN: "organización",
  EJECUCION: "ejecución y adquisición",
  EJECUCIÓN: "ejecución y adquisición",
  ADQUISICION: "ejecución y adquisición",
  ADQUISICIÓN: "ejecución y adquisición",
  "EJECUCION Y ADQUISICION": "ejecución y adquisición",
  "EJECUCIÓN Y ADQUISICIÓN": "ejecución y adquisición",
};

export function normalizeEventoTipoParticipacion(
  value?: string | null
): EventoTipoParticipacion | undefined {
  if (!value) return undefined;
  const normalized = value.trim();
  if (!normalized) return undefined;

  const aliasKey = normalized
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();

  return (
    EVENTO_TIPO_PARTICIPACION_ALIASES[aliasKey] ??
    (EVENTO_TIPO_PARTICIPACION_OPTIONS.some((option) => option.value === normalized)
      ? (normalized as EventoTipoParticipacion)
    : undefined)
  );
}

export function getEventoTipoParticipacionLabel(
  value?: string | null
): string | undefined {
  const normalized = normalizeEventoTipoParticipacion(value);
  if (!normalized) return value?.trim() || undefined;
  return (
    EVENTO_TIPO_PARTICIPACION_OPTIONS.find(
      (option) => option.value === normalized,
    )?.label ?? normalized
  );
}

/** Estados de eventos */
export const EVENTO_ESTADOS = [
  "DISPONIBLE",
  "SOLICITADO",
  "RECHAZADO",
  "ACEPTADO",
] as const;

export type EventoEstado = (typeof EVENTO_ESTADOS)[number];

/** Estilos CSS para badges de estado de eventos */
export const EVENTO_STATUS_STYLES: Record<EventoEstado, string> = {
  DISPONIBLE:
    "bg-green-100 text-green-800 dark:bg-green-900/60 dark:text-green-200",
  SOLICITADO:
    "bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200",
  RECHAZADO:
    "bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-200",
  ACEPTADO: "bg-sky-100 text-sky-800 dark:bg-sky-900/60 dark:text-sky-200",
};

/** Estilo por defecto para estados desconocidos */
export const DEFAULT_STATUS_STYLE =
  "bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-200";

/**
 * Obtiene las clases CSS para un estado de evento.
 * @param status - Estado del evento
 * @returns Clases CSS correspondientes
 */
export function getEventoStatusClasses(status?: string | null): string {
  if (!status) return DEFAULT_STATUS_STYLE;
  const upperStatus = status.toUpperCase() as EventoEstado;
  return EVENTO_STATUS_STYLES[upperStatus] ?? DEFAULT_STATUS_STYLE;
}

/** Valores de query params para status de acciones */
export const STATUS_PARAMS = {
  CREATED: "created",
  UPDATED: "updated",
  ERROR: "error",
} as const;

/** Mensajes de toast por status */
export const TOAST_MESSAGES = {
  created: (entity: string) => `${entity} creado correctamente.`,
  updated: (entity: string) => `${entity} actualizado correctamente.`,
  deleted: (entity: string) => `${entity} eliminado correctamente.`,
  error: "No se pudo procesar la solicitud.",
} as const;

/** Estados de avales */
export const AVAL_ESTADOS = [
  "DISPONIBLE",
  "BORRADOR",
  "SOLICITADO",
  "RECHAZADO",
  "ACEPTADO",
] as const;

export type AvalEstado = (typeof AVAL_ESTADOS)[number];

/** Estilos CSS para badges de estado de avales */
export const AVAL_STATUS_STYLES: Record<
  AvalEstado,
  { bg: string; text: string }
> = {
  DISPONIBLE: {
    bg: "bg-blue-100 dark:bg-blue-900/60",
    text: "text-blue-800 dark:text-blue-200",
  },
  BORRADOR: {
    bg: "bg-orange-100 dark:bg-orange-900/60",
    text: "text-orange-800 dark:text-orange-200",
  },
  SOLICITADO: {
    bg: "bg-amber-100 dark:bg-amber-900/60",
    text: "text-amber-800 dark:text-amber-200",
  },
  ACEPTADO: {
    bg: "bg-green-100 dark:bg-green-900/60",
    text: "text-green-800 dark:text-green-200",
  },
  RECHAZADO: {
    bg: "bg-rose-100 dark:bg-rose-900/60",
    text: "text-rose-800 dark:text-rose-200",
  },
};

/**
 * Obtiene las clases CSS para un estado de aval.
 * @param status - Estado del aval
 * @returns Objeto con clases CSS de fondo y texto
 */
export function getAvalStatusClasses(status?: string | null): {
  bg: string;
  text: string;
} {
  if (!status) return { bg: DEFAULT_STATUS_STYLE.split(" ")[0], text: "" };
  const upperStatus = status.toUpperCase() as AvalEstado;
  return AVAL_STATUS_STYLES[upperStatus] ?? { bg: DEFAULT_STATUS_STYLE.split(" ")[0], text: "" };
}

export const AVAL_APPROVAL_REVIEWER_ROLES = [
  "SUPER_ADMIN",
  "SUPERADMIN",
  "ADMIN",
  "ADMINISTRADOR",
  "METODOLOGO",
  "DTM",
  "PDA",
  "CONTROL_PREVIO",
  "FINANCIERO",
] as const;

export const APPROVAL_STAGE_FLOW: EtapaFlujo[] = [
  "SOLICITUD",
  "PDA",
  "COMPRAS_PUBLICAS",
  "REVISION_METODOLOGO",
  "REVISION_DTM",
  "CONTROL_PREVIO",
  "SECRETARIA",
  "FINANCIERO",
];

export const APPROVAL_STAGE_LABELS: Record<EtapaFlujo, string> = {
  SOLICITUD: "Solicitud",
  REVISION_METODOLOGO: "Revisado por el metodólogo",
  REVISION_DTM: "Revisado por el DTM",
  PDA: "Revisado por el PDA",
  COMPRAS_PUBLICAS: "Certificación Compras Públicas",
  CONTROL_PREVIO: "Revisado por Control Previo",
  SECRETARIA: "Revisado por Secretaría",
  FINANCIERO: "Ya está aprobado",
};

export function getApprovalStageLabel(etapa: EtapaFlujo): string {
  return APPROVAL_STAGE_LABELS[etapa] ?? etapa;
}

const STAGE_BADGE_DEFAULT = {
  bg: "bg-amber-100 dark:bg-amber-900/60",
  text: "text-amber-800 dark:text-amber-200",
};
const STAGE_BADGE_FINANCIERO = {
  bg: "bg-green-100 dark:bg-green-900/60",
  text: "text-green-800 dark:text-green-200",
};
const STAGE_BADGE_RECHAZADO = {
  bg: "bg-rose-100 dark:bg-rose-900/60",
  text: "text-rose-800 dark:text-rose-200",
};

export function getApprovalStageBadgeStyles(
  estado?: string | null,
  etapa?: EtapaFlujo,
): { bg: string; text: string } {
  if (estado?.toUpperCase() === "RECHAZADO") {
    return STAGE_BADGE_RECHAZADO;
  }
  if (etapa === "FINANCIERO") {
    return STAGE_BADGE_FINANCIERO;
  }
  return STAGE_BADGE_DEFAULT;
}

export function getNextApprovalStage(
  etapa?: EtapaFlujo,
): EtapaFlujo | undefined {
  if (!etapa) return undefined;
  const index = APPROVAL_STAGE_FLOW.indexOf(etapa);
  if (index === -1 || index === APPROVAL_STAGE_FLOW.length - 1) return undefined;
  return APPROVAL_STAGE_FLOW[index + 1];
}

export function getPreviousApprovalStages(
  etapa?: EtapaFlujo,
): EtapaFlujo[] {
  if (!etapa) return [];
  const index = APPROVAL_STAGE_FLOW.indexOf(etapa);
  if (index <= 0) return [];
  return APPROVAL_STAGE_FLOW.slice(0, index);
}
