export type EstadoReporte = "NUEVO" | "VISTO" | "RESUELTO";

export type RegistroError = {
  id: number;
  requestId: string;
  metodo: string | null;
  ruta: string | null;
  statusCode: number | null;
  errorType: string | null;
  titulo: string | null;
  detalle: string | null;
  userAgent: string | null;
  usuarioId: number | null;
  durationMs: number | null;
  contexto: Record<string, unknown> | null;
  createdAt: string;
};

export type ReporteProblema = {
  id: number;
  descripcion: string;
  requestId: string | null;
  url: string | null;
  userAgent: string | null;
  usuarioId: number | null;
  estado: EstadoReporte;
  createdAt: string;
  updatedAt: string;
};

export type CrearReportePayload = {
  descripcion: string;
  requestId?: string | null;
  url?: string;
  userAgent?: string;
};

export type RegistroErrorFiltros = {
  page?: number;
  limit?: number;
  requestId?: string;
  desde?: string;
  hasta?: string;
};

export type ReporteFiltros = {
  page?: number;
  limit?: number;
  requestId?: string;
  estado?: EstadoReporte | "";
  desde?: string;
  hasta?: string;
};
