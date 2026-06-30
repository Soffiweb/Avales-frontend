import type { CatalogItem } from "@/types/catalog";
import type { EventoTipoParticipacion } from "@/lib/constants";
import type { TipoAval } from "@/types/aval";

export type EventoGenero = "MASCULINO" | "FEMENINO" | "MASCULINO_FEMENINO";
export type EventoEstado = "DISPONIBLE" | "SOLICITADO" | "RECHAZADO" | "ACEPTADO";
export type EventoMissingField =
  | "genero"
  | "alcance"
  | "tipoParticipacion"
  | "categoriaId"
  | "tipoEvento"
  | "lugar"
  | "provincia"
  | "ciudad"
  | "fechaInicio"
  | "fechaFin";
export type EventoCategoriaCodigo =
  | "PERSONAS_CON_DISCAPACIDAD"
  | "MENORES"
  | "JUVENIL"
  | "SENIOR"
  | "ESCUELAS_INICIACION"
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

export type EventoResumenCupos = {
  participantesPlanificados: number;
  participantesAsignados: number;
  participantesDisponibles: number;
  entrenadoresPlanificados: number;
  entrenadoresAsignados: number;
  entrenadoresDisponibles: number;
  participantesPorModalidad?: Record<string, number>;
};

export type FormaParticipacionCupos = {
  id: number;
  eventoId?: number;
  tipoAval: TipoAval;
  referencia?: string | null;
  observacion?: string | null;
  numEntrenadoresHombres: number;
  numEntrenadoresMujeres: number;
  numAtletasHombres: number;
  numAtletasMujeres: number;
  presupuestoTotal?: string | null;
  estado?: string | null;
  deleted?: boolean;
  createdAt?: string;
  updatedAt?: string;
  items?: EventoItem[];
};

export type FormaParticipacionItemInput = {
  itemId: number;
  mes: number;
  presupuesto: number;
};

export type FormaParticipacionInputDto = {
  id?: number;
  tipoAval: TipoAval;
  referencia?: string;
  observacion?: string;
  numEntrenadoresHombres: number;
  numEntrenadoresMujeres: number;
  numAtletasHombres: number;
  numAtletasMujeres: number;
  items?: FormaParticipacionItemInput[];
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
  formasParticipacion?: FormaParticipacionCupos[];
  presupuestosFuente?: PresupuestoFuente[];
  resumenCupos?: EventoResumenCupos | null;
  eventoIncompleto?: boolean;
  missingFields?: EventoMissingField[];
  editableFields?: EventoMissingField[];
};

export type CreateEventoPayload = {
  codigo: string;
  tipoParticipacion: EventoTipoParticipacion;
  tipoEvento: string;
  nombre: string;
  lugar?: string;
  genero?: EventoGenero;
  disciplinaCodigo: string;
  categoriaCodigo?: EventoCategoriaCodigo;
  mesProgramado: number;
  provincia?: string;
  ciudad?: string;
  pais: string;
  alcance?: string;
  fechaInicio?: string | null;
  fechaFin?: string | null;
  formasParticipacion: FormaParticipacionInputDto[];
};

// La API devuelve el array directamente en data, y la paginación en meta
export type EventoListResponse = Evento[];

export type EventoFormaParticipacionView = {
  id: number | string;
  tipoAval: TipoAval;
  referencia?: string | null;
  observacion?: string | null;
  numEntrenadoresHombres: number;
  numEntrenadoresMujeres: number;
  numAtletasHombres: number;
  numAtletasMujeres: number;
};

export type EventoPresupuestoView = {
  fuente: "FONDOS_PUBLICOS" | "AUTOGESTION";
  items: EventoItem[];
  total: number;
};

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

export function eventoTieneFormaParticipacion(
  evento: Evento | null | undefined,
  tipoAval: TipoAval,
): boolean {
  if (!evento) return false;

  return (
    evento.formasParticipacion?.some((forma) => forma.tipoAval === tipoAval) ??
    false
  );
}

