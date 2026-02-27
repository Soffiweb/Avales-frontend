import RevisionMetodologoPreview, {
  type ReviewItem,
  type ReviewStateItem,
} from "@/app/(app)/avales/_components/revision-metodologo-preview";
import type { Aval } from "@/types/aval";

type RevisionHeader = {
  numeroRevision: string;
  dirigidoA: string;
  cargoDirigidoA: string;
  descripcionEncabezado: string;
  fechaRevision: string;
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
};

export type { ReviewItem, ReviewStateItem };

export default function RevisionDtmPreview(props: Props) {
  return <RevisionMetodologoPreview {...props} />;
}
