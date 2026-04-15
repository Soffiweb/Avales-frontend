import { apiFetch } from "@/lib/api/client";
import type {
  Aval,
  AvalListResponse,
  CreateAvalPayload,
  Estado,
  EtapaFlujo,
  Historial,
} from "@/types/aval";

export type ListAvalesOptions = {
  page?: number;
  limit?: number;
  estado?: Estado;
  etapa?: EtapaFlujo;
  eventoId?: number;
  search?: string;
};

export async function listAvales(options: ListAvalesOptions = {}) {
  const params = new URLSearchParams();

  if (options.page) params.set("page", String(options.page));
  if (options.limit) params.set("limit", String(options.limit));
  if (options.estado) params.set("estado", options.estado);
  if (options.etapa) params.set("etapa", options.etapa);
  if (options.eventoId) params.set("eventoId", String(options.eventoId));
  if (options.search) params.set("search", options.search);

  const qs = params.toString();
  const url = qs ? `/avales?${qs}` : "/avales";

  return apiFetch<AvalListResponse>(url, { method: "GET" });
}

export async function getAval(id: number) {
  return apiFetch<Aval>(`/avales/${id}`, { method: "GET" });
}

export async function getAvalesByEvento(eventoId: number) {
  return apiFetch<Aval[]>(`/avales/evento/${eventoId}`, { method: "GET" });
}

export async function getAvalHistorial(id: number) {
  return apiFetch<Historial[]>(`/avales/${id}/historial`, { method: "GET" });
}

export async function uploadConvocatoria(
  eventoId: number,
  convocatoria: File,
  certificadoMedico: File,
) {
  console.log("uploadConvocatoria llamada:", {
    eventoId,
    convocatoria: {
      fileName: convocatoria.name,
      fileSize: convocatoria.size,
      fileType: convocatoria.type,
    },
    certificadoMedico: {
      fileName: certificadoMedico.name,
      fileSize: certificadoMedico.size,
      fileType: certificadoMedico.type,
    },
  });
  const formData = new FormData();
  formData.append("eventoId", String(eventoId));
  formData.append("convocatoria", convocatoria);
  formData.append("certificadoMedico", certificadoMedico);

  const response = await apiFetch<Aval>("/avales/convocatoria", {
    method: "POST",
    body: formData,
  });

  console.log("uploadConvocatoria respuesta raw:", response);
  return response;
}

export async function createAval(payload: CreateAvalPayload) {
  return apiFetch<Aval>("/avales", {
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

export type CreatePdaItemPayload = {
  itemId: number;
  presupuesto: number;
};

export type CreatePdaPayload = {
  descripcion: string;
  numeroPda?: string;
  numeroAval?: string;
  codigoActividad?: string;
  nombreFirmante?: string;
  cargoFirmante?: string;
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
