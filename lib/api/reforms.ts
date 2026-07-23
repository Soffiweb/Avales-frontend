import { apiFetch, ensureFreshAccessToken } from "@/lib/api/client";
import type { CatalogItem } from "@/types/catalog";
import type { EventoEstado } from "@/types/evento";
import type { TipoAval } from "@/types/aval";

export type TipoReforma = "DATOS_INFORMATIVOS" | "PRESUPUESTO" | "MIXTA";

export type ReformEventoItemPayload = {
  itemId: number;
  mes: number;
  presupuesto: number;
};

export type ReformFormaParticipacionChanges = {
  tipoAval: TipoAval;
  numEntrenadoresHombres: number;
  numEntrenadoresMujeres: number;
  numAtletasHombres: number;
  numAtletasMujeres: number;
  items?: ReformEventoItemPayload[];
};

export type ReformChangesDto = {
  codigo?: string;
  tipoParticipacion?: string;
  tipoEvento?: string;
  nombre?: string;
  lugar?: string;
  genero?: string;
  disciplinaId?: number;
  categoriaId?: number;
  provincia?: string;
  ciudad?: string;
  pais?: string;
  alcance?: string;
  mesProgramado?: number;
  fechaInicio?: string;
  fechaFin?: string;
  cargadoPorExcel?: boolean;
  formasParticipacion?: ReformFormaParticipacionChanges[];
};

export type ReformLineItemPayload = {
  itemId: number;
  mes: number;
  monto: number;
};

export type CreateReformEventoPayload = {
  eventoId: number;
  versionBaseId?: number;
  cambiosPropuestos: ReformChangesDto;
};

export type CreateReformMovimientoPayload = {
  eventoId: number;
  formaParticipacionId: number;
  items: ReformLineItemPayload[];
};

export type CreateReformPayload = {
  motivo: string;
  de?: string;
  para?: string;
  firmaCreadorNombre?: string;
  firmaCreadorCargo?: string;
  firmaRevisorNombre?: string;
  firmaRevisorCargo?: string;
  firmaAprobadorNombre?: string;
  firmaAprobadorCargo?: string;
  observacion?: string;
  mesEjecucion: number;
  eventos?: CreateReformEventoPayload[];
  eventosOrigen?: CreateReformMovimientoPayload[];
  eventosDestino?: CreateReformMovimientoPayload[];
};

export type AprobarReformPayload = {
  eventos?: Array<{ eventoId: number; cambios: ReformChangesDto }>;
};

export type ReformReadableField = {
  campo: string;
  etiqueta: string;
  valor?: unknown;
};

export type ReformReadableEventoItem = {
  itemId: number;
  itemNumero?: number | null;
  itemNombre?: string | null;
  mes: number;
  mesNombre: string;
  presupuesto: number;
};

export type ReformReadableChanges = {
  campos?: ReformReadableField[];
  eventoItems?: ReformReadableEventoItem[];
};

export type ReformFieldComparison = {
  campo: string;
  etiqueta: string;
  antes?: string | null;
  despues?: string | null;
};

export type ReformItemComparison = {
  itemId: number;
  itemNumero?: number | null;
  itemNombre?: string | null;
  mes: number;
  mesNombre: string;
  mesAntes?: number | null;
  mesNombreAntes?: string | null;
  antesPresupuesto?: number | null;
  despuesPresupuesto?: number | null;
  diferencia?: number | null;
  tipoCambio: "AGREGADO" | "ACTUALIZADO" | "ELIMINADO";
};

export type ReformFormaParticipacionComparison = {
  tipoAval?: string | null;
  antesNumAtletas?: number | null;
  despuesNumAtletas?: number | null;
  antesNumEntrenadores?: number | null;
  despuesNumEntrenadores?: number | null;
  antesPresupuestoTotal?: number | null;
  despuesPresupuestoTotal?: number | null;
  items?: ReformItemComparison[];
};

export type ReformComparison = {
  campos?: ReformFieldComparison[];
  eventoItems?: ReformItemComparison[];
  formasParticipacion?: ReformFormaParticipacionComparison[];
};

export type ReformAdjunto = {
  id: number;
  nombreOriginal: string;
  nombreArchivo: string;
  mimeType: string;
  tamanoBytes: number;
  url: string;
  createdAt: string;
};

export type ReformEventoResumen = {
  id: number;
  codigo?: string | null;
  nombre: string;
  estado?: EventoEstado | null;
  disciplina?: CatalogItem | null;
};

export type ReformEventoEntry = {
  id: number;
  eventoId: number;
  tipo: TipoReforma;
  versionBaseId?: number | null;
  versionAprobadaId?: number | null;
  cambiosPropuestos: Record<string, unknown>;
  cambiosPropuestosLegibles?: ReformReadableChanges;
  comparacion?: ReformComparison;
  evento?: ReformEventoResumen;
};

export type ReformMovimientoLinea = {
  itemId: number;
  mes: number;
  item?: { id: number; nombre: string; numero?: number | null } | null;
};

