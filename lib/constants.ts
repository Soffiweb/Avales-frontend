import type {
  EtapaFlujo,
  ModalidadParticipacion,
  TipoAval,
} from "@/types/aval";
import {
  EVENTO_CATEGORIA_OPTIONS as EVENTO_CATEGORIA_OPTIONS_SOURCE,
  EVENTO_ALCANCE_OPTIONS as EVENTO_ALCANCE_OPTIONS_SOURCE,
  EVENTO_TAREA_OPTIONS as EVENTO_TAREA_OPTIONS_SOURCE,
  EVENTO_TIPO_PARTICIPACION_OPTIONS as EVENTO_TIPO_PARTICIPACION_OPTIONS_SOURCE,
} from "@/lib/domain/evento-options";

/**
 * Constantes globales de la aplicación.
 * Centraliza valores que se usan en múltiples lugares.
 */

/** Número de items por página en listados */
export const DEFAULT_PAGE_SIZE = 10;
export const EVENTOS_PAGE_SIZE = 9;
export const AVALES_PAGE_SIZE = 9;

/** Número máximo de resultados en búsquedas typeahead/inline */
export const SEARCH_RESULTS_LIMIT = 20;

/** Duración del toast en milisegundos antes de ocultarse */
export const TOAST_DURATION = 4000;

/** Delay para limpiar item de confirmación después de cerrar modal */
export const CONFIRM_CLEANUP_DELAY = 180;

/** Roles disponibles en el sistema */
export const ROLES = [
  "admin",
  "administrador",
  "secretaria",
  "dtm",
  "metodologo",
  "entrenador",
  "usuario",
  "deportista",
  "pda",
  "control_previo",
  "compras_publicas",
  "financiero",
] as const;

export type Role = (typeof ROLES)[number];

/** Opciones de género para formularios */
export const GENERO_OPTIONS = [
  { value: "masculino", label: "Masculino" },
  { value: "femenino", label: "Femenino" },
  { value: "otro", label: "Otro" },
] as const;

export const EVENTO_TIPO_PARTICIPACION_OPTIONS =
  EVENTO_TIPO_PARTICIPACION_OPTIONS_SOURCE;

export type EventoTipoParticipacion =
  (typeof EVENTO_TIPO_PARTICIPACION_OPTIONS)[number]["value"];

// Opciones de dropdowns para eventos
export const EVENTO_ACTIVIDAD_OPTIONS = [
  { value: "EVENTOS_DE_PREPARACIÓN_COMPETENCIA_Y_CAPACITACIÓN_DEPORTIVA_004", label: "Eventos de preparación competencia y capacitación deportiva 004" },
  { value: "EVENTOS_DE_PREPARACIÓN_COMPETENCIA_Y_CAPACITACIÓN_DEPORTIVA_005", label: "Eventos de preparación competencia y capacitación deportiva 005" },
  { value: "EVENTOS_DE_PREPARACIÓN_COMPETENCIA_Y_CAPACITACIÓN_DEPORTIVA_006", label: "Eventos de preparación competencia y capacitación deportiva 006" },
  { value: "EVENTOS_DE_PREPARACIÓN_COMPETENCIA_Y_CAPACITACIÓN_DEPORTIVA_007", label: "Eventos de preparación competencia y capacitación deportiva 007" },
  { value: "EVENTOS_DE_PREPARACIÓN_COMPETENCIA_Y_CAPACITACIÓN_DEPORTIVA_008", label: "Eventos de preparación competencia y capacitación deportiva 008" },
  { value: "EVENTOS_DE_PREPARACIÓN_COMPETENCIA_Y_CAPACITACIÓN_DEPORTIVA_009", label: "Eventos de preparación competencia y capacitación deportiva 009" },
] as const;

export const EVENTO_TAREA_OPTIONS = EVENTO_TAREA_OPTIONS_SOURCE;

export const EVENTO_SECTOR_OPTIONS = [
  { value: "CONVENCIONAL", label: "Convencional" },
  { value: "DISCAPACIDAD", label: "Discapacidad" },
] as const;

export const EVENTO_ALCANCE_OPTIONS = EVENTO_ALCANCE_OPTIONS_SOURCE;
export const EVENTO_CATEGORIA_OPTIONS = EVENTO_CATEGORIA_OPTIONS_SOURCE;

function normalizeOptionKey(value?: string | null) {
  return value
    ?.trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
}

const EVENTO_TIPO_EVENTO_ALIASES: Record<string, string> = {
  BASES_DE_ENTRENAMIENTO: "BASE_DE_ENTRENAMIENTO",
  BASE_DE_ENTRENAMIENTOS: "BASE_DE_ENTRENAMIENTO",
  OTROS: "OTRO",
};

