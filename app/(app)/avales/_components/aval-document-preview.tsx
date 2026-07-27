import type { ReactNode } from "react";
import type { Aval, PropositoDto } from "@/types/aval";
import {
  formatCurrencyFromString,
  formatDateDMY,
  formatDateWithOptions,
  formatEventScheduleDocumentLabel,
  formatGenero,
  getCalendarDateParts,
  formatLocationWithProvince,
  formatTimeCompact,
  formatTransport,
} from "@/lib/utils/formatters";
import { formatCategoryLabel } from "@/lib/utils/categories";
import {
  getAvalDelegationSummary,
  getAvalPresupuestoItems,
} from "@/lib/utils/aval-collections";
import {
  getPronosticoProfile,
  getPropositos,
  type PronosticoProfile,
} from "@/lib/utils/aval-pronostico";

type FormData = {
  deportistas: Array<{
    id: number;
    deportistaExternoId?: string;
    nombre: string;
    apellido?: string;
    nombres?: string;
    apellidos?: string;
    cedula?: string;
    fechaNacimiento?: string;
    categoriaNombre?: string;
    afiliacion?: string;
    canton?: string;
    club?: string;
    entrenadorNombre?: string;
    propositos?: PropositoDto[];
    payload?: Record<string, unknown>;
    observacion?: string;
    rol?: string;
  }>;
  entrenadores: Array<{
    id: number;
    nombre: string;
    esTextoLibre?: boolean;
    genero?: string;
  }>;
  fechaEmision?: string;
  fechaHoraSalida: string;
  fechaHoraRetorno: string;
  lugarSalida: string;
  lugarRetorno: string;
  transporteSalida: string;
  transporteRetorno: string;
  objetivos: string[];
  criterios: string[];
  observaciones?: string;
  tipoAval?: "FONDOS_PUBLICOS" | "AUTOGESTION" | "SOLO_RESULTADO";
  requerimientos?: Array<{
    otroConcepto?: string;
    detalle?: string;
    cantidad?: string;
    montoSolicitado?: string;
    tipoCobertura?: "DINERO" | "ESPECIE";
  }>;
  montoSolicitado?: number;
};

/**
 * Bloque que el DTM le suma al aval del entrenador. Antes eran dos documentos
 * (solicitud + aval técnico); ahora es uno solo que crece cuando llega al DTM.
 */
export type DtmRevisionData = {
  fechaPresentacion?: string | null;
  descripcion?: string | null;
  observacion?: string | null;
  firmanteNombre?: string | null;
  firmanteCargo?: string | null;
};

/** Datos ya guardados del DTM. Vacío mientras el aval no llega a esa etapa. */
export function getDtmRevisionData(
  aval?: Aval | null,
): DtmRevisionData | undefined {
  const revision = aval?.revisionDtm;
  if (!revision) return undefined;
  return {
    fechaPresentacion: revision.fechaPresentacion,
    descripcion: revision.descripcion,
    observacion: revision.observacion,
    firmanteNombre: revision.firmanteNombre,
    firmanteCargo: revision.firmanteCargo,
  };
}

type AvalDocumentPreviewProps = {
  aval: Aval;
  formData: FormData;
  mode?: "all" | "nomina" | "solicitud";
  /** Draft en vivo del DTM. Si no viene, se usa lo guardado en el aval. */
  dtm?: DtmRevisionData;
};

export type AvalPreviewFormData = FormData;

const PREVIEW_MONTHS_ABBR = [
  "ENE",
  "FEB",
  "MAR",
  "ABR",
  "MAY",
  "JUN",
  "JUL",
  "AGO",
  "SEP",
  "OCT",
  "NOV",
  "DIC",
];

function formatPreviewBirthDate(value?: string | null) {
  const parts = getCalendarDateParts(value);
  if (!parts) return "-";
  const dia = String(parts.day).padStart(2, "0");
  return `${dia}/${PREVIEW_MONTHS_ABBR[parts.month - 1]}/${parts.year}`;
}

type PronosticoPreviewDeportista = FormData["deportistas"][number];

function getPreviewYear(...values: Array<string | null | undefined>) {
  for (const value of values) {
    const parts = getCalendarDateParts(value);
    if (parts) return parts.year;
  }
  return new Date().getFullYear();
}

function normalizePreviewAfiliacion(value: string | undefined, year: number) {
  const text = value?.trim();
  if (!text) return `AFILIADO/A ${year}`;
  if (/^AFILIADO\/A(?:\s+\d{4})?$/i.test(text)) return `AFILIADO/A ${year}`;
  return text;
}