export function getEventoFormasParticipacion(
  evento?: Evento | null,
): EventoFormaParticipacionView[] {
  if (!evento) return [];

  if (evento.formasParticipacion?.length) {
    return evento.formasParticipacion.map((forma) => ({
      id: forma.id,
      tipoAval: forma.tipoAval,
      referencia: forma.referencia ?? null,
      observacion: forma.observacion ?? null,
      numEntrenadoresHombres: forma.numEntrenadoresHombres,
      numEntrenadoresMujeres: forma.numEntrenadoresMujeres,
      numAtletasHombres: forma.numAtletasHombres,
      numAtletasMujeres: forma.numAtletasMujeres,
    }));
  }

  const hasRootParticipants =
    (evento.numAtletasHombres || 0) > 0 ||
    (evento.numAtletasMujeres || 0) > 0 ||
    (evento.numEntrenadoresHombres || 0) > 0 ||
    (evento.numEntrenadoresMujeres || 0) > 0;

  if (!hasRootParticipants) return [];

  return [
    {
      id: "general",
      tipoAval: "SOLO_RESULTADO",
      referencia: null,
      observacion: null,
      numEntrenadoresHombres: evento.numEntrenadoresHombres || 0,
      numEntrenadoresMujeres: evento.numEntrenadoresMujeres || 0,
      numAtletasHombres: evento.numAtletasHombres || 0,
      numAtletasMujeres: evento.numAtletasMujeres || 0,
    },
  ];
}

export function getEventoPresupuestoPorFuente(
  evento?: Evento | null,
): EventoPresupuestoView[] {
  if (!evento) return [];

  const fromFormas = (evento.formasParticipacion ?? [])
    .map((forma) => {
      const fuente =
        forma.tipoAval === "FONDOS_PUBLICOS" || forma.tipoAval === "AUTOGESTION"
          ? forma.tipoAval
          : null;

      if (!fuente) return null;

      const items = forma.items ?? [];
      const total = items.reduce((sum, item) => {
        const valor = Number.parseFloat(item.presupuesto) || 0;
        return sum + valor;
      }, 0);

      return { fuente, items, total };
    })
    .filter((group): group is EventoPresupuestoView => Boolean(group));

  if (fromFormas.length > 0) return fromFormas;

  const fuentes: Array<"FONDOS_PUBLICOS" | "AUTOGESTION"> = [
    "FONDOS_PUBLICOS",
    "AUTOGESTION",
  ];

  return fuentes
    .map((fuente) => {
      const items = (evento.eventoItems ?? []).filter((item) => item.fuente === fuente);
      const total = items.reduce((sum, item) => {
        const valor = Number.parseFloat(item.presupuesto) || 0;
        return sum + valor;
      }, 0);

      if (items.length === 0 && total === 0) return null;

      return { fuente, items, total };
    })
    .filter((group): group is EventoPresupuestoView => Boolean(group));
}

export function getEventoPresupuestoTotal(evento?: Evento | null): number {
  return getEventoPresupuestoPorFuente(evento).reduce(
    (sum, group) => sum + group.total,
    0,
  );
}

const EVENTO_REQUIRED_FIELDS: EventoMissingField[] = [
  "categoriaId",
  "alcance",
  "tipoEvento",
  "fechaInicio",
  "fechaFin",
];

export function getEventoMissingFields(evento?: Evento | null): EventoMissingField[] {
  if (!evento) return [];
  const localMissingFields = EVENTO_REQUIRED_FIELDS.filter((field) => {
    if (field === "categoriaId") return !evento.categoriaId;
    const value = evento[field];
    return value === null || value === undefined || String(value).trim() === "";
  });

  if (!evento.missingFields?.length) return localMissingFields;

  return Array.from(new Set([...evento.missingFields, ...localMissingFields]));
}

export function getEventoEditableCompletionFields(
  evento?: Evento | null
): EventoMissingField[] {
  if (!evento) return [];
  const missingFields = getEventoMissingFields(evento);
  if (!evento.editableFields?.length) return missingFields;
  return Array.from(new Set([...evento.editableFields, ...missingFields]));
}

export function isEventoIncompleto(evento?: Evento | null): boolean {
  if (!evento) return false;
  const hasLocalMissingFields = getEventoMissingFields(evento).length > 0;
  if (typeof evento.eventoIncompleto === "boolean") {
    return evento.eventoIncompleto || hasLocalMissingFields;
  }
  return hasLocalMissingFields;
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
    case "lugar":
      return "lugar";
    case "provincia":
      return "provincia";
    case "ciudad":
      return "ciudad";
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
