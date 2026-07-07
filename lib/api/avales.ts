import { apiFetch } from "@/lib/api/client";
import type {
  Aval,
  AvalFormConfig,
  AvalListResponse,
  AvalParticipante,
  CreateColeccionAvalPayload,
  CreateAvalPayload,
  EditAvalPayload,
  Estado,
  EtapaFlujo,
  Historial,
  UpsertAvalParticipantesPayload,
} from "@/types/aval";

export type EstadoHistorial = "ACEPTADO" | "RECHAZADO";

export type ListAvalesOptions = {
  page?: number;
  limit?: number;
  estado?: Estado;
  etapa?: EtapaFlujo;
  eventoId?: number;
  search?: string;
  procesadosPorUsuarioId?: number;
  estadoHistorial?: EstadoHistorial;
  etapaHistorial?: EtapaFlujo;
};

export async function listAvales(options: ListAvalesOptions = {}) {
  const params = new URLSearchParams();

  if (options.page) params.set("page", String(options.page));
  if (options.limit) params.set("limit", String(options.limit));
  if (options.estado) params.set("estado", options.estado);
  if (options.etapa) params.set("etapa", options.etapa);
  if (options.eventoId) params.set("eventoId", String(options.eventoId));
  if (options.search) params.set("search", options.search);
  if (options.procesadosPorUsuarioId)
    params.set("procesadosPorUsuarioId", String(options.procesadosPorUsuarioId));
  if (options.estadoHistorial)
    params.set("estadoHistorial", options.estadoHistorial);
  if (options.etapaHistorial)
    params.set("etapaHistorial", options.etapaHistorial);

  const qs = params.toString();
  const url = qs ? `/avales?${qs}` : "/avales";

  return apiFetch<AvalListResponse>(url, { method: "GET" });
}

export async function getAval(id: number) {
  return apiFetch<Aval>(`/avales/${id}`, { method: "GET" });
}

export async function getAvalFormConfig(id: number) {
  return apiFetch<AvalFormConfig>(`/avales/${id}/form-config`, {
    method: "GET",
  });
}

