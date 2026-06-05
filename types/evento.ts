import type { CatalogItem } from "@/types/catalog";
import type { EventoTipoParticipacion } from "@/lib/constants";

export type EventoGenero = "MASCULINO" | "FEMENINO" | "MASCULINO_FEMENINO";
export type EventoEstado = "DISPONIBLE" | "SOLICITADO" | "RECHAZADO" | "ACEPTADO";
export type EventoCategoriaCodigo =
  | "FORMACIÓN"
  | "MENORES"
  | "PREJUVENIL"
  | "JUVENIL"
  | "SENIOR"
  | "PERSONAS CON DISCAPACIDAD"
  | "ESCUELAS DE INICIACIÓN"
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
  tipoParticipacion: string;
  tipoEvento: string;
  lugar: string;
  provincia: string;
  ciudad: string;
  pais: string;
  genero: EventoGenero;
  alcance: string;
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
  categoriaId: number;
  categoriaCodigo?: string | null;
  eventoItems?: EventoItem[];
  presupuestosFuente?: PresupuestoFuente[];
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
