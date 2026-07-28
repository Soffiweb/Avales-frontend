import { ensureFreshAccessToken } from "@/lib/api/client";
import { getAccessToken } from "@/lib/auth/tokens";

const API_BASE = "/api/v1";

// Nota: `controlPrevio` fue removido — el módulo solo emite un placeholder
// con el número de revisión (página casi en blanco). Reactivar cuando exista
// una plantilla real con contenido.
export type ComposableDocumentKey =
  | "avalTecnico"
  | "comprasPublicas"
  | "revisionMetodologo"
  | "revisionDtm"
  | "certificacionPresupuestaria"
  | "escuelaIniciacion"
  | "convocatoria"
  | "certificadoMedico"
  | "pronosticoDeportistas"
  | "hojaRuta";

export const DOCUMENT_LABELS: Record<ComposableDocumentKey, string> = {
  avalTecnico: "Aval técnico",
  comprasPublicas: "Certificado compras públicas",
  revisionMetodologo: "Revisión metodólogo",
  revisionDtm: "Revisión DTM",
  certificacionPresupuestaria: "Certificación presupuestaria",
  escuelaIniciacion: "Escuela de iniciación",
  convocatoria: "Convocatoria",
  certificadoMedico: "Certificado médico",
  pronosticoDeportistas: "Pronóstico deportistas",
  hojaRuta: "Hoja de ruta",
};

/**
 * Mapea cada documento composable al endpoint GET que genera su preview
 * on-the-fly (sin cambiar estado). null = no hay preview directo.
 */
export const PREVIEW_ENDPOINTS: Record<
  ComposableDocumentKey,
  string | null
> = {
  avalTecnico: "/aval-tecnico-pdf",
  comprasPublicas: "/compras-publicas-pdf",
  revisionMetodologo: "/revision-metodologo-pdf",
  revisionDtm: "/revision-dtm-pdf",
  certificacionPresupuestaria: "/financiero-pdf",
  escuelaIniciacion: "/escuela-iniciacion-pdf",
  convocatoria: null,
  certificadoMedico: null,
  pronosticoDeportistas: null,
  hojaRuta: "/hoja-ruta-pdf",
};

async function buildAuthHeader(): Promise<Record<string, string>> {
  await ensureFreshAccessToken();
  const token = getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * Abre el PDF preview del paso indicado en una nueva pestaña.
 *
 * IMPORTANTE: la pestaña se abre **antes** del await del fetch. Los
 * browsers bloquean los `window.open` que se llaman después de un await
 * porque pierden el contexto del user gesture original.
 */
export async function openAvalPdfPreview(
  avalId: number,
  key: ComposableDocumentKey,
): Promise<void> {
  const endpoint = PREVIEW_ENDPOINTS[key];
  if (!endpoint) {
    throw new Error(
      `No hay endpoint de preview directo para "${DOCUMENT_LABELS[key]}".`,
    );
  }

  // Abrimos la pestaña AHORA — adentro del click del usuario.
  const newTab = window.open("about:blank", "_blank");
  if (!newTab) {
    throw new Error(
      "Tu navegador bloqueó la pestaña nueva. Habilitá popups para este sitio y volvé a intentar.",
    );
  }

  try {
    const url = `${API_BASE}/avales/${avalId}${endpoint}`;
    const headers = await buildAuthHeader();
    const res = await fetch(url, { headers });
    if (!res.ok) {
      throw new Error(`No se pudo cargar el PDF (HTTP ${res.status})`);
    }
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    newTab.location.href = blobUrl;
  } catch (err) {
    newTab.close();
    throw err;
  }
}

/**
 * Descarga el PDF (sin firmar) de un paso composable como `ArrayBuffer`,
 * listo para renderizar con pdf.js. No usa `apiFetch` porque ese cliente
 * parsea la respuesta como JSON; aquí necesitamos los bytes crudos.
 */
export async function fetchAvalPdfBuffer(
  avalId: number,
  key: ComposableDocumentKey,
): Promise<ArrayBuffer> {
  const endpoint = PREVIEW_ENDPOINTS[key];
  if (!endpoint) {
    throw new Error(
      `No hay endpoint de preview directo para "${DOCUMENT_LABELS[key]}".`,
    );
  }

  const url = `${API_BASE}/avales/${avalId}${endpoint}`;
  const headers = await buildAuthHeader();
  const res = await fetch(url, { headers });
  if (!res.ok) {
    throw new Error(`No se pudo cargar el PDF (HTTP ${res.status})`);
  }
  return res.arrayBuffer();
}

/**
 * Pide al backend componer un PDF con los documentos seleccionados y
 * dispara la descarga al cliente.
 */
export async function downloadComposedPdf(
  avalId: number,
  documentos: ComposableDocumentKey[],
): Promise<void> {
  const url = `${API_BASE}/avales/${avalId}/compose-pdf`;
  const authHeaders = await buildAuthHeader();
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders,
    },
    body: JSON.stringify({ documentos }),
  });
  if (!res.ok) {
    throw new Error(`No se pudo componer el PDF (HTTP ${res.status})`);
  }
  const blob = await res.blob();
  const blobUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = blobUrl;
  link.download = `aval-${avalId}-compuesto.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(blobUrl);
}