export async function createColeccionAval(payload: CreateColeccionAvalPayload) {
  return apiFetch<Aval>("/avales", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getAvalesByEvento(eventoId: number) {
  return apiFetch<Aval[]>(`/avales/evento/${eventoId}`, { method: "GET" });
}

export async function getAvalHistorial(id: number) {
  return apiFetch<Historial[]>(`/avales/${id}/historial`, { method: "GET" });
}

/** Dispara regeneración asíncrona de todos los PDFs del aval. Admin, PDA, metodólogo y DTM. */
export async function regenerarAvalPdfs(id: number) {
  return apiFetch<{ id: number; status: string }>(
    `/avales/${id}/regenerar-pdfs`,
    { method: "POST" },
  );
}

export async function uploadConvocatoria(
  eventoId: number,
  convocatoria: File,
  certificadoMedico: File,
  pronosticoDeportistas: File | File[],
  options?: {
    tipoAval?: CreateColeccionAvalPayload["tipoAval"];
    formaParticipacionId?: CreateColeccionAvalPayload["formaParticipacionId"];
    montoSolicitado?: number;
  },
) {
  const formData = new FormData();
  formData.append("eventoId", String(eventoId));
  formData.append("convocatoria", convocatoria);
  formData.append("certificadoMedico", certificadoMedico);
  const pronosticoFiles = Array.isArray(pronosticoDeportistas)
    ? pronosticoDeportistas
    : [pronosticoDeportistas];
  for (const file of pronosticoFiles) {
    formData.append("pronosticoDeportistas", file);
  }
  if (options?.tipoAval) {
    formData.append("tipoAval", options.tipoAval);
  }
  if (typeof options?.formaParticipacionId === "number") {
    formData.append("formaParticipacionId", String(options.formaParticipacionId));
  }
  if (typeof options?.montoSolicitado === "number") {
    formData.append("montoSolicitado", String(options.montoSolicitado));
  }

  return apiFetch<Aval>("/avales/convocatoria", {
    method: "POST",
    body: formData,
  });
}

export async function uploadConvocatoriaPrincipal(id: number, archivo: File) {
  const formData = new FormData();
  formData.append("convocatoria", archivo);

  return apiFetch<Aval>(`/avales/${id}/convocatoria`, {
    method: "PATCH",
    body: formData,
  });
}

export async function uploadCertificadoMedico(id: number, archivo: File) {
  const formData = new FormData();
  formData.append("certificadoMedico", archivo);

  return apiFetch<Aval>(`/avales/${id}/certificado-medico`, {
    method: "PATCH",
    body: formData,
  });
}

export async function createAval(payload: CreateAvalPayload) {
  return apiFetch<Aval>("/avales", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateAvalRequest(id: number, payload: EditAvalPayload) {
  return apiFetch<Aval>(`/avales/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteAvalRequest(id: number) {
  return apiFetch<Aval>(`/avales/${id}`, {
    method: "DELETE",
  });
}

export async function getAvalParticipantes(id: number) {
  return apiFetch<AvalParticipante[]>(`/avales/${id}/participantes`, {
    method: "GET",
  });
}

export async function upsertAvalParticipantes(
  id: number,
  payload: UpsertAvalParticipantesPayload,
) {
  return apiFetch<Aval>(`/avales/${id}/participantes`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function uploadSolicitudAval(id: number, archivo: File) {
  const formData = new FormData();
  formData.append("archivo", archivo);

  return apiFetch<Aval>(`/avales/${id}/solicitud-aval`, {
    method: "PATCH",
    body: formData,
  });
}

export async function uploadAdjuntosSolicitud(id: number, archivos: File[]) {
  const formData = new FormData();
  archivos.forEach((archivo) => {
    formData.append("archivos", archivo);
  });

  return apiFetch<Aval>(`/avales/${id}/adjuntos`, {
    method: "PATCH",
    body: formData,
  });
}

export async function replaceAdjuntoSolicitud(
  avalId: number,
  adjuntoId: number,
  archivo: File,
) {
  const formData = new FormData();
  formData.append("archivo", archivo);

  return apiFetch<Aval>(`/avales/${avalId}/adjuntos/${adjuntoId}`, {
    method: "PATCH",
    body: formData,
  });
}

export async function deleteAdjuntoSolicitud(
  avalId: number,
  adjuntoId: number,
) {
  return apiFetch<Aval>(`/avales/${avalId}/adjuntos/${adjuntoId}`, {
    method: "DELETE",
  });
}

export async function uploadPronosticoDeportistas(
  id: number,
  archivos: File | File[],
) {
  const formData = new FormData();
  const lista = Array.isArray(archivos) ? archivos : [archivos];
  for (const archivo of lista) {
    formData.append("pronosticoDeportistas", archivo);
  }

  return apiFetch<Aval>(`/avales/${id}/pronostico-deportistas`, {
    method: "PATCH",
    body: formData,
  });
}

export async function uploadAvalArchivo(id: number, archivo: File) {
  const formData = new FormData();
  formData.append("archivo", archivo);

  return apiFetch<Aval>(`/avales/${id}/archivo`, {
    method: "PATCH",
    body: formData,
  });
}

export async function downloadDtmPdf(id: number) {
  return apiFetch<Blob>(`/avales/${id}/dtm-pdf`, {
    method: "GET",
  });
}

export async function downloadPdaPdf(id: number) {
  return apiFetch<Blob>(`/avales/${id}/pda-pdf`, {
    method: "GET",
  });
}

export type CreatePdaItemDiaPayload = {
  noDias: number;
  nombrePersonalizado?: string;
  cantidad: number;
  valorUnitario: number;
  subtotal?: number;
};

export type CreatePdaItemPayload = {
  itemId: number;
  formaParticipacionItemId?: number;
  nombrePersonalizado?: string;
  presupuesto: number;
  dias: CreatePdaItemDiaPayload[];
};

export type PdaNotaPayload = {
  titulo: string;
  texto: string;
  mostrarDatosFacturacion?: boolean;
};

export type CreatePdaPayload = {
  descripcion: string;
  numeroPda?: string;
  numeroAval?: string;
  codigoActividad?: string;
  nombreFirmante?: string;
  cargoFirmante?: string;
  montoAsignado?: number;
  items?: CreatePdaItemPayload[];
  notas?: PdaNotaPayload[];
};

export async function createPda(id: number, payload: CreatePdaPayload) {
  return apiFetch<Aval>(`/avales/${id}/pda`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export type CreateComprasPublicasPayload = {
  numeroCertificado?: string;
  realizoProceso?: boolean;
  codigos?: Array<{
    codigo: string;
    descripcion: string;
  }>;
  descripcion?: string;
  nombreFirmante?: string;
  cargoFirmante?: string;
  fechaEmision?: string;
};

export async function createComprasPublicas(
  id: number,
  payload: CreateComprasPublicasPayload
) {
  return apiFetch<Aval>(`/avales/${id}/compras-publicas`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export type CreateRevisionDtmPayload = {
  descripcion: string;
  observacion?: string;
  fechaPresentacion: string;
  firmanteNombre?: string;
  firmanteCargo?: string;
};

export async function createRevisionDtm(
  id: number,
  payload: CreateRevisionDtmPayload,
) {
  return apiFetch<Aval>(`/avales/${id}/revision-dtm`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export type ApproveRevisionMetodologoPayload = {
  numeroRevision: string;
  dirigidoA: string;
  cargoDirigidoA: string;
  descripcionEncabezado: string;
  firmanteNombre: string;
  firmanteCargo: string;
  fechaRevision?: string;
  observacionesFinales: string;
  items: Array<{
    key: string;
    cumple: boolean;
    observacion?: string;
  }>;
};

export type ApproveRevisionDtmPayload = {
  descripcion: string;
  observacion?: string;
  fechaPresentacion?: string;
  firmanteNombre?: string;
  firmanteCargo?: string;
  items: Array<{
    key: string;
    cumple: boolean;
    observacion?: string;
  }>;
};

export type ApproveFinancieroNotasPayload = {
  notas: PdaNotaPayload[];
  nombreFirmante?: string;
  cargoFirmante?: string;
};

export type UpdateNumeracionPayload = {
  periodoComision?: string;
  periodoComisionFin?: string;
};

export async function updateNumeracion(id: number, payload: UpdateNumeracionPayload) {
  return apiFetch<Aval>(`/avales/${id}/numeracion`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export type AprobarAvalOptions = {
  revisionMetodologo?: ApproveRevisionMetodologoPayload;
  revisionDtm?: ApproveRevisionDtmPayload;
  financieroNotas?: ApproveFinancieroNotasPayload;
  descripcionControlPrevio?: string;
  periodoComision?: string;
  periodoComisionFin?: string;
  comentario?: string;
};

export async function aprobarAval(
  id: number,
  usuarioId: number,
  etapa: EtapaFlujo,
  options?: AprobarAvalOptions,
) {
  const body: Record<string, unknown> = { usuarioId, etapa };

  if (options?.revisionMetodologo) {
    body.revisionMetodologo = options.revisionMetodologo;
  }
  if (options?.revisionDtm) {
    body.revisionDtm = options.revisionDtm;
  }
  if (options?.financieroNotas) {
    body.financieroNotas = options.financieroNotas;
  }
  if (options?.descripcionControlPrevio) {
    body.descripcionControlPrevio = options.descripcionControlPrevio;
  }
  if (options?.periodoComision !== undefined) {
    body.periodoComision = options.periodoComision;
  }
  if (options?.periodoComisionFin !== undefined) {
    body.periodoComisionFin = options.periodoComisionFin;
  }
  if (options?.comentario?.trim()) {
    body.comentario = options.comentario.trim();
  }

  return apiFetch<Aval>(`/avales/${id}/aprobar`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

// Endpoints "admin save" — permiten a SUPER_ADMIN/ADMIN guardar los datos
// de la revision sin avanzar el flujo. Gateado en el backend por rol.
export async function adminSaveRevisionMetodologo(
  id: number,
  usuarioId: number,
  revisionMetodologo: ApproveRevisionMetodologoPayload,
  etapa: EtapaFlujo = "REVISION_METODOLOGO",
) {
  return apiFetch<{ id: number }>(
    `/avales/${id}/admin/revision-metodologo`,
    {
      method: "PATCH",
      body: JSON.stringify({ usuarioId, etapa, revisionMetodologo }),
    },
  );
}

export async function adminSaveRevisionDtm(
  id: number,
  usuarioId: number,
  revisionDtm: ApproveRevisionDtmPayload,
  etapa: EtapaFlujo = "REVISION_DTM",
) {
  return apiFetch<{ id: number }>(`/avales/${id}/admin/revision-dtm`, {
    method: "PATCH",
    body: JSON.stringify({ usuarioId, etapa, revisionDtm }),
  });
}

export async function adminSaveComprasPublicas(
  id: number,
  usuarioId: number,
  payload: CreateComprasPublicasPayload,
  etapa: EtapaFlujo = "COMPRAS_PUBLICAS",
) {
  return apiFetch<Aval>(`/avales/${id}/admin/compras-publicas`, {
    method: "PATCH",
    body: JSON.stringify({ usuarioId, etapa, ...payload }),
  });
}

export async function adminSavePda(
  id: number,
  usuarioId: number,
  payload: CreatePdaPayload,
  etapa: EtapaFlujo = "PDA",
) {
  return apiFetch<Aval>(`/avales/${id}/admin/pda`, {
    method: "PATCH",
    body: JSON.stringify({ usuarioId, etapa, ...payload }),
  });
}

export async function adminSaveControlPrevio(
  id: number,
  usuarioId: number,
  descripcion: string,
  etapa: EtapaFlujo = "CONTROL_PREVIO",
) {
  return apiFetch<{ id: number }>(`/avales/${id}/admin/control-previo`, {
    method: "PATCH",
    body: JSON.stringify({ usuarioId, etapa, descripcion }),
  });
}

export async function adminSaveFinanciero(
  id: number,
  usuarioId: number,
  payload: {
    financieroNotas?: ApproveFinancieroNotasPayload;
    numeroFinanciero?: string;
    numeroPresupuestoSalida?: string;
    numeroCertificacionPresupuestaria?: string;
    periodoComision?: string;
    periodoComisionFin?: string;
    periodoContable?: string;
  },
  etapa: EtapaFlujo = "FINANCIERO",
) {
  return apiFetch<{ id: number }>(`/avales/${id}/admin/financiero`, {
    method: "PATCH",
    body: JSON.stringify({ usuarioId, etapa, ...payload }),
  });
}

export async function rechazarAval(
  id: number,
  usuarioId: number,
  etapa: EtapaFlujo,
  motivo?: string,
  etapaDestino?: EtapaFlujo,
) {
  return apiFetch<Aval>(`/avales/${id}/rechazar`, {
    method: "PATCH",
    body: JSON.stringify({ usuarioId, etapa, motivo, etapaDestino }),
  });
}

export type RevisionMetodologoItem = {
  codigo: string;
  descripcion: string;
};

export async function getRevisionMetodologoItems() {
  return apiFetch<RevisionMetodologoItem[]>(
    "/avales/revision-metodologo/items",
    {
      method: "GET",
    },
  );
}