// Mismo criterio que el backend (pronostico-excel.service.ts): entrenador,
// cantón y club (si aplica) se combinan en una sola celda "Entrenador-Cantón-Club".
function resolveDatosGenerales(
  deportista: PronosticoPreviewDeportista,
  includeClub: boolean,
) {
  const parts = includeClub
    ? [deportista.entrenadorNombre, deportista.canton, deportista.club]
    : [deportista.entrenadorNombre, deportista.canton];
  return parts.filter((p) => p?.trim()).join("-") || "-";
}

function joinPreviewMark(mark?: string, unit?: string) {
  return [mark?.trim(), unit?.trim()].filter(Boolean).join(" ") || "-";
}

type PronosticoPreviewColumn = {
  key: string;
  label: string;
  group?: string;
  align?: "left" | "center" | "right";
  /** Plantilla 3: varias pruebas por deportista, una por línea en la celda. */
  preLine?: boolean;
  render: (deportista: PronosticoPreviewDeportista, index: number) => string;
};

const ALIGN_CLASS: Record<"left" | "center" | "right", string> = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
};

// Un solo listado, con columnas base compartidas por las tres plantillas de
// pronóstico y un tramo final que varía según la disciplina (ver capturas de
// los Excel reales: PRONOSTICO 1/2/3 en el backend).
function getPronosticoPreviewColumns(
  profile: PronosticoProfile,
): PronosticoPreviewColumn[] {
  const includeClub = profile.fields.some((field) => field.path === "club");

  const base: PronosticoPreviewColumn[] = [
    {
      key: "no",
      label: "No.",
      align: "center",
      render: (_d, index) => String(index + 1),
    },
    {
      key: "nombre",
      label: "Apellidos y Nombres",
      render: (d) => d.nombre,
    },
    {
      key: "afiliacion",
      label: "Afiliación",
      render: (d) => d.afiliacion || "-",
    },
    {
      key: "categoria",
      label: "Categoría",
      render: (d) => d.categoriaNombre || "-",
    },
    {
      key: "datosGenerales",
      label: includeClub ? "Entrenador-Cantón-Club" : "Entrenador-Cantón",
      group: "Datos Generales",
      render: (d) => resolveDatosGenerales(d, includeClub),
    },
    {
      key: "cedula",
      label: "N° Cédula",
      group: "Datos Generales",
      render: (d) => d.cedula || "-",
    },
    {
      key: "fechaNac",
      label: "Fecha Nac.",
      group: "Datos Generales",
      render: (d) => formatPreviewBirthDate(d.fechaNacimiento),
    },
  ];

  if (profile.template === "PRONOSTICO_1") {
    return [
      ...base,
      {
        key: "ubicacionActual",
        label: "Ubicación nacional actual",
        render: (d) => getPropositos(d.propositos)[0]?.ubicacionActual || "-",
      },
      {
        key: "ubicacionPropuesta",
        label: "Ubicación",
        group: "Propósitos",
        render: (d) => getPropositos(d.propositos)[0]?.ubicacionProposito || "-",
      },
    ];
  }

  if (profile.template === "PRONOSTICO_2") {
    return [
      ...base,
      {
        key: "divisionPeso",
        label: "División de Peso",
        render: (d) => getPropositos(d.propositos)[0]?.divisionPeso || "-",
      },
      {
        key: "ubicacionActual",
        label: "Ubicación nacional actual",
        render: (d) => getPropositos(d.propositos)[0]?.ubicacionActual || "-",
      },
      {
        key: "ubicacionPropuesta",
        label: "Ubicación",
        group: "Propósito",
        render: (d) => getPropositos(d.propositos)[0]?.ubicacionProposito || "-",
      },
    ];
  }

  // PRONOSTICO_3: disciplinas de marca/tiempo/puntos (atletismo, natación,
  // etc.) — un deportista puede tener varias pruebas; cada columna apila una
  // línea por prueba, en el mismo orden, dentro de la misma celda.
  return [
    ...base,
    {
      key: "prueba",
      label: "Pruebas",
      preLine: true,
      render: (d) =>
        getPropositos(d.propositos)
          .map((p) => p.prueba || "-")
          .join("\n") || "-",
    },
    {
      key: "mejorMarca",
      label: "Mejor tiempo-marcas-puntos actual",
      preLine: true,
      render: (d) =>
        getPropositos(d.propositos)
          .map((p) => joinPreviewMark(p.marcaActual, p.unidadMarcaActual))
          .join("\n") || "-",
    },
    {
      key: "marcaPropuesta",
      label: "Marcas",
      group: "Propósitos",
      preLine: true,
      render: (d) =>
        getPropositos(d.propositos)
          .map((p) => joinPreviewMark(p.marcaProposito, p.unidadMarcaProposito))
          .join("\n") || "-",
    },
    {
      key: "ubicacionPropuesta",
      label: "Ubicación",
      group: "Propósitos",
      preLine: true,
      render: (d) =>
        getPropositos(d.propositos)
          .map((p) => p.ubicacionProposito || "-")
          .join("\n") || "-",
    },
  ];
}

