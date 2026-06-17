import type { User } from "@/types/user";

export type Estado = "DISPONIBLE" | "BORRADOR" | "SOLICITADO" | "RECHAZADO" | "ACEPTADO";

export type TipoAval =
  | "FONDOS_PUBLICOS"
  | "AUTOGESTION"
  | "SOLO_RESULTADO";

export type FuentePresupuesto = "FONDOS_PUBLICOS" | "AUTOGESTION";

export type ModalidadParticipacion =
  | "CUBIERTO_FONDOS_PUBLICOS"
  | "CUBIERTO_AUTOGESTION"
  | "SOLO_RESULTADO";

export type EtapaFlujo =
  | "SOLICITUD"
  | "REVISION_METODOLOGO"
  | "REVISION_DTM"
  | "PDA"
  | "COMPRAS_PUBLICAS"
  | "CONTROL_PREVIO"
  | "SECRETARIA"
  | "FINANCIERO";

export type Genero = "MASCULINO" | "FEMENINO" | "MASCULINO_FEMENINO";

export type CatalogItemSimple = {
  id: number;
  nombre: string;
};

export type OrigenAvalRequerimiento = "PDA" | "MANUAL";

export type TipoCoberturaAval = "DINERO" | "ESPECIE";

export type ActividadSimple = {
  id: number;
  nombre: string;
  numero: number;
};

export type PdaItemDia = {
  id?: number;
  noDias?: number;
  nombrePersonalizado?: string | null;
  cantidad: number;
  valorUnitario: number;
  subtotal?: number | null;
};

export type ItemSimple = {
  id: number;
  nombre: string;
  numero: number;
  codigo?: string | null;
  actividad: ActividadSimple;
};

export type PresupuestoItem = {
  id: number;
  item: ItemSimple;
  mes: number;
  presupuesto: string;
  fuente: FuentePresupuesto;
  montoComprometido: string;
  montoEjecutado: string;
  createdAt: string;
  updatedAt: string;
};

export type EventoSimple = {
  id: number;
  codigo: string;
  nombre: string;
  tipoParticipacion: string;
  tipoEvento: string;
  lugar: string;
  genero: Genero;
  disciplina: CatalogItemSimple;
  disciplinaCodigo?: string | null;
  categoria: CatalogItemSimple;
  categoriaCodigo?: string | null;
  provincia: string;
  ciudad: string;
  pais: string;
  alcance: string;
  fechaInicio?: string | null;
  fechaFin?: string | null;
  mesProgramado?: number | null;
  numEntrenadoresHombres: number;
  numEntrenadoresMujeres: number;
  numAtletasHombres: number;
  numAtletasMujeres: number;
  estado: Estado;
  archivo?: string;
  presupuesto: PresupuestoItem[];
  formaParticipacionActual?: FormaParticipacionResumen;
  formasParticipacion?: FormaParticipacionResumen[];
  createdAt: string;
  updatedAt: string;
};

// Resumen de la FormaParticipacion del tipoAval actual del aval. Espejo
// operacional adicional, no reemplaza los campos legacy de EventoSimple.
export type FormaParticipacionResumen = {
  id: number;
  tipoAval: TipoAval;
  numEntrenadoresHombres: number;
  numEntrenadoresMujeres: number;
  numAtletasHombres: number;
  numAtletasMujeres: number;
  presupuestoTotal?: string | null;
  estado: Estado;
  items: PresupuestoItem[];
};

export type AvalObjetivo = {
  id: number;
  orden: number;
  descripcion: string;
};

export type AvalCriterio = {
  id: number;
  orden: number;
  descripcion: string;
};

export type RubroPresupuestario = {
  id: number;
  formaParticipacionItemId?: number;
  otroConcepto?: string;
  detalle?: string;
  origen?: OrigenAvalRequerimiento;
  tipoCobertura?: TipoCoberturaAval;
  cantidad?: string;
  montoSolicitado?: string;
  editable?: boolean;
  cantidadDias: string;
  valorUnitario?: number | null;
};

export type DeportistaAvalDetail = {
  id?: number;
  deportistaExternoId?: string;
  nombre?: string;
  apellido?: string;
  nombres?: string;
  apellidos?: string;
  cedula?: string;
  genero?: string;
  payload?: unknown;
};

export type DeportistaAval = {
  id: number;
  deportistaId?: number;
  deportistaExternoId?: string;
  rol: string;
  modalidadParticipacion?: ModalidadParticipacion | null;
  deportista: DeportistaAvalDetail;
};

export type AvalParticipante = {
  id: number;
  deportistaId: number;
  nombreCompleto: string;
  modalidadParticipacion: ModalidadParticipacion;
};

