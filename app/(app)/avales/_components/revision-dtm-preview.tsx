import type { Aval } from "@/types/aval";
import {
  formatEnumLabel,
  formatEventScheduleSentence,
  formatLocationWithProvince,
  formatTramiteDate,
  getResponsibleTrainerName,
} from "@/lib/utils/formatters";
import type {
  ReviewItem,
  ReviewStateItem,
} from "@/app/(app)/avales/_components/revision-metodologo-preview";

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
  firmanteNombre?: string;
  firmanteCargo?: string;
};

type Props = {
  aval: Aval;
  reviewItems: ReviewItem[];
  reviewState: Record<string, ReviewStateItem | undefined>;
  header: RevisionHeader;
  footer: RevisionFooter;
  useDefaultObservations?: boolean;
};

type DtmRow = {
  number: string;
  label: string;
  cumple: boolean;
  data: string;
};

function getReviewState(
  reviewState: Record<string, ReviewStateItem | undefined>,
  key: string,
) {
  return reviewState[key];
}

function joinBulletLines(items: string[]) {
  return items.filter(Boolean).join("\n");
}

function buildDtmRows(
  aval: Aval,
  reviewState: Record<string, ReviewStateItem | undefined>,
  header: RevisionHeader,
  footer: RevisionFooter,
): { topRows: DtmRow[]; annexRows: DtmRow[] } {
  const evento = aval.evento;
  const tecnico = aval.avalTecnico;
  const deporte = evento?.disciplina?.nombre ?? "SIN DEPORTE";
  const categoria = evento?.categoria?.nombre ?? "SIN CATEGORIA";
  const genero = formatEnumLabel(evento?.genero, " ", "POR DEFINIR");
  const entrenadorResponsable = getResponsibleTrainerName(aval);
  const eventoNombre = evento?.nombre?.toUpperCase() ?? "SIN EVENTO";
  const sedeFechas = `${formatLocationWithProvince(evento) || "POR DEFINIR"}${
    evento?.fechaInicio || evento?.mesProgramado
      ? `, ${formatEventScheduleSentence(evento)}`
      : ""
  }`.trim();

  const objetivos = tecnico?.objetivos?.length
    ? joinBulletLines(
        tecnico.objetivos
          .sort((a, b) => a.orden - b.orden)
          .map((item) => `• ${item.descripcion}`),
      )
    : "-";
  const criterios = tecnico?.criterios?.length
    ? joinBulletLines(
        tecnico.criterios
          .sort((a, b) => a.orden - b.orden)
          .map((item) => `• ${item.descripcion}`),
      )
    : "-";

  const totalEntrenadores =
    (evento?.numEntrenadoresHombres || 0) +
    (evento?.numEntrenadoresMujeres || 0);
  const totalAtletas =
    (evento?.numAtletasHombres || 0) + (evento?.numAtletasMujeres || 0);
  const conformacion = joinBulletLines([
    `• ${totalEntrenadores} oficiales`,
    `• ${totalAtletas} deportistas`,
  ]);

  const anexos =
    [
      aval.dtmUrl ? "Hoja Excel DTM" : "",
      aval.convocatoriaUrl ? "Convocatoria del evento" : "",
      aval.solicitudUrl ? "Aval tecnico / solicitud" : "",
    ]
      .filter(Boolean)
      .join(", ") || "-";

  const presupuestoItems = evento?.presupuesto ?? [];
  const requerimientos = presupuestoItems.length
    ? joinBulletLines(
        presupuestoItems.map(
          (item) =>
            `• ${item.item.nombre}: $${(Number.parseFloat(item.presupuesto ?? "0") || 0).toFixed(2)}`,
        ),
      )
    : "Sin requerimientos presupuestarios registrados.";

  const metodologoNombre =
    aval.revisionMetodologo?.firmanteNombre || "POR DEFINIR";

  const fechaPresentacion = formatTramiteDate(header.fechaRevision);
  const fechaTramite = header.observacionFechaTramite?.trim() || "-";

  const row = (
    number: string,
    label: string,
    key: string | null,
    data: string,
    fallbackCumple = true,
  ): DtmRow => {
    const state = key ? getReviewState(reviewState, key) : undefined;
    return {
      number,
      label,
      cumple: state?.cumple ?? fallbackCumple,
      data: state?.observacion?.trim() || data || "-",
    };
  };

  const topRows: DtmRow[] = [
    row("1", "Deporte", "DEPORTE", deporte),
    row("2", "Categorias", "CATEGORIA", categoria),
    row("3", "Genero", "GENERO", genero),
    row(
      "4",
      "Entrenador Responsable",
      "ENTRENADOR_RESPONSABLE",
      entrenadorResponsable,
    ),
    row("5", "Evento", "EVENTO", eventoNombre),
    row("6", "Sede, Fechas", "FECHAS", sedeFechas),
    row(
      "7",
      "Objetivos de participación",
      "OBJETIVOS_PARTICIPACION",
      objetivos,
    ),
    row("8", "Criterios de selección", "CRITERIOS_SELECCION", criterios),
    row(
      "9",
      "Conformación de la delegación",
      "CONFORMACION_DELEGACION",
      conformacion,
    ),
    row("10", "Anexos (Resultados de test, topes, etc.)", null, anexos, true),
    row("11", "Requerimientos DTM-FDPL", "REQUERIMIENTOS", requerimientos),
    row(
      "11A",
      "Revisión por parte del Metodólogo de su grupo de deporte",
      null,
      metodologoNombre,
      Boolean(aval.revisionMetodologo),
    ),
  ];

  const annexRows: DtmRow[] = [
    row(
      "12",
      "Detalla: Datos de los deportistas, estado de preparación, pronóstico, pruebas.",
      "DATOS_DEPORTISTAS",
      "Hoja Excel adjunta.",
    ),
    row(
      "13",
      "Afiliación",
      "AFILIACION",
      "Con fecha registrada en afiliación.",
    ),
    row(
      "14",
      "Certificación Médica",
      "CERTIFICACION_MEDICA",
      "Con certificación médica adjunta.",
    ),
    row(
      "15",
      "Certificación PDA",
      "CERT_MET_PDA",
      aval.pda ? "SI CONSTA ESTE EVENTO EN EL PDA" : "-",
    ),
    row(
      "16",
      "Aval técnico para competencia con presupuesto PDA",
      null,
      aval.pda ? "SI CONSTA ESTE EVENTO EN EL PDA" : "-",
      Boolean(aval.pda),
    ),
    row(
      "17",
      "Aval técnico para competencia con el apoyo de autogestión",
      null,
      "-",
      false,
    ),
    row(
      "18",
      "Fecha de presentación",
      null,
      fechaPresentacion,
      Boolean(header.fechaRevision),
    ),
    row(
      "19",
      "Fecha de tramite",
      null,
      fechaTramite,
      Boolean(header.observacionFechaTramite?.trim()),
    ),
  ];

  return { topRows, annexRows };
}