function PronosticoListadoPreview({
  profile,
  deportistas,
  entrenadorResponsable,
}: {
  profile: PronosticoProfile;
  deportistas: PronosticoPreviewDeportista[];
  entrenadorResponsable: string;
}) {
  const columns = getPronosticoPreviewColumns(profile);
  const verticalHeaderKeys = new Set(["afiliacion", "categoria"]);
  const columnClass = (key: string) => {
    if (profile.template === "PRONOSTICO_3") {
      switch (key) {
        case "no":
          return "w-[4%] text-center";
        case "nombre":
          return "w-[20%]";
        case "afiliacion":
          return "w-[7%] text-center";
        case "categoria":
          return "w-[6%] text-center";
        case "datosGenerales":
          return "w-[13%] text-center";
        case "cedula":
          return "w-[9%] text-center";
        case "fechaNac":
          return "w-[8%] text-center";
        case "prueba":
          return "w-[9%] text-center";
        case "mejorMarca":
          return "w-[11%] text-center";
        case "marcaPropuesta":
        case "ubicacionPropuesta":
          return "w-[7%] text-center";
        default:
          return "text-center";
      }
    }

    if (profile.template === "PRONOSTICO_2") {
      switch (key) {
        case "no":
          return "w-[4%] text-center";
        case "nombre":
          return "w-[23%]";
        case "afiliacion":
          return "w-[8%] text-center";
        case "categoria":
          return "w-[7%] text-center";
        case "datosGenerales":
          return "w-[14%] text-center";
        case "cedula":
          return "w-[10%] text-center";
        case "fechaNac":
          return "w-[9%] text-center";
        case "divisionPeso":
        case "ubicacionActual":
          return "w-[9%] text-center";
        case "ubicacionPropuesta":
          return "w-[7%] text-center";
        default:
          return "text-center";
      }
    }

    switch (key) {
      case "no":
        return "w-[4%] text-center";
      case "nombre":
        return "w-[26%]";
      case "afiliacion":
        return "w-[8%] text-center";
      case "categoria":
        return "w-[7%] text-center";
      case "datosGenerales":
        return "w-[16%] text-center";
      case "cedula":
        return "w-[11%] text-center";
      case "fechaNac":
        return "w-[10%] text-center";
      case "ubicacionActual":
        return "w-[10%] text-center";
      case "ubicacionPropuesta":
        return "w-[8%] text-center";
      default:
        return "text-center";
    }
  };

  const headerRow1: ReactNode[] = [];
  const headerRow2: ReactNode[] = [];
  for (let i = 0; i < columns.length; ) {
    const col = columns[i];
    if (!col.group) {
      headerRow1.push(
        <th
          key={col.key}
          rowSpan={2}
          className={`border-2 border-slate-900 bg-slate-50 px-1.5 py-2 text-center text-[9px] font-semibold uppercase align-middle ${columnClass(
            col.key,
          )}`}
        >
          {verticalHeaderKeys.has(col.key) ? (
            <span
              className="inline-block whitespace-nowrap"
              style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
            >
              {col.label}
            </span>
          ) : (
            col.label
          )}
        </th>,
      );
      i += 1;
      continue;
    }
    let j = i;
    while (j < columns.length && columns[j].group === col.group) j += 1;
    headerRow1.push(
      <th
        key={`group-${col.group}-${i}`}
        colSpan={j - i}
        className={`border-2 border-slate-900 bg-slate-50 px-1.5 py-2 text-center font-semibold uppercase ${
          col.group.toLowerCase().startsWith("prop")
            ? "text-[10px] leading-tight"
            : "text-[13px]"
        }`}
      >
        {col.group}
      </th>,
    );
    for (let k = i; k < j; k += 1) {
      headerRow2.push(
        <th
          key={columns[k].key}
          className={`border-2 border-slate-900 bg-slate-50 px-1.5 py-1.5 text-center text-[8px] font-semibold uppercase leading-tight ${columnClass(
            columns[k].key,
          )}`}
        >
          {columns[k].label}
        </th>,
      );
    }
    i = j;
  }

  return (
    <div className="bg-white p-4 xl:p-5 border border-slate-300">
      <div className="rounded-sm border border-slate-300">
        <table className="w-full table-fixed border-collapse text-[9px] text-slate-950">
          <thead className="bg-white">
            <tr>{headerRow1}</tr>
            <tr>{headerRow2}</tr>
          </thead>
          <tbody>
            {deportistas.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="border border-slate-300 px-2 py-3 text-center text-slate-500"
                >
                  Selecciona deportistas para ver el listado aquí.
                </td>
              </tr>
            ) : (
              deportistas.map((deportista, index) => (
                <tr key={deportista.id}>
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`border border-slate-300 px-1.5 py-2 align-middle leading-tight ${
                        col.align ? ALIGN_CLASS[col.align] : ""
                      } ${col.preLine ? "whitespace-pre-line" : ""} ${columnClass(
                        col.key,
                      )} ${
                        col.key === "nombre" ? "text-center text-[11px] uppercase" : ""
                      } ${
                        col.key === "categoria" ? "text-[10px]" : ""
                      } ${col.key === "afiliacion" ? "break-words text-[10px]" : ""}`}
                    >
                      {col.render(deportista, index)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="mt-10 w-64 text-center text-[10px] text-slate-950">
        <div className="border-t border-slate-900 pt-2">
          {entrenadorResponsable}
        </div>
        <div className="mt-1 font-semibold uppercase">
          Entrenador de {profile.disciplinaLabel}
        </div>
      </div>
    </div>
  );
}

export default function AvalDocumentPreview({
  aval,
  formData,
  mode = "all",
  dtm,
}: AvalDocumentPreviewProps) {
  const evento = aval.evento;
  const dtmData = dtm ?? getDtmRevisionData(aval);
  const presupuestoItems = getAvalPresupuestoItems(aval);
  const delegacion = getAvalDelegationSummary(aval, {
    deportistas: formData.deportistas,
    entrenadores: formData.entrenadores,
  });
  const entrenadorResponsable = formData.entrenadores[0]?.nombre ?? "-";
  const entrenadores = formData.entrenadores
    .slice(1)
    .map((entrenador) => entrenador.nombre)
    .join(", ") || "-";
  const disciplina = evento?.disciplina?.nombre?.toUpperCase() ?? "SIN DISCIPLINA";
  const categoria = formatCategoryLabel(
    evento?.categoria?.nombre ?? evento?.categoriaCodigo,
    "SIN CATEGORIA"
  ).toUpperCase();
  const genero = formatGenero(evento?.genero ?? "MASCULINO_FEMENINO");
  const avalNumero =
    aval.avalTecnico?.numeroAval ??
    aval.aval ??
    aval.numeroColeccion ??
    String(aval.id ?? "S/N");
  const fechaEmision = formData.fechaEmision || aval.fechaEmision || null;
  const previewYear = getPreviewYear(fechaEmision, aval.createdAt);
  const deportistasPreview = formData.deportistas.map((deportista) => ({
    ...deportista,
    afiliacion: normalizePreviewAfiliacion(deportista.afiliacion, previewYear),
    categoriaNombre: deportista.categoriaNombre?.trim() || categoria,
    entrenadorNombre:
      deportista.entrenadorNombre?.trim() || entrenadorResponsable,
    observacion:
      deportista.observacion?.trim() ||
      normalizePreviewAfiliacion(deportista.afiliacion, previewYear),
  }));
  const showDetallePage =
    Boolean(formData.fechaEmision) ||
    Boolean(formData.fechaHoraSalida) ||
    Boolean(formData.fechaHoraRetorno) ||
    Boolean(formData.lugarSalida) ||
    Boolean(formData.lugarRetorno) ||
    Boolean(formData.transporteSalida) ||
    Boolean(formData.transporteRetorno) ||
    formData.objetivos.length > 0 ||
    formData.criterios.length > 0 ||
    Boolean(formData.observaciones?.trim()) ||
    Boolean(formData.requerimientos?.length);
  // Certificado de afiliación (escuela de iniciación) desactivado: ya no se
  // genera para avales nuevos. Se reemplaza por el listado/pronóstico de
  // deportistas (más abajo) en las mismas vistas donde aparecía.
  const showNomina = false;
  const pronosticoProfile = getPronosticoProfile(evento);
  const showListadoPronostico = mode !== "solicitud" && Boolean(pronosticoProfile);
  const showSolicitud = mode !== "nomina" && (showDetallePage || mode === "solicitud");
  const manualRequerimientos = (formData.requerimientos ?? []).filter(
    (item) => {
      const monto = Number.parseFloat(item.montoSolicitado ?? "0");
      return (
        Boolean(item.otroConcepto?.trim()) ||
        Boolean(item.cantidad?.trim()) ||
        (Boolean(item.montoSolicitado?.trim()) && Number.isFinite(monto) && monto !== 0)
      );
    },
  );
  const showRequerimientos =
    formData.tipoAval !== "SOLO_RESULTADO" || manualRequerimientos.length > 0;
  const totalManualRequerimientos = manualRequerimientos.reduce((sum, item) => {
    const monto = Number.parseFloat(item.montoSolicitado ?? "0");
    return sum + (Number.isFinite(monto) ? monto : 0);
  }, 0);

  return (
    <div className="w-full space-y-6 text-slate-900">
      {showNomina && (
        <div className="bg-white p-5 xl:p-6 border border-slate-300">
        <div className="text-[13px] leading-5 space-y-0.5">
          <p>Lic.</p>
          <p>{entrenadorResponsable.toUpperCase()}</p>
          <p className="font-semibold uppercase">ENTRENADOR DE {disciplina} DE FDPL</p>
          <p>Ciudad.-</p>
        </div>

        <p className="mt-4 text-[13px] leading-5">
          De mis consideraciones:
        </p>

        <p className="mt-3 text-[13px] leading-5">
          Por medio de la presente me permito dirigirme a usted, para extender
          mi cordial saludo y desear lo mejor al frente de las actividades
          encomendadas para el desarrollo del deporte de nuestra ciudad y
          provincia de Loja.
        </p>

        <p className="mt-3 text-[13px] leading-5 font-semibold">
          A lo solicitado por usted mediante el AVAL TÉCNICO DE PARTICIPACIÓN
          COMPETITIVA DEL DEPORTE DEL &quot;{disciplina}&quot; Presentado en esta
          dependencia el {new Date().getFullYear()}.
        </p>

        <div className="mt-4 border border-slate-400">
          <table className="w-full border-collapse text-[11px]">
            <tbody>
              <tr>
                <td className="w-1/3 border border-slate-400 px-2 py-1 font-semibold">
                  DEPORTE
                </td>
                <td className="border border-slate-400 px-2 py-1">{disciplina}</td>
              </tr>
              <tr>
                <td className="border border-slate-400 px-2 py-1 font-semibold">
                  DOCUMENTO
                </td>
                <td className="border border-slate-400 px-2 py-1">
                  AVAL TECNICO DE PARTICIPACION COMPETITIVA
                </td>
              </tr>
              <tr>
                <td className="border border-slate-400 px-2 py-1 font-semibold">
                  EVENTO
                </td>
                <td className="border border-slate-400 px-2 py-1">
                  {evento?.nombre?.toUpperCase() ?? "SIN EVENTO"}
                </td>
              </tr>
              <tr>
                <td className="border border-slate-400 px-2 py-1 font-semibold">
                  FECHA DE EMISION
                </td>
                <td className="border border-slate-400 px-2 py-1">
                  {fechaEmision ? formatDateDMY(fechaEmision) : "-"}
                </td>
              </tr>
              <tr>
                <td className="border border-slate-400 px-2 py-1 font-semibold">
                  GENERO
                </td>
                <td className="border border-slate-400 px-2 py-1">{genero}</td>
              </tr>
              <tr>
                <td className="border border-slate-400 px-2 py-1 font-semibold">
                  LUGAR Y FECHA
                </td>
                <td className="border border-slate-400 px-2 py-1">
                  {(formatLocationWithProvince(evento) || "-").toUpperCase()} /{" "}
                  {formatEventScheduleDocumentLabel(evento)}
                </td>
              </tr>
              <tr>
                <td className="border border-slate-400 px-2 py-1 font-semibold">
                  ENTRENADORES RESPONSABLES
                </td>
                <td className="border border-slate-400 px-2 py-1">
                  {entrenadorResponsable.toUpperCase()}
                </td>
              </tr>
              <tr>
                <td className="border border-slate-400 px-2 py-1 font-semibold">
                  ENTRENADORES
                </td>
                <td className="border border-slate-400 px-2 py-1">{entrenadores.toUpperCase()}</td>
              </tr>
              <tr>
                <td className="border border-slate-400 px-2 py-1 font-semibold">
                  DELEGADOS
                </td>
                <td className="border border-slate-400 px-2 py-1">-</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p className="mt-4 text-[13px] leading-5">
          Certifico que una vez revisado los archivos que se mantienen en la
          Secretaria de las ESCUELAS DE INICIACIÓN DEPORTIVA relacionada a la
          &quot;AFILIACIÓN del {new Date().getFullYear()} de los deportistas de FDPL. Me
          permito informarle lo siguiente.
        </p>

        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full border-collapse text-[11px]">
            <thead>
              <tr className="bg-cyan-200">
                {[
                  "No.",
                  "APELLIDOS Y NOMBRES",
                  "PROFESOR",
                  "CEDULA",
                  "FECHA DE NAC.",
                  "OBSERVACIONES",
                ].map((col) => (
                  <th
                    key={col}
                    className="border border-slate-500 px-2 py-1.5 text-left font-semibold"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {deportistasPreview.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="border border-slate-400 px-2 py-3 text-center text-slate-500"
                  >
                    Selecciona deportistas para ver la nomina aqui.
                  </td>
                </tr>
              ) : (
                deportistasPreview.map((deportista, index) => (
                  <tr key={deportista.id}>
                    <td className="border border-slate-400 px-2 py-1 text-center align-top">
                      {index + 1}
                    </td>
                    <td className="border border-slate-400 px-2 py-1 align-top">
                      {deportista.nombre}
                    </td>
                    <td className="border border-slate-400 px-2 py-1 align-top">
                      {entrenadorResponsable.toUpperCase()}
                    </td>
                    <td className="border border-slate-400 px-2 py-1 align-top">
                      {deportista.cedula ?? "-"}
                    </td>
                    <td className="border border-slate-400 px-2 py-1 align-top">
                      {formatPreviewBirthDate(deportista.fechaNacimiento)}
                    </td>
                    <td className="border border-slate-400 px-2 py-1 align-top font-semibold">
                      {deportista.observacion}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="pt-4 text-[12px]">
          <p>Atentamente,</p>
          <div className="mt-8">
            <p className="text-slate-400">____________________________</p>
            <p className="font-semibold uppercase">{entrenadorResponsable}</p>
            <p className="text-[11px] uppercase">SECRETARIA ESCUELAS DE INICIACIÓN DEPORTIVA DE FDPL</p>
          </div>
        </div>
      </div>
      )}

      {showListadoPronostico && pronosticoProfile && (
        <PronosticoListadoPreview
          profile={pronosticoProfile}
          deportistas={deportistasPreview}
          entrenadorResponsable={entrenadorResponsable}
        />
      )}

      {showSolicitud && (
        <div className="bg-white p-5 xl:p-6 border border-slate-300 space-y-4">
          <h2 className="text-center text-[18px] font-semibold uppercase">
            Aval tecnico de participacion competitiva - {avalNumero}
          </h2>

          {/* Encabezado del DTM: recién aparece cuando el aval llega a esa
              etapa, antes el documento es solo el del entrenador. */}
          {dtmData?.fechaPresentacion ? (
            <p className="text-right text-[12px]">
              {formatDateWithOptions(dtmData.fechaPresentacion, {
                day: "2-digit",
                month: "long",
                year: "numeric",
              })}
            </p>
          ) : null}
          {dtmData?.descripcion?.trim() ? (
            <p className="text-[12px] leading-5 text-justify">
              {dtmData.descripcion}
            </p>
          ) : null}

          <h3 className="text-center text-[15px] font-semibold uppercase">
            Datos informativos
          </h3>

          <table className="w-full border-collapse text-[11px]">
            <tbody>
              <tr>
                <td className="w-1/4 border border-slate-400 px-2 py-1 font-semibold">
                  DEPORTE
                </td>
                <td className="border border-slate-400 px-2 py-1">{disciplina}</td>
              </tr>
              <tr>
                <td className="border border-slate-400 px-2 py-1 font-semibold">
                  CATEGORIAS
                </td>
                <td className="border border-slate-400 px-2 py-1">{categoria}</td>
              </tr>
              <tr>
                <td className="border border-slate-400 px-2 py-1 font-semibold">
                  GENERO
                </td>
                <td className="border border-slate-400 px-2 py-1">{genero}</td>
              </tr>
              <tr>
                <td className="border border-slate-400 px-2 py-1 font-semibold">
                  EVENTO
                </td>
                <td className="border border-slate-400 px-2 py-1">
                  {evento?.nombre?.toUpperCase() ?? "SIN EVENTO"}
                </td>
              </tr>
              <tr>
                <td className="border border-slate-400 px-2 py-1 font-semibold">
                  LUGAR Y FECHA
                </td>
                <td className="border border-slate-400 px-2 py-1">
                  {(formatLocationWithProvince(evento) || "-").toUpperCase()} /{" "}
                  {formatEventScheduleDocumentLabel(evento)}
                </td>
              </tr>
              <tr>
                <td className="border border-slate-400 px-2 py-1 font-semibold">
                  ENTRENADORES RESPONSABLES
                </td>
                <td className="border border-slate-400 px-2 py-1">
                  {entrenadorResponsable.toUpperCase()}
                </td>
              </tr>
              <tr>
                <td className="border border-slate-400 px-2 py-1 font-semibold">
                  ENTRENADORES
                </td>
                <td className="border border-slate-400 px-2 py-1">{entrenadores.toUpperCase()}</td>
              </tr>
            </tbody>
          </table>

          <table className="w-full border-collapse text-[11px]">
            <thead>
              <tr>
                <th className="w-10 border border-slate-400 px-2 py-1 text-left">
                  N.º
                </th>
                <th className="border border-slate-400 px-2 py-1 text-left uppercase">
                  Objetivos de participacion
                </th>
              </tr>
            </thead>
            <tbody>
              {formData.objetivos.length === 0 ? (
                <tr>
                  <td
                    colSpan={2}
                    className="border border-slate-400 px-2 py-2 text-slate-500"
                  >
                    -
                  </td>
                </tr>
              ) : (
                formData.objetivos.map((objetivo, index) => (
                  <tr key={`obj-${index}`}>
                    <td className="border border-slate-400 px-2 py-1">{index + 1}</td>
                    <td className="border border-slate-400 px-2 py-1">{objetivo}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <table className="w-full border-collapse text-[11px]">
            <thead>
              <tr>
                <th className="w-10 border border-slate-400 px-2 py-1 text-left">
                  N.º
                </th>
                <th className="border border-slate-400 px-2 py-1 text-left uppercase">
                  Criterios de seleccion
                </th>
              </tr>
            </thead>
            <tbody>
              {formData.criterios.length === 0 ? (
                <tr>
                  <td
                    colSpan={2}
                    className="border border-slate-400 px-2 py-2 text-slate-500"
                  >
                    -
                  </td>
                </tr>
              ) : (
                formData.criterios.map((criterio, index) => (
                  <tr key={`crt-${index}`}>
                    <td className="border border-slate-400 px-2 py-1">{index + 1}</td>
                    <td className="border border-slate-400 px-2 py-1">{criterio}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <div>
            <p className="text-[12px] font-semibold uppercase">
              Conformacion de la delegacion
            </p>
            <table className="mt-1 w-full border-collapse text-[11px]">
              <thead>
                <tr>
                  <th className="border border-slate-400 px-2 py-1 text-center" colSpan={2}>
                    OFICIALES
                  </th>
                  <th className="border border-slate-400 px-2 py-1 text-center" colSpan={2}>
                    ATLETAS
                  </th>
                  <th className="border border-slate-400 px-2 py-1 text-center" rowSpan={2}>
                    TOTAL
                  </th>
                </tr>
                <tr>
                  <th className="border border-slate-400 px-2 py-1 text-center">D</th>
                  <th className="border border-slate-400 px-2 py-1 text-center">V</th>
                  <th className="border border-slate-400 px-2 py-1 text-center">D</th>
                  <th className="border border-slate-400 px-2 py-1 text-center">V</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                    <td className="border border-slate-400 px-2 py-1 text-center">
                    {delegacion.entrenadores.mujeres}
                  </td>
                  <td className="border border-slate-400 px-2 py-1 text-center">
                    {delegacion.entrenadores.hombres}
                  </td>
                  <td className="border border-slate-400 px-2 py-1 text-center">
                    {delegacion.deportistas.mujeres}
                  </td>
                  <td className="border border-slate-400 px-2 py-1 text-center">
                    {delegacion.deportistas.hombres}
                  </td>
                  <td className="border border-slate-400 px-2 py-1 text-center">
                    {delegacion.total}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {showRequerimientos && (
          <div>
            <p className="text-[12px] font-semibold uppercase">Requerimientos</p>
            <table className="mt-1 w-full border-collapse text-[11px]">
              <thead>
                <tr>
                  <th className="w-10 border border-slate-400 px-2 py-1 text-left">
                    N.º
                  </th>
                  <th className="border border-slate-400 px-2 py-1 text-left">RUBRO</th>
                  <th className="border border-slate-400 px-2 py-1 text-left">DETALLE</th>
                  <th className="w-24 border border-slate-400 px-2 py-1 text-right">
                    CANT.
                  </th>
                  <th className="w-28 border border-slate-400 px-2 py-1 text-right">
                    VALOR
                  </th>
                </tr>
              </thead>
              <tbody>
                {formData.tipoAval === "SOLO_RESULTADO" ? (
                  manualRequerimientos.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="border border-slate-400 px-2 py-2 text-slate-500"
                      >
                        Sin requerimientos manuales registrados.
                      </td>
                    </tr>
                  ) : (
                    manualRequerimientos.map((item, index) => (
                      <tr key={`req-${index}`}>
                        <td className="border border-slate-400 px-2 py-1">
                          {index + 1}
                        </td>
                        <td className="border border-slate-400 px-2 py-1">
                          {item.otroConcepto || "-"}
                        </td>
                        <td className="border border-slate-400 px-2 py-1">
                          {item.detalle || "-"}
                        </td>
                        <td className="border border-slate-400 px-2 py-1 text-right">
                          {item.cantidad?.trim() || "0"}
                        </td>
                        <td className="border border-slate-400 px-2 py-1 text-right">
                          {formatCurrencyFromString(item.montoSolicitado || "0")}
                        </td>
                      </tr>
                    ))
                  )
                ) : presupuestoItems.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="border border-slate-400 px-2 py-2 text-slate-500"
                    >
                      Sin items presupuestarios en este evento.
                    </td>
                  </tr>
                ) : (
                  presupuestoItems.map((item, index) => (
                    <tr key={item.id}>
                      <td className="border border-slate-400 px-2 py-1">
                        {index + 1}
                      </td>
                      <td className="border border-slate-400 px-2 py-1">
                        {item.item.nombre}
                      </td>
                      <td className="border border-slate-400 px-2 py-1" />
                      <td className="border border-slate-400 px-2 py-1 text-right">
                        1
                      </td>
                      <td className="border border-slate-400 px-2 py-1 text-right">
                        {formatCurrencyFromString(item.presupuesto)}
                      </td>
                    </tr>
                  ))
                )}
                {(formData.tipoAval === "SOLO_RESULTADO"
                  ? manualRequerimientos.length > 0
                  : presupuestoItems.length > 0) && (
                  <tr>
                    <td className="border border-slate-400 px-2 py-1" />
                    <td className="border border-slate-400 px-2 py-1 font-semibold">TOTAL</td>
                    <td className="border border-slate-400 px-2 py-1" />
                    <td className="border border-slate-400 px-2 py-1" />
                    <td className="border border-slate-400 px-2 py-1 text-right font-semibold">
                      {formatCurrencyFromString(String(
                        formData.tipoAval === "SOLO_RESULTADO"
                          ? totalManualRequerimientos
                          : presupuestoItems.reduce(
                              (sum, item) => sum + (Number.parseFloat(item.presupuesto) || 0),
                              0,
                            ),
                      ))}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          )}

          <table className="w-full border-collapse text-[11px]">
            <tbody>
              <tr>
                <td className="w-20 border border-slate-400 px-2 py-1 font-semibold uppercase">
                  Salida
                </td>
                <td className="border border-slate-400 px-2 py-1">
                  <div className="grid grid-cols-4 gap-2">
                    <span className="font-semibold">Dia/fecha:</span>
                    <span className="font-semibold">Hora:</span>
                    <span className="font-semibold">Lugar:</span>
                    <span className="font-semibold">Transporte</span>
                    <span>{formatDateDMY(formData.fechaHoraSalida)}</span>
                    <span>{formatTimeCompact(formData.fechaHoraSalida)}</span>
                    <span>{(formData.lugarSalida || "-").toUpperCase()}</span>
                    <span>{formatTransport(formData.transporteSalida)}</span>
                  </div>
                </td>
              </tr>
              <tr>
                <td className="w-20 border border-slate-400 px-2 py-1 font-semibold uppercase">
                  Retorno
                </td>
                <td className="border border-slate-400 px-2 py-1">
                  <div className="grid grid-cols-4 gap-2">
                    <span className="font-semibold">Dia/fecha:</span>
                    <span className="font-semibold">Hora:</span>
                    <span className="font-semibold">Lugar:</span>
                    <span className="font-semibold">Transporte</span>
                    <span>{formatDateDMY(formData.fechaHoraRetorno)}</span>
                    <span>{formatTimeCompact(formData.fechaHoraRetorno)}</span>
                    <span>{(formData.lugarRetorno || "-").toUpperCase()}</span>
                    <span>{formatTransport(formData.transporteRetorno)}</span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          <div className="text-[12px]">
            <p className="font-semibold uppercase">Observacion:</p>
            <p className="mt-1 min-h-6">
              {formData.observaciones?.trim() || "-"}
            </p>
          </div>

          {dtmData?.observacion?.trim() ? (
            <div className="text-[12px]">
              <p className="font-semibold uppercase">Observacion DTM:</p>
              <p className="mt-1">{dtmData.observacion}</p>
            </div>
          ) : null}

          <div className="pt-4 text-[12px]">
            <p>Atentamente,</p>
            <div className="mt-8 flex justify-between">
              <div>
                <p className="text-slate-400">____________________________</p>
                <p className="font-semibold uppercase">{entrenadorResponsable}</p>
                <p className="text-[11px] uppercase">ENTRENADOR RESPONSABLE</p>
              </div>
              <div className="text-right">
                <p className="text-slate-400">____________________________</p>
                <p className="font-semibold uppercase">
                  {dtmData?.firmanteNombre?.trim() || "PRESIDENTE FDPL"}
                </p>
                <p className="text-[11px] uppercase">
                  {dtmData?.firmanteCargo?.trim() || "PRESIDENTE"}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function ListaDeportistasPreview({
  aval,
  formData,
}: {
  aval: Aval;
  formData: FormData;
}) {
  return <AvalDocumentPreview aval={aval} formData={formData} mode="nomina" />;
}

export function SolicitudAvalPreview({
  aval,
  formData,
  dtm,
}: {
  aval: Aval;
  formData: FormData;
  dtm?: DtmRevisionData;
}) {
  return (
    <AvalDocumentPreview
      aval={aval}
      formData={formData}
      mode="solicitud"
      dtm={dtm}
    />
  );
}
