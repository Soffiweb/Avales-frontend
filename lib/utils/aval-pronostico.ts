import type { Evento } from "@/types/evento";

export type PronosticoTemplate =
  | "PRONOSTICO_1"
  | "PRONOSTICO_2"
  | "PRONOSTICO_3";

export type DeportistaPronosticoFieldPath =
  | "categoriaNombre"
  | "afiliacion"
  | "canton"
  | "club"
  | "entrenadorNombre"
  | "pronostico.ubicacionActual"
  | "pronostico.ubicacionPronosticada"
  | "pronostico.divisionPeso"
  | "pronostico.prueba"
  | "pronostico.marcaActual"
  | "pronostico.unidadMarcaActual"
  | "pronostico.marcaPronosticada"
  | "pronostico.unidadMarcaPronostico";

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
};

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

const PRONOSTICO_FIELDS: Record<
  Exclude<DeportistaPronosticoFieldPath, keyof typeof COMMON_FIELDS>,
  PronosticoFieldDefinition
> = {
  "pronostico.ubicacionActual": {
    path: "pronostico.ubicacionActual",
    label: "Ubicación actual",
    placeholder: "Ubicación actual",
  },
  "pronostico.ubicacionPronosticada": {
    path: "pronostico.ubicacionPronosticada",
    label: "Ubicación pronosticada",
    placeholder: "Ubicación pronosticada",
  },
  "pronostico.divisionPeso": {
    path: "pronostico.divisionPeso",
    label: "División de peso",
    placeholder: "División de peso",
  },
  "pronostico.prueba": {
    path: "pronostico.prueba",
    label: "Prueba",
    placeholder: "Prueba",
  },
  "pronostico.marcaActual": {
    path: "pronostico.marcaActual",
    label: "Marca actual",
    placeholder: "Marca actual",
  },
  "pronostico.unidadMarcaActual": {
    path: "pronostico.unidadMarcaActual",
    label: "Unidad marca actual",
    placeholder: "Ej. seg, kg, pts",
  },
  "pronostico.marcaPronosticada": {
    path: "pronostico.marcaPronosticada",
    label: "Marca pronosticada",
    placeholder: "Marca pronosticada",
  },
  "pronostico.unidadMarcaPronostico": {
    path: "pronostico.unidadMarcaPronostico",
    label: "Unidad marca pronosticada",
    placeholder: "Ej. seg, kg, pts",
  },
};

const TEMPLATE_FIELDS: Record<PronosticoTemplate, PronosticoFieldDefinition[]> = {
  PRONOSTICO_1: [
    COMMON_FIELDS.categoriaNombre,
    COMMON_FIELDS.canton,
    COMMON_FIELDS.club,
    COMMON_FIELDS.entrenadorNombre,
    PRONOSTICO_FIELDS["pronostico.ubicacionActual"],
    PRONOSTICO_FIELDS["pronostico.ubicacionPronosticada"],
  ],
  PRONOSTICO_2: [
    COMMON_FIELDS.categoriaNombre,
    COMMON_FIELDS.canton,
    COMMON_FIELDS.club,
    COMMON_FIELDS.entrenadorNombre,
    PRONOSTICO_FIELDS["pronostico.divisionPeso"],
    PRONOSTICO_FIELDS["pronostico.ubicacionActual"],
    PRONOSTICO_FIELDS["pronostico.ubicacionPronosticada"],
  ],
  PRONOSTICO_3: [
    COMMON_FIELDS.categoriaNombre,
    COMMON_FIELDS.canton,
    COMMON_FIELDS.entrenadorNombre,
    PRONOSTICO_FIELDS["pronostico.prueba"],
    PRONOSTICO_FIELDS["pronostico.marcaActual"],
    PRONOSTICO_FIELDS["pronostico.unidadMarcaActual"],
    PRONOSTICO_FIELDS["pronostico.marcaPronosticada"],
    PRONOSTICO_FIELDS["pronostico.unidadMarcaPronostico"],
    PRONOSTICO_FIELDS["pronostico.ubicacionPronosticada"],
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
  };
}
