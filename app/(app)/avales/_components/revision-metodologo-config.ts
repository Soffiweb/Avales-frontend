import type { RevisionMetodologoItem } from "@/lib/api/avales";
import type {
  ReviewItem,
  ReviewStateItem,
} from "@/app/(app)/avales/_components/revision-metodologo-preview";

type ReviewSection = ReviewItem["section"];

const REVIEW_ITEM_ORDER = [
  "DEPORTE",
  "CATEGORIA",
  "GENERO",
  "ENTRENADOR_RESPONSABLE",
  "EVENTO",
  "LUGAR",
  "OBJETIVOS_PARTICIPACION",
  "CRITERIOS_SELECCION",
  "CONFORMACION_DELEGACION",
  "REQUERIMIENTOS",
  "FIRMAS_RESPONSABILIDAD_AVAL",
  "DATOS_DEPORTISTAS",
  "AFILIACION",
  "CERTIFICACION_MEDICA",
  "AVAL_TECNICO",
  "CERT_COMPRAS_PUBLICAS",
  "FECHA_INGRESO_DTM",
  "FECHA_RECIBIDO_METODOLOGO",
];

const REVIEW_ITEM_CONFIG: Record<
  string,
  { label: string; section: ReviewSection; type: "boolean" | "fecha" }
> = {
  DEPORTE: { label: "Deporte", section: "PARAMETROS", type: "boolean" },
  CATEGORIA: {
    label: "Categorias",
    section: "PARAMETROS",
    type: "boolean",
  },
  GENERO: { label: "Genero", section: "PARAMETROS", type: "boolean" },
  ENTRENADOR_RESPONSABLE: {
    label: "Entrenador Responsable",
    section: "PARAMETROS",
    type: "boolean",
  },
  EVENTO: { label: "Evento", section: "PARAMETROS", type: "boolean" },
  LUGAR: {
    label: "Sede, Fechas",
    section: "PARAMETROS",
    type: "boolean",
  },
  OBJETIVOS_PARTICIPACION: {
    label: "Objetivos de participacion",
    section: "PARAMETROS",
    type: "boolean",
  },
  CRITERIOS_SELECCION: {
    label: "Criterios de Seleccion",
    section: "PARAMETROS",
    type: "boolean",
  },
  CONFORMACION_DELEGACION: {
    label: "Conformacion de la delegacion",
    section: "PARAMETROS",
    type: "boolean",
  },
  REQUERIMIENTOS: {
    label: "Anexos (Resultados de test, topes, etc.)",
    section: "PARAMETROS",
    type: "boolean",
  },
  FIRMAS_RESPONSABILIDAD_AVAL: {
    label: "Revision por parte del Metodologo de su grupo de deporte",
    section: "PARAMETROS",
    type: "boolean",
  },
  DATOS_DEPORTISTAS: {
    label: "Detalle: Datos de los Deportistas, estado de preparacion, pronostico, prueba.",
    section: "HOJA_EXCEL_ANEXOS",
    type: "boolean",
  },
  AFILIACION: {
    label: "Afiliacion",
    section: "HOJA_EXCEL_ANEXOS",
    type: "boolean",
  },
  CERTIFICACION_MEDICA: {
    label: "Certificacion Medica",
    section: "HOJA_EXCEL_ANEXOS",
    type: "boolean",
  },
  AVAL_TECNICO: {
    label: "Aval Tecnico para competencia con presupuesto PDA 2026.",
    section: "HOJA_EXCEL_ANEXOS",
    type: "boolean",
  },
  CERT_COMPRAS_PUBLICAS: {
    label: "Aval Tecnico para Competencia con el apoyo de autogestion Comite de Funcionamiento.",
    section: "HOJA_EXCEL_ANEXOS",
    type: "boolean",
  },
  FECHA_INGRESO_DTM: {
    label: "Fecha de presentacion",
    section: "FECHAS",
    type: "fecha",
  },
  FECHA_RECIBIDO_METODOLOGO: {
    label: "Fecha de tramite",
    section: "FECHAS",
    type: "fecha",
  },
};

export const DEFAULT_REVIEW_ITEMS: ReviewItem[] = REVIEW_ITEM_ORDER.map(
  (code, index) => {
    const config = REVIEW_ITEM_CONFIG[code];
    return {
      key: code,
      label: config?.label ?? code,
      section: config?.section ?? "PARAMETROS",
      type: config?.type ?? "boolean",
      order: index + 1,
      defaultCumple: true,
    };
  },
);

export function buildInitialReviewState(items: ReviewItem[]) {
  void items;
  return {} as Record<string, ReviewStateItem>;
}

export function normalizeReviewItems(
  _items: RevisionMetodologoItem[] | string[],
) {
  return REVIEW_ITEM_ORDER.map((code, index) => {
    const config = REVIEW_ITEM_CONFIG[code];
    return {
      key: code,
      label: config?.label ?? code,
      section: config?.section ?? "PARAMETROS",
      type: config?.type ?? "boolean",
      order: index + 1,
      defaultCumple: true,
    } satisfies ReviewItem;
  });
}

type ApiReviewItem = {
  key?: string | null;
  codigo?: string | null;
  label?: string | null;
  descripcion?: string | null;
  cumple?: boolean | null;
  observacion?: string | null;
};

export function mergeReviewStateFromApi(
  reviewItems: ReviewItem[],
  apiItems: ApiReviewItem[] | null | undefined,
) {
  const next = buildInitialReviewState(reviewItems);
  if (!apiItems || apiItems.length === 0) return next;

  const keyMap = new Map(reviewItems.map((item) => [item.key, item.key]));
  const labelMap = new Map(
    reviewItems.map((item) => [item.label.trim().toLowerCase(), item.key]),
  );

  apiItems.forEach((item, index) => {
    const rawKey = item?.key?.trim() || item?.codigo?.trim() || "";
    const rawLabel = item?.label?.trim() || item?.descripcion?.trim() || "";
    const targetKey =
      (rawKey && keyMap.get(rawKey)) ||
      (rawLabel && labelMap.get(rawLabel.toLowerCase())) ||
      (reviewItems[index]?.key ?? "");
    if (!targetKey) return;

    next[targetKey] = {
      cumple: item?.cumple ?? next[targetKey]?.cumple ?? true,
      observacion: item?.observacion?.trim() ?? "",
    };
  });

  return next;
}