export type AvalPresupuestoFuente = {
  fuente?: FuentePresupuesto | null;
  asignado: number;
  comprometido: number;
  disponible: number;
};

export type AvalResumenCupos = {
  total: number;
  cubiertos: number;
  soloResultado: number;
};

export type EntrenadorAval = {
  id: number;
  entrenadorId: number;
  entrenadorNombre?: string;
  rol: string;
  esPrincipal?: boolean;
  nombre?: string;
  apellido?: string;
  cedula?: string;
  genero?: string;
  entrenador?: {
    nombre?: string;
    apellido?: string;
    cedula?: string;
    genero?: string;
  };
  usuario?: {
    nombre?: string;
    apellido?: string;
    cedula?: string;
    genero?: string;
  };
};

export type AvalTecnico = {
  id: number;
  descripcion?: string | null;
  archivo?: string | null;
  numeroAval?: string | null;
  fechaHoraSalida: string;
  fechaHoraRetorno: string;
  lugarSalida?: string | null;
  lugarRetorno?: string | null;
  transporteSalida: string;
  transporteRetorno: string;
  entrenadores: number;
  atletas: number;
  observaciones?: string | null;
  objetivos: AvalObjetivo[];
  criterios: AvalCriterio[];
  requerimientos: RubroPresupuestario[];
  deportistasAval: DeportistaAval[];
};