export type ReformOrigenEntry = {
  id: number;
  eventoId: number;
  formaParticipacionId: number;
  montoCortado: string;
  totalEventoAntes: string;
  totalEventoDespues?: string | null;
  evento?: ReformEventoResumen;
  items: Array<ReformMovimientoLinea & { montoCortado: string }>;
};

export type ReformDestinoEntry = {
  id: number;
  eventoId: number;
  formaParticipacionId: number;
  montoAsignado: string;
  totalEventoAntes: string;
  totalEventoDespues?: string | null;
  evento?: ReformEventoResumen;
  items: Array<ReformMovimientoLinea & { montoAsignado: string }>;
};

export type ReformResponse = {
  id: number;
  numeroReforma: string;
  estado: string;
  motivo: string;
  de?: string | null;
  para?: string | null;
  firmaCreadorNombre?: string | null;
  firmaCreadorCargo?: string | null;
  firmaRevisorNombre?: string | null;
  firmaRevisorCargo?: string | null;
  firmaAprobadorNombre?: string | null;
  firmaAprobadorCargo?: string | null;
  observacion?: string | null;
  mesEjecucion: number;
  eventos: ReformEventoEntry[];
  origenes: ReformOrigenEntry[];
  destinos: ReformDestinoEntry[];
  solicitante?: {
    id: number;
    nombre?: string | null;
    apellido?: string | null;
    email?: string | null;
  } | null;
  adjuntos?: ReformAdjunto[];
  createdAt?: string;
  reviewedAt?: string | null;
};

export type ListReformsOptions = {
  tipo?: TipoReforma;
};

export type FuentePresupuestoReforma = "FONDOS_PUBLICOS" | "AUTOGESTION";

export type EventoDisponibleReformaMulti = {
  id: number;
  codigo: string;
  nombre: string;
  disciplina?: CatalogItem | null;
  formaParticipacionId: number;
  referencia?: string | null;
  presupuestoTotal: string;
  items?: Array<{
    itemId: number;
    nombre: string;
    numero: number;
    mes: number;
    presupuesto: string;
    montoComprometido: string;
    montoEjecutado: string;
    saldoDisponible: string;
  }>;
};

/** Un evento con sus formas de participación elegibles agrupadas (dedupe de EventoDisponibleReformaMulti por eventoId). */
export type EventoDisponibleAgrupado = {
  id: number;
  codigo: string;
  nombre: string;
  disciplina?: CatalogItem | null;
  formas: Array<{
    formaParticipacionId: number;
    referencia?: string | null;
    presupuestoTotal: string;
    items?: EventoDisponibleReformaMulti["items"];
  }>;
};

export type ListEventosDisponiblesReformaMultiQuery = {
  fuente: FuentePresupuestoReforma;
  search?: string;
  disciplinaId?: number;
};

function getFilenameFromContentDisposition(
  contentDisposition: string | null,
): string | null {
  if (!contentDisposition) return null;

  const utf8Match = contentDisposition.match(/filename\*\s*=\s*UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1].replace(/(^"|"$)/g, ""));
    } catch {
      return utf8Match[1].replace(/(^"|"$)/g, "");
    }
  }

  const filenameMatch = contentDisposition.match(/filename\s*=\s*([^;]+)/i);
  if (!filenameMatch?.[1]) return null;

  return filenameMatch[1].trim().replace(/^"|"$/g, "");
}

function triggerBrowserDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function extractBlobErrorMessage(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const payload = await response.json().catch(() => null);
    if (payload && typeof payload === "object") {
      const message =
        "message" in payload && typeof payload.message === "string"
          ? payload.message
          : "detail" in payload && typeof payload.detail === "string"
            ? payload.detail
            : null;
      if (message) return message;
    }
  }

  if (contentType.startsWith("text/")) {
    const text = await response.text().catch(() => "");
    if (text.trim()) return text.trim();
  }

  return `Error (${response.status})`;
}

