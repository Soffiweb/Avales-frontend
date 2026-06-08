import type { CatalogItem } from "@/types/catalog";
import type { EventoTipoParticipacion } from "@/lib/constants";

export type EventoGenero = "MASCULINO" | "FEMENINO" | "MASCULINO_FEMENINO";
export type EventoEstado = "DISPONIBLE" | "SOLICITADO" | "RECHAZADO" | "ACEPTADO";
export type EventoMissingField =
  | "genero"
  | "alcance"
  | "tipoParticipacion"
  | "categoriaId"
  | "tipoEvento"
  | "fechaInicio"
  | "fechaFin";
export type EventoCategoriaCodigo =
  | "PERSONAS_CON_DISCAPACIDAD"
  | "MENORES"
  | "JUVENIL"
  | "SENIOR"
  | "ESCUELAS_INICIACION"
  | "TODOS"
  | "FORMACION"
  | "PREJUVENIL"
  | "TODAS";

export type EventoItemActividad = {
  id: number;
  nombre: string;
  numero: number;
};

export type EventoItemDetalle = {
  id: number;
  nombre: string;
  numero: number;
  descripcion: string;
  actividad?: EventoItemActividad;
};

export type EventoItem = {
  id: number;
  mes: number;
  presupuesto: string;
  fuente: "FONDOS_PUBLICOS" | "AUTOGESTION";
  montoComprometido: string;
  montoEjecutado: string;
  valorUnitario?: string | null;
  item: EventoItemDetalle;
  createdAt?: string;
  updatedAt?: string;
};

export type PresupuestoFuente = {
  fuente: "FONDOS_PUBLICOS" | "AUTOGESTION";
  montoAsignado: string;
  montoComprometido: string;
  montoDisponible: string;
  montoEjecutado: string;
};

export type Evento = {
  id: number;
  codigo: string;
  nombre: string;
  tipoParticipacion?: string | null;
  tipoEvento?: string | null;
  lugar: string;
  provincia: string;
  ciudad: string;
  pais: string;
  genero?: EventoGenero | null;
  alcance?: string | null;
  fechaInicio?: string | null;
  fechaFin?: string | null;
  mesProgramado?: number | null;
  numEntrenadoresHombres: number;
  numEntrenadoresMujeres: number;
  numAtletasHombres: number;
  numAtletasMujeres: number;
  estado?: EventoEstado | null;
  archivo?: string | null;
  cargadoPorExcel?: boolean;
  deleted?: boolean;
  tieneReformaPendiente?: boolean;
  createdAt?: string;
  updatedAt?: string;
  disciplina?: CatalogItem | null;
  disciplinaId: number;
  disciplinaCodigo?: string | null;
  categoria?: CatalogItem | null;
  categoriaId?: number | null;
  categoriaCodigo?: string | null;
  eventoItems?: EventoItem[];
  presupuestosFuente?: PresupuestoFuente[];
  eventoIncompleto?: boolean;
  missingFields?: EventoMissingField[];
  editableFields?: EventoMissingField[];
};

export type CreateEventoPayload = {
  codigo: string;
  tipoParticipacion: EventoTipoParticipacion;
  tipoEvento: string;
  nombre: string;
  lugar: string;
  genero: EventoGenero;
  disciplinaCodigo: string;
  categoriaCodigo: EventoCategoriaCodigo;
  mesProgramado: number;
  provincia: string;
  ciudad: string;
  pais: string;
  alcance: string;
  fechaInicio?: string | null;
  fechaFin?: string | null;
  numEntrenadoresHombres: number;
  numEntrenadoresMujeres: number;
  numAtletasHombres: number;
  numAtletasMujeres: number;
  eventoItems?: {
    itemId: number;
    mes: number;
    presupuesto: number;
    fuente: "FONDOS_PUBLICOS" | "AUTOGESTION";
    montoComprometido?: number;
    montoEjecutado?: number;
  }[];
};

// La API devuelve el array directamente en data, y la paginación en meta
export type EventoListResponse = Evento[];

export function calcularTotalEvento(evento: Evento): number {
  if (!evento.eventoItems || evento.eventoItems.length === 0) return 0;
  return evento.eventoItems.reduce((sum, item) => {
    const valor = parseFloat(item.presupuesto) || 0;
    return sum + valor;
  }, 0);
}

function parseMonto(value?: string | null) {
  return Number.parseFloat(value ?? "0") || 0;
}

export function eventoTieneFondosPublicos(evento?: Evento | null): boolean {
  if (!evento) return false;

  const totalEvento = calcularTotalEvento(evento);
  if (totalEvento > 0) return true;

  return (
    evento.presupuestosFuente?.some(
      (presupuesto) =>
        presupuesto.fuente === "FONDOS_PUBLICOS" &&
        (
          parseMonto(presupuesto.montoAsignado) > 0 ||
          parseMonto(presupuesto.montoDisponible) > 0 ||
          parseMonto(presupuesto.montoComprometido) > 0
        ),
    ) ?? false
  );
}

const EVENTO_REQUIRED_FIELDS: EventoMissingField[] = [
  "categoriaId",
  "alcance",
  "tipoEvento",
];

export function getEventoMissingFields(evento?: Evento | null): EventoMissingField[] {
  if (!evento) return [];
  if (evento.missingFields?.length) return evento.missingFields;

  return EVENTO_REQUIRED_FIELDS.filter((field) => {
    if (field === "categoriaId") return !evento.categoriaId;
    const value = evento[field];
    return value === null || value === undefined || String(value).trim() === "";
  });
}

export function getEventoEditableCompletionFields(
  evento?: Evento | null
): EventoMissingField[] {
  if (!evento) return [];
  if (evento.editableFields?.length) return evento.editableFields;
  return getEventoMissingFields(evento);
}

export function isEventoIncompleto(evento?: Evento | null): boolean {
  if (!evento) return false;
  if (typeof evento.eventoIncompleto === "boolean") {
    return evento.eventoIncompleto;
  }
  return getEventoMissingFields(evento).length > 0;
}

export function getEventoMissingFieldLabel(field: EventoMissingField): string {
  switch (field) {
    case "genero":
      return "género";
    case "alcance":
      return "alcance";
    case "tipoParticipacion":
      return "tipo de participación";
    case "categoriaId":
      return "categoría";
    case "tipoEvento":
      return "tipo de evento";
    case "fechaInicio":
      return "fecha de inicio";
    case "fechaFin":
      return "fecha de fin";
    default:
      return field;
  }
}

function extractGeneroFromParticipante(deportista: {
  genero?: string | null;
  payload?: Record<string, unknown> | null;
}) {
  if (typeof deportista.genero === "string") {
    return deportista.genero.toUpperCase();
  }

  const payloadGenero = deportista.payload?.genero;
  return typeof payloadGenero === "string" ? payloadGenero.toUpperCase() : null;
}

export function inferEventoGenero(
  deportistas?: Array<{
    genero?: string | null;
    payload?: Record<string, unknown> | null;
  }> | null,
): EventoGenero | null {
  if (!deportistas?.length) return null;

  let hasMasculino = false;
  let hasFemenino = false;

  deportistas.forEach((deportista) => {
    const genero = extractGeneroFromParticipante(deportista);
    if (genero === "MASCULINO") hasMasculino = true;
    if (genero === "FEMENINO") hasFemenino = true;
  });

  if (hasMasculino && hasFemenino) return "MASCULINO_FEMENINO";
  if (hasMasculino) return "MASCULINO";
  if (hasFemenino) return "FEMENINO";
  return null;
}
