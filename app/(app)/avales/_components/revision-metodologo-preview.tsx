import type { Aval } from "@/types/aval";
import RevisionDtmPreview from "@/app/(app)/avales/_components/revision-dtm-preview";

export type ReviewItem = {
  key: string;
  label: string;
  section: "PARAMETROS" | "HOJA_EXCEL_ANEXOS" | "FECHAS";
  type: "boolean" | "fecha";
  order: number;
  defaultCumple: boolean;
};

export type ReviewStateItem = {
  cumple: boolean;
  observacion: string;
};

type RevisionHeader = {
  numeroRevision: string;
  dirigidoA: string;
  cargoDirigidoA: string;
  descripcionEncabezado: string;
  fechaRevision: string;
  observacionFechaTramite?: string;
};

type RevisionFooter = {
  observacionesFinales: string;
  firmanteNombre: string;
  firmanteCargo: string;
};

type Props = {
  aval: Aval;
  reviewItems: ReviewItem[];
  reviewState: Record<string, ReviewStateItem | undefined>;
  header: RevisionHeader;
  footer: RevisionFooter;
  useDefaultObservations?: boolean;
  detailColumnLabel?: string;
};

export default function RevisionMetodologoPreview({
  aval,
  reviewItems,
  reviewState,
  header,
  footer,
  detailColumnLabel = "DATOS INFORMATIVOS",
}: Props) {
  return (
    <RevisionDtmPreview
      aval={aval}
      reviewItems={reviewItems}
      reviewState={reviewState}
      header={header}
      footer={footer}
      title="Informe de revision del aval tecnico"
      detailColumnLabel={detailColumnLabel}
      footerLabel="Datos informativos"
    />
  );
}
