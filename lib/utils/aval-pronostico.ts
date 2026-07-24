import type { Evento } from "@/types/evento";
import type { PropositoDto } from "@/types/aval";

export type PronosticoTemplate =
  | "PRONOSTICO_1"
  | "PRONOSTICO_2"
  | "PRONOSTICO_3";

// "proposito.*" son los campos que viven dentro de cada ítem de
// deportistasAval[].propositos (ver types/aval.ts#PropositoDto). No es un
// pronóstico: es el propósito (marca/ubicación meta) de por qué el
// deportista asiste a la competencia.
export type DeportistaPronosticoFieldPath =
  | "categoriaNombre"
  | "afiliacion"
  | "canton"
  | "club"
  | "entrenadorNombre"
  | "proposito.ubicacionActual"
  | "proposito.ubicacionProposito"
  | "proposito.divisionPeso"
  | "proposito.prueba"
  | "proposito.marcaActual"
  | "proposito.unidadMarcaActual"
  | "proposito.marcaProposito"
  | "proposito.unidadMarcaProposito";

export type PronosticoFieldDefinition = {
  path: DeportistaPronosticoFieldPath;
  label: string;
  placeholder: string;
};

export type PronosticoProfile = {
  template: PronosticoTemplate;
  disciplinaCodigo: string;
  disciplinaLabel: string;
  fields: PronosticoFieldDefinition[];
  // PRONOSTICO_3: un deportista puede tener varias pruebas (varios ítems en
  // propositos[]), cada una con su propia marca/ubicación. Las demás
  // plantillas también usan propositos[], pero con un solo ítem.
  multiplePruebas: boolean;
};

// Cantón, club y entrenador son alternativas del mismo dato de procedencia:
// se completa el que aplique (federación → entrenador, club → club,
// provincia → cantón), no los tres a la vez. Fuente única para el grupo,
// compartida entre validación, UI de campos y el estado de chips activos.
export const PROCEDENCIA_GROUP_FIELDS: DeportistaPronosticoFieldPath[] = [
  "canton",
  "club",
  "entrenadorNombre",
];

export const PROCEDENCIA_DEFAULT_FIELD: DeportistaPronosticoFieldPath =
  "entrenadorNombre";

const DISCIPLINAS_PRONOSTICO_1 = new Set([
  "BALONCESTO",
  "FUTBOL",
  "VOLEIBOL",
]);

const DISCIPLINAS_PRONOSTICO_2 = new Set([
  "BOXEO",
  "JUDO",
  "KARATE",
  "LUCHA",
  "LUCHA_OLIMPICA",
  "TAEKWONDO",
  "KICK_BOXING",
]);

const DISCIPLINAS_PRONOSTICO_3 = new Set([
  "NATACION",
  "ATLETISMO",
  "PATINAJE",
  "LEVANTAMIENTO_PESAS",
  "CICLISMO",
  "GIMNASIA_RITMICA",
  "GIMNASIA_ARTISTICA",
  "AJEDREZ",
  "TENIS_DE_MESA",
  "DEPORTE_ADAPTADO",
]);

const COMMON_FIELDS: Record<
  "categoriaNombre" | "afiliacion" | "canton" | "club" | "entrenadorNombre",
  PronosticoFieldDefinition
> = {
  categoriaNombre: {
    path: "categoriaNombre",
    label: "Categoría",
    placeholder: "Categoría del deportista",
  },
  afiliacion: {
    path: "afiliacion",
    label: "Afiliación",
    placeholder: "Ej. AFILIADO/A 2026",
  },
  canton: {
    path: "canton",
    label: "Cantón",
    placeholder: "Cantón",
  },
  club: {
    path: "club",
    label: "Club",
    placeholder: "Club",
  },
  entrenadorNombre: {
    path: "entrenadorNombre",
    label: "Entrenador",
    placeholder: "Nombre del entrenador",
  },
};

export const PRONOSTICO_FIELDS: Record<
  Exclude<DeportistaPronosticoFieldPath, keyof typeof COMMON_FIELDS>,
  PronosticoFieldDefinition
> = {
  "proposito.ubicacionActual": {
    path: "proposito.ubicacionActual",
    label: "Ubicación actual",
    placeholder: "Ubicación actual",
  },
  "proposito.ubicacionProposito": {
    path: "proposito.ubicacionProposito",
    label: "Ubicación propósito",
    placeholder: "Ubicación propósito",
  },
  "proposito.divisionPeso": {
    path: "proposito.divisionPeso",
    label: "División de peso",
    placeholder: "División de peso",
  },
  "proposito.prueba": {
    path: "proposito.prueba",
    label: "Prueba",
    placeholder: "Prueba",
  },
  "proposito.marcaActual": {
    path: "proposito.marcaActual",
    label: "Marca actual",
    placeholder: "Marca actual",
  },
  "proposito.unidadMarcaActual": {
    path: "proposito.unidadMarcaActual",
    label: "Unidad marca actual",
    placeholder: "Ej. seg, kg, pts",
  },
  "proposito.marcaProposito": {
    path: "proposito.marcaProposito",
    label: "Marca propósito",
    placeholder: "Marca propósito",
  },
  "proposito.unidadMarcaProposito": {
    path: "proposito.unidadMarcaProposito",
    label: "Unidad marca propósito",
    placeholder: "Ej. seg, kg, pts",
  },
};

