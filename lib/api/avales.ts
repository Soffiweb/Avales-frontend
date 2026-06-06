import { apiFetch } from "@/lib/api/client";
import type {
  Aval,
  AvalFormConfig,
  AvalListResponse,
  AvalParticipante,
  CreateColeccionAvalPayload,
  CreateAvalPayload,
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

/** Dispara regeneración asíncrona de todos los PDFs del aval. Solo admin/super_admin. */
export async function regenerarAvalPdfs(id: number) {
  return apiFetch<{ id: number; status: string }>(
    `/avales/${id}/regenerar-pdfs`,
    { method: "POST" },
  );
}

export async function uploadConvocatoria(
  eventoId: number,
  convocatoria: File | File[],
  certificadoMedico: File,
  pronosticoDeportistas: File,
  options?: {
    tipoAval?: CreateColeccionAvalPayload["tipoAval"];
    montoSolicitado?: number;
  },
) {
  const formData = new FormData();
  formData.append("eventoId", String(eventoId));
  const convocatoriaFiles = Array.isArray(convocatoria) ? convocatoria : [convocatoria];
  for (const file of convocatoriaFiles) {
    formData.append("convocatoria", file);
  }
  formData.append("certificadoMedico", certificadoMedico);
  formData.append("pronosticoDeportistas", pronosticoDeportistas);
  if (options?.tipoAval) {
    formData.append("tipoAval", options.tipoAval);
  }
  if (typeof options?.montoSolicitado === "number") {
    formData.append("montoSolicitado", String(options.montoSolicitado));
  }

  return apiFetch<Aval>("/avales/convocatoria", {
    method: "POST",
    body: formData,
  });
}

export async function createAval(payload: CreateAvalPayload) {
  return apiFetch<Aval>("/avales", {
    method: "POST",
    body: JSON.stringify(payload),
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

export async function uploadPronosticoDeportistas(id: number, archivo: File) {
  const formData = new FormData();
  formData.append("pronosticoDeportistas", archivo);

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
  numeroDia: number;
  cantidad: number;
  valorUnitario: number;
};

export type CreatePdaItemPayload = {
  itemId: number;
  presupuesto: number;
  dias: CreatePdaItemDiaPayload[];
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
  codigoNecesidad?: string;
  objetoContratacion?: string;
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
  fechaRevision: string;
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
  fechaPresentacion: string;
  firmanteNombre?: string;
  firmanteCargo?: string;
  items: Array<{
    key: string;
    cumple: boolean;
    observacion?: string;
  }>;
};

export type ApproveFinancieroNotasPayload = {
  notas: Array<{
    titulo: string;
    texto: string;
    mostrarDatosFacturacion?: boolean;
  }>;
};

export async function aprobarAval(
  id: number,
  usuarioId: number,
  etapa: EtapaFlujo,
  revisionMetodologo?: ApproveRevisionMetodologoPayload,
  revisionDtm?: ApproveRevisionDtmPayload,
  financieroNotas?: ApproveFinancieroNotasPayload,
) {
  const body: {
    usuarioId: number;
    etapa: EtapaFlujo;
    revisionMetodologo?: ApproveRevisionMetodologoPayload;
    revisionDtm?: ApproveRevisionDtmPayload;
    financieroNotas?: ApproveFinancieroNotasPayload;
  } = { usuarioId, etapa };

  if (revisionMetodologo) {
    body.revisionMetodologo = revisionMetodologo;
  }
  if (revisionDtm) {
    body.revisionDtm = revisionDtm;
  }
  if (financieroNotas) {
    body.financieroNotas = financieroNotas;
  }

  return apiFetch<Aval>(`/avales/${id}/aprobar`, {
    method: "PATCH",
    body: JSON.stringify(body),
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