export async function createReform(payload: CreateReformPayload) {
  return apiFetch<ReformResponse>("/reforms", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function uploadReformAdjuntos(id: number, archivos: File[]) {
  const formData = new FormData();
  archivos.forEach((archivo) => {
    formData.append("archivos", archivo);
  });

  return apiFetch<ReformResponse>(`/reforms/${id}/adjuntos`, {
    method: "PATCH",
    body: formData,
  });
}

export async function downloadReformExcel(id: number) {
  const accessToken = await ensureFreshAccessToken();
  const headers = new Headers();

  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  const response = await fetch(`/api/v1/reforms/${id}/excel`, {
    method: "GET",
    credentials: "include",
    headers,
  });

  if (!response.ok) {
    throw new Error(await extractBlobErrorMessage(response));
  }

  const blob = await response.blob();
  const filename =
    getFilenameFromContentDisposition(
      response.headers.get("content-disposition"),
    ) ?? `reforma-${id}.xlsx`;

  triggerBrowserDownload(blob, filename);
}

export async function aprobarReform(
  id: number,
  payload?: AprobarReformPayload,
) {
  return apiFetch<ReformResponse>(`/reforms/${id}/aprobar`, {
    method: "PATCH",
    body: payload ? JSON.stringify(payload) : undefined,
  });
}

export async function rechazarReform(
  id: number,
  observacion: string,
) {
  return apiFetch<ReformResponse>(`/reforms/${id}/rechazar`, {
    method: "PATCH",
    body: JSON.stringify({ observacion }),
  });
}

export async function listReformsByEvento(eventoId: number, estado?: string) {
  const params = new URLSearchParams();
  params.set("eventoId", String(eventoId));
  if (estado) params.set("estado", estado);

  return apiFetch<ReformResponse[]>(`/reforms?${params.toString()}`, {
    method: "GET",
  });
}

export async function listReforms(options: ListReformsOptions = {}) {
  const params = new URLSearchParams();
  if (options.tipo) params.set("tipo", options.tipo);

  const query = params.toString();
  const url = query ? `/reforms?${query}` : "/reforms";

  return apiFetch<ReformResponse[]>(url, {
    method: "GET",
  });
}

export async function getEventosDisponiblesReformaMulti(
  query: ListEventosDisponiblesReformaMultiQuery,
) {
  const params = new URLSearchParams();
  params.set("fuente", query.fuente);
  if (query.search) params.set("search", query.search);
  if (query.disciplinaId !== undefined) {
    params.set("disciplinaId", String(query.disciplinaId));
  }

  return apiFetch<EventoDisponibleReformaMulti[]>(
    `/reforms/eventos-disponibles?${params.toString()}`,
    { method: "GET" },
  );
}

/**
 * Dedupe de /reforms/eventos-disponibles (una fila por evento+forma) a
 * una fila por evento, con sus formas elegibles agrupadas. La fuente ya viene
 * filtrada por tipoAval y excluye formas avaladas o bloqueadas por otra
 * reforma pendiente (ver reforms.service.ts).
 */
export function groupEventosDisponiblesPorEvento(
  eventos: EventoDisponibleReformaMulti[],
): EventoDisponibleAgrupado[] {
  const map = new Map<number, EventoDisponibleAgrupado>();

  eventos.forEach((evento) => {
    const forma = {
      formaParticipacionId: evento.formaParticipacionId,
      referencia: evento.referencia,
      presupuestoTotal: evento.presupuestoTotal,
      items: evento.items,
    };

    const existing = map.get(evento.id);
    if (existing) {
      existing.formas.push(forma);
      return;
    }

    map.set(evento.id, {
      id: evento.id,
      codigo: evento.codigo,
      nombre: evento.nombre,
      disciplina: evento.disciplina,
      formas: [forma],
    });
  });

  return Array.from(map.values());
}

export const TIPO_REFORMA_LABELS: Record<TipoReforma, string> = {
  DATOS_INFORMATIVOS: "Datos informativos",
  PRESUPUESTO: "Presupuesto",
  MIXTA: "Mixta",
};

export const TIPO_REFORMA_OPTIONS: { value: TipoReforma; label: string }[] = [
  { value: "DATOS_INFORMATIVOS", label: TIPO_REFORMA_LABELS.DATOS_INFORMATIVOS },
  { value: "PRESUPUESTO", label: TIPO_REFORMA_LABELS.PRESUPUESTO },
  { value: "MIXTA", label: TIPO_REFORMA_LABELS.MIXTA },
];

export const MES_NOMBRES: Record<number, string> = {
  1: "Enero",
  2: "Febrero",
  3: "Marzo",
  4: "Abril",
  5: "Mayo",
  6: "Junio",
  7: "Julio",
  8: "Agosto",
  9: "Septiembre",
  10: "Octubre",
  11: "Noviembre",
  12: "Diciembre",
};

export const MES_OPCIONES = Array.from({ length: 12 }, (_, i) => ({
  value: i + 1,
  label: MES_NOMBRES[i + 1],
}));

export async function getReform(id: number) {
  return apiFetch<ReformResponse>(`/reforms/${id}`, {
    method: "GET",
  });
}

export const REFORM_ERROR_CODE_MESSAGES: Record<string, string> = {
  REFORMA_SUM_MISMATCH:
    "La suma de montos de origen no coincide con la de destino.",
  REFORMA_MIXED_TIPO_AVAL:
    "Todos los movimientos de presupuesto deben usar el mismo tipo de aval.",
  REFORMA_ORIGEN_DESTINO_DUPLICADO:
    "Una misma forma de participación no puede ser origen y destino a la vez.",
  REFORMA_EVENTO_BLOQUEADO:
    "Uno o más eventos ya tienen otra reforma pendiente.",
  REFORMA_SIN_CAMBIOS:
    "Debes agregar al menos un evento con cambios.",
};

export function getReformErrorMessage(
  err: unknown,
  fallback = "Ocurrió un error inesperado.",
): string {
  if (err instanceof Error) {
    const code = (err as Error & { problem?: { errorCode?: string } }).problem
      ?.errorCode;
    if (code && REFORM_ERROR_CODE_MESSAGES[code]) {
      return REFORM_ERROR_CODE_MESSAGES[code];
    }
    return err.message || fallback;
  }
  return fallback;
}