const TEMPLATE_FIELDS: Record<PronosticoTemplate, PronosticoFieldDefinition[]> = {
  PRONOSTICO_1: [
    COMMON_FIELDS.categoriaNombre,
    COMMON_FIELDS.canton,
    COMMON_FIELDS.club,
    COMMON_FIELDS.entrenadorNombre,
    PRONOSTICO_FIELDS["proposito.ubicacionActual"],
    PRONOSTICO_FIELDS["proposito.ubicacionProposito"],
  ],
  PRONOSTICO_2: [
    COMMON_FIELDS.categoriaNombre,
    COMMON_FIELDS.canton,
    COMMON_FIELDS.club,
    COMMON_FIELDS.entrenadorNombre,
    PRONOSTICO_FIELDS["proposito.divisionPeso"],
    PRONOSTICO_FIELDS["proposito.ubicacionActual"],
    PRONOSTICO_FIELDS["proposito.ubicacionProposito"],
  ],
  PRONOSTICO_3: [
    COMMON_FIELDS.categoriaNombre,
    COMMON_FIELDS.canton,
    COMMON_FIELDS.club,
    COMMON_FIELDS.entrenadorNombre,
    PRONOSTICO_FIELDS["proposito.prueba"],
    PRONOSTICO_FIELDS["proposito.marcaActual"],
    PRONOSTICO_FIELDS["proposito.unidadMarcaActual"],
    PRONOSTICO_FIELDS["proposito.marcaProposito"],
    PRONOSTICO_FIELDS["proposito.unidadMarcaProposito"],
    PRONOSTICO_FIELDS["proposito.ubicacionProposito"],
  ],
};

export function normalizeDisciplinaKey(value?: string | null) {
  if (!value) return "";
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function resolvePronosticoTemplate(
  disciplinaCodigo: string,
): PronosticoTemplate | null {
  if (DISCIPLINAS_PRONOSTICO_1.has(disciplinaCodigo)) return "PRONOSTICO_1";
  if (DISCIPLINAS_PRONOSTICO_2.has(disciplinaCodigo)) return "PRONOSTICO_2";
  if (DISCIPLINAS_PRONOSTICO_3.has(disciplinaCodigo)) return "PRONOSTICO_3";
  return null;
}

export function getPronosticoProfile(
  evento?: Pick<Evento, "disciplina" | "disciplinaCodigo"> | null,
): PronosticoProfile | null {
  const disciplinaCodigo = normalizeDisciplinaKey(
    evento?.disciplinaCodigo ?? evento?.disciplina?.codigo ?? evento?.disciplina?.nombre,
  );
  const template = resolvePronosticoTemplate(disciplinaCodigo);

  if (!template) return null;

  return {
    template,
    disciplinaCodigo,
    disciplinaLabel: evento?.disciplina?.nombre ?? disciplinaCodigo,
    fields: TEMPLATE_FIELDS[template],
    multiplePruebas: template === "PRONOSTICO_3",
  };
}

export function isPropositoFieldPath(path: DeportistaPronosticoFieldPath): boolean {
  return path.startsWith("proposito.");
}

// Campos que viven en un ítem de propositos[] (los que aplican a esta
// disciplina, según la plantilla). Plantilla 3 los edita en el repetidor (N
// ítems); plantillas 1/2 usan los mismos campos pero sueltos, sobre un único
// ítem fijo (propositos[0]).
export function getPropositoFieldDefinitions(
  profile: PronosticoProfile,
): PronosticoFieldDefinition[] {
  return profile.fields.filter((field) => isPropositoFieldPath(field.path));
}

export function createEmptyProposito(): PropositoDto {
  return {};
}

// Lectura ordenada por `orden` (el backend no garantiza el orden de
// llegada del arreglo).
export function getPropositos(
  propositos?: PropositoDto[] | null,
): PropositoDto[] {
  if (!propositos?.length) return [];
  return [...propositos].sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));
}

// Plantillas 1/2 editan un solo ítem (propositos[0]) con campos sueltos;
// plantilla 3 edita N ítems en el repetidor. En ambos casos el arreglo debe
// tener al menos un ítem para que la UI siempre tenga algo que mostrar.
export function ensureAtLeastOneProposito(
  propositos?: PropositoDto[] | null,
): PropositoDto[] {
  const rows = getPropositos(propositos);
  return rows.length ? rows : [createEmptyProposito()];
}