export const EVENTO_GENERO_OPTIONS = [
  { value: "MASCULINO", label: "Varones" },
  { value: "FEMENINO", label: "Mujeres" },
  { value: "MASCULINO_FEMENINO", label: "Ambos" },
] as const;

export const EVENTO_MES_OPTIONS = [
  { value: 1, label: "Enero" },
  { value: 2, label: "Febrero" },
  { value: 3, label: "Marzo" },
  { value: 4, label: "Abril" },
  { value: 5, label: "Mayo" },
  { value: 6, label: "Junio" },
  { value: 7, label: "Julio" },
  { value: 8, label: "Agosto" },
  { value: 9, label: "Septiembre" },
  { value: 10, label: "Octubre" },
  { value: 11, label: "Noviembre" },
  { value: 12, label: "Diciembre" },
] as const;

const EVENTO_TIPO_PARTICIPACION_ALIASES: Record<string, EventoTipoParticipacion> = {
  PARTICIPACION: "PARTICIPACION",
  PARTICIPACIÓN: "PARTICIPACION",
  ORGANIZACION: "ORGANIZACION",
  ORGANIZACIÓN: "ORGANIZACION",
  EJECUCION: "EJECUCION_Y_ADQUISICION",
  EJECUCIÓN: "EJECUCION_Y_ADQUISICION",
  ADQUISICION: "EJECUCION_Y_ADQUISICION",
  ADQUISICIÓN: "EJECUCION_Y_ADQUISICION",
  "EJECUCION Y ADQUISICION": "EJECUCION_Y_ADQUISICION",
  "EJECUCIÓN Y ADQUISICIÓN": "EJECUCION_Y_ADQUISICION",
  EJECUCION_Y_ADQUISICION: "EJECUCION_Y_ADQUISICION",
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

export function normalizeEventoTipoEvento(value?: string | null): string | undefined {
  const rawNormalized = normalizeOptionKey(value);
  const normalized = rawNormalized
    ? (EVENTO_TIPO_EVENTO_ALIASES[rawNormalized] ?? rawNormalized)
    : undefined;
  if (!normalized) return undefined;

  return EVENTO_TAREA_OPTIONS.find((option) => {
    const optionValue = normalizeOptionKey(option.value);
    const optionLabel = normalizeOptionKey(option.label);
    return optionValue === normalized || optionLabel === normalized;
  })?.value;
}

export function normalizeEventoAlcance(value?: string | null): string | undefined {
  const normalized = normalizeOptionKey(value);
  if (!normalized) return undefined;

  return EVENTO_ALCANCE_OPTIONS.find((option) => {
    const optionValue = normalizeOptionKey(option.value);
    const optionLabel = normalizeOptionKey(option.label);
    return optionValue === normalized || optionLabel === normalized;
  })?.value;
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

export const TIPO_AVAL_OPTIONS: Array<{ value: TipoAval; label: string }> = [
  { value: "FONDOS_PUBLICOS", label: "Fondos públicos" },
  { value: "AUTOGESTION", label: "Autogestión" },
  { value: "SOLO_RESULTADO", label: "Solo resultados" },
];

export function getTipoAvalLabel(value?: string | null): string {
  if (!value) return "Sin tipo";
  return (
    TIPO_AVAL_OPTIONS.find((option) => option.value === value)?.label ?? value
  );
}

export const MODALIDAD_PARTICIPACION_OPTIONS: Array<{
  value: ModalidadParticipacion;
  label: string;
}> = [
  {
    value: "CUBIERTO_FONDOS_PUBLICOS",
    label: "Cubierto por fondos públicos",
  },
  {
    value: "CUBIERTO_AUTOGESTION",
    label: "Cubierto por autogestión",
  },
  { value: "SOLO_RESULTADO", label: "Solo resultado" },
];

export function getModalidadParticipacionLabel(value?: string | null): string {
  if (!value) return "Sin modalidad";
  return (
    MODALIDAD_PARTICIPACION_OPTIONS.find((option) => option.value === value)
      ?.label ?? value
  );
}

export function getAllowedModalidadesByTipoAval(
  tipoAval?: TipoAval | null,
): ModalidadParticipacion[] {
  if (tipoAval === "FONDOS_PUBLICOS") {
    return ["CUBIERTO_FONDOS_PUBLICOS", "SOLO_RESULTADO"];
  }
  if (tipoAval === "AUTOGESTION") {
    return ["CUBIERTO_AUTOGESTION", "SOLO_RESULTADO"];
  }
  return ["SOLO_RESULTADO"];
}

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
  if (estado?.toUpperCase() === "ACEPTADO" || etapa === "FINANCIERO") {
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
