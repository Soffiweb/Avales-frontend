export const EVENTO_CATEGORIA_VALUES = [
  "FORMACION",
  "MENORES",
  "PREJUVENIL",
  "JUVENIL",
  "SENIOR",
  "PERSONAS_CON_DISCAPACIDAD",
  "ESCUELAS_INICIACION",
  "TODAS",
] as const;

export const EVENTO_CATEGORIA_LABELS: Record<
  (typeof EVENTO_CATEGORIA_VALUES)[number],
  string
> = {
  FORMACION: "Formación",
  MENORES: "Menores",
  PREJUVENIL: "Prejuvenil",
  JUVENIL: "Juvenil",
  SENIOR: "Senior",
  PERSONAS_CON_DISCAPACIDAD: "Personas con discapacidad",
  ESCUELAS_INICIACION: "Escuelas de iniciación",
  TODAS: "Todas",
};

export const EVENTO_CATEGORIA_ALIASES: Record<string, (typeof EVENTO_CATEGORIA_VALUES)[number]> = {
  FORMACION: "FORMACION",
  MENORES: "MENORES",
  PRE_JUVENIL: "PREJUVENIL",
  PREJUVENIL: "PREJUVENIL",
  JUVENIL: "JUVENIL",
  SENIOR: "SENIOR",
  PERSONAS_CON_DISCAPACIDAD: "PERSONAS_CON_DISCAPACIDAD",
  ESCUELAS_DE_INICIACION: "ESCUELAS_INICIACION",
  ESCUELAS_INICIACION: "ESCUELAS_INICIACION",
  TODAS: "TODAS",
};

export const EVENTO_TIPO_PARTICIPACION_VALUES = [
  "PARTICIPACION",
  "ORGANIZACION",
  "EJECUCION_Y_ADQUISICION",
] as const;

export type EventoTipoParticipacion =
  (typeof EVENTO_TIPO_PARTICIPACION_VALUES)[number];

export const EVENTO_TIPO_PARTICIPACION_LABELS: Record<
  (typeof EVENTO_TIPO_PARTICIPACION_VALUES)[number],
  string
> = {
  PARTICIPACION: "Participación",
  ORGANIZACION: "Organización",
  EJECUCION_Y_ADQUISICION: "Ejecución y adquisición",
};

export const EVENTO_ALCANCE_VALUES = [
  "NACIONAL",
  "INTERNACIONAL",
] as const;

export const EVENTO_ALCANCE_LABELS: Record<
  (typeof EVENTO_ALCANCE_VALUES)[number],
  string
> = {
  NACIONAL: "Nacional",
  INTERNACIONAL: "Internacional",
};

export const EVENTO_TIPO_EVENTO_VALUES = [
  "BASE_DE_ENTRENAMIENTO",
  "CAMPEONATOS",
  "CONCENTRADOS",
  "JUEGOS",
  "OTRO",
  "SELECTIVOS",
  "TODOS",
] as const;

export const EVENTO_TIPO_EVENTO_LABELS: Record<
  (typeof EVENTO_TIPO_EVENTO_VALUES)[number],
  string
> = {
  BASE_DE_ENTRENAMIENTO: "Base de entrenamiento",
  CAMPEONATOS: "Campeonatos",
  CONCENTRADOS: "Concentrados",
  JUEGOS: "Juegos",
  OTRO: "Otro",
  SELECTIVOS: "Selectivos",
  TODOS: "Todos",
};

function toOptions<T extends readonly string[]>(
  values: T,
  labels: Record<T[number], string>,
): { value: T[number]; label: string }[] {
  return values.map((value) => ({
    value: value as T[number],
    label: labels[value as T[number]],
  }));
}

export const EVENTO_CATEGORIA_OPTIONS = toOptions(
  EVENTO_CATEGORIA_VALUES,
  EVENTO_CATEGORIA_LABELS,
);

export const EVENTO_TIPO_PARTICIPACION_OPTIONS = toOptions(
  EVENTO_TIPO_PARTICIPACION_VALUES,
  EVENTO_TIPO_PARTICIPACION_LABELS,
);

export const EVENTO_ALCANCE_OPTIONS = toOptions(
  EVENTO_ALCANCE_VALUES,
  EVENTO_ALCANCE_LABELS,
);

export const EVENTO_TAREA_OPTIONS = toOptions(
  EVENTO_TIPO_EVENTO_VALUES,
  EVENTO_TIPO_EVENTO_LABELS,
);
