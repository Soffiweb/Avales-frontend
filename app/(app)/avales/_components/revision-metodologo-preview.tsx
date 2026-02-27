import { Fragment } from "react";

import type { Aval } from "@/types/aval";
import { formatDate, formatDateRange, formatLocationWithProvince } from "@/lib/utils/formatters";

export type ReviewItem = {
  key: string;
  label: string;
  section: "CHECKLIST" | "DATOS_INFORMATIVOS" | "HOJAS_EXCEL";
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

const SECTION_LABELS: Record<ReviewItem["section"], string> = {
  CHECKLIST: "CHECKLIST",
  DATOS_INFORMATIVOS: "DATOS INFORMATIVOS",
  HOJAS_EXCEL: "HOJAS DE EXCEL",
};

function getEntrenadorResponsableNombre(aval: Aval) {
  const sorted = [...(aval.entrenadores ?? [])].sort(
    (a, b) => Number(Boolean(b.esPrincipal)) - Number(Boolean(a.esPrincipal)),
  );
  const first = sorted[0] as
    | (typeof sorted)[number] & {
        usuario?: { nombre?: string; apellido?: string };
        entrenador?: { nombre?: string; apellido?: string };
        nombre?: string;
        apellido?: string;
      }
    | undefined;

  if (!first) return "POR DEFINIR";

  return (
    [
      first.entrenador?.nombre ?? first.usuario?.nombre ?? first.nombre,
      first.entrenador?.apellido ?? first.usuario?.apellido ?? first.apellido,
    ]
      .filter(Boolean)
      .join(" ")
      .trim() || "POR DEFINIR"
  );
}

function formatGenero(value?: string | null) {
  if (!value) return "POR DEFINIR";
  return value.replaceAll("_", " ");
}

function buildDefaultObservations(aval: Aval) {
  const evento = aval.evento;
  const disciplina = evento?.disciplina?.nombre ?? "SIN DISCIPLINA";
  const categoria = evento?.categoria?.nombre ?? "SIN CATEGORIA";
  const genero = formatGenero(evento?.genero);
  const lugar = formatLocationWithProvince(evento) || "POR DEFINIR";
  const fechas = formatDateRange(evento?.fechaInicio, evento?.fechaFin)
    .toUpperCase()
    .trim();
  const entrenadorResponsable = getEntrenadorResponsableNombre(aval);
  const objetivos = aval.avalTecnico?.objetivos
    ?.map((item) => item.descripcion)
    .filter(Boolean)
    .join("; ");
  const criterios = aval.avalTecnico?.criterios
    ?.map((item) => item.descripcion)
    .filter(Boolean)
    .join("; ");
  const totalEntrenadores =
    (evento?.numEntrenadoresHombres || 0) + (evento?.numEntrenadoresMujeres || 0);
  const totalAtletas =
    (evento?.numAtletasHombres || 0) + (evento?.numAtletasMujeres || 0);
  const totalDelegacion = totalEntrenadores + totalAtletas;
  const conformacion = `Entrenadores: ${totalEntrenadores}. Atletas: ${totalAtletas}. Total: ${totalDelegacion}.`;
  const presupuestoItems = evento?.presupuesto ?? [];
  const requerimientos = presupuestoItems.length
    ? `Items presupuestarios: ${presupuestoItems.length}.`
    : "Sin items presupuestarios.";

  return {
    CERT_ESC_INI: "",
    CERT_MET_PDA: "",
    CERT_COMPRAS_PUBLICAS: "",
    FECHA_INGRESO_DTM: "",
    FECHA_RECIBIDO_METODOLOGO: "",
    NUM_AVAL_TECNICO: aval.aval ?? String(aval.id),
    DEPORTE: disciplina,
    CATEGORIA: categoria,
    GENERO: genero,
    ENTRENADOR_RESPONSABLE: entrenadorResponsable,
    EVENTO: evento?.nombre ?? "SIN EVENTO",
    LUGAR: lugar,
    FECHAS: fechas,
    OBJETIVOS_PARTICIPACION: objetivos || "-",
    CRITERIOS_SELECCION: criterios || "-",
    CONFORMACION_DELEGACION: conformacion,
    REQUERIMIENTOS: requerimientos,
    FIRMAS_RESPONSABILIDAD_AVAL: "",
    DATOS_DEPORTISTAS: "",
    AFILIACION: "",
    CERTIFICACION_MEDICA: "",
    AVAL_TECNICO: "",
  };
}

function buildDefaultDescripcion(aval: Aval, header: RevisionHeader) {
  if (header.descripcionEncabezado.trim()) return header.descripcionEncabezado;
  const evento = aval.evento;
  const eventoNombre = (evento?.nombre ?? "EL EVENTO").toUpperCase();
  const lugar = formatLocationWithProvince(evento) || "LUGAR POR DEFINIR";
  const fechas = formatDateRange(evento?.fechaInicio, evento?.fechaFin);
  const entrenadorResponsable = getEntrenadorResponsableNombre(aval);
  const disciplina = evento?.disciplina?.nombre ?? "LA DISCIPLINA";

  return `En base a la presentacion del Aval Tecnico de PARTICIPACION en ${eventoNombre}, por el entrenador ${entrenadorResponsable} de ${disciplina}, evento a desarrollarse en ${lugar}, ${fechas}. Luego de la revision se describe brevemente la tabla de cumplimiento y no cumplimiento de los items revisados.`;
}

export default function RevisionMetodologoPreview({
  aval,
  reviewItems,
  reviewState,
  header,
  footer,
  useDefaultObservations = true,
}: Props) {
  const defaults = buildDefaultObservations(aval);
  const descripcion = buildDefaultDescripcion(aval, header);
  const dirigidoA = header.dirigidoA || "[NOMBRE DESTINATARIO]";
  const cargoDirigidoA = header.cargoDirigidoA || "[CARGO]";
  const fechaRevision = header.fechaRevision ? formatDate(header.fechaRevision) : "-";
  const numeroRevision = header.numeroRevision?.trim() || "014";

  const sortedItems = [...reviewItems].sort((a, b) => a.order - b.order);

  return (
    <div className="bg-white p-5 xl:p-6 border border-slate-300 text-slate-900 space-y-3">
      <div className="space-y-0.5">
        <p className="text-[12px] uppercase font-semibold tracking-wide">
          Informe de revision del aval tecnico LG-METODOLOGA DTM-FDPL-2024-AI-R{String.fromCharCode(176)}{" "}
          {numeroRevision}
        </p>
        <p className="text-[10px] uppercase">N{String.fromCharCode(176)} {numeroRevision}</p>
      </div>

      <div className="text-[10px] leading-4">
        <p className="uppercase">{dirigidoA}</p>
        <p className="font-semibold uppercase">{cargoDirigidoA}</p>
      </div>

      <div className="text-[10px] leading-4">
        <p className="font-semibold uppercase">Fecha: {fechaRevision}</p>
      </div>

      <p className="text-[10px] leading-4">{descripcion}</p>

      <div className="border border-slate-400">
        <table className="w-full border-collapse text-[9px]">
          <thead>
            <tr className="bg-slate-200">
              <th className="border border-slate-400 px-2 py-1 text-left w-[52%]">
                PARAMETROS
              </th>
              <th className="border border-slate-400 px-2 py-1 text-center w-10">
                SI
              </th>
              <th className="border border-slate-400 px-2 py-1 text-center w-10">
                NO
              </th>
              <th className="border border-slate-400 px-2 py-1 text-left w-[48%]">
                OBSERVACIONES
              </th>
            </tr>
          </thead>
          <tbody>
            {(["CHECKLIST", "DATOS_INFORMATIVOS", "HOJAS_EXCEL"] as const).map(
              (section) => (
                <Fragment key={section}>
                {section !== "CHECKLIST" ? (
                  <tr className="bg-slate-50">
                    <td
                      className="border border-slate-400 px-2 py-1 font-semibold uppercase"
                      colSpan={4}
                    >
                      {SECTION_LABELS[section]}
                    </td>
                  </tr>
                ) : null}
                {sortedItems
                  .filter((item) => item.section === section)
                  .map((item) => {
                    const state = reviewState[item.key];
                    const cumple = state?.cumple ?? item.defaultCumple;
                    const observacion = useDefaultObservations
                      ? state?.observacion?.trim() ||
                        (defaults[item.key as keyof typeof defaults] ?? "")
                      : state?.observacion?.trim() ?? "";

                    return (
                      <tr key={item.key}>
                        <td className="border border-slate-400 px-2 py-0.5 align-top">
                          {item.order}. {item.label}
                        </td>
                        <td className="border border-slate-400 px-2 py-0.5 text-center align-top">
                          {cumple ? "X" : ""}
                        </td>
                        <td className="border border-slate-400 px-2 py-0.5 text-center align-top">
                          {!cumple ? "X" : ""}
                        </td>
                        <td className="border border-slate-400 px-2 py-0.5 align-top">
                          {observacion}
                        </td>
                      </tr>
                    );
                  })}
                </Fragment>
              ),
            )}
          </tbody>
        </table>
      </div>

      <div className="text-[10px] leading-4 space-y-2">
        <div>
          <p className="font-semibold uppercase">Observaciones:</p>
          <p>{footer.observacionesFinales.trim() || "-"}</p>
        </div>
        <div className="pt-4">
          <p className="font-semibold uppercase">{footer.firmanteNombre || "-"}</p>
          <p className="uppercase">{footer.firmanteCargo || "-"}</p>
        </div>
      </div>
    </div>
  );
}