export type RevisionDtm = {
  id: number;
  numeroRevision?: string | null;
  descripcion?: string | null;
  observacion?: string | null;
  fechaPresentacion?: string | null;
  firmanteNombre?: string | null;
  firmanteCargo?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type ControlPrevio = {
  id: number;
  numeroRevision?: string | null;
  fechaEmision?: string | null;
  descripcion?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type UsuarioSimple = {
  id: number;
  nombre: string;
  apellido: string;
  email: string;
};

export type Historial = {
  id: number;
  estado: Estado;
  etapa: EtapaFlujo;
  comentario?: string | null;
  usuario: UsuarioSimple;
  createdAt: string;
};

export type AdjuntoSolicitud = {
  id: number;
  nombreOriginal: string;
  nombreArchivo: string;
  mimeType: string;
  tamanoBytes: number;
  url: string;
  createdAt: string;
};

export type Aval = {
  id: number;
  coleccionAvalId?: number | null;
  userId?: number | null;
  descripcion?: string | null;
  fechaEmision?: string | null;
  estado: Estado;
  etapaActual?: EtapaFlujo;
  tipoAval?: TipoAval | null;
  flujo?: string[] | null;
  siguienteEtapa?: string | null;
  modalidadesPermitidas?: ModalidadParticipacion[] | null;
  montoSolicitado?: number | null;
  montoAsignado?: number | null;
  presupuesto?: AvalPresupuestoFuente | null;
  resumenCupos?: AvalResumenCupos | null;
  comentario?: string | null;
  convocatoriaUrl?: string | null;
  certificadoMedicoUrl?: string | null;
  pronosticoDeportistasUrl?: string | null;
  avalTecnicoPdfUrl?: string | null;
  escuelaIniciacionPdfUrl?: string | null;
  comprasPublicasPdfUrl?: string | null;
  revisionMetodologoUrl?: string | null;
  revisionDtmUrl?: string | null;
  controlPrevioUrl?: string | null;
  presupuestoSalidaUrl?: string | null;
  certificacionPresupuestariaUrl?: string | null;
  dtmUrl?: string | null;
  pdaUrl?: string | null;
  solicitudUrl?: string | null;
  adjuntosSolicitud: AdjuntoSolicitud[];
  convocatoriaAdjuntos?: AdjuntoSolicitud[];
  pronosticoDeportistasAdjuntos?: AdjuntoSolicitud[];
  numeroAval?: string | null;
  aval?: string | null;
  numeroColeccion?: string | null;
  periodoComision?: string | null;
  periodoComisionFin?: string | null;
  pda?: {
    descripcion?: string | null;
    numeroPda?: string | null;
    numeroAval?: string | null;
    codigoActividad?: string | null;
    nombreFirmante?: string | null;
    cargoFirmante?: string | null;
    items?: Array<{
      id?: number;
      itemId: number;
      itemNombre?: string | null;
      nombrePersonalizado?: string | null;
      presupuesto: number;
      dias: PdaItemDia[];
    }> | null;
  } | null;
  comprasPublicas?: {
    numeroCertificado?: string | null;
    realizoProceso?: boolean | null;
    codigos?: Array<{
      codigo: string;
      descripcion: string;
    }> | null;
    codigoNecesidad?: string | null;
    objetoContratacion?: string | null;
    nombreFirmante?: string | null;
    cargoFirmante?: string | null;
    fechaEmision?: string | null;
  } | null;
  financiero?: Array<{
    id: number;
    descripcion?: string | null;
    periodoComision?: string | null;
    periodoComisionFin?: string | null;
    fechaSalida?: string | null;
    nombreFirmante?: string | null;
    cargoFirmante?: string | null;
    cuentaBancaria?: string | null;
    fondos?: string | null;
    notas?: string | null;
    items?: unknown[] | null;
  }> | null;
  revisionDtm?: RevisionDtm | null;
  controlPrevio?: ControlPrevio | null;
  revisionMetodologo?: {
    numeroRevision?: string | null;
    dirigidoA?: string | null;
    cargoDirigidoA?: string | null;
    descripcionEncabezado?: string | null;
    fechaRevision?: string | null;
    observacionesFinales?: string | null;
    firmanteNombre?: string | null;
    firmanteCargo?: string | null;
    items?: Array<{
      key?: string | null;
      codigo?: string | null;
      descripcion?: string | null;
      label?: string | null;
      section?: "CHECKLIST" | "DATOS_INFORMATIVOS" | "HOJAS_EXCEL" | string | null;
      type?: "boolean" | "fecha" | string | null;
      order?: number | null;
      cumple?: boolean | null;
      observacion?: string | null;
    }> | null;
  } | null;
  dtm?: Array<{
    numeroDtm?: string | null;
  }>;
  evento: EventoSimple;
  avalTecnico?: AvalTecnico;
  participantes?: AvalParticipante[] | null;
  entrenadores: EntrenadorAval[];
  historial: Historial[];
  createdAt: string;
  updatedAt: string;
};

// La API devuelve el array directamente en data, y la paginación en meta
export type AvalListResponse = Aval[];

export type ObjetivoDto = {
  orden: number;
  descripcion: string;
};

export type CriterioDto = {
  orden: number;
  descripcion: string;
};

export type RubroPresupuestarioDto = {
  formaParticipacionItemId?: number;
  origen?: OrigenAvalRequerimiento;
  tipoCobertura?: TipoCoberturaAval;
  otroConcepto?: string;
  detalle?: string;
  cantidad?: string;
  montoSolicitado?: string;
  editable?: boolean;
};

export type DeportistaAvalDto = {
  deportistaExternoId: string;
  rol: string;
  modalidadParticipacion?: ModalidadParticipacion;
  nombre?: string;
  apellido?: string;
  nombres?: string;
  apellidos?: string;
  cedula?: string;
  payload?: Record<string, unknown>;
};

export type EntrenadorAvalDto = {
  entrenadorId?: number;
  entrenadorNombre?: string;
  rol: string;
  esPrincipal?: boolean;
};

export type CreateAvalPayload = {
  coleccionAvalId: number;
  tipoAval?: TipoAval;
  montoSolicitado?: number;
  fechaEmision?: string | null;
  numeroAval?: string | null;
  fechaHoraSalida: string;
  fechaHoraRetorno: string;
  lugarSalida: string;
  lugarRetorno: string;
  transporteSalida: string;
  transporteRetorno: string;
  objetivos: ObjetivoDto[];
  criterios: CriterioDto[];
  deportistas: DeportistaAvalDto[];
  entrenadores: EntrenadorAvalDto[];
  requerimientos?: RubroPresupuestarioDto[];
  observaciones?: string;
};

export type EditAvalPayload = Omit<CreateAvalPayload, "coleccionAvalId"> & {
  montoAsignado?: number;
};

export type CreateColeccionAvalPayload = {
  eventoId: number;
  tipoAval: TipoAval;
  formaParticipacionId?: number;
  montoSolicitado?: number;
};

export type UpsertAvalParticipantesPayload = {
  participantes: Array<{
    deportistaId: number;
    modalidadParticipacion: ModalidadParticipacion;
  }>;
};

export type AvalFormSectionKey =
  | "DOCUMENTOS"
  | "PDA"
  | "COMPRAS_PUBLICAS"
  | "REVISION_METODOLOGO"
  | "REVISION_DTM"
  | "CONTROL_PREVIO"
  | "FINANCIERO"
  | "PRESUPUESTO"
  | "PARTICIPANTES";

export type AvalFormActionKey =
  | "GUARDAR"
  | "ENVIAR"
  | "APROBAR"
  | "RECHAZAR";

export type AvalFormSectionConfig = {
  key: AvalFormSectionKey;
  visible: boolean;
  editable: boolean;
  required: boolean;
};

export type AvalFormActionConfig = {
  key: AvalFormActionKey;
  visible: boolean;
  enabled: boolean;
};

export type AvalFormConfig = {
  tipoAval?: TipoAval;
  etapaActual: string;
  secciones: AvalFormSectionConfig[];
  acciones: AvalFormActionConfig[];
};
