export type FuentePresupuestoReforma = "FONDOS_PUBLICOS" | "AUTOGESTION";
export type EstadoReformaMulti = "PENDIENTE" | "APROBADA" | "RECHAZADA";

export type UsuarioResumen = {
  id: number;
  nombre: string;
  apellido: string;
  email: string;
};

export type DisciplinaResumen = {
  id: number;
  nombre: string;
};

export type EventoResumen = {
  id: number;
  codigo: string;
  nombre: string;
  disciplina?: DisciplinaResumen;
};

export type ReformaMultiEventoDetalleItem = {
  id: number;
  nombre: string;
  numero: number;
};

export type ReformaMultiOrigenLinea = {
  id: number;
  eventoId: number;
  itemId: number;
  mes: number;
  montoCortado: string;
  item?: ReformaMultiEventoDetalleItem | null;
};

export type ReformaMultiDestinoLinea = {
  id: number;
  eventoId: number;
  itemId: number;
  mes: number;
  montoAsignado: string;
  item?: ReformaMultiEventoDetalleItem | null;
};

export type EventoOrigenItem = {
  id: number;
  eventoId: number;
  montoCortado: string;
  totalEventoAntes: string;
  totalEventoDespues?: string | null;
  evento: EventoResumen;
  items?: ReformaMultiOrigenLinea[];
};

export type EventoDestinoItem = {
  id: number;
  eventoId: number;
  montoAsignado: string;
  totalEventoAntes: string;
  totalEventoDespues?: string | null;
  evento: EventoResumen;
  items?: ReformaMultiDestinoLinea[];
};

export type CambiosSnapshot = {
  origenes: Array<{
    eventoId: number;
    before: Array<{ itemId: number; presupuesto: string }>;
    after: Array<{ itemId: number; presupuesto: string }>;
  }>;
  destinos: Array<{
    eventoId: number;
    before: Array<{ itemId: number; presupuesto: string }>;
    after: Array<{ itemId: number; presupuesto: string }>;
  }>;
};

export type ReformaMultiSummary = {
  id: number;
  motivo: string;
  mesEjecucion: number;
  estado: EstadoReformaMulti;
  fuente: FuentePresupuestoReforma;
  observacion?: string | null;
  solicitante: UsuarioResumen;
  aprobador?: UsuarioResumen | null;
  reviewedAt?: string | null;
  origenes: EventoOrigenItem[];
  destinos: EventoDestinoItem[];
  createdAt: string;
  updatedAt: string;
};

export type ReformaMultiDetail = ReformaMultiSummary & {
  cambios?: CambiosSnapshot | null;
};

export type ListReformasMultiQuery = {
  page?: number;
  limit?: number;
  estado?: EstadoReformaMulti;
  mesEjecucion?: number;
  search?: string;
};

export type ReformaLineItemPayload = {
  itemId: number;
  mes: number;
  monto: number;
};

export type CreateReformaMultiPayload = {
  motivo: string;
  mesEjecucion: number;
  fuente: FuentePresupuestoReforma;
  eventosOrigen: Array<{ eventoId: number; items: ReformaLineItemPayload[] }>;
  eventosDestino: Array<{ eventoId: number; items: ReformaLineItemPayload[] }>;
};
