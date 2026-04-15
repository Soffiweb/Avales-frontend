import type { CatalogItem } from "@/types/catalog";

export type EventoGenero = "MASCULINO" | "FEMENINO" | "MASCULINO_FEMENINO";
export type EventoEstado = "DISPONIBLE" | "SOLICITADO" | "RECHAZADO" | "ACEPTADO";

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
  valorUnitario?: string | null;
  item: EventoItemDetalle;
  createdAt?: string;
  updatedAt?: string;
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
  mesProgramado?: number | null;
  eventoItems?: EventoItem[];
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