function renderDataCell(data: string) {
  const lines = data.split("\n").filter((line) => line.trim().length > 0);
  if (lines.length <= 1) return data || "-";

  return (
    <div className="space-y-0.5">
      {lines.map((line, index) => (
        <p key={`${line}-${index}`}>{line}</p>
      ))}
    </div>
  );
}

export type { ReviewItem, ReviewStateItem };

export default function RevisionDtmPreview({
  aval,
  reviewState,
  header,
  footer,
}: Props) {
  const dirigidoA = header.dirigidoA || "[NOMBRE DESTINATARIO]";
  const cargoDirigidoA = header.cargoDirigidoA || "[CARGO]";
  const descripcion =
    header.descripcionEncabezado.trim() || "Sin descripción de revisión.";
  const { topRows, annexRows } = buildDtmRows(
    aval,
    reviewState,
    header,
    footer,
  );

  return (
    <div className="bg-white p-5 xl:p-6 border border-slate-300 text-slate-900 space-y-3">
      <div className="space-y-0.5">
        <p className="text-[12px] uppercase font-semibold tracking-wide">
          Revision metodologica para otorgacion del aval tecnico
        </p>
      </div>

      <div className="text-[10px] leading-4">
        <p className="uppercase">{dirigidoA}</p>
        <p className="font-semibold uppercase">{cargoDirigidoA}</p>
      </div>

      <p className="text-[10px] leading-4">{descripcion}</p>

      <div className="border border-slate-400">
        <table className="w-full border-collapse text-[9px]">
          <thead>
            <tr className="bg-slate-200">
              <th className="border border-slate-400 px-2 py-1 text-left w-[38%]">
                PARAMETROS
              </th>
              <th className="border border-slate-400 px-2 py-1 text-center w-[7%]">
                SI
              </th>
              <th className="border border-slate-400 px-2 py-1 text-center w-[7%]">
                NO
              </th>
              <th className="border border-slate-400 px-2 py-1 text-left w-[42%]">
                DATOS INFORMATIVOS
              </th>
            </tr>
          </thead>
          <tbody>
            {topRows.map((item) => (
              <tr key={item.number}>
                <td className="border border-slate-400 px-2 py-0.5 align-top">
                  {item.label}
                </td>
                <td className="border border-slate-400 px-2 py-0.5 text-center align-top">
                  {item.cumple ? "X" : ""}
                </td>
                <td className="border border-slate-400 px-2 py-0.5 text-center align-top">
                  {item.cumple ? "" : "X"}
                </td>
                <td className="border border-slate-400 px-2 py-0.5 align-top whitespace-pre-line">
                  {renderDataCell(item.data)}
                </td>
              </tr>
            ))}
            <tr className="bg-slate-50">
              <td
                className="border border-slate-400 px-2 py-1 text-center font-semibold uppercase"
                colSpan={4}
              >
                Hoja Excel-Anexos
              </td>
            </tr>
            {annexRows.map((item) => (
              <tr key={item.number}>
                <td className="border border-slate-400 px-2 py-0.5 align-top">
                  {item.label}
                </td>
                <td className="border border-slate-400 px-2 py-0.5 text-center align-top">
                  {item.cumple ? "X" : ""}
                </td>
                <td className="border border-slate-400 px-2 py-0.5 text-center align-top">
                  {item.cumple ? "" : "X"}
                </td>
                <td className="border border-slate-400 px-2 py-0.5 align-top whitespace-pre-line">
                  {renderDataCell(item.data)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="text-[10px] leading-4 space-y-2">
        <div>
          <p className="font-semibold uppercase">Observaciones:</p>
          <p>{footer.observacionesFinales.trim() || "-"}</p>
        </div>
        <div className="pt-4">
          <p>Atentamente,</p>
          <div className="mt-6">
            <p className="text-slate-400">____________________________</p>
            <p className="font-semibold uppercase">
              {footer.firmanteNombre?.trim() || "-"}
            </p>
            <p className="uppercase">{footer.firmanteCargo?.trim() || "-"}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
